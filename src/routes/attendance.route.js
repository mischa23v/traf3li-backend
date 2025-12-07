const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

/**
 * Attendance Routes
 * MODULE 5: الحضور والانصراف
 * Base path: /api/attendance
 *
 * IMPORTANT: Static routes must be defined BEFORE parameterized routes (/:id)
 */

// Apply authentication middleware to all routes
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATISTICS & REPORTS ROUTES (must be before /:id)
// ═══════════════════════════════════════════════════════════════

// GET /api/attendance/today - Get today's attendance overview
router.get('/today', attendanceController.getTodayAttendance);

// GET /api/attendance/violations - Get all violations
router.get('/violations', attendanceController.getViolations);

// GET /api/attendance/corrections/pending - Get all pending corrections
router.get('/corrections/pending', attendanceController.getPendingCorrections);

// GET /api/attendance/report/monthly - Get monthly attendance report
router.get('/report/monthly', attendanceController.getMonthlyReport);

// GET /api/attendance/stats/department - Get department statistics
router.get('/stats/department', attendanceController.getDepartmentStats);

// ═══════════════════════════════════════════════════════════════
// CHECK-IN / CHECK-OUT ROUTES (must be before /:id)
// ═══════════════════════════════════════════════════════════════

// POST /api/attendance/check-in - Employee check-in
router.post('/check-in', attendanceController.checkIn);

// POST /api/attendance/check-out - Employee check-out
router.post('/check-out', attendanceController.checkOut);

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS ROUTES (must be before /:id)
// ═══════════════════════════════════════════════════════════════

// POST /api/attendance/mark-absences - Mark absences for date
router.post('/mark-absences', attendanceController.markAbsences);

// POST /api/attendance/import - Bulk import attendance records
router.post('/import', attendanceController.importAttendance);

// ═══════════════════════════════════════════════════════════════
// ROUTES WITH SUB-PATHS (must be before /:id)
// ═══════════════════════════════════════════════════════════════

// GET /api/attendance/status/:employeeId - Get current check-in status
router.get('/status/:employeeId', attendanceController.getCheckInStatus);

// GET /api/attendance/summary/:employeeId - Get attendance summary for employee
router.get('/summary/:employeeId', attendanceController.getAttendanceSummary);

// GET /api/attendance/employee/:employeeId/date/:date - Get attendance by employee and date
router.get('/employee/:employeeId/date/:date', attendanceController.getAttendanceByEmployeeAndDate);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/attendance - Get all attendance records with filtering
router.get('/', attendanceController.getAttendanceRecords);

// POST /api/attendance - Create manual attendance record
router.post('/', attendanceController.createAttendanceRecord);

// GET /api/attendance/:id - Get single attendance record
router.get('/:id', attendanceController.getAttendanceById);

// PUT /api/attendance/:id - Update attendance record
router.put('/:id', attendanceController.updateAttendanceRecord);

// DELETE /api/attendance/:id - Delete attendance record
router.delete('/:id', attendanceController.deleteAttendanceRecord);

// ═══════════════════════════════════════════════════════════════
// BREAK MANAGEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/attendance/:id/break/start - Start break
router.post('/:id/break/start', attendanceController.startBreak);

// POST /api/attendance/:id/break/end - End break
router.post('/:id/break/end', attendanceController.endBreak);

// GET /api/attendance/:id/breaks - Get break history
router.get('/:id/breaks', attendanceController.getBreaks);

// ═══════════════════════════════════════════════════════════════
// CORRECTION ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/attendance/:id/corrections - Submit correction request
router.post('/:id/corrections', attendanceController.submitCorrection);

// PUT /api/attendance/:id/corrections/:correctionId - Review correction request
router.put('/:id/corrections/:correctionId', attendanceController.reviewCorrection);

// ═══════════════════════════════════════════════════════════════
// APPROVAL ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/attendance/:id/approve - Approve attendance record
router.post('/:id/approve', attendanceController.approveAttendance);

// POST /api/attendance/:id/reject - Reject attendance record
router.post('/:id/reject', attendanceController.rejectAttendance);

// ═══════════════════════════════════════════════════════════════
// VIOLATION ROUTES (with :id parameter)
// ═══════════════════════════════════════════════════════════════

// POST /api/attendance/:id/violations - Add violation
router.post('/:id/violations', attendanceController.addViolation);

// PUT /api/attendance/:id/violations/:violationIndex/resolve - Resolve violation
router.put('/:id/violations/:violationIndex/resolve', attendanceController.resolveViolation);

// POST /api/attendance/:id/violations/:violationIndex/appeal - Appeal violation
router.post('/:id/violations/:violationIndex/appeal', attendanceController.appealViolation);

// ═══════════════════════════════════════════════════════════════
// OVERTIME ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/attendance/:id/overtime/approve - Approve overtime
router.post('/:id/overtime/approve', attendanceController.approveOvertime);

module.exports = router;
