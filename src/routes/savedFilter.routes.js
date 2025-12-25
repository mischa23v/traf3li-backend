/**
 * SavedFilter Routes
 *
 * Routes for saved filter management and operations.
 * Allows users to create, manage, share, and duplicate filters.
 *
 * Base route: /api/saved-filters
 */

const express = require('express');
const router = express.Router();
const savedFilterController = require('../controllers/savedFilter.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// ============ APPLY MIDDLEWARE ============
// All saved filter routes require authentication and firm filtering
router.use(userMiddleware);
router.use(firmFilter);

// ============================================
// FILTER MANAGEMENT ROUTES
// ============================================

// Get all saved filters for entity type
// Query param: entityType (required)
router.get('/', savedFilterController.listFilters);

// Create new saved filter
router.post('/', savedFilterController.createFilter);

// Get popular filters for entity type
router.get('/popular/:entityType', savedFilterController.getPopularFilters);

// Get single saved filter by ID
router.get('/:id', savedFilterController.getFilter);

// Update saved filter
router.put('/:id', savedFilterController.updateFilter);
router.patch('/:id', savedFilterController.updateFilter);  // Support both PUT and PATCH

// Delete saved filter
router.delete('/:id', savedFilterController.deleteFilter);

// ============================================
// FILTER OPERATIONS
// ============================================

// Set filter as default for entity type
router.post('/:id/set-default', savedFilterController.setAsDefault);

// Share filter with users
router.post('/:id/share', savedFilterController.shareFilter);

// Unshare filter from specific user
router.delete('/:id/share/:userId', savedFilterController.unshareFilter);

// Duplicate filter
router.post('/:id/duplicate', savedFilterController.duplicateFilter);

module.exports = router;
