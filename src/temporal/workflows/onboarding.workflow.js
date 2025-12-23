/**
 * Employee Onboarding Temporal Workflow
 *
 * This workflow orchestrates the entire employee onboarding process across multiple phases:
 * 1. Pre-boarding (before start date)
 * 2. Documentation (collect and verify documents)
 * 3. Training (mandatory and role-specific training)
 * 4. Probation (90-180 days with periodic reviews)
 *
 * Features:
 * - Long-running (weeks to months)
 * - Signal handlers for human-in-the-loop events
 * - Timeout handling with automatic reminders
 * - Query handlers for progress tracking
 * - Role-based onboarding templates
 */

const {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  sleep,
  condition,
  CancellationScope
} = require('@temporalio/workflow');

// Import activities with retry policies
const activities = proxyActivities({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '10s',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 3
  }
});

// Define signals for human-in-the-loop interactions
const documentsSubmittedSignal = defineSignal('documentsSubmitted');
const trainingCompletedSignal = defineSignal('trainingCompleted');
const reviewCompletedSignal = defineSignal('reviewCompleted');
const skipPhaseSignal = defineSignal('skipPhase');
const updateConfigSignal = defineSignal('updateConfig');

// Define queries for status tracking
const getProgressQuery = defineQuery('getProgress');
const getCurrentPhaseQuery = defineQuery('getCurrentPhase');
const getPendingTasksQuery = defineQuery('getPendingTasks');

/**
 * Main Onboarding Workflow
 *
 * @param {Object} params - Workflow parameters
 * @param {string} params.employeeId - Employee MongoDB ID
 * @param {string} params.onboardingId - Onboarding record ID
 * @param {Date} params.startDate - Employee start date
 * @param {string} params.role - Employee role (for role-based templates)
 * @param {Object} params.config - Onboarding configuration
 */
async function onboardingWorkflow({
  employeeId,
  onboardingId,
  startDate,
  role = 'employee',
  config = {}
}) {
  // Workflow state
  const state = {
    currentPhase: 'pre_boarding',
    completedPhases: [],
    pendingTasks: [],
    documents: {
      submitted: false,
      verifiedCount: 0,
      pendingCount: 0
    },
    training: {
      completed: false,
      sessionsCompleted: 0,
      totalSessions: 0
    },
    reviews: {
      scheduled: [],
      completed: []
    },
    config: {
      probationDays: config.probationDays || 90,
      documentReminderIntervalDays: config.documentReminderIntervalDays || 3,
      trainingReminderIntervalDays: config.trainingReminderIntervalDays || 7,
      skipPreBoarding: config.skipPreBoarding || false,
      skipTraining: config.skipTraining || false,
      ...config
    },
    signals: {
      documentsSubmitted: false,
      trainingCompleted: false,
      phaseToSkip: null
    }
  };

  // Set up signal handlers
  setHandler(documentsSubmittedSignal, (documents) => {
    state.signals.documentsSubmitted = true;
    state.documents.submitted = true;
    state.documents.verifiedCount = documents.verifiedCount || 0;
    state.documents.pendingCount = documents.pendingCount || 0;
  });

  setHandler(trainingCompletedSignal, (training) => {
    state.signals.trainingCompleted = true;
    state.training.completed = true;
    state.training.sessionsCompleted = training.sessionsCompleted || 0;
  });

  setHandler(reviewCompletedSignal, (review) => {
    state.reviews.completed.push({
      reviewType: review.reviewType,
      completedAt: new Date(),
      outcome: review.outcome
    });
  });

  setHandler(skipPhaseSignal, (phase) => {
    state.signals.phaseToSkip = phase;
  });

  setHandler(updateConfigSignal, (newConfig) => {
    state.config = { ...state.config, ...newConfig };
  });

  // Set up query handlers
  setHandler(getProgressQuery, () => ({
    currentPhase: state.currentPhase,
    completedPhases: state.completedPhases,
    progress: calculateProgress(state),
    documents: state.documents,
    training: state.training,
    reviews: state.reviews
  }));

  setHandler(getCurrentPhaseQuery, () => state.currentPhase);

  setHandler(getPendingTasksQuery, () => state.pendingTasks);

  // =========================================================================
  // PHASE 1: PRE-BOARDING (Before Start Date)
  // =========================================================================
  if (!state.config.skipPreBoarding && !shouldSkipPhase(state, 'pre_boarding')) {
    state.currentPhase = 'pre_boarding';
    state.pendingTasks = ['send_welcome_email', 'create_accounts', 'assign_equipment'];

    try {
      // Send welcome email
      await activities.sendWelcomeEmail({ employeeId, onboardingId });
      removeTask(state, 'send_welcome_email');

      // Create system accounts
      const systems = getRoleBasedSystems(role);
      await activities.createSystemAccounts({
        employeeId,
        onboardingId,
        systems
      });
      removeTask(state, 'create_accounts');

      // Assign equipment
      const equipment = getRoleBasedEquipment(role);
      await activities.assignEquipment({
        employeeId,
        onboardingId,
        equipment
      });
      removeTask(state, 'assign_equipment');

      // Notify HR that pre-boarding is complete
      await activities.notifyHR({
        employeeId,
        onboardingId,
        eventType: 'phase_completed',
        eventData: { phase: 'pre_boarding' }
      });

      state.completedPhases.push('pre_boarding');
    } catch (error) {
      await activities.notifyHR({
        employeeId,
        onboardingId,
        eventType: 'onboarding_delayed',
        eventData: {
          phase: 'pre_boarding',
          reason: error.message
        }
      });
      throw error;
    }
  }

  // Wait until start date if in the future
  const now = new Date();
  const startDateTime = new Date(startDate);
  if (startDateTime > now) {
    const waitMs = startDateTime - now;
    await sleep(waitMs);
  }

  // =========================================================================
  // PHASE 2: DOCUMENTATION (Collect and verify required documents)
  // =========================================================================
  if (!shouldSkipPhase(state, 'documentation')) {
    state.currentPhase = 'documentation';
    state.pendingTasks = ['submit_documents', 'verify_documents'];

    try {
      // Get required documents based on role
      const requiredDocuments = getRoleBasedDocuments(role);

      // Send initial document request
      await activities.sendDocumentReminder({
        employeeId,
        onboardingId,
        reminderType: 'initial',
        documents: requiredDocuments
      });

      // Wait for documents to be submitted (with periodic reminders)
      const documentDeadline = state.config.documentReminderIntervalDays * 5; // Max 5 reminders
      let documentsReceived = false;
      let reminderCount = 0;

      while (!documentsReceived && reminderCount < 5) {
        // Wait for signal or timeout
        documentsReceived = await condition(
          () => state.signals.documentsSubmitted,
          state.config.documentReminderIntervalDays * 24 * 60 * 60 * 1000 // Days to ms
        );

        if (!documentsReceived) {
          // Send reminder
          reminderCount++;
          await activities.sendDocumentReminder({
            employeeId,
            onboardingId,
            reminderType: `reminder_${reminderCount}`,
            documents: requiredDocuments
          });
        }
      }

      if (!documentsReceived) {
        // Escalate to HR
        await activities.notifyHR({
          employeeId,
          onboardingId,
          eventType: 'onboarding_delayed',
          eventData: {
            phase: 'documentation',
            reason: 'Documents not submitted after 5 reminders'
          }
        });
      } else {
        removeTask(state, 'submit_documents');
        removeTask(state, 'verify_documents');

        await activities.notifyHR({
          employeeId,
          onboardingId,
          eventType: 'documents_submitted',
          eventData: {
            documentsCount: state.documents.verifiedCount
          }
        });

        state.completedPhases.push('documentation');
      }
    } catch (error) {
      await activities.notifyHR({
        employeeId,
        onboardingId,
        eventType: 'onboarding_delayed',
        eventData: {
          phase: 'documentation',
          reason: error.message
        }
      });
      throw error;
    }
  }

  // =========================================================================
  // PHASE 3: TRAINING (Mandatory and role-specific training)
  // =========================================================================
  if (!state.config.skipTraining && !shouldSkipPhase(state, 'training')) {
    state.currentPhase = 'training';
    state.pendingTasks = ['complete_training'];

    try {
      // Schedule training sessions based on role
      const trainingSessions = getRoleBasedTraining(role);
      state.training.totalSessions = trainingSessions.length;

      await activities.scheduleTraining({
        employeeId,
        onboardingId,
        trainingSessions
      });

      // Wait for training completion (with periodic check-ins)
      let trainingComplete = false;
      let checkInCount = 0;

      while (!trainingComplete && checkInCount < 4) {
        // Wait for signal or timeout (weekly check-ins)
        trainingComplete = await condition(
          () => state.signals.trainingCompleted,
          state.config.trainingReminderIntervalDays * 24 * 60 * 60 * 1000
        );

        if (!trainingComplete) {
          checkInCount++;
          await activities.notifyHR({
            employeeId,
            onboardingId,
            eventType: 'training_in_progress',
            eventData: {
              sessionsCompleted: state.training.sessionsCompleted,
              totalSessions: state.training.totalSessions,
              checkInNumber: checkInCount
            }
          });
        }
      }

      if (trainingComplete) {
        removeTask(state, 'complete_training');

        await activities.notifyHR({
          employeeId,
          onboardingId,
          eventType: 'training_completed',
          eventData: {
            trainingName: 'All onboarding training',
            sessionsCompleted: state.training.sessionsCompleted
          }
        });

        state.completedPhases.push('training');
      } else {
        await activities.notifyHR({
          employeeId,
          onboardingId,
          eventType: 'onboarding_delayed',
          eventData: {
            phase: 'training',
            reason: 'Training not completed within expected timeframe'
          }
        });
      }
    } catch (error) {
      await activities.notifyHR({
        employeeId,
        onboardingId,
        eventType: 'onboarding_delayed',
        eventData: {
          phase: 'training',
          reason: error.message
        }
      });
      throw error;
    }
  }

  // =========================================================================
  // PHASE 4: PROBATION (90-180 days with periodic reviews)
  // =========================================================================
  if (!shouldSkipPhase(state, 'probation')) {
    state.currentPhase = 'probation';
    state.pendingTasks = ['30_day_review', '60_day_review', '90_day_review'];

    try {
      const probationDays = state.config.probationDays;
      const reviewSchedule = calculateReviewSchedule(startDate, probationDays);

      // Schedule all reviews
      for (const review of reviewSchedule) {
        await activities.schedulePerformanceReview({
          employeeId,
          onboardingId,
          reviewType: review.type,
          reviewDate: review.date
        });

        state.reviews.scheduled.push(review);
      }

      // Wait for each review period and conduct reviews
      for (const review of reviewSchedule) {
        const now = new Date();
        const reviewDate = new Date(review.date);

        if (reviewDate > now) {
          const waitMs = reviewDate - now;
          await sleep(waitMs);
        }

        // Notify HR that review is due
        await activities.notifyHR({
          employeeId,
          onboardingId,
          eventType: 'review_due',
          eventData: {
            reviewType: review.type,
            reviewDate: review.date
          }
        });

        // Wait for review completion (with 7-day grace period)
        const reviewCompleted = await condition(
          () => state.reviews.completed.some(r => r.reviewType === review.type),
          7 * 24 * 60 * 60 * 1000 // 7 days
        );

        if (reviewCompleted) {
          removeTask(state, `${review.type}_review`);
        } else {
          await activities.notifyHR({
            employeeId,
            onboardingId,
            eventType: 'review_overdue',
            eventData: {
              reviewType: review.type,
              daysOverdue: 7
            }
          });
        }
      }

      state.completedPhases.push('probation');
    } catch (error) {
      await activities.notifyHR({
        employeeId,
        onboardingId,
        eventType: 'onboarding_delayed',
        eventData: {
          phase: 'probation',
          reason: error.message
        }
      });
      throw error;
    }
  }

  // =========================================================================
  // PHASE 5: COMPLETION
  // =========================================================================
  state.currentPhase = 'completion';

  try {
    // Determine outcome based on reviews
    const lastReview = state.reviews.completed[state.reviews.completed.length - 1];
    const outcome = lastReview?.outcome === 'terminate' ? 'terminated' : 'successful';

    await activities.completeOnboarding({
      employeeId,
      onboardingId,
      outcome
    });

    await activities.notifyHR({
      employeeId,
      onboardingId,
      eventType: 'onboarding_completed',
      eventData: {
        outcome,
        completedPhases: state.completedPhases,
        totalDuration: state.config.probationDays
      }
    });

    state.completedPhases.push('completion');
    state.currentPhase = 'completed';

    return {
      success: true,
      outcome,
      completedPhases: state.completedPhases,
      totalDuration: state.config.probationDays,
      finalStatus: outcome
    };
  } catch (error) {
    await activities.notifyHR({
      employeeId,
      onboardingId,
      eventType: 'completion_error',
      eventData: {
        error: error.message
      }
    });
    throw error;
  }
}

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Calculate overall progress percentage
 */
function calculateProgress(state) {
  const totalPhases = 5; // pre_boarding, documentation, training, probation, completion
  const completedCount = state.completedPhases.length;
  return Math.round((completedCount / totalPhases) * 100);
}

/**
 * Check if a phase should be skipped
 */
function shouldSkipPhase(state, phase) {
  return state.signals.phaseToSkip === phase;
}

/**
 * Remove task from pending tasks
 */
function removeTask(state, taskName) {
  const index = state.pendingTasks.indexOf(taskName);
  if (index > -1) {
    state.pendingTasks.splice(index, 1);
  }
}

/**
 * Get role-based systems for account creation
 */
function getRoleBasedSystems(role) {
  const commonSystems = ['Email', 'VPN', 'HR Portal', 'Time Tracking'];

  const roleSystems = {
    developer: [...commonSystems, 'GitHub', 'Jira', 'AWS', 'Slack'],
    lawyer: [...commonSystems, 'Case Management', 'Document Management', 'Legal Research'],
    hr: [...commonSystems, 'HRIS', 'Recruitment System', 'Payroll'],
    accountant: [...commonSystems, 'Accounting Software', 'Banking Portal', 'ERP'],
    employee: commonSystems
  };

  return roleSystems[role] || roleSystems.employee;
}

/**
 * Get role-based equipment
 */
function getRoleBasedEquipment(role) {
  const commonEquipment = [
    { type: 'laptop', id: null },
    { type: 'mouse', id: null },
    { type: 'keyboard', id: null }
  ];

  const roleEquipment = {
    developer: [
      ...commonEquipment,
      { type: 'monitor', id: null },
      { type: 'headset', id: null }
    ],
    lawyer: [
      ...commonEquipment,
      { type: 'phone', id: null }
    ],
    employee: commonEquipment
  };

  return roleEquipment[role] || roleEquipment.employee;
}

/**
 * Get role-based required documents
 */
function getRoleBasedDocuments(role) {
  const commonDocuments = [
    { documentType: 'national_id', documentName: 'National ID / Iqama', documentNameAr: 'الهوية الوطنية / الإقامة', required: true },
    { documentType: 'degree', documentName: 'Education Certificate', documentNameAr: 'الشهادة التعليمية', required: true },
    { documentType: 'photo', documentName: 'Personal Photo', documentNameAr: 'صورة شخصية', required: true },
    { documentType: 'bank_letter', documentName: 'Bank Letter', documentNameAr: 'خطاب بنكي', required: true }
  ];

  const roleDocuments = {
    lawyer: [
      ...commonDocuments,
      { documentType: 'bar_admission', documentName: 'Bar Admission Certificate', documentNameAr: 'شهادة مزاولة المحاماة', required: true }
    ],
    accountant: [
      ...commonDocuments,
      { documentType: 'certificate', documentName: 'Professional Certificate', documentNameAr: 'الشهادة المهنية', required: true }
    ]
  };

  return roleDocuments[role] || commonDocuments;
}

/**
 * Get role-based training sessions
 */
function getRoleBasedTraining(role) {
  const commonTraining = [
    {
      moduleName: 'Company Orientation',
      moduleNameAr: 'التوجيه المؤسسي',
      category: 'mandatory',
      type: 'online',
      duration: 120,
      testRequired: true
    },
    {
      moduleName: 'Saudi Labor Law',
      moduleNameAr: 'نظام العمل السعودي',
      category: 'compliance',
      type: 'classroom',
      duration: 180,
      testRequired: true
    },
    {
      moduleName: 'Information Security',
      moduleNameAr: 'أمن المعلومات',
      category: 'mandatory',
      type: 'online',
      duration: 60,
      testRequired: true
    }
  ];

  const roleTraining = {
    developer: [
      ...commonTraining,
      {
        moduleName: 'Development Standards',
        moduleNameAr: 'معايير التطوير',
        category: 'technical',
        type: 'online',
        duration: 90
      },
      {
        moduleName: 'Git & Version Control',
        moduleNameAr: 'إدارة الإصدارات',
        category: 'technical',
        type: 'hands_on',
        duration: 120
      }
    ],
    lawyer: [
      ...commonTraining,
      {
        moduleName: 'Case Management System',
        moduleNameAr: 'نظام إدارة القضايا',
        category: 'role_specific',
        type: 'hands_on',
        duration: 180
      },
      {
        moduleName: 'Legal Research Tools',
        moduleNameAr: 'أدوات البحث القانوني',
        category: 'role_specific',
        type: 'online',
        duration: 90
      }
    ]
  };

  return roleTraining[role] || commonTraining;
}

/**
 * Calculate review schedule based on probation period
 */
function calculateReviewSchedule(startDate, probationDays) {
  const schedule = [];
  const start = new Date(startDate);

  // 30-day review
  if (probationDays >= 30) {
    const review30 = new Date(start);
    review30.setDate(review30.getDate() + 30);
    schedule.push({ type: '30_day', date: review30 });
  }

  // 60-day review
  if (probationDays >= 60) {
    const review60 = new Date(start);
    review60.setDate(review60.getDate() + 60);
    schedule.push({ type: '60_day', date: review60 });
  }

  // 90-day review
  if (probationDays >= 90) {
    const review90 = new Date(start);
    review90.setDate(review90.getDate() + 90);
    schedule.push({ type: '90_day', date: review90 });
  }

  // Final review (at end of probation)
  const finalReview = new Date(start);
  finalReview.setDate(finalReview.getDate() + probationDays);
  schedule.push({ type: 'final', date: finalReview });

  return schedule;
}

module.exports = {
  onboardingWorkflow,
  // Export signals and queries for use in client code
  signals: {
    documentsSubmittedSignal,
    trainingCompletedSignal,
    reviewCompletedSignal,
    skipPhaseSignal,
    updateConfigSignal
  },
  queries: {
    getProgressQuery,
    getCurrentPhaseQuery,
    getPendingTasksQuery
  }
};
