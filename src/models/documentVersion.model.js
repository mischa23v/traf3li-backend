const mongoose = require('mongoose');

/**
 * Document Version Model
 * Standalone model for tracking document versions
 * Complements the embedded versions in the Document model
 * Provides better querying capabilities and standalone version management
 */
const documentVersionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    index: true,
    required: false
   },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
  version: {
    type: Number,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String
  },
  fileType: {
    type: String
  },
  storageKey: {
    type: String,
    required: true
  },
  url: {
    type: String
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changeNote: {
    type: String,
    maxlength: 500
  },
  checksum: {
    type: String // MD5 or SHA256 hash for integrity verification
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    pageCount: Number
  }
}, {
  timestamps: true,
  versionKey: false
});

// Compound index for efficient querying
documentVersionSchema.index({ documentId: 1, version: -1 });
documentVersionSchema.index({ documentId: 1, createdAt: -1 });
documentVersionSchema.index({ uploadedBy: 1, createdAt: -1 });
documentVersionSchema.index({ firmId: 1, createdAt: -1 });

/**
 * Static method to get version history for a document
 * @param {ObjectId} documentId - The document ID
 * @returns {Promise<Array>} - Array of versions sorted by version number descending
 */
documentVersionSchema.statics.getVersionHistory = async function(documentId) {
  return this.find({ documentId })
    .populate('uploadedBy', 'firstName lastName fullName')
    .sort({ version: -1 })
    .lean();
};

/**
 * Static method to get a specific version
 * @param {ObjectId} documentId - The document ID
 * @param {number} version - The version number
 * @returns {Promise<Object>} - The version document
 */
documentVersionSchema.statics.getVersion = async function(documentId, version) {
  return this.findOne({ documentId, version })
    .populate('uploadedBy', 'firstName lastName fullName')
    .lean();
};

/**
 * Static method to get the latest version number for a document
 * @param {ObjectId} documentId - The document ID
 * @returns {Promise<number>} - The latest version number (0 if no versions exist)
 */
documentVersionSchema.statics.getLatestVersionNumber = async function(documentId) {
  const latest = await this.findOne({ documentId })
    .sort({ version: -1 })
    .select('version')
    .lean();
  return latest?.version || 0;
};

/**
 * Static method to create a new version
 * @param {Object} versionData - The version data
 * @returns {Promise<Object>} - The created version
 */
documentVersionSchema.statics.createVersion = async function(versionData) {
  const latestVersion = await this.getLatestVersionNumber(versionData.documentId);
  versionData.version = latestVersion + 1;
  return this.create(versionData);
};

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);
