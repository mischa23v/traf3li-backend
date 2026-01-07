const express = require('express');
const {
    getEnabledProviders,
    authorize,
    callback,
    linkAccount,
    unlinkAccount,
    getLinkedAccounts,
    initiateSSO,
    callbackPost
} = require('../controllers/oauth.controller');
const {
    detectProvider,
    getDomainConfig,
    generateVerificationToken,
    verifyDomain,
    manualVerifyDomain,
    invalidateDomainCache
} = require('../controllers/ssoRouting.controller');
const { authenticate } = require('../middlewares');
const { authRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');

const app = express.Router();

app.get('/providers', publicRateLimiter, getEnabledProviders);

app.post('/initiate', publicRateLimiter, initiateSSO);

app.post('/callback', authRateLimiter, callbackPost);

// Also support POST /api/auth/sso/:provider/callback for frontend compatibility
app.post('/:provider/callback', authRateLimiter, (req, res) => {
    // Add provider from URL params to body for the handler
    req.body.provider = req.params.provider;
    return callbackPost(req, res);
});

app.get('/:providerType/authorize', publicRateLimiter, authorize);

app.get('/:providerType/callback', callback);

app.post('/link', authenticate, authRateLimiter, linkAccount);

app.delete('/unlink/:providerType', authenticate, authRateLimiter, unlinkAccount);

app.get('/linked', authenticate, publicRateLimiter, getLinkedAccounts);

// ═══════════════════════════════════════════════════════════════
// DOMAIN-BASED SSO ROUTING
// ═══════════════════════════════════════════════════════════════

app.post('/detect', publicRateLimiter, detectProvider);

app.get('/domain/:domain', authenticate, authRateLimiter, getDomainConfig);

app.post('/domain/:domain/verify/generate', authenticate, authRateLimiter, generateVerificationToken);

app.post('/domain/:domain/verify', authenticate, authRateLimiter, verifyDomain);

app.post('/domain/:domain/verify/manual', authenticate, authRateLimiter, manualVerifyDomain);

app.post('/domain/:domain/cache/invalidate', authenticate, authRateLimiter, invalidateDomainCache);

module.exports = app;
