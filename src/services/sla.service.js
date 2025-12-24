/**
 * SLA Service for TRAF3LI
 *
 * Manages Service Level Agreement tracking and breach detection for the lawyer dashboard CRM.
 *
 * Features:
 * - Business hours-aware SLA calculations
 * - Holiday and pause time handling
 * - Automatic breach detection and notifications
 * - SLA status indicators for UI
 * - Performance analytics and reporting
 *
 * Integration:
 * - Works with Case model for ticket/case tracking
 * - Uses EmailService for breach notifications
 * - Integrates with firm business hours and holidays
 */

const mongoose = require('mongoose');
const { SLA, SLAInstance } = require('../models/sla.model');
const Case = require('../models/case.model');
const Firm = require('../models/firm.model');
const EmailService = require('./email.service');
const logger = require('../utils/logger');

/**
 * Notification thresholds (percentage of target time)
 */
const NOTIFICATION_THRESHOLDS = {
  warning: 80,   // Warn at 80% of target time
  critical: 95   // Critical warning at 95% of target time
};

/**
 * Status indicator colors for UI
 */
const STATUS_INDICATORS = {
  breached: { color: '#dc2626', icon: 'alert-circle', label: 'Breached' },
  critical: { color: '#f59e0b', icon: 'alert-triangle', label: 'Critical' },
  warning: { color: '#fbbf24', icon: 'clock', label: 'Warning' },
  onTrack: { color: '#10b981', icon: 'check-circle', label: 'On Track' },
  achieved: { color: '#059669', icon: 'check', label: 'Achieved' },
  paused: { color: '#6b7280', icon: 'pause-circle', label: 'Paused' }
};

class SLAService {
  // ═══════════════════════════════════════════════════════════════
  // CORE SLA CALCULATION METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate target time considering business hours
   *
   * @param {Object} sla - SLA configuration document
   * @param {String} metric - Metric name (firstResponseTime, nextResponseTime, timeToClose, timeToResolve)
   * @param {Date} startTime - Start time for calculation
   * @returns {Promise<Date>} Target completion time
   */
  static async calculateTargetTime(sla, metric, startTime) {
    try {
      const metricConfig = sla.metrics[metric];
      if (!metricConfig) {
        throw new Error(`Metric ${metric} not configured in SLA`);
      }

      const targetMinutes = metricConfig.target;
      const start = new Date(startTime);

      // If business hours not enabled, simple add
      if (!sla.businessHours || !sla.businessHours.enabled) {
        const targetTime = new Date(start.getTime() + targetMinutes * 60 * 1000);
        logger.debug(`SLA target time calculated (simple): ${targetTime} for ${metric}`);
        return targetTime;
      }

      // Calculate with business hours
      const targetTime = await this._calculateBusinessHoursTarget(
        start,
        targetMinutes,
        sla.businessHours
      );

      logger.debug(`SLA target time calculated (business hours): ${targetTime} for ${metric}`);
      return targetTime;
    } catch (error) {
      logger.error('Error calculating SLA target time:', error);
      throw error;
    }
  }

  /**
   * Calculate target time within business hours
   * @private
   */
  static async _calculateBusinessHoursTarget(startTime, targetMinutes, businessHours) {
    const schedule = businessHours.schedule || [];
    const holidays = businessHours.holidays || [];
    const timezone = businessHours.timezone || 'Asia/Riyadh';

    let currentTime = new Date(startTime);
    let remainingMinutes = targetMinutes;

    // Maximum iterations to prevent infinite loops
    const maxIterations = 365; // Max 1 year of iterations
    let iterations = 0;

    while (remainingMinutes > 0 && iterations < maxIterations) {
      iterations++;

      // Check if current date is a holiday
      const isHoliday = holidays.some(holiday => {
        const holidayDate = new Date(holiday);
        return currentTime.toDateString() === holidayDate.toDateString();
      });

      if (isHoliday) {
        // Skip to next day
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(0, 0, 0, 0);
        continue;
      }

      // Get business hours for current day
      const dayOfWeek = currentTime.getDay();
      const daySchedule = schedule.find(s => s.day === dayOfWeek);

      if (!daySchedule) {
        // Non-working day, skip to next day
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(0, 0, 0, 0);
        continue;
      }

      // Parse start and end times
      const [startHour, startMinute] = daySchedule.startTime.split(':').map(Number);
      const [endHour, endMinute] = daySchedule.endTime.split(':').map(Number);

      const dayStart = new Date(currentTime);
      dayStart.setHours(startHour, startMinute, 0, 0);

      const dayEnd = new Date(currentTime);
      dayEnd.setHours(endHour, endMinute, 0, 0);

      // If current time is before business hours start, move to start
      if (currentTime < dayStart) {
        currentTime = new Date(dayStart);
      }

      // If current time is after business hours end, move to next day
      if (currentTime >= dayEnd) {
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(0, 0, 0, 0);
        continue;
      }

      // Calculate remaining business minutes in current day
      const remainingBusinessMinutesInDay = Math.floor((dayEnd - currentTime) / (60 * 1000));

      if (remainingMinutes <= remainingBusinessMinutesInDay) {
        // Target time is within current business day
        currentTime = new Date(currentTime.getTime() + remainingMinutes * 60 * 1000);
        remainingMinutes = 0;
      } else {
        // Use up the rest of current business day
        remainingMinutes -= remainingBusinessMinutesInDay;
        currentTime.setDate(currentTime.getDate() + 1);
        currentTime.setHours(0, 0, 0, 0);
      }
    }

    if (iterations >= maxIterations) {
      logger.warn('Max iterations reached in business hours calculation, returning fallback');
      return new Date(startTime.getTime() + targetMinutes * 60 * 1000);
    }

    return currentTime;
  }

  // ═══════════════════════════════════════════════════════════════
  // BREACH DETECTION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check for SLA breaches - run periodically (e.g., every 15 minutes)
   *
   * @param {String} firmId - Firm ID to check breaches for
   * @returns {Promise<Object>} Breach check results
   */
  static async checkBreaches(firmId) {
    try {
      logger.info(`Checking SLA breaches for firm ${firmId}`);

      // Find pending SLA instances for this firm
      const instances = await SLAInstance.find({
        firmId,
        $or: [
          { 'metrics.firstResponse.status': 'pending' },
          { 'metrics.nextResponse.status': 'pending' },
          { 'metrics.resolution.status': 'pending' }
        ]
      }).populate('slaId ticketId');

      const results = {
        checked: instances.length,
        breached: 0,
        warnings: 0,
        criticals: 0,
        updated: []
      };

      const now = new Date();

      for (const instance of instances) {
        // Skip if currently paused
        if (instance.pausedAt) {
          continue;
        }

        let instanceUpdated = false;

        // Check each metric
        for (const metricKey of ['firstResponse', 'nextResponse', 'resolution']) {
          const metric = instance.metrics[metricKey];

          if (!metric || !metric.targetTime || metric.status !== 'pending') {
            continue;
          }

          const targetTime = new Date(metric.targetTime);
          const timeRemaining = targetTime - now;

          // Check if breached
          if (timeRemaining <= 0) {
            metric.status = 'breached';
            results.breached++;
            instanceUpdated = true;

            // Send breach notification
            await this._sendBreachNotification(instance, metricKey, 'breach');

            logger.warn(`SLA breached for ${metricKey} on instance ${instance._id}`);
          } else {
            // Calculate percentage of time elapsed
            const sla = instance.slaId;
            if (sla) {
              const metricName = this._getMetricConfigName(metricKey);
              const metricConfig = sla.metrics[metricName];

              if (metricConfig) {
                const totalTime = metricConfig.target * 60 * 1000; // Convert to ms
                const elapsed = totalTime - timeRemaining;
                const percentageElapsed = (elapsed / totalTime) * 100;

                // Check for critical threshold (95%)
                if (percentageElapsed >= NOTIFICATION_THRESHOLDS.critical) {
                  if (!instance.breachNotificationsSent.includes(`${metricKey}_critical`)) {
                    await this._sendBreachNotification(instance, metricKey, 'critical');
                    instance.breachNotificationsSent.push(`${metricKey}_critical`);
                    results.criticals++;
                    instanceUpdated = true;
                  }
                }
                // Check for warning threshold (80%)
                else if (percentageElapsed >= NOTIFICATION_THRESHOLDS.warning) {
                  if (!instance.breachNotificationsSent.includes(`${metricKey}_warning`)) {
                    await this._sendBreachNotification(instance, metricKey, 'warning');
                    instance.breachNotificationsSent.push(`${metricKey}_warning`);
                    results.warnings++;
                    instanceUpdated = true;
                  }
                }
              }
            }
          }
        }

        if (instanceUpdated) {
          await instance.save();
          results.updated.push(instance._id);
        }
      }

      logger.info(`SLA breach check complete for firm ${firmId}:`, results);
      return results;
    } catch (error) {
      logger.error('Error checking SLA breaches:', error);
      throw error;
    }
  }

  /**
   * Get metric config name from instance metric key
   * @private
   */
  static _getMetricConfigName(metricKey) {
    const mapping = {
      firstResponse: 'firstResponseTime',
      nextResponse: 'nextResponseTime',
      resolution: 'timeToResolve'
    };
    return mapping[metricKey] || metricKey;
  }

  /**
   * Send breach notification
   * @private
   */
  static async _sendBreachNotification(instance, metric, severity) {
    try {
      const ticket = await Case.findById(instance.ticketId).populate('clientId assignedTo');
      if (!ticket) {
        logger.warn(`Ticket ${instance.ticketId} not found for SLA breach notification`);
        return;
      }

      const firm = await Firm.findById(instance.firmId);
      if (!firm) {
        logger.warn(`Firm ${instance.firmId} not found for SLA breach notification`);
        return;
      }

      // Find assigned users to notify
      const recipientEmails = [];
      if (ticket.assignedTo) {
        const assignedUsers = Array.isArray(ticket.assignedTo) ? ticket.assignedTo : [ticket.assignedTo];
        for (const userId of assignedUsers) {
          if (userId && userId.email) {
            recipientEmails.push(userId.email);
          }
        }
      }

      if (recipientEmails.length === 0) {
        logger.warn('No recipients found for SLA breach notification');
        return;
      }

      // Prepare notification based on severity
      const subjects = {
        breach: `🚨 SLA BREACHED: ${ticket.title || ticket.caseNumber}`,
        critical: `⚠️ SLA CRITICAL: ${ticket.title || ticket.caseNumber}`,
        warning: `⏰ SLA WARNING: ${ticket.title || ticket.caseNumber}`
      };

      const colors = {
        breach: '#dc2626',
        critical: '#f59e0b',
        warning: '#fbbf24'
      };

      const metricLabels = {
        firstResponse: 'First Response Time',
        nextResponse: 'Next Response Time',
        resolution: 'Resolution Time'
      };

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${colors[severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">SLA ${severity.toUpperCase()}</h2>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p><strong>Case:</strong> ${ticket.title || ticket.caseNumber}</p>
            <p><strong>Client:</strong> ${ticket.clientId?.name || 'N/A'}</p>
            <p><strong>Metric:</strong> ${metricLabels[metric]}</p>
            <p><strong>Status:</strong> ${severity === 'breach' ? 'BREACHED' : severity.toUpperCase()}</p>

            ${severity === 'breach'
              ? '<p style="color: #dc2626; font-weight: bold;">⚠️ This SLA has been breached. Immediate action required!</p>'
              : severity === 'critical'
              ? '<p style="color: #f59e0b; font-weight: bold;">⚠️ This SLA is approaching breach. Please take action soon!</p>'
              : '<p style="color: #fbbf24;">⏰ This SLA is at 80% of target time. Please monitor closely.</p>'
            }

            <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 5px;">
              <p style="margin: 0;"><strong>Action Required:</strong></p>
              <ul style="margin: 10px 0;">
                <li>Review the case immediately</li>
                <li>${metric === 'firstResponse' ? 'Respond to the client' : metric === 'nextResponse' ? 'Follow up with the client' : 'Work towards resolution'}</li>
                <li>Update case status and add notes</li>
              </ul>
            </div>

            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com'}/cases/${ticket._id}"
                 style="display: inline-block; background-color: ${colors[severity]}; color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold;">
                View Case
              </a>
            </div>
          </div>

          <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 5px; font-size: 12px; color: #666;">
            <p style="margin: 0;">This is an automated SLA notification from Traf3li.</p>
          </div>
        </body>
        </html>
      `;

      // Send to all recipients
      for (const email of recipientEmails) {
        await EmailService.sendEmail({
          to: email,
          subject: subjects[severity],
          html
        }, true); // Use queue
      }

      logger.info(`SLA ${severity} notification sent for instance ${instance._id}, metric ${metric}`);
    } catch (error) {
      logger.error('Error sending SLA breach notification:', error);
      // Don't throw - we don't want notification failures to break breach detection
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SLA APPLICATION AND MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Apply SLA to a ticket/case
   *
   * @param {String} ticketId - Case/ticket ID
   * @param {String} slaId - SLA configuration ID
   * @returns {Promise<Object>} Created SLA instance
   */
  static async applySLA(ticketId, slaId) {
    try {
      logger.info(`Applying SLA ${slaId} to ticket ${ticketId}`);

      // Get SLA configuration
      const sla = await SLA.findById(slaId);
      if (!sla) {
        throw new Error('SLA configuration not found');
      }

      // Get ticket
      const ticket = await Case.findById(ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Check if SLA instance already exists
      const existingInstance = await SLAInstance.findOne({ ticketId, slaId });
      if (existingInstance) {
        logger.warn(`SLA instance already exists for ticket ${ticketId} and SLA ${slaId}`);
        return existingInstance;
      }

      const startTime = new Date();

      // Create SLA instance
      const instance = new SLAInstance({
        ticketId,
        slaId,
        firmId: sla.firmId,
        startedAt: startTime,
        metrics: {}
      });

      // Calculate target times for each configured metric
      if (sla.metrics.firstResponseTime) {
        const targetTime = await this.calculateTargetTime(sla, 'firstResponseTime', startTime);
        instance.metrics.firstResponse = {
          targetTime,
          status: 'pending'
        };
      }

      if (sla.metrics.nextResponseTime) {
        const targetTime = await this.calculateTargetTime(sla, 'nextResponseTime', startTime);
        instance.metrics.nextResponse = {
          targetTime,
          status: 'pending'
        };
      }

      if (sla.metrics.timeToResolve) {
        const targetTime = await this.calculateTargetTime(sla, 'timeToResolve', startTime);
        instance.metrics.resolution = {
          targetTime,
          status: 'pending'
        };
      }

      await instance.save();

      logger.info(`SLA instance created: ${instance._id}`);
      return instance;
    } catch (error) {
      logger.error('Error applying SLA:', error);
      throw error;
    }
  }

  /**
   * Pause SLA (e.g., waiting on customer)
   *
   * @param {String} instanceId - SLA instance ID
   * @param {String} reason - Reason for pausing
   * @returns {Promise<Object>} Updated instance
   */
  static async pauseSLA(instanceId, reason) {
    try {
      logger.info(`Pausing SLA instance ${instanceId}: ${reason}`);

      const instance = await SLAInstance.findById(instanceId);
      if (!instance) {
        throw new Error('SLA instance not found');
      }

      if (instance.pausedAt) {
        logger.warn(`SLA instance ${instanceId} is already paused`);
        return instance;
      }

      // Use the instance method
      await instance.pause();

      logger.info(`SLA instance ${instanceId} paused at ${instance.pausedAt}`);
      return instance;
    } catch (error) {
      logger.error('Error pausing SLA:', error);
      throw error;
    }
  }

  /**
   * Resume SLA
   *
   * @param {String} instanceId - SLA instance ID
   * @returns {Promise<Object>} Updated instance
   */
  static async resumeSLA(instanceId) {
    try {
      logger.info(`Resuming SLA instance ${instanceId}`);

      const instance = await SLAInstance.findById(instanceId);
      if (!instance) {
        throw new Error('SLA instance not found');
      }

      if (!instance.pausedAt) {
        logger.warn(`SLA instance ${instanceId} is not paused`);
        return instance;
      }

      // Use the instance method
      await instance.resume();

      logger.info(`SLA instance ${instanceId} resumed, total paused time: ${instance.totalPausedTime}ms`);
      return instance;
    } catch (error) {
      logger.error('Error resuming SLA:', error);
      throw error;
    }
  }

  /**
   * Record response/resolution
   *
   * @param {String} instanceId - SLA instance ID
   * @param {String} metric - Metric name (firstResponse, nextResponse, resolution)
   * @returns {Promise<Object>} Updated instance
   */
  static async recordMetric(instanceId, metric) {
    try {
      logger.info(`Recording ${metric} for SLA instance ${instanceId}`);

      const instance = await SLAInstance.findById(instanceId).populate('slaId');
      if (!instance) {
        throw new Error('SLA instance not found');
      }

      const metricData = instance.metrics[metric];
      if (!metricData) {
        throw new Error(`Metric ${metric} not configured in this SLA instance`);
      }

      if (metricData.actualTime) {
        logger.warn(`Metric ${metric} already recorded for instance ${instanceId}`);
        return instance;
      }

      const actualTime = new Date();
      metricData.actualTime = actualTime;

      // Determine if met or breached
      if (metricData.targetTime && actualTime <= metricData.targetTime) {
        metricData.status = 'achieved';
      } else {
        metricData.status = 'breached';
      }

      await instance.save();

      logger.info(`Metric ${metric} recorded for instance ${instanceId}: ${metricData.status}`);
      return instance;
    } catch (error) {
      logger.error('Error recording SLA metric:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get status indicator for UI
   *
   * @param {Object} instance - SLA instance
   * @param {String} metric - Metric name (firstResponse, nextResponse, resolution)
   * @returns {Object} Status indicator { color, icon, label, percentage }
   */
  static getStatusIndicator(instance, metric) {
    try {
      const metricData = instance.metrics[metric];
      if (!metricData) {
        return STATUS_INDICATORS.onTrack;
      }

      // If paused
      if (instance.pausedAt) {
        return STATUS_INDICATORS.paused;
      }

      // If already achieved
      if (metricData.status === 'achieved') {
        return STATUS_INDICATORS.achieved;
      }

      // If breached
      if (metricData.status === 'breached') {
        return STATUS_INDICATORS.breached;
      }

      // Calculate percentage for pending metrics
      if (metricData.status === 'pending' && metricData.targetTime) {
        const now = new Date();
        const targetTime = new Date(metricData.targetTime);
        const startTime = new Date(instance.startedAt);

        const totalTime = targetTime - startTime;
        const elapsed = now - startTime - instance.totalPausedTime;
        const percentage = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));

        if (percentage >= NOTIFICATION_THRESHOLDS.critical) {
          return { ...STATUS_INDICATORS.critical, percentage };
        } else if (percentage >= NOTIFICATION_THRESHOLDS.warning) {
          return { ...STATUS_INDICATORS.warning, percentage };
        } else {
          return { ...STATUS_INDICATORS.onTrack, percentage };
        }
      }

      return STATUS_INDICATORS.onTrack;
    } catch (error) {
      logger.error('Error getting status indicator:', error);
      return STATUS_INDICATORS.onTrack;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS AND REPORTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get SLA performance stats
   *
   * @param {String} firmId - Firm ID
   * @param {Object} dateRange - Date range { start: Date, end: Date }
   * @returns {Promise<Object>} Performance statistics
   */
  static async getPerformanceStats(firmId, dateRange = {}) {
    try {
      logger.info(`Generating SLA performance stats for firm ${firmId}`);

      const query = { firmId };

      // Apply date range filter
      if (dateRange.start || dateRange.end) {
        query.startedAt = {};
        if (dateRange.start) {
          query.startedAt.$gte = new Date(dateRange.start);
        }
        if (dateRange.end) {
          query.startedAt.$lte = new Date(dateRange.end);
        }
      }

      const instances = await SLAInstance.find(query).populate('slaId ticketId');

      const stats = {
        total: instances.length,
        byMetric: {
          firstResponse: { total: 0, achieved: 0, breached: 0, pending: 0, avgTime: 0 },
          nextResponse: { total: 0, achieved: 0, breached: 0, pending: 0, avgTime: 0 },
          resolution: { total: 0, achieved: 0, breached: 0, pending: 0, avgTime: 0 }
        },
        overall: {
          achieved: 0,
          breached: 0,
          pending: 0,
          achievementRate: 0
        }
      };

      const metricTimes = {
        firstResponse: [],
        nextResponse: [],
        resolution: []
      };

      // Analyze each instance
      for (const instance of instances) {
        for (const metricKey of ['firstResponse', 'nextResponse', 'resolution']) {
          const metric = instance.metrics[metricKey];
          if (!metric) continue;

          stats.byMetric[metricKey].total++;

          if (metric.status === 'achieved') {
            stats.byMetric[metricKey].achieved++;
            stats.overall.achieved++;

            // Calculate time taken
            if (metric.actualTime && instance.startedAt) {
              const timeTaken = (new Date(metric.actualTime) - new Date(instance.startedAt) - instance.totalPausedTime) / 1000 / 60; // minutes
              metricTimes[metricKey].push(timeTaken);
            }
          } else if (metric.status === 'breached') {
            stats.byMetric[metricKey].breached++;
            stats.overall.breached++;

            // Calculate time taken
            if (metric.actualTime && instance.startedAt) {
              const timeTaken = (new Date(metric.actualTime) - new Date(instance.startedAt) - instance.totalPausedTime) / 1000 / 60; // minutes
              metricTimes[metricKey].push(timeTaken);
            }
          } else if (metric.status === 'pending') {
            stats.byMetric[metricKey].pending++;
            stats.overall.pending++;
          }
        }
      }

      // Calculate average times
      for (const metricKey of ['firstResponse', 'nextResponse', 'resolution']) {
        const times = metricTimes[metricKey];
        if (times.length > 0) {
          stats.byMetric[metricKey].avgTime = Math.round(
            times.reduce((sum, time) => sum + time, 0) / times.length
          );
        }
      }

      // Calculate achievement rate
      const totalCompleted = stats.overall.achieved + stats.overall.breached;
      if (totalCompleted > 0) {
        stats.overall.achievementRate = Math.round((stats.overall.achieved / totalCompleted) * 100);
      }

      logger.info(`SLA performance stats generated for firm ${firmId}`);
      return stats;
    } catch (error) {
      logger.error('Error getting SLA performance stats:', error);
      throw error;
    }
  }

  /**
   * Get active SLA instances for a firm
   *
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options { limit, skip, status }
   * @returns {Promise<Array>} Active SLA instances
   */
  static async getActiveSLAs(firmId, options = {}) {
    try {
      const query = { firmId };

      // Filter by status if provided
      if (options.status) {
        query.$or = [
          { 'metrics.firstResponse.status': options.status },
          { 'metrics.nextResponse.status': options.status },
          { 'metrics.resolution.status': options.status }
        ];
      }

      const instances = await SLAInstance.find(query)
        .populate('slaId ticketId')
        .sort({ startedAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);

      return instances;
    } catch (error) {
      logger.error('Error getting active SLAs:', error);
      throw error;
    }
  }

  /**
   * Get SLA instance by ticket ID
   *
   * @param {String} ticketId - Ticket/case ID
   * @returns {Promise<Object|null>} SLA instance or null
   */
  static async getSLAByTicket(ticketId) {
    try {
      const instance = await SLAInstance.findOne({ ticketId })
        .populate('slaId')
        .sort({ startedAt: -1 }); // Get most recent if multiple

      return instance;
    } catch (error) {
      logger.error('Error getting SLA by ticket:', error);
      throw error;
    }
  }
}

module.exports = SLAService;
