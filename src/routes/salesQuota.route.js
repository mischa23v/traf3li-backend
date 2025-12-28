/**
 * Sales Quota Routes
 *
 * Routes are protected by global authenticatedApi middleware.
 * No need for userMiddleware or firmFilter - handled globally.
 */

const express = require('express');
const {
    createQuota,
    getQuotas,
    getQuota,
    updateQuota,
    deleteQuota,
    recordDeal,
    getLeaderboard,
    getTeamSummary,
    getMyQuota,
    getPeriodComparison
} = require('../controllers/salesQuota.controller');

const router = express.Router();

// Static routes (before parameterized routes)
router.get('/leaderboard', getLeaderboard);
router.get('/team-summary', getTeamSummary);
router.get('/my-quota', getMyQuota);
router.get('/period-comparison', getPeriodComparison);

// CRUD routes
router.post('/', createQuota);
router.get('/', getQuotas);
router.get('/:id', getQuota);
router.put('/:id', updateQuota);
router.patch('/:id', updateQuota);
router.delete('/:id', deleteQuota);

// Deal recording
router.post('/:id/record-deal', recordDeal);

module.exports = router;
