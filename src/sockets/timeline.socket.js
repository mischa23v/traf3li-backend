/**
 * Timeline Socket Handler
 *
 * Provides real-time updates for entity timelines (360° customer view).
 * Broadcasts timeline events when activities, cases, invoices, or other
 * timeline items are created, updated, or deleted.
 *
 * Features:
 * - Real-time timeline event broadcasting
 * - Entity-specific room subscriptions
 * - Multiple entity type support (client, contact, lead, case, etc.)
 * - Automatic room cleanup
 * - Timeline activity tracking
 *
 * Socket Events:
 * - timeline:subscribe - Subscribe to entity timeline updates
 * - timeline:unsubscribe - Unsubscribe from entity timeline
 * - disconnect - Cleanup on socket disconnect
 *
 * Emitted Events:
 * - timeline:new_item - New timeline item added
 * - timeline:item_updated - Timeline item updated
 * - timeline:item_deleted - Timeline item deleted
 * - timeline:refresh - Timeline needs full refresh
 */

const logger = require('../utils/logger');

class TimelineSocketHandler {
  constructor(io) {
    this.io = io;
    // Track which sockets are subscribed to which entities
    // Map structure: socketId -> Set of entityKeys (e.g., "client:123")
    this.socketSubscriptions = new Map();
    // Track how many sockets are subscribed to each entity
    // Map structure: entityKey -> count
    this.entitySubscribers = new Map();
  }

  /**
   * Initialize socket event listeners
   */
  initialize() {
    this.io.on('connection', (socket) => {
      logger.debug('Socket connected for timeline updates:', socket.id);

      // Subscribe to entity timeline
      socket.on('timeline:subscribe', (data) => this.onSubscribe(socket, data));

      // Unsubscribe from entity timeline
      socket.on('timeline:unsubscribe', (data) => this.onUnsubscribe(socket, data));

      // Socket disconnects
      socket.on('disconnect', () => this.onDisconnect(socket));
    });

    logger.info('✅ Timeline socket handler initialized');
  }

  /**
   * When socket subscribes to an entity timeline
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - { entityType, entityId, userId }
   */
  onSubscribe(socket, { entityType, entityId, userId }) {
    if (!entityType || !entityId) {
      logger.warn('Invalid timeline:subscribe data received', { entityType, entityId });
      return;
    }

    try {
      const entityKey = `${entityType}:${entityId}`;
      const roomId = `timeline:${entityKey}`;

      // Join socket room
      socket.join(roomId);

      // Track subscription
      if (!this.socketSubscriptions.has(socket.id)) {
        this.socketSubscriptions.set(socket.id, new Set());
      }
      this.socketSubscriptions.get(socket.id).add(entityKey);

      // Update subscriber count
      const currentCount = this.entitySubscribers.get(entityKey) || 0;
      this.entitySubscribers.set(entityKey, currentCount + 1);

      logger.info(`📊 Socket ${socket.id} subscribed to timeline: ${entityKey}`, {
        userId,
        totalSubscribers: this.entitySubscribers.get(entityKey)
      });

      // Acknowledge subscription
      socket.emit('timeline:subscribed', {
        entityType,
        entityId,
        subscribedAt: new Date()
      });
    } catch (error) {
      logger.error('Error in timeline onSubscribe:', error.message);
    }
  }

  /**
   * When socket unsubscribes from an entity timeline
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - { entityType, entityId }
   */
  onUnsubscribe(socket, { entityType, entityId }) {
    if (!entityType || !entityId) {
      logger.warn('Invalid timeline:unsubscribe data received', { entityType, entityId });
      return;
    }

    try {
      const entityKey = `${entityType}:${entityId}`;
      const roomId = `timeline:${entityKey}`;

      // Leave socket room
      socket.leave(roomId);

      // Remove from subscriptions
      if (this.socketSubscriptions.has(socket.id)) {
        this.socketSubscriptions.get(socket.id).delete(entityKey);
      }

      // Update subscriber count
      const currentCount = this.entitySubscribers.get(entityKey) || 0;
      const newCount = Math.max(0, currentCount - 1);

      if (newCount === 0) {
        this.entitySubscribers.delete(entityKey);
      } else {
        this.entitySubscribers.set(entityKey, newCount);
      }

      logger.info(`📊 Socket ${socket.id} unsubscribed from timeline: ${entityKey}`, {
        remainingSubscribers: newCount
      });

      // Acknowledge unsubscription
      socket.emit('timeline:unsubscribed', {
        entityType,
        entityId,
        unsubscribedAt: new Date()
      });
    } catch (error) {
      logger.error('Error in timeline onUnsubscribe:', error.message);
    }
  }

  /**
   * When socket disconnects - cleanup all subscriptions
   * @param {Object} socket - Socket.io socket instance
   */
  onDisconnect(socket) {
    try {
      const socketId = socket.id;

      // Get all subscriptions for this socket
      const subscriptions = this.socketSubscriptions.get(socketId);

      if (subscriptions && subscriptions.size > 0) {
        // Update subscriber counts for all entities
        subscriptions.forEach(entityKey => {
          const currentCount = this.entitySubscribers.get(entityKey) || 0;
          const newCount = Math.max(0, currentCount - 1);

          if (newCount === 0) {
            this.entitySubscribers.delete(entityKey);
          } else {
            this.entitySubscribers.set(entityKey, newCount);
          }
        });

        // Clean up socket tracking
        this.socketSubscriptions.delete(socketId);

        logger.info(`🔌 Socket ${socketId} disconnected, cleaned up ${subscriptions.size} timeline subscription(s)`);
      }
    } catch (error) {
      logger.error('Error in timeline onDisconnect:', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TIMELINE EVENT BROADCASTING METHODS
  // These methods are called by services to broadcast timeline updates
  // ═══════════════════════════════════════════════════════════════

  /**
   * Broadcast new timeline item to subscribers
   * @param {String} entityType - Entity type (client, contact, lead, etc.)
   * @param {String} entityId - Entity ID
   * @param {Object} item - Timeline item data
   */
  broadcastNewItem(entityType, entityId, item) {
    try {
      const entityKey = `${entityType}:${entityId}`;
      const roomId = `timeline:${entityKey}`;

      // Only broadcast if there are subscribers
      if (this.entitySubscribers.has(entityKey)) {
        this.io.to(roomId).emit('timeline:new_item', {
          entityType,
          entityId,
          item,
          timestamp: new Date()
        });

        logger.debug(`📊 Broadcast new timeline item to ${roomId}`, {
          itemType: item.type,
          subscribers: this.entitySubscribers.get(entityKey)
        });
      }
    } catch (error) {
      logger.error('Error in broadcastNewItem:', error.message);
    }
  }

  /**
   * Broadcast timeline item update to subscribers
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {String} itemId - Timeline item ID
   * @param {Object} updates - Updated fields
   */
  broadcastItemUpdate(entityType, entityId, itemId, updates) {
    try {
      const entityKey = `${entityType}:${entityId}`;
      const roomId = `timeline:${entityKey}`;

      // Only broadcast if there are subscribers
      if (this.entitySubscribers.has(entityKey)) {
        this.io.to(roomId).emit('timeline:item_updated', {
          entityType,
          entityId,
          itemId,
          updates,
          timestamp: new Date()
        });

        logger.debug(`📊 Broadcast timeline item update to ${roomId}`, {
          itemId,
          subscribers: this.entitySubscribers.get(entityKey)
        });
      }
    } catch (error) {
      logger.error('Error in broadcastItemUpdate:', error.message);
    }
  }

  /**
   * Broadcast timeline item deletion to subscribers
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {String} itemId - Timeline item ID
   */
  broadcastItemDelete(entityType, entityId, itemId) {
    try {
      const entityKey = `${entityType}:${entityId}`;
      const roomId = `timeline:${entityKey}`;

      // Only broadcast if there are subscribers
      if (this.entitySubscribers.has(entityKey)) {
        this.io.to(roomId).emit('timeline:item_deleted', {
          entityType,
          entityId,
          itemId,
          timestamp: new Date()
        });

        logger.debug(`📊 Broadcast timeline item deletion to ${roomId}`, {
          itemId,
          subscribers: this.entitySubscribers.get(entityKey)
        });
      }
    } catch (error) {
      logger.error('Error in broadcastItemDelete:', error.message);
    }
  }

  /**
   * Broadcast timeline refresh request to subscribers
   * Used when major changes require a full timeline reload
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {String} reason - Reason for refresh
   */
  broadcastRefresh(entityType, entityId, reason = 'update') {
    try {
      const entityKey = `${entityType}:${entityId}`;
      const roomId = `timeline:${entityKey}`;

      // Only broadcast if there are subscribers
      if (this.entitySubscribers.has(entityKey)) {
        this.io.to(roomId).emit('timeline:refresh', {
          entityType,
          entityId,
          reason,
          timestamp: new Date()
        });

        logger.info(`📊 Broadcast timeline refresh to ${roomId}`, {
          reason,
          subscribers: this.entitySubscribers.get(entityKey)
        });
      }
    } catch (error) {
      logger.error('Error in broadcastRefresh:', error.message);
    }
  }

  /**
   * Broadcast bulk timeline updates
   * Useful when multiple items are added/updated at once
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @param {Array} items - Array of timeline items
   */
  broadcastBulkUpdate(entityType, entityId, items) {
    try {
      const entityKey = `${entityType}:${entityId}`;
      const roomId = `timeline:${entityKey}`;

      // Only broadcast if there are subscribers
      if (this.entitySubscribers.has(entityKey)) {
        this.io.to(roomId).emit('timeline:bulk_update', {
          entityType,
          entityId,
          items,
          count: items.length,
          timestamp: new Date()
        });

        logger.debug(`📊 Broadcast bulk timeline update to ${roomId}`, {
          itemCount: items.length,
          subscribers: this.entitySubscribers.get(entityKey)
        });
      }
    } catch (error) {
      logger.error('Error in broadcastBulkUpdate:', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get statistics about timeline subscriptions
   * @returns {Object} Statistics object
   */
  getStats() {
    const entityStats = [];

    for (const [entityKey, count] of this.entitySubscribers.entries()) {
      const [entityType, entityId] = entityKey.split(':');
      entityStats.push({
        entityType,
        entityId,
        subscribers: count
      });
    }

    return {
      totalSockets: this.socketSubscriptions.size,
      totalEntities: this.entitySubscribers.size,
      entities: entityStats
    };
  }

  /**
   * Check if an entity has active subscribers
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @returns {Boolean} True if entity has subscribers
   */
  hasSubscribers(entityType, entityId) {
    const entityKey = `${entityType}:${entityId}`;
    return this.entitySubscribers.has(entityKey);
  }

  /**
   * Get subscriber count for an entity
   * @param {String} entityType - Entity type
   * @param {String} entityId - Entity ID
   * @returns {Number} Subscriber count
   */
  getSubscriberCount(entityType, entityId) {
    const entityKey = `${entityType}:${entityId}`;
    return this.entitySubscribers.get(entityKey) || 0;
  }

  /**
   * Shutdown cleanup
   * Clear all data structures
   */
  shutdown() {
    // Clear all data
    this.socketSubscriptions.clear();
    this.entitySubscribers.clear();

    logger.info('✅ Timeline socket handler shut down');
  }
}

module.exports = TimelineSocketHandler;
