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

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);

// Stats (must be before /:id to avoid conflict)
router.get('/stats', getPayrollStats);

// Bulk operations
router.post('/generate', generateBulkPayroll);
router.post('/approve', bulkApprove);
router.post('/pay', bulkPay);
router.post('/wps/submit', submitToWPS);

// Single slip actions (must be before generic /:id routes)
router.post('/:id/approve', approveSalarySlip);
router.post('/:id/pay', paySalarySlip);

// CRUD
router.get('/', getSalarySlips);
router.post('/', createSalarySlip);
router.get('/:id', getSalarySlip);
router.put('/:id', updateSalarySlip);
router.delete('/:id', deleteSalarySlip);

module.exports = router;
