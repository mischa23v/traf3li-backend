/**
 * Firm Routes - Multi-Tenancy & Marketplace
 *
 * Handles firm management, team members, settings, and billing.
 * Maintains backwards compatibility with marketplace routes.
 */

const express = require('express');
const { userMiddleware, firmAdminOnly, firmOwnerOnly } = require('../middlewares');
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
    transferOwnership,
    getFirmStats,

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

// ═══════════════════════════════════════════════════════════════
// FIRM MANAGEMENT (Authenticated)
// ═══════════════════════════════════════════════════════════════

// Create new firm
app.post('/', userMiddleware, createFirm);

// Get current user's firm
app.get('/my', userMiddleware, getMyFirm);

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
// TEAM MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// Get team members
app.get('/:id/members', userMiddleware, getMembers);

// Invite new member
app.post('/:id/members/invite', userMiddleware, inviteMember);

// Update member role/permissions
app.put('/:id/members/:memberId', userMiddleware, updateMember);

// Remove member
app.delete('/:id/members/:memberId', userMiddleware, removeMember);

// Leave firm (for members)
app.post('/:id/leave', userMiddleware, leaveFirm);

// Transfer ownership (owner only)
app.post('/:id/transfer-ownership', userMiddleware, transferOwnership);

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
