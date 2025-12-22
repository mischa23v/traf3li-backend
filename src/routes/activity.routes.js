const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    scheduleActivity,
    getActivities,
    getMyActivities,
    getActivityStats,
    getActivity,
    markAsDone,
    cancelActivity,
    reschedule,
    reassign,
    getActivityTypes,
    createActivityType,
    updateActivityType,
    deleteActivityType
} = require('../controllers/activity.controller');

const app = express.Router();

// ==============================================
// STATIC ROUTES (MUST BE BEFORE /:id ROUTES!)
// ==============================================

// Activity stats
app.get('/stats', userMiddleware, getActivityStats);

// Current user's activities
app.get('/my', userMiddleware, getMyActivities);

// Activity type management
app.get('/types', userMiddleware, getActivityTypes);
app.post('/types', userMiddleware, createActivityType);
app.patch('/types/:id', userMiddleware, updateActivityType);
app.delete('/types/:id', userMiddleware, deleteActivityType);

// ==============================================
// ACTIVITY CRUD ROUTES
// ==============================================

// Get all activities
app.get('/', userMiddleware, getActivities);

// Schedule/create a new activity
app.post('/', userMiddleware, scheduleActivity);

// Get specific activity
app.get('/:id', userMiddleware, getActivity);

// ==============================================
// ACTIVITY ACTION ROUTES
// ==============================================

// Mark activity as done
app.post('/:id/done', userMiddleware, markAsDone);

// Cancel activity
app.post('/:id/cancel', userMiddleware, cancelActivity);

// Reschedule activity
app.patch('/:id/reschedule', userMiddleware, reschedule);

// Reassign activity
app.patch('/:id/reassign', userMiddleware, reassign);

module.exports = app;
