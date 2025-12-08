const express = require('express');
const router = express.Router();
const {
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
    addAllowance,
    removeAllowance,
    getFormOptions
} = require('../controllers/hr.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const {
    validateCreateEmployee,
    validateUpdateEmployee,
    validateAddAllowance,
    validateIdParam
} = require('../validators/hr.validator');

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);

// Form options (dropdowns, etc.)
router.get('/options', getFormOptions);

// Employee stats
router.get('/employees/stats', getEmployeeStats);

// Employee CRUD
router.post('/employees', validateCreateEmployee, createEmployee);
router.get('/employees', getEmployees);
router.get('/employees/:id', validateIdParam, getEmployee);
router.put('/employees/:id', validateIdParam, validateUpdateEmployee, updateEmployee);
router.delete('/employees/:id', validateIdParam, deleteEmployee);

// Allowances
router.post('/employees/:id/allowances', validateIdParam, validateAddAllowance, addAllowance);
router.delete('/employees/:id/allowances/:allowanceId', validateIdParam, removeAllowance);

module.exports = router;
