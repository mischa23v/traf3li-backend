# Gold Standard Email Verification System - Design Document

## Overview

Technical design for implementing the Gold Standard Email Verification System based on approved requirements.

**Requirements Document:** `.specs/email-verification-gold-standard/requirements.md`
**Target Score:** 35/100 → 95/100

---

## 📋 Impact Analysis

### Files to CREATE (New)
| File | Purpose | Est. Lines |
|------|---------|------------|
| None | All functionality added to existing files | - |

### Files to MODIFY (Existing)
| File | What Changes | Lines Affected | Risk |
|------|--------------|----------------|------|
| `src/services/emailVerification.service.js` | Direct email send, IP logging, token hashing | ~80 lines | Medium |
| `src/services/notificationDelivery.service.js` | Add `sendVerificationEmail()` method | ~60 lines | Low |
| `src/models/emailVerification.model.js` | Add tokenHash, security fields | ~50 lines | Medium |
| `src/controllers/auth.controller.js` | Public resend endpoint, auto-resend on login | ~100 lines | High |
| `src/routes/auth.route.js` | Add public route | ~5 lines | Low |
| `src/utils/securityUtils.js` | Add `hashToken()`, `verifyTokenHash()` | ~40 lines | Low |

### Files NOT Touched (Explicitly Safe)
| File | Why Safe |
|------|----------|
| `src/services/email.service.js` | Queue-based service, not used for verification |
| `src/middlewares/authenticatedApi.middleware.js` | No changes needed |
| `src/models/user.model.js` | Already has `isEmailVerified`, `emailVerifiedAt` |

### Dependency Check
| Dependency | Status | Notes |
|------------|--------|-------|
| EmailVerification model | ✅ Exists | Needs modification for tokenHash |
| NotificationDeliveryService | ✅ Exists | Add new method |
| Resend API | ✅ Configured | Already working for OTP |
| Redis (rate limiting) | ⚠️ Optional | Fallback to in-memory if unavailable |

---

## ⚠️ Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Login flow changes break auth | Medium | HIGH | Extensive testing, backwards compatible |
| Token format migration fails | Low | Medium | Support both formats during transition |
| Rate limiting blocks legitimate users | Low | Medium | Generous limits (3/email/hour) |
| Direct email send fails silently | Low | Medium | Log all send attempts, don't fail registration |

### Rollback Plan
If something breaks:
1. All changes in separate commits by feature
2. Revert individual features without affecting others
3. Key files to restore: `auth.controller.js`, `emailVerification.service.js`

---

## Architecture

### Data Flow - Registration
```
Registration Request
       ↓
auth.controller.js (register)
       ↓
User.create() → Success
       ↓
emailVerification.service.js (sendVerificationEmail)
       ↓
notificationDelivery.service.js (sendVerificationEmail) ← DIRECT RESEND API
       ↓
QueueService.logAudit() ← NON-BLOCKING
       ↓
Return registration success (regardless of email result)
```

### Data Flow - Public Resend
```
POST /auth/request-verification-email
       ↓
Rate Limit Check (IP + email)
       ↓
Find User (timing-safe delay regardless of result)
       ↓
EmailVerification.createToken() → HASH before storage
       ↓
notificationDelivery.service.js (sendVerificationEmail)
       ↓
Return SAME response (enumeration prevention)
```

### Data Flow - Verification
```
POST /auth/verify-email
       ↓
Brute-force Check (IP + token prefix)
       ↓
Hash input token → Compare to stored tokenHash
       ↓
crypto.timingSafeEqual() comparison
       ↓
Update User.isEmailVerified = true
       ↓
QueueService.logAudit() ← NON-BLOCKING
       ↓
Return success with user data
```

---

## Data Model Changes

### EmailVerification Schema (MODIFIED)

```javascript
// src/models/emailVerification.model.js

const emailVerificationSchema = new mongoose.Schema({
    // NEW: Store hash instead of plaintext
    tokenHash: {
        type: String,
        required: function() { return !this.token; }, // Required if no legacy token
        unique: true,
        sparse: true,
        index: true
    },
    // KEEP: Backwards compatibility during 30-day migration
    token: {
        type: String,
        index: true,
        sparse: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    usedAt: Date,
    sentCount: {
        type: Number,
        default: 1
    },
    lastSentAt: {
        type: Date,
        default: Date.now
    },
    // NEW: Security tracking
    createdFromIP: String,
    createdUserAgent: String,
    verifiedFromIP: String,
    verifiedUserAgent: String,
    // NEW: Brute force protection
    failedAttempts: {
        type: Number,
        default: 0
    },
    lastFailedAttempt: Date
}, {
    timestamps: true
});
```

### New Static Methods

```javascript
// Create token with hash
emailVerificationSchema.statics.createTokenSecure = async function(userId, email, ipAddress, userAgent) {
    const crypto = require('crypto');
    const { hashVerificationToken } = require('../utils/securityUtils');

    // Generate raw token (returned to user)
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Store HASH only
    const tokenHash = hashVerificationToken(rawToken);

    const verification = await this.create({
        tokenHash,
        userId,
        email: email.toLowerCase(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        createdFromIP: ipAddress,
        createdUserAgent: userAgent
    });

    // Return raw token (to send in email) + verification doc
    return { rawToken, verification };
};

// Verify with timing-safe comparison
emailVerificationSchema.statics.verifyTokenSecure = async function(rawToken, ipAddress, userAgent) {
    const { hashVerificationToken, timingSafeTokenCompare } = require('../utils/securityUtils');

    const tokenHash = hashVerificationToken(rawToken);

    // Find by hash (new format) or legacy token
    const verification = await this.findOne({
        $or: [
            { tokenHash, isUsed: false, expiresAt: { $gt: new Date() } },
            { token: rawToken, isUsed: false, expiresAt: { $gt: new Date() } } // Legacy
        ]
    });

    if (!verification) {
        return { valid: false, error: 'TOKEN_INVALID_OR_EXPIRED' };
    }

    // Check brute force
    if (verification.failedAttempts >= 5) {
        return { valid: false, error: 'TOKEN_LOCKED' };
    }

    // Timing-safe comparison for new tokens
    if (verification.tokenHash) {
        const isValid = timingSafeTokenCompare(tokenHash, verification.tokenHash);
        if (!isValid) {
            verification.failedAttempts += 1;
            verification.lastFailedAttempt = new Date();
            await verification.save();
            return { valid: false, error: 'TOKEN_INVALID_OR_EXPIRED' };
        }
    }

    // Mark as used
    verification.isUsed = true;
    verification.usedAt = new Date();
    verification.verifiedFromIP = ipAddress;
    verification.verifiedUserAgent = userAgent;
    await verification.save();

    return { valid: true, userId: verification.userId, email: verification.email };
};

// Check rate limit for resend
emailVerificationSchema.statics.checkResendRateLimit = async function(email, ipAddress) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Count recent tokens for this email
    const emailCount = await this.countDocuments({
        email: email.toLowerCase(),
        createdAt: { $gte: hourAgo }
    });

    if (emailCount >= 3) {
        return { limited: true, reason: 'EMAIL_LIMIT', waitMinutes: 60 };
    }

    // Count recent tokens from this IP
    const ipCount = await this.countDocuments({
        createdFromIP: ipAddress,
        createdAt: { $gte: hourAgo }
    });

    if (ipCount >= 10) {
        return { limited: true, reason: 'IP_LIMIT', waitMinutes: 60 };
    }

    return { limited: false };
};
```

---

## Security Utilities

### New Functions in securityUtils.js

```javascript
// src/utils/securityUtils.js

const crypto = require('crypto');

/**
 * Hash a verification token for secure storage
 * Uses SHA-256 (same as password reset tokens in enterprise apps)
 * @param {string} token - Raw token
 * @returns {string} - Hashed token
 */
const hashVerificationToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Timing-safe comparison for token hashes
 * Prevents timing attacks that could reveal token validity
 * @param {string} a - First hash
 * @param {string} b - Second hash
 * @returns {boolean} - True if equal
 */
const timingSafeTokenCompare = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    // Both must be same length for timingSafeEqual
    if (a.length !== b.length) {
        // Still do comparison to prevent timing leak
        crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
        return false;
    }

    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

/**
 * Generate random timing delay for enumeration prevention
 * @returns {Promise<void>}
 */
const randomTimingDelay = async () => {
    const delay = crypto.randomInt(150, 401); // 150-400ms
    return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Mask email for display (prevents full email exposure)
 * m***@gmail.com
 * @param {string} email
 * @returns {string}
 */
const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '***@***.***';
    const [local, domain] = email.split('@');
    const maskedLocal = local.charAt(0) + '***';
    return `${maskedLocal}@${domain}`;
};

module.exports = {
    // ... existing exports
    hashVerificationToken,
    timingSafeTokenCompare,
    randomTimingDelay,
    maskEmail
};
```

---

## NotificationDeliveryService Addition

### sendVerificationEmail Method

```javascript
// src/services/notificationDelivery.service.js

/**
 * Send Email Verification (DIRECT - bypasses queue)
 * Critical for registration flow - must not fail silently
 * @param {string} email - Recipient email
 * @param {string} userName - User's name
 * @param {string} verificationUrl - Full verification URL with token
 * @param {string} language - 'ar' or 'en'
 * @returns {Promise<Object>} - Send result
 */
static async sendVerificationEmail(email, userName, verificationUrl, language = 'ar') {
    if (!resend) {
        logger.error('❌ Resend not configured. Verification email NOT sent.');
        return {
            success: false,
            error: 'Email service not configured'
        };
    }

    try {
        const htmlContent = this.generateVerificationEmailHTML(userName, verificationUrl, language);

        const subject = language === 'ar'
            ? 'تفعيل حسابك في ترافعلي - Verify Your Email'
            : 'Verify Your Email - Traf3li';

        const { data, error } = await resend.emails.send({
            from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
            to: [email],
            subject,
            html: htmlContent,
        });

        if (error) {
            throw new Error(error.message);
        }

        logger.info(`✅ Verification email sent to ${email}: ${data.id}`);
        return {
            success: true,
            messageId: data.id,
            email: email,
        };
    } catch (error) {
        logger.error('❌ Verification email error:', error.message);
        return {
            success: false,
            error: error.message,
            errorAr: 'فشل إرسال رابط التفعيل',
        };
    }
}

/**
 * Generate verification email HTML (bilingual)
 */
static generateVerificationEmailHTML(userName, verificationUrl, language = 'ar') {
    const isArabic = language === 'ar';
    const dir = isArabic ? 'rtl' : 'ltr';

    return `
    <!DOCTYPE html>
    <html dir="${dir}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isArabic ? 'تفعيل البريد الإلكتروني' : 'Email Verification'}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px;">
                    ${isArabic ? 'مرحباً بك في ترافعلي' : 'Welcome to Traf3li'}
                </h1>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
                <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">
                    ${isArabic ? `مرحباً ${userName}،` : `Hello ${userName},`}
                </p>

                <p style="font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 30px;">
                    ${isArabic
                        ? 'شكراً لتسجيلك في ترافعلي. يرجى النقر على الزر أدناه لتفعيل حسابك:'
                        : 'Thank you for registering with Traf3li. Please click the button below to verify your account:'}
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                    <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600;">
                        ${isArabic ? 'تفعيل الحساب' : 'Verify Account'}
                    </a>
                </div>

                <!-- Expiry Warning -->
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 30px 0; border-radius: 4px;">
                    <p style="color: #92400e; margin: 0; font-size: 14px;">
                        <strong>⏰ ${isArabic ? 'تنبيه:' : 'Note:'}</strong>
                        ${isArabic
                            ? 'هذا الرابط صالح لمدة 24 ساعة فقط.'
                            : 'This link is valid for 24 hours only.'}
                    </p>
                </div>

                <!-- Alternative Link -->
                <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
                    ${isArabic
                        ? 'إذا لم يعمل الزر، انسخ والصق الرابط التالي:'
                        : 'If the button doesn\'t work, copy and paste this link:'}
                </p>
                <p style="font-size: 12px; color: #9ca3af; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                    ${verificationUrl}
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                    ${isArabic
                        ? 'إذا لم تقم بإنشاء هذا الحساب، يرجى تجاهل هذه الرسالة.'
                        : 'If you didn\'t create this account, please ignore this email.'}
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}
```

---

## Controller Implementation

### auth.controller.js Changes

```javascript
// NEW: Public resend endpoint (NO authentication required)
const requestVerificationEmailPublic = async (req, res) => {
    const { email } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    // Validate email format
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        // Still add delay to prevent timing attacks
        await randomTimingDelay();
        return res.status(200).json({
            success: true,
            message: 'If this email exists and needs verification, we\'ve sent a link.',
            messageAr: 'إذا كان هذا البريد موجوداً ويحتاج تفعيل، تم إرسال الرابط.'
        });
    }

    try {
        // Check rate limit
        const rateLimit = await EmailVerification.checkResendRateLimit(email, ipAddress);
        if (rateLimit.limited) {
            return res.status(429).json({
                success: false,
                code: 'RATE_LIMITED',
                message: 'Too many requests. Please wait before trying again.',
                messageAr: 'طلبات كثيرة. يرجى الانتظار قبل المحاولة مرة أخرى.',
                waitTime: rateLimit.waitMinutes * 60
            });
        }

        // Find user (bypass firmFilter for auth operations)
        const user = await User.findOne({ email: email.toLowerCase() })
            .setOptions({ bypassFirmFilter: true });

        // Add timing delay BEFORE responding (prevents enumeration via timing)
        await randomTimingDelay();

        // Only send if user exists and is unverified
        if (user && !user.isEmailVerified) {
            // Send verification email (fire-and-forget, don't await)
            (async () => {
                try {
                    const userName = `${user.firstName} ${user.lastName}`;
                    await EmailVerificationService.sendVerificationEmail(
                        user._id.toString(),
                        user.email,
                        userName,
                        'ar',
                        { ipAddress, userAgent }
                    );
                } catch (error) {
                    logger.error('Failed to send verification email (public resend)', {
                        error: error.message,
                        email: email.toLowerCase()
                    });
                }
            })();
        }

        // ALWAYS return same response (enumeration prevention)
        return res.status(200).json({
            success: true,
            message: 'If this email exists and needs verification, we\'ve sent a link.',
            messageAr: 'إذا كان هذا البريد موجوداً ويحتاج تفعيل، تم إرسال الرابط.'
        });

    } catch (error) {
        logger.error('Error in public verification resend:', error);
        // Still return success to prevent enumeration
        await randomTimingDelay();
        return res.status(200).json({
            success: true,
            message: 'If this email exists and needs verification, we\'ve sent a link.',
            messageAr: 'إذا كان هذا البريد موجوداً ويحتاج تفعيل، تم إرسال الرابط.'
        });
    }
};

// MODIFIED: Login - add auto-resend on EMAIL_NOT_VERIFIED
// In the existing login function, where EMAIL_NOT_VERIFIED is returned:
if (!user.isEmailVerified) {
    // ... existing enforcement logic ...

    // Auto-resend verification email (fire-and-forget)
    let verificationResent = false;
    (async () => {
        try {
            const rateLimit = await EmailVerification.checkResendRateLimit(user.email, ipAddress);
            if (!rateLimit.limited) {
                await EmailVerificationService.sendVerificationEmail(
                    user._id.toString(),
                    user.email,
                    `${user.firstName} ${user.lastName}`,
                    'ar',
                    { ipAddress, userAgent }
                );
                verificationResent = true;
            }
        } catch (error) {
            logger.error('Failed to auto-resend verification on login', { error: error.message });
        }
    })();

    // Wait briefly for resend status
    await new Promise(resolve => setTimeout(resolve, 100));

    return response.status(403).json({
        error: true,
        code: 'EMAIL_NOT_VERIFIED',
        message: 'يرجى تفعيل بريدك الإلكتروني للمتابعة',
        messageEn: 'Please verify your email to continue',
        email: maskEmail(user.email),
        verificationResent
    });
}

// MODIFIED: verifyEmail - add brute-force protection
const verifyEmail = async (req, res) => {
    const { token } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.split(',')[0];
    const userAgent = req.headers['user-agent'];

    if (!token) {
        await randomTimingDelay();
        return res.status(400).json({
            success: false,
            code: 'TOKEN_REQUIRED',
            message: 'Verification token is required',
            messageAr: 'رمز التفعيل مطلوب'
        });
    }

    try {
        // Check IP-based rate limit for verification attempts
        const ipAttempts = await getIPVerificationAttempts(ipAddress);
        if (ipAttempts >= 10) {
            return res.status(429).json({
                success: false,
                code: 'TOO_MANY_ATTEMPTS',
                message: 'Too many verification attempts. Please try again later.',
                messageAr: 'محاولات تحقق كثيرة. يرجى المحاولة لاحقاً.',
                waitTime: 3600
            });
        }

        // Verify token (with timing-safe comparison)
        const result = await EmailVerification.verifyTokenSecure(token, ipAddress, userAgent);

        if (!result.valid) {
            // Increment IP attempts
            await incrementIPVerificationAttempts(ipAddress);

            // Log failed attempt
            QueueService.logAudit({
                action: 'email_verification_failed',
                ipAddress,
                userAgent,
                error: result.error,
                tokenPrefix: token.substring(0, 8)
            });

            await randomTimingDelay();

            if (result.error === 'TOKEN_LOCKED') {
                return res.status(429).json({
                    success: false,
                    code: 'TOKEN_LOCKED',
                    message: 'This verification link has been locked. Please request a new one.',
                    messageAr: 'تم قفل رابط التفعيل هذا. يرجى طلب رابط جديد.'
                });
            }

            return res.status(400).json({
                success: false,
                code: result.error,
                message: 'Verification link is invalid or expired',
                messageAr: 'رابط التفعيل غير صالح أو منتهي الصلاحية'
            });
        }

        // Update user
        const user = await User.findOneAndUpdate(
            { _id: result.userId },
            {
                isEmailVerified: true,
                emailVerifiedAt: new Date()
            },
            { new: true, bypassFirmFilter: true }
        ).select('_id email username firstName lastName isEmailVerified emailVerifiedAt');

        if (!user) {
            return res.status(404).json({
                success: false,
                code: 'USER_NOT_FOUND',
                message: 'User not found',
                messageAr: 'المستخدم غير موجود'
            });
        }

        // Log success
        QueueService.logAudit({
            action: 'email_verification_success',
            userId: user._id,
            email: user.email,
            ipAddress,
            userAgent
        });

        logger.info(`Email verified successfully for user ${user._id} (${user.email})`);

        return res.status(200).json({
            success: true,
            message: 'Email verified successfully',
            messageAr: 'تم تفعيل البريد الإلكتروني بنجاح',
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                name: `${user.firstName} ${user.lastName}`,
                isEmailVerified: user.isEmailVerified,
                emailVerifiedAt: user.emailVerifiedAt
            }
        });

    } catch (error) {
        logger.error('Email verification error:', error);
        await randomTimingDelay();
        return res.status(500).json({
            success: false,
            code: 'VERIFICATION_ERROR',
            message: 'An error occurred during verification',
            messageAr: 'حدث خطأ أثناء التفعيل'
        });
    }
};
```

---

## Route Configuration

### auth.route.js Changes

```javascript
// Add to auth routes (PUBLIC - before authenticate middleware)

// ========== Email Verification (PUBLIC) ==========
// NEW: Public resend endpoint - no authentication required
app.post('/request-verification-email', publicRateLimiter, requestVerificationEmailPublic);

// Existing (already public)
app.post('/verify-email', publicRateLimiter, verifyEmail);

// Existing (authenticated)
app.post('/resend-verification', authenticate, authRateLimiter, resendVerificationEmail);
```

---

## EmailVerificationService Changes

### Updated sendVerificationEmail

```javascript
// src/services/emailVerification.service.js

static async sendVerificationEmail(userId, email, userName = '', language = 'ar', context = {}) {
    const { ipAddress, userAgent } = context;

    try {
        // Check if user exists
        const user = await User.findById(userId).setOptions({ bypassFirmFilter: true });
        if (!user) {
            throw new Error('User not found');
        }

        // Check if already verified
        if (user.isEmailVerified) {
            return {
                success: false,
                message: 'البريد الإلكتروني مُفعّل بالفعل',
                messageEn: 'Email already verified',
                code: 'ALREADY_VERIFIED'
            };
        }

        // Check for existing active token and rate limit
        let verification = await EmailVerification.findActiveByUserId(userId);

        if (verification) {
            if (!verification.canResend()) {
                const waitTime = Math.ceil((verification.lastSentAt.getTime() + 5 * 60 * 1000 - Date.now()) / 1000 / 60);
                return {
                    success: false,
                    message: `يرجى الانتظار ${waitTime} دقيقة قبل إعادة الإرسال`,
                    messageEn: `Please wait ${waitTime} minute(s) before resending`,
                    code: 'RATE_LIMITED',
                    waitTime
                };
            }

            // Update existing token send count
            verification.sentCount += 1;
            verification.lastSentAt = new Date();
            await verification.save();
        } else {
            // Create new verification token with HASH
            const result = await EmailVerification.createTokenSecure(
                userId,
                email,
                ipAddress,
                userAgent
            );
            verification = result.verification;
            verification._rawToken = result.rawToken; // Temp store for URL generation
        }

        // Generate verification URL
        const clientUrl = process.env.CLIENT_URL || process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com';
        const token = verification._rawToken || verification.token; // Support both new and legacy
        const verificationUrl = `${clientUrl}/verify-email?token=${token}`;

        // Send email DIRECTLY via NotificationDeliveryService (NO QUEUE)
        const emailResult = await NotificationDeliveryService.sendVerificationEmail(
            email,
            userName || `${user.firstName} ${user.lastName}`,
            verificationUrl,
            language
        );

        // Log the attempt (non-blocking)
        QueueService.logAudit({
            action: 'verification_email_sent',
            userId,
            email,
            success: emailResult.success,
            messageId: emailResult.messageId,
            ipAddress,
            userAgent
        });

        if (!emailResult.success) {
            logger.error(`Failed to send verification email to ${email}:`, emailResult.error);
            // Don't throw - registration should still succeed
            return {
                success: false,
                message: 'فشل إرسال رابط التفعيل',
                messageEn: 'Failed to send verification email',
                code: 'EMAIL_SEND_FAILED'
            };
        }

        logger.info(`Email verification sent to ${email} for user ${userId}`);

        return {
            success: true,
            message: 'تم إرسال رابط التفعيل إلى بريدك الإلكتروني',
            messageEn: 'Verification link sent to your email',
            expiresAt: verification.expiresAt
        };
    } catch (error) {
        logger.error('Failed to send verification email', { error: error.message, userId, email });
        // Don't throw - return failure status instead
        return {
            success: false,
            message: 'فشل إرسال رابط التفعيل',
            messageEn: 'Failed to send verification email',
            code: 'EMAIL_SEND_ERROR',
            error: error.message
        };
    }
}
```

---

## Requirement Traceability

| Requirement ID | EARS Requirement | Implementation |
|----------------|------------------|----------------|
| REQ-1.1 | WHEN user registers THE SYSTEM SHALL send verification email DIRECTLY | `NotificationDeliveryService.sendVerificationEmail()` bypasses queue |
| REQ-1.2 | WHEN email sending fails THE SYSTEM SHALL NOT fail registration | Try-catch with non-throwing return |
| REQ-2.1 | WHEN POST `/auth/request-verification-email` is called THE SYSTEM SHALL NOT require authentication | Route defined before `authenticate` middleware |
| REQ-2.3 | WHEN email doesn't exist THE SYSTEM SHALL return SAME success response | `randomTimingDelay()` + identical response |
| REQ-2.5 | WHEN rate limit exceeded THE SYSTEM SHALL return 429 | `checkResendRateLimit()` → 429 response |
| REQ-3.1 | WHEN token is created THE SYSTEM SHALL store SHA-256 hash | `createTokenSecure()` uses `hashVerificationToken()` |
| REQ-3.3 | WHEN comparing tokens THE SYSTEM SHALL use timing-safe comparison | `timingSafeTokenCompare()` |
| REQ-4.2 | WHEN 10 failed attempts per IP THE SYSTEM SHALL block | `getIPVerificationAttempts()` check |
| REQ-4.3 | WHEN 5 failed attempts per token THE SYSTEM SHALL invalidate | `failedAttempts >= 5` → TOKEN_LOCKED |
| REQ-5.1 | WHEN login returns 403 EMAIL_NOT_VERIFIED THE SYSTEM SHALL auto-send | Fire-and-forget in login handler |
| REQ-5.3 | WHEN auto-send succeeds THE SYSTEM SHALL include `verificationResent: true` | Added to 403 response |
| REQ-6.1 | WHEN verification email is sent THE SYSTEM SHALL log IP, user-agent | `QueueService.logAudit()` calls |

---

## Testing Strategy

### Unit Tests
- [ ] `hashVerificationToken()` produces consistent hash
- [ ] `timingSafeTokenCompare()` returns true for matching, false for non-matching
- [ ] `maskEmail()` properly masks emails
- [ ] `randomTimingDelay()` delays between 150-400ms

### Integration Tests
- [ ] Registration sends verification email (check logs)
- [ ] Public resend works without auth
- [ ] Same response for existing/non-existing emails
- [ ] Rate limiting blocks after 3 requests per email
- [ ] Token verification works with new hash format
- [ ] Brute-force protection blocks after 10 attempts
- [ ] Login auto-resends verification email

### Security Tests
- [ ] Timing attack: Response time same for valid/invalid emails
- [ ] Enumeration: Cannot distinguish existing vs non-existing emails
- [ ] Token not exposed in logs
- [ ] Hashed token in database (not plaintext)

---

## ✅ APPROVAL CHECKPOINT

**Technical Design Summary:**

1. **Direct Email Send**: Use `NotificationDeliveryService.sendVerificationEmail()` bypassing queue
2. **Public Resend**: New `/auth/request-verification-email` endpoint without auth
3. **Token Hashing**: SHA-256 hash with `crypto.timingSafeEqual()` comparison
4. **Brute-Force Protection**: 10 attempts per IP, 5 attempts per token
5. **Auto-Resend**: Fire-and-forget on login 403
6. **Audit Logging**: All events logged with IP via `QueueService.logAudit()`

**Does this technical design look correct? Any concerns about the approach?**

Once approved, run `/complete-phase` to create implementation tasks and start coding.
