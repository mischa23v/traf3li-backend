const express = require('express');
const {
    createPayroll,
    getPayrolls,
    getPayroll,
    getPayrollByPeriod,
    updatePayrollItem,
    submitPayroll,
    approvePayroll,
    rejectPayroll,
    processPayroll,
    getYearlySummary,
    deletePayroll
} = require('../controllers/payroll.controller');
const userMiddleware = require('../middlewares/userMiddleware');

const router = express.Router();

// Summary routes (place before :id routes)
router.get('/summary/:year', userMiddleware, getYearlySummary);
router.get('/period/:year/:month', userMiddleware, getPayrollByPeriod);

// CRUD operations
router.post('/', userMiddleware, createPayroll);
router.get('/', userMiddleware, getPayrolls);
router.get('/:id', userMiddleware, getPayroll);
router.delete('/:id', userMiddleware, deletePayroll);

// Payroll item update
router.patch('/:id/items/:itemId', userMiddleware, updatePayrollItem);

// Workflow actions
router.post('/:id/submit', userMiddleware, submitPayroll);
router.post('/:id/approve', userMiddleware, approvePayroll);
router.post('/:id/reject', userMiddleware, rejectPayroll);
router.post('/:id/process', userMiddleware, processPayroll);

module.exports = router;
