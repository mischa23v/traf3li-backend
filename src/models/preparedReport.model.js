/**
 * Prepared Report Model
 *
 * Pre-computed and cached reports for faster access.
 * Heavy queries are executed in the background and results are stored.
 *
 * Features:
 * - Background report generation
 * - Time-based cache expiration
 * - Automatic refresh scheduling
 * - Report versioning
 *
 * @module models/preparedReport
 */

const mongoose = require('mongoose');

const preparedReportSchema = new mongoose.Schema({
    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    // Report identifier
    reportType: {
        type: String,
        required: true,
        index: true,
        enum: [
            // Financial Reports
            'trial_balance',
            'balance_sheet',
            'profit_loss',
            'cash_flow',
            'general_ledger',
            'aging_receivables',
            'aging_payables',
            // Billing Reports
            'revenue_by_client',
            'revenue_by_lawyer',
            'revenue_by_practice_area',
            'unbilled_time',
            'wip_analysis',
            'collection_report',
            'realization_report',
            // HR Reports
            'payroll_summary',
            'employee_costs',
            'leave_balance',
            'attendance_summary',
            // Custom Reports
            'custom'
        ]
    },
    // Report name
    name: {
        type: String,
        required: true
    },
    nameAr: String,
    // Report parameters (for cache key)
    parameters: {
        startDate: Date,
        endDate: Date,
        asOfDate: Date,
        clientId: mongoose.Schema.Types.ObjectId,
        lawyerId: mongoose.Schema.Types.ObjectId,
        caseId: mongoose.Schema.Types.ObjectId,
        accountId: mongoose.Schema.Types.ObjectId,
        currency: String,
        groupBy: String,
        filters: mongoose.Schema.Types.Mixed,
        customParams: mongoose.Schema.Types.Mixed
    },
    // Hash of parameters for quick lookup
    parameterHash: {
        type: String,
        required: true,
        index: true
    },
    // Report data (the cached result)
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    // Report summary (for quick preview)
    summary: {
        rowCount: Number,
        totalAmount: Number,
        currency: String,
        highlights: [{ label: String, value: mongoose.Schema.Types.Mixed }]
    },
    // Status
    status: {
        type: String,
        enum: ['generating', 'ready', 'failed', 'expired'],
        default: 'generating',
        index: true
    },
    // Error info if failed
    error: {
        message: String,
        stack: String,
        occurredAt: Date
    },
    // Timing
    generationStartedAt: Date,
    generationCompletedAt: Date,
    generationDurationMs: Number,
    // Expiration
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    // TTL in minutes (for re-generation)
    ttlMinutes: {
        type: Number,
        default: 60
    },
    // Auto-refresh settings
    autoRefresh: {
        enabled: {
            type: Boolean,
            default: false
        },
        cronExpression: String, // e.g., "0 0 * * *" for daily at midnight
        lastRefreshedAt: Date,
        nextRefreshAt: Date
    },
    // Version tracking
    version: {
        type: Number,
        default: 1
    },
    // Size tracking
    dataSizeBytes: Number,
    // Access tracking
    accessCount: {
        type: Number,
        default: 0
    },
    lastAccessedAt: Date,
    // Audit
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    refreshedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
preparedReportSchema.index({ firmId: 1, reportType: 1, parameterHash: 1 });
preparedReportSchema.index({ firmId: 1, status: 1 });
preparedReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
preparedReportSchema.index({ 'autoRefresh.nextRefreshAt': 1, 'autoRefresh.enabled': 1 });

/**
 * Generate parameter hash for cache key
 */
preparedReportSchema.statics.generateParameterHash = function(params) {
    const crypto = require('crypto');
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return crypto.createHash('md5').update(normalized).digest('hex');
};

/**
 * Find or create prepared report
 */
preparedReportSchema.statics.findOrCreate = async function(firmId, reportType, params, options = {}) {
    const parameterHash = this.generateParameterHash(params);

    // Look for existing valid report
    const existing = await this.findOne({
        firmId,
        reportType,
        parameterHash,
        status: 'ready',
        expiresAt: { $gt: new Date() }
    });

    if (existing) {
        // Update access tracking
        existing.accessCount += 1;
        existing.lastAccessedAt = new Date();
        await existing.save();
        return { report: existing, cached: true };
    }

    // Check if currently generating
    const generating = await this.findOne({
        firmId,
        reportType,
        parameterHash,
        status: 'generating'
    });

    if (generating) {
        return { report: generating, pending: true };
    }

    // Create new report entry
    const ttlMinutes = options.ttlMinutes || 60;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const report = new this({
        firmId,
        reportType,
        name: options.name || reportType,
        nameAr: options.nameAr,
        parameters: params,
        parameterHash,
        data: {},
        status: 'generating',
        generationStartedAt: new Date(),
        expiresAt,
        ttlMinutes,
        autoRefresh: options.autoRefresh || { enabled: false },
        createdBy: options.userId
    });

    await report.save();
    return { report, isNew: true };
};

/**
 * Mark report as ready with data
 */
preparedReportSchema.methods.markReady = async function(data, summary = {}) {
    this.data = data;
    this.summary = summary;
    this.status = 'ready';
    this.generationCompletedAt = new Date();
    this.generationDurationMs = this.generationCompletedAt - this.generationStartedAt;
    this.dataSizeBytes = Buffer.byteLength(JSON.stringify(data), 'utf8');
    this.version += 1;

    // Update auto-refresh next time if enabled
    if (this.autoRefresh?.enabled) {
        this.autoRefresh.lastRefreshedAt = new Date();
        // Calculate next refresh based on TTL
        this.autoRefresh.nextRefreshAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);
    }

    await this.save();
    return this;
};

/**
 * Mark report as failed
 */
preparedReportSchema.methods.markFailed = async function(error) {
    this.status = 'failed';
    this.error = {
        message: error.message,
        stack: error.stack,
        occurredAt: new Date()
    };
    this.generationCompletedAt = new Date();
    this.generationDurationMs = this.generationCompletedAt - this.generationStartedAt;

    await this.save();
    return this;
};

/**
 * Refresh the report
 */
preparedReportSchema.methods.refresh = async function(userId) {
    this.status = 'generating';
    this.generationStartedAt = new Date();
    this.generationCompletedAt = null;
    this.error = null;
    this.refreshedBy = userId;
    this.expiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);

    await this.save();
    return this;
};

/**
 * Static: Get reports due for auto-refresh
 */
preparedReportSchema.statics.getDueForRefresh = async function() {
    return this.find({
        'autoRefresh.enabled': true,
        'autoRefresh.nextRefreshAt': { $lte: new Date() },
        status: { $ne: 'generating' }
    });
};

/**
 * Static: Clean up old/expired reports
 */
preparedReportSchema.statics.cleanup = async function(firmId = null) {
    const query = {
        $or: [
            { expiresAt: { $lt: new Date() } },
            { status: 'expired' },
            {
                status: 'generating',
                generationStartedAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) } // Stuck for 30+ min
            }
        ]
    };

    if (firmId) query.firmId = firmId;

    const result = await this.deleteMany(query);
    return result.deletedCount;
};

/**
 * Static: Get cache statistics
 */
preparedReportSchema.statics.getCacheStats = async function(firmId) {
    const stats = await this.aggregate([
        { $match: { firmId: mongoose.Types.ObjectId.createFromHexString(firmId.toString()) } },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalSize: { $sum: '$dataSizeBytes' },
                avgGenerationTime: { $avg: '$generationDurationMs' }
            }
        }
    ]);

    const byType = await this.aggregate([
        { $match: { firmId: mongoose.Types.ObjectId.createFromHexString(firmId.toString()), status: 'ready' } },
        {
            $group: {
                _id: '$reportType',
                count: { $sum: 1 },
                totalAccess: { $sum: '$accessCount' },
                avgGenerationTime: { $avg: '$generationDurationMs' }
            }
        },
        { $sort: { totalAccess: -1 } }
    ]);

    return {
        byStatus: stats,
        byType,
        summary: {
            totalReports: stats.reduce((acc, s) => acc + s.count, 0),
            readyReports: stats.find(s => s._id === 'ready')?.count || 0,
            totalSizeBytes: stats.reduce((acc, s) => acc + (s.totalSize || 0), 0),
            avgGenerationTimeMs: stats.find(s => s._id === 'ready')?.avgGenerationTime || 0
        }
    };
};

module.exports = mongoose.model('PreparedReport', preparedReportSchema);
