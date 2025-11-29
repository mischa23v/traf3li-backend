const mongoose = require('mongoose');

const importErrorSchema = new mongoose.Schema({
    row: Number,
    field: String,
    message: String
});

const importJobSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    entityType: {
        type: String,
        enum: ['clients', 'cases', 'contacts', 'organizations', 'staff', 'invoices', 'time_entries', 'documents', 'followups', 'tags'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'partial'],
        default: 'pending'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    totalRecords: {
        type: Number,
        default: 0
    },
    successCount: {
        type: Number,
        default: 0
    },
    errorCount: {
        type: Number,
        default: 0
    },
    skippedCount: {
        type: Number,
        default: 0
    },
    importErrors: [importErrorSchema],
    mapping: mongoose.Schema.Types.Mixed,
    options: {
        skipDuplicates: { type: Boolean, default: true },
        updateExisting: { type: Boolean, default: false },
        dryRun: { type: Boolean, default: false }
    },
    sourceFileUrl: String,
    sourceFileName: String,
    completedAt: Date
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
importJobSchema.index({ lawyerId: 1, status: 1 });
importJobSchema.index({ lawyerId: 1, entityType: 1 });

// Static method: Create import job
importJobSchema.statics.createJob = async function(lawyerId, entityType, options = {}) {
    return await this.create({
        lawyerId,
        entityType,
        mapping: options.mapping || {},
        options: {
            skipDuplicates: options.skipDuplicates !== false,
            updateExisting: options.updateExisting === true,
            dryRun: options.dryRun === true
        },
        sourceFileUrl: options.sourceFileUrl,
        sourceFileName: options.sourceFileName
    });
};

// Static method: Update progress
importJobSchema.statics.updateProgress = async function(jobId, progress, counts = {}) {
    return await this.findByIdAndUpdate(
        jobId,
        {
            progress,
            status: 'processing',
            ...(counts.successCount !== undefined && { successCount: counts.successCount }),
            ...(counts.errorCount !== undefined && { errorCount: counts.errorCount }),
            ...(counts.skippedCount !== undefined && { skippedCount: counts.skippedCount })
        },
        { new: true }
    );
};

// Static method: Add error
importJobSchema.statics.addError = async function(jobId, row, field, message) {
    return await this.findByIdAndUpdate(
        jobId,
        {
            $push: { importErrors: { row, field, message } },
            $inc: { errorCount: 1 }
        },
        { new: true }
    );
};

// Static method: Complete job
importJobSchema.statics.completeJob = async function(jobId, counts) {
    const status = counts.errorCount > 0 ? 'partial' : 'completed';
    return await this.findByIdAndUpdate(
        jobId,
        {
            status,
            progress: 100,
            successCount: counts.successCount,
            errorCount: counts.errorCount,
            skippedCount: counts.skippedCount,
            totalRecords: counts.totalRecords,
            completedAt: new Date()
        },
        { new: true }
    );
};

// Static method: Fail job
importJobSchema.statics.failJob = async function(jobId, error) {
    return await this.findByIdAndUpdate(
        jobId,
        {
            status: 'failed',
            $push: { importErrors: { row: 0, field: 'system', message: error } }
        },
        { new: true }
    );
};

module.exports = mongoose.model('ImportJob', importJobSchema);
