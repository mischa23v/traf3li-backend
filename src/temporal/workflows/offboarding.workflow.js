/**
 * Employee Offboarding Temporal Workflow
 * Multi-phase offboarding process with compliance tracking
 * Saudi Labor Law compliant
 */

const { proxyActivities, defineSignal, setHandler, condition, sleep } = require('@temporalio/workflow');

// Define activity timeout and retry configuration
const activities = proxyActivities({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '30s',
    backoffCoefficient: 2,
    maximumInterval: '10m',
    maximumAttempts: 3
  }
});

// Signal definitions for phase completion
const notificationPhaseCompleteSignal = defineSignal('notificationPhaseComplete');
const knowledgeTransferCompleteSignal = defineSignal('knowledgeTransferComplete');
const accessRevocationCompleteSignal = defineSignal('accessRevocationComplete');
const equipmentReturnCompleteSignal = defineSignal('equipmentReturnComplete');
const exitInterviewCompleteSignal = defineSignal('exitInterviewComplete');
const clearanceCompleteSignal = defineSignal('clearanceComplete');
const manualOverrideSignal = defineSignal('manualOverride');
const escalationSignal = defineSignal('escalation');

/**
 * Main Employee Offboarding Workflow
 */
async function employeeOffboardingWorkflow({ employeeId, offboardingData }) {
  // Workflow state tracking
  const state = {
    employeeId,
    offboardingType: offboardingData.exitType, // resignation, termination, retirement
    status: 'initiated',
    currentPhase: 'notification',
    phases: {
      notification: { status: 'pending', startTime: null, endTime: null, errors: [] },
      knowledgeTransfer: { status: 'pending', startTime: null, endTime: null, errors: [] },
      accessRevocation: { status: 'pending', startTime: null, endTime: null, errors: [] },
      equipmentReturn: { status: 'pending', startTime: null, endTime: null, errors: [] },
      exitInterview: { status: 'pending', startTime: null, endTime: null, errors: [] },
      clearance: { status: 'pending', startTime: null, endTime: null, errors: [] }
    },
    timeline: [],
    compliance: {
      requiredTasksCompleted: 0,
      totalRequiredTasks: 0,
      complianceScore: 0
    },
    escalations: [],
    manualOverrides: []
  };

  // Signal handlers setup
  let notificationComplete = false;
  let knowledgeTransferComplete = false;
  let accessRevocationComplete = false;
  let equipmentReturnComplete = false;
  let exitInterviewComplete = false;
  let clearanceComplete = false;
  let manualOverride = null;
  let escalation = null;

  setHandler(notificationPhaseCompleteSignal, () => {
    notificationComplete = true;
  });

  setHandler(knowledgeTransferCompleteSignal, () => {
    knowledgeTransferComplete = true;
  });

  setHandler(accessRevocationCompleteSignal, () => {
    accessRevocationComplete = true;
  });

  setHandler(equipmentReturnCompleteSignal, () => {
    equipmentReturnComplete = true;
  });

  setHandler(exitInterviewCompleteSignal, () => {
    exitInterviewComplete = true;
  });

  setHandler(clearanceCompleteSignal, () => {
    clearanceComplete = true;
  });

  setHandler(manualOverrideSignal, (data) => {
    manualOverride = data;
    state.manualOverrides.push({
      timestamp: new Date().toISOString(),
      phase: state.currentPhase,
      reason: data.reason,
      approvedBy: data.approvedBy
    });
  });

  setHandler(escalationSignal, (data) => {
    escalation = data;
    state.escalations.push({
      timestamp: new Date().toISOString(),
      phase: state.currentPhase,
      reason: data.reason,
      escalatedTo: data.escalatedTo
    });
  });

  try {
    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: NOTIFICATION - Notify stakeholders
    // ═══════════════════════════════════════════════════════════════
    state.currentPhase = 'notification';
    state.phases.notification.status = 'in_progress';
    state.phases.notification.startTime = new Date().toISOString();

    state.timeline.push({
      phase: 'notification',
      event: 'phase_started',
      timestamp: new Date().toISOString()
    });

    try {
      // Notify all relevant departments in parallel
      const notificationResults = await Promise.allSettled([
        activities.notifyDepartment({
          employeeId,
          department: offboardingData.department,
          exitType: offboardingData.exitType,
          lastWorkingDay: offboardingData.dates.lastWorkingDay,
          notificationType: 'department'
        }),
        activities.notifyDepartment({
          employeeId,
          department: 'IT',
          exitType: offboardingData.exitType,
          lastWorkingDay: offboardingData.dates.lastWorkingDay,
          notificationType: 'it'
        }),
        activities.notifyDepartment({
          employeeId,
          department: 'HR',
          exitType: offboardingData.exitType,
          lastWorkingDay: offboardingData.dates.lastWorkingDay,
          notificationType: 'hr'
        }),
        activities.notifyDepartment({
          employeeId,
          department: 'Finance',
          exitType: offboardingData.exitType,
          lastWorkingDay: offboardingData.dates.lastWorkingDay,
          notificationType: 'finance'
        }),
        // Notify manager
        offboardingData.managerId ? activities.notifyDepartment({
          employeeId,
          managerId: offboardingData.managerId,
          exitType: offboardingData.exitType,
          lastWorkingDay: offboardingData.dates.lastWorkingDay,
          notificationType: 'manager'
        }) : Promise.resolve({ success: true })
      ]);

      // Check notification results
      const failedNotifications = notificationResults.filter(r => r.status === 'rejected');
      if (failedNotifications.length > 0) {
        state.phases.notification.errors.push(...failedNotifications.map(f => f.reason));

        // Escalate if critical notifications failed
        await activities.escalateIssue({
          employeeId,
          phase: 'notification',
          issue: 'Failed to notify some departments',
          failedNotifications: failedNotifications.map(f => f.reason)
        });
      }

      // Wait for manual confirmation or timeout
      const notificationTimeout = offboardingData.exitType === 'termination' ? '1 day' : '2 days';
      await condition(() => notificationComplete || manualOverride?.phase === 'notification', notificationTimeout);

      state.phases.notification.status = 'completed';
      state.phases.notification.endTime = new Date().toISOString();
      state.timeline.push({
        phase: 'notification',
        event: 'phase_completed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      state.phases.notification.status = 'failed';
      state.phases.notification.errors.push(error.message);

      // Escalate critical failure
      await activities.escalateIssue({
        employeeId,
        phase: 'notification',
        issue: 'Critical notification phase failure',
        error: error.message
      });

      throw error;
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: KNOWLEDGE TRANSFER - Parallel with Access Revocation
    // ═══════════════════════════════════════════════════════════════
    state.currentPhase = 'knowledge_transfer';
    state.phases.knowledgeTransfer.status = 'in_progress';
    state.phases.knowledgeTransfer.startTime = new Date().toISOString();

    state.timeline.push({
      phase: 'knowledge_transfer',
      event: 'phase_started',
      timestamp: new Date().toISOString()
    });

    try {
      // Initiate knowledge transfer process
      const knowledgeTransferResult = await activities.initiateKnowledgeTransfer({
        employeeId,
        department: offboardingData.department,
        jobTitle: offboardingData.jobTitle,
        handoverTo: offboardingData.knowledgeTransfer?.handoverPlan?.handoverTo || [],
        lastWorkingDay: offboardingData.dates.lastWorkingDay,
        exitType: offboardingData.exitType
      });

      // Knowledge transfer deadline based on exit type
      const transferDeadline = offboardingData.exitType === 'termination'
        ? '3 days'
        : offboardingData.noticePeriod?.requiredDays
          ? `${offboardingData.noticePeriod.requiredDays} days`
          : '30 days';

      // Wait for knowledge transfer completion or manual override
      await condition(
        () => knowledgeTransferComplete || manualOverride?.phase === 'knowledge_transfer',
        transferDeadline
      );

      if (!knowledgeTransferComplete && !manualOverride?.phase === 'knowledge_transfer') {
        // Escalate if not completed within deadline
        await activities.escalateIssue({
          employeeId,
          phase: 'knowledge_transfer',
          issue: 'Knowledge transfer not completed within deadline',
          deadline: transferDeadline
        });
      }

      state.phases.knowledgeTransfer.status = 'completed';
      state.phases.knowledgeTransfer.endTime = new Date().toISOString();
      state.timeline.push({
        phase: 'knowledge_transfer',
        event: 'phase_completed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      state.phases.knowledgeTransfer.status = 'failed';
      state.phases.knowledgeTransfer.errors.push(error.message);

      // Knowledge transfer failure might not be critical - log and continue
      await activities.updateHRRecords({
        employeeId,
        update: {
          'knowledgeTransfer.status': 'failed',
          'knowledgeTransfer.error': error.message
        }
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: ACCESS REVOCATION - Run in parallel with Equipment Return
    // ═══════════════════════════════════════════════════════════════
    state.currentPhase = 'access_revocation';
    state.phases.accessRevocation.status = 'in_progress';
    state.phases.accessRevocation.startTime = new Date().toISOString();

    state.timeline.push({
      phase: 'access_revocation',
      event: 'phase_started',
      timestamp: new Date().toISOString()
    });

    // Start equipment return in parallel
    state.phases.equipmentReturn.status = 'in_progress';
    state.phases.equipmentReturn.startTime = new Date().toISOString();
    state.timeline.push({
      phase: 'equipment_return',
      event: 'phase_started',
      timestamp: new Date().toISOString()
    });

    try {
      // Run access revocation and equipment return in parallel
      const [accessResult, equipmentResult] = await Promise.allSettled([
        // Access Revocation
        (async () => {
          try {
            // Schedule access revocation based on last working day
            const revocationSchedule = offboardingData.exitType === 'termination'
              ? 'immediate' // Immediate for terminations
              : offboardingData.dates.lastWorkingDay; // End of last working day for others

            await activities.revokeSystemAccess({
              employeeId,
              email: offboardingData.email,
              systemAccounts: offboardingData.systemAccounts || [],
              scheduleTime: revocationSchedule,
              exitType: offboardingData.exitType
            });

            // Archive employee data before full revocation
            await activities.archiveEmployeeData({
              employeeId,
              email: offboardingData.email,
              department: offboardingData.department,
              retentionYears: 7 // Saudi legal requirement
            });

            // Wait for confirmation
            await condition(
              () => accessRevocationComplete || manualOverride?.phase === 'access_revocation',
              '2 days'
            );

            state.phases.accessRevocation.status = 'completed';
            state.phases.accessRevocation.endTime = new Date().toISOString();
            state.timeline.push({
              phase: 'access_revocation',
              event: 'phase_completed',
              timestamp: new Date().toISOString()
            });

          } catch (error) {
            state.phases.accessRevocation.status = 'failed';
            state.phases.accessRevocation.errors.push(error.message);
            throw error;
          }
        })(),

        // Equipment Return
        (async () => {
          try {
            await activities.scheduleEquipmentReturn({
              employeeId,
              itemsToReturn: offboardingData.clearance?.itemsToReturn || [],
              lastWorkingDay: offboardingData.dates.lastWorkingDay,
              department: offboardingData.department
            });

            // Wait for equipment return confirmation
            const equipmentDeadline = '7 days';
            await condition(
              () => equipmentReturnComplete || manualOverride?.phase === 'equipment_return',
              equipmentDeadline
            );

            if (!equipmentReturnComplete && !manualOverride?.phase === 'equipment_return') {
              // Escalate unreturned equipment
              await activities.escalateIssue({
                employeeId,
                phase: 'equipment_return',
                issue: 'Equipment not returned within deadline',
                deadline: equipmentDeadline
              });
            }

            state.phases.equipmentReturn.status = 'completed';
            state.phases.equipmentReturn.endTime = new Date().toISOString();
            state.timeline.push({
              phase: 'equipment_return',
              event: 'phase_completed',
              timestamp: new Date().toISOString()
            });

          } catch (error) {
            state.phases.equipmentReturn.status = 'failed';
            state.phases.equipmentReturn.errors.push(error.message);
            // Don't throw - equipment return failure shouldn't block workflow
            await activities.updateHRRecords({
              employeeId,
              update: {
                'clearance.equipmentReturn.status': 'failed',
                'clearance.equipmentReturn.error': error.message
              }
            });
          }
        })()
      ]);

      // Check if access revocation succeeded (critical)
      if (accessResult.status === 'rejected') {
        throw new Error(`Access revocation failed: ${accessResult.reason}`);
      }

    } catch (error) {
      // Critical failure - escalate
      await activities.escalateIssue({
        employeeId,
        phase: 'access_revocation',
        issue: 'Critical access revocation failure',
        error: error.message,
        severity: 'high'
      });
      throw error;
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 4: EXIT INTERVIEW - Skip for certain exit types
    // ═══════════════════════════════════════════════════════════════
    const requiresExitInterview = !['death', 'termination'].includes(offboardingData.exitType);

    if (requiresExitInterview) {
      state.currentPhase = 'exit_interview';
      state.phases.exitInterview.status = 'in_progress';
      state.phases.exitInterview.startTime = new Date().toISOString();

      state.timeline.push({
        phase: 'exit_interview',
        event: 'phase_started',
        timestamp: new Date().toISOString()
      });

      try {
        // Schedule exit interview
        await activities.scheduleExitInterview({
          employeeId,
          employeeName: offboardingData.employeeName,
          email: offboardingData.email,
          exitType: offboardingData.exitType,
          lastWorkingDay: offboardingData.dates.lastWorkingDay,
          interviewMethod: offboardingData.exitInterview?.interviewMethod || 'in_person'
        });

        // Wait for exit interview completion
        const interviewDeadline = '5 days';
        await condition(
          () => exitInterviewComplete || manualOverride?.phase === 'exit_interview',
          interviewDeadline
        );

        if (!exitInterviewComplete && !manualOverride?.phase === 'exit_interview') {
          // Exit interview is important but not critical - log and continue
          await activities.updateHRRecords({
            employeeId,
            update: {
              'exitInterview.status': 'incomplete',
              'exitInterview.reason': 'Employee did not complete exit interview'
            }
          });
        }

        state.phases.exitInterview.status = 'completed';
        state.phases.exitInterview.endTime = new Date().toISOString();
        state.timeline.push({
          phase: 'exit_interview',
          event: 'phase_completed',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        state.phases.exitInterview.status = 'failed';
        state.phases.exitInterview.errors.push(error.message);
        // Non-critical - continue workflow
      }
    } else {
      state.phases.exitInterview.status = 'skipped';
      state.phases.exitInterview.endTime = new Date().toISOString();
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5: CLEARANCE - Final clearance from all departments
    // ═══════════════════════════════════════════════════════════════
    state.currentPhase = 'clearance';
    state.phases.clearance.status = 'in_progress';
    state.phases.clearance.startTime = new Date().toISOString();

    state.timeline.push({
      phase: 'clearance',
      event: 'phase_started',
      timestamp: new Date().toISOString()
    });

    try {
      // Generate clearance certificate and notify payroll in parallel
      const [clearanceResult, payrollResult] = await Promise.allSettled([
        // Generate clearance certificate
        activities.generateClearanceCertificate({
          employeeId,
          offboardingData: {
            employeeName: offboardingData.employeeName,
            employeeNameAr: offboardingData.employeeNameAr,
            nationalId: offboardingData.nationalId,
            department: offboardingData.department,
            jobTitle: offboardingData.jobTitle,
            lastWorkingDay: offboardingData.dates.lastWorkingDay,
            exitType: offboardingData.exitType
          },
          clearanceStatus: {
            itCleared: state.phases.accessRevocation.status === 'completed',
            equipmentReturned: state.phases.equipmentReturn.status === 'completed',
            knowledgeTransferred: state.phases.knowledgeTransfer.status === 'completed',
            exitInterviewCompleted: state.phases.exitInterview.status === 'completed' || !requiresExitInterview
          }
        }),

        // Notify payroll for final settlement
        activities.notifyPayroll({
          employeeId,
          employeeName: offboardingData.employeeName,
          lastWorkingDay: offboardingData.dates.lastWorkingDay,
          exitType: offboardingData.exitType,
          serviceDuration: offboardingData.serviceDuration,
          basicSalary: offboardingData.basicSalary,
          finalSettlementRequired: true
        })
      ]);

      // Wait for all clearances to be obtained
      const clearanceDeadline = '10 days';
      await condition(
        () => clearanceComplete || manualOverride?.phase === 'clearance',
        clearanceDeadline
      );

      if (!clearanceComplete && !manualOverride?.phase === 'clearance') {
        // Escalate pending clearances
        await activities.escalateIssue({
          employeeId,
          phase: 'clearance',
          issue: 'Final clearances not obtained within deadline',
          deadline: clearanceDeadline,
          severity: 'medium'
        });
      }

      state.phases.clearance.status = 'completed';
      state.phases.clearance.endTime = new Date().toISOString();
      state.timeline.push({
        phase: 'clearance',
        event: 'phase_completed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      state.phases.clearance.status = 'failed';
      state.phases.clearance.errors.push(error.message);
      throw error;
    }

    // ═══════════════════════════════════════════════════════════════
    // FINAL: Update HR records and complete workflow
    // ═══════════════════════════════════════════════════════════════

    // Calculate compliance score
    const completedPhases = Object.values(state.phases).filter(p => p.status === 'completed').length;
    const totalPhases = Object.keys(state.phases).length;
    state.compliance.complianceScore = Math.round((completedPhases / totalPhases) * 100);

    // Update final HR records
    await activities.updateHRRecords({
      employeeId,
      update: {
        status: 'completed',
        'completion.offboardingCompleted': true,
        'completion.completionDate': new Date().toISOString(),
        'completion.allTasksCompleted': true,
        workflowState: state,
        complianceScore: state.compliance.complianceScore
      }
    });

    state.status = 'completed';
    state.timeline.push({
      phase: 'workflow',
      event: 'workflow_completed',
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      employeeId,
      status: state.status,
      complianceScore: state.compliance.complianceScore,
      phases: state.phases,
      timeline: state.timeline,
      escalations: state.escalations,
      manualOverrides: state.manualOverrides
    };

  } catch (error) {
    // Workflow failure - update HR records and throw
    state.status = 'failed';
    state.timeline.push({
      phase: 'workflow',
      event: 'workflow_failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });

    await activities.updateHRRecords({
      employeeId,
      update: {
        status: 'failed',
        workflowState: state,
        workflowError: error.message
      }
    });

    // Send critical failure notification
    await activities.escalateIssue({
      employeeId,
      phase: 'workflow',
      issue: 'Offboarding workflow failed',
      error: error.message,
      severity: 'critical'
    });

    throw error;
  }
}

module.exports = {
  employeeOffboardingWorkflow
};
