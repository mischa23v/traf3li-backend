/**
 * Documents Versions Extended Routes
 *
 * Extended document version operations - cleanup, compare, statistics.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - POST /:documentId/versions/cleanup        - Clean up old versions
 * - GET /:documentId/versions/compare         - Compare two versions
 * - GET /:documentId/versions/statistics      - Get version statistics
 * - GET /:documentId/versions/diff            - Get version diff
 * - GET /:documentId/versions/timeline        - Get version timeline
 * - POST /:documentId/versions/restore/:versionId - Restore specific version
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Document = require('../models/document.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

/**
 * POST /:documentId/versions/cleanup - Clean up old versions
 */
router.post('/:documentId/versions/cleanup', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const { keepCount = 10, olderThan } = req.body;

        if (keepCount < 1 || keepCount > 100) {
            throw CustomException('Keep count must be between 1 and 100', 400);
        }

        const document = await Document.findOne({
            _id: documentId,
            ...req.firmQuery
        });

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        if (!document.versions || document.versions.length <= keepCount) {
            return res.json({
                success: true,
                message: 'No versions to clean up',
                data: {
                    versionsKept: document.versions?.length || 0,
                    versionsRemoved: 0
                }
            });
        }

        // Sort versions by date descending
        const sortedVersions = [...document.versions].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        let versionsToKeep = sortedVersions.slice(0, keepCount);
        let versionsToRemove = sortedVersions.slice(keepCount);

        // Filter by date if specified
        if (olderThan) {
            const cutoffDate = new Date(olderThan);
            versionsToRemove = versionsToRemove.filter(v =>
                new Date(v.createdAt) < cutoffDate
            );
        }

        // Remove old versions
        const removedIds = new Set(versionsToRemove.map(v => v._id?.toString()));
        document.versions = document.versions.filter(v =>
            !removedIds.has(v._id?.toString())
        );

        document.lastCleanupAt = new Date();
        document.lastCleanupBy = req.userID;
        await document.save();

        res.json({
            success: true,
            message: 'Version cleanup completed',
            data: {
                versionsKept: document.versions.length,
                versionsRemoved: versionsToRemove.length
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:documentId/versions/compare - Compare two versions
 */
router.get('/:documentId/versions/compare', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const { v1, v2 } = req.query;

        if (!v1 || !v2) {
            throw CustomException('Both v1 and v2 version IDs are required', 400);
        }

        const version1Id = sanitizeObjectId(v1, 'v1');
        const version2Id = sanitizeObjectId(v2, 'v2');

        const document = await Document.findOne({
            _id: documentId,
            ...req.firmQuery
        }).lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const version1 = (document.versions || []).find(
            v => v._id?.toString() === version1Id.toString()
        );

        const version2 = (document.versions || []).find(
            v => v._id?.toString() === version2Id.toString()
        );

        if (!version1) {
            throw CustomException('Version 1 not found', 404);
        }

        if (!version2) {
            throw CustomException('Version 2 not found', 404);
        }

        // Build comparison
        const comparison = {
            version1: {
                id: version1._id,
                versionNumber: version1.versionNumber,
                createdAt: version1.createdAt,
                createdBy: version1.createdBy,
                size: version1.size || 0,
                name: version1.fileName || version1.name
            },
            version2: {
                id: version2._id,
                versionNumber: version2.versionNumber,
                createdAt: version2.createdAt,
                createdBy: version2.createdBy,
                size: version2.size || 0,
                name: version2.fileName || version2.name
            },
            differences: {
                sizeDiff: (version2.size || 0) - (version1.size || 0),
                timeDiff: new Date(version2.createdAt) - new Date(version1.createdAt),
                nameChanged: (version1.fileName || version1.name) !== (version2.fileName || version2.name)
            }
        };

        // Calculate metadata changes
        const metaChanges = [];
        const meta1 = version1.metadata || {};
        const meta2 = version2.metadata || {};

        const allKeys = new Set([...Object.keys(meta1), ...Object.keys(meta2)]);
        allKeys.forEach(key => {
            if (meta1[key] !== meta2[key]) {
                metaChanges.push({
                    field: key,
                    oldValue: meta1[key],
                    newValue: meta2[key]
                });
            }
        });

        comparison.metadataChanges = metaChanges;

        res.json({
            success: true,
            data: comparison
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:documentId/versions/statistics - Get version statistics
 */
router.get('/:documentId/versions/statistics', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');

        const document = await Document.findOne({
            _id: documentId,
            ...req.firmQuery
        }).lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const versions = document.versions || [];

        if (versions.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalVersions: 0,
                    message: 'No versions available'
                }
            });
        }

        // Sort by date
        const sortedVersions = [...versions].sort((a, b) =>
            new Date(a.createdAt) - new Date(b.createdAt)
        );

        // Calculate statistics
        const totalSize = versions.reduce((sum, v) => sum + (v.size || 0), 0);
        const avgSize = versions.length > 0 ? Math.round(totalSize / versions.length) : 0;

        // Calculate version frequency
        const firstVersion = sortedVersions[0];
        const lastVersion = sortedVersions[sortedVersions.length - 1];
        const timeSpanDays = Math.max(1, Math.ceil(
            (new Date(lastVersion.createdAt) - new Date(firstVersion.createdAt)) / (1000 * 60 * 60 * 24)
        ));
        const versionsPerDay = Math.round((versions.length / timeSpanDays) * 100) / 100;

        // Group by creator
        const byCreator = {};
        versions.forEach(v => {
            const creator = v.createdBy?.toString() || 'unknown';
            byCreator[creator] = (byCreator[creator] || 0) + 1;
        });

        // Group by month
        const byMonth = {};
        versions.forEach(v => {
            const date = new Date(v.createdAt);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                totalVersions: versions.length,
                currentVersion: document.currentVersion || lastVersion.versionNumber,
                statistics: {
                    totalSize,
                    averageSize: avgSize,
                    largestVersion: Math.max(...versions.map(v => v.size || 0)),
                    smallestVersion: Math.min(...versions.map(v => v.size || 0))
                },
                frequency: {
                    versionsPerDay,
                    timeSpanDays,
                    firstVersionDate: firstVersion.createdAt,
                    lastVersionDate: lastVersion.createdAt
                },
                distribution: {
                    byCreator,
                    byMonth
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:documentId/versions/diff - Get version diff
 */
router.get('/:documentId/versions/diff', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const { v1, v2 } = req.query;

        if (!v1 || !v2) {
            throw CustomException('Both v1 and v2 version IDs are required', 400);
        }

        const version1Id = sanitizeObjectId(v1, 'v1');
        const version2Id = sanitizeObjectId(v2, 'v2');

        const document = await Document.findOne({
            _id: documentId,
            ...req.firmQuery
        }).lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const version1 = (document.versions || []).find(
            v => v._id?.toString() === version1Id.toString()
        );

        const version2 = (document.versions || []).find(
            v => v._id?.toString() === version2Id.toString()
        );

        if (!version1 || !version2) {
            throw CustomException('One or both versions not found', 404);
        }

        // Build diff summary (metadata-level since we don't store content in versions)
        const diff = {
            versionNumbers: {
                from: version1.versionNumber,
                to: version2.versionNumber
            },
            dates: {
                from: version1.createdAt,
                to: version2.createdAt
            },
            changes: []
        };

        // Check file name changes
        if ((version1.fileName || version1.name) !== (version2.fileName || version2.name)) {
            diff.changes.push({
                type: 'filename',
                from: version1.fileName || version1.name,
                to: version2.fileName || version2.name
            });
        }

        // Check size changes
        if (version1.size !== version2.size) {
            diff.changes.push({
                type: 'size',
                from: version1.size || 0,
                to: version2.size || 0,
                delta: (version2.size || 0) - (version1.size || 0)
            });
        }

        // Check comment/notes changes
        if (version1.comment !== version2.comment) {
            diff.changes.push({
                type: 'comment',
                from: version1.comment || '',
                to: version2.comment || ''
            });
        }

        res.json({
            success: true,
            data: diff
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /:documentId/versions/timeline - Get version timeline
 */
router.get('/:documentId/versions/timeline', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const { page, limit } = sanitizePagination(req.query);

        const document = await Document.findOne({
            _id: documentId,
            ...req.firmQuery
        }).lean();

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        // Sort versions by date descending
        let versions = [...(document.versions || [])].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        const total = versions.length;
        versions = versions.slice((page - 1) * limit, page * limit);

        // Build timeline entries
        const timeline = versions.map((v, index) => {
            const prevVersion = versions[index + 1];

            return {
                versionId: v._id,
                versionNumber: v.versionNumber,
                createdAt: v.createdAt,
                createdBy: v.createdBy,
                comment: v.comment,
                size: v.size,
                fileName: v.fileName || v.name,
                changes: prevVersion ? {
                    sizeDelta: (v.size || 0) - (prevVersion.size || 0),
                    timeSincePrevious: new Date(v.createdAt) - new Date(prevVersion.createdAt)
                } : null,
                isLatest: index === 0
            };
        });

        res.json({
            success: true,
            data: timeline,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /:documentId/versions/restore/:versionId - Restore specific version
 */
router.post('/:documentId/versions/restore/:versionId', async (req, res, next) => {
    try {
        const documentId = sanitizeObjectId(req.params.documentId, 'documentId');
        const versionId = sanitizeObjectId(req.params.versionId, 'versionId');
        const { createBackup = true } = req.body;

        const document = await Document.findOne({
            _id: documentId,
            ...req.firmQuery
        });

        if (!document) {
            throw CustomException('Document not found', 404);
        }

        const versionToRestore = (document.versions || []).find(
            v => v._id?.toString() === versionId.toString()
        );

        if (!versionToRestore) {
            throw CustomException('Version not found', 404);
        }

        // Create backup of current version if requested
        let backupVersion = null;
        if (createBackup) {
            const currentMaxVersion = Math.max(
                ...(document.versions || []).map(v => v.versionNumber || 0),
                document.currentVersion || 0
            );

            backupVersion = {
                _id: new mongoose.Types.ObjectId(),
                versionNumber: currentMaxVersion + 1,
                fileName: document.fileName || document.name,
                size: document.size,
                comment: 'Backup before restore',
                createdBy: req.userID,
                createdAt: new Date(),
                metadata: { ...document.metadata }
            };

            if (!document.versions) document.versions = [];
            document.versions.push(backupVersion);
        }

        // Restore from version
        document.fileName = versionToRestore.fileName || versionToRestore.name;
        document.size = versionToRestore.size;
        document.currentVersion = versionToRestore.versionNumber;
        document.restoredFrom = versionId;
        document.restoredAt = new Date();
        document.restoredBy = req.userID;

        await document.save();

        res.json({
            success: true,
            message: 'Version restored',
            data: {
                documentId,
                restoredVersion: versionToRestore.versionNumber,
                backupCreated: createBackup,
                backupVersionNumber: backupVersion?.versionNumber || null
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
