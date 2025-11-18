const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      required: true,
      unique: true, // Stored filename (UUID-based)
    },
    originalName: {
      type: String,
      required: true, // User's original filename
    },
    fileType: {
      type: String,
      required: true, // MIME type
    },
    fileSize: {
      type: Number,
      required: true, // Bytes
    },
    url: {
      type: String,
      required: true, // S3/Cloudinary URL
    },
    category: {
      type: String,
      enum: ['contract', 'judgment', 'evidence', 'correspondence', 'pleading', 'other'],
      required: true,
      default: 'other',
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      index: true, // Index for faster queries
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isConfidential: {
      type: Boolean,
      default: false, // Extra security flag
    },
    isEncrypted: {
      type: Boolean,
      default: false, // Currently encrypted?
    },
    encryptionIV: {
      type: String, // Initialization vector for encryption
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    version: {
      type: Number,
      default: 1, // Version number
    },
    parentDocumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document', // Link to original document for versioning
    },
    // Shareable link
    shareToken: {
      type: String, // Random token for sharing
    },
    shareExpiresAt: {
      type: Date, // When share link expires
    },
    // Access tracking
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
    },
    // Metadata
    metadata: {
      width: Number, // For images
      height: Number,
      duration: Number, // For videos/audio
      pageCount: Number, // For PDFs
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
documentSchema.index({ caseId: 1, createdAt: -1 });
documentSchema.index({ uploadedBy: 1, createdAt: -1 });
documentSchema.index({ category: 1 });
documentSchema.index({ isConfidential: 1 });
documentSchema.index({ tags: 1 });

// Text index for search
documentSchema.index({ 
  originalName: 'text', 
  description: 'text', 
  tags: 'text' 
});

// Virtual for getting all versions
documentSchema.virtual('versions', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'parentDocumentId',
});

// Method to check if document is accessible
documentSchema.methods.isAccessibleBy = function(userId, userRole) {
  // Admin can access everything
  if (userRole === 'admin') return true;

  // User who uploaded can access
  if (this.uploadedBy.toString() === userId.toString()) return true;

  // If linked to case, check case permissions
  // (This would need to query the Case model)
  
  return false;
};

// Method to increment access count
documentSchema.methods.recordAccess = async function() {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  await this.save();
};

// Pre-save hook: Auto-encrypt judgments
documentSchema.pre('save', async function(next) {
  if (this.category === 'judgment' && !this.isEncrypted) {
    // Mark for encryption (actual encryption done in controller)
    this.isConfidential = true;
  }
  next();
});

// Static method to get storage stats
documentSchema.statics.getStorageStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: userId ? { uploadedBy: mongoose.Types.ObjectId(userId) } : {} },
    {
      $group: {
        _id: null,
        totalDocuments: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        confidentialCount: {
          $sum: { $cond: ['$isConfidential', 1, 0] }
        },
      },
    },
  ]);

  return stats[0] || { totalDocuments: 0, totalSize: 0, confidentialCount: 0 };
};

// Static method to get category breakdown
documentSchema.statics.getCategoryBreakdown = async function(filters = {}) {
  return await this.aggregate([
    { $match: filters },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
      },
    },
    {
      $project: {
        category: '$_id',
        count: 1,
        totalSize: 1,
        _id: 0,
      },
    },
  ]);
};

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
