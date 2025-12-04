/**
 * Email OTP Model for TRAF3LI
 * Stores OTP codes with expiry, rate limiting, and security
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const emailOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  otpHash: {
    type: String,
    required: true,
    // Store hashed OTP for security
  },

  purpose: {
    type: String,
    enum: ['registration', 'login', 'password_reset', 'email_verification', 'transaction'],
    required: true,
  },

  expiresAt: {
    type: Date,
    required: true,
    index: true, // For automatic cleanup
  },

  verified: {
    type: Boolean,
    default: false,
  },

  attempts: {
    type: Number,
    default: 0,
    max: 3, // Max 3 attempts per OTP
  },

  ipAddress: {
    type: String,
    required: false,
  },

  userAgent: {
    type: String,
    required: false,
  },

  // Rate limiting fields
  requestCount: {
    type: Number,
    default: 1,
  },

  lastRequestAt: {
    type: Date,
    default: Date.now,
  },

}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Index for automatic cleanup of expired OTPs
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for finding active OTPs by email and purpose
emailOtpSchema.index({ email: 1, purpose: 1, verified: 1 });

// Compound index for rate limiting queries
emailOtpSchema.index({ email: 1, lastRequestAt: 1 });

/**
 * Hash OTP for secure storage
 */
const hashOTP = (otp) => {
  const salt = process.env.OTP_SECRET_SALT || 'traf3li-default-salt';
  return crypto
    .createHash('sha256')
    .update(otp + salt)
    .digest('hex');
};

/**
 * Static method: Create new OTP
 */
emailOtpSchema.statics.createOTP = async function(email, otp, purpose, expiryMinutes = 5, metadata = {}) {
  // Invalidate any existing unverified OTPs for this email and purpose
  await this.updateMany(
    { email: email.toLowerCase(), purpose, verified: false },
    { $set: { verified: true, expiresAt: new Date() } } // Mark as used
  );

  // Create new OTP
  return await this.create({
    email: email.toLowerCase(),
    otpHash: hashOTP(otp),
    purpose,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });
};

/**
 * Static method: Verify OTP
 */
emailOtpSchema.statics.verifyOTP = async function(email, otp, purpose) {
  const otpRecord = await this.findOne({
    email: email.toLowerCase(),
    purpose,
    verified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }); // Get most recent

  if (!otpRecord) {
    return {
      success: false,
      error: 'OTP not found or expired',
      errorAr: 'رمز التحقق غير موجود أو منتهي الصلاحية',
    };
  }

  // Check attempts
  if (otpRecord.attempts >= 3) {
    return {
      success: false,
      error: 'Too many failed attempts',
      errorAr: 'تم تجاوز عدد المحاولات المسموح بها',
    };
  }

  // Verify hash
  const inputHash = hashOTP(otp);
  if (otpRecord.otpHash !== inputHash) {
    // Increment attempts
    otpRecord.attempts += 1;
    await otpRecord.save();

    return {
      success: false,
      error: 'Invalid OTP',
      errorAr: 'رمز التحقق غير صحيح',
      attemptsLeft: 3 - otpRecord.attempts,
    };
  }

  // Mark as verified
  otpRecord.verified = true;
  await otpRecord.save();

  return {
    success: true,
    message: 'OTP verified successfully',
    messageAr: 'تم التحقق من الرمز بنجاح',
  };
};

/**
 * Static method: Check rate limit
 */
emailOtpSchema.statics.checkRateLimit = async function(email, purpose) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Count OTP requests in last hour
  const count = await this.countDocuments({
    email: email.toLowerCase(),
    purpose,
    createdAt: { $gte: oneHourAgo },
  });

  // Limit: 5 OTP requests per hour per email
  if (count >= 5) {
    return {
      limited: true,
      message: 'Too many OTP requests. Please try again later.',
      messageAr: 'تم تجاوز عدد الطلبات المسموح بها. يرجى المحاولة لاحقاً',
    };
  }

  // Get last request time
  const lastOtp = await this.findOne({
    email: email.toLowerCase(),
    purpose,
  }).sort({ createdAt: -1 });

  if (lastOtp) {
    const timeSinceLastRequest = Date.now() - lastOtp.createdAt.getTime();
    const minWaitTime = 60 * 1000; // 1 minute between requests

    if (timeSinceLastRequest < minWaitTime) {
      const waitSeconds = Math.ceil((minWaitTime - timeSinceLastRequest) / 1000);
      return {
        limited: true,
        message: `Please wait ${waitSeconds} seconds before requesting a new OTP`,
        messageAr: `يرجى الانتظار ${waitSeconds} ثانية قبل طلب رمز جديد`,
        waitTime: waitSeconds,
      };
    }
  }

  return {
    limited: false,
  };
};

/**
 * Static method: Cleanup expired OTPs (manual cleanup if needed)
 */
emailOtpSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  return {
    deleted: result.deletedCount,
  };
};

/**
 * Instance method: Check if OTP is expired
 */
emailOtpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

/**
 * Instance method: Check if OTP is locked (too many attempts)
 */
emailOtpSchema.methods.isLocked = function() {
  return this.attempts >= 3;
};

/**
 * Virtual: Time remaining
 */
emailOtpSchema.virtual('timeRemaining').get(function() {
  const remaining = this.expiresAt - new Date();
  return Math.max(0, Math.floor(remaining / 1000)); // Seconds
});

/**
 * Pre-save hook: Ensure expiry is set
 */
emailOtpSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Default 5 minutes
  }
  next();
});

/**
 * Prevent exposing sensitive data in JSON
 */
emailOtpSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.otpHash; // Never expose hash
  return obj;
};

const EmailOTP = mongoose.model('EmailOTP', emailOtpSchema);

module.exports = EmailOTP;
