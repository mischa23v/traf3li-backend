const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getCalendarView,
    getCalendarByDate,
    getCalendarByMonth,
    getUpcomingItems,
    getOverdueItems,
    getCalendarStats
} = require('../controllers/calendar.controller');

const app = express.Router();

// Get unified calendar view
app.get('/', userMiddleware, getCalendarView);

// Get upcoming items
app.get('/upcoming', userMiddleware, getUpcomingItems);

// Get overdue items
app.get('/overdue', userMiddleware, getOverdueItems);

// Get calendar statistics
app.get('/stats', userMiddleware, getCalendarStats);

// Get calendar by specific date
app.get('/date/:date', userMiddleware, getCalendarByDate);

// Get calendar by month
app.get('/month/:year/:month', userMiddleware, getCalendarByMonth);

module.exports = app;
