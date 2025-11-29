const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    // Employees
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
    // Salaries
    createSalary,
    getSalaries,
    getSalary,
    updateSalary,
    deleteSalary,
    approveSalary,
    paySalary,
    // Payroll
    createPayroll,
    getPayrolls,
    getPayroll,
    updatePayroll,
    deletePayroll,
    approvePayroll,
    processPayrollPayment,
    getPayrollStats
} = require('../controllers/hr.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════════════════
// EMPLOYEE ROUTES - /api/hr/employees
// ═══════════════════════════════════════════════════════════════════════════

// Statistics (must be before :id route)
router.get('/employees/stats', userMiddleware, getEmployeeStats);

// CRUD operations
router.post('/employees', userMiddleware, createEmployee);
router.get('/employees', userMiddleware, getEmployees);
router.get('/employees/:id', userMiddleware, getEmployee);
router.put('/employees/:id', userMiddleware, updateEmployee);
router.delete('/employees/:id', userMiddleware, deleteEmployee);

// ═══════════════════════════════════════════════════════════════════════════
// SALARY ROUTES - /api/hr/salaries
// ═══════════════════════════════════════════════════════════════════════════

// CRUD operations
router.post('/salaries', userMiddleware, createSalary);
router.get('/salaries', userMiddleware, getSalaries);
router.get('/salaries/:id', userMiddleware, getSalary);
router.put('/salaries/:id', userMiddleware, updateSalary);
router.delete('/salaries/:id', userMiddleware, deleteSalary);

// Salary actions
router.post('/salaries/:id/approve', userMiddleware, approveSalary);
router.post('/salaries/:id/pay', userMiddleware, paySalary);

// ═══════════════════════════════════════════════════════════════════════════
// PAYROLL ROUTES - /api/hr/payroll
// ═══════════════════════════════════════════════════════════════════════════

// Statistics (must be before :id route)
router.get('/payroll/stats', userMiddleware, getPayrollStats);

// CRUD operations
router.post('/payroll', userMiddleware, createPayroll);
router.get('/payroll', userMiddleware, getPayrolls);
router.get('/payroll/:id', userMiddleware, getPayroll);
router.put('/payroll/:id', userMiddleware, updatePayroll);
router.delete('/payroll/:id', userMiddleware, deletePayroll);

// Payroll actions
router.post('/payroll/:id/approve', userMiddleware, approvePayroll);
router.post('/payroll/:id/pay', userMiddleware, processPayrollPayment);

module.exports = router;
