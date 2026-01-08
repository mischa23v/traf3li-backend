/**
 * Employee Survey Routes
 *
 * Enterprise survey endpoints for employee engagement
 *
 * SECURITY: All routes require authentication (via global middleware)
 */

const express = require('express');
const router = express.Router();
const surveyController = require('../controllers/survey.controller');

// ═══════════════════════════════════════════════════════════════
// SURVEY TEMPLATE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/surveys/templates
 * Get all survey templates
 */
router.get('/templates', surveyController.getSurveyTemplates);

/**
 * GET /api/hr/surveys/templates/:id
 * Get single survey template
 */
router.get('/templates/:id', surveyController.getSurveyTemplateById);

/**
 * POST /api/hr/surveys/templates
 * Create survey template
 */
router.post('/templates', surveyController.createSurveyTemplate);

/**
 * PATCH /api/hr/surveys/templates/:id
 * Update survey template
 */
router.patch('/templates/:id', surveyController.updateSurveyTemplate);

/**
 * DELETE /api/hr/surveys/templates/:id
 * Delete survey template
 */
router.delete('/templates/:id', surveyController.deleteSurveyTemplate);

// ═══════════════════════════════════════════════════════════════
// SURVEY ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/surveys/stats
 * Get survey statistics overview
 */
router.get('/stats', surveyController.getSurveyStats);

/**
 * GET /api/hr/surveys/my-surveys
 * Get employee's active surveys
 */
router.get('/my-surveys', surveyController.getMySurveys);

/**
 * GET /api/hr/surveys
 * Get all surveys
 */
router.get('/', surveyController.getSurveys);

/**
 * GET /api/hr/surveys/:id
 * Get single survey
 */
router.get('/:id', surveyController.getSurveyById);

/**
 * GET /api/hr/surveys/:id/results
 * Get survey results/analytics
 */
router.get('/:id/results', surveyController.getSurveyResults);

/**
 * POST /api/hr/surveys
 * Create survey
 */
router.post('/', surveyController.createSurvey);

/**
 * PATCH /api/hr/surveys/:id
 * Update survey
 */
router.patch('/:id', surveyController.updateSurvey);

/**
 * POST /api/hr/surveys/:id/launch
 * Launch survey (make active)
 */
router.post('/:id/launch', surveyController.launchSurvey);

/**
 * POST /api/hr/surveys/:id/close
 * Close survey
 */
router.post('/:id/close', surveyController.closeSurvey);

/**
 * DELETE /api/hr/surveys/:id
 * Delete survey
 */
router.delete('/:id', surveyController.deleteSurvey);

// ═══════════════════════════════════════════════════════════════
// SURVEY RESPONSE ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/hr/surveys/:id/respond
 * Submit survey response
 */
router.post('/:id/respond', surveyController.submitSurveyResponse);

module.exports = router;
