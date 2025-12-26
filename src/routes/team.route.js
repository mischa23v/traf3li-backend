/**
 * Team Routes - Enterprise User Management API
 *
 * All routes require authentication and firm membership.
 * Implements tenant isolation via firmId filtering.
 */

const express = require('express');
const { userMiddleware, teamManagementOnly } = require('../middlewares');
const {
    getTeam,
    getTeamMember,
    inviteTeamMember,
    resendInvitation,
    revokeInvitation,
    updateTeamMember,
    updatePermissions,
    changeRole,
    suspendMember,
    activateMember,
    processDeparture,
    removeTeamMember,
    getMemberActivity,
    getTeamStats,
    getTeamOptions
} = require('../controllers/team.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(userMiddleware);

// ═══════════════════════════════════════════════════════════════
// UTILITY ROUTES (must come before :id routes)
// ═══════════════════════════════════════════════════════════════
router.get('/stats', getTeamStats);
router.get('/options', getTeamOptions);

// ═══════════════════════════════════════════════════════════════
// TEAM MEMBER CRUD
// ═══════════════════════════════════════════════════════════════
// GET /api/team - List all team members (filtered by firmId!)
router.get('/', getTeam);

// POST /api/team/invite - Invite new team member
router.post('/invite', teamManagementOnly, inviteTeamMember);

// GET /api/team/:id - Get single team member with activity log
router.get('/:id', getTeamMember);

// PATCH /api/team/:id - Update team member
router.patch('/:id', teamManagementOnly, updateTeamMember);

// DELETE /api/team/:id - Remove team member (hard delete)
router.delete('/:id', removeTeamMember);

// ═══════════════════════════════════════════════════════════════
// INVITATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════
// POST /api/team/:id/resend-invite - Resend invitation email
router.post('/:id/resend-invite', teamManagementOnly, resendInvitation);

// DELETE /api/team/:id/revoke-invite - Revoke pending invitation
router.delete('/:id/revoke-invite', teamManagementOnly, revokeInvitation);

// ═══════════════════════════════════════════════════════════════
// PERMISSIONS & ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════
// PATCH /api/team/:id/permissions - Update member permissions
router.patch('/:id/permissions', updatePermissions);

// PATCH /api/team/:id/role - Change member role
router.patch('/:id/role', changeRole);

// ═══════════════════════════════════════════════════════════════
// STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════
// POST /api/team/:id/suspend - Suspend member access
router.post('/:id/suspend', teamManagementOnly, suspendMember);

// POST /api/team/:id/activate - Activate/reactivate member
router.post('/:id/activate', teamManagementOnly, activateMember);

// POST /api/team/:id/depart - Process member departure
router.post('/:id/depart', teamManagementOnly, processDeparture);

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════
// GET /api/team/:id/activity - Get member's activity log
router.get('/:id/activity', getMemberActivity);

module.exports = router;
