const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createContact,
    getContacts,
    getContact,
    updateContact,
    deleteContact,
    bulkDeleteContacts,
    searchContacts,
    getContactsByCase,
    getContactsByClient,
    linkToCase,
    unlinkFromCase,
    linkToClient,
    unlinkFromClient
} = require('../controllers/contact.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(userMiddleware);

// ============================================
// SPECIAL ROUTES (before :id routes)
// ============================================
router.get('/search', searchContacts);
router.get('/case/:caseId', getContactsByCase);
router.get('/client/:clientId', getContactsByClient);

// ============================================
// BULK OPERATIONS
// ============================================
router.delete('/bulk', bulkDeleteContacts);
router.post('/bulk-delete', bulkDeleteContacts);  // Legacy support

// ============================================
// CRUD OPERATIONS
// ============================================
router.get('/', getContacts);
router.post('/', createContact);
router.get('/:id', getContact);
router.put('/:id', updateContact);
router.patch('/:id', updateContact);  // Support both PUT and PATCH
router.delete('/:id', deleteContact);

// ============================================
// LINKING OPERATIONS
// ============================================
router.post('/:id/link-case', linkToCase);
router.delete('/:id/unlink-case/:caseId', unlinkFromCase);
router.post('/:id/unlink-case', unlinkFromCase);  // Legacy support (POST with body)
router.post('/:id/link-client', linkToClient);
router.delete('/:id/unlink-client/:clientId', unlinkFromClient);
router.post('/:id/unlink-client', unlinkFromClient);  // Legacy support (POST with body)

module.exports = router;
