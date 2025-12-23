const express = require('express');
const router = express.Router();
const emailMarketingController = require('../controllers/emailMarketing.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// ============================================
// EMAIL MARKETING ROUTES
// ============================================

// Apply authentication and firm filter to all protected routes
router.use('/campaigns', userMiddleware, firmFilter);
router.use('/templates', userMiddleware, firmFilter);
router.use('/subscribers', userMiddleware, firmFilter);
router.use('/segments', userMiddleware, firmFilter);
router.use('/analytics', userMiddleware, firmFilter);

// ==================== CAMPAIGNS ====================

// Campaign CRUD
router.post('/campaigns', emailMarketingController.createCampaign);
router.get('/campaigns', emailMarketingController.getCampaigns);
router.get('/campaigns/:id', emailMarketingController.getCampaign);
router.put('/campaigns/:id', emailMarketingController.updateCampaign);
router.delete('/campaigns/:id', emailMarketingController.deleteCampaign);

// Campaign Actions
router.post('/campaigns/:id/duplicate', emailMarketingController.duplicateCampaign);
router.post('/campaigns/:id/schedule', emailMarketingController.scheduleCampaign);
router.post('/campaigns/:id/send', emailMarketingController.sendCampaign);
router.post('/campaigns/:id/pause', emailMarketingController.pauseCampaign);
router.post('/campaigns/:id/resume', emailMarketingController.resumeCampaign);
router.post('/campaigns/:id/cancel', emailMarketingController.cancelCampaign);
router.post('/campaigns/:id/test', emailMarketingController.sendTestEmail);

// Campaign Analytics
router.get('/campaigns/:id/analytics', emailMarketingController.getCampaignAnalytics);

// ==================== TEMPLATES ====================

// Template CRUD
router.post('/templates', emailMarketingController.createTemplate);
router.get('/templates', emailMarketingController.getTemplates);
router.get('/templates/public', emailMarketingController.getPublicTemplates);
router.get('/templates/:id', emailMarketingController.getTemplate);
router.put('/templates/:id', emailMarketingController.updateTemplate);
router.delete('/templates/:id', emailMarketingController.deleteTemplate);

// Template Actions
router.post('/templates/:id/preview', emailMarketingController.previewTemplate);

// ==================== SUBSCRIBERS ====================

// Subscriber CRUD
router.post('/subscribers', emailMarketingController.createSubscriber);
router.get('/subscribers', emailMarketingController.getSubscribers);
router.put('/subscribers/:id', emailMarketingController.updateSubscriber);
router.delete('/subscribers/:id', emailMarketingController.deleteSubscriber);

// Subscriber Actions
router.post('/subscribers/import', emailMarketingController.importSubscribers);
router.post('/subscribers/export', emailMarketingController.exportSubscribers);
router.post('/subscribers/:id/unsubscribe', emailMarketingController.unsubscribe);

// ==================== SEGMENTS ====================

// Segment CRUD
router.post('/segments', emailMarketingController.createSegment);
router.get('/segments', emailMarketingController.getSegments);
router.get('/segments/:id', emailMarketingController.getSegment);
router.put('/segments/:id', emailMarketingController.updateSegment);
router.delete('/segments/:id', emailMarketingController.deleteSegment);

// Segment Actions
router.get('/segments/:id/subscribers', emailMarketingController.getSegmentSubscribers);
router.post('/segments/:id/refresh', emailMarketingController.refreshSegment);

// ==================== ANALYTICS ====================

router.get('/analytics/overview', emailMarketingController.getOverviewAnalytics);
router.get('/analytics/trends', emailMarketingController.getTrendsAnalytics);

// ==================== WEBHOOKS (PUBLIC) ====================

// Public webhook endpoints - NO authentication required
router.post('/webhooks/email/resend', emailMarketingController.handleResendWebhook);
router.get('/webhooks/email/track/open/:trackingId', emailMarketingController.trackOpen);
router.get('/webhooks/email/unsubscribe/:email', emailMarketingController.handleUnsubscribe);

module.exports = router;
