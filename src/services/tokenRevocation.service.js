/**
 * Token Revocation Service
 *
 * Provides high-performance token blacklisting using Redis (primary) with MongoDB (backup).
 * Implements a dual-storage strategy for reliability and performance.
 *
 * Architecture:
 * - Redis: Fast in-memory lookups (< 1ms) for active sessions
 * - MongoDB: Persistent storage and audit trail
 *
 * Features:
 * - Individual token revocation
 * - Bulk user token revocation
 * - Fast blacklist checking
 * - Automatic TTL cleanup
 * - Graceful degradation (works even if Redis is down)
 *
 * Security:
 * - Tokens are hashed with SHA-256 before storage
 * - Never stores plaintext tokens
 * - Integrates with audit logging
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const RevokedToken = require('../models/revokedToken.model');
const cacheService = require('./cache.service');
const auditLogService = require('./auditLog.service');
const logger = require('../utils/logger');

const { JWT_SECRET } = process.env;

// Redis key prefixes
const REDIS_PREFIX = 'revoked_token';
const USER_TOKENS_PREFIX = 'user_tokens';

/**
 * Hash a token using SHA-256
 * @param {String} token - JWT token
 * @returns {String} - SHA-256 hash
 */
const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

/**
 * Extract token expiry from JWT
 * @param {String} token - JWT token
 * @returns {Date} - Expiration date
 */
const getTokenExpiry = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    // Default to 7 days if no expiry found
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } catch (error) {
    logger.error('Error decoding token for expiry:', error.message);
    // Default to 7 days if decoding fails
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
};

/**
 * Extract user ID from JWT
 * @param {String} token - JWT token
 * @returns {String|null} - User ID
 */
const getUserIdFromToken = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded?._id || decoded?.userId || null;
  } catch (error) {
    logger.error('Error extracting userId from token:', error.message);
    return null;
  }
};

/**
 * Calculate TTL in seconds until token expiry
 * @param {Date} expiresAt - Expiration date
 * @returns {Number} - TTL in seconds
 */
const calculateTTL = (expiresAt) => {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const ttlMs = expiry - now;
  const ttlSeconds = Math.ceil(ttlMs / 1000);
  return Math.max(ttlSeconds, 0);
};

class TokenRevocationService {
  /**
   * Revoke a single token
   *
   * @param {String} token - JWT token to revoke
   * @param {String} reason - Revocation reason
   * @param {Object} context - Additional context (userId, ipAddress, etc.)
   * @returns {Promise<Object>} - Revocation result
   */
  async revokeToken(token, reason, context = {}) {
    try {
      // Hash the token
      const tokenHash = hashToken(token);

      // Extract token metadata
      const expiresAt = context.expiresAt || getTokenExpiry(token);
      const userId = context.userId || getUserIdFromToken(token);

      // Calculate TTL for Redis
      const ttl = calculateTTL(expiresAt);

      // If token already expired, no need to revoke
      if (ttl <= 0) {
        logger.info('Token already expired, skipping revocation');
        return { success: true, alreadyExpired: true };
      }

      // 1. Add to Redis (primary) - fast lookup
      const redisKey = `${REDIS_PREFIX}:${tokenHash}`;
      await cacheService.set(redisKey, {
        tokenHash,
        userId,
        reason,
        revokedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      }, ttl);

      // 2. Add to MongoDB (backup + audit trail) - parallel operation
      const mongoPromise = RevokedToken.revokeToken({
        tokenHash,
        userId,
        userEmail: context.userEmail || 'unknown',
        firmId: context.firmId,
        reason,
        revokedBy: context.revokedBy,
        revokedAt: new Date(),
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        deviceId: context.deviceId,
        metadata: context.metadata,
        notes: context.notes
      });

      // 3. Log to audit trail - parallel operation
      const auditPromise = auditLogService.log(
        'token_revoked',
        'token',
        null,
        null,
        {
          userId,
          userEmail: context.userEmail,
          firmId: context.firmId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          severity: this._getSeverityForReason(reason),
          details: {
            reason,
            revokedBy: context.revokedBy,
            expiresAt: expiresAt.toISOString(),
            ttl
          }
        }
      );

      // Wait for MongoDB and audit log (don't block on these)
      await Promise.allSettled([mongoPromise, auditPromise]);

      logger.info(`Token revoked successfully. Reason: ${reason}, TTL: ${ttl}s`);

      return {
        success: true,
        tokenHash,
        reason,
        expiresAt,
        ttl
      };
    } catch (error) {
      logger.error('TokenRevocationService.revokeToken error:', error.message);
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user
   *
   * Strategy: Since we don't track all active tokens, we use a timestamp-based approach:
   * 1. Store a "revoke all before {timestamp}" marker in Redis
   * 2. When checking tokens, compare token issue time with marker timestamp
   *
   * @param {String} userId - User ID
   * @param {String} reason - Revocation reason
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} - Revocation result
   */
  async revokeAllUserTokens(userId, reason, context = {}) {
    try {
      const revokedAt = new Date();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const ttl = calculateTTL(expiresAt);

      // 1. Store revocation marker in Redis
      const redisKey = `${USER_TOKENS_PREFIX}:${userId}:revoke_all`;
      await cacheService.set(redisKey, {
        userId,
        reason,
        revokedAt: revokedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      }, ttl);

      // 2. Record in MongoDB (audit trail) - parallel
      const mongoPromise = RevokedToken.revokeAllUserTokens(userId, reason, {
        userEmail: context.userEmail,
        firmId: context.firmId,
        revokedBy: context.revokedBy,
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: context.metadata
      });

      // 3. Log to audit trail - parallel
      const auditPromise = auditLogService.log(
        'revoke_all_tokens',
        'user',
        userId,
        null,
        {
          userId,
          userEmail: context.userEmail,
          firmId: context.firmId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          severity: this._getSeverityForReason(reason),
          details: {
            reason,
            revokedBy: context.revokedBy,
            revokedAt: revokedAt.toISOString(),
            expiresAt: expiresAt.toISOString()
          }
        }
      );

      // Wait for parallel operations
      await Promise.allSettled([mongoPromise, auditPromise]);

      logger.info(`All tokens revoked for user ${userId}. Reason: ${reason}`);

      return {
        success: true,
        userId,
        reason,
        revokedAt,
        expiresAt
      };
    } catch (error) {
      logger.error('TokenRevocationService.revokeAllUserTokens error:', error.message);
      throw error;
    }
  }

  /**
   * Check if a token is revoked
   *
   * Performance-critical method - optimized for speed:
   * 1. Check Redis first (< 1ms)
   * 2. Fallback to MongoDB if Redis unavailable
   * 3. Check user-level "revoke all" markers
   *
   * @param {String} token - JWT token to check
   * @returns {Promise<Boolean>} - True if revoked
   */
  async isTokenRevoked(token) {
    try {
      // Hash the token
      const tokenHash = hashToken(token);

      // Extract userId and issue time for "revoke all" check
      let userId = null;
      let tokenIssuedAt = null;
      try {
        const decoded = jwt.decode(token);
        userId = decoded?._id || decoded?.userId;
        tokenIssuedAt = decoded?.iat ? new Date(decoded.iat * 1000) : null;
      } catch (error) {
        logger.error('Error decoding token:', error.message);
      }

      // 1. Check individual token revocation in Redis
      const redisKey = `${REDIS_PREFIX}:${tokenHash}`;
      const redisResult = await cacheService.get(redisKey);

      if (redisResult) {
        logger.info('Token found in Redis blacklist');
        return true;
      }

      // 2. Check user-level "revoke all" marker in Redis
      if (userId) {
        const userRevokeKey = `${USER_TOKENS_PREFIX}:${userId}:revoke_all`;
        const userRevokeMarker = await cacheService.get(userRevokeKey);

        if (userRevokeMarker && tokenIssuedAt) {
          const revokedAt = new Date(userRevokeMarker.revokedAt);
          // If token was issued before the "revoke all" timestamp, it's revoked
          if (tokenIssuedAt < revokedAt) {
            logger.info('Token revoked by user-level revoke_all marker');
            return true;
          }
        }
      }

      // 3. Fallback to MongoDB (if Redis is down or cache miss)
      const mongoResult = await RevokedToken.isRevoked(tokenHash);

      if (mongoResult) {
        logger.info('Token found in MongoDB blacklist (cache miss)');

        // Backfill Redis cache for future lookups
        const expiresAt = getTokenExpiry(token);
        const ttl = calculateTTL(expiresAt);
        if (ttl > 0) {
          await cacheService.set(redisKey, {
            tokenHash,
            userId,
            backfilled: true
          }, ttl);
        }

        return true;
      }

      // Token is not revoked
      return false;
    } catch (error) {
      logger.error('TokenRevocationService.isTokenRevoked error:', error.message);

      // SECURITY: On error, fail close (reject token to prevent revoked tokens from being accepted)
      // This prevents revoked tokens from being accepted if Redis/MongoDB is down
      // While this may temporarily block valid users during outages, it's safer than
      // allowing potentially compromised tokens through
      logger.warn('⚠️ WARNING: Token revocation check failed, treating token as revoked (fail-close) for security');
      return true;
    }
  }

  /**
   * Clean up expired tokens from MongoDB
   *
   * Note: Redis handles expiry automatically via TTL
   * MongoDB TTL index also handles this, but this method can be used for manual cleanup
   *
   * @returns {Promise<Number>} - Number of deleted tokens
   */
  async cleanupExpiredTokens() {
    try {
      const deletedCount = await RevokedToken.cleanupExpired();
      logger.info(`Cleaned up ${deletedCount} expired revoked tokens from MongoDB`);
      return deletedCount;
    } catch (error) {
      logger.error('TokenRevocationService.cleanupExpiredTokens error:', error.message);
      return 0;
    }
  }

  /**
   * Get revocation history for a user
   *
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Revocation history
   */
  async getUserRevocations(userId, options = {}) {
    try {
      return await RevokedToken.getUserRevocations(userId, options);
    } catch (error) {
      logger.error('TokenRevocationService.getUserRevocations error:', error.message);
      return [];
    }
  }

  /**
   * Get recent revocations (admin view)
   *
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} - Recent revocations
   */
  async getRecentRevocations(filters = {}) {
    try {
      return await RevokedToken.getRecentRevocations(filters);
    } catch (error) {
      logger.error('TokenRevocationService.getRecentRevocations error:', error.message);
      return [];
    }
  }

  /**
   * Get revocation statistics
   *
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} - Statistics
   */
  async getStats(filters = {}) {
    try {
      return await RevokedToken.getStats(filters);
    } catch (error) {
      logger.error('TokenRevocationService.getStats error:', error.message);
      return { total: 0, byReason: {} };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Determine audit log severity based on revocation reason
   * @private
   */
  _getSeverityForReason(reason) {
    const severityMap = {
      logout: 'low',
      logout_all: 'medium',
      password_change: 'medium',
      security_incident: 'critical',
      admin_revoke: 'high',
      account_suspended: 'high',
      account_deleted: 'high',
      token_expired: 'low',
      session_timeout: 'low',
      role_change: 'medium',
      permissions_change: 'medium'
    };

    return severityMap[reason] || 'medium';
  }

  /**
   * Verify token signature (utility method)
   * @param {String} token - JWT token
   * @returns {Object|null} - Decoded token or null if invalid
   */
  verifyTokenSignature(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logger.error('Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Hash token (exposed as utility)
   * @param {String} token - JWT token
   * @returns {String} - SHA-256 hash
   */
  hashToken(token) {
    return hashToken(token);
  }
}

// Export singleton instance
module.exports = new TokenRevocationService();
