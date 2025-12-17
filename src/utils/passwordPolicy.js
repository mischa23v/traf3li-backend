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

module.exports = {
    validatePassword,
    getPasswordStrength,
    generateSecurePassword,
    PASSWORD_POLICY,
};
