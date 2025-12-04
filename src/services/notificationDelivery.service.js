/**
 * Notification Delivery Service
 *
 * Handles delivery of notifications through multiple channels:
 * - in_app: Socket.io real-time (WORKING)
 * - push: Web Push notifications (TODO: Implement)
 * - email: Email via SMTP/MSG91 (TODO: Implement)
 * - sms: SMS via MSG91 (TODO: Implement)
 * - whatsapp: WhatsApp via MSG91 (TODO: Implement)
 *
 * MSG91 Integration Notes:
 * - Sign up at https://msg91.com
 * - Get API key from dashboard
 * - Configure SMS templates
 * - Set up WhatsApp Business API
 */

const { createNotification } = require('../controllers/notification.controller');

class NotificationDeliveryService {
    constructor() {
        // MSG91 configuration (to be set up later)
        this.msg91AuthKey = process.env.MSG91_AUTH_KEY;
        this.msg91SenderId = process.env.MSG91_SENDER_ID;
        this.msg91TemplateId = process.env.MSG91_TEMPLATE_ID;

        // Email configuration
        this.smtpHost = process.env.SMTP_HOST;
        this.smtpPort = process.env.SMTP_PORT;
        this.smtpUser = process.env.SMTP_USER;
        this.smtpPass = process.env.SMTP_PASS;

        // Track delivery status
        this.deliveryLog = [];
    }

    /**
     * Send notification through specified channels
     * @param {Object} reminder - The reminder object
     * @param {Array} channels - Array of channel names ['push', 'email', 'sms', 'whatsapp', 'in_app']
     * @param {Object} user - User object with contact details
     */
    async send(reminder, channels, user) {
        const results = [];

        for (const channel of channels) {
            try {
                let result;
                switch (channel) {
                    case 'in_app':
                        result = await this.sendInApp(reminder, user);
                        break;
                    case 'email':
                        result = await this.sendEmail(reminder, user);
                        break;
                    case 'sms':
                        result = await this.sendSMS(reminder, user);
                        break;
                    case 'whatsapp':
                        result = await this.sendWhatsApp(reminder, user);
                        break;
                    case 'push':
                        result = await this.sendPush(reminder, user);
                        break;
                    default:
                        result = { success: false, error: `Unknown channel: ${channel}` };
                }
                results.push({ channel, ...result });
            } catch (error) {
                console.error(`Error sending ${channel} notification:`, error.message);
                results.push({ channel, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Send in-app notification via Socket.io
     * This is the only channel that works currently
     */
    async sendInApp(reminder, user) {
        try {
            await createNotification({
                userId: user._id || user,
                type: 'reminder',
                title: 'تذكير',
                message: reminder.title,
                link: `/dashboard/tasks/reminders/${reminder._id}`,
                data: {
                    reminderId: reminder._id,
                    priority: reminder.priority,
                    type: reminder.type
                },
                icon: this.getPriorityIcon(reminder.priority),
                priority: reminder.priority === 'critical' ? 'urgent' : reminder.priority
            });

            return { success: true, channel: 'in_app' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Send email notification
     * TODO: Implement with Nodemailer or MSG91 Email API
     */
    async sendEmail(reminder, user) {
        // Check if email is configured
        if (!this.smtpHost && !this.msg91AuthKey) {
            console.log(`[EMAIL STUB] Would send email to ${user.email || 'unknown'}: ${reminder.title}`);
            return {
                success: false,
                error: 'Email not configured. Set SMTP_* or MSG91_* env variables.',
                stubbed: true
            };
        }

        // TODO: Implement actual email sending
        // Example with Nodemailer:
        // const nodemailer = require('nodemailer');
        // const transporter = nodemailer.createTransporter({
        //     host: this.smtpHost,
        //     port: this.smtpPort,
        //     secure: false,
        //     auth: { user: this.smtpUser, pass: this.smtpPass }
        // });
        // await transporter.sendMail({
        //     to: user.email,
        //     subject: `تذكير: ${reminder.title}`,
        //     html: this.getEmailTemplate(reminder)
        // });

        console.log(`[EMAIL STUB] Would send email to ${user.email || 'unknown'}: ${reminder.title}`);
        return { success: false, error: 'Email sending not implemented yet', stubbed: true };
    }

    /**
     * Send SMS notification
     * TODO: Implement with MSG91 SMS API
     */
    async sendSMS(reminder, user) {
        if (!this.msg91AuthKey) {
            console.log(`[SMS STUB] Would send SMS to ${user.phone || 'unknown'}: ${reminder.title}`);
            return {
                success: false,
                error: 'SMS not configured. Set MSG91_AUTH_KEY env variable.',
                stubbed: true
            };
        }

        // TODO: Implement MSG91 SMS
        // Example:
        // const response = await fetch('https://api.msg91.com/api/v5/flow/', {
        //     method: 'POST',
        //     headers: {
        //         'authkey': this.msg91AuthKey,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         template_id: this.msg91TemplateId,
        //         recipients: [{ mobiles: user.phone, reminder_title: reminder.title }]
        //     })
        // });

        console.log(`[SMS STUB] Would send SMS to ${user.phone || 'unknown'}: ${reminder.title}`);
        return { success: false, error: 'SMS sending not implemented yet', stubbed: true };
    }

    /**
     * Send WhatsApp notification
     * TODO: Implement with MSG91 WhatsApp API
     */
    async sendWhatsApp(reminder, user) {
        if (!this.msg91AuthKey) {
            console.log(`[WHATSAPP STUB] Would send WhatsApp to ${user.phone || 'unknown'}: ${reminder.title}`);
            return {
                success: false,
                error: 'WhatsApp not configured. Set MSG91_AUTH_KEY env variable.',
                stubbed: true
            };
        }

        // TODO: Implement MSG91 WhatsApp
        // MSG91 WhatsApp API endpoint: https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/

        console.log(`[WHATSAPP STUB] Would send WhatsApp to ${user.phone || 'unknown'}: ${reminder.title}`);
        return { success: false, error: 'WhatsApp sending not implemented yet', stubbed: true };
    }

    /**
     * Send Web Push notification
     * TODO: Implement with web-push library
     */
    async sendPush(reminder, user) {
        // Check if user has push subscription
        if (!user.pushSubscription) {
            console.log(`[PUSH STUB] User has no push subscription: ${reminder.title}`);
            return {
                success: false,
                error: 'User has no push subscription',
                stubbed: true
            };
        }

        // TODO: Implement web-push
        // const webpush = require('web-push');
        // webpush.setVapidDetails(
        //     process.env.VAPID_SUBJECT,
        //     process.env.VAPID_PUBLIC_KEY,
        //     process.env.VAPID_PRIVATE_KEY
        // );
        // await webpush.sendNotification(user.pushSubscription, JSON.stringify({
        //     title: 'تذكير',
        //     body: reminder.title,
        //     icon: '/icons/reminder.png',
        //     data: { url: `/dashboard/tasks/reminders/${reminder._id}` }
        // }));

        console.log(`[PUSH STUB] Would send push notification: ${reminder.title}`);
        return { success: false, error: 'Push notifications not implemented yet', stubbed: true };
    }

    /**
     * Get priority icon for notification
     */
    getPriorityIcon(priority) {
        const icons = {
            critical: '🚨',
            high: '⚠️',
            medium: '🔔',
            low: '📌'
        };
        return icons[priority] || '🔔';
    }

    /**
     * Generate email template (Arabic RTL)
     */
    getEmailTemplate(reminder) {
        return `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background: #f5f5f5; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; }
                .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: -30px -30px 20px; }
                .priority-critical { background: #dc2626; }
                .priority-high { background: #f59e0b; }
                .priority-medium { background: #3b82f6; }
                .priority-low { background: #6b7280; }
                .content { color: #374151; line-height: 1.6; }
                .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header priority-${reminder.priority}">
                    <h1 style="margin:0;">تذكير ${this.getPriorityIcon(reminder.priority)}</h1>
                </div>
                <div class="content">
                    <h2>${reminder.title}</h2>
                    ${reminder.description ? `<p>${reminder.description}</p>` : ''}
                    <p><strong>الوقت:</strong> ${new Date(reminder.reminderDateTime).toLocaleString('ar-SA')}</p>
                    <a href="${process.env.DASHBOARD_URL || 'https://dashboard.trafeli.com'}/dashboard/tasks/reminders/${reminder._id}" class="btn">
                        عرض التذكير
                    </a>
                </div>
                <div class="footer">
                    <p>تم إرسال هذا البريد من نظام ترافيلي لإدارة المكاتب القانونية</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Send escalation notification
     */
    async sendEscalation(reminder, escalateToUser, originalUser) {
        const escalationMessage = `تذكير متأخر يحتاج انتباهك: "${reminder.title}" - المستخدم الأصلي: ${originalUser.firstName || ''} ${originalUser.lastName || ''}`;

        await createNotification({
            userId: escalateToUser._id,
            type: 'reminder',
            title: 'تصعيد تذكير متأخر',
            message: escalationMessage,
            link: `/dashboard/tasks/reminders/${reminder._id}`,
            data: {
                reminderId: reminder._id,
                escalatedFrom: originalUser._id,
                originalDueDate: reminder.reminderDateTime
            },
            icon: '🚨',
            priority: 'urgent'
        });

        return { success: true };
    }
}

// Export singleton instance
module.exports = new NotificationDeliveryService();
