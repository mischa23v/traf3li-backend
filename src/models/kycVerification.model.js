/**
 * KYC Verification Model
 *
 * Separate collection for tracking detailed KYC verification history and audit trail.
 * Provides a complete record of all verification attempts, status changes, and reviews.
 */

const mongoose = require('mongoose');

const kycVerificationSchema = new mongoose.Schema({
  // User being verified
  userId: {
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

  // Verification attempt details
  verificationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Type of verification
  verificationType: {
    type: String,
    enum: ['identity', 'business', 'document', 'address'],
    required: true
  },

  // Document type used for verification
  documentType: {
    type: String,
    enum: ['national_id', 'iqama', 'passport', 'commercial_registration', 'power_of_attorney', 'address_proof', 'selfie'],
    required: true
  },

  // Document data
  documentNumber: {
    type: String,
    required: false
  },

  // Verification status
  status: {
    type: String,
    enum: ['initiated', 'pending', 'in_review', 'verified', 'rejected', 'expired'],
    default: 'initiated',
    required: true,
    index: true
  },

  // Verification method
  verificationMethod: {
    type: String,
    enum: ['automatic', 'manual', 'hybrid'],
    required: true
  },

  // External verification source
  verificationSource: {
    type: String,
    enum: ['yakeen', 'wathq', 'manual', 'third_party', null],
    default: null
  },

  // Verified data from external source
  verifiedData: {
    // For Yakeen (identity verification)
    nationalId: { type: String, required: false },
    fullNameAr: { type: String, required: false },
    fullNameEn: { type: String, required: false },
    dateOfBirth: { type: String, required: false },
    nationality: { type: String, required: false },
    gender: { type: String, required: false },

    // For Wathq (business verification)
    crNumber: { type: String, required: false },
    companyName: { type: String, required: false },
    entityType: { type: String, required: false },
    businessStatus: { type: String, required: false },
    isActive: { type: Boolean, required: false },

    // Generic fields
    externalId: { type: String, required: false },
    rawResponse: { type: mongoose.Schema.Types.Mixed, required: false }
  },

  // File uploads (if manual verification)
  files: [{
    fileUrl: { type: String, required: true },
    fileType: { type: String, required: false },
    uploadedAt: { type: Date, default: Date.now }
  }],

  // AML screening results
  amlScreening: {
    performed: { type: Boolean, default: false },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    status: {
      type: String,
      enum: ['clear', 'review', 'flagged', null],
      default: null
    },
    flags: [{
      type: { type: String, required: true },
      description: { type: String, required: false },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
      },
      detectedAt: { type: Date, default: Date.now }
    }],
    screenedAt: { type: Date, required: false }
  },

  // Review information (for manual reviews)
  review: {
    required: { type: Boolean, default: false },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    reviewedAt: { type: Date, required: false },
    approved: { type: Boolean, required: false },
    notes: { type: String, required: false },
    rejectionReason: { type: String, required: false }
  },

  // Expiration information
  expiresAt: {
    type: Date,
    required: false
  },

  // Timestamps for verification lifecycle
  initiatedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  verifiedAt: {
    type: Date,
    required: false
  },
  rejectedAt: {
    type: Date,
    required: false
  },
  expiredAt: {
    type: Date,
    required: false
  },

  // Request metadata
  requestMetadata: {
    ipAddress: { type: String, required: false },
    userAgent: { type: String, required: false },
    deviceFingerprint: { type: String, required: false },
    geoLocation: {
      country: { type: String, required: false },
      city: { type: String, required: false },
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false }
    }
  },

  // API response data (for debugging)
  apiResponse: {
    success: { type: Boolean, required: false },
    responseCode: { type: String, required: false },
    responseMessage: { type: String, required: false },
    errorDetails: { type: mongoose.Schema.Types.Mixed, required: false }
  },

  // Status change history
  statusHistory: [{
    from: { type: String, required: true },
    to: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    reason: { type: String, required: false }
  }],

  // Compliance flags
  compliance: {
    samaCompliant: { type: Boolean, default: false },
    amlCompliant: { type: Boolean, default: false },
    cftCompliant: { type: Boolean, default: false },
    complianceCheckedAt: { type: Date, required: false }
  },

  // Notes and comments
  notes: {
    type: String,
    required: false
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes for efficient querying
kycVerificationSchema.index({ userId: 1, status: 1 });
kycVerificationSchema.index({ userId: 1, createdAt: -1 });
kycVerificationSchema.index({ firmId: 1, createdAt: -1 });
kycVerificationSchema.index({ status: 1, createdAt: -1 });
kycVerificationSchema.index({ verificationSource: 1, status: 1 });
kycVerificationSchema.index({ 'review.required': 1, 'review.reviewedAt': 1 });

// Method to add status change to history
kycVerificationSchema.methods.changeStatus = function(newStatus, changedBy = null, reason = null) {
  this.statusHistory.push({
    from: this.status,
    to: newStatus,
    changedAt: new Date(),
    changedBy,
    reason
  });
  this.status = newStatus;

  // Update timestamp based on new status
  if (newStatus === 'verified') {
    this.verifiedAt = new Date();
  } else if (newStatus === 'rejected') {
    this.rejectedAt = new Date();
  } else if (newStatus === 'expired') {
    this.expiredAt = new Date();
  }
};

// Static method to create verification ID
kycVerificationSchema.statics.generateVerificationId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `KYC-${timestamp}-${random}`.toUpperCase();
};

module.exports = mongoose.model('KYCVerification', kycVerificationSchema);
