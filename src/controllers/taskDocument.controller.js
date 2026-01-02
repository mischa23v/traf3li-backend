/**
 * Task Document Controller
 *
 * Handles document management within tasks (TipTap/rich-text documents).
 * Extracted from task.controller.js for maintainability.
 */

const { Task, User, TaskDocumentVersion } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { sanitizeRichText, hasDangerousContent } = require('../utils/sanitize');
const { getTaskFilePresignedUrl } = require('../configs/taskUpload');
const logger = require('../utils/logger');

// =============================================================================
// DOCUMENT MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Create a new text/rich-text document in a task
 * POST /api/tasks/:id/documents
 */
const createDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, content, contentJson, contentFormat = 'html' } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    if (!title) {
        throw CustomException('Document title is required', 400);
    }

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const user = await User.findOne({ _id: userId, firmId }).select('firstName lastName');

    // Handle different content formats (TipTap JSON or HTML)
    let sanitizedContent = '';
    let documentJson = null;

    if (contentFormat === 'tiptap-json' && contentJson) {
        // Store TipTap JSON directly (it's a structured format, not user HTML)
        documentJson = contentJson;
        // Also store HTML version for display/preview
        sanitizedContent = content ? sanitizeRichText(content) : '';
    } else {
        // HTML format - sanitize it
        sanitizedContent = sanitizeRichText(content || '');
        if (hasDangerousContent(content)) {
            throw CustomException('Invalid content detected', 400);
        }
    }

    // Calculate size based on content
    const contentSize = documentJson
        ? Buffer.byteLength(JSON.stringify(documentJson), 'utf8')
        : Buffer.byteLength(sanitizedContent, 'utf8');

    // Create document as an attachment with editable content
    const document = {
        fileName: title.endsWith('.html') ? title : `${title}.html`,
        fileUrl: null, // No file URL for in-app documents
        fileType: 'text/html',
        fileSize: contentSize,
        uploadedBy: userId,
        uploadedAt: new Date(),
        storageType: 'local',
        isEditable: true,
        documentContent: sanitizedContent,
        documentJson: documentJson,
        contentFormat: contentFormat,
        lastEditedBy: userId,
        lastEditedAt: new Date()
    };

    task.attachments.push(document);

    // Add history entry
    task.history.push({
        action: 'attachment_added',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `Created document: ${title}`,
        timestamp: new Date()
    });

    await task.save();

    const newDocument = task.attachments[task.attachments.length - 1];

    res.status(201).json({
        success: true,
        message: 'تم إنشاء المستند بنجاح',
        document: newDocument
    });
});

/**
 * Get all documents for a task
 * GET /api/tasks/:id/documents
 * Returns a list of all editable documents (TipTap documents) for a task
 */
const getDocuments = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query)
        .populate('createdBy', '_id')
        .populate('assignedTo', '_id')
        .populate('attachments.uploadedBy', 'firstName lastName')
        .populate('attachments.lastEditedBy', 'firstName lastName');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    // Filter to get only editable documents (TipTap documents)
    const documents = task.attachments
        .filter(attachment => attachment.isEditable === true)
        .map(doc => ({
            _id: doc._id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            contentFormat: doc.contentFormat || 'html',
            isEditable: doc.isEditable,
            uploadedBy: doc.uploadedBy,
            uploadedAt: doc.uploadedAt,
            lastEditedBy: doc.lastEditedBy,
            lastEditedAt: doc.lastEditedAt
        }));

    res.status(200).json({
        success: true,
        documents,
        count: documents.length
    });
});

/**
 * Update a text/rich-text document in a task
 * PATCH /api/tasks/:id/documents/:documentId
 * Supports both HTML and TipTap JSON formats
 * Automatically saves version history before updating
 */
const updateDocument = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;
    const { title, content, contentJson, contentFormat, changeNote } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query);
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    if (!document.isEditable) {
        throw CustomException('This document cannot be edited', 400);
    }

    const user = await User.findOne({ _id: userId, firmId }).select('firstName lastName');

    // Save current version to history before updating
    // Only save if there's actual content to preserve
    if (document.documentContent || document.documentJson) {
        try {
            await TaskDocumentVersion.createSnapshot(
                id,
                documentId,
                {
                    title: document.fileName,
                    documentContent: document.documentContent,
                    documentJson: document.documentJson,
                    contentFormat: document.contentFormat,
                    fileSize: document.fileSize
                },
                document.lastEditedBy || document.uploadedBy || userId,
                changeNote || 'Auto-saved before update'
            );
        } catch (err) {
            logger.error('Error saving document version', { error: err.message });
            // Continue with update even if version save fails
        }
    }

    // Handle different content formats
    if (contentFormat === 'tiptap-json' && contentJson !== undefined) {
        // Update TipTap JSON content
        document.documentJson = contentJson;
        document.contentFormat = 'tiptap-json';
        // Also update HTML version if provided
        if (content !== undefined) {
            document.documentContent = sanitizeRichText(content);
        }
        document.fileSize = Buffer.byteLength(JSON.stringify(contentJson), 'utf8');
    } else if (content !== undefined) {
        // HTML format - sanitize it
        if (hasDangerousContent(content)) {
            throw CustomException('Invalid content detected', 400);
        }
        document.documentContent = sanitizeRichText(content);
        document.contentFormat = 'html';
        document.fileSize = Buffer.byteLength(document.documentContent, 'utf8');
    }

    // Update title if provided
    if (title) {
        document.fileName = title.endsWith('.html') ? title : `${title}.html`;
    }

    document.lastEditedBy = userId;
    document.lastEditedAt = new Date();

    // Add history entry
    task.history.push({
        action: 'updated',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `Updated document: ${document.fileName}`,
        timestamp: new Date()
    });

    await task.save();

    // Get current version number
    const currentVersion = await TaskDocumentVersion.getLatestVersionNumber(id, documentId);

    res.status(200).json({
        success: true,
        message: 'تم تحديث المستند بنجاح',
        document,
        version: currentVersion + 1 // Current document is one ahead of saved versions
    });
});

/**
 * Get document content
 * GET /api/tasks/:id/documents/:documentId
 * Returns both HTML and TipTap JSON format for editable documents
 */
const getDocument = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query)
        .populate('attachments.uploadedBy', 'firstName lastName')
        .populate('attachments.lastEditedBy', 'firstName lastName');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    // If it's an editable document, return the content directly
    if (document.isEditable) {
        return res.status(200).json({
            success: true,
            document: {
                _id: document._id,
                fileName: document.fileName,
                fileType: document.fileType,
                fileSize: document.fileSize,
                content: document.documentContent || '',
                contentJson: document.documentJson || null,
                contentFormat: document.contentFormat || 'html',
                isEditable: document.isEditable,
                uploadedBy: document.uploadedBy,
                uploadedAt: document.uploadedAt,
                lastEditedBy: document.lastEditedBy,
                lastEditedAt: document.lastEditedAt
            }
        });
    }

    // For uploaded files, return the download URL
    let downloadUrl = document.fileUrl;
    if (document.storageType === 's3' && document.fileKey) {
        try {
            downloadUrl = await getTaskFilePresignedUrl(document.fileKey, document.fileName);
        } catch (err) {
            logger.error('Error generating presigned URL', { error: err.message });
        }
    }

    res.status(200).json({
        success: true,
        document: {
            _id: document._id,
            fileName: document.fileName,
            fileType: document.fileType,
            fileSize: document.fileSize,
            downloadUrl,
            isEditable: document.isEditable,
            isVoiceMemo: document.isVoiceMemo,
            duration: document.duration,
            transcription: document.transcription,
            uploadedBy: document.uploadedBy,
            uploadedAt: document.uploadedAt
        }
    });
});

/**
 * Get version history for a TipTap document
 * GET /api/tasks/:id/documents/:documentId/versions
 */
const getDocumentVersions = asyncHandler(async (req, res) => {
    const { id, documentId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query)
        .populate('createdBy', '_id')
        .populate('assignedTo', '_id');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    if (!document.isEditable) {
        throw CustomException('This document does not support versioning', 400);
    }

    // Get version history from database
    const versions = await TaskDocumentVersion.getVersionHistory(id, documentId);

    // Get current version number
    const latestVersionNum = versions.length > 0 ? versions[0].version : 0;

    // Add current document as the latest version (not yet saved to history)
    const currentVersion = {
        _id: 'current',
        version: latestVersionNum + 1,
        title: document.fileName,
        fileSize: document.fileSize,
        contentFormat: document.contentFormat,
        editedBy: document.lastEditedBy || document.uploadedBy,
        createdAt: document.lastEditedAt || document.uploadedAt,
        isCurrent: true
    };

    res.status(200).json({
        success: true,
        document: {
            _id: document._id,
            fileName: document.fileName,
            isEditable: document.isEditable
        },
        versions: [currentVersion, ...versions]
    });
});

/**
 * Get a specific version content
 * GET /api/tasks/:id/documents/:documentId/versions/:versionId
 */
const getDocumentVersion = asyncHandler(async (req, res) => {
    const { id, documentId, versionId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query)
        .populate('createdBy', '_id')
        .populate('assignedTo', '_id');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    // If requesting current version
    if (versionId === 'current') {
        return res.status(200).json({
            success: true,
            version: {
                _id: 'current',
                version: (await TaskDocumentVersion.getLatestVersionNumber(id, documentId)) + 1,
                title: document.fileName,
                documentContent: document.documentContent,
                documentJson: document.documentJson,
                contentFormat: document.contentFormat,
                fileSize: document.fileSize,
                editedBy: document.lastEditedBy || document.uploadedBy,
                createdAt: document.lastEditedAt || document.uploadedAt,
                isCurrent: true
            }
        });
    }

    // Get specific version
    const version = await TaskDocumentVersion.findOne({ _id: versionId, firmId })
        .populate('editedBy', 'firstName lastName fullName');

    if (!version || version.documentId.toString() !== documentId) {
        throw CustomException('Version not found', 404);
    }

    res.status(200).json({
        success: true,
        version
    });
});

/**
 * Restore a previous version of a TipTap document
 * POST /api/tasks/:id/documents/:documentId/versions/:versionId/restore
 */
const restoreDocumentVersion = asyncHandler(async (req, res) => {
    const { id, documentId, versionId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Build query with firmId to prevent IDOR
    const query = { _id: id };
    if (firmId) {
        query.firmId = firmId;
    } else {
        // Solo lawyer - only their own tasks
        query.$or = [
            { assignedTo: userId },
            { createdBy: userId }
        ];
    }

    const task = await Task.findOne(query)
        .populate('createdBy', '_id')
        .populate('assignedTo', '_id');

    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const document = task.attachments.id(documentId);
    if (!document) {
        throw CustomException('Document not found', 404);
    }

    if (!document.isEditable) {
        throw CustomException('This document does not support versioning', 400);
    }

    // Find the version to restore
    const versionToRestore = await TaskDocumentVersion.findOne({ _id: versionId, firmId });
    if (!versionToRestore || versionToRestore.documentId.toString() !== documentId) {
        throw CustomException('Version not found', 404);
    }

    const user = await User.findOne({ _id: userId, firmId }).select('firstName lastName');

    // Save current version to history before restoring
    if (document.documentContent || document.documentJson) {
        await TaskDocumentVersion.createSnapshot(
            id,
            documentId,
            {
                title: document.fileName,
                documentContent: document.documentContent,
                documentJson: document.documentJson,
                contentFormat: document.contentFormat,
                fileSize: document.fileSize
            },
            document.lastEditedBy || document.uploadedBy || userId,
            `Replaced by restore of v${versionToRestore.version}`
        );
    }

    // Restore the old version
    document.documentContent = versionToRestore.documentContent;
    document.documentJson = versionToRestore.documentJson;
    document.contentFormat = versionToRestore.contentFormat;
    document.fileSize = versionToRestore.fileSize;
    document.fileName = versionToRestore.title;
    document.lastEditedBy = userId;
    document.lastEditedAt = new Date();

    // Add history entry
    task.history.push({
        action: 'restored',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `Restored document "${document.fileName}" to version ${versionToRestore.version}`,
        timestamp: new Date()
    });

    await task.save();

    // Get new version number
    const currentVersion = await TaskDocumentVersion.getLatestVersionNumber(id, documentId);

    res.status(200).json({
        success: true,
        message: `تم استعادة النسخة ${versionToRestore.version} بنجاح`,
        document,
        restoredFromVersion: versionToRestore.version,
        currentVersion: currentVersion + 1
    });
});

module.exports = {
    createDocument,
    getDocuments,
    updateDocument,
    getDocument,
    getDocumentVersions,
    getDocumentVersion,
    restoreDocumentVersion
};
