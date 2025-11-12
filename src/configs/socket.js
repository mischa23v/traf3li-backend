const { Server } = require('socket.io');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Store online users
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

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

    // Join conversation room
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
      console.log(`💬 User joined conversation: ${conversationId}`);
    });

    // Typing indicator
    socket.on('typing:start', ({ conversationId, userId, username }) => {
      socket.to(conversationId).emit('typing:show', { userId, username });
    });

    socket.on('typing:stop', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('typing:hide', { userId });
    });

    // Send message
    socket.on('message:send', (data) => {
      socket.to(data.conversationId).emit('message:receive', data);
    });

    // Message read
    socket.on('message:read', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('message:read', { userId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user:offline', { userId: socket.userId });
        console.log(`👋 User ${socket.userId} is offline`);
      }
    });
  });

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
