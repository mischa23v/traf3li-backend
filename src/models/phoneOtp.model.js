/**
 * Phone OTP Model for TRAF3LI
 * Stores OTP codes for SMS authentication with expiry, rate limiting, and security
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { timingSafeEqual } = require('../utils/securityUtils');

const phoneOtpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    trim: true,
    index: true,
    // Store in international format: +966XXXXXXXXX
  },

  otpHash: {
    type: String,
    required: true,
    // Store hashed OTP for security
  },

  purpose: {
    type: String,
    enum: ['registration', 'login', 'verify_phone', 'password_reset', 'transaction'],
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

  // Track failed verification attempts from this IP for rate limiting
  failedVerificationAttempts: [{
    ipAddress: String,
    attemptedAt: Date,
  }],

}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Index for automatic cleanup of expired OTPs
phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for finding active OTPs by phone and purpose
phoneOtpSchema.index({ phone: 1, purpose: 1, verified: 1 });

// Compound index for rate limiting queries
phoneOtpSchema.index({ phone: 1, lastRequestAt: 1 });

/**
 * Hash OTP for secure storage
 */
const hashOTP = (otp) => {
  const salt = process.env.OTP_SECRET_SALT;
  if (!salt) {
    throw new Error('OTP_SECRET_SALT environment variable must be set');
  }
  return crypto
    .createHash('sha256')
    .update(otp + salt)
    .digest('hex');
};

/**
 * Static method: Create new OTP
 */
phoneOtpSchema.statics.createOTP = async function(phone, otp, purpose, expiryMinutes = 5, metadata = {}) {
  // Invalidate any existing unverified OTPs for this phone and purpose
  await this.updateMany(
    { phone, purpose, verified: false },
    { $set: { verified: true, expiresAt: new Date() } } // Mark as used
  );

  // Create new OTP
  return await this.create({
    phone,
    otpHash: hashOTP(otp),
    purpose,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });
};

/**
 * Static method: Verify OTP with timing-safe comparison
 */
phoneOtpSchema.statics.verifyOTP = async function(phone, otp, purpose, ipAddress = null) {
  // Find the most recent unverified OTP
  const otpRecord = await this.findOne({
    phone,
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

  // Check if OTP has expired (additional validation)
  if (otpRecord.isExpired()) {
    return {
      success: false,
      error: 'OTP has expired',
      errorAr: 'انتهت صلاحية رمز التحقق',
    };
  }

  // Check if OTP is locked due to too many attempts
  if (otpRecord.attempts >= 3) {
    return {
      success: false,
      error: 'Too many failed attempts. Please request a new OTP.',
      errorAr: 'تم تجاوز عدد المحاولات المسموح بها. يرجى طلب رمز جديد.',
    };
  }

  // Verify hash using timing-safe comparison to prevent timing attacks
  const inputHash = hashOTP(otp);
  const isValid = timingSafeEqual(otpRecord.otpHash, inputHash);

  if (!isValid) {
    // Increment attempts
    otpRecord.attempts += 1;

    // Track failed verification attempt for rate limiting
    if (ipAddress) {
      otpRecord.failedVerificationAttempts.push({
        ipAddress,
        attemptedAt: new Date(),
      });
    }

    await otpRecord.save();

    return {
      success: false,
      error: 'Invalid OTP',
      errorAr: 'رمز التحقق غير صحيح',
      attemptsLeft: 3 - otpRecord.attempts,
    };
  }

  // Mark as verified to prevent reuse
  otpRecord.verified = true;
  await otpRecord.save();

  return {
    success: true,
    message: 'OTP verified successfully',
    messageAr: 'تم التحقق من الرمز بنجاح',
  };
};

/**
 * Static method: Check rate limit for OTP generation
 * 3 OTPs per hour per phone, 1 minute between requests
 */
phoneOtpSchema.statics.checkRateLimit = async function(phone, purpose) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Count OTP requests in last hour
  const count = await this.countDocuments({
    phone,
    purpose,
    createdAt: { $gte: oneHourAgo },
  });

  // Limit: 3 OTP requests per hour per phone (stricter than email)
  if (count >= 3) {
    return {
      limited: true,
      message: 'Too many OTP requests. Please try again later.',
      messageAr: 'تم تجاوز عدد الطلبات المسموح بها. يرجى المحاولة لاحقاً',
    };
  }

  // Get last request time
  const lastOtp = await this.findOne({
    phone,
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
 * Static method: Check rate limit for OTP verification (IP-based)
 * Prevents brute force attacks across multiple phones from the same IP
 */
phoneOtpSchema.statics.checkVerificationRateLimit = async function(ipAddress, phone) {
  if (!ipAddress) {
    return { limited: false };
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Count failed verification attempts from this IP in the last 5 minutes
  const recentFailedAttempts = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: fifteenMinutesAgo },
      }
    },
    {
      $unwind: {
        path: '$failedVerificationAttempts',
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $match: {
        'failedVerificationAttempts.ipAddress': ipAddress,
        'failedVerificationAttempts.attemptedAt': { $gte: fiveMinutesAgo }
      }
    },
    {
      $count: 'total'
    }
  ]);

  const failedCount = recentFailedAttempts.length > 0 ? recentFailedAttempts[0].total : 0;

  // Limit: 10 failed verification attempts per IP per 5 minutes
  if (failedCount >= 10) {
    return {
      limited: true,
      message: 'Too many failed verification attempts. Please try again in 5 minutes.',
      messageAr: 'محاولات تحقق فاشلة كثيرة جداً. يرجى المحاولة بعد 5 دقائق.',
      waitTime: 300,
    };
  }

  // Additional check: Count total verification attempts from this IP in last 15 minutes
  const totalAttempts = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: fifteenMinutesAgo },
      }
    },
    {
      $unwind: {
        path: '$failedVerificationAttempts',
        preserveNullAndEmptyArrays: false
      }
    },
    {
      $match: {
        'failedVerificationAttempts.ipAddress': ipAddress,
        'failedVerificationAttempts.attemptedAt': { $gte: fifteenMinutesAgo }
      }
    },
    {
      $count: 'total'
    }
  ]);

  const totalCount = totalAttempts.length > 0 ? totalAttempts[0].total : 0;

  // Limit: 20 total verification attempts per IP per 15 minutes
  if (totalCount >= 20) {
    return {
      limited: true,
      message: 'Too many verification attempts. Please try again later.',
      messageAr: 'محاولات تحقق كثيرة جداً. يرجى المحاولة لاحقاً.',
      waitTime: 900,
    };
  }

  return {
    limited: false,
  };
};

/**
 * Static method: Cleanup expired OTPs (manual cleanup if needed)
 */
phoneOtpSchema.statics.cleanupExpired = async function() {
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
phoneOtpSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

/**
 * Instance method: Check if OTP is locked (too many attempts)
 */
phoneOtpSchema.methods.isLocked = function() {
  return this.attempts >= 3;
};

/**
 * Virtual: Time remaining
 */
phoneOtpSchema.virtual('timeRemaining').get(function() {
  const remaining = this.expiresAt - new Date();
  return Math.max(0, Math.floor(remaining / 1000)); // Seconds
});

/**
 * Pre-save hook: Ensure expiry is set
 */
phoneOtpSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Default 5 minutes
  }
  next();
});

/**
 * Prevent exposing sensitive data in JSON
 */
phoneOtpSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.otpHash; // Never expose hash
  return obj;
};

const PhoneOTP = mongoose.model('PhoneOTP', phoneOtpSchema);

module.exports = PhoneOTP;
