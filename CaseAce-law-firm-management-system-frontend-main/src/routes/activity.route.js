const express = require('express');
const { userMiddleware } = require('../middlewares');
const { getActivityOverview } = require('../controllers/dashboard.controller');
const {
    getActivities,
    getActivity,
    getActivitySummary,
    getEntityActivities
} = require('../controllers/activity.controller');

const app = express.Router();

// Activity summary and overview
app.get('/summary', userMiddleware, getActivitySummary);
app.get('/overview', userMiddleware, getActivityOverview);

// Entity-specific activities
app.get('/entity/:entityType/:entityId', userMiddleware, getEntityActivities);

// Activity CRUD
app.get('/', userMiddleware, getActivities);
app.get('/:id', userMiddleware, getActivity);

module.exports = app;
