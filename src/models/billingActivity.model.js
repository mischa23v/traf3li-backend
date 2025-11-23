const mongoose = require('mongoose');

const billingActivitySchema = new mongoose.Schema({
    activityType: {
        type: String,
        enum: [
            'invoice_created',
            'invoice_updated',
            'invoice_sent',
            'invoice_viewed',
            'invoice_paid',
            'invoice_cancelled',
            'invoice_approved',
            'invoice_rejected',
            'payment_received',
            'payment_failed',
            'payment_refunded',
            'time_entry_created',
            'time_entry_updated',
            'time_entry_approved',
            'time_entry_rejected',
            'time_entry_invoiced',
            'expense_created',
            'expense_updated',
            'expense_approved',
            'expense_rejected',
            'expense_invoiced',
            'retainer_created',
            'retainer_consumed',
            'retainer_replenished',
            'retainer_refunded',
            'statement_generated',
            'statement_sent',
            'rate_changed',
            'bulk_operation'
        ],
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    relatedModel: {
        type: String,
        enum: ['Invoice', 'Payment', 'TimeEntry', 'Expense', 'Retainer', 'Statement', 'BillingRate']
    },
    relatedId: mongoose.Schema.Types.ObjectId,
    description: {
        type: String,
        required: true
    },
    changes: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    versionKey: false,
    timestamps: false
});

// Indexes
billingActivitySchema.index({ userId: 1, timestamp: -1 });
billingActivitySchema.index({ clientId: 1, timestamp: -1 });
billingActivitySchema.index({ activityType: 1, timestamp: -1 });
billingActivitySchema.index({ relatedModel: 1, relatedId: 1 });

// TTL index (auto-delete after 2 years)
billingActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

// Static method: Log activity
billingActivitySchema.statics.logActivity = async function(data) {
    return await this.create({
        activityType: data.activityType,
        userId: data.userId,
        clientId: data.clientId,
        relatedModel: data.relatedModel,
        relatedId: data.relatedId,
        description: data.description,
        changes: data.changes,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
    });
};

module.exports = mongoose.model('BillingActivity', billingActivitySchema);
