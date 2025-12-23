const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
    getUserPatterns,
    suggestBestTime,
    predictDuration,
    analyzeWorkload,
    getDailyNudges,
    autoScheduleTasks
} = require('../controllers/smartScheduling.controller');

const app = express.Router();

// ==============================================
// SMART SCHEDULING & NLP ROUTES
// ==============================================

// Get user's productivity patterns
app.get('/patterns', userMiddleware, firmFilter, getUserPatterns);

// Suggest best time for a task
app.post('/suggest', userMiddleware, firmFilter, suggestBestTime);

// Predict task duration based on type and complexity
app.post('/predict-duration', userMiddleware, firmFilter, predictDuration);

// Analyze workload for date range
app.get('/workload', userMiddleware, firmFilter, analyzeWorkload);

// Get daily smart nudges
app.get('/nudges', userMiddleware, firmFilter, getDailyNudges);

// Auto-schedule tasks
app.post('/auto-schedule', userMiddleware, firmFilter, autoScheduleTasks);

module.exports = app;
