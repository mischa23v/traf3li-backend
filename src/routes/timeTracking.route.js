const express = require('express');
const { userMiddleware } = require('../middlewares');
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

    // Lock / Unlock (Gold Standard - Fiscal Period Control)
    lockTimeEntry,
    unlockTimeEntry,
    bulkLockTimeEntries,

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
router.post('/timer/start', userMiddleware, startTimer);
router.post('/timer/pause', userMiddleware, pauseTimer);
router.post('/timer/resume', userMiddleware, resumeTimer);
router.post('/timer/stop', userMiddleware, stopTimer);
router.get('/timer/status', userMiddleware, getTimerStatus);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Analytics & Reports
router.get('/weekly', userMiddleware, getWeeklyEntries);
router.get('/stats', userMiddleware, getTimeStats);
router.get('/unbilled', userMiddleware, getUnbilledEntries);

// UTBMS Activity Codes
router.get('/activity-codes', userMiddleware, getActivityCodes);

// Bulk Operations
router.delete('/entries/bulk', userMiddleware, bulkDeleteTimeEntries);
router.post('/entries/bulk-approve', userMiddleware, bulkApproveTimeEntries);
router.post('/entries/bulk-reject', userMiddleware, bulkRejectTimeEntries);
router.post('/entries/bulk-submit', userMiddleware, bulkSubmitTimeEntries);
router.post('/entries/bulk-lock', userMiddleware, bulkLockTimeEntries);

// Pending Approvals (must be before :id routes)
router.get('/entries/pending-approval', userMiddleware, getPendingApprovalEntries);

// ═══════════════════════════════════════════════════════════════
// TIME ENTRY CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// Create time entry
// POST /api/time-tracking/entries
// Body: clientId, date, description, duration, hourlyRate, ...
router.post('/entries', userMiddleware, createTimeEntry);

// Get all time entries with filters
// GET /api/time-tracking/entries
// Query: startDate, endDate, caseId, clientId, assigneeId, status, billStatus, timeType, activityCode, page, limit
router.get('/entries', userMiddleware, getTimeEntries);

// Get single time entry
// GET /api/time-tracking/entries/:id
router.get('/entries/:id', userMiddleware, getTimeEntry);

// Update time entry
// PATCH /api/time-tracking/entries/:id
router.patch('/entries/:id', userMiddleware, updateTimeEntry);
router.put('/entries/:id', userMiddleware, updateTimeEntry);

// Delete time entry
// DELETE /api/time-tracking/entries/:id
router.delete('/entries/:id', userMiddleware, deleteTimeEntry);

// ═══════════════════════════════════════════════════════════════
// WRITE-OFF / WRITE-DOWN ROUTES
// ═══════════════════════════════════════════════════════════════

// Write off a time entry (شطب الوقت)
// POST /api/time-tracking/entries/:id/write-off
// Body: { reason: string }
router.post('/entries/:id/write-off', userMiddleware, writeOffTimeEntry);

// Write down a time entry (تخفيض المبلغ)
// POST /api/time-tracking/entries/:id/write-down
// Body: { amount: number, reason: string }
router.post('/entries/:id/write-down', userMiddleware, writeDownTimeEntry);

// ═══════════════════════════════════════════════════════════════
// APPROVAL ROUTES
// ═══════════════════════════════════════════════════════════════

// Submit time entry for approval
// POST /api/time-tracking/entries/:id/submit
router.post('/entries/:id/submit', userMiddleware, submitTimeEntry);

// Request changes to time entry
// POST /api/time-tracking/entries/:id/request-changes
// Body: { reason: string, requestedChanges: [] }
router.post('/entries/:id/request-changes', userMiddleware, requestChangesTimeEntry);

// Approve time entry
// POST /api/time-tracking/entries/:id/approve
router.post('/entries/:id/approve', userMiddleware, approveTimeEntry);

// Reject time entry
// POST /api/time-tracking/entries/:id/reject
// Body: { reason: string }
router.post('/entries/:id/reject', userMiddleware, rejectTimeEntry);

// ═══════════════════════════════════════════════════════════════
// LOCK / UNLOCK ROUTES (Gold Standard - Fiscal Period Control)
// ═══════════════════════════════════════════════════════════════

// Lock time entry (for closed fiscal periods)
// POST /api/time-tracking/entries/:id/lock
// Body: { reason: string }
router.post('/entries/:id/lock', userMiddleware, lockTimeEntry);

// Unlock time entry (admin only)
// POST /api/time-tracking/entries/:id/unlock
router.post('/entries/:id/unlock', userMiddleware, unlockTimeEntry);

module.exports = router;
