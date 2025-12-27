/**
 * Sales Team Routes
 *
 * Routes for managing sales teams in the CRM module.
 * Includes team CRUD, member management, statistics, and leaderboard.
 *
 * Base route: /api/sales-teams
 *
 * Security: All routes require authentication via userMiddleware
 */

const express = require('express');
const router = express.Router();
const salesTeamController = require('../controllers/salesTeam.controller');
const { userMiddleware } = require('../middlewares');

// ============================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================
router.use(userMiddleware);

// ============================================
// SALES TEAM CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/sales-teams
 * @desc    Create a new sales team
 * @access  Private (authenticated users)
 */
router.post('/', salesTeamController.createTeam);

/**
 * @route   GET /api/sales-teams
 * @desc    Get all sales teams for the firm
 * @query   search - Search by name or teamId
 * @query   isActive - Filter by active status (true/false)
 * @query   leaderId - Filter by team leader ID
 * @query   page - Page number (default: 1)
 * @query   limit - Results per page (default: 20, max: 100)
 * @access  Private (authenticated users)
 */
router.get('/', salesTeamController.getTeams);

/**
 * @route   GET /api/sales-teams/:id
 * @desc    Get single sales team by ID
 * @access  Private (authenticated users)
 */
router.get('/:id', salesTeamController.getTeamById);

/**
 * @route   PUT /api/sales-teams/:id
 * @desc    Update sales team
 * @access  Private (authenticated users)
 */
router.put('/:id', salesTeamController.updateTeam);

/**
 * @route   DELETE /api/sales-teams/:id
 * @desc    Delete sales team (cannot delete default team)
 * @access  Private (authenticated users)
 */
router.delete('/:id', salesTeamController.deleteTeam);

// ============================================
// TEAM MEMBER MANAGEMENT
// ============================================

/**
 * @route   POST /api/sales-teams/:id/members
 * @desc    Add member to team
 * @body    userId - User ID to add
 * @body    role - Member role (leader/member/support)
 * @access  Private (authenticated users)
 */
router.post('/:id/members', salesTeamController.addMember);

/**
 * @route   DELETE /api/sales-teams/:id/members/:userId
 * @desc    Remove member from team
 * @access  Private (authenticated users)
 */
router.delete('/:id/members/:userId', salesTeamController.removeMember);

// ============================================
// TEAM ANALYTICS & PERFORMANCE
// ============================================

/**
 * @route   GET /api/sales-teams/:id/stats
 * @desc    Get team statistics (leads, opportunities, conversion rate)
 * @access  Private (authenticated users)
 */
router.get('/:id/stats', salesTeamController.getTeamStats);

/**
 * @route   GET /api/sales-teams/:id/leaderboard
 * @desc    Get team member performance leaderboard
 * @access  Private (authenticated users)
 */
router.get('/:id/leaderboard', salesTeamController.getLeaderboard);

// ============================================
// TEAM CONFIGURATION
// ============================================

/**
 * @route   POST /api/sales-teams/:id/default
 * @desc    Set team as default for the firm
 * @access  Private (authenticated users)
 */
router.post('/:id/default', salesTeamController.setDefault);

module.exports = router;
