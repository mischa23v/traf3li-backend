# Email Templates Integration Guide

This guide shows how to integrate the email templates system into your Traf3li backend application.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install the required `mustache` package that was added to package.json.

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@traf3li.com
EMAIL_FROM_NAME=Traf3li
EMAIL_REPLY_TO=support@traf3li.com
LOGO_URL=https://traf3li.com/logo.png

# URLs
CLIENT_URL=https://traf3li.com
DASHBOARD_URL=https://dashboard.traf3li.com
```

### 3. Import and Use

```javascript
const EmailService = require('./services/email.service');
```

## Integration Examples

### User Registration Flow

```javascript
// controllers/auth.controller.js
const EmailService = require('../services/email.service');

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Create user
    const user = await User.create({ name, email, password });

    // Send welcome email
    await EmailService.sendWelcome(user, 'ar');

    res.status(201).json({
      success: true,
      message: 'تم إنشاء الحساب بنجاح'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### OTP Verification Flow

```javascript
// controllers/auth.controller.js
const EmailService = require('../services/email.service');

exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database/cache with expiry
    await OTP.create({
      email,
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send OTP email
    await EmailService.sendOTP(email, otp, 'ar');

    res.json({
      success: true,
      message: 'تم إرسال رمز التحقق'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Invoice Creation Flow

```javascript
// controllers/invoice.controller.js
const EmailService = require('../services/email.service');

exports.createInvoice = async (req, res) => {
  try {
    const { clientId, items, dueDate } = req.body;

    // Create invoice
    const invoice = await Invoice.create({
      ...req.body,
      invoiceNumber: await generateInvoiceNumber(),
      firmId: req.user.firmId
    });

    // Get client details
    const client = await Client.findById(clientId);

    // Send invoice email
    await EmailService.sendInvoice(invoice, client, 'ar');

    res.status(201).json({
      success: true,
      invoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Payment Processing Flow

```javascript
// controllers/payment.controller.js
const EmailService = require('../services/email.service');

exports.processPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethod } = req.body;

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    const client = await Client.findById(invoice.clientId);

    // Process payment
    const payment = await Payment.create({
      invoiceId,
      amount,
      paymentMethod,
      receiptNumber: await generateReceiptNumber(),
      paidAt: new Date()
    });

    // Update invoice
    invoice.paidAmount += amount;
    invoice.status = invoice.paidAmount >= invoice.total ? 'paid' : 'partial';
    await invoice.save();

    // Send payment receipt
    await EmailService.sendPaymentReceipt(payment, invoice, client, 'ar');

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Case Update Flow

```javascript
// controllers/case.controller.js
const EmailService = require('../services/email.service');

exports.updateCaseStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, updateDetails, nextHearing } = req.body;

    // Get case
    const caseData = await Case.findById(id);
    const previousStatus = caseData.status;

    // Update case
    caseData.status = status;
    await caseData.save();

    // Get client
    const client = await Client.findById(caseData.clientId);

    // Prepare update info
    const updateInfo = {
      previousStatus,
      newStatus: status,
      updateDate: new Date(),
      updatedBy: req.user.name,
      details: updateDetails,
      nextHearing,
      lawyerName: req.user.name,
      firmName: req.user.firm.name
    };

    // Send case update email
    await EmailService.sendCaseUpdate(caseData, client, updateInfo, 'ar');

    res.json({
      success: true,
      case: caseData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

### Reminder System with Cron Jobs

```javascript
// jobs/emailReminders.js
const cron = require('node-cron');
const EmailService = require('../services/email.service');
const Invoice = require('../models/invoice.model');
const Task = require('../models/task.model');
const Hearing = require('../models/hearing.model');

// Payment reminders - Daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('Running payment reminders...');

    // Find overdue invoices
    const overdueInvoices = await Invoice.find({
      status: { $in: ['pending', 'partial'] },
      dueDate: { $lt: new Date() }
    }).populate('clientId');

    for (const invoice of overdueInvoices) {
      const client = invoice.clientId;
      const daysOverdue = Math.floor((new Date() - invoice.dueDate) / (1000 * 60 * 60 * 24));

      await EmailService.sendReminder('payment', {
        email: client.email,
        clientName: client.name,
        invoiceNumber: invoice.invoiceNumber,
        amountDue: invoice.total - invoice.paidAmount,
        currency: invoice.currency || 'SAR',
        dueDate: invoice.dueDate,
        daysOverdue,
        priority: daysOverdue > 30 ? 'high' : 'medium',
        actionUrl: `${process.env.DASHBOARD_URL}/invoices/${invoice._id}`
      }, 'ar');
    }

    console.log(`Sent ${overdueInvoices.length} payment reminders`);
  } catch (error) {
    console.error('Error sending payment reminders:', error);
  }
});

// Task reminders - Daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  try {
    console.log('Running task reminders...');

    // Find tasks due today or overdue
    const dueTasks = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $lte: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    }).populate('assignedTo');

    for (const task of dueTasks) {
      await EmailService.sendReminder('task', {
        email: task.assignedTo.email,
        assignedToName: task.assignedTo.name,
        taskName: task.title,
        caseNumber: task.caseNumber,
        dueDate: task.dueDate,
        priority: task.priority || 'medium',
        description: task.description,
        progress: task.progress || 0,
        actionUrl: `${process.env.DASHBOARD_URL}/tasks/${task._id}`
      }, 'ar');
    }

    console.log(`Sent ${dueTasks.length} task reminders`);
  } catch (error) {
    console.error('Error sending task reminders:', error);
  }
});

// Hearing reminders - Daily at 7 AM (24h before hearing)
cron.schedule('0 7 * * *', async () => {
  try {
    console.log('Running hearing reminders...');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Find hearings scheduled for tomorrow
    const upcomingHearings = await Hearing.find({
      date: { $gte: tomorrow, $lt: dayAfterTomorrow }
    }).populate('caseId clientId');

    for (const hearing of upcomingHearings) {
      await EmailService.sendReminder('hearing', {
        email: hearing.clientId.email,
        clientName: hearing.clientId.name,
        caseNumber: hearing.caseId.caseNumber,
        dueDate: hearing.date,
        dueTime: hearing.time,
        court: hearing.court,
        location: hearing.location,
        priority: 'high',
        notes: hearing.notes,
        actionUrl: `${process.env.DASHBOARD_URL}/cases/${hearing.caseId._id}`
      }, 'ar');
    }

    console.log(`Sent ${upcomingHearings.length} hearing reminders`);
  } catch (error) {
    console.error('Error sending hearing reminders:', error);
  }
});

module.exports = {
  startReminderJobs: () => {
    console.log('Email reminder jobs started');
  }
};
```

### Password Reset Flow

```javascript
// controllers/auth.controller.js
const crypto = require('crypto');
const EmailService = require('../services/email.service');

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save token to user
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send password reset email
    await EmailService.sendPasswordReset(user, resetToken, 'ar');

    res.json({
      success: true,
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

## Server Initialization

Add to your `server.js` to preload templates on startup:

```javascript
// src/server.js
const EmailTemplateService = require('./services/emailTemplate.service');

// ... other imports and setup

// Preload email templates for better performance
EmailTemplateService.preloadTemplates();

// Start reminder jobs
if (process.env.NODE_ENV === 'production') {
  const { startReminderJobs } = require('./jobs/emailReminders');
  startReminderJobs();
}

// ... rest of server setup
```

## Error Handling

Always wrap email sending in try-catch blocks and handle errors gracefully:

```javascript
try {
  await EmailService.sendWelcome(user, 'ar');
} catch (error) {
  // Log error but don't fail the request
  console.error('Failed to send welcome email:', error);

  // Optionally: Store failed email in a queue for retry
  await FailedEmail.create({
    type: 'welcome',
    recipient: user.email,
    data: { userId: user._id },
    error: error.message
  });
}
```

## Background Processing (Recommended)

For better performance, send emails asynchronously using Bull queues:

```javascript
// The email.service.js already integrates with QueueService
// Emails are automatically queued by default

// To send immediately (not queued):
await EmailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  html: '<p>Test</p>'
}, false); // false = don't use queue
```

## Testing

### Test in Development

```javascript
// Set NODE_ENV=development to log emails instead of sending
process.env.NODE_ENV = 'development';

await EmailService.sendWelcome(user, 'ar');
// Console output: Email details: { to: 'user@example.com', subject: '...' }
```

### Test with Real Emails

```bash
# Set up Resend test mode
RESEND_API_KEY=re_test_xxxxx npm run dev
```

## Monitoring

Monitor email sending in your logs:

```javascript
// Successful sends log:
// ✓ Email sent successfully to user@example.com: Welcome to Traf3li

// Failed sends log:
// ✗ Failed to send email to user@example.com: Error message
```

## Performance Tips

1. **Preload templates**: Call `EmailTemplateService.preloadTemplates()` on server startup
2. **Use queues**: Enable background email processing with Bull
3. **Cache formatted data**: Cache currency/date formatting for repeated values
4. **Batch sends**: Group multiple emails when possible
5. **Monitor Resend quota**: Track your email sending limits

## Multi-language Support

The system automatically detects language and applies proper formatting:

```javascript
// Arabic (RTL)
await EmailService.sendInvoice(invoice, client, 'ar');
// - Right-to-left layout
// - Arabic number formatting
// - Arabic date formatting

// English (LTR)
await EmailService.sendInvoice(invoice, client, 'en');
// - Left-to-right layout
// - Western number formatting
// - English date formatting
```

## Custom Templates

To create custom templates:

1. Create HTML file in `src/templates/emails/`
2. Use Mustache syntax: `{{variable}}`, `{{#section}}...{{/section}}`
3. Render with `EmailTemplateService.render()`

Example:

```javascript
// src/templates/emails/custom.html
<h1>{{title}}</h1>
<p>{{message}}</p>

// Usage
const { html } = await EmailTemplateService.render('custom', {
  title: 'Custom Email',
  message: 'Hello World'
}, { layout: 'base', language: 'en' });
```

## Support

For questions or issues:
- Review the README.md in the templates directory
- Check the inline documentation in service files
- Contact the development team

---

**Last Updated**: December 2024
**Version**: 1.0.0
