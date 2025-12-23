/**
 * Prepared Report Routes
 *
 * @module routes/preparedReport
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares/user-middleware');
const { firmFilter } = require('../middlewares/firmContext');
const {
    getPreparedReports,
    getPreparedReport,
    requestPreparedReport,
    refreshPreparedReport,
    deletePreparedReport,
    getCacheStats,
    cleanupReports
} = require('../controllers/preparedReport.controller');

// Apply authentication middleware
router.use(userMiddleware);
router.use(firmFilter);

// Special routes (before :id)
router.get('/stats', getCacheStats);
router.post('/request', requestPreparedReport);
router.post('/cleanup', cleanupReports);

// CRUD operations
router.get('/', getPreparedReports);
router.get('/:id', getPreparedReport);
router.delete('/:id', deletePreparedReport);

// Refresh action
router.post('/:id/refresh', refreshPreparedReport);

module.exports = router;
