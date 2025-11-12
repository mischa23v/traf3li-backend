const express = require('express');
const { userMiddleware } = require('../middlewares');
const { getLawyerScore, recalculateScore, getTopLawyers } = require('../controllers/score.controller');
const app = express.Router();

// Get lawyer score
app.get('/:lawyerId', getLawyerScore);

// Recalculate score
app.post('/recalculate/:lawyerId', userMiddleware, recalculateScore);

// Get top lawyers
app.get('/top/lawyers', getTopLawyers);

module.exports = app;
