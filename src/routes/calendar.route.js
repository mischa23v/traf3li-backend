const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    getCalendarView,
    getCalendarByDate,
    getCalendarByMonth,
    getUpcomingItems,
    getOverdueItems,
    getCalendarStats,
    // Optimized endpoints
    getCalendarGridSummary,
    getCalendarGridItems,
    getCalendarItemDetails,
    getCalendarListView,
    // Aggregated endpoints
    getSidebarData
} = require('../controllers/calendar.controller');

const app = express.Router();

// Apply rate limiting
app.use(apiRateLimiter);

// ==========================================
// AGGREGATED ENDPOINTS (GOLD STANDARD - Use these for best performance)
// ==========================================

// Get sidebar data - Combined calendar events + upcoming reminders
// Replaces 2 separate API calls with 1 parallel query
// Query: ?startDate=&endDate=&reminderDays=7
app.get('/sidebar-data', userMiddleware, getSidebarData);

// ==========================================
// OPTIMIZED ENDPOINTS (Use these for better performance)
// ==========================================

// Get calendar grid summary - counts only, no full objects
// Use for calendar month/week view cells
// Query: ?startDate=&endDate=&types=event,task,reminder
app.get('/grid-summary', userMiddleware, getCalendarGridSummary);

// Get minimal calendar items for grid display
// Returns only id, title, date, type, color, priority
// Query: ?startDate=&endDate=&types=&caseId=
app.get('/grid-items', userMiddleware, getCalendarGridItems);

// Get full details for a single item (lazy-load on click)
// Fetches complete details including relations
app.get('/item/:type/:id', userMiddleware, getCalendarItemDetails);

// Get virtualized list view with cursor-based pagination
// Optimized for infinite scroll / heavy list usage
// Query: ?cursor=&limit=20&types=&startDate=&endDate=&sortOrder=asc&priority=&status=
app.get('/list', userMiddleware, getCalendarListView);

// ==========================================
// LEGACY ENDPOINTS (Full data - higher payload)
// ==========================================

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
