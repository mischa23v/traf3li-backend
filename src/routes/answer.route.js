const express = require('express');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { userMiddleware } = require('../middlewares');
const { createAnswer, getAnswers, updateAnswer, deleteAnswer, likeAnswer, verifyAnswer } = require('../controllers/answer.controller');
const app = express.Router();

app.use(apiRateLimiter);

// Create answer
app.post('/', userMiddleware, createAnswer);

// Get answers for question
app.get('/:questionId', getAnswers);

// Update answer
app.patch('/:_id', userMiddleware, updateAnswer);

// Delete answer
app.delete('/:_id', userMiddleware, deleteAnswer);

// Like answer
app.post('/like/:_id', userMiddleware, likeAnswer);

// Verify answer (admin)
app.patch('/verify/:_id', userMiddleware, verifyAnswer);

module.exports = app;
