/**
 * Walkthrough Routes
 *
 * Routes for managing user walkthroughs and onboarding flows.
 * Includes both user-facing and admin endpoints.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize.middleware');
const walkthroughController = require('../controllers/walkthrough.controller');

// ═══════════════════════════════════════════════════════════════
// USER ROUTES - Walkthrough Management
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/walkthroughs
 * @desc    Get list of available walkthroughs for user
 * @access  Private (authenticated users)
 */
router.get('/', authenticate, walkthroughController.listWalkthroughs);

/**
 * @route   GET /api/walkthroughs/progress
 * @desc    Get user's progress on all walkthroughs
 * @access  Private (authenticated users)
 */
router.get('/progress', authenticate, walkthroughController.getProgress);

/**
 * @route   GET /api/walkthroughs/:id
 * @desc    Get specific walkthrough details with tasks
 * @access  Private (authenticated users)
 */
router.get('/:id', authenticate, walkthroughController.getWalkthrough);

/**
 * @route   POST /api/walkthroughs/:id/start
 * @desc    Start a walkthrough
 * @access  Private (authenticated users)
 */
router.post('/:id/start', authenticate, walkthroughController.startWalkthrough);

/**
 * @route   POST /api/walkthroughs/:id/step/next
 * @desc    Advance to next step in walkthrough
 * @access  Private (authenticated users)
 */
router.post('/:id/step/next', authenticate, walkthroughController.nextStep);

/**
 * @route   POST /api/walkthroughs/:id/step/:stepOrder/skip
 * @desc    Skip a specific step in walkthrough
 * @access  Private (authenticated users)
 */
router.post('/:id/step/:stepOrder/skip', authenticate, walkthroughController.skipStep);

/**
 * @route   POST /api/walkthroughs/:id/complete
 * @desc    Complete entire walkthrough
 * @access  Private (authenticated users)
 */
router.post('/:id/complete', authenticate, walkthroughController.completeWalkthrough);

/**
 * @route   POST /api/walkthroughs/:id/skip
 * @desc    Skip entire walkthrough
 * @access  Private (authenticated users)
 */
router.post('/:id/skip', authenticate, walkthroughController.skipWalkthrough);

/**
 * @route   POST /api/walkthroughs/:id/reset
 * @desc    Reset progress on a walkthrough
 * @access  Private (authenticated users)
 */
router.post('/:id/reset', authenticate, walkthroughController.resetWalkthrough);

// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES - Walkthrough Management
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/walkthroughs/stats
 * @desc    Get completion statistics for all walkthroughs
 * @access  Private (admin only)
 */
router.get('/stats', authenticate, walkthroughController.getStats);

/**
 * @route   GET /api/walkthroughs/admin
 * @desc    List all walkthroughs for admin management
 * @access  Private (admin only)
 */
router.get('/admin', authenticate, walkthroughController.listAllWalkthroughs);

/**
 * @route   POST /api/walkthroughs/admin
 * @desc    Create a new walkthrough
 * @access  Private (admin only)
 */
router.post('/admin', authenticate, walkthroughController.createWalkthrough);

/**
 * @route   PUT /api/walkthroughs/admin/:id
 * @desc    Update a walkthrough
 * @access  Private (admin only)
 */
router.put('/admin/:id', authenticate, walkthroughController.updateWalkthrough);

/**
 * @route   DELETE /api/walkthroughs/admin/:id
 * @desc    Delete (deactivate) a walkthrough
 * @access  Private (admin only)
 */
router.delete('/admin/:id', authenticate, walkthroughController.deleteWalkthrough);

module.exports = router;
