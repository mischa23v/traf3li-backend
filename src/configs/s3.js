const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Check if S3 is configured
const isS3Configured = () => {
    return !!(
        process.env.AWS_ACCESS_KEY_ID &&
        process.env.AWS_SECRET_ACCESS_KEY &&
        (process.env.S3_BUCKET_DOCUMENTS || process.env.S3_BUCKET_TASKS)
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

// Bucket names
const BUCKETS = {
    general: process.env.S3_BUCKET_DOCUMENTS || 'traf3li-legal-documents',
    judgments: process.env.S3_BUCKET_JUDGMENTS || 'traf3li-case-judgments',
    tasks: process.env.S3_BUCKET_TASKS || process.env.S3_BUCKET_DOCUMENTS || 'traf3li-legal-documents'
};

// URL expiry time (in seconds)
const PRESIGNED_URL_EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY) || 3600;

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
        ContentType: contentType
    });

    const url = await getSignedUrl(s3Client, command, {
        expiresIn: PRESIGNED_URL_EXPIRY
    });

    return url;
};

/**
 * Generate a presigned URL for downloading a file
 * @param {string} fileKey - The S3 key for the file
 * @param {string} bucket - The bucket name ('general' or 'judgments')
 * @param {string} filename - Original filename for Content-Disposition header
 * @returns {Promise<string>} - The presigned URL
 */
const getDownloadPresignedUrl = async (fileKey, bucket = 'general', filename = null) => {
    if (!isS3Configured() || !s3Client) {
        throw new Error('S3 is not configured');
    }

    const bucketName = BUCKETS[bucket] || BUCKETS.general;

    const commandOptions = {
        Bucket: bucketName,
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
    isS3Configured,
    getUploadPresignedUrl,
    getDownloadPresignedUrl,
    deleteFile,
    generateFileKey,
    PRESIGNED_URL_EXPIRY
};
