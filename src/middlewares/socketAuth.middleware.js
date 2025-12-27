const { verifyAccessToken } = require('../utils/generateToken');
const logger = require('../utils/logger');
const User = require('../models/user.model');

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

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: socket.userId,
      firmId: socket.firmId,
      role: socket.userRole
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
