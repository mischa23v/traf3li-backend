const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { createPeerReview, getPeerReviews, verifyPeerReview } = require('../controllers/peerReview.controller');
const app = express.Router();

// Apply rate limiting
app.use(apiRateLimiter);

// Create peer review
app.post('/', userMiddleware, createPeerReview);

// Get peer reviews for lawyer
app.get('/:lawyerId', getPeerReviews);

// Verify peer review (admin)
app.patch('/verify/:_id', userMiddleware, verifyPeerReview);

module.exports = app;
