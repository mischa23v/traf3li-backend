/**
 * Status Page Service for TRAF3LI
 *
 * Provides public status page functionality with:
 * - Component status tracking and health checks
 * - Incident management and notifications
 * - Scheduled maintenance windows
 * - Subscriber management and notifications
 * - Uptime calculations and history
 *
 * Integration:
 * - Uses Email service for subscriber notifications
 * - Supports automatic health checks via HTTP endpoints
 * - Tracks component uptime and availability
 */

const axios = require('axios');
const logger = require('../utils/logger');
const EmailService = require('./email.service');
const crypto = require('crypto');

// Status types
const COMPONENT_STATUS = {
  OPERATIONAL: 'operational',
  DEGRADED: 'degraded_performance',
  PARTIAL: 'partial_outage',
  MAJOR: 'major_outage',
  MAINTENANCE: 'under_maintenance'
};

const INCIDENT_STATUS = {
  INVESTIGATING: 'investigating',
  IDENTIFIED: 'identified',
  MONITORING: 'monitoring',
  RESOLVED: 'resolved'
};

const INCIDENT_IMPACT = {
  NONE: 'none',
  MINOR: 'minor',
  MAJOR: 'major',
  CRITICAL: 'critical'
};

const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

class StatusPageService {
  /**
   * Get public status page data
   * @returns {Promise<Object>} Public status data
   */
  static async getPublicStatus() {
    try {
      const StatusPageComponent = require('../models/statusPageComponent.model');
      const StatusPageIncident = require('../models/statusPageIncident.model');
      const StatusPageMaintenance = require('../models/statusPageMaintenance.model');

      // Get all public components with current status
      const components = await StatusPageComponent.find({ isPublic: true })
        .select('name description status group order')
        .sort({ order: 1, name: 1 })
        .lean();

      // Get active incidents (not resolved)
      const activeIncidents = await StatusPageIncident.find({
        status: { $ne: INCIDENT_STATUS.RESOLVED },
        isPublic: true
      })
        .select('title description status impact createdAt updates affectedComponents')
        .sort({ createdAt: -1 })
        .populate('affectedComponents', 'name')
        .lean();

      // Get upcoming and in-progress maintenance
      const now = new Date();
      const upcomingMaintenance = await StatusPageMaintenance.find({
        status: { $in: [MAINTENANCE_STATUS.SCHEDULED, MAINTENANCE_STATUS.IN_PROGRESS] },
        scheduledFor: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // Include ongoing from last 24h
      })
        .select('title description status scheduledFor estimatedDuration affectedComponents')
        .sort({ scheduledFor: 1 })
        .populate('affectedComponents', 'name')
        .lean();

      // Calculate overall status
      const overallStatus = this._calculateOverallStatus(components, activeIncidents);

      return {
        status: overallStatus,
        components,
        incidents: activeIncidents,
        maintenance: upcomingMaintenance,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting public status:', error);
      throw new Error(`Failed to get public status: ${error.message}`);
    }
  }

  /**
   * Get single component status
   * @param {ObjectId} componentId - Component ID
   * @returns {Promise<Object>} Component with status history
   */
  static async getComponentStatus(componentId) {
    try {
      const StatusPageComponent = require('../models/statusPageComponent.model');

      const component = await StatusPageComponent.findById(componentId).lean();
      if (!component) {
        throw new Error('Component not found');
      }

      // Get recent status history (last 90 days)
      const history = await this.getStatusHistory(componentId, 90);

      // Calculate uptime for different periods
      const uptime = {
        day: await this.calculateUptime(componentId, 'day'),
        week: await this.calculateUptime(componentId, 'week'),
        month: await this.calculateUptime(componentId, 'month'),
        quarter: await this.calculateUptime(componentId, 'quarter')
      };

      return {
        component,
        history,
        uptime
      };
    } catch (error) {
      logger.error('Error getting component status:', error);
      throw new Error(`Failed to get component status: ${error.message}`);
    }
  }

  /**
   * Update component status
   * @param {ObjectId} componentId - Component ID
   * @param {String} status - New status
   * @param {ObjectId} userId - User making the change
   * @returns {Promise<Object>} Updated component
   */
  static async updateComponentStatus(componentId, status, userId) {
    try {
      const StatusPageComponent = require('../models/statusPageComponent.model');
      const StatusPageStatusHistory = require('../models/statusPageStatusHistory.model');

      const component = await StatusPageComponent.findById(componentId);
      if (!component) {
        throw new Error('Component not found');
      }

      const oldStatus = component.status;

      // Update component status
      component.status = status;
      component.lastChecked = new Date();
      component.updatedBy = userId;
      await component.save();

      // Record status change in history
      await StatusPageStatusHistory.create({
        component: componentId,
        status,
        previousStatus: oldStatus,
        changedBy: userId,
        timestamp: new Date()
      });

      logger.info(`Component status updated: ${component.name} from ${oldStatus} to ${status}`);

      return component;
    } catch (error) {
      logger.error('Error updating component status:', error);
      throw new Error(`Failed to update component status: ${error.message}`);
    }
  }

  /**
   * Run health checks on all components
   * @returns {Promise<Object>} Health check results
   */
  static async runHealthChecks() {
    try {
      const StatusPageComponent = require('../models/statusPageComponent.model');

      const components = await StatusPageComponent.find({
        healthCheckEnabled: true,
        healthCheckUrl: { $exists: true, $ne: null }
      });

      const results = [];

      for (const component of components) {
        try {
          const result = await this._checkComponentHealth(component);
          results.push(result);

          // Update component status if changed
          if (result.newStatus && result.newStatus !== component.status) {
            await this.updateComponentStatus(
              component._id,
              result.newStatus,
              null // System-triggered update
            );
          }
        } catch (error) {
          logger.error(`Health check failed for component ${component.name}:`, error);
          results.push({
            componentId: component._id,
            componentName: component.name,
            success: false,
            error: error.message
          });
        }
      }

      logger.info(`Health checks completed: ${results.length} components checked`);

      return {
        totalChecked: results.length,
        results,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error running health checks:', error);
      throw new Error(`Failed to run health checks: ${error.message}`);
    }
  }

  /**
   * Create new incident
   * @param {Object} data - Incident data
   * @param {ObjectId} userId - User creating the incident
   * @returns {Promise<Object>} Created incident
   */
  static async createIncident(data, userId) {
    try {
      const StatusPageIncident = require('../models/statusPageIncident.model');

      const incident = await StatusPageIncident.create({
        title: data.title,
        description: data.description,
        status: data.status || INCIDENT_STATUS.INVESTIGATING,
        impact: data.impact || INCIDENT_IMPACT.MINOR,
        affectedComponents: data.affectedComponents || [],
        isPublic: data.isPublic !== false,
        createdBy: userId,
        updates: [{
          status: data.status || INCIDENT_STATUS.INVESTIGATING,
          message: data.description,
          createdBy: userId,
          createdAt: new Date()
        }]
      });

      // Update affected components status
      if (data.affectedComponents && data.affectedComponents.length > 0) {
        await this._updateComponentsForIncident(data.affectedComponents, data.impact);
      }

      // Notify subscribers
      await this.notifySubscribers(incident, 'incident_created');

      logger.info(`Incident created: ${incident.title} (ID: ${incident._id})`);

      return incident;
    } catch (error) {
      logger.error('Error creating incident:', error);
      throw new Error(`Failed to create incident: ${error.message}`);
    }
  }

  /**
   * Update incident with new status/information
   * @param {ObjectId} incidentId - Incident ID
   * @param {Object} data - Update data
   * @param {ObjectId} userId - User making the update
   * @returns {Promise<Object>} Updated incident
   */
  static async updateIncident(incidentId, data, userId) {
    try {
      const StatusPageIncident = require('../models/statusPageIncident.model');

      const incident = await StatusPageIncident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // Add update to incident
      incident.updates.push({
        status: data.status || incident.status,
        message: data.message,
        createdBy: userId,
        createdAt: new Date()
      });

      // Update incident fields
      if (data.status) incident.status = data.status;
      if (data.impact) incident.impact = data.impact;
      if (data.title) incident.title = data.title;

      await incident.save();

      // Notify subscribers of update
      await this.notifySubscribers(incident, 'incident_updated');

      logger.info(`Incident updated: ${incident.title} (ID: ${incident._id})`);

      return incident;
    } catch (error) {
      logger.error('Error updating incident:', error);
      throw new Error(`Failed to update incident: ${error.message}`);
    }
  }

  /**
   * Resolve incident
   * @param {ObjectId} incidentId - Incident ID
   * @param {String} message - Resolution message
   * @param {ObjectId} userId - User resolving the incident
   * @returns {Promise<Object>} Resolved incident
   */
  static async resolveIncident(incidentId, message, userId) {
    try {
      const StatusPageIncident = require('../models/statusPageIncident.model');
      const StatusPageComponent = require('../models/statusPageComponent.model');

      const incident = await StatusPageIncident.findById(incidentId);
      if (!incident) {
        throw new Error('Incident not found');
      }

      // Mark as resolved
      incident.status = INCIDENT_STATUS.RESOLVED;
      incident.resolvedAt = new Date();
      incident.resolvedBy = userId;

      incident.updates.push({
        status: INCIDENT_STATUS.RESOLVED,
        message: message || 'This incident has been resolved.',
        createdBy: userId,
        createdAt: new Date()
      });

      await incident.save();

      // Restore affected components to operational
      if (incident.affectedComponents && incident.affectedComponents.length > 0) {
        await StatusPageComponent.updateMany(
          { _id: { $in: incident.affectedComponents } },
          { status: COMPONENT_STATUS.OPERATIONAL }
        );
      }

      // Notify subscribers
      await this.notifySubscribers(incident, 'incident_resolved');

      logger.info(`Incident resolved: ${incident.title} (ID: ${incident._id})`);

      return incident;
    } catch (error) {
      logger.error('Error resolving incident:', error);
      throw new Error(`Failed to resolve incident: ${error.message}`);
    }
  }

  /**
   * Get incident history
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Past incidents
   */
  static async getIncidentHistory(filters = {}) {
    try {
      const StatusPageIncident = require('../models/statusPageIncident.model');

      const query = { isPublic: true };

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.impact) {
        query.impact = filters.impact;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
        if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
      }

      if (filters.componentId) {
        query.affectedComponents = filters.componentId;
      }

      const incidents = await StatusPageIncident.find(query)
        .select('title description status impact createdAt resolvedAt affectedComponents')
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .populate('affectedComponents', 'name')
        .lean();

      return incidents;
    } catch (error) {
      logger.error('Error getting incident history:', error);
      throw new Error(`Failed to get incident history: ${error.message}`);
    }
  }

  /**
   * Schedule maintenance window
   * @param {Object} data - Maintenance data
   * @param {ObjectId} userId - User scheduling the maintenance
   * @returns {Promise<Object>} Scheduled maintenance
   */
  static async scheduleMaintenance(data, userId) {
    try {
      const StatusPageMaintenance = require('../models/statusPageMaintenance.model');

      const maintenance = await StatusPageMaintenance.create({
        title: data.title,
        description: data.description,
        status: MAINTENANCE_STATUS.SCHEDULED,
        scheduledFor: new Date(data.scheduledFor),
        estimatedDuration: data.estimatedDuration, // in minutes
        affectedComponents: data.affectedComponents || [],
        autoStart: data.autoStart !== false,
        autoComplete: data.autoComplete !== false,
        createdBy: userId
      });

      // Notify subscribers
      await this.notifySubscribers(maintenance, 'maintenance_scheduled');

      logger.info(`Maintenance scheduled: ${maintenance.title} for ${maintenance.scheduledFor}`);

      return maintenance;
    } catch (error) {
      logger.error('Error scheduling maintenance:', error);
      throw new Error(`Failed to schedule maintenance: ${error.message}`);
    }
  }

  /**
   * Start maintenance window
   * @param {ObjectId} maintenanceId - Maintenance ID
   * @returns {Promise<Object>} Started maintenance
   */
  static async startMaintenance(maintenanceId) {
    try {
      const StatusPageMaintenance = require('../models/statusPageMaintenance.model');
      const StatusPageComponent = require('../models/statusPageComponent.model');

      const maintenance = await StatusPageMaintenance.findById(maintenanceId);
      if (!maintenance) {
        throw new Error('Maintenance not found');
      }

      if (maintenance.status !== MAINTENANCE_STATUS.SCHEDULED) {
        throw new Error('Maintenance is not in scheduled status');
      }

      maintenance.status = MAINTENANCE_STATUS.IN_PROGRESS;
      maintenance.startedAt = new Date();
      await maintenance.save();

      // Update affected components
      if (maintenance.affectedComponents && maintenance.affectedComponents.length > 0) {
        await StatusPageComponent.updateMany(
          { _id: { $in: maintenance.affectedComponents } },
          { status: COMPONENT_STATUS.MAINTENANCE }
        );
      }

      // Notify subscribers
      await this.notifySubscribers(maintenance, 'maintenance_started');

      logger.info(`Maintenance started: ${maintenance.title} (ID: ${maintenance._id})`);

      return maintenance;
    } catch (error) {
      logger.error('Error starting maintenance:', error);
      throw new Error(`Failed to start maintenance: ${error.message}`);
    }
  }

  /**
   * Complete maintenance window
   * @param {ObjectId} maintenanceId - Maintenance ID
   * @returns {Promise<Object>} Completed maintenance
   */
  static async completeMaintenance(maintenanceId) {
    try {
      const StatusPageMaintenance = require('../models/statusPageMaintenance.model');
      const StatusPageComponent = require('../models/statusPageComponent.model');

      const maintenance = await StatusPageMaintenance.findById(maintenanceId);
      if (!maintenance) {
        throw new Error('Maintenance not found');
      }

      if (maintenance.status !== MAINTENANCE_STATUS.IN_PROGRESS) {
        throw new Error('Maintenance is not in progress');
      }

      maintenance.status = MAINTENANCE_STATUS.COMPLETED;
      maintenance.completedAt = new Date();
      await maintenance.save();

      // Restore affected components
      if (maintenance.affectedComponents && maintenance.affectedComponents.length > 0) {
        await StatusPageComponent.updateMany(
          { _id: { $in: maintenance.affectedComponents } },
          { status: COMPONENT_STATUS.OPERATIONAL }
        );
      }

      // Notify subscribers
      await this.notifySubscribers(maintenance, 'maintenance_completed');

      logger.info(`Maintenance completed: ${maintenance.title} (ID: ${maintenance._id})`);

      return maintenance;
    } catch (error) {
      logger.error('Error completing maintenance:', error);
      throw new Error(`Failed to complete maintenance: ${error.message}`);
    }
  }

  /**
   * Cancel scheduled maintenance
   * @param {ObjectId} maintenanceId - Maintenance ID
   * @param {String} reason - Cancellation reason
   * @returns {Promise<Object>} Cancelled maintenance
   */
  static async cancelMaintenance(maintenanceId, reason) {
    try {
      const StatusPageMaintenance = require('../models/statusPageMaintenance.model');

      const maintenance = await StatusPageMaintenance.findById(maintenanceId);
      if (!maintenance) {
        throw new Error('Maintenance not found');
      }

      if (maintenance.status === MAINTENANCE_STATUS.COMPLETED) {
        throw new Error('Cannot cancel completed maintenance');
      }

      maintenance.status = MAINTENANCE_STATUS.CANCELLED;
      maintenance.cancellationReason = reason;
      maintenance.cancelledAt = new Date();
      await maintenance.save();

      // Notify subscribers
      await this.notifySubscribers(maintenance, 'maintenance_cancelled');

      logger.info(`Maintenance cancelled: ${maintenance.title} (ID: ${maintenance._id})`);

      return maintenance;
    } catch (error) {
      logger.error('Error cancelling maintenance:', error);
      throw new Error(`Failed to cancel maintenance: ${error.message}`);
    }
  }

  /**
   * Subscribe to status updates
   * @param {String} email - Subscriber email
   * @param {Array} components - Component IDs to subscribe to (empty = all)
   * @param {Array} incidentTypes - Types of incidents to receive (empty = all)
   * @returns {Promise<Object>} Subscription details
   */
  static async subscribeToStatus(email, components = [], incidentTypes = []) {
    try {
      const StatusPageSubscription = require('../models/statusPageSubscription.model');

      // Check if already subscribed
      let subscription = await StatusPageSubscription.findOne({ email });

      if (subscription) {
        // Update existing subscription
        subscription.components = components.length > 0 ? components : subscription.components;
        subscription.incidentTypes = incidentTypes.length > 0 ? incidentTypes : subscription.incidentTypes;
        subscription.isActive = true;
        await subscription.save();
      } else {
        // Create new subscription with verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        subscription = await StatusPageSubscription.create({
          email,
          components,
          incidentTypes,
          verificationToken,
          isVerified: false,
          isActive: true
        });

        // Send verification email
        await this._sendVerificationEmail(email, verificationToken);
      }

      logger.info(`Subscription created/updated for: ${email}`);

      return {
        email: subscription.email,
        components: subscription.components,
        incidentTypes: subscription.incidentTypes,
        requiresVerification: !subscription.isVerified
      };
    } catch (error) {
      logger.error('Error subscribing to status:', error);
      throw new Error(`Failed to subscribe: ${error.message}`);
    }
  }

  /**
   * Unsubscribe from status updates
   * @param {String} token - Unsubscribe token
   * @returns {Promise<Object>} Unsubscribe confirmation
   */
  static async unsubscribe(token) {
    try {
      const StatusPageSubscription = require('../models/statusPageSubscription.model');

      const subscription = await StatusPageSubscription.findOne({
        unsubscribeToken: token
      });

      if (!subscription) {
        throw new Error('Invalid unsubscribe token');
      }

      subscription.isActive = false;
      subscription.unsubscribedAt = new Date();
      await subscription.save();

      logger.info(`Unsubscribed: ${subscription.email}`);

      return {
        success: true,
        email: subscription.email,
        message: 'Successfully unsubscribed from status updates'
      };
    } catch (error) {
      logger.error('Error unsubscribing:', error);
      throw new Error(`Failed to unsubscribe: ${error.message}`);
    }
  }

  /**
   * Notify subscribers about incident/maintenance
   * @param {Object} item - Incident or maintenance object
   * @param {String} type - Notification type
   * @returns {Promise<Object>} Notification results
   */
  static async notifySubscribers(item, type) {
    try {
      const StatusPageSubscription = require('../models/statusPageSubscription.model');

      // Get active, verified subscribers
      const query = { isActive: true, isVerified: true };

      // Filter by affected components if specified
      if (item.affectedComponents && item.affectedComponents.length > 0) {
        query.$or = [
          { components: { $size: 0 } }, // Subscribed to all
          { components: { $in: item.affectedComponents } } // Subscribed to specific components
        ];
      }

      const subscribers = await StatusPageSubscription.find(query).lean();

      const notifications = [];

      for (const subscriber of subscribers) {
        try {
          await this._sendNotificationEmail(subscriber.email, item, type);
          notifications.push({ email: subscriber.email, success: true });
        } catch (error) {
          logger.error(`Failed to notify ${subscriber.email}:`, error);
          notifications.push({ email: subscriber.email, success: false, error: error.message });
        }
      }

      logger.info(`Notified ${notifications.filter(n => n.success).length}/${subscribers.length} subscribers`);

      return {
        total: subscribers.length,
        successful: notifications.filter(n => n.success).length,
        failed: notifications.filter(n => !n.success).length
      };
    } catch (error) {
      logger.error('Error notifying subscribers:', error);
      throw new Error(`Failed to notify subscribers: ${error.message}`);
    }
  }

  /**
   * Get status history for a component
   * @param {ObjectId} componentId - Component ID
   * @param {Number} days - Number of days to look back
   * @returns {Promise<Array>} Status history
   */
  static async getStatusHistory(componentId, days = 30) {
    try {
      const StatusPageStatusHistory = require('../models/statusPageStatusHistory.model');

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const history = await StatusPageStatusHistory.find({
        component: componentId,
        timestamp: { $gte: startDate }
      })
        .sort({ timestamp: -1 })
        .lean();

      return history;
    } catch (error) {
      logger.error('Error getting status history:', error);
      throw new Error(`Failed to get status history: ${error.message}`);
    }
  }

  /**
   * Calculate uptime percentage for a component
   * @param {ObjectId} componentId - Component ID
   * @param {String} period - Period (day, week, month, quarter, year)
   * @returns {Promise<Object>} Uptime data
   */
  static async calculateUptime(componentId, period = 'month') {
    try {
      const StatusPageStatusHistory = require('../models/statusPageStatusHistory.model');

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();

      switch (period) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default:
          startDate.setMonth(startDate.getMonth() - 1);
      }

      // Get status changes in period
      const statusChanges = await StatusPageStatusHistory.find({
        component: componentId,
        timestamp: { $gte: startDate, $lte: endDate }
      })
        .sort({ timestamp: 1 })
        .lean();

      if (statusChanges.length === 0) {
        // No status changes means component was operational the entire time
        return {
          period,
          uptime: 100,
          downtime: 0,
          totalMinutes: this._getMinutesBetween(startDate, endDate)
        };
      }

      // Calculate uptime
      let uptimeMinutes = 0;
      let currentStatus = statusChanges[0].previousStatus || COMPONENT_STATUS.OPERATIONAL;
      let currentTime = startDate;

      for (const change of statusChanges) {
        const duration = this._getMinutesBetween(currentTime, change.timestamp);

        if (this._isOperationalStatus(currentStatus)) {
          uptimeMinutes += duration;
        }

        currentStatus = change.status;
        currentTime = change.timestamp;
      }

      // Add time from last status change to end date
      const finalDuration = this._getMinutesBetween(currentTime, endDate);
      if (this._isOperationalStatus(currentStatus)) {
        uptimeMinutes += finalDuration;
      }

      const totalMinutes = this._getMinutesBetween(startDate, endDate);
      const uptimePercentage = (uptimeMinutes / totalMinutes) * 100;

      return {
        period,
        uptime: Math.round(uptimePercentage * 100) / 100, // Round to 2 decimal places
        downtime: totalMinutes - uptimeMinutes,
        totalMinutes,
        startDate,
        endDate
      };
    } catch (error) {
      logger.error('Error calculating uptime:', error);
      throw new Error(`Failed to calculate uptime: ${error.message}`);
    }
  }

  // ========================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================

  /**
   * Check component health via HTTP endpoint
   * @private
   */
  static async _checkComponentHealth(component) {
    const startTime = Date.now();

    try {
      const timeout = component.healthCheckTimeout || 10000; // 10s default
      const expectedStatus = component.healthCheckExpectedStatus || 200;

      const response = await axios({
        method: component.healthCheckMethod || 'GET',
        url: component.healthCheckUrl,
        timeout,
        validateStatus: () => true // Don't throw on any status
      });

      const responseTime = Date.now() - startTime;

      // Determine new status based on response
      let newStatus;

      if (response.status === expectedStatus) {
        if (responseTime > (component.healthCheckSlowThreshold || 5000)) {
          newStatus = COMPONENT_STATUS.DEGRADED;
        } else {
          newStatus = COMPONENT_STATUS.OPERATIONAL;
        }
      } else if (response.status >= 500) {
        newStatus = COMPONENT_STATUS.MAJOR;
      } else if (response.status >= 400) {
        newStatus = COMPONENT_STATUS.PARTIAL;
      } else {
        newStatus = COMPONENT_STATUS.DEGRADED;
      }

      // Update component
      component.lastChecked = new Date();
      component.lastResponseTime = responseTime;
      await component.save();

      return {
        componentId: component._id,
        componentName: component.name,
        success: true,
        status: response.status,
        responseTime,
        newStatus,
        previousStatus: component.status
      };
    } catch (error) {
      component.lastChecked = new Date();
      await component.save();

      return {
        componentId: component._id,
        componentName: component.name,
        success: false,
        error: error.message,
        newStatus: COMPONENT_STATUS.MAJOR,
        previousStatus: component.status
      };
    }
  }

  /**
   * Calculate overall status from components and incidents
   * @private
   */
  static _calculateOverallStatus(components, incidents) {
    // Check for critical incidents
    const hasCriticalIncident = incidents.some(
      i => i.impact === INCIDENT_IMPACT.CRITICAL
    );

    if (hasCriticalIncident) {
      return COMPONENT_STATUS.MAJOR;
    }

    // Check component statuses
    const hasMajorOutage = components.some(
      c => c.status === COMPONENT_STATUS.MAJOR
    );

    if (hasMajorOutage) {
      return COMPONENT_STATUS.MAJOR;
    }

    const hasPartialOutage = components.some(
      c => c.status === COMPONENT_STATUS.PARTIAL
    );

    if (hasPartialOutage) {
      return COMPONENT_STATUS.PARTIAL;
    }

    const hasDegraded = components.some(
      c => c.status === COMPONENT_STATUS.DEGRADED
    );

    if (hasDegraded || incidents.length > 0) {
      return COMPONENT_STATUS.DEGRADED;
    }

    return COMPONENT_STATUS.OPERATIONAL;
  }

  /**
   * Update component statuses based on incident impact
   * @private
   */
  static async _updateComponentsForIncident(componentIds, impact) {
    const StatusPageComponent = require('../models/statusPageComponent.model');

    let status;
    switch (impact) {
      case INCIDENT_IMPACT.CRITICAL:
        status = COMPONENT_STATUS.MAJOR;
        break;
      case INCIDENT_IMPACT.MAJOR:
        status = COMPONENT_STATUS.PARTIAL;
        break;
      case INCIDENT_IMPACT.MINOR:
        status = COMPONENT_STATUS.DEGRADED;
        break;
      default:
        return;
    }

    await StatusPageComponent.updateMany(
      { _id: { $in: componentIds } },
      { status }
    );
  }

  /**
   * Send verification email to new subscriber
   * @private
   */
  static async _sendVerificationEmail(email, token) {
    try {
      const verifyUrl = `${process.env.DASHBOARD_URL || 'https://status.traf3li.com'}/verify?token=${token}`;

      const html = `
        <h2>Verify your subscription</h2>
        <p>Thank you for subscribing to TRAF3LI status updates!</p>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>If you didn't request this subscription, you can safely ignore this email.</p>
      `;

      await EmailService.sendEmail({
        to: email,
        subject: 'Verify your status page subscription',
        html
      });
    } catch (error) {
      logger.error('Error sending verification email:', error);
      // Don't throw - subscription still created
    }
  }

  /**
   * Send notification email to subscriber
   * @private
   */
  static async _sendNotificationEmail(email, item, type) {
    const isIncident = item.impact !== undefined;
    const isMaintenance = item.scheduledFor !== undefined;

    let subject, html;

    if (type === 'incident_created') {
      subject = `[Status Update] New Incident: ${item.title}`;
      html = `
        <h2>New Incident Reported</h2>
        <p><strong>${item.title}</strong></p>
        <p>Status: ${item.status}</p>
        <p>Impact: ${item.impact}</p>
        <p>${item.description}</p>
        <p><a href="${process.env.DASHBOARD_URL || 'https://status.traf3li.com'}">View Status Page</a></p>
      `;
    } else if (type === 'incident_updated') {
      const latestUpdate = item.updates[item.updates.length - 1];
      subject = `[Status Update] Incident Update: ${item.title}`;
      html = `
        <h2>Incident Updated</h2>
        <p><strong>${item.title}</strong></p>
        <p>Status: ${item.status}</p>
        <p><strong>Latest Update:</strong></p>
        <p>${latestUpdate.message}</p>
        <p><a href="${process.env.DASHBOARD_URL || 'https://status.traf3li.com'}">View Status Page</a></p>
      `;
    } else if (type === 'incident_resolved') {
      subject = `[Status Update] Incident Resolved: ${item.title}`;
      html = `
        <h2>Incident Resolved</h2>
        <p><strong>${item.title}</strong></p>
        <p>This incident has been resolved.</p>
        <p>All affected systems are now operational.</p>
        <p><a href="${process.env.DASHBOARD_URL || 'https://status.traf3li.com'}">View Status Page</a></p>
      `;
    } else if (type === 'maintenance_scheduled') {
      subject = `[Status Update] Scheduled Maintenance: ${item.title}`;
      html = `
        <h2>Scheduled Maintenance</h2>
        <p><strong>${item.title}</strong></p>
        <p>Scheduled for: ${new Date(item.scheduledFor).toLocaleString()}</p>
        <p>Estimated duration: ${item.estimatedDuration} minutes</p>
        <p>${item.description}</p>
        <p><a href="${process.env.DASHBOARD_URL || 'https://status.traf3li.com'}">View Status Page</a></p>
      `;
    } else if (type === 'maintenance_started') {
      subject = `[Status Update] Maintenance Started: ${item.title}`;
      html = `
        <h2>Maintenance In Progress</h2>
        <p><strong>${item.title}</strong></p>
        <p>Maintenance has started and is currently in progress.</p>
        <p>Expected duration: ${item.estimatedDuration} minutes</p>
        <p><a href="${process.env.DASHBOARD_URL || 'https://status.traf3li.com'}">View Status Page</a></p>
      `;
    } else if (type === 'maintenance_completed') {
      subject = `[Status Update] Maintenance Completed: ${item.title}`;
      html = `
        <h2>Maintenance Completed</h2>
        <p><strong>${item.title}</strong></p>
        <p>Scheduled maintenance has been completed successfully.</p>
        <p>All systems are now operational.</p>
        <p><a href="${process.env.DASHBOARD_URL || 'https://status.traf3li.com'}">View Status Page</a></p>
      `;
    } else if (type === 'maintenance_cancelled') {
      subject = `[Status Update] Maintenance Cancelled: ${item.title}`;
      html = `
        <h2>Maintenance Cancelled</h2>
        <p><strong>${item.title}</strong></p>
        <p>The scheduled maintenance has been cancelled.</p>
        ${item.cancellationReason ? `<p>Reason: ${item.cancellationReason}</p>` : ''}
        <p><a href="${process.env.DASHBOARD_URL || 'https://status.traf3li.com'}">View Status Page</a></p>
      `;
    }

    await EmailService.sendEmail({
      to: email,
      subject,
      html
    });
  }

  /**
   * Check if status is considered operational
   * @private
   */
  static _isOperationalStatus(status) {
    return status === COMPONENT_STATUS.OPERATIONAL || status === COMPONENT_STATUS.MAINTENANCE;
  }

  /**
   * Get minutes between two dates
   * @private
   */
  static _getMinutesBetween(date1, date2) {
    return Math.abs(date2 - date1) / (1000 * 60);
  }
}

// Export constants for use in other modules
module.exports = StatusPageService;
module.exports.COMPONENT_STATUS = COMPONENT_STATUS;
module.exports.INCIDENT_STATUS = INCIDENT_STATUS;
module.exports.INCIDENT_IMPACT = INCIDENT_IMPACT;
module.exports.MAINTENANCE_STATUS = MAINTENANCE_STATUS;
