const { Server } = require('socket.io');
const logger = require('../utils/logger');

// Import socket handlers
const TicketCollisionHandler = require('../sockets/ticketCollision.socket');
const TimelineSocketHandler = require('../sockets/timeline.socket');

let io;
let cleanupInterval = null;
let ticketCollisionHandler = null;
let timelineHandler = null;

// Allowed origins for Socket.io (matching Express CORS)
const allowedOrigins = [
  'https://traf3li.com',
  'https://dashboard.traf3li.com',
  'https://www.traf3li.com',
  'https://www.dashboard.traf3li.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:8080',
  process.env.CLIENT_URL,
  process.env.DASHBOARD_URL
].filter(Boolean);

/**
 * Initialize Redis adapter for Socket.io horizontal scaling
 * This allows multiple server instances to share Socket.io state
 */
const initRedisAdapter = async (ioInstance) => {
  // Only use Redis adapter in production or if explicitly enabled
  if (process.env.SOCKET_REDIS_ENABLED !== 'true' && process.env.NODE_ENV !== 'production') {
    logger.info('📡 Socket.io running in single-instance mode (no Redis adapter)');
    return;
  }

  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const { createClient } = require('redis');

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();

    // Add error handlers
    pubClient.on('error', (err) => {
      logger.error('Socket.io Redis pub client error:', err.message);
    });
    subClient.on('error', (err) => {
      logger.error('Socket.io Redis sub client error:', err.message);
    });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    ioInstance.adapter(createAdapter(pubClient, subClient));
    logger.info('✅ Socket.io Redis adapter initialized for horizontal scaling');

    // Store clients for cleanup
    ioInstance._redisClients = { pubClient, subClient };
  } catch (error) {
    logger.warn('⚠️ Failed to initialize Socket.io Redis adapter, falling back to in-memory:', error.message);
    logger.info('📡 Socket.io running in single-instance mode');
  }
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) {
          return callback(null, true);
        }

        // Allow Vercel preview deployments
        if (origin.includes('.vercel.app')) {
          return callback(null, true);
        }

        // Check whitelist
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow any traf3li.com subdomain
        if (origin.includes('.traf3li.com') || origin.includes('traf3li.com')) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST']
    },
    // Connection state recovery for reliability
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true
    }
  });

  // Initialize Redis adapter asynchronously
  initRedisAdapter(io).catch(err => {
    logger.error('Redis adapter initialization failed:', err.message);
  });

  // ═══════════════════════════════════════════════════════════════
  // INITIALIZE MODULAR SOCKET HANDLERS
  // ═══════════════════════════════════════════════════════════════

  // Ticket collision detection handler
  ticketCollisionHandler = new TicketCollisionHandler(io);
  ticketCollisionHandler.initialize();

  // Timeline real-time updates handler
  timelineHandler = new TimelineSocketHandler(io);
  timelineHandler.initialize();

  // Store online users
  const onlineUsers = new Map();
  // Store user presence
  const userPresence = new Map();
  // Store active rooms
  const activeRooms = new Map();

  io.on('connection', (socket) => {
    logger.info('✅ User connected:', socket.id);

    // ═══════════════════════════════════════════════════════════════
    // USER CONNECTION & PRESENCE
    // ═══════════════════════════════════════════════════════════════

    // User joins with their ID and firmId
    // SECURITY: Fixed - now requires firmId for scoped broadcasting
    socket.on('user:join', (data) => {
      // Support both old format (userId string) and new format (object with userId and firmId)
      const userId = typeof data === 'string' ? data : data.userId;
      const firmId = typeof data === 'object' ? data.firmId : null;

      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.firmId = firmId; // Store firmId on socket for later use

      // Join user's personal notification room
      socket.join(`user:${userId}`);

      // SECURITY: Join firm room if firmId provided
      if (firmId) {
        socket.join(`firm:${firmId}`);
        // SECURITY: Only broadcast online status within the firm
        io.to(`firm:${firmId}`).emit('user:online', {
          userId,
          socketId: socket.id
        });
      }

      logger.info(`👤 User ${userId} is online${firmId ? ` (firm: ${firmId})` : ''}`);
    });

    // Update user presence (what they're viewing)
    socket.on('user:presence', ({ userId, location }) => {
      // location: { type: 'task', id: 'task_123' }
      userPresence.set(userId, { location, timestamp: Date.now() });

      // Join location room
      if (location && location.type && location.id) {
        const roomId = `${location.type}:${location.id}`;
        socket.join(roomId);

        // Track active users in room
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, new Set());
        }
        activeRooms.get(roomId).add(userId);

        // Notify others in the room
        socket.to(roomId).emit('user:joined', { userId, location });
        logger.info(`👁️ User ${userId} viewing ${roomId}`);
      }
    });

    // User leaves a location
    socket.on('user:leave', ({ userId, location }) => {
      if (location && location.type && location.id) {
        const roomId = `${location.type}:${location.id}`;
        socket.leave(roomId);

        // Remove from active rooms
        if (activeRooms.has(roomId)) {
          activeRooms.get(roomId).delete(userId);
        }

        // Notify others
        socket.to(roomId).emit('user:left', { userId, location });
        logger.info(`👋 User ${userId} left ${roomId}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // MESSAGING & CONVERSATIONS
    // ═══════════════════════════════════════════════════════════════

    // Join conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
      logger.info(`💬 User joined conversation: ${conversationId}`);
    });

    // Typing indicator
    socket.on('typing:start', ({ conversationId, userId, username, location }) => {
      const roomId = location || conversationId;
      socket.to(roomId).emit('typing:show', { userId, username, location });
    });

    socket.on('typing:stop', ({ conversationId, userId, location }) => {
      const roomId = location || conversationId;
      socket.to(roomId).emit('typing:hide', { userId, location });
    });

    // Send message
    socket.on('message:send', (data) => {
      socket.to(data.conversationId).emit('message:receive', data);
    });

    // Message read
    socket.on('message:read', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('message:read', { userId });
    });

    // ═══════════════════════════════════════════════════════════════
    // TASK COLLABORATION
    // ═══════════════════════════════════════════════════════════════

    // Join task room
    socket.on('task:join', (taskId) => {
      const roomId = `task:${taskId}`;
      socket.join(roomId);
      logger.info(`📋 User joined task: ${taskId}`);
    });

    // Leave task room
    socket.on('task:leave', (taskId) => {
      const roomId = `task:${taskId}`;
      socket.leave(roomId);
      logger.info(`📋 User left task: ${taskId}`);
    });

    // Task update
    socket.on('task:update', (data) => {
      const roomId = `task:${data.taskId}`;
      socket.to(roomId).emit('task:updated', data);
    });

    // Task comment
    socket.on('task:comment', (data) => {
      const roomId = `task:${data.taskId}`;
      socket.to(roomId).emit('task:comment:new', data);
    });

    // ═══════════════════════════════════════════════════════════════
    // GANTT CHART COLLABORATION
    // ═══════════════════════════════════════════════════════════════

    // Join Gantt room
    socket.on('gantt:join', (projectId) => {
      const roomId = `gantt:${projectId}`;
      socket.join(roomId);
      logger.info(`📊 User joined Gantt chart: ${projectId}`);

      // Notify others
      socket.to(roomId).emit('gantt:user:joined', {
        userId: socket.userId,
        socketId: socket.id
      });
    });

    // Leave Gantt room
    socket.on('gantt:leave', (projectId) => {
      const roomId = `gantt:${projectId}`;
      socket.leave(roomId);
      logger.info(`📊 User left Gantt chart: ${projectId}`);

      // Notify others
      socket.to(roomId).emit('gantt:user:left', {
        userId: socket.userId
      });
    });

    // Task being dragged in Gantt
    socket.on('gantt:task:drag', (data) => {
      const roomId = `gantt:${data.projectId}`;
      socket.to(roomId).emit('gantt:task:dragging', {
        taskId: data.taskId,
        userId: socket.userId,
        position: data.position
      });
    });

    // Task updated in Gantt
    socket.on('gantt:task:update', (data) => {
      const roomId = `gantt:${data.projectId}`;
      socket.to(roomId).emit('gantt:task:updated', data);
    });

    // Link/dependency added
    socket.on('gantt:link:add', (data) => {
      const roomId = `gantt:${data.projectId}`;
      socket.to(roomId).emit('gantt:link:added', data);
    });

    // Link/dependency removed
    socket.on('gantt:link:remove', (data) => {
      const roomId = `gantt:${data.projectId}`;
      socket.to(roomId).emit('gantt:link:removed', data);
    });

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENT COLLABORATION
    // ═══════════════════════════════════════════════════════════════

    // Join document room
    socket.on('document:join', (docId) => {
      const roomId = `document:${docId}`;
      socket.join(roomId);
      logger.info(`📄 User joined document: ${docId}`);

      // Notify others
      socket.to(roomId).emit('document:user:joined', {
        userId: socket.userId
      });
    });

    // Leave document room
    socket.on('document:leave', (docId) => {
      const roomId = `document:${docId}`;
      socket.leave(roomId);
      logger.info(`📄 User left document: ${docId}`);

      // Notify others
      socket.to(roomId).emit('document:user:left', {
        userId: socket.userId
      });
    });

    // Document update (for collaborative editing)
    socket.on('document:update', (data) => {
      const roomId = `document:${data.documentId}`;
      socket.to(roomId).emit('document:updated', {
        documentId: data.documentId,
        userId: socket.userId,
        changes: data.changes,
        version: data.version,
        timestamp: Date.now()
      });
    });

    // Cursor position in document
    socket.on('document:cursor', (data) => {
      const roomId = `document:${data.documentId}`;
      socket.to(roomId).emit('document:cursor:update', {
        userId: socket.userId,
        position: data.position,
        selection: data.selection
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // CURSOR TRACKING (for collaborative editing)
    // ═══════════════════════════════════════════════════════════════

    // Cursor move
    socket.on('cursor:move', (data) => {
      const roomId = data.location; // e.g., "document:123" or "task:456"
      socket.to(roomId).emit('cursor:update', {
        userId: socket.userId,
        position: data.position,
        location: data.location
      });
    });

    // ═══════════════════════════════════════════════════════════════
    // CASE COLLABORATION
    // ═══════════════════════════════════════════════════════════════

    // Join case room
    socket.on('case:join', (caseId) => {
      const roomId = `case:${caseId}`;
      socket.join(roomId);
      logger.info(`⚖️ User joined case: ${caseId}`);
    });

    // Leave case room
    socket.on('case:leave', (caseId) => {
      const roomId = `case:${caseId}`;
      socket.leave(roomId);
      logger.info(`⚖️ User left case: ${caseId}`);
    });

    // Case update
    socket.on('case:update', (data) => {
      const roomId = `case:${data.caseId}`;
      socket.to(roomId).emit('case:updated', data);
    });

    // ═══════════════════════════════════════════════════════════════
    // FIRM-WIDE UPDATES
    // ═══════════════════════════════════════════════════════════════

    // Join firm room
    // SECURITY: Validate that user is joining their own firm's room
    socket.on('firm:join', (firmId) => {
      // SECURITY: Only allow joining if socket has firmId set and it matches
      if (socket.firmId && socket.firmId.toString() === firmId.toString()) {
        const roomId = `firm:${firmId}`;
        socket.join(roomId);
        logger.info(`🏢 User joined firm room: ${firmId}`);
      } else {
        logger.warn(`🚫 Unauthorized firm:join attempt - socket firmId: ${socket.firmId}, requested: ${firmId}`);
      }
    });

    // Activity notification (firm-wide)
    // SECURITY: Validate that user can only broadcast to their own firm
    socket.on('activity:new', (data) => {
      // SECURITY: Verify socket has firmId and it matches the broadcast target
      if (socket.firmId && data.firmId && socket.firmId.toString() === data.firmId.toString()) {
        const roomId = `firm:${data.firmId}`;
        io.to(roomId).emit('activity:notification', data);
      } else {
        logger.warn(`🚫 Unauthorized activity:new attempt - socket firmId: ${socket.firmId}, target: ${data.firmId}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // DISCONNECT
    // ═══════════════════════════════════════════════════════════════

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        userPresence.delete(socket.userId);

        // Remove from all active rooms and clean up empty rooms
        const emptyRooms = [];
        activeRooms.forEach((users, roomId) => {
          if (users.has(socket.userId)) {
            users.delete(socket.userId);
            socket.to(roomId).emit('user:left', {
              userId: socket.userId
            });
          }
          // Mark empty rooms for cleanup
          if (users.size === 0) {
            emptyRooms.push(roomId);
          }
        });

        // Clean up empty rooms to prevent memory leak
        emptyRooms.forEach(roomId => activeRooms.delete(roomId));

        // SECURITY: Only broadcast offline status within the user's firm
        if (socket.firmId) {
          io.to(`firm:${socket.firmId}`).emit('user:offline', { userId: socket.userId });
        }
        logger.info(`👋 User ${socket.userId} is offline`);
      }
    });
  });

  // Periodic cleanup of stale data (every 5 minutes)
  // Store interval reference for cleanup on shutdown
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    // Clean up stale presence data
    userPresence.forEach((data, userId) => {
      if (now - data.timestamp > staleThreshold) {
        userPresence.delete(userId);
      }
    });

    // Clean up empty rooms
    activeRooms.forEach((users, roomId) => {
      if (users.size === 0) {
        activeRooms.delete(roomId);
      }
    });

    logger.debug('Socket.io cleanup completed', {
      presenceCount: userPresence.size,
      activeRoomsCount: activeRooms.size,
      onlineUsersCount: onlineUsers.size
    });
  }, 5 * 60 * 1000);

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Helper function to emit notification to specific user
const emitNotification = (userId, notification) => {
  if (!io) {
    logger.error('Socket.io not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('notification:new', notification);
  logger.info(`🔔 Notification sent to user ${userId}:`, notification.title);
};

// Helper function to emit notification count update
const emitNotificationCount = (userId, count) => {
  if (!io) {
    logger.error('Socket.io not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('notification:count', { count });
};

/**
 * Gracefully shutdown Socket.io
 * Cleans up intervals, closes connections, and disconnects Redis adapter
 */
const shutdownSocket = async () => {
  logger.info('🔌 Shutting down Socket.io...');

  // Clear cleanup interval
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('✅ Socket.io cleanup interval cleared');
  }

  // Shutdown modular socket handlers
  if (ticketCollisionHandler) {
    ticketCollisionHandler.shutdown();
    ticketCollisionHandler = null;
  }

  if (timelineHandler) {
    timelineHandler.shutdown();
    timelineHandler = null;
  }

  if (io) {
    // Close Redis adapter connections if they exist
    if (io._redisClients) {
      const { pubClient, subClient } = io._redisClients;
      try {
        await Promise.all([
          pubClient.quit(),
          subClient.quit()
        ]);
        logger.info('✅ Socket.io Redis adapter connections closed');
      } catch (error) {
        logger.warn('⚠️ Error closing Redis adapter connections:', error.message);
      }
    }

    // Disconnect all sockets
    const sockets = await io.fetchSockets();
    for (const socket of sockets) {
      socket.disconnect(true);
    }

    // Close the server
    io.close();
    logger.info('✅ Socket.io server closed');
  }
};

// Helper function to get ticket collision handler
const getTicketCollisionHandler = () => {
  if (!ticketCollisionHandler) {
    logger.warn('Ticket collision handler not initialized');
    return null;
  }
  return ticketCollisionHandler;
};

// Helper function to get timeline handler
const getTimelineHandler = () => {
  if (!timelineHandler) {
    logger.warn('Timeline handler not initialized');
    return null;
  }
  return timelineHandler;
};

module.exports = {
  initSocket,
  getIO,
  emitNotification,
  emitNotificationCount,
  shutdownSocket,
  getTicketCollisionHandler,
  getTimelineHandler
};
