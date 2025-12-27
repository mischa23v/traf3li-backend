/**
 * KYC Routes
 *
 * API endpoints for KYC/AML verification
 */

const express = require('express');
const router = express.Router();
const kycController = require('../controllers/kyc.controller');
const authenticate = require('../middlewares/authenticate');
const { requireAdmin, logAdminAction } = require('../middlewares/adminAuth.middleware');
const { autoDetectWebhookAuth, preserveRawBody } = require('../middlewares/webhookAuth.middleware');

// ═══════════════════════════════════════════════════════════════
// PUBLIC WEBHOOK ENDPOINT (no authentication, signature validation only)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/kyc/webhook
 * @desc    Handle verification callbacks from Yakeen/Wathq
 * @access  Public (Webhook endpoint - validates signature via middleware)
 * SECURITY: Webhook signature is verified by autoDetectWebhookAuth middleware
 */
router.post('/webhook', preserveRawBody, autoDetectWebhookAuth(), kycController.handleWebhook);

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATED ROUTES (all routes below require authentication)
// ═══════════════════════════════════════════════════════════════
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// USER KYC ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/kyc/initiate
 * @desc    Initiate KYC verification process
 * @access  Private (Authenticated users)
 * @body    { documentType: string }
 */
router.post('/initiate', kycController.initiateVerification);

/**
 * @route   POST /api/kyc/verify
 * @desc    Verify identity using document data (Yakeen/Wathq integration)
 * @access  Private (Authenticated users)
 * @body    { documentType, nationalId?, birthDate?, crNumber? }
 */
router.post('/verify', kycController.verifyIdentity);

/**
 * @route   POST /api/kyc/submit
 * @desc    Submit KYC document for manual review
 * @access  Private (Authenticated users)
 * @body    { type, documentNumber?, fileUrl }
 */
router.post('/submit', kycController.submitDocument);

/**
 * @route   GET /api/kyc/status
 * @desc    Get current KYC verification status
 * @access  Private (Authenticated users)
 */
router.get('/status', kycController.getStatus);

/**
 * @route   GET /api/kyc/history
 * @desc    Get KYC verification history
 * @access  Private (Authenticated users)
 */
router.get('/history', kycController.getHistory);

// ═══════════════════════════════════════════════════════════════
// ADMIN KYC ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/kyc/review
 * @desc    Manually review and approve/reject KYC (Admin only)
 * @access  Private (Admin)
 * @body    { userId, approved, notes?, documentIndex? }
 */
router.post('/review', requireAdmin(), logAdminAction(), kycController.reviewKYC);

/**
 * @route   GET /api/kyc/admin/pending
 * @desc    Get all pending KYC verifications (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/pending', requireAdmin(), logAdminAction(), kycController.getPendingVerifications);

/**
 * @route   GET /api/kyc/admin/stats
 * @desc    Get KYC verification statistics (Admin only)
 * @access  Private (Admin)
 */
router.get('/admin/stats', requireAdmin(), logAdminAction(), kycController.getKYCStats);

module.exports = router;
