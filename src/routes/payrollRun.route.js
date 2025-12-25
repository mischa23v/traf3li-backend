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
    excludeEmployee,
    includeEmployee,
    recalculateSingleEmployee,
    exportPayrollReport,
    sendNotifications
} = require('../controllers/payrollRun.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { sensitiveRateLimiter, authRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateCreatePayrollRun,
    validateUpdatePayrollRun,
    validateIdParam
} = require('../validators/hr.validator');

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);

// Stats (must be before /:id)
router.get('/stats', authRateLimiter, getPayrollRunStats);

// Bulk delete (must be before /:id)
router.post('/bulk-delete', sensitiveRateLimiter, bulkDeletePayrollRuns);

// CRUD
router.get('/', authRateLimiter, getPayrollRuns);
router.post('/', sensitiveRateLimiter, validateCreatePayrollRun, createPayrollRun);
router.get('/:id', authRateLimiter, validateIdParam, getPayrollRun);
router.patch('/:id', sensitiveRateLimiter, validateIdParam, validateUpdatePayrollRun, updatePayrollRun);
router.delete('/:id', sensitiveRateLimiter, validateIdParam, deletePayrollRun);

// Workflow actions
router.post('/:id/calculate', sensitiveRateLimiter, validateIdParam, calculatePayroll);
router.post('/:id/validate', sensitiveRateLimiter, validateIdParam, validatePayroll);
router.post('/:id/approve', sensitiveRateLimiter, validateIdParam, approvePayroll);
router.post('/:id/process-payments', sensitiveRateLimiter, validateIdParam, processPayments);
router.post('/:id/cancel', sensitiveRateLimiter, validateIdParam, cancelPayroll);

// WPS
router.post('/:id/generate-wps', sensitiveRateLimiter, validateIdParam, generateWPS);

// Notifications
router.post('/:id/send-notifications', sensitiveRateLimiter, validateIdParam, sendNotifications);

// Export payroll report (must be before employee-specific routes)
// GET /api/hr/payroll-runs/:id/export?format=json|csv|xlsx|pdf
router.get('/:id/export', authRateLimiter, validateIdParam, exportPayrollReport);

// Employee-specific actions
router.post('/:id/employees/:empId/hold', sensitiveRateLimiter, validateIdParam, holdEmployee);
router.post('/:id/employees/:empId/unhold', sensitiveRateLimiter, validateIdParam, unholdEmployee);
router.post('/:id/employees/:empId/exclude', sensitiveRateLimiter, validateIdParam, excludeEmployee);
router.post('/:id/employees/:empId/include', sensitiveRateLimiter, validateIdParam, includeEmployee);
router.post('/:id/employees/:empId/recalculate', sensitiveRateLimiter, validateIdParam, recalculateSingleEmployee);

module.exports = router;
