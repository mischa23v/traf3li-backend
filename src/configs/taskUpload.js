const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import S3 config - handle gracefully if not configured
let s3Client = null;
let BUCKETS = { tasks: 'traf3li-task-attachments' };
let PRESIGNED_URL_EXPIRY = 3600;
let multerS3 = null;
let getSignedUrl = null;
let GetObjectCommand = null;

try {
    const s3Config = require('./s3');
    s3Client = s3Config.s3Client;
    BUCKETS = s3Config.BUCKETS;
    PRESIGNED_URL_EXPIRY = s3Config.PRESIGNED_URL_EXPIRY;

    if (s3Client) {
        multerS3 = require('multer-s3');
        const presigner = require('@aws-sdk/s3-request-presigner');
        const s3Commands = require('@aws-sdk/client-s3');
        getSignedUrl = presigner.getSignedUrl;
        GetObjectCommand = s3Commands.GetObjectCommand;
    }
} catch (err) {
    console.log('S3 modules not available, using local storage only');
}

// Check if S3 is configured and available
// Supports multiple variable naming conventions
const isS3Configured = () => {
    return !!(
        s3Client &&
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        (process.env.S3_BUCKET_TASKS || process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_DOCUMENTS || process.env.S3_BUCKET_DOCUMENTS)
    );
};

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
    console.log('Created uploads/tasks directory');
}

let taskUpload;

// Server-side encryption configuration (matches s3.js)
const SSE_CONFIG = {
    enabled: process.env.S3_SSE_ENABLED !== 'false',
    algorithm: process.env.S3_SSE_ALGORITHM || 'AES256',
    kmsKeyId: process.env.S3_KMS_KEY_ID || null,
    bucketKeyEnabled: process.env.S3_BUCKET_KEY_ENABLED !== 'false'
};

if (isS3Configured() && multerS3) {
    // S3 Storage Configuration with server-side encryption
    const s3StorageConfig = {
        s3: s3Client,
        bucket: BUCKETS.tasks,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const key = generateS3Key(req, file);
            cb(null, key);
        },
        metadata: (req, file, cb) => {
            cb(null, {
                fieldName: file.fieldname,
                originalName: file.originalname,
                uploadedBy: req.userID || 'unknown'
            });
        }
    };

    // Apply server-side encryption if enabled
    if (SSE_CONFIG.enabled) {
        s3StorageConfig.serverSideEncryption = SSE_CONFIG.algorithm;

        // If using SSE-KMS with Bucket Key
        if (SSE_CONFIG.algorithm === 'aws:kms') {
            if (SSE_CONFIG.kmsKeyId) {
                s3StorageConfig.sseKmsKeyId = SSE_CONFIG.kmsKeyId;
            }
            // Note: multer-s3 doesn't directly support BucketKeyEnabled
            // but if Bucket Key is enabled at bucket level, it will be used automatically
        }
    }

    const s3Storage = multerS3(s3StorageConfig);

    taskUpload = multer({
        storage: s3Storage,
        limits: {
            fileSize: 50 * 1024 * 1024 // 50MB limit for S3
        },
        fileFilter
    });

    console.log('Task uploads configured with S3 storage');
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

    console.log('Task uploads configured with local storage');
}

/**
 * Get a presigned URL for downloading a file from S3
 * @param {string} fileKey - The S3 key for the file
 * @param {string} filename - Original filename for Content-Disposition
 * @param {string} versionId - Optional S3 version ID for versioned buckets
 * @returns {Promise<string>} - The presigned URL
 */
const getTaskFilePresignedUrl = async (fileKey, filename = null, versionId = null) => {
    if (!isS3Configured() || !getSignedUrl || !GetObjectCommand) {
        return null;
    }

    const commandOptions = {
        Bucket: BUCKETS.tasks,
        Key: fileKey
    };

    // Support S3 versioning
    if (versionId) {
        commandOptions.VersionId = versionId;
    }

    if (filename) {
        commandOptions.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(filename)}"`;
    }

    const command = new GetObjectCommand(commandOptions);
    const url = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    return url;
};

/**
 * Check if a URL is an S3 URL
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
const isS3Url = (url) => {
    if (!url) return false;
    return url.includes('.amazonaws.com') || url.includes('s3://') || url.startsWith('tasks/');
};

/**
 * Extract S3 key from URL or return the key if already a key
 * @param {string} urlOrKey - S3 URL or key
 * @returns {string} - The S3 key
 */
const extractS3Key = (urlOrKey) => {
    if (!urlOrKey) return null;

    // If it's already a key (starts with tasks/)
    if (urlOrKey.startsWith('tasks/')) {
        return urlOrKey;
    }

    // If it's an S3 URL, extract the key
    if (urlOrKey.includes('.amazonaws.com/')) {
        const parts = urlOrKey.split('.amazonaws.com/');
        return parts[1] ? decodeURIComponent(parts[1].split('?')[0]) : null;
    }

    return null;
};

module.exports = taskUpload;
module.exports.isS3Configured = isS3Configured;
module.exports.getTaskFilePresignedUrl = getTaskFilePresignedUrl;
module.exports.isS3Url = isS3Url;
module.exports.extractS3Key = extractS3Key;
module.exports.BUCKETS = BUCKETS;
