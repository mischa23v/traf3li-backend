const mongoose = require('mongoose');

const documentAnalysisSchema = new mongoose.Schema({
  // ═══════════════════════════════════════════════════════════════
  // FIRM (Multi-Tenancy)
  // ═══════════════════════════════════════════════════════════════
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: false,
    index: true
  },

  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true
  },

  documentVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentVersion'
  },

  // ═══════════════════════════════════════════════════════════════
  // Analysis Status
  // ═══════════════════════════════════════════════════════════════
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },

  startedAt: Date,
  completedAt: Date,
  error: String,

  // ═══════════════════════════════════════════════════════════════
  // Document Classification
  // ═══════════════════════════════════════════════════════════════
  classification: {
    documentType: String,
    subType: String,
    confidence: Number,
    language: String,
    isLegalDocument: Boolean
  },

  // ═══════════════════════════════════════════════════════════════
  // Extracted Entities
  // ═══════════════════════════════════════════════════════════════
  entities: [{
    type: { type: String },
    value: String,
    normalizedValue: String,
    confidence: Number,
    position: {
      page: Number,
      startChar: Number,
      endChar: Number
    }
  }],

  // ═══════════════════════════════════════════════════════════════
  // Key Information
  // ═══════════════════════════════════════════════════════════════
  keyInfo: {
    parties: [{
      role: String,
      name: String,
      type: String
    }],
    dates: [{
      type: { type: String },
      date: Date,
      isEstimate: Boolean
    }],
    amounts: [{
      type: { type: String },
      amount: Number,
      currency: String
    }],
    references: [{
      type: { type: String },
      value: String
    }]
  },

  // ═══════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════
  summary: {
    brief: String,
    detailed: String,
    keyPoints: [String],
    actionItems: [String]
  },

  // ═══════════════════════════════════════════════════════════════
  // Risk Analysis
  // ═══════════════════════════════════════════════════════════════
  riskAnalysis: {
    overallRisk: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    riskScore: Number,
    risks: [{
      type: { type: String },
      severity: String,
      description: String,
      clause: String,
      recommendation: String
    }]
  },

  // ═══════════════════════════════════════════════════════════════
  // Clause Analysis
  // ═══════════════════════════════════════════════════════════════
  clauses: [{
    type: { type: String },
    text: String,
    analysis: String,
    isStandard: Boolean,
    concerns: [String]
  }],

  // ═══════════════════════════════════════════════════════════════
  // OCR Results
  // ═══════════════════════════════════════════════════════════════
  ocr: {
    performed: Boolean,
    confidence: Number,
    pageCount: Number,
    wordCount: Number,
    fullText: String
  },

  // ═══════════════════════════════════════════════════════════════
  // Metadata
  // ═══════════════════════════════════════════════════════════════
  processingTime: Number,
  aiModel: String,
  tokensUsed: Number,
  cost: Number,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// Indexes
// ═══════════════════════════════════════════════════════════════
documentAnalysisSchema.index({ firmId: 1, documentId: 1 });
documentAnalysisSchema.index({ firmId: 1, status: 1 });
documentAnalysisSchema.index({ firmId: 1, 'classification.documentType': 1 });
documentAnalysisSchema.index({ documentId: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// Static Methods
// ═══════════════════════════════════════════════════════════════

/**
 * Get latest analysis for a document
 */
documentAnalysisSchema.statics.getLatestAnalysis = async function(documentId, firmId = null) {
  const query = { documentId };
  if (firmId) query.firmId = firmId;

  return await this.findOne(query)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'firstName lastName fullName');
};

/**
 * Get all analyses for a document
 */
documentAnalysisSchema.statics.getDocumentHistory = async function(documentId, firmId = null) {
  const query = { documentId };
  if (firmId) query.firmId = firmId;

  return await this.find(query)
    .sort({ createdAt: -1 })
    .populate('createdBy', 'firstName lastName fullName');
};

/**
 * Get analysis statistics
 */
documentAnalysisSchema.statics.getStats = async function(firmId) {
  const query = firmId ? { firmId } : {};

  const [total, byStatus, byType, avgProcessingTime] = await Promise.all([
    this.countDocuments(query),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { ...query, 'classification.documentType': { $exists: true } } },
      { $group: { _id: '$classification.documentType', count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { ...query, processingTime: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$processingTime' } } }
    ])
  ]);

  return {
    total,
    byStatus,
    byType,
    avgProcessingTime: avgProcessingTime[0]?.avg || 0
  };
};

module.exports = mongoose.model('DocumentAnalysis', documentAnalysisSchema);
