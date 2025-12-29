const jwt = require('jsonwebtoken');
const logger = require('./logger');
const keyRotationService = require('../services/keyRotation.service');
const customClaimsService = require('../services/customClaims.service');

/**
 * Token generation utilities for dual-token authentication with optional key rotation
 *
 * Access Token: Short-lived (15 min), contains user info
 * Refresh Token: Long-lived (7 days), used to get new access token
 *
 * CRITICAL: Set these in .env:
 * - JWT_SECRET (64+ characters) - Used when key rotation is disabled
 * - JWT_REFRESH_SECRET (different 64+ characters)
 *
 * OPTIONAL - JWT Key Rotation:
 * - ENABLE_JWT_KEY_ROTATION (true/false)
 * - JWT_SIGNING_KEYS (JSON array of key objects)
 * - JWT_KEY_ROTATION_INTERVAL (days, default: 30)
 * - JWT_KEY_ROTATION_GRACE_PERIOD (days, default: 7)
 * - JWT_KEYS_STORAGE (env|redis, default: env)
 */

// Initialize key rotation service (async, non-blocking)
keyRotationService.initialize().catch(err => {
  logger.error('Key rotation service initialization failed:', err.message);
});

/**
 * Get JWT secrets from environment or key rotation service
 * Supports both legacy single-key mode and new key rotation mode
 * Throws error if secrets are not set (security requirement)
 */
const getSecrets = () => {
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtRefreshSecret) {
    throw new Error(
      'JWT_REFRESH_SECRET is not set in environment variables. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Check if key rotation is enabled
  if (keyRotationService.isEnabled()) {
    const currentKey = keyRotationService.getCurrentKey();

    if (!currentKey || !currentKey.secret) {
      throw new Error('Key rotation is enabled but no active signing key found');
    }

    return {
      accessSecret: currentKey.secret,
      accessKeyId: currentKey.kid, // Include key ID for token header
      refreshSecret: jwtRefreshSecret,
    };
  }

  // Legacy mode: use JWT_SECRET from environment
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET is not set in environment variables. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return {
    accessSecret: jwtSecret,
    accessKeyId: null, // No key ID in legacy mode
    refreshSecret: jwtRefreshSecret,
  };
};

/**
 * Validate JWT secrets meet security requirements
 * Called during startup to fail fast if secrets are insufficient
 */
const validateSecrets = () => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret) {
    throw new Error(
      'JWT_SECRET is not set. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (!jwtRefreshSecret) {
    throw new Error(
      'JWT_REFRESH_SECRET is not set. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  if (jwtRefreshSecret.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long');
  }

  if (jwtSecret === jwtRefreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  return true;
};

/**
 * Generate access token (short-lived)
 * Supports key rotation with 'kid' (Key ID) in JWT header
 * Now includes custom claims following Supabase pattern
 * @param {object} user - User object from database
 * @param {object} context - Additional context for claims (firm, permissions, etc.)
 * @returns {Promise<string>} - JWT access token
 */
const generateAccessToken = async (user, context = {}) => {
  try {
    const { accessSecret, accessKeyId } = getSecrets();

    // Check if user is anonymous
    const isAnonymous = user.isAnonymous === true;

    // Base payload with legacy fields for backward compatibility
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      is_anonymous: isAnonymous, // Supabase-style claim
      // Don't include sensitive data in token
    };

    // Get custom claims (Supabase-style)
    // This includes standard claims + user custom claims + firm claims + dynamic claims
    try {
      const customClaims = await customClaimsService.getCustomClaims(user, context);

      // Merge custom claims into payload
      // Custom claims take precedence but won't override JWT standard claims (iss, exp, etc.)
      Object.assign(payload, customClaims);
    } catch (claimsError) {
      // For users with firmId, custom claims are REQUIRED for tenant isolation
      // Solo lawyers without firmId can proceed with basic claims
      if (user.firmId) {
        logger.error('CRITICAL: Custom claims failed for firm user - cannot generate token:', claimsError.message);
        throw new Error('Token generation failed: custom claims required for firm users');
      }

      // Solo lawyers can proceed with basic payload + essential claims
      logger.warn('Custom claims failed for solo user, using basic payload:', claimsError.message);

      // Add essential solo lawyer claims manually
      payload.is_solo_lawyer = true;
      payload.firm_id = null;
      payload.user_id = user._id.toString();
    }

    // SECURITY: Anonymous users get 24-hour access tokens (vs 15 min for normal users)
    // This is acceptable because:
    // 1. Anonymous users have 'client' role with minimal permissions (no access to sensitive data)
    // 2. They cannot access any firm data, cases, invoices, or confidential information
    // 3. The longer expiry reduces friction for guest users exploring the platform
    // 4. Anonymous accounts are temporary and have no persistent sensitive data
    const expiresIn = isAnonymous ? '24h' : '15m';

    const options = {
      expiresIn,
      issuer: 'traf3li',
      audience: 'traf3li-users',
      algorithm: 'HS256',
    };

    // Add 'kid' (Key ID) to header if key rotation is enabled
    if (accessKeyId) {
      options.keyid = accessKeyId;
    }

    return jwt.sign(payload, accessSecret, options);
  } catch (error) {
    logger.error('Access token generation failed:', error.message);
    throw new Error('Token generation failed');
  }
};

/**
 * Generate refresh token (long-lived)
 * @param {object} user - User object from database
 * @param {object} options - Token options
 * @param {boolean} options.rememberMe - If true, extends token to 30 days
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (user, options = {}) => {
  try {
    const { refreshSecret } = getSecrets();
    const { rememberMe = false } = options;

    // Configurable durations via environment variables (default: 7 days / 30 days)
    const normalDays = parseInt(process.env.REFRESH_TOKEN_DAYS || '7', 10);
    const rememberMeDays = parseInt(process.env.REMEMBER_ME_DAYS || '30', 10);

    const payload = {
      id: user._id.toString(),
      // Refresh token contains minimal info for security
    };

    const tokenOptions = {
      // Use configurable durations for enterprise flexibility
      expiresIn: rememberMe ? `${rememberMeDays}d` : `${normalDays}d`,
      issuer: 'traf3li',
      audience: 'traf3li-users',
      algorithm: 'HS256',
    };

    return jwt.sign(payload, refreshSecret, tokenOptions);
  } catch (error) {
    logger.error('Refresh token generation failed:', error.message);
    throw new Error('Token generation failed');
  }
};

/**
 * Verify access token
 * Supports key rotation by trying multiple keys
 * @param {string} token - JWT access token
 * @returns {object} - Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    const options = {
      issuer: 'traf3li',
      audience: 'traf3li-users',
      algorithms: ['HS256'],
    };

    // If key rotation is enabled, try to verify with appropriate key
    if (keyRotationService.isEnabled()) {
      // Decode token header to get 'kid' (without verification)
      const decoded = jwt.decode(token, { complete: true });
      const kid = decoded?.header?.kid;

      // Get all active keys (current + deprecated but not expired)
      const activeKeys = keyRotationService.getAllActiveKeys();

      // If token has kid, try that key first
      if (kid) {
        const key = keyRotationService.getKeyById(kid);
        if (key && key.secret) {
          try {
            return jwt.verify(token, key.secret, options);
          } catch (err) {
            // If verification fails with specified key, try others
            logger.warn(`Token verification failed with specified key ${kid}, trying other keys...`);
          }
        }
      }

      // Try all active keys (for tokens without kid or when specified key failed)
      let lastError = null;
      for (const key of activeKeys) {
        try {
          return jwt.verify(token, key.secret, options);
        } catch (err) {
          lastError = err;
          // Continue to next key
        }
      }

      // If we get here, none of the keys worked
      if (lastError) {
        throw lastError;
      }
      throw new Error('No valid signing key found');
    }

    // Legacy mode: use single JWT_SECRET
    const { accessSecret } = getSecrets();
    return jwt.verify(token, accessSecret, options);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('INVALID_TOKEN');
    }
    throw new Error('TOKEN_VERIFICATION_FAILED');
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT refresh token
 * @returns {object} - Decoded token payload
 */
const verifyRefreshToken = (token) => {
  try {
    const { refreshSecret } = getSecrets();
    
    const options = {
      issuer: 'traf3li',
      audience: 'traf3li-users',
      algorithms: ['HS256'],
    };

    return jwt.verify(token, refreshSecret, options);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('REFRESH_TOKEN_EXPIRED');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
    throw new Error('REFRESH_TOKEN_VERIFICATION_FAILED');
  }
};

/**
 * Generate both tokens at once (for login)
 * @param {object} user - User object from database
 * @param {object} context - Additional context for custom claims
 * @param {object} options - Token options
 * @param {boolean} options.rememberMe - If true, extends refresh token to 30 days
 * @returns {Promise<object>} - { accessToken, refreshToken }
 */
const generateTokenPair = async (user, context = {}, options = {}) => {
  return {
    accessToken: await generateAccessToken(user, context),
    refreshToken: generateRefreshToken(user, options),
  };
};

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {object} - Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiration date or null if invalid
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
const isTokenExpired = (token) => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  return expiration < new Date();
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  validateSecrets,
  keyRotationService, // Export for manual key rotation operations
};
