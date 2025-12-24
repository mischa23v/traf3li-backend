/**
 * Ticket Collision Detection Socket Handler
 *
 * Prevents multiple agents from working on the same ticket simultaneously
 * by tracking who is viewing/typing on each ticket and notifying others
 * about potential conflicts.
 *
 * Features:
 * - Real-time viewer tracking per ticket
 * - Typing indicators with collision warnings
 * - Automatic cleanup on disconnect
 * - Stale viewer removal
 * - Detailed viewer status (viewing, typing)
 *
 * Socket Events:
 * - ticket:view - Agent starts viewing a ticket
 * - ticket:typing - Agent starts typing a response
 * - ticket:stop_typing - Agent stops typing
 * - ticket:leave - Agent leaves ticket view
 * - disconnect - Cleanup on socket disconnect
 *
 * Emitted Events:
 * - collision:warning - Warn when multiple agents viewing
 * - viewers:updated - List of current viewers
 * - agent:typing - Someone is typing
 * - agent:stopped_typing - Someone stopped typing
 * - agent:joined - New viewer joined
 * - agent:left - Viewer left
 */

const logger = require('../utils/logger');

class TicketCollisionHandler {
  constructor(io) {
    this.io = io;
    // Map structure: ticketId -> Map of agentId -> { agentName, status, since, socketId }
    this.activeViewers = new Map();
    // Track socket to tickets mapping for cleanup
    this.socketToTickets = new Map(); // socketId -> Set of ticketIds
    // Cleanup interval reference
    this.cleanupInterval = null;
  }

  /**
   * Initialize socket event listeners
   */
  initialize() {
    this.io.on('connection', (socket) => {
      logger.debug('Socket connected for ticket collision tracking:', socket.id);

      // Agent starts viewing a ticket
      socket.on('ticket:view', (data) => this.onAgentViewTicket(socket, data));

      // Agent starts typing a response
      socket.on('ticket:typing', (data) => this.onAgentTyping(socket, data));

      // Agent stops typing a response
      socket.on('ticket:stop_typing', (data) => this.onAgentStopTyping(socket, data));

      // Agent leaves ticket view
      socket.on('ticket:leave', (data) => this.onAgentLeave(socket, data));

      // Socket disconnects
      socket.on('disconnect', () => this.onDisconnect(socket));
    });

    // Start periodic cleanup of stale viewers
    this.startCleanupInterval();

    logger.info('✅ Ticket collision detection handler initialized');
  }

  /**
   * When agent starts viewing a ticket
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - { ticketId, agentId, agentName }
   */
  onAgentViewTicket(socket, { ticketId, agentId, agentName }) {
    if (!ticketId || !agentId) {
      logger.warn('Invalid ticket:view data received', { ticketId, agentId });
      return;
    }

    try {
      const roomId = `ticket:${ticketId}`;

      // Create viewer set for ticket if not exists
      if (!this.activeViewers.has(ticketId)) {
        this.activeViewers.set(ticketId, new Map());
      }

      const ticketViewers = this.activeViewers.get(ticketId);
      const existingViewers = Array.from(ticketViewers.values());

      // Check if agent is already viewing (reconnection case)
      const isReconnection = ticketViewers.has(agentId);

      // Add/update viewer info
      ticketViewers.set(agentId, {
        agentId,
        agentName: agentName || 'Unknown Agent',
        status: 'viewing',
        since: new Date(),
        socketId: socket.id
      });

      // Track socket to tickets mapping for cleanup
      if (!this.socketToTickets.has(socket.id)) {
        this.socketToTickets.set(socket.id, new Set());
      }
      this.socketToTickets.get(socket.id).add(ticketId);

      // Join socket room for real-time updates
      socket.join(roomId);

      // Emit collision warning if others are viewing (and not a reconnection)
      if (!isReconnection && existingViewers.length > 0) {
        // Warn the new viewer
        socket.emit('collision:warning', {
          ticketId,
          viewers: existingViewers,
          message: `${existingViewers.length} agent(s) already viewing this ticket`
        });

        // Notify others about new viewer
        socket.to(roomId).emit('agent:joined', {
          ticketId,
          agentId,
          agentName: agentName || 'Unknown Agent',
          timestamp: new Date()
        });
      }

      // Emit updated viewers list to all in room
      const currentViewers = this.getViewers(ticketId);
      this.io.to(roomId).emit('viewers:updated', {
        ticketId,
        viewers: currentViewers,
        count: currentViewers.length
      });

      logger.info(`👁️ Agent ${agentId} (${agentName}) viewing ticket ${ticketId}`, {
        totalViewers: currentViewers.length,
        isReconnection
      });
    } catch (error) {
      logger.error('Error in onAgentViewTicket:', error.message);
    }
  }

  /**
   * When agent starts typing a response
   * CRITICAL: This shows a strong warning to others
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - { ticketId, agentId, agentName }
   */
  onAgentTyping(socket, { ticketId, agentId, agentName }) {
    if (!ticketId || !agentId) {
      logger.warn('Invalid ticket:typing data received', { ticketId, agentId });
      return;
    }

    try {
      const roomId = `ticket:${ticketId}`;

      // Update viewer status to 'typing'
      if (this.activeViewers.has(ticketId)) {
        const ticketViewers = this.activeViewers.get(ticketId);
        const viewer = ticketViewers.get(agentId);

        if (viewer) {
          viewer.status = 'typing';
          viewer.typingStartedAt = new Date();

          // Emit typing indicator to others (CRITICAL WARNING)
          socket.to(roomId).emit('agent:typing', {
            ticketId,
            agentId,
            agentName: agentName || viewer.agentName,
            timestamp: new Date(),
            warning: 'COLLISION_RISK',
            message: `${agentName || viewer.agentName} is typing a response. You may be working on duplicate responses.`
          });

          logger.info(`✍️ Agent ${agentId} typing on ticket ${ticketId}`);
        }
      }
    } catch (error) {
      logger.error('Error in onAgentTyping:', error.message);
    }
  }

  /**
   * When agent stops typing
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - { ticketId, agentId }
   */
  onAgentStopTyping(socket, { ticketId, agentId }) {
    if (!ticketId || !agentId) {
      logger.warn('Invalid ticket:stop_typing data received', { ticketId, agentId });
      return;
    }

    try {
      const roomId = `ticket:${ticketId}`;

      // Update viewer status back to 'viewing'
      if (this.activeViewers.has(ticketId)) {
        const ticketViewers = this.activeViewers.get(ticketId);
        const viewer = ticketViewers.get(agentId);

        if (viewer) {
          viewer.status = 'viewing';
          delete viewer.typingStartedAt;

          // Emit stop typing indicator to others
          socket.to(roomId).emit('agent:stopped_typing', {
            ticketId,
            agentId,
            timestamp: new Date()
          });

          logger.debug(`Agent ${agentId} stopped typing on ticket ${ticketId}`);
        }
      }
    } catch (error) {
      logger.error('Error in onAgentStopTyping:', error.message);
    }
  }

  /**
   * When agent leaves ticket view
   * @param {Object} socket - Socket.io socket instance
   * @param {Object} data - { ticketId, agentId }
   */
  onAgentLeave(socket, { ticketId, agentId }) {
    if (!ticketId || !agentId) {
      logger.warn('Invalid ticket:leave data received', { ticketId, agentId });
      return;
    }

    try {
      const roomId = `ticket:${ticketId}`;

      // Remove from activeViewers
      if (this.activeViewers.has(ticketId)) {
        const ticketViewers = this.activeViewers.get(ticketId);
        ticketViewers.delete(agentId);

        // Clean up empty ticket entries
        if (ticketViewers.size === 0) {
          this.activeViewers.delete(ticketId);
        }
      }

      // Remove from socket to tickets mapping
      if (this.socketToTickets.has(socket.id)) {
        this.socketToTickets.get(socket.id).delete(ticketId);
      }

      // Leave socket room
      socket.leave(roomId);

      // Notify others that agent left
      socket.to(roomId).emit('agent:left', {
        ticketId,
        agentId,
        timestamp: new Date()
      });

      // Emit updated viewers list
      const currentViewers = this.getViewers(ticketId);
      this.io.to(roomId).emit('viewers:updated', {
        ticketId,
        viewers: currentViewers,
        count: currentViewers.length
      });

      logger.info(`👋 Agent ${agentId} left ticket ${ticketId}`);
    } catch (error) {
      logger.error('Error in onAgentLeave:', error.message);
    }
  }

  /**
   * When socket disconnects - cleanup all viewer entries
   * @param {Object} socket - Socket.io socket instance
   */
  onDisconnect(socket) {
    try {
      const socketId = socket.id;

      // Find all tickets this socket was viewing
      const ticketIds = this.socketToTickets.get(socketId);

      if (ticketIds && ticketIds.size > 0) {
        ticketIds.forEach(ticketId => {
          if (this.activeViewers.has(ticketId)) {
            const ticketViewers = this.activeViewers.get(ticketId);

            // Find and remove viewer by socketId
            let removedAgentId = null;
            for (const [agentId, viewer] of ticketViewers.entries()) {
              if (viewer.socketId === socketId) {
                ticketViewers.delete(agentId);
                removedAgentId = agentId;
                break;
              }
            }

            // Clean up empty ticket entries
            if (ticketViewers.size === 0) {
              this.activeViewers.delete(ticketId);
            }

            // Notify others if we found and removed a viewer
            if (removedAgentId) {
              const roomId = `ticket:${ticketId}`;
              socket.to(roomId).emit('agent:left', {
                ticketId,
                agentId: removedAgentId,
                timestamp: new Date(),
                reason: 'disconnect'
              });

              // Emit updated viewers list
              const currentViewers = this.getViewers(ticketId);
              this.io.to(roomId).emit('viewers:updated', {
                ticketId,
                viewers: currentViewers,
                count: currentViewers.length
              });
            }
          }
        });

        // Clean up socket tracking
        this.socketToTickets.delete(socketId);

        logger.info(`🔌 Socket ${socketId} disconnected, cleaned up ${ticketIds.size} ticket(s)`);
      }
    } catch (error) {
      logger.error('Error in onDisconnect:', error.message);
    }
  }

  /**
   * Get current viewers for a ticket
   * @param {String} ticketId - Ticket ID
   * @returns {Array} Array of viewer objects
   */
  getViewers(ticketId) {
    if (!this.activeViewers.has(ticketId)) {
      return [];
    }

    const ticketViewers = this.activeViewers.get(ticketId);
    return Array.from(ticketViewers.values()).map(viewer => ({
      agentId: viewer.agentId,
      agentName: viewer.agentName,
      status: viewer.status,
      since: viewer.since,
      typingStartedAt: viewer.typingStartedAt || null
    }));
  }

  /**
   * Start periodic cleanup of stale viewers
   * Runs every 5 minutes
   */
  startCleanupInterval() {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleViewers(30); // Remove viewers older than 30 minutes
    }, 5 * 60 * 1000);

    logger.info('✅ Ticket collision cleanup interval started (every 5 minutes)');
  }

  /**
   * Clean up stale viewers
   * Removes viewers that have been viewing for longer than maxAgeMinutes
   * @param {Number} maxAgeMinutes - Maximum age in minutes (default: 30)
   */
  cleanupStaleViewers(maxAgeMinutes = 30) {
    try {
      const now = new Date();
      const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
      let cleanedCount = 0;

      // Iterate through all tickets
      for (const [ticketId, ticketViewers] of this.activeViewers.entries()) {
        const staleViewers = [];

        // Find stale viewers
        for (const [agentId, viewer] of ticketViewers.entries()) {
          const age = now - new Date(viewer.since);
          if (age > maxAge) {
            staleViewers.push(agentId);
          }
        }

        // Remove stale viewers
        staleViewers.forEach(agentId => {
          ticketViewers.delete(agentId);
          cleanedCount++;

          // Notify others
          const roomId = `ticket:${ticketId}`;
          this.io.to(roomId).emit('agent:left', {
            ticketId,
            agentId,
            timestamp: now,
            reason: 'stale'
          });
        });

        // Emit updated viewers list if we removed any
        if (staleViewers.length > 0) {
          const currentViewers = this.getViewers(ticketId);
          this.io.to(`ticket:${ticketId}`).emit('viewers:updated', {
            ticketId,
            viewers: currentViewers,
            count: currentViewers.length
          });
        }

        // Clean up empty ticket entries
        if (ticketViewers.size === 0) {
          this.activeViewers.delete(ticketId);
        }
      }

      if (cleanedCount > 0) {
        logger.info(`🧹 Cleaned up ${cleanedCount} stale viewer(s)`, {
          maxAgeMinutes,
          remainingTickets: this.activeViewers.size
        });
      }

      logger.debug('Ticket collision cleanup completed', {
        activeTickets: this.activeViewers.size,
        cleanedViewers: cleanedCount
      });
    } catch (error) {
      logger.error('Error in cleanupStaleViewers:', error.message);
    }
  }

  /**
   * Get statistics about active viewers
   * @returns {Object} Statistics object
   */
  getStats() {
    let totalViewers = 0;
    let typingCount = 0;
    const ticketStats = [];

    for (const [ticketId, ticketViewers] of this.activeViewers.entries()) {
      const viewers = Array.from(ticketViewers.values());
      totalViewers += viewers.length;
      const typing = viewers.filter(v => v.status === 'typing').length;
      typingCount += typing;

      ticketStats.push({
        ticketId,
        viewerCount: viewers.length,
        typingCount: typing
      });
    }

    return {
      activeTickets: this.activeViewers.size,
      totalViewers,
      typingCount,
      tickets: ticketStats
    };
  }

  /**
   * Shutdown cleanup
   * Clear intervals and clean up resources
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('✅ Ticket collision cleanup interval stopped');
    }

    // Clear all data
    this.activeViewers.clear();
    this.socketToTickets.clear();

    logger.info('✅ Ticket collision handler shut down');
  }
}

module.exports = TicketCollisionHandler;
