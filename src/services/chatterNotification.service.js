/**
 * Chatter Notification Service
 *
 * Sends notifications to followers when new messages are posted in chatter.
 * Supports multiple notification channels:
 * - In-app notifications
 * - Real-time Socket.IO updates
 * - Email notifications
 *
 * Respects user notification preferences and follower settings.
 */

const ChatterFollower = require('../models/chatterFollower.model');
const ThreadMessage = require('../models/threadMessage.model');
const Notification = require('../models/notification.model');
const { sendEmail } = require('./email.service');
const { emitNotification } = require('../configs/socket');

class ChatterNotificationService {
    /**
     * Send notifications for a new message
     * @param {Object} message - The ThreadMessage document
     */
    async notifyFollowers(message) {
        try {
            // Ensure message is populated
            if (!message.author_id || !message.res_model || !message.res_id) {
                console.warn('ChatterNotificationService: Invalid message data, skipping notifications');
                return;
            }

            const authorId = message.author_id._id?.toString() || message.author_id.toString();

            // Get all followers except the author
            const followers = await ChatterFollower.find({
                res_model: message.res_model,
                res_id: message.res_id,
                user_id: { $ne: message.author_id },
                notification_type: { $ne: 'none' }
            }).populate('user_id', 'firstName lastName email notificationSettings');

            if (!followers || followers.length === 0) {
                console.log('ChatterNotificationService: No followers to notify');
                return;
            }

            // Send notifications to followers
            for (const follower of followers) {
                try {
                    // Skip if follower doesn't have a valid user
                    if (!follower.user_id) {
                        continue;
                    }

                    // Skip if mentions-only and not mentioned
                    if (follower.notification_type === 'mentions') {
                        const isMentioned = message.partner_ids?.some(
                            id => id.toString() === follower.user_id._id.toString()
                        );
                        if (!isMentioned) {
                            continue;
                        }
                    }

                    await this.sendNotification(follower.user_id, message);
                } catch (error) {
                    console.error(`ChatterNotificationService: Error notifying follower ${follower.user_id?._id}:`, error.message);
                    // Continue with other followers even if one fails
                }
            }

            // Always notify mentioned users even if not followers
            if (message.partner_ids && message.partner_ids.length > 0) {
                await this.notifyMentions(message);
            }

            console.log(`ChatterNotificationService: Notified ${followers.length} follower(s) for message ${message._id}`);
        } catch (error) {
            console.error('ChatterNotificationService.notifyFollowers failed:', error.message);
        }
    }

    /**
     * Send notification to a single user
     * @param {Object} user - User document
     * @param {Object} message - ThreadMessage document
     */
    async sendNotification(user, message) {
        try {
            // Determine notification title based on message type
            let title = 'New message';
            if (message.message_type === 'comment') {
                title = `New comment on ${message.res_model}`;
            } else if (message.message_type === 'notification') {
                title = `Update on ${message.res_model}`;
            } else if (message.message_type === 'note') {
                title = `New note on ${message.res_model}`;
            } else if (message.message_type === 'tracking') {
                title = `Field updated on ${message.res_model}`;
            }

            // Extract author name
            const authorName = message.author_id?.firstName
                ? `${message.author_id.firstName} ${message.author_id.lastName || ''}`.trim()
                : 'Someone';

            // Create in-app notification
            await Notification.create({
                userId: user._id,
                firmId: message.firmId,
                type: 'chatter',
                title: title,
                message: `${authorName}: ${this.truncate(this.stripHtml(message.body), 100)}`,
                entityType: message.res_model?.toLowerCase(),
                entityId: message.res_id,
                data: {
                    messageId: message._id,
                    messageType: message.message_type,
                    authorId: message.author_id?._id || message.author_id
                },
                priority: message.is_internal ? 'low' : 'normal',
                channels: ['in_app']
            });

            // Real-time notification via Socket.IO
            try {
                emitNotification(user._id.toString(), {
                    type: 'chatter',
                    title: title,
                    message: `${authorName}: ${this.truncate(this.stripHtml(message.body), 50)}`,
                    model: message.res_model,
                    recordId: message.res_id,
                    messageId: message._id,
                    timestamp: new Date()
                });
            } catch (socketError) {
                console.error('ChatterNotificationService: Socket emission failed:', socketError.message);
                // Don't throw - continue with other notification types
            }

            // Email notification if enabled
            if (this.shouldSendEmail(user, message)) {
                await this.sendEmailNotification(user, message, authorName);
            }
        } catch (error) {
            console.error('ChatterNotificationService.sendNotification failed:', error.message);
            throw error;
        }
    }

    /**
     * Notify users who were mentioned but are not followers
     * @param {Object} message - ThreadMessage document
     */
    async notifyMentions(message) {
        try {
            if (!message.partner_ids || message.partner_ids.length === 0) {
                return;
            }

            // Get existing followers for this record
            const existingFollowers = await ChatterFollower.find({
                res_model: message.res_model,
                res_id: message.res_id
            }).select('user_id');

            const followerUserIds = new Set(
                existingFollowers.map(f => f.user_id.toString())
            );

            // Get User model
            const User = require('../models/user.model');

            // Notify mentioned users who are not already followers
            for (const partnerId of message.partner_ids) {
                try {
                    const partnerIdStr = partnerId.toString();

                    // Skip if already a follower (already notified above)
                    if (followerUserIds.has(partnerIdStr)) {
                        continue;
                    }

                    // Skip the author
                    const authorId = message.author_id?._id?.toString() || message.author_id.toString();
                    if (partnerIdStr === authorId) {
                        continue;
                    }

                    // Load user data
                    const user = await User.findById(partnerId).select('firstName lastName email notificationSettings');
                    if (!user) {
                        continue;
                    }

                    // Send notification
                    await this.sendNotification(user, message);

                    // Auto-follow the mentioned user (if firmId is available)
                    if (message.firmId) {
                        try {
                            await ChatterFollower.addFollower({
                                firmId: message.firmId,
                                res_model: message.res_model,
                                res_id: message.res_id,
                                user_id: partnerId,
                                notification_type: 'all',
                                follow_type: 'auto_mentioned',
                                added_by: null
                            });
                        } catch (followError) {
                            // Ignore if already following or other errors
                            console.warn(`ChatterNotificationService: Could not auto-follow user ${partnerId}:`, followError.message);
                        }
                    }
                } catch (error) {
                    console.error(`ChatterNotificationService: Error notifying mention ${partnerId}:`, error.message);
                    // Continue with other mentions
                }
            }
        } catch (error) {
            console.error('ChatterNotificationService.notifyMentions failed:', error.message);
        }
    }

    /**
     * Send email notification
     * @param {Object} user - User document
     * @param {Object} message - ThreadMessage document
     * @param {String} authorName - Name of message author
     */
    async sendEmailNotification(user, message, authorName) {
        try {
            // Determine record URL
            const baseUrl = process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
            const recordType = message.res_model?.toLowerCase();
            const recordUrl = `${baseUrl}/${recordType}s/${message.res_id}`;

            // Build email subject
            const subject = `New message on ${message.res_model}: ${message.subject || 'Chatter Update'}`;

            // Build email body
            const messageBody = this.stripHtml(message.body) || '(No content)';
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                        .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                        .message { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; border-radius: 4px; }
                        .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
                        .button:hover { background-color: #2563eb; }
                        .metadata { color: #6b7280; font-size: 14px; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h2 style="margin: 0;">New Message on ${message.res_model}</h2>
                        </div>
                        <div class="content">
                            <p>Hi ${user.firstName},</p>
                            <p><strong>${authorName}</strong> posted a new message:</p>

                            <div class="message">
                                ${message.subject ? `<h3 style="margin-top: 0;">${message.subject}</h3>` : ''}
                                <p>${messageBody}</p>
                                <div class="metadata">
                                    <small>
                                        ${message.message_type === 'note' ? '🔒 Internal Note' : '💬 Comment'}
                                        • ${new Date(message.createdAt || Date.now()).toLocaleString('en-US', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        })}
                                    </small>
                                </div>
                            </div>

                            <a href="${recordUrl}" class="button">View Message</a>

                            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                                You received this email because you are following this ${message.res_model}.
                            </p>
                        </div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Traf3li. All rights reserved.</p>
                            <p>
                                <a href="${baseUrl}/settings/notifications" style="color: #3b82f6;">Manage Notification Preferences</a>
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await sendEmail({
                to: user.email,
                subject: subject,
                html: html
            });

            console.log(`ChatterNotificationService: Email sent to ${user.email}`);
        } catch (error) {
            console.error('ChatterNotificationService.sendEmailNotification failed:', error.message);
            // Don't throw - email failures shouldn't block other notifications
        }
    }

    /**
     * Check if email notification should be sent to user
     * @param {Object} user - User document
     * @param {Object} message - ThreadMessage document
     * @returns {Boolean}
     */
    shouldSendEmail(user, message) {
        try {
            // Check if user has notification settings
            if (!user.notificationSettings) {
                return false; // Default to no email if settings don't exist
            }

            // Check email notifications settings
            const emailSettings = user.notificationSettings.emailNotifications;
            if (!emailSettings) {
                return false;
            }

            // Check chatter-specific email setting
            if (emailSettings.chatter === false) {
                return false;
            }

            // Don't send email for internal notes unless user specifically wants them
            if (message.is_internal && emailSettings.internalNotes === false) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('ChatterNotificationService.shouldSendEmail failed:', error.message);
            return false; // Default to no email on error
        }
    }

    /**
     * Truncate text to specified length
     * @param {String} text - Text to truncate
     * @param {Number} length - Max length
     * @returns {String}
     */
    truncate(text, length) {
        if (!text) return '';
        if (text.length <= length) return text;
        return text.substring(0, length) + '...';
    }

    /**
     * Strip HTML tags from text
     * @param {String} html - HTML string
     * @returns {String} Plain text
     */
    stripHtml(html) {
        if (!html) return '';
        return html
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
            .replace(/&amp;/g, '&')  // Replace &amp; with &
            .replace(/&lt;/g, '<')   // Replace &lt; with <
            .replace(/&gt;/g, '>')   // Replace &gt; with >
            .replace(/&quot;/g, '"') // Replace &quot; with "
            .replace(/&#39;/g, "'")  // Replace &#39; with '
            .replace(/\s+/g, ' ')    // Replace multiple spaces with single space
            .trim();
    }
}

module.exports = new ChatterNotificationService();
