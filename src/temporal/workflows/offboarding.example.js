/**
 * Employee Offboarding Workflow - Usage Examples
 *
 * This file demonstrates various scenarios for using the offboarding workflow
 */

const temporal = require('../index');
const Employee = require('../../models/employee.model');
const Offboarding = require('../../models/offboarding.model');

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 1: Standard Resignation with 30-day Notice
// ═══════════════════════════════════════════════════════════════

async function example1_standardResignation() {
  console.log('Example 1: Standard Resignation\n');

  const employeeId = '507f1f77bcf86cd799439011';
  const employee = await Employee.findById(employeeId);

  // Create offboarding record
  const offboarding = new Offboarding({
    employeeId: employee._id,
    employeeNumber: employee.employeeId,
    employeeName: employee.personalInfo.fullNameEnglish,
    employeeNameAr: employee.personalInfo.fullNameArabic,
    email: employee.personalInfo.email,
    department: employee.employment.departmentName,
    jobTitle: employee.employment.jobTitle,
    exitType: 'resignation',
    dates: {
      noticeDate: new Date(),
      lastWorkingDay: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    },
    noticePeriod: {
      requiredDays: 30
    },
    resignation: {
      resignationDate: new Date(),
      resignationReason: 'Better career opportunity',
      resignationReasonCategory: 'better_opportunity'
    }
  });

  await offboarding.save();

  // Start workflow
  const handle = await temporal.client.startOffboardingWorkflow({
    employeeId: employee._id.toString(),
    offboardingData: {
      offboardingId: offboarding._id.toString(),
      employeeName: employee.personalInfo.fullNameEnglish,
      email: employee.personalInfo.email,
      department: employee.employment.departmentName,
      jobTitle: employee.employment.jobTitle,
      exitType: 'resignation',
      dates: {
        noticeDate: offboarding.dates.noticeDate,
        lastWorkingDay: offboarding.dates.lastWorkingDay
      },
      noticePeriod: offboarding.noticePeriod,
      serviceDuration: offboarding.serviceDuration,
      knowledgeTransfer: {
        required: true,
        handoverPlan: {
          handoverTo: [
            {
              employeeId: '507f1f77bcf86cd799439012',
              employeeName: 'Ahmed Ali',
              role: 'Senior Developer',
              responsibilities: [
                { responsibility: 'Project X maintenance', priority: 'high' },
                { responsibility: 'Team leadership', priority: 'medium' }
              ]
            }
          ]
        }
      }
    }
  });

  console.log('Workflow started:', {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId
  });

  // Later, signal phase completions...
  setTimeout(async () => {
    await temporal.client.signalWorkflow(handle.workflowId, 'notificationPhaseComplete');
    console.log('Notification phase completed');
  }, 5000);

  return handle;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 2: Immediate Termination (Article 80 - Serious Violation)
// ═══════════════════════════════════════════════════════════════

async function example2_immediateTermination() {
  console.log('Example 2: Immediate Termination (Article 80)\n');

  const employeeId = '507f1f77bcf86cd799439013';
  const employee = await Employee.findById(employeeId);

  const offboarding = new Offboarding({
    employeeId: employee._id,
    employeeNumber: employee.employeeId,
    employeeName: employee.personalInfo.fullNameEnglish,
    email: employee.personalInfo.email,
    department: employee.employment.departmentName,
    exitType: 'termination',
    dates: {
      noticeDate: new Date(),
      lastWorkingDay: new Date() // Immediate
    },
    termination: {
      terminationDate: new Date(),
      terminationType: 'with_cause',
      terminationReason: 'Gross negligence resulting in financial loss',
      terminationReasonCategory: 'misconduct',
      saudiLaborLawArticle: 'Article 80',
      article80Violation: {
        applies: true,
        violationType: 'gross_negligence',
        violationDetails: 'Unauthorized financial transactions causing significant loss',
        evidenceProvided: true,
        investigationConducted: true
      },
      notice: {
        required: false, // No notice required for Article 80
        noticePeriod: 0
      }
    }
  });

  await offboarding.save();

  // Start workflow - will revoke access immediately
  const handle = await temporal.client.startOffboardingWorkflow({
    employeeId: employee._id.toString(),
    offboardingData: {
      offboardingId: offboarding._id.toString(),
      employeeName: employee.personalInfo.fullNameEnglish,
      email: employee.personalInfo.email,
      department: employee.employment.departmentName,
      exitType: 'termination',
      dates: {
        noticeDate: new Date(),
        lastWorkingDay: new Date() // Immediate
      },
      termination: offboarding.termination,
      // No exit interview for termination
      exitInterview: {
        required: false
      }
    }
  });

  console.log('Immediate termination workflow started:', {
    workflowId: handle.workflowId,
    immediateAccessRevocation: true,
    eosbEntitlement: 'None (Article 80 violation)'
  });

  return handle;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 3: Retirement with Full Benefits
// ═══════════════════════════════════════════════════════════════

async function example3_retirement() {
  console.log('Example 3: Retirement with Full Benefits\n');

  const employeeId = '507f1f77bcf86cd799439014';
  const employee = await Employee.findById(employeeId);

  // Calculate service duration
  const hireDate = employee.employment.hireDate;
  const retirementDate = new Date('2024-12-31');
  const serviceDuration = calculateServiceDuration(hireDate, retirementDate);

  const offboarding = new Offboarding({
    employeeId: employee._id,
    employeeNumber: employee.employeeId,
    employeeName: employee.personalInfo.fullNameEnglish,
    email: employee.personalInfo.email,
    department: employee.employment.departmentName,
    exitType: 'retirement',
    dates: {
      noticeDate: new Date(),
      lastWorkingDay: retirementDate
    },
    serviceDuration: serviceDuration,
    retirement: {
      retirementDate: retirementDate,
      retirementType: 'voluntary',
      retirementAge: 60,
      eligibleForRetirement: true,
      pensionEligible: true,
      gosiRetirement: {
        eligible: true,
        serviceYears: serviceDuration.years,
        gosiPensionAmount: 0 // To be calculated by GOSI
      }
    }
  });

  // Calculate EOSB - full entitlement for retirement
  const eosbCalculation = offboarding.calculateEOSB(employee.compensation.basicSalary);
  offboarding.finalSettlement = {
    calculated: false,
    calculationBase: {
      lastBasicSalary: employee.compensation.basicSalary,
      serviceYears: serviceDuration.years,
      serviceMonths: serviceDuration.months
    },
    earnings: {
      eosb: eosbCalculation
    }
  };

  await offboarding.save();

  const handle = await temporal.client.startOffboardingWorkflow({
    employeeId: employee._id.toString(),
    offboardingData: {
      offboardingId: offboarding._id.toString(),
      employeeName: employee.personalInfo.fullNameEnglish,
      email: employee.personalInfo.email,
      department: employee.employment.departmentName,
      exitType: 'retirement',
      dates: {
        noticeDate: new Date(),
        lastWorkingDay: retirementDate
      },
      serviceDuration: serviceDuration,
      basicSalary: employee.compensation.basicSalary,
      retirement: offboarding.retirement,
      exitInterview: {
        required: true,
        interviewMethod: 'in_person' // Special retirement ceremony
      }
    }
  });

  console.log('Retirement workflow started:', {
    workflowId: handle.workflowId,
    serviceYears: serviceDuration.years,
    estimatedEOSB: eosbCalculation.finalEOSB,
    gosiEligible: true
  });

  return handle;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 4: Manual Override for Blocked Phase
// ═══════════════════════════════════════════════════════════════

async function example4_manualOverride() {
  console.log('Example 4: Manual Override\n');

  const workflowId = 'offboarding-507f1f77bcf86cd799439011-1703174400000';

  // Scenario: Employee lost company laptop, cost will be deducted from settlement
  // We need to manually override equipment return phase

  await temporal.client.signalWorkflow(
    workflowId,
    'manualOverride',
    {
      phase: 'equipment_return',
      reason: 'Employee lost company laptop. Replacement cost (5,000 SAR) deducted from final settlement',
      approvedBy: 'hr-manager-id',
      timestamp: new Date().toISOString()
    }
  );

  console.log('Manual override signal sent');

  // Update offboarding record with lost equipment
  const offboarding = await Offboarding.findOne({
    'relatedRecords.temporalWorkflowId': workflowId
  });

  if (offboarding) {
    const lostLaptop = offboarding.clearance.itemsToReturn.find(
      item => item.itemType === 'laptop'
    );

    if (lostLaptop) {
      lostLaptop.returned = false;
      lostLaptop.notReturnedReason = 'Lost by employee';
      lostLaptop.replacementCost = 5000;
      lostLaptop.condition = 'lost';
    }

    // Add deduction to final settlement
    offboarding.finalSettlement = offboarding.finalSettlement || {};
    offboarding.finalSettlement.deductions = offboarding.finalSettlement.deductions || {};
    offboarding.finalSettlement.deductions.unreturnedProperty = {
      applicable: true,
      items: [{
        itemType: 'laptop',
        itemDescription: 'Company laptop',
        itemValue: 5000,
        returned: false
      }],
      totalDeduction: 5000
    };

    await offboarding.save();
    console.log('Offboarding record updated with lost equipment deduction');
  }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 5: Escalation for Deadline Overrun
// ═══════════════════════════════════════════════════════════════

async function example5_escalation() {
  console.log('Example 5: Escalation\n');

  const workflowId = 'offboarding-507f1f77bcf86cd799439012-1703174400000';

  // Scenario: Knowledge transfer not completed within notice period
  // Need to escalate to department manager

  await temporal.client.signalWorkflow(
    workflowId,
    'escalation',
    {
      phase: 'knowledge_transfer',
      reason: 'Knowledge transfer incomplete after 30 days. Critical project knowledge not documented.',
      escalatedTo: 'Department Manager',
      escalatedBy: 'hr-specialist-id',
      timestamp: new Date().toISOString()
    }
  );

  console.log('Escalation signal sent to workflow');

  // HR will receive notification and can take action
  // Options:
  // 1. Extend deadline
  // 2. Manual override if acceptable
  // 3. Involve senior management
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 6: Query Workflow Progress
// ═══════════════════════════════════════════════════════════════

async function example6_queryProgress() {
  console.log('Example 6: Query Workflow Progress\n');

  const workflowId = 'offboarding-507f1f77bcf86cd799439011-1703174400000';

  // Get workflow handle
  const handle = await temporal.client.getWorkflowHandle(workflowId);

  // Get workflow description
  const description = await handle.describe();

  console.log('Workflow Status:', {
    status: description.status.name,
    startTime: description.startTime,
    historyLength: description.historyLength
  });

  // Get offboarding record for detailed progress
  const offboarding = await Offboarding.findOne({
    'relatedRecords.temporalWorkflowId': workflowId
  });

  if (offboarding) {
    const progress = {
      currentPhase: offboarding.status,
      timeline: offboarding.timeline.slice(-5), // Last 5 events
      completion: {
        notification: true,
        knowledgeTransfer: offboarding.knowledgeTransfer?.handoverComplete || false,
        accessRevocation: offboarding.clearance?.itClearance?.cleared || false,
        equipmentReturn: offboarding.clearance?.allItemsReturned || false,
        exitInterview: offboarding.exitInterview?.completed || false,
        clearance: offboarding.clearance?.allClearancesObtained || false
      }
    };

    console.log('Detailed Progress:', progress);

    // Calculate completion percentage
    const completedPhases = Object.values(progress.completion).filter(Boolean).length;
    const totalPhases = Object.keys(progress.completion).length;
    const completionPercentage = Math.round((completedPhases / totalPhases) * 100);

    console.log(`Completion: ${completionPercentage}% (${completedPhases}/${totalPhases} phases)`);
  }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 7: Cancel Offboarding (Employee Withdrew Resignation)
// ═══════════════════════════════════════════════════════════════

async function example7_cancelOffboarding() {
  console.log('Example 7: Cancel Offboarding\n');

  const workflowId = 'offboarding-507f1f77bcf86cd799439011-1703174400000';

  // Employee withdrew their resignation
  await temporal.client.cancelWorkflow(workflowId);

  console.log('Workflow cancelled');

  // Update offboarding record
  const offboarding = await Offboarding.findOne({
    'relatedRecords.temporalWorkflowId': workflowId
  });

  if (offboarding) {
    offboarding.status = 'cancelled';
    offboarding.resignation.withdrawalRequested = true;
    offboarding.resignation.withdrawalDate = new Date();
    offboarding.resignation.withdrawalApproved = true;

    offboarding.timeline.push({
      eventType: 'status_changed',
      eventDate: new Date(),
      description: 'Offboarding cancelled - employee withdrew resignation',
      status: 'completed'
    });

    await offboarding.save();
    console.log('Offboarding record updated to cancelled status');
  }

  // Reactivate employee
  await Employee.findByIdAndUpdate(offboarding.employeeId, {
    'employment.employmentStatus': 'active'
  });

  console.log('Employee status restored to active');
}

// ═══════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════

function calculateServiceDuration(hireDate, exitDate) {
  const hire = new Date(hireDate);
  const exit = new Date(exitDate);

  const totalDays = Math.floor((exit - hire) / (1000 * 60 * 60 * 24));
  const years = Math.floor(totalDays / 365);
  const remainingDays = totalDays % 365;
  const months = Math.floor(remainingDays / 30);
  const days = remainingDays % 30;

  return {
    years,
    months,
    days,
    totalMonths: years * 12 + months,
    totalDays
  };
}

// ═══════════════════════════════════════════════════════════════
// Run Examples
// ═══════════════════════════════════════════════════════════════

async function runExamples() {
  try {
    console.log('='.repeat(70));
    console.log('Employee Offboarding Workflow - Usage Examples');
    console.log('='.repeat(70));
    console.log();

    // Uncomment to run specific examples:

    // await example1_standardResignation();
    // await example2_immediateTermination();
    // await example3_retirement();
    // await example4_manualOverride();
    // await example5_escalation();
    // await example6_queryProgress();
    // await example7_cancelOffboarding();

    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = {
  example1_standardResignation,
  example2_immediateTermination,
  example3_retirement,
  example4_manualOverride,
  example5_escalation,
  example6_queryProgress,
  example7_cancelOffboarding
};
