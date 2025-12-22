const logger = require('../utils/logger');

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
        // CSP reports are sent with Content-Type: application/csp-report
        // Body is JSON with a "csp-report" key
        const report = req.body['csp-report'];

        if (!report) {
            logger.warn('CSP report received without csp-report field', {
                body: req.body,
                contentType: req.headers['content-type']
            });
            return res.status(204).end();
        }

        // Extract key information
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
        } = report;

        // Log the violation
        logger.warn('CSP violation detected', {
            documentUri,
            violatedDirective,
            effectiveDirective,
            blockedUri,
            disposition, // 'enforce' or 'report' (report-only mode)
            statusCode,
            scriptSample: scriptSample ? scriptSample.substring(0, 100) : null,
            referrer,
            userAgent: req.headers['user-agent'],
            ip: req.ip
        });

        // Update statistics
        updateViolationStats(report);

        // Check for critical violations that might indicate an attack
        if (isHighRiskViolation(report)) {
            logger.error('High-risk CSP violation detected', {
                documentUri,
                violatedDirective,
                blockedUri,
                scriptSample,
                userAgent: req.headers['user-agent'],
                ip: req.ip
            });

            // TODO: In production, consider:
            // - Sending alert to security team
            // - Triggering incident response workflow
            // - Rate limiting this IP if multiple violations
        }

        // CSP reports should always return 204 No Content
        return res.status(204).end();

    } catch (error) {
        logger.error('Error processing CSP report', {
            error: error.message,
            stack: error.stack,
            body: req.body
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

        // Filter recent violations if filters provided
        let violations = violationStats.recent;

        if (directive) {
            violations = violations.filter(v =>
                v.violatedDirective === directive || v.effectiveDirective === directive
            );
        }

        if (uri) {
            violations = violations.filter(v =>
                v.documentUri?.includes(uri) || v.blockedUri?.includes(uri)
            );
        }

        // Limit results
        violations = violations.slice(0, parseInt(limit));

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
            error: error.message,
            stack: error.stack
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
            userId: req.userID,
            ip: req.ip
        });

        return res.json({
            success: true,
            message: 'CSP violation statistics cleared successfully',
            messageAr: 'تم مسح إحصائيات انتهاكات سياسة الأمان بنجاح'
        });

    } catch (error) {
        logger.error('Error clearing CSP violations', {
            error: error.message,
            stack: error.stack
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
