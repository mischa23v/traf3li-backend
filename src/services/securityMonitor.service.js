/**
 * Security Monitoring Service
 *
 * Provides comprehensive security incident detection and management capabilities.
 * Detects suspicious activities, creates security incidents, and triggers alerts.
 *
 * Features:
 * - Brute force attack detection
 * - Account takeover detection
 * - Anomalous activity detection
 * - Automated incident creation and management
 * - Integration with alerting systems (email, webhook, WebSocket)
 *
 * Integration with:
 * - accountLockout.service.js (login attempt tracking)
 * - auditLog.service.js (activity logging)
 * - email.service.js (email notifications)
 * - webhook.service.js (webhook notifications)
 * - socket.js (real-time WebSocket notifications)
 */

const SecurityIncident = require('../models/securityIncident.model');
const AuditLog = require('../models/auditLog.model');
const User = require('../models/user.model');
const accountLockoutService = require('./accountLockout.service');
const auditLogService = require('./auditLog.service');
const emailService = require('./email.service');
const webhookService = require('./webhook.service');
const logger = require('../utils/logger');

class SecurityMonitorService {
  /**
   * Detect brute force login attempts
   * @param {String} userId - User ID (optional)
   * @param {String} ip - IP address
   * @param {Object} context - Additional context (email, userAgent, etc.)
   * @returns {Promise<Object>} - Detection result and incident (if created)
   */
  async detectBruteForce(userId, ip, context = {}) {
    try {
      const timeWindow = 5 * 60 * 1000; // 5 minutes
      const threshold = 5; // 5 failed attempts

      // Check failed login attempts using audit log
      const identifier = context.email || ip;
      const failedAttempts = await auditLogService.checkBruteForce(identifier, timeWindow);

      if (failedAttempts >= threshold) {
        // Create security incident
        const incident = await this.createIncident({
          type: 'brute_force',
          severity: 'high',
          userId: userId || null,
          userEmail: context.email || null,
          ip,
          userAgent: context.userAgent,
          details: {
            failedAttempts,
            timeWindow: `${timeWindow / 60000} minutes`,
            identifier,
            timestamp: new Date(),
          },
          description: `Brute force attack detected: ${failedAttempts} failed login attempts in ${timeWindow / 60000} minutes from ${ip}`,
          riskScore: Math.min(70 + (failedAttempts - threshold) * 5, 100),
          requiresAttention: true,
        }, context);

        // Send alerts
        await this.sendAlerts(incident, context);

        return {
          detected: true,
          incident,
          action: 'account_locked',
          message: 'Brute force attack detected. Account has been locked for security.',
        };
      }

      return {
        detected: false,
        failedAttempts,
        message: 'No brute force pattern detected',
      };
    } catch (error) {
      logger.error('Error in detectBruteForce:', error);
      return { detected: false, error: error.message };
    }
  }

  /**
   * Detect account takeover attempts
   * @param {String} userId - User ID
   * @param {Object} loginInfo - Login information (ip, country, device, etc.)
   * @returns {Promise<Object>} - Detection result and incident (if created)
   */
  async detectAccountTakeover(userId, loginInfo = {}) {
    try {
      const { ip, country, device, userAgent, passwordChanged, mfaDisabled } = loginInfo;

      let riskScore = 0;
      const riskFactors = [];

      // Get user's previous login patterns from audit logs
      const recentLogins = await AuditLog.find({
        userId,
        action: { $in: ['login', 'login_success'] },
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
      })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      // Factor 1: Login from new country (if we have history)
      if (country && recentLogins.length > 0) {
        const knownCountries = new Set(
          recentLogins
            .filter(log => log.metadata?.country)
            .map(log => log.metadata.country)
        );

        if (!knownCountries.has(country) && knownCountries.size > 0) {
          riskScore += 30;
          riskFactors.push(`Login from new country: ${country}`);
        }
      }

      // Factor 2: Login from new device
      if (device && recentLogins.length > 0) {
        const knownDevices = new Set(
          recentLogins
            .filter(log => log.userAgent)
            .map(log => this.extractDeviceFingerprint(log.userAgent))
        );

        const currentDevice = this.extractDeviceFingerprint(userAgent);
        if (!knownDevices.has(currentDevice) && knownDevices.size > 0) {
          riskScore += 25;
          riskFactors.push('Login from new device');
        }
      }

      // Factor 3: Password changed recently + new location/device
      if (passwordChanged && (riskFactors.length > 0)) {
        riskScore += 35;
        riskFactors.push('Password changed with suspicious login pattern');
      }

      // Factor 4: MFA disabled recently
      if (mfaDisabled) {
        riskScore += 40;
        riskFactors.push('MFA was disabled recently');
      }

      // Factor 5: Multiple logins from different countries in short time
      if (recentLogins.length >= 2) {
        const recentCountries = recentLogins
          .slice(0, 5)
          .filter(log => log.metadata?.country)
          .map(log => log.metadata.country);

        if (new Set(recentCountries).size >= 3) {
          riskScore += 20;
          riskFactors.push('Multiple logins from different countries');
        }
      }

      // Threshold for account takeover: 60+
      if (riskScore >= 60) {
        const user = await User.findById(userId).select('firstName lastName email firmId').lean();

        const incident = await this.createIncident({
          type: 'account_takeover',
          severity: riskScore >= 80 ? 'critical' : 'high',
          userId,
          userEmail: user?.email,
          ip,
          userAgent,
          location: { country },
          device: { type: device },
          details: {
            riskFactors,
            riskScore,
            loginInfo,
            recentLoginsCount: recentLogins.length,
          },
          description: `Potential account takeover detected for user ${user?.email}. Risk factors: ${riskFactors.join(', ')}`,
          riskScore,
          requiresAttention: true,
        }, { firmId: user?.firmId });

        // Send alerts
        await this.sendAlerts(incident, { firmId: user?.firmId });

        return {
          detected: true,
          incident,
          riskScore,
          riskFactors,
          action: 'require_verification',
          message: 'Suspicious login pattern detected. Additional verification required.',
        };
      }

      return {
        detected: false,
        riskScore,
        riskFactors,
        message: 'No account takeover pattern detected',
      };
    } catch (error) {
      logger.error('Error in detectAccountTakeover:', error);
      return { detected: false, error: error.message };
    }
  }

  /**
   * Detect anomalous activity
   * @param {String} userId - User ID
   * @param {Object} action - Action details (type, resource, metadata)
   * @returns {Promise<Object>} - Detection result and incident (if created)
   */
  async detectAnomalousActivity(userId, action = {}) {
    try {
      const { type, resource, metadata = {}, ip, userAgent } = action;

      let riskScore = 0;
      const anomalies = [];
      let incidentType = 'unauthorized_access';
      let severity = 'medium';

      // Get user info
      const user = await User.findById(userId).select('firstName lastName email role firmId').lean();

      // Pattern 1: Bulk data export
      if (type === 'bulk_export' || type === 'export_data') {
        const recentExports = await AuditLog.countDocuments({
          userId,
          action: { $in: ['export_data', 'bulk_export'] },
          timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
        });

        if (recentExports >= 3) {
          riskScore += 60;
          anomalies.push(`Multiple bulk exports in short time: ${recentExports} exports in 1 hour`);
          incidentType = 'data_exfiltration';
          severity = 'critical';
        } else if (metadata.recordCount && metadata.recordCount > 1000) {
          riskScore += 40;
          anomalies.push(`Large data export: ${metadata.recordCount} records`);
          incidentType = 'data_exfiltration';
          severity = 'high';
        }
      }

      // Pattern 2: Permission/role escalation
      if (type === 'update_permissions' || type === 'update_role') {
        const targetRole = metadata.newRole || metadata.newPermissions;
        const currentRole = user?.role;

        // Check if trying to escalate to admin
        if (targetRole === 'admin' && currentRole !== 'admin') {
          riskScore += 80;
          anomalies.push('Attempt to escalate privileges to admin');
          incidentType = 'permission_escalation';
          severity = 'critical';
        } else if (targetRole === 'owner' && currentRole !== 'owner') {
          riskScore += 70;
          anomalies.push('Attempt to escalate privileges to owner');
          incidentType = 'permission_escalation';
          severity = 'critical';
        }
      }

      // Pattern 3: Unusual access patterns
      if (type === 'access' || type === 'view') {
        const recentAccess = await AuditLog.countDocuments({
          userId,
          action: { $regex: /^(view|access|read)/ },
          timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
        });

        if (recentAccess >= 50) {
          riskScore += 50;
          anomalies.push(`Unusual access pattern: ${recentAccess} access attempts in 5 minutes`);
          severity = 'high';
        }
      }

      // Pattern 4: After-hours activity (if we have timezone info)
      const hour = new Date().getUTCHours(); // We'd use user's timezone in production
      if (hour >= 22 || hour <= 6) {
        // After hours (10 PM - 6 AM)
        if (type === 'delete' || type === 'bulk_delete' || type === 'export_data') {
          riskScore += 20;
          anomalies.push('Sensitive action performed after hours');
        }
      }

      // Pattern 5: Multiple failed access attempts
      if (metadata.accessDenied || metadata.authorizationFailed) {
        const recentDenied = await AuditLog.countDocuments({
          userId,
          status: 'failed',
          timestamp: { $gte: new Date(Date.now() - 10 * 60 * 1000) }, // Last 10 minutes
        });

        if (recentDenied >= 5) {
          riskScore += 40;
          anomalies.push(`Multiple access denied: ${recentDenied} attempts in 10 minutes`);
          severity = 'high';
        }
      }

      // Create incident if risk score is high enough
      if (riskScore >= 40) {
        const incident = await this.createIncident({
          type: incidentType,
          severity,
          userId,
          userEmail: user?.email,
          ip,
          userAgent,
          details: {
            actionType: type,
            resource,
            anomalies,
            riskScore,
            metadata,
          },
          description: `Anomalous activity detected for user ${user?.email}: ${anomalies.join(', ')}`,
          riskScore,
          requiresAttention: severity === 'critical' || severity === 'high',
        }, { firmId: user?.firmId });

        // Send alerts for critical/high severity
        if (severity === 'critical' || severity === 'high') {
          await this.sendAlerts(incident, { firmId: user?.firmId });
        }

        return {
          detected: true,
          incident,
          riskScore,
          anomalies,
          action: severity === 'critical' ? 'block_action' : 'log_and_alert',
          message: 'Anomalous activity detected and logged.',
        };
      }

      return {
        detected: false,
        riskScore,
        anomalies,
        message: 'No significant anomalies detected',
      };
    } catch (error) {
      logger.error('Error in detectAnomalousActivity:', error);
      return { detected: false, error: error.message };
    }
  }

  /**
   * Create a security incident
   * @param {Object} incidentData - Incident data
   * @param {Object} context - Additional context (firmId, etc.)
   * @returns {Promise<SecurityIncident>}
   */
  async createIncident(incidentData, context = {}) {
    try {
      // Ensure firmId is set
      if (!incidentData.firmId && context.firmId) {
        incidentData.firmId = context.firmId;
      }

      // If no firmId, try to get it from userId
      if (!incidentData.firmId && incidentData.userId) {
        const user = await User.findById(incidentData.userId).select('firmId').lean();
        if (user?.firmId) {
          incidentData.firmId = user.firmId;
        }
      }

      // Create incident
      const incident = await SecurityIncident.createIncident(incidentData);

      logger.info(`🚨 Security incident created: ${incident.type} (${incident.severity}) - ID: ${incident._id}`);

      // Log to audit trail
      await auditLogService.log(
        'security_incident_created',
        'security_incident',
        incident._id,
        null,
        {
          firmId: incident.firmId,
          userId: 'system',
          userEmail: 'system',
          userRole: 'admin',
          details: {
            incidentType: incident.type,
            severity: incident.severity,
            riskScore: incident.riskScore,
          },
          severity: 'high',
        }
      );

      return incident;
    } catch (error) {
      logger.error('Error creating security incident:', error);
      throw error;
    }
  }

  /**
   * Get security incidents with filters
   * @param {String} firmId - Firm ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Incidents and metadata
   */
  async getIncidents(firmId, filters = {}) {
    try {
      return await SecurityIncident.getIncidents(firmId, filters);
    } catch (error) {
      logger.error('Error getting security incidents:', error);
      throw error;
    }
  }

  /**
   * Get incident by ID
   * @param {String} incidentId - Incident ID
   * @param {String} firmId - Firm ID (for authorization)
   * @returns {Promise<SecurityIncident>}
   */
  async getIncidentById(incidentId, firmId) {
    try {
      const incident = await SecurityIncident.findOne({
        _id: incidentId,
        firmId,
      })
        .populate('userId', 'firstName lastName email')
        .populate('resolvedBy', 'firstName lastName email')
        .populate('acknowledgedBy', 'firstName lastName email')
        .lean();

      if (!incident) {
        throw new Error('Incident not found');
      }

      return incident;
    } catch (error) {
      logger.error('Error getting incident by ID:', error);
      throw error;
    }
  }

  /**
   * Update incident status
   * @param {String} incidentId - Incident ID
   * @param {String} status - New status
   * @param {String} userId - User performing the action
   * @param {Object} updateData - Additional update data (resolution, notes, etc.)
   * @returns {Promise<SecurityIncident>}
   */
  async updateIncident(incidentId, status, userId, updateData = {}) {
    try {
      const incident = await SecurityIncident.findById(incidentId);

      if (!incident) {
        throw new Error('Incident not found');
      }

      // Update status
      await incident.updateStatus(status, userId, updateData.notes);

      // Update resolution if provided
      if (updateData.resolution && status === 'resolved') {
        incident.resolution = updateData.resolution;
        await incident.save();
      }

      // Log the action
      await auditLogService.log(
        'security_incident_updated',
        'security_incident',
        incident._id,
        {
          before: { status: incident.status },
          after: { status },
        },
        {
          firmId: incident.firmId,
          userId,
          details: {
            incidentType: incident.type,
            newStatus: status,
            resolution: updateData.resolution,
          },
        }
      );

      logger.info(`✅ Security incident updated: ${incident._id} - Status: ${status}`);

      return incident;
    } catch (error) {
      logger.error('Error updating security incident:', error);
      throw error;
    }
  }

  /**
   * Get security dashboard statistics
   * @param {String} firmId - Firm ID
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} - Dashboard statistics
   */
  async getDashboardStats(firmId, dateRange = {}) {
    try {
      const stats = await SecurityIncident.getStats(firmId, dateRange);
      const openIncidents = await SecurityIncident.getOpenIncidents(firmId);

      // Get recent audit logs for security events
      const recentSecurityEvents = await auditLogService.getSecurityEvents(
        firmId,
        dateRange,
        { limit: 10 }
      );

      return {
        ...stats,
        openIncidents: openIncidents.slice(0, 10), // Top 10 open incidents
        recentSecurityEvents: recentSecurityEvents.slice(0, 10),
      };
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Send alerts for security incident
   * @param {SecurityIncident} incident - Security incident
   * @param {Object} context - Additional context
   */
  async sendAlerts(incident, context = {}) {
    try {
      const firmId = incident.firmId || context.firmId;

      // Only send alerts for high and critical severity
      if (incident.severity !== 'high' && incident.severity !== 'critical') {
        return;
      }

      // Get firm admins for email notification
      const admins = await User.find({
        firmId,
        role: 'admin',
        $or: [
          { 'notificationPreferences.channels.email': true },
          { 'notificationPreferences.channels.email': { $exists: false } },
        ],
      })
        .select('email firstName lastName notificationPreferences')
        .lean();

      // Send email alerts
      if (admins.length > 0) {
        await this.sendEmailAlert(incident, admins);
      }

      // Trigger webhooks
      await this.sendWebhookAlert(incident, firmId);

      // Send WebSocket notification
      await this.sendWebSocketAlert(incident, firmId, admins);

      logger.info(`🔔 Alerts sent for incident ${incident._id}`);
    } catch (error) {
      logger.error('Error sending alerts:', error);
      // Don't throw - alerting failures shouldn't break incident creation
    }
  }

  /**
   * Send email alert
   * @private
   */
  async sendEmailAlert(incident, admins) {
    try {
      const recipients = admins.map(admin => admin.email);

      const severityColors = {
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#f59e0b',
        low: '#3b82f6',
      };

      const typeLabels = {
        brute_force: 'Brute Force Attack',
        account_takeover: 'Account Takeover Attempt',
        suspicious_login: 'Suspicious Login',
        permission_escalation: 'Permission Escalation',
        data_exfiltration: 'Data Exfiltration',
        unauthorized_access: 'Unauthorized Access',
      };

      for (const admin of admins) {
        await emailService.sendEmail({
          to: admin.email,
          subject: `🚨 Security Alert: ${typeLabels[incident.type] || incident.type} [${incident.severity.toUpperCase()}]`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: ${severityColors[incident.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
                .incident-box { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${severityColors[incident.severity]}; }
                .label { font-weight: bold; color: #6b7280; }
                .value { color: #111827; }
                .footer { margin-top: 20px; padding: 20px; background: #f3f4f6; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
                .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">🚨 Security Alert</h2>
                  <p style="margin: 5px 0 0 0; opacity: 0.9;">A ${incident.severity} severity security incident has been detected</p>
                </div>

                <div class="content">
                  <div class="incident-box">
                    <h3 style="margin-top: 0; color: ${severityColors[incident.severity]};">${typeLabels[incident.type] || incident.type}</h3>

                    <p><span class="label">Severity:</span> <span class="value">${incident.severity.toUpperCase()}</span></p>
                    <p><span class="label">Risk Score:</span> <span class="value">${incident.riskScore}/100</span></p>
                    <p><span class="label">Detected:</span> <span class="value">${new Date(incident.detectedAt).toLocaleString()}</span></p>

                    ${incident.userEmail ? `<p><span class="label">Affected User:</span> <span class="value">${incident.userEmail}</span></p>` : ''}
                    ${incident.ip ? `<p><span class="label">IP Address:</span> <span class="value">${incident.ip}</span></p>` : ''}

                    <p><span class="label">Description:</span></p>
                    <p class="value">${incident.description || 'No description provided'}</p>

                    ${incident.details && Object.keys(incident.details).length > 0 ? `
                      <p><span class="label">Details:</span></p>
                      <ul>
                        ${incident.details.riskFactors ? incident.details.riskFactors.map(factor => `<li>${factor}</li>`).join('') : ''}
                        ${incident.details.anomalies ? incident.details.anomalies.map(anomaly => `<li>${anomaly}</li>`).join('') : ''}
                      </ul>
                    ` : ''}
                  </div>

                  <p style="margin-top: 20px;"><strong>Action Required:</strong></p>
                  <p>Please review this security incident and take appropriate action. You can view full details and manage the incident in your security dashboard.</p>

                  <a href="${process.env.DASHBOARD_URL || 'https://dashboard.traf3li.com'}/security/incidents/${incident._id}" class="button">View Incident Details</a>
                </div>

                <div class="footer">
                  <p>This is an automated security alert from Traf3li Security Monitor.</p>
                  <p>If you believe this is a false positive, please mark it as such in the dashboard.</p>
                </div>
              </div>
            </body>
            </html>
          `,
        }, false); // Send immediately, don't queue
      }

      // Mark notification as sent
      await incident.markNotificationSent('email', { recipients });

      logger.info(`📧 Email alert sent to ${recipients.length} admin(s)`);
    } catch (error) {
      logger.error('Error sending email alert:', error);
    }
  }

  /**
   * Send webhook alert
   * @private
   */
  async sendWebhookAlert(incident, firmId) {
    try {
      const payload = {
        id: incident._id,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        riskScore: incident.riskScore,
        description: incident.description,
        detectedAt: incident.detectedAt,
        userId: incident.userId,
        userEmail: incident.userEmail,
        ip: incident.ip,
        details: incident.details,
      };

      await webhookService.trigger(
        'security.incident.created',
        payload,
        firmId
      );

      // Mark notification as sent
      await incident.markNotificationSent('webhook');

      logger.info(`🔗 Webhook alert triggered for incident ${incident._id}`);
    } catch (error) {
      logger.error('Error sending webhook alert:', error);
    }
  }

  /**
   * Send WebSocket alert
   * @private
   */
  async sendWebSocketAlert(incident, firmId, admins) {
    try {
      // Get socket.io instance
      const { getIO, emitNotification } = require('../configs/socket');
      const io = getIO();

      const notification = {
        id: incident._id,
        type: 'security_incident',
        title: `🚨 Security Alert: ${incident.type}`,
        message: incident.description || 'A security incident has been detected',
        severity: incident.severity,
        data: {
          incidentId: incident._id,
          incidentType: incident.type,
          riskScore: incident.riskScore,
          status: incident.status,
        },
        timestamp: new Date(),
        url: `/security/incidents/${incident._id}`,
      };

      // Send to all firm admins
      for (const admin of admins) {
        emitNotification(admin._id, notification);
      }

      // Also broadcast to firm room
      io.to(`firm:${firmId}`).emit('security:incident', {
        incident: {
          id: incident._id,
          type: incident.type,
          severity: incident.severity,
          status: incident.status,
          detectedAt: incident.detectedAt,
        },
      });

      // Mark notification as sent
      await incident.markNotificationSent('websocket');

      logger.info(`🔌 WebSocket alert sent for incident ${incident._id}`);
    } catch (error) {
      logger.error('Error sending WebSocket alert:', error);
    }
  }

  /**
   * Extract device fingerprint from user agent
   * @private
   */
  extractDeviceFingerprint(userAgent) {
    if (!userAgent) return 'unknown';

    // Simple device fingerprinting - in production, use a library like ua-parser-js
    const deviceType = /mobile/i.test(userAgent) ? 'mobile' : 'desktop';
    const os = /windows/i.test(userAgent)
      ? 'windows'
      : /mac/i.test(userAgent)
      ? 'mac'
      : /linux/i.test(userAgent)
      ? 'linux'
      : /android/i.test(userAgent)
      ? 'android'
      : /iphone|ipad/i.test(userAgent)
      ? 'ios'
      : 'unknown';

    const browser = /chrome/i.test(userAgent)
      ? 'chrome'
      : /firefox/i.test(userAgent)
      ? 'firefox'
      : /safari/i.test(userAgent)
      ? 'safari'
      : /edge/i.test(userAgent)
      ? 'edge'
      : 'unknown';

    return `${deviceType}-${os}-${browser}`;
  }
}

module.exports = new SecurityMonitorService();
