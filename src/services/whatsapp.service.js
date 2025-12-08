const WhatsAppTemplate = require('../models/whatsappTemplate.model');
const WhatsAppConversation = require('../models/whatsappConversation.model');
const WhatsAppMessage = require('../models/whatsappMessage.model');
const Lead = require('../models/lead.model');
const Client = require('../models/client.model');
const axios = require('axios');

// ═══════════════════════════════════════════════════════════════
// WHATSAPP SERVICE - MULTI-PROVIDER SUPPORT
// Supports: Meta Cloud API, MSG91, Twilio
// ═══════════════════════════════════════════════════════════════

class WhatsAppService {
    constructor() {
        // Configure providers from environment
        this.providers = {
            meta: {
                accessToken: process.env.META_WHATSAPP_TOKEN,
                phoneNumberId: process.env.META_PHONE_NUMBER_ID,
                businessAccountId: process.env.META_BUSINESS_ACCOUNT_ID,
                apiVersion: process.env.META_API_VERSION || 'v18.0',
                baseUrl: 'https://graph.facebook.com'
            },
            msg91: {
                authKey: process.env.MSG91_AUTH_KEY,
                senderId: process.env.MSG91_SENDER_ID,
                baseUrl: 'https://api.msg91.com/api/v5/whatsapp'
            },
            twilio: {
                accountSid: process.env.TWILIO_ACCOUNT_SID,
                authToken: process.env.TWILIO_AUTH_TOKEN,
                phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER,
                baseUrl: 'https://api.twilio.com/2010-04-01'
            }
        };

        this.defaultProvider = process.env.WHATSAPP_PROVIDER || 'meta';
    }

    // ═══════════════════════════════════════════════════════════
    // MESSAGE SENDING
    // ═══════════════════════════════════════════════════════════

    /**
     * Send template message (for messages outside 24-hour window)
     */
    async sendTemplateMessage(firmId, phoneNumber, templateName, variables = {}, options = {}) {
        try {
            // Validate and format phone number
            const formattedPhone = this.validatePhoneNumber(phoneNumber);

            // Get template
            const template = await WhatsAppTemplate.findOne({
                firmId,
                name: templateName,
                status: 'approved',
                isActive: true
            });

            if (!template) {
                throw new Error(`Template "${templateName}" not found or not approved`);
            }

            // Get or create conversation
            const conversation = await WhatsAppConversation.getOrCreate(firmId, formattedPhone, {
                leadId: options.leadId,
                clientId: options.clientId,
                contactName: options.contactName,
                contactType: options.contactType
            });

            // Compile template with variables
            const compiledTemplate = template.compile(variables);

            // Create message record
            const message = await WhatsAppMessage.create({
                firmId,
                conversationId: conversation._id,
                direction: 'outbound',
                type: 'template',
                content: {
                    templateName: template.name,
                    templateId: template.templateId,
                    templateLanguage: template.language,
                    templateVariables: Object.values(variables),
                    text: compiledTemplate.body
                },
                senderPhone: this.getProviderPhoneNumber(),
                recipientPhone: formattedPhone,
                sentBy: options.sentBy,
                provider: options.provider || this.defaultProvider,
                outsideWindow: !conversation.isWindowOpen(),
                status: 'pending'
            });

            // Send via provider
            const result = await this.sendViaProvider(
                message.provider,
                formattedPhone,
                {
                    type: 'template',
                    template,
                    variables
                },
                message._id
            );

            // Update message with provider response
            message.messageId = result.messageId;
            message.providerMessageId = result.providerMessageId;
            message.providerData = result.providerData;
            message.status = 'sent';
            message.sentAt = new Date();
            await message.save();

            // Update template usage
            await template.incrementUsage('sent');

            return {
                success: true,
                message,
                conversation
            };
        } catch (error) {
            console.error('Error sending template message:', error);
            throw error;
        }
    }

    /**
     * Send text message (only within 24-hour window)
     */
    async sendTextMessage(firmId, phoneNumber, text, options = {}) {
        try {
            const formattedPhone = this.validatePhoneNumber(phoneNumber);

            // Get or create conversation
            const conversation = await WhatsAppConversation.getOrCreate(firmId, formattedPhone, {
                leadId: options.leadId,
                clientId: options.clientId,
                contactName: options.contactName,
                contactType: options.contactType
            });

            // Check 24-hour window
            if (!conversation.isWindowOpen() && !options.forceTemplate) {
                throw new Error('24-hour messaging window closed. Please use a template message.');
            }

            // Create message record
            const message = await WhatsAppMessage.create({
                firmId,
                conversationId: conversation._id,
                direction: 'outbound',
                type: 'text',
                content: { text },
                senderPhone: this.getProviderPhoneNumber(),
                recipientPhone: formattedPhone,
                sentBy: options.sentBy,
                provider: options.provider || this.defaultProvider,
                replyTo: options.replyTo ? {
                    messageId: options.replyTo,
                    text: options.replyToText
                } : undefined,
                status: 'pending'
            });

            // Send via provider
            const result = await this.sendViaProvider(
                message.provider,
                formattedPhone,
                {
                    type: 'text',
                    text,
                    replyTo: options.replyTo
                },
                message._id
            );

            // Update message
            message.messageId = result.messageId;
            message.providerMessageId = result.providerMessageId;
            message.providerData = result.providerData;
            message.status = 'sent';
            message.sentAt = new Date();
            await message.save();

            return {
                success: true,
                message,
                conversation
            };
        } catch (error) {
            console.error('Error sending text message:', error);
            throw error;
        }
    }

    /**
     * Send media message (image, video, document, audio)
     */
    async sendMediaMessage(firmId, phoneNumber, type, mediaUrl, options = {}) {
        try {
            const formattedPhone = this.validatePhoneNumber(phoneNumber);

            const conversation = await WhatsAppConversation.getOrCreate(firmId, formattedPhone, {
                leadId: options.leadId,
                clientId: options.clientId
            });

            if (!conversation.isWindowOpen()) {
                throw new Error('24-hour messaging window closed');
            }

            const message = await WhatsAppMessage.create({
                firmId,
                conversationId: conversation._id,
                direction: 'outbound',
                type,
                content: {
                    mediaUrl,
                    caption: options.caption,
                    fileName: options.fileName
                },
                senderPhone: this.getProviderPhoneNumber(),
                recipientPhone: formattedPhone,
                sentBy: options.sentBy,
                provider: options.provider || this.defaultProvider,
                status: 'pending'
            });

            const result = await this.sendViaProvider(
                message.provider,
                formattedPhone,
                {
                    type,
                    mediaUrl,
                    caption: options.caption
                },
                message._id
            );

            message.messageId = result.messageId;
            message.providerMessageId = result.providerMessageId;
            message.status = 'sent';
            message.sentAt = new Date();
            await message.save();

            return {
                success: true,
                message,
                conversation
            };
        } catch (error) {
            console.error('Error sending media message:', error);
            throw error;
        }
    }

    /**
     * Send location message
     */
    async sendLocationMessage(firmId, phoneNumber, latitude, longitude, name, address) {
        try {
            const formattedPhone = this.validatePhoneNumber(phoneNumber);

            const conversation = await WhatsAppConversation.getOrCreate(firmId, formattedPhone);

            if (!conversation.isWindowOpen()) {
                throw new Error('24-hour messaging window closed');
            }

            const message = await WhatsAppMessage.create({
                firmId,
                conversationId: conversation._id,
                direction: 'outbound',
                type: 'location',
                content: {
                    location: { latitude, longitude, name, address }
                },
                senderPhone: this.getProviderPhoneNumber(),
                recipientPhone: formattedPhone,
                provider: this.defaultProvider,
                status: 'pending'
            });

            const result = await this.sendViaProvider(
                message.provider,
                formattedPhone,
                {
                    type: 'location',
                    latitude,
                    longitude,
                    name,
                    address
                },
                message._id
            );

            message.messageId = result.messageId;
            message.status = 'sent';
            message.sentAt = new Date();
            await message.save();

            return { success: true, message };
        } catch (error) {
            console.error('Error sending location message:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PROVIDER-SPECIFIC SENDING LOGIC
    // ═══════════════════════════════════════════════════════════

    async sendViaProvider(provider, phoneNumber, content, messageId) {
        switch (provider) {
            case 'meta':
                return await this.sendViaMeta(phoneNumber, content);
            case 'msg91':
                return await this.sendViaMsg91(phoneNumber, content);
            case 'twilio':
                return await this.sendViaTwilio(phoneNumber, content);
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Send via Meta Cloud API
     */
    async sendViaMeta(phoneNumber, content) {
        const config = this.providers.meta;
        const url = `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`;

        let payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phoneNumber
        };

        if (content.type === 'template') {
            payload.type = 'template';
            payload.template = {
                name: content.template.templateId,
                language: { code: content.template.language },
                components: this.buildMetaTemplateComponents(content.template, content.variables)
            };
        } else if (content.type === 'text') {
            payload.type = 'text';
            payload.text = { body: content.text };

            if (content.replyTo) {
                payload.context = { message_id: content.replyTo };
            }
        } else if (['image', 'video', 'document', 'audio'].includes(content.type)) {
            payload.type = content.type;
            payload[content.type] = {
                link: content.mediaUrl
            };

            if (content.caption) {
                payload[content.type].caption = content.caption;
            }
        } else if (content.type === 'location') {
            payload.type = 'location';
            payload.location = {
                latitude: content.latitude,
                longitude: content.longitude,
                name: content.name,
                address: content.address
            };
        }

        try {
            const response = await axios.post(url, payload, {
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                messageId: response.data.messages[0].id,
                providerMessageId: response.data.messages[0].id,
                providerData: response.data
            };
        } catch (error) {
            console.error('Meta API Error:', error.response?.data || error.message);
            throw new Error(`Meta API Error: ${error.response?.data?.error?.message || error.message}`);
        }
    }

    /**
     * Send via MSG91
     */
    async sendViaMsg91(phoneNumber, content) {
        const config = this.providers.msg91;

        // MSG91 implementation
        // Note: MSG91 has different API structure
        throw new Error('MSG91 integration not yet implemented');
    }

    /**
     * Send via Twilio
     */
    async sendViaTwilio(phoneNumber, content) {
        const config = this.providers.twilio;

        // Twilio implementation
        throw new Error('Twilio integration not yet implemented');
    }

    // ═══════════════════════════════════════════════════════════
    // CONVERSATIONS
    // ═══════════════════════════════════════════════════════════

    async getOrCreateConversation(firmId, phoneNumber, entityData = {}) {
        const formattedPhone = this.validatePhoneNumber(phoneNumber);
        return await WhatsAppConversation.getOrCreate(firmId, formattedPhone, entityData);
    }

    async getConversations(firmId, filters = {}) {
        return await WhatsAppConversation.getActiveConversations(firmId, filters);
    }

    async getMessages(conversationId, pagination = {}) {
        return await WhatsAppMessage.getConversationMessages(conversationId, pagination);
    }

    async markAsRead(conversationId) {
        const conversation = await WhatsAppConversation.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        await conversation.markAsRead();
        return conversation;
    }

    async assignConversation(conversationId, userId) {
        const conversation = await WhatsAppConversation.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        conversation.assignedTo = userId;
        conversation.assignedAt = new Date();
        await conversation.save();

        return conversation;
    }

    // ═══════════════════════════════════════════════════════════
    // TEMPLATES
    // ═══════════════════════════════════════════════════════════

    async createTemplate(firmId, templateData, userId) {
        const template = await WhatsAppTemplate.create({
            ...templateData,
            firmId,
            createdBy: userId,
            status: 'draft'
        });

        return template;
    }

    async getTemplates(firmId, filters = {}) {
        const query = { firmId, isActive: true };

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.category) {
            query.category = filters.category;
        }

        if (filters.useCase) {
            query.useCase = filters.useCase;
        }

        return await WhatsAppTemplate.find(query).sort({ name: 1 });
    }

    async submitTemplateForApproval(templateId, provider = 'meta') {
        const template = await WhatsAppTemplate.findById(templateId);
        if (!template) {
            throw new Error('Template not found');
        }

        // Submit to provider for approval
        // Note: This would call Meta/MSG91 API to submit template
        // For now, we'll just update status

        template.status = 'pending';
        template.submittedAt = new Date();
        await template.save();

        return template;
    }

    // ═══════════════════════════════════════════════════════════
    // WEBHOOKS
    // ═══════════════════════════════════════════════════════════

    /**
     * Handle incoming message webhook
     */
    async handleIncomingMessage(payload, provider = 'meta') {
        try {
            let messageData;

            if (provider === 'meta') {
                messageData = this.parseMetaWebhook(payload);
            } else if (provider === 'msg91') {
                messageData = this.parseMsg91Webhook(payload);
            } else {
                throw new Error(`Unsupported provider: ${provider}`);
            }

            if (!messageData) {
                return { success: false, reason: 'No message data' };
            }

            // Find firm by phone number
            // Note: You'll need to map phone numbers to firms
            const firmId = await this.findFirmByPhoneNumber(messageData.toPhone);

            // Get or create conversation
            const conversation = await WhatsAppConversation.getOrCreate(
                firmId,
                messageData.fromPhone,
                await this.findEntityByPhone(firmId, messageData.fromPhone)
            );

            // Create message record
            const message = await WhatsAppMessage.create({
                firmId,
                conversationId: conversation._id,
                direction: 'inbound',
                type: messageData.type,
                content: messageData.content,
                senderPhone: messageData.fromPhone,
                recipientPhone: messageData.toPhone,
                messageId: messageData.messageId,
                providerMessageId: messageData.messageId,
                provider,
                providerData: payload,
                status: 'delivered',
                timestamp: messageData.timestamp
            });

            // Process auto-reply if configured
            await this.processAutoReply(conversation, message);

            // Track engagement for lead scoring
            if (conversation.leadId) {
                const LeadScoringService = require('./leadScoring.service');
                await LeadScoringService.trackWhatsAppMessage(conversation.leadId);
            }

            return {
                success: true,
                message,
                conversation
            };
        } catch (error) {
            console.error('Error handling incoming message:', error);
            throw error;
        }
    }

    /**
     * Handle status update webhook
     */
    async handleStatusUpdate(payload, provider = 'meta') {
        try {
            let statusData;

            if (provider === 'meta') {
                statusData = this.parseMetaStatusUpdate(payload);
            }

            if (!statusData) {
                return { success: false };
            }

            // Find message by provider message ID
            const message = await WhatsAppMessage.findOne({
                providerMessageId: statusData.messageId
            });

            if (!message) {
                console.warn('Message not found for status update:', statusData.messageId);
                return { success: false };
            }

            // Update message status
            await message.updateStatus(statusData.status, statusData.error);

            return { success: true, message };
        } catch (error) {
            console.error('Error handling status update:', error);
            throw error;
        }
    }

    /**
     * Verify webhook (for Meta)
     */
    verifyWebhook(mode, token, challenge) {
        const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'traf3li_whatsapp_2024';

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            return challenge;
        }

        throw new Error('Webhook verification failed');
    }

    // ═══════════════════════════════════════════════════════════
    // AUTO-REPLIES
    // ═══════════════════════════════════════════════════════════

    async setupAutoReply(firmId, config) {
        // Store auto-reply configuration
        // This would be stored in a separate AutoReplyConfig model
        // For now, simplified version
        return { success: true };
    }

    async processAutoReply(conversation, incomingMessage) {
        // Check if auto-reply is enabled and not already sent
        if (conversation.automation?.autoReplySent) {
            return;
        }

        // Send auto-reply template
        const autoReplyTemplate = await WhatsAppTemplate.findOne({
            firmId: conversation.firmId,
            useCase: 'welcome_message',
            status: 'approved',
            isActive: true
        });

        if (autoReplyTemplate) {
            try {
                await this.sendTemplateMessage(
                    conversation.firmId,
                    conversation.phoneNumber,
                    autoReplyTemplate.name,
                    {},
                    {
                        leadId: conversation.leadId,
                        clientId: conversation.clientId
                    }
                );

                conversation.automation = conversation.automation || {};
                conversation.automation.autoReplySent = true;
                conversation.automation.autoReplyAt = new Date();
                await conversation.save();
            } catch (error) {
                console.error('Error sending auto-reply:', error);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // LEAD/CLIENT INTEGRATION
    // ═══════════════════════════════════════════════════════════

    async linkToLead(conversationId, leadId) {
        const conversation = await WhatsAppConversation.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const lead = await Lead.findById(leadId);
        if (!lead) {
            throw new Error('Lead not found');
        }

        conversation.leadId = leadId;
        conversation.contactName = lead.displayName;
        conversation.contactType = 'lead';
        await conversation.save();

        return conversation;
    }

    async getLeadConversation(leadId) {
        const lead = await Lead.findById(leadId);
        if (!lead) {
            throw new Error('Lead not found');
        }

        const phoneNumber = this.validatePhoneNumber(lead.whatsapp || lead.phone);

        return await WhatsAppConversation.findOne({
            firmId: lead.firmId,
            phoneNumber,
            leadId
        }).populate('leadId');
    }

    async createLeadFromConversation(conversationId, leadData, userId) {
        const conversation = await WhatsAppConversation.findById(conversationId);
        if (!conversation) {
            throw new Error('Conversation not found');
        }

        // Create lead
        const lead = await Lead.create({
            ...leadData,
            firmId: conversation.firmId,
            lawyerId: userId,
            phone: conversation.phoneNumber,
            whatsapp: conversation.phoneNumber,
            source: {
                type: 'whatsapp',
                notes: 'Created from WhatsApp conversation'
            },
            createdBy: userId
        });

        // Link conversation to lead
        conversation.leadId = lead._id;
        conversation.contactType = 'lead';
        await conversation.save();

        return lead;
    }

    // ═══════════════════════════════════════════════════════════
    // ANALYTICS
    // ═══════════════════════════════════════════════════════════

    async getMessageStats(firmId, dateRange = {}) {
        return await WhatsAppMessage.getStats(firmId, dateRange);
    }

    async getResponseTimes(firmId) {
        const conversations = await WhatsAppConversation.find({ firmId });

        const responseTimes = conversations
            .filter(c => c.metrics?.avgResponseTime)
            .map(c => c.metrics.avgResponseTime);

        if (responseTimes.length === 0) {
            return { avg: 0, min: 0, max: 0 };
        }

        return {
            avg: responseTimes.reduce((a, b) => a + b) / responseTimes.length,
            min: Math.min(...responseTimes),
            max: Math.max(...responseTimes)
        };
    }

    async getTemplatePerformance(firmId) {
        return await WhatsAppTemplate.getAnalytics(firmId);
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    validatePhoneNumber(phone) {
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');

        // Saudi Arabia format: +966XXXXXXXXX
        if (cleaned.startsWith('966')) {
            return cleaned;
        }

        if (cleaned.startsWith('0')) {
            return '966' + cleaned.substring(1);
        }

        if (cleaned.startsWith('5')) {
            return '966' + cleaned;
        }

        // If already has country code
        if (cleaned.length >= 12) {
            return cleaned;
        }

        throw new Error('Invalid phone number format. Expected Saudi format: +966XXXXXXXXX');
    }

    getProviderPhoneNumber(provider = null) {
        provider = provider || this.defaultProvider;

        if (provider === 'meta') {
            return this.providers.meta.phoneNumberId;
        } else if (provider === 'msg91') {
            return this.providers.msg91.senderId;
        } else if (provider === 'twilio') {
            return this.providers.twilio.phoneNumber;
        }

        return 'unknown';
    }

    buildMetaTemplateComponents(template, variables) {
        const components = [];

        // Header component
        if (template.header?.type !== 'none' && template.header?.content) {
            components.push({
                type: 'header',
                parameters: [
                    template.header.type === 'text'
                        ? { type: 'text', text: template.header.content }
                        : { type: template.header.type, [template.header.type]: { link: template.header.mediaUrl } }
                ]
            });
        }

        // Body component (with variables)
        if (template.body?.variables?.length > 0) {
            components.push({
                type: 'body',
                parameters: template.body.variables.map((variable, index) => ({
                    type: 'text',
                    text: String(variables[variable.name] || variable.example || '')
                }))
            });
        }

        return components;
    }

    parseMetaWebhook(payload) {
        try {
            const entry = payload.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const message = value?.messages?.[0];

            if (!message) {
                return null;
            }

            const messageData = {
                messageId: message.id,
                fromPhone: message.from,
                toPhone: value.metadata.display_phone_number,
                type: message.type,
                timestamp: new Date(parseInt(message.timestamp) * 1000),
                content: {}
            };

            // Parse content based on type
            switch (message.type) {
                case 'text':
                    messageData.content.text = message.text.body;
                    break;
                case 'image':
                case 'video':
                case 'document':
                case 'audio':
                    messageData.content.mediaId = message[message.type].id;
                    messageData.content.mimeType = message[message.type].mime_type;
                    messageData.content.caption = message[message.type].caption;
                    break;
                case 'location':
                    messageData.content.location = message.location;
                    break;
                case 'contact':
                    messageData.content.contact = message.contact;
                    break;
            }

            return messageData;
        } catch (error) {
            console.error('Error parsing Meta webhook:', error);
            return null;
        }
    }

    parseMetaStatusUpdate(payload) {
        try {
            const entry = payload.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const status = value?.statuses?.[0];

            if (!status) {
                return null;
            }

            return {
                messageId: status.id,
                status: status.status, // sent, delivered, read, failed
                timestamp: new Date(parseInt(status.timestamp) * 1000),
                error: status.errors?.[0]
            };
        } catch (error) {
            console.error('Error parsing Meta status update:', error);
            return null;
        }
    }

    parseMsg91Webhook(payload) {
        // MSG91 webhook parsing
        // Implement based on MSG91 webhook format
        return null;
    }

    async findFirmByPhoneNumber(phoneNumber) {
        // Implementation depends on your firm-phone mapping
        // For now, return a default firm or look up from config
        const Firm = require('../models/firm.model');
        const firm = await Firm.findOne(); // Get first firm (you should improve this)
        return firm?._id;
    }

    async findEntityByPhone(firmId, phoneNumber) {
        // Try to find existing lead or client by phone number
        const lead = await Lead.findOne({
            firmId,
            $or: [
                { phone: { $regex: phoneNumber.substring(phoneNumber.length - 9) } },
                { whatsapp: { $regex: phoneNumber.substring(phoneNumber.length - 9) } }
            ]
        });

        if (lead) {
            return {
                leadId: lead._id,
                contactName: lead.displayName,
                contactType: 'lead'
            };
        }

        const client = await Client.findOne({
            firmId,
            $or: [
                { phone: { $regex: phoneNumber.substring(phoneNumber.length - 9) } },
                { whatsapp: { $regex: phoneNumber.substring(phoneNumber.length - 9) } }
            ]
        });

        if (client) {
            return {
                clientId: client._id,
                contactName: client.firstName + ' ' + client.lastName,
                contactType: 'client'
            };
        }

        return { contactType: 'unknown' };
    }
}

module.exports = new WhatsAppService();
