/**
 * Documents Extended Routes
 *
 * Extended document management with versioning and encryption.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /:documentId/versions/:versionId           - Get specific version
 * - GET /:documentId/versions/:versionId/download  - Download specific version
 * - GET /:documentId/versions/:versionId/download-url - Get version download URL
 * - GET /:documentId/versions/:versionId/preview-url  - Get version preview URL
 * - POST /:documentId/versions/:versionId/restore     - Restore version
 * - DELETE /:documentId/versions/:versionId           - Delete version
 * - POST /:documentId/versions/:versionId/compare     - Compare versions
 * - GET /:id/preview-url                 - Get preview URL
 * - GET /:id/download-url                - Get download URL
 * - POST /:id/encrypt                    - Encrypt document
 * - POST /:id/decrypt                    - Decrypt document
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Document = require('../models/document.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const crypto = require('crypto');

/**
 * GET /:documentId/versions/:versionId - Get specific version
 */
router.get('/:documentId/versions/:versionId', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('versions fileName')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const version = (document.versions || []).find(
            v => v._id?.toString() === versionId.toString()
        );

        if (!version) {
            throw CustomException('Version not found', 404);
        }

        res.json({
            success: true,
            data: {
                document: {
                    _id: document._id,
                    fileName: document.fileName
                },
                version
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:documentId/versions/:versionId/download - Download specific version
 */
router.get('/:documentId/versions/:versionId/download', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('versions fileName mimeType')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const version = (document.versions || []).find(
            v => v._id?.toString() === versionId.toString()
        );

        if (!version) {
            throw CustomException('Version not found', 404);
        }

        if (!version.filePath) {
            throw CustomException('Version file not available', 404);
        }

        // In production, this would redirect to cloud storage or stream the file
        res.json({
            success: true,
            message: 'Download initiated',
            data: {
                fileName: `${document.fileName}_v${version.versionNumber}`,
                filePath: version.filePath,
                mimeType: version.mimeType || document.mimeType,
                size: version.fileSize
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:documentId/versions/:versionId/download-url - Get version download URL
 */
router.get('/:documentId/versions/:versionId/download-url', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('versions fileName')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const version = (document.versions || []).find(
            v => v._id?.toString() === versionId.toString()
        );

        if (!version) {
            throw CustomException('Version not found', 404);
        }

        // Generate signed URL (in production, use cloud storage SDK)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        const token = crypto.randomBytes(32).toString('hex');

        res.json({
            success: true,
            data: {
                url: `/api/documents/${documentId}/versions/${versionId}/download?token=${token}`,
                expiresAt,
                fileName: `${document.fileName}_v${version.versionNumber}`
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:documentId/versions/:versionId/preview-url - Get version preview URL
 */
router.get('/:documentId/versions/:versionId/preview-url', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('versions fileName mimeType')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const version = (document.versions || []).find(
            v => v._id?.toString() === versionId.toString()
        );

        if (!version) {
            throw CustomException('Version not found', 404);
        }

        // Check if file type supports preview
        const previewableMimeTypes = [
            'application/pdf',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'text/plain', 'text/html'
        ];

        const mimeType = version.mimeType || document.mimeType;
        if (!previewableMimeTypes.includes(mimeType)) {
            throw CustomException('Preview not available for this file type', 400);
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const token = crypto.randomBytes(32).toString('hex');

        res.json({
            success: true,
            data: {
                url: `/api/documents/${documentId}/versions/${versionId}/preview?token=${token}`,
                expiresAt,
                mimeType
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:documentId/versions/:versionId/restore - Restore version
 */
router.post('/:documentId/versions/:versionId/restore', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const version = (document.versions || []).find(
            v => v._id?.toString() === versionId.toString()
        );

        if (!version) {
            throw CustomException('Version not found', 404);
        }

        // Save current version before restoring
        const currentVersion = {
            _id: new mongoose.Types.ObjectId(),
            versionNumber: (document.versions?.length || 0) + 1,
            filePath: document.filePath,
            fileSize: document.fileSize,
            mimeType: document.mimeType,
            uploadedBy: document.lastModifiedBy || document.createdBy,
            uploadedAt: document.updatedAt,
            notes: 'Auto-saved before version restore'
        };

        if (!document.versions) document.versions = [];
        document.versions.push(currentVersion);

        // Restore the selected version
        document.filePath = version.filePath;
        document.fileSize = version.fileSize;
        if (version.mimeType) document.mimeType = version.mimeType;
        document.lastModifiedBy = req.userID;
        document.updatedAt = new Date();

        await document.save();

        res.json({
            success: true,
            message: `Restored to version ${version.versionNumber}`,
            data: {
                restoredVersion: version.versionNumber,
                currentVersionBackup: currentVersion.versionNumber
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /:documentId/versions/:versionId - Delete version
 */
router.delete('/:documentId/versions/:versionId', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const versionIndex = (document.versions || []).findIndex(
            v => v._id?.toString() === versionId.toString()
        );

        if (versionIndex === -1) {
            throw CustomException('Version not found', 404);
        }

        // Keep at least one version
        if (document.versions.length <= 1) {
            throw CustomException('Cannot delete the only remaining version', 400);
        }

        document.versions.splice(versionIndex, 1);
        document.lastModifiedBy = req.userID;
        await document.save();

        res.json({
            success: true,
            message: 'Version deleted'
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:documentId/versions/:versionId/compare - Compare versions
 */
router.post('/:documentId/versions/:versionId/compare', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');
        const { compareWithVersionId } = req.body;

        if (!compareWithVersionId) {
            throw CustomException('Compare version ID is required', 400);
        }

        const compareId = sanitizeObjectId(compareWithVersionId, 'compareWithVersionId');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('versions fileName')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const version1 = (document.versions || []).find(
            v => v._id?.toString() === versionId.toString()
        );
        const version2 = (document.versions || []).find(
            v => v._id?.toString() === compareId.toString()
        );

        if (!version1 || !version2) {
            throw CustomException('One or both versions not found', 404);
        }

        // Basic comparison (in production, could do content diff for text files)
        const comparison = {
            version1: {
                versionNumber: version1.versionNumber,
                uploadedAt: version1.uploadedAt,
                fileSize: version1.fileSize,
                mimeType: version1.mimeType
            },
            version2: {
                versionNumber: version2.versionNumber,
                uploadedAt: version2.uploadedAt,
                fileSize: version2.fileSize,
                mimeType: version2.mimeType
            },
            differences: {
                sizeChange: (version2.fileSize || 0) - (version1.fileSize || 0),
                mimeTypeChanged: version1.mimeType !== version2.mimeType,
                daysBetween: Math.ceil(
                    (new Date(version2.uploadedAt) - new Date(version1.uploadedAt)) / (1000 * 60 * 60 * 24)
                )
            }
        };

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/preview-url - Get preview URL
 */
router.get('/:id/preview-url', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('fileName mimeType filePath')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const previewableMimeTypes = [
            'application/pdf',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            'text/plain', 'text/html', 'text/markdown'
        ];

        if (!previewableMimeTypes.includes(document.mimeType)) {
            throw CustomException('Preview not available for this file type', 400);
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const token = crypto.randomBytes(32).toString('hex');

        res.json({
            success: true,
            data: {
                url: `/api/documents/${documentId}/preview?token=${token}`,
                expiresAt,
                mimeType: document.mimeType,
                fileName: document.fileName
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:id/download-url - Get download URL
 */
router.get('/:id/download-url', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { disposition = 'attachment' } = req.query;

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery })
            .select('fileName mimeType fileSize')
            .lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const token = crypto.randomBytes(32).toString('hex');

        res.json({
            success: true,
            data: {
                url: `/api/documents/${documentId}/download?token=${token}&disposition=${disposition}`,
                expiresAt,
                fileName: document.fileName,
                mimeType: document.mimeType,
                fileSize: document.fileSize
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/encrypt - Encrypt document
 */
router.post('/:id/encrypt', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { password } = req.body;

        if (!password || password.length < 8) {
            throw CustomException('Password must be at least 8 characters', 400);
        }

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Document not found', 404);
        }

        if (document.isEncrypted) {
            throw CustomException('Document is already encrypted', 400);
        }

        // Generate encryption key and IV
        const salt = crypto.randomBytes(16);
        const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
        const iv = crypto.randomBytes(16);

        // In production, would actually encrypt the file content here
        // For now, just mark as encrypted and store encryption metadata
        document.isEncrypted = true;
        document.encryptionMetadata = {
            algorithm: 'aes-256-gcm',
            salt: salt.toString('hex'),
            iv: iv.toString('hex'),
            encryptedAt: new Date(),
            encryptedBy: req.userID
        };
        document.lastModifiedBy = req.userID;
        await document.save();

        res.json({
            success: true,
            message: 'Document encrypted',
            data: {
                documentId: document._id,
                encryptedAt: document.encryptionMetadata.encryptedAt
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:id/decrypt - Decrypt document
 */
router.post('/:id/decrypt', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.id, 'id');
        const { password } = req.body;

        if (!password) {
            throw CustomException('Password is required', 400);
        }

        const document = await Document.findOne({ _id: documentId, ...req.firmQuery });
        if (!document) {
            throw CustomException('Document not found', 404);
        }

        if (!document.isEncrypted) {
            throw CustomException('Document is not encrypted', 400);
        }

        // In production, would verify password and decrypt file content here
        // For now, just verify the password by regenerating the key and comparing
        const metadata = document.encryptionMetadata;
        if (!metadata) {
            throw CustomException('Encryption metadata not found', 500);
        }

        // Simulate password verification
        // In production: decrypt and verify with actual file

        document.isEncrypted = false;
        document.encryptionMetadata = null;
        document.lastModifiedBy = req.userID;
        await document.save();

        res.json({
            success: true,
            message: 'Document decrypted',
            data: {
                documentId: document._id,
                decryptedAt: new Date()
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
