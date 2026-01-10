/**
 * Security Utilities
 *
 * Central security utility functions for preventing common vulnerabilities:
 * - Mass Assignment Protection
 * - CSV Injection Prevention
 * - Log Injection Prevention
 * - Input Sanitization
 *
 * OWASP References:
 * - https://owasp.org/www-project-web-security-testing-guide/
 * - https://cheatsheetseries.owasp.org/
 */

// ============================================
// MASS ASSIGNMENT PROTECTION
// ============================================

/**
 * Filter object to only include allowed fields (allowlist approach)
 * Prevents mass assignment attacks where attackers try to set unauthorized fields
 *
 * @param {Object} source - Source object (e.g., req.body)
 * @param {string[]} allowedFields - Array of field names that are allowed
 * @returns {Object} - Filtered object with only allowed fields
 *
 * @example
 * // Only allow specific fields when updating user profile
 * const safeUpdate = pickAllowedFields(req.body, ['firstName', 'lastName', 'phone']);
 * await User.findByIdAndUpdate(userId, safeUpdate);
 */
const pickAllowedFields = (source, allowedFields) => {
    if (!source || typeof source !== 'object') {
        return {};
    }

    const result = {};
    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(source, field)) {
            result[field] = source[field];
        }
    }
    return result;
};

/**
 * Remove sensitive fields from object (blocklist approach)
 * Use allowlist (pickAllowedFields) when possible, this is a fallback
 *
 * @param {Object} source - Source object
 * @param {string[]} blockedFields - Array of field names to remove
 * @returns {Object} - Object without blocked fields
 *
 * @example
 * const safeData = omitBlockedFields(req.body, ['role', 'isAdmin', 'permissions']);
 */
const omitBlockedFields = (source, blockedFields) => {
    if (!source || typeof source !== 'object') {
        return {};
    }

    const result = { ...source };
    for (const field of blockedFields) {
        delete result[field];
    }
    return result;
};

/**
 * Pre-defined field lists for common operations
 */
const SENSITIVE_FIELDS = {
    // Fields that should NEVER be set via user input
    NEVER_ALLOW: [
        'role',
        'isAdmin',
        'isSuperAdmin',
        'permissions',
        'password',
        'passwordHash',
        'salt',
        'mfaSecret',
        'mfaBackupCodes',
        'emailVerified',
        'phoneVerified',
        'isActive',
        'isDeleted',
        'deletedAt',
        'createdBy',
        'updatedBy',
        'firmId',
        'organizationId',
        '_id',
        '__v'
    ],

    // Financial fields that need special validation
    FINANCIAL: [
        'amount',
        'totalAmount',
        'balanceDue',
        'amountPaid',
        'price',
        'cost',
        'rate',
        'salary',
        'bonus'
    ],

    // Audit fields managed by system
    AUDIT: [
        'createdAt',
        'updatedAt',
        'createdBy',
        'updatedBy',
        'history',
        'auditLog'
    ]
};

// ============================================
// CSV INJECTION PREVENTION
// ============================================

/**
 * CSV injection dangerous characters
 * These characters at the start of a cell can trigger formula execution
 * when opened in spreadsheet software
 */
const CSV_DANGEROUS_CHARS = ['=', '+', '-', '@', '\t', '\r', '\n'];

/**
 * Sanitize a value for safe CSV export
 * Prevents CSV injection (formula injection) attacks
 *
 * @param {any} value - Value to sanitize
 * @returns {string} - Safe string for CSV
 *
 * @example
 * const safeName = sanitizeForCSV(user.name);
 * // "=HYPERLINK("http://evil.com")" becomes "'=HYPERLINK("http://evil.com")"
 */
const sanitizeForCSV = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    const stringValue = String(value);

    // Check if value starts with a dangerous character
    const firstChar = stringValue.charAt(0);
    if (CSV_DANGEROUS_CHARS.includes(firstChar)) {
        // Prefix with single quote to prevent formula execution
        return `'${stringValue}`;
    }

    // Also escape any embedded dangerous characters after newlines
    return stringValue.replace(/[\r\n]+([=+\-@\t])/g, "\n'$1");
};

/**
 * Sanitize an entire row for CSV export
 *
 * @param {Object|Array} row - Row data
 * @returns {Object|Array} - Sanitized row
 */
const sanitizeRowForCSV = (row) => {
    if (Array.isArray(row)) {
        return row.map(sanitizeForCSV);
    }

    if (typeof row === 'object' && row !== null) {
        const result = {};
        for (const [key, value] of Object.entries(row)) {
            result[key] = sanitizeForCSV(value);
        }
        return result;
    }

    return sanitizeForCSV(row);
};

/**
 * Sanitize data for CSV export with proper quoting
 *
 * @param {Array<Object>} data - Array of row objects
 * @param {string[]} columns - Column names to include
 * @returns {string} - Safe CSV string
 */
const toSafeCSV = (data, columns) => {
    const escapeCSVField = (field) => {
        const sanitized = sanitizeForCSV(field);
        // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
        if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
            return `"${sanitized.replace(/"/g, '""')}"`;
        }
        return sanitized;
    };

    const header = columns.map(escapeCSVField).join(',');
    const rows = data.map(row =>
        columns.map(col => escapeCSVField(row[col])).join(',')
    );

    return [header, ...rows].join('\n');
};

// ============================================
// LOG INJECTION PREVENTION
// ============================================

/**
 * Characters that could be used for log injection attacks
 */
const LOG_DANGEROUS_PATTERNS = [
    /[\r\n]/g,           // Newlines (log forging)
    /\x1b\[[0-9;]*[mGKH]/g, // ANSI escape codes
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/g  // Control characters
];

/**
 * Sanitize value for safe logging
 * Prevents log injection/forging attacks
 *
 * @param {any} value - Value to sanitize for logging
 * @param {number} maxLength - Maximum length (default 1000)
 * @returns {string} - Safe string for logging
 *
 * @example
 * logger.info(`User logged in: ${sanitizeForLog(username)}`);
 */
const sanitizeForLog = (value, maxLength = 1000) => {
    if (value === null || value === undefined) {
        return '[null]';
    }

    let stringValue;
    if (typeof value === 'object') {
        try {
            stringValue = JSON.stringify(value);
        } catch {
            stringValue = '[Object - unable to stringify]';
        }
    } else {
        stringValue = String(value);
    }

    // Remove dangerous patterns
    let sanitized = stringValue;
    for (const pattern of LOG_DANGEROUS_PATTERNS) {
        sanitized = sanitized.replace(pattern, ' ');
    }

    // Truncate if too long
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength) + '...[truncated]';
    }

    return sanitized;
};

/**
 * Create a safe logging wrapper
 *
 * @param {Object} logger - Logger instance (e.g., winston, console)
 * @returns {Object} - Safe logger wrapper
 */
const createSafeLogger = (logger) => {
    const safeMethods = {};

    ['log', 'info', 'warn', 'error', 'debug'].forEach(method => {
        if (typeof logger[method] === 'function') {
            safeMethods[method] = (...args) => {
                const sanitizedArgs = args.map(arg => {
                    if (typeof arg === 'string') {
                        return sanitizeForLog(arg);
                    }
                    return arg;
                });
                logger[method](...sanitizedArgs);
            };
        }
    });

    return safeMethods;
};

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize string input - removes null bytes and excessive whitespace
 *
 * @param {string} input - Input string
 * @returns {string} - Sanitized string
 */
const sanitizeString = (input) => {
    if (typeof input !== 'string') {
        return '';
    }

    return input
        .replace(/\0/g, '')           // Remove null bytes
        .replace(/^\s+|\s+$/g, '')    // Trim whitespace
        .replace(/\s{2,}/g, ' ');     // Collapse multiple spaces
};

/**
 * Sanitize MongoDB ObjectId string
 * Prevents NoSQL injection through invalid ObjectIds
 *
 * @param {string} id - ObjectId string
 * @returns {string|null} - Valid ObjectId string or null
 */
const sanitizeObjectId = (id) => {
    if (!id || typeof id !== 'string') {
        return null;
    }

    // MongoDB ObjectId is a 24-character hex string
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    return objectIdRegex.test(id) ? id : null;
};

/**
 * Sanitize email for safe use
 *
 * @param {string} email - Email address
 * @returns {string} - Sanitized email
 */
const sanitizeEmail = (email) => {
    if (typeof email !== 'string') {
        return '';
    }

    return email
        .toLowerCase()
        .trim()
        .replace(/[<>'"]/g, '');  // Remove characters that could break HTML/SQL
};

/**
 * Sanitize phone number
 *
 * @param {string} phone - Phone number
 * @returns {string} - Sanitized phone (digits and + only)
 */
const sanitizePhone = (phone) => {
    if (typeof phone !== 'string') {
        return '';
    }

    return phone.replace(/[^\d+]/g, '');
};

/**
 * Validate and sanitize pagination parameters
 * Prevents DoS attacks from unbounded limit/skip/page values
 *
 * @param {Object} params - Query parameters
 * @param {Object} options - Options with defaults
 * @returns {Object} - Safe pagination parameters
 *
 * @example
 * // Page-based pagination
 * const { page, limit, skip } = sanitizePagination(req.query);
 * const items = await Model.find({}).skip(skip).limit(limit);
 *
 * @example
 * // Skip-based pagination with custom limits
 * const { limit, skip } = sanitizePagination(req.query, { maxLimit: 50, defaultLimit: 10 });
 * const items = await Model.find({}).skip(skip).limit(limit);
 */
const sanitizePagination = (params, options = {}) => {
    const {
        maxLimit = 100,
        defaultLimit = 20,
        defaultPage = 1,
        maxSkip = 10000  // Prevent excessive skip values
    } = options;

    let page = parseInt(params.page, 10);
    let limit = parseInt(params.limit, 10);
    let skip = parseInt(params.skip, 10);

    // Validate and cap limit (MUST be between 1 and maxLimit)
    if (isNaN(limit) || limit < 1) {
        limit = defaultLimit;
    } else if (limit > maxLimit) {
        limit = maxLimit;
    }

    // Validate page
    if (isNaN(page) || page < 1) {
        page = defaultPage;
    }

    // Calculate skip from page if skip not provided directly
    // If skip is provided directly, validate it
    if (isNaN(skip)) {
        skip = (page - 1) * limit;
    } else {
        // Validate skip bounds (prevent negative or excessive skip)
        skip = Math.max(0, Math.min(skip, maxSkip));
    }

    return { page, limit, skip };
};

// ============================================
// SAFE OPERATIONS
// ============================================

/**
 * Safely parse JSON with error handling
 *
 * @param {string} jsonString - JSON string to parse
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} - Parsed object or default value
 */
const safeJSONParse = (jsonString, defaultValue = null) => {
    if (typeof jsonString !== 'string') {
        return defaultValue;
    }

    try {
        return JSON.parse(jsonString);
    } catch {
        return defaultValue;
    }
};

/**
 * Create timing-safe string comparison
 * Prevents timing attacks on secret comparison
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - Whether strings are equal
 */
const timingSafeEqual = (a, b) => {
    const crypto = require('crypto');

    if (typeof a !== 'string' || typeof b !== 'string') {
        return false;
    }

    // Pad to same length to prevent length-based timing leaks
    const maxLen = Math.max(a.length, b.length);
    const paddedA = a.padEnd(maxLen, '\0');
    const paddedB = b.padEnd(maxLen, '\0');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(paddedA),
            Buffer.from(paddedB)
        );
    } catch {
        return false;
    }
};

// ============================================
// EMAIL VERIFICATION SECURITY (Gold Standard)
// ============================================

/**
 * Hash verification token using SHA-256
 * Tokens are stored hashed in database (like Microsoft/Google pattern)
 * This way, database breach doesn't expose usable tokens
 *
 * @param {string} token - Raw verification token
 * @returns {string} - SHA-256 hash of token (hex)
 */
const hashVerificationToken = (token) => {
    const crypto = require('crypto');
    if (!token || typeof token !== 'string') {
        return '';
    }
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Timing-safe comparison for verification tokens
 * Compares hashed tokens in constant time to prevent timing attacks
 *
 * @param {string} providedHash - Hash of user-provided token
 * @param {string} storedHash - Hash stored in database
 * @returns {boolean} - Whether hashes match
 */
const timingSafeTokenCompare = (providedHash, storedHash) => {
    const crypto = require('crypto');

    if (!providedHash || !storedHash ||
        typeof providedHash !== 'string' ||
        typeof storedHash !== 'string') {
        // Do a dummy comparison to maintain constant time
        const dummyHash = crypto.createHash('sha256').update('dummy').digest('hex');
        try {
            crypto.timingSafeEqual(Buffer.from(dummyHash), Buffer.from(dummyHash));
        } catch {}
        return false;
    }

    // Hash lengths should be equal (both SHA-256 = 64 hex chars)
    if (providedHash.length !== storedHash.length) {
        // Do a comparison anyway to maintain timing
        try {
            crypto.timingSafeEqual(
                Buffer.from(storedHash),
                Buffer.from(storedHash)
            );
        } catch {}
        return false;
    }

    try {
        return crypto.timingSafeEqual(
            Buffer.from(providedHash, 'hex'),
            Buffer.from(storedHash, 'hex')
        );
    } catch {
        return false;
    }
};

/**
 * Add random timing delay to prevent user enumeration
 * Returns same response regardless of user existence, with random delay
 * to prevent timing-based inference
 *
 * @param {number} minMs - Minimum delay in milliseconds (default: 150)
 * @param {number} maxMs - Maximum delay in milliseconds (default: 400)
 * @returns {Promise<void>}
 */
const randomTimingDelay = async (minMs = 150, maxMs = 400) => {
    const crypto = require('crypto');
    // Use crypto.randomInt for cryptographically secure random
    const delay = crypto.randomInt(minMs, maxMs + 1);
    return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Mask email address for safe display
 * Shows first char + *** + @domain.com
 * Prevents full email exposure in responses
 *
 * @param {string} email - Full email address
 * @returns {string} - Masked email (e.g., "j***@gmail.com")
 */
const maskEmail = (email) => {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return '***@***.***';
    }

    const [local, domain] = email.split('@');
    if (!local || !domain) {
        return '***@***.***';
    }

    // Show first character only
    const maskedLocal = local.charAt(0) + '***';
    return `${maskedLocal}@${domain}`;
};

module.exports = {
    // Mass Assignment Protection
    pickAllowedFields,
    omitBlockedFields,
    SENSITIVE_FIELDS,

    // CSV Injection Prevention
    sanitizeForCSV,
    sanitizeRowForCSV,
    toSafeCSV,

    // Log Injection Prevention
    sanitizeForLog,
    createSafeLogger,

    // Input Sanitization
    sanitizeString,
    sanitizeObjectId,
    sanitizeEmail,
    sanitizePhone,
    sanitizePagination,

    // Safe Operations
    safeJSONParse,
    timingSafeEqual,

    // Email Verification Security (Gold Standard)
    hashVerificationToken,
    timingSafeTokenCompare,
    randomTimingDelay,
    maskEmail
};
