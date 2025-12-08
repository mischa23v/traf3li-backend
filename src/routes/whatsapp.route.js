const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsapp.controller');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleAuth');

// ═══════════════════════════════════════════════════════════════
// WHATSAPP ROUTES
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// WEBHOOKS (Public endpoints)
// ───────────────────────────────────────────────────────────────
router.route('/webhooks/whatsapp')
    .get(whatsappController.verifyWebhook)  // Webhook verification
    .post(whatsappController.receiveWebhook); // Receive messages/status updates

// All other routes require authentication
router.use(protect);

// ───────────────────────────────────────────────────────────────
// MESSAGE SENDING
// ───────────────────────────────────────────────────────────────
router.post('/send/template', whatsappController.sendTemplate);
router.post('/send/text', whatsappController.sendText);
router.post('/send/media', whatsappController.sendMedia);
router.post('/send/location', whatsappController.sendLocation);

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

module.exports = router;
