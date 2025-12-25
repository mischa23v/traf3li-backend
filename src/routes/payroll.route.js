const express = require('express');
const router = express.Router();
const {
    getSalarySlips,
    getSalarySlip,
    createSalarySlip,
    updateSalarySlip,
    deleteSalarySlip,
    bulkDeleteSalarySlips,
    approveSalarySlip,
    paySalarySlip,
    getPayrollStats,
    generateBulkPayroll,
    bulkApprove,
    bulkPay,
    submitToWPS
} = require('../controllers/payroll.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { sensitiveRateLimiter, authRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateCreateSalarySlip,
    validateUpdateSalarySlip,
    validateGenerateBulkPayroll,
    validateIdParam
} = require('../validators/hr.validator');

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);

// Stats (must be before /:id to avoid conflict)
router.get('/stats', authRateLimiter, getPayrollStats);

// Bulk operations
router.post('/generate', sensitiveRateLimiter, validateGenerateBulkPayroll, generateBulkPayroll);
router.post('/approve', sensitiveRateLimiter, bulkApprove);
router.post('/pay', sensitiveRateLimiter, bulkPay);
router.post('/bulk-delete', sensitiveRateLimiter, bulkDeleteSalarySlips);
router.post('/wps/submit', sensitiveRateLimiter, submitToWPS);

// Single slip actions (must be before generic /:id routes)
router.post('/:id/approve', sensitiveRateLimiter, validateIdParam, approveSalarySlip);
router.post('/:id/pay', sensitiveRateLimiter, validateIdParam, paySalarySlip);

// CRUD
router.get('/', authRateLimiter, getSalarySlips);
router.post('/', sensitiveRateLimiter, validateCreateSalarySlip, createSalarySlip);
router.get('/:id', authRateLimiter, validateIdParam, getSalarySlip);
router.put('/:id', sensitiveRateLimiter, validateIdParam, validateUpdateSalarySlip, updateSalarySlip);
router.delete('/:id', sensitiveRateLimiter, validateIdParam, deleteSalarySlip);

module.exports = router;
