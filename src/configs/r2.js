/**
 * Cloudflare R2 Storage Configuration
 *
 * Cloudflare R2 is S3-compatible, so we use the AWS SDK with custom endpoint.
 *
 * Features:
 * - Multiple bucket support (CRM, Documents, Finance, HR, Judgments)
 * - Dedicated logging buckets for access tracking
 * - Presigned URLs for secure file operations
 * - File versioning support
 */

const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectVersionsCommand,
    HeadObjectCommand,
    ListObjectsV2Command
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Check if R2 is configured
const isR2Configured = () => {
    return !!(
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY &&
        process.env.R2_ENDPOINT &&
        (process.env.R2_BUCKET_DOCUMENTS || process.env.R2_BUCKET_CRM)
    );
};

// R2 Client configuration - only create if configured
let r2Client = null;

if (isR2Configured()) {
    r2Client = new S3Client({
        region: 'auto', // R2 uses 'auto' region
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
        }
    });
    console.log('R2 client initialized successfully');
} else {
    console.log('R2 not configured - using local storage for file uploads');
}

// Bucket names from environment variables
const BUCKETS = {
    // Main storage buckets
    crm: process.env.R2_BUCKET_CRM || 'traf3li-crm',
    documents: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',
    finance: process.env.R2_BUCKET_FINANCE || 'traf3li-finance',
    hr: process.env.R2_BUCKET_HR || 'traf3li-hr',
    judgments: process.env.R2_BUCKET_JUDGMENTS || 'traf3li-judgments',
    // Tasks bucket (alias to documents for compatibility)
    tasks: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',
    // General bucket (alias for backward compatibility)
    general: process.env.R2_BUCKET_DOCUMENTS || 'traf3li-documents',

    // Logging buckets for access tracking
    crmLogs: process.env.R2_BUCKET_CRM_LOGS || null,
    documentsLogs: process.env.R2_BUCKET_DOCUMENTS_LOGS || null,
    financeLogs: process.env.R2_BUCKET_FINANCE_LOGS || null,
    hrLogs: process.env.R2_BUCKET_HR_LOGS || null,
    judgmentsLogs: process.env.R2_BUCKET_JUDGMENTS_LOGS || null,
    tasksLogs: process.env.R2_BUCKET_DOCUMENTS_LOGS || null
};

// Check if logging is enabled
const isLoggingEnabled = () => !!(
    BUCKETS.crmLogs ||
    BUCKETS.documentsLogs ||
    BUCKETS.financeLogs ||
    BUCKETS.hrLogs ||
    BUCKETS.judgmentsLogs
);

// URL expiry time (in seconds)
const PRESIGNED_URL_EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY) || 3600;

/**
 * Generate a presigned URL for uploading a file
 * @param {string} fileKey - The R2 key for the file
 * @param {string} contentType - The MIME type of the file
 * @param {string} bucket - The bucket name ('documents', 'judgments', 'crm', 'finance', 'hr')
 * @returns {Promise<string>} - The presigned URL
 */
const getUploadPresignedUrl = async (fileKey, contentType, bucket = 'documents') => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType
    });

    const url = await getSignedUrl(r2Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    return url;
};

/**
 * Generate a presigned URL for downloading a file
 * @param {string} fileKey - The R2 key for the file
 * @param {string} bucket - The bucket name ('documents', 'judgments', 'crm', 'finance', 'hr', 'tasks')
 * @param {string} filename - Original filename for Content-Disposition header
 * @param {string} versionId - Optional R2 version ID for versioned buckets
 * @returns {Promise<string>} - The presigned URL
 */
const getDownloadPresignedUrl = async (fileKey, bucket = 'documents', filename = null, versionId = null) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const commandOptions = {
        Bucket: bucketName,
        Key: fileKey
    };

    // Support R2 versioning - fetch specific version if provided
    if (versionId) {
        commandOptions.VersionId = versionId;
    }

    if (filename) {
        commandOptions.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(filename)}"`;
    }

    const command = new GetObjectCommand(commandOptions);

    const url = await getSignedUrl(r2Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    return url;
};

/**
 * List all versions of a file (for versioned buckets)
 * @param {string} fileKey - The R2 key for the file
 * @param {string} bucket - The bucket name
 * @returns {Promise<Array>} - Array of version objects
 */
const listFileVersions = async (fileKey, bucket = 'documents') => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const command = new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: fileKey
    });

    const response = await r2Client.send(command);

    // Filter to exact key match and format response
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
 * @param {string} fileKey - The R2 key for the file
 * @param {string} bucket - The bucket name
 * @param {string} versionId - Optional version ID
 * @returns {Promise<Object>} - File metadata
 */
const getFileMetadata = async (fileKey, bucket = 'documents', versionId = null) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('R2 is not configured');
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
 * Get the logging bucket for a given source bucket
 * @param {string} bucket - Source bucket name
 * @returns {string|null} - Logging bucket name or null if not configured
 */
const getLogBucket = (bucket) => {
    const logBucketMap = {
        'crm': BUCKETS.crmLogs,
        'documents': BUCKETS.documentsLogs,
        'finance': BUCKETS.financeLogs,
        'hr': BUCKETS.hrLogs,
        'judgments': BUCKETS.judgmentsLogs,
        'tasks': BUCKETS.tasksLogs,
        'general': BUCKETS.documentsLogs
    };
    return logBucketMap[bucket] || null;
};

/**
 * Log file access to the logging bucket
 * Similar to AWS S3 server access logging format
 *
 * @param {string} fileKey - The accessed file key
 * @param {string} bucket - The source bucket ('documents', 'tasks', 'crm', 'finance', 'hr', 'judgments')
 * @param {string} userId - The user who accessed the file
 * @param {string} action - The action performed ('download', 'upload', 'preview', 'delete', 'list')
 * @param {Object} metadata - Additional metadata to log
 */
const logFileAccess = async (fileKey, bucket, userId, action, metadata = {}) => {
    if (!isR2Configured() || !r2Client) {
        return; // Skip logging if R2 not configured
    }

    // Determine which logging bucket to use
    const logBucket = getLogBucket(bucket);

    if (!logBucket) {
        return; // Skip if no logging bucket configured
    }

    const timestamp = new Date();
    const isoTimestamp = timestamp.toISOString();

    // Format similar to AWS S3 server access logs
    const logEntry = {
        // Timestamp in ISO format
        timestamp: isoTimestamp,
        // Request timestamp in Unix epoch
        requestTime: timestamp.getTime(),
        // Source bucket
        bucket: BUCKETS[bucket] || bucket,
        // Object key
        key: fileKey,
        // Operation type
        operation: action.toUpperCase(),
        // User/requester ID
        requesterId: userId,
        // Request details
        request: {
            action,
            userAgent: metadata.userAgent || 'traf3li-backend',
            remoteIp: metadata.remoteIp || null,
            referer: metadata.referer || null
        },
        // Response details
        response: {
            httpStatus: metadata.httpStatus || 200,
            bytesTransferred: metadata.bytesTransferred || 0,
            objectSize: metadata.objectSize || 0,
            totalTime: metadata.totalTime || 0
        },
        // Version info
        versionId: metadata.versionId || null,
        // Host info
        hostId: process.env.HOSTNAME || 'production',
        // Additional custom metadata
        customMetadata: {
            firmId: metadata.firmId || null,
            caseId: metadata.caseId || null,
            documentId: metadata.documentId || null,
            ...metadata.custom
        }
    };

    // Create log key with date-based partitioning (like S3 server access logs)
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
        // Log error but don't fail the main operation
        console.error('Failed to log file access to R2:', err.message);
    }
};

/**
 * Log batch of file accesses (for bulk operations)
 * @param {Array<Object>} accessRecords - Array of access records
 */
const logBatchFileAccess = async (accessRecords) => {
    if (!isR2Configured() || !r2Client || !isLoggingEnabled()) {
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

        const logKey = `logs/${datePrefix}/batch-${timestamp.getTime()}.json`;

        const batchLog = {
            timestamp: timestamp.toISOString(),
            batchId: `batch-${timestamp.getTime()}`,
            recordCount: records.length,
            records: records.map(r => ({
                timestamp: r.timestamp || timestamp.toISOString(),
                key: r.fileKey,
                operation: (r.action || 'access').toUpperCase(),
                requesterId: r.userId,
                bucket: BUCKETS[r.bucket] || r.bucket
            }))
        };

        try {
            const command = new PutObjectCommand({
                Bucket: logBucket,
                Key: logKey,
                Body: JSON.stringify(batchLog, null, 2),
                ContentType: 'application/json'
            });

            await r2Client.send(command);
        } catch (err) {
            console.error('Failed to log batch file access:', err.message);
        }
    });

    await Promise.all(promises);
};

/**
 * Query access logs for a specific file or time range
 * @param {string} bucket - The bucket to query logs for
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of log entries
 */
const queryAccessLogs = async (bucket, options = {}) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('R2 is not configured');
    }

    const logBucket = getLogBucket(bucket);
    if (!logBucket) {
        return [];
    }

    const { startDate, endDate, fileKey, userId, maxResults = 100 } = options;

    // Build prefix based on date range
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
    for (const item of response.Contents.slice(0, maxResults)) {
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
            if (userId && logEntry.requesterId !== userId) continue;
            if (endDate && new Date(logEntry.timestamp) > new Date(endDate)) continue;

            logs.push(logEntry);
        } catch (err) {
            console.warn('Failed to parse log entry:', item.Key);
        }
    }

    return logs;
};

/**
 * Delete a file from R2
 * @param {string} fileKey - The R2 key for the file
 * @param {string} bucket - The bucket name ('documents', 'judgments', 'crm', 'finance', 'hr', 'tasks')
 * @returns {Promise<void>}
 */
const deleteFile = async (fileKey, bucket = 'documents') => {
    if (!isR2Configured() || !r2Client) {
        console.log('R2 not configured, skipping R2 delete for:', fileKey);
        return;
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: fileKey
    });

    await r2Client.send(command);
};

/**
 * Upload a file directly to R2
 * @param {string} fileKey - The R2 key for the file
 * @param {Buffer|string} content - File content
 * @param {string} contentType - MIME type
 * @param {string} bucket - Bucket name
 * @param {Object} metadata - Optional metadata
 * @returns {Promise<void>}
 */
const uploadFile = async (fileKey, content, contentType, bucket = 'documents', metadata = {}) => {
    if (!isR2Configured() || !r2Client) {
        throw new Error('R2 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: content,
        ContentType: contentType,
        Metadata: metadata
    });

    await r2Client.send(command);
};

/**
 * Generate a unique file key for R2
 * @param {string} caseId - The case ID
 * @param {string} category - Document category
 * @param {string} filename - Original filename
 * @returns {string} - The generated file key
 */
const generateFileKey = (caseId, category, filename) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `cases/${caseId}/${category}/${timestamp}-${randomString}-${sanitizedFilename}`;
};

/**
 * Get R2 public URL for a file (if bucket has public access)
 * @param {string} fileKey - The file key
 * @param {string} bucket - The bucket name
 * @returns {string} - The public URL
 */
const getPublicUrl = (fileKey, bucket = 'documents') => {
    const accountId = process.env.R2_ACCOUNT_ID;
    const bucketName = BUCKETS[bucket] || BUCKETS.documents;

    // R2 public URL format: https://{bucket}.{account-id}.r2.cloudflarestorage.com/{key}
    // Or if using custom domain: https://{custom-domain}/{key}
    if (process.env.R2_PUBLIC_DOMAIN) {
        return `https://${process.env.R2_PUBLIC_DOMAIN}/${fileKey}`;
    }

    return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileKey}`;
};

module.exports = {
    r2Client,
    BUCKETS,
    isR2Configured,
    isLoggingEnabled,
    getUploadPresignedUrl,
    getDownloadPresignedUrl,
    deleteFile,
    uploadFile,
    generateFileKey,
    listFileVersions,
    getFileMetadata,
    logFileAccess,
    logBatchFileAccess,
    queryAccessLogs,
    getLogBucket,
    getPublicUrl,
    PRESIGNED_URL_EXPIRY
};
