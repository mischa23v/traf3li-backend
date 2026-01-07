const { verifyAccessToken, decodeToken, getTokenExpiration } = require('../utils/generateToken');
const logger = require('../utils/logger');
const User = require('../models/user.model');

/**
 * Token Expiry Check Interval (milliseconds)
 * SECURITY: Check token validity every 60 seconds for long-lived connections
 * Gold Standard: AWS AppSync, Firebase Realtime Database pattern
 */
const TOKEN_CHECK_INTERVAL = 60 * 1000; // 60 seconds

/**
 * Socket.io Authentication Middleware
 *
 * Verifies JWT token and attaches user data to socket
 * CRITICAL: This prevents unauthorized socket connections
 *
 * Security Features:
 * - JWT token verification from handshake auth
 * - User existence validation
 * - FirmId extraction and validation
 * - Automatic firm room joining for multi-tenant isolation
 *
 * Usage in socket.io:
 * io.use(socketAuthMiddleware);
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    // Extract token from handshake auth or query
    // Supports both formats:
    // 1. socket.handshake.auth.token (recommended)
    // 2. socket.handshake.query.token (fallback for older clients)
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.warn('Socket connection rejected: No token provided', {
        socketId: socket.id,
        origin: socket.handshake.headers.origin
      });
      return next(new Error('AUTHENTICATION_REQUIRED'));
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      logger.warn('Socket connection rejected: Invalid token', {
        socketId: socket.id,
        error: error.message
      });
      return next(new Error('INVALID_TOKEN'));
    }

    // Validate decoded token has required fields
    if (!decoded || !decoded.id) {
      logger.warn('Socket connection rejected: Invalid token payload', {
        socketId: socket.id
      });
      return next(new Error('INVALID_TOKEN'));
    }

    // Fetch user from database to ensure they still exist and are active
    const user = await User.findById(decoded.id)
      .select('_id email role firmId isActive permissions')
      .lean();

    if (!user) {
      logger.warn('Socket connection rejected: User not found', {
        socketId: socket.id,
        userId: decoded.id
      });
      return next(new Error('USER_NOT_FOUND'));
    }

    // Check if user is active
    if (user.isActive === false) {
      logger.warn('Socket connection rejected: User account disabled', {
        socketId: socket.id,
        userId: user._id
      });
      return next(new Error('USER_DISABLED'));
    }

    // Attach authenticated user data to socket
    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    socket.userRole = user.role;
    socket.firmId = user.firmId ? user.firmId.toString() : null;
    socket.permissions = user.permissions || [];
    socket.authenticated = true;

    // SECURITY: Store token expiry for periodic validation
    // Gold Standard: AWS AppSync, Firebase pattern - validate throughout connection lifetime
    const tokenExpiry = getTokenExpiration(token);
    socket.tokenExpiry = tokenExpiry;
    socket.authToken = token; // Store for re-validation

    // Set up periodic token expiry check
    socket.tokenCheckInterval = setInterval(async () => {
      try {
        // Check if token has expired
        if (socket.tokenExpiry && new Date() >= socket.tokenExpiry) {
          logger.warn('Socket token expired, disconnecting', {
            socketId: socket.id,
            userId: socket.userId,
            expiredAt: socket.tokenExpiry
          });
          socket.emit('auth:token_expired', {
            message: 'Your session has expired. Please refresh to continue.',
            code: 'TOKEN_EXPIRED'
          });
          socket.disconnect(true);
          return;
        }

        // Re-verify token is still valid (not revoked)
        try {
          verifyAccessToken(socket.authToken);
        } catch (verifyError) {
          logger.warn('Socket token invalid on periodic check', {
            socketId: socket.id,
            userId: socket.userId,
            error: verifyError.message
          });
          socket.emit('auth:token_invalid', {
            message: 'Your session is no longer valid. Please log in again.',
            code: 'TOKEN_INVALID'
          });
          socket.disconnect(true);
          return;
        }
      } catch (error) {
        logger.error('Token check interval error:', {
          socketId: socket.id,
          error: error.message
        });
      }
    }, TOKEN_CHECK_INTERVAL);

    // Clean up interval on disconnect
    socket.on('disconnect', () => {
      if (socket.tokenCheckInterval) {
        clearInterval(socket.tokenCheckInterval);
        socket.tokenCheckInterval = null;
      }
    });

    // SECURITY: Automatically join user's firm room for scoped broadcasting
    // This ensures all broadcasts are isolated by firmId
    if (socket.firmId) {
      socket.join(`firm:${socket.firmId}`);
      logger.debug('Socket auto-joined firm room', {
        socketId: socket.id,
        userId: socket.userId,
        firmId: socket.firmId
      });
    }

    // Join user's personal notification room
    socket.join(`user:${socket.userId}`);

    // SECURITY: Allow clients to refresh their token without disconnecting
    // Gold Standard: AWS AppSync token refresh pattern
    socket.on('auth:refresh_token', async (newToken, callback) => {
      try {
        if (!newToken || typeof newToken !== 'string') {
          if (callback) callback({ success: false, error: 'Invalid token provided' });
          return;
        }

        // Verify the new token
        let newDecoded;
        try {
          newDecoded = verifyAccessToken(newToken);
        } catch (verifyError) {
          logger.warn('Socket token refresh failed - invalid token', {
            socketId: socket.id,
            userId: socket.userId,
            error: verifyError.message
          });
          if (callback) callback({ success: false, error: 'Invalid token' });
          return;
        }

        // Ensure token belongs to the same user
        if (newDecoded.id !== socket.userId) {
          logger.warn('Socket token refresh rejected - user mismatch', {
            socketId: socket.id,
            currentUser: socket.userId,
            tokenUser: newDecoded.id
          });
          if (callback) callback({ success: false, error: 'User mismatch' });
          return;
        }

        // Update socket with new token
        socket.authToken = newToken;
        socket.tokenExpiry = getTokenExpiration(newToken);

        logger.info('Socket token refreshed successfully', {
          socketId: socket.id,
          userId: socket.userId,
          newExpiry: socket.tokenExpiry
        });

        if (callback) callback({ success: true, expiresAt: socket.tokenExpiry });
      } catch (error) {
        logger.error('Socket token refresh error:', {
          socketId: socket.id,
          error: error.message
        });
        if (callback) callback({ success: false, error: 'Refresh failed' });
      }
    });

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: socket.userId,
      firmId: socket.firmId,
      role: socket.userRole,
      tokenExpiry: socket.tokenExpiry
    });

    next();
  } catch (error) {
    logger.error('Socket authentication error:', {
      socketId: socket.id,
      error: error.message,
      stack: error.stack
    });
    return next(new Error('AUTHENTICATION_FAILED'));
  }
};

/**
 * Helper function to verify socket has required permission
 * Use this within socket event handlers to check permissions
 *
 * @param {Socket} socket - Socket.io socket instance
 * @param {String} permission - Required permission (e.g., 'cases.read', 'documents.write')
 * @returns {Boolean} - True if user has permission
 */
const hasSocketPermission = (socket, permission) => {
  // Admin has all permissions
  if (socket.userRole === 'admin') {
    return true;
  }

  // Check if user has the specific permission
  if (socket.permissions && Array.isArray(socket.permissions)) {
    return socket.permissions.includes(permission);
  }

  return false;
};

/**
 * Verify socket belongs to the same firm as the resource
 * CRITICAL: Prevents cross-firm data access
 *
 * @param {Socket} socket - Socket.io socket instance
 * @param {String} resourceFirmId - FirmId of the resource being accessed
 * @returns {Boolean} - True if socket's firmId matches resource's firmId
 */
const verifySocketFirmAccess = (socket, resourceFirmId) => {
  // System admins without firmId can access all (rare case)
  if (socket.userRole === 'admin' && !socket.firmId) {
    return true;
  }

  // Normal users: must match firmId
  if (!socket.firmId || !resourceFirmId) {
    return false;
  }

  return socket.firmId === resourceFirmId.toString();
};

/**
 * Verify resource access with database lookup
 * Checks both firmId and user permissions for the resource
 *
 * @param {Socket} socket - Socket.io socket instance
 * @param {String} modelName - Mongoose model name (e.g., 'Case', 'Task')
 * @param {String} resourceId - Resource ID to check
 * @returns {Promise<Object|null>} - Resource if accessible, null otherwise
 */
const verifySocketResourceAccess = async (socket, modelName, resourceId) => {
  try {
    const mongoose = require('mongoose');

    // Validate resource ID format
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      logger.warn('Invalid resource ID format', {
        socketId: socket.id,
        modelName,
        resourceId
      });
      return null;
    }

    const Model = mongoose.model(modelName);

    // Build query with firm context
    const query = { _id: resourceId };

    // Add firmId filter for multi-tenant models
    if (socket.firmId && Model.schema.paths.firmId) {
      query.firmId = socket.firmId;
    }

    // Fetch resource
    const resource = await Model.findOne(query).lean();

    if (!resource) {
      logger.warn('Resource not found or access denied', {
        socketId: socket.id,
        userId: socket.userId,
        firmId: socket.firmId,
        modelName,
        resourceId
      });
      return null;
    }

    // Additional firmId check (defense in depth)
    if (resource.firmId && !verifySocketFirmAccess(socket, resource.firmId)) {
      logger.warn('Cross-firm resource access attempt blocked', {
        socketId: socket.id,
        userId: socket.userId,
        userFirmId: socket.firmId,
        resourceFirmId: resource.firmId,
        modelName,
        resourceId
      });
      return null;
    }

    return resource;
  } catch (error) {
    logger.error('Resource access verification error:', {
      socketId: socket.id,
      modelName,
      resourceId,
      error: error.message
    });
    return null;
  }
};

module.exports = {
  socketAuthMiddleware,
  hasSocketPermission,
  verifySocketFirmAccess,
  verifySocketResourceAccess
};
