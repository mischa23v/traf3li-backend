const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Import R2 config first (preferred), fall back to S3 if not available
let storageClient = null;
let BUCKETS = { tasks: 'traf3li-documents', documents: 'traf3li-documents' };
let PRESIGNED_URL_EXPIRY = 3600;
let multerS3 = null;
let getSignedUrl = null;
let GetObjectCommand = null;
let logFileAccess = null;
let storageType = 'local';

// Try R2 first (Cloudflare)
try {
    const r2Config = require('./r2');
    if (r2Config.isR2Configured() && r2Config.r2Client) {
        storageClient = r2Config.r2Client;
        BUCKETS = r2Config.BUCKETS;
        PRESIGNED_URL_EXPIRY = r2Config.PRESIGNED_URL_EXPIRY;
        logFileAccess = r2Config.logFileAccess;
        storageType = 'r2';

        multerS3 = require('multer-s3');
        const presigner = require('@aws-sdk/s3-request-presigner');
        const s3Commands = require('@aws-sdk/client-s3');
        getSignedUrl = presigner.getSignedUrl;
        GetObjectCommand = s3Commands.GetObjectCommand;
        logger.info('Using Cloudflare R2 for task uploads');
    }
} catch (err) {
    logger.info('R2 not available, trying S3...');
}

// Fall back to S3 if R2 not configured
if (!storageClient) {
    try {
        const s3Config = require('./s3');
        if (s3Config.isS3Configured && s3Config.isS3Configured() && s3Config.s3Client) {
            storageClient = s3Config.s3Client;
            BUCKETS = s3Config.BUCKETS;
            PRESIGNED_URL_EXPIRY = s3Config.PRESIGNED_URL_EXPIRY;
            logFileAccess = s3Config.logFileAccess;
            storageType = 's3';

            multerS3 = require('multer-s3');
            const presigner = require('@aws-sdk/s3-request-presigner');
            const s3Commands = require('@aws-sdk/client-s3');
            getSignedUrl = presigner.getSignedUrl;
            GetObjectCommand = s3Commands.GetObjectCommand;
            logger.info('Using AWS S3 for task uploads');
        }
    } catch (err) {
        logger.info('S3 modules not available, using local storage only');
    }
}

// Check if cloud storage is configured and available
const isStorageConfigured = () => {
    return !!(storageClient && storageType !== 'local');
};

// Backward compatibility alias
const isS3Configured = isStorageConfigured;

// Allowed file types for task attachments
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
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    // Audio (for voice memos)
    'audio/webm',
    'audio/mp3',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a'
];

// File filter
const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مسموح. الملفات المسموحة: PDF, Word, Excel, PowerPoint, صور, ملفات مضغوطة, ملفات صوتية'));
    }
};

// Generate unique file key for S3
const generateS3Key = (req, file) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const taskId = req.params.id || 'general';
    return `tasks/${taskId}/${timestamp}-${randomString}-${sanitizedFilename}`;
};

// Ensure uploads directory exists
const uploadDir = 'uploads/tasks';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info('Created uploads/tasks directory');
}

let taskUpload;

// Server-side encryption configuration (for S3 only, R2 handles encryption automatically)
const SSE_CONFIG = {
    enabled: storageType === 's3' && process.env.S3_SSE_ENABLED !== 'false',
    algorithm: process.env.S3_SSE_ALGORITHM || 'AES256',
    kmsKeyId: process.env.S3_KMS_KEY_ID || null,
    bucketKeyEnabled: process.env.S3_BUCKET_KEY_ENABLED !== 'false'
};

if (isStorageConfigured() && multerS3) {
    // Cloud Storage Configuration (R2 or S3)
    const cloudStorageConfig = {
        s3: storageClient,
        bucket: BUCKETS.tasks || BUCKETS.documents,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const key = generateS3Key(req, file);
            cb(null, key);
        },
        metadata: (req, file, cb) => {
            cb(null, {
                fieldName: file.fieldname,
                originalName: file.originalname,
                uploadedBy: req.userID || 'unknown',
                storageType: storageType
            });
        }
    };

    // Apply server-side encryption if enabled (S3 only)
    if (SSE_CONFIG.enabled && storageType === 's3') {
        cloudStorageConfig.serverSideEncryption = SSE_CONFIG.algorithm;

        // If using SSE-KMS with Bucket Key
        if (SSE_CONFIG.algorithm === 'aws:kms') {
            if (SSE_CONFIG.kmsKeyId) {
                cloudStorageConfig.sseKmsKeyId = SSE_CONFIG.kmsKeyId;
            }
        }
    }

    const cloudStorage = multerS3(cloudStorageConfig);

    taskUpload = multer({
        storage: cloudStorage,
        limits: {
            fileSize: 50 * 1024 * 1024 // 50MB limit for cloud storage
        },
        fileFilter
    });

    logger.info(`Task uploads configured with ${storageType.toUpperCase()} storage`);
} else {
    // Local Storage Configuration (fallback)
    const localStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            // Ensure directory exists before each upload
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
            fileSize: 10 * 1024 * 1024 // 10MB limit for local
        },
        fileFilter
    });

    logger.info('Task uploads configured with local storage');
}

/**
 * Get a presigned URL for downloading a file from cloud storage (R2 or S3)
 * @param {string} fileKey - The storage key for the file
 * @param {string} filename - Original filename for Content-Disposition
 * @param {string} versionId - Optional version ID for versioned buckets
 * @param {string} disposition - 'inline' for preview, 'attachment' for download (default)
 * @param {string} contentType - Optional content type for proper browser handling
 * @param {Object} logOptions - Optional logging options { userId, remoteIp, userAgent }
 * @returns {Promise<string>} - The presigned URL
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

    // Set Content-Disposition based on disposition parameter
    // 'inline' - opens in browser (for preview)
    // 'attachment' - triggers download dialog
    if (filename) {
        const dispositionType = disposition === 'inline' ? 'inline' : 'attachment';
        commandOptions.ResponseContentDisposition = `${dispositionType}; filename="${encodeURIComponent(filename)}"`;
    }

    // Set Content-Type for proper browser handling (especially for preview)
    if (contentType) {
        commandOptions.ResponseContentType = contentType;
    }

    const command = new GetObjectCommand(commandOptions);
    const url = await getSignedUrl(storageClient, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    // Log file access if logging function available and userId provided
    if (logFileAccess && logOptions.userId) {
        const action = disposition === 'inline' ? 'preview' : 'download';
        logFileAccess(fileKey, 'tasks', logOptions.userId, action, {
            remoteIp: logOptions.remoteIp,
            userAgent: logOptions.userAgent,
            versionId
        }).catch(err => logger.error('Failed to log file access:', err.message));
    }

    return url;
};

/**
 * Check if a URL is a cloud storage URL (R2 or S3)
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
const isCloudStorageUrl = (url) => {
    if (!url) return false;
    return (
        url.includes('.amazonaws.com') ||
        url.includes('s3://') ||
        url.includes('.r2.cloudflarestorage.com') ||
        url.includes('r2://') ||
        url.startsWith('tasks/') ||
        url.startsWith('cases/')
    );
};

// Backward compatibility alias
const isS3Url = isCloudStorageUrl;

/**
 * Extract storage key from URL or return the key if already a key
 * @param {string} urlOrKey - Cloud storage URL or key
 * @returns {string} - The storage key
 */
const extractStorageKey = (urlOrKey) => {
    if (!urlOrKey) return null;

    // If it's already a key (starts with tasks/ or cases/)
    if (urlOrKey.startsWith('tasks/') || urlOrKey.startsWith('cases/')) {
        return urlOrKey;
    }

    // If it's an S3 URL, extract the key
    if (urlOrKey.includes('.amazonaws.com/')) {
        const parts = urlOrKey.split('.amazonaws.com/');
        return parts[1] ? decodeURIComponent(parts[1].split('?')[0]) : null;
    }

    // If it's an R2 URL, extract the key
    if (urlOrKey.includes('.r2.cloudflarestorage.com/')) {
        const parts = urlOrKey.split('.r2.cloudflarestorage.com/');
        return parts[1] ? decodeURIComponent(parts[1].split('?')[0]) : null;
    }

    return null;
};

// Backward compatibility alias
const extractS3Key = extractStorageKey;

// Import malware scan middleware for easy integration
const malwareScanMiddleware = require('../middlewares/malwareScan.middleware');

// Import file validation middleware for magic byte validation
const {
    validateFileMiddleware,
    validateDocumentMiddleware,
    createFileValidationMiddleware
} = require('../middlewares/fileValidation.middleware');

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
module.exports.malwareScan = malwareScanMiddleware; // Export malware scan middleware

// Export file validation middleware for use in routes
module.exports.validateFile = validateFileMiddleware;
module.exports.validateDocument = validateDocumentMiddleware;
module.exports.createFileValidation = createFileValidationMiddleware;
