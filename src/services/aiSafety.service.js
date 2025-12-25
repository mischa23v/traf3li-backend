const AIInteraction = require('../models/aiInteraction.model');
const Firm = require('../models/firm.model');
const logger = require('../utils/logger');

/**
 * AI Safety Service
 *
 * Provides comprehensive safety measures for AI interactions:
 * - Input sanitization & prompt injection detection
 * - Output filtering & PII leakage prevention
 * - Rate limiting & quota management
 * - Hallucination checks & confidence scoring
 * - Audit logging & compliance tracking
 */

class AISafetyService {
    // ═══════════════════════════════════════════════════════════════
    // PROMPT INJECTION DETECTION PATTERNS
    // ═══════════════════════════════════════════════════════════════

    static INJECTION_PATTERNS = [
        // Direct instruction overrides
        { pattern: /ignore\s+(previous|all|above)\s+instructions?/i, severity: 'high', type: 'prompt_injection' },
        { pattern: /forget\s+(previous|all|your)\s+(instructions?|directives?)/i, severity: 'high', type: 'prompt_injection' },
        { pattern: /disregard\s+(previous|all|above)\s+(instructions?|commands?)/i, severity: 'high', type: 'prompt_injection' },

        // System prompt manipulation
        { pattern: /system\s*prompt/i, severity: 'medium', type: 'prompt_injection' },
        { pattern: /you\s+are\s+now\s+(a|an)/i, severity: 'medium', type: 'prompt_injection' },
        { pattern: /new\s+(instructions?|role|task)/i, severity: 'medium', type: 'prompt_injection' },

        // Jailbreak attempts
        { pattern: /jailbreak/i, severity: 'critical', type: 'jailbreak_attempt' },
        { pattern: /DAN\s+mode/i, severity: 'critical', type: 'jailbreak_attempt' },
        { pattern: /developer\s+mode/i, severity: 'medium', type: 'jailbreak_attempt' },
        { pattern: /bypass\s+(restrictions?|filters?|safety)/i, severity: 'high', type: 'jailbreak_attempt' },

        // Role manipulation
        { pattern: /pretend\s+you\s+(are|to\s+be)/i, severity: 'medium', type: 'prompt_injection' },
        { pattern: /act\s+as\s+(if|though)/i, severity: 'low', type: 'prompt_injection' },

        // Delimiter injection
        { pattern: /```\s*system/i, severity: 'high', type: 'prompt_injection' },
        { pattern: /<\|system\|>/i, severity: 'high', type: 'prompt_injection' },
        { pattern: /\[SYSTEM\]/i, severity: 'high', type: 'prompt_injection' }
    ];

    // ═══════════════════════════════════════════════════════════════
    // PII DETECTION PATTERNS
    // ═══════════════════════════════════════════════════════════════

    static PII_PATTERNS = [
        // Saudi National ID (10 digits)
        { pattern: /\b[12]\d{9}\b/, severity: 'high', type: 'pii_detected', description: 'National ID detected' },

        // IBAN
        { pattern: /\bSA\d{2}[A-Z0-9]{22}\b/i, severity: 'high', type: 'pii_detected', description: 'IBAN detected' },

        // Credit card (basic pattern)
        { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, severity: 'high', type: 'pii_detected', description: 'Credit card pattern detected' },

        // Email addresses
        { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, severity: 'medium', type: 'pii_detected', description: 'Email address detected' },

        // Saudi phone numbers
        { pattern: /\b(?:\+966|00966|05)\d{8,9}\b/, severity: 'medium', type: 'pii_detected', description: 'Phone number detected' },

        // IP addresses
        { pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/, severity: 'low', type: 'pii_detected', description: 'IP address detected' }
    ];

    // ═══════════════════════════════════════════════════════════════
    // HARMFUL CONTENT PATTERNS
    // ═══════════════════════════════════════════════════════════════

    static HARMFUL_PATTERNS = [
        { pattern: /\b(kill|murder|assassinate)\s+(yourself|someone)\b/i, severity: 'critical', type: 'harmful_content' },
        { pattern: /\bhow\s+to\s+(hack|crack|steal)\b/i, severity: 'high', type: 'harmful_content' },
        { pattern: /\b(illegal|unlawful)\s+(activities?|actions?)\b/i, severity: 'medium', type: 'harmful_content' }
    ];

    // ═══════════════════════════════════════════════════════════════
    // RATE LIMITING CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    static RATE_LIMITS = {
        // Per-user limits (per hour)
        perHour: {
            free: 10,
            starter: 50,
            professional: 200,
            enterprise: 1000
        },
        // Per-firm limits (per day)
        perDay: {
            free: 50,
            starter: 300,
            professional: 1500,
            enterprise: 10000
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // INPUT SANITIZATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sanitize user input before sending to LLM
     * @param {string} message - User message
     * @returns {Object} { sanitized: string, violations: Array, safe: boolean }
     */
    static sanitizeInput(message) {
        if (!message || typeof message !== 'string') {
            return {
                sanitized: '',
                violations: [],
                safe: false,
                error: 'Invalid input message'
            };
        }

        const violations = [];
        let sanitized = message;
        let safe = true;

        // Check length
        if (message.length > 10000) {
            violations.push({
                type: 'excessive_length',
                severity: 'medium',
                description: 'Message exceeds maximum length',
                pattern: 'length_check'
            });
            sanitized = message.substring(0, 10000);
        }

        // Check for prompt injection
        for (const { pattern, severity, type } of this.INJECTION_PATTERNS) {
            if (pattern.test(message)) {
                violations.push({
                    type,
                    severity,
                    pattern: pattern.toString(),
                    description: `Potential ${type} detected`
                });

                // Block critical severity violations
                if (severity === 'critical') {
                    safe = false;
                }

                // Sanitize high severity patterns
                if (severity === 'high' || severity === 'critical') {
                    sanitized = sanitized.replace(pattern, '[REDACTED]');
                }
            }
        }

        // Check for PII in input (warn but don't block)
        for (const { pattern, severity, type, description } of this.PII_PATTERNS) {
            if (pattern.test(message)) {
                violations.push({
                    type,
                    severity,
                    pattern: pattern.toString(),
                    description
                });
            }
        }

        // Check for harmful content
        for (const { pattern, severity, type } of this.HARMFUL_PATTERNS) {
            if (pattern.test(message)) {
                violations.push({
                    type,
                    severity,
                    pattern: pattern.toString(),
                    description: 'Potentially harmful content detected'
                });

                if (severity === 'critical') {
                    safe = false;
                }
            }
        }

        // Normalize whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();

        return {
            sanitized,
            violations,
            safe,
            modified: sanitized !== message
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // OUTPUT FILTERING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Filter AI response for harmful content and PII leakage
     * @param {string} response - AI response
     * @param {string} context - Context type (legal, general, etc.)
     * @returns {Object} { filtered: string, violations: Array, safe: boolean }
     */
    static filterOutput(response, context = 'general') {
        if (!response || typeof response !== 'string') {
            return {
                filtered: '',
                violations: [],
                safe: false,
                error: 'Invalid response'
            };
        }

        const violations = [];
        let filtered = response;
        let safe = true;

        // Check for PII leakage in output
        for (const { pattern, severity, type, description } of this.PII_PATTERNS) {
            if (pattern.test(response)) {
                violations.push({
                    type: 'pii_leakage',
                    severity,
                    pattern: pattern.toString(),
                    description: `${description} in response`
                });

                // Redact PII from output
                if (severity === 'high' || severity === 'critical') {
                    filtered = filtered.replace(pattern, '[REDACTED]');
                }
            }
        }

        // Check for harmful content in output
        for (const { pattern, severity, type } of this.HARMFUL_PATTERNS) {
            if (pattern.test(response)) {
                violations.push({
                    type,
                    severity,
                    pattern: pattern.toString(),
                    description: 'Harmful content in response'
                });

                if (severity === 'critical') {
                    safe = false;
                }
            }
        }

        // Add legal disclaimer if context is legal
        let disclaimerAdded = false;
        if (context === 'legal' && !response.toLowerCase().includes('disclaimer')) {
            const disclaimer = '\n\n⚖️ Legal Disclaimer: This is AI-generated information for general guidance only. It is not legal advice. Please consult with a qualified attorney for your specific legal matter.';
            filtered += disclaimer;
            disclaimerAdded = true;
        }

        return {
            filtered,
            violations,
            safe,
            modified: filtered !== response,
            disclaimerAdded
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // RATE LIMITING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Check if user has exceeded their AI usage quota
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @returns {Object} { allowed: boolean, currentUsage: number, limit: number, resetTime: Date }
     */
    static async checkRateLimit(userId, firmId) {
        try {
            // Get firm's subscription plan
            const firm = await Firm.findById(firmId).select('subscription.plan');
            const plan = firm?.subscription?.plan || 'free';

            // Get rate limits for plan
            const hourlyLimit = this.RATE_LIMITS.perHour[plan] || this.RATE_LIMITS.perHour.free;
            const dailyLimit = this.RATE_LIMITS.perDay[plan] || this.RATE_LIMITS.perDay.free;

            // Check hourly usage
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const hourlyUsage = await AIInteraction.countDocuments({
                userId,
                firmId,
                createdAt: { $gte: oneHourAgo },
                status: { $ne: 'blocked' }
            });

            if (hourlyUsage >= hourlyLimit) {
                return {
                    allowed: false,
                    currentUsage: hourlyUsage,
                    limit: hourlyLimit,
                    limitType: 'hourly',
                    resetTime: new Date(Date.now() + 60 * 60 * 1000),
                    message: `Hourly rate limit exceeded. Limit: ${hourlyLimit} requests per hour.`
                };
            }

            // Check daily usage
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const dailyUsage = await AIInteraction.countDocuments({
                userId,
                firmId,
                createdAt: { $gte: oneDayAgo },
                status: { $ne: 'blocked' }
            });

            if (dailyUsage >= dailyLimit) {
                return {
                    allowed: false,
                    currentUsage: dailyUsage,
                    limit: dailyLimit,
                    limitType: 'daily',
                    resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
                    message: `Daily rate limit exceeded. Limit: ${dailyLimit} requests per day.`
                };
            }

            return {
                allowed: true,
                currentUsage: {
                    hourly: hourlyUsage,
                    daily: dailyUsage
                },
                limit: {
                    hourly: hourlyLimit,
                    daily: dailyLimit
                },
                remainingToday: dailyLimit - dailyUsage,
                remainingThisHour: hourlyLimit - hourlyUsage
            };
        } catch (error) {
            logger.error('Rate limit check error:', error.message);
            // Fail open (allow request) but log the error
            return {
                allowed: true,
                error: error.message
            };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RESPONSE VALIDATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Validate AI response for accuracy and confidence
     * @param {string} response - AI response
     * @param {string} context - Context type
     * @returns {Object} { valid: boolean, confidenceScore: number, flags: Array }
     */
    static validateResponse(response, context = 'general') {
        const flags = [];
        let confidenceScore = 0.8; // Default confidence

        if (!response || response.length < 10) {
            flags.push({
                type: 'low_confidence',
                severity: 'medium',
                description: 'Response too short or empty'
            });
            confidenceScore = 0.3;
        }

        // Check for uncertainty markers
        const uncertaintyMarkers = [
            'i\'m not sure',
            'i don\'t know',
            'i cannot',
            'i\'m uncertain',
            'might be',
            'could be',
            'possibly',
            'probably',
            'not certain'
        ];

        let uncertaintyCount = 0;
        for (const marker of uncertaintyMarkers) {
            if (response.toLowerCase().includes(marker)) {
                uncertaintyCount++;
            }
        }

        if (uncertaintyCount > 0) {
            flags.push({
                type: 'low_confidence',
                severity: 'low',
                description: `Response contains ${uncertaintyCount} uncertainty marker(s)`
            });
            confidenceScore = Math.max(0.4, confidenceScore - (uncertaintyCount * 0.1));
        }

        // Check for hallucination markers (for legal context)
        if (context === 'legal') {
            const hallucinationMarkers = [
                /article \d+ states/i,
                /according to law \d+/i,
                /section \d+ mandates/i
            ];

            for (const marker of hallucinationMarkers) {
                if (marker.test(response)) {
                    flags.push({
                        type: 'hallucination',
                        severity: 'high',
                        description: 'Response contains specific legal references that should be verified'
                    });
                    confidenceScore *= 0.7;
                }
            }
        }

        // Flag if confidence is too low
        const flaggedAsUncertain = confidenceScore < 0.5;

        return {
            valid: confidenceScore >= 0.3,
            confidenceScore,
            flaggedAsUncertain,
            flags,
            requiresReview: flaggedAsUncertain || flags.some(f => f.severity === 'high')
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // AUDIT LOGGING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Log AI interaction for audit and compliance
     * @param {string} userId - User ID
     * @param {Object} input - Input details
     * @param {Object} output - Output details
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Created interaction log
     */
    static async logAIInteraction(userId, input, output, metadata = {}) {
        try {
            const interaction = await AIInteraction.create({
                userId,
                firmId: metadata.firmId,
                provider: metadata.provider || 'anthropic',
                model: metadata.model || 'unknown',

                input: {
                    original: input.original,
                    sanitized: input.sanitized,
                    tokenCount: input.tokenCount || 0
                },

                output: {
                    original: output.original,
                    filtered: output.filtered,
                    tokenCount: output.tokenCount || 0
                },

                safetyChecks: {
                    inputViolations: input.violations || [],
                    outputViolations: output.violations || [],
                    inputSanitized: input.modified || false,
                    outputFiltered: output.modified || false,
                    safetyScore: this._calculateSafetyScore(
                        input.violations || [],
                        output.violations || []
                    )
                },

                rateLimiting: metadata.rateLimiting || {},

                validation: {
                    confidenceScore: output.confidenceScore || null,
                    flaggedAsUncertain: output.flaggedAsUncertain || false,
                    legalDisclaimerAdded: output.disclaimerAdded || false,
                    contextType: metadata.context || 'general'
                },

                metadata: {
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    sessionId: metadata.sessionId,
                    requestId: metadata.requestId,
                    conversationId: metadata.conversationId
                },

                usage: {
                    totalTokens: (input.tokenCount || 0) + (output.tokenCount || 0),
                    responseTimeMs: metadata.responseTimeMs || 0,
                    cost: metadata.cost || 0
                },

                status: metadata.status || 'success',
                blockedReason: metadata.blockedReason,
                error: metadata.error,

                flaggedForReview: metadata.flaggedForReview || false,
                flaggedReason: metadata.flaggedReason
            });

            // Log critical violations
            const criticalViolations = [
                ...(input.violations || []),
                ...(output.violations || [])
            ].filter(v => v.severity === 'critical');

            if (criticalViolations.length > 0) {
                logger.audit('AI_SAFETY_CRITICAL_VIOLATION', {
                    interactionId: interaction._id,
                    userId,
                    firmId: metadata.firmId,
                    violations: criticalViolations
                });
            }

            return interaction;
        } catch (error) {
            logger.error('Failed to log AI interaction:', error.message);
            // Don't throw - logging failure shouldn't break the flow
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate overall safety score based on violations
     * @private
     */
    static _calculateSafetyScore(inputViolations, outputViolations) {
        let score = 100;

        const allViolations = [...inputViolations, ...outputViolations];

        for (const violation of allViolations) {
            switch (violation.severity) {
                case 'critical':
                    score -= 40;
                    break;
                case 'high':
                    score -= 25;
                    break;
                case 'medium':
                    score -= 10;
                    break;
                case 'low':
                    score -= 5;
                    break;
            }
        }

        return Math.max(0, score);
    }

    /**
     * Get safety statistics for a firm
     * @param {string} firmId - Firm ID
     * @param {number} days - Number of days to analyze
     * @returns {Promise<Object>} Safety statistics
     */
    static async getSafetyStatistics(firmId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const stats = await AIInteraction.aggregate([
                {
                    $match: {
                        firmId: new mongoose.Types.ObjectId(firmId),
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalInteractions: { $sum: 1 },
                        blockedInteractions: {
                            $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] }
                        },
                        filteredInteractions: {
                            $sum: { $cond: ['$safetyChecks.outputFiltered', 1, 0] }
                        },
                        flaggedInteractions: {
                            $sum: { $cond: ['$flaggedForReview', 1, 0] }
                        },
                        avgSafetyScore: { $avg: '$safetyChecks.safetyScore' },
                        totalTokens: { $sum: '$usage.totalTokens' }
                    }
                }
            ]);

            return stats[0] || {
                totalInteractions: 0,
                blockedInteractions: 0,
                filteredInteractions: 0,
                flaggedInteractions: 0,
                avgSafetyScore: 100,
                totalTokens: 0
            };
        } catch (error) {
            logger.error('Error getting safety statistics:', error.message);
            return null;
        }
    }

    /**
     * Check if interaction should be allowed
     * @param {string} userId - User ID
     * @param {string} firmId - Firm ID
     * @param {string} message - User message
     * @returns {Promise<Object>} { allowed: boolean, reason: string, sanitized: string }
     */
    static async validateInteraction(userId, firmId, message) {
        // Check rate limit
        const rateLimitCheck = await this.checkRateLimit(userId, firmId);
        if (!rateLimitCheck.allowed) {
            return {
                allowed: false,
                reason: 'rate_limit_exceeded',
                message: rateLimitCheck.message,
                rateLimitCheck
            };
        }

        // Sanitize input
        const sanitization = this.sanitizeInput(message);
        if (!sanitization.safe) {
            return {
                allowed: false,
                reason: 'safety_violation',
                message: 'Message contains prohibited content',
                violations: sanitization.violations,
                sanitization
            };
        }

        return {
            allowed: true,
            sanitized: sanitization.sanitized,
            violations: sanitization.violations,
            rateLimitCheck,
            sanitization
        };
    }
}

module.exports = AISafetyService;
