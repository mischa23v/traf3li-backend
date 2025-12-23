const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    // Budget CRUD
    createBudget,
    getBudgets,
    getBudget,
    getBudgetByCase,
    updateBudget,
    deleteBudget,
    // Entries
    addEntry,
    getEntries,
    updateEntry,
    deleteEntry,
    // Phases
    addPhase,
    updatePhase,
    deletePhase,
    // Templates
    createTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate,
    // Analysis
    getBudgetAnalysis,
    getBudgetAlerts
} = require('../controllers/matterBudget.controller');

const app = express.Router();

// Alerts (must be before :id routes)
app.get('/alerts', userMiddleware, getBudgetAlerts);

// Templates
app.get('/templates', userMiddleware, getTemplates);
app.post('/templates', userMiddleware, createTemplate);
app.patch('/templates/:id', userMiddleware, updateTemplate);
app.delete('/templates/:id', userMiddleware, deleteTemplate);

// Budget by case
app.get('/case/:caseId', userMiddleware, getBudgetByCase);

// Budget CRUD
app.get('/', userMiddleware, getBudgets);
app.post('/', userMiddleware, createBudget);

app.get('/:id', userMiddleware, getBudget);
app.patch('/:id', userMiddleware, updateBudget);
app.delete('/:id', userMiddleware, deleteBudget);

// Budget analysis
app.get('/:id/analysis', userMiddleware, getBudgetAnalysis);

// Entries
app.get('/:id/entries', userMiddleware, getEntries);
app.post('/:id/entries', userMiddleware, addEntry);
app.patch('/:id/entries/:entryId', userMiddleware, updateEntry);
app.delete('/:id/entries/:entryId', userMiddleware, deleteEntry);

// Phases
app.post('/:id/phases', userMiddleware, addPhase);
app.patch('/:id/phases/:phaseId', userMiddleware, updatePhase);
app.delete('/:id/phases/:phaseId', userMiddleware, deletePhase);

module.exports = app;
