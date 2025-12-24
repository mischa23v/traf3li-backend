/**
 * Deal Room Routes
 *
 * Routes for managing deal rooms - secure collaboration spaces for deals
 * Includes pages, documents, external access, and activity tracking
 *
 * Base route: /api/deal-rooms
 */

const express = require('express');
const router = express.Router();
const dealRoomController = require('../controllers/dealRoom.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// ============================================
// PUBLIC ROUTES (NO AUTHENTICATION)
// ============================================

// External access verification (public endpoint)
router.get('/external/:token', dealRoomController.verifyExternalAccess);

// ============================================
// APPLY AUTHENTICATION AND FIRM FILTERING TO ALL OTHER ROUTES
// ============================================
router.use(userMiddleware);
router.use(firmFilter);

// ============================================
// NESTED DEAL ROUTES
// Deal room management (accessed via /api/deals/:dealId/room)
// ============================================

// Get or create deal room for a specific deal
router.get('/deals/:dealId/room', dealRoomController.getDealRoom);
router.post('/deals/:dealId/room', dealRoomController.createDealRoom);

// ============================================
// DEAL ROOM OPERATIONS (DIRECT ACCESS)
// ============================================

// Activity feed
router.get('/:id/activity', dealRoomController.getActivityFeed);

// Page management
router.post('/:id/pages', dealRoomController.addPage);
router.put('/:id/pages/:pageId', dealRoomController.updatePage);
router.delete('/:id/pages/:pageId', dealRoomController.deletePage);

// Document management
router.post('/:id/documents', dealRoomController.uploadDocument);
router.post('/:id/documents/:index/view', dealRoomController.trackDocumentView);

// External access management
router.post('/:id/access', dealRoomController.grantExternalAccess);
router.delete('/:id/access/:token', dealRoomController.revokeExternalAccess);

module.exports = router;
