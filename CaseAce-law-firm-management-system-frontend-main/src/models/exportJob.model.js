const mongoose = require('mongoose');

const exportJobSchema = new mongoose.Schema({
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
    format: {
        type: String,
        enum: ['xlsx', 'csv', 'pdf', 'json'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    totalRecords: Number,
    error: String,
    filters: mongoose.Schema.Types.Mixed,
    columns: [String],
    completedAt: Date,
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
exportJobSchema.index({ lawyerId: 1, status: 1 });
exportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method: Create export job
exportJobSchema.statics.createJob = async function(lawyerId, entityType, format, options = {}) {
    return await this.create({
        lawyerId,
        entityType,
        format,
        filters: options.filters || {},
        columns: options.columns || []
    });
};

// Static method: Update progress
exportJobSchema.statics.updateProgress = async function(jobId, progress) {
    return await this.findByIdAndUpdate(
        jobId,
        { progress, status: progress >= 100 ? 'completed' : 'processing' },
        { new: true }
    );
};

// Static method: Complete job
exportJobSchema.statics.completeJob = async function(jobId, fileUrl, fileName, fileSize, totalRecords) {
    return await this.findByIdAndUpdate(
        jobId,
        {
            status: 'completed',
            progress: 100,
            fileUrl,
            fileName,
            fileSize,
            totalRecords,
            completedAt: new Date()
        },
        { new: true }
    );
};

// Static method: Fail job
exportJobSchema.statics.failJob = async function(jobId, error) {
    return await this.findByIdAndUpdate(
        jobId,
        {
            status: 'failed',
            error
        },
        { new: true }
    );
};

module.exports = mongoose.model('ExportJob', exportJobSchema);
