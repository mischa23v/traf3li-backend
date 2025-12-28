/**
 * AI Transaction Matching Routes
 *
 * Endpoints for AI-powered bank transaction matching
 */

const express = require('express');
const router = express.Router();
const aiMatchingController = require('../controllers/aiMatching.controller');

// ═══════════════════════════════════════════════════════════════
// MATCHING OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Find matches for a single transaction
router.post('/match', aiMatchingController.findMatches);

// Batch match multiple transactions
router.post('/batch', aiMatchingController.batchMatch);

// Auto-match unmatched transactions
router.post('/auto-match', aiMatchingController.autoMatch);

// ═══════════════════════════════════════════════════════════════
// CONFIRMATION/REJECTION (LEARNING)
// ═══════════════════════════════════════════════════════════════

// Confirm a suggested match
router.post('/confirm', aiMatchingController.confirmMatch);

// Reject a suggested match
router.post('/reject', aiMatchingController.rejectMatch);

// Unmatch a previously matched transaction
router.post('/unmatch', aiMatchingController.unmatchTransaction);

// ═══════════════════════════════════════════════════════════════
// SUGGESTIONS
// ═══════════════════════════════════════════════════════════════

// Get pending match suggestions for review
router.get('/suggestions', aiMatchingController.getPendingSuggestions);

// Bulk confirm suggestions
router.post('/suggestions/bulk-confirm', aiMatchingController.bulkConfirmSuggestions);

// ═══════════════════════════════════════════════════════════════
// STATISTICS & PATTERNS
// ═══════════════════════════════════════════════════════════════

// Get matching statistics
router.get('/stats', aiMatchingController.getMatchingStats);

// Get pattern statistics
router.get('/patterns/stats', aiMatchingController.getPatternStats);

// Get learned patterns
router.get('/patterns', aiMatchingController.getPatterns);

// Cleanup old patterns (admin only)
router.post('/patterns/cleanup', aiMatchingController.cleanupPatterns);

module.exports = router;
