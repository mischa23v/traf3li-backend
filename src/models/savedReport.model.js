const mongoose = require('mongoose');

const reportConfigSchema = new mongoose.Schema({
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
        default: 'monthly'
    },
    startDate: Date,
    endDate: Date,
    filters: {
        clientIds: [mongoose.Schema.Types.ObjectId],
        caseIds: [mongoose.Schema.Types.ObjectId],
        staffIds: [mongoose.Schema.Types.ObjectId],
        caseTypes: [String],
        caseStatuses: [String],
        practiceAreas: [String],
        dateRange: {
            start: Date,
            end: Date
        },
        minAmount: Number,
        maxAmount: Number,
        tags: [String]
    },
    columns: [String],
    groupBy: [String],
    sortBy: String,
    sortOrder: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'asc'
    },
    format: {
        type: String,
        enum: ['table', 'chart', 'summary', 'detailed'],
        default: 'table'
    },
    chartType: {
        type: String,
        enum: ['bar', 'line', 'pie', 'area', 'donut']
    }
});

const savedReportSchema = new mongoose.Schema({
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
    name: {
        type: String,
        required: true
    },
    nameAr: String,
    description: String,
    type: {
        type: String,
        enum: ['revenue', 'cases', 'clients', 'staff', 'time-tracking', 'billing', 'collections', 'custom'],
        required: true
    },
    config: reportConfigSchema,
    isScheduled: {
        type: Boolean,
        default: false
    },
    scheduleFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
    },
    scheduleTime: String,
    scheduleDayOfWeek: Number, // 0-6 for weekly
    scheduleDayOfMonth: Number, // 1-31 for monthly
    recipients: [String], // email addresses
    lastRun: Date,
    lastRunResult: {
        success: Boolean,
        recordCount: Number,
        error: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
savedReportSchema.index({ firmId: 1, lawyerId: 1 });
savedReportSchema.index({ lawyerId: 1, type: 1 });
savedReportSchema.index({ lawyerId: 1, isScheduled: 1 });

// Static method: Get scheduled reports due for execution
savedReportSchema.statics.getScheduledReportsDue = async function() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDayOfWeek = now.getDay();
    const currentDayOfMonth = now.getDate();

    return await this.find({
        isScheduled: true,
        $or: [
            { scheduleFrequency: 'daily' },
            { scheduleFrequency: 'weekly', scheduleDayOfWeek: currentDayOfWeek },
            { scheduleFrequency: 'monthly', scheduleDayOfMonth: currentDayOfMonth }
        ]
    }).populate('lawyerId', 'email firstName lastName');
};

module.exports = mongoose.model('SavedReport', savedReportSchema);
