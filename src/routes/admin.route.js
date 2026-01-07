/**
 * Admin Routes
 *
 * Routes for administrative operations:
 * - Token revocation management
 * - Password management (admin-forced expiration)
 * - Custom JWT claims management
 *
 * SECURITY: All routes require firmAdminOnly - only firm admins/owners can access
 */

const express = require('express');
const { authenticate } = require('../middlewares');
const { firmAdminOnly } = require('../middlewares/firmFilter.middleware');
const { sensitiveRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Token revocation controllers
const {
    revokeUserTokens,
    getRecentRevocations,
    getRevocationStats,
    getUserRevocationHistory,
    cleanupExpiredTokens
} = require('../controllers/admin.controller');

// Password management controllers
const {
    expireUserPassword,
    expireAllFirmPasswords,
    getFirmPasswordStats
} = require('../controllers/adminPasswordManagement.controller');

// Custom JWT claims controllers
const {
    getUserClaims,
    setUserClaims,
    deleteUserClaims,
    previewTokenClaims,
    validateClaims
} = require('../controllers/adminCustomClaims.controller');

const app = express.Router();

// ========== Token Revocation Management ==========
// SECURITY: firmAdminOnly ensures only firm admins/owners can revoke tokens
app.post('/users/:id/revoke-tokens', authenticate, firmAdminOnly, sensitiveRateLimiter, revokeUserTokens);

app.get('/revoked-tokens', authenticate, firmAdminOnly, publicRateLimiter, getRecentRevocations);

app.get('/revoked-tokens/stats', authenticate, firmAdminOnly, publicRateLimiter, getRevocationStats);

app.get('/users/:id/revocations', authenticate, firmAdminOnly, publicRateLimiter, getUserRevocationHistory);

app.post('/revoked-tokens/cleanup', authenticate, firmAdminOnly, sensitiveRateLimiter, cleanupExpiredTokens);

// ========== Password Management (Admin) ==========
// SECURITY: firmAdminOnly ensures only firm admins/owners can expire passwords
app.post('/users/:id/expire-password', authenticate, firmAdminOnly, sensitiveRateLimiter, expireUserPassword);

app.post('/firm/expire-all-passwords', authenticate, firmAdminOnly, sensitiveRateLimiter, expireAllFirmPasswords);

app.get('/firm/password-stats', authenticate, firmAdminOnly, publicRateLimiter, getFirmPasswordStats);

// ========== Custom JWT Claims Management (Admin) ==========
// SECURITY: firmAdminOnly ensures only firm admins/owners can manage JWT claims
app.get('/users/:id/claims', authenticate, firmAdminOnly, publicRateLimiter, getUserClaims);

app.put('/users/:id/claims', authenticate, firmAdminOnly, sensitiveRateLimiter, setUserClaims);

app.delete('/users/:id/claims', authenticate, firmAdminOnly, sensitiveRateLimiter, deleteUserClaims);

app.get('/users/:id/claims/preview', authenticate, firmAdminOnly, publicRateLimiter, previewTokenClaims);

app.post('/users/:id/claims/validate', authenticate, firmAdminOnly, publicRateLimiter, validateClaims);

module.exports = app;
