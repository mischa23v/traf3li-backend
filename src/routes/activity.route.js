const express = require('express');
const { userMiddleware } = require('../middlewares');
const { getActivityOverview } = require('../controllers/dashboard.controller');

const app = express.Router();

// Get activity overview
app.get('/', userMiddleware, getActivityOverview);

module.exports = app;
