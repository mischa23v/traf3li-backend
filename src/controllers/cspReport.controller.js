const logger = require('../utils/logger');
const { pickAllowedFields, sanitizeObjectId, sanitizeForLog } = require('../utils/securityUtils');

/**
 * CSP Report Controller
 *
 * Handles Content Security Policy (CSP) violation reports
 * Browsers automatically send reports when CSP is violated
 *
 * Features:
 * - Receives and logs CSP violation reports
 * - Aggregates common violations for analysis
 * - Provides violation statistics for security monitoring
 *
 * CSP Report Format (sent by browser):
 * {
 *   "csp-report": {
 *     "document-uri": "https://example.com/page",
 *     "referrer": "",
 *     "violated-directive": "script-src",
 *     "effective-directive": "script-src",
 *     "original-policy": "...",
 *     "disposition": "enforce",
 *     "blocked-uri": "https://evil.com/script.js",
 *     "status-code": 200,
 *     "script-sample": ""
 *   }
 * }
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#violation_report_syntax
 */

// In-memory storage for violation statistics (use Redis/DB in production)
const violationStats = {
    total: 0,
    byDirective: {},
    byBlockedUri: {},
    byDocumentUri: {},
    recent: []
};

// Maximum number of recent violations to keep in memory
const MAX_RECENT_VIOLATIONS = 100;

// Rate limiting configuration for CSP reports
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REPORTS_PER_WINDOW = 50; // Max 50 reports per IP per minute
const reportRateLimitMap = new Map(); // IP -> { count, resetTime }

// ============================================
// VALIDATION AND RATE LIMITING HELPERS
// ============================================

/**
 * Check if IP is rate limited for CSP reports
 */
function isRateLimited(ip) {
    const now = Date.now();
    const rateLimit = reportRateLimitMap.get(ip);

    if (!rateLimit || now > rateLimit.resetTime) {
        // Reset or create new rate limit window
        reportRateLimitMap.set(ip, {
            count: 1,
            resetTime: now + RATE_LIMIT_WINDOW_MS
        });
        return false;
    }

    if (rateLimit.count >= MAX_REPORTS_PER_WINDOW) {
        return true;
    }

    rateLimit.count++;
    return false;
}

/**
 * Validate CSP report structure and field types
 */
function validateCspReport(report) {
    if (!report || typeof report !== 'object') {
        return { valid: false, error: 'Invalid report structure' };
    }

    // Check for required fields (at least one directive should be present)
    if (!report['violated-directive'] && !report['effective-directive']) {
        return { valid: false, error: 'Missing directive information' };
    }

    // Validate field types and lengths
    const stringFields = [
        'document-uri',
        'referrer',
        'violated-directive',
        'effective-directive',
        'original-policy',
        'disposition',
        'blocked-uri',
        'script-sample'
    ];

    for (const field of stringFields) {
        if (report[field] !== undefined) {
            if (typeof report[field] !== 'string') {
                return { valid: false, error: `Invalid type for ${field}` };
            }
            // Prevent excessively long fields (potential DoS)
            if (report[field].length > 10000) {
                return { valid: false, error: `Field ${field} exceeds maximum length` };
            }
        }
    }

    // Validate status-code if present
    if (report['status-code'] !== undefined) {
        const statusCode = Number(report['status-code']);
        if (!Number.isInteger(statusCode) || statusCode < 0 || statusCode > 999) {
            return { valid: false, error: 'Invalid status-code' };
        }
    }

    // Validate disposition
    if (report.disposition && !['enforce', 'report'].includes(report.disposition)) {
        return { valid: false, error: 'Invalid disposition value' };
    }

    return { valid: true };
}

/**
 * Sanitize CSP report data for logging to prevent injection attacks
 */
function sanitizeCspReportForLogging(report) {
    const sanitized = {};

    for (const [key, value] of Object.entries(report)) {
        if (value !== undefined && value !== null) {
            sanitized[key] = sanitizeForLog(value);
        }
    }

    return sanitized;
}

/**
 * POST /api/security/csp-report
 *
 * Receives CSP violation reports from browsers
 * This endpoint is called automatically by browsers when CSP is violated
 *
 * Response: 204 No Content (per CSP spec)
 */
const receiveCspReport = async (req, res) => {
    try {
        // Rate limiting check
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        if (isRateLimited(clientIp)) {
            logger.warn('CSP report rate limit exceeded', {
                ip: sanitizeForLog(clientIp),
                userAgent: sanitizeForLog(req.headers['user-agent'])
            });
            return res.status(204).end(); // Still return 204 per CSP spec
        }

        // CSP reports are sent with Content-Type: application/csp-report
        // Body is JSON with a "csp-report" key
        const report = req.body['csp-report'];

        if (!report) {
            logger.warn('CSP report received without csp-report field', {
                contentType: sanitizeForLog(req.headers['content-type']),
                ip: sanitizeForLog(clientIp)
            });
            return res.status(204).end();
        }

        // Validate report structure
        const validation = validateCspReport(report);
        if (!validation.valid) {
            logger.warn('Invalid CSP report received', {
                error: validation.error,
                ip: sanitizeForLog(clientIp),
                userAgent: sanitizeForLog(req.headers['user-agent'])
            });
            return res.status(204).end();
        }

        // Sanitize report data for logging
        const sanitizedReport = sanitizeCspReportForLogging(report);

        // Extract key information (already sanitized)
        const {
            'document-uri': documentUri,
            'violated-directive': violatedDirective,
            'effective-directive': effectiveDirective,
            'blocked-uri': blockedUri,
            'original-policy': originalPolicy,
            disposition,
            'status-code': statusCode,
            'script-sample': scriptSample,
            referrer
        } = sanitizedReport;

        // Log the violation with sanitized data
        logger.warn('CSP violation detected', {
            documentUri,
            violatedDirective,
            effectiveDirective,
            blockedUri,
            disposition, // 'enforce' or 'report' (report-only mode)
            statusCode,
            scriptSample: scriptSample ? String(scriptSample).substring(0, 100) : null,
            referrer,
            userAgent: sanitizeForLog(req.headers['user-agent']),
            ip: sanitizeForLog(clientIp)
        });

        // Update statistics with original (validated) report
        updateViolationStats(report);

        // Check for critical violations that might indicate an attack
        if (isHighRiskViolation(report)) {
            logger.error('High-risk CSP violation detected', {
                documentUri,
                violatedDirective,
                blockedUri,
                scriptSample: scriptSample ? String(scriptSample).substring(0, 200) : null,
                userAgent: sanitizeForLog(req.headers['user-agent']),
                ip: sanitizeForLog(clientIp)
            });

            // TODO: In production, consider:
            // - Sending alert to security team
            // - Triggering incident response workflow
            // - Additional rate limiting for high-risk IPs
        }

        // CSP reports should always return 204 No Content
        return res.status(204).end();

    } catch (error) {
        logger.error('Error processing CSP report', {
            error: sanitizeForLog(error.message),
            stack: sanitizeForLog(error.stack)
        });

        // Always return 204 even on error (per CSP spec)
        return res.status(204).end();
    }
};

/**
 * GET /api/security/csp-violations
 *
 * Returns aggregated CSP violation statistics
 * Requires authentication (admin only)
 */
const getCspViolations = async (req, res) => {
    try {
        const { limit = 50, directive, uri } = req.query;

        // Validate and sanitize query parameters
        const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
        const sanitizedDirective = directive ? sanitizeForLog(String(directive)) : null;
        const sanitizedUri = uri ? sanitizeForLog(String(uri)) : null;

        // Filter recent violations if filters provided
        let violations = violationStats.recent;

        if (sanitizedDirective) {
            violations = violations.filter(v =>
                v.violatedDirective === sanitizedDirective || v.effectiveDirective === sanitizedDirective
            );
        }

        if (sanitizedUri) {
            violations = violations.filter(v =>
                v.documentUri?.includes(sanitizedUri) || v.blockedUri?.includes(sanitizedUri)
            );
        }

        // Limit results
        violations = violations.slice(0, sanitizedLimit);

        return res.json({
            success: true,
            data: {
                summary: {
                    total: violationStats.total,
                    byDirective: violationStats.byDirective,
                    topBlockedUris: getTopItems(violationStats.byBlockedUri, 10),
                    topDocumentUris: getTopItems(violationStats.byDocumentUri, 10)
                },
                recent: violations
            },
            message: 'CSP violation statistics retrieved successfully'
        });

    } catch (error) {
        logger.error('Error retrieving CSP violations', {
            error: sanitizeForLog(error.message),
            stack: sanitizeForLog(error.stack)
        });

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to retrieve CSP violations',
                messageAr: 'فشل في استرجاع إحصائيات انتهاكات سياسة الأمان'
            }
        });
    }
};

/**
 * DELETE /api/security/csp-violations
 *
 * Clears CSP violation statistics
 * Requires authentication (admin only)
 */
const clearCspViolations = async (req, res) => {
    try {
        // Reset statistics
        violationStats.total = 0;
        violationStats.byDirective = {};
        violationStats.byBlockedUri = {};
        violationStats.byDocumentUri = {};
        violationStats.recent = [];

        logger.info('CSP violation statistics cleared', {
            userId: sanitizeForLog(req.userID),
            ip: sanitizeForLog(req.ip)
        });

        return res.json({
            success: true,
            message: 'CSP violation statistics cleared successfully',
            messageAr: 'تم مسح إحصائيات انتهاكات سياسة الأمان بنجاح'
        });

    } catch (error) {
        logger.error('Error clearing CSP violations', {
            error: sanitizeForLog(error.message),
            stack: sanitizeForLog(error.stack)
        });

        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: 'Failed to clear CSP violations',
                messageAr: 'فشل في مسح إحصائيات انتهاكات سياسة الأمان'
            }
        });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Update violation statistics
 */
function updateViolationStats(report) {
    const {
        'document-uri': documentUri,
        'violated-directive': violatedDirective,
        'effective-directive': effectiveDirective,
        'blocked-uri': blockedUri,
        disposition
    } = report;

    // Increment total
    violationStats.total++;

    // Track by directive
    const directive = effectiveDirective || violatedDirective || 'unknown';
    violationStats.byDirective[directive] = (violationStats.byDirective[directive] || 0) + 1;

    // Track by blocked URI (normalize to prevent bloat)
    const normalizedBlockedUri = normalizeUri(blockedUri);
    if (normalizedBlockedUri) {
        violationStats.byBlockedUri[normalizedBlockedUri] =
            (violationStats.byBlockedUri[normalizedBlockedUri] || 0) + 1;
    }

    // Track by document URI (normalize to prevent bloat)
    const normalizedDocumentUri = normalizeUri(documentUri);
    if (normalizedDocumentUri) {
        violationStats.byDocumentUri[normalizedDocumentUri] =
            (violationStats.byDocumentUri[normalizedDocumentUri] || 0) + 1;
    }

    // Add to recent violations
    violationStats.recent.unshift({
        timestamp: new Date().toISOString(),
        documentUri,
        violatedDirective,
        effectiveDirective,
        blockedUri,
        disposition
    });

    // Limit recent violations to prevent memory bloat
    if (violationStats.recent.length > MAX_RECENT_VIOLATIONS) {
        violationStats.recent = violationStats.recent.slice(0, MAX_RECENT_VIOLATIONS);
    }
}

/**
 * Normalize URI for aggregation
 * Removes query strings and fragments to group similar URIs
 */
function normalizeUri(uri) {
    if (!uri) return null;

    try {
        // Handle special cases
        if (uri === 'inline' || uri === 'eval' || uri === 'data') {
            return uri;
        }

        // Parse URL and remove query/fragment
        const url = new URL(uri);
        return url.origin + url.pathname;
    } catch (error) {
        // If URL parsing fails, return as-is (truncated)
        return uri.length > 100 ? uri.substring(0, 100) : uri;
    }
}

/**
 * Determine if violation is high-risk
 * High-risk violations might indicate an attack
 */
function isHighRiskViolation(report) {
    const {
        'blocked-uri': blockedUri,
        'script-sample': scriptSample,
        'effective-directive': effectiveDirective
    } = report;

    // Check for inline script/eval violations (common XSS indicators)
    if (blockedUri === 'inline' || blockedUri === 'eval') {
        return true;
    }

    // Check for data: URIs (common XSS vector)
    if (blockedUri?.startsWith('data:')) {
        return true;
    }

    // Check for script-src violations with suspicious patterns
    if (effectiveDirective === 'script-src' && scriptSample) {
        const suspiciousPatterns = [
            /document\.cookie/i,
            /window\.location/i,
            /eval\(/i,
            /fromCharCode/i,
            /atob\(/i,
            /btoa\(/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(scriptSample));
    }

    return false;
}

/**
 * Get top N items from a count object
 */
function getTopItems(countObj, limit = 10) {
    return Object.entries(countObj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([uri, count]) => ({ uri, count }));
}

module.exports = {
    receiveCspReport,
    getCspViolations,
    clearCspViolations
};
