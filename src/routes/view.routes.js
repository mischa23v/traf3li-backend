/**
 * View Routes
 *
 * Routes for view management and operations.
 * Allows users to create, manage, and customize views for data visualization.
 *
 * Base route: /api/views
 */

const express = require('express');
const router = express.Router();
const viewController = require('../controllers/view.controller');
const { userMiddleware } = require('../middlewares');

// ============ APPLY MIDDLEWARE ============
// All view routes require authentication
router.use(userMiddleware);

// ============================================
// VIEW MANAGEMENT ROUTES
// ============================================

// Get all views
router.get('/', viewController.listViews);

// Create new view
router.post('/', viewController.createView);

// Get single view by ID
router.get('/:id', viewController.getView);

// Update view
router.put('/:id', viewController.updateView);
router.patch('/:id', viewController.updateView);  // Support both PUT and PATCH

// Delete view
router.delete('/:id', viewController.deleteView);

// ============================================
// VIEW OPERATIONS
// ============================================

// Render view with current data
router.get('/:id/render', viewController.renderView);

// Clone view
router.post('/:id/clone', viewController.cloneView);

// Share view
router.post('/:id/share', viewController.shareView);

// Toggle favorite status
router.post('/:id/favorite', viewController.toggleFavorite);

// Set as default view
router.post('/:id/default', viewController.setAsDefault);

module.exports = router;
