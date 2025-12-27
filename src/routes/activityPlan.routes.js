/**
 * Activity Plan Routes
 *
 * Routes for managing activity plans (cadences/sequences) in legal CRM
 * All routes require authentication via userMiddleware
 *
 * Base route: /api/activity-plans
 */

const express = require('express');
const router = express.Router();
const activityPlanController = require('../controllers/activityPlan.controller');
const { userMiddleware } = require('../middlewares');

// ============================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================
router.use(userMiddleware);

// ============================================
// ACTIVITY PLAN CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/activity-plans
 * @desc    Create a new activity plan
 * @access  Private
 */
router.post('/', activityPlanController.createActivityPlan);

/**
 * @route   GET /api/activity-plans
 * @desc    Get all activity plans with filters
 * @query   search, status, planType, entityType, page, limit
 * @access  Private
 */
router.get('/', activityPlanController.getActivityPlans);

/**
 * @route   GET /api/activity-plans/:id
 * @desc    Get single activity plan by ID
 * @access  Private
 */
router.get('/:id', activityPlanController.getActivityPlan);

/**
 * @route   PUT /api/activity-plans/:id
 * @desc    Update activity plan
 * @access  Private
 */
router.put('/:id', activityPlanController.updateActivityPlan);

/**
 * @route   DELETE /api/activity-plans/:id
 * @desc    Delete activity plan
 * @access  Private
 */
router.delete('/:id', activityPlanController.deleteActivityPlan);

// ============================================
// ACTIVITY PLAN UTILITIES
// ============================================

/**
 * @route   POST /api/activity-plans/:id/duplicate
 * @desc    Duplicate an existing activity plan
 * @access  Private
 */
router.post('/:id/duplicate', activityPlanController.duplicateActivityPlan);

module.exports = router;
