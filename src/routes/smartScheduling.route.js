const express = require('express');
const { userMiddleware } = require('../middlewares');
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
app.get('/patterns', userMiddleware, getUserPatterns);

// Suggest best time for a task
app.post('/suggest', userMiddleware, suggestBestTime);

// Predict task duration based on type and complexity
app.post('/predict-duration', userMiddleware, predictDuration);

// Analyze workload for date range
app.get('/workload', userMiddleware, analyzeWorkload);

// Get daily smart nudges
app.get('/nudges', userMiddleware, getDailyNudges);

// Auto-schedule tasks
app.post('/auto-schedule', userMiddleware, autoScheduleTasks);

module.exports = app;
