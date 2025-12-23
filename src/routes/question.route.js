const express = require('express');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { userMiddleware } = require('../middlewares');
const { createQuestion, getQuestions, getQuestion, updateQuestion, deleteQuestion } = require('../controllers/question.controller');
const app = express.Router();

// Apply rate limiting
app.use(apiRateLimiter);

// Create question
app.post('/', userMiddleware, createQuestion);

// Get all questions
app.get('/', getQuestions);

// Get single question
app.get('/:_id', getQuestion);

// Update question
app.patch('/:_id', userMiddleware, updateQuestion);

// Delete question
app.delete('/:_id', userMiddleware, deleteQuestion);

module.exports = app;
