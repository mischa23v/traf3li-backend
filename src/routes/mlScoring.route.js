const express = require('express');
const router = express.Router();
const mlScoringController = require('../controllers/mlScoring.controller');
const { userMiddleware, firmAdminOnly } = require('../middlewares');
const {
    validateGetScoresQuery,
    validateLeadIdParam,
    validateBatchCalculate,
    validateRecordContact,
    validateAssignLead,
    validatePriorityQueueQuery,
    validateDashboardQuery,
    validateTrainModel,
    validateExportTrainingData
} = require('../validators/mlScoring.validator');

// ═══════════════════════════════════════════════════════════════
// ML LEAD SCORING ROUTES
// Machine Learning-enhanced lead scoring with priority queuing
// ═══════════════════════════════════════════════════════════════

// All routes require authentication
router.use(userMiddleware);

// ───────────────────────────────────────────────────────────────
// SCORE ENDPOINTS
// ───────────────────────────────────────────────────────────────

router.get('/scores', validateGetScoresQuery, mlScoringController.getScores);

router.get('/scores/:leadId', validateLeadIdParam, mlScoringController.getScore);

router.post('/scores/:leadId/calculate', validateLeadIdParam, mlScoringController.calculateScore);

router.post('/scores/batch', validateBatchCalculate, mlScoringController.calculateBatch);

router.get('/scores/:leadId/explanation', validateLeadIdParam, mlScoringController.getExplanation);

router.get('/scores/:leadId/hybrid', validateLeadIdParam, mlScoringController.getHybridScore);

// ───────────────────────────────────────────────────────────────
// TRAINING ENDPOINTS (Admin Only)
// ───────────────────────────────────────────────────────────────

router.post('/train', firmAdminOnly, validateTrainModel, mlScoringController.trainModel);

router.get('/model/metrics', firmAdminOnly, mlScoringController.getModelMetrics);

router.post('/model/export', firmAdminOnly, validateExportTrainingData, mlScoringController.exportTrainingData);

// ───────────────────────────────────────────────────────────────
// PRIORITY QUEUE ENDPOINTS
// ───────────────────────────────────────────────────────────────

router.get('/priority-queue', validatePriorityQueueQuery, mlScoringController.getPriorityQueue);

router.get('/priority-queue/workload', mlScoringController.getWorkload);

router.post('/priority/:leadId/contact', validateLeadIdParam, validateRecordContact, mlScoringController.recordContact);

router.put('/priority/:leadId/assign', validateLeadIdParam, validateAssignLead, mlScoringController.assignLead);

router.get('/sla/metrics', mlScoringController.getSLAMetrics);

router.get('/sla/breaches', mlScoringController.getSLABreaches);

// ───────────────────────────────────────────────────────────────
// ANALYTICS ENDPOINTS
// ───────────────────────────────────────────────────────────────

router.get('/analytics/dashboard', validateDashboardQuery, mlScoringController.getDashboard);

router.get('/analytics/feature-importance', mlScoringController.getFeatureImportance);

router.get('/analytics/score-distribution', mlScoringController.getScoreDistribution);

module.exports = router;
