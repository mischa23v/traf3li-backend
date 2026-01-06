/**
 * Task Attachment Controller
 * Extracted from task.controller.js for maintainability
 * Handles file attachment operations (S3 and local storage)
 */

const { Task, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { deleteFile, listFileVersions, logFileAccess } = require('../configs/storage');
const { isS3Configured, getTaskFilePresignedUrl } = require('../configs/taskUpload');
const { sanitizeObjectId } = require('../utils/securityUtils');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// =============================================================================
// ATTACHMENT FUNCTIONS
// =============================================================================

/**
 * Add attachment to task
 * POST /api/tasks/:id/attachments
 * Supports both local storage and S3 uploads
 */
const addAttachment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!req.file) {
        throw CustomException('No file uploaded', 400);
    }

    // Get user name for history (user lookup by ID is safe)
    const user = await User.findById(userId).select('firstName lastName');

    let attachment;

    if (isS3Configured() && req.file.location) {
        // S3 upload - multer-s3 provides location (full URL) and key
        attachment = {
            fileName: req.file.originalname,
            fileUrl: req.file.location, // Full S3 URL
            fileKey: req.file.key, // S3 key for deletion
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            storageType: 's3'
        };
    } else {
        // Local storage upload
        attachment = {
            fileName: req.file.originalname,
            fileUrl: `/uploads/tasks/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            storageType: 'local'
        };
    }

    task.attachments.push(attachment);

    // Add history entry
    task.history.push({
        action: 'attachment_added',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: req.file.originalname,
        timestamp: new Date()
    });

    await task.save();

    const newAttachment = task.attachments[task.attachments.length - 1];

    // If S3, generate a presigned URL for immediate access
    let downloadUrl = newAttachment.fileUrl;
    if (newAttachment.storageType === 's3' && newAttachment.fileKey) {
        try {
            downloadUrl = await getTaskFilePresignedUrl(newAttachment.fileKey, newAttachment.fileName);
        } catch (err) {
            logger.error('Error generating presigned URL', { error: err.message });
        }
    }

    res.status(201).json({
        success: true,
        message: 'تم رفع المرفق بنجاح',
        attachment: {
            ...newAttachment.toObject(),
            downloadUrl
        }
    });
});

/**
 * Delete attachment from task
 * DELETE /api/tasks/:id/attachments/:attachmentId
 * Supports both local storage and S3 deletion
 */
const deleteAttachment = asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;
    const userId = req.userID;

    // IDOR protection
    const taskId = sanitizeObjectId(id);
    const sanitizedAttachmentId = sanitizeObjectId(attachmentId);

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: taskId, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const attachment = task.attachments.id(sanitizedAttachmentId);
    if (!attachment) {
        throw CustomException('Attachment not found', 404);
    }

    // Only uploader or task creator can delete
    if (attachment.uploadedBy.toString() !== userId && task.createdBy.toString() !== userId) {
        throw CustomException('You do not have permission to delete this attachment', 403);
    }

    const fileName = attachment.fileName;
    const fileUrl = attachment.fileUrl;
    const fileKey = attachment.fileKey;
    const storageType = attachment.storageType;

    // Delete the actual file from storage
    try {
        if (storageType === 's3' && fileKey) {
            // Delete from S3
            await deleteFile(fileKey, 'tasks');
        } else if (storageType === 'local' || !storageType) {
            // Delete from local storage
            const localPath = path.join(process.cwd(), fileUrl);
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
            }
        }
    } catch (err) {
        logger.error('Error deleting file from storage', { error: err.message });
        // Continue with database removal even if file deletion fails
    }

    task.attachments.pull(sanitizedAttachmentId);

    // Get user name for history (user lookup by ID is safe)
    const user = await User.findById(userId).select('firstName lastName');

    // Add history entry
    task.history.push({
        action: 'attachment_removed',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: fileName,
        timestamp: new Date()
    });

    await task.save();

    res.status(200).json({
        success: true,
        message: 'تم حذف المرفق'
    });
});

/**
 * Get presigned download URL for attachment
 * GET /api/tasks/:id/attachments/:attachmentId/download-url
 * Supports versioning and content-disposition (inline for preview, attachment for download)
 * Verifies user has access to the task/attachment before generating URL
 */
const getAttachmentDownloadUrl = asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;
    const { versionId, disposition = 'attachment' } = req.query;
    const userId = req.userID;

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: id, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
        throw CustomException('Attachment not found', 404);
    }

    let downloadUrl = attachment.fileUrl;
    let currentVersionId = null;

    // If S3 storage, generate a fresh presigned URL
    if (attachment.storageType === 's3' && attachment.fileKey) {
        try {
            // Support versioning and disposition (inline for preview, attachment for download)
            downloadUrl = await getTaskFilePresignedUrl(
                attachment.fileKey,
                attachment.fileName,
                versionId || null,
                disposition, // 'inline' or 'attachment'
                attachment.fileType // Content-Type for proper browser handling
            );
            if (!downloadUrl) {
                throw new Error('Failed to generate presigned URL - S3 may not be configured');
            }
            currentVersionId = versionId || null;

            // Log file access asynchronously (don't wait for it)
            const action = disposition === 'inline' ? 'preview' : 'download';
            logFileAccess(attachment.fileKey, 'tasks', userId, action, {
                taskId: id,
                attachmentId,
                fileName: attachment.fileName,
                versionId: versionId || 'latest'
            }).catch(err => logger.error('Failed to log access', { error: err.message }));

        } catch (err) {
            logger.error('Error generating presigned URL', { error: err.message });
            throw CustomException('Error generating download URL', 500);
        }
    }

    // Return downloadUrl at top level for frontend compatibility
    res.status(200).json({
        success: true,
        downloadUrl,
        versionId: currentVersionId,
        disposition,
        attachment: {
            _id: attachment._id,
            fileName: attachment.fileName,
            fileType: attachment.fileType,
            fileSize: attachment.fileSize
        }
    });
});

/**
 * Get all versions of an attachment (for versioned S3 buckets)
 * GET /api/tasks/:id/attachments/:attachmentId/versions
 * Returns list of all versions with metadata
 */
const getAttachmentVersions = asyncHandler(async (req, res) => {
    const { id, attachmentId } = req.params;

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: id, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
        throw CustomException('Attachment not found', 404);
    }

    // Only S3 storage supports versioning
    if (attachment.storageType !== 's3' || !attachment.fileKey) {
        return res.status(200).json({
            success: true,
            versions: [],
            message: 'Versioning not available for local storage'
        });
    }

    try {
        const versions = await listFileVersions(attachment.fileKey, 'tasks');

        res.status(200).json({
            success: true,
            attachment: {
                _id: attachment._id,
                fileName: attachment.fileName,
                fileKey: attachment.fileKey
            },
            versions
        });
    } catch (err) {
        logger.error('Error listing versions', { error: err.message });
        // If versioning is not enabled, return empty array
        if (err.name === 'NoSuchBucket' || err.Code === 'NoSuchBucket') {
            throw CustomException('Bucket not found', 404);
        }
        res.status(200).json({
            success: true,
            versions: [],
            message: 'Versioning may not be enabled on this bucket'
        });
    }
});

// =============================================================================
// MODULE EXPORTS
// =============================================================================

module.exports = {
    addAttachment,
    deleteAttachment,
    getAttachmentDownloadUrl,
    getAttachmentVersions
};
