const express = require('express');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { createGig, deleteGig, getGig, getGigs } = require('../controllers/gig.controller');

const app = express.Router();

app.use(apiRateLimiter);

// Create
app.post('/', userMiddleware, createGig);

// Delete
app.delete('/:_id', userMiddleware, deleteGig);

// Get single
app.get('/single/:_id', getGig);

// Get all
app.get('/', getGigs);

module.exports = app;