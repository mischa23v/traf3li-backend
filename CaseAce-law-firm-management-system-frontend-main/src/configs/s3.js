const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectVersionsCommand,
    HeadObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Check if S3 is configured
// Supports multiple variable naming conventions
const isS3Configured = () => {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        (process.env.S3_BUCKET_TASKS || process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_DOCUMENTS || process.env.S3_BUCKET_DOCUMENTS)
    );
};

// S3 Client configuration - only create if configured
let s3Client = null;

if (isS3Configured()) {
    s3Client = new S3Client({
        region: process.env.AWS_REGION || 'me-south-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });
    console.log('S3 client initialized successfully');
} else {
    console.log('S3 not configured - using local storage for file uploads');
}

// Bucket names - support multiple variable naming conventions
// Priority: S3_BUCKET_* > AWS_S3_BUCKET_* > AWS_S3_BUCKET (fallback)
const BUCKETS = {
    general: process.env.S3_BUCKET_DOCUMENTS || process.env.AWS_S3_BUCKET_DOCUMENTS || process.env.AWS_S3_BUCKET || 'traf3li-legal-documents',
    judgments: process.env.S3_BUCKET_JUDGMENTS || process.env.AWS_S3_JUDGMENTS_BUCKET || 'traf3li-case-judgments',
    tasks: process.env.S3_BUCKET_TASKS || process.env.AWS_S3_BUCKET || 'traf3li-task-attachments',
    // Logging buckets for access tracking
    documentsLogs: process.env.S3_BUCKET_DOCUMENTS_LOGS || process.env.AWS_S3_BUCKET_DOCUMENTS_LOGS || null,
    tasksLogs: process.env.S3_BUCKET_TASKS_LOGS || process.env.AWS_S3_BUCKET_TASKS_LOGS || null
};

// Check if versioning logging is enabled
const isLoggingEnabled = () => !!(BUCKETS.documentsLogs || BUCKETS.tasksLogs);

// URL expiry time (in seconds)
const PRESIGNED_URL_EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY) || 3600;

// Server-side encryption configuration
// Supports SSE-S3 (AES256) or SSE-KMS with Bucket Key
const SSE_CONFIG = {
    enabled: process.env.S3_SSE_ENABLED !== 'false', // Enabled by default
    algorithm: process.env.S3_SSE_ALGORITHM || 'AES256', // 'AES256' for SSE-S3, 'aws:kms' for SSE-KMS
    kmsKeyId: process.env.S3_KMS_KEY_ID || null, // Required if using SSE-KMS
    bucketKeyEnabled: process.env.S3_BUCKET_KEY_ENABLED !== 'false' // Bucket Key enabled by default for KMS
};

/**
 * Get encryption parameters for PutObject commands
 * @returns {Object} - Encryption parameters to spread into command options
 */
const getEncryptionParams = () => {
    if (!SSE_CONFIG.enabled) {
        return {};
    }

    const params = {
        ServerSideEncryption: SSE_CONFIG.algorithm
    };

    // If using SSE-KMS, add KMS key and Bucket Key setting
    if (SSE_CONFIG.algorithm === 'aws:kms') {
        if (SSE_CONFIG.kmsKeyId) {
            params.SSEKMSKeyId = SSE_CONFIG.kmsKeyId;
        }
        // Enable Bucket Key to reduce KMS costs
        params.BucketKeyEnabled = SSE_CONFIG.bucketKeyEnabled;
    }

    return params;
};

/**
 * Generate a presigned URL for uploading a file
 * @param {string} fileKey - The S3 key for the file
 * @param {string} contentType - The MIME type of the file
 * @param {string} bucket - The bucket name ('general' or 'judgments')
 * @returns {Promise<string>} - The presigned URL
 */
const getUploadPresignedUrl = async (fileKey, contentType, bucket = 'general') => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('S3 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType,
        ...getEncryptionParams() // Apply server-side encryption
    });

    const url = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    return url;
};

/**
 * Generate a presigned URL for downloading a file
 * @param {string} fileKey - The S3 key for the file
 * @param {string} bucket - The bucket name ('general', 'judgments', or 'tasks')
 * @param {string} filename - Original filename for Content-Disposition header
 * @param {string} versionId - Optional S3 version ID for versioned buckets
 * @returns {Promise<string>} - The presigned URL
 */
const getDownloadPresignedUrl = async (fileKey, bucket = 'general', filename = null, versionId = null) => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('S3 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const commandOptions = {
        Bucket: bucketName,
        Key: fileKey
    };

    // Support S3 versioning - fetch specific version if provided
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
 * List all versions of a file (for versioned buckets)
 * @param {string} fileKey - The S3 key for the file
 * @param {string} bucket - The bucket name
 * @returns {Promise<Array>} - Array of version objects
 */
const listFileVersions = async (fileKey, bucket = 'general') => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('S3 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const command = new ListObjectVersionsCommand({
        Bucket: bucketName,
        Prefix: fileKey
    });

    const response = await s3Client.send(command);

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
 * @param {string} fileKey - The S3 key for the file
 * @param {string} bucket - The bucket name
 * @param {string} versionId - Optional version ID
 * @returns {Promise<Object>} - File metadata
 */
const getFileMetadata = async (fileKey, bucket = 'general', versionId = null) => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('S3 is not configured');
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
 * Log file access to the logging bucket
 * @param {string} fileKey - The accessed file key
 * @param {string} bucket - The source bucket ('documents' or 'tasks')
 * @param {string} userId - The user who accessed the file
 * @param {string} action - The action performed ('download', 'preview', 'delete')
 * @param {Object} metadata - Additional metadata to log
 */
const logFileAccess = async (fileKey, bucket, userId, action, metadata = {}) => {
    if (!isS3Configured() || !s3Client) {
        return; // Skip logging if S3 not configured
    }

    // Determine which logging bucket to use
    const logBucket = bucket === 'tasks' ? BUCKETS.tasksLogs : BUCKETS.documentsLogs;

    if (!logBucket) {
        return; // Skip if no logging bucket configured
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        fileKey,
        sourceBucket: BUCKETS[bucket] || bucket,
        userId,
        action,
        ...metadata
    };

    const logKey = `logs/${new Date().toISOString().split('T')[0]}/${Date.now()}-${userId}-${action}.json`;

    try {
        const command = new PutObjectCommand({
            Bucket: logBucket,
            Key: logKey,
            Body: JSON.stringify(logEntry, null, 2),
            ContentType: 'application/json',
            ...getEncryptionParams() // Apply server-side encryption to logs
        });

        await s3Client.send(command);
    } catch (err) {
        // Log error but don't fail the main operation
        console.error('Failed to log file access:', err.message);
    }
};

/**
 * Delete a file from S3
 * @param {string} fileKey - The S3 key for the file
 * @param {string} bucket - The bucket name ('general', 'judgments', or 'tasks')
 * @returns {Promise<void>}
 */
const deleteFile = async (fileKey, bucket = 'general') => {
    if (!isS3Configured() || !s3Client) {
        console.log('S3 not configured, skipping S3 delete for:', fileKey);
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
 * Generate a unique file key for S3
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

module.exports = {
    s3Client,
    BUCKETS,
    SSE_CONFIG,
    isS3Configured,
    isLoggingEnabled,
    getUploadPresignedUrl,
    getDownloadPresignedUrl,
    getEncryptionParams,
    deleteFile,
    generateFileKey,
    listFileVersions,
    getFileMetadata,
    logFileAccess,
    PRESIGNED_URL_EXPIRY
};
