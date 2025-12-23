const express = require('express');
const router = express.Router();
const pipelineController = require('../controllers/pipeline.controller');
const { userMiddleware } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Apply authentication to all routes
router.use(userMiddleware);
router.use(apiRateLimiter);

// ============================================
// PIPELINE ROUTES
// ============================================

// CRUD
router.post('/', pipelineController.createPipeline);
router.get('/', pipelineController.getPipelines);
router.get('/:id', pipelineController.getPipeline);
router.put('/:id', pipelineController.updatePipeline);
router.delete('/:id', pipelineController.deletePipeline);

// Stage management
router.post('/:id/stages', pipelineController.addStage);
router.put('/:id/stages/:stageId', pipelineController.updateStage);
router.delete('/:id/stages/:stageId', pipelineController.removeStage);
router.post('/:id/stages/reorder', pipelineController.reorderStages);

// Pipeline operations
router.get('/:id/stats', pipelineController.getStats);
router.post('/:id/default', pipelineController.setDefault);
router.post('/:id/duplicate', pipelineController.duplicatePipeline);

module.exports = router;
