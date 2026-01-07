/**
 * Exchange Rate Revaluation Routes
 *
 * @module routes/exchangeRateRevaluation
 */

const express = require('express');
const router = express.Router();
const userMiddleware = require('../middlewares/userMiddleware');
const {
    getRevaluations,
    getRevaluation,
    previewRevaluation,
    runRevaluation,
    postRevaluation,
    reverseRevaluation,
    deleteRevaluation,
    getRevaluationReport,
    getRevaluationAccounts
} = require('../controllers/exchangeRateRevaluation.controller');

// Apply authentication middleware to all routes
router.use(userMiddleware);

// Report and accounts (specific routes before :id)
router.get('/report', getRevaluationReport);
router.get('/accounts', getRevaluationAccounts);

// Preview revaluation (calculate without saving)
router.post('/preview', previewRevaluation);

// CRUD operations
router.get('/', getRevaluations);
router.post('/', runRevaluation);
router.get('/:id', getRevaluation);
router.delete('/:id', deleteRevaluation);

// Post and reverse actions
router.post('/:id/post', postRevaluation);
router.post('/:id/reverse', reverseRevaluation);

module.exports = router;
