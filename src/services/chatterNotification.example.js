/**
 * Chatter Notification Service - Usage Examples
 *
 * This file demonstrates how the chatter notification system works.
 * The notifications are automatically triggered when messages are posted.
 */

const ThreadMessage = require('../models/threadMessage.model');
const ChatterFollower = require('../models/chatterFollower.model');

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 1: Posting a message (notifications sent automatically)
// ═══════════════════════════════════════════════════════════════

async function postCommentWithNotifications() {
    // When you post a message using the model's static method,
    // notifications are automatically sent to all followers
    const message = await ThreadMessage.postMessage({
        firmId: '507f1f77bcf86cd799439011',
        res_model: 'Case',
        res_id: '507f1f77bcf86cd799439012',
        body: 'The case has been updated with new documents.',
        author_id: '507f1f77bcf86cd799439013',
        partner_ids: [], // Optional: mention specific users
        message_type: 'comment',
        is_internal: false
    });

    // At this point:
    // 1. All followers of the case receive an in-app notification
    // 2. Real-time notifications are sent via Socket.IO
    // 3. Email notifications are sent (if user has email enabled)

    return message;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 2: Posting with @mentions
// ═══════════════════════════════════════════════════════════════

async function postMessageWithMentions() {
    const message = await ThreadMessage.postMessage({
        firmId: '507f1f77bcf86cd799439011',
        res_model: 'Case',
        res_id: '507f1f77bcf86cd799439012',
        body: 'Hey @user:507f1f77bcf86cd799439014, can you review this?',
        author_id: '507f1f77bcf86cd799439013',
        partner_ids: ['507f1f77bcf86cd799439014'], // Mentioned user
        message_type: 'comment'
    });

    // The mentioned user will:
    // 1. Receive a notification even if not a follower
    // 2. Be automatically added as a follower (auto_mentioned)
    // 3. Get future notifications for this case

    return message;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 3: Logging field changes (automatic tracking)
// ═══════════════════════════════════════════════════════════════

async function logFieldChange() {
    const message = await ThreadMessage.logFieldChanges(
        'Case',
        '507f1f77bcf86cd799439012',
        [
            {
                field: 'status',
                field_desc: 'Status',
                field_type: 'selection',
                old_value: 'In Progress',
                new_value: 'Completed'
            },
            {
                field: 'assignee',
                field_desc: 'Assignee',
                field_type: 'many2one',
                old_value: 'John Doe',
                new_value: 'Jane Smith'
            }
        ],
        '507f1f77bcf86cd799439013', // authorId
        '507f1f77bcf86cd799439011'  // firmId
    );

    // Followers will receive a notification showing:
    // "Status: In Progress → Completed"
    // "Assignee: John Doe → Jane Smith"

    return message;
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 4: Managing followers
// ═══════════════════════════════════════════════════════════════

async function setupFollowers() {
    // Add a follower who wants all notifications
    await ChatterFollower.addFollower({
        firmId: '507f1f77bcf86cd799439011',
        res_model: 'Case',
        res_id: '507f1f77bcf86cd799439012',
        user_id: '507f1f77bcf86cd799439014',
        notification_type: 'all', // Receives all notifications
        follow_type: 'manual',
        added_by: '507f1f77bcf86cd799439013'
    });

    // Add a follower who only wants mentions
    await ChatterFollower.addFollower({
        firmId: '507f1f77bcf86cd799439011',
        res_model: 'Case',
        res_id: '507f1f77bcf86cd799439012',
        user_id: '507f1f77bcf86cd799439015',
        notification_type: 'mentions', // Only notified when mentioned
        follow_type: 'manual',
        added_by: '507f1f77bcf86cd799439013'
    });

    // Add a follower who doesn't want notifications
    await ChatterFollower.addFollower({
        firmId: '507f1f77bcf86cd799439011',
        res_model: 'Case',
        res_id: '507f1f77bcf86cd799439012',
        user_id: '507f1f77bcf86cd799439016',
        notification_type: 'none', // Following but no notifications
        follow_type: 'manual',
        added_by: '507f1f77bcf86cd799439013'
    });
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 5: Using the service directly (advanced)
// ═══════════════════════════════════════════════════════════════

async function manualNotification() {
    const chatterNotificationService = require('./chatterNotification.service');

    // Get a message
    const message = await ThreadMessage.findById('507f1f77bcf86cd799439017')
        .populate('author_id', 'firstName lastName email')
        .populate('partner_ids', 'firstName lastName email');

    // Manually trigger notifications (usually automatic)
    await chatterNotificationService.notifyFollowers(message);
}

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION BEHAVIOR MATRIX
// ═══════════════════════════════════════════════════════════════

/*
┌─────────────────────┬────────────┬──────────────┬─────────────┐
│ Follower Type       │ Regular    │ When         │ Email       │
│                     │ Message    │ Mentioned    │ Sent        │
├─────────────────────┼────────────┼──────────────┼─────────────┤
│ notification: 'all' │ ✓ Notified │ ✓ Notified   │ ✓ If enabled│
│ notification:       │ ✗ Silent   │ ✓ Notified   │ ✓ If enabled│
│   'mentions'        │            │              │             │
│ notification: 'none'│ ✗ Silent   │ ✗ Silent     │ ✗ Never     │
│ Not a follower      │ ✗ Silent   │ ✓ Notified + │ ✓ If enabled│
│                     │            │   Auto-follow│             │
│ Message author      │ ✗ Never    │ ✗ Never      │ ✗ Never     │
└─────────────────────┴────────────┴──────────────┴─────────────┘
*/

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION CHANNELS
// ═══════════════════════════════════════════════════════════════

/*
When a notification is sent, it goes through multiple channels:

1. In-App Notification (Notification model)
   - Stored in database
   - Shows in notification bell
   - Persists until user reads it

2. Real-time Socket.IO
   - Instant push notification
   - Shows toast/alert in UI
   - Requires user to be online

3. Email (optional)
   - Sent if user has emailNotifications.chatter enabled
   - Contains message preview and link
   - Sent asynchronously via queue
*/

module.exports = {
    postCommentWithNotifications,
    postMessageWithMentions,
    logFieldChange,
    setupFollowers,
    manualNotification
};
