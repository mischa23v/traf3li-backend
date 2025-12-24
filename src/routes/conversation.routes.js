/**
 * Omnichannel Conversation/Inbox Routes
 *
 * Routes for managing conversations across multiple channels
 * (email, WhatsApp, SMS, live chat, social media)
 *
 * Base route: /api/conversations
 */

const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversation.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// ============================================
// APPLY MIDDLEWARE TO ALL ROUTES
// ============================================
router.use(userMiddleware, firmFilter);

// ============================================
// STATIC ROUTES (MUST BE BEFORE /:id ROUTES)
// ============================================

// Inbox statistics
router.get('/stats', conversationController.getStats);

// ============================================
// INBOX / LIST OPERATIONS
// ============================================

// Get unified inbox
router.get('/', conversationController.getInbox);

// ============================================
// SINGLE CONVERSATION OPERATIONS
// ============================================

// Get single conversation with full history
router.get('/:id', conversationController.getConversation);

// Add message to conversation
router.post('/:id/messages', conversationController.addMessage);

// Assign conversation to user
router.post('/:id/assign', conversationController.assignConversation);

// Snooze conversation until a specific date
router.post('/:id/snooze', conversationController.snoozeConversation);

// Close conversation
router.post('/:id/close', conversationController.closeConversation);

// Reopen conversation
router.post('/:id/reopen', conversationController.reopenConversation);

// Update conversation tags
router.put('/:id/tags', conversationController.updateTags);

// Update conversation priority
router.put('/:id/priority', conversationController.updatePriority);

module.exports = router;
