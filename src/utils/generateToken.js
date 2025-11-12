const jwt = require('jsonwebtoken');

/**
 * Token generation utilities for dual-token authentication
 * 
 * Access Token: Short-lived (15 min), contains user info
 * Refresh Token: Long-lived (7 days), used to get new access token
 * 
 * CRITICAL: Set these in .env:
 * - JWT_SECRET (64+ characters)
 * - JWT_REFRESH_SECRET (different 64+ characters)
 */

/**
 * Get JWT secrets from environment
 * Falls back to default for development (NEVER use in production)
 */
const getSecrets = () => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  
  if (!jwtSecret || !jwtRefreshSecret) {
    console.warn('⚠️  WARNING: JWT secrets not set in environment variables!');
    console.warn('⚠️  Using default secrets - DO NOT use in production!');
  }
  
  return {
    accessSecret: jwtSecret || 'default-jwt-secret-do-not-use-in-production-change-this-immediately',
    refreshSecret: jwtRefreshSecret || 'default-refresh-secret-do-not-use-in-production-change-this-now',
  };
};

/**
 * Generate access token (short-lived)
 * @param {object} user - User object from database
 * @returns {string} - JWT access token
 */
const generateAccessToken = (user) => {
  try {
    const { accessSecret } = getSecrets();
    
    const payload = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      // Don't include sensitive data in token
    };
    
    const options = {
      expiresIn: '15m', // 15 minutes
      issuer: 'traf3li',
      audience: 'traf3li-users',
    };
    
    return jwt.sign(payload, accessSecret, options);
  } catch (error) {
    console.error('❌ Access token generation failed:', error.message);
    throw new Error('Token generation failed');
  }
};

/**
 * Generate refresh token (long-lived)
 * @param {object} user - User object from database
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (user) => {
  try {
    const { refreshSecret } = getSecrets();
    
    const payload = {
      id: user._id.toString(),
      // Refresh token contains minimal info for security
    };
    
    const options = {
      expiresIn: '7d', // 7 days
      issuer: 'traf3li',
      audience: 'traf3li-users',
    };
    
    return jwt.sign(payload, refreshSecret, options);
  } catch (error) {
    console.error('❌ Refresh token generation failed:', error.message);
    throw new Error('Token generation failed');
  }
};

/**
 * Verify access token
 * @param {string} token - JWT access token
 * @returns {object} - Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    const { accessSecret } = getSecrets();
    
    const options = {
      issuer: 'traf3li',
      audience: 'traf3li-users',
    };
    
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
 * @returns {object} - { accessToken, refreshToken }
 */
const generateTokenPair = (user) => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
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
};
