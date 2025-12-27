/**
 * Unified Storage Configuration (R2 + S3)
 *
 * This module provides a unified interface for cloud storage.
 * Priority: Cloudflare R2 (if configured) > AWS S3 (fallback)
 *
 * R2 is S3-compatible, so we use the same AWS SDK.
 */

const logger = require('../utils/logger');
const { sanitizeFilename } = require('../utils/sanitize');
const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectVersionsCommand,
    HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// ==================== STORAGE PROVIDER DETECTION ====================

// Check if R2 is configured (preferred)
const isR2Configured = () => {
    return !!(
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_ENDPOINT
    );
};

// Check if S3 is configured (fallback)
const isS3ConfiguredOnly = () => {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        (process.env.S3_BUCKET_TASKS || process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_DOCUMENTS || process.env.S3_BUCKET_DOCUMENTS)
    );
};

// Unified check - either R2 or S3 is configured
const isS3Configured = () => isR2Configured() || isS3ConfiguredOnly();

// Determine storage type
const storageType = isR2Configured() ? 'r2' : (isS3ConfiguredOnly() ? 's3' : 'none');

// ==================== CLIENT INITIALIZATION ====================

let s3Client = null;

if (isR2Configured()) {
    // Use Cloudflare R2
    s3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        }
    });
    logger.info('Storage client initialized with Cloudflare R2');
} else if (isS3ConfiguredOnly()) {
    // Fall back to AWS S3
    s3Client = new S3Client({
        region: process.env.AWS_REGION || 'me-south-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
    logger.info('Storage client initialized with AWS S3');
} else {
    logger.info('No cloud storage configured - using local storage for file uploads');
}

// ==================== BUCKET CONFIGURATION ====================

// Bucket names - R2 buckets take priority over S3 buckets
const BUCKETS = isR2Configured() ? {
    // R2 Buckets
    general: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',
    documents: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',
    judgments: process.env.R2_BUCKET_JUDGMENTS || 'traf3li-judgments',
    tasks: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',
    crm: process.env.R2_BUCKET_CRM || 'traf3li-crm',
    finance: process.env.R2_BUCKET_FINANCE || 'traf3li-finance',
    hr: process.env.R2_BUCKET_HR || 'traf3li-hr',
    // R2 Logging buckets
    documentsLogs: process.env.R2_BUCKET_DOCUMENTS_LOGS || null,
    tasksLogs: process.env.R2_BUCKET_DOCUMENTS_LOGS || null,
    crmLogs: process.env.R2_BUCKET_CRM_LOGS || null,
    financeLogs: process.env.R2_BUCKET_FINANCE_LOGS || null,
    hrLogs: process.env.R2_BUCKET_HR_LOGS || null,
    judgmentsLogs: process.env.R2_BUCKET_JUDGMENTS_LOGS || null
} : {
    // S3 Buckets (fallback)
    general: process.env.S3_BUCKET_DOCUMENTS || process.env.AWS_S3_BUCKET_DOCUMENTS || process.env.AWS_S3_BUCKET || 'traf3li-legal-documents',
    documents: process.env.S3_BUCKET_DOCUMENTS || process.env.AWS_S3_BUCKET_DOCUMENTS || 'traf3li-legal-documents',
    judgments: process.env.S3_BUCKET_JUDGMENTS || process.env.AWS_S3_JUDGMENTS_BUCKET || 'traf3li-case-judgments',
    tasks: process.env.S3_BUCKET_TASKS || process.env.AWS_S3_BUCKET || 'traf3li-task-attachments',
    crm: process.env.AWS_S3_BUCKET || 'traf3li-crm',
    finance: process.env.AWS_S3_BUCKET || 'traf3li-finance',
    hr: process.env.AWS_S3_BUCKET || 'traf3li-hr',
    // S3 Logging buckets
    documentsLogs: process.env.S3_BUCKET_DOCUMENTS_LOGS || process.env.AWS_S3_BUCKET_DOCUMENTS_LOGS || null,
    tasksLogs: process.env.S3_BUCKET_TASKS_LOGS || process.env.AWS_S3_BUCKET_TASKS_LOGS || null,
    crmLogs: null,
    financeLogs: null,
    hrLogs: null,
    judgmentsLogs: null
};

// Check if logging is enabled
const isLoggingEnabled = () => !!(BUCKETS.documentsLogs || BUCKETS.tasksLogs || BUCKETS.crmLogs);

// URL expiry time (in seconds)
const PRESIGNED_URL_EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY) || 3600;

// Server-side encryption configuration (S3 only - R2 handles encryption automatically)
const SSE_CONFIG = {
    enabled: storageType === 's3' && process.env.S3_SSE_ENABLED !== 'false',
    algorithm: process.env.S3_SSE_ALGORITHM || 'AES256',
    kmsKeyId: process.env.S3_KMS_KEY_ID || null,
    bucketKeyEnabled: process.env.S3_BUCKET_KEY_ENABLED !== 'false'
};

/**
 * Get encryption parameters for PutObject commands (S3 only)
 * @returns {Object} - Encryption parameters to spread into command options
 */
const getEncryptionParams = () => {
    // R2 handles encryption automatically
    if (storageType === 'r2' || !SSE_CONFIG.enabled) {
        return {};
    }

    const params = {
        ServerSideEncryption: SSE_CONFIG.algorithm
    };

    if (SSE_CONFIG.algorithm === 'aws:kms') {
        if (SSE_CONFIG.kmsKeyId) {
            params.SSEKMSKeyId = SSE_CONFIG.kmsKeyId;
        }
        params.BucketKeyEnabled = SSE_CONFIG.bucketKeyEnabled;
    }

    return params;
};

// ==================== FILE OPERATIONS ====================

/**
 * Generate a presigned URL for uploading a file
 * @param {string} fileKey - The storage key for the file
 * @param {string} contentType - The MIME type of the file
 * @param {string} bucket - The bucket name ('general', 'judgments', 'crm', 'finance', 'hr')
 * @returns {Promise<string>} - The presigned URL
 */
const getUploadPresignedUrl = async (fileKey, contentType, bucket = 'general') => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('Cloud storage is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType,
        ...getEncryptionParams()
    });

    const url = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    return url;
};

/**
 * Generate a presigned URL for downloading a file
 * @param {string} fileKey - The storage key for the file
 * @param {string} bucket - The bucket name
 * @param {string} filename - Original filename for Content-Disposition header
 * @param {string} versionId - Optional version ID for versioned buckets
 * @returns {Promise<string>} - The presigned URL
 */
const getDownloadPresignedUrl = async (fileKey, bucket = 'general', filename = null, versionId = null) => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('Cloud storage is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const commandOptions = {
        Bucket: bucketName,
        Key: fileKey
    };

    if (versionId) {
        commandOptions.VersionId = versionId;
    }

    if (filename) {
        // Sanitize filename to prevent header injection before encoding
        const safeFilename = sanitizeFilename(filename);
        commandOptions.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(safeFilename)}"`;
    }

    const command = new GetObjectCommand(commandOptions);

    const url = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    return url;
};

/**
 * List all versions of a file (for versioned buckets)
 * @param {string} fileKey - The storage key for the file
 * @param {string} bucket - The bucket name
 * @returns {Promise<Array>} - Array of version objects
 */
const listFileVersions = async (fileKey, bucket = 'general') => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('Cloud storage is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const command = new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: fileKey
    });

    const response = await s3Client.send(command);

    const versions = (response.Versions || [])
        .filter(v => v.Key === fileKey)
        .map(v => ({
            versionId: v.VersionId,
            lastModified: v.LastModified,
            size: v.Size,
            isLatest: v.IsLatest,
            etag: v.ETag
        }));

    return versions;
};

/**
 * Get file metadata including version info
 * @param {string} fileKey - The storage key for the file
 * @param {string} bucket - The bucket name
 * @param {string} versionId - Optional version ID
 * @returns {Promise<Object>} - File metadata
 */
const getFileMetadata = async (fileKey, bucket = 'general', versionId = null) => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('Cloud storage is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const commandOptions = {
        Bucket: bucketName,
        Key: fileKey
    };

    if (versionId) {
        commandOptions.VersionId = versionId;
    }

    const command = new HeadObjectCommand(commandOptions);
    const response = await s3Client.send(command);

    return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        versionId: response.VersionId,
        etag: response.ETag,
        metadata: response.Metadata
    };
};

/**
 * Get the logging bucket for a given source bucket
 * @param {string} bucket - Source bucket name
 * @returns {string|null} - Logging bucket name or null
 */
const getLogBucket = (bucket) => {
    const logBucketMap = {
        'crm': BUCKETS.crmLogs,
        'documents': BUCKETS.documentsLogs,
        'general': BUCKETS.documentsLogs,
        'finance': BUCKETS.financeLogs,
        'hr': BUCKETS.hrLogs,
        'judgments': BUCKETS.judgmentsLogs,
        'tasks': BUCKETS.tasksLogs
    };
    return logBucketMap[bucket] || BUCKETS.documentsLogs;
};

/**
 * Log file access to the logging bucket
 * @param {string} fileKey - The accessed file key
 * @param {string} bucket - The source bucket
 * @param {string} userId - The user who accessed the file
 * @param {string} action - The action performed ('download', 'upload', 'preview', 'delete')
 * @param {Object} metadata - Additional metadata to log
 */
const logFileAccess = async (fileKey, bucket, userId, action, metadata = {}) => {
    if (!isS3Configured() || !s3Client) {
        return;
    }

    const logBucket = getLogBucket(bucket);

    if (!logBucket) {
        return;
    }

    const timestamp = new Date();
    const logEntry = {
        timestamp: timestamp.toISOString(),
        requestTime: timestamp.getTime(),
        bucket: BUCKETS[bucket] || bucket,
        key: fileKey,
        operation: action.toUpperCase(),
        requesterId: userId,
        storageType,
        request: {
            action,
            userAgent: metadata.userAgent || 'traf3li-backend',
            remoteIp: metadata.remoteIp || null
        },
        response: {
            httpStatus: metadata.httpStatus || 200,
            bytesTransferred: metadata.bytesTransferred || 0
        },
        versionId: metadata.versionId || null,
        customMetadata: {
            firmId: metadata.firmId || null,
            caseId: metadata.caseId || null,
            documentId: metadata.documentId || null
        }
    };

    const datePrefix = [
        timestamp.getFullYear(),
        String(timestamp.getMonth() + 1).padStart(2, '0'),
        String(timestamp.getDate()).padStart(2, '0'),
        String(timestamp.getHours()).padStart(2, '0')
    ].join('/');

    const logKey = `logs/${datePrefix}/${timestamp.getTime()}-${userId}-${action}.json`;

    try {
        const command = new PutObjectCommand({
            Bucket: logBucket,
            Key: logKey,
            Body: JSON.stringify(logEntry, null, 2),
            ContentType: 'application/json',
            ...getEncryptionParams()
        });

        await s3Client.send(command);
    } catch (err) {
        logger.error('Failed to log file access:', err.message);
    }
};

/**
 * Delete a file from storage
 * @param {string} fileKey - The storage key for the file
 * @param {string} bucket - The bucket name
 * @returns {Promise<void>}
 */
const deleteFile = async (fileKey, bucket = 'general') => {
    if (!isS3Configured() || !s3Client) {
        logger.info('Storage not configured, skipping delete for:', fileKey);
        return;
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey
    });

    await s3Client.send(command);
};

/**
 * Generate a unique file key for storage
 * @param {string} caseId - The case ID
 * @param {string} category - Document category
 * @param {string} filename - Original filename
 * @returns {string} - The generated file key
 */
const generateFileKey = (caseId, category, filename) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    // Use sanitizeFilename for consistent and secure filename handling
    const sanitizedFilename = sanitizeFilename(filename);

    return `cases/${caseId}/${category}/${timestamp}-${randomString}-${sanitizedFilename}`;
};

// ==================== EXPORTS ====================

module.exports = {
    s3Client,
    BUCKETS,
    SSE_CONFIG,
    storageType,
    isS3Configured,
    isR2Configured,
    isLoggingEnabled,
    getUploadPresignedUrl,
    getDownloadPresignedUrl,
    getEncryptionParams,
    deleteFile,
    generateFileKey,
    listFileVersions,
    getFileMetadata,
    logFileAccess,
    getLogBucket,
    PRESIGNED_URL_EXPIRY
};
