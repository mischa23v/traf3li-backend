/**
 * Invitation Routes
 *
 * Handles firm invitation endpoints for lawyers joining law firms.
 * Includes public endpoints for validating invitations and authenticated
 * endpoints for accepting invitations.
 */

const express = require('express');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { userMiddleware } = require('../middlewares');
const {
    validateInvitationCode,
    acceptInvitation
} = require('../controllers/firm.controller');

const app = express.Router();

// Apply rate limiting to all routes
app.use(apiRateLimiter);

// ═══════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Validate invitation code (public - for checking before registration)
app.get('/:code', validateInvitationCode);

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATED ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// Accept invitation (join firm)
app.post('/:code/accept', userMiddleware, acceptInvitation);

module.exports = app;
