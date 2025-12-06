const express = require('express');
const router = express.Router();
const {
    getLeaveRequests,
    getLeaveRequest,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    submitLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelLeaveRequest,
    confirmReturn,
    requestExtension,
    completeHandover,
    uploadDocument,
    getLeaveBalance,
    getLeaveStats,
    getTeamCalendar,
    checkConflicts,
    getPendingApprovals,
    getLeaveTypes
} = require('../controllers/leaveRequest.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);

// Static routes (must be before /:id to avoid conflict)
router.get('/types', getLeaveTypes);
router.get('/stats', getLeaveStats);
router.get('/calendar', getTeamCalendar);
router.get('/pending-approvals', getPendingApprovals);
router.post('/check-conflicts', checkConflicts);

// Balance route with employee ID
router.get('/balance/:employeeId', getLeaveBalance);

// Single request actions (must be before generic /:id routes)
router.post('/:id/submit', submitLeaveRequest);
router.post('/:id/approve', approveLeaveRequest);
router.post('/:id/reject', rejectLeaveRequest);
router.post('/:id/cancel', cancelLeaveRequest);
router.post('/:id/confirm-return', confirmReturn);
router.post('/:id/request-extension', requestExtension);
router.post('/:id/complete-handover', completeHandover);
router.post('/:id/documents', uploadDocument);

// CRUD
router.get('/', getLeaveRequests);
router.post('/', createLeaveRequest);
router.get('/:id', getLeaveRequest);
router.patch('/:id', updateLeaveRequest);
router.delete('/:id', deleteLeaveRequest);

module.exports = router;
