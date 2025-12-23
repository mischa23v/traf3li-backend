const express = require('express');
const router = express.Router();
const employeeBenefitController = require('../controllers/employeeBenefit.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateCreateBenefit,
    validateUpdateBenefit,
    validateAddDependent,
    validateAddBeneficiary,
    validateSubmitClaim,
    validateIdParam,
    validateEmployeeIdParam
} = require('../validators/hr.validator');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

router.use(apiRateLimiter);
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
router.post('/', validateCreateBenefit, employeeBenefitController.createBenefit);

// Bulk delete
router.post('/bulk-delete', employeeBenefitController.bulkDeleteBenefits);

// Get benefits by employee (before :id to avoid conflict)
router.get('/employee/:employeeId', validateEmployeeIdParam, employeeBenefitController.getEmployeeBenefits);

// ═══════════════════════════════════════════════════════════════
// SINGLE BENEFIT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single benefit
router.get('/:id', validateIdParam, employeeBenefitController.getBenefit);

// Update benefit
router.patch('/:id', validateIdParam, validateUpdateBenefit, employeeBenefitController.updateBenefit);

// Delete benefit
router.delete('/:id', validateIdParam, employeeBenefitController.deleteBenefit);

// ═══════════════════════════════════════════════════════════════
// STATUS ACTIONS
// ═══════════════════════════════════════════════════════════════

router.post('/:id/activate', validateIdParam, employeeBenefitController.activateBenefit);
router.post('/:id/suspend', validateIdParam, employeeBenefitController.suspendBenefit);
router.post('/:id/terminate', validateIdParam, employeeBenefitController.terminateBenefit);

// ═══════════════════════════════════════════════════════════════
// DEPENDENTS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

router.post('/:id/dependents', validateIdParam, validateAddDependent, employeeBenefitController.addDependent);
router.delete('/:id/dependents/:memberId', validateIdParam, employeeBenefitController.removeDependent);

// ═══════════════════════════════════════════════════════════════
// BENEFICIARIES MANAGEMENT
// ═══════════════════════════════════════════════════════════════

router.post('/:id/beneficiaries', validateIdParam, validateAddBeneficiary, employeeBenefitController.addBeneficiary);
router.patch('/:id/beneficiaries/:beneficiaryId', validateIdParam, validateAddBeneficiary, employeeBenefitController.updateBeneficiary);
router.delete('/:id/beneficiaries/:beneficiaryId', validateIdParam, employeeBenefitController.removeBeneficiary);

// ═══════════════════════════════════════════════════════════════
// CLAIMS
// ═══════════════════════════════════════════════════════════════

router.post('/:id/claims', validateIdParam, validateSubmitClaim, employeeBenefitController.submitClaim);
router.patch('/:id/claims/:claimId', validateIdParam, employeeBenefitController.updateClaimStatus);

// ═══════════════════════════════════════════════════════════════
// PRE-AUTHORIZATION
// ═══════════════════════════════════════════════════════════════

router.post('/:id/pre-auth', employeeBenefitController.requestPreAuth);

// ═══════════════════════════════════════════════════════════════
// QUALIFYING EVENTS
// ═══════════════════════════════════════════════════════════════

router.post('/:id/qualifying-events', employeeBenefitController.reportQualifyingEvent);

module.exports = router;
