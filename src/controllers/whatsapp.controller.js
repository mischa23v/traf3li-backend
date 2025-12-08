const WhatsAppService = require('../services/whatsapp.service');
const asyncHandler = require('express-async-handler');

// ═══════════════════════════════════════════════════════════════
// WHATSAPP CONTROLLER
// ═══════════════════════════════════════════════════════════════

class WhatsAppController {
    // ═══════════════════════════════════════════════════════════
    // MESSAGE SENDING
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Send template message
     * @route   POST /api/whatsapp/send/template
     * @access  Private
     */
    sendTemplate = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { phoneNumber, templateName, variables, leadId, clientId } = req.body;

        if (!phoneNumber || !templateName) {
            return res.status(400).json({
                success: false,
                message: 'phoneNumber and templateName are required'
            });
        }

        const result = await WhatsAppService.sendTemplateMessage(
            firmId,
            phoneNumber,
            templateName,
            variables || {},
            {
                leadId,
                clientId,
                sentBy: req.userID
            }
        );

        res.json({
            success: true,
            message: 'Template message sent successfully',
            data: result
        });
    });

    /**
     * @desc    Send text message
     * @route   POST /api/whatsapp/send/text
     * @access  Private
     */
    sendText = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { phoneNumber, text, leadId, clientId, replyTo } = req.body;

        if (!phoneNumber || !text) {
            return res.status(400).json({
                success: false,
                message: 'phoneNumber and text are required'
            });
        }

        const result = await WhatsAppService.sendTextMessage(
            firmId,
            phoneNumber,
            text,
            {
                leadId,
                clientId,
                sentBy: req.userID,
                replyTo
            }
        );

        res.json({
            success: true,
            message: 'Text message sent successfully',
            data: result
        });
    });

    /**
     * @desc    Send media message (image, video, document, audio)
     * @route   POST /api/whatsapp/send/media
     * @access  Private
     */
    sendMedia = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { phoneNumber, type, mediaUrl, caption, fileName, leadId, clientId } = req.body;

        if (!phoneNumber || !type || !mediaUrl) {
            return res.status(400).json({
                success: false,
                message: 'phoneNumber, type, and mediaUrl are required'
            });
        }

        if (!['image', 'video', 'document', 'audio'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid media type. Must be: image, video, document, or audio'
            });
        }

        const result = await WhatsAppService.sendMediaMessage(
            firmId,
            phoneNumber,
            type,
            mediaUrl,
            {
                caption,
                fileName,
                leadId,
                clientId,
                sentBy: req.userID
            }
        );

        res.json({
            success: true,
            message: 'Media message sent successfully',
            data: result
        });
    });

    /**
     * @desc    Send location message
     * @route   POST /api/whatsapp/send/location
     * @access  Private
     */
    sendLocation = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { phoneNumber, latitude, longitude, name, address, leadId, clientId } = req.body;

        if (!phoneNumber || !latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'phoneNumber, latitude, and longitude are required'
            });
        }

        const result = await WhatsAppService.sendLocationMessage(
            firmId,
            phoneNumber,
            latitude,
            longitude,
            name,
            address,
            {
                leadId,
                clientId,
                sentBy: req.userID
            }
        );

        res.json({
            success: true,
            message: 'Location message sent successfully',
            data: result
        });
    });

    // ═══════════════════════════════════════════════════════════
    // CONVERSATIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get all conversations
     * @route   GET /api/whatsapp/conversations
     * @access  Private
     */
    getConversations = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { assignedTo, unreadOnly, labels, limit, skip } = req.query;

        const conversations = await WhatsAppService.getConversations(firmId, {
            assignedTo,
            unreadOnly: unreadOnly === 'true',
            labels: labels ? labels.split(',') : undefined,
            limit: parseInt(limit) || 50,
            skip: parseInt(skip) || 0
        });

        res.json({
            success: true,
            count: conversations.length,
            data: conversations
        });
    });

    /**
     * @desc    Get single conversation
     * @route   GET /api/whatsapp/conversations/:id
     * @access  Private
     */
    getConversation = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const conversation = await WhatsAppService.getOrCreateConversation(
            req.firmId,
            id // This could be conversation ID or phone number
        );

        res.json({
            success: true,
            data: conversation
        });
    });

    /**
     * @desc    Get messages for a conversation
     * @route   GET /api/whatsapp/conversations/:id/messages
     * @access  Private
     */
    getMessages = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { limit, skip, beforeDate } = req.query;

        const messages = await WhatsAppService.getMessages(id, {
            limit: parseInt(limit) || 50,
            skip: parseInt(skip) || 0,
            beforeDate
        });

        res.json({
            success: true,
            count: messages.length,
            data: messages
        });
    });

    /**
     * @desc    Mark conversation as read
     * @route   POST /api/whatsapp/conversations/:id/read
     * @access  Private
     */
    markAsRead = asyncHandler(async (req, res) => {
        const { id } = req.params;

        const conversation = await WhatsAppService.markAsRead(id);

        res.json({
            success: true,
            message: 'Conversation marked as read',
            data: conversation
        });
    });

    /**
     * @desc    Assign conversation to user
     * @route   PUT /api/whatsapp/conversations/:id/assign
     * @access  Private
     */
    assignConversation = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'userId is required'
            });
        }

        const conversation = await WhatsAppService.assignConversation(id, userId);

        res.json({
            success: true,
            message: 'Conversation assigned successfully',
            data: conversation
        });
    });

    /**
     * @desc    Link conversation to lead
     * @route   POST /api/whatsapp/conversations/:id/link-lead
     * @access  Private
     */
    linkToLead = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { leadId } = req.body;

        if (!leadId) {
            return res.status(400).json({
                success: false,
                message: 'leadId is required'
            });
        }

        const conversation = await WhatsAppService.linkToLead(id, leadId);

        res.json({
            success: true,
            message: 'Conversation linked to lead successfully',
            data: conversation
        });
    });

    /**
     * @desc    Create lead from conversation
     * @route   POST /api/whatsapp/conversations/:id/create-lead
     * @access  Private
     */
    createLeadFromConversation = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const leadData = req.body;

        const lead = await WhatsAppService.createLeadFromConversation(
            id,
            leadData,
            req.userID
        );

        res.json({
            success: true,
            message: 'Lead created from conversation successfully',
            data: lead
        });
    });

    // ═══════════════════════════════════════════════════════════
    // TEMPLATES
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Create template
     * @route   POST /api/whatsapp/templates
     * @access  Private
     */
    createTemplate = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const templateData = req.body;

        const template = await WhatsAppService.createTemplate(
            firmId,
            templateData,
            req.userID
        );

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: template
        });
    });

    /**
     * @desc    Get all templates
     * @route   GET /api/whatsapp/templates
     * @access  Private
     */
    getTemplates = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { status, category, useCase } = req.query;

        const templates = await WhatsAppService.getTemplates(firmId, {
            status,
            category,
            useCase
        });

        res.json({
            success: true,
            count: templates.length,
            data: templates
        });
    });

    /**
     * @desc    Submit template for approval
     * @route   POST /api/whatsapp/templates/:id/submit
     * @access  Private
     */
    submitTemplate = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { provider } = req.body;

        const template = await WhatsAppService.submitTemplateForApproval(id, provider);

        res.json({
            success: true,
            message: 'Template submitted for approval',
            data: template
        });
    });

    // ═══════════════════════════════════════════════════════════
    // WEBHOOKS
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Verify webhook (GET)
     * @route   GET /api/webhooks/whatsapp
     * @access  Public
     */
    verifyWebhook = asyncHandler(async (req, res) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        try {
            const result = WhatsAppService.verifyWebhook(mode, token, challenge);
            res.status(200).send(result);
        } catch (error) {
            res.status(403).send('Forbidden');
        }
    });

    /**
     * @desc    Receive webhook (POST)
     * @route   POST /api/webhooks/whatsapp
     * @access  Public
     */
    receiveWebhook = asyncHandler(async (req, res) => {
        const payload = req.body;
        const provider = req.query.provider || 'meta';

        // Acknowledge immediately
        res.status(200).send('OK');

        // Process webhook asynchronously
        try {
            // Check if it's a message or status update
            if (payload.entry?.[0]?.changes?.[0]?.value?.messages) {
                await WhatsAppService.handleIncomingMessage(payload, provider);
            } else if (payload.entry?.[0]?.changes?.[0]?.value?.statuses) {
                await WhatsAppService.handleStatusUpdate(payload, provider);
            }
        } catch (error) {
            console.error('Error processing webhook:', error);
        }
    });

    // ═══════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get WhatsApp analytics
     * @route   GET /api/whatsapp/analytics
     * @access  Private
     */
    getAnalytics = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { startDate, endDate } = req.query;

        const [messageStats, responseTimes, templatePerformance] = await Promise.all([
            WhatsAppService.getMessageStats(firmId, { start: startDate, end: endDate }),
            WhatsAppService.getResponseTimes(firmId),
            WhatsAppService.getTemplatePerformance(firmId)
        ]);

        res.json({
            success: true,
            data: {
                messages: messageStats,
                responseTimes,
                templates: templatePerformance
            }
        });
    });

    /**
     * @desc    Get conversation statistics
     * @route   GET /api/whatsapp/stats
     * @access  Private
     */
    getStats = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        const WhatsAppConversation = require('../models/whatsappConversation.model');
        const stats = await WhatsAppConversation.getStats(firmId);

        res.json({
            success: true,
            data: stats
        });
    });
}

module.exports = new WhatsAppController();
