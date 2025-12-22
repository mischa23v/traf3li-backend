/**
 * CAPTCHA Routes
 *
 * Provides endpoints for CAPTCHA verification across multiple providers:
 * - Google reCAPTCHA v2/v3
 * - hCaptcha
 * - Cloudflare Turnstile
 *
 * All routes are prefixed with /api/auth/captcha
 */

const express = require('express');
const {
    verifyCaptcha,
    getEnabledProviders,
    getProviderStatus
} = require('../controllers/captcha.controller');
const { publicRateLimiter, authRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

// ========================================================================
// CAPTCHA Verification Routes
// ========================================================================

/**
 * @openapi
 * /api/auth/verify-captcha:
 *   post:
 *     summary: Verify CAPTCHA token
 *     description: |
 *       Verifies a CAPTCHA token from the client with the specified provider.
 *       Supports multiple providers: reCAPTCHA, hCaptcha, and Cloudflare Turnstile.
 *
 *       For reCAPTCHA v3, includes a score (0.0 to 1.0) indicating the likelihood
 *       that the interaction is legitimate. Higher scores indicate higher confidence.
 *     tags:
 *       - CAPTCHA
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - token
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [recaptcha, hcaptcha, turnstile]
 *                 description: CAPTCHA provider to use for verification
 *                 example: recaptcha
 *               token:
 *                 type: string
 *                 description: CAPTCHA token received from the client
 *                 example: 03AGdBq24PBCbwiDRaS9cVUCvu9QgJdx...
 *     responses:
 *       200:
 *         description: CAPTCHA verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: CAPTCHA verified successfully
 *                 messageAr:
 *                   type: string
 *                   example: تم التحقق من CAPTCHA بنجاح
 *                 verified:
 *                   type: boolean
 *                   example: true
 *                 provider:
 *                   type: string
 *                   example: recaptcha
 *                 providerName:
 *                   type: string
 *                   example: Google reCAPTCHA
 *                 score:
 *                   type: number
 *                   description: Score for reCAPTCHA v3 (0.0 to 1.0)
 *                   example: 0.9
 *                 action:
 *                   type: string
 *                   description: Action name for reCAPTCHA v3
 *                   example: login
 *                 hostname:
 *                   type: string
 *                   description: Hostname where CAPTCHA was solved
 *                   example: example.com
 *       400:
 *         description: CAPTCHA verification failed or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: CAPTCHA verification failed
 *                 messageAr:
 *                   type: string
 *                   example: فشل التحقق من CAPTCHA
 *                 verified:
 *                   type: boolean
 *                   example: false
 *                 provider:
 *                   type: string
 *                   example: recaptcha
 *                 errorCodes:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [invalid-input-response]
 *                 code:
 *                   type: string
 *                   example: VERIFICATION_FAILED
 *                 details:
 *                   type: string
 *                   example: The response parameter (token) is invalid or malformed
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *       503:
 *         description: CAPTCHA provider not configured
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: CAPTCHA provider "recaptcha" is not configured or enabled
 *                 code:
 *                   type: string
 *                   example: PROVIDER_NOT_CONFIGURED
 *                 enabledProviders:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [hcaptcha, turnstile]
 */
router.post('/verify-captcha', authRateLimiter, verifyCaptcha);

/**
 * @openapi
 * /api/auth/captcha/providers:
 *   get:
 *     summary: Get enabled CAPTCHA providers
 *     description: |
 *       Returns a list of configured and enabled CAPTCHA providers.
 *       This helps clients know which providers are available for use.
 *       A provider is considered enabled if it has a secret key configured.
 *     tags:
 *       - CAPTCHA
 *     responses:
 *       200:
 *         description: List of enabled CAPTCHA providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Found 2 enabled CAPTCHA provider(s)
 *                 messageAr:
 *                   type: string
 *                   example: تم العثور على 2 مزود CAPTCHA مفعّل
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         example: recaptcha
 *                       name:
 *                         type: string
 *                         example: Google reCAPTCHA
 *                       hasMinScore:
 *                         type: boolean
 *                         example: true
 *                 count:
 *                   type: number
 *                   example: 2
 *                 defaultProvider:
 *                   type: string
 *                   example: recaptcha
 *                 allProviders:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [recaptcha, hcaptcha, turnstile]
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/captcha/providers', publicRateLimiter, getEnabledProviders);

/**
 * @openapi
 * /api/auth/captcha/status/{provider}:
 *   get:
 *     summary: Get CAPTCHA provider status
 *     description: |
 *       Returns the configuration and status of a specific CAPTCHA provider.
 *       Shows whether the provider is enabled and configured.
 *     tags:
 *       - CAPTCHA
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [recaptcha, hcaptcha, turnstile]
 *         description: CAPTCHA provider key
 *         example: recaptcha
 *     responses:
 *       200:
 *         description: Provider status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 provider:
 *                   type: string
 *                   example: recaptcha
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *                 configured:
 *                   type: boolean
 *                   example: true
 *                 config:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Google reCAPTCHA
 *                     verifyUrl:
 *                       type: string
 *                       example: https://www.google.com/recaptcha/api/siteverify
 *                     minScore:
 *                       type: number
 *                       example: 0.5
 *       400:
 *         description: Invalid provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Invalid CAPTCHA provider
 *                 code:
 *                   type: string
 *                   example: INVALID_PROVIDER
 *                 validProviders:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [recaptcha, hcaptcha, turnstile]
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/captcha/status/:provider', publicRateLimiter, getProviderStatus);

module.exports = router;
