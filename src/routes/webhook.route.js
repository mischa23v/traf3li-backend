/**
 * Webhook Routes
 *
 * Webhook management API routes for third-party integrations.
 * Allows firms to register webhooks for various events and manage deliveries.
 *
 * Base route: /api/webhooks
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
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
} = require('../controllers/webhook.controller');

const router = express.Router();

// ============ APPLY MIDDLEWARE ============
// All webhook routes require authentication
router.use(userMiddleware);

// ============ INFORMATIONAL ENDPOINTS ============
// These should come before /:id routes to avoid conflicts

// Get webhook statistics
router.get('/stats', getWebhookStats);

// Get available webhook events
router.get('/events', getAvailableEvents);

// ============ CRUD OPERATIONS ============

// Register a new webhook
router.post('/', registerWebhook);

// Get all webhooks for the firm
router.get('/', getWebhooks);

// Get single webhook by ID
router.get('/:id', getWebhook);

// Update webhook
router.put('/:id', updateWebhook);

// Also support PATCH for partial updates
router.patch('/:id', updateWebhook);

// Delete webhook
router.delete('/:id', deleteWebhook);

// ============ WEBHOOK ACTIONS ============

// Test webhook - send test event
router.post('/:id/test', testWebhook);

// Enable webhook
router.post('/:id/enable', enableWebhook);

// Disable webhook
router.post('/:id/disable', disableWebhook);

// Get webhook secret (should be restricted to admins)
router.get('/:id/secret', getWebhookSecret);

// Regenerate webhook secret
router.post('/:id/regenerate-secret', regenerateSecret);

// ============ DELIVERY MANAGEMENT ============

// Get webhook deliveries (history)
router.get('/:id/deliveries', getWebhookDeliveries);

// Get single delivery details
router.get('/:id/deliveries/:deliveryId', getDeliveryDetails);

// Retry failed delivery
router.post('/:id/deliveries/:deliveryId/retry', retryDelivery);

module.exports = router;
