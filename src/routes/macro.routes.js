/**
 * Macro Routes
 *
 * Routes for macro management and application.
 * Allows users to create, manage, and apply response macros in conversations.
 *
 * Base route: /api/macros
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    listMacros,
    createMacro,
    getPopularMacros,
    getByShortcut,
    suggestMacros,
    getMacro,
    updateMacro,
    deleteMacro,
    applyMacro
} = require('../controllers/macro.controller');

const router = express.Router();

// ============ APPLY MIDDLEWARE ============
// All macro routes require authentication
router.use(userMiddleware);

// ============ STATIC ROUTES ============
// These must come before parameterized routes to avoid conflicts

// Get popular macros
// GET /api/macros/popular
router.get('/popular', getPopularMacros);

// Get macro by shortcut
// GET /api/macros/shortcut/:shortcut
router.get('/shortcut/:shortcut', getByShortcut);

// Get suggested macros for a conversation
// GET /api/macros/suggest/:conversationId
router.get('/suggest/:conversationId', suggestMacros);

// ============ CRUD OPERATIONS ============

// Get all macros
// GET /api/macros
router.get('/', listMacros);

// Create a new macro
// POST /api/macros
router.post('/', createMacro);

// Get single macro by ID
// GET /api/macros/:id
router.get('/:id', getMacro);

// Update macro
// PUT /api/macros/:id
router.put('/:id', updateMacro);

// Delete macro
// DELETE /api/macros/:id
router.delete('/:id', deleteMacro);

// ============ MACRO OPERATIONS ============

// Apply macro to a conversation
// POST /api/macros/:id/apply/:conversationId
router.post('/:id/apply/:conversationId', applyMacro);

module.exports = router;
