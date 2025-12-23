const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { getLawyerScore, recalculateScore, getTopLawyers } = require('../controllers/score.controller');
const app = express.Router();

app.use(apiRateLimiter);

// Get lawyer score
app.get('/:lawyerId', getLawyerScore);

// Recalculate score
app.post('/recalculate/:lawyerId', userMiddleware, recalculateScore);

// Get top lawyers
app.get('/top/lawyers', getTopLawyers);

module.exports = app;
