const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportName: {
        type: String,
        required: true
    },
    reportType: {
        type: String,
        enum: [
            'revenue',
            'aging',
            'realization',
            'collections',
            'productivity',
            'profitability',
            'time_utilization',
            'tax',
            'custom'
        ],
        required: true
    },
    startDate: Date,
    endDate: Date,
    filters: mongoose.Schema.Types.Mixed,
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    isScheduled: {
        type: Boolean,
        default: false
    },
    scheduleFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly']
    },
    lastRun: Date,
    nextRun: Date,
    outputFormat: {
        type: String,
        enum: ['pdf', 'excel', 'csv'],
        default: 'pdf'
    },
    outputUrl: String,
    emailRecipients: [String]
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
reportSchema.index({ createdBy: 1, createdAt: -1 });
reportSchema.index({ reportType: 1 });
reportSchema.index({ isScheduled: 1, nextRun: 1 });

module.exports = mongoose.model('Report', reportSchema);
