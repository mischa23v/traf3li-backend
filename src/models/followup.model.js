const mongoose = require('mongoose');

const followupHistorySchema = new mongoose.Schema({
    action: {
        type: String,
        enum: ['created', 'updated', 'completed', 'cancelled', 'rescheduled', 'note_added'],
        required: true
    },
    note: String,
    previousDueDate: Date,
    newDueDate: Date,
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    performedAt: {
        type: Date,
        default: Date.now
    }
});

const followupSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        maxlength: 1000
    },
    type: {
        type: String,
        enum: ['call', 'email', 'meeting', 'court_date', 'document_deadline', 'payment_reminder', 'general'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'rescheduled'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    dueDate: {
        type: Date,
        required: true
    },
    dueTime: {
        type: String
    },
    entityType: {
        type: String,
        enum: ['case', 'client', 'contact', 'organization'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completedAt: {
        type: Date
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    completionNotes: {
        type: String,
        maxlength: 1000
    },
    recurring: {
        enabled: {
            type: Boolean,
            default: false
        },
        frequency: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']
        },
        endDate: Date
    },
    remindBefore: {
        type: Number // minutes before to remind
    },
    history: [followupHistorySchema]
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
followupSchema.index({ lawyerId: 1, status: 1 });
followupSchema.index({ lawyerId: 1, dueDate: 1 });
followupSchema.index({ lawyerId: 1, entityType: 1, entityId: 1 });
followupSchema.index({ lawyerId: 1, priority: 1 });
followupSchema.index({ assignedTo: 1, status: 1 });
followupSchema.index({ firmId: 1, status: 1 });

// Pre-save hook to add history
followupSchema.pre('save', function(next) {
    if (this.isNew) {
        this.history.push({
            action: 'created',
            performedAt: new Date()
        });
    }
    next();
});

// Static method: Get overdue follow-ups
followupSchema.statics.getOverdue = async function(lawyerId) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: 'pending',
        dueDate: { $lt: new Date() }
    })
    .sort({ dueDate: 1 })
    .populate('assignedTo', 'firstName lastName');
};

// Static method: Get upcoming follow-ups
followupSchema.statics.getUpcoming = async function(lawyerId, days = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: 'pending',
        dueDate: { $gte: new Date(), $lte: endDate }
    })
    .sort({ dueDate: 1 })
    .populate('assignedTo', 'firstName lastName');
};

// Static method: Get today's follow-ups
followupSchema.statics.getToday = async function(lawyerId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: 'pending',
        dueDate: { $gte: startOfDay, $lte: endOfDay }
    })
    .sort({ dueTime: 1, priority: -1 })
    .populate('assignedTo', 'firstName lastName');
};

// Static method: Get follow-ups by entity
followupSchema.statics.getByEntity = async function(lawyerId, entityType, entityId) {
    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId)
    })
    .sort({ dueDate: -1 })
    .populate('assignedTo', 'firstName lastName')
    .populate('completedBy', 'firstName lastName');
};

// Static method: Get statistics
followupSchema.statics.getStats = async function(lawyerId) {
    const now = new Date();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [total, pending, overdue, today, completed] = await Promise.all([
        this.countDocuments({ lawyerId }),
        this.countDocuments({ lawyerId, status: 'pending' }),
        this.countDocuments({ lawyerId, status: 'pending', dueDate: { $lt: now } }),
        this.countDocuments({ lawyerId, status: 'pending', dueDate: { $gte: startOfDay, $lte: endOfDay } }),
        this.countDocuments({ lawyerId, status: 'completed' })
    ]);

    const byType = await this.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId), status: 'pending' } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const byPriority = await this.aggregate([
        { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId), status: 'pending' } },
        { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    return {
        total,
        pending,
        overdue,
        today,
        completed,
        byType,
        byPriority
    };
};

module.exports = mongoose.model('Followup', followupSchema);
