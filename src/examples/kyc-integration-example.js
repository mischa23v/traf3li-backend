/**
 * KYC Integration Examples
 *
 * This file demonstrates how to integrate KYC verification into your existing routes.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const { requireKYC, checkKYC, requireKYCForRoles } = require('../middlewares/requireKYC.middleware');

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 1: Protect Payment Routes with KYC
// ═══════════════════════════════════════════════════════════════

/**
 * Only verified users can create payments
 */
router.post('/api/payments/create', authenticate, requireKYC, (req, res) => {
  // User is guaranteed to have valid KYC here
  // Access KYC info via: req.kycVerified, req.kycVerifiedAt, req.kycExpiresAt

  res.json({
    message: 'Payment created',
    kycVerified: req.kycVerified,
    kycVerifiedAt: req.kycVerifiedAt
  });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 2: Soft KYC Check (doesn't block access)
// ═══════════════════════════════════════════════════════════════

/**
 * Show KYC badge on profile but don't require it
 */
router.get('/api/profile', authenticate, checkKYC, (req, res) => {
  res.json({
    user: req.user,
    kycVerified: req.kycVerified,
    kycStatus: req.kycStatus,
    // Show verification badge or prompt if not verified
    showKYCPrompt: !req.kycVerified
  });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 3: Role-Based KYC Requirements
// ═══════════════════════════════════════════════════════════════

/**
 * Only lawyers need KYC to create cases
 * Clients can create cases without KYC
 */
router.post('/api/cases/create', authenticate, requireKYCForRoles(['lawyer']), (req, res) => {
  // If user is a lawyer, KYC is verified
  // If user is a client, KYC check is skipped

  res.json({ message: 'Case created' });
});

/**
 * Only verified lawyers can join marketplace
 */
router.post('/api/marketplace/register', authenticate, requireKYCForRoles(['lawyer']), (req, res) => {
  res.json({ message: 'Registered in marketplace' });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 4: Conditional KYC for High-Value Transactions
// ═══════════════════════════════════════════════════════════════

/**
 * Require KYC for transactions above threshold
 */
router.post('/api/transactions/create', authenticate, async (req, res) => {
  const { amount } = req.body;
  const KYC_THRESHOLD = 10000; // SAR

  // For high-value transactions, check KYC
  if (amount >= KYC_THRESHOLD) {
    const kycService = require('../services/kyc.service');
    const isValid = await kycService.isKYCValid(req.userID);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required for transactions above 10,000 SAR',
        errorAr: 'التحقق من الهوية مطلوب للمعاملات التي تزيد عن 10,000 ريال',
        code: 'KYC_REQUIRED_HIGH_VALUE',
        threshold: KYC_THRESHOLD,
        redirectTo: '/kyc/initiate'
      });
    }
  }

  // Process transaction
  res.json({ message: 'Transaction created' });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 5: Check AML Risk Score
// ═══════════════════════════════════════════════════════════════

/**
 * Block high-risk users from sensitive operations
 */
router.post('/api/transfers/create', authenticate, requireKYC, async (req, res) => {
  const User = require('../models/user.model');
  const user = await User.findById(req.userID).select('amlRiskScore amlScreening');

  // Block flagged users
  if (user.amlScreening?.status === 'flagged') {
    return res.status(403).json({
      success: false,
      error: 'Account flagged for AML review. Please contact support.',
      errorAr: 'الحساب قيد المراجعة الأمنية. يرجى الاتصال بالدعم.',
      code: 'AML_FLAGGED'
    });
  }

  // Require manual review for high-risk users
  if (user.amlRiskScore > 60) {
    return res.status(403).json({
      success: false,
      error: 'Account requires manual review. Please contact support.',
      errorAr: 'الحساب يتطلب مراجعة يدوية. يرجى الاتصال بالدعم.',
      code: 'AML_HIGH_RISK',
      riskScore: user.amlRiskScore
    });
  }

  // Process transfer
  res.json({ message: 'Transfer created' });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 6: Show KYC Warnings Before Expiration
// ═══════════════════════════════════════════════════════════════

/**
 * Warn users when KYC is about to expire
 */
router.get('/api/dashboard', authenticate, checkKYC, async (req, res) => {
  let kycWarning = null;

  if (req.kycVerified && req.kycExpiresAt) {
    const daysUntilExpiration = Math.floor(
      (new Date(req.kycExpiresAt) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiration <= 30) {
      kycWarning = {
        message: `Your KYC verification expires in ${daysUntilExpiration} days`,
        messageAr: `تنتهي صلاحية التحقق من الهوية خلال ${daysUntilExpiration} يوم`,
        daysRemaining: daysUntilExpiration,
        severity: daysUntilExpiration <= 7 ? 'high' : 'medium',
        action: 'renew_kyc'
      };
    }
  }

  res.json({
    dashboard: {},
    kycWarning
  });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 7: Progressive KYC Flow
// ═══════════════════════════════════════════════════════════════

/**
 * Allow limited functionality without KYC, require it for full access
 */
router.post('/api/services/request', authenticate, checkKYC, (req, res) => {
  const { serviceType, amount } = req.body;

  // Basic services don't require KYC
  const basicServices = ['consultation', 'document_review'];

  if (!basicServices.includes(serviceType) && !req.kycVerified) {
    return res.status(403).json({
      success: false,
      error: 'KYC verification required for this service type',
      errorAr: 'التحقق من الهوية مطلوب لهذا النوع من الخدمات',
      code: 'KYC_REQUIRED_PREMIUM',
      allowedWithoutKYC: basicServices,
      redirectTo: '/kyc/initiate'
    });
  }

  res.json({ message: 'Service request created' });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 8: Custom KYC Error Handler
// ═══════════════════════════════════════════════════════════════

/**
 * Custom middleware with custom error messages
 */
const customKYCCheck = async (req, res, next) => {
  const kycService = require('../services/kyc.service');
  const result = await kycService.checkVerificationStatus(req.userID);

  if (!result.success || result.data.kycStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      error: 'To proceed, please complete identity verification',
      errorAr: 'للمتابعة، يرجى إكمال التحقق من الهوية',
      kycStatus: result.data?.kycStatus,
      customMessage: 'This operation requires identity verification for security',
      steps: [
        'Click "Verify Identity" button',
        'Enter your National ID and birth date',
        'Wait for automatic verification (usually instant)',
        'You will be notified when verification is complete'
      ]
    });
  }

  next();
};

router.post('/api/custom-protected', authenticate, customKYCCheck, (req, res) => {
  res.json({ message: 'Success' });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 9: Admin Override
// ═══════════════════════════════════════════════════════════════

/**
 * Allow admins to bypass KYC requirements
 */
const requireKYCUnlessAdmin = async (req, res, next) => {
  const User = require('../models/user.model');
  const user = await User.findById(req.userID).select('role kycStatus kycExpiresAt');

  // Admins bypass KYC
  if (user.role === 'admin') {
    return next();
  }

  // Apply normal KYC check for non-admins
  return requireKYC(req, res, next);
};

router.post('/api/admin-or-kyc', authenticate, requireKYCUnlessAdmin, (req, res) => {
  res.json({ message: 'Access granted' });
});

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 10: Batch KYC Check for Multiple Users
// ═══════════════════════════════════════════════════════════════

/**
 * Check KYC status for multiple users
 */
router.post('/api/admin/check-kyc-batch', authenticate, async (req, res) => {
  const { userIds } = req.body;
  const User = require('../models/user.model');

  const users = await User.find({ _id: { $in: userIds } })
    .select('_id firstName lastName kycStatus kycVerifiedAt kycExpiresAt amlRiskScore');

  const results = users.map(user => ({
    userId: user._id,
    name: `${user.firstName} ${user.lastName}`,
    kycStatus: user.kycStatus,
    kycVerifiedAt: user.kycVerifiedAt,
    kycExpiresAt: user.kycExpiresAt,
    isValid: user.kycStatus === 'verified' &&
             (!user.kycExpiresAt || new Date(user.kycExpiresAt) > new Date()),
    amlRiskScore: user.amlRiskScore,
    amlRiskLevel: user.amlRiskScore < 30 ? 'low' :
                  user.amlRiskScore < 60 ? 'medium' : 'high'
  }));

  res.json({
    success: true,
    data: results,
    summary: {
      total: results.length,
      verified: results.filter(r => r.isValid).length,
      pending: results.filter(r => r.kycStatus === 'pending').length,
      rejected: results.filter(r => r.kycStatus === 'rejected').length
    }
  });
});

module.exports = router;
