const express = require('express');
const router = express.Router();
const {
    getPayrollRuns,
    getPayrollRunStats,
    getPayrollRun,
    createPayrollRun,
    updatePayrollRun,
    deletePayrollRun,
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

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);

// Stats (must be before /:id)
router.get('/stats', getPayrollRunStats);

// CRUD
router.get('/', getPayrollRuns);
router.post('/', createPayrollRun);
router.get('/:id', getPayrollRun);
router.patch('/:id', updatePayrollRun);
router.delete('/:id', deletePayrollRun);

// Workflow actions
router.post('/:id/calculate', calculatePayroll);
router.post('/:id/validate', validatePayroll);
router.post('/:id/approve', approvePayroll);
router.post('/:id/process-payments', processPayments);
router.post('/:id/cancel', cancelPayroll);

// WPS
router.post('/:id/generate-wps', generateWPS);

// Notifications
router.post('/:id/send-notifications', sendNotifications);

// Employee-specific actions
router.post('/:id/employees/:empId/hold', holdEmployee);
router.post('/:id/employees/:empId/unhold', unholdEmployee);

module.exports = router;
