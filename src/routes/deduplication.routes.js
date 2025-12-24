/**
 * Deduplication Routes
 *
 * Routes for contact deduplication and merge operations.
 * Allows detecting duplicate contacts, reviewing suggestions, and merging records.
 *
 * Base route: /api/deduplication
 */

const express = require('express');
const router = express.Router();
const deduplicationController = require('../controllers/deduplication.controller');
const { userMiddleware, firmFilter } = require('../middlewares');
const { authorize } = require('../middlewares/authorize.middleware');

// ============================================
// APPLY MIDDLEWARE
// ============================================
// All deduplication routes require authentication and firm filtering
router.use(userMiddleware);
router.use(firmFilter);

// ============================================
// DUPLICATE DETECTION
// ============================================

// Find duplicates for a specific contact
router.get('/contacts/:id/duplicates', deduplicationController.findDuplicates);

// Scan contacts for duplicates
router.post('/contacts/scan-duplicates', deduplicationController.scanDuplicates);

// Get duplicate suggestions
router.get('/contacts/duplicate-suggestions', deduplicationController.getDuplicateSuggestions);

// ============================================
// MERGE OPERATIONS
// ============================================

// Merge contacts (admin/owner only)
router.post('/contacts/merge', authorize('admin', 'owner'), deduplicationController.mergeContacts);

// Auto-merge contacts (admin/owner only)
router.post('/contacts/auto-merge', authorize('admin', 'owner'), deduplicationController.autoMerge);

// ============================================
// NOT DUPLICATE MARKING
// ============================================

// Mark contacts as not duplicate
router.post('/contacts/not-duplicate', deduplicationController.markNotDuplicate);

module.exports = router;
