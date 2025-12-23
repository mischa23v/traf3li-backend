const { getIO } = require('../configs/socket');
const logger = require('../utils/logger');

/**
 * Collaboration Service
 * Provides real-time collaboration features including:
 * - User presence tracking
 * - Cursor tracking for collaborative editing
 * - Real-time updates broadcasting
 * - Resource locking
 * - Activity feed
 */
class CollaborationService {
  constructor() {
    // In-memory stores (in production, use Redis for scalability)
    this.presenceMap = new Map(); // userId -> { location, lastSeen }
    this.cursorMap = new Map(); // locationId -> Map(userId -> position)
    this.lockMap = new Map(); // resourceType:resourceId -> { userId, lockedAt }
    this.activeRooms = new Map(); // roomId -> Set(userIds)
  }

  // ═══════════════════════════════════════════════════════════════
  // PRESENCE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update user presence
   * @param {ObjectId} userId - User ID
   * @param {Object} location - { type: 'task'|'case'|'document'|'gantt', id: resourceId }
   * @returns {Object} - Updated presence
   */
  async updatePresence(userId, location) {
    try {
      const userIdStr = userId.toString();

      // Get previous location
      const previousPresence = this.presenceMap.get(userIdStr);

      // Update presence
      const presence = {
        userId: userIdStr,
        location,
        lastSeen: new Date(),
        timestamp: Date.now()
      };

      this.presenceMap.set(userIdStr, presence);

      // Broadcast to appropriate room
      const io = getIO();

      // Leave previous room if location changed
      if (previousPresence && previousPresence.location) {
        const prevRoomId = `${previousPresence.location.type}:${previousPresence.location.id}`;
        io.to(prevRoomId).emit('user:left', {
          userId: userIdStr,
          location: previousPresence.location
        });

        // Remove from active rooms
        if (this.activeRooms.has(prevRoomId)) {
          this.activeRooms.get(prevRoomId).delete(userIdStr);
        }
      }

      // Join new room
      if (location && location.id) {
        const roomId = `${location.type}:${location.id}`;
        io.to(roomId).emit('user:joined', {
          userId: userIdStr,
          location
        });

        // Add to active rooms
        if (!this.activeRooms.has(roomId)) {
          this.activeRooms.set(roomId, new Set());
        }
        this.activeRooms.get(roomId).add(userIdStr);
      }

      return presence;
    } catch (error) {
      logger.error('Error in updatePresence:', error);
      throw error;
    }
  }

  /**
   * Get active users for a location
   * @param {String} locationId - Location ID (e.g., "task:123" or "gantt:456")
   * @returns {Array} - Active users
   */
  async getActiveUsers(locationId) {
    try {
      const activeUsers = [];

      this.presenceMap.forEach((presence, userId) => {
        if (presence.location) {
          const userLocationId = `${presence.location.type}:${presence.location.id}`;
          if (userLocationId === locationId) {
            // Check if user is still active (within last 5 minutes)
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (presence.timestamp > fiveMinutesAgo) {
              activeUsers.push({
                userId,
                location: presence.location,
                lastSeen: presence.lastSeen
              });
            }
          }
        }
      });

      return activeUsers;
    } catch (error) {
      logger.error('Error in getActiveUsers:', error);
      throw error;
    }
  }

  /**
   * Get user's current presence
   * @param {ObjectId} userId - User ID
   * @returns {Object} - User presence
   */
  async getUserPresence(userId) {
    try {
      const userIdStr = userId.toString();
      return this.presenceMap.get(userIdStr) || null;
    } catch (error) {
      logger.error('Error in getUserPresence:', error);
      throw error;
    }
  }

  /**
   * Remove user presence (on disconnect)
   * @param {ObjectId} userId - User ID
   */
  async removePresence(userId) {
    try {
      const userIdStr = userId.toString();
      const presence = this.presenceMap.get(userIdStr);

      if (presence && presence.location) {
        const roomId = `${presence.location.type}:${presence.location.id}`;

        // Broadcast user left
        const io = getIO();
        io.to(roomId).emit('user:left', {
          userId: userIdStr,
          location: presence.location
        });

        // Remove from active rooms
        if (this.activeRooms.has(roomId)) {
          this.activeRooms.get(roomId).delete(userIdStr);
        }
      }

      this.presenceMap.delete(userIdStr);
    } catch (error) {
      logger.error('Error in removePresence:', error);
      throw error;
    }
  }

  /**
   * Clean stale presence (users inactive for > 5 minutes)
   */
  async cleanStalePresence() {
    try {
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      const staleUsers = [];

      this.presenceMap.forEach((presence, userId) => {
        if (presence.timestamp < fiveMinutesAgo) {
          staleUsers.push(userId);
        }
      });

      // Remove stale users
      for (const userId of staleUsers) {
        await this.removePresence(userId);
      }

      return staleUsers.length;
    } catch (error) {
      logger.error('Error in cleanStalePresence:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CURSOR TRACKING (for collaborative editing)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Update cursor position
   * @param {ObjectId} userId - User ID
   * @param {String} locationId - Location ID (e.g., "document:123")
   * @param {Object} position - Cursor position { x, y, line, column }
   * @returns {Object} - Updated cursor
   */
  async updateCursor(userId, locationId, position) {
    try {
      const userIdStr = userId.toString();

      if (!this.cursorMap.has(locationId)) {
        this.cursorMap.set(locationId, new Map());
      }

      const locationCursors = this.cursorMap.get(locationId);
      locationCursors.set(userIdStr, {
        userId: userIdStr,
        position,
        timestamp: Date.now()
      });

      // Broadcast cursor position to others in the same location
      const io = getIO();
      io.to(locationId).emit('cursor:update', {
        userId: userIdStr,
        position
      });

      return { userId: userIdStr, locationId, position };
    } catch (error) {
      logger.error('Error in updateCursor:', error);
      throw error;
    }
  }

  /**
   * Get all cursors for a location
   * @param {String} locationId - Location ID
   * @returns {Array} - Active cursors
   */
  async getCursors(locationId) {
    try {
      const locationCursors = this.cursorMap.get(locationId);

      if (!locationCursors) {
        return [];
      }

      const cursors = [];
      const oneMinuteAgo = Date.now() - (60 * 1000);

      locationCursors.forEach((cursor, userId) => {
        // Only return cursors updated in last minute
        if (cursor.timestamp > oneMinuteAgo) {
          cursors.push(cursor);
        } else {
          // Clean up stale cursor
          locationCursors.delete(userId);
        }
      });

      return cursors;
    } catch (error) {
      logger.error('Error in getCursors:', error);
      throw error;
    }
  }

  /**
   * Remove cursor (when user leaves)
   * @param {ObjectId} userId - User ID
   * @param {String} locationId - Location ID
   */
  async removeCursor(userId, locationId) {
    try {
      const userIdStr = userId.toString();
      const locationCursors = this.cursorMap.get(locationId);

      if (locationCursors) {
        locationCursors.delete(userIdStr);

        // Broadcast cursor removal
        const io = getIO();
        io.to(locationId).emit('cursor:remove', { userId: userIdStr });
      }
    } catch (error) {
      logger.error('Error in removeCursor:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // REAL-TIME UPDATES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Broadcast task update to all viewers
   * @param {ObjectId} taskId - Task ID
   * @param {Object} update - Update data
   * @param {ObjectId} excludeUserId - User who made the change (don't send back to them)
   */
  async broadcastTaskUpdate(taskId, update, excludeUserId = null) {
    try {
      const io = getIO();
      const roomId = `task:${taskId}`;

      const updateData = {
        taskId: taskId.toString(),
        update,
        timestamp: Date.now()
      };

      if (excludeUserId) {
        // Broadcast to all except the user who made the change
        const excludeUserIdStr = excludeUserId.toString();
        const activeUsers = await this.getActiveUsers(roomId);

        activeUsers.forEach(user => {
          if (user.userId !== excludeUserIdStr) {
            io.to(`user:${user.userId}`).emit('task:updated', updateData);
          }
        });
      } else {
        // Broadcast to all
        io.to(roomId).emit('task:updated', updateData);
      }
    } catch (error) {
      logger.error('Error in broadcastTaskUpdate:', error);
      throw error;
    }
  }

  /**
   * Broadcast Gantt chart update
   * @param {ObjectId} projectId - Project/Case ID
   * @param {Object} update - Update data
   * @param {ObjectId} excludeUserId - User who made the change
   */
  async broadcastGanttUpdate(projectId, update, excludeUserId = null) {
    try {
      const io = getIO();
      const roomId = `gantt:${projectId}`;

      const updateData = {
        projectId: projectId.toString(),
        update,
        timestamp: Date.now()
      };

      if (excludeUserId) {
        const excludeUserIdStr = excludeUserId.toString();
        const activeUsers = await this.getActiveUsers(roomId);

        activeUsers.forEach(user => {
          if (user.userId !== excludeUserIdStr) {
            io.to(`user:${user.userId}`).emit('gantt:updated', updateData);
          }
        });
      } else {
        io.to(roomId).emit('gantt:updated', updateData);
      }
    } catch (error) {
      logger.error('Error in broadcastGanttUpdate:', error);
      throw error;
    }
  }

  /**
   * Broadcast document update
   * @param {ObjectId} documentId - Document ID
   * @param {Object} update - Update data (operations, content changes)
   * @param {ObjectId} excludeUserId - User who made the change
   */
  async broadcastDocumentUpdate(documentId, update, excludeUserId = null) {
    try {
      const io = getIO();
      const roomId = `document:${documentId}`;

      const updateData = {
        documentId: documentId.toString(),
        update,
        timestamp: Date.now()
      };

      if (excludeUserId) {
        const excludeUserIdStr = excludeUserId.toString();
        const activeUsers = await this.getActiveUsers(roomId);

        activeUsers.forEach(user => {
          if (user.userId !== excludeUserIdStr) {
            io.to(`user:${user.userId}`).emit('document:updated', updateData);
          }
        });
      } else {
        io.to(roomId).emit('document:updated', updateData);
      }
    } catch (error) {
      logger.error('Error in broadcastDocumentUpdate:', error);
      throw error;
    }
  }

  /**
   * Broadcast case update
   * @param {ObjectId} caseId - Case ID
   * @param {Object} update - Update data
   * @param {ObjectId} excludeUserId - User who made the change
   */
  async broadcastCaseUpdate(caseId, update, excludeUserId = null) {
    try {
      const io = getIO();
      const roomId = `case:${caseId}`;

      const updateData = {
        caseId: caseId.toString(),
        update,
        timestamp: Date.now()
      };

      if (excludeUserId) {
        const excludeUserIdStr = excludeUserId.toString();
        const activeUsers = await this.getActiveUsers(roomId);

        activeUsers.forEach(user => {
          if (user.userId !== excludeUserIdStr) {
            io.to(`user:${user.userId}`).emit('case:updated', updateData);
          }
        });
      } else {
        io.to(roomId).emit('case:updated', updateData);
      }
    } catch (error) {
      logger.error('Error in broadcastCaseUpdate:', error);
      throw error;
    }
  }

  /**
   * Broadcast typing indicator
   * @param {String} locationId - Location ID
   * @param {ObjectId} userId - User ID
   * @param {Boolean} isTyping - True if user is typing
   */
  async broadcastTyping(locationId, userId, isTyping) {
    try {
      const io = getIO();
      const userIdStr = userId.toString();

      if (isTyping) {
        io.to(locationId).emit('typing:start', {
          userId: userIdStr,
          locationId
        });
      } else {
        io.to(locationId).emit('typing:stop', {
          userId: userIdStr,
          locationId
        });
      }
    } catch (error) {
      logger.error('Error in broadcastTyping:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RESOURCE LOCKING (prevent conflicts)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Acquire lock on a resource
   * @param {String} resourceType - Resource type (task, case, document)
   * @param {ObjectId} resourceId - Resource ID
   * @param {ObjectId} userId - User ID
   * @param {Number} ttl - Time to live in seconds (default 5 minutes)
   * @returns {Object} - Lock info
   */
  async acquireLock(resourceType, resourceId, userId, ttl = 300) {
    try {
      const lockKey = `${resourceType}:${resourceId}`;
      const existingLock = this.lockMap.get(lockKey);

      // Check if already locked
      if (existingLock) {
        const now = Date.now();
        const lockAge = now - existingLock.lockedAt;

        // If lock is expired, allow new lock
        if (lockAge > existingLock.ttl * 1000) {
          // Lock expired, remove it
          this.lockMap.delete(lockKey);
        } else if (existingLock.userId !== userId.toString()) {
          // Locked by another user
          return {
            success: false,
            locked: true,
            lockedBy: existingLock.userId,
            lockedAt: existingLock.lockedAt,
            message: 'Resource is locked by another user'
          };
        }
      }

      // Acquire lock
      const lock = {
        userId: userId.toString(),
        lockedAt: Date.now(),
        ttl
      };

      this.lockMap.set(lockKey, lock);

      // Broadcast lock acquired
      const io = getIO();
      io.to(lockKey).emit('lock:acquired', {
        resourceType,
        resourceId: resourceId.toString(),
        userId: userId.toString()
      });

      return {
        success: true,
        locked: true,
        lockedBy: userId.toString(),
        lockedAt: lock.lockedAt,
        expiresAt: lock.lockedAt + (ttl * 1000)
      };
    } catch (error) {
      logger.error('Error in acquireLock:', error);
      throw error;
    }
  }

  /**
   * Release lock on a resource
   * @param {String} resourceType - Resource type
   * @param {ObjectId} resourceId - Resource ID
   * @param {ObjectId} userId - User ID
   * @returns {Object} - Release status
   */
  async releaseLock(resourceType, resourceId, userId) {
    try {
      const lockKey = `${resourceType}:${resourceId}`;
      const existingLock = this.lockMap.get(lockKey);

      if (!existingLock) {
        return {
          success: true,
          message: 'No lock found'
        };
      }

      // Only the user who locked can release
      if (existingLock.userId !== userId.toString()) {
        return {
          success: false,
          message: 'You do not own this lock'
        };
      }

      this.lockMap.delete(lockKey);

      // Broadcast lock released
      const io = getIO();
      io.to(lockKey).emit('lock:released', {
        resourceType,
        resourceId: resourceId.toString(),
        userId: userId.toString()
      });

      return {
        success: true,
        message: 'Lock released'
      };
    } catch (error) {
      logger.error('Error in releaseLock:', error);
      throw error;
    }
  }

  /**
   * Get lock status for a resource
   * @param {String} resourceType - Resource type
   * @param {ObjectId} resourceId - Resource ID
   * @returns {Object} - Lock status
   */
  async getLock(resourceType, resourceId) {
    try {
      const lockKey = `${resourceType}:${resourceId}`;
      const lock = this.lockMap.get(lockKey);

      if (!lock) {
        return {
          locked: false
        };
      }

      // Check if lock is expired
      const now = Date.now();
      const lockAge = now - lock.lockedAt;

      if (lockAge > lock.ttl * 1000) {
        // Lock expired
        this.lockMap.delete(lockKey);
        return {
          locked: false
        };
      }

      return {
        locked: true,
        lockedBy: lock.userId,
        lockedAt: lock.lockedAt,
        expiresAt: lock.lockedAt + (lock.ttl * 1000)
      };
    } catch (error) {
      logger.error('Error in getLock:', error);
      throw error;
    }
  }

  /**
   * Clean expired locks
   */
  async cleanExpiredLocks() {
    try {
      const now = Date.now();
      const expiredLocks = [];

      this.lockMap.forEach((lock, lockKey) => {
        const lockAge = now - lock.lockedAt;
        if (lockAge > lock.ttl * 1000) {
          expiredLocks.push(lockKey);
        }
      });

      // Remove expired locks
      expiredLocks.forEach(lockKey => {
        this.lockMap.delete(lockKey);
      });

      return expiredLocks.length;
    } catch (error) {
      logger.error('Error in cleanExpiredLocks:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ACTIVITY FEED
  // ═══════════════════════════════════════════════════════════════

  /**
   * Record activity (in-memory, should be persisted to DB in production)
   * @param {ObjectId} firmId - Firm ID
   * @param {Object} activity - Activity data
   * @returns {Object} - Recorded activity
   */
  async recordActivity(firmId, activity) {
    try {
      const activityData = {
        ...activity,
        firmId: firmId.toString(),
        timestamp: Date.now(),
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // In production, save to database
      // For now, broadcast to firm members
      const io = getIO();
      io.to(`firm:${firmId}`).emit('activity:new', activityData);

      return activityData;
    } catch (error) {
      logger.error('Error in recordActivity:', error);
      throw error;
    }
  }

  /**
   * Get recent activities for a firm
   * @param {ObjectId} firmId - Firm ID
   * @param {Number} limit - Number of activities to return
   * @returns {Array} - Recent activities
   */
  async getRecentActivities(firmId, limit = 50) {
    try {
      // In production, retrieve from database
      // For now, return empty array (implement based on your activity storage)
      return [];
    } catch (error) {
      logger.error('Error in getRecentActivities:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ROOM MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Join a collaboration room
   * @param {ObjectId} userId - User ID
   * @param {String} roomId - Room ID (e.g., "task:123", "gantt:456")
   * @param {Object} socket - Socket.io socket instance
   */
  async joinRoom(userId, roomId, socket) {
    try {
      const userIdStr = userId.toString();

      // Join socket.io room
      if (socket) {
        socket.join(roomId);
      } else {
        const io = getIO();
        // If no socket provided, user all sockets for this user
        io.to(`user:${userIdStr}`).socketsJoin(roomId);
      }

      // Add to active rooms
      if (!this.activeRooms.has(roomId)) {
        this.activeRooms.set(roomId, new Set());
      }
      this.activeRooms.get(roomId).add(userIdStr);

      // Get current users in room
      const activeUsers = Array.from(this.activeRooms.get(roomId));

      // Notify others that user joined
      const io = getIO();
      io.to(roomId).emit('room:user_joined', {
        roomId,
        userId: userIdStr,
        activeUsers
      });

      return {
        roomId,
        activeUsers
      };
    } catch (error) {
      logger.error('Error in joinRoom:', error);
      throw error;
    }
  }

  /**
   * Leave a collaboration room
   * @param {ObjectId} userId - User ID
   * @param {String} roomId - Room ID
   * @param {Object} socket - Socket.io socket instance
   */
  async leaveRoom(userId, roomId, socket) {
    try {
      const userIdStr = userId.toString();

      // Leave socket.io room
      if (socket) {
        socket.leave(roomId);
      } else {
        const io = getIO();
        io.to(`user:${userIdStr}`).socketsLeave(roomId);
      }

      // Remove from active rooms
      if (this.activeRooms.has(roomId)) {
        this.activeRooms.get(roomId).delete(userIdStr);

        // Clean up empty rooms
        if (this.activeRooms.get(roomId).size === 0) {
          this.activeRooms.delete(roomId);
        }
      }

      // Notify others that user left
      const io = getIO();
      io.to(roomId).emit('room:user_left', {
        roomId,
        userId: userIdStr
      });

      return { success: true };
    } catch (error) {
      logger.error('Error in leaveRoom:', error);
      throw error;
    }
  }

  /**
   * Get active users in a room
   * @param {String} roomId - Room ID
   * @returns {Array} - User IDs
   */
  async getRoomUsers(roomId) {
    try {
      if (!this.activeRooms.has(roomId)) {
        return [];
      }

      return Array.from(this.activeRooms.get(roomId));
    } catch (error) {
      logger.error('Error in getRoomUsers:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // CLEANUP & MAINTENANCE
  // ═══════════════════════════════════════════════════════════════

  /**
   * Run periodic cleanup (call this from a cron job or interval)
   */
  async runCleanup() {
    try {
      const staleUsers = await this.cleanStalePresence();
      const expiredLocks = await this.cleanExpiredLocks();

      logger.info(`Cleanup: Removed ${staleUsers} stale users, ${expiredLocks} expired locks`);

      return {
        staleUsers,
        expiredLocks
      };
    } catch (error) {
      logger.error('Error in runCleanup:', error);
      throw error;
    }
  }

  /**
   * Get system stats
   * @returns {Object} - System statistics
   */
  async getStats() {
    try {
      return {
        activeUsers: this.presenceMap.size,
        activeRooms: this.activeRooms.size,
        activeLocks: this.lockMap.size,
        activeCursors: Array.from(this.cursorMap.values()).reduce((sum, map) => sum + map.size, 0)
      };
    } catch (error) {
      logger.error('Error in getStats:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new CollaborationService();
