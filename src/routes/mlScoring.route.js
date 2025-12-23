const express = require('express');
const router = express.Router();
const mlScoringController = require('../controllers/mlScoring.controller');
const { userMiddleware, firmFilter, firmAdminOnly } = require('../middlewares');
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

// All routes require authentication and firm context
router.use(userMiddleware, firmFilter);

// ───────────────────────────────────────────────────────────────
// SCORE ENDPOINTS
// ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/ml/scores:
 *   get:
 *     summary: Get ML scores for leads
 *     description: Retrieve ML-calculated scores for all leads with pagination and filtering
 *     tags: [ML Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of results per page
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         description: Minimum ML score filter
 *       - in: query
 *         name: maxScore
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *         description: Maximum ML score filter
 *     responses:
 *       200:
 *         description: ML scores retrieved successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/scores', validateGetScoresQuery, mlScoringController.getScores);

/**
 * @swagger
 * /api/ml/scores/{leadId}:
 *   get:
 *     summary: Get ML score for specific lead
 *     description: Retrieve the ML-calculated score for a specific lead
 *     tags: [ML Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: ML score retrieved successfully
 *       400:
 *         description: Invalid lead ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.get('/scores/:leadId', validateLeadIdParam, mlScoringController.getScore);

/**
 * @swagger
 * /api/ml/scores/{leadId}/calculate:
 *   post:
 *     summary: Calculate/refresh ML score for lead
 *     description: Trigger ML score calculation or refresh for a specific lead
 *     tags: [ML Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: ML score calculation initiated
 *       400:
 *         description: Invalid lead ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.post('/scores/:leadId/calculate', validateLeadIdParam, mlScoringController.calculateScore);

/**
 * @swagger
 * /api/ml/scores/batch:
 *   post:
 *     summary: Batch calculate scores
 *     description: Calculate ML scores for multiple leads at once
 *     tags: [ML Scoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadIds
 *             properties:
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of lead IDs to calculate scores for
 *     responses:
 *       200:
 *         description: Batch calculation initiated
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to one or more leads
 */
router.post('/scores/batch', validateBatchCalculate, mlScoringController.calculateBatch);

/**
 * @swagger
 * /api/ml/scores/{leadId}/explanation:
 *   get:
 *     summary: Get SHAP explanation for ML score
 *     description: Retrieve SHAP (SHapley Additive exPlanations) values explaining the ML score
 *     tags: [ML Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: SHAP explanation retrieved successfully
 *       400:
 *         description: Invalid lead ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.get('/scores/:leadId/explanation', validateLeadIdParam, mlScoringController.getExplanation);

/**
 * @swagger
 * /api/ml/scores/{leadId}/hybrid:
 *   get:
 *     summary: Get hybrid ML + rules score
 *     description: Retrieve combined score from ML model and rule-based scoring
 *     tags: [ML Scoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Hybrid score retrieved successfully
 *       400:
 *         description: Invalid lead ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.get('/scores/:leadId/hybrid', validateLeadIdParam, mlScoringController.getHybridScore);

// ───────────────────────────────────────────────────────────────
// TRAINING ENDPOINTS (Admin Only)
// ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/ml/train:
 *   post:
 *     summary: Train ML model
 *     description: Initiate ML model training with firm's historical data (Admin only)
 *     tags: [ML Scoring - Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               algorithm:
 *                 type: string
 *                 enum: [random_forest, gradient_boosting, neural_network, auto]
 *                 default: auto
 *               testSize:
 *                 type: number
 *                 minimum: 0.1
 *                 maximum: 0.5
 *                 default: 0.2
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               hyperparameters:
 *                 type: object
 *     responses:
 *       200:
 *         description: Model training initiated
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/train', firmAdminOnly, validateTrainModel, mlScoringController.trainModel);

/**
 * @swagger
 * /api/ml/model/metrics:
 *   get:
 *     summary: Get model performance metrics
 *     description: Retrieve performance metrics for the current ML model (Admin only)
 *     tags: [ML Scoring - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Model metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/model/metrics', firmAdminOnly, mlScoringController.getModelMetrics);

/**
 * @swagger
 * /api/ml/model/export:
 *   post:
 *     summary: Export training data
 *     description: Export historical lead data for model training or analysis (Admin only)
 *     tags: [ML Scoring - Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [csv, json, excel]
 *                 default: csv
 *               includeFeatures:
 *                 type: boolean
 *                 default: true
 *               includeLabels:
 *                 type: boolean
 *                 default: true
 *               dateFrom:
 *                 type: string
 *                 format: date
 *               dateTo:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Export initiated
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.post('/model/export', firmAdminOnly, validateExportTrainingData, mlScoringController.exportTrainingData);

// ───────────────────────────────────────────────────────────────
// PRIORITY QUEUE ENDPOINTS
// ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/ml/priority-queue:
 *   get:
 *     summary: Get prioritized leads for sales rep
 *     description: Retrieve leads prioritized by ML score and SLA urgency
 *     tags: [ML Scoring - Priority Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of leads to retrieve
 *       - in: query
 *         name: filterBy
 *         schema:
 *           type: string
 *           enum: [all, overdue, today, upcoming]
 *           default: all
 *         description: Filter by SLA status
 *     responses:
 *       200:
 *         description: Priority queue retrieved successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/priority-queue', validatePriorityQueueQuery, mlScoringController.getPriorityQueue);

/**
 * @swagger
 * /api/ml/priority-queue/workload:
 *   get:
 *     summary: Get team workload distribution
 *     description: Retrieve workload distribution across team members
 *     tags: [ML Scoring - Priority Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workload data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/priority-queue/workload', mlScoringController.getWorkload);

/**
 * @swagger
 * /api/ml/priority/{leadId}/contact:
 *   post:
 *     summary: Record contact (resets SLA)
 *     description: Record a contact attempt with the lead, resetting SLA timer
 *     tags: [ML Scoring - Priority Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contactType
 *             properties:
 *               contactType:
 *                 type: string
 *                 enum: [call, email, meeting, message, whatsapp, other]
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *               duration:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1440
 *     responses:
 *       200:
 *         description: Contact recorded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.post('/priority/:leadId/contact', validateLeadIdParam, validateRecordContact, mlScoringController.recordContact);

/**
 * @swagger
 * /api/ml/priority/{leadId}/assign:
 *   put:
 *     summary: Assign lead to rep
 *     description: Assign a lead to a specific sales representative
 *     tags: [ML Scoring - Priority Queue]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign the lead to
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Lead assigned successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.put('/priority/:leadId/assign', validateLeadIdParam, validateAssignLead, mlScoringController.assignLead);

/**
 * @swagger
 * /api/ml/sla/metrics:
 *   get:
 *     summary: Get SLA metrics
 *     description: Retrieve Service Level Agreement metrics for lead response times
 *     tags: [ML Scoring - Priority Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SLA metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/sla/metrics', mlScoringController.getSLAMetrics);

/**
 * @swagger
 * /api/ml/sla/breaches:
 *   get:
 *     summary: Get current SLA breaches
 *     description: Retrieve list of leads with breached SLA timelines
 *     tags: [ML Scoring - Priority Queue]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SLA breaches retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/sla/breaches', mlScoringController.getSLABreaches);

// ───────────────────────────────────────────────────────────────
// ANALYTICS ENDPOINTS
// ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/ml/analytics/dashboard:
 *   get:
 *     summary: Get ML scoring dashboard
 *     description: Retrieve comprehensive ML scoring analytics and metrics
 *     tags: [ML Scoring - Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: Number of days to include in analysis
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month]
 *           default: week
 *         description: Time grouping for trend data
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       400:
 *         description: Invalid parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics/dashboard', validateDashboardQuery, mlScoringController.getDashboard);

/**
 * @swagger
 * /api/ml/analytics/feature-importance:
 *   get:
 *     summary: Get feature importance
 *     description: Retrieve importance rankings of features used in ML model
 *     tags: [ML Scoring - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Feature importance retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics/feature-importance', mlScoringController.getFeatureImportance);

/**
 * @swagger
 * /api/ml/analytics/score-distribution:
 *   get:
 *     summary: Get score distribution
 *     description: Retrieve distribution of ML scores across all leads
 *     tags: [ML Scoring - Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Score distribution retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics/score-distribution', mlScoringController.getScoreDistribution);

module.exports = router;
