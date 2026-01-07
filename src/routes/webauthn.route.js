/**
 * WebAuthn/FIDO2 Routes
 *
 * Passwordless authentication using WebAuthn/FIDO2 standard
 */

const express = require('express');
const { authenticate } = require('../middlewares');
const { authRateLimiter, sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    startRegistration,
    finishRegistration,
    startAuthentication,
    finishAuthentication,
    getCredentials,
    deleteCredential,
    updateCredentialName
} = require('../controllers/webauthn.controller');
const {
    validateFinishRegistration,
    validateStartAuthentication,
    validateFinishAuthentication,
    validateCredentialIdParam,
    validateUpdateCredentialName
} = require('../validators/webauthn.validator');

const router = express.Router();

// ========================================
// REGISTRATION ENDPOINTS (Protected)
// ========================================

router.post('/register/start', authenticate, sensitiveRateLimiter, startRegistration);

router.post('/register/finish', authenticate, sensitiveRateLimiter, validateFinishRegistration, finishRegistration);

// ========================================
// AUTHENTICATION ENDPOINTS (Public)
// ========================================

router.post('/authenticate/start', authRateLimiter, validateStartAuthentication, startAuthentication);

router.post('/authenticate/finish', authRateLimiter, validateFinishAuthentication, finishAuthentication);

// ========================================
// CREDENTIAL MANAGEMENT ENDPOINTS (Protected)
// ========================================

router.get('/credentials', authenticate, getCredentials);

router.patch('/credentials/:id', authenticate, sensitiveRateLimiter, validateCredentialIdParam, validateUpdateCredentialName, updateCredentialName);
router.delete('/credentials/:id', authenticate, sensitiveRateLimiter, validateCredentialIdParam, deleteCredential);

module.exports = router;
