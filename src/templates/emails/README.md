# Email Templates System - Traf3li

Professional email templates system with multi-language support (Arabic/English) and modern responsive design.

## Overview

This email templates system provides a comprehensive solution for sending transactional emails with:

- **7 Professional Templates**: Welcome, OTP, Invoice, Payment Receipt, Case Update, Reminder, Password Reset
- **3 Layout Options**: Base (full-featured), Notification (simple), Transactional (invoices/receipts)
- **Dual Language Support**: Arabic (RTL) and English (LTR)
- **Mobile Responsive**: Optimized for all devices
- **Email Client Compatible**: Inline CSS for maximum compatibility
- **Traf3li Branding**: Consistent brand colors, logo, and styling

## Directory Structure

```
src/templates/emails/
├── layouts/
│   ├── base.html              # Full-featured layout with header/footer
│   ├── notification.html      # Simple notification layout
│   └── transactional.html     # Invoice/receipt layout
├── welcome.html               # New user welcome email
├── otp.html                   # OTP verification code
├── invoice.html               # Invoice sent to client
├── payment-receipt.html       # Payment confirmation
├── case-update.html           # Case status change notification
├── reminder.html              # Task/payment/hearing reminders
├── password-reset.html        # Password reset link
└── README.md                  # This file
```

## Services

### EmailTemplateService (`src/services/emailTemplate.service.js`)

Handles template loading, compilation, and rendering.

**Key Methods:**
- `loadTemplate(name)` - Load template from disk
- `loadLayout(layoutName)` - Load layout from disk
- `compile(template, variables)` - Compile template with Mustache
- `render(templateName, data, options)` - Render template with layout
- `preloadTemplates()` - Preload all templates into cache
- `formatCurrency(amount, currency, language)` - Format currency amounts
- `formatDate(date, language)` - Format dates
- `formatTime(date, language)` - Format times

### EmailService (`src/services/email.service.js`)

Main service for sending emails via Resend.

**Key Methods:**
- `sendWelcome(user, language)` - Send welcome email to new users
- `sendOTP(email, otp, language)` - Send OTP verification code
- `sendInvoice(invoice, client, language)` - Send invoice to client
- `sendPaymentReceipt(payment, invoice, client, language)` - Send payment receipt
- `sendCaseUpdate(caseData, client, updateInfo, language)` - Send case update notification
- `sendReminder(type, data, language)` - Send reminder (payment/task/hearing)
- `sendPasswordReset(user, resetToken, language)` - Send password reset link

## Usage Examples

### 1. Send Welcome Email

```javascript
const EmailService = require('./services/email.service');

// Send welcome email in Arabic (default)
await EmailService.sendWelcome({
  name: 'أحمد محمد',
  email: 'ahmed@example.com'
}, 'ar');

// Send welcome email in English
await EmailService.sendWelcome({
  name: 'John Doe',
  email: 'john@example.com'
}, 'en');
```

### 2. Send OTP Code

```javascript
const EmailService = require('./services/email.service');

await EmailService.sendOTP('user@example.com', '123456', 'ar');
```

### 3. Send Invoice

```javascript
const EmailService = require('./services/email.service');

const invoice = {
  invoiceNumber: 'INV-2024-001',
  items: [
    {
      description: 'استشارة قانونية',
      details: 'جلسة استشارية مدتها ساعة',
      quantity: 2,
      unitPrice: '500.00',
      total: '1,000.00'
    }
  ],
  subtotal: 1000,
  tax: true,
  taxPercent: 15,
  taxAmount: 150,
  total: 1150,
  currency: 'SAR',
  dueDate: new Date('2024-12-31'),
  paymentTerms: 'الدفع خلال 30 يوماً',
  paymentMethods: {
    methods: ['تحويل بنكي', 'بطاقة ائتمان', 'Apple Pay']
  },
  notes: 'شكراً لثقتك بخدماتنا',
  firmName: 'مكتب المحاماة المتميز'
};

const client = {
  name: 'أحمد محمد',
  email: 'ahmed@example.com',
  phone: '+966501234567',
  address: 'الرياض، المملكة العربية السعودية'
};

await EmailService.sendInvoice(invoice, client, 'ar');
```

### 4. Send Payment Receipt

```javascript
const EmailService = require('./services/email.service');

const payment = {
  receiptNumber: 'RCP-2024-001',
  amount: 1150,
  currency: 'SAR',
  paidAt: new Date(),
  paymentMethod: 'بطاقة ائتمان',
  transactionId: 'TXN123456789',
  referenceNumber: 'REF-2024-001',
  balanceInfo: {
    previousBalance: 2000,
    currentPayment: 1150,
    remainingBalance: 850
  },
  isPaid: false,
  firmName: 'مكتب المحاماة المتميز'
};

const invoice = {
  _id: 'invoice_id',
  invoiceNumber: 'INV-2024-001',
  description: 'استشارة قانونية',
  createdAt: new Date()
};

await EmailService.sendPaymentReceipt(payment, invoice, client, 'ar');
```

### 5. Send Case Update

```javascript
const EmailService = require('./services/email.service');

const caseData = {
  _id: 'case_id',
  caseNumber: 'CASE-2024-001',
  title: 'قضية عقارية',
  type: 'مدني',
  court: 'المحكمة العامة بالرياض'
};

const updateInfo = {
  previousStatus: 'قيد النظر',
  newStatus: 'جلسة قادمة',
  updateDate: new Date(),
  updatedBy: 'المحامي أحمد',
  details: 'تم تحديد موعد الجلسة القادمة',
  nextSteps: {
    steps: [
      'مراجعة المستندات المطلوبة',
      'الحضور في الموعد المحدد',
      'إحضار نسخة من الهوية الوطنية'
    ]
  },
  nextHearing: {
    date: '2024-12-15',
    time: '10:00 صباحاً',
    location: 'المحكمة العامة - القاعة 3',
    notes: 'يرجى الحضور قبل 15 دقيقة'
  },
  documents: {
    files: [
      { name: 'مستند القضية.pdf', url: 'https://...', size: '2.5 MB' },
      { name: 'المستندات الداعمة.pdf', url: 'https://...', size: '1.2 MB' }
    ]
  },
  actionRequired: true,
  actionRequiredText: 'يرجى مراجعة المستندات والتوقيع عليها قبل موعد الجلسة',
  lawyerName: 'المحامي أحمد محمد',
  lawyerTitle: 'محامي أول',
  firmName: 'مكتب المحاماة المتميز'
};

await EmailService.sendCaseUpdate(caseData, client, updateInfo, 'ar');
```

### 6. Send Reminder

```javascript
const EmailService = require('./services/email.service');

// Payment Reminder
await EmailService.sendReminder('payment', {
  email: 'client@example.com',
  clientName: 'أحمد محمد',
  invoiceNumber: 'INV-2024-001',
  amountDue: 1150,
  currency: 'SAR',
  dueDate: new Date('2024-12-31'),
  daysOverdue: 5,
  priority: 'high',
  actionUrl: 'https://dashboard.traf3li.com/invoices/123'
}, 'ar');

// Task Reminder
await EmailService.sendReminder('task', {
  email: 'lawyer@example.com',
  assignedToName: 'المحامي أحمد',
  taskName: 'مراجعة المستندات',
  caseNumber: 'CASE-2024-001',
  dueDate: new Date('2024-12-10'),
  dueTime: new Date('2024-12-10T14:00:00'),
  priority: 'medium',
  description: 'مراجعة المستندات القانونية للقضية',
  progress: 75,
  actionUrl: 'https://dashboard.traf3li.com/tasks/123'
}, 'ar');

// Hearing Reminder
await EmailService.sendReminder('hearing', {
  email: 'client@example.com',
  clientName: 'أحمد محمد',
  caseNumber: 'CASE-2024-001',
  dueDate: new Date('2024-12-15'),
  dueTime: new Date('2024-12-15T10:00:00'),
  court: 'المحكمة العامة بالرياض',
  location: 'القاعة 3',
  judge: 'القاضي محمد علي',
  priority: 'high',
  requiredDocuments: {
    documents: ['الهوية الوطنية', 'وكالة شرعية', 'مستندات القضية']
  },
  notes: 'يرجى الحضور قبل الموعد بـ 15 دقيقة',
  actionUrl: 'https://dashboard.traf3li.com/cases/123'
}, 'ar');
```

### 7. Send Password Reset

```javascript
const EmailService = require('./services/email.service');

const user = {
  name: 'أحمد محمد',
  email: 'ahmed@example.com'
};

const resetToken = 'reset_token_here';

await EmailService.sendPasswordReset(user, resetToken, 'ar');
```

### 8. Using EmailTemplateService Directly

```javascript
const EmailTemplateService = require('./services/emailTemplate.service');

// Render a custom template
const { html, attachments } = await EmailTemplateService.render('invoice', {
  invoiceNumber: 'INV-2024-001',
  clientName: 'أحمد محمد',
  // ... other data
}, {
  layout: 'transactional',
  language: 'ar',
  attachments: []
});

// Format currency
const formatted = EmailTemplateService.formatCurrency(1150, 'SAR', 'ar');
// Output: "1,150.00 SAR"

// Format date
const date = EmailTemplateService.formatDate(new Date(), 'ar');
// Output: "٨ ديسمبر ٢٠٢٤"

// Format time
const time = EmailTemplateService.formatTime(new Date(), 'ar');
// Output: "١٠:٣٠"
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Resend API
RESEND_API_KEY=your_resend_api_key

# Email Configuration
EMAIL_FROM=noreply@traf3li.com
EMAIL_FROM_NAME=Traf3li
EMAIL_REPLY_TO=support@traf3li.com

# Branding
LOGO_URL=https://traf3li.com/logo.png

# URLs
CLIENT_URL=https://traf3li.com
DASHBOARD_URL=https://dashboard.traf3li.com
```

## Template Customization

### Layouts

1. **Base Layout** (`layouts/base.html`)
   - Full-featured with header, footer, and social links
   - Best for: Welcome emails, case updates, detailed notifications
   - Features: Logo, social media links, unsubscribe option

2. **Notification Layout** (`layouts/notification.html`)
   - Simple and clean design
   - Best for: OTP, password reset, quick notifications
   - Features: Icon support, minimal footer

3. **Transactional Layout** (`layouts/transactional.html`)
   - Professional business layout
   - Best for: Invoices, receipts, financial documents
   - Features: Document number, date, tax number support

### Styling

All templates use inline CSS for maximum email client compatibility. The color scheme follows Traf3li branding:

- Primary Blue: `#1e3a8a` - `#3b82f6`
- Success Green: `#059669` - `#10b981`
- Warning Yellow: `#f59e0b`
- Error Red: `#dc2626`

### RTL Support

All templates automatically support RTL (Right-to-Left) for Arabic:
- Text alignment
- Border positioning
- Flex direction
- Proper spacing

## Preloading Templates

For better performance in production, preload all templates on server startup:

```javascript
// In your server.js
const EmailTemplateService = require('./services/emailTemplate.service');

// Preload templates on startup
EmailTemplateService.preloadTemplates();
```

## Testing Emails in Development

In development mode, emails won't be sent if `RESEND_API_KEY` is not configured. The service will log email details to the console instead.

```javascript
// Development mode - emails are logged, not sent
NODE_ENV=development npm run dev
```

## Best Practices

1. **Always specify language**: Pass the language parameter ('ar' or 'en') to all email methods
2. **Format data properly**: Use `EmailTemplateService.formatCurrency()` and `formatDate()` helpers
3. **Validate before sending**: Use `EmailTemplateService.validateTemplateData()` to check required fields
4. **Handle errors**: Wrap email sending in try-catch blocks
5. **Test thoroughly**: Test emails in different email clients (Gmail, Outlook, Apple Mail)

## Troubleshooting

### Templates not loading
- Ensure the templates directory exists: `src/templates/emails/`
- Check file permissions
- Clear cache: `EmailTemplateService.clearCache()`

### Emails not sending
- Verify `RESEND_API_KEY` is set
- Check email address format
- Review Resend dashboard for errors
- Check error logs

### Formatting issues
- Ensure data is properly formatted before passing to templates
- Use helper methods for currency and dates
- Test in multiple email clients

## Support

For issues or questions about the email templates system:
- Check the code documentation in `src/services/emailTemplate.service.js`
- Review example usage above
- Contact the development team

## License

Copyright © 2024 Traf3li. All rights reserved.
