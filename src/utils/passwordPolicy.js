/**
 * Password Policy Validator
 *
 * Enforces strong password requirements:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - Optional: special characters
 * - Prevents common passwords
 * - Prevents user info in password
 *
 * Security compliance: OWASP, NIST 800-63B guidelines
 */

// Common passwords list (top 100 most common)
const COMMON_PASSWORDS = new Set([
    'password', 'password1', 'password123', '123456', '12345678', '123456789',
    'qwerty', 'abc123', 'monkey', '1234567', 'letmein', 'trustno1',
    'dragon', 'baseball', 'iloveyou', 'master', 'sunshine', 'ashley',
    'football', 'shadow', 'michael', 'ninja', 'mustang', 'password1!',
    'admin', 'admin123', 'welcome', 'welcome1', 'p@ssword', 'p@ssw0rd',
    'pass123', 'pass1234', 'password!', 'qwerty123', 'qwerty1', '123qwe',
    'zaq12wsx', 'zaq1zaq1', 'login', 'princess', 'starwars', 'superman',
    'hello123', 'charlie', 'donald', 'qwertyuiop', '654321', '7777777',
    '111111', '000000', '121212', 'passw0rd', 'p@ss123', 'test123',
    'test1234', 'testing', 'guest', 'guest123', 'root', 'toor',
    'changeme', 'default', 'secret', 'secret123', 'user', 'user123',
    '1q2w3e4r', '1qaz2wsx', 'zxcvbnm', 'asdfghjk', 'qazwsx', 'abcd1234',
    // Arabic transliterated common passwords
    '123456789a', 'a123456', 'aa123456', 'aaa111', 'password2023', 'password2024',
]);

// Password policy configuration
const PASSWORD_POLICY = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false, // Recommended but not required per NIST
    preventCommonPasswords: true,
    preventUserInfoInPassword: true,
    historyCount: 5, // Number of previous passwords to check (requires implementation in user model)
};

/**
 * Validate password against policy
 * @param {string} password - The password to validate
 * @param {Object} userInfo - Optional user info to check against (email, username, firstName, lastName)
 * @returns {{valid: boolean, errors: string[], errorsAr: string[]}}
 */
function validatePassword(password, userInfo = {}) {
    const errors = [];
    const errorsAr = [];

    // Check if password exists
    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
        errorsAr.push('كلمة المرور مطلوبة');
        return { valid: false, errors, errorsAr };
    }

    // Check minimum length
    if (password.length < PASSWORD_POLICY.minLength) {
        errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
        errorsAr.push(`كلمة المرور يجب أن تكون ${PASSWORD_POLICY.minLength} أحرف على الأقل`);
    }

    // Check maximum length
    if (password.length > PASSWORD_POLICY.maxLength) {
        errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
        errorsAr.push(`كلمة المرور يجب ألا تتجاوز ${PASSWORD_POLICY.maxLength} حرف`);
    }

    // Check uppercase requirement
    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
        errorsAr.push('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
    }

    // Check lowercase requirement
    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
        errorsAr.push('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
    }

    // Check number requirement
    if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
        errorsAr.push('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
    }

    // Check special character requirement (optional)
    if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
        errorsAr.push('كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل');
    }

    // Check against common passwords
    if (PASSWORD_POLICY.preventCommonPasswords) {
        const lowerPassword = password.toLowerCase();
        if (COMMON_PASSWORDS.has(lowerPassword)) {
            errors.push('Password is too common. Please choose a stronger password');
            errorsAr.push('كلمة المرور شائعة جداً. الرجاء اختيار كلمة مرور أقوى');
        }
    }

    // Check if password contains user info
    if (PASSWORD_POLICY.preventUserInfoInPassword && userInfo) {
        const lowerPassword = password.toLowerCase();
        const userFields = [
            userInfo.email?.split('@')[0],
            userInfo.username,
            userInfo.firstName,
            userInfo.lastName,
            userInfo.phone,
        ].filter(Boolean).map(f => f.toLowerCase());

        for (const field of userFields) {
            if (field && field.length >= 3 && lowerPassword.includes(field)) {
                errors.push('Password should not contain your personal information');
                errorsAr.push('كلمة المرور يجب ألا تحتوي على معلوماتك الشخصية');
                break;
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        errorsAr,
    };
}

/**
 * Calculate password strength (0-100)
 * @param {string} password - The password to check
 * @returns {{score: number, strength: string, strengthAr: string}}
 */
function getPasswordStrength(password) {
    if (!password) {
        return { score: 0, strength: 'none', strengthAr: 'لا شيء' };
    }

    let score = 0;

    // Length scoring
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;

    // Bonus for mixed characters
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 8) score += 10;

    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/^[a-zA-Z]+$/.test(password)) score -= 10; // Only letters
    if (/^[0-9]+$/.test(password)) score -= 20; // Only numbers
    if (/^(123|abc|qwe|asd)/i.test(password)) score -= 15; // Sequential patterns

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine strength label
    let strength, strengthAr;
    if (score < 25) {
        strength = 'weak';
        strengthAr = 'ضعيفة';
    } else if (score < 50) {
        strength = 'fair';
        strengthAr = 'مقبولة';
    } else if (score < 75) {
        strength = 'good';
        strengthAr = 'جيدة';
    } else {
        strength = 'strong';
        strengthAr = 'قوية';
    }

    return { score, strength, strengthAr };
}

/**
 * Generate a secure random password
 * @param {number} length - Password length (default 16)
 * @returns {string} - Generated password
 */
function generateSecurePassword(length = 16) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}';
    const all = lowercase + uppercase + numbers + special;

    let password = '';

    // Ensure at least one of each required type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if user's password needs rotation based on age
 * @param {Object} user - User document with passwordChangedAt field
 * @param {number} maxAgeDays - Maximum password age in days (default: 90)
 * @returns {{needsRotation: boolean, daysOld: number, daysRemaining: number}}
 */
function checkPasswordAge(user, maxAgeDays = 90) {
    if (!user.passwordChangedAt) {
        // No password change date, assume needs rotation
        return {
            needsRotation: true,
            daysOld: maxAgeDays + 1,
            daysRemaining: 0,
            expiresAt: null
        };
    }

    const passwordDate = new Date(user.passwordChangedAt);
    const now = new Date();
    const ageInMs = now - passwordDate;
    const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, maxAgeDays - ageInDays);
    const needsRotation = ageInDays >= maxAgeDays;

    const expiresAt = new Date(passwordDate);
    expiresAt.setDate(expiresAt.getDate() + maxAgeDays);

    return {
        needsRotation,
        daysOld: ageInDays,
        daysRemaining,
        expiresAt
    };
}

/**
 * Check if new password matches any in user's password history
 * @param {string} userId - User ID
 * @param {string} newPassword - New password to check (plain text)
 * @param {number} historyCount - Number of previous passwords to check (default: 12)
 * @returns {Promise<{isReused: boolean, message: string}>}
 */
async function checkPasswordHistory(userId, newPassword, historyCount = 12) {
    const bcrypt = require('bcrypt');
    const PasswordHistory = require('../models/passwordHistory.model');

    if (!historyCount || historyCount === 0) {
        return { isReused: false, message: 'Password history check disabled' };
    }

    // Get user's password history (most recent first)
    const history = await PasswordHistory.find({ userId })
        .sort({ createdAt: -1 })
        .limit(historyCount)
        .lean();

    if (!history || history.length === 0) {
        return { isReused: false, message: 'No password history found' };
    }

    // Check if new password matches any previous password
    for (const record of history) {
        const matches = await bcrypt.compare(newPassword, record.passwordHash);
        if (matches) {
            return {
                isReused: true,
                message: `Password was previously used. Please choose a password you haven't used in your last ${historyCount} passwords.`,
                messageAr: `تم استخدام كلمة المرور هذه سابقاً. الرجاء اختيار كلمة مرور لم تستخدمها في آخر ${historyCount} كلمة مرور.`
            };
        }
    }

    return {
        isReused: false,
        message: 'Password not found in history'
    };
}

/**
 * Enforce complete password policy including validation, strength, history, and breach check
 * @param {string} password - Password to check
 * @param {Object} user - User object with email, username, etc.
 * @param {Object} options - Policy options
 * @returns {Promise<{valid: boolean, errors: string[], errorsAr: string[], strength: Object, breachCheck?: Object}>}
 */
async function enforcePasswordPolicy(password, user, options = {}) {
    const {
        checkHistory = true,
        historyCount = 12,
        minStrengthScore = 50,
        checkBreach = true
    } = options;

    const errors = [];
    const errorsAr = [];

    // 1. Basic validation
    const validation = validatePassword(password, {
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone
    });

    if (!validation.valid) {
        errors.push(...validation.errors);
        errorsAr.push(...validation.errorsAr);
    }

    // 2. Check password strength
    const strength = getPasswordStrength(password);
    if (strength.score < minStrengthScore) {
        errors.push(`Password is too weak (score: ${strength.score}/100). Please choose a stronger password.`);
        errorsAr.push(`كلمة المرور ضعيفة جداً (النتيجة: ${strength.score}/100). الرجاء اختيار كلمة مرور أقوى.`);
    }

    // 3. Check password history (if enabled and user has ID)
    if (checkHistory && user._id) {
        const historyCheck = await checkPasswordHistory(user._id, password, historyCount);
        if (historyCheck.isReused) {
            errors.push(historyCheck.message);
            errorsAr.push(historyCheck.messageAr);
        }
    }

    // 4. Check if password has been breached (HaveIBeenPwned)
    let breachCheck = null;
    if (checkBreach) {
        try {
            const { checkPasswordBreach } = require('../services/passwordBreach.service');
            breachCheck = await checkPasswordBreach(password);

            // Only reject if password is breached AND the API check succeeded
            // If API failed (error: true), we allow the password (graceful degradation)
            if (breachCheck.breached && !breachCheck.error) {
                errors.push(`This password has been found in ${breachCheck.count.toLocaleString()} data breaches. Please choose a different password for your security.`);
                errorsAr.push(`تم العثور على كلمة المرور هذه في ${breachCheck.count.toLocaleString()} تسريب بيانات. الرجاء اختيار كلمة مرور مختلفة لحمايتك.`);
            }
        } catch (error) {
            // Graceful degradation - if breach check service fails, log and continue
            const logger = require('../utils/logger');
            logger.warn('Password breach check failed in enforcePasswordPolicy', {
                error: error.message
            });
            breachCheck = {
                breached: false,
                count: 0,
                error: true,
                errorMessage: error.message
            };
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        errorsAr,
        strength,
        breachCheck
    };
}

/**
 * Get password strength score (0-100)
 * @param {string} password - Password to check
 * @returns {number} - Score from 0 to 100
 */
function getPasswordStrengthScore(password) {
    const strength = getPasswordStrength(password);
    return strength.score;
}

/**
 * Check if password has been breached (standalone function for registration/reset)
 * @param {string} password - Password to check
 * @returns {Promise<{breached: boolean, count: number, error: boolean}>}
 */
async function checkPasswordBreach(password) {
    try {
        const { checkPasswordBreach } = require('../services/passwordBreach.service');
        return await checkPasswordBreach(password);
    } catch (error) {
        // Graceful degradation
        const logger = require('../utils/logger');
        logger.warn('Password breach check failed', { error: error.message });
        return {
            breached: false,
            count: 0,
            error: true,
            errorMessage: error.message
        };
    }
}

module.exports = {
    validatePassword,
    getPasswordStrength,
    getPasswordStrengthScore,
    generateSecurePassword,
    checkPasswordAge,
    checkPasswordHistory,
    checkPasswordBreach,
    enforcePasswordPolicy,
    PASSWORD_POLICY,
};
