/**
 * Tag Routes
 * Universal tagging system for leads, clients, contacts, cases, quotes, campaigns
 * All routes require authentication via userMiddleware
 */

const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createTag,
    getTags,
    getTagById,
    updateTag,
    deleteTag,
    mergeTags,
    bulkCreate,
    getPopularTags,
    getTagsByEntity
} = require('../controllers/tag.controller');

const app = express.Router();

// ==============================================
// STATIC ROUTES (MUST BE BEFORE /:id ROUTES!)
// ==============================================

// Get popular tags (most used)
app.get('/popular', userMiddleware, getPopularTags);

// Merge multiple tags into one
app.post('/merge', userMiddleware, mergeTags);

// Bulk create tags
app.post('/bulk', userMiddleware, bulkCreate);

// Get tags by entity type
app.get('/entity/:entityType', userMiddleware, getTagsByEntity);

// ==============================================
// TAG CRUD ROUTES
// ==============================================

// Get all tags with filters (entityType, isActive, search)
app.get('/', userMiddleware, getTags);

// Create a new tag
app.post('/', userMiddleware, createTag);

// Get specific tag by ID
app.get('/:id', userMiddleware, getTagById);

// Update tag
app.put('/:id', userMiddleware, updateTag);

// Delete tag
app.delete('/:id', userMiddleware, deleteTag);

module.exports = app;
