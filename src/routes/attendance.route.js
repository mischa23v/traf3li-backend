const express = require('express');
const {
    checkIn,
    checkOut,
    getAttendance,
    getAttendanceById,
    getTodayAttendance,
    updateAttendance,
    createManualAttendance,
    startBreak,
    endBreak,
    approveOvertime,
    getAttendanceSummary,
    getLateReport,
    deleteAttendance,
    markAbsent
} = require('../controllers/attendance.controller');
const userMiddleware = require('../middlewares/userMiddleware');

const router = express.Router();

// Check-in/out operations
router.post('/check-in', userMiddleware, checkIn);
router.post('/check-out', userMiddleware, checkOut);

// Today's attendance
router.get('/today', userMiddleware, getTodayAttendance);

// Reports & summaries (place before :id routes)
router.get('/summary', userMiddleware, getAttendanceSummary);
router.get('/late-report', userMiddleware, getLateReport);

// Manual operations
router.post('/manual', userMiddleware, createManualAttendance);
router.post('/mark-absent', userMiddleware, markAbsent);

// CRUD operations
router.get('/', userMiddleware, getAttendance);
router.get('/:id', userMiddleware, getAttendanceById);
router.put('/:id', userMiddleware, updateAttendance);
router.delete('/:id', userMiddleware, deleteAttendance);

// Break management
router.post('/:id/break/start', userMiddleware, startBreak);
router.post('/:id/break/end', userMiddleware, endBreak);

// Overtime approval
router.post('/:id/overtime/approve', userMiddleware, approveOvertime);

module.exports = router;
