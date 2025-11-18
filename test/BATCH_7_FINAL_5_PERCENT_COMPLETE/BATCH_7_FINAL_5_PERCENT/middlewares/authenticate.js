const { verifyAccessToken, extractToken } = require('../utils/generateToken');
const User = require('../models/user.model');

/**
 * Enhanced authentication middleware
 * Supports dual-token system with HttpOnly cookies
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from cookies or Authorization header
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login.',
      });
    }

    // Verify access token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.message === 'Access token expired') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED',
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.',
      });
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    // Check if user is active (not banned)
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed.',
      error: error.message,
    });
  }
};

/**
 * Role-based authorization middleware
 * Usage: authorize(['admin', 'lawyer'])
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        requiredRole: allowedRoles,
        yourRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user to req if token exists, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return next();
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password');

    if (user && !user.isBanned) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignore errors, just continue without user
    next();
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};
