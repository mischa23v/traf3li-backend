const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getApps,
    getApp,
    connectApp,
    disconnectApp,
    updateAppSettings,
    getAppsStats,
    syncApp
} = require('../controllers/app.controller');

const app = express.Router();

// Get apps stats (must be before :appId)
app.get('/stats', userMiddleware, getAppsStats);

// Get all apps
app.get('/', userMiddleware, getApps);

// Get single app
app.get('/:appId', userMiddleware, getApp);

// Connect app
app.post('/:appId/connect', userMiddleware, connectApp);

// Disconnect app
app.post('/:appId/disconnect', userMiddleware, disconnectApp);

// Update app settings
app.put('/:appId/settings', userMiddleware, updateAppSettings);

// Sync app data
app.post('/:appId/sync', userMiddleware, syncApp);

module.exports = app;
