/**
 * Support Service for TRAF3LI
 *
 * Manages support ticket operations including ticket lifecycle management,
 * SLA tracking, communications, and support settings.
 *
 * Features:
 * - Ticket CRUD operations with multi-tenancy support
 * - SLA management and breach detection
 * - Ticket communications and replies
 * - Auto-assignment rules
 * - Statistics and reporting
 *
 * Integration:
 * - Works with Ticket, SupportSLA, and SupportSettings models
 * - Integrates with firm-level isolation
 * - Supports email notifications and webhooks
 */

const mongoose = require('mongoose');
const Ticket = require('../models/ticket.model');
const TicketCommunication = require('../models/ticketCommunication.model');
const SupportSLA = require('../models/supportSLA.model');
const SupportSettings = require('../models/supportSettings.model');
const User = require('../models/user.model');
const logger = require('../utils/logger');
const CustomException = require('../utils/CustomException');

class SupportService {
    // ═══════════════════════════════════════════════════════════════
    // TICKET MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get tickets with filters and pagination
     * @param {Object} query - Filter criteria
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Tickets with pagination
     */
    static async getTickets(query = {}, firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const {
                status,
                priority,
                ticketType,
                assignedTo,
                raisedBy,
                clientId,
                search,
                page = 1,
                limit = 50,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = query;

            // Build query with IDOR protection
            const filter = { firmId };

            if (status) filter.status = status;
            if (priority) filter.priority = priority;
            if (ticketType) filter.ticketType = ticketType;
            if (assignedTo) filter.assignedTo = assignedTo;
            if (raisedBy) filter.raisedBy = raisedBy;
            if (clientId) filter.clientId = clientId;

            // Text search
            if (search) {
                filter.$or = [
                    { subject: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { ticketId: { $regex: search, $options: 'i' } }
                ];
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

            const [tickets, total] = await Promise.all([
                Ticket.find(filter)
                    .populate('assignedTo', 'firstName lastName email username')
                    .populate('raisedBy', 'firstName lastName email username')
                    .populate('clientId', 'name email')
                    .populate('slaId', 'name priority')
                    .populate('resolvedBy', 'firstName lastName username')
                    .populate('closedBy', 'firstName lastName username')
                    .sort(sort)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .lean(),
                Ticket.countDocuments(filter)
            ]);

            logger.info(`Retrieved ${tickets.length} tickets for firm ${firmId}`);

            return {
                tickets,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / parseInt(limit))
                }
            };
        } catch (error) {
            logger.error('Error getting tickets:', error);
            throw error;
        }
    }

    /**
     * Get ticket by ID
     * @param {String} id - Ticket ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Ticket
     */
    static async getTicketById(id, firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const ticket = await Ticket.findById(id)
                .populate('assignedTo', 'firstName lastName email username phone')
                .populate('raisedBy', 'firstName lastName email username phone')
                .populate('clientId', 'name email phone')
                .populate('slaId')
                .populate('resolvedBy', 'firstName lastName username')
                .populate('closedBy', 'firstName lastName username')
                .populate('createdBy', 'firstName lastName username')
                .populate('updatedBy', 'firstName lastName username');

            if (!ticket) {
                throw CustomException('Ticket not found', 404);
            }

            // IDOR protection - verify firm ownership
            if (ticket.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this ticket', 403);
            }

            logger.info(`Retrieved ticket ${id} for firm ${firmId}`);
            return ticket;
        } catch (error) {
            logger.error('Error getting ticket by ID:', error);
            throw error;
        }
    }

    /**
     * Create a new ticket
     * @param {Object} data - Ticket data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User creating the ticket
     * @returns {Promise<Object>} Created ticket
     */
    static async createTicket(data, firmId, userId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const {
                subject,
                description,
                priority = 'medium',
                ticketType = 'question',
                raisedBy,
                clientId,
                tags = [],
                customFields = {}
            } = data;

            // Validate required fields
            if (!subject || !description) {
                throw CustomException('Subject and description are required', 400);
            }

            if (!raisedBy) {
                throw CustomException('Raised by user is required', 400);
            }

            // Get user info
            const user = await User.findById(raisedBy);
            if (!user) {
                throw CustomException('User not found', 404);
            }

            // Get support settings
            const settings = await SupportSettings.getOrCreateSettings(firmId, userId);

            // Create ticket
            const ticket = new Ticket({
                firmId,
                subject,
                description,
                priority,
                ticketType,
                raisedBy,
                raisedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                raisedByEmail: user.email,
                clientId,
                tags,
                customFields,
                createdBy: userId,
                status: 'open'
            });

            // Apply SLA if configured
            if (settings.defaultSlaId) {
                const sla = await SupportSLA.findById(settings.defaultSlaId);
                if (sla && sla.status === 'active') {
                    ticket.slaId = sla._id;
                    const dueDates = sla.getDueDates(new Date());
                    ticket.firstResponseDue = dueDates.firstResponseDue;
                    ticket.resolutionDue = dueDates.resolutionDue;
                }
            }

            await ticket.save();

            // Auto-assign if enabled
            if (settings.autoAssignTickets) {
                await this.autoAssignTicket(ticket._id, firmId);
            }

            // Populate before returning
            await ticket.populate([
                { path: 'assignedTo', select: 'firstName lastName email username' },
                { path: 'raisedBy', select: 'firstName lastName email username' },
                { path: 'clientId', select: 'name email' },
                { path: 'slaId', select: 'name priority' }
            ]);

            logger.info(`Created ticket ${ticket._id} for firm ${firmId}`);
            return ticket;
        } catch (error) {
            logger.error('Error creating ticket:', error);
            throw error;
        }
    }

    /**
     * Update ticket
     * @param {String} id - Ticket ID
     * @param {Object} data - Update data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User updating the ticket
     * @returns {Promise<Object>} Updated ticket
     */
    static async updateTicket(id, data, firmId, userId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const ticket = await Ticket.findById(id);
            if (!ticket) {
                throw CustomException('Ticket not found', 404);
            }

            // IDOR protection
            if (ticket.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this ticket', 403);
            }

            // Update allowed fields
            const allowedUpdates = [
                'subject',
                'description',
                'priority',
                'ticketType',
                'status',
                'tags',
                'customFields'
            ];

            allowedUpdates.forEach(field => {
                if (data[field] !== undefined) {
                    ticket[field] = data[field];
                }
            });

            ticket.updatedBy = userId;
            await ticket.save();

            await ticket.populate([
                { path: 'assignedTo', select: 'firstName lastName email username' },
                { path: 'raisedBy', select: 'firstName lastName email username' },
                { path: 'clientId', select: 'name email' },
                { path: 'slaId', select: 'name priority' }
            ]);

            logger.info(`Updated ticket ${id} for firm ${firmId}`);
            return ticket;
        } catch (error) {
            logger.error('Error updating ticket:', error);
            throw error;
        }
    }

    /**
     * Delete ticket
     * @param {String} id - Ticket ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<void>}
     */
    static async deleteTicket(id, firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const ticket = await Ticket.findById(id);
            if (!ticket) {
                throw CustomException('Ticket not found', 404);
            }

            // IDOR protection
            if (ticket.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this ticket', 403);
            }

            await Ticket.findByIdAndDelete(id);

            // Also delete related communications if using separate collection
            await TicketCommunication.deleteMany({ ticketId: id });

            logger.info(`Deleted ticket ${id} for firm ${firmId}`);
        } catch (error) {
            logger.error('Error deleting ticket:', error);
            throw error;
        }
    }

    /**
     * Add reply/communication to ticket
     * @param {String} id - Ticket ID
     * @param {String} content - Reply content
     * @param {String} userId - User ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Updated ticket
     */
    static async replyToTicket(id, content, userId, firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            if (!content || !content.trim()) {
                throw CustomException('Reply content is required', 400);
            }

            const ticket = await Ticket.findById(id);
            if (!ticket) {
                throw CustomException('Ticket not found', 404);
            }

            // IDOR protection
            if (ticket.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this ticket', 403);
            }

            // Get user info
            const user = await User.findById(userId);
            if (!user) {
                throw CustomException('User not found', 404);
            }

            // Determine sender type
            let senderType = 'agent';
            if (ticket.raisedBy.toString() === userId.toString()) {
                senderType = 'customer';
            }

            // Add communication
            const communication = await ticket.addCommunication({
                sender: userId,
                senderName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
                senderType,
                content: content.trim(),
                contentType: 'text',
                sentVia: 'portal',
                isInternal: false
            }, userId);

            await ticket.populate([
                { path: 'assignedTo', select: 'firstName lastName email username' },
                { path: 'raisedBy', select: 'firstName lastName email username' },
                { path: 'slaId', select: 'name priority' }
            ]);

            logger.info(`Added reply to ticket ${id} by user ${userId}`);
            return ticket;
        } catch (error) {
            logger.error('Error replying to ticket:', error);
            throw error;
        }
    }

    /**
     * Resolve ticket
     * @param {String} id - Ticket ID
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object>} Resolved ticket
     */
    static async resolveTicket(id, firmId, userId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const ticket = await Ticket.findById(id);
            if (!ticket) {
                throw CustomException('Ticket not found', 404);
            }

            // IDOR protection
            if (ticket.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this ticket', 403);
            }

            if (ticket.status === 'resolved' || ticket.status === 'closed') {
                throw CustomException('Ticket is already resolved or closed', 400);
            }

            await ticket.resolve(null, userId);

            await ticket.populate([
                { path: 'assignedTo', select: 'firstName lastName email username' },
                { path: 'raisedBy', select: 'firstName lastName email username' },
                { path: 'resolvedBy', select: 'firstName lastName username' }
            ]);

            logger.info(`Resolved ticket ${id} by user ${userId}`);
            return ticket;
        } catch (error) {
            logger.error('Error resolving ticket:', error);
            throw error;
        }
    }

    /**
     * Close ticket
     * @param {String} id - Ticket ID
     * @param {String} firmId - Firm ID
     * @param {String} userId - User ID
     * @returns {Promise<Object>} Closed ticket
     */
    static async closeTicket(id, firmId, userId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const ticket = await Ticket.findById(id);
            if (!ticket) {
                throw CustomException('Ticket not found', 404);
            }

            // IDOR protection
            if (ticket.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this ticket', 403);
            }

            if (ticket.status === 'closed') {
                throw CustomException('Ticket is already closed', 400);
            }

            await ticket.close(userId);

            await ticket.populate([
                { path: 'assignedTo', select: 'firstName lastName email username' },
                { path: 'raisedBy', select: 'firstName lastName email username' },
                { path: 'closedBy', select: 'firstName lastName username' }
            ]);

            logger.info(`Closed ticket ${id} by user ${userId}`);
            return ticket;
        } catch (error) {
            logger.error('Error closing ticket:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SLA MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get SLAs for a firm
     * @param {String} firmId - Firm ID
     * @returns {Promise<Array>} SLAs
     */
    static async getSLAs(firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const slas = await SupportSLA.find({ firmId })
                .populate('createdBy', 'firstName lastName username email')
                .populate('updatedBy', 'firstName lastName username email')
                .sort({ priority: -1, name: 1 });

            logger.info(`Retrieved ${slas.length} SLAs for firm ${firmId}`);
            return slas;
        } catch (error) {
            logger.error('Error getting SLAs:', error);
            throw error;
        }
    }

    /**
     * Get SLA by ID
     * @param {String} id - SLA ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} SLA
     */
    static async getSLAById(id, firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const sla = await SupportSLA.findById(id)
                .populate('createdBy', 'firstName lastName username email')
                .populate('updatedBy', 'firstName lastName username email');

            if (!sla) {
                throw CustomException('SLA not found', 404);
            }

            // IDOR protection
            if (sla.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this SLA', 403);
            }

            logger.info(`Retrieved SLA ${id} for firm ${firmId}`);
            return sla;
        } catch (error) {
            logger.error('Error getting SLA by ID:', error);
            throw error;
        }
    }

    /**
     * Create SLA
     * @param {Object} data - SLA data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User creating the SLA
     * @returns {Promise<Object>} Created SLA
     */
    static async createSLA(data, firmId, userId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const {
                name,
                nameAr,
                description,
                descriptionAr,
                priority,
                supportType,
                firstResponseMinutes,
                resolutionMinutes,
                workingHours,
                workingDays,
                holidays,
                warningThreshold,
                isDefault,
                applicableTicketTypes,
                applicableChannels,
                escalationEnabled,
                escalationLevels
            } = data;

            // Validate required fields
            if (!name || !priority || !firstResponseMinutes || !resolutionMinutes) {
                throw CustomException('Name, priority, first response minutes, and resolution minutes are required', 400);
            }

            if (firstResponseMinutes <= 0 || resolutionMinutes <= 0) {
                throw CustomException('Response and resolution minutes must be greater than 0', 400);
            }

            // Create SLA
            const sla = await SupportSLA.create({
                firmId,
                name,
                nameAr,
                description,
                descriptionAr,
                priority,
                supportType,
                firstResponseMinutes,
                resolutionMinutes,
                workingHours,
                workingDays,
                holidays,
                warningThreshold,
                isDefault: isDefault || false,
                applicableTicketTypes,
                applicableChannels,
                escalationEnabled,
                escalationLevels,
                createdBy: userId
            });

            await sla.populate('createdBy', 'firstName lastName username email');

            logger.info(`Created SLA ${sla._id} for firm ${firmId}`);
            return sla;
        } catch (error) {
            logger.error('Error creating SLA:', error);
            throw error;
        }
    }

    /**
     * Update SLA
     * @param {String} id - SLA ID
     * @param {Object} data - Update data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User updating the SLA
     * @returns {Promise<Object>} Updated SLA
     */
    static async updateSLA(id, data, firmId, userId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const sla = await SupportSLA.findById(id);
            if (!sla) {
                throw CustomException('SLA not found', 404);
            }

            // IDOR protection
            if (sla.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this SLA', 403);
            }

            // Update allowed fields
            const allowedUpdates = [
                'name',
                'nameAr',
                'description',
                'descriptionAr',
                'priority',
                'supportType',
                'firstResponseMinutes',
                'resolutionMinutes',
                'workingHours',
                'workingDays',
                'holidays',
                'warningThreshold',
                'isDefault',
                'status',
                'applicableTicketTypes',
                'applicableChannels',
                'escalationEnabled',
                'escalationLevels'
            ];

            allowedUpdates.forEach(field => {
                if (data[field] !== undefined) {
                    sla[field] = data[field];
                }
            });

            sla.updatedBy = userId;
            await sla.save();

            await sla.populate([
                { path: 'createdBy', select: 'firstName lastName username email' },
                { path: 'updatedBy', select: 'firstName lastName username email' }
            ]);

            logger.info(`Updated SLA ${id} for firm ${firmId}`);
            return sla;
        } catch (error) {
            logger.error('Error updating SLA:', error);
            throw error;
        }
    }

    /**
     * Delete SLA
     * @param {String} id - SLA ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<void>}
     */
    static async deleteSLA(id, firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const sla = await SupportSLA.findById(id);
            if (!sla) {
                throw CustomException('SLA not found', 404);
            }

            // IDOR protection
            if (sla.firmId.toString() !== firmId.toString()) {
                throw CustomException('Access denied to this SLA', 403);
            }

            // Check if SLA is in use
            const ticketsUsingThisSLA = await Ticket.countDocuments({ slaId: id, firmId });
            if (ticketsUsingThisSLA > 0) {
                throw CustomException(`Cannot delete SLA. ${ticketsUsingThisSLA} tickets are using this SLA`, 400);
            }

            await SupportSLA.findByIdAndDelete(id);

            logger.info(`Deleted SLA ${id} for firm ${firmId}`);
        } catch (error) {
            logger.error('Error deleting SLA:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STATISTICS & SETTINGS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get ticket statistics
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Statistics
     */
    static async getStats(firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const stats = await Ticket.getStats(firmId);

            logger.info(`Retrieved statistics for firm ${firmId}`);
            return stats;
        } catch (error) {
            logger.error('Error getting statistics:', error);
            throw error;
        }
    }

    /**
     * Get support settings
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Settings
     */
    static async getSettings(firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const settings = await SupportSettings.getOrCreateSettings(firmId);

            await settings.populate([
                { path: 'defaultSlaId', select: 'name priority' },
                { path: 'defaultAssignee', select: 'firstName lastName username email' },
                { path: 'createdBy', select: 'firstName lastName username' },
                { path: 'updatedBy', select: 'firstName lastName username' }
            ]);

            logger.info(`Retrieved settings for firm ${firmId}`);
            return settings;
        } catch (error) {
            logger.error('Error getting settings:', error);
            throw error;
        }
    }

    /**
     * Update support settings
     * @param {Object} data - Settings data
     * @param {String} firmId - Firm ID
     * @param {String} userId - User updating settings
     * @returns {Promise<Object>} Updated settings
     */
    static async updateSettings(data, firmId, userId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            let settings = await SupportSettings.findOne({ firmId });

            if (!settings) {
                settings = await SupportSettings.create({
                    firmId,
                    createdBy: userId
                });
            }

            // Update allowed fields
            const allowedUpdates = [
                'defaultSlaId',
                'autoAssignTickets',
                'defaultAssignee',
                'ticketPrefixFormat',
                'ticketNumberingStartFrom',
                'emailNotifications',
                'workingHours',
                'workingDays',
                'holidays',
                'customerPortal',
                'automation',
                'defaultPriority',
                'priorityEscalation',
                'enabledTicketTypes',
                'defaultTags',
                'requiredFields',
                'integrations',
                'branding',
                'allowDuplicateTickets',
                'duplicateDetectionEnabled',
                'mergeTicketsEnabled',
                'internalNotesEnabled'
            ];

            allowedUpdates.forEach(field => {
                if (data[field] !== undefined) {
                    settings[field] = data[field];
                }
            });

            settings.updatedBy = userId;
            await settings.save();

            await settings.populate([
                { path: 'defaultSlaId', select: 'name priority' },
                { path: 'defaultAssignee', select: 'firstName lastName username email' },
                { path: 'updatedBy', select: 'firstName lastName username' }
            ]);

            logger.info(`Updated settings for firm ${firmId}`);
            return settings;
        } catch (error) {
            logger.error('Error updating settings:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate SLA due dates for a ticket
     * @param {String} ticketId - Ticket ID
     * @param {String} slaId - SLA ID
     * @returns {Promise<Object>} Due dates
     */
    static async calculateSLADueDates(ticketId, slaId) {
        try {
            const ticket = await Ticket.findById(ticketId);
            if (!ticket) {
                throw CustomException('Ticket not found', 404);
            }

            const sla = await SupportSLA.findById(slaId);
            if (!sla) {
                throw CustomException('SLA not found', 404);
            }

            const dueDates = sla.getDueDates(ticket.createdAt);

            logger.info(`Calculated SLA due dates for ticket ${ticketId}`);
            return dueDates;
        } catch (error) {
            logger.error('Error calculating SLA due dates:', error);
            throw error;
        }
    }

    /**
     * Check for SLA breaches
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Breach information
     */
    static async checkSLABreaches(firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const warnings = await Ticket.getSLABreachWarnings(firmId);

            const result = {
                totalBreaches: warnings.length,
                breaches: warnings.map(ticket => ({
                    ticketId: ticket.ticketId,
                    ticketNumber: ticket.ticketNumber,
                    subject: ticket.subject,
                    priority: ticket.priority,
                    slaStatus: ticket.slaStatus,
                    firstResponseDue: ticket.firstResponseDue,
                    resolutionDue: ticket.resolutionDue,
                    assignedTo: ticket.assignedTo
                }))
            };

            logger.info(`Checked SLA breaches for firm ${firmId}: ${result.totalBreaches} breaches found`);
            return result;
        } catch (error) {
            logger.error('Error checking SLA breaches:', error);
            throw error;
        }
    }

    /**
     * Auto-assign ticket based on rules
     * @param {String} ticketId - Ticket ID
     * @param {String} firmId - Firm ID
     * @returns {Promise<Object>} Assigned ticket
     */
    static async autoAssignTicket(ticketId, firmId) {
        try {
            if (!firmId) {
                throw CustomException('Firm ID is required', 400);
            }

            const ticket = await Ticket.findById(ticketId);
            if (!ticket) {
                throw CustomException('Ticket not found', 404);
            }

            const settings = await SupportSettings.findOne({ firmId });
            if (!settings || !settings.autoAssignTickets) {
                logger.info('Auto-assignment is disabled for this firm');
                return ticket;
            }

            const rules = await SupportSettings.getActiveAssignmentRules(firmId);

            // Find matching rule
            let assignedAgent = null;
            for (const rule of rules) {
                const matches = this._checkRuleMatch(ticket, rule);
                if (matches) {
                    assignedAgent = await this._assignByRule(ticket, rule);
                    if (assignedAgent) break;
                }
            }

            // Fallback to default assignee
            if (!assignedAgent && settings.defaultAssignee) {
                assignedAgent = await User.findById(settings.defaultAssignee);
            }

            if (assignedAgent) {
                await ticket.assignTo(
                    assignedAgent._id,
                    `${assignedAgent.firstName || ''} ${assignedAgent.lastName || ''}`.trim() || assignedAgent.username
                );
                logger.info(`Auto-assigned ticket ${ticketId} to user ${assignedAgent._id}`);
            }

            return ticket;
        } catch (error) {
            logger.error('Error auto-assigning ticket:', error);
            throw error;
        }
    }

    /**
     * Check if ticket matches assignment rule
     * @private
     */
    static _checkRuleMatch(ticket, rule) {
        const conditions = rule.conditions || {};

        // Check ticket types
        if (conditions.ticketTypes && conditions.ticketTypes.length > 0) {
            if (!conditions.ticketTypes.includes(ticket.ticketType)) {
                return false;
            }
        }

        // Check priorities
        if (conditions.priorities && conditions.priorities.length > 0) {
            if (!conditions.priorities.includes(ticket.priority)) {
                return false;
            }
        }

        // Check tags
        if (conditions.tags && conditions.tags.length > 0) {
            const hasMatchingTag = conditions.tags.some(tag => ticket.tags.includes(tag));
            if (!hasMatchingTag) {
                return false;
            }
        }

        return true;
    }

    /**
     * Assign ticket based on rule
     * @private
     */
    static async _assignByRule(ticket, rule) {
        try {
            if (rule.assignToUsers && rule.assignToUsers.length > 0) {
                // For now, use round-robin (simple: pick first available)
                // In production, you'd track the last assigned index
                const randomIndex = Math.floor(Math.random() * rule.assignToUsers.length);
                const userId = rule.assignToUsers[randomIndex];
                return await User.findById(userId);
            }

            return null;
        } catch (error) {
            logger.error('Error assigning by rule:', error);
            return null;
        }
    }
}

module.exports = SupportService;
