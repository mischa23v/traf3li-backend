const express = require('express');
const {
    createSalary,
    getSalaries,
    getSalary,
    getCurrentSalary,
    getSalaryHistory,
    updateSalary,
    deleteSalary,
    addAllowance,
    addDeduction,
    getSalaryStats
} = require('../controllers/salary.controller');
const userMiddleware = require('../middlewares/userMiddleware');

const router = express.Router();

// Stats (place before :id routes)
router.get('/stats', userMiddleware, getSalaryStats);

// Employee-specific routes
router.get('/employee/:employeeId/current', userMiddleware, getCurrentSalary);
router.get('/employee/:employeeId/history', userMiddleware, getSalaryHistory);

// CRUD operations
router.post('/', userMiddleware, createSalary);
router.get('/', userMiddleware, getSalaries);
router.get('/:id', userMiddleware, getSalary);
router.put('/:id', userMiddleware, updateSalary);
router.delete('/:id', userMiddleware, deleteSalary);

// Allowances and deductions
router.post('/:id/allowances', userMiddleware, addAllowance);
router.post('/:id/deductions', userMiddleware, addDeduction);

module.exports = router;
