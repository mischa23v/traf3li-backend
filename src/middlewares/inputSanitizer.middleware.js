/**
 * Input Sanitizer Middleware
 *
 * Prevents NoSQL injection and sanitizes user input.
 */

/**
 * Remove dangerous MongoDB operators from object
 */
const removeDangerousOperators = (obj, path = '') => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item, index) => removeDangerousOperators(item, `${path}[${index}]`));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        // Block keys starting with $ (MongoDB operators)
        if (key.startsWith('$')) {
            console.warn(`[InputSanitizer] Blocked dangerous key "${key}" at path "${path}"`);
            continue;
        }

        // Recursively sanitize nested objects
        sanitized[key] = removeDangerousOperators(value, path ? `${path}.${key}` : key);
    }

    return sanitized;
};

/**
 * Escape regex special characters
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Sanitize string value
 */
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;

    // Remove null bytes
    let sanitized = str.replace(/\0/g, '');

    // Trim whitespace
    sanitized = sanitized.trim();

    return sanitized;
};

/**
 * Deep sanitize an object
 */
const deepSanitize = (obj) => {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(deepSanitize);
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip prototype pollution attempts
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                console.warn(`[InputSanitizer] Blocked prototype pollution attempt: ${key}`);
                continue;
            }
            sanitized[sanitizeString(key)] = deepSanitize(value);
        }
        return sanitized;
    }

    return obj;
};

/**
 * Input sanitizer middleware
 */
const inputSanitizer = (req, res, next) => {
    try {
        // Sanitize body
        if (req.body && typeof req.body === 'object') {
            req.body = removeDangerousOperators(req.body);
            req.body = deepSanitize(req.body);
        }

        // Sanitize query parameters
        if (req.query && typeof req.query === 'object') {
            req.query = removeDangerousOperators(req.query);
            req.query = deepSanitize(req.query);
        }

        // Sanitize params
        if (req.params && typeof req.params === 'object') {
            req.params = deepSanitize(req.params);
        }

        next();
    } catch (error) {
        console.error('[InputSanitizer] Error:', error);
        next(); // Continue even if sanitization fails
    }
};

/**
 * Strict sanitizer for sensitive endpoints
 */
const strictSanitizer = (req, res, next) => {
    try {
        // Apply regular sanitization
        inputSanitizer(req, res, () => {});

        // Additional checks for sensitive data
        const sensitivePatterns = [
            /\$where/i,
            /\$function/i,
            /\$accumulator/i,
            /\$reduce/i,
            /mapReduce/i,
            /javascript:/i,
            /<script/i
        ];

        const bodyString = JSON.stringify(req.body || {});
        for (const pattern of sensitivePatterns) {
            if (pattern.test(bodyString)) {
                console.warn(`[InputSanitizer] Blocked suspicious pattern: ${pattern}`);
                return res.status(400).json({
                    success: false,
                    message: 'Invalid input detected'
                });
            }
        }

        next();
    } catch (error) {
        console.error('[InputSanitizer] Error:', error);
        next();
    }
};

/**
 * Helper to get safe regex from user input
 */
const getSafeRegex = (input, flags = 'i') => {
    if (!input || typeof input !== 'string') {
        return null;
    }
    const escaped = escapeRegex(input);
    return new RegExp(escaped, flags);
};

module.exports = {
    inputSanitizer,
    strictSanitizer,
    removeDangerousOperators,
    escapeRegex,
    sanitizeString,
    deepSanitize,
    getSafeRegex
};
