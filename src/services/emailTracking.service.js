/**
 * Email Tracking Service
 * Security: All methods enforce multi-tenant isolation via firmId parameter
 *
 * Handles email open and click tracking with analytics
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');

class EmailTrackingService {
    constructor() {
        this.baseUrl = process.env.API_URL || 'https://api.traf3li.com';
    }

    /**
     * Generate a unique tracking ID for an email
     * @param {ObjectId} emailId - The email record ID
     * @param {ObjectId} recipientId - The recipient ID
     * @param {string} entityType - Type of recipient (lead/contact/client)
     */
    generateTrackingId(emailId, recipientId, entityType) {
        const data = `${emailId}-${recipientId}-${entityType}-${Date.now()}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
    }

    /**
     * Generate tracking pixel HTML
     * @param {string} trackingId - Unique tracking ID
     */
    generateTrackingPixel(trackingId) {
        const pixelUrl = `${this.baseUrl}/api/track/open/${trackingId}`;
        return `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
    }

    /**
     * Wrap links in email for click tracking
     * @param {string} htmlContent - Original HTML content
     * @param {string} trackingId - Base tracking ID
     * @param {ObjectId} firmId - Firm ID for isolation
     */
    wrapLinksForTracking(htmlContent, trackingId, firmId) {
        if (!htmlContent || typeof htmlContent !== 'string') {
            logger.warn('Invalid HTML content provided for link tracking');
            return htmlContent;
        }

        // Regex to find all links
        const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"([^>]*)>/gi;

        let linkIndex = 0;
        return htmlContent.replace(linkRegex, (match, url, rest) => {
            // Skip internal tracking links and mailto/tel links
            if (url.includes('/api/track/') || url.startsWith('mailto:') || url.startsWith('tel:')) {
                return match;
            }

            linkIndex++;
            const linkId = `${trackingId}-link-${linkIndex}`;

            // Encode URL safely
            const encodedUrl = Buffer.from(url).toString('base64');
            const trackingUrl = `${this.baseUrl}/api/track/click/${linkId}?url=${encodedUrl}&fid=${firmId}`;

            return `<a href="${trackingUrl}"${rest}>`;
        });
    }

    /**
     * Process email content with all tracking features
     * @param {string} htmlContent - Original HTML content
     * @param {Object} options - Tracking options
     * @param {ObjectId} options.emailId - Email ID
     * @param {ObjectId} options.recipientId - Recipient ID
     * @param {string} options.entityType - Entity type (lead/contact/client)
     * @param {ObjectId} options.firmId - Firm ID (REQUIRED)
     */
    processEmailForTracking(htmlContent, options) {
        const { emailId, recipientId, entityType, firmId } = options;

        // Validate required parameters
        if (!emailId || !recipientId || !entityType || !firmId) {
            throw new Error('Missing required parameters: emailId, recipientId, entityType, and firmId are required');
        }

        // Validate entityType
        const validEntityTypes = ['lead', 'contact', 'client'];
        if (!validEntityTypes.includes(entityType)) {
            throw new Error(`Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}`);
        }

        const trackingId = this.generateTrackingId(emailId, recipientId, entityType);

        // Add click tracking to links
        let processedContent = this.wrapLinksForTracking(htmlContent, trackingId, firmId);

        // Add tracking pixel before closing body tag
        const trackingPixel = this.generateTrackingPixel(trackingId);

        if (processedContent.includes('</body>')) {
            processedContent = processedContent.replace('</body>', `${trackingPixel}</body>`);
        } else {
            processedContent += trackingPixel;
        }

        return {
            content: processedContent,
            trackingId
        };
    }

    /**
     * Create a tracking record
     * @param {Object} data - Tracking data
     * @param {string} data.trackingId - Tracking ID
     * @param {ObjectId} data.emailId - Email ID
     * @param {ObjectId} data.entityId - Entity ID
     * @param {string} data.entityType - Entity type
     * @param {string} data.recipientEmail - Recipient email
     * @param {ObjectId} data.firmId - Firm ID (REQUIRED)
     * @param {ObjectId} data.createdBy - User ID who created it
     */
    async createTracking(data) {
        const EmailTracking = require('../models/emailTracking.model');

        const {
            trackingId,
            emailId,
            entityId,
            entityType,
            recipientEmail,
            firmId,
            createdBy,
            subject,
            campaignId,
            templateId
        } = data;

        // Validate required fields
        if (!firmId) throw new Error('firmId is required');
        if (!trackingId) throw new Error('trackingId is required');
        if (!emailId) throw new Error('emailId is required');
        if (!entityId) throw new Error('entityId is required');
        if (!entityType) throw new Error('entityType is required');
        if (!recipientEmail) throw new Error('recipientEmail is required');
        if (!createdBy) throw new Error('createdBy is required');

        try {
            const tracking = new EmailTracking({
                trackingId,
                emailId: new mongoose.Types.ObjectId(emailId),
                entityId: new mongoose.Types.ObjectId(entityId),
                entityType,
                recipientEmail,
                firmId: new mongoose.Types.ObjectId(firmId),
                createdBy: new mongoose.Types.ObjectId(createdBy),
                subject,
                campaignId: campaignId ? new mongoose.Types.ObjectId(campaignId) : undefined,
                templateId: templateId ? new mongoose.Types.ObjectId(templateId) : undefined,
                sentAt: new Date()
            });

            await tracking.save();
            return tracking;
        } catch (error) {
            logger.error('Error creating email tracking record:', error);
            throw error;
        }
    }

    /**
     * Record an email open event
     * @param {string} trackingId - The tracking ID
     * @param {Object} metadata - Additional metadata (IP, user-agent, etc.)
     */
    async recordOpen(trackingId, metadata = {}) {
        const EmailTracking = require('../models/emailTracking.model');

        try {
            // Find tracking record
            const tracking = await EmailTracking.findOne({ trackingId });

            if (!tracking) {
                logger.warn(`Tracking ID not found: ${trackingId}`);
                return null;
            }

            // Record the open
            const openEvent = {
                timestamp: new Date(),
                ip: metadata.ip,
                userAgent: metadata.userAgent,
                device: this.parseDevice(metadata.userAgent),
                location: metadata.location
            };

            tracking.opens.push(openEvent);
            tracking.openCount = tracking.opens.length;
            tracking.firstOpenedAt = tracking.firstOpenedAt || new Date();
            tracking.lastOpenedAt = new Date();

            // Calculate engagement score
            tracking.calculateEngagementScore();

            await tracking.save();

            // Update entity's email engagement metrics
            await this.updateEntityEngagement(
                tracking.entityType,
                tracking.entityId,
                tracking.firmId,
                'open'
            );

            logger.info('Email open recorded', {
                trackingId,
                entityType: tracking.entityType,
                entityId: tracking.entityId,
                firmId: tracking.firmId
            });

            return tracking;
        } catch (error) {
            logger.error('Error recording email open:', error);
            throw error;
        }
    }

    /**
     * Record a link click event
     * @param {string} linkId - The link tracking ID
     * @param {string} originalUrl - The original URL clicked
     * @param {Object} metadata - Additional metadata
     */
    async recordClick(linkId, originalUrl, metadata = {}) {
        const EmailTracking = require('../models/emailTracking.model');

        try {
            // Extract base tracking ID from link ID
            const trackingId = linkId.split('-link-')[0];

            const tracking = await EmailTracking.findOne({ trackingId });

            if (!tracking) {
                logger.warn(`Tracking ID not found for click: ${trackingId}`);
                return originalUrl; // Return original URL anyway
            }

            // Record the click
            const clickEvent = {
                timestamp: new Date(),
                url: originalUrl,
                linkId,
                ip: metadata.ip,
                userAgent: metadata.userAgent,
                device: this.parseDevice(metadata.userAgent)
            };

            tracking.clicks.push(clickEvent);
            tracking.clickCount = tracking.clicks.length;
            tracking.firstClickedAt = tracking.firstClickedAt || new Date();
            tracking.lastClickedAt = new Date();

            // Calculate engagement score
            tracking.calculateEngagementScore();

            await tracking.save();

            // Update entity engagement
            await this.updateEntityEngagement(
                tracking.entityType,
                tracking.entityId,
                tracking.firmId,
                'click'
            );

            logger.info('Email click recorded', {
                trackingId,
                linkId,
                url: originalUrl,
                entityType: tracking.entityType,
                entityId: tracking.entityId,
                firmId: tracking.firmId
            });

            return originalUrl;
        } catch (error) {
            logger.error('Error recording click:', error);
            return originalUrl; // Return URL even on error
        }
    }

    /**
     * Parse device type from user agent
     * @param {string} userAgent - User agent string
     */
    parseDevice(userAgent) {
        if (!userAgent) return 'unknown';

        const ua = userAgent.toLowerCase();

        if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
            return 'mobile';
        }
        if (ua.includes('tablet') || ua.includes('ipad')) {
            return 'tablet';
        }
        return 'desktop';
    }

    /**
     * Update entity's email engagement metrics
     * Security: Uses findOneAndUpdate with firmId for multi-tenant isolation
     *
     * @param {string} entityType - Type of entity
     * @param {ObjectId} entityId - Entity ID
     * @param {ObjectId} firmId - Firm ID (REQUIRED)
     * @param {string} eventType - Type of event (open/click)
     */
    async updateEntityEngagement(entityType, entityId, firmId, eventType) {
        if (!firmId) {
            logger.error('firmId is required for updateEntityEngagement');
            return;
        }

        try {
            // Capitalize first letter for model name
            const modelName = entityType.charAt(0).toUpperCase() + entityType.slice(1);

            // Check if model exists
            let Model;
            try {
                Model = mongoose.model(modelName);
            } catch (error) {
                logger.warn(`Model ${modelName} not found, skipping engagement update`);
                return;
            }

            const updateFields = {
                lastActivityAt: new Date()
            };

            // Increment email count on open (first interaction)
            if (eventType === 'open') {
                updateFields.emailEngagementCount = 1;
            }

            // SECURITY: Use findOneAndUpdate with firmId for multi-tenant isolation
            const updated = await Model.findOneAndUpdate(
                {
                    _id: new mongoose.Types.ObjectId(entityId),
                    firmId: new mongoose.Types.ObjectId(firmId)
                },
                {
                    $set: updateFields,
                    $inc: eventType === 'open' ? { emailCount: 1 } : {}
                },
                { new: true }
            );

            if (!updated) {
                logger.warn(`${modelName} not found or access denied`, {
                    entityId,
                    firmId,
                    eventType
                });
            } else {
                logger.debug(`${modelName} engagement updated`, {
                    entityId,
                    firmId,
                    eventType
                });
            }
        } catch (error) {
            logger.error(`Error updating ${entityType} engagement:`, {
                error: error.message,
                entityType,
                entityId,
                firmId,
                eventType
            });
        }
    }

    /**
     * Get tracking statistics for an email
     * @param {string} trackingId - Tracking ID
     * @param {ObjectId} firmId - Firm ID for isolation (REQUIRED)
     */
    async getTrackingStats(trackingId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const EmailTracking = require('../models/emailTracking.model');

        // SECURITY: Include firmId in query for multi-tenant isolation
        const tracking = await EmailTracking.findOne({
            trackingId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!tracking) return null;

        return {
            trackingId,
            opens: tracking.openCount,
            uniqueOpens: new Set(tracking.opens.map(o => o.ip).filter(Boolean)).size,
            clicks: tracking.clickCount,
            uniqueClicks: new Set(tracking.clicks.map(c => c.ip).filter(Boolean)).size,
            firstOpenedAt: tracking.firstOpenedAt,
            lastOpenedAt: tracking.lastOpenedAt,
            firstClickedAt: tracking.firstClickedAt,
            lastClickedAt: tracking.lastClickedAt,
            engagementScore: tracking.engagementScore,
            deviceBreakdown: this.getDeviceBreakdown(tracking.opens),
            topLinks: this.getTopLinks(tracking.clicks)
        };
    }

    /**
     * Get tracking record by tracking ID
     * @param {string} trackingId - Tracking ID
     * @param {ObjectId} firmId - Firm ID for isolation (REQUIRED)
     */
    async getTrackingByTrackingId(trackingId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const EmailTracking = require('../models/emailTracking.model');

        return await EmailTracking.findOne({
            trackingId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });
    }

    /**
     * Get all tracking records for an entity
     * @param {string} entityType - Entity type
     * @param {ObjectId} entityId - Entity ID
     * @param {ObjectId} firmId - Firm ID for isolation (REQUIRED)
     */
    async getEntityTracking(entityType, entityId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const EmailTracking = require('../models/emailTracking.model');

        return await EmailTracking.find({
            entityType,
            entityId: new mongoose.Types.ObjectId(entityId),
            firmId: new mongoose.Types.ObjectId(firmId)
        }).sort({ sentAt: -1 });
    }

    /**
     * Get campaign tracking records
     * @param {ObjectId} campaignId - Campaign ID
     * @param {ObjectId} firmId - Firm ID for isolation (REQUIRED)
     */
    async getCampaignTracking(campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const EmailTracking = require('../models/emailTracking.model');

        return await EmailTracking.find({
            campaignId: new mongoose.Types.ObjectId(campaignId),
            firmId: new mongoose.Types.ObjectId(firmId)
        }).sort({ sentAt: -1 });
    }

    /**
     * Get device breakdown from opens
     */
    getDeviceBreakdown(opens) {
        const devices = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 };

        if (!opens || !Array.isArray(opens)) {
            return devices;
        }

        opens.forEach(o => {
            const device = o.device || 'unknown';
            if (devices.hasOwnProperty(device)) {
                devices[device]++;
            } else {
                devices.unknown++;
            }
        });

        return devices;
    }

    /**
     * Get top clicked links
     */
    getTopLinks(clicks) {
        if (!clicks || !Array.isArray(clicks)) {
            return [];
        }

        const linkCounts = {};
        clicks.forEach(c => {
            if (c.url) {
                linkCounts[c.url] = (linkCounts[c.url] || 0) + 1;
            }
        });

        return Object.entries(linkCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([url, count]) => ({ url, clicks: count }));
    }
}

module.exports = new EmailTrackingService();
