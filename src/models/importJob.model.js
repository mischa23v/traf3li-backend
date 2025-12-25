const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// IMPORT JOB ERROR/WARNING SCHEMA
// ═══════════════════════════════════════════════════════════════
const ErrorSchema = new mongoose.Schema({
    row: {
        type: Number,
        required: true
    },
    column: {
        type: String,
        trim: true
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    data: mongoose.Schema.Types.Mixed,
    severity: {
        type: String,
        enum: ['error', 'warning'],
        default: 'error'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// IMPORT JOB SCHEMA
// ═══════════════════════════════════════════════════════════════
const importJobSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM & USER (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Backward compatibility
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // JOB INFO
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        enum: ['clients', 'invoices', 'expenses', 'cases', 'contacts', 'time_entries', 'payments', 'organizations', 'staff', 'documents', 'followups', 'tags'],
        required: true,
        index: true
    },
    fileName: {
        type: String,
        required: true,
        trim: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    // Backward compatibility
    sourceFileUrl: {
        type: String
    },
    sourceFileName: {
        type: String
    },
    fileKey: {
        type: String,
        trim: true
    },
    fileSize: {
        type: Number,
        min: 0
    },
    fileMimeType: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'validating', 'validated', 'processing', 'completed', 'failed', 'cancelled', 'partial'],
        default: 'pending',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // PROGRESS TRACKING
    // ═══════════════════════════════════════════════════════════════
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    totalRows: {
        type: Number,
        default: 0,
        min: 0
    },
    // Backward compatibility
    totalRecords: {
        type: Number,
        default: 0,
        min: 0
    },
    processedRows: {
        type: Number,
        default: 0,
        min: 0
    },
    successCount: {
        type: Number,
        default: 0,
        min: 0
    },
    errorCount: {
        type: Number,
        default: 0,
        min: 0
    },
    warningCount: {
        type: Number,
        default: 0,
        min: 0
    },
    skippedCount: {
        type: Number,
        default: 0,
        min: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // ERRORS & WARNINGS
    // ═══════════════════════════════════════════════════════════════
    errors: {
        type: [ErrorSchema],
        default: []
    },
    warnings: {
        type: [ErrorSchema],
        default: []
    },
    // Backward compatibility
    importErrors: {
        type: [{
            row: Number,
            field: String,
            message: String
        }],
        default: []
    },
    errorReportUrl: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // COLUMN MAPPING
    // ═══════════════════════════════════════════════════════════════
    mapping: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    detectedHeaders: {
        type: [String],
        default: []
    },

    // ═══════════════════════════════════════════════════════════════
    // IMPORT OPTIONS
    // ═══════════════════════════════════════════════════════════════
    options: {
        skipDuplicates: {
            type: Boolean,
            default: false
        },
        updateExisting: {
            type: Boolean,
            default: false
        },
        skipErrors: {
            type: Boolean,
            default: false
        },
        batchSize: {
            type: Number,
            default: 100,
            min: 1,
            max: 1000
        },
        validateOnly: {
            type: Boolean,
            default: false
        },
        dryRun: {
            type: Boolean,
            default: false
        },
        duplicateCheckFields: {
            type: [String],
            default: []
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // ROLLBACK SUPPORT
    // ═══════════════════════════════════════════════════════════════
    rollbackable: {
        type: Boolean,
        default: true
    },
    rolledBack: {
        type: Boolean,
        default: false
    },
    rolledBackAt: {
        type: Date
    },
    rolledBackBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdIds: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
    },
    updatedIds: {
        type: [mongoose.Schema.Types.ObjectId],
        default: []
    },

    // ═══════════════════════════════════════════════════════════════
    // TIMESTAMPS
    // ═══════════════════════════════════════════════════════════════
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    validatedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    errorMessage: {
        type: String,
        maxlength: 1000
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
importJobSchema.index({ userId: 1, createdAt: -1 });
importJobSchema.index({ lawyerId: 1, status: 1 });
importJobSchema.index({ lawyerId: 1, entityType: 1 });
importJobSchema.index({ firmId: 1, createdAt: -1 });
importJobSchema.index({ firmId: 1, status: 1 });
importJobSchema.index({ entityType: 1, status: 1 });
importJobSchema.index({ createdAt: -1 });
// TTL index to auto-delete old import jobs
importJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
importJobSchema.virtual('hasErrors').get(function() {
    return this.errorCount > 0 || (this.errors && this.errors.length > 0);
});

importJobSchema.virtual('hasWarnings').get(function() {
    return this.warningCount > 0 || (this.warnings && this.warnings.length > 0);
});

importJobSchema.virtual('isProcessing').get(function() {
    return ['pending', 'validating', 'processing'].includes(this.status);
});

importJobSchema.virtual('isCompleted').get(function() {
    return ['completed', 'failed', 'cancelled', 'partial'].includes(this.status);
});

importJobSchema.virtual('canRollback').get(function() {
    return this.rollbackable &&
           this.status === 'completed' &&
           !this.rolledBack &&
           this.createdIds.length > 0;
});

// Enable virtuals in JSON
importJobSchema.set('toJSON', { virtuals: true });
importJobSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
importJobSchema.pre('save', function(next) {
    // Sync backward compatibility fields
    if (this.userId && !this.lawyerId) {
        this.lawyerId = this.userId;
    }
    if (this.fileUrl && !this.sourceFileUrl) {
        this.sourceFileUrl = this.fileUrl;
    }
    if (this.fileName && !this.sourceFileName) {
        this.sourceFileName = this.fileName;
    }
    if (this.totalRows && !this.totalRecords) {
        this.totalRecords = this.totalRows;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Create import job
 * @param {Object} data - Job data or legacy parameters
 * @returns {Promise<ImportJob>}
 */
importJobSchema.statics.createJob = async function(data, entityType, options) {
    // Support both old and new API
    if (typeof data === 'string' || data instanceof mongoose.Types.ObjectId) {
        // Old API: createJob(lawyerId, entityType, options)
        return await this.create({
            userId: data,
            lawyerId: data,
            entityType,
            mapping: options?.mapping || {},
            options: {
                skipDuplicates: options?.skipDuplicates !== false,
                updateExisting: options?.updateExisting === true,
                dryRun: options?.dryRun === true,
                validateOnly: options?.validateOnly === true
            },
            fileName: options?.sourceFileName || options?.fileName,
            fileUrl: options?.sourceFileUrl || options?.fileUrl,
            sourceFileUrl: options?.sourceFileUrl || options?.fileUrl,
            sourceFileName: options?.sourceFileName || options?.fileName,
            fileKey: options?.fileKey,
            fileSize: options?.fileSize,
            fileMimeType: options?.fileMimeType,
            firmId: options?.firmId,
            metadata: options?.metadata || {}
        });
    } else {
        // New API: createJob(data)
        return await this.create({
            userId: data.userId,
            lawyerId: data.userId,
            firmId: data.firmId,
            entityType: data.entityType,
            fileName: data.fileName,
            fileUrl: data.fileUrl,
            sourceFileUrl: data.fileUrl,
            sourceFileName: data.fileName,
            fileKey: data.fileKey,
            fileSize: data.fileSize,
            fileMimeType: data.fileMimeType,
            options: data.options || {},
            metadata: data.metadata || {}
        });
    }
};

/**
 * Update job status
 * @param {String} jobId - Job ID
 * @param {String} status - New status
 * @param {Object} updates - Additional updates
 * @returns {Promise<ImportJob>}
 */
importJobSchema.statics.updateStatus = async function(jobId, status, updates = {}) {
    const statusTimestamps = {
        validating: { validatedAt: null },
        validated: { validatedAt: new Date() },
        processing: { startedAt: new Date() },
        completed: { completedAt: new Date() },
        failed: { completedAt: new Date() },
        cancelled: { completedAt: new Date() },
        partial: { completedAt: new Date() }
    };

    return await this.findByIdAndUpdate(
        jobId,
        {
            status,
            ...(statusTimestamps[status] || {}),
            ...updates
        },
        { new: true }
    );
};

/**
 * Add error to job
 * @param {String} jobId - Job ID
 * @param {Object|Number} error - Error object or row number (legacy)
 * @param {String} field - Field name (legacy)
 * @param {String} message - Error message (legacy)
 * @returns {Promise<ImportJob>}
 */
importJobSchema.statics.addError = async function(jobId, error, field, message) {
    // Support both old and new API
    if (typeof error === 'number') {
        // Old API: addError(jobId, row, field, message)
        return await this.findByIdAndUpdate(
            jobId,
            {
                $push: {
                    errors: {
                        row: error,
                        column: field,
                        message: message,
                        severity: 'error'
                    },
                    importErrors: { row: error, field, message }
                },
                $inc: { errorCount: 1 }
            },
            { new: true }
        );
    } else {
        // New API: addError(jobId, error)
        return await this.findByIdAndUpdate(
            jobId,
            {
                $push: {
                    errors: {
                        row: error.row,
                        column: error.column,
                        message: error.message,
                        data: error.data,
                        severity: 'error'
                    }
                },
                $inc: { errorCount: 1 }
            },
            { new: true }
        );
    }
};

/**
 * Add warning to job
 * @param {String} jobId - Job ID
 * @param {Object} warning - Warning object
 * @returns {Promise<ImportJob>}
 */
importJobSchema.statics.addWarning = async function(jobId, warning) {
    return await this.findByIdAndUpdate(
        jobId,
        {
            $push: {
                warnings: {
                    row: warning.row,
                    column: warning.column,
                    message: warning.message,
                    data: warning.data,
                    severity: 'warning'
                }
            },
            $inc: { warningCount: 1 }
        },
        { new: true }
    );
};

/**
 * Update job progress
 * @param {String} jobId - Job ID
 * @param {Number} progress - Progress percentage or processed rows
 * @param {Object} counts - Additional counts
 * @returns {Promise<ImportJob>}
 */
importJobSchema.statics.updateProgress = async function(jobId, progress, counts = {}) {
    const updates = {
        status: 'processing',
        ...(counts.successCount !== undefined && { successCount: counts.successCount }),
        ...(counts.errorCount !== undefined && { errorCount: counts.errorCount }),
        ...(counts.skippedCount !== undefined && { skippedCount: counts.skippedCount })
    };

    // Support both progress percentage and processedRows
    if (progress <= 100) {
        updates.progress = progress;
    } else {
        updates.processedRows = progress;
    }

    return await this.findByIdAndUpdate(jobId, updates, { new: true });
};

/**
 * Complete job
 * @param {String} jobId - Job ID
 * @param {Object} results - Final results
 * @returns {Promise<ImportJob>}
 */
importJobSchema.statics.completeJob = async function(jobId, results) {
    const status = results.errorCount > 0 ? 'partial' : (results.status || 'completed');

    return await this.findByIdAndUpdate(
        jobId,
        {
            status,
            progress: 100,
            processedRows: results.processedRows,
            successCount: results.successCount,
            errorCount: results.errorCount,
            warningCount: results.warningCount || 0,
            skippedCount: results.skippedCount || 0,
            totalRows: results.totalRecords || results.processedRows,
            totalRecords: results.totalRecords || results.processedRows,
            completedAt: new Date(),
            createdIds: results.createdIds || [],
            updatedIds: results.updatedIds || [],
            errorReportUrl: results.errorReportUrl
        },
        { new: true }
    );
};

/**
 * Fail job
 * @param {String} jobId - Job ID
 * @param {String} errorMessage - Error message
 * @returns {Promise<ImportJob>}
 */
importJobSchema.statics.failJob = async function(jobId, errorMessage) {
    return await this.findByIdAndUpdate(
        jobId,
        {
            status: 'failed',
            errorMessage,
            completedAt: new Date(),
            $push: {
                importErrors: { row: 0, field: 'system', message: errorMessage }
            }
        },
        { new: true }
    );
};

/**
 * Get import history for user/firm
 * @param {String} userId - User ID
 * @param {String} firmId - Firm ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>}
 */
importJobSchema.statics.getHistory = async function(userId, firmId, filters = {}) {
    const query = {};

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    } else if (userId) {
        query.$or = [
            { userId: new mongoose.Types.ObjectId(userId) },
            { lawyerId: new mongoose.Types.ObjectId(userId) }
        ];
    }

    if (filters.entityType) {
        query.entityType = filters.entityType;
    }

    if (filters.status) {
        query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    return await this.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .select('-errors -warnings -importErrors')
        .lean();
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Mark job as rolled back
 * @param {String} userId - User ID performing rollback
 * @returns {Promise<ImportJob>}
 */
importJobSchema.methods.markRolledBack = async function(userId) {
    this.rolledBack = true;
    this.rolledBackAt = new Date();
    this.rolledBackBy = userId;
    return await this.save();
};

/**
 * Add created entity ID for rollback tracking
 * @param {String} entityId - Created entity ID
 * @returns {Promise<ImportJob>}
 */
importJobSchema.methods.addCreatedId = async function(entityId) {
    if (!this.createdIds.includes(entityId)) {
        this.createdIds.push(entityId);
        return await this.save();
    }
    return this;
};

/**
 * Add updated entity ID for rollback tracking
 * @param {String} entityId - Updated entity ID
 * @returns {Promise<ImportJob>}
 */
importJobSchema.methods.addUpdatedId = async function(entityId) {
    if (!this.updatedIds.includes(entityId)) {
        this.updatedIds.push(entityId);
        return await this.save();
    }
    return this;
};

/**
 * Cancel job
 * @returns {Promise<ImportJob>}
 */
importJobSchema.methods.cancel = async function() {
    if (this.isCompleted) {
        throw new Error('Cannot cancel completed job');
    }

    this.status = 'cancelled';
    this.completedAt = new Date();
    return await this.save();
};

// ═══════════════════════════════════════════════════════════════
// FIRM ISOLATION PLUGIN (RLS-like enforcement)
// ═══════════════════════════════════════════════════════════════
const firmIsolationPlugin = require('./plugins/firmIsolation.plugin');

/**
 * Apply Row-Level Security (RLS) plugin to enforce firm-level data isolation.
 */
importJobSchema.plugin(firmIsolationPlugin);

module.exports = mongoose.model('ImportJob', importJobSchema);
