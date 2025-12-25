/**
 * SLO Monitoring Service
 *
 * Comprehensive service for managing and monitoring Service Level Objectives (SLOs)
 * Tracks availability, latency, error rates, throughput, and custom metrics
 */

const mongoose = require('mongoose');
const SLO = require('../models/slo.model');
const SLOMeasurement = require('../models/sloMeasurement.model');
const EmailService = require('./email.service');
const logger = require('../utils/logger');

class SLOMonitoringService {
  // ═══════════════════════════════════════════════════════════════
  // SLO CRUD OPERATIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Create new SLO
   * @param {Object} data - SLO configuration data
   * @returns {Promise<Object>} Created SLO
   */
  static async createSLO(data) {
    try {
      logger.info('Creating new SLO:', data.name);

      const slo = new SLO(data);
      await slo.save();

      logger.info(`SLO created successfully: ${slo._id}`);
      return slo;
    } catch (error) {
      logger.error('Error creating SLO:', error);
      throw error;
    }
  }

  /**
   * Update SLO
   * @param {String} sloId - SLO ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated SLO
   */
  static async updateSLO(sloId, data) {
    try {
      logger.info(`Updating SLO: ${sloId}`);

      const slo = await SLO.findByIdAndUpdate(
        sloId,
        { $set: data },
        { new: true, runValidators: true }
      );

      if (!slo) {
        throw new Error('SLO not found');
      }

      logger.info(`SLO updated successfully: ${slo._id}`);
      return slo;
    } catch (error) {
      logger.error('Error updating SLO:', error);
      throw error;
    }
  }

  /**
   * Delete SLO
   * @param {String} sloId - SLO ID
   * @returns {Promise<Object>} Deleted SLO
   */
  static async deleteSLO(sloId) {
    try {
      logger.info(`Deleting SLO: ${sloId}`);

      const slo = await SLO.findByIdAndDelete(sloId);

      if (!slo) {
        throw new Error('SLO not found');
      }

      // Also delete all measurements for this SLO
      await SLOMeasurement.deleteMany({ sloId });

      logger.info(`SLO and its measurements deleted: ${sloId}`);
      return slo;
    } catch (error) {
      logger.error('Error deleting SLO:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MEASUREMENT AND MONITORING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Take a measurement for an SLO
   * @param {String} sloId - SLO ID
   * @param {Object} options - Measurement options
   * @returns {Promise<Object>} Created measurement
   */
  static async measureSLO(sloId, options = {}) {
    try {
      logger.debug(`Taking measurement for SLO: ${sloId}`);

      const slo = await SLO.findById(sloId);
      if (!slo) {
        throw new Error('SLO not found');
      }

      if (!slo.isActive) {
        logger.warn(`SLO ${sloId} is not active, skipping measurement`);
        return null;
      }

      // Calculate the time window
      const windowEnd = new Date();
      const windowStart = new Date(windowEnd.getTime() - slo.timeWindowMs);

      // Get the measured value based on SLO category
      let value;
      let metadata = {};

      switch (slo.category) {
        case 'availability':
          ({ value, metadata } = await this.calculateAvailability({ start: windowStart, end: windowEnd }));
          break;
        case 'latency':
          ({ value, metadata } = await this.calculateLatencyPercentile({ start: windowStart, end: windowEnd }, 95));
          break;
        case 'error_rate':
          ({ value, metadata } = await this._calculateErrorRate({ start: windowStart, end: windowEnd }));
          break;
        case 'throughput':
          ({ value, metadata } = await this._calculateThroughput({ start: windowStart, end: windowEnd }));
          break;
        case 'custom':
          ({ value, metadata } = await this._measureCustomSLO(slo, { start: windowStart, end: windowEnd }));
          break;
        default:
          throw new Error(`Unknown SLO category: ${slo.category}`);
      }

      // Determine status based on thresholds
      let status = 'met';
      if (slo.category === 'latency' || slo.category === 'error_rate') {
        // For latency and error_rate, higher is worse
        if (value >= slo.threshold.critical) {
          status = 'breached';
        } else if (value >= slo.threshold.warning) {
          status = 'warning';
        }
      } else {
        // For availability and throughput, lower is worse
        if (value <= slo.threshold.critical) {
          status = 'breached';
        } else if (value <= slo.threshold.warning) {
          status = 'warning';
        }
      }

      // Create measurement
      const measurement = await SLOMeasurement.createMeasurement({
        sloId,
        timestamp: new Date(),
        value,
        status,
        windowStart,
        windowEnd,
        sampleCount: metadata.sampleCount || 1,
        metadata,
      });

      // Update SLO with latest measurement
      await slo.updateMeasurement(value, status);

      logger.debug(`Measurement recorded for SLO ${sloId}: ${value} (${status})`);
      return measurement;
    } catch (error) {
      logger.error(`Error measuring SLO ${sloId}:`, error);
      throw error;
    }
  }

  /**
   * Get current status of an SLO
   * @param {String} sloId - SLO ID
   * @returns {Promise<Object>} SLO status
   */
  static async getSLOStatus(sloId) {
    try {
      const slo = await SLO.findById(sloId).lean();
      if (!slo) {
        throw new Error('SLO not found');
      }

      const latestMeasurement = await SLOMeasurement.getLatestMeasurement(sloId);

      return {
        slo,
        currentValue: latestMeasurement?.value,
        currentStatus: latestMeasurement?.status,
        lastMeasured: latestMeasurement?.timestamp,
        target: slo.target,
        threshold: slo.threshold,
        errorBudget: slo.errorBudget,
      };
    } catch (error) {
      logger.error(`Error getting SLO status for ${sloId}:`, error);
      throw error;
    }
  }

  /**
   * Get SLO history
   * @param {String} sloId - SLO ID
   * @param {Object} dateRange - Date range { start, end }
   * @returns {Promise<Array>} Historical measurements
   */
  static async getSLOHistory(sloId, dateRange = {}) {
    try {
      const measurements = await SLOMeasurement.getMeasurements(sloId, dateRange);
      return measurements;
    } catch (error) {
      logger.error(`Error getting SLO history for ${sloId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate error budget for an SLO
   * @param {String} sloId - SLO ID
   * @returns {Promise<Object>} Error budget details
   */
  static async getErrorBudget(sloId) {
    try {
      const slo = await SLO.findById(sloId);
      if (!slo) {
        throw new Error('SLO not found');
      }

      // Get measurements for the current time window
      const windowEnd = new Date();
      const windowStart = new Date(windowEnd.getTime() - slo.timeWindowMs);

      const measurements = await SLOMeasurement.getMeasurements(sloId, {
        start: windowStart,
        end: windowEnd,
      });

      if (measurements.length === 0) {
        return {
          total: 100,
          consumed: 0,
          remaining: 100,
          percentage: 100,
        };
      }

      // Calculate error budget based on SLO category
      let errorBudget;

      if (slo.category === 'availability') {
        // For availability, error budget is the allowed downtime
        const allowedDowntime = 100 - slo.target; // e.g., 0.1% for 99.9% SLO
        const actualUptime = measurements.reduce((sum, m) => sum + m.value, 0) / measurements.length;
        const actualDowntime = 100 - actualUptime;
        const consumedPercentage = (actualDowntime / allowedDowntime) * 100;

        errorBudget = {
          total: allowedDowntime,
          consumed: actualDowntime,
          remaining: Math.max(0, allowedDowntime - actualDowntime),
          percentage: Math.max(0, 100 - consumedPercentage),
        };
      } else if (slo.category === 'error_rate') {
        // For error rate, error budget is the allowed error percentage
        const allowedErrors = slo.target; // e.g., 0.1%
        const actualErrors = measurements.reduce((sum, m) => sum + m.value, 0) / measurements.length;
        const consumedPercentage = (actualErrors / allowedErrors) * 100;

        errorBudget = {
          total: allowedErrors,
          consumed: actualErrors,
          remaining: Math.max(0, allowedErrors - actualErrors),
          percentage: Math.max(0, 100 - consumedPercentage),
        };
      } else {
        // For latency, throughput, and custom metrics
        const breachedCount = measurements.filter(m => m.status === 'breached').length;
        const consumedPercentage = (breachedCount / measurements.length) * 100;

        errorBudget = {
          total: measurements.length,
          consumed: breachedCount,
          remaining: measurements.length - breachedCount,
          percentage: 100 - consumedPercentage,
        };
      }

      // Update SLO with calculated error budget
      await slo.updateErrorBudget(errorBudget);

      return errorBudget;
    } catch (error) {
      logger.error(`Error calculating error budget for ${sloId}:`, error);
      throw error;
    }
  }

  /**
   * Get SLO dashboard for a firm
   * @param {String} firmId - Firm ID (null for system-wide)
   * @returns {Promise<Object>} Dashboard data
   */
  static async getSLODashboard(firmId = null) {
    try {
      logger.info(`Getting SLO dashboard${firmId ? ` for firm ${firmId}` : ' (system-wide)'}`);

      const slos = await SLO.getActiveSLOs(firmId);

      const dashboard = {
        total: slos.length,
        byCategory: {
          availability: 0,
          latency: 0,
          error_rate: 0,
          throughput: 0,
          custom: 0,
        },
        byStatus: {
          met: 0,
          warning: 0,
          breached: 0,
        },
        slos: [],
      };

      for (const slo of slos) {
        dashboard.byCategory[slo.category]++;

        if (slo.lastMeasurement?.status) {
          dashboard.byStatus[slo.lastMeasurement.status]++;
        }

        const latestMeasurement = await SLOMeasurement.getLatestMeasurement(slo._id);

        dashboard.slos.push({
          id: slo._id,
          name: slo.name,
          category: slo.category,
          target: slo.target,
          currentValue: latestMeasurement?.value,
          status: latestMeasurement?.status || 'unknown',
          lastMeasured: latestMeasurement?.timestamp,
          errorBudget: slo.errorBudget,
        });
      }

      return dashboard;
    } catch (error) {
      logger.error('Error getting SLO dashboard:', error);
      throw error;
    }
  }

  /**
   * Check SLO alerts and send notifications
   * @returns {Promise<Object>} Alert check results
   */
  static async checkSLOAlerts() {
    try {
      logger.info('Checking SLO alerts...');

      const slos = await SLO.find({ isActive: true });
      const results = {
        checked: slos.length,
        alertsSent: 0,
        breached: [],
        warnings: [],
      };

      for (const slo of slos) {
        if (!slo.lastMeasurement?.status) {
          continue;
        }

        const status = slo.lastMeasurement.status;

        if (status === 'breached' || status === 'warning') {
          // Check if we can send an alert (cooldown period)
          if (slo.canSendAlert) {
            await this._sendSLOAlert(slo, status);
            await slo.recordAlertSent();
            results.alertsSent++;

            if (status === 'breached') {
              results.breached.push(slo.name);
            } else {
              results.warnings.push(slo.name);
            }
          }
        }
      }

      logger.info(`SLO alert check complete: ${results.alertsSent} alerts sent`);
      return results;
    } catch (error) {
      logger.error('Error checking SLO alerts:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // METRIC CALCULATION METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Calculate system availability
   * @param {Object} dateRange - Date range { start, end }
   * @returns {Promise<Object>} Availability data
   */
  static async calculateAvailability(dateRange) {
    try {
      // This is a simplified calculation
      // In production, you would query actual uptime/downtime metrics from your monitoring system

      // For demonstration, we'll assume 99.95% availability
      // You should replace this with actual metrics from your infrastructure monitoring

      const value = 99.95; // This should be calculated from actual uptime data
      const metadata = {
        sampleCount: 1,
        totalChecks: 1440, // e.g., checks per minute for a day
        successfulChecks: 1439,
        failedChecks: 1,
      };

      return { value, metadata };
    } catch (error) {
      logger.error('Error calculating availability:', error);
      throw error;
    }
  }

  /**
   * Calculate latency percentile
   * @param {Object} dateRange - Date range { start, end }
   * @param {Number} percentile - Percentile (50, 95, 99)
   * @returns {Promise<Object>} Latency data
   */
  static async calculateLatencyPercentile(dateRange, percentile = 95) {
    try {
      // This is a simplified calculation
      // In production, you would query actual latency metrics from your APM/monitoring system

      // For demonstration, we'll use simulated values
      // You should replace this with actual latency data from your request logs

      const value = 450; // milliseconds - This should be calculated from actual request latencies
      const metadata = {
        sampleCount: 10000,
        p50: 250,
        p95: 450,
        p99: 850,
        avg: 320,
        min: 50,
        max: 2500,
      };

      return { value, metadata };
    } catch (error) {
      logger.error('Error calculating latency percentile:', error);
      throw error;
    }
  }

  /**
   * Calculate error rate
   * @param {Object} dateRange - Date range { start, end }
   * @returns {Promise<Object>} Error rate data
   * @private
   */
  static async _calculateErrorRate(dateRange) {
    try {
      // This is a simplified calculation
      // In production, you would query actual error metrics from your logs/monitoring system

      const value = 0.05; // 0.05% error rate - This should be calculated from actual request logs
      const metadata = {
        sampleCount: 100000,
        totalRequests: 100000,
        errorRequests: 50,
        successRequests: 99950,
      };

      return { value, metadata };
    } catch (error) {
      logger.error('Error calculating error rate:', error);
      throw error;
    }
  }

  /**
   * Calculate throughput
   * @param {Object} dateRange - Date range { start, end }
   * @returns {Promise<Object>} Throughput data
   * @private
   */
  static async _calculateThroughput(dateRange) {
    try {
      // This is a simplified calculation
      // In production, you would query actual throughput metrics from your monitoring system

      const value = 1500; // requests per minute - This should be calculated from actual request logs
      const metadata = {
        sampleCount: 1440, // samples per day (1 per minute)
        totalRequests: 2160000, // total in window
        avgRpm: 1500,
        peakRpm: 3200,
        minRpm: 450,
      };

      return { value, metadata };
    } catch (error) {
      logger.error('Error calculating throughput:', error);
      throw error;
    }
  }

  /**
   * Measure custom SLO
   * @param {Object} slo - SLO configuration
   * @param {Object} dateRange - Date range { start, end }
   * @returns {Promise<Object>} Custom metric data
   * @private
   */
  static async _measureCustomSLO(slo, dateRange) {
    try {
      // For custom SLOs, use the metadata to determine what to measure
      const metric = slo.metadata?.metric;

      if (metric === 'invoice_processing_time') {
        // Example: Measure average invoice processing time
        // This should query your actual invoice processing logs

        const value = 4500; // milliseconds - This should be calculated from actual data
        const metadata = {
          sampleCount: 150,
          avgTime: 4500,
          minTime: 2000,
          maxTime: 8500,
          p95: 6800,
        };

        return { value, metadata };
      }

      // Default for unknown custom metrics
      return {
        value: 0,
        metadata: { sampleCount: 0 },
      };
    } catch (error) {
      logger.error('Error measuring custom SLO:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORTING
  // ═══════════════════════════════════════════════════════════════

  /**
   * Generate SLO report
   * @param {String} firmId - Firm ID (null for system-wide)
   * @param {String} period - Report period (daily, weekly, monthly)
   * @returns {Promise<Object>} Report data
   */
  static async generateSLOReport(firmId = null, period = 'daily') {
    try {
      logger.info(`Generating ${period} SLO report${firmId ? ` for firm ${firmId}` : ''}`);

      // Calculate date range based on period
      const end = new Date();
      const start = new Date();

      switch (period) {
        case 'daily':
          start.setDate(start.getDate() - 1);
          break;
        case 'weekly':
          start.setDate(start.getDate() - 7);
          break;
        case 'monthly':
          start.setMonth(start.getMonth() - 1);
          break;
        case 'quarterly':
          start.setMonth(start.getMonth() - 3);
          break;
        default:
          start.setDate(start.getDate() - 1);
      }

      const dateRange = { start, end };

      const slos = await SLO.getActiveSLOs(firmId);
      const report = {
        period,
        dateRange,
        generatedAt: new Date(),
        summary: {
          totalSLOs: slos.length,
          met: 0,
          warning: 0,
          breached: 0,
        },
        slos: [],
      };

      for (const slo of slos) {
        const stats = await SLOMeasurement.getStatistics(slo._id, dateRange);
        const errorBudget = await this.getErrorBudget(slo._id);

        if (stats) {
          if (stats.breachedCount > 0) {
            report.summary.breached++;
          } else if (stats.warningCount > 0) {
            report.summary.warning++;
          } else {
            report.summary.met++;
          }

          report.slos.push({
            name: slo.name,
            category: slo.category,
            target: slo.target,
            statistics: stats,
            errorBudget,
          });
        }
      }

      return report;
    } catch (error) {
      logger.error('Error generating SLO report:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send SLO alert
   * @param {Object} slo - SLO document
   * @param {String} status - Alert status (warning, breached)
   * @private
   */
  static async _sendSLOAlert(slo, status) {
    try {
      logger.info(`Sending ${status} alert for SLO: ${slo.name}`);

      const recipients = [];

      // Collect email recipients
      if (slo.alertSettings?.notifyEmails) {
        recipients.push(...slo.alertSettings.notifyEmails);
      }

      // Get emails from notifyUsers
      if (slo.alertSettings?.notifyUsers && slo.alertSettings.notifyUsers.length > 0) {
        const User = require('../models/user.model');
        const users = await User.find({
          _id: { $in: slo.alertSettings.notifyUsers },
        }).select('email');
        recipients.push(...users.map(u => u.email));
      }

      if (recipients.length === 0) {
        logger.warn(`No recipients configured for SLO ${slo.name}`);
        return;
      }

      // Determine severity color
      const color = status === 'breached' ? '#dc2626' : '#f59e0b';
      const icon = status === 'breached' ? '🚨' : '⚠️';

      // Prepare email
      const subject = `${icon} SLO ${status.toUpperCase()}: ${slo.name}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: ${color}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">${icon} SLO ${status.toUpperCase()}</h2>
          </div>

          <div style="background-color: #fff; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p><strong>SLO Name:</strong> ${slo.name}</p>
            <p><strong>Category:</strong> ${slo.category}</p>
            <p><strong>Target:</strong> ${slo.target}</p>
            <p><strong>Current Value:</strong> ${slo.lastMeasurement?.value || 'N/A'}</p>
            <p><strong>Status:</strong> ${status.toUpperCase()}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>

            ${status === 'breached'
              ? '<p style="color: #dc2626; font-weight: bold;">⚠️ This SLO has been breached. Immediate action required!</p>'
              : '<p style="color: #f59e0b; font-weight: bold;">⚠️ This SLO is at warning level. Please monitor closely.</p>'
            }

            ${slo.errorBudget
              ? `<div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 5px;">
                  <p style="margin: 0;"><strong>Error Budget:</strong></p>
                  <p style="margin: 10px 0;">Remaining: ${slo.errorBudget.percentage?.toFixed(2)}%</p>
                  <p style="margin: 10px 0;">Consumed: ${slo.errorBudget.consumed?.toFixed(2)}</p>
                </div>`
              : ''
            }
          </div>

          <div style="margin-top: 20px; padding: 15px; background-color: #f9fafb; border-radius: 5px; font-size: 12px; color: #666;">
            <p style="margin: 0;">This is an automated SLO alert from Traf3li monitoring system.</p>
          </div>
        </body>
        </html>
      `;

      // Send to all recipients
      for (const email of recipients) {
        await EmailService.sendEmail({
          to: email,
          subject,
          html,
        }, true); // Use queue
      }

      logger.info(`SLO ${status} alert sent for ${slo.name} to ${recipients.length} recipients`);
    } catch (error) {
      logger.error('Error sending SLO alert:', error);
      // Don't throw - we don't want alert failures to break monitoring
    }
  }
}

module.exports = SLOMonitoringService;
