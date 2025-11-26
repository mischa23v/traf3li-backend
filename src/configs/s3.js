const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// S3 Client configuration
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'me-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Bucket names
const BUCKETS = {
    general: process.env.S3_BUCKET_DOCUMENTS || 'traf3li-legal-documents',
    judgments: process.env.S3_BUCKET_JUDGMENTS || 'traf3li-case-judgments'
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
 * @param {string} bucket - The bucket name ('general' or 'judgments')
 * @returns {Promise<void>}
 */
const deleteFile = async (fileKey, bucket = 'general') => {
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
    getUploadPresignedUrl,
    getDownloadPresignedUrl,
    deleteFile,
    generateFileKey,
    PRESIGNED_URL_EXPIRY
};
