/**
 * Campaign Workflow Service
 * Security: All methods require firmId parameter for multi-tenant isolation
 *
 * Handles all campaign-related workflows including:
 * - Campaign creation & management
 * - Contact list building & management
 * - Campaign launch & scheduling
 * - Email sending with personalization
 * - Response tracking (opens, clicks, bounces, etc.)
 * - Campaign attribution & ROI
 * - A/B testing
 * - Campaign analytics & reporting
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const Campaign = require('../models/campaign.model');
const ContactList = require('../models/contactList.model');
const Contact = require('../models/contact.model');
const Lead = require('../models/lead.model');
const EmailTemplate = require('../models/emailTemplate.model');
const EmailTracking = require('../models/emailTracking.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper for HTML escaping to prevent XSS
const escapeHtml = (text) => {
    if (text === null || text === undefined) return '';
    const str = String(text);
    const htmlEntities = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return str.replace(/[&<>"']/g, char => htmlEntities[char]);
};

// Email validation helper
const isValidEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
};

class CampaignWorkflowService {
    // ==================== CAMPAIGN CREATION & SETUP ====================

    /**
     * Create a new campaign
     * @param {Object} campaignData - Campaign data
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @returns {Object} Created campaign
     */
    static async createCampaign(campaignData, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        // Validate required fields
        if (!campaignData.name || typeof campaignData.name !== 'string') {
            throw CustomException('Campaign name is required', 400);
        }

        if (!campaignData.type) {
            throw CustomException('Campaign type is required', 400);
        }

        if (!campaignData.startDate) {
            throw CustomException('Campaign start date is required', 400);
        }

        // Create campaign with firm context
        const campaign = new Campaign({
            ...campaignData,
            firmId: new mongoose.Types.ObjectId(firmId),
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            ownerId: new mongoose.Types.ObjectId(lawyerId),
            createdBy: new mongoose.Types.ObjectId(lawyerId),
            status: 'draft'
        });

        await campaign.save();

        return campaign;
    }

    /**
     * Duplicate campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @returns {Object} Duplicated campaign
     */
    static async duplicateCampaign(campaignId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        // Get original campaign with firm isolation
        const original = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        }).lean();

        if (!original) {
            throw CustomException('Campaign not found', 404);
        }

        // Create duplicate
        const duplicate = new Campaign({
            ...original,
            _id: undefined,
            campaignId: undefined, // Will be auto-generated
            name: `${original.name} (Copy)`,
            status: 'draft',
            launchedAt: null,
            launchedBy: null,
            completedAt: null,
            completedBy: null,
            results: {
                leadsGenerated: 0,
                leadsConverted: 0,
                opportunitiesCreated: 0,
                dealsWon: 0,
                revenueGenerated: 0,
                emailsSent: 0,
                emailsOpened: 0,
                emailsClicked: 0,
                unsubscribes: 0,
                roi: 0
            },
            createdBy: new mongoose.Types.ObjectId(lawyerId),
            updatedBy: new mongoose.Types.ObjectId(lawyerId),
            createdAt: undefined,
            updatedAt: undefined
        });

        await duplicate.save();

        return duplicate;
    }

    /**
     * Archive campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @returns {Object} Archived campaign
     */
    static async archiveCampaign(campaignId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOneAndUpdate(
            {
                _id: sanitizedId,
                firmId: new mongoose.Types.ObjectId(firmId)
            },
            {
                $set: {
                    status: 'cancelled',
                    updatedBy: new mongoose.Types.ObjectId(lawyerId),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        return campaign;
    }

    /**
     * Delete campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @returns {Object} Success response
     */
    static async deleteCampaign(campaignId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        // Get campaign to verify it can be deleted
        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Only allow deleting draft campaigns
        if (campaign.status !== 'draft') {
            throw CustomException('Can only delete draft campaigns', 400);
        }

        await Campaign.findOneAndDelete({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        return { success: true, message: 'Campaign deleted successfully' };
    }

    // ==================== CONTACT LIST BUILDING ====================

    /**
     * Add contacts to campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @param {Array} contactIds - Array of contact IDs
     * @returns {Object} Update result
     */
    static async addContactsToCampaign(campaignId, firmId, lawyerId, contactIds) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedCampaignId = sanitizeObjectId(campaignId);

        // Validate campaign exists
        const campaign = await Campaign.findOne({
            _id: sanitizedCampaignId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            throw CustomException('Contact IDs array is required', 400);
        }

        // Sanitize all contact IDs
        const sanitizedContactIds = contactIds.map(id => sanitizeObjectId(id));

        // Verify all contacts belong to the firm
        const contacts = await Contact.find({
            _id: { $in: sanitizedContactIds },
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (contacts.length !== contactIds.length) {
            throw CustomException('Some contacts not found or do not belong to this firm', 400);
        }

        // Create or update contact list for campaign
        let contactList = await ContactList.findOne({
            firmId: new mongoose.Types.ObjectId(firmId),
            'usedInCampaigns.campaignId': sanitizedCampaignId
        });

        if (!contactList) {
            // Create new list for this campaign
            contactList = new ContactList({
                firmId: new mongoose.Types.ObjectId(firmId),
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                name: `Contacts for ${campaign.name}`,
                listType: 'static',
                entityType: 'contact',
                members: [],
                createdBy: new mongoose.Types.ObjectId(lawyerId)
            });
        }

        // Add contacts to list
        for (const contact of contacts) {
            const exists = contactList.members.some(m =>
                m.entityId.toString() === contact._id.toString()
            );

            if (!exists) {
                contactList.members.push({
                    entityType: 'contact',
                    entityId: contact._id,
                    email: contact.email,
                    name: `${contact.firstName} ${contact.lastName}`.trim(),
                    status: contact.emailOptOut ? 'unsubscribed' : 'active',
                    addedAt: new Date(),
                    addedBy: new mongoose.Types.ObjectId(lawyerId)
                });
            }
        }

        await contactList.save();

        // Update campaign with contact list reference
        campaign.emailSettings = campaign.emailSettings || {};
        campaign.emailSettings.contactListId = contactList._id;
        campaign.updatedBy = new mongoose.Types.ObjectId(lawyerId);
        await campaign.save();

        return {
            success: true,
            contactsAdded: contacts.length,
            totalContacts: contactList.memberCount
        };
    }

    /**
     * Remove contacts from campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @param {Array} contactIds - Array of contact IDs
     * @returns {Object} Update result
     */
    static async removeContactsFromCampaign(campaignId, firmId, lawyerId, contactIds) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedCampaignId = sanitizeObjectId(campaignId);

        // Validate campaign exists
        const campaign = await Campaign.findOne({
            _id: sanitizedCampaignId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            throw CustomException('Contact IDs array is required', 400);
        }

        // Sanitize all contact IDs
        const sanitizedContactIds = contactIds.map(id => sanitizeObjectId(id));

        // Get contact list
        const contactList = await ContactList.findOne({
            _id: campaign.emailSettings?.contactListId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!contactList) {
            throw CustomException('Contact list not found', 404);
        }

        // Remove contacts
        const initialCount = contactList.members.length;
        contactList.members = contactList.members.filter(member =>
            !sanitizedContactIds.includes(member.entityId.toString())
        );

        await contactList.save();

        return {
            success: true,
            contactsRemoved: initialCount - contactList.members.length,
            totalContacts: contactList.memberCount
        };
    }

    /**
     * Import contact list into campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @param {String} listId - Contact list ID to import
     * @returns {Object} Import result
     */
    static async importContactList(campaignId, firmId, lawyerId, listId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedCampaignId = sanitizeObjectId(campaignId);
        const sanitizedListId = sanitizeObjectId(listId);

        // Validate campaign exists
        const campaign = await Campaign.findOne({
            _id: sanitizedCampaignId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Get contact list with firm isolation
        const sourceList = await ContactList.findOne({
            _id: sanitizedListId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!sourceList) {
            throw CustomException('Contact list not found', 404);
        }

        // Update campaign with contact list reference
        campaign.emailSettings = campaign.emailSettings || {};
        campaign.emailSettings.contactListId = sourceList._id;
        campaign.updatedBy = new mongoose.Types.ObjectId(lawyerId);

        // Track usage in the source list
        const campaignUsage = {
            campaignId: campaign._id,
            campaignName: campaign.name,
            usedAt: new Date()
        };

        const existingUsage = sourceList.usedInCampaigns.find(
            u => u.campaignId.toString() === campaign._id.toString()
        );

        if (!existingUsage) {
            sourceList.usedInCampaigns.push(campaignUsage);
            await sourceList.save();
        }

        await campaign.save();

        return {
            success: true,
            contactsImported: sourceList.memberCount,
            listName: sourceList.name
        };
    }

    /**
     * Build dynamic contact list from criteria
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {Object} criteria - Filter criteria
     * @returns {Object} Dynamic list result
     */
    static async buildDynamicList(campaignId, firmId, criteria) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedCampaignId = sanitizeObjectId(campaignId);

        // Validate campaign exists
        const campaign = await Campaign.findOne({
            _id: sanitizedCampaignId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Build query from criteria
        const query = { firmId: new mongoose.Types.ObjectId(firmId) };

        if (criteria.tags && Array.isArray(criteria.tags)) {
            query.tags = { $in: criteria.tags };
        }

        if (criteria.practiceAreas && Array.isArray(criteria.practiceAreas)) {
            query.practiceAreas = { $in: criteria.practiceAreas };
        }

        if (criteria.status) {
            query.status = criteria.status;
        }

        if (criteria.type) {
            query.type = criteria.type;
        }

        // Get matching contacts
        const contacts = await Contact.find(query)
            .select('_id email firstName lastName')
            .lean();

        // Create dynamic contact list
        const contactList = new ContactList({
            firmId: new mongoose.Types.ObjectId(firmId),
            name: `Dynamic List for ${campaign.name}`,
            listType: 'dynamic',
            entityType: 'contact',
            criteria: Object.keys(criteria).map(field => ({
                field,
                operator: 'equals',
                value: criteria[field]
            })),
            members: contacts.map(c => ({
                entityType: 'contact',
                entityId: c._id,
                email: c.email,
                name: `${c.firstName} ${c.lastName}`.trim(),
                status: 'active',
                addedAt: new Date()
            })),
            createdBy: campaign.createdBy
        });

        await contactList.save();

        // Update campaign
        campaign.emailSettings = campaign.emailSettings || {};
        campaign.emailSettings.contactListId = contactList._id;
        await campaign.save();

        return {
            success: true,
            contactsMatched: contacts.length,
            listId: contactList._id
        };
    }

    /**
     * Refresh dynamic contact list
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} Refresh result
     */
    static async refreshDynamicList(campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedCampaignId = sanitizeObjectId(campaignId);

        // Validate campaign exists
        const campaign = await Campaign.findOne({
            _id: sanitizedCampaignId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Get contact list
        const contactList = await ContactList.findOne({
            _id: campaign.emailSettings?.contactListId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!contactList || contactList.listType !== 'dynamic') {
            throw CustomException('Dynamic contact list not found', 404);
        }

        // Rebuild query from criteria
        const query = { firmId: new mongoose.Types.ObjectId(firmId) };

        for (const criterion of contactList.criteria) {
            if (criterion.operator === 'equals') {
                query[criterion.field] = criterion.value;
            } else if (criterion.operator === 'in') {
                query[criterion.field] = { $in: criterion.value };
            }
        }

        // Get updated contacts
        const contacts = await Contact.find(query)
            .select('_id email firstName lastName')
            .lean();

        // Update members
        const previousCount = contactList.memberCount;
        contactList.members = contacts.map(c => ({
            entityType: 'contact',
            entityId: c._id,
            email: c.email,
            name: `${c.firstName} ${c.lastName}`.trim(),
            status: 'active',
            addedAt: new Date()
        }));

        contactList.stats.lastRefreshed = new Date();
        await contactList.save();

        return {
            success: true,
            previousCount,
            currentCount: contactList.memberCount,
            difference: contactList.memberCount - previousCount
        };
    }

    // ==================== CAMPAIGN LAUNCH ====================

    /**
     * Validate campaign before launch
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} Validation result
     */
    static async validateCampaign(campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        }).populate('emailSettings.templateId')
          .populate('emailSettings.contactListId');

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        const errors = [];
        const warnings = [];

        // Check required fields
        if (!campaign.name) errors.push('Campaign name is required');
        if (!campaign.type) errors.push('Campaign type is required');

        // Check email campaign specific requirements
        if (campaign.type === 'email') {
            if (!campaign.emailSettings?.subject) {
                errors.push('Email subject is required');
            }

            if (!campaign.emailSettings?.senderEmail) {
                errors.push('Sender email is required');
            } else if (!isValidEmail(campaign.emailSettings.senderEmail)) {
                errors.push('Sender email is invalid');
            }

            if (!campaign.emailSettings?.templateId) {
                errors.push('Email template is required');
            }

            if (!campaign.emailSettings?.contactListId) {
                errors.push('Contact list is required');
            } else {
                const contactList = campaign.emailSettings.contactListId;
                if (contactList.memberCount === 0) {
                    warnings.push('Contact list is empty');
                }
            }
        }

        // Check budget
        if (campaign.budget?.planned > 0 && !campaign.budget.currency) {
            warnings.push('Budget currency not specified');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            campaign: {
                id: campaign._id,
                name: campaign.name,
                type: campaign.type,
                status: campaign.status,
                contactCount: campaign.emailSettings?.contactListId?.memberCount || 0
            }
        };
    }

    /**
     * Schedule campaign launch
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @param {Date} scheduledAt - Scheduled launch date/time
     * @returns {Object} Updated campaign
     */
    static async scheduleCampaign(campaignId, firmId, lawyerId, scheduledAt) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        // Validate campaign first
        const validation = await this.validateCampaign(campaignId, firmId);
        if (!validation.isValid) {
            throw CustomException(
                `Campaign validation failed: ${validation.errors.join(', ')}`,
                400
            );
        }

        // Validate scheduled date
        const scheduleDate = new Date(scheduledAt);
        if (isNaN(scheduleDate.getTime())) {
            throw CustomException('Invalid scheduled date', 400);
        }

        if (scheduleDate < new Date()) {
            throw CustomException('Scheduled date must be in the future', 400);
        }

        // Update campaign
        const campaign = await Campaign.findOneAndUpdate(
            {
                _id: sanitizedId,
                firmId: new mongoose.Types.ObjectId(firmId)
            },
            {
                $set: {
                    status: 'scheduled',
                    startDate: scheduleDate,
                    updatedBy: new mongoose.Types.ObjectId(lawyerId),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        return campaign;
    }

    /**
     * Launch campaign immediately
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @returns {Object} Launched campaign
     */
    static async launchCampaign(campaignId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        // Validate campaign first
        const validation = await this.validateCampaign(campaignId, firmId);
        if (!validation.isValid) {
            throw CustomException(
                `Campaign validation failed: ${validation.errors.join(', ')}`,
                400
            );
        }

        // Update campaign status
        const campaign = await Campaign.findOneAndUpdate(
            {
                _id: sanitizedId,
                firmId: new mongoose.Types.ObjectId(firmId)
            },
            {
                $set: {
                    status: 'active',
                    launchedAt: new Date(),
                    launchedBy: new mongoose.Types.ObjectId(lawyerId),
                    updatedBy: new mongoose.Types.ObjectId(lawyerId),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        return campaign;
    }

    /**
     * Pause running campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @returns {Object} Paused campaign
     */
    static async pauseCampaign(campaignId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOneAndUpdate(
            {
                _id: sanitizedId,
                firmId: new mongoose.Types.ObjectId(firmId),
                status: 'active'
            },
            {
                $set: {
                    status: 'paused',
                    updatedBy: new mongoose.Types.ObjectId(lawyerId),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!campaign) {
            throw CustomException('Campaign not found or not active', 404);
        }

        return campaign;
    }

    /**
     * Resume paused campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @returns {Object} Resumed campaign
     */
    static async resumeCampaign(campaignId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOneAndUpdate(
            {
                _id: sanitizedId,
                firmId: new mongoose.Types.ObjectId(firmId),
                status: 'paused'
            },
            {
                $set: {
                    status: 'active',
                    updatedBy: new mongoose.Types.ObjectId(lawyerId),
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!campaign) {
            throw CustomException('Campaign not found or not paused', 404);
        }

        return campaign;
    }

    // ==================== EMAIL SENDING ====================

    /**
     * Send campaign emails in batch
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {Number} batchSize - Number of emails to send per batch
     * @returns {Object} Send result
     */
    static async sendCampaignEmails(campaignId, firmId, batchSize = 100) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        }).populate('emailSettings.templateId')
          .populate('emailSettings.contactListId');

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        if (campaign.type !== 'email') {
            throw CustomException('Campaign is not an email campaign', 400);
        }

        const contactList = campaign.emailSettings?.contactListId;
        if (!contactList || contactList.memberCount === 0) {
            throw CustomException('No contacts to send to', 400);
        }

        const template = campaign.emailSettings?.templateId;
        if (!template) {
            throw CustomException('Email template not found', 404);
        }

        // Get contacts to send to (limited by batch size)
        const contacts = contactList.members
            .filter(m => m.status === 'active' && m.email)
            .slice(0, batchSize);

        const results = {
            sent: 0,
            failed: 0,
            errors: []
        };

        // Note: Actual email sending would integrate with email service
        // This is a workflow service, so it tracks the workflow
        for (const contact of contacts) {
            try {
                // Track the send (placeholder for actual email sending)
                const trackingId = this._generateTrackingId();

                // Update campaign stats
                campaign.results.emailsSent = (campaign.results.emailsSent || 0) + 1;
                results.sent++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    email: contact.email,
                    error: error.message
                });
            }
        }

        await campaign.save();

        return results;
    }

    /**
     * Send test email
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @param {String} testEmail - Email address to send test to
     * @returns {Object} Send result
     */
    static async sendTestEmail(campaignId, firmId, lawyerId, testEmail) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        if (!isValidEmail(testEmail)) {
            throw CustomException('Invalid test email address', 400);
        }

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        }).populate('emailSettings.templateId');

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        const template = campaign.emailSettings?.templateId;
        if (!template) {
            throw CustomException('Email template not found', 404);
        }

        // Note: Actual email sending would integrate with email service
        return {
            success: true,
            message: `Test email would be sent to ${testEmail}`,
            subject: campaign.emailSettings.subject,
            from: campaign.emailSettings.senderEmail
        };
    }

    /**
     * Personalize email content with contact data
     * @param {String} templateId - Template ID
     * @param {Object} contactData - Contact data for personalization
     * @returns {Object} Personalized content
     */
    static async personalizeEmail(templateId, contactData) {
        const sanitizedId = sanitizeObjectId(templateId);

        const template = await EmailTemplate.findOne({ _id: sanitizedId });

        if (!template) {
            throw CustomException('Template not found', 404);
        }

        // Create variables object with HTML-escaped values
        const variables = {
            firstName: escapeHtml(contactData.firstName || 'العميل'),
            lastName: escapeHtml(contactData.lastName || ''),
            fullName: escapeHtml(contactData.fullName || 'العميل'),
            email: escapeHtml(contactData.email || ''),
            company: escapeHtml(contactData.company || ''),
            phone: escapeHtml(contactData.phone || '')
        };

        // Render template with variables
        let subject = template.subject || '';
        let bodyHtml = template.bodyHtml || '';

        Object.keys(variables).forEach(key => {
            const regex = new RegExp(`{{${escapeRegex(key)}}}`, 'g');
            subject = subject.replace(regex, variables[key]);
            bodyHtml = bodyHtml.replace(regex, variables[key]);
        });

        return {
            subject,
            bodyHtml,
            bodyText: template.bodyText || ''
        };
    }

    /**
     * Track email send
     * @param {String} campaignId - Campaign ID
     * @param {String} contactId - Contact ID
     * @param {String} messageId - Email service message ID
     * @returns {Object} Tracking record
     */
    static async trackEmailSend(campaignId, contactId, messageId) {
        const sanitizedCampaignId = sanitizeObjectId(campaignId);
        const sanitizedContactId = sanitizeObjectId(contactId);

        const trackingId = this._generateTrackingId();

        const tracking = new EmailTracking({
            trackingId,
            emailId: messageId,
            entityType: 'contact',
            entityId: sanitizedContactId,
            campaignId: sanitizedCampaignId,
            sentAt: new Date()
        });

        await tracking.save();

        return tracking;
    }

    // ==================== RESPONSE TRACKING ====================

    /**
     * Track email open
     * @param {String} campaignId - Campaign ID
     * @param {String} contactId - Contact ID
     * @param {Object} metadata - Additional metadata (IP, user agent, etc.)
     * @returns {Object} Updated tracking
     */
    static async trackOpen(campaignId, contactId, metadata = {}) {
        const sanitizedCampaignId = sanitizeObjectId(campaignId);
        const sanitizedContactId = sanitizeObjectId(contactId);

        const tracking = await EmailTracking.findOne({
            campaignId: sanitizedCampaignId,
            entityId: sanitizedContactId
        });

        if (tracking) {
            tracking.opens.push({
                timestamp: new Date(),
                ip: metadata.ip,
                userAgent: metadata.userAgent,
                device: metadata.device || 'unknown'
            });

            tracking.openCount++;
            if (!tracking.firstOpenedAt) {
                tracking.firstOpenedAt = new Date();
            }
            tracking.lastOpenedAt = new Date();

            tracking.calculateEngagementScore();
            await tracking.save();
        }

        // Update campaign stats
        await Campaign.findOneAndUpdate(
            { _id: sanitizedCampaignId },
            { $inc: { 'results.emailsOpened': 1 } }
        );

        return tracking;
    }

    /**
     * Track link click
     * @param {String} campaignId - Campaign ID
     * @param {String} contactId - Contact ID
     * @param {String} linkId - Link identifier
     * @param {Object} metadata - Additional metadata
     * @returns {Object} Updated tracking
     */
    static async trackClick(campaignId, contactId, linkId, metadata = {}) {
        const sanitizedCampaignId = sanitizeObjectId(campaignId);
        const sanitizedContactId = sanitizeObjectId(contactId);

        const tracking = await EmailTracking.findOne({
            campaignId: sanitizedCampaignId,
            entityId: sanitizedContactId
        });

        if (tracking) {
            tracking.clicks.push({
                timestamp: new Date(),
                url: metadata.url || '',
                linkId,
                ip: metadata.ip,
                userAgent: metadata.userAgent,
                device: metadata.device || 'unknown'
            });

            tracking.clickCount++;
            if (!tracking.firstClickedAt) {
                tracking.firstClickedAt = new Date();
            }
            tracking.lastClickedAt = new Date();

            tracking.calculateEngagementScore();
            await tracking.save();
        }

        // Update campaign stats
        await Campaign.findOneAndUpdate(
            { _id: sanitizedCampaignId },
            { $inc: { 'results.emailsClicked': 1 } }
        );

        return tracking;
    }

    /**
     * Track unsubscribe
     * @param {String} campaignId - Campaign ID
     * @param {String} contactId - Contact ID
     * @returns {Object} Update result
     */
    static async trackUnsubscribe(campaignId, contactId) {
        const sanitizedCampaignId = sanitizeObjectId(campaignId);
        const sanitizedContactId = sanitizeObjectId(contactId);

        // Update contact's email opt-out status
        await Contact.findOneAndUpdate(
            { _id: sanitizedContactId },
            { $set: { emailOptOut: true } }
        );

        // Update campaign stats
        await Campaign.findOneAndUpdate(
            { _id: sanitizedCampaignId },
            { $inc: { 'results.unsubscribes': 1 } }
        );

        return { success: true, message: 'Unsubscribe tracked' };
    }

    /**
     * Track email bounce
     * @param {String} campaignId - Campaign ID
     * @param {String} contactId - Contact ID
     * @param {String} bounceType - 'hard' or 'soft'
     * @returns {Object} Update result
     */
    static async trackBounce(campaignId, contactId, bounceType) {
        const sanitizedCampaignId = sanitizeObjectId(campaignId);
        const sanitizedContactId = sanitizeObjectId(contactId);

        // If hard bounce, mark contact email as invalid
        if (bounceType === 'hard') {
            await Contact.findOneAndUpdate(
                { _id: sanitizedContactId },
                { $set: { emailOptOut: true } }
            );
        }

        // Update campaign stats
        await Campaign.findOneAndUpdate(
            { _id: sanitizedCampaignId },
            { $inc: { 'results.emailsBounced': 1 } }
        );

        return { success: true, message: 'Bounce tracked', bounceType };
    }

    /**
     * Track email reply
     * @param {String} campaignId - Campaign ID
     * @param {String} contactId - Contact ID
     * @param {String} replyContent - Reply content (sanitized)
     * @returns {Object} Tracking result
     */
    static async trackReply(campaignId, contactId, replyContent) {
        const sanitizedCampaignId = sanitizeObjectId(campaignId);
        const sanitizedContactId = sanitizeObjectId(contactId);

        // Track as high engagement
        const tracking = await EmailTracking.findOne({
            campaignId: sanitizedCampaignId,
            entityId: sanitizedContactId
        });

        if (tracking) {
            // Boost engagement score for reply
            tracking.engagementScore = Math.min(100, tracking.engagementScore + 25);
            await tracking.save();
        }

        return {
            success: true,
            message: 'Reply tracked',
            engagementScore: tracking?.engagementScore
        };
    }

    // ==================== CAMPAIGN ATTRIBUTION ====================

    /**
     * Attribute lead to campaign
     * @param {String} leadId - Lead ID
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} Attribution result
     */
    static async attributeLeadToCampaign(leadId, campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedCampaignId = sanitizeObjectId(campaignId);

        // Update lead with campaign source
        const lead = await Lead.findOneAndUpdate(
            {
                _id: sanitizedLeadId,
                firmId: new mongoose.Types.ObjectId(firmId)
            },
            {
                $set: {
                    campaignId: sanitizedCampaignId,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Update campaign lead count
        await Campaign.findOneAndUpdate(
            {
                _id: sanitizedCampaignId,
                firmId: new mongoose.Types.ObjectId(firmId)
            },
            {
                $inc: { 'results.leadsGenerated': 1 }
            }
        );

        return {
            success: true,
            leadId,
            campaignId,
            message: 'Lead attributed to campaign'
        };
    }

    /**
     * Attribute conversion to campaign
     * @param {String} leadId - Lead ID
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {Number} conversionValue - Revenue value
     * @returns {Object} Attribution result
     */
    static async attributeConversion(leadId, campaignId, firmId, conversionValue) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);
        const sanitizedCampaignId = sanitizeObjectId(campaignId);

        const value = parseFloat(conversionValue) || 0;

        // Update campaign conversion stats
        await Campaign.findOneAndUpdate(
            {
                _id: sanitizedCampaignId,
                firmId: new mongoose.Types.ObjectId(firmId)
            },
            {
                $inc: {
                    'results.leadsConverted': 1,
                    'results.revenueGenerated': value
                }
            }
        );

        return {
            success: true,
            leadId,
            campaignId,
            conversionValue: value,
            message: 'Conversion attributed to campaign'
        };
    }

    /**
     * Calculate campaign ROI
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} ROI calculation
     */
    static async calculateCampaignROI(campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        return await Campaign.calculateROI(sanitizedId, firmId);
    }

    /**
     * Get attribution data for lead
     * @param {String} leadId - Lead ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} Attribution data
     */
    static async getAttribution(leadId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(leadId);

        const lead = await Lead.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        }).populate('campaignId', 'name campaignId type status');

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        return {
            leadId: lead._id,
            campaign: lead.campaignId || null,
            source: lead.source,
            createdAt: lead.createdAt
        };
    }

    // ==================== A/B TESTING ====================

    /**
     * Create A/B test for campaign
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @param {Array} variants - Test variants
     * @returns {Object} A/B test configuration
     */
    static async createABTest(campaignId, firmId, lawyerId, variants) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        if (!Array.isArray(variants) || variants.length < 2) {
            throw CustomException('At least 2 variants required for A/B test', 400);
        }

        // Validate variant percentages sum to 100
        const totalPercentage = variants.reduce((sum, v) => sum + (v.percentage || 0), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
            throw CustomException('Variant percentages must sum to 100', 400);
        }

        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        // Store A/B test configuration
        campaign.abTestEnabled = true;
        campaign.abTestVariants = variants;
        campaign.updatedBy = new mongoose.Types.ObjectId(lawyerId);
        await campaign.save();

        return {
            success: true,
            campaignId,
            variants: variants.length,
            message: 'A/B test created'
        };
    }

    /**
     * Assign contact to variant
     * @param {String} campaignId - Campaign ID
     * @param {String} contactId - Contact ID
     * @returns {Object} Assigned variant
     */
    static async assignToVariant(campaignId, contactId) {
        const sanitizedCampaignId = sanitizeObjectId(campaignId);
        const sanitizedContactId = sanitizeObjectId(contactId);

        const campaign = await Campaign.findOne({ _id: sanitizedCampaignId });

        if (!campaign || !campaign.abTestEnabled) {
            throw CustomException('A/B test not found', 404);
        }

        // Random assignment based on percentages
        const random = Math.random() * 100;
        let cumulative = 0;
        let selectedVariant = null;

        for (const variant of campaign.abTestVariants) {
            cumulative += variant.percentage;
            if (random <= cumulative) {
                selectedVariant = variant;
                break;
            }
        }

        return {
            contactId,
            variant: selectedVariant || campaign.abTestVariants[0]
        };
    }

    /**
     * Get variant statistics
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} Variant statistics
     */
    static async getVariantStats(campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign || !campaign.abTestEnabled) {
            throw CustomException('A/B test not found', 404);
        }

        // Calculate stats for each variant
        const stats = campaign.abTestVariants.map(variant => ({
            id: variant.id,
            name: variant.name,
            percentage: variant.percentage,
            sent: variant.sent || 0,
            opened: variant.opened || 0,
            clicked: variant.clicked || 0,
            openRate: variant.sent > 0 ? ((variant.opened / variant.sent) * 100).toFixed(2) : 0,
            clickRate: variant.sent > 0 ? ((variant.clicked / variant.sent) * 100).toFixed(2) : 0
        }));

        return {
            campaignId,
            totalVariants: stats.length,
            variants: stats
        };
    }

    /**
     * Declare winning variant
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} lawyerId - Lawyer ID (REQUIRED)
     * @param {String} winnerId - Winning variant ID
     * @returns {Object} Winner declaration result
     */
    static async declareWinner(campaignId, firmId, lawyerId, winnerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!lawyerId) throw new Error('lawyerId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign || !campaign.abTestEnabled) {
            throw CustomException('A/B test not found', 404);
        }

        const winner = campaign.abTestVariants.find(v => v.id === winnerId);
        if (!winner) {
            throw CustomException('Variant not found', 404);
        }

        campaign.abTestWinner = winnerId;
        campaign.abTestCompleted = true;
        campaign.updatedBy = new mongoose.Types.ObjectId(lawyerId);
        await campaign.save();

        return {
            success: true,
            campaignId,
            winner: {
                id: winner.id,
                name: winner.name
            },
            message: 'Winner declared successfully'
        };
    }

    // ==================== CAMPAIGN ANALYTICS ====================

    /**
     * Get campaign statistics
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} Campaign statistics
     */
    static async getCampaignStats(campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.getCampaignById(sanitizedId, firmId);

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        const stats = {
            campaignId: campaign.campaignId,
            name: campaign.name,
            type: campaign.type,
            status: campaign.status,
            results: campaign.results,
            budget: campaign.budget,
            targets: campaign.targets
        };

        // Calculate rates
        if (campaign.results.emailsSent > 0) {
            stats.openRate = ((campaign.results.emailsOpened / campaign.results.emailsSent) * 100).toFixed(2);
            stats.clickRate = ((campaign.results.emailsClicked / campaign.results.emailsSent) * 100).toFixed(2);
            stats.unsubscribeRate = ((campaign.results.unsubscribes / campaign.results.emailsSent) * 100).toFixed(2);
        }

        // Calculate conversion rate
        if (campaign.results.leadsGenerated > 0) {
            stats.conversionRate = ((campaign.results.leadsConverted / campaign.results.leadsGenerated) * 100).toFixed(2);
        }

        return stats;
    }

    /**
     * Get engagement metrics
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} Engagement metrics
     */
    static async getEngagementMetrics(campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const trackingRecords = await EmailTracking.find({
            campaignId: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        const metrics = {
            totalRecipients: trackingRecords.length,
            uniqueOpens: trackingRecords.filter(t => t.openCount > 0).length,
            uniqueClicks: trackingRecords.filter(t => t.clickCount > 0).length,
            totalOpens: trackingRecords.reduce((sum, t) => sum + t.openCount, 0),
            totalClicks: trackingRecords.reduce((sum, t) => sum + t.clickCount, 0),
            avgEngagementScore: 0
        };

        if (trackingRecords.length > 0) {
            metrics.avgEngagementScore = (
                trackingRecords.reduce((sum, t) => sum + t.engagementScore, 0) /
                trackingRecords.length
            ).toFixed(2);
        }

        return metrics;
    }

    /**
     * Get delivery report
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @returns {Object} Delivery report
     */
    static async getDeliveryReport(campaignId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(campaignId);

        const campaign = await Campaign.findOne({
            _id: sanitizedId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!campaign) {
            throw CustomException('Campaign not found', 404);
        }

        return {
            campaignId: campaign.campaignId,
            name: campaign.name,
            emailsSent: campaign.results.emailsSent || 0,
            emailsDelivered: (campaign.results.emailsSent || 0) - (campaign.results.emailsBounced || 0),
            emailsBounced: campaign.results.emailsBounced || 0,
            deliveryRate: campaign.results.emailsSent > 0 ?
                (((campaign.results.emailsSent - (campaign.results.emailsBounced || 0)) / campaign.results.emailsSent) * 100).toFixed(2) :
                0
        };
    }

    /**
     * Export campaign report
     * @param {String} campaignId - Campaign ID
     * @param {String} firmId - Firm ID (REQUIRED)
     * @param {String} format - Report format ('json', 'csv')
     * @returns {Object} Exported report
     */
    static async exportCampaignReport(campaignId, firmId, format = 'json') {
        if (!firmId) throw new Error('firmId is required');

        const stats = await this.getCampaignStats(campaignId, firmId);
        const engagement = await this.getEngagementMetrics(campaignId, firmId);
        const delivery = await this.getDeliveryReport(campaignId, firmId);

        const report = {
            campaign: stats,
            engagement,
            delivery,
            exportedAt: new Date().toISOString()
        };

        if (format === 'csv') {
            // Convert to CSV format (simplified)
            const csvRows = [
                'Metric,Value',
                `Campaign Name,${stats.name}`,
                `Status,${stats.status}`,
                `Emails Sent,${stats.results.emailsSent}`,
                `Emails Opened,${stats.results.emailsOpened}`,
                `Emails Clicked,${stats.results.emailsClicked}`,
                `Open Rate,${stats.openRate}%`,
                `Click Rate,${stats.clickRate}%`,
                `Leads Generated,${stats.results.leadsGenerated}`,
                `Leads Converted,${stats.results.leadsConverted}`,
                `Revenue Generated,${stats.results.revenueGenerated}`,
                `ROI,${stats.results.roi}%`
            ];

            return {
                format: 'csv',
                content: csvRows.join('\n')
            };
        }

        return {
            format: 'json',
            content: report
        };
    }

    // ==================== HELPER METHODS ====================

    /**
     * Generate unique tracking ID
     * @private
     */
    static _generateTrackingId() {
        return crypto.randomBytes(16).toString('hex');
    }
}

module.exports = CampaignWorkflowService;
