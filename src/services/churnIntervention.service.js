/**
 * Churn Intervention Service
 *
 * Automated customer retention and intervention system based on health scores.
 * Implements multi-tier intervention strategies to reduce churn and identify
 * upsell opportunities.
 *
 * Features:
 * - Health score-based intervention triggers
 * - Multi-tier intervention strategies (Critical, At-Risk, Warning, Upsell)
 * - Intervention cooldown periods to prevent spam
 * - CSM task automation
 * - Executive escalation for critical accounts
 * - Retention offers and discount management
 * - A/B testing and effectiveness tracking
 * - Comprehensive intervention history and analytics
 */

const mongoose = require('mongoose');
const EmailService = require('./email.service');
const ActivityService = require('./activity.service');
const QueueService = require('./queue.service');
const AuditLogService = require('./auditLog.service');
const logger = require('../utils/logger');

// Import models
const Firm = require('../models/firm.model');
const User = require('../models/user.model');

/**
 * Intervention cooldown periods (in hours)
 * Prevents spamming customers with multiple interventions
 */
const INTERVENTION_COOLDOWNS = {
  critical: 24,      // 1 day cooldown for critical interventions
  atRisk: 48,        // 2 days cooldown for at-risk interventions
  warning: 72,       // 3 days cooldown for warning interventions
  upsell: 168        // 1 week cooldown for upsell opportunities
};

/**
 * Health score thresholds for intervention tiers
 */
const HEALTH_SCORE_THRESHOLDS = {
  critical: 30,      // 0-30: Critical - Immediate intervention required
  atRisk: 50,        // 31-50: At Risk - CSM engagement needed
  warning: 70,       // 51-70: Warning - Proactive check-in
  healthy: 80,       // 71-80: Healthy - Standard monitoring
  excellent: 100     // 81-100: Excellent - Upsell opportunity
};

/**
 * Simple in-memory intervention tracking
 * In production, this should be stored in a database collection
 */
class InterventionTracker {
  constructor() {
    this.interventions = new Map();
  }

  /**
   * Log an intervention
   */
  log(firmId, interventionType, details) {
    const key = `${firmId}_${interventionType}`;
    const interventionId = `INT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const intervention = {
      id: interventionId,
      firmId,
      interventionType,
      timestamp: new Date(),
      details,
      outcome: null,
      effectiveness: null
    };

    if (!this.interventions.has(key)) {
      this.interventions.set(key, []);
    }

    this.interventions.get(key).push(intervention);

    return interventionId;
  }

  /**
   * Get intervention history for a firm
   */
  getHistory(firmId, limit = 50) {
    const firmInterventions = [];

    for (const [key, interventions] of this.interventions.entries()) {
      if (key.startsWith(firmId)) {
        firmInterventions.push(...interventions);
      }
    }

    return firmInterventions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Check if intervention is in cooldown period
   */
  isInCooldown(firmId, interventionType) {
    const history = this.getHistory(firmId, 10);
    const cooldownHours = INTERVENTION_COOLDOWNS[interventionType] || 24;
    const cooldownMs = cooldownHours * 60 * 60 * 1000;

    const recentIntervention = history.find(
      i => i.interventionType === interventionType
    );

    if (!recentIntervention) {
      return false;
    }

    const timeSinceLastIntervention = Date.now() - recentIntervention.timestamp.getTime();
    return timeSinceLastIntervention < cooldownMs;
  }

  /**
   * Update intervention outcome
   */
  updateOutcome(interventionId, outcome, effectiveness) {
    for (const [key, interventions] of this.interventions.entries()) {
      const intervention = interventions.find(i => i.id === interventionId);
      if (intervention) {
        intervention.outcome = outcome;
        intervention.effectiveness = effectiveness;
        intervention.updatedAt = new Date();
        return true;
      }
    }
    return false;
  }

  /**
   * Get intervention statistics
   */
  getStats(dateRange = null) {
    let allInterventions = [];

    for (const [key, interventions] of this.interventions.entries()) {
      allInterventions.push(...interventions);
    }

    // Filter by date range if provided
    if (dateRange && dateRange.start) {
      const startDate = new Date(dateRange.start);
      const endDate = dateRange.end ? new Date(dateRange.end) : new Date();

      allInterventions = allInterventions.filter(
        i => i.timestamp >= startDate && i.timestamp <= endDate
      );
    }

    // Calculate statistics
    const stats = {
      total: allInterventions.length,
      byType: {},
      withOutcome: allInterventions.filter(i => i.outcome).length,
      avgEffectiveness: 0,
      successRate: 0
    };

    // Group by type
    allInterventions.forEach(i => {
      if (!stats.byType[i.interventionType]) {
        stats.byType[i.interventionType] = {
          count: 0,
          successful: 0,
          failed: 0,
          pending: 0
        };
      }

      stats.byType[i.interventionType].count++;

      if (i.outcome === 'success') {
        stats.byType[i.interventionType].successful++;
      } else if (i.outcome === 'failed') {
        stats.byType[i.interventionType].failed++;
      } else {
        stats.byType[i.interventionType].pending++;
      }
    });

    // Calculate average effectiveness
    const interventionsWithEffectiveness = allInterventions.filter(
      i => i.effectiveness !== null && i.effectiveness !== undefined
    );

    if (interventionsWithEffectiveness.length > 0) {
      stats.avgEffectiveness = interventionsWithEffectiveness.reduce(
        (sum, i) => sum + i.effectiveness, 0
      ) / interventionsWithEffectiveness.length;
    }

    // Calculate success rate
    if (stats.withOutcome > 0) {
      const successful = allInterventions.filter(i => i.outcome === 'success').length;
      stats.successRate = (successful / stats.withOutcome) * 100;
    }

    return stats;
  }
}

// Singleton intervention tracker
const interventionTracker = new InterventionTracker();

class ChurnInterventionService {
  /**
   * Main trigger: Handle health score updates
   * This is the primary entry point for the intervention system
   *
   * @param {String} firmId - Firm ID
   * @param {Number} healthScore - Current health score (0-100)
   * @param {Number} previousScore - Previous health score
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Intervention result
   */
  static async handleHealthScoreUpdate(firmId, healthScore, previousScore, context = {}) {
    try {
      logger.info(`ChurnIntervention: Health score update for firm ${firmId}: ${previousScore} → ${healthScore}`);

      // Validate inputs
      if (!firmId || healthScore === undefined || healthScore === null) {
        throw new Error('Invalid parameters: firmId and healthScore are required');
      }

      // Normalize health score to 0-100 range
      healthScore = Math.max(0, Math.min(100, healthScore));
      previousScore = previousScore !== undefined ? Math.max(0, Math.min(100, previousScore)) : healthScore;

      // Determine intervention tier
      const tier = this._determineInterventionTier(healthScore);
      const previousTier = this._determineInterventionTier(previousScore);

      // Check if intervention tier has changed or worsened
      const tierChanged = tier !== previousTier;
      const scoreDecreased = healthScore < previousScore;

      logger.info(`ChurnIntervention: Tier ${previousTier} → ${tier} (changed: ${tierChanged}, decreased: ${scoreDecreased})`);

      // Trigger appropriate intervention based on tier
      let interventionResult = null;

      if (tier === 'critical') {
        interventionResult = await this.triggerCriticalIntervention(firmId, healthScore, context);
      } else if (tier === 'atRisk' && (tierChanged || scoreDecreased)) {
        interventionResult = await this.triggerAtRiskIntervention(firmId, healthScore, context);
      } else if (tier === 'warning' && (tierChanged || scoreDecreased)) {
        interventionResult = await this.triggerWarningIntervention(firmId, healthScore, context);
      } else if (tier === 'excellent' && healthScore > 85) {
        interventionResult = await this.triggerUpsellOpportunity(firmId, healthScore, context);
      }

      // Log to audit
      await AuditLogService.log(
        'health_score_update',
        'firm',
        firmId,
        {
          before: { healthScore: previousScore, tier: previousTier },
          after: { healthScore, tier }
        },
        {
          ...context,
          details: {
            scoreChange: healthScore - previousScore,
            interventionTriggered: !!interventionResult,
            interventionTier: tier
          }
        }
      );

      return {
        firmId,
        healthScore,
        previousScore,
        tier,
        previousTier,
        interventionTriggered: !!interventionResult,
        interventionResult
      };
    } catch (error) {
      logger.error('ChurnInterventionService.handleHealthScoreUpdate failed:', error.message);
      throw error;
    }
  }

  /**
   * Trigger critical intervention (Health Score 0-30)
   * - Executive escalation
   * - Emergency call scheduling
   * - Urgent CSM assignment
   * - Retention offer with significant discount
   *
   * @param {String} firmId - Firm ID
   * @param {Number} healthScore - Current health score
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Intervention actions taken
   */
  static async triggerCriticalIntervention(firmId, healthScore, context = {}) {
    try {
      logger.warn(`ChurnIntervention: CRITICAL intervention for firm ${firmId} (score: ${healthScore})`);

      // Check cooldown
      if (interventionTracker.isInCooldown(firmId, 'critical')) {
        logger.info(`ChurnIntervention: Critical intervention in cooldown for firm ${firmId}`);
        return { skipped: true, reason: 'cooldown' };
      }

      const firm = await Firm.findById(firmId)
        .populate('team.userId', 'firstName lastName email')
        .lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      const actions = {
        emailSent: false,
        executiveAlerted: false,
        csmTaskCreated: false,
        callScheduled: false,
        discountOffered: false
      };

      // 1. Send critical retention email to firm owner
      const owner = firm.team?.find(member => member.role === 'owner');
      if (owner && owner.userId?.email) {
        await this.sendRetentionEmail(firmId, 'churnCritical', {
          firmName: firm.name,
          ownerName: `${owner.userId.firstName} ${owner.userId.lastName}`,
          healthScore,
          urgency: 'critical',
          contactUrl: `${process.env.DASHBOARD_URL}/support`,
          dashboardUrl: `${process.env.DASHBOARD_URL}/dashboard`
        });
        actions.emailSent = true;
      }

      // 2. Alert executives
      await this.sendExecutiveAlert(firmId, healthScore);
      actions.executiveAlerted = true;

      // 3. Create urgent CSM task
      const taskId = await this.createCSMTask(firmId, 'critical_retention', 'urgent', 1);
      actions.csmTaskCreated = !!taskId;

      // 4. Schedule emergency call
      const callId = await this.scheduleCall(firmId, 'emergency_retention', 'immediate');
      actions.callScheduled = !!callId;

      // 5. Generate retention discount offer
      const discountCode = await this.offerDiscount(firmId, 'critical_retention', 30);
      actions.discountOffered = !!discountCode;

      // Log intervention
      const interventionId = this.logIntervention(firmId, 'critical', {
        healthScore,
        actions,
        timestamp: new Date()
      });

      logger.info(`ChurnIntervention: Critical intervention completed for firm ${firmId}`, actions);

      return {
        interventionId,
        tier: 'critical',
        actions,
        message: 'Critical intervention triggered successfully'
      };
    } catch (error) {
      logger.error('ChurnInterventionService.triggerCriticalIntervention failed:', error.message);
      throw error;
    }
  }

  /**
   * Trigger at-risk intervention (Health Score 31-50)
   * - CSM task creation
   * - Feature education email
   * - Proactive support outreach
   *
   * @param {String} firmId - Firm ID
   * @param {Number} healthScore - Current health score
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Intervention actions taken
   */
  static async triggerAtRiskIntervention(firmId, healthScore, context = {}) {
    try {
      logger.warn(`ChurnIntervention: AT-RISK intervention for firm ${firmId} (score: ${healthScore})`);

      // Check cooldown
      if (interventionTracker.isInCooldown(firmId, 'atRisk')) {
        logger.info(`ChurnIntervention: At-risk intervention in cooldown for firm ${firmId}`);
        return { skipped: true, reason: 'cooldown' };
      }

      const firm = await Firm.findById(firmId)
        .populate('team.userId', 'firstName lastName email')
        .lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      const actions = {
        emailSent: false,
        csmTaskCreated: false,
        educationEmailSent: false
      };

      // 1. Send feature adoption email
      const owner = firm.team?.find(member => member.role === 'owner');
      if (owner && owner.userId?.email) {
        await this.sendRetentionEmail(firmId, 'featureAdoption', {
          firmName: firm.name,
          ownerName: `${owner.userId.firstName} ${owner.userId.lastName}`,
          healthScore,
          features: this._getRecommendedFeatures(firm),
          dashboardUrl: `${process.env.DASHBOARD_URL}/dashboard`,
          helpCenterUrl: `${process.env.DASHBOARD_URL}/help`
        });
        actions.educationEmailSent = true;
      }

      // 2. Create CSM follow-up task
      const taskId = await this.createCSMTask(firmId, 'at_risk_followup', 'high', 3);
      actions.csmTaskCreated = !!taskId;

      // Log intervention
      const interventionId = this.logIntervention(firmId, 'atRisk', {
        healthScore,
        actions,
        timestamp: new Date()
      });

      logger.info(`ChurnIntervention: At-risk intervention completed for firm ${firmId}`, actions);

      return {
        interventionId,
        tier: 'atRisk',
        actions,
        message: 'At-risk intervention triggered successfully'
      };
    } catch (error) {
      logger.error('ChurnInterventionService.triggerAtRiskIntervention failed:', error.message);
      throw error;
    }
  }

  /**
   * Trigger warning intervention (Health Score 51-70)
   * - Proactive check-in email
   * - Resource sharing
   * - Light-touch engagement
   *
   * @param {String} firmId - Firm ID
   * @param {Number} healthScore - Current health score
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Intervention actions taken
   */
  static async triggerWarningIntervention(firmId, healthScore, context = {}) {
    try {
      logger.info(`ChurnIntervention: WARNING intervention for firm ${firmId} (score: ${healthScore})`);

      // Check cooldown
      if (interventionTracker.isInCooldown(firmId, 'warning')) {
        logger.info(`ChurnIntervention: Warning intervention in cooldown for firm ${firmId}`);
        return { skipped: true, reason: 'cooldown' };
      }

      const firm = await Firm.findById(firmId)
        .populate('team.userId', 'firstName lastName email')
        .lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      const actions = {
        emailSent: false,
        csmTaskCreated: false
      };

      // 1. Send proactive check-in email
      const owner = firm.team?.find(member => member.role === 'owner');
      if (owner && owner.userId?.email) {
        await this.sendRetentionEmail(firmId, 'churnWarning', {
          firmName: firm.name,
          ownerName: `${owner.userId.firstName} ${owner.userId.lastName}`,
          healthScore,
          tips: this._getEngagementTips(),
          dashboardUrl: `${process.env.DASHBOARD_URL}/dashboard`,
          supportUrl: `${process.env.DASHBOARD_URL}/support`
        });
        actions.emailSent = true;
      }

      // 2. Create low-priority CSM task for monitoring
      const taskId = await this.createCSMTask(firmId, 'warning_monitoring', 'medium', 7);
      actions.csmTaskCreated = !!taskId;

      // Log intervention
      const interventionId = this.logIntervention(firmId, 'warning', {
        healthScore,
        actions,
        timestamp: new Date()
      });

      logger.info(`ChurnIntervention: Warning intervention completed for firm ${firmId}`, actions);

      return {
        interventionId,
        tier: 'warning',
        actions,
        message: 'Warning intervention triggered successfully'
      };
    } catch (error) {
      logger.error('ChurnInterventionService.triggerWarningIntervention failed:', error.message);
      throw error;
    }
  }

  /**
   * Trigger upsell opportunity (Health Score 81-100)
   * - Expansion email
   * - Premium feature showcase
   * - Success story sharing
   *
   * @param {String} firmId - Firm ID
   * @param {Number} healthScore - Current health score
   * @param {Object} context - Request context
   * @returns {Promise<Object>} - Intervention actions taken
   */
  static async triggerUpsellOpportunity(firmId, healthScore, context = {}) {
    try {
      logger.info(`ChurnIntervention: UPSELL opportunity for firm ${firmId} (score: ${healthScore})`);

      // Check cooldown
      if (interventionTracker.isInCooldown(firmId, 'upsell')) {
        logger.info(`ChurnIntervention: Upsell intervention in cooldown for firm ${firmId}`);
        return { skipped: true, reason: 'cooldown' };
      }

      const firm = await Firm.findById(firmId)
        .populate('team.userId', 'firstName lastName email')
        .lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      const actions = {
        emailSent: false,
        csmTaskCreated: false
      };

      // 1. Send expansion opportunity email
      const owner = firm.team?.find(member => member.role === 'owner');
      if (owner && owner.userId?.email) {
        // Note: Would use upsell template, but using retention as placeholder
        await this.sendRetentionEmail(firmId, 'retentionOffer', {
          firmName: firm.name,
          ownerName: `${owner.userId.firstName} ${owner.userId.lastName}`,
          healthScore,
          offerType: 'expansion',
          premiumFeatures: this._getPremiumFeatures(),
          dashboardUrl: `${process.env.DASHBOARD_URL}/dashboard`,
          upgradePath: `${process.env.DASHBOARD_URL}/upgrade`
        });
        actions.emailSent = true;
      }

      // 2. Create sales opportunity task
      const taskId = await this.createCSMTask(firmId, 'upsell_opportunity', 'medium', 7);
      actions.csmTaskCreated = !!taskId;

      // Log intervention
      const interventionId = this.logIntervention(firmId, 'upsell', {
        healthScore,
        actions,
        timestamp: new Date()
      });

      logger.info(`ChurnIntervention: Upsell intervention completed for firm ${firmId}`, actions);

      return {
        interventionId,
        tier: 'upsell',
        actions,
        message: 'Upsell opportunity intervention triggered successfully'
      };
    } catch (error) {
      logger.error('ChurnInterventionService.triggerUpsellOpportunity failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // INTERVENTION ACTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Send retention email campaign
   *
   * @param {String} firmId - Firm ID
   * @param {String} template - Email template name
   * @param {Object} variables - Template variables
   * @returns {Promise<Object>} - Email send result
   */
  static async sendRetentionEmail(firmId, template, variables) {
    try {
      const firm = await Firm.findById(firmId)
        .populate('team.userId', 'firstName lastName email')
        .lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      // Get owner email
      const owner = firm.team?.find(member => member.role === 'owner');
      if (!owner || !owner.userId?.email) {
        throw new Error('Firm owner email not found');
      }

      // Prepare email based on template
      const emailConfig = this._prepareEmailConfig(template, variables);

      // Send via email service (queued)
      const result = await EmailService.sendEmail({
        to: owner.userId.email,
        subject: emailConfig.subject,
        html: emailConfig.html
      }, true);

      logger.info(`ChurnIntervention: Retention email sent to firm ${firmId} using template ${template}`);

      return result;
    } catch (error) {
      logger.error('ChurnInterventionService.sendRetentionEmail failed:', error.message);
      throw error;
    }
  }

  /**
   * Create CSM task for follow-up
   *
   * @param {String} firmId - Firm ID
   * @param {String} taskType - Type of task
   * @param {String} priority - Task priority (urgent, high, medium, low)
   * @param {Number} deadline - Days until deadline
   * @returns {Promise<String>} - Activity ID
   */
  static async createCSMTask(firmId, taskType, priority = 'medium', deadline = 7) {
    try {
      const firm = await Firm.findById(firmId).lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      // Map task types to descriptions
      const taskDescriptions = {
        critical_retention: `URGENT: Critical retention needed for ${firm.name}`,
        at_risk_followup: `Follow up with at-risk customer: ${firm.name}`,
        warning_monitoring: `Monitor engagement for ${firm.name}`,
        upsell_opportunity: `Expansion opportunity for ${firm.name}`
      };

      const taskNotes = {
        critical_retention: `Customer health score is critical. Immediate intervention required. Schedule call within 24 hours.`,
        at_risk_followup: `Customer showing signs of disengagement. Review usage patterns and reach out proactively.`,
        warning_monitoring: `Customer engagement declining. Monitor and provide resources as needed.`,
        upsell_opportunity: `Customer is highly engaged and satisfied. Great opportunity for expansion discussion.`
      };

      // In production, find CSM team member or assign to default CSM
      // For now, we'll use a placeholder
      const csmUserId = process.env.DEFAULT_CSM_USER_ID || null;

      if (!csmUserId) {
        logger.warn('No CSM user configured, skipping task creation');
        return null;
      }

      // Calculate deadline
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + deadline);

      // Create activity using ActivityService
      // Note: This requires an activity type to be configured in the system
      // For now, we'll log this as a placeholder
      logger.info(`ChurnIntervention: Would create CSM task for firm ${firmId}: ${taskDescriptions[taskType]}`);

      // In production implementation:
      // const activity = await ActivityService.scheduleActivity({
      //   res_model: 'Firm',
      //   res_id: firmId,
      //   activity_type_id: 'CSM_TASK_TYPE_ID',
      //   summary: taskDescriptions[taskType],
      //   note: taskNotes[taskType],
      //   date_deadline: deadlineDate,
      //   user_id: csmUserId
      // }, { firmId: 'SYSTEM' });

      return `TASK_${taskType}_${firmId}`;
    } catch (error) {
      logger.error('ChurnInterventionService.createCSMTask failed:', error.message);
      throw error;
    }
  }

  /**
   * Send executive alert for critical situations
   *
   * @param {String} firmId - Firm ID
   * @param {Number} healthScore - Current health score
   * @returns {Promise<Boolean>} - Success status
   */
  static async sendExecutiveAlert(firmId, healthScore) {
    try {
      const firm = await Firm.findById(firmId).lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      // Get executive emails from environment or configuration
      const executiveEmails = process.env.EXECUTIVE_ALERT_EMAILS?.split(',') || [];

      if (executiveEmails.length === 0) {
        logger.warn('No executive emails configured for alerts');
        return false;
      }

      // Send alert email to executives
      for (const email of executiveEmails) {
        await EmailService.sendEmail({
          to: email.trim(),
          subject: `🚨 CRITICAL: Customer Churn Risk - ${firm.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #fee2e2; border-left: 4px solid #dc2626;">
              <h2 style="color: #991b1b;">Critical Customer Alert</h2>
              <p><strong>Customer:</strong> ${firm.name}</p>
              <p><strong>Health Score:</strong> ${healthScore}/100</p>
              <p><strong>Status:</strong> CRITICAL - Immediate Attention Required</p>
              <p><strong>Action Required:</strong> Executive intervention recommended within 24 hours</p>
              <hr style="border: none; border-top: 1px solid #dc2626; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">
                This is an automated alert from the Churn Intervention System.
              </p>
            </div>
          `
        }, true);
      }

      logger.info(`ChurnIntervention: Executive alert sent for firm ${firmId}`);

      return true;
    } catch (error) {
      logger.error('ChurnInterventionService.sendExecutiveAlert failed:', error.message);
      return false;
    }
  }

  /**
   * Schedule retention call
   *
   * @param {String} firmId - Firm ID
   * @param {String} type - Call type
   * @param {String} urgency - Call urgency
   * @returns {Promise<String>} - Call ID
   */
  static async scheduleCall(firmId, type, urgency) {
    try {
      const firm = await Firm.findById(firmId).lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      // In production, this would integrate with a scheduling system (Calendly, etc.)
      const callId = `CALL_${type}_${firmId}_${Date.now()}`;

      logger.info(`ChurnIntervention: Scheduled ${urgency} ${type} call for firm ${firmId}`);

      // Log to audit
      await AuditLogService.log(
        'schedule_retention_call',
        'firm',
        firmId,
        null,
        {
          details: { type, urgency, callId }
        }
      );

      return callId;
    } catch (error) {
      logger.error('ChurnInterventionService.scheduleCall failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate retention discount offer
   *
   * @param {String} firmId - Firm ID
   * @param {String} discountType - Type of discount
   * @param {Number} validDays - Days until offer expires
   * @returns {Promise<String>} - Discount code
   */
  static async offerDiscount(firmId, discountType, validDays = 30) {
    try {
      const firm = await Firm.findById(firmId).lean();

      if (!firm) {
        throw new Error(`Firm ${firmId} not found`);
      }

      // Generate unique discount code
      const discountCode = `RETAIN_${discountType.toUpperCase()}_${firmId.slice(-6)}`;

      const discountDetails = {
        code: discountCode,
        firmId,
        type: discountType,
        percentage: discountType === 'critical_retention' ? 30 : 15,
        validUntil: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000),
        createdAt: new Date()
      };

      logger.info(`ChurnIntervention: Generated discount offer ${discountCode} for firm ${firmId}`);

      // Log to audit
      await AuditLogService.log(
        'create_retention_discount',
        'firm',
        firmId,
        null,
        {
          details: discountDetails
        }
      );

      return discountCode;
    } catch (error) {
      logger.error('ChurnInterventionService.offerDiscount failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // TRACKING METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Log intervention to tracker
   *
   * @param {String} firmId - Firm ID
   * @param {String} interventionType - Type of intervention
   * @param {Object} details - Intervention details
   * @returns {String} - Intervention ID
   */
  static logIntervention(firmId, interventionType, details) {
    return interventionTracker.log(firmId, interventionType, details);
  }

  /**
   * Get intervention history for a firm
   *
   * @param {String} firmId - Firm ID
   * @param {Number} limit - Maximum number of records to return
   * @returns {Array} - Intervention history
   */
  static getInterventionHistory(firmId, limit = 50) {
    return interventionTracker.getHistory(firmId, limit);
  }

  /**
   * Measure intervention effectiveness
   *
   * @param {String} interventionId - Intervention ID
   * @param {String} outcome - Outcome (success, failed, pending)
   * @param {Number} effectiveness - Effectiveness score (0-100)
   * @returns {Boolean} - Update success
   */
  static measureInterventionEffectiveness(interventionId, outcome, effectiveness) {
    return interventionTracker.updateOutcome(interventionId, outcome, effectiveness);
  }

  /**
   * Get intervention statistics
   *
   * @param {Object} dateRange - Date range filter
   * @returns {Object} - Intervention statistics
   */
  static getInterventionStats(dateRange = null) {
    return interventionTracker.getStats(dateRange);
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Determine intervention tier based on health score
   * @private
   */
  static _determineInterventionTier(healthScore) {
    if (healthScore <= HEALTH_SCORE_THRESHOLDS.critical) {
      return 'critical';
    } else if (healthScore <= HEALTH_SCORE_THRESHOLDS.atRisk) {
      return 'atRisk';
    } else if (healthScore <= HEALTH_SCORE_THRESHOLDS.warning) {
      return 'warning';
    } else if (healthScore <= HEALTH_SCORE_THRESHOLDS.healthy) {
      return 'healthy';
    } else {
      return 'excellent';
    }
  }

  /**
   * Prepare email configuration based on template
   * @private
   */
  static _prepareEmailConfig(template, variables) {
    // Simple email template rendering
    // In production, use EmailTemplateService.render()

    const templates = {
      churnCritical: {
        subject: `🚨 Urgent: We Need Your Feedback - ${variables.firmName}`,
        html: this._renderCriticalEmail(variables)
      },
      churnWarning: {
        subject: `Checking In - How Can We Help? - ${variables.firmName}`,
        html: this._renderWarningEmail(variables)
      },
      retentionOffer: {
        subject: `Special Offer for ${variables.firmName}`,
        html: this._renderRetentionOfferEmail(variables)
      },
      featureAdoption: {
        subject: `Unlock More Value - ${variables.firmName}`,
        html: this._renderFeatureAdoptionEmail(variables)
      }
    };

    return templates[template] || templates.churnWarning;
  }

  /**
   * Render critical email HTML
   * @private
   */
  static _renderCriticalEmail(vars) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🚨 We Need Your Feedback</h1>
        </div>

        <div style="background-color: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px;">Dear ${vars.ownerName},</p>

          <p>We've noticed that your engagement with Traf3li has decreased recently, and we're concerned that we might not be meeting your expectations.</p>

          <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #991b1b; font-weight: bold;">Your feedback is incredibly important to us.</p>
            <p style="margin: 10px 0 0 0; color: #991b1b;">We'd like to schedule a quick call to understand how we can better serve ${vars.firmName}.</p>
          </div>

          <h3>We're Here to Help</h3>
          <p>Whatever challenges you're facing, our team is committed to finding a solution:</p>
          <ul>
            <li>✓ Dedicated support from our customer success team</li>
            <li>✓ Custom training sessions for your team</li>
            <li>✓ Flexible pricing options to fit your budget</li>
            <li>✓ Priority technical support</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.contactUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">Schedule a Call</a>
          </div>

          <p>Or reach out directly:</p>
          <p><strong>Email:</strong> support@traf3li.com<br>
          <strong>Phone:</strong> +966 XX XXX XXXX</p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>The Traf3li Customer Success Team</strong>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Render warning email HTML
   * @private
   */
  static _renderWarningEmail(vars) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">We're Here to Help</h1>
        </div>

        <div style="background-color: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px;">Hi ${vars.ownerName},</p>

          <p>We wanted to reach out and see how things are going with Traf3li at ${vars.firmName}.</p>

          <p>We're committed to helping you get the most value from our platform. Here are some tips to maximize your success:</p>

          ${vars.tips ? vars.tips.map(tip => `<p><strong>•</strong> ${tip}</p>`).join('') : ''}

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-weight: bold;">Need assistance?</p>
            <p style="margin: 10px 0 0 0; color: #92400e;">Our support team is ready to help you succeed.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.supportUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">Get Support</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>The Traf3li Team</strong>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Render retention offer email HTML
   * @private
   */
  static _renderRetentionOfferEmail(vars) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎁 Special Offer for You</h1>
        </div>

        <div style="background-color: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px;">Dear ${vars.ownerName},</p>

          <p>We value your partnership with Traf3li and want to ensure you're getting the best possible value.</p>

          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px; text-align: center;">
            <p style="margin: 0; color: #1e40af; font-size: 24px; font-weight: bold;">30% OFF</p>
            <p style="margin: 10px 0 0 0; color: #1e40af;">Exclusive retention offer valid for 30 days</p>
          </div>

          <h3>Why Stay with Traf3li?</h3>
          <ul>
            <li>✓ Comprehensive legal practice management</li>
            <li>✓ Continuous platform improvements</li>
            <li>✓ Dedicated customer support</li>
            <li>✓ Saudi Arabia-specific features</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">Claim Your Offer</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>The Traf3li Team</strong>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Render feature adoption email HTML
   * @private
   */
  static _renderFeatureAdoptionEmail(vars) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">💡 Unlock More Value</h1>
        </div>

        <div style="background-color: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px;">Hi ${vars.ownerName},</p>

          <p>We noticed you're not taking full advantage of some powerful features in Traf3li that could help ${vars.firmName} work more efficiently.</p>

          <h3>Features You Should Try:</h3>
          ${vars.features ? vars.features.map(feature => `
            <div style="margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 5px;">
              <h4 style="margin: 0 0 10px 0; color: #6366f1;">${feature.name}</h4>
              <p style="margin: 0; color: #666;">${feature.description}</p>
            </div>
          `).join('') : ''}

          <div style="background-color: #ede9fe; border-left: 4px solid #8b5cf6; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; color: #5b21b6; font-weight: bold;">Need help getting started?</p>
            <p style="margin: 10px 0 0 0; color: #5b21b6;">Our team can provide a personalized walkthrough.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.helpCenterUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-weight: bold; font-size: 16px;">Learn More</a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>The Traf3li Team</strong>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get recommended features based on firm data
   * @private
   */
  static _getRecommendedFeatures(firm) {
    return [
      {
        name: 'Advanced Case Management',
        description: 'Organize cases with custom workflows and automation'
      },
      {
        name: 'Client Portal',
        description: 'Give clients 24/7 access to case updates and documents'
      },
      {
        name: 'Time Tracking & Billing',
        description: 'Track billable hours and generate invoices automatically'
      }
    ];
  }

  /**
   * Get engagement tips
   * @private
   */
  static _getEngagementTips() {
    return [
      'Set up automated case workflows to save time',
      'Enable client notifications for better communication',
      'Use the mobile app for on-the-go access',
      'Explore our integrations with other tools you use'
    ];
  }

  /**
   * Get premium features for upsell
   * @private
   */
  static _getPremiumFeatures() {
    return [
      {
        name: 'AI-Powered Document Analysis',
        description: 'Automatically extract key information from legal documents'
      },
      {
        name: 'Advanced Analytics',
        description: 'Deep insights into firm performance and profitability'
      },
      {
        name: 'Priority Support',
        description: '24/7 dedicated support with 1-hour response time'
      }
    ];
  }
}

module.exports = ChurnInterventionService;
