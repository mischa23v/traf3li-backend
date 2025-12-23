/**
 * Email Service for TRAF3LI
 * Handles sending transactional emails using Resend and email templates
 * Integrated with Bull queue for async email sending
 */

const { Resend } = require('resend');
const EmailTemplateService = require('./emailTemplate.service');
const QueueService = require('./queue.service');
const logger = require('../utils/logger');

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'noreply@traf3li.com',
  fromName: process.env.EMAIL_FROM_NAME || 'Traf3li',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@traf3li.com'
};

class EmailService {
  /**
   * Send email using Resend (with optional queue support)
   * @param {Object} params - Email parameters
   * @param {boolean} useQueue - Whether to use background queue (default: true)
   */
  static async sendEmail({ to, subject, html, attachments = [], replyTo = EMAIL_CONFIG.replyTo }, useQueue = true) {
    if (!resend) {
      logger.warn('Resend API key not configured. Email not sent.');
      if (process.env.NODE_ENV === 'development') {
        logger.info('Email details:', { to, subject });
        return { id: 'dev-mock-id', success: true };
      }
      throw new Error('Email service not configured');
    }

    // Use queue for async processing (recommended for production)
    if (useQueue) {
      try {
        const job = await QueueService.sendEmail({
          to,
          subject,
          html,
          replyTo,
          attachments
        });

        logger.info(`📧 Email queued for ${to}: ${subject} (Job ID: ${job.jobId})`);
        return { id: job.jobId, success: true, queued: true };
      } catch (error) {
        logger.error(`✗ Failed to queue email to ${to}:`, error.message);
        // Fallback to sync sending if queue fails
        logger.info('Falling back to synchronous email sending...');
      }
    }

    // Synchronous email sending (immediate)
    try {
      const result = await resend.emails.send({
        from: `${EMAIL_CONFIG.fromName} <${EMAIL_CONFIG.from}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        replyTo,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      logger.info(`✓ Email sent successfully to ${to}: ${subject}`);
      return result;
    } catch (error) {
      logger.error(`✗ Failed to send email to ${to}:`, error.message);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Send welcome email to new user
   */
  static async sendWelcome(user, language = 'ar') {
    try {
      const translations = {
        ar: {
          subject: 'مرحباً بك في ترافعلي',
          greeting: `مرحباً ${user.name}!`,
          welcomeMessage: 'نحن متحمسون لانضمامك إلى منصة ترافعلي - نظام إدارة المكاتب القانونية الأكثر شمولاً في المملكة العربية السعودية.',
          introText: 'تم إنشاء حسابك بنجاح ويمكنك الآن البدء في استخدام جميع ميزات المنصة لإدارة مكتبك القانوني بكفاءة.',
          buttonText: 'الذهاب إلى لوحة التحكم',
          featuresTitle: 'ما الذي يمكنك فعله الآن؟',
          feature1Title: 'إدارة القضايا',
          feature1Description: 'قم بإضافة وتتبع جميع قضاياك القانونية مع إدارة المواعيد والمستندات.',
          feature2Title: 'إدارة العملاء',
          feature2Description: 'نظّم بيانات عملائك وتواصل معهم بسهولة.',
          feature3Title: 'الفواتير والمدفوعات',
          feature3Description: 'أنشئ الفواتير وتتبع المدفوعات بنظام محاسبي متكامل.',
          feature4Title: 'التقارير والتحليلات',
          feature4Description: 'احصل على تقارير شاملة لمتابعة أداء مكتبك القانوني.',
          nextStepsTitle: 'الخطوات التالية',
          nextStepsText: 'لتحقيق أقصى استفادة من المنصة، نوصي بالقيام بما يلي:',
          step1: 'أكمل معلومات ملفك الشخصي',
          step2: 'قم بإضافة أول قضية لك',
          step3: 'أضف بيانات عملائك',
          step4: 'استكشف لوحة التحكم وتعرف على الميزات',
          supportText: 'إذا كان لديك أي أسئلة أو تحتاج إلى مساعدة، فلا تتردد في التواصل مع فريق الدعم الخاص بنا.',
          closingText: 'نتطلع إلى مساعدتك في تحقيق النجاح!',
          teamName: 'فريق ترافعلي'
        },
        en: {
          subject: 'Welcome to Traf3li',
          greeting: `Welcome ${user.name}!`,
          welcomeMessage: 'We\'re excited to have you join Traf3li - the most comprehensive legal practice management platform in Saudi Arabia.',
          introText: 'Your account has been successfully created and you can now start using all platform features to manage your law firm efficiently.',
          buttonText: 'Go to Dashboard',
          featuresTitle: 'What can you do now?',
          feature1Title: 'Case Management',
          feature1Description: 'Add and track all your legal cases with appointment and document management.',
          feature2Title: 'Client Management',
          feature2Description: 'Organize your client data and communicate with them easily.',
          feature3Title: 'Invoicing & Payments',
          feature3Description: 'Create invoices and track payments with an integrated accounting system.',
          feature4Title: 'Reports & Analytics',
          feature4Description: 'Get comprehensive reports to monitor your law firm\'s performance.',
          nextStepsTitle: 'Next Steps',
          nextStepsText: 'To get the most out of the platform, we recommend:',
          step1: 'Complete your profile information',
          step2: 'Add your first case',
          step3: 'Add your clients\' data',
          step4: 'Explore the dashboard and learn about the features',
          supportText: 'If you have any questions or need assistance, don\'t hesitate to contact our support team.',
          closingText: 'We look forward to helping you succeed!',
          teamName: 'The Traf3li Team'
        }
      };

      const t = translations[language];
      const dashboardUrl = `${process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com'}/dashboard`;

      const { html } = await EmailTemplateService.render('welcome', {
        ...t,
        dashboardUrl,
        unsubscribeUrl: `${process.env.DASHBOARD_URL}/settings/notifications`
      }, {
        layout: 'base',
        language
      });

      return await this.sendEmail({
        to: user.email,
        subject: t.subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  /**
   * Send OTP verification email
   */
  static async sendOTP(email, otp, language = 'ar') {
    try {
      const translations = {
        ar: {
          subject: 'رمز التحقق الخاص بك',
          title: 'رمز التحقق',
          greeting: `مرحباً!`,
          messageText: 'لقد تلقيت هذا البريد الإلكتروني لأنك طلبت رمز تحقق للوصول إلى حسابك.',
          expiryTitle: 'مدة الصلاحية',
          expiryText: 'هذا الرمز صالح لمدة 10 دقائق فقط. بعد ذلك، ستحتاج إلى طلب رمز جديد.',
          securityTitle: 'الأمان',
          securityText: 'لا تشارك هذا الرمز مع أي شخص. موظفو ترافعلي لن يطلبوا منك هذا الرمز أبداً.',
          warningTitle: 'لم تطلب هذا الرمز؟',
          warningText: 'إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني. قد يكون شخص ما قد أدخل عنوان بريدك الإلكتروني عن طريق الخطأ.',
          supportText: 'إذا كنت تواجه أي مشاكل، يرجى التواصل مع فريق الدعم.',
          closingText: 'مع أطيب التحيات،',
          teamName: 'فريق ترافعلي'
        },
        en: {
          subject: 'Your Verification Code',
          title: 'Verification Code',
          greeting: 'Hello!',
          messageText: 'You received this email because you requested a verification code to access your account.',
          expiryTitle: 'Expiration',
          expiryText: 'This code is valid for only 10 minutes. After that, you will need to request a new code.',
          securityTitle: 'Security',
          securityText: 'Do not share this code with anyone. Traf3li staff will never ask you for this code.',
          warningTitle: 'Didn\'t request this code?',
          warningText: 'If you didn\'t request this code, please ignore this email. Someone may have entered your email address by mistake.',
          supportText: 'If you\'re experiencing any issues, please contact our support team.',
          closingText: 'Best regards,',
          teamName: 'The Traf3li Team'
        }
      };

      const t = translations[language];

      const { html } = await EmailTemplateService.render('otp', {
        ...t,
        otpCode: otp
      }, {
        layout: 'notification',
        language
      });

      return await this.sendEmail({
        to: email,
        subject: t.subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }
  }

  /**
   * Send invoice email to client
   */
  static async sendInvoice(invoice, client, language = 'ar') {
    try {
      const translations = {
        ar: {
          subject: `فاتورة جديدة #${invoice.invoiceNumber}`,
          title: 'فاتورة جديدة',
          invoiceNumberLabel: 'رقم الفاتورة',
          greeting: `عزيزي/عزيزتي ${client.name}،`,
          messageText: 'يسرنا إرسال الفاتورة التالية لك. يرجى مراجعة التفاصيل أدناه.',
          clientInfoTitle: 'معلومات العميل',
          clientNameLabel: 'الاسم',
          clientEmailLabel: 'البريد الإلكتروني',
          clientPhoneLabel: 'الهاتف',
          clientAddressLabel: 'العنوان',
          descriptionLabel: 'الوصف',
          quantityLabel: 'الكمية',
          unitPriceLabel: 'سعر الوحدة',
          totalLabel: 'الإجمالي',
          subtotalLabel: 'المجموع الفرعي',
          discountLabel: 'الخصم',
          taxLabel: 'ضريبة القيمة المضافة',
          paymentInfoTitle: 'معلومات الدفع',
          dueDateLabel: 'تاريخ الاستحقاق',
          paymentTermsLabel: 'شروط الدفع',
          paymentMethodsLabel: 'طرق الدفع المقبولة',
          notesTitle: 'ملاحظات',
          viewButtonText: 'عرض الفاتورة',
          payNowButtonText: 'الدفع الآن',
          supportText: 'إذا كان لديك أي استفسارات بخصوص هذه الفاتورة، يرجى التواصل معنا.',
          closingText: 'شكراً لثقتك بخدماتنا،',
          teamName: invoice.firmName || 'فريق ترافعلي'
        },
        en: {
          subject: `New Invoice #${invoice.invoiceNumber}`,
          title: 'New Invoice',
          invoiceNumberLabel: 'Invoice Number',
          greeting: `Dear ${client.name},`,
          messageText: 'We are pleased to send you the following invoice. Please review the details below.',
          clientInfoTitle: 'Client Information',
          clientNameLabel: 'Name',
          clientEmailLabel: 'Email',
          clientPhoneLabel: 'Phone',
          clientAddressLabel: 'Address',
          descriptionLabel: 'Description',
          quantityLabel: 'Qty',
          unitPriceLabel: 'Unit Price',
          totalLabel: 'Total',
          subtotalLabel: 'Subtotal',
          discountLabel: 'Discount',
          taxLabel: 'VAT',
          paymentInfoTitle: 'Payment Information',
          dueDateLabel: 'Due Date',
          paymentTermsLabel: 'Payment Terms',
          paymentMethodsLabel: 'Accepted Payment Methods',
          notesTitle: 'Notes',
          viewButtonText: 'View Invoice',
          payNowButtonText: 'Pay Now',
          supportText: 'If you have any questions about this invoice, please contact us.',
          closingText: 'Thank you for your business,',
          teamName: invoice.firmName || 'The Traf3li Team'
        }
      };

      const t = translations[language];
      const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';

      const { html } = await EmailTemplateService.render('invoice', {
        ...t,
        invoiceNumber: invoice.invoiceNumber,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientAddress: client.address,
        items: invoice.items,
        subtotal: EmailTemplateService.formatCurrency(invoice.subtotal, invoice.currency, language),
        discount: invoice.discount,
        discountPercent: invoice.discountPercent,
        discountAmount: EmailTemplateService.formatCurrency(invoice.discountAmount, invoice.currency, language),
        tax: invoice.tax,
        taxPercent: invoice.taxPercent || 15,
        taxAmount: EmailTemplateService.formatCurrency(invoice.taxAmount, invoice.currency, language),
        total: EmailTemplateService.formatCurrency(invoice.total, invoice.currency, language),
        currency: invoice.currency || 'SAR',
        dueDate: EmailTemplateService.formatDate(invoice.dueDate, language),
        paymentTerms: invoice.paymentTerms,
        paymentMethods: invoice.paymentMethods,
        notes: invoice.notes,
        invoiceUrl: `${dashboardUrl}/invoices/${invoice._id}`,
        payNowUrl: invoice.paymentUrl,
        date: EmailTemplateService.formatDate(invoice.createdAt || new Date(), language),
        documentNumberLabel: t.invoiceNumberLabel,
        documentNumber: invoice.invoiceNumber
      }, {
        layout: 'transactional',
        language
      });

      return await this.sendEmail({
        to: client.email,
        subject: t.subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send invoice email: ${error.message}`);
    }
  }

  /**
   * Send payment receipt email
   */
  static async sendPaymentReceipt(payment, invoice, client, language = 'ar') {
    try {
      const translations = {
        ar: {
          subject: `إيصال دفع #${payment.receiptNumber}`,
          title: 'إيصال الدفع',
          receiptNumberLabel: 'رقم الإيصال',
          greeting: `عزيزي/عزيزتي ${client.name}،`,
          messageText: 'شكراً لك على الدفع. تم استلام دفعتك بنجاح. فيما يلي تفاصيل الدفع:',
          paymentDetailsTitle: 'تفاصيل الدفع',
          amountLabel: 'المبلغ',
          paymentDateLabel: 'تاريخ الدفع',
          paymentMethodLabel: 'طريقة الدفع',
          transactionIdLabel: 'رقم المعاملة',
          referenceNumberLabel: 'الرقم المرجعي',
          invoiceReferenceTitle: 'مرجع الفاتورة',
          invoiceNumberLabel: 'رقم الفاتورة',
          invoiceDateLabel: 'تاريخ الفاتورة',
          serviceDescriptionLabel: 'وصف الخدمة',
          descriptionLabel: 'الوصف',
          totalPaidLabel: 'إجمالي المبلغ المدفوع',
          balanceTitle: 'معلومات الرصيد',
          previousBalanceLabel: 'الرصيد السابق',
          currentPaymentLabel: 'الدفعة الحالية',
          remainingBalanceLabel: 'الرصيد المتبقي',
          paidInFullText: 'تم الدفع بالكامل',
          downloadReceiptText: 'تحميل الإيصال',
          viewInvoiceText: 'عرض الفاتورة',
          thankYouTitle: 'شكراً لك!',
          thankYouText: 'نقدر ثقتك بنا ونتطلع إلى خدمتك في المستقبل.',
          taxReceiptText: 'هذا إيصال رسمي صالح لأغراض الضريبة.',
          supportText: 'إذا كان لديك أي استفسارات، يرجى التواصل معنا.',
          closingText: 'مع أطيب التحيات،',
          teamName: payment.firmName || 'فريق ترافعلي'
        },
        en: {
          subject: `Payment Receipt #${payment.receiptNumber}`,
          title: 'Payment Receipt',
          receiptNumberLabel: 'Receipt Number',
          greeting: `Dear ${client.name},`,
          messageText: 'Thank you for your payment. We have successfully received your payment. Here are the payment details:',
          paymentDetailsTitle: 'Payment Details',
          amountLabel: 'Amount',
          paymentDateLabel: 'Payment Date',
          paymentMethodLabel: 'Payment Method',
          transactionIdLabel: 'Transaction ID',
          referenceNumberLabel: 'Reference Number',
          invoiceReferenceTitle: 'Invoice Reference',
          invoiceNumberLabel: 'Invoice Number',
          invoiceDateLabel: 'Invoice Date',
          serviceDescriptionLabel: 'Service Description',
          descriptionLabel: 'Description',
          totalPaidLabel: 'Total Paid',
          balanceTitle: 'Balance Information',
          previousBalanceLabel: 'Previous Balance',
          currentPaymentLabel: 'Current Payment',
          remainingBalanceLabel: 'Remaining Balance',
          paidInFullText: 'Paid in Full',
          downloadReceiptText: 'Download Receipt',
          viewInvoiceText: 'View Invoice',
          thankYouTitle: 'Thank You!',
          thankYouText: 'We appreciate your trust and look forward to serving you in the future.',
          taxReceiptText: 'This is an official receipt valid for tax purposes.',
          supportText: 'If you have any questions, please contact us.',
          closingText: 'Best regards,',
          teamName: payment.firmName || 'The Traf3li Team'
        }
      };

      const t = translations[language];
      const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';

      const { html } = await EmailTemplateService.render('payment-receipt', {
        ...t,
        receiptNumber: payment.receiptNumber,
        amount: EmailTemplateService.formatCurrency(payment.amount, payment.currency, language),
        currency: payment.currency || 'SAR',
        paymentDate: EmailTemplateService.formatDate(payment.paidAt || new Date(), language),
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        referenceNumber: payment.referenceNumber,
        invoiceNumber: invoice?.invoiceNumber,
        invoiceDate: invoice?.createdAt ? EmailTemplateService.formatDate(invoice.createdAt, language) : null,
        serviceDescription: invoice?.description,
        balanceInfo: payment.balanceInfo,
        isPaid: payment.isPaid,
        receiptUrl: `${dashboardUrl}/receipts/${payment._id}`,
        invoiceUrl: invoice ? `${dashboardUrl}/invoices/${invoice._id}` : null,
        taxReceipt: true,
        date: EmailTemplateService.formatDate(payment.paidAt || new Date(), language),
        documentNumberLabel: t.receiptNumberLabel,
        documentNumber: payment.receiptNumber
      }, {
        layout: 'transactional',
        language
      });

      return await this.sendEmail({
        to: client.email,
        subject: t.subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send payment receipt email: ${error.message}`);
    }
  }

  /**
   * Send case update notification email
   */
  static async sendCaseUpdate(caseData, client, updateInfo, language = 'ar') {
    try {
      const translations = {
        ar: {
          subject: `تحديث في القضية #${caseData.caseNumber}`,
          title: 'تحديث حالة القضية',
          greeting: `عزيزي/عزيزتي ${client.name}،`,
          messageText: 'نود إعلامك بتحديث مهم في قضيتك. يرجى مراجعة التفاصيل أدناه.',
          caseInfoTitle: 'معلومات القضية',
          caseNumberLabel: 'رقم القضية',
          caseTitleLabel: 'عنوان القضية',
          caseTypeLabel: 'نوع القضية',
          courtLabel: 'المحكمة',
          statusUpdateTitle: 'تحديث الحالة',
          previousStatusLabel: 'الحالة السابقة',
          newStatusLabel: 'الحالة الجديدة',
          updateDateLabel: 'تاريخ التحديث',
          updatedByLabel: 'تم التحديث بواسطة',
          updateDetailsTitle: 'تفاصيل التحديث',
          nextStepsTitle: 'الخطوات التالية',
          nextHearingTitle: 'الجلسة القادمة',
          dateLabel: 'التاريخ',
          timeLabel: 'الوقت',
          locationLabel: 'الموقع',
          notesLabel: 'ملاحظات',
          documentsTitle: 'المستندات المرفقة',
          actionRequiredTitle: 'إجراء مطلوب',
          actionRequiredText: updateInfo.actionRequiredText || 'يرجى اتخاذ الإجراء المطلوب في أقرب وقت ممكن.',
          viewCaseButtonText: 'عرض القضية',
          viewDocumentsButtonText: 'عرض المستندات',
          supportText: 'إذا كان لديك أي استفسارات بخصوص هذا التحديث، يرجى التواصل مع محاميك.',
          closingText: 'مع أطيب التحيات،',
          lawyerName: updateInfo.lawyerName || 'محاميك',
          lawyerTitle: updateInfo.lawyerTitle,
          firmName: updateInfo.firmName
        },
        en: {
          subject: `Case Update #${caseData.caseNumber}`,
          title: 'Case Status Update',
          greeting: `Dear ${client.name},`,
          messageText: 'We would like to inform you of an important update to your case. Please review the details below.',
          caseInfoTitle: 'Case Information',
          caseNumberLabel: 'Case Number',
          caseTitleLabel: 'Case Title',
          caseTypeLabel: 'Case Type',
          courtLabel: 'Court',
          statusUpdateTitle: 'Status Update',
          previousStatusLabel: 'Previous Status',
          newStatusLabel: 'New Status',
          updateDateLabel: 'Update Date',
          updatedByLabel: 'Updated By',
          updateDetailsTitle: 'Update Details',
          nextStepsTitle: 'Next Steps',
          nextHearingTitle: 'Next Hearing',
          dateLabel: 'Date',
          timeLabel: 'Time',
          locationLabel: 'Location',
          notesLabel: 'Notes',
          documentsTitle: 'Attached Documents',
          actionRequiredTitle: 'Action Required',
          actionRequiredText: updateInfo.actionRequiredText || 'Please take the required action as soon as possible.',
          viewCaseButtonText: 'View Case',
          viewDocumentsButtonText: 'View Documents',
          supportText: 'If you have any questions about this update, please contact your lawyer.',
          closingText: 'Best regards,',
          lawyerName: updateInfo.lawyerName || 'Your Lawyer',
          lawyerTitle: updateInfo.lawyerTitle,
          firmName: updateInfo.firmName
        }
      };

      const t = translations[language];
      const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';

      // Determine status box styling
      const statusBoxClass = updateInfo.newStatus === 'closed' || updateInfo.newStatus === 'won'
        ? 'success-box'
        : updateInfo.newStatus === 'lost'
        ? 'warning-box'
        : 'info-box';

      const statusColor = updateInfo.newStatus === 'closed' || updateInfo.newStatus === 'won'
        ? '#059669'
        : updateInfo.newStatus === 'lost'
        ? '#dc2626'
        : '#3b82f6';

      const { html } = await EmailTemplateService.render('case-update', {
        ...t,
        caseNumber: caseData.caseNumber,
        caseTitle: caseData.title,
        caseType: caseData.type,
        court: caseData.court,
        previousStatus: updateInfo.previousStatus,
        newStatus: updateInfo.newStatus,
        updateDate: EmailTemplateService.formatDate(updateInfo.updateDate || new Date(), language),
        updatedBy: updateInfo.updatedBy,
        updateDetails: updateInfo.details,
        nextSteps: updateInfo.nextSteps,
        nextHearing: updateInfo.nextHearing,
        documents: updateInfo.documents,
        actionRequired: updateInfo.actionRequired,
        statusBoxClass,
        statusColor,
        caseUrl: `${dashboardUrl}/cases/${caseData._id}`,
        documentsUrl: `${dashboardUrl}/cases/${caseData._id}/documents`
      }, {
        layout: 'base',
        language
      });

      return await this.sendEmail({
        to: client.email,
        subject: t.subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send case update email: ${error.message}`);
    }
  }

  /**
   * Send reminder email (payment, task, hearing, etc.)
   */
  static async sendReminder(type, data, language = 'ar') {
    try {
      const reminderTypes = {
        payment: {
          ar: {
            subject: `تذكير بالدفع - فاتورة #${data.invoiceNumber}`,
            title: 'تذكير بالدفع',
            greeting: `عزيزي/عزيزتي ${data.clientName}،`,
            messageText: 'هذا تذكير ودي بأن لديك فاتورة مستحقة للدفع. يرجى مراجعة التفاصيل أدناه.',
            reminderType: 'تذكير بالدفع',
            isPaymentReminder: true
          },
          en: {
            subject: `Payment Reminder - Invoice #${data.invoiceNumber}`,
            title: 'Payment Reminder',
            greeting: `Dear ${data.clientName},`,
            messageText: 'This is a friendly reminder that you have an invoice due for payment. Please review the details below.',
            reminderType: 'Payment Reminder',
            isPaymentReminder: true
          }
        },
        task: {
          ar: {
            subject: `تذكير بالمهمة: ${data.taskName}`,
            title: 'تذكير بالمهمة',
            greeting: `عزيزي/عزيزتي ${data.assignedToName}،`,
            messageText: 'هذا تذكير بأن لديك مهمة مستحقة. يرجى مراجعة التفاصيل أدناه.',
            reminderType: 'تذكير بالمهمة',
            isTaskReminder: true
          },
          en: {
            subject: `Task Reminder: ${data.taskName}`,
            title: 'Task Reminder',
            greeting: `Dear ${data.assignedToName},`,
            messageText: 'This is a reminder that you have a task due. Please review the details below.',
            reminderType: 'Task Reminder',
            isTaskReminder: true
          }
        },
        hearing: {
          ar: {
            subject: `تذكير بالجلسة - قضية #${data.caseNumber}`,
            title: 'تذكير بالجلسة',
            greeting: `عزيزي/عزيزتي ${data.clientName}،`,
            messageText: 'هذا تذكير بأن لديك جلسة محكمة قادمة. يرجى مراجعة التفاصيل أدناه والتأكد من حضورك في الوقت المحدد.',
            reminderType: 'تذكير بالجلسة',
            isHearingReminder: true
          },
          en: {
            subject: `Hearing Reminder - Case #${data.caseNumber}`,
            title: 'Hearing Reminder',
            greeting: `Dear ${data.clientName},`,
            messageText: 'This is a reminder that you have an upcoming court hearing. Please review the details below and make sure to attend on time.',
            reminderType: 'Hearing Reminder',
            isHearingReminder: true
          }
        }
      };

      const reminderTranslations = reminderTypes[type]?.[language] || reminderTypes.payment[language];

      const commonTranslations = {
        ar: {
          reminderDetailsTitle: 'تفاصيل التذكير',
          typeLabel: 'النوع',
          subjectLabel: 'الموضوع',
          dueDateLabel: 'تاريخ الاستحقاق',
          dueTimeLabel: 'وقت الاستحقاق',
          priorityLabel: 'الأولوية',
          descriptionTitle: 'الوصف',
          paymentDetailsTitle: 'تفاصيل الدفع',
          invoiceNumberLabel: 'رقم الفاتورة',
          amountDueLabel: 'المبلغ المستحق',
          originalAmountLabel: 'المبلغ الأصلي',
          paidAmountLabel: 'المبلغ المدفوع',
          daysOverdueLabel: 'عدد أيام التأخير',
          lateFeeTitle: 'رسوم التأخير',
          lateFeeText: 'قد يتم تطبيق رسوم تأخير قدرها',
          taskDetailsTitle: 'تفاصيل المهمة',
          taskNameLabel: 'اسم المهمة',
          assignedToLabel: 'مسندة إلى',
          caseNumberLabel: 'رقم القضية',
          progressLabel: 'التقدم',
          hearingDetailsTitle: 'تفاصيل الجلسة',
          courtLabel: 'المحكمة',
          locationLabel: 'الموقع',
          judgeLabel: 'القاضي',
          requiredDocumentsTitle: 'المستندات المطلوبة',
          notesTitle: 'ملاحظات',
          primaryActionText: 'اتخاذ الإجراء',
          supportText: 'إذا كان لديك أي استفسارات، يرجى التواصل معنا.',
          closingText: 'مع أطيب التحيات،',
          teamName: data.teamName || 'فريق ترافعلي'
        },
        en: {
          reminderDetailsTitle: 'Reminder Details',
          typeLabel: 'Type',
          subjectLabel: 'Subject',
          dueDateLabel: 'Due Date',
          dueTimeLabel: 'Due Time',
          priorityLabel: 'Priority',
          descriptionTitle: 'Description',
          paymentDetailsTitle: 'Payment Details',
          invoiceNumberLabel: 'Invoice Number',
          amountDueLabel: 'Amount Due',
          originalAmountLabel: 'Original Amount',
          paidAmountLabel: 'Paid Amount',
          daysOverdueLabel: 'Days Overdue',
          lateFeeTitle: 'Late Fee',
          lateFeeText: 'A late fee of may be applied',
          taskDetailsTitle: 'Task Details',
          taskNameLabel: 'Task Name',
          assignedToLabel: 'Assigned To',
          caseNumberLabel: 'Case Number',
          progressLabel: 'Progress',
          hearingDetailsTitle: 'Hearing Details',
          courtLabel: 'Court',
          locationLabel: 'Location',
          judgeLabel: 'Judge',
          requiredDocumentsTitle: 'Required Documents',
          notesTitle: 'Notes',
          primaryActionText: 'Take Action',
          supportText: 'If you have any questions, please contact us.',
          closingText: 'Best regards,',
          teamName: data.teamName || 'The Traf3li Team'
        }
      };

      const t = { ...commonTranslations[language], ...reminderTranslations };
      const dashboardUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';

      // Set priority color
      const priorityColors = {
        high: '#dc2626',
        medium: '#f59e0b',
        low: '#3b82f6'
      };
      const priorityColor = priorityColors[data.priority] || priorityColors.medium;

      const { html } = await EmailTemplateService.render('reminder', {
        ...t,
        ...data,
        priorityColor,
        dueDate: data.dueDate ? EmailTemplateService.formatDate(data.dueDate, language) : null,
        dueTime: data.dueTime ? EmailTemplateService.formatTime(data.dueTime, language) : null,
        primaryActionUrl: data.actionUrl || `${dashboardUrl}`,
        secondaryActionUrl: data.secondaryActionUrl
      }, {
        layout: 'notification',
        language
      });

      return await this.sendEmail({
        to: data.email,
        subject: t.subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send reminder email: ${error.message}`);
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(user, resetToken, language = 'ar') {
    try {
      const translations = {
        ar: {
          subject: 'إعادة تعيين كلمة المرور',
          title: 'إعادة تعيين كلمة المرور',
          greeting: `مرحباً ${user.name}،`,
          messageText: 'تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك. انقر على الزر أدناه لإعادة تعيين كلمة المرور الخاصة بك.',
          buttonText: 'إعادة تعيين كلمة المرور',
          linkInfoTitle: 'معلومات الرابط',
          linkInfoText: 'سيأخذك هذا الرابط إلى صفحة آمنة حيث يمكنك إنشاء كلمة مرور جديدة لحسابك.',
          expiryTitle: 'انتهاء الصلاحية',
          expiryText: 'هذا الرابط صالح لمدة ساعة واحدة فقط لأسباب أمنية. بعد ذلك، ستحتاج إلى طلب رابط جديد.',
          alternativeMethodTitle: 'الطريقة البديلة',
          alternativeMethodText: 'إذا لم يعمل الزر أعلاه، يمكنك نسخ ولصق الرابط التالي في متصفحك:',
          securityWarningTitle: 'تحذير أمني',
          securityWarningText: 'إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد الإلكتروني وتأكد من أن حسابك آمن. قد يحاول شخص ما الوصول إلى حسابك.',
          securityTipsTitle: 'نصائح أمنية',
          securityTip1: 'استخدم كلمة مرور قوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز',
          securityTip2: 'لا تستخدم نفس كلمة المرور لحسابات متعددة',
          securityTip3: 'قم بتغيير كلمة المرور بانتظام',
          securityTip4: 'لا تشارك كلمة المرور مع أي شخص',
          notRequestedTitle: 'لم تطلب إعادة تعيين كلمة المرور؟',
          notRequestedText: 'إذا لم تطلب إعادة تعيين كلمة المرور، فلا داعي لاتخاذ أي إجراء. حسابك لا يزال آمناً.',
          supportText: 'إذا كنت تواجه أي مشاكل، يرجى التواصل مع فريق الدعم لدينا.',
          closingText: 'مع أطيب التحيات،',
          teamName: 'فريق ترافعلي'
        },
        en: {
          subject: 'Password Reset',
          title: 'Reset Your Password',
          greeting: `Hello ${user.name},`,
          messageText: 'We received a request to reset the password for your account. Click the button below to reset your password.',
          buttonText: 'Reset Password',
          linkInfoTitle: 'Link Information',
          linkInfoText: 'This link will take you to a secure page where you can create a new password for your account.',
          expiryTitle: 'Expiration',
          expiryText: 'This link is valid for only one hour for security reasons. After that, you will need to request a new link.',
          alternativeMethodTitle: 'Alternative Method',
          alternativeMethodText: 'If the button above doesn\'t work, you can copy and paste the following link into your browser:',
          securityWarningTitle: 'Security Warning',
          securityWarningText: 'If you didn\'t request a password reset, please ignore this email and make sure your account is secure. Someone may be trying to access your account.',
          securityTipsTitle: 'Security Tips',
          securityTip1: 'Use a strong password containing uppercase, lowercase, numbers, and symbols',
          securityTip2: 'Don\'t use the same password for multiple accounts',
          securityTip3: 'Change your password regularly',
          securityTip4: 'Never share your password with anyone',
          notRequestedTitle: 'Didn\'t request a password reset?',
          notRequestedText: 'If you didn\'t request a password reset, no action is needed. Your account is still secure.',
          supportText: 'If you\'re experiencing any issues, please contact our support team.',
          closingText: 'Best regards,',
          teamName: 'The Traf3li Team'
        }
      };

      const t = translations[language];
      const clientUrl = process.env.CLIENT_URL || 'https://traf3li.com';
      const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

      const { html } = await EmailTemplateService.render('password-reset', {
        ...t,
        resetUrl
      }, {
        layout: 'notification',
        language
      });

      return await this.sendEmail({
        to: user.email,
        subject: t.subject,
        html
      });
    } catch (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }
}

module.exports = EmailService;
