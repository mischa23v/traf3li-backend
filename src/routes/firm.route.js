/**
 * Firm Routes - Multi-Tenancy & Marketplace
 *
 * Handles firm management, team members, settings, and billing.
 * Maintains backwards compatibility with marketplace routes.
 */

const express = require('express');
const {
    userMiddleware,
    firmAdminOnly,
    firmOwnerOnly,
    teamManagementOnly
} = require('../middlewares');
const {
    // Marketplace
    getFirms,

    // Multi-tenancy
    createFirm,
    getMyFirm,
    getFirm,
    updateFirm,
    updateBillingSettings,
    getMembers,
    inviteMember,
    updateMember,
    removeMember,
    leaveFirm,
    leaveFirmWithSolo,
    transferOwnership,
    getFirmStats,

    // Team management
    getTeam,
    processDeparture,
    reinstateMember,
    getDepartedMembers,
    getMyPermissions,
    getAvailableRoles,

    // Invitation system
    createInvitation,
    getInvitations,
    cancelInvitation,
    resendInvitation,

    // Backwards compatible
    addLawyer,
    removeLawyer
} = require('../controllers/firm.controller');

const app = express.Router();

// ═══════════════════════════════════════════════════════════════
// PUBLIC / MARKETPLACE
// ═══════════════════════════════════════════════════════════════

// Get all firms (public marketplace)
app.get('/', getFirms);

// Get available roles and their permissions (for UI)
app.get('/roles', userMiddleware, getAvailableRoles);

// ═══════════════════════════════════════════════════════════════
// FIRM MANAGEMENT (Authenticated)
// ═══════════════════════════════════════════════════════════════

// Create new firm
app.post('/', userMiddleware, createFirm);

// Get current user's firm
app.get('/my', userMiddleware, getMyFirm);

// Get current user's permissions (صلاحياتي)
app.get('/my/permissions', userMiddleware, getMyPermissions);

// Get firm by ID
app.get('/:id', userMiddleware, getFirm);
app.get('/:_id', getFirm);  // Backwards compatible (public)

// Update firm settings
app.put('/:id', userMiddleware, updateFirm);
app.patch('/:id', userMiddleware, updateFirm);
app.patch('/:_id', userMiddleware, updateFirm);  // Backwards compatible

// ═══════════════════════════════════════════════════════════════
// BILLING SETTINGS (Admin only)
// ═══════════════════════════════════════════════════════════════

// Update billing settings
app.patch('/:id/billing', userMiddleware, updateBillingSettings);

// ═══════════════════════════════════════════════════════════════
// TEAM MANAGEMENT (فريق العمل)
// ═══════════════════════════════════════════════════════════════

// Get team members (فريق العمل) - shows only active by default
app.get('/:id/team', userMiddleware, getTeam);

// Get team members (legacy)
app.get('/:id/members', userMiddleware, getMembers);

// Get departed members list (قائمة الموظفين المغادرين) - Admin only
app.get('/:id/departed', userMiddleware, getDepartedMembers);

// Invite new member
app.post('/:id/members/invite', teamManagementOnly, inviteMember);

// Process member departure (مغادرة الموظف) - Admin only
app.post('/:id/members/:memberId/depart', firmAdminOnly, processDeparture);

// Reinstate departed member (إعادة تفعيل عضو مغادر) - Admin only
app.post('/:id/members/:memberId/reinstate', firmAdminOnly, reinstateMember);

// Update member role/permissions
app.put('/:id/members/:memberId', teamManagementOnly, updateMember);

// Remove member
app.delete('/:id/members/:memberId', teamManagementOnly, removeMember);

// Leave firm (for members) - with solo conversion option
app.post('/:id/leave', userMiddleware, leaveFirmWithSolo);

// Transfer ownership (owner only)
app.post('/:id/transfer-ownership', firmOwnerOnly, transferOwnership);

// ═══════════════════════════════════════════════════════════════
// INVITATION SYSTEM (دعوات الانضمام)
// ═══════════════════════════════════════════════════════════════

// Create invitation
app.post('/:firmId/invitations', firmAdminOnly, createInvitation);

// Get firm invitations
app.get('/:firmId/invitations', firmAdminOnly, getInvitations);

// Cancel invitation
app.delete('/:firmId/invitations/:invitationId', firmAdminOnly, cancelInvitation);

// Resend invitation email
app.post('/:firmId/invitations/:invitationId/resend', firmAdminOnly, resendInvitation);

// ═══════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════

// Get firm statistics
app.get('/:id/stats', userMiddleware, getFirmStats);

// ═══════════════════════════════════════════════════════════════
// BACKWARDS COMPATIBLE
// ═══════════════════════════════════════════════════════════════

// Add lawyer to firm (legacy)
app.post('/lawyer/add', userMiddleware, addLawyer);

// Remove lawyer from firm (legacy)
app.post('/lawyer/remove', userMiddleware, removeLawyer);

module.exports = app;
