/**
 * Quote/Quotation Routes
 *
 * Routes for managing quotes, proposals, and quotations with line items,
 * signatures, and PDF support.
 */

const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quote.controller');
const { verifyToken } = require('../middlewares/jwt');

// Apply authentication middleware to all routes
router.use(verifyToken);

// ═══════════════════════════════════════════════════════════════
// QUOTE CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/quotes
 * @desc    Get all quotes with filters
 * @access  Private
 * @query   {string} [status] - Filter by status (draft, sent, viewed, accepted, rejected, expired, revised)
 * @query   {string} [leadId] - Filter by lead ID
 * @query   {string} [clientId] - Filter by client ID
 * @query   {string} [contactId] - Filter by contact ID
 * @query   {string} [assignedTo] - Filter by assigned user ID
 * @query   {string} [search] - Search in quote ID, title, customer name/email/company
 * @query   {string} [dateFrom] - Filter by quote date from (ISO date)
 * @query   {string} [dateTo] - Filter by quote date to (ISO date)
 * @query   {number} [expiringSoon] - Filter quotes expiring within N days
 * @query   {string} [sortBy] - Sort field (default: createdAt)
 * @query   {string} [sortOrder] - Sort order: asc or desc (default: desc)
 * @query   {number} [page] - Page number (default: 1)
 * @query   {number} [limit] - Items per page (default: 20, max: 100)
 */
router.get('/', quoteController.getQuotes);

/**
 * @route   GET /api/quotes/:id
 * @desc    Get single quote by ID
 * @access  Private
 * @param   {string} id - Quote ID (ObjectId or quoteId)
 */
router.get('/:id', quoteController.getQuoteById);

/**
 * @route   POST /api/quotes
 * @desc    Create a new quote
 * @access  Private
 * @body    {object} quote - Quote data
 */
router.post('/', quoteController.createQuote);

/**
 * @route   PUT /api/quotes/:id
 * @desc    Update a quote
 * @access  Private
 * @param   {string} id - Quote ID
 * @body    {object} updates - Quote updates
 */
router.put('/:id', quoteController.updateQuote);

/**
 * @route   DELETE /api/quotes/:id
 * @desc    Delete a quote
 * @access  Private
 * @param   {string} id - Quote ID
 */
router.delete('/:id', quoteController.deleteQuote);

// ═══════════════════════════════════════════════════════════════
// QUOTE STATUS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/quotes/:id/send
 * @desc    Send quote to customer via email
 * @access  Private
 * @param   {string} id - Quote ID
 * @body    {string} [email] - Recipient email (optional, uses quote customer email by default)
 * @body    {string} [subject] - Email subject
 * @body    {string} [message] - Email message
 * @body    {string[]} [ccEmails] - CC email addresses
 */
router.post('/:id/send', quoteController.sendQuote);

/**
 * @route   POST /api/quotes/:id/accept
 * @desc    Accept quote (with signature)
 * @access  Private
 * @param   {string} id - Quote ID
 * @body    {string} signature - Client signature (base64 or signature data)
 * @body    {string} signedByName - Name of person signing
 * @body    {string} signedByEmail - Email of person signing
 * @body    {string} [ipAddress] - IP address of signer
 */
router.post('/:id/accept', quoteController.acceptQuote);

/**
 * @route   POST /api/quotes/:id/reject
 * @desc    Reject quote with reason
 * @access  Private
 * @param   {string} id - Quote ID
 * @body    {string} [lostReasonId] - Lost reason ID reference
 * @body    {string} [lostNotes] - Additional notes about rejection
 */
router.post('/:id/reject', quoteController.rejectQuote);

// ═══════════════════════════════════════════════════════════════
// QUOTE UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/quotes/:id/pdf
 * @desc    Generate and download quote as PDF
 * @access  Private
 * @param   {string} id - Quote ID
 */
router.get('/:id/pdf', quoteController.generatePdf);

/**
 * @route   POST /api/quotes/:id/duplicate
 * @desc    Duplicate an existing quote
 * @access  Private
 * @param   {string} id - Quote ID to duplicate
 */
router.post('/:id/duplicate', quoteController.duplicateQuote);

/**
 * @route   POST /api/quotes/:id/revise
 * @desc    Create a new revision of the quote
 * @access  Private
 * @param   {string} id - Quote ID to revise
 */
router.post('/:id/revise', quoteController.reviseQuote);

/**
 * @route   POST /api/quotes/:id/view
 * @desc    Record a view event (for tracking)
 * @access  Private
 * @param   {string} id - Quote ID
 * @body    {string} [ipAddress] - IP address of viewer
 * @body    {string} [userAgent] - User agent of viewer
 */
router.post('/:id/view', quoteController.recordView);

// ═══════════════════════════════════════════════════════════════
// LINE ITEM MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * @route   POST /api/quotes/:id/items
 * @desc    Add a line item to quote
 * @access  Private
 * @param   {string} id - Quote ID
 * @body    {object} item - Line item data
 */
router.post('/:id/items', quoteController.addItem);

/**
 * @route   PUT /api/quotes/:id/items/:itemId
 * @desc    Update a line item in quote
 * @access  Private
 * @param   {string} id - Quote ID
 * @param   {string} itemId - Item ID within the quote
 * @body    {object} updates - Item updates
 */
router.put('/:id/items/:itemId', quoteController.updateItem);

/**
 * @route   DELETE /api/quotes/:id/items/:itemId
 * @desc    Remove a line item from quote
 * @access  Private
 * @param   {string} id - Quote ID
 * @param   {string} itemId - Item ID to remove
 */
router.delete('/:id/items/:itemId', quoteController.removeItem);

module.exports = router;
