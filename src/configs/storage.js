/**
 * Cloudflare R2 Storage Configuration
 * =============================================================================
 *
 * ENTERPRISE-GRADE STORAGE FOR LEGAL DOCUMENTS
 *
 * This module provides secure, compliant storage for confidential legal documents
 * using Cloudflare R2 (S3-compatible with zero egress fees).
 *
 * Security Standards Implemented:
 * - AWS/Google/Microsoft: Presigned URLs with short expiry
 * - Apple/Salesforce: Automatic encryption at rest
 * - SAP/Oracle: Comprehensive audit logging (CloudTrail pattern)
 * - OWASP: Input validation, secure headers
 * - ISO 27001: Access logging, data classification
 *
 * IMPORTANT: AWS S3 is DEPRECATED. Only Cloudflare R2 is supported.
 *
 * Features:
 * - Multiple bucket support (documents, judgments, crm, finance, hr)
 * - Dedicated logging buckets for access tracking
 * - Presigned URLs for secure file operations
 * - File versioning support
 * - Batch access logging
 * - Audit trail queries
 */

const logger = require('../utils/logger');
const crypto = require('crypto');

// AWS SDK v3 (works with R2 since it's S3-compatible)
const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectVersionsCommand,
    ListObjectsV2Command,
    HeadObjectCommand,
    CopyObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// =============================================================================
// CLOUDFLARE R2 CONFIGURATION
// =============================================================================

/**
 * Check if Cloudflare R2 is configured
 * @returns {boolean}
 */
const isR2Configured = () => {
    return !!(
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_ENDPOINT
    );
};

// Alias for backwards compatibility
const isS3Configured = isR2Configured;

// Storage type is always R2
const storageType = 'r2';

// =============================================================================
// R2 CLIENT INITIALIZATION
// =============================================================================

let r2Client = null;

if (isR2Configured()) {
    r2Client = new S3Client({
        region: 'auto', // R2 uses 'auto' region
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        },
        // R2 specific configuration
        forcePathStyle: true, // Required for R2
        maxAttempts: 3, // Retry configuration
    });
    logger.info('✅ Cloudflare R2 storage client initialized');
} else {
    logger.warn('⚠️ Cloudflare R2 not configured - Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT');
}

// Alias for backwards compatibility
const s3Client = r2Client;

// =============================================================================
// BUCKET CONFIGURATION
// =============================================================================

/**
 * R2 Bucket names - separate buckets for data classification (ISO 27001)
 */
const BUCKETS = {
    // Main storage buckets
    documents: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',
    judgments: process.env.R2_BUCKET_JUDGMENTS || 'traf3li-judgments',
    crm: process.env.R2_BUCKET_CRM || 'traf3li-crm',
    finance: process.env.R2_BUCKET_FINANCE || 'traf3li-finance',
    hr: process.env.R2_BUCKET_HR || 'traf3li-hr',
    // Aliases for backwards compatibility
    tasks: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',
    general: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',

    // Logging buckets (Gold Standard - AWS CloudTrail pattern)
    documentsLogs: process.env.R2_BUCKET_DOCUMENTS_LOGS || null,
    judgmentsLogs: process.env.R2_BUCKET_JUDGMENTS_LOGS || null,
    crmLogs: process.env.R2_BUCKET_CRM_LOGS || null,
    financeLogs: process.env.R2_BUCKET_FINANCE_LOGS || null,
    hrLogs: process.env.R2_BUCKET_HR_LOGS || null,
    tasksLogs: process.env.R2_BUCKET_DOCUMENTS_LOGS || null
};

/**
 * Check if logging is enabled (any logging bucket configured)
 * @returns {boolean}
 */
const isLoggingEnabled = () => !!(
    BUCKETS.documentsLogs ||
    BUCKETS.judgmentsLogs ||
    BUCKETS.crmLogs ||
    BUCKETS.financeLogs ||
    BUCKETS.hrLogs
);

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * Presigned URL expiry times (in seconds)
 * Short expiry is critical for legal documents security
 */
const PRESIGNED_URL_EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY) || 900; // 15 minutes default (security)
const PRESIGNED_URL_UPLOAD_EXPIRY = parseInt(process.env.PRESIGNED_URL_UPLOAD_EXPIRY) || 1800; // 30 min for uploads

/**
 * Maximum file sizes by category (in bytes)
 */
const MAX_FILE_SIZES = {
    documents: 100 * 1024 * 1024, // 100 MB
    judgments: 100 * 1024 * 1024, // 100 MB
    images: 10 * 1024 * 1024,     // 10 MB
    audio: 50 * 1024 * 1024       // 50 MB
};

/**
 * Allowed MIME types for legal documents
 */
const ALLOWED_MIME_TYPES = {
    documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/rtf'
    ],
    images: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/tiff'
    ],
    audio: [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/webm',
        'audio/ogg',
        'audio/mp4',
        'audio/x-m4a'
    ],
    archives: [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed'
    ]
};

// R2 handles encryption automatically - no SSE config needed
const SSE_CONFIG = {
    enabled: false,
    algorithm: null,
    kmsKeyId: null,
    bucketKeyEnabled: false
};

/**
 * Get encryption parameters (R2 handles encryption automatically)
 * @returns {Object} - Empty object for R2
 */
const getEncryptionParams = () => ({});

// =============================================================================
// FILE KEY GENERATION
// =============================================================================

/**
 * Sanitize filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (filename) => {
    if (!filename) return 'unnamed';
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 200); // Max length
};

/**
 * Generate a unique, secure file key for storage
 * Format: {bucket}/{firmId}/{category}/{timestamp}-{hash}-{filename}
 *
 * @param {string} firmId - Firm ID for tenant isolation
 * @param {string} category - Document category
 * @param {string} filename - Original filename
 * @param {Object} options - Additional options
 * @returns {string} - The generated file key
 */
const generateFileKey = (firmId, category, filename, options = {}) => {
    const timestamp = Date.now();
    // Use crypto for secure random string
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const sanitizedFilename = sanitizeFilename(filename);

    // Include firm ID for tenant isolation
    const firmPrefix = firmId || 'general';
    const categoryPath = category || 'uncategorized';

    // Optional: include case ID or document ID for better organization
    const { caseId, documentId } = options;
    let path = `${firmPrefix}/${categoryPath}`;
    if (caseId) path = `${firmPrefix}/cases/${caseId}/${categoryPath}`;

    return `${path}/${timestamp}-${randomBytes}-${sanitizedFilename}`;
};

/**
 * Legacy generateFileKey for backwards compatibility
 */
const generateFileKeyLegacy = (caseId, category, filename) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = sanitizeFilename(filename);
    return `cases/${caseId}/${category}/${timestamp}-${randomString}-${sanitizedFilename}`;
};

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Generate a presigned URL for uploading a file
 *
 * @param {string} fileKey - The storage key for the file
 * @param {string} contentType - The MIME type of the file
 * @param {string} bucket - The bucket name ('documents', 'judgments', 'crm', 'finance', 'hr')
 * @param {Object} options - Additional options (contentLength, metadata)
 * @returns {Promise<string>} - The presigned URL
 */
const getUploadPresignedUrl = async (fileKey, contentType, bucket = 'documents', options = {}) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('Cloudflare R2 is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const commandOptions = {
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType
    };

    // Optional: Set content length for size validation
    if (options.contentLength) {
        commandOptions.ContentLength = options.contentLength;
    }

    // Optional: Set custom metadata
    if (options.metadata) {
        commandOptions.Metadata = options.metadata;
    }

    const command = new PutObjectCommand(commandOptions);

    const url = await getSignedUrl(r2Client, command, {
        expiresIn: PRESIGNED_URL_UPLOAD_EXPIRY
    });

    return url;
};

/**
 * Generate a presigned URL for downloading a file
 *
 * @param {string} fileKey - The storage key for the file
 * @param {string} bucket - The bucket name
 * @param {string} filename - Original filename for Content-Disposition header
 * @param {string} versionId - Optional version ID for versioned buckets
 * @param {string} disposition - 'inline' for preview, 'attachment' for download
 * @param {string} contentType - Optional content type override
 * @returns {Promise<string>} - The presigned URL
 */
const getDownloadPresignedUrl = async (fileKey, bucket = 'documents', filename = null, versionId = null, disposition = 'attachment', contentType = null) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('Cloudflare R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const commandOptions = {
        Bucket: bucketName,
        Key: fileKey
    };

    // Support versioning
    if (versionId) {
        commandOptions.VersionId = versionId;
    }

    // Set Content-Disposition for proper browser handling
    if (filename) {
        const safeFilename = sanitizeFilename(filename);
        const dispositionType = disposition === 'inline' ? 'inline' : 'attachment';
        commandOptions.ResponseContentDisposition = `${dispositionType}; filename="${encodeURIComponent(safeFilename)}"`;
    }

    // Override content type if provided (for preview)
    if (contentType) {
        commandOptions.ResponseContentType = contentType;
    }

    const command = new GetObjectCommand(commandOptions);

    const url = await getSignedUrl(r2Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    return url;
};

/**
 * Upload a file directly to R2 (for server-side uploads)
 *
 * @param {string} fileKey - The storage key for the file
 * @param {Buffer|string|Stream} content - File content
 * @param {string} contentType - MIME type
 * @param {string} bucket - Bucket name
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<Object>} - Upload result with ETag
 */
const uploadFile = async (fileKey, content, contentType, bucket = 'documents', metadata = {}) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('Cloudflare R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: content,
        ContentType: contentType,
        Metadata: metadata
    });

    const result = await r2Client.send(command);

    return {
        key: fileKey,
        bucket: bucketName,
        etag: result.ETag,
        versionId: result.VersionId
    };
};

/**
 * Delete a file from R2
 *
 * @param {string} fileKey - The storage key for the file
 * @param {string} bucket - The bucket name
 * @returns {Promise<void>}
 */
const deleteFile = async (fileKey, bucket = 'documents') => {
    if (!isR2Configured() || !r2Client) {
        logger.info('R2 not configured, skipping delete for:', fileKey);
        return;
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey
    });

    await r2Client.send(command);
};

// Alias for backwards compatibility
const deleteObject = deleteFile;

/**
 * Copy a file within R2 (for versioning/backup)
 *
 * @param {string} sourceKey - Source file key
 * @param {string} destKey - Destination file key
 * @param {string} bucket - Bucket name
 * @returns {Promise<Object>} - Copy result
 */
const copyFile = async (sourceKey, destKey, bucket = 'documents') => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('Cloudflare R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const command = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${sourceKey}`,
        Key: destKey
    });

    const result = await r2Client.send(command);

    return {
        key: destKey,
        etag: result.CopyObjectResult?.ETag,
        versionId: result.VersionId
    };
};

/**
 * List all versions of a file (for versioned buckets)
 *
 * @param {string} fileKey - The storage key for the file
 * @param {string} bucket - The bucket name
 * @returns {Promise<Array>} - Array of version objects
 */
const listFileVersions = async (fileKey, bucket = 'documents') => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('Cloudflare R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const command = new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: fileKey
    });

    const response = await r2Client.send(command);

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
 *
 * @param {string} fileKey - The storage key for the file
 * @param {string} bucket - The bucket name
 * @param {string} versionId - Optional version ID
 * @returns {Promise<Object>} - File metadata
 */
const getFileMetadata = async (fileKey, bucket = 'documents', versionId = null) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('Cloudflare R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const commandOptions = {
        Bucket: bucketName,
        Key: fileKey
    };

    if (versionId) {
        commandOptions.VersionId = versionId;
    }

    const command = new HeadObjectCommand(commandOptions);
    const response = await r2Client.send(command);

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
 * Check if a file exists
 *
 * @param {string} fileKey - The storage key
 * @param {string} bucket - The bucket name
 * @returns {Promise<boolean>} - True if exists
 */
const fileExists = async (fileKey, bucket = 'documents') => {
    try {
        await getFileMetadata(fileKey, bucket);
        return true;
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            return false;
        }
        throw err;
    }
};

/**
 * Get R2 public URL for a file (if bucket has public access enabled)
 *
 * @param {string} fileKey - The file key
 * @param {string} bucket - The bucket name
 * @returns {string} - The public URL
 */
const getPublicUrl = (fileKey, bucket = 'documents') => {
    // Use custom public domain if configured
    if (process.env.R2_PUBLIC_DOMAIN) {
        return `https://${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`;
    }

    // Default R2 public URL format
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    if (accountId) {
        return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileKey}`;
    }

    // Fallback - return just the key (must be converted to presigned URL)
    return fileKey;
};

// =============================================================================
// LOGGING FUNCTIONS (Gold Standard - AWS CloudTrail Pattern)
// =============================================================================

/**
 * Get the logging bucket for a given source bucket
 * @param {string} bucket - Source bucket name
 * @returns {string|null} - Logging bucket name or null
 */
const getLogBucket = (bucket) => {
    const logBucketMap = {
        'documents': BUCKETS.documentsLogs,
        'judgments': BUCKETS.judgmentsLogs,
        'crm': BUCKETS.crmLogs,
        'finance': BUCKETS.financeLogs,
        'hr': BUCKETS.hrLogs,
        'tasks': BUCKETS.tasksLogs,
        'general': BUCKETS.documentsLogs
    };
    return logBucketMap[bucket] || BUCKETS.documentsLogs;
};

/**
 * Log file access to the logging bucket
 * Pattern: AWS CloudTrail / S3 Server Access Logging
 *
 * @param {string} fileKey - The accessed file key
 * @param {string} bucket - The source bucket
 * @param {string} userId - The user who accessed the file
 * @param {string} action - The action performed ('download', 'upload', 'preview', 'delete', 'list')
 * @param {Object} metadata - Additional metadata to log
 */
const logFileAccess = async (fileKey, bucket, userId, action, metadata = {}) => {
    if (!isR2Configured() || !r2Client) {
        return;
    }

    const logBucket = getLogBucket(bucket);

    if (!logBucket) {
        return; // Logging not configured for this bucket
    }

    const timestamp = new Date();
    const isoTimestamp = timestamp.toISOString();

    // CloudTrail-style log entry
    const logEntry = {
        // Event identification
        eventId: crypto.randomUUID(),
        eventVersion: '1.0',
        eventSource: 'traf3li-storage',

        // Timestamp
        timestamp: isoTimestamp,
        requestTime: timestamp.getTime(),

        // Request details
        bucket: BUCKETS[bucket] || bucket,
        key: fileKey,
        operation: action.toUpperCase(),
        storageType: 'r2',

        // Principal (who made the request)
        userIdentity: {
            type: 'IAMUser',
            principalId: userId,
            arn: `arn:traf3li:iam::${metadata.firmId || 'unknown'}:user/${userId}`
        },

        // Request parameters
        request: {
            action,
            userAgent: metadata.userAgent || 'traf3li-backend',
            sourceIpAddress: metadata.remoteIp || metadata.ipAddress || null,
            referer: metadata.referer || null
        },

        // Response details
        response: {
            httpStatus: metadata.httpStatus || 200,
            bytesTransferred: metadata.bytesTransferred || metadata.fileSize || 0,
            objectSize: metadata.objectSize || metadata.fileSize || 0,
            totalTime: metadata.totalTime || 0
        },

        // Version info
        versionId: metadata.versionId || null,

        // Host info
        hostId: process.env.HOSTNAME || 'production',
        requestId: crypto.randomUUID(),

        // Tenant context (critical for legal docs)
        tenantContext: {
            firmId: metadata.firmId || null,
            caseId: metadata.caseId || null,
            documentId: metadata.documentId || null,
            clientId: metadata.clientId || null
        },

        // File metadata
        fileMetadata: {
            fileName: metadata.fileName || null,
            fileSize: metadata.fileSize || null,
            fileType: metadata.fileType || null,
            category: metadata.category || null
        }
    };

    // Date-based partitioning (AWS CloudTrail pattern)
    // Format: logs/YYYY/MM/DD/HH/timestamp-userId-action.json
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
            Metadata: {
                'log-type': 'access',
                'source-bucket': BUCKETS[bucket] || bucket,
                'action': action,
                'user-id': userId
            }
        });

        await r2Client.send(command);
    } catch (err) {
        // Non-blocking - logging failure should not affect main operation
        logger.error('Failed to log file access to R2:', err.message);
    }
};

/**
 * Log batch of file accesses (for bulk operations)
 * More efficient than individual logging for bulk downloads/uploads
 *
 * @param {Array<Object>} accessRecords - Array of access records
 */
const logBatchFileAccess = async (accessRecords) => {
    if (!isR2Configured() || !r2Client || !isLoggingEnabled()) {
        return;
    }

    if (!accessRecords || accessRecords.length === 0) {
        return;
    }

    // Group by bucket for efficient logging
    const byBucket = accessRecords.reduce((acc, record) => {
        const bucket = record.bucket || 'documents';
        if (!acc[bucket]) acc[bucket] = [];
        acc[bucket].push(record);
        return acc;
    }, {});

    // Log each batch
    const promises = Object.entries(byBucket).map(async ([bucket, records]) => {
        const logBucket = getLogBucket(bucket);
        if (!logBucket) return;

        const timestamp = new Date();
        const datePrefix = [
            timestamp.getFullYear(),
            String(timestamp.getMonth() + 1).padStart(2, '0'),
            String(timestamp.getDate()).padStart(2, '0'),
            String(timestamp.getHours()).padStart(2, '0')
        ].join('/');

        const batchId = `batch-${timestamp.getTime()}-${crypto.randomBytes(4).toString('hex')}`;
        const logKey = `logs/${datePrefix}/${batchId}.json`;

        const batchLog = {
            eventId: crypto.randomUUID(),
            eventType: 'BatchAccess',
            timestamp: timestamp.toISOString(),
            batchId,
            recordCount: records.length,
            records: records.map(r => ({
                timestamp: r.timestamp || timestamp.toISOString(),
                key: r.fileKey,
                operation: (r.action || 'access').toUpperCase(),
                requesterId: r.userId,
                bucket: BUCKETS[r.bucket] || r.bucket,
                tenantContext: {
                    firmId: r.firmId || null,
                    documentId: r.documentId || null,
                    caseId: r.caseId || null
                },
                fileMetadata: {
                    fileName: r.fileName || null,
                    fileSize: r.fileSize || null
                }
            }))
        };

        try {
            const command = new PutObjectCommand({
                Bucket: logBucket,
                Key: logKey,
                Body: JSON.stringify(batchLog, null, 2),
                ContentType: 'application/json',
                Metadata: {
                    'log-type': 'batch-access',
                    'record-count': String(records.length)
                }
            });

            await r2Client.send(command);
        } catch (err) {
            logger.error('Failed to log batch file access:', err.message);
        }
    });

    await Promise.all(promises);
};

/**
 * Query access logs for audit trail
 * Supports filtering by date range, file key, user ID
 *
 * @param {string} bucket - The bucket to query logs for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of log entries
 */
const queryAccessLogs = async (bucket, options = {}) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('Cloudflare R2 is not configured');
    }

    const logBucket = getLogBucket(bucket);
    if (!logBucket) {
        return [];
    }

    const { startDate, endDate, fileKey, userId, firmId, action, maxResults = 100 } = options;

    // Build prefix based on date range for efficient querying
    let prefix = 'logs/';
    if (startDate) {
        const date = new Date(startDate);
        prefix += `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/`;
        if (endDate && new Date(endDate).toDateString() === date.toDateString()) {
            prefix += `${String(date.getDate()).padStart(2, '0')}/`;
        }
    }

    const command = new ListObjectsV2Command({
        Bucket: logBucket,
        Prefix: prefix,
        MaxKeys: maxResults * 2 // Fetch more since we filter
    });

    const response = await r2Client.send(command);

    if (!response.Contents) {
        return [];
    }

    // Fetch and filter logs
    const logs = [];
    for (const item of response.Contents) {
        if (logs.length >= maxResults) break;

        try {
            const getCommand = new GetObjectCommand({
                Bucket: logBucket,
                Key: item.Key
            });
            const logResponse = await r2Client.send(getCommand);
            const logContent = await logResponse.Body.transformToString();
            const logEntry = JSON.parse(logContent);

            // Apply filters
            if (fileKey && logEntry.key !== fileKey) continue;
            if (userId && logEntry.userIdentity?.principalId !== userId) continue;
            if (firmId && logEntry.tenantContext?.firmId !== firmId) continue;
            if (action && logEntry.operation !== action.toUpperCase()) continue;
            if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) continue;

            logs.push(logEntry);
        } catch (err) {
            logger.warn('Failed to parse log entry:', item.Key);
        }
    }

    return logs;
};

/**
 * Get access statistics for a file
 *
 * @param {string} fileKey - The file key
 * @param {string} bucket - The bucket name
 * @param {Object} options - Query options (startDate, endDate)
 * @returns {Promise<Object>} - Access statistics
 */
const getFileAccessStats = async (fileKey, bucket, options = {}) => {
    const logs = await queryAccessLogs(bucket, {
        ...options,
        fileKey,
        maxResults: 1000
    });

    const stats = {
        totalAccesses: logs.length,
        downloads: 0,
        previews: 0,
        uploads: 0,
        deletes: 0,
        uniqueUsers: new Set(),
        lastAccessed: null,
        firstAccessed: null
    };

    for (const log of logs) {
        switch (log.operation) {
            case 'DOWNLOAD': stats.downloads++; break;
            case 'PREVIEW': stats.previews++; break;
            case 'UPLOAD': stats.uploads++; break;
            case 'DELETE': stats.deletes++; break;
        }

        if (log.userIdentity?.principalId) {
            stats.uniqueUsers.add(log.userIdentity.principalId);
        }

        const logTime = new Date(log.timestamp);
        if (!stats.lastAccessed || logTime > stats.lastAccessed) {
            stats.lastAccessed = logTime;
        }
        if (!stats.firstAccessed || logTime < stats.firstAccessed) {
            stats.firstAccessed = logTime;
        }
    }

    stats.uniqueUserCount = stats.uniqueUsers.size;
    stats.uniqueUsers = Array.from(stats.uniqueUsers);

    return stats;
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    // Client
    r2Client,
    s3Client, // Alias for backwards compatibility

    // Configuration
    BUCKETS,
    SSE_CONFIG,
    storageType,
    PRESIGNED_URL_EXPIRY,
    PRESIGNED_URL_UPLOAD_EXPIRY,
    MAX_FILE_SIZES,
    ALLOWED_MIME_TYPES,

    // Detection functions
    isR2Configured,
    isS3Configured, // Alias for backwards compatibility
    isLoggingEnabled,

    // File key generation
    generateFileKey,
    generateFileKeyLegacy,
    sanitizeFilename,

    // File operations
    getUploadPresignedUrl,
    getDownloadPresignedUrl,
    uploadFile,
    deleteFile,
    deleteObject, // Alias for backwards compatibility
    copyFile,
    listFileVersions,
    getFileMetadata,
    fileExists,
    getEncryptionParams,
    getPublicUrl,

    // Logging (Gold Standard - AWS CloudTrail pattern)
    getLogBucket,
    logFileAccess,
    logBatchFileAccess,
    queryAccessLogs,
    getFileAccessStats
};
