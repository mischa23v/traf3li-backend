/**
 * Reauthentication Challenge Model
 * Stores OTP codes for step-up authentication/reauthentication with expiry and security
 *
 * Similar to Supabase Auth's reauthentication flow
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { timingSafeEqual } = require('../utils/securityUtils');

const reauthChallengeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  otpHash: {
    type: String,
    required: true,
    // Store hashed OTP for security
  },

  method: {
    type: String,
    enum: ['email', 'sms', 'totp'],
    required: true,
  },

  purpose: {
    type: String,
    enum: [
      'password_change',
      'mfa_enable',
      'mfa_disable',
      'account_deletion',
      'payment_method',
      'security_settings',
      'sensitive_operation'
    ],
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

  // Track failed verification attempts for rate limiting
  failedVerificationAttempts: [{
    ipAddress: String,
    attemptedAt: Date,
  }],

  // For email/SMS delivery tracking
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },

  deliveryError: {
    type: String,
    required: false,
  },

}, {
  timestamps: true, // Adds createdAt and updatedAt
});

// Index for automatic cleanup of expired challenges
reauthChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for finding active challenges by userId and purpose
reauthChallengeSchema.index({ userId: 1, purpose: 1, verified: 1 });

// Compound index for rate limiting queries
reauthChallengeSchema.index({ userId: 1, createdAt: 1 });

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
 * Static method: Create new reauthentication challenge
 */
reauthChallengeSchema.statics.createChallenge = async function(userId, otp, method, purpose, expiryMinutes = 10, metadata = {}) {
  // Invalidate any existing unverified challenges for this user and purpose
  await this.updateMany(
    { userId, purpose, verified: false },
    { $set: { verified: true, expiresAt: new Date() } } // Mark as used
  );

  // Create new challenge
  return await this.create({
    userId,
    otpHash: hashOTP(otp),
    method,
    purpose,
    expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    deliveryStatus: 'pending',
  });
};

/**
 * Static method: Verify OTP with timing-safe comparison
 */
reauthChallengeSchema.statics.verifyChallenge = async function(userId, otp, purpose, ipAddress = null) {
  // Find the most recent unverified challenge
  const challenge = await this.findOne({
    userId,
    purpose,
    verified: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 }); // Get most recent

  if (!challenge) {
    return {
      success: false,
      error: 'Challenge not found or expired',
      errorAr: 'رمز التحقق غير موجود أو منتهي الصلاحية',
      code: 'CHALLENGE_NOT_FOUND'
    };
  }

  // Check if challenge has expired (additional validation)
  if (challenge.isExpired()) {
    return {
      success: false,
      error: 'Challenge has expired',
      errorAr: 'انتهت صلاحية رمز التحقق',
      code: 'CHALLENGE_EXPIRED'
    };
  }

  // Check if challenge is locked due to too many attempts
  if (challenge.attempts >= 3) {
    return {
      success: false,
      error: 'Too many failed attempts. Please request a new code.',
      errorAr: 'تم تجاوز عدد المحاولات المسموح بها. يرجى طلب رمز جديد.',
      code: 'CHALLENGE_LOCKED'
    };
  }

  // Verify hash using timing-safe comparison to prevent timing attacks
  const inputHash = hashOTP(otp);
  const isValid = timingSafeEqual(challenge.otpHash, inputHash);

  if (!isValid) {
    // Increment attempts
    challenge.attempts += 1;

    // Track failed verification attempt for rate limiting
    if (ipAddress) {
      challenge.failedVerificationAttempts.push({
        ipAddress,
        attemptedAt: new Date(),
      });
    }

    await challenge.save();

    return {
      success: false,
      error: 'Invalid code',
      errorAr: 'رمز التحقق غير صحيح',
      code: 'INVALID_CODE',
      attemptsLeft: 3 - challenge.attempts,
    };
  }

  // Mark as verified to prevent reuse
  challenge.verified = true;
  await challenge.save();

  return {
    success: true,
    message: 'Challenge verified successfully',
    messageAr: 'تم التحقق من الرمز بنجاح',
    challengeId: challenge._id
  };
};

/**
 * Static method: Check rate limit for challenge generation
 * 3 challenges per hour per user
 */
reauthChallengeSchema.statics.checkRateLimit = async function(userId, purpose) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Count challenge requests in last hour
  const count = await this.countDocuments({
    userId,
    purpose,
    createdAt: { $gte: oneHourAgo },
  });

  // Limit: 5 challenge requests per hour per user
  if (count >= 5) {
    // Calculate actual wait time until oldest challenge in window expires
    const oldestChallenge = await this.findOne({
      userId,
      purpose,
      createdAt: { $gte: oneHourAgo },
    }).sort({ createdAt: 1 }); // Oldest first

    const calculatedWait = oldestChallenge
      ? Math.ceil((oldestChallenge.createdAt.getTime() + 60 * 60 * 1000 - Date.now()) / 1000)
      : 3600;
    // Ensure waitSeconds is always positive (minimum 60 seconds)
    const waitSeconds = Math.max(calculatedWait, 60);
    const waitMinutes = Math.ceil(waitSeconds / 60);

    return {
      limited: true,
      message: `Too many reauthentication requests. Please try again in ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''}.`,
      messageAr: `تم تجاوز عدد الطلبات المسموح بها. يرجى المحاولة بعد ${waitMinutes} دقيقة`,
      waitTime: waitSeconds,
    };
  }

  // Get last request time
  const lastChallenge = await this.findOne({
    userId,
    purpose,
  }).sort({ createdAt: -1 });

  if (lastChallenge) {
    const timeSinceLastRequest = Date.now() - lastChallenge.createdAt.getTime();
    const minWaitTime = 60 * 1000; // 1 minute between requests

    if (timeSinceLastRequest < minWaitTime) {
      const waitSeconds = Math.ceil((minWaitTime - timeSinceLastRequest) / 1000);
      return {
        limited: true,
        message: `Please wait ${waitSeconds} seconds before requesting a new code`,
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
 * Static method: Cleanup expired challenges
 */
reauthChallengeSchema.statics.cleanupExpired = async function() {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() },
  });

  return {
    deleted: result.deletedCount,
  };
};

/**
 * Instance method: Check if challenge is expired
 */
reauthChallengeSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

/**
 * Instance method: Check if challenge is locked (too many attempts)
 */
reauthChallengeSchema.methods.isLocked = function() {
  return this.attempts >= 3;
};

/**
 * Virtual: Time remaining
 */
reauthChallengeSchema.virtual('timeRemaining').get(function() {
  const remaining = this.expiresAt - new Date();
  return Math.max(0, Math.floor(remaining / 1000)); // Seconds
});

/**
 * Pre-save hook: Ensure expiry is set
 */
reauthChallengeSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Default 10 minutes
  }
  next();
});

/**
 * Prevent exposing sensitive data in JSON
 */
reauthChallengeSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.otpHash; // Never expose hash
  return obj;
};

const ReauthChallenge = mongoose.model('ReauthChallenge', reauthChallengeSchema);

module.exports = ReauthChallenge;
