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
const { sensitiveRateLimiter, authRateLimiter } = require('../middlewares/rateLimiter.middleware');
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
router.get('/options', authRateLimiter, getFormOptions);

// Employee stats
router.get('/employees/stats', authRateLimiter, getEmployeeStats);

// Bulk delete employees (must be before /:id routes)
router.post('/employees/bulk-delete', sensitiveRateLimiter, bulkDeleteEmployees);

// Employee CRUD
router.post('/employees', sensitiveRateLimiter, validateCreateEmployee, createEmployee);
router.get('/employees', authRateLimiter, getEmployees);
router.get('/employees/:id', authRateLimiter, validateIdParam, getEmployee);
router.put('/employees/:id', sensitiveRateLimiter, validateIdParam, validateUpdateEmployee, updateEmployee);
router.delete('/employees/:id', sensitiveRateLimiter, validateIdParam, deleteEmployee);

// Allowances
router.post('/employees/:id/allowances', sensitiveRateLimiter, validateIdParam, validateAddAllowance, addAllowance);
router.delete('/employees/:id/allowances/:allowanceId', sensitiveRateLimiter, validateIdParam, removeAllowance);

// Employee Documents
// GET /api/hr/employees/:id/documents - List documents
router.get('/employees/:id/documents', authRateLimiter, validateIdParam, getEmployeeDocuments);
// POST /api/hr/employees/:id/documents - Upload document
router.post('/employees/:id/documents', sensitiveRateLimiter, validateIdParam, uploadEmployeeDocument);
// DELETE /api/hr/employees/:id/documents/:docId - Delete document
router.delete('/employees/:id/documents/:docId', sensitiveRateLimiter, validateIdParam, deleteEmployeeDocument);
// POST /api/hr/employees/:id/documents/:docId/verify - Verify document
router.post('/employees/:id/documents/:docId/verify', sensitiveRateLimiter, validateIdParam, verifyEmployeeDocument);

module.exports = router;
