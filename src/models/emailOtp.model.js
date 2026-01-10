/**
 * Email OTP Model for TRAF3LI
 * Stores OTP codes with expiry, rate limiting, and security
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { timingSafeEqual } = require('../utils/securityUtils');

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

  // Track failed verification attempts from this IP for rate limiting
  failedVerificationAttempts: [{
    ipAddress: String,
    attemptedAt: Date,
  }],

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
 * Static method: Verify OTP with timing-safe comparison
 */
emailOtpSchema.statics.verifyOTP = async function(email, otp, purpose, ipAddress = null) {
  // Find the most recent unverified OTP
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
    // Calculate actual wait time until oldest OTP in window expires
    const oldestOtp = await this.findOne({
      email: email.toLowerCase(),
      purpose,
      createdAt: { $gte: oneHourAgo },
    }).sort({ createdAt: 1 }); // Oldest first

    const calculatedWait = oldestOtp
      ? Math.ceil((oldestOtp.createdAt.getTime() + 60 * 60 * 1000 - Date.now()) / 1000)
      : 3600;
    // Ensure waitSeconds is always positive (minimum 60 seconds)
    const waitSeconds = Math.max(calculatedWait, 60);
    const waitMinutes = Math.ceil(waitSeconds / 60);

    return {
      limited: true,
      message: `Too many OTP requests. Please try again in ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
      messageAr: `تم تجاوز عدد الطلبات المسموح بها. يرجى المحاولة بعد ${waitMinutes} دقيقة`,
      waitTime: waitSeconds,
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
 * Static method: Check rate limit for OTP verification (IP-based)
 * Prevents brute force attacks across multiple emails from the same IP
 */
emailOtpSchema.statics.checkVerificationRateLimit = async function(ipAddress, email) {
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

  // Additional check: Count total verification attempts (including successful) from this IP in last 15 minutes
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
