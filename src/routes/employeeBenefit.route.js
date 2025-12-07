const express = require('express');
const router = express.Router();
const employeeBenefitController = require('../controllers/employeeBenefit.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Statistics & Reports
router.get('/stats', employeeBenefitController.getBenefitStats);
router.get('/expiring', employeeBenefitController.getExpiringBenefits);
router.get('/cost-summary', employeeBenefitController.getCostSummary);
router.get('/export', employeeBenefitController.exportBenefits);

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List all benefits
router.get('/', employeeBenefitController.getBenefits);

// Create new benefit
router.post('/', employeeBenefitController.createBenefit);

// Bulk delete
router.post('/bulk-delete', employeeBenefitController.bulkDeleteBenefits);

// Get benefits by employee (before :id to avoid conflict)
router.get('/employee/:employeeId', employeeBenefitController.getEmployeeBenefits);

// ═══════════════════════════════════════════════════════════════
// SINGLE BENEFIT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single benefit
router.get('/:id', employeeBenefitController.getBenefit);

// Update benefit
router.patch('/:id', employeeBenefitController.updateBenefit);

// Delete benefit
router.delete('/:id', employeeBenefitController.deleteBenefit);

// ═══════════════════════════════════════════════════════════════
// STATUS ACTIONS
// ═══════════════════════════════════════════════════════════════

router.post('/:id/activate', employeeBenefitController.activateBenefit);
router.post('/:id/suspend', employeeBenefitController.suspendBenefit);
router.post('/:id/terminate', employeeBenefitController.terminateBenefit);

// ═══════════════════════════════════════════════════════════════
// DEPENDENTS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

router.post('/:id/dependents', employeeBenefitController.addDependent);
router.delete('/:id/dependents/:memberId', employeeBenefitController.removeDependent);

// ═══════════════════════════════════════════════════════════════
// BENEFICIARIES MANAGEMENT
// ═══════════════════════════════════════════════════════════════

router.post('/:id/beneficiaries', employeeBenefitController.addBeneficiary);
router.patch('/:id/beneficiaries/:beneficiaryId', employeeBenefitController.updateBeneficiary);
router.delete('/:id/beneficiaries/:beneficiaryId', employeeBenefitController.removeBeneficiary);

// ═══════════════════════════════════════════════════════════════
// CLAIMS
// ═══════════════════════════════════════════════════════════════

router.post('/:id/claims', employeeBenefitController.submitClaim);
router.patch('/:id/claims/:claimId', employeeBenefitController.updateClaimStatus);

// ═══════════════════════════════════════════════════════════════
// PRE-AUTHORIZATION
// ═══════════════════════════════════════════════════════════════

router.post('/:id/pre-auth', employeeBenefitController.requestPreAuth);

// ═══════════════════════════════════════════════════════════════
// QUALIFYING EVENTS
// ═══════════════════════════════════════════════════════════════

router.post('/:id/qualifying-events', employeeBenefitController.reportQualifyingEvent);

module.exports = router;
