const { Server } = require('socket.io');

let io;

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
    }
  });

  // Store online users
  const onlineUsers = new Map();
  // Store user presence
  const userPresence = new Map();
  // Store active rooms
  const activeRooms = new Map();

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // ═══════════════════════════════════════════════════════════════
    // USER CONNECTION & PRESENCE
    // ═══════════════════════════════════════════════════════════════

    // User joins with their ID
    socket.on('user:join', (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;

      // Join user's personal notification room
      socket.join(`user:${userId}`);

      // Broadcast online status
      io.emit('user:online', {
        userId,
        socketId: socket.id
      });

      console.log(`👤 User ${userId} is online`);
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
        console.log(`👁️ User ${userId} viewing ${roomId}`);
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
        console.log(`👋 User ${userId} left ${roomId}`);
      }
    });

    // ═══════════════════════════════════════════════════════════════
    // MESSAGING & CONVERSATIONS
    // ═══════════════════════════════════════════════════════════════

    // Join conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
      console.log(`💬 User joined conversation: ${conversationId}`);
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
      console.log(`📋 User joined task: ${taskId}`);
    });

    // Leave task room
    socket.on('task:leave', (taskId) => {
      const roomId = `task:${taskId}`;
      socket.leave(roomId);
      console.log(`📋 User left task: ${taskId}`);
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
      console.log(`📊 User joined Gantt chart: ${projectId}`);

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
      console.log(`📊 User left Gantt chart: ${projectId}`);

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
      console.log(`📄 User joined document: ${docId}`);

      // Notify others
      socket.to(roomId).emit('document:user:joined', {
        userId: socket.userId
      });
    });

    // Leave document room
    socket.on('document:leave', (docId) => {
      const roomId = `document:${docId}`;
      socket.leave(roomId);
      console.log(`📄 User left document: ${docId}`);

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
      console.log(`⚖️ User joined case: ${caseId}`);
    });

    // Leave case room
    socket.on('case:leave', (caseId) => {
      const roomId = `case:${caseId}`;
      socket.leave(roomId);
      console.log(`⚖️ User left case: ${caseId}`);
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
    socket.on('firm:join', (firmId) => {
      const roomId = `firm:${firmId}`;
      socket.join(roomId);
      console.log(`🏢 User joined firm room: ${firmId}`);
    });

    // Activity notification (firm-wide)
    socket.on('activity:new', (data) => {
      const roomId = `firm:${data.firmId}`;
      io.to(roomId).emit('activity:notification', data);
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

        io.emit('user:offline', { userId: socket.userId });
        console.log(`👋 User ${socket.userId} is offline`);
      }
    });
  });

  // Periodic cleanup of stale data (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    // Clean up stale presence data
    userPresence.forEach((data, oderId) => {
      if (now - data.timestamp > staleThreshold) {
        userPresence.delete(oderId);
      }
    });

    // Clean up empty rooms
    activeRooms.forEach((users, roomId) => {
      if (users.size === 0) {
        activeRooms.delete(roomId);
      }
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
    console.error('Socket.io not initialized');
    return;
  }
  
  io.to(`user:${userId}`).emit('notification:new', notification);
  console.log(`🔔 Notification sent to user ${userId}:`, notification.title);
};

// Helper function to emit notification count update
const emitNotificationCount = (userId, count) => {
  if (!io) {
    console.error('Socket.io not initialized');
    return;
  }
  
  io.to(`user:${userId}`).emit('notification:count', { count });
};

module.exports = { 
  initSocket, 
  getIO,
  emitNotification,
  emitNotificationCount 
};
