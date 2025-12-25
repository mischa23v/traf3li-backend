/**
 * CSRF Token Service
 *
 * Provides CSRF token generation and validation using crypto.randomBytes.
 * Stores tokens in Redis with short TTL for security.
 * Supports token rotation on each use for enhanced security.
 *
 * Features:
 * - Cryptographically secure token generation (32 bytes)
 * - Redis storage with configurable TTL
 * - Automatic token rotation after validation
 * - Session-based token management
 * - Graceful degradation if Redis unavailable
 */

const crypto = require('crypto');
const { getRedisClient, isRedisConnected, setWithExpiry, getValue, deleteKey } = require('../configs/redis');
const logger = require('../utils/logger');

class CSRFService {
    constructor() {
        // Get configuration from environment
        this.enabled = process.env.ENABLE_CSRF_PROTECTION === 'true';
        this.tokenTTL = parseInt(process.env.CSRF_TOKEN_TTL || '3600', 10); // Default 1 hour
        this.tokenLength = 32; // 32 bytes = 64 hex characters
        this.keyPrefix = 'csrf:';

        // In-memory fallback for when Redis is unavailable
        this.memoryStore = new Map();

        // Auto-cleanup memory store every 5 minutes
        if (this.enabled) {
            setInterval(() => this._cleanupMemoryStore(), 5 * 60 * 1000);
        }
    }

    /**
     * Check if CSRF protection is enabled
     * @returns {boolean}
     */
    isEnabled() {
        return this.enabled;
    }

    /**
     * Generate a cryptographically secure CSRF token
     * @param {string} sessionId - Session identifier (user ID or session token hash)
     * @returns {Promise<Object>} Token data with token string and metadata
     */
    async generateCSRFToken(sessionId) {
        try {
            if (!this.enabled) {
                logger.debug('CSRF protection is disabled');
                return {
                    token: null,
                    expiresAt: null,
                    enabled: false
                };
            }

            if (!sessionId) {
                throw new Error('Session ID is required to generate CSRF token');
            }

            // Generate cryptographically secure random token
            const tokenBytes = crypto.randomBytes(this.tokenLength);
            const token = tokenBytes.toString('hex');

            // Calculate expiration
            const expiresAt = new Date(Date.now() + this.tokenTTL * 1000);

            // Token metadata
            const tokenData = {
                token,
                sessionId,
                createdAt: new Date().toISOString(),
                expiresAt: expiresAt.toISOString(),
                used: false
            };

            // Store token in Redis or memory
            const key = this._getRedisKey(sessionId, token);

            try {
                if (isRedisConnected()) {
                    await setWithExpiry(key, tokenData, this.tokenTTL);
                    logger.debug('CSRF token stored in Redis', { sessionId, tokenPrefix: token.substring(0, 8) });
                } else {
                    // Fallback to memory store
                    this._setInMemory(key, tokenData, this.tokenTTL);
                    logger.warn('Redis unavailable, using memory store for CSRF token', { sessionId });
                }
            } catch (storageError) {
                logger.error('Failed to store CSRF token, using memory fallback', {
                    error: storageError.message,
                    sessionId
                });
                this._setInMemory(key, tokenData, this.tokenTTL);
            }

            return {
                token,
                expiresAt,
                enabled: true,
                ttl: this.tokenTTL
            };
        } catch (error) {
            logger.error('Failed to generate CSRF token', {
                error: error.message,
                sessionId
            });
            throw error;
        }
    }

    /**
     * Validate CSRF token and optionally rotate it
     * @param {string} token - CSRF token to validate
     * @param {string} sessionId - Session identifier
     * @param {Object} options - Validation options
     * @param {boolean} options.rotate - Whether to rotate token after validation (default: true)
     * @returns {Promise<Object>} Validation result with new token if rotated
     */
    async validateCSRFToken(token, sessionId, options = {}) {
        try {
            if (!this.enabled) {
                return {
                    valid: true,
                    message: 'CSRF protection disabled',
                    newToken: null
                };
            }

            if (!token || !sessionId) {
                return {
                    valid: false,
                    message: 'Missing CSRF token or session ID',
                    messageAr: 'رمز CSRF أو معرف الجلسة مفقود',
                    code: 'CSRF_MISSING'
                };
            }

            // Validate token format (should be hex string of correct length)
            const expectedLength = this.tokenLength * 2; // hex is 2 chars per byte
            if (token.length !== expectedLength || !/^[0-9a-f]+$/i.test(token)) {
                return {
                    valid: false,
                    message: 'Invalid CSRF token format',
                    messageAr: 'تنسيق رمز CSRF غير صالح',
                    code: 'CSRF_INVALID_FORMAT'
                };
            }

            // Retrieve token data
            const key = this._getRedisKey(sessionId, token);
            let tokenData = null;

            try {
                if (isRedisConnected()) {
                    tokenData = await getValue(key, true);
                } else {
                    tokenData = this._getFromMemory(key);
                }
            } catch (retrievalError) {
                logger.warn('Failed to retrieve CSRF token from Redis, checking memory', {
                    error: retrievalError.message,
                    sessionId
                });
                tokenData = this._getFromMemory(key);
            }

            if (!tokenData) {
                return {
                    valid: false,
                    message: 'CSRF token not found or expired',
                    messageAr: 'رمز CSRF غير موجود أو منتهي الصلاحية',
                    code: 'CSRF_NOT_FOUND'
                };
            }

            // Check if token was already used (prevents replay attacks)
            if (tokenData.used) {
                logger.warn('CSRF token reuse detected', { sessionId, tokenPrefix: token.substring(0, 8) });
                return {
                    valid: false,
                    message: 'CSRF token already used',
                    messageAr: 'تم استخدام رمز CSRF بالفعل',
                    code: 'CSRF_ALREADY_USED'
                };
            }

            // Check expiration
            const expiresAt = new Date(tokenData.expiresAt);
            if (expiresAt < new Date()) {
                // Clean up expired token
                await this._deleteToken(key);
                return {
                    valid: false,
                    message: 'CSRF token expired',
                    messageAr: 'انتهت صلاحية رمز CSRF',
                    code: 'CSRF_EXPIRED'
                };
            }

            // Verify session ID matches
            if (tokenData.sessionId !== sessionId) {
                logger.warn('CSRF token session mismatch', {
                    expectedSession: sessionId,
                    tokenSession: tokenData.sessionId
                });
                return {
                    valid: false,
                    message: 'CSRF token session mismatch',
                    messageAr: 'عدم تطابق جلسة رمز CSRF',
                    code: 'CSRF_SESSION_MISMATCH'
                };
            }

            // Token is valid
            const rotate = options.rotate !== false; // Default to true
            let newToken = null;

            if (rotate) {
                // Mark current token as used
                tokenData.used = true;
                await this._updateToken(key, tokenData);

                // Generate new token for next request
                const rotationResult = await this.generateCSRFToken(sessionId);
                newToken = rotationResult.token;

                logger.debug('CSRF token validated and rotated', {
                    sessionId,
                    oldTokenPrefix: token.substring(0, 8),
                    newTokenPrefix: newToken.substring(0, 8)
                });
            } else {
                logger.debug('CSRF token validated without rotation', {
                    sessionId,
                    tokenPrefix: token.substring(0, 8)
                });
            }

            return {
                valid: true,
                message: 'CSRF token valid',
                newToken,
                rotated: rotate
            };
        } catch (error) {
            logger.error('CSRF token validation error', {
                error: error.message,
                sessionId
            });
            return {
                valid: false,
                message: 'CSRF validation failed',
                messageAr: 'فشل التحقق من CSRF',
                code: 'CSRF_VALIDATION_ERROR',
                error: error.message
            };
        }
    }

    /**
     * Invalidate all CSRF tokens for a session
     * @param {string} sessionId - Session identifier
     * @returns {Promise<void>}
     */
    async invalidateSessionTokens(sessionId) {
        try {
            if (!this.enabled || !sessionId) {
                return;
            }

            // In a production system with many tokens, you'd want to use Redis SCAN
            // For now, we'll rely on TTL expiration
            // TODO: Implement pattern-based deletion for Redis keys matching session

            logger.debug('CSRF tokens invalidated for session', { sessionId });
        } catch (error) {
            logger.error('Failed to invalidate CSRF tokens', {
                error: error.message,
                sessionId
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate Redis key for CSRF token
     * @private
     */
    _getRedisKey(sessionId, token) {
        return `${this.keyPrefix}${sessionId}:${token}`;
    }

    /**
     * Store token in memory (fallback)
     * @private
     */
    _setInMemory(key, data, ttlSeconds) {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.memoryStore.set(key, {
            data,
            expiresAt
        });
    }

    /**
     * Get token from memory
     * @private
     */
    _getFromMemory(key) {
        const entry = this.memoryStore.get(key);
        if (!entry) return null;

        // Check expiration
        if (entry.expiresAt < Date.now()) {
            this.memoryStore.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Delete token from storage
     * @private
     */
    async _deleteToken(key) {
        try {
            if (isRedisConnected()) {
                await deleteKey(key);
            }
            this.memoryStore.delete(key);
        } catch (error) {
            logger.warn('Failed to delete CSRF token', { error: error.message });
        }
    }

    /**
     * Update token in storage
     * @private
     */
    async _updateToken(key, tokenData) {
        try {
            if (isRedisConnected()) {
                await setWithExpiry(key, tokenData, this.tokenTTL);
            } else {
                this._setInMemory(key, tokenData, this.tokenTTL);
            }
        } catch (error) {
            logger.warn('Failed to update CSRF token', { error: error.message });
            this._setInMemory(key, tokenData, this.tokenTTL);
        }
    }

    /**
     * Clean up expired tokens from memory store
     * @private
     */
    _cleanupMemoryStore() {
        const now = Date.now();
        let cleanedCount = 0;

        for (const [key, entry] of this.memoryStore.entries()) {
            if (entry.expiresAt < now) {
                this.memoryStore.delete(key);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.debug('Cleaned up expired CSRF tokens from memory', { count: cleanedCount });
        }
    }
}

// Export singleton instance
module.exports = new CSRFService();
