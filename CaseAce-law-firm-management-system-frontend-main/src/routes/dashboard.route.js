const express = require('express');
const { userMiddleware } = require('../middlewares');
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
app.get('/hero-stats', userMiddleware, getHeroStats);

// Get detailed dashboard stats
app.get('/stats', userMiddleware, getDashboardStats);

// Get financial summary
app.get('/financial-summary', userMiddleware, getFinancialSummary);

// Get today's events
app.get('/today-events', userMiddleware, getTodayEvents);

// Get recent messages
app.get('/recent-messages', userMiddleware, getRecentMessages);

// Get activity overview
app.get('/activity', userMiddleware, getActivityOverview);

module.exports = app;
