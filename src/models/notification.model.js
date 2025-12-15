const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    type: {
        type: String,
        enum: [
            'order',             // طلب جديد
            'proposal',          // عرض محاماة
            'proposal_accepted', // قبول عرض
            'task',              // تذكير مهمة
            'task_assigned',     // تم تعيين مهمة
            'message',           // رسالة جديدة
            'hearing',           // جلسة قادمة
            'hearing_reminder',  // تذكير بجلسة
            'deadline',          // موعد نهائي
            'case',              // تحديث قضية
            'case_update',       // تحديث القضية
            'event',             // حدث قادم
            'review',            // تقييم جديد
            'payment',           // دفعة مالية
            'invoice',           // فاتورة
            'invoice_approval_required', // موافقة على فاتورة مطلوبة
            'invoice_approved',  // تمت الموافقة على الفاتورة
            'invoice_rejected',  // تم رفض الفاتورة
            'time_entry_submitted', // تقديم إدخال وقت
            'time_entry_approved',  // تمت الموافقة على إدخال الوقت
            'time_entry_rejected',  // تم رفض إدخال الوقت
            'expense_submitted', // تقديم مصروف
            'expense_approved',  // تمت الموافقة على المصروف
            'expense_rejected',  // تم رفض المصروف
            'recurring_invoice', // فاتورة متكررة
            'credit_note',       // إشعار دائن
            'debit_note',        // إشعار مدين
            'system',            // إشعار نظام
            'reminder',          // تذكير عام
            'alert'              // تنبيه
        ],
        required: true
    },

    // Bilingual title
    title: {
        type: String,
        required: true,
        trim: true
    },
    titleAr: {
        type: String,
        trim: true
    },

    // Bilingual message
    message: {
        type: String,
        required: true,
        trim: true
    },
    messageAr: {
        type: String,
        trim: true
    },

    // Entity reference for navigation
    entityType: {
        type: String,
        enum: ['invoice', 'payment', 'case', 'task', 'time_entry', 'expense', 'client', 'document', 'event', 'order', 'proposal']
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId
    },

    link: {
        type: String,
        required: false,
        trim: true
    },

    // Status tracking
    read: {
        type: Boolean,
        default: false,
        index: true
    },
    readAt: Date,

    data: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },

    icon: {
        type: String,
        required: false,
        default: '🔔'
    },

    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    // Delivery channels
    channels: [{
        type: String,
        enum: ['in_app', 'email', 'sms', 'push']
    }],

    // Delivery tracking
    emailSentAt: Date,
    smsSentAt: Date,
    pushSentAt: Date,

    expiresAt: {
        type: Date,
        required: false
    },

    actionRequired: {
        type: Boolean,
        default: false
    },

    // Action URL for actionable notifications
    actionUrl: {
        type: String,
        trim: true
    },
    actionLabel: {
        type: String,
        trim: true
    },
    actionLabelAr: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ firmId: 1, userId: 1, createdAt: -1 });
notificationSchema.index({ firmId: 1, type: 1 });
notificationSchema.index({ entityType: 1, entityId: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
    this.read = true;
    this.readAt = new Date();
    return this.save();
};

// Static: Mark all as read for user
notificationSchema.statics.markAllAsRead = async function(userId, firmId = null) {
    const query = { userId, read: false };
    if (firmId) query.firmId = firmId;

    return await this.updateMany(query, {
        $set: { read: true, readAt: new Date() }
    });
};

// Static: Get unread count
notificationSchema.statics.getUnreadCount = async function(userId, firmId = null) {
    const query = { userId, read: false };
    if (firmId) query.firmId = firmId;

    return await this.countDocuments(query);
};

// Static: Create notification with proper delivery
notificationSchema.statics.createNotification = async function(data) {
    const notification = new this({
        firmId: data.firmId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        titleAr: data.titleAr,
        message: data.message,
        messageAr: data.messageAr,
        entityType: data.entityType,
        entityId: data.entityId,
        link: data.link,
        data: data.data,
        priority: data.priority || 'normal',
        channels: data.channels || ['in_app'],
        actionRequired: data.actionRequired || false,
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        actionLabelAr: data.actionLabelAr,
        expiresAt: data.expiresAt
    });

    await notification.save();

    // TODO: Emit real-time event via Socket.IO
    // io.to(`user:${data.userId}`).emit('notification', notification);

    return notification;
};

// Static: Delete old notifications
notificationSchema.statics.cleanupOld = async function(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return await this.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true,
        actionRequired: false
    });
};

// Instance method to build navigation link
notificationSchema.methods.buildLink = function() {
    if (this.link) return this.link;
    
    // Auto-generate link based on type
    switch(this.type) {
        case 'order':
            return '/orders';
        case 'proposal':
        case 'proposal_accepted':
            return '/my-proposals';
        case 'task':
            return '/tasks';
        case 'message':
            return '/messages';
        case 'hearing':
        case 'event':
            return '/calendar';
        case 'case':
            return '/cases';
        case 'review':
            return '/my-gigs';
        default:
            return '/dashboard';
    }
};

module.exports = mongoose.model('Notification', notificationSchema);
