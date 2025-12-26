const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    createOrganization,
    getOrganizations,
    getOrganization,
    updateOrganization,
    deleteOrganization,
    bulkDeleteOrganizations,
    searchOrganizations,
    getOrganizationsByClient,
    linkToClient,
    linkToContact,
    linkToCase
} = require('../controllers/organization.controller');

const router = express.Router();

// Apply authentication to all routes
router.use(userMiddleware);

// ============================================
// SPECIAL ROUTES (before :id routes)
// ============================================
router.get('/search', searchOrganizations);
router.get('/client/:clientId', getOrganizationsByClient);

// ============================================
// BULK OPERATIONS
// ============================================
router.delete('/bulk', bulkDeleteOrganizations);
router.post('/bulk-delete', bulkDeleteOrganizations);  // Legacy support

// ============================================
// CRUD OPERATIONS
// ============================================
router.get('/', getOrganizations);
router.post('/', createOrganization);
router.get('/:id', getOrganization);
router.put('/:id', updateOrganization);
router.patch('/:id', updateOrganization);  // Support both PUT and PATCH
router.delete('/:id', deleteOrganization);

// ============================================
// LINKING OPERATIONS
// ============================================
router.post('/:id/link-case', linkToCase);
router.post('/:id/link-client', linkToClient);
router.post('/:id/link-contact', linkToContact);

module.exports = router;
