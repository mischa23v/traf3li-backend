/**
 * Queue Routes
 *
 * Admin-only routes for managing background job queues.
 * Provides endpoints for monitoring, managing, and troubleshooting jobs.
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares');
const { requireAdmin } = require('../middlewares/authorize.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const asyncHandler = require('../utils/asyncHandler');
const QueueService = require('../services/queue.service');
const CustomException = require('../utils/CustomException');

// Apply rate limiting to all queue routes
router.use(apiRateLimiter);

/**
 * @route   GET /api/queues
 * @desc    Get all queues with statistics
 * @access  Admin only
 */
router.get('/', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const stats = await QueueService.getAllQueuesStats();

  res.json({
    success: true,
    count: stats.length,
    data: stats
  });
}));

/**
 * @route   GET /api/queues/:name
 * @desc    Get specific queue statistics
 * @access  Admin only
 */
router.get('/:name', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;

  const stats = await QueueService.getQueueStats(name);

  res.json({
    success: true,
    data: stats
  });
}));

/**
 * @route   GET /api/queues/:name/jobs
 * @desc    Get jobs from a queue
 * @access  Admin only
 */
router.get('/:name/jobs', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { status = 'waiting', start = 0, end = 20 } = req.query;

  const jobs = await QueueService.getJobs(
    name,
    status,
    parseInt(start),
    parseInt(end)
  );

  res.json({
    success: true,
    count: jobs.length,
    status,
    data: jobs
  });
}));

/**
 * @route   GET /api/queues/:name/jobs/:jobId
 * @desc    Get specific job status
 * @access  Admin only
 */
router.get('/:name/jobs/:jobId', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name, jobId } = req.params;

  const job = await QueueService.getJobStatus(name, jobId);

  res.json({
    success: true,
    data: job
  });
}));

/**
 * @route   GET /api/queues/:name/counts
 * @desc    Get job counts by status
 * @access  Admin only
 */
router.get('/:name/counts', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;

  const counts = await QueueService.getJobCounts(name);

  res.json({
    success: true,
    data: counts
  });
}));

/**
 * @route   POST /api/queues/:name/retry/:jobId
 * @desc    Retry a failed job
 * @access  Admin only
 */
router.post('/:name/retry/:jobId', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name, jobId } = req.params;

  const result = await QueueService.retryJob(name, jobId);

  res.json({
    success: true,
    message: 'Job retried successfully',
    data: result
  });
}));

/**
 * @route   DELETE /api/queues/:name/jobs/:jobId
 * @desc    Remove a job from queue
 * @access  Admin only
 */
router.delete('/:name/jobs/:jobId', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name, jobId } = req.params;

  const result = await QueueService.removeJob(name, jobId);

  res.json({
    success: true,
    message: 'Job removed successfully',
    data: result
  });
}));

/**
 * @route   POST /api/queues/:name/pause
 * @desc    Pause a queue
 * @access  Admin only
 */
router.post('/:name/pause', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;

  const result = await QueueService.pauseQueue(name);

  res.json({
    success: true,
    message: 'Queue paused successfully',
    data: result
  });
}));

/**
 * @route   POST /api/queues/:name/resume
 * @desc    Resume a paused queue
 * @access  Admin only
 */
router.post('/:name/resume', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;

  const result = await QueueService.resumeQueue(name);

  res.json({
    success: true,
    message: 'Queue resumed successfully',
    data: result
  });
}));

/**
 * @route   POST /api/queues/:name/clean
 * @desc    Clean old jobs from queue
 * @access  Admin only
 */
router.post('/:name/clean', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { gracePeriod = 86400000, type = 'completed' } = req.body;

  const result = await QueueService.cleanJobs(
    name,
    parseInt(gracePeriod),
    type
  );

  res.json({
    success: true,
    message: `Cleaned ${result.cleanedCount} ${type} jobs`,
    data: result
  });
}));

/**
 * @route   POST /api/queues/:name/empty
 * @desc    Empty a queue (remove all jobs)
 * @access  Admin only
 */
router.post('/:name/empty', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;

  const result = await QueueService.emptyQueue(name);

  res.json({
    success: true,
    message: 'Queue emptied successfully',
    data: result
  });
}));

/**
 * @route   POST /api/queues/:name/jobs
 * @desc    Add a job to a queue
 * @access  Admin only
 */
router.post('/:name/jobs', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { data, options = {} } = req.body;

  if (!data) {
    throw CustomException('Job data is required', 400);
  }

  const job = await QueueService.addJob(name, data, options);

  res.status(201).json({
    success: true,
    message: 'Job added successfully',
    data: job
  });
}));

/**
 * @route   POST /api/queues/:name/jobs/bulk
 * @desc    Add multiple jobs to a queue
 * @access  Admin only
 */
router.post('/:name/jobs/bulk', authenticate, requireAdmin(), asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { jobs } = req.body;

  if (!jobs || !Array.isArray(jobs)) {
    throw CustomException('Jobs array is required', 400);
  }

  const addedJobs = await QueueService.addBulkJobs(name, jobs);

  res.status(201).json({
    success: true,
    message: `${addedJobs.length} jobs added successfully`,
    data: addedJobs
  });
}));

module.exports = router;
