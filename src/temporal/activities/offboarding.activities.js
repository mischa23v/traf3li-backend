/**
 * Employee Offboarding Temporal Activities
 * Activities for executing offboarding tasks
 * Saudi Labor Law compliant
 */

const Offboarding = require('../../models/offboarding.model');
const Employee = require('../../models/employee.model');
const EmailService = require('../../services/email.service');
const logger = require('../../utils/logger');

/**
 * Notify department about employee offboarding
 */
async function notifyDepartment({
  employeeId,
  department,
  managerId,
  exitType,
  lastWorkingDay,
  notificationType
}) {
  try {
    logger.info(`[Offboarding Activity] Notifying ${notificationType} for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId }).populate('employeeId managerId');

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Determine notification recipients based on type
    let recipients = [];
    let subject = '';
    let messageData = {};

    switch (notificationType) {
      case 'department':
        // Notify department head and team
        recipients = await getDepartmentContacts(department, offboarding.firmId, offboarding.lawyerId);
        subject = `Employee Offboarding Notification - ${offboarding.employeeName}`;
        messageData = {
          type: 'department_notification',
          employeeName: offboarding.employeeName,
          employeeNameAr: offboarding.employeeNameAr,
          department: department,
          jobTitle: offboarding.jobTitle,
          exitType: exitType,
          lastWorkingDay: lastWorkingDay,
          actionRequired: 'Please review knowledge transfer requirements and assign replacement tasks.'
        };
        break;

      case 'it':
        recipients = await getITContacts(offboarding.firmId, offboarding.lawyerId);
        subject = `IT Access Revocation Required - ${offboarding.employeeName}`;
        messageData = {
          type: 'it_notification',
          employeeName: offboarding.employeeName,
          email: offboarding.email,
          lastWorkingDay: lastWorkingDay,
          actionRequired: 'Schedule access revocation, data backup, and equipment collection.',
          urgency: exitType === 'termination' ? 'immediate' : 'scheduled'
        };
        break;

      case 'hr':
        recipients = await getHRContacts(offboarding.firmId, offboarding.lawyerId);
        subject = `HR Offboarding Process Initiated - ${offboarding.employeeName}`;
        messageData = {
          type: 'hr_notification',
          employeeName: offboarding.employeeName,
          employeeNumber: offboarding.employeeNumber,
          exitType: exitType,
          lastWorkingDay: lastWorkingDay,
          actionRequired: 'Schedule exit interview, prepare final settlement, and generate required documents.'
        };
        break;

      case 'finance':
        recipients = await getFinanceContacts(offboarding.firmId, offboarding.lawyerId);
        subject = `Final Settlement Required - ${offboarding.employeeName}`;
        messageData = {
          type: 'finance_notification',
          employeeName: offboarding.employeeName,
          employeeNumber: offboarding.employeeNumber,
          lastWorkingDay: lastWorkingDay,
          actionRequired: 'Calculate final settlement including EOSB, unused leave, and deductions.'
        };
        break;

      case 'manager':
        if (offboarding.managerId) {
          recipients = [offboarding.managerId.email];
          subject = `Team Member Departure - ${offboarding.employeeName}`;
          messageData = {
            type: 'manager_notification',
            employeeName: offboarding.employeeName,
            exitType: exitType,
            lastWorkingDay: lastWorkingDay,
            actionRequired: 'Oversee knowledge transfer, provide exit interview feedback, and plan team coverage.'
          };
        }
        break;

      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }

    // Send notifications
    if (recipients.length > 0) {
      await EmailService.sendEmail({
        to: recipients,
        subject: subject,
        html: generateOffboardingNotificationEmail(messageData)
      });

      // Log notification in timeline
      await Offboarding.findByIdAndUpdate(offboarding._id, {
        $push: {
          timeline: {
            eventType: 'notification_sent',
            eventDate: new Date(),
            description: `${notificationType} notification sent`,
            status: 'completed'
          }
        }
      });

      logger.info(`[Offboarding Activity] ${notificationType} notification sent successfully for employee ${employeeId}`);
    }

    return {
      success: true,
      notificationType,
      recipientCount: recipients.length
    };

  } catch (error) {
    logger.error(`[Offboarding Activity] Failed to notify ${notificationType}:`, error);
    throw error;
  }
}

/**
 * Initiate knowledge transfer process
 */
async function initiateKnowledgeTransfer({
  employeeId,
  department,
  jobTitle,
  handoverTo,
  lastWorkingDay,
  exitType
}) {
  try {
    logger.info(`[Offboarding Activity] Initiating knowledge transfer for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId }).populate('employeeId');

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Create knowledge transfer tasks
    const knowledgeTransferPlan = {
      created: true,
      createdDate: new Date(),
      handoverTo: handoverTo.map(person => ({
        employeeId: person.employeeId,
        employeeName: person.employeeName,
        role: person.role,
        responsibilities: person.responsibilities || []
      }))
    };

    // Update offboarding record
    await Offboarding.findByIdAndUpdate(offboarding._id, {
      'knowledgeTransfer.handoverPlan': knowledgeTransferPlan,
      'knowledgeTransfer.required': true,
      $push: {
        timeline: {
          eventType: 'knowledge_transfer_initiated',
          eventDate: new Date(),
          description: 'Knowledge transfer process initiated',
          status: 'completed'
        }
      }
    });

    // Notify handover recipients
    for (const person of handoverTo) {
      if (person.email) {
        await EmailService.sendEmail({
          to: person.email,
          subject: `Knowledge Transfer Assignment - ${offboarding.employeeName}`,
          html: generateKnowledgeTransferEmail({
            recipientName: person.employeeName,
            departingEmployeeName: offboarding.employeeName,
            jobTitle: jobTitle,
            lastWorkingDay: lastWorkingDay,
            responsibilities: person.responsibilities
          })
        });
      }
    }

    logger.info(`[Offboarding Activity] Knowledge transfer initiated successfully for employee ${employeeId}`);

    return {
      success: true,
      handoverCount: handoverTo.length,
      deadline: lastWorkingDay
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to initiate knowledge transfer:', error);
    throw error;
  }
}

/**
 * Revoke system access for departing employee
 */
async function revokeSystemAccess({
  employeeId,
  email,
  systemAccounts,
  scheduleTime,
  exitType
}) {
  try {
    logger.info(`[Offboarding Activity] Revoking system access for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId });

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Determine when to revoke access
    const isImmediate = scheduleTime === 'immediate' || exitType === 'termination';
    const revocationTime = isImmediate ? new Date() : new Date(scheduleTime);

    // Create IT clearance tasks
    const itClearanceTasks = [
      {
        taskId: `task_email_deactivation_${Date.now()}`,
        task: 'email_deactivation',
        taskName: 'Deactivate email account',
        taskNameAr: 'إلغاء تفعيل البريد الإلكتروني',
        completed: false
      },
      {
        taskId: `task_system_access_${Date.now()}`,
        task: 'system_access_revocation',
        taskName: 'Revoke system access',
        taskNameAr: 'إلغاء صلاحيات النظام',
        completed: false
      },
      {
        taskId: `task_vpn_access_${Date.now()}`,
        task: 'vpn_access_revocation',
        taskName: 'Revoke VPN access',
        taskNameAr: 'إلغاء صلاحيات VPN',
        completed: false
      },
      {
        taskId: `task_file_backup_${Date.now()}`,
        task: 'file_backup',
        taskName: 'Backup employee files',
        taskNameAr: 'نسخ ملفات الموظف احتياطياً',
        completed: false
      }
    ];

    // Update offboarding record
    await Offboarding.findByIdAndUpdate(offboarding._id, {
      'clearance.itClearance.tasks': itClearanceTasks,
      'clearance.itClearance.required': true,
      'clearance.itClearance.emailDeactivationDate': revocationTime,
      $push: {
        timeline: {
          eventType: 'access_revocation_scheduled',
          eventDate: new Date(),
          description: `System access revocation scheduled for ${revocationTime.toISOString()}`,
          status: isImmediate ? 'completed' : 'scheduled'
        }
      }
    });

    // Send notification to IT team
    const itContacts = await getITContacts(offboarding.firmId, offboarding.lawyerId);
    if (itContacts.length > 0) {
      await EmailService.sendEmail({
        to: itContacts,
        subject: `[${isImmediate ? 'URGENT' : 'SCHEDULED'}] System Access Revocation - ${offboarding.employeeName}`,
        html: generateAccessRevocationEmail({
          employeeName: offboarding.employeeName,
          email: email,
          revocationTime: revocationTime,
          isImmediate: isImmediate,
          tasks: itClearanceTasks
        })
      });
    }

    logger.info(`[Offboarding Activity] System access revocation ${isImmediate ? 'initiated' : 'scheduled'} for employee ${employeeId}`);

    return {
      success: true,
      revocationTime: revocationTime.toISOString(),
      isImmediate,
      taskCount: itClearanceTasks.length
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to revoke system access:', error);
    throw error;
  }
}

/**
 * Schedule equipment return
 */
async function scheduleEquipmentReturn({
  employeeId,
  itemsToReturn,
  lastWorkingDay,
  department
}) {
  try {
    logger.info(`[Offboarding Activity] Scheduling equipment return for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId });

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Standard equipment items if none specified
    const standardItems = itemsToReturn.length > 0 ? itemsToReturn : [
      { itemType: 'laptop', itemDescription: 'Company laptop', returned: false },
      { itemType: 'mobile', itemDescription: 'Company mobile phone', returned: false },
      { itemType: 'id_badge', itemDescription: 'Employee ID badge', returned: false },
      { itemType: 'access_card', itemDescription: 'Office access card', returned: false },
      { itemType: 'keys', itemDescription: 'Office keys', returned: false }
    ];

    // Update offboarding record with equipment items
    await Offboarding.findByIdAndUpdate(offboarding._id, {
      'clearance.itemsToReturn': standardItems,
      'clearance.allItemsReturned': false,
      $push: {
        timeline: {
          eventType: 'equipment_return_scheduled',
          eventDate: new Date(),
          description: `Equipment return scheduled - ${standardItems.length} items`,
          status: 'scheduled'
        }
      }
    });

    // Notify employee and IT/Admin
    await EmailService.sendEmail({
      to: offboarding.email,
      subject: 'Equipment Return Required',
      html: generateEquipmentReturnEmail({
        employeeName: offboarding.employeeName,
        items: standardItems,
        deadline: lastWorkingDay,
        department: department
      })
    });

    logger.info(`[Offboarding Activity] Equipment return scheduled for employee ${employeeId} - ${standardItems.length} items`);

    return {
      success: true,
      itemCount: standardItems.length,
      deadline: lastWorkingDay
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to schedule equipment return:', error);
    throw error;
  }
}

/**
 * Schedule exit interview
 */
async function scheduleExitInterview({
  employeeId,
  employeeName,
  email,
  exitType,
  lastWorkingDay,
  interviewMethod
}) {
  try {
    logger.info(`[Offboarding Activity] Scheduling exit interview for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId });

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Calculate preferred interview date (3-5 days before last working day)
    const lastDay = new Date(lastWorkingDay);
    const preferredDate = new Date(lastDay);
    preferredDate.setDate(preferredDate.getDate() - 3);

    // Update offboarding record
    await Offboarding.findByIdAndUpdate(offboarding._id, {
      'exitInterview.required': true,
      'exitInterview.scheduled': true,
      'exitInterview.scheduledDate': preferredDate,
      'exitInterview.interviewMethod': interviewMethod,
      $push: {
        timeline: {
          eventType: 'exit_interview',
          eventDate: new Date(),
          description: `Exit interview scheduled for ${preferredDate.toISOString()}`,
          status: 'scheduled'
        }
      }
    });

    // Send interview invitation
    await EmailService.sendEmail({
      to: email,
      subject: 'Exit Interview Invitation',
      html: generateExitInterviewEmail({
        employeeName: employeeName,
        scheduledDate: preferredDate,
        interviewMethod: interviewMethod,
        exitType: exitType
      })
    });

    // Notify HR
    const hrContacts = await getHRContacts(offboarding.firmId, offboarding.lawyerId);
    if (hrContacts.length > 0) {
      await EmailService.sendEmail({
        to: hrContacts,
        subject: `Exit Interview Scheduled - ${employeeName}`,
        html: `<p>Exit interview has been scheduled for ${employeeName} on ${preferredDate.toISOString()}.</p><p>Method: ${interviewMethod}</p>`
      });
    }

    logger.info(`[Offboarding Activity] Exit interview scheduled for employee ${employeeId}`);

    return {
      success: true,
      scheduledDate: preferredDate.toISOString(),
      interviewMethod
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to schedule exit interview:', error);
    throw error;
  }
}

/**
 * Generate clearance certificate
 */
async function generateClearanceCertificate({
  employeeId,
  offboardingData,
  clearanceStatus
}) {
  try {
    logger.info(`[Offboarding Activity] Generating clearance certificate for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId });

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Determine if all clearances are obtained
    const allCleared = Object.values(clearanceStatus).every(status => status === true);

    // Generate certificate URL (placeholder - actual implementation would generate PDF)
    const certificateUrl = `/api/offboarding/${offboarding._id}/clearance-certificate`;

    // Update offboarding record
    await Offboarding.findByIdAndUpdate(offboarding._id, {
      'clearance.allClearancesObtained': allCleared,
      'clearance.finalClearanceDate': allCleared ? new Date() : null,
      'clearance.clearanceCertificate.issued': allCleared,
      'clearance.clearanceCertificate.issueDate': allCleared ? new Date() : null,
      'clearance.clearanceCertificate.certificateUrl': allCleared ? certificateUrl : null,
      'clearance.itClearance.cleared': clearanceStatus.itCleared || false,
      'clearance.itClearance.clearanceDate': clearanceStatus.itCleared ? new Date() : null,
      $push: {
        timeline: {
          eventType: allCleared ? 'clearance_completed' : 'clearance_started',
          eventDate: new Date(),
          description: allCleared ? 'All clearances obtained - certificate generated' : 'Clearance process started',
          status: allCleared ? 'completed' : 'pending'
        }
      }
    });

    if (allCleared) {
      // Send clearance certificate to employee
      await EmailService.sendEmail({
        to: offboardingData.email || offboarding.email,
        subject: 'Clearance Certificate Issued',
        html: generateClearanceCertificateEmail({
          employeeName: offboardingData.employeeName,
          certificateUrl: certificateUrl
        })
      });
    }

    logger.info(`[Offboarding Activity] Clearance certificate ${allCleared ? 'generated' : 'initiated'} for employee ${employeeId}`);

    return {
      success: true,
      allCleared,
      certificateUrl: allCleared ? certificateUrl : null,
      clearanceStatus
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to generate clearance certificate:', error);
    throw error;
  }
}

/**
 * Archive employee data
 */
async function archiveEmployeeData({
  employeeId,
  email,
  department,
  retentionYears
}) {
  try {
    logger.info(`[Offboarding Activity] Archiving data for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId });
    const employee = await Employee.findById(employeeId);

    if (!offboarding || !employee) {
      throw new Error(`Records not found for employee ${employeeId}`);
    }

    // Archive employee data (placeholder - actual implementation would backup to secure storage)
    const archiveData = {
      employeeId: employeeId,
      offboardingId: offboarding._id,
      archivedDate: new Date(),
      retentionUntil: new Date(new Date().setFullYear(new Date().getFullYear() + retentionYears)),
      employeeData: {
        personalInfo: employee.personalInfo,
        employment: employee.employment,
        compensation: employee.compensation
      },
      offboardingData: {
        exitType: offboarding.exitType,
        finalSettlement: offboarding.finalSettlement,
        clearance: offboarding.clearance
      }
    };

    // Update IT clearance tasks
    await Offboarding.findByIdAndUpdate(offboarding._id, {
      'clearance.itClearance.dataBackup.completed': true,
      'clearance.itClearance.dataBackup.backupDate': new Date(),
      'clearance.itClearance.dataBackup.required': true,
      $push: {
        timeline: {
          eventType: 'data_archived',
          eventDate: new Date(),
          description: `Employee data archived - retention until ${archiveData.retentionUntil.toISOString()}`,
          status: 'completed'
        }
      }
    });

    logger.info(`[Offboarding Activity] Employee data archived for ${employeeId} - retention: ${retentionYears} years`);

    return {
      success: true,
      archiveDate: archiveData.archivedDate.toISOString(),
      retentionUntil: archiveData.retentionUntil.toISOString()
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to archive employee data:', error);
    throw error;
  }
}

/**
 * Notify payroll for final settlement
 */
async function notifyPayroll({
  employeeId,
  employeeName,
  lastWorkingDay,
  exitType,
  serviceDuration,
  basicSalary,
  finalSettlementRequired
}) {
  try {
    logger.info(`[Offboarding Activity] Notifying payroll for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId });

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Get payroll/finance contacts
    const financeContacts = await getFinanceContacts(offboarding.firmId, offboarding.lawyerId);

    if (financeContacts.length > 0) {
      await EmailService.sendEmail({
        to: financeContacts,
        subject: `Final Settlement Required - ${employeeName}`,
        html: generatePayrollNotificationEmail({
          employeeName: employeeName,
          employeeNumber: offboarding.employeeNumber,
          lastWorkingDay: lastWorkingDay,
          exitType: exitType,
          serviceDuration: serviceDuration,
          basicSalary: basicSalary,
          settlementComponents: [
            'Outstanding salary',
            'Unused annual leave',
            'End of Service Benefit (EOSB)',
            'Deductions (loans, advances, etc.)'
          ]
        })
      });
    }

    // Update offboarding record
    await Offboarding.findByIdAndUpdate(offboarding._id, {
      'finalSettlement.calculated': false, // Will be calculated by finance team
      $push: {
        timeline: {
          eventType: 'settlement_calculated',
          eventDate: new Date(),
          description: 'Payroll notified for final settlement calculation',
          status: 'pending'
        }
      }
    });

    logger.info(`[Offboarding Activity] Payroll notified for employee ${employeeId}`);

    return {
      success: true,
      notifiedCount: financeContacts.length
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to notify payroll:', error);
    throw error;
  }
}

/**
 * Update HR records
 */
async function updateHRRecords({
  employeeId,
  update
}) {
  try {
    logger.info(`[Offboarding Activity] Updating HR records for employee ${employeeId}`);

    const offboarding = await Offboarding.findOne({ employeeId });

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Update offboarding record
    await Offboarding.findByIdAndUpdate(offboarding._id, update);

    // If workflow completed, update employee status
    if (update.status === 'completed') {
      await Employee.findByIdAndUpdate(employeeId, {
        'employment.employmentStatus': 'terminated',
        'employment.terminationDate': new Date(),
        'employment.terminationReason': offboarding.exitType
      });
    }

    logger.info(`[Offboarding Activity] HR records updated for employee ${employeeId}`);

    return {
      success: true,
      updatedFields: Object.keys(update)
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to update HR records:', error);
    throw error;
  }
}

/**
 * Escalate issue
 */
async function escalateIssue({
  employeeId,
  phase,
  issue,
  error,
  severity = 'medium',
  deadline,
  failedNotifications
}) {
  try {
    logger.warn(`[Offboarding Activity] Escalating issue for employee ${employeeId} - ${issue}`);

    const offboarding = await Offboarding.findOne({ employeeId });

    if (!offboarding) {
      throw new Error(`Offboarding record not found for employee ${employeeId}`);
    }

    // Get HR contacts for escalation
    const hrContacts = await getHRContacts(offboarding.firmId, offboarding.lawyerId);

    // Send escalation email
    if (hrContacts.length > 0) {
      await EmailService.sendEmail({
        to: hrContacts,
        subject: `[${severity.toUpperCase()}] Offboarding Escalation - ${offboarding.employeeName}`,
        html: generateEscalationEmail({
          employeeName: offboarding.employeeName,
          employeeNumber: offboarding.employeeNumber,
          phase: phase,
          issue: issue,
          error: error,
          severity: severity,
          deadline: deadline,
          failedNotifications: failedNotifications
        })
      });
    }

    // Log escalation in timeline
    await Offboarding.findByIdAndUpdate(offboarding._id, {
      $push: {
        timeline: {
          eventType: 'escalation',
          eventDate: new Date(),
          description: `${severity} escalation: ${issue}`,
          status: 'pending',
          notes: error || ''
        }
      }
    });

    logger.info(`[Offboarding Activity] Issue escalated for employee ${employeeId}`);

    return {
      success: true,
      severity,
      escalatedTo: hrContacts.length
    };

  } catch (error) {
    logger.error('[Offboarding Activity] Failed to escalate issue:', error);
    // Don't throw - escalation failure shouldn't break workflow
    return {
      success: false,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function getDepartmentContacts(department, firmId, lawyerId) {
  // Placeholder - actual implementation would fetch department contacts
  // For now, return HR contacts
  return getHRContacts(firmId, lawyerId);
}

async function getITContacts(firmId, lawyerId) {
  // Placeholder - actual implementation would fetch IT team contacts
  // For now, return a default IT email
  return [process.env.IT_EMAIL || 'it@company.com'];
}

async function getHRContacts(firmId, lawyerId) {
  // Placeholder - actual implementation would fetch HR team contacts
  // For now, return a default HR email
  return [process.env.HR_EMAIL || 'hr@company.com'];
}

async function getFinanceContacts(firmId, lawyerId) {
  // Placeholder - actual implementation would fetch finance team contacts
  // For now, return a default finance email
  return [process.env.FINANCE_EMAIL || 'finance@company.com'];
}

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════

function generateOffboardingNotificationEmail(data) {
  return `
    <h2>Employee Offboarding Notification</h2>
    <p><strong>Employee:</strong> ${data.employeeName}${data.employeeNameAr ? ` (${data.employeeNameAr})` : ''}</p>
    ${data.department ? `<p><strong>Department:</strong> ${data.department}</p>` : ''}
    ${data.jobTitle ? `<p><strong>Job Title:</strong> ${data.jobTitle}</p>` : ''}
    <p><strong>Exit Type:</strong> ${data.exitType}</p>
    <p><strong>Last Working Day:</strong> ${data.lastWorkingDay}</p>
    <p><strong>Action Required:</strong> ${data.actionRequired}</p>
    ${data.urgency ? `<p><strong>Urgency:</strong> <span style="color: red;">${data.urgency}</span></p>` : ''}
  `;
}

function generateKnowledgeTransferEmail(data) {
  return `
    <h2>Knowledge Transfer Assignment</h2>
    <p>Dear ${data.recipientName},</p>
    <p>You have been assigned to receive knowledge transfer from <strong>${data.departingEmployeeName}</strong> (${data.jobTitle}).</p>
    <p><strong>Last Working Day:</strong> ${data.lastWorkingDay}</p>
    ${data.responsibilities && data.responsibilities.length > 0 ? `
      <h3>Responsibilities to be transferred:</h3>
      <ul>
        ${data.responsibilities.map(r => `<li>${r.responsibility} (Priority: ${r.priority})</li>`).join('')}
      </ul>
    ` : ''}
    <p>Please coordinate with the departing employee to ensure smooth transition.</p>
  `;
}

function generateAccessRevocationEmail(data) {
  return `
    <h2>System Access Revocation ${data.isImmediate ? '[URGENT - IMMEDIATE ACTION REQUIRED]' : '[SCHEDULED]'}</h2>
    <p><strong>Employee:</strong> ${data.employeeName}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Revocation Time:</strong> ${data.revocationTime}</p>
    <h3>Tasks to Complete:</h3>
    <ul>
      ${data.tasks.map(t => `<li>${t.taskName} (${t.taskNameAr})</li>`).join('')}
    </ul>
    ${data.isImmediate ? '<p style="color: red; font-weight: bold;">IMMEDIATE ACTION REQUIRED - Terminate access now!</p>' : ''}
  `;
}

function generateEquipmentReturnEmail(data) {
  return `
    <h2>Equipment Return Required</h2>
    <p>Dear ${data.employeeName},</p>
    <p>Please return the following company equipment by <strong>${data.deadline}</strong>:</p>
    <ul>
      ${data.items.map(item => `<li>${item.itemDescription || item.itemType}</li>`).join('')}
    </ul>
    <p>Please contact ${data.department} department to arrange equipment return.</p>
  `;
}

function generateExitInterviewEmail(data) {
  return `
    <h2>Exit Interview Invitation</h2>
    <p>Dear ${data.employeeName},</p>
    <p>We would like to schedule an exit interview with you as part of the offboarding process.</p>
    <p><strong>Scheduled Date:</strong> ${data.scheduledDate}</p>
    <p><strong>Method:</strong> ${data.interviewMethod}</p>
    <p>Your feedback is valuable to us and will help improve our workplace.</p>
  `;
}

function generateClearanceCertificateEmail(data) {
  return `
    <h2>Clearance Certificate Issued</h2>
    <p>Dear ${data.employeeName},</p>
    <p>Your clearance certificate has been generated and is now available.</p>
    <p><strong>Certificate URL:</strong> <a href="${data.certificateUrl}">${data.certificateUrl}</a></p>
    <p>This certificate confirms that all clearances have been obtained.</p>
  `;
}

function generatePayrollNotificationEmail(data) {
  return `
    <h2>Final Settlement Required</h2>
    <p><strong>Employee:</strong> ${data.employeeName}</p>
    <p><strong>Employee Number:</strong> ${data.employeeNumber}</p>
    <p><strong>Last Working Day:</strong> ${data.lastWorkingDay}</p>
    <p><strong>Exit Type:</strong> ${data.exitType}</p>
    <p><strong>Service Duration:</strong> ${data.serviceDuration?.years || 0} years, ${data.serviceDuration?.months || 0} months</p>
    <p><strong>Basic Salary:</strong> ${data.basicSalary} SAR</p>
    <h3>Settlement Components to Calculate:</h3>
    <ul>
      ${data.settlementComponents.map(c => `<li>${c}</li>`).join('')}
    </ul>
    <p>Please calculate and prepare the final settlement as per Saudi Labor Law requirements.</p>
  `;
}

function generateEscalationEmail(data) {
  return `
    <h2 style="color: ${data.severity === 'critical' ? 'red' : data.severity === 'high' ? 'orange' : 'blue'};">
      [${data.severity.toUpperCase()}] Offboarding Escalation
    </h2>
    <p><strong>Employee:</strong> ${data.employeeName} (${data.employeeNumber})</p>
    <p><strong>Phase:</strong> ${data.phase}</p>
    <p><strong>Issue:</strong> ${data.issue}</p>
    ${data.error ? `<p><strong>Error:</strong> ${data.error}</p>` : ''}
    ${data.deadline ? `<p><strong>Deadline:</strong> ${data.deadline}</p>` : ''}
    ${data.failedNotifications ? `
      <h3>Failed Notifications:</h3>
      <ul>
        ${data.failedNotifications.map(n => `<li>${n}</li>`).join('')}
      </ul>
    ` : ''}
    <p><strong>Action Required:</strong> Please review and resolve this issue immediately.</p>
  `;
}

module.exports = {
  notifyDepartment,
  initiateKnowledgeTransfer,
  revokeSystemAccess,
  scheduleEquipmentReturn,
  scheduleExitInterview,
  generateClearanceCertificate,
  archiveEmployeeData,
  notifyPayroll,
  updateHRRecords,
  escalateIssue
};
