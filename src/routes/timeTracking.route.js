const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    // Timer operations
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getTimerStatus,

    // Time entry CRUD
    createTimeEntry,
    getTimeEntries,
    getTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,

    // Write-off / Write-down
    writeOffTimeEntry,
    writeDownTimeEntry,

    // Approval workflow
    getPendingApprovalEntries,
    submitTimeEntry,
    bulkSubmitTimeEntries,
    requestChangesTimeEntry,
    approveTimeEntry,
    rejectTimeEntry,
    bulkRejectTimeEntries,

    // Analytics
    getTimeStats,
    getWeeklyEntries,
    getUnbilledEntries,

    // UTBMS codes
    getActivityCodes,

    // Bulk operations
    bulkDeleteTimeEntries,
    bulkApproveTimeEntries
} = require('../controllers/timeTracking.controller');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// TIMER ROUTES
// ═══════════════════════════════════════════════════════════════
router.post('/timer/start', userMiddleware, firmFilter, startTimer);
router.post('/timer/pause', userMiddleware, firmFilter, pauseTimer);
router.post('/timer/resume', userMiddleware, firmFilter, resumeTimer);
router.post('/timer/stop', userMiddleware, firmFilter, stopTimer);
router.get('/timer/status', userMiddleware, firmFilter, getTimerStatus);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Analytics & Reports
router.get('/weekly', userMiddleware, firmFilter, getWeeklyEntries);
router.get('/stats', userMiddleware, firmFilter, getTimeStats);
router.get('/unbilled', userMiddleware, firmFilter, getUnbilledEntries);

// UTBMS Activity Codes
router.get('/activity-codes', userMiddleware, firmFilter, getActivityCodes);

// Bulk Operations
router.delete('/entries/bulk', userMiddleware, firmFilter, bulkDeleteTimeEntries);
router.post('/entries/bulk-approve', userMiddleware, firmFilter, bulkApproveTimeEntries);
router.post('/entries/bulk-reject', userMiddleware, firmFilter, bulkRejectTimeEntries);
router.post('/entries/bulk-submit', userMiddleware, firmFilter, bulkSubmitTimeEntries);

// Pending Approvals (must be before :id routes)
router.get('/entries/pending-approval', userMiddleware, firmFilter, getPendingApprovalEntries);

// ═══════════════════════════════════════════════════════════════
// TIME ENTRY CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create time entry
// POST /api/time-tracking/entries
// Body: clientId, date, description, duration, hourlyRate, ...
router.post('/entries', userMiddleware, firmFilter, createTimeEntry);

// Get all time entries with filters
// GET /api/time-tracking/entries
// Query: startDate, endDate, caseId, clientId, assigneeId, status, billStatus, timeType, activityCode, page, limit
router.get('/entries', userMiddleware, firmFilter, getTimeEntries);

// Get single time entry
// GET /api/time-tracking/entries/:id
router.get('/entries/:id', userMiddleware, firmFilter, getTimeEntry);

// Update time entry
// PATCH /api/time-tracking/entries/:id
router.patch('/entries/:id', userMiddleware, firmFilter, updateTimeEntry);
router.put('/entries/:id', userMiddleware, firmFilter, updateTimeEntry);

// Delete time entry
// DELETE /api/time-tracking/entries/:id
router.delete('/entries/:id', userMiddleware, firmFilter, deleteTimeEntry);

// ═══════════════════════════════════════════════════════════════
// WRITE-OFF / WRITE-DOWN ROUTES
// ═══════════════════════════════════════════════════════════════

// Write off a time entry (شطب الوقت)
// POST /api/time-tracking/entries/:id/write-off
// Body: { reason: string }
router.post('/entries/:id/write-off', userMiddleware, firmFilter, writeOffTimeEntry);

// Write down a time entry (تخفيض المبلغ)
// POST /api/time-tracking/entries/:id/write-down
// Body: { amount: number, reason: string }
router.post('/entries/:id/write-down', userMiddleware, firmFilter, writeDownTimeEntry);

// ═══════════════════════════════════════════════════════════════
// APPROVAL ROUTES
// ═══════════════════════════════════════════════════════════════

// Submit time entry for approval
// POST /api/time-tracking/entries/:id/submit
router.post('/entries/:id/submit', userMiddleware, firmFilter, submitTimeEntry);

// Request changes to time entry
// POST /api/time-tracking/entries/:id/request-changes
// Body: { reason: string, requestedChanges: [] }
router.post('/entries/:id/request-changes', userMiddleware, firmFilter, requestChangesTimeEntry);

// Approve time entry
// POST /api/time-tracking/entries/:id/approve
router.post('/entries/:id/approve', userMiddleware, firmFilter, approveTimeEntry);

// Reject time entry
// POST /api/time-tracking/entries/:id/reject
// Body: { reason: string }
router.post('/entries/:id/reject', userMiddleware, firmFilter, rejectTimeEntry);

module.exports = router;
