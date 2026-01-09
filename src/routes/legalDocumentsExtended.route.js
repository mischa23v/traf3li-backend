/**
 * Legal Documents Extended Routes
 *
 * Extended legal document operations including signing, execution, and tracking.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:id/signature-status     - Get signature status
 * - POST /:id/request-signature   - Request signature from party
 * - POST /:id/sign                - Sign document
 * - POST /:id/execute             - Mark document as executed
 * - GET /:id/audit-trail          - Get document audit trail
 * - POST /:id/send-reminder       - Send signing reminder
 * - GET /:id/parties              - Get document parties/signatories
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Document = require('../models/document.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Valid signature statuses
const VALID_SIGNATURE_STATUSES = ['pending', 'sent', 'viewed', 'signed', 'declined', 'expired'];
const VALID_PARTY_ROLES = ['signer', 'witness', 'notary', 'approver', 'cc'];

/**
 * GET /:id/signature-status - Get signature status
 */
router.get('/:id/signature-status', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('legalDocument.signatureStatus legalDocument.parties fileName')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const signatureStatus = document.legalDocument?.signatureStatus || {
            status: 'draft',
            totalSigners: 0,
            signedCount: 0,
            pendingCount: 0
        };

        // Calculate status summary
        const parties = document.legalDocument?.parties || [];
        const signers = parties.filter(p => p.role === 'signer');
        const signedParties = signers.filter(p => p.status === 'signed');
        const pendingParties = signers.filter(p => ['pending', 'sent', 'viewed'].includes(p.status));

        res.json({
            success: true,
            data: {
                documentId,
                fileName: document.fileName,
                status: signatureStatus.status || 'draft',
                totalSigners: signers.length,
                signedCount: signedParties.length,
                pendingCount: pendingParties.length,
                completionPercentage: signers.length > 0
                    ? Math.round((signedParties.length / signers.length) * 100)
                    : 0,
                parties: parties.map(p => ({
                    name: p.name,
                    email: p.email,
                    role: p.role,
                    status: p.status,
                    signedAt: p.signedAt
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/request-signature - Request signature from party
 */
router.post('/:id/request-signature', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { name, email, role = 'signer', message, dueDate, order } = req.body;

        if (!name || !email) {
            throw CustomException('Name and email are required', 400);
        }

        if (!VALID_PARTY_ROLES.includes(role)) {
            throw CustomException(`Invalid role. Must be one of: ${VALID_PARTY_ROLES.join(', ')}`, 400);
        }

        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw CustomException('Invalid email format', 400);
        }

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Document not found', 404);
        }

        if (!document.legalDocument) document.legalDocument = {};
        if (!document.legalDocument.parties) document.legalDocument.parties = [];

        // Check if party already exists
        const existingParty = document.legalDocument.parties.find(
            p => p.email?.toLowerCase() === email.toLowerCase()
        );

        if (existingParty) {
            throw CustomException('This email has already been added as a party', 400);
        }

        const party = {
            _id: new mongoose.Types.ObjectId(),
            name,
            email: email.toLowerCase(),
            role,
            status: 'sent',
            message,
            dueDate: dueDate ? new Date(dueDate) : null,
            order: order || document.legalDocument.parties.length,
            requestedAt: new Date(),
            requestedBy: req.userID
        };

        document.legalDocument.parties.push(party);

        // Update overall status
        if (!document.legalDocument.signatureStatus) {
            document.legalDocument.signatureStatus = {};
        }
        document.legalDocument.signatureStatus.status = 'pending_signatures';
        document.legalDocument.signatureStatus.updatedAt = new Date();

        document.lastModifiedBy = req.userID;
        await document.save();

        // In production, would send email notification here

        res.status(201).json({
            success: true,
            message: 'Signature request sent',
            data: {
                partyId: party._id,
                name: party.name,
                email: party.email,
                role: party.role,
                status: party.status
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/sign - Sign document
 */
router.post('/:id/sign', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { partyId, signature, signatureType = 'electronic', ipAddress } = req.body;

        if (!partyId) {
            throw CustomException('Party ID is required', 400);
        }

        const safePartyId = sanitizeObjectId(partyId, 'partyId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const party = (document.legalDocument?.parties || []).find(
            p => p._id?.toString() === safePartyId.toString()
        );

        if (!party) {
            throw CustomException('Party not found', 404);
        }

        if (party.status === 'signed') {
            throw CustomException('Document has already been signed by this party', 400);
        }

        if (party.status === 'declined') {
            throw CustomException('Party has declined to sign', 400);
        }

        // Update party signature
        party.status = 'signed';
        party.signedAt = new Date();
        party.signatureType = signatureType;
        party.signatureData = signature;
        party.signedIpAddress = ipAddress || req.ip;
        party.signedUserAgent = req.get('user-agent');

        // Check if all signers have signed
        const signers = document.legalDocument.parties.filter(p => p.role === 'signer');
        const allSigned = signers.every(p => p.status === 'signed');

        if (allSigned) {
            document.legalDocument.signatureStatus.status = 'fully_signed';
            document.legalDocument.signatureStatus.completedAt = new Date();
        }

        document.legalDocument.signatureStatus.updatedAt = new Date();
        document.lastModifiedBy = req.userID;
        await document.save();

        res.json({
            success: true,
            message: 'Document signed successfully',
            data: {
                partyId: party._id,
                signedAt: party.signedAt,
                allPartiesSigned: allSigned,
                documentStatus: document.legalDocument.signatureStatus.status
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/execute - Mark document as executed
 */
router.post('/:id/execute', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { executionDate, executionNotes, witnessName, notarized } = req.body;

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Document not found', 404);
        }

        // Verify all required signatures are complete
        const signers = (document.legalDocument?.parties || []).filter(p => p.role === 'signer');
        const allSigned = signers.length === 0 || signers.every(p => p.status === 'signed');

        if (!allSigned) {
            throw CustomException('Cannot execute document - not all parties have signed', 400);
        }

        if (!document.legalDocument) document.legalDocument = {};
        if (!document.legalDocument.signatureStatus) document.legalDocument.signatureStatus = {};

        document.legalDocument.signatureStatus.status = 'executed';
        document.legalDocument.execution = {
            executedAt: executionDate ? new Date(executionDate) : new Date(),
            executedBy: req.userID,
            notes: executionNotes,
            witnessName,
            notarized: !!notarized,
            notarizedAt: notarized ? new Date() : null
        };

        document.lastModifiedBy = req.userID;
        await document.save();

        res.json({
            success: true,
            message: 'Document marked as executed',
            data: {
                documentId,
                status: 'executed',
                executedAt: document.legalDocument.execution.executedAt,
                notarized: document.legalDocument.execution.notarized
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/audit-trail - Get document audit trail
 */
router.get('/:id/audit-trail', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('legalDocument.auditTrail legalDocument.parties fileName createdAt createdBy')
            .populate('createdBy', 'firstName lastName')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        // Build comprehensive audit trail
        const auditEntries = [];

        // Document creation
        auditEntries.push({
            action: 'document_created',
            timestamp: document.createdAt,
            actor: document.createdBy
                ? `${document.createdBy.firstName} ${document.createdBy.lastName}`
                : 'System',
            details: `Document "${document.fileName}" created`
        });

        // Party events
        (document.legalDocument?.parties || []).forEach(party => {
            if (party.requestedAt) {
                auditEntries.push({
                    action: 'signature_requested',
                    timestamp: party.requestedAt,
                    actor: 'System',
                    details: `Signature requested from ${party.name} (${party.email})`
                });
            }
            if (party.viewedAt) {
                auditEntries.push({
                    action: 'document_viewed',
                    timestamp: party.viewedAt,
                    actor: party.name,
                    details: `Document viewed by ${party.email}`,
                    ipAddress: party.viewedIpAddress
                });
            }
            if (party.signedAt) {
                auditEntries.push({
                    action: 'document_signed',
                    timestamp: party.signedAt,
                    actor: party.name,
                    details: `Document signed by ${party.email} (${party.signatureType || 'electronic'})`,
                    ipAddress: party.signedIpAddress
                });
            }
            if (party.declinedAt) {
                auditEntries.push({
                    action: 'signature_declined',
                    timestamp: party.declinedAt,
                    actor: party.name,
                    details: `Signature declined by ${party.email}: ${party.declineReason || 'No reason provided'}`
                });
            }
        });

        // Custom audit entries
        (document.legalDocument?.auditTrail || []).forEach(entry => {
            auditEntries.push({
                action: entry.action,
                timestamp: entry.timestamp,
                actor: entry.actorName || 'System',
                details: entry.details,
                ipAddress: entry.ipAddress
            });
        });

        // Sort by timestamp descending
        auditEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            data: {
                documentId,
                fileName: document.fileName,
                totalEntries: auditEntries.length,
                auditTrail: auditEntries
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/send-reminder - Send signing reminder
 */
router.post('/:id/send-reminder', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { partyId, message } = req.body;

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Document not found', 404);
        }

        let targetParties = [];

        if (partyId) {
            // Send to specific party
            const safePartyId = sanitizeObjectId(partyId, 'partyId');
            const party = (document.legalDocument?.parties || []).find(
                p => p._id?.toString() === safePartyId.toString()
            );

            if (!party) {
                throw CustomException('Party not found', 404);
            }

            if (party.status === 'signed') {
                throw CustomException('Party has already signed', 400);
            }

            targetParties = [party];
        } else {
            // Send to all pending parties
            targetParties = (document.legalDocument?.parties || []).filter(
                p => ['pending', 'sent', 'viewed'].includes(p.status) && p.role === 'signer'
            );
        }

        if (targetParties.length === 0) {
            throw CustomException('No pending signers to remind', 400);
        }

        // Update reminder sent timestamp
        targetParties.forEach(party => {
            party.lastReminderAt = new Date();
            party.reminderCount = (party.reminderCount || 0) + 1;
        });

        // Add audit entry
        if (!document.legalDocument.auditTrail) document.legalDocument.auditTrail = [];
        document.legalDocument.auditTrail.push({
            action: 'reminder_sent',
            timestamp: new Date(),
            actorId: req.userID,
            details: `Reminder sent to ${targetParties.length} pending signer(s)`,
            ipAddress: req.ip
        });

        document.lastModifiedBy = req.userID;
        await document.save();

        // In production, would send email reminders here

        res.json({
            success: true,
            message: `Reminder sent to ${targetParties.length} pending signer(s)`,
            data: {
                remindedParties: targetParties.map(p => ({
                    name: p.name,
                    email: p.email,
                    reminderCount: p.reminderCount
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/parties - Get document parties/signatories
 */
router.get('/:id/parties', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('legalDocument.parties fileName')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const parties = (document.legalDocument?.parties || []).map(p => ({
            _id: p._id,
            name: p.name,
            email: p.email,
            role: p.role,
            status: p.status,
            order: p.order,
            dueDate: p.dueDate,
            requestedAt: p.requestedAt,
            viewedAt: p.viewedAt,
            signedAt: p.signedAt,
            declinedAt: p.declinedAt,
            declineReason: p.declineReason,
            reminderCount: p.reminderCount || 0,
            lastReminderAt: p.lastReminderAt
        }));

        // Sort by order
        parties.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Group by role
        const grouped = {
            signers: parties.filter(p => p.role === 'signer'),
            witnesses: parties.filter(p => p.role === 'witness'),
            notaries: parties.filter(p => p.role === 'notary'),
            approvers: parties.filter(p => p.role === 'approver'),
            cc: parties.filter(p => p.role === 'cc')
        };

        res.json({
            success: true,
            data: {
                documentId,
                fileName: document.fileName,
                totalParties: parties.length,
                parties,
                byRole: grouped
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
