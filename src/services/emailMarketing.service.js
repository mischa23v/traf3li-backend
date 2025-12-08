/**
 * Email Marketing Service for TRAF3LI
 * Comprehensive email campaign management with automation, tracking, and analytics
 */

const { Resend } = require('resend');
const crypto = require('crypto');
const EmailCampaign = require('../models/emailCampaign.model');
const EmailTemplate = require('../models/emailTemplate.model');
const EmailSubscriber = require('../models/emailSubscriber.model');
const EmailEvent = require('../models/emailEvent.model');
const EmailSegment = require('../models/emailSegment.model');
const Lead = require('../models/lead.model');
const Client = require('../models/client.model');

// Initialize Resend
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const RESEND_CONFIG = {
  fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev',
  fromName: process.env.FROM_NAME || 'TRAF3LI',
};

class EmailMarketingService {
  // ==================== CAMPAIGN MANAGEMENT ====================

  /**
   * Create a new email campaign
   */
  static async createCampaign(firmId, data, userId) {
    try {
      const campaign = await EmailCampaign.create({
        ...data,
        firmId,
        createdBy: userId,
        updatedBy: userId
      });

      // If audience specified, calculate recipient count
      if (campaign.audienceType !== 'custom') {
        await this._calculateRecipientCount(campaign);
      }

      return campaign;
    } catch (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  /**
   * Update campaign
   */
  static async updateCampaign(campaignId, data, userId) {
    try {
      const campaign = await EmailCampaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Prevent editing sent campaigns
      if (campaign.status === 'sent' || campaign.status === 'sending') {
        throw new Error('Cannot edit campaign that is sent or sending');
      }

      Object.assign(campaign, data);
      campaign.updatedBy = userId;
      await campaign.save();

      // Recalculate recipients if audience changed
      if (data.audienceType || data.segmentId || data.customRecipients) {
        await this._calculateRecipientCount(campaign);
      }

      return campaign;
    } catch (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }
  }

  /**
   * Delete campaign
   */
  static async deleteCampaign(campaignId) {
    try {
      const campaign = await EmailCampaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Only allow deleting draft campaigns
      if (campaign.status !== 'draft') {
        throw new Error('Can only delete draft campaigns');
      }

      await campaign.deleteOne();
      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
  }

  /**
   * Duplicate campaign
   */
  static async duplicateCampaign(campaignId, userId) {
    try {
      const original = await EmailCampaign.findById(campaignId).lean();
      if (!original) {
        throw new Error('Campaign not found');
      }

      const duplicate = await EmailCampaign.create({
        ...original,
        _id: undefined,
        name: `${original.name} (Copy)`,
        status: 'draft',
        scheduledAt: null,
        sentAt: null,
        completedAt: null,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          uniqueOpens: 0,
          clicked: 0,
          uniqueClicks: 0,
          bounced: 0,
          unsubscribed: 0,
          complained: 0,
          failed: 0
        },
        createdBy: userId,
        updatedBy: userId,
        createdAt: undefined,
        updatedAt: undefined
      });

      return duplicate;
    } catch (error) {
      throw new Error(`Failed to duplicate campaign: ${error.message}`);
    }
  }

  // ==================== SCHEDULING & SENDING ====================

  /**
   * Schedule campaign
   */
  static async scheduleCampaign(campaignId, scheduledAt, timezone = 'Asia/Riyadh') {
    try {
      const campaign = await EmailCampaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'draft') {
        throw new Error('Can only schedule draft campaigns');
      }

      campaign.scheduledAt = new Date(scheduledAt);
      campaign.timezone = timezone;
      campaign.status = 'scheduled';
      await campaign.save();

      return campaign;
    } catch (error) {
      throw new Error(`Failed to schedule campaign: ${error.message}`);
    }
  }

  /**
   * Send campaign immediately
   */
  static async sendCampaign(campaignId) {
    try {
      const campaign = await EmailCampaign.findById(campaignId)
        .populate('templateId')
        .populate('segmentId');

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        throw new Error('Campaign is not ready to send');
      }

      // Get subscribers
      const subscribers = await this._getCampaignRecipients(campaign);

      if (subscribers.length === 0) {
        throw new Error('No recipients found for this campaign');
      }

      // Update campaign status
      campaign.status = 'sending';
      campaign.sentAt = new Date();
      await campaign.save();

      // Send emails (async - don't wait)
      this.sendBulkEmails(campaign, subscribers).catch(error => {
        console.error('Bulk email sending error:', error);
      });

      return campaign;
    } catch (error) {
      throw new Error(`Failed to send campaign: ${error.message}`);
    }
  }

  /**
   * Pause campaign
   */
  static async pauseCampaign(campaignId) {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = 'paused';
    await campaign.save();
    return campaign;
  }

  /**
   * Resume campaign
   */
  static async resumeCampaign(campaignId) {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'paused') {
      throw new Error('Can only resume paused campaigns');
    }

    campaign.status = 'sending';
    await campaign.save();
    return campaign;
  }

  /**
   * Cancel campaign
   */
  static async cancelCampaign(campaignId) {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    campaign.status = 'cancelled';
    await campaign.save();
    return campaign;
  }

  // ==================== EMAIL SENDING ====================

  /**
   * Send bulk emails for a campaign
   */
  static async sendBulkEmails(campaign, subscribers) {
    if (!resend) {
      console.error('Resend not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    for (const subscriber of subscribers) {
      try {
        // Check if campaign is paused/cancelled
        const currentCampaign = await EmailCampaign.findById(campaign._id);
        if (currentCampaign.status === 'paused' || currentCampaign.status === 'cancelled') {
          break;
        }

        // Select A/B test variant if enabled
        let emailContent = campaign.htmlContent;
        let emailSubject = campaign.subject;
        let variantId = null;

        if (campaign.abTest?.enabled && !campaign.abTest.winnerSelected) {
          const variant = await this.selectVariant(campaign);
          if (variant) {
            emailContent = variant.htmlContent || emailContent;
            emailSubject = variant.subject || emailSubject;
            variantId = variant._id;
          }
        }

        // Personalize content
        emailContent = await this.personalizeContent(emailContent, subscriber);
        emailSubject = await this.personalizeContent(emailSubject, subscriber);

        // Generate tracking ID
        const trackingId = this._generateTrackingId();

        // Add tracking pixel and unsubscribe link
        emailContent = this._addTracking(emailContent, trackingId, subscriber, campaign);

        // Send email
        const { data, error } = await resend.emails.send({
          from: `${campaign.fromName || RESEND_CONFIG.fromName} <${campaign.fromEmail || RESEND_CONFIG.fromEmail}>`,
          to: [subscriber.email],
          subject: emailSubject,
          html: emailContent,
          replyTo: campaign.replyTo
        });

        if (error) {
          throw new Error(error.message);
        }

        // Track sent event
        await this.trackEvent('sent', campaign._id, subscriber._id, {
          messageId: data.id,
          trackingId,
          variantId
        });

        // Update campaign stats
        campaign.stats.sent++;
        if (variantId) {
          const variant = campaign.abTest.variants.id(variantId);
          if (variant) variant.stats.sent++;
        }

        results.sent++;

        // Rate limiting: wait 100ms between emails to respect Resend limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error.message);

        // Track failed event
        await this.trackEvent('failed', campaign._id, subscriber._id, {
          errorMessage: error.message
        });

        campaign.stats.failed++;
        results.failed++;
        results.errors.push({ email: subscriber.email, error: error.message });
      }
    }

    // Update campaign
    campaign.status = results.failed === 0 ? 'sent' : 'sending';
    if (campaign.status === 'sent') {
      campaign.completedAt = new Date();
    }
    await campaign.save();

    return results;
  }

  /**
   * Send single email (for testing)
   */
  static async sendSingleEmail(subscriberId, templateId, variables) {
    if (!resend) {
      throw new Error('Email service not configured');
    }

    const subscriber = await EmailSubscriber.findById(subscriberId);
    const template = await EmailTemplate.findById(templateId);

    if (!subscriber || !template) {
      throw new Error('Subscriber or template not found');
    }

    let content = template.htmlContent;
    let subject = template.subject;

    // Apply variables
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, variables[key]);
      subject = subject.replace(regex, variables[key]);
    });

    const { data, error } = await resend.emails.send({
      from: `${RESEND_CONFIG.fromName} <${RESEND_CONFIG.fromEmail}>`,
      to: [subscriber.email],
      subject: subject,
      html: content
    });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true, messageId: data.id };
  }

  /**
   * Render template with variables
   */
  static async renderTemplate(template, variables) {
    let html = template.htmlContent;
    let subject = template.subject;

    // Replace template variables
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, variables[key] || '');
      subject = subject.replace(regex, variables[key] || '');
    });

    return { html, subject };
  }

  /**
   * Personalize content with subscriber data
   */
  static async personalizeContent(content, subscriber) {
    if (!content) return content;

    const variables = {
      firstName: subscriber.firstName || 'العميل',
      lastName: subscriber.lastName || '',
      fullName: subscriber.fullName || subscriber.displayName || 'العميل',
      email: subscriber.email,
      companyName: subscriber.companyName || '',
      phone: subscriber.phone || ''
    };

    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, variables[key]);
    });

    return content;
  }

  // ==================== DRIP CAMPAIGNS ====================

  /**
   * Start drip campaign for a subscriber
   */
  static async startDripCampaign(campaignId, subscriberId) {
    const campaign = await EmailCampaign.findById(campaignId);
    const subscriber = await EmailSubscriber.findById(subscriberId);

    if (!campaign || !subscriber) {
      throw new Error('Campaign or subscriber not found');
    }

    if (!campaign.dripSettings?.enabled) {
      throw new Error('This is not a drip campaign');
    }

    // Add to subscriber's drip campaigns
    subscriber.dripCampaigns.push({
      campaignId: campaign._id,
      startedAt: new Date(),
      currentStep: 0,
      completedSteps: [],
      status: 'active'
    });

    await subscriber.save();

    // Send first step immediately
    await this.processNextDripStep(campaignId, subscriberId);

    return { success: true };
  }

  /**
   * Process next drip step for subscriber
   */
  static async processNextDripStep(campaignId, subscriberId) {
    const campaign = await EmailCampaign.findById(campaignId);
    const subscriber = await EmailSubscriber.findById(subscriberId);

    if (!campaign || !subscriber) return;

    const dripProgress = subscriber.dripCampaigns.find(
      d => d.campaignId.toString() === campaignId.toString()
    );

    if (!dripProgress || dripProgress.status !== 'active') return;

    const nextStep = campaign.dripSettings.steps.find(
      s => s.order === dripProgress.currentStep + 1
    );

    if (!nextStep) {
      // Drip campaign completed
      dripProgress.status = 'completed';
      await subscriber.save();
      return;
    }

    // Check if enough time has passed
    const delayMs = (nextStep.delayDays * 24 * 60 * 60 * 1000) + (nextStep.delayHours * 60 * 60 * 1000);
    const timeSinceStart = Date.now() - dripProgress.startedAt.getTime();
    const timeSinceLastEmail = dripProgress.lastEmailSentAt ?
      Date.now() - dripProgress.lastEmailSentAt.getTime() : timeSinceStart;

    if (timeSinceLastEmail < delayMs) {
      // Not time yet
      return;
    }

    // Send email
    if (resend) {
      try {
        let content = nextStep.htmlContent;
        let subject = nextStep.subject;

        content = await this.personalizeContent(content, subscriber);
        subject = await this.personalizeContent(subject, subscriber);

        const trackingId = this._generateTrackingId();
        content = this._addTracking(content, trackingId, subscriber, campaign);

        const { data, error } = await resend.emails.send({
          from: `${campaign.fromName || RESEND_CONFIG.fromName} <${campaign.fromEmail || RESEND_CONFIG.fromEmail}>`,
          to: [subscriber.email],
          subject: subject,
          html: content,
          replyTo: campaign.replyTo
        });

        if (!error) {
          // Track event
          await this.trackEvent('sent', campaign._id, subscriber._id, {
            messageId: data.id,
            trackingId,
            dripStep: nextStep.order,
            source: 'drip'
          });

          // Update progress
          dripProgress.currentStep = nextStep.order;
          dripProgress.completedSteps.push(nextStep.order);
          dripProgress.lastEmailSentAt = new Date();

          // Update step stats
          nextStep.sentCount++;
          await campaign.save();
          await subscriber.save();
        }
      } catch (error) {
        console.error('Drip email send error:', error);
      }
    }
  }

  /**
   * Pause drip campaign for subscriber
   */
  static async pauseDripForSubscriber(campaignId, subscriberId) {
    const subscriber = await EmailSubscriber.findById(subscriberId);
    if (!subscriber) throw new Error('Subscriber not found');

    const dripProgress = subscriber.dripCampaigns.find(
      d => d.campaignId.toString() === campaignId.toString()
    );

    if (dripProgress) {
      dripProgress.status = 'paused';
      await subscriber.save();
    }

    return { success: true };
  }

  /**
   * Get drip progress for subscriber
   */
  static async getDripProgress(campaignId, subscriberId) {
    const subscriber = await EmailSubscriber.findById(subscriberId);
    if (!subscriber) throw new Error('Subscriber not found');

    const dripProgress = subscriber.dripCampaigns.find(
      d => d.campaignId.toString() === campaignId.toString()
    );

    return dripProgress || null;
  }

  // ==================== TRIGGERS & AUTOMATION ====================

  /**
   * Handle trigger event
   */
  static async handleTrigger(firmId, triggerType, data) {
    // Find all active triggered campaigns for this type
    const campaigns = await EmailCampaign.find({
      firmId,
      type: 'triggered',
      status: 'scheduled',
      'triggerSettings.triggerType': triggerType
    });

    for (const campaign of campaigns) {
      try {
        // Check cooldown
        const lastSent = await EmailEvent.findOne({
          campaignId: campaign._id,
          subscriberId: data.subscriberId,
          eventType: 'sent'
        }).sort({ timestamp: -1 });

        if (lastSent) {
          const hoursSince = (Date.now() - lastSent.timestamp.getTime()) / (1000 * 60 * 60);
          if (hoursSince < campaign.triggerSettings.cooldownHours) {
            continue; // Skip due to cooldown
          }
        }

        // Check if conditions match
        if (this._evaluateTriggerConditions(campaign.triggerSettings.triggerConditions, data)) {
          // Send triggered email
          const subscriber = await EmailSubscriber.findById(data.subscriberId);
          if (subscriber && subscriber.status === 'subscribed') {
            await this.sendBulkEmails(campaign, [subscriber]);
          }
        }
      } catch (error) {
        console.error(`Trigger handling error for campaign ${campaign._id}:`, error);
      }
    }
  }

  static async handleLeadCreated(leadId) {
    const lead = await Lead.findById(leadId);
    if (!lead || !lead.email) return;

    // Find or create subscriber
    let subscriber = await EmailSubscriber.findOne({
      firmId: lead.firmId,
      email: lead.email
    });

    if (!subscriber) {
      subscriber = await EmailSubscriber.create({
        firmId: lead.firmId,
        email: lead.email,
        firstName: lead.firstName,
        lastName: lead.lastName,
        leadId: lead._id,
        subscriptionSource: 'lead_conversion'
      });
    }

    await this.handleTrigger(lead.firmId, 'lead_created', {
      subscriberId: subscriber._id,
      leadId: lead._id
    });
  }

  static async handleStageChanged(leadId, newStage) {
    const lead = await Lead.findById(leadId);
    if (!lead) return;

    const subscriber = await EmailSubscriber.findOne({
      firmId: lead.firmId,
      leadId: lead._id
    });

    if (!subscriber) return;

    await this.handleTrigger(lead.firmId, 'stage_changed', {
      subscriberId: subscriber._id,
      leadId: lead._id,
      newStage: newStage
    });
  }

  static async handleTagAdded(leadId, tag) {
    const lead = await Lead.findById(leadId);
    if (!lead) return;

    const subscriber = await EmailSubscriber.findOne({
      firmId: lead.firmId,
      leadId: lead._id
    });

    if (!subscriber) return;

    await this.handleTrigger(lead.firmId, 'tag_added', {
      subscriberId: subscriber._id,
      leadId: lead._id,
      tag: tag
    });
  }

  /**
   * Check for inactive subscribers and trigger re-engagement campaigns
   */
  static async checkInactivityTriggers() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const inactiveSubscribers = await EmailSubscriber.find({
      status: 'subscribed',
      $or: [
        { 'engagement.lastOpenedAt': { $lt: thirtyDaysAgo } },
        { 'engagement.lastOpenedAt': { $exists: false } }
      ]
    });

    for (const subscriber of inactiveSubscribers) {
      await this.handleTrigger(subscriber.firmId, 'inactivity', {
        subscriberId: subscriber._id
      });
    }
  }

  // ==================== A/B TESTING ====================

  /**
   * Select variant for A/B test
   */
  static async selectVariant(campaign) {
    if (!campaign.abTest?.enabled || campaign.abTest.variants.length === 0) {
      return null;
    }

    // Random selection based on percentage
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of campaign.abTest.variants) {
      cumulative += variant.percentage;
      if (random <= cumulative) {
        return variant;
      }
    }

    return campaign.abTest.variants[0];
  }

  /**
   * Evaluate A/B test and select winner
   */
  static async evaluateABTest(campaignId) {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign || !campaign.abTest?.enabled) {
      throw new Error('No A/B test found');
    }

    const winner = campaign.abTest.variants.reduce((best, variant) => {
      const criteria = campaign.abTest.winnerCriteria;
      let variantScore = 0;
      let bestScore = 0;

      if (criteria === 'open_rate') {
        variantScore = variant.stats.sent > 0 ?
          (variant.stats.opened / variant.stats.sent) * 100 : 0;
        bestScore = best.stats.sent > 0 ?
          (best.stats.opened / best.stats.sent) * 100 : 0;
      } else if (criteria === 'click_rate') {
        variantScore = variant.stats.sent > 0 ?
          (variant.stats.clicked / variant.stats.sent) * 100 : 0;
        bestScore = best.stats.sent > 0 ?
          (best.stats.clicked / best.stats.sent) * 100 : 0;
      }

      return variantScore > bestScore ? variant : best;
    }, campaign.abTest.variants[0]);

    return winner;
  }

  /**
   * Select winner and apply to remaining sends
   */
  static async selectWinner(campaignId) {
    const campaign = await EmailCampaign.findById(campaignId);
    const winner = await this.evaluateABTest(campaignId);

    campaign.abTest.winnerSelected = true;
    campaign.abTest.winnerId = winner._id.toString();
    campaign.htmlContent = winner.htmlContent || campaign.htmlContent;
    campaign.subject = winner.subject || campaign.subject;

    await campaign.save();
    return winner;
  }

  // ==================== TRACKING ====================

  /**
   * Track email event
   */
  static async trackEvent(eventType, campaignId, subscriberId, metadata = {}) {
    try {
      const event = await EmailEvent.create({
        firmId: metadata.firmId,
        campaignId,
        subscriberId,
        email: metadata.email,
        eventType,
        trackingId: metadata.trackingId,
        messageId: metadata.messageId,
        metadata: {
          ...metadata,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          linkClicked: metadata.linkClicked,
          bounceType: metadata.bounceType,
          bounceReason: metadata.bounceReason,
          errorMessage: metadata.errorMessage
        },
        dripStep: metadata.dripStep,
        source: metadata.source || 'campaign',
        timestamp: new Date()
      });

      // Update campaign stats
      const campaign = await EmailCampaign.findById(campaignId);
      if (campaign) {
        campaign.updateStats(eventType);
        await campaign.save();
      }

      // Update subscriber engagement
      const subscriber = await EmailSubscriber.findById(subscriberId);
      if (subscriber) {
        if (eventType === 'opened') {
          await subscriber.recordOpen();
        } else if (eventType === 'clicked') {
          await subscriber.recordClick();
        } else if (eventType === 'bounced') {
          await subscriber.recordBounce(metadata.bounceType, metadata.bounceReason);
        } else if (eventType === 'unsubscribed') {
          await subscriber.unsubscribe(metadata.reason);
        }
      }

      return event;
    } catch (error) {
      console.error('Track event error:', error);
    }
  }

  static async handleOpen(trackingId) {
    const event = await EmailEvent.findOne({ trackingId, eventType: 'sent' });
    if (!event) return;

    await this.trackEvent('opened', event.campaignId, event.subscriberId, {
      trackingId,
      firmId: event.firmId
    });
  }

  static async handleClick(trackingId, link) {
    const event = await EmailEvent.findOne({ trackingId, eventType: 'sent' });
    if (!event) return;

    await this.trackEvent('clicked', event.campaignId, event.subscriberId, {
      trackingId,
      linkClicked: link,
      firmId: event.firmId
    });
  }

  static async handleBounce(email, bounceType, reason) {
    const subscriber = await EmailSubscriber.findOne({ email });
    if (!subscriber) return;

    await subscriber.recordBounce(bounceType, reason);
  }

  static async handleUnsubscribe(email, reason) {
    const subscriber = await EmailSubscriber.findOne({ email });
    if (!subscriber) return;

    await subscriber.unsubscribe(reason);
  }

  static async handleComplaint(email) {
    const subscriber = await EmailSubscriber.findOne({ email });
    if (!subscriber) return;

    subscriber.status = 'complained';
    await subscriber.save();
  }

  // ==================== ANALYTICS ====================

  /**
   * Get campaign analytics
   */
  static async getCampaignAnalytics(campaignId) {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const uniqueOpens = await EmailEvent.getUniqueEvents(campaignId, 'opened');
    const uniqueClicks = await EmailEvent.getUniqueEvents(campaignId, 'clicked');
    const linkPerformance = await EmailEvent.getLinkPerformance(campaignId);
    const deviceStats = await EmailEvent.getDeviceStats(campaignId);
    const timeStats = await EmailEvent.getTimeStats(campaignId);
    const engagementTimeline = await EmailEvent.getEngagementTimeline(campaignId);

    return {
      campaign: campaign.toObject(),
      uniqueOpens,
      uniqueClicks,
      linkPerformance,
      deviceStats,
      timeStats,
      engagementTimeline
    };
  }

  /**
   * Get overall analytics for firm
   */
  static async getOverallAnalytics(firmId, dateRange = {}) {
    const matchQuery = { firmId };

    if (dateRange.start) {
      matchQuery.createdAt = { $gte: new Date(dateRange.start) };
    }
    if (dateRange.end) {
      matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.end) };
    }

    const campaigns = await EmailCampaign.find(matchQuery);
    const totalStats = campaigns.reduce((acc, campaign) => {
      acc.sent += campaign.stats.sent;
      acc.delivered += campaign.stats.delivered;
      acc.opened += campaign.stats.opened;
      acc.clicked += campaign.stats.clicked;
      acc.bounced += campaign.stats.bounced;
      acc.unsubscribed += campaign.stats.unsubscribed;
      return acc;
    }, {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      unsubscribed: 0
    });

    const subscriberCount = await EmailSubscriber.countDocuments({ firmId, status: 'subscribed' });
    const avgEngagement = await EmailSubscriber.aggregate([
      { $match: { firmId } },
      { $group: { _id: null, avgScore: { $avg: '$engagement.engagementScore' } } }
    ]);

    return {
      totalCampaigns: campaigns.length,
      totalStats,
      subscriberCount,
      avgEngagementScore: avgEngagement[0]?.avgScore || 0,
      openRate: totalStats.sent > 0 ? (totalStats.opened / totalStats.sent * 100).toFixed(2) : 0,
      clickRate: totalStats.sent > 0 ? (totalStats.clicked / totalStats.sent * 100).toFixed(2) : 0
    };
  }

  static async getLinkPerformance(campaignId) {
    return await EmailEvent.getLinkPerformance(campaignId);
  }

  static async getDeviceStats(campaignId) {
    return await EmailEvent.getDeviceStats(campaignId);
  }

  static async getTimeStats(campaignId) {
    return await EmailEvent.getTimeStats(campaignId);
  }

  // ==================== SEGMENTS ====================

  /**
   * Create segment
   */
  static async createSegment(firmId, data, userId) {
    const segment = await EmailSegment.create({
      ...data,
      firmId,
      createdBy: userId,
      updatedBy: userId
    });

    // Calculate initial subscriber count
    await segment.calculateSubscribers();

    return segment;
  }

  /**
   * Calculate segment subscribers
   */
  static async calculateSegmentSubscribers(segmentId) {
    const segment = await EmailSegment.findById(segmentId);
    if (!segment) throw new Error('Segment not found');

    return await segment.calculateSubscribers();
  }

  /**
   * Evaluate conditions
   */
  static evaluateConditions(subscriber, conditions, logic) {
    // This is handled by the segment model's buildQuery method
    return true;
  }

  /**
   * Refresh all segments for a firm
   */
  static async refreshAllSegments(firmId) {
    return await EmailSegment.refreshAllSegments(firmId);
  }

  // ==================== SUBSCRIBERS ====================

  /**
   * Add subscriber
   */
  static async addSubscriber(firmId, data, userId) {
    const subscriber = await EmailSubscriber.create({
      ...data,
      firmId,
      createdBy: userId,
      updatedBy: userId
    });

    return subscriber;
  }

  /**
   * Update subscriber
   */
  static async updateSubscriber(subscriberId, data, userId) {
    const subscriber = await EmailSubscriber.findById(subscriberId);
    if (!subscriber) throw new Error('Subscriber not found');

    Object.assign(subscriber, data);
    subscriber.updatedBy = userId;
    await subscriber.save();

    return subscriber;
  }

  /**
   * Unsubscribe
   */
  static async unsubscribe(email, reason) {
    const subscriber = await EmailSubscriber.findOne({ email });
    if (!subscriber) throw new Error('Subscriber not found');

    await subscriber.unsubscribe(reason);
    return subscriber;
  }

  /**
   * Import subscribers
   */
  static async importSubscribers(firmId, subscribers, userId) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const data of subscribers) {
      try {
        const existing = await EmailSubscriber.findOne({
          firmId,
          email: data.email
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await EmailSubscriber.create({
          ...data,
          firmId,
          subscriptionSource: 'import',
          createdBy: userId
        });

        results.imported++;
      } catch (error) {
        results.errors.push({ email: data.email, error: error.message });
      }
    }

    return results;
  }

  /**
   * Export subscribers
   */
  static async exportSubscribers(firmId, filters = {}) {
    const query = { firmId };

    if (filters.status) query.status = filters.status;
    if (filters.tags) query.tags = { $in: filters.tags };

    const subscribers = await EmailSubscriber.find(query).lean();

    return subscribers.map(s => ({
      email: s.email,
      firstName: s.firstName,
      lastName: s.lastName,
      status: s.status,
      tags: s.tags,
      engagementScore: s.engagement?.engagementScore,
      subscribedAt: s.subscribedAt
    }));
  }

  /**
   * Clean bounced emails
   */
  static async cleanBouncedEmails(firmId) {
    const result = await EmailSubscriber.updateMany(
      {
        firmId,
        status: 'bounced',
        'bounceDetails.type': 'hard'
      },
      {
        $set: { status: 'unsubscribed', unsubscribeReason: 'Hard bounce' }
      }
    );

    return { cleaned: result.modifiedCount };
  }

  // ==================== TEMPLATES ====================

  /**
   * Create template
   */
  static async createTemplate(firmId, data, userId) {
    const template = await EmailTemplate.create({
      ...data,
      firmId,
      createdBy: userId,
      updatedBy: userId
    });

    return template;
  }

  /**
   * Get public templates
   */
  static async getPublicTemplates() {
    return await EmailTemplate.find({ isPublic: true, isActive: true });
  }

  /**
   * Preview template
   */
  static async previewTemplate(templateId, sampleData = {}) {
    const template = await EmailTemplate.findById(templateId);
    if (!template) throw new Error('Template not found');

    return await this.renderTemplate(template, sampleData);
  }

  // ==================== WEBHOOKS ====================

  /**
   * Handle Resend webhook
   */
  static async handleResendWebhook(eventType, payload) {
    try {
      switch (eventType) {
        case 'email.delivered':
          await this.trackEvent('delivered', payload.campaignId, payload.subscriberId, {
            messageId: payload.messageId
          });
          break;

        case 'email.opened':
          await this.handleOpen(payload.trackingId);
          break;

        case 'email.clicked':
          await this.handleClick(payload.trackingId, payload.link);
          break;

        case 'email.bounced':
          await this.handleBounce(payload.email, payload.bounceType, payload.reason);
          break;

        case 'email.complained':
          await this.handleComplaint(payload.email);
          break;

        default:
          console.log('Unknown webhook event:', eventType);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook handling error:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate recipient count for campaign
   */
  static async _calculateRecipientCount(campaign) {
    let count = 0;

    switch (campaign.audienceType) {
      case 'all_leads':
        count = await Lead.countDocuments({
          firmId: campaign.firmId,
          email: { $exists: true, $ne: null }
        });
        break;

      case 'clients':
        count = await Client.countDocuments({
          firmId: campaign.firmId,
          email: { $exists: true, $ne: null }
        });
        break;

      case 'segment':
        if (campaign.segmentId) {
          const segment = await EmailSegment.findById(campaign.segmentId);
          count = segment?.subscriberCount || 0;
        }
        break;

      case 'custom':
        count = campaign.customRecipients?.length || 0;
        break;
    }

    // Subtract excluded
    if (campaign.excludeList?.length) {
      count = Math.max(0, count - campaign.excludeList.length);
    }

    campaign.totalRecipients = count;
    await campaign.save();

    return count;
  }

  /**
   * Get campaign recipients
   */
  static async _getCampaignRecipients(campaign) {
    let subscribers = [];

    switch (campaign.audienceType) {
      case 'all_leads':
        const leads = await Lead.find({
          firmId: campaign.firmId,
          email: { $exists: true, $ne: null }
        }).select('email firstName lastName companyName');

        subscribers = leads.map(l => ({
          email: l.email,
          firstName: l.firstName,
          lastName: l.lastName,
          companyName: l.companyName,
          displayName: l.displayName
        }));
        break;

      case 'clients':
        const clients = await Client.find({
          firmId: campaign.firmId,
          email: { $exists: true, $ne: null }
        }).select('email firstName lastName companyName');

        subscribers = clients.map(c => ({
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          companyName: c.companyName
        }));
        break;

      case 'segment':
        if (campaign.segmentId) {
          const segment = await EmailSegment.findById(campaign.segmentId);
          subscribers = await segment.getSubscribers();
        }
        break;

      case 'custom':
        subscribers = await EmailSubscriber.find({
          _id: { $in: campaign.customRecipients },
          status: 'subscribed'
        });
        break;
    }

    // Exclude
    if (campaign.excludeList?.length) {
      const excludeIds = campaign.excludeList.map(id => id.toString());
      subscribers = subscribers.filter(s => !excludeIds.includes(s._id?.toString()));
    }

    return subscribers;
  }

  /**
   * Generate tracking ID
   */
  static _generateTrackingId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Add tracking pixel and unsubscribe link
   */
  static _addTracking(html, trackingId, subscriber, campaign) {
    const baseUrl = process.env.API_URL || 'http://localhost:5000';

    // Add tracking pixel
    const trackingPixel = `<img src="${baseUrl}/api/webhooks/email/track/open/${trackingId}" width="1" height="1" style="display:none;" />`;

    // Add unsubscribe link
    const unsubscribeLink = `${baseUrl}/api/webhooks/email/unsubscribe/${subscriber.email}`;
    const unsubscribeHtml = `
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
        <p>إذا كنت ترغب في إلغاء الاشتراك، <a href="${unsubscribeLink}" style="color: #999;">اضغط هنا</a></p>
      </div>
    `;

    // Insert before closing body tag
    html = html.replace('</body>', `${trackingPixel}${unsubscribeHtml}</body>`);

    return html;
  }

  /**
   * Evaluate trigger conditions
   */
  static _evaluateTriggerConditions(conditions, data) {
    if (!conditions) return true;

    // Simple evaluation - can be extended
    return true;
  }
}

module.exports = EmailMarketingService;
