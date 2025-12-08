const express = require('express');
const router = express.Router();
const {
    getSalarySlips,
    getSalarySlip,
    createSalarySlip,
    updateSalarySlip,
    deleteSalarySlip,
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
router.get('/stats', getPayrollStats);

// Bulk operations
router.post('/generate', validateGenerateBulkPayroll, generateBulkPayroll);
router.post('/approve', bulkApprove);
router.post('/pay', bulkPay);
router.post('/wps/submit', submitToWPS);

// Single slip actions (must be before generic /:id routes)
router.post('/:id/approve', validateIdParam, approveSalarySlip);
router.post('/:id/pay', validateIdParam, paySalarySlip);

// CRUD
router.get('/', getSalarySlips);
router.post('/', validateCreateSalarySlip, createSalarySlip);
router.get('/:id', validateIdParam, getSalarySlip);
router.put('/:id', validateIdParam, validateUpdateSalarySlip, updateSalarySlip);
router.delete('/:id', validateIdParam, deleteSalarySlip);

module.exports = router;
