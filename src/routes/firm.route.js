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
const { auditAction } = require('../middlewares/auditLog.middleware');
const {
    // Marketplace
    getFirms,

    // Multi-tenancy
    createFirm,
    getMyFirm,
    switchFirm,
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

    // IP Whitelist management
    getIPWhitelist,
    addIPToWhitelist,
    removeIPFromWhitelist,
    testIPAccess,
    enableIPWhitelist,
    disableIPWhitelist,
    revokeTemporaryIP,

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
app.post('/', userMiddleware, auditAction('create_firm', 'firm', { severity: 'high' }), createFirm);

// Get current user's firm
app.get('/my', userMiddleware, getMyFirm);

// Switch active firm
app.post('/switch', userMiddleware, auditAction('switch_firm', 'firm', { severity: 'medium' }), switchFirm);

// Get current user's permissions (صلاحياتي)
app.get('/my/permissions', userMiddleware, getMyPermissions);

// Get firm by ID
app.get('/:id', userMiddleware, getFirm);
app.get('/:_id', getFirm);  // Backwards compatible (public)

// Update firm settings
app.put('/:id', userMiddleware, auditAction('update_firm_settings', 'firm', { severity: 'high', captureChanges: true }), updateFirm);
app.patch('/:id', userMiddleware, auditAction('update_firm_settings', 'firm', { severity: 'high', captureChanges: true }), updateFirm);
app.patch('/:_id', userMiddleware, auditAction('update_firm_settings', 'firm', { severity: 'high', captureChanges: true }), updateFirm);  // Backwards compatible

// ═══════════════════════════════════════════════════════════════
// BILLING SETTINGS (Admin only)
// ═══════════════════════════════════════════════════════════════

// Update billing settings
app.patch('/:id/billing', userMiddleware, auditAction('update_billing_settings', 'firm', { severity: 'high', captureChanges: true }), updateBillingSettings);

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
app.post('/:id/members/invite', teamManagementOnly, auditAction('invite_firm_member', 'firm', { severity: 'high' }), inviteMember);

// Process member departure (مغادرة الموظف) - Admin only
app.post('/:id/members/:memberId/depart', firmAdminOnly, auditAction('depart_firm_member', 'firm', { severity: 'high', captureChanges: true }), processDeparture);

// Reinstate departed member (إعادة تفعيل عضو مغادر) - Admin only
app.post('/:id/members/:memberId/reinstate', firmAdminOnly, auditAction('reinstate_firm_member', 'firm', { severity: 'high', captureChanges: true }), reinstateMember);

// Update member role/permissions
app.put('/:id/members/:memberId', teamManagementOnly, auditAction('update_member_role', 'firm', { severity: 'critical', captureChanges: true }), updateMember);

// Remove member
app.delete('/:id/members/:memberId', teamManagementOnly, auditAction('remove_firm_member', 'firm', { severity: 'critical', captureChanges: true }), removeMember);

// Leave firm (for members) - with solo conversion option
app.post('/:id/leave', userMiddleware, auditAction('leave_firm', 'firm', { severity: 'high', captureChanges: true }), leaveFirmWithSolo);

// Transfer ownership (owner only)
app.post('/:id/transfer-ownership', firmOwnerOnly, auditAction('transfer_firm_ownership', 'firm', { severity: 'critical', captureChanges: true }), transferOwnership);

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
// IP WHITELIST MANAGEMENT (قائمة عناوين IP المسموح بها)
// ═══════════════════════════════════════════════════════════════

// Get IP whitelist for firm
app.get('/:firmId/ip-whitelist', userMiddleware, firmAdminOnly, getIPWhitelist);

// Test if current IP would be allowed
app.post('/:firmId/ip-whitelist/test', userMiddleware, testIPAccess);

// Enable IP whitelisting
app.post('/:firmId/ip-whitelist/enable', userMiddleware, firmAdminOnly, auditAction('enable_ip_whitelist', 'firm', { severity: 'critical' }), enableIPWhitelist);

// Disable IP whitelisting
app.post('/:firmId/ip-whitelist/disable', userMiddleware, firmAdminOnly, auditAction('disable_ip_whitelist', 'firm', { severity: 'critical' }), disableIPWhitelist);

// Add IP to whitelist (permanent or temporary)
app.post('/:firmId/ip-whitelist', userMiddleware, firmAdminOnly, auditAction('add_ip_whitelist', 'firm', { severity: 'high' }), addIPToWhitelist);

// Remove IP from whitelist
app.delete('/:firmId/ip-whitelist/:ip', userMiddleware, firmAdminOnly, auditAction('remove_ip_whitelist', 'firm', { severity: 'high' }), removeIPFromWhitelist);

// Revoke temporary IP allowance
app.delete('/:firmId/ip-whitelist/temporary/:allowanceId', userMiddleware, firmAdminOnly, auditAction('revoke_temporary_ip', 'firm', { severity: 'medium' }), revokeTemporaryIP);

// ═══════════════════════════════════════════════════════════════
// BACKWARDS COMPATIBLE
// ═══════════════════════════════════════════════════════════════

// Add lawyer to firm (legacy)
app.post('/lawyer/add', userMiddleware, addLawyer);

// Remove lawyer to firm (legacy)
app.post('/lawyer/remove', userMiddleware, removeLawyer);

module.exports = app;
