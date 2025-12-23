const express = require('express');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { userMiddleware } = require('../middlewares');
const {
    createTag,
    getTags,
    getTag,
    updateTag,
    deleteTag,
    searchTags,
    getPopularTags,
    attachTag,
    detachTag,
    getTagsForEntity
} = require('../controllers/tag.controller');

const app = express.Router();

app.use(apiRateLimiter);

// Search and popular tags (must be before :id routes)
app.get('/search', userMiddleware, searchTags);
app.get('/popular', userMiddleware, getPopularTags);

// Entity tags
app.get('/entity/:entityType/:entityId', userMiddleware, getTagsForEntity);

// CRUD operations
app.get('/', userMiddleware, getTags);
app.post('/', userMiddleware, createTag);

app.get('/:id', userMiddleware, getTag);
app.patch('/:id', userMiddleware, updateTag);
app.delete('/:id', userMiddleware, deleteTag);

// Attach/detach operations
app.post('/:id/attach', userMiddleware, attachTag);
app.post('/:id/detach', userMiddleware, detachTag);

module.exports = app;
