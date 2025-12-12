const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// ═══════════════════════════════════════════════════════════════
// WHATSAPP ROUTES
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// WEBHOOKS (Public endpoints)
// ───────────────────────────────────────────────────────────────
router.route('/webhooks/whatsapp')
    .get(whatsappController.verifyWebhook)  // Webhook verification
    .post(whatsappController.receiveWebhook); // Receive messages/status updates

// All other routes require authentication and firm context
router.use(userMiddleware, firmFilter);

// ───────────────────────────────────────────────────────────────
// MESSAGE SENDING
// ───────────────────────────────────────────────────────────────
router.post('/send/template', whatsappController.sendTemplate);
router.post('/send/text', whatsappController.sendText);
router.post('/send/media', whatsappController.sendMedia);
router.post('/send/location', whatsappController.sendLocation);

// Unified message sending endpoint (for frontend compatibility)
router.post('/messages/send', whatsappController.sendMessage);

// ───────────────────────────────────────────────────────────────
// CONVERSATIONS
// ───────────────────────────────────────────────────────────────
router.route('/conversations')
    .get(whatsappController.getConversations);

router.route('/conversations/:id')
    .get(whatsappController.getConversation);

router.get('/conversations/:id/messages', whatsappController.getMessages);
router.post('/conversations/:id/read', whatsappController.markAsRead);
router.put('/conversations/:id/assign', whatsappController.assignConversation);
router.post('/conversations/:id/link-lead', whatsappController.linkToLead);
router.post('/conversations/:id/create-lead', whatsappController.createLeadFromConversation);

// ───────────────────────────────────────────────────────────────
// TEMPLATES
// ───────────────────────────────────────────────────────────────
router.route('/templates')
    .get(whatsappController.getTemplates)
    .post(whatsappController.createTemplate);

router.post('/templates/:id/submit', whatsappController.submitTemplate);

// ───────────────────────────────────────────────────────────────
// ANALYTICS
// ───────────────────────────────────────────────────────────────
router.get('/analytics', whatsappController.getAnalytics);
router.get('/stats', whatsappController.getStats);

// ───────────────────────────────────────────────────────────────
// BROADCASTS
// ───────────────────────────────────────────────────────────────
router.get('/broadcasts/stats', whatsappController.getBroadcastStats); // Must be before :id routes

router.route('/broadcasts')
    .get(whatsappController.getBroadcasts)
    .post(whatsappController.createBroadcast);

router.route('/broadcasts/:id')
    .get(whatsappController.getBroadcast)
    .put(whatsappController.updateBroadcast)
    .delete(whatsappController.deleteBroadcast);

router.post('/broadcasts/:id/duplicate', whatsappController.duplicateBroadcast);
router.post('/broadcasts/:id/recipients', whatsappController.addRecipients);
router.delete('/broadcasts/:id/recipients', whatsappController.removeRecipients);
router.post('/broadcasts/:id/schedule', whatsappController.scheduleBroadcast);
router.post('/broadcasts/:id/send', whatsappController.sendBroadcast);
router.post('/broadcasts/:id/pause', whatsappController.pauseBroadcast);
router.post('/broadcasts/:id/resume', whatsappController.resumeBroadcast);
router.post('/broadcasts/:id/cancel', whatsappController.cancelBroadcast);
router.get('/broadcasts/:id/analytics', whatsappController.getBroadcastAnalytics);
router.post('/broadcasts/:id/test', whatsappController.testBroadcast);

module.exports = router;
