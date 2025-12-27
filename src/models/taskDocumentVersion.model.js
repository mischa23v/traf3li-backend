const mongoose = require('mongoose');

/**
 * Task Document Version Model
 * Tracks version history for TipTap documents in tasks
 */
const taskDocumentVersionSchema = new mongoose.Schema({
    taskId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    version: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    documentContent: {
        type: String // HTML content
    },
    documentJson: {
        type: mongoose.Schema.Types.Mixed // TipTap JSON format
    },
    contentFormat: {
        type: String,
        enum: ['html', 'tiptap-json', 'markdown'],
        default: 'tiptap-json'
    },
    fileSize: {
        type: Number,
        default: 0
    },
    editedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    changeNote: {
        type: String,
        maxlength: 500
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound indexes for efficient querying
taskDocumentVersionSchema.index({ taskId: 1, documentId: 1, version: -1 });
taskDocumentVersionSchema.index({ documentId: 1, createdAt: -1 });
taskDocumentVersionSchema.index({ firmId: 1, createdAt: -1 });

/**
 * Get version history for a task document
 */
taskDocumentVersionSchema.statics.getVersionHistory = async function(taskId, documentId) {
    return this.find({ taskId, documentId })
        .populate('editedBy', 'firstName lastName fullName')
        .sort({ version: -1 })
        .lean();
};

/**
 * Get a specific version
 */
taskDocumentVersionSchema.statics.getVersion = async function(taskId, documentId, version) {
    return this.findOne({ taskId, documentId, version })
        .populate('editedBy', 'firstName lastName fullName')
        .lean();
};

/**
 * Get the latest version number for a document
 */
taskDocumentVersionSchema.statics.getLatestVersionNumber = async function(taskId, documentId) {
    const latest = await this.findOne({ taskId, documentId })
        .sort({ version: -1 })
        .select('version')
        .lean();
    return latest?.version || 0;
};

/**
 * Create a new version snapshot
 */
taskDocumentVersionSchema.statics.createSnapshot = async function(taskId, documentId, documentData, userId, changeNote) {
    const latestVersion = await this.getLatestVersionNumber(taskId, documentId);

    return this.create({
        taskId,
        documentId,
        version: latestVersion + 1,
        title: documentData.title || documentData.fileName,
        documentContent: documentData.documentContent,
        documentJson: documentData.documentJson,
        contentFormat: documentData.contentFormat || 'tiptap-json',
        fileSize: documentData.fileSize || 0,
        editedBy: userId,
        changeNote: changeNote || 'Version saved'
    });
};

module.exports = mongoose.model('TaskDocumentVersion', taskDocumentVersionSchema);
