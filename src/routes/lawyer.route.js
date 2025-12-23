const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    getLawyers,
    getLawyer,
    getTeamMembers
} = require('../controllers/lawyer.controller');

const app = express.Router();

// Get active team members for task assignment (must be before /:_id)
app.get('/team', userMiddleware, getTeamMembers);

// Get all lawyers
app.get('/', userMiddleware, getLawyers);

// Get single lawyer by ID
app.get('/:_id', userMiddleware, getLawyer);

module.exports = app;
