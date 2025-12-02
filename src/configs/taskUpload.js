const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');
const { s3Client, BUCKETS, PRESIGNED_URL_EXPIRY } = require('./s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

// Check if S3 is configured
const isS3Configured = () => {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        (process.env.S3_BUCKET_DOCUMENTS || process.env.S3_BUCKET_TASKS)
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

let taskUpload;

if (isS3Configured()) {
    // S3 Storage Configuration
    const s3Storage = multerS3({
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
    });

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
    const uploadDir = 'uploads/tasks';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
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
 * @returns {Promise<string>} - The presigned URL
 */
const getTaskFilePresignedUrl = async (fileKey, filename = null) => {
    if (!isS3Configured()) {
        return null;
    }

    const commandOptions = {
        Bucket: BUCKETS.tasks,
        Key: fileKey
    };

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
