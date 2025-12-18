/**
 * Account Lockout Service
 *
 * Implements account lockout policy to prevent brute force attacks:
 * - Tracks failed login attempts per email/IP
 * - Locks account after 5 failed attempts
 * - Auto-unlocks after 15 minutes
 * - Resets counter after 30 minutes of no failed attempts
 *
 * Security compliance: Nafath, DocuSign, OWASP best practices
 */

const mongoose = require('mongoose');

// In-memory store for failed attempts (for single-instance deployments)
// For production multi-instance, use Redis or MongoDB
const failedAttempts = new Map();

// Lockout policy configuration
const LOCKOUT_POLICY = {
    maxAttempts: 5,                    // Lock after 5 failed attempts
    lockoutDuration: 15 * 60 * 1000,   // 15 minutes lockout
    attemptWindow: 30 * 60 * 1000,     // Reset attempts after 30 minutes
    cleanupInterval: 5 * 60 * 1000,    // Clean old entries every 5 minutes
};

// MongoDB model for persistent storage (optional, for multi-instance)
let FailedLoginAttempt;
try {
    FailedLoginAttempt = mongoose.model('FailedLoginAttempt');
} catch {
    const failedLoginSchema = new mongoose.Schema({
        identifier: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['email', 'ip'],
            required: true,
        },
        attempts: {
            type: Number,
            default: 1,
        },
        lastAttempt: {
            type: Date,
            default: Date.now,
        },
        lockedUntil: {
            type: Date,
            default: null,
        },
        ipAddress: String,
        userAgent: String,
    }, {
        timestamps: true,
    });

    // TTL index: auto-delete records after 24 hours
    failedLoginSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 86400 });
    failedLoginSchema.index({ identifier: 1, type: 1 }, { unique: true });

    FailedLoginAttempt = mongoose.model('FailedLoginAttempt', failedLoginSchema);
}

/**
 * Check if an account is locked
 * @param {string} email - User email
 * @param {string} ip - Request IP address
 * @returns {Promise<{locked: boolean, remainingTime?: number, message?: string}>}
 */
async function isAccountLocked(email, ip) {
    try {
        const normalizedEmail = email?.toLowerCase();

        // PERF: Run email and IP checks in parallel for faster response
        const checks = [];

        if (normalizedEmail) {
            checks.push(checkLockStatus(normalizedEmail, 'email'));
        }
        if (ip) {
            checks.push(checkLockStatus(ip, 'ip'));
        }

        if (checks.length === 0) {
            return { locked: false };
        }

        const results = await Promise.all(checks);

        // Return first locked result (email takes priority)
        for (const result of results) {
            if (result.locked) {
                return result;
            }
        }

        return { locked: false };
    } catch (error) {
        console.error('Account lockout check error:', error.message);
        // Fail open - don't lock users out due to system errors
        return { locked: false };
    }
}

/**
 * Check lock status for a specific identifier
 * @private
 */
async function checkLockStatus(identifier, type) {
    try {
        const record = await FailedLoginAttempt.findOne({ identifier, type });

        if (!record) {
            return { locked: false };
        }

        // Check if currently locked
        if (record.lockedUntil && record.lockedUntil > new Date()) {
            const remainingTime = Math.ceil((record.lockedUntil - new Date()) / 1000 / 60);
            return {
                locked: true,
                remainingTime,
                message: `الحساب مقفل مؤقتاً. حاول مرة أخرى بعد ${remainingTime} دقيقة`,
                messageEn: `Account temporarily locked. Try again in ${remainingTime} minutes`,
            };
        }

        // Check if attempt window has passed (reset counter)
        if (record.lastAttempt < new Date(Date.now() - LOCKOUT_POLICY.attemptWindow)) {
            // Reset the record
            await FailedLoginAttempt.deleteOne({ identifier, type });
            return { locked: false };
        }

        return { locked: false, attempts: record.attempts };
    } catch (error) {
        console.error('Check lock status error:', error.message);
        return { locked: false };
    }
}

/**
 * Record a failed login attempt
 * @param {string} email - User email
 * @param {string} ip - Request IP address
 * @param {string} userAgent - Request user agent
 * @returns {Promise<{locked: boolean, attemptsRemaining?: number}>}
 */
async function recordFailedAttempt(email, ip, userAgent = '') {
    try {
        const normalizedEmail = email?.toLowerCase();
        const results = [];

        // Record for email
        if (normalizedEmail) {
            const emailResult = await incrementAttempt(normalizedEmail, 'email', ip, userAgent);
            results.push(emailResult);
        }

        // Record for IP (helps detect distributed attacks)
        if (ip) {
            const ipResult = await incrementAttempt(ip, 'ip', ip, userAgent);
            results.push(ipResult);
        }

        // Return the most restrictive result
        const lockedResult = results.find(r => r.locked);
        if (lockedResult) {
            return lockedResult;
        }

        // Return lowest remaining attempts
        const lowestRemaining = Math.min(...results.map(r => r.attemptsRemaining || LOCKOUT_POLICY.maxAttempts));
        return {
            locked: false,
            attemptsRemaining: lowestRemaining,
        };
    } catch (error) {
        console.error('Record failed attempt error:', error.message);
        return { locked: false };
    }
}

/**
 * Increment attempt counter for an identifier
 * @private
 */
async function incrementAttempt(identifier, type, ip, userAgent) {
    try {
        const record = await FailedLoginAttempt.findOneAndUpdate(
            { identifier, type },
            {
                $inc: { attempts: 1 },
                $set: {
                    lastAttempt: new Date(),
                    ipAddress: ip,
                    userAgent: userAgent,
                },
                $setOnInsert: {
                    identifier,
                    type,
                },
            },
            { upsert: true, new: true }
        );

        // Check if should lock
        if (record.attempts >= LOCKOUT_POLICY.maxAttempts) {
            const lockedUntil = new Date(Date.now() + LOCKOUT_POLICY.lockoutDuration);
            await FailedLoginAttempt.updateOne(
                { identifier, type },
                { $set: { lockedUntil } }
            );

            const remainingTime = Math.ceil(LOCKOUT_POLICY.lockoutDuration / 1000 / 60);
            return {
                locked: true,
                remainingTime,
                message: `تم قفل الحساب بعد ${LOCKOUT_POLICY.maxAttempts} محاولات فاشلة. حاول بعد ${remainingTime} دقيقة`,
                messageEn: `Account locked after ${LOCKOUT_POLICY.maxAttempts} failed attempts. Try again in ${remainingTime} minutes`,
            };
        }

        return {
            locked: false,
            attemptsRemaining: LOCKOUT_POLICY.maxAttempts - record.attempts,
        };
    } catch (error) {
        console.error('Increment attempt error:', error.message);
        return { locked: false, attemptsRemaining: LOCKOUT_POLICY.maxAttempts };
    }
}

/**
 * Clear failed attempts after successful login
 * @param {string} email - User email
 * @param {string} ip - Request IP address
 */
async function clearFailedAttempts(email, ip) {
    try {
        const normalizedEmail = email?.toLowerCase();

        const deletePromises = [];

        if (normalizedEmail) {
            deletePromises.push(
                FailedLoginAttempt.deleteOne({ identifier: normalizedEmail, type: 'email' })
            );
        }

        // Don't clear IP-based attempts on successful login
        // This prevents attackers from using successful logins to reset IP counters

        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Clear failed attempts error:', error.message);
    }
}

/**
 * Get lockout status for admin/monitoring
 * @param {string} email - User email
 * @returns {Promise<Object>}
 */
async function getLockoutStatus(email) {
    try {
        const normalizedEmail = email?.toLowerCase();
        const record = await FailedLoginAttempt.findOne({
            identifier: normalizedEmail,
            type: 'email'
        });

        if (!record) {
            return {
                attempts: 0,
                locked: false,
                maxAttempts: LOCKOUT_POLICY.maxAttempts,
            };
        }

        const isLocked = record.lockedUntil && record.lockedUntil > new Date();
        const remainingTime = isLocked
            ? Math.ceil((record.lockedUntil - new Date()) / 1000 / 60)
            : 0;

        return {
            attempts: record.attempts,
            locked: isLocked,
            lockedUntil: record.lockedUntil,
            remainingTime,
            lastAttempt: record.lastAttempt,
            maxAttempts: LOCKOUT_POLICY.maxAttempts,
        };
    } catch (error) {
        console.error('Get lockout status error:', error.message);
        return { attempts: 0, locked: false, maxAttempts: LOCKOUT_POLICY.maxAttempts };
    }
}

/**
 * Manually unlock an account (admin function)
 * @param {string} email - User email
 */
async function unlockAccount(email) {
    try {
        const normalizedEmail = email?.toLowerCase();
        await FailedLoginAttempt.deleteOne({ identifier: normalizedEmail, type: 'email' });
        return { success: true, message: 'Account unlocked successfully' };
    } catch (error) {
        console.error('Unlock account error:', error.message);
        return { success: false, message: error.message };
    }
}

module.exports = {
    isAccountLocked,
    recordFailedAttempt,
    clearFailedAttempts,
    getLockoutStatus,
    unlockAccount,
    LOCKOUT_POLICY,
};
