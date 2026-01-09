/**
 * Legal Documents CRUD Routes
 *
 * Core CRUD operations for legal documents.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:id                    - Get legal document by ID
 * - PATCH /:id                  - Update legal document
 * - DELETE /:id                 - Delete legal document
 * - POST /:id/download          - Download document
 * - GET /:id/versions           - Get document versions
 * - POST /:id/versions          - Create new version
 * - POST /:id/restore/:versionId - Restore specific version
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Document = require('../models/document.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Allowed fields for legal documents
const ALLOWED_DOCUMENT_FIELDS = [
    'title', 'description', 'category', 'subcategory', 'tags',
    'status', 'effectiveDate', 'expirationDate', 'parties',
    'jurisdiction', 'governingLaw', 'confidentiality', 'metadata'
];

// Valid document statuses
const VALID_STATUSES = ['draft', 'pending_review', 'approved', 'active', 'expired', 'terminated', 'archived'];

/**
 * GET /:id - Get legal document by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .populate('createdBy', 'firstName lastName email')
            .populate('lastModifiedBy', 'firstName lastName')
            .lean();

        if (!document) {
            throw CustomException('Legal document not found', 404);
        }

        res.json({
            success: true,
            data: document
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /:id - Update legal document
 */
router.patch('/:id', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const safeData = pickAllowedFields(req.body, ALLOWED_DOCUMENT_FIELDS);

        // Validate status
        if (safeData.status && !VALID_STATUSES.includes(safeData.status)) {
            throw CustomException(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`, 400);
        }

        // Validate dates
        if (safeData.effectiveDate && safeData.expirationDate) {
            const effective = new Date(safeData.effectiveDate);
            const expiration = new Date(safeData.expirationDate);
            if (expiration <= effective) {
                throw CustomException('Expiration date must be after effective date', 400);
            }
        }

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Legal document not found', 404);
        }

        // Store previous version before update
        if (!document.versions) document.versions = [];

        // Create version snapshot for significant changes
        const significantFields = ['title', 'description', 'status', 'parties'];
        const hasSignificantChange = significantFields.some(f => safeData[f] !== undefined);

        if (hasSignificantChange) {
            document.versions.push({
                _id: new mongoose.Types.ObjectId(),
                versionNumber: document.versions.length + 1,
                snapshot: {
                    title: document.title,
                    description: document.description,
                    status: document.status,
                    parties: document.parties,
                    legalDocument: document.legalDocument
                },
                createdBy: req.userID,
                createdAt: new Date(),
                changeNotes: req.body.changeNotes || 'Document updated'
            });
        }

        // Apply updates
        Object.assign(document, safeData);
        document.lastModifiedBy = req.userID;
        document.lastModifiedAt = new Date();

        await document.save();

        res.json({
            success: true,
            message: 'Legal document updated',
            data: document
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:id - Delete legal document
 */
router.delete('/:id', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { permanent } = req.query;

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Legal document not found', 404);
        }

        // Check if document has active signatures
        const hasActiveSignatures = (document.legalDocument?.parties || []).some(
            p => p.status === 'signed'
        );

        if (hasActiveSignatures && permanent !== 'true') {
            throw CustomException('Cannot delete document with active signatures. Use permanent=true to force delete.', 400);
        }

        if (permanent === 'true') {
            // Hard delete
            await Document.deleteOne({ _id: documentId, ...req.firmQuery });
        } else {
            // Soft delete - archive
            document.status = 'archived';
            document.archivedAt = new Date();
            document.archivedBy = req.userID;
            await document.save();
        }

        res.json({
            success: true,
            message: permanent === 'true' ? 'Legal document permanently deleted' : 'Legal document archived'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/download - Download document
 */
router.post('/:id/download', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { format, includeSignatures } = req.body;

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .lean();

        if (!document) {
            throw CustomException('Legal document not found', 404);
        }

        // Track download
        await Document.updateOne(
            { _id: documentId, ...req.firmQuery },
            {
                $inc: { downloadCount: 1 },
                $push: {
                    downloadHistory: {
                        downloadedAt: new Date(),
                        downloadedBy: req.userID,
                        format: format || 'original',
                        ipAddress: req.ip
                    }
                }
            }
        );

        // If document has file URL, return it
        if (document.fileUrl) {
            res.json({
                success: true,
                data: {
                    downloadUrl: document.fileUrl,
                    fileName: document.fileName,
                    mimeType: document.mimeType,
                    size: document.fileSize,
                    expiresIn: 3600 // URL valid for 1 hour
                }
            });
        } else {
            throw CustomException('Document file not available', 404);
        }
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/versions - Get document versions
 */
router.get('/:id/versions', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('versions title')
            .populate('versions.createdBy', 'firstName lastName')
            .lean();

        if (!document) {
            throw CustomException('Legal document not found', 404);
        }

        const versions = (document.versions || [])
            .sort((a, b) => b.versionNumber - a.versionNumber);

        res.json({
            success: true,
            data: {
                documentId,
                documentTitle: document.title,
                currentVersion: versions.length > 0 ? versions[0].versionNumber + 1 : 1,
                versions: versions.map(v => ({
                    _id: v._id,
                    versionNumber: v.versionNumber,
                    createdBy: v.createdBy,
                    createdAt: v.createdAt,
                    changeNotes: v.changeNotes,
                    snapshotFields: Object.keys(v.snapshot || {})
                }))
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/versions - Create new version
 */
router.post('/:id/versions', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { changeNotes, fileUrl, fileName } = req.body;

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Legal document not found', 404);
        }

        if (!document.versions) document.versions = [];

        // Check version limit
        if (document.versions.length >= 100) {
            throw CustomException('Maximum 100 versions per document', 400);
        }

        const newVersion = {
            _id: new mongoose.Types.ObjectId(),
            versionNumber: document.versions.length + 1,
            snapshot: {
                title: document.title,
                description: document.description,
                status: document.status,
                parties: document.parties,
                legalDocument: document.legalDocument,
                fileUrl: document.fileUrl,
                fileName: document.fileName
            },
            createdBy: req.userID,
            createdAt: new Date(),
            changeNotes: changeNotes || 'New version created'
        };

        document.versions.push(newVersion);

        // Update current document with new file if provided
        if (fileUrl) {
            document.fileUrl = fileUrl;
            document.fileName = fileName || document.fileName;
        }

        document.lastModifiedBy = req.userID;
        document.lastModifiedAt = new Date();

        await document.save();

        res.status(201).json({
            success: true,
            message: 'New version created',
            data: {
                versionId: newVersion._id,
                versionNumber: newVersion.versionNumber,
                createdAt: newVersion.createdAt
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/restore/:versionId - Restore specific version
 */
router.post('/:id/restore/:versionId', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Legal document not found', 404);
        }

        const version = (document.versions || []).find(
            v => v._id?.toString() === versionId.toString()
        );

        if (!version) {
            throw CustomException('Version not found', 404);
        }

        // Create backup version of current state before restoring
        if (!document.versions) document.versions = [];

        document.versions.push({
            _id: new mongoose.Types.ObjectId(),
            versionNumber: document.versions.length + 1,
            snapshot: {
                title: document.title,
                description: document.description,
                status: document.status,
                parties: document.parties,
                legalDocument: document.legalDocument,
                fileUrl: document.fileUrl,
                fileName: document.fileName
            },
            createdBy: req.userID,
            createdAt: new Date(),
            changeNotes: `Backup before restoring to version ${version.versionNumber}`
        });

        // Restore from snapshot
        const snapshot = version.snapshot || {};
        if (snapshot.title) document.title = snapshot.title;
        if (snapshot.description) document.description = snapshot.description;
        if (snapshot.status) document.status = snapshot.status;
        if (snapshot.parties) document.parties = snapshot.parties;
        if (snapshot.legalDocument) document.legalDocument = snapshot.legalDocument;
        if (snapshot.fileUrl) document.fileUrl = snapshot.fileUrl;
        if (snapshot.fileName) document.fileName = snapshot.fileName;

        document.lastModifiedBy = req.userID;
        document.lastModifiedAt = new Date();
        document.restoredFrom = {
            versionId,
            versionNumber: version.versionNumber,
            restoredAt: new Date(),
            restoredBy: req.userID
        };

        await document.save();

        res.json({
            success: true,
            message: `Document restored to version ${version.versionNumber}`,
            data: {
                documentId,
                restoredVersion: version.versionNumber,
                currentVersion: document.versions.length + 1
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
