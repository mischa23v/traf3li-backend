const DeduplicationService = require('../services/deduplication.service');
const asyncHandler = require('../utils/asyncHandler');
const { sanitizeObjectId } = require('../utils/securityUtils');
const Contact = require('../models/contact.model');
const logger = require('../utils/logger');
const CustomException = require('../utils/CustomException');

// ═══════════════════════════════════════════════════════════════
// DEDUPLICATION CONTROLLER
// ═══════════════════════════════════════════════════════════════

class DeduplicationController {
    // ═══════════════════════════════════════════════════════════
    // DUPLICATE DETECTION
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Find duplicates for a specific contact
     * @route   GET /api/contacts/:id/duplicates
     * @access  Private
     */
    findDuplicates = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const firmId = req.firmId;
        const lawyerId = req.userID;

        // Sanitize and validate contact ID
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid contact ID format',
                message: 'The provided contact ID is not valid'
            });
        }

        // IDOR Protection - Verify contact belongs to the user's firm or lawyer
        const query = firmId
            ? { _id: sanitizedId, firmId }
            : { _id: sanitizedId, lawyerId };

        const contact = await Contact.findOne(query);
        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found',
                message: 'The requested contact does not exist or you do not have access to it'
            });
        }

        // Get threshold from query params, default to 0.85
        let threshold = 0.85;
        if (req.query.threshold) {
            const parsedThreshold = parseFloat(req.query.threshold);
            if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid threshold',
                    message: 'Threshold must be a number between 0 and 1'
                });
            }
            threshold = parsedThreshold;
        }

        // Find duplicates
        const duplicates = await DeduplicationService.findDuplicates(
            contact,
            firmId || lawyerId,
            threshold
        );

        res.json({
            success: true,
            message: `Found ${duplicates.length} potential duplicates`,
            data: {
                contactId: contact._id,
                contactName: `${contact.firstName} ${contact.lastName}`,
                threshold,
                duplicates
            }
        });
    });

    /**
     * @desc    Scan for all duplicates in the firm
     * @route   POST /api/contacts/scan-duplicates
     * @access  Private
     */
    scanDuplicates = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const lawyerId = req.userID;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context required',
                message: 'This operation requires a firm context'
            });
        }

        // Get options from request body
        const { threshold, limit, status } = req.body;

        // Validate threshold
        let validThreshold = 0.85;
        if (threshold !== undefined) {
            const parsedThreshold = parseFloat(threshold);
            if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid threshold',
                    message: 'Threshold must be a number between 0 and 1'
                });
            }
            validThreshold = parsedThreshold;
        }

        // Validate limit
        let validLimit = 100;
        if (limit !== undefined) {
            const parsedLimit = parseInt(limit);
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid limit',
                    message: 'Limit must be a number between 1 and 1000'
                });
            }
            validLimit = parsedLimit;
        }

        // Validate status
        const validStatuses = ['active', 'inactive', 'archived'];
        let validStatus = 'active';
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status',
                message: `Status must be one of: ${validStatuses.join(', ')}`
            });
        }
        if (status) {
            validStatus = status;
        }

        // Scan for duplicates
        const duplicatePairs = await DeduplicationService.scanForDuplicates(firmId, {
            threshold: validThreshold,
            limit: validLimit,
            status: validStatus
        });

        res.json({
            success: true,
            message: `Found ${duplicatePairs.length} duplicate pairs`,
            data: {
                threshold: validThreshold,
                total: duplicatePairs.length,
                pairs: duplicatePairs
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // CONTACT MERGING
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Merge two contacts
     * @route   POST /api/contacts/merge
     * @access  Private
     */
    mergeContacts = asyncHandler(async (req, res) => {
        const { masterId, duplicateId } = req.body;
        const firmId = req.firmId;
        const userId = req.userID;

        // Input validation
        if (!masterId || !duplicateId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Both masterId and duplicateId are required'
            });
        }

        // Sanitize and validate IDs
        const sanitizedMasterId = sanitizeObjectId(masterId);
        const sanitizedDuplicateId = sanitizeObjectId(duplicateId);

        if (!sanitizedMasterId || !sanitizedDuplicateId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ID format',
                message: 'Both masterId and duplicateId must be valid ObjectIds'
            });
        }

        // Cannot merge contact with itself
        if (sanitizedMasterId === sanitizedDuplicateId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid operation',
                message: 'Cannot merge a contact with itself'
            });
        }

        // IDOR Protection - Verify both contacts belong to the user's firm
        const query = firmId
            ? { firmId }
            : { lawyerId: userId };

        const masterContact = await Contact.findOne({ _id: sanitizedMasterId, ...query });
        const duplicateContact = await Contact.findOne({ _id: sanitizedDuplicateId, ...query });

        if (!masterContact) {
            return res.status(404).json({
                success: false,
                error: 'Master contact not found',
                message: 'The master contact does not exist or you do not have access to it'
            });
        }

        if (!duplicateContact) {
            return res.status(404).json({
                success: false,
                error: 'Duplicate contact not found',
                message: 'The duplicate contact does not exist or you do not have access to it'
            });
        }

        // Perform merge
        const mergedContact = await DeduplicationService.mergeContacts(
            sanitizedMasterId,
            sanitizedDuplicateId,
            userId,
            firmId || userId
        );

        res.json({
            success: true,
            message: 'Contacts merged successfully',
            data: mergedContact
        });
    });

    /**
     * @desc    Auto-merge high confidence duplicates
     * @route   POST /api/contacts/auto-merge
     * @access  Private (Admin)
     */
    autoMerge = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const userId = req.userID;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context required',
                message: 'This operation requires a firm context'
            });
        }

        // Get options from request body
        const { threshold, dryRun } = req.body;

        // Validate threshold
        let validThreshold = 0.95;
        if (threshold !== undefined) {
            const parsedThreshold = parseFloat(threshold);
            if (isNaN(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid threshold',
                    message: 'Threshold must be a number between 0 and 1'
                });
            }
            validThreshold = parsedThreshold;
        }

        // Validate dryRun
        const isDryRun = dryRun === true || dryRun === 'true';

        // Perform auto-merge
        const results = await DeduplicationService.autoMerge(
            firmId,
            validThreshold,
            isDryRun
        );

        res.json({
            success: true,
            message: isDryRun
                ? `Would merge ${results.pairs.length} duplicate pairs`
                : `Merged ${results.merged} duplicate pairs`,
            data: {
                threshold: validThreshold,
                dryRun: isDryRun,
                ...results
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // DUPLICATE SUGGESTIONS & MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get duplicate suggestions for manual review
     * @route   GET /api/contacts/duplicate-suggestions
     * @access  Private
     */
    getDuplicateSuggestions = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const lawyerId = req.userID;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context required',
                message: 'This operation requires a firm context'
            });
        }

        // Get limit from query params
        let limit = 50;
        if (req.query.limit) {
            const parsedLimit = parseInt(req.query.limit);
            if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid limit',
                    message: 'Limit must be a number between 1 and 200'
                });
            }
            limit = parsedLimit;
        }

        // Get duplicate suggestions
        const suggestions = await DeduplicationService.getDuplicateSuggestions(
            firmId,
            limit
        );

        res.json({
            success: true,
            message: `Found ${suggestions.length} duplicate suggestions`,
            data: {
                total: suggestions.length,
                suggestions
            }
        });
    });

    /**
     * @desc    Mark two contacts as not duplicates
     * @route   POST /api/contacts/not-duplicate
     * @access  Private
     */
    markNotDuplicate = asyncHandler(async (req, res) => {
        const { contactId1, contactId2 } = req.body;
        const firmId = req.firmId;
        const userId = req.userID;

        // Input validation
        if (!contactId1 || !contactId2) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'Both contactId1 and contactId2 are required'
            });
        }

        // Sanitize and validate IDs
        const sanitizedContactId1 = sanitizeObjectId(contactId1);
        const sanitizedContactId2 = sanitizeObjectId(contactId2);

        if (!sanitizedContactId1 || !sanitizedContactId2) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ID format',
                message: 'Both contactId1 and contactId2 must be valid ObjectIds'
            });
        }

        // Cannot mark same contact
        if (sanitizedContactId1 === sanitizedContactId2) {
            return res.status(400).json({
                success: false,
                error: 'Invalid operation',
                message: 'Cannot mark a contact as not duplicate of itself'
            });
        }

        // IDOR Protection - Verify both contacts belong to the user's firm
        const query = firmId
            ? { firmId }
            : { lawyerId: userId };

        const contact1 = await Contact.findOne({ _id: sanitizedContactId1, ...query });
        const contact2 = await Contact.findOne({ _id: sanitizedContactId2, ...query });

        if (!contact1) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found',
                message: 'Contact 1 does not exist or you do not have access to it'
            });
        }

        if (!contact2) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found',
                message: 'Contact 2 does not exist or you do not have access to it'
            });
        }

        // Mark as not duplicate
        const result = await DeduplicationService.markNotDuplicate(
            sanitizedContactId1,
            sanitizedContactId2,
            userId,
            firmId || userId
        );

        res.json({
            success: true,
            message: 'Contacts marked as not duplicates',
            data: result
        });
    });
}

module.exports = new DeduplicationController();
