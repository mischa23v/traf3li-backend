const express = require('express');
const {
    createLeave,
    getLeaves,
    getLeave,
    updateLeave,
    approveLeave,
    rejectLeave,
    cancelLeave,
    getLeaveBalance,
    getEmployeesOnLeaveToday,
    getLeaveStats,
    deleteLeave,
    addAttachment
} = require('../controllers/leave.controller');
const userMiddleware = require('../middlewares/userMiddleware');

const router = express.Router();

// Stats & special routes (place before :id routes)
router.get('/today', userMiddleware, getEmployeesOnLeaveToday);
router.get('/stats', userMiddleware, getLeaveStats);
router.get('/balance/:employeeId', userMiddleware, getLeaveBalance);

// CRUD operations
router.post('/', userMiddleware, createLeave);
router.get('/', userMiddleware, getLeaves);
router.get('/:id', userMiddleware, getLeave);
router.put('/:id', userMiddleware, updateLeave);
router.delete('/:id', userMiddleware, deleteLeave);

// Workflow actions
router.post('/:id/approve', userMiddleware, approveLeave);
router.post('/:id/reject', userMiddleware, rejectLeave);
router.post('/:id/cancel', userMiddleware, cancelLeave);

// Attachments
router.post('/:id/attachments', userMiddleware, addAttachment);

module.exports = router;
