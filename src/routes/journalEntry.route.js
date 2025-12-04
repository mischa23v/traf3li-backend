const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const {
    getEntries,
    getEntry,
    createEntry,
    updateEntry,
    postEntry,
    deleteEntry,
    voidEntry,
    createSimpleEntry
} = require('../controllers/journalEntry.controller');

// Apply authentication to all routes
router.use(authenticate);

// Create simple two-line entry
router.post('/simple', createSimpleEntry);

// Get all journal entries
router.get('/', getEntries);

// Get single journal entry
router.get('/:id', getEntry);

// Create draft journal entry
router.post('/', createEntry);

// Update draft journal entry
router.patch('/:id', updateEntry);

// Post journal entry to GL
router.post('/:id/post', postEntry);

// Void posted journal entry
router.post('/:id/void', voidEntry);

// Delete draft journal entry
router.delete('/:id', deleteEntry);

module.exports = router;
