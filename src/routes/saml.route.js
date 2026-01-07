const express = require('express');
const {
    getSPMetadata,
    initiateLogin,
    assertionConsumerService,
    initiateSingleLogout,
    singleLogoutService,
    getSAMLConfig,
    updateSAMLConfig,
    testSAMLConfig
} = require('../controllers/saml.controller');
const { authenticate } = require('../middlewares');
const { publicRateLimiter, authRateLimiter } = require('../middlewares/rateLimiter.middleware');

const app = express.Router();

app.get('/metadata/:firmId', publicRateLimiter, getSPMetadata);

app.get('/login/:firmId', authRateLimiter, initiateLogin);

app.post('/acs/:firmId', assertionConsumerService);

app.get('/logout/:firmId', initiateSingleLogout);

app.post('/sls/:firmId', singleLogoutService);

// ═══════════════════════════════════════════════════════════════
// ADMIN CONFIGURATION ENDPOINTS (Authentication Required)
// ═══════════════════════════════════════════════════════════════

app.get('/config', authenticate, getSAMLConfig);

app.put('/config', authenticate, updateSAMLConfig);

app.post('/config/test', authenticate, testSAMLConfig);

module.exports = app;
