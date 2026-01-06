/**
 * Task Upload Configuration
 * =============================================================================
 *
 * Handles file uploads for task attachments using Cloudflare R2.
 *
 * Features:
 * - Cloudflare R2 storage (S3-compatible)
 * - File type validation (documents, images, audio)
 * - File size limits (50MB for cloud, 10MB for local fallback)
 * - Presigned URLs for secure downloads
 * - Access logging integration
 *
 * IMPORTANT: AWS S3 is DEPRECATED. Only Cloudflare R2 is supported.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Import unified storage configuration
const storage = require('./storage');
const {
    r2Client,
    BUCKETS,
    PRESIGNED_URL_EXPIRY,
    isR2Configured,
    logFileAccess,
    sanitizeFilename
} = storage;

// AWS SDK for presigned URLs
let multerS3 = null;
let getSignedUrl = null;
let GetObjectCommand = null;

// Storage type
const storageType = isR2Configured() ? 'r2' : 'local';

// Initialize cloud storage dependencies if R2 is configured
if (isR2Configured() && r2Client) {
    try {
        multerS3 = require('multer-s3');
        const presigner = require('@aws-sdk/s3-request-presigner');
        const s3Commands = require('@aws-sdk/client-s3');
        getSignedUrl = presigner.getSignedUrl;
        GetObjectCommand = s3Commands.GetObjectCommand;
        logger.info('✅ Task uploads configured with Cloudflare R2');
    } catch (err) {
        logger.error('Failed to load R2 dependencies:', err.message);
    }
} else {
    logger.info('⚠️ Task uploads using local storage (R2 not configured)');
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Check if cloud storage is configured
 */
const isStorageConfigured = () => {
    return !!(isR2Configured() && r2Client && multerS3);
};

// Backwards compatibility alias
const isS3Configured = isStorageConfigured;

/**
 * Allowed MIME types for task attachments
 */
const allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/rtf',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Audio (for voice memos)
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a'
];

/**
 * File filter for multer
 */
const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مسموح. الملفات المسموحة: PDF, Word, Excel, PowerPoint, صور, ملفات مضغوطة, ملفات صوتية'));
    }
};

/**
 * Generate unique file key for R2 storage
 */
const generateStorageKey = (req, file) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = sanitizeFilename(file.originalname);
    const taskId = req.params.id || 'general';
    return `tasks/${taskId}/${timestamp}-${randomString}-${sanitizedFilename}`;
};

// =============================================================================
// STORAGE SETUP
// =============================================================================

// Ensure uploads directory exists for local fallback
const uploadDir = 'uploads/tasks';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info('Created uploads/tasks directory');
}

let taskUpload;

if (isStorageConfigured()) {
    // Cloudflare R2 Storage Configuration
    const r2StorageConfig = {
        s3: r2Client,
        bucket: BUCKETS.tasks || BUCKETS.documents,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const key = generateStorageKey(req, file);
            cb(null, key);
        },
        metadata: (req, file, cb) => {
            cb(null, {
                fieldName: file.fieldname,
                originalName: file.originalname,
                uploadedBy: req.userID || 'unknown',
                storageType: 'r2'
            });
        }
    };

    const cloudStorage = multerS3(r2StorageConfig);

    taskUpload = multer({
        storage: cloudStorage,
        limits: {
            fileSize: 50 * 1024 * 1024 // 50MB limit for cloud storage
        },
        fileFilter
    });
} else {
    // Local Storage Configuration (fallback)
    const localStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);
            cb(null, uniqueSuffix + ext);
        }
    });

    taskUpload = multer({
        storage: localStorage,
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB limit for local storage
        },
        fileFilter
    });
}

// =============================================================================
// PRESIGNED URL FUNCTIONS
// =============================================================================

/**
 * Get a presigned URL for downloading a task file from R2
 *
 * @param {string} fileKey - The storage key for the file
 * @param {string} filename - Original filename for Content-Disposition
 * @param {string} versionId - Optional version ID for versioned buckets
 * @param {string} disposition - 'inline' for preview, 'attachment' for download
 * @param {string} contentType - Optional content type for browser handling
 * @param {Object} logOptions - Optional logging options { userId, remoteIp, userAgent }
 * @returns {Promise<string|null>} - The presigned URL or null if not configured
 */
const getTaskFilePresignedUrl = async (fileKey, filename = null, versionId = null, disposition = 'attachment', contentType = null, logOptions = {}) => {
    if (!isStorageConfigured() || !getSignedUrl || !GetObjectCommand) {
        return null;
    }

    const commandOptions = {
        Bucket: BUCKETS.tasks || BUCKETS.documents,
        Key: fileKey
    };

    // Support versioning
    if (versionId) {
        commandOptions.VersionId = versionId;
    }

    // Set Content-Disposition for browser handling
    if (filename) {
        const dispositionType = disposition === 'inline' ? 'inline' : 'attachment';
        const safeFilename = sanitizeFilename(filename);
        commandOptions.ResponseContentDisposition = `${dispositionType}; filename="${encodeURIComponent(safeFilename)}"`;
    }

    // Set Content-Type for proper browser handling (especially for preview)
    if (contentType) {
        commandOptions.ResponseContentType = contentType;
    }

    const command = new GetObjectCommand(commandOptions);
    const url = await getSignedUrl(r2Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    // Log file access if logging function available and userId provided
    if (logFileAccess && logOptions.userId) {
        const action = disposition === 'inline' ? 'preview' : 'download';
        logFileAccess(fileKey, 'tasks', logOptions.userId, action, {
            remoteIp: logOptions.remoteIp,
            userAgent: logOptions.userAgent,
            versionId,
            fileName: filename
        }).catch(err => logger.error('Failed to log file access:', err.message));
    }

    return url;
};

// =============================================================================
// URL UTILITIES
// =============================================================================

/**
 * Check if a URL is a cloud storage URL (R2)
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
const isCloudStorageUrl = (url) => {
    if (!url) return false;
    return (
        url.includes('.r2.cloudflarestorage.com') ||
        url.includes('r2://') ||
        url.startsWith('tasks/') ||
        url.startsWith('cases/')
    );
};

// Backwards compatibility alias
const isS3Url = isCloudStorageUrl;

/**
 * Extract storage key from URL or return the key if already a key
 * @param {string} urlOrKey - Cloud storage URL or key
 * @returns {string|null} - The storage key
 */
const extractStorageKey = (urlOrKey) => {
    if (!urlOrKey) return null;

    // If it's already a key (starts with tasks/ or cases/)
    if (urlOrKey.startsWith('tasks/') || urlOrKey.startsWith('cases/')) {
        return urlOrKey;
    }

    // If it's an R2 URL, extract the key
    if (urlOrKey.includes('.r2.cloudflarestorage.com/')) {
        const parts = urlOrKey.split('.r2.cloudflarestorage.com/');
        return parts[1] ? decodeURIComponent(parts[1].split('?')[0]) : null;
    }

    return null;
};

// Backwards compatibility alias
const extractS3Key = extractStorageKey;

// =============================================================================
// MIDDLEWARE IMPORTS
// =============================================================================

// Import malware scan middleware for easy integration
const malwareScanMiddleware = require('../middlewares/malwareScan.middleware');

// Import file validation middleware for magic byte validation
const {
    validateFileMiddleware,
    validateDocumentMiddleware,
    createFileValidationMiddleware
} = require('../middlewares/fileValidation.middleware');

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = taskUpload;
module.exports.isS3Configured = isS3Configured;
module.exports.isStorageConfigured = isStorageConfigured;
module.exports.getTaskFilePresignedUrl = getTaskFilePresignedUrl;
module.exports.isS3Url = isS3Url;
module.exports.isCloudStorageUrl = isCloudStorageUrl;
module.exports.extractS3Key = extractS3Key;
module.exports.extractStorageKey = extractStorageKey;
module.exports.BUCKETS = BUCKETS;
module.exports.storageType = storageType;
module.exports.malwareScan = malwareScanMiddleware;

// Export file validation middleware for use in routes
module.exports.validateFile = validateFileMiddleware;
module.exports.validateDocument = validateDocumentMiddleware;
module.exports.createFileValidation = createFileValidationMiddleware;
