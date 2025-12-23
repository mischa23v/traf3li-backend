const express = require('express');
const router = express.Router();
const {
    getLeaveRequests,
    getLeaveRequest,
    createLeaveRequest,
    updateLeaveRequest,
    deleteLeaveRequest,
    bulkDeleteLeaveRequests,
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
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateCreateLeaveRequest,
    validateUpdateLeaveRequest,
    validateReviewLeaveRequest,
    validateRequestExtension,
    validateIdParam,
    validateEmployeeIdParam
} = require('../validators/hr.validator');

// All routes require authentication
router.use(verifyToken);
router.use(attachFirmContext);
router.use(apiRateLimiter);

// Static routes (must be before /:id to avoid conflict)
router.get('/types', getLeaveTypes);
router.get('/stats', getLeaveStats);
router.get('/calendar', getTeamCalendar);
router.get('/pending-approvals', getPendingApprovals);
router.post('/check-conflicts', checkConflicts);
router.post('/bulk-delete', bulkDeleteLeaveRequests);

// Balance route with employee ID
router.get('/balance/:employeeId', validateEmployeeIdParam, getLeaveBalance);

// Single request actions (must be before generic /:id routes)
router.post('/:id/submit', validateIdParam, submitLeaveRequest);
router.post('/:id/approve', validateIdParam, validateReviewLeaveRequest, approveLeaveRequest);
router.post('/:id/reject', validateIdParam, validateReviewLeaveRequest, rejectLeaveRequest);
router.post('/:id/cancel', validateIdParam, cancelLeaveRequest);
router.post('/:id/confirm-return', validateIdParam, confirmReturn);
router.post('/:id/request-extension', validateIdParam, validateRequestExtension, requestExtension);
router.post('/:id/complete-handover', validateIdParam, completeHandover);
router.post('/:id/documents', validateIdParam, uploadDocument);

// CRUD
router.get('/', getLeaveRequests);
router.post('/', validateCreateLeaveRequest, createLeaveRequest);
router.get('/:id', validateIdParam, getLeaveRequest);
router.patch('/:id', validateIdParam, validateUpdateLeaveRequest, updateLeaveRequest);
router.delete('/:id', validateIdParam, deleteLeaveRequest);

module.exports = router;
