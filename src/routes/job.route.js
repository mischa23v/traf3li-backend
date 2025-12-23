const express = require('express');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { userMiddleware } = require('../middlewares');
const {
    createJob,
    getJobs,
    getJob,
    updateJob,
    deleteJob,
    getMyJobs
} = require('../controllers/job.controller');

const app = express.Router();

// Apply rate limiting
app.use(apiRateLimiter);

// Create job
app.post('/', userMiddleware, createJob);

// Get all jobs
app.get('/', getJobs);

// Get my jobs (as client)
app.get('/my-jobs', userMiddleware, getMyJobs);

// Get single job
app.get('/:_id', getJob);

// Update job
app.patch('/:_id', userMiddleware, updateJob);

// Delete job
app.delete('/:_id', userMiddleware, deleteJob);

module.exports = app;
