const express = require('express');
const { userMiddleware } = require('../middlewares');
const { createPeerReview, getPeerReviews, verifyPeerReview } = require('../controllers/peerReview.controller');
const app = express.Router();

// Create peer review
app.post('/', userMiddleware, createPeerReview);

// Get peer reviews for lawyer
app.get('/:lawyerId', getPeerReviews);

// Verify peer review (admin)
app.patch('/verify/:_id', userMiddleware, verifyPeerReview);

module.exports = app;
