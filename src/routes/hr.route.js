const express = require('express');
const router = express.Router();
const {
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    bulkDeleteEmployees,
    getEmployeeStats,
    addAllowance,
    removeAllowance,
    getFormOptions,
    // Employee Documents
    getEmployeeDocuments,
    uploadEmployeeDocument,
    deleteEmployeeDocument,
    verifyEmployeeDocument
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

// Bulk delete employees (must be before /:id routes)
router.post('/employees/bulk-delete', bulkDeleteEmployees);

// Employee CRUD
router.post('/employees', validateCreateEmployee, createEmployee);
router.get('/employees', getEmployees);
router.get('/employees/:id', validateIdParam, getEmployee);
router.put('/employees/:id', validateIdParam, validateUpdateEmployee, updateEmployee);
router.delete('/employees/:id', validateIdParam, deleteEmployee);

// Allowances
router.post('/employees/:id/allowances', validateIdParam, validateAddAllowance, addAllowance);
router.delete('/employees/:id/allowances/:allowanceId', validateIdParam, removeAllowance);

// Employee Documents
// GET /api/hr/employees/:id/documents - List documents
router.get('/employees/:id/documents', validateIdParam, getEmployeeDocuments);
// POST /api/hr/employees/:id/documents - Upload document
router.post('/employees/:id/documents', validateIdParam, uploadEmployeeDocument);
// DELETE /api/hr/employees/:id/documents/:docId - Delete document
router.delete('/employees/:id/documents/:docId', validateIdParam, deleteEmployeeDocument);
// POST /api/hr/employees/:id/documents/:docId/verify - Verify document
router.post('/employees/:id/documents/:docId/verify', validateIdParam, verifyEmployeeDocument);

module.exports = router;
