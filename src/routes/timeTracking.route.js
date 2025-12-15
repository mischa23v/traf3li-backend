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
    approveTimeEntry,
    rejectTimeEntry,

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

// Approve time entry
// POST /api/time-tracking/entries/:id/approve
router.post('/entries/:id/approve', userMiddleware, firmFilter, approveTimeEntry);

// Reject time entry
// POST /api/time-tracking/entries/:id/reject
// Body: { reason: string }
router.post('/entries/:id/reject', userMiddleware, firmFilter, rejectTimeEntry);

// ═══════════════════════════════════════════════════════════════
// COMPLETION STATUS ROUTES (ERPNext Parity)
// ═══════════════════════════════════════════════════════════════

// Mark entry as completed
// POST /api/time-tracking/entries/:id/complete
router.post('/entries/:id/complete', userMiddleware, firmFilter, async (req, res) => {
    try {
        const TimeEntry = require('../models/timeEntry.model');
        const entry = await TimeEntry.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    isCompleted: true,
                    completedAt: new Date(),
                    completedBy: req.user._id
                }
            },
            { new: true }
        );
        if (!entry) {
            return res.status(404).json({ success: false, error: 'Time entry not found' });
        }
        res.json({ success: true, data: entry });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Mark entry as incomplete
// POST /api/time-tracking/entries/:id/incomplete
router.post('/entries/:id/incomplete', userMiddleware, firmFilter, async (req, res) => {
    try {
        const TimeEntry = require('../models/timeEntry.model');
        const entry = await TimeEntry.findByIdAndUpdate(
            req.params.id,
            {
                $set: { isCompleted: false },
                $unset: { completedAt: '', completedBy: '' }
            },
            { new: true }
        );
        if (!entry) {
            return res.status(404).json({ success: false, error: 'Time entry not found' });
        }
        res.json({ success: true, data: entry });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk mark entries as completed
// POST /api/time-tracking/entries/bulk-complete
router.post('/entries/bulk-complete', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'ids array is required' });
        }
        const TimeEntry = require('../models/timeEntry.model');
        await TimeEntry.bulkMarkCompleted(ids, req.user._id);
        res.json({ success: true, count: ids.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get case completion stats
// GET /api/time-tracking/case/:caseId/completion-stats
router.get('/case/:caseId/completion-stats', userMiddleware, firmFilter, async (req, res) => {
    try {
        const TimeEntry = require('../models/timeEntry.model');
        const stats = await TimeEntry.getCaseCompletionStats(req.params.caseId);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// BILLING HISTORY ROUTES (ERPNext Parity)
// ═══════════════════════════════════════════════════════════════

// Get billing history for a time entry
// GET /api/time-tracking/entries/:id/billing-history
router.get('/entries/:id/billing-history', userMiddleware, firmFilter, async (req, res) => {
    try {
        const TimeEntry = require('../models/timeEntry.model');
        const history = await TimeEntry.getBillingHistory(req.params.id);
        if (!history) {
            return res.status(404).json({ success: false, error: 'Time entry not found' });
        }
        res.json({ success: true, data: history });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get unbilled entries grouped by case
// GET /api/time-tracking/unbilled-grouped
router.get('/unbilled-grouped', userMiddleware, firmFilter, async (req, res) => {
    try {
        const { clientId, caseId } = req.query;
        const TimeEntry = require('../models/timeEntry.model');
        const filters = { firmId: req.firmId };
        if (clientId) filters.clientId = clientId;
        if (caseId) filters.caseId = caseId;
        const grouped = await TimeEntry.getUnbilledEntriesGrouped(filters);
        res.json({ success: true, data: grouped });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
