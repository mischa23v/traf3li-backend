const sanitizeHtml = require('sanitize-html');
const logger = require('../utils/logger');

/**
 * SANITIZATION MIDDLEWARE
 * Protects against XSS and injection attacks by sanitizing user input
 *
 * Features:
 * - HTML sanitization using sanitize-html
 * - Whitespace trimming
 * - Null byte removal
 * - Dangerous character filtering
 * - Query parameter sanitization
 * - Nested object/array support
 * - Whitelist for fields that require HTML (rich text editors, email templates)
 */

// Fields that are allowed to contain HTML (rich text editors, email templates, etc.)
const HTML_WHITELIST = [
    'content',
    'description',
    'body',
    'html',
    'htmlContent',
    'emailBody',
    'emailTemplate',
    'templateContent',
    'richText',
    'notes',
    'comments',
    'message',
    'emailContent',
    'signature',
    'terms',
    'privacyPolicy',
    'template',
    'customContent'
];

// Strict HTML sanitization config (removes all HTML tags)
const STRICT_SANITIZE_CONFIG = {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'recursiveEscape'
};

// Permissive HTML sanitization config (allows safe HTML for rich text)
const PERMISSIVE_SANITIZE_CONFIG = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'ul', 'ol', 'li',
        'a',
        'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span'
    ],
    allowedAttributes: {
        'a': ['href', 'target', 'rel'],
        'div': ['class', 'id'],
        'span': ['class', 'id'],
        'p': ['class', 'id'],
        'h1': ['class', 'id'],
        'h2': ['class', 'id'],
        'h3': ['class', 'id'],
        'h4': ['class', 'id'],
        'h5': ['class', 'id'],
        'h6': ['class', 'id'],
        'table': ['class', 'id'],
        'td': ['colspan', 'rowspan'],
        'th': ['colspan', 'rowspan']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
        a: ['http', 'https', 'mailto']
    },
    // Prevent JavaScript execution
    disallowedTagsMode: 'recursiveEscape',
    // Remove dangerous attributes
    allowProtocolRelative: false,
    enforceHtmlBoundary: true
};

/**
 * Sanitize a string value
 * @param {string} str - String to sanitize
 * @param {boolean} allowHtml - Whether to allow HTML content
 * @returns {string} - Sanitized string
 */
function sanitizeString(str, allowHtml = false) {
    if (typeof str !== 'string') {
        return str;
    }

    // Remove null bytes (potential for SQL/NoSQL injection)
    str = str.replace(/\0/g, '');

    // Remove other dangerous characters
    // Unicode control characters (except tab, newline, carriage return)
    str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Trim whitespace
    str = str.trim();

    // Apply HTML sanitization
    if (allowHtml) {
        // Use permissive config for whitelisted fields
        str = sanitizeHtml(str, PERMISSIVE_SANITIZE_CONFIG);
    } else {
        // Use strict config for regular fields (removes all HTML)
        str = sanitizeHtml(str, STRICT_SANITIZE_CONFIG);
    }

    return str;
}

/**
 * Check if a field path should allow HTML
 * @param {string} fieldPath - Dot-notation field path (e.g., "user.bio")
 * @returns {boolean}
 */
function isHtmlWhitelisted(fieldPath) {
    const fieldName = fieldPath.split('.').pop().toLowerCase();
    return HTML_WHITELIST.includes(fieldName);
}

/**
 * Recursively sanitize an object or array
 * @param {any} obj - Object/array to sanitize
 * @param {string} parentPath - Parent field path for whitelist checking
 * @returns {any} - Sanitized object/array
 */
function sanitizeObject(obj, parentPath = '') {
    if (obj === null || obj === undefined) {
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map((item, index) => {
            const fieldPath = parentPath ? `${parentPath}[${index}]` : `[${index}]`;
            return sanitizeObject(item, fieldPath);
        });
    }

    // Handle objects
    if (typeof obj === 'object') {
        // Handle special cases (Date, Buffer, etc.)
        if (obj instanceof Date || obj instanceof Buffer) {
            return obj;
        }

        const sanitized = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const fieldPath = parentPath ? `${parentPath}.${key}` : key;
                const value = obj[key];

                // Recursively sanitize nested objects/arrays
                if (typeof value === 'object' && value !== null) {
                    sanitized[key] = sanitizeObject(value, fieldPath);
                } else if (typeof value === 'string') {
                    // Check if this field should allow HTML
                    const allowHtml = isHtmlWhitelisted(fieldPath);
                    sanitized[key] = sanitizeString(value, allowHtml);
                } else {
                    // Keep other types as-is (numbers, booleans, etc.)
                    sanitized[key] = value;
                }
            }
        }
        return sanitized;
    }

    // Handle strings
    if (typeof obj === 'string') {
        const allowHtml = isHtmlWhitelisted(parentPath);
        return sanitizeString(obj, allowHtml);
    }

    // Return other types as-is
    return obj;
}

/**
 * Middleware to sanitize request body
 */
function sanitizeBody(req, res, next) {
    if (req.body && Object.keys(req.body).length > 0) {
        try {
            req.body = sanitizeObject(req.body);
        } catch (error) {
            logger.error('Error sanitizing request body:', error);
            return res.status(400).json({
                error: true,
                message: 'Invalid request data format'
            });
        }
    }
    next();
}

/**
 * Middleware to sanitize query parameters
 */
function sanitizeQuery(req, res, next) {
    if (req.query && Object.keys(req.query).length > 0) {
        try {
            req.query = sanitizeObject(req.query);
        } catch (error) {
            logger.error('Error sanitizing query parameters:', error);
            return res.status(400).json({
                error: true,
                message: 'Invalid query parameters format'
            });
        }
    }
    next();
}

/**
 * Middleware to sanitize URL parameters
 */
function sanitizeParams(req, res, next) {
    if (req.params && Object.keys(req.params).length > 0) {
        try {
            req.params = sanitizeObject(req.params);
        } catch (error) {
            logger.error('Error sanitizing URL parameters:', error);
            return res.status(400).json({
                error: true,
                message: 'Invalid URL parameters format'
            });
        }
    }
    next();
}

/**
 * Combined middleware to sanitize all request inputs
 */
function sanitizeAll(req, res, next) {
    sanitizeBody(req, res, (err) => {
        if (err) return next(err);
        sanitizeQuery(req, res, (err) => {
            if (err) return next(err);
            sanitizeParams(req, res, next);
        });
    });
}

// Export middleware functions and utility
module.exports = {
    sanitizeBody,
    sanitizeQuery,
    sanitizeParams,
    sanitizeAll,
    sanitizeString,
    sanitizeObject
};
