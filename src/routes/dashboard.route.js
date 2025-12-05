const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    getHeroStats,
    getDashboardStats,
    getFinancialSummary,
    getTodayEvents,
    getRecentMessages,
    getActivityOverview
} = require('../controllers/dashboard.controller');

const app = express.Router();

// Get hero stats (top-level metrics for dashboard header)
app.get('/hero-stats', userMiddleware, firmFilter, getHeroStats);

// Get detailed dashboard stats
app.get('/stats', userMiddleware, firmFilter, getDashboardStats);

// Get financial summary
app.get('/financial-summary', userMiddleware, firmFilter, getFinancialSummary);

// Get today's events
app.get('/today-events', userMiddleware, firmFilter, getTodayEvents);

// Get recent messages
app.get('/recent-messages', userMiddleware, firmFilter, getRecentMessages);

// Get activity overview
app.get('/activity', userMiddleware, firmFilter, getActivityOverview);

module.exports = app;
