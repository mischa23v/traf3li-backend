const express = require('express');
const router = express.Router();
const {
    getPayrollRuns,
    getPayrollRunStats,
    getPayrollRun,
    createPayrollRun,
    updatePayrollRun,
    deletePayrollRun,
    bulkDeletePayrollRuns,
    calculatePayroll,
    validatePayroll,
    approvePayroll,
    processPayments,
    cancelPayroll,
    generateWPS,
    holdEmployee,
    unholdEmployee,
    sendNotifications
} = require('../controllers/payrollRun.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateCreatePayrollRun,
    validateUpdatePayrollRun,
    validateIdParam
} = require('../validators/hr.validator');

// All routes require authentication
router.use(apiRateLimiter);
router.use(verifyToken);
router.use(attachFirmContext);

// Stats (must be before /:id)
router.get('/stats', getPayrollRunStats);

// Bulk delete (must be before /:id)
router.post('/bulk-delete', bulkDeletePayrollRuns);

// CRUD
router.get('/', getPayrollRuns);
router.post('/', validateCreatePayrollRun, createPayrollRun);
router.get('/:id', validateIdParam, getPayrollRun);
router.patch('/:id', validateIdParam, validateUpdatePayrollRun, updatePayrollRun);
router.delete('/:id', validateIdParam, deletePayrollRun);

// Workflow actions
router.post('/:id/calculate', validateIdParam, calculatePayroll);
router.post('/:id/validate', validateIdParam, validatePayroll);
router.post('/:id/approve', validateIdParam, approvePayroll);
router.post('/:id/process-payments', validateIdParam, processPayments);
router.post('/:id/cancel', validateIdParam, cancelPayroll);

// WPS
router.post('/:id/generate-wps', validateIdParam, generateWPS);

// Notifications
router.post('/:id/send-notifications', validateIdParam, sendNotifications);

// Employee-specific actions
router.post('/:id/employees/:empId/hold', validateIdParam, holdEmployee);
router.post('/:id/employees/:empId/unhold', validateIdParam, unholdEmployee);

module.exports = router;
