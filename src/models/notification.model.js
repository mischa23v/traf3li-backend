const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: [
            'order',           // طلب جديد
            'proposal',        // عرض محاماة
            'proposal_accepted', // قبول عرض
            'task',            // تذكير مهمة
            'message',         // رسالة جديدة
            'hearing',         // جلسة قادمة
            'case',            // تحديث قضية
            'event',           // حدث قادم
            'review',          // تقييم جديد
            'payment'          // دفعة مالية
        ],
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    link: {
        type: String,
        required: false,
        trim: true
    },
    read: {
        type: Boolean,
        default: false,
        index: true
    },
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
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    expiresAt: {
        type: Date,
        required: false
    },
    actionRequired: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
    this.read = true;
    return this.save();
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
