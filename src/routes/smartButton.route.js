const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { cacheResponse } = require('../middlewares/cache.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    getCounts,
    getBatchCounts
} = require('../controllers/smartButton.controller');

const app = express.Router();

app.use(apiRateLimiter);

// Cache TTL: 60 seconds (1 minute) for smart button counts
// Short TTL since these are dynamic and should stay relatively fresh
const SMART_BUTTON_CACHE_TTL = 60;

/**
 * @route   GET /api/smart-buttons/:model/:recordId/counts
 * @desc    Get counts of related records for any entity (Odoo-style smart buttons)
 * @access  Private
 * @params  model - Entity type (client, case, contact, invoice, lead, task, etc.)
 *          recordId - Entity ID
 * @returns Object with counts for all related entities
 *
 * @example
 * GET /api/smart-buttons/client/507f1f77bcf86cd799439011/counts
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "cases": 5,
 *     "invoices": 12,
 *     "documents": 23,
 *     "contacts": 3,
 *     "tasks": 8,
 *     "timeEntries": 45,
 *     "expenses": 7,
 *     "payments": 10,
 *     "activities": 15,
 *     "events": 4
 *   }
 * }
 */
app.get(
    '/:model/:recordId/counts',
    userMiddleware,
    firmFilter,
    cacheResponse(`smartbutton:{firmId}:${'{model}'}:${'{recordId}'}`, SMART_BUTTON_CACHE_TTL),
    getCounts
);

/**
 * @route   POST /api/smart-buttons/:model/batch-counts
 * @desc    Get counts for multiple records of the same model (batch operation)
 * @access  Private
 * @params  model - Entity type (client, case, etc.)
 * @body    { recordIds: [...] } - Array of record IDs
 * @returns Object mapping record IDs to their counts
 *
 * @example
 * POST /api/smart-buttons/client/batch-counts
 * Body: { "recordIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"] }
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "507f1f77bcf86cd799439011": {
 *       "cases": 5,
 *       "invoices": 12,
 *       "documents": 23,
 *       "tasks": 8,
 *       "payments": 10
 *     },
 *     "507f1f77bcf86cd799439012": {
 *       "cases": 2,
 *       "invoices": 3,
 *       "documents": 8,
 *       "tasks": 1,
 *       "payments": 2
 *     }
 *   }
 * }
 */
app.post(
    '/:model/batch-counts',
    userMiddleware,
    firmFilter,
    getBatchCounts
);

module.exports = app;
