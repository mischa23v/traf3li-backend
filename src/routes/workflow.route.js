const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    // Template management
    listTemplates,
    createTemplate,
    getTemplate,
    updateTemplate,
    deleteTemplate,

    // Instance management
    startWorkflow,
    getWorkflowStatus,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    advanceStep,
    getActiveWorkflows,
    listInstances
} = require('../controllers/workflow.controller');

const app = express.Router();

// ═══════════════════════════════════════════════════════════════
// TEMPLATE ROUTES
// ═══════════════════════════════════════════════════════════════

// List all templates
app.get('/templates', userMiddleware, listTemplates);

// Create new template
app.post('/templates', userMiddleware, createTemplate);

// Get single template
app.get('/templates/:id', userMiddleware, getTemplate);

// Update template
app.put('/templates/:id', userMiddleware, updateTemplate);

// Delete template
app.delete('/templates/:id', userMiddleware, deleteTemplate);

// ═══════════════════════════════════════════════════════════════
// INSTANCE ROUTES
// ═══════════════════════════════════════════════════════════════

// List all instances
app.get('/instances', userMiddleware, listInstances);

// Start new workflow instance
app.post('/instances', userMiddleware, startWorkflow);

// Get workflow instance status
app.get('/instances/:id', userMiddleware, getWorkflowStatus);

// Pause workflow instance
app.post('/instances/:id/pause', userMiddleware, pauseWorkflow);

// Resume workflow instance
app.post('/instances/:id/resume', userMiddleware, resumeWorkflow);

// Cancel workflow instance
app.post('/instances/:id/cancel', userMiddleware, cancelWorkflow);

// Advance to next step
app.post('/instances/:id/advance', userMiddleware, advanceStep);

// ═══════════════════════════════════════════════════════════════
// ENTITY ROUTES
// ═══════════════════════════════════════════════════════════════

// Get active workflows for entity
app.get('/entity/:entityType/:entityId', userMiddleware, getActiveWorkflows);

module.exports = app;
