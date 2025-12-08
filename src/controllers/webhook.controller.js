const Webhook = require('../models/webhook.model');
const WebhookDelivery = require('../models/webhookDelivery.model');
const webhookService = require('../services/webhook.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Register a new webhook
 * POST /api/webhooks
 */
const registerWebhook = asyncHandler(async (req, res) => {
    const { url, events, name, description, headers, retryPolicy, filters, metadata } = req.body;

    const userId = req.userID;
    const firmId = req.firmId;

    // Validate required fields
    if (!url) {
        throw CustomException('Webhook URL is required', 400);
    }

    if (!events || events.length === 0) {
        throw CustomException('At least one event subscription is required', 400);
    }

    // Validate events
    const { WEBHOOK_EVENTS } = require('../models/webhook.model');
    const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));

    if (invalidEvents.length > 0) {
        throw CustomException(`Invalid event types: ${invalidEvents.join(', ')}`, 400);
    }

    // Register webhook
    const webhook = await webhookService.register({
        url,
        events,
        firmId,
        createdBy: userId,
        name,
        description,
        headers,
        retryPolicy,
        filters,
        metadata
    });

    // Don't return secret in response
    const webhookResponse = webhook.toObject();
    delete webhookResponse.secret;

    res.status(201).json({
        success: true,
        message: 'Webhook registered successfully',
        data: webhookResponse
    });
});

/**
 * Get all webhooks for a firm
 * GET /api/webhooks
 */
const getWebhooks = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        status,
        event,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const firmId = req.firmId;

    // Build query
    const query = { firmId };

    if (status !== undefined) {
        query.isActive = status === 'active';
    }

    if (event) {
        query.events = event;
    }

    // Execute query
    const webhooks = await Webhook.find(query)
        .select('-secret') // Don't return secrets
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    const total = await Webhook.countDocuments(query);

    res.json({
        success: true,
        data: webhooks,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single webhook by ID
 * GET /api/webhooks/:id
 */
const getWebhook = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const webhook = await Webhook.findOne({ _id: id, firmId })
        .select('-secret') // Don't return secret
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    res.json({
        success: true,
        data: webhook
    });
});

/**
 * Update webhook
 * PUT /api/webhooks/:id
 */
const updateWebhook = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    const { url, events, name, description, headers, retryPolicy, filters, isActive, metadata } = req.body;

    // Find webhook
    const webhook = await Webhook.findOne({ _id: id, firmId });

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    // Validate events if provided
    if (events) {
        const { WEBHOOK_EVENTS } = require('../models/webhook.model');
        const invalidEvents = events.filter(e => !WEBHOOK_EVENTS.includes(e));

        if (invalidEvents.length > 0) {
            throw CustomException(`Invalid event types: ${invalidEvents.join(', ')}`, 400);
        }
        webhook.events = events;
    }

    // Update fields
    if (url) webhook.url = url;
    if (name !== undefined) webhook.name = name;
    if (description !== undefined) webhook.description = description;
    if (headers !== undefined) webhook.headers = headers;
    if (retryPolicy !== undefined) webhook.retryPolicy = retryPolicy;
    if (filters !== undefined) webhook.filters = filters;
    if (isActive !== undefined) webhook.isActive = isActive;
    if (metadata !== undefined) webhook.metadata = metadata;

    webhook.updatedBy = userId;

    await webhook.save();

    // Don't return secret
    const webhookResponse = webhook.toObject();
    delete webhookResponse.secret;

    res.json({
        success: true,
        message: 'Webhook updated successfully',
        data: webhookResponse
    });
});

/**
 * Delete webhook
 * DELETE /api/webhooks/:id
 */
const deleteWebhook = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    const webhook = await Webhook.findOneAndDelete({ _id: id, firmId });

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    res.json({
        success: true,
        message: 'Webhook deleted successfully'
    });
});

/**
 * Get webhook deliveries (history)
 * GET /api/webhooks/:id/deliveries
 */
const getWebhookDeliveries = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        page = 1,
        limit = 50,
        status,
        event
    } = req.query;

    const firmId = req.firmId;

    // Verify webhook belongs to firm
    const webhook = await Webhook.findOne({ _id: id, firmId });

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    // Get deliveries
    const result = await webhookService.getDeliveryHistory(id, {
        page,
        limit,
        status,
        event
    });

    res.json({
        success: true,
        data: result.deliveries,
        pagination: result.pagination
    });
});

/**
 * Get single delivery details
 * GET /api/webhooks/:id/deliveries/:deliveryId
 */
const getDeliveryDetails = asyncHandler(async (req, res) => {
    const { id, deliveryId } = req.params;
    const firmId = req.firmId;

    // Verify webhook belongs to firm
    const webhook = await Webhook.findOne({ _id: id, firmId });

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    // Get delivery
    const delivery = await WebhookDelivery.findOne({
        _id: deliveryId,
        webhookId: id
    });

    if (!delivery) {
        throw CustomException('Delivery not found', 404);
    }

    res.json({
        success: true,
        data: delivery
    });
});

/**
 * Test webhook - send test event
 * POST /api/webhooks/:id/test
 */
const testWebhook = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Verify webhook belongs to firm
    const webhook = await Webhook.findOne({ _id: id, firmId });

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    // Send test delivery
    const delivery = await webhookService.testWebhook(id, req.body);

    res.json({
        success: true,
        message: 'Test webhook sent',
        data: {
            deliveryId: delivery._id,
            status: delivery.status,
            url: webhook.url
        }
    });
});

/**
 * Retry failed delivery
 * POST /api/webhooks/:id/deliveries/:deliveryId/retry
 */
const retryDelivery = asyncHandler(async (req, res) => {
    const { id, deliveryId } = req.params;
    const firmId = req.firmId;

    // Verify webhook belongs to firm
    const webhook = await Webhook.findOne({ _id: id, firmId }).select('+secret');

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    // Get delivery
    const delivery = await WebhookDelivery.findOne({
        _id: deliveryId,
        webhookId: id
    });

    if (!delivery) {
        throw CustomException('Delivery not found', 404);
    }

    if (!delivery.canRetry) {
        throw CustomException('Delivery cannot be retried (max attempts reached or already successful)', 400);
    }

    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': delivery.signature,
        'X-Webhook-Event': delivery.event,
        'X-Webhook-ID': webhook._id.toString(),
        'X-Webhook-Timestamp': new Date().toISOString(),
        'X-Webhook-Retry': delivery.currentAttempt + 1,
        'User-Agent': 'Traf3li-Webhook/1.0'
    };

    // Add custom headers
    if (webhook.headers) {
        webhook.headers.forEach((value, key) => {
            headers[key] = value;
        });
    }

    // Attempt delivery
    await webhookService.attemptDelivery(delivery, webhook, headers, delivery.payload);

    // Reload delivery to get updated status
    await delivery.reload();

    res.json({
        success: true,
        message: 'Delivery retry initiated',
        data: delivery.getSummary()
    });
});

/**
 * Enable webhook
 * POST /api/webhooks/:id/enable
 */
const enableWebhook = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    const webhook = await Webhook.findOne({ _id: id, firmId });

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    await webhook.enable(userId);

    res.json({
        success: true,
        message: 'Webhook enabled successfully',
        data: webhook
    });
});

/**
 * Disable webhook
 * POST /api/webhooks/:id/disable
 */
const disableWebhook = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const firmId = req.firmId;
    const userId = req.userID;

    const webhook = await Webhook.findOne({ _id: id, firmId });

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    await webhook.disable(reason || 'Manually disabled', userId);

    res.json({
        success: true,
        message: 'Webhook disabled successfully',
        data: webhook
    });
});

/**
 * Get webhook statistics
 * GET /api/webhooks/stats
 */
const getWebhookStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const stats = await webhookService.getStats(firmId);

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Get available webhook events
 * GET /api/webhooks/events
 */
const getAvailableEvents = asyncHandler(async (req, res) => {
    const { WEBHOOK_EVENTS } = require('../models/webhook.model');

    // Group events by category
    const eventsByCategory = WEBHOOK_EVENTS.reduce((acc, event) => {
        const [category] = event.split('.');
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(event);
        return acc;
    }, {});

    res.json({
        success: true,
        data: {
            events: WEBHOOK_EVENTS,
            categories: eventsByCategory
        }
    });
});

/**
 * Get webhook secret (requires additional authentication/authorization)
 * GET /api/webhooks/:id/secret
 */
const getWebhookSecret = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // This should be restricted to admins only
    const webhook = await Webhook.findOne({ _id: id, firmId }).select('+secret');

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    res.json({
        success: true,
        data: {
            webhookId: webhook._id,
            secret: webhook.secret
        }
    });
});

/**
 * Regenerate webhook secret
 * POST /api/webhooks/:id/regenerate-secret
 */
const regenerateSecret = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const userId = req.userID;

    const webhook = await Webhook.findOne({ _id: id, firmId }).select('+secret');

    if (!webhook) {
        throw CustomException('Webhook not found', 404);
    }

    // Generate new secret
    webhook.secret = webhookService.generateSecret();
    webhook.updatedBy = userId;

    await webhook.save();

    res.json({
        success: true,
        message: 'Webhook secret regenerated successfully',
        data: {
            webhookId: webhook._id,
            secret: webhook.secret
        }
    });
});

module.exports = {
    registerWebhook,
    getWebhooks,
    getWebhook,
    updateWebhook,
    deleteWebhook,
    getWebhookDeliveries,
    getDeliveryDetails,
    testWebhook,
    retryDelivery,
    enableWebhook,
    disableWebhook,
    getWebhookStats,
    getAvailableEvents,
    getWebhookSecret,
    regenerateSecret
};
