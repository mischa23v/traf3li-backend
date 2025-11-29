const express = require('express');
const {
    createEmployee,
    getEmployees,
    getEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    getEmployeeStats,
    updateLeaveBalance,
    addDocument,
    deleteDocument,
    getOrgChart
} = require('../controllers/employee.controller');
const userMiddleware = require('../middlewares/userMiddleware');

const router = express.Router();

// Search & Stats (place before :id routes)
router.get('/search', userMiddleware, searchEmployees);
router.get('/stats', userMiddleware, getEmployeeStats);
router.get('/org-chart', userMiddleware, getOrgChart);

// CRUD operations
router.post('/', userMiddleware, createEmployee);
router.get('/', userMiddleware, getEmployees);
router.get('/:id', userMiddleware, getEmployee);
router.put('/:id', userMiddleware, updateEmployee);
router.delete('/:id', userMiddleware, deleteEmployee);

// Leave balance management
router.patch('/:id/leave-balance', userMiddleware, updateLeaveBalance);

// Document management
router.post('/:id/documents', userMiddleware, addDocument);
router.delete('/:id/documents/:docId', userMiddleware, deleteDocument);

module.exports = router;
