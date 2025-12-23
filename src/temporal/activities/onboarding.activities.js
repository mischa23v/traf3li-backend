/**
 * Employee Onboarding Activities for Temporal Workflow
 *
 * Activities are executed in the worker environment and can:
 * - Make database calls
 * - Send emails
 * - Call external services
 * - Perform side effects
 *
 * Each activity should be idempotent and handle retries gracefully.
 */

const Onboarding = require('../../models/onboarding.model');
const Employee = require('../../models/employee.model');
const EmailService = require('../../services/email.service');
const logger = require('../../utils/logger');

/**
 * Send welcome email to new employee
 * @param {Object} params - { employeeId, onboardingId }
 */
async function sendWelcomeEmail({ employeeId, onboardingId }) {
  try {
    logger.info(`[Activity] Sending welcome email for employee: ${employeeId}`);

    const employee = await Employee.findById(employeeId);
    const onboarding = await Onboarding.findById(onboardingId);

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    const emailData = {
      to: employee.personalInfo?.email || employee.personalInfo?.personalEmail,
      subject: `مرحباً بك في ${onboarding.firmName || 'فريقنا'} - Welcome to the Team!`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">مرحباً ${employee.personalInfo?.fullNameArabic || employee.personalInfo?.fullNameEnglish}!</h1>
          <p>نحن متحمسون لانضمامك إلى فريقنا كـ <strong>${onboarding.jobTitle || employee.employment?.jobTitle}</strong>.</p>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1f2937; margin-top: 0;">معلومات البدء</h2>
            <p><strong>تاريخ البدء:</strong> ${onboarding.startDate ? new Date(onboarding.startDate).toLocaleDateString('ar-SA') : 'سيتم تحديده قريباً'}</p>
            <p><strong>القسم:</strong> ${onboarding.department || 'سيتم تحديده'}</p>
            <p><strong>المدير المباشر:</strong> ${onboarding.managerName || 'سيتم تحديده'}</p>
          </div>

          <h2 style="color: #1f2937;">الخطوات التالية</h2>
          <ol style="line-height: 1.8;">
            <li>استكمال المستندات المطلوبة (سنرسل لك قائمة مفصلة)</li>
            <li>مراجعة عقد العمل والتوقيع عليه</li>
            <li>إعداد حساباتك الإلكترونية</li>
            <li>التحضير ليومك الأول</li>
          </ol>

          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1e40af;">نصيحة مهمة</h3>
            <p>إذا كانت لديك أي أسئلة قبل تاريخ بدء العمل، لا تتردد في التواصل مع قسم الموارد البشرية.</p>
          </div>

          <p>نتطلع إلى العمل معك!</p>
          <p style="color: #6b7280;">مع أطيب التحيات،<br>فريق الموارد البشرية</p>
        </div>
      `
    };

    await EmailService.sendEmail(emailData, false); // Send synchronously for critical welcome email

    // Update onboarding record
    await Onboarding.findByIdAndUpdate(onboardingId, {
      'preBoarding.welcomePackage.welcomeEmail.sent': true,
      'preBoarding.welcomePackage.welcomeEmail.sentDate': new Date()
    });

    logger.info(`[Activity] Welcome email sent successfully to ${employee.personalInfo?.email}`);
    return { success: true, sentTo: employee.personalInfo?.email };
  } catch (error) {
    logger.error(`[Activity] Failed to send welcome email: ${error.message}`);
    throw error;
  }
}

/**
 * Create system accounts for new employee (email, VPN, systems access)
 * @param {Object} params - { employeeId, onboardingId, systems }
 */
async function createSystemAccounts({ employeeId, onboardingId, systems = [] }) {
  try {
    logger.info(`[Activity] Creating system accounts for employee: ${employeeId}`);

    const employee = await Employee.findById(employeeId);
    const onboarding = await Onboarding.findById(onboardingId);

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // In a real implementation, this would:
    // 1. Call Active Directory API to create email account
    // 2. Call VPN system to create VPN account
    // 3. Call various internal systems to create accounts
    // 4. Generate temporary passwords

    // For now, we'll simulate this and update the onboarding record
    const emailAddress = employee.personalInfo?.email ||
      `${employee.personalInfo?.fullNameEnglish?.toLowerCase().replace(/\s+/g, '.')}@company.com`;

    const systemAccesses = systems.map(systemName => ({
      systemName,
      accessGranted: true,
      firstLogin: false,
      trainingRequired: true,
      trainingCompleted: false
    }));

    await Onboarding.findByIdAndUpdate(onboardingId, {
      'preBoarding.itAccountSetup.emailCreated': true,
      'preBoarding.itAccountSetup.emailAddress': emailAddress,
      'preBoarding.itAccountSetup.systemAccessCreated': true,
      'preBoarding.itAccountSetup.credentialsSent': false,
      'preBoarding.itAccountSetup.requestDate': new Date(),
      'firstDay.itLogin.systems': systemAccesses
    });

    logger.info(`[Activity] System accounts created for ${emailAddress}`);
    return {
      success: true,
      emailAddress,
      systemsConfigured: systems.length,
      systems: systemAccesses
    };
  } catch (error) {
    logger.error(`[Activity] Failed to create system accounts: ${error.message}`);
    throw error;
  }
}

/**
 * Assign equipment to employee (laptop, phone, etc.)
 * @param {Object} params - { employeeId, onboardingId, equipment }
 */
async function assignEquipment({ employeeId, onboardingId, equipment = [] }) {
  try {
    logger.info(`[Activity] Assigning equipment for employee: ${employeeId}`);

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // In a real implementation, this would:
    // 1. Check equipment inventory
    // 2. Reserve equipment items
    // 3. Update asset management system
    // 4. Create equipment tracking records

    const equipmentItems = equipment.map(item => ({
      equipmentType: item.type,
      equipmentId: item.id || `EQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      serialNumber: item.serialNumber || null,
      provided: false,
      providedDate: null,
      acknowledged: false
    }));

    await Onboarding.findByIdAndUpdate(onboardingId, {
      'firstDay.workstation.equipmentProvided': equipmentItems,
      'preBoarding.workstationPrep.equipmentReady': true
    });

    logger.info(`[Activity] Equipment assigned: ${equipment.length} items`);
    return {
      success: true,
      itemsAssigned: equipment.length,
      equipment: equipmentItems
    };
  } catch (error) {
    logger.error(`[Activity] Failed to assign equipment: ${error.message}`);
    throw error;
  }
}

/**
 * Schedule training sessions for employee
 * @param {Object} params - { employeeId, onboardingId, trainingSessions }
 */
async function scheduleTraining({ employeeId, onboardingId, trainingSessions = [] }) {
  try {
    logger.info(`[Activity] Scheduling training for employee: ${employeeId}`);

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // In a real implementation, this would:
    // 1. Check trainer availability
    // 2. Reserve training rooms
    // 3. Send calendar invites
    // 4. Update training management system

    const scheduledSessions = trainingSessions.map(session => ({
      sessionId: `TR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      systemName: session.systemName,
      moduleName: session.moduleName,
      moduleNameAr: session.moduleNameAr,
      category: session.category || 'mandatory',
      trainingType: session.type || 'online',
      trainer: session.trainer,
      scheduledDate: session.scheduledDate,
      duration: session.duration || 60,
      conducted: false,
      completedDate: null,
      materials: session.materials || [],
      testRequired: session.testRequired || false,
      testCompleted: false
    }));

    await Onboarding.findByIdAndUpdate(onboardingId, {
      $push: {
        'firstWeek.systemsTraining.trainingSessions': { $each: scheduledSessions }
      }
    });

    logger.info(`[Activity] Training scheduled: ${trainingSessions.length} sessions`);
    return {
      success: true,
      sessionsScheduled: trainingSessions.length,
      sessions: scheduledSessions
    };
  } catch (error) {
    logger.error(`[Activity] Failed to schedule training: ${error.message}`);
    throw error;
  }
}

/**
 * Send document reminder to employee
 * @param {Object} params - { employeeId, onboardingId, reminderType, documents }
 */
async function sendDocumentReminder({ employeeId, onboardingId, reminderType = 'pending', documents = [] }) {
  try {
    logger.info(`[Activity] Sending document reminder for employee: ${employeeId}`);

    const employee = await Employee.findById(employeeId);
    const onboarding = await Onboarding.findById(onboardingId);

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    const documentList = documents.map(doc =>
      `<li><strong>${doc.documentName || doc.documentNameAr}</strong> ${doc.required ? '(مطلوب - Required)' : '(اختياري - Optional)'}</li>`
    ).join('');

    const emailData = {
      to: employee.personalInfo?.email || employee.personalInfo?.personalEmail,
      subject: `تذكير: المستندات المطلوبة - Required Documents Reminder`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #dc2626;">تذكير بالمستندات المطلوبة</h1>
          <p>عزيزي/عزيزتي ${employee.personalInfo?.fullNameArabic || employee.personalInfo?.fullNameEnglish}،</p>

          <p>هذا تذكير ودي بأننا نحتاج إلى المستندات التالية لاستكمال عملية التوظيف الخاصة بك:</p>

          <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #dc2626;">
            <h3 style="margin-top: 0; color: #991b1b;">المستندات المطلوبة:</h3>
            <ul style="line-height: 1.8;">
              ${documentList}
            </ul>
          </div>

          <p><strong>يرجى تقديم هذه المستندات في أقرب وقت ممكن لتجنب أي تأخير في بدء عملك.</strong></p>

          <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>كيفية التقديم:</strong> يمكنك رفع المستندات من خلال بوابة الموظفين أو إرسالها عبر البريد الإلكتروني إلى قسم الموارد البشرية.</p>
          </div>

          <p>إذا كانت لديك أي أسئلة أو تحتاج إلى مساعدة، يرجى التواصل معنا.</p>

          <p style="color: #6b7280;">مع أطيب التحيات،<br>فريق الموارد البشرية</p>
        </div>
      `
    };

    await EmailService.sendEmail(emailData);

    logger.info(`[Activity] Document reminder sent to ${employee.personalInfo?.email}`);
    return {
      success: true,
      sentTo: employee.personalInfo?.email,
      documentsCount: documents.length
    };
  } catch (error) {
    logger.error(`[Activity] Failed to send document reminder: ${error.message}`);
    throw error;
  }
}

/**
 * Schedule performance review for employee
 * @param {Object} params - { employeeId, onboardingId, reviewType, reviewDate }
 */
async function schedulePerformanceReview({ employeeId, onboardingId, reviewType, reviewDate }) {
  try {
    logger.info(`[Activity] Scheduling ${reviewType} review for employee: ${employeeId}`);

    const employee = await Employee.findById(employeeId);
    const onboarding = await Onboarding.findById(onboardingId);

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Calculate review day number based on review type
    const reviewDayMapping = {
      '30_day': 30,
      '60_day': 60,
      '90_day': 90,
      'final': onboarding.probation?.probationPeriod || 90
    };

    const reviewRecord = {
      reviewId: `REV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reviewType,
      reviewDay: reviewDayMapping[reviewType] || 30,
      scheduledDate: reviewDate,
      conducted: false,
      conductedDate: null,
      performanceAssessment: {},
      competencyRatings: [],
      employeeAcknowledged: false
    };

    await Onboarding.findByIdAndUpdate(onboardingId, {
      $push: {
        'probationTracking.probationReviews': reviewRecord
      }
    });

    // Send notification to manager
    if (onboarding.managerEmail) {
      const emailData = {
        to: onboarding.managerEmail,
        subject: `مراجعة أداء مجدولة - Performance Review Scheduled`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">مراجعة أداء مجدولة</h1>
            <p>عزيزي/عزيزتي ${onboarding.managerName}،</p>

            <p>تم جدولة مراجعة أداء للموظف:</p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>الموظف:</strong> ${employee.personalInfo?.fullNameArabic || employee.personalInfo?.fullNameEnglish}</p>
              <p><strong>نوع المراجعة:</strong> ${reviewType}</p>
              <p><strong>تاريخ المراجعة:</strong> ${new Date(reviewDate).toLocaleDateString('ar-SA')}</p>
              <p><strong>اليوم:</strong> ${reviewDayMapping[reviewType]} يوم من بداية العمل</p>
            </div>

            <p>يرجى الاستعداد لإجراء هذه المراجعة ومراجعة أداء الموظف خلال فترة التجربة.</p>

            <p style="color: #6b7280;">مع أطيب التحيات،<br>نظام إدارة الموارد البشرية</p>
          </div>
        `
      };

      await EmailService.sendEmail(emailData);
    }

    logger.info(`[Activity] Performance review scheduled for ${reviewDate}`);
    return {
      success: true,
      reviewType,
      reviewDate,
      reviewId: reviewRecord.reviewId
    };
  } catch (error) {
    logger.error(`[Activity] Failed to schedule performance review: ${error.message}`);
    throw error;
  }
}

/**
 * Complete onboarding process
 * @param {Object} params - { employeeId, onboardingId, outcome }
 */
async function completeOnboarding({ employeeId, onboardingId, outcome = 'successful' }) {
  try {
    logger.info(`[Activity] Completing onboarding for employee: ${employeeId} with outcome: ${outcome}`);

    const employee = await Employee.findById(employeeId);
    const onboarding = await Onboarding.findById(onboardingId);

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // Update onboarding status
    await Onboarding.findByIdAndUpdate(onboardingId, {
      status: 'completed',
      'onboardingCompletion.allTasksCompleted': true,
      'onboardingCompletion.completionDate': new Date(),
      'onboardingCompletion.onboardingSuccessful': outcome === 'successful',
      'onboardingCompletion.onboardingClosed': true,
      'onboardingCompletion.closedDate': new Date()
    });

    // Update employee probation status if successful
    if (outcome === 'successful') {
      await Employee.findByIdAndUpdate(employeeId, {
        'employment.onProbation': false,
        'employment.employmentStatus': 'active'
      });
    }

    // Send completion email
    const emailData = {
      to: employee.personalInfo?.email,
      subject: outcome === 'successful'
        ? 'تهانينا! إتمام فترة التجربة بنجاح - Probation Completed Successfully'
        : 'إتمام عملية التأهيل - Onboarding Completed',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${outcome === 'successful' ? '#059669' : '#2563eb'};">
            ${outcome === 'successful' ? 'تهانينا!' : 'إتمام عملية التأهيل'}
          </h1>
          <p>عزيزي/عزيزتي ${employee.personalInfo?.fullNameArabic || employee.personalInfo?.fullNameEnglish}،</p>

          ${outcome === 'successful' ? `
            <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #059669;">
              <p style="margin: 0; font-size: 18px; color: #065f46;">
                <strong>نهنئك بإتمام فترة التجربة بنجاح!</strong>
              </p>
            </div>

            <p>نحن سعداء بإعلامك أنك أتممت فترة التجربة بنجاح وأصبحت الآن موظفاً دائماً في فريقنا.</p>

            <h2 style="color: #1f2937;">ما الذي يتغير الآن؟</h2>
            <ul style="line-height: 1.8;">
              <li>أصبحت موظفاً دائماً مع جميع المزايا الكاملة</li>
              <li>تم تفعيل جميع استحقاقاتك</li>
              <li>يمكنك الآن الاستفادة من جميع برامج التطوير المهني</li>
            </ul>
          ` : `
            <p>تم إتمام عملية التأهيل الخاصة بك. نشكرك على وقتك معنا.</p>
          `}

          <p>نتمنى لك كل التوفيق في مسيرتك المهنية!</p>

          <p style="color: #6b7280;">مع أطيب التحيات،<br>فريق الموارد البشرية</p>
        </div>
      `
    };

    await EmailService.sendEmail(emailData);

    logger.info(`[Activity] Onboarding completed successfully for ${employee.personalInfo?.email}`);
    return {
      success: true,
      outcome,
      completionDate: new Date()
    };
  } catch (error) {
    logger.error(`[Activity] Failed to complete onboarding: ${error.message}`);
    throw error;
  }
}

/**
 * Notify HR of important onboarding events
 * @param {Object} params - { employeeId, onboardingId, eventType, eventData }
 */
async function notifyHR({ employeeId, onboardingId, eventType, eventData = {} }) {
  try {
    logger.info(`[Activity] Notifying HR of event: ${eventType} for employee: ${employeeId}`);

    const employee = await Employee.findById(employeeId);
    const onboarding = await Onboarding.findById(onboardingId);

    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    // In a real implementation, this would send to HR email or notification system
    const hrEmail = process.env.HR_EMAIL || 'hr@company.com';

    const eventMessages = {
      'phase_completed': {
        subject: `اكتمال مرحلة التأهيل - ${eventData.phase}`,
        message: `تم إكمال مرحلة "${eventData.phase}" من عملية تأهيل الموظف ${employee.personalInfo?.fullNameArabic}.`
      },
      'documents_submitted': {
        subject: 'تقديم المستندات - Document Submission',
        message: `قام الموظف ${employee.personalInfo?.fullNameArabic} بتقديم ${eventData.documentsCount} مستند.`
      },
      'training_completed': {
        subject: 'إتمام التدريب - Training Completed',
        message: `أتم الموظف ${employee.personalInfo?.fullNameArabic} تدريب "${eventData.trainingName}".`
      },
      'review_due': {
        subject: 'مراجعة أداء مستحقة - Performance Review Due',
        message: `مراجعة الأداء ${eventData.reviewType} مستحقة للموظف ${employee.personalInfo?.fullNameArabic}.`
      },
      'onboarding_delayed': {
        subject: 'تأخير في التأهيل - Onboarding Delayed',
        message: `يواجه تأهيل الموظف ${employee.personalInfo?.fullNameArabic} بعض التأخير. السبب: ${eventData.reason}`
      }
    };

    const notification = eventMessages[eventType] || {
      subject: 'إشعار التأهيل - Onboarding Notification',
      message: `حدث جديد في تأهيل الموظف ${employee.personalInfo?.fullNameArabic}`
    };

    const emailData = {
      to: hrEmail,
      subject: notification.subject,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">إشعار قسم الموارد البشرية</h1>

          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #1f2937;">تفاصيل الموظف</h2>
            <p><strong>الاسم:</strong> ${employee.personalInfo?.fullNameArabic || employee.personalInfo?.fullNameEnglish}</p>
            <p><strong>رقم الموظف:</strong> ${employee.employeeId}</p>
            <p><strong>الوظيفة:</strong> ${onboarding.jobTitle || employee.employment?.jobTitle}</p>
            <p><strong>القسم:</strong> ${onboarding.department || 'غير محدد'}</p>
          </div>

          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-right: 4px solid #2563eb;">
            <h3 style="margin-top: 0; color: #1e40af;">الحدث</h3>
            <p>${notification.message}</p>
          </div>

          ${eventData.additionalInfo ? `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px;">
              <h4 style="margin-top: 0;">معلومات إضافية:</h4>
              <p>${eventData.additionalInfo}</p>
            </div>
          ` : ''}

          <p style="color: #6b7280; margin-top: 30px;">
            التاريخ: ${new Date().toLocaleString('ar-SA')}<br>
            رقم التأهيل: ${onboarding.onboardingId}
          </p>
        </div>
      `
    };

    await EmailService.sendEmail(emailData);

    logger.info(`[Activity] HR notified of ${eventType}`);
    return {
      success: true,
      eventType,
      notifiedAt: new Date()
    };
  } catch (error) {
    logger.error(`[Activity] Failed to notify HR: ${error.message}`);
    throw error;
  }
}

module.exports = {
  sendWelcomeEmail,
  createSystemAccounts,
  assignEquipment,
  scheduleTraining,
  sendDocumentReminder,
  schedulePerformanceReview,
  completeOnboarding,
  notifyHR
};
