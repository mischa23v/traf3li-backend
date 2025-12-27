/**
 * Contact List Routes
 *
 * Routes for managing static and dynamic contact lists for email campaigns
 * All routes require authentication via userMiddleware
 *
 * Base route: /api/contact-lists
 */

const express = require('express');
const router = express.Router();
const contactListController = require('../controllers/contactList.controller');
const { userMiddleware } = require('../middlewares');

// ============================================
// APPLY AUTHENTICATION TO ALL ROUTES
// ============================================
router.use(userMiddleware);

// ============================================
// CONTACT LIST CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/contact-lists
 * @desc    Create a new contact list
 * @access  Private
 */
router.post('/', contactListController.createContactList);

/**
 * @route   GET /api/contact-lists
 * @desc    Get all contact lists with filters
 * @query   search, listType, entityType, status, page, limit, sortBy, sortOrder
 * @access  Private
 */
router.get('/', contactListController.getContactLists);

/**
 * @route   GET /api/contact-lists/:id
 * @desc    Get single contact list by ID
 * @access  Private
 */
router.get('/:id', contactListController.getContactListById);

/**
 * @route   PUT /api/contact-lists/:id
 * @desc    Update contact list
 * @access  Private
 */
router.put('/:id', contactListController.updateContactList);

/**
 * @route   DELETE /api/contact-lists/:id
 * @desc    Delete contact list
 * @access  Private
 */
router.delete('/:id', contactListController.deleteContactList);

// ============================================
// CONTACT LIST MEMBER OPERATIONS
// ============================================

/**
 * @route   POST /api/contact-lists/:id/members
 * @desc    Add member to contact list
 * @body    entityType, entityId, email, name
 * @access  Private
 */
router.post('/:id/members', contactListController.addMember);

/**
 * @route   DELETE /api/contact-lists/:id/members/:memberId
 * @desc    Remove member from contact list
 * @access  Private
 */
router.delete('/:id/members/:memberId', contactListController.removeMember);

/**
 * @route   GET /api/contact-lists/:id/members
 * @desc    Get members of a contact list
 * @query   page, limit
 * @access  Private
 */
router.get('/:id/members', contactListController.getListMembers);

// ============================================
// CONTACT LIST UTILITIES
// ============================================

/**
 * @route   POST /api/contact-lists/:id/refresh
 * @desc    Refresh dynamic list (re-evaluate criteria)
 * @access  Private
 */
router.post('/:id/refresh', contactListController.refreshDynamicList);

/**
 * @route   POST /api/contact-lists/:id/duplicate
 * @desc    Duplicate an existing contact list
 * @access  Private
 */
router.post('/:id/duplicate', contactListController.duplicateContactList);

module.exports = router;
