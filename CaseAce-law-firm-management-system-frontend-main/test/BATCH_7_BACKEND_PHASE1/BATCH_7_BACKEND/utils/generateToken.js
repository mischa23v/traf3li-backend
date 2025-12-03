const jwt = require('jsonwebtoken');

// Get secrets from environment
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 64) {
  console.error('⚠️  JWT_SECRET must be at least 64 characters');
}

if (!JWT_REFRESH_SECRET || JWT_REFRESH_SECRET.length < 64) {
  console.error('⚠️  JWT_REFRESH_SECRET must be at least 64 characters');
}

/**
 * Generate access token (short-lived)
 * @param {Object} payload - User data
 * @returns {string} - JWT token
 */
function generateAccessToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: '15m', // 15 minutes
    }
  );
}

/**
 * Generate refresh token (long-lived)
 * @param {Object} payload - User data
 * @returns {string} - JWT token
 */
function generateRefreshToken(payload) {
  return jwt.sign(
    {
      userId: payload.userId,
      type: 'refresh',
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: '7d', // 7 days
    }
  );
}

/**
 * Generate both tokens
 * @param {Object} payload - User data
 * @returns {Object} - { accessToken, refreshToken }
 */
function generateTokens(payload) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid
 */
function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify refresh token
 * @param {string} token - JWT token
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid
 */
function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode token without verifying (for inspection)
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded payload or null
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
function isTokenExpired(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (error) {
    return true;
  }
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} - Expiration date or null
 */
function getTokenExpiration(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return null;
    
    return new Date(decoded.exp * 1000);
  } catch (error) {
    return null;
  }
}

/**
 * Set token cookies in response
 * @param {Object} res - Express response object
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 */
function setTokenCookies(res, accessToken, refreshToken) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true, // Cannot be accessed by JavaScript
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds
    path: '/',
  });
  
  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  });
}

/**
 * Clear token cookies
 * @param {Object} res - Express response object
 */
function clearTokenCookies(res) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
}

/**
 * Extract token from request
 * Priority: 1. Cookies, 2. Authorization header
 * @param {Object} req - Express request object
 * @returns {string|null} - Token or null
 */
function extractToken(req) {
  // Try cookies first (HttpOnly - more secure)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }
  
  // Fall back to Authorization header (for API clients)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

/**
 * Extract refresh token from request
 * @param {Object} req - Express request object
 * @returns {string|null} - Token or null
 */
function extractRefreshToken(req) {
  // Try cookies first
  if (req.cookies && req.cookies.refreshToken) {
    return req.cookies.refreshToken;
  }
  
  // Fall back to body (for token refresh endpoint)
  if (req.body && req.body.refreshToken) {
    return req.body.refreshToken;
  }
  
  return null;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  setTokenCookies,
  clearTokenCookies,
  extractToken,
  extractRefreshToken,
};
