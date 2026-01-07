/**
 * CAPTCHA Routes
 *
 * CAPTCHA verification endpoints for bot protection
 */

const express = require('express');
const { authRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    verifyCaptcha,
    getEnabledProviders,
    getProviderStatus
} = require('../controllers/captcha.controller');

const router = express.Router();

router.post('/verify-captcha', authRateLimiter, verifyCaptcha);

router.get('/captcha/providers', publicRateLimiter, getEnabledProviders);

router.get('/captcha/status/:provider', publicRateLimiter, getProviderStatus);

module.exports = router;
