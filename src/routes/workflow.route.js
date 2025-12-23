const express = require('express');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { userMiddleware } = require('../middlewares');
const {
    createWorkflow,
    getWorkflows,
    getWorkflow,
    getWorkflowsByCategory,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    addTransition,
    initializeWorkflowForCase,
    getCaseProgress,
    moveCaseToStage,
    completeRequirement,
    getWorkflowStatistics,
    getPresets,
    importPreset
} = require('../controllers/workflow.controller');

const app = express.Router();

app.use(apiRateLimiter);

// Presets (must be before :id routes)
app.get('/presets', userMiddleware, getPresets);
app.post('/presets/:presetType', userMiddleware, importPreset);

// Stats (support both /stats and /statistics for frontend compatibility)
app.get('/stats', userMiddleware, getWorkflowStatistics);
app.get('/statistics', userMiddleware, getWorkflowStatistics);

// By category
app.get('/category/:category', userMiddleware, getWorkflowsByCategory);

// CRUD operations
app.get('/', userMiddleware, getWorkflows);
app.post('/', userMiddleware, createWorkflow);

app.get('/:id', userMiddleware, getWorkflow);
app.patch('/:id', userMiddleware, updateWorkflow);
app.delete('/:id', userMiddleware, deleteWorkflow);

app.post('/:id/duplicate', userMiddleware, duplicateWorkflow);

// Stage management
app.post('/:id/stages', userMiddleware, addStage);
app.patch('/:id/stages/:stageId', userMiddleware, updateStage);
app.delete('/:id/stages/:stageId', userMiddleware, deleteStage);
app.post('/:id/stages/reorder', userMiddleware, reorderStages);

// Transitions
app.post('/:id/transitions', userMiddleware, addTransition);

// Case workflow operations
app.post('/cases/:caseId/initialize', userMiddleware, initializeWorkflowForCase);
app.get('/cases/:caseId/progress', userMiddleware, getCaseProgress);
app.post('/cases/:caseId/move', userMiddleware, moveCaseToStage);
app.post('/cases/:caseId/requirements/:requirementId/complete', userMiddleware, completeRequirement);

module.exports = app;
