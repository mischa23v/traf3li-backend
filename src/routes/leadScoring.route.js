const express = require('express');
const router = express.Router();
const leadScoringController = require('../controllers/leadScoring.controller');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roleAuth');

// ═══════════════════════════════════════════════════════════════
// LEAD SCORING ROUTES
// ═══════════════════════════════════════════════════════════════

// All routes require authentication
router.use(protect);

// ───────────────────────────────────────────────────────────────
// CONFIGURATION
// ───────────────────────────────────────────────────────────────
router.route('/config')
    .get(leadScoringController.getConfig)
    .put(restrictTo('admin', 'owner'), leadScoringController.updateConfig);

// ───────────────────────────────────────────────────────────────
// SCORE CALCULATION
// ───────────────────────────────────────────────────────────────
router.post('/calculate/:leadId', leadScoringController.calculateScore);
router.post('/calculate-all', restrictTo('admin', 'owner'), leadScoringController.calculateAllScores);
router.post('/calculate-batch', leadScoringController.calculateBatch);

// ───────────────────────────────────────────────────────────────
// REPORTING & ANALYTICS
// ───────────────────────────────────────────────────────────────
router.get('/distribution', leadScoringController.getScoreDistribution);
router.get('/top-leads', leadScoringController.getTopLeads);
router.get('/by-grade/:grade', leadScoringController.getLeadsByGrade);
router.get('/insights/:leadId', leadScoringController.getLeadInsights);
router.get('/trends', leadScoringController.getScoreTrends);
router.get('/conversion-analysis', leadScoringController.getConversionAnalysis);

// ───────────────────────────────────────────────────────────────
// BEHAVIORAL TRACKING (Some endpoints are public for webhooks)
// ───────────────────────────────────────────────────────────────

// Public tracking endpoints (for webhooks/integrations)
// Note: In production, these should be secured with API keys or tokens
router.post('/track/email-open', leadScoringController.trackEmailOpen);
router.post('/track/email-click', leadScoringController.trackEmailClick);
router.post('/track/document-view', leadScoringController.trackDocumentView);
router.post('/track/website-visit', leadScoringController.trackWebsiteVisit);
router.post('/track/form-submit', leadScoringController.trackFormSubmit);

// Protected tracking endpoints
router.post('/track/meeting', leadScoringController.trackMeeting);
router.post('/track/call', leadScoringController.trackCall);

// ───────────────────────────────────────────────────────────────
// DECAY MANAGEMENT
// ───────────────────────────────────────────────────────────────
router.post('/process-decay', restrictTo('admin', 'owner'), leadScoringController.processDecay);

module.exports = router;
