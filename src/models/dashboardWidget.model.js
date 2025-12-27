const mongoose = require('mongoose');

const dashboardWidgetSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['metric', 'chart', 'table', 'list'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    titleAr: String,
    reportType: {
        type: String,
        required: true
    },
    config: {
        metric: String, // e.g., 'totalRevenue', 'activeCases'
        period: String, // e.g., 'today', 'week', 'month', 'year'
        chartType: String,
        dataSource: String,
        filters: mongoose.Schema.Types.Mixed,
        limit: Number,
        showTrend: Boolean,
        compareWithPrevious: Boolean
    },
    size: {
        type: String,
        enum: ['small', 'medium', 'large', 'full'],
        default: 'medium'
    },
    position: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        w: { type: Number, default: 1 },
        h: { type: Number, default: 1 }
    },
    refreshInterval: Number, // minutes
    isVisible: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
dashboardWidgetSchema.index({ firmId: 1, lawyerId: 1 });
dashboardWidgetSchema.index({ lawyerId: 1, order: 1 });
dashboardWidgetSchema.index({ lawyerId: 1, isVisible: 1 });

// Static method: Get default widgets
dashboardWidgetSchema.statics.getDefaultWidgets = function(lawyerId) {
    return [
        {
            lawyerId,
            type: 'metric',
            title: 'Active Cases',
            titleAr: 'القضايا النشطة',
            reportType: 'cases',
            config: { metric: 'activeCases', period: 'all' },
            size: 'small',
            position: { x: 0, y: 0, w: 1, h: 1 },
            order: 0
        },
        {
            lawyerId,
            type: 'metric',
            title: 'Revenue This Month',
            titleAr: 'الإيرادات هذا الشهر',
            reportType: 'revenue',
            config: { metric: 'totalRevenue', period: 'month', showTrend: true },
            size: 'small',
            position: { x: 1, y: 0, w: 1, h: 1 },
            order: 1
        },
        {
            lawyerId,
            type: 'chart',
            title: 'Revenue Trend',
            titleAr: 'اتجاه الإيرادات',
            reportType: 'revenue',
            config: { chartType: 'line', period: 'year' },
            size: 'large',
            position: { x: 0, y: 1, w: 2, h: 1 },
            order: 2
        },
        {
            lawyerId,
            type: 'list',
            title: 'Upcoming Hearings',
            titleAr: 'الجلسات القادمة',
            reportType: 'cases',
            config: { dataSource: 'hearings', limit: 5 },
            size: 'medium',
            position: { x: 0, y: 2, w: 1, h: 1 },
            order: 3
        },
        {
            lawyerId,
            type: 'list',
            title: 'Overdue Tasks',
            titleAr: 'المهام المتأخرة',
            reportType: 'tasks',
            config: { dataSource: 'overdueTasks', limit: 5 },
            size: 'medium',
            position: { x: 1, y: 2, w: 1, h: 1 },
            order: 4
        }
    ];
};

// Static method: Initialize default widgets for user
dashboardWidgetSchema.statics.initializeForUser = async function(lawyerId) {
    const existing = await this.countDocuments({ lawyerId });
    if (existing > 0) return null;

    const defaults = this.getDefaultWidgets(lawyerId);
    return await this.insertMany(defaults);
};

module.exports = mongoose.model('DashboardWidget', dashboardWidgetSchema);
