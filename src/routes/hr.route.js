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

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);

// Form options (dropdowns, etc.)
router.get('/options', getFormOptions);

// Employee stats
router.get('/employees/stats', getEmployeeStats);

// Employee CRUD
router.post('/employees', createEmployee);
router.get('/employees', getEmployees);
router.get('/employees/:id', getEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// Allowances
router.post('/employees/:id/allowances', addAllowance);
router.delete('/employees/:id/allowances/:allowanceId', removeAllowance);

module.exports = router;
