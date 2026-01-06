const { Document, Case, Client, Firm } = require('../models');
const DocumentVersion = require('../models/documentVersion.model');
const DocumentVersionService = require('../services/documentVersionService');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { r2Client, getUploadPresignedUrl, getDownloadPresignedUrl, deleteObject, BUCKETS, logFileAccess, PRESIGNED_URL_EXPIRY, PRESIGNED_URL_UPLOAD_EXPIRY } = require('../configs/storage');
const { sanitizeObjectId } = require('../utils/securityUtils');
const crypto = require('crypto');
const path = require('path');
const logger = require('../utils/logger');
const docLogger = require('../services/documentLogger.service');

/**
 * Escape special regex characters to prevent NoSQL injection
 * @param {string} str - String to escape
 * @returns {string} - Escaped string safe for regex
 */
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Whitelist of allowed file types
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-rar-compressed',
    'application/json'
];

// Maximum file size in bytes (100 MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Validate file type
 * @param {string} fileType - MIME type to validate
 * @returns {boolean}
 */
const isAllowedFileType = (fileType) => {
    return ALLOWED_FILE_TYPES.includes(fileType);
};

/**
 * Validate file size
 * @param {number} fileSize - File size in bytes
 * @returns {boolean}
 */
const isValidFileSize = (fileSize) => {
    return fileSize > 0 && fileSize <= MAX_FILE_SIZE;
};

/**
 * Validate file path to prevent path traversal
 * @param {string} filePath - File path to validate
 * @returns {boolean}
 */
const isValidFilePath = (filePath) => {
    if (!filePath || typeof filePath !== 'string') {
        return false;
    }
    const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    if (safePath.includes('..')) {
        return false;
    }
    return true;
};

/**
 * Get the correct bucket based on module type
 * @param {string} module - Module name ('crm', 'finance', 'hr', 'documents', etc.)
 * @returns {string} - Bucket name from BUCKETS
 */
const getBucketForModule = (module) => {
    const moduleMap = {
        'crm': BUCKETS.crm,
        'finance': BUCKETS.finance,
        'hr': BUCKETS.hr,
        'judgments': BUCKETS.judgments,
        'tasks': BUCKETS.tasks,
        'documents': BUCKETS.documents,
        'general': BUCKETS.general
    };
    return moduleMap[module] || BUCKETS.documents;
};

/**
 * Upload document (get presigned URL)
 * POST /api/documents/upload
 *
 * @param {string} module - Module for bucket routing ('crm', 'finance', 'hr', 'documents')
 */
const getUploadUrl = asyncHandler(async (req, res) => {
    const { fileName, fileType, category, caseId, clientId, description, isConfidential, module } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    if (!fileName || !fileType || !category) {
        throw CustomException('اسم الملف ونوعه والفئة مطلوبة', 400);
    }

    // Validate file type
    if (!isAllowedFileType(fileType)) {
        throw CustomException('نوع الملف غير مسموح. الأنواع المسموحة: PDF, Word, Excel, PowerPoint, صور، وملفات مضغوطة', 400);
    }

    // Determine bucket based on module
    const bucket = getBucketForModule(module);
    const modulePrefix = module || 'documents';

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileKey = `${modulePrefix}/${lawyerId}/${year}/${month}/${uniqueId}-${fileName}`;

    // Validate file path to prevent path traversal
    if (!isValidFilePath(fileKey)) {
        throw CustomException('اسم الملف يحتوي على أحرف غير صالحة', 400);
    }

    const uploadUrl = await getUploadPresignedUrl(fileKey, fileType, bucket);

    res.status(200).json({
        success: true,
        data: {
            uploadUrl,
            fileKey,
            bucket,
            module: modulePrefix,
            expiresIn: PRESIGNED_URL_UPLOAD_EXPIRY
        }
    });
});

/**
 * Confirm document upload
 * POST /api/documents/confirm
 *
 * @param {string} module - Module for bucket routing ('crm', 'finance', 'hr', 'documents')
 * @param {string} bucket - The bucket where the file was uploaded
 */
const confirmUpload = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const {
        fileName, originalName, fileType, fileSize, fileKey, url,
        category, caseId, clientId, description, isConfidential, tags,
        module, bucket
    } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId; // From firmFilter middleware

    // Log upload confirmation start
    docLogger.logUploadStart(req, { fileName, fileSize, fileType });

    // Validate required fields
    if (!fileName || !fileKey || !category || !fileType || fileSize === undefined) {
        docLogger.logUploadError(req, new Error('Incomplete file data'), { fileName, fileSize, fileType });
        throw CustomException('بيانات الملف غير مكتملة', 400);
    }

    // Validate file type
    if (!isAllowedFileType(fileType)) {
        throw CustomException('نوع الملف غير مسموح', 400);
    }

    // Validate file size
    if (!isValidFileSize(fileSize)) {
        throw CustomException('حجم الملف غير صحيح أو يتجاوز الحد الأقصى (100 MB)', 400);
    }

    // Validate file path to prevent path traversal
    if (!isValidFilePath(fileKey)) {
        throw CustomException('مفتاح الملف يحتوي على أحرف غير صالحة', 400);
    }

    // Determine the actual bucket used
    const actualBucket = bucket || getBucketForModule(module);

    // Mass assignment protection: only allow specific fields
    const allowedFields = {
        fileName,
        originalName: originalName || fileName,
        fileType,
        fileSize,
        url: url || fileKey, // Store fileKey instead of URL - use presigned URLs for access
        fileKey,
        bucket: actualBucket,
        module: module || 'documents',
        category,
        caseId: caseId || null,
        clientId: clientId || null,
        description: description || '',
        isConfidential: Boolean(isConfidential),
        tags: Array.isArray(tags) ? tags : [],
        uploadedBy: lawyerId,
        lawyerId,
        firmId
    };

    const document = await Document.create(allowedFields);

    // Log file upload (Gold Standard - AWS/Google/Microsoft pattern)
    logFileAccess(fileKey, module || 'documents', lawyerId, 'upload', {
        firmId,
        documentId: document._id,
        fileName: fileName,
        fileSize: fileSize,
        remoteIp: req.ip,
        userAgent: req.get('user-agent')
    }).catch(err => logger.error('Failed to log file upload:', err.message));

    // Log upload success
    docLogger.logUploadSuccess(req, document, Date.now() - startTime);

    // Increment usage counter for firm
    if (firmId) {
        const fileSizeMB = fileSize ? fileSize / (1024 * 1024) : 0;
        await Firm.findOneAndUpdate(
            { _id: firmId },
            {
                $inc: {
                    'usage.documentsCount': 1,
                    'usage.storageUsedMB': fileSizeMB
                }
            }
        ).catch(err => logger.error('Error updating document usage:', err.message));
    }

    res.status(201).json({
        success: true,
        message: 'تم تحميل المستند بنجاح',
        data: document
    });
});

/**
 * Get all documents
 * GET /api/documents
 */
const getDocuments = asyncHandler(async (req, res) => {
    const {
        category, caseId, clientId, search,
        page = 1, limit = 50
    } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: documents must belong to user's firm
    const query = { lawyerId, firmId };

    if (category) query.category = category;
    if (caseId) query.caseId = caseId;
    if (clientId) query.clientId = clientId;

    if (search) {
        const safeSearch = escapeRegex(search);
        query.$or = [
            { fileName: { $regex: safeSearch, $options: 'i' } },
            { originalName: { $regex: safeSearch, $options: 'i' } },
            { description: { $regex: safeSearch, $options: 'i' } }
        ];
    }

    const documents = await Document.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('uploadedBy', 'firstName lastName')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'name fullName')
        .lean();

    const total = await Document.countDocuments(query);

    res.status(200).json({
        success: true,
        data: documents,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single document
 * GET /api/documents/:id
 */
const getDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: sanitizedId, lawyerId, firmId })
        .populate('uploadedBy', 'firstName lastName')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'name fullName')
        .lean();

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: document
    });
});

/**
 * Update document metadata
 * PATCH /api/documents/:id
 */
const updateDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    // Mass assignment protection: whitelist allowed fields
    const allowedFields = [
        'fileName', 'category', 'description', 'tags',
        'isConfidential', 'caseId', 'clientId'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            // Additional validation for specific fields
            if (field === 'isConfidential') {
                document[field] = Boolean(req.body[field]);
            } else if (field === 'tags') {
                document[field] = Array.isArray(req.body[field]) ? req.body[field] : [];
            } else {
                document[field] = req.body[field];
            }
        }
    });

    await document.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث المستند بنجاح',
        data: document
    });
});

/**
 * Delete document
 * DELETE /api/documents/:id
 */
const deleteDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId });

    if (!document) {
        docLogger.logNotFound(req, id, 'Document');
        throw CustomException('المستند غير موجود', 404);
    }

    // Validate file path before deletion
    if (!isValidFilePath(document.fileKey)) {
        throw CustomException('مفتاح الملف يحتوي على أحرف غير صالحة', 400);
    }

    // Delete from storage (use stored bucket or fallback to general)
    const bucket = document.bucket || getBucketForModule(document.module) || BUCKETS.general;
    try {
        await deleteObject(bucket, document.fileKey);
    } catch (err) {
        logger.error('Storage delete error:', err);
    }

    // Log file deletion (Gold Standard - AWS/Google/Microsoft pattern)
    logFileAccess(document.fileKey, document.module || 'documents', lawyerId, 'delete', {
        firmId,
        documentId: document._id,
        fileName: document.originalName,
        fileSize: document.fileSize,
        remoteIp: req.ip,
        userAgent: req.get('user-agent')
    }).catch(err => logger.error('Failed to log file deletion:', err.message));

    // Store fileSize before deletion for usage tracking
    const fileSize = document.fileSize || 0;
    const docFirmId = document.firmId || firmId;

    // IDOR protection: include firmId in delete operation
    await Document.findOneAndDelete({ _id: id, firmId });

    // Log delete success
    docLogger.logDelete(req, document, true);

    // Decrement usage counter for firm
    if (docFirmId && docFirmId.toString() === firmId.toString()) {
        const fileSizeMB = fileSize / (1024 * 1024);
        await Firm.findOneAndUpdate(
            { _id: docFirmId },
            {
                $inc: {
                    'usage.documentsCount': -1,
                    'usage.storageUsedMB': -fileSizeMB
                }
            }
        ).catch(err => logger.error('Error updating document usage:', err.message));
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف المستند بنجاح'
    });
});

/**
 * Get documents by case
 * GET /api/documents/case/:caseId
 */
const getDocumentsByCase = asyncHandler(async (req, res) => {
    const { caseId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: ensure case belongs to user's firm
    const caseRecord = await Case.findOne({ _id: caseId, lawyerId, firmId }).lean();
    if (!caseRecord) {
        throw CustomException('القضية غير موجودة أو لا تنتمي إلى مؤسستك', 404);
    }

    // Get documents for the case (use Document.getDocumentsByCase if available, otherwise query directly)
    const documents = await Document.find({
        caseId: caseId,
        lawyerId: lawyerId,
        firmId: firmId  // IDOR protection
    }).populate('uploadedBy', 'firstName lastName').lean();

    res.status(200).json({
        success: true,
        data: documents
    });
});

/**
 * Get documents by client
 * GET /api/documents/client/:clientId
 */
const getDocumentsByClient = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: ensure client belongs to user's firm
    const clientRecord = await Client.findOne({ _id: clientId, firmId }).lean();
    if (!clientRecord) {
        throw CustomException('العميل غير موجود أو لا ينتمي إلى مؤسستك', 404);
    }

    // Get documents for the client
    const documents = await Document.find({
        clientId: clientId,
        lawyerId: lawyerId,
        firmId: firmId  // IDOR protection
    }).populate('uploadedBy', 'firstName lastName').lean();

    res.status(200).json({
        success: true,
        data: documents
    });
});

/**
 * Get document statistics
 * GET /api/documents/stats
 */
const getDocumentStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: statistics only for user's firm
    const totalDocuments = await Document.countDocuments({ lawyerId, firmId });

    const byCategory = await Document.aggregate([
        { $match: { lawyerId: lawyerId, firmId: firmId } },
        { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } }
    ]);

    const totalSize = await Document.aggregate([
        { $match: { lawyerId: lawyerId, firmId: firmId } },
        { $group: { _id: null, total: { $sum: '$fileSize' } } }
    ]);

    const recentDocuments = await Document.find({ lawyerId, firmId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fileName category createdAt')
        .lean();

    res.status(200).json({
        success: true,
        data: {
            totalDocuments,
            byCategory,
            totalSize: totalSize[0]?.total || 0,
            recentDocuments
        }
    });
});

/**
 * Download document (get presigned URL)
 * GET /api/documents/:id/download
 */
const downloadDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // Log download start
    docLogger.logDownloadStart(req, id);

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId });

    if (!document) {
        docLogger.logNotFound(req, id, 'Document');
        throw CustomException('المستند غير موجود', 404);
    }

    // Validate file path before downloading
    if (!isValidFilePath(document.fileKey)) {
        throw CustomException('مفتاح الملف يحتوي على أحرف غير صالحة', 400);
    }

    // Use stored bucket or fallback to general
    const bucket = document.bucket || getBucketForModule(document.module) || BUCKETS.general;
    const downloadUrl = await getDownloadPresignedUrl(document.fileKey, bucket, document.originalName);

    // Log file download (Gold Standard - AWS/Google/Microsoft pattern)
    logFileAccess(document.fileKey, document.module || 'documents', lawyerId, 'download', {
        firmId,
        documentId: document._id,
        fileName: document.originalName,
        fileSize: document.fileSize,
        remoteIp: req.ip,
        userAgent: req.get('user-agent')
    }).catch(err => logger.error('Failed to log file download:', err.message));

    // Update access count
    document.accessCount += 1;
    document.lastAccessedAt = new Date();
    await document.save();

    // Log download success
    docLogger.logDownloadSuccess(req, document, PRESIGNED_URL_EXPIRY);

    res.status(200).json({
        success: true,
        data: {
            downloadUrl,
            fileName: document.originalName,
            expiresIn: PRESIGNED_URL_EXPIRY
        }
    });
});

/**
 * Generate shareable link
 * POST /api/documents/:id/share
 */
const generateShareLink = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { expiresInDays = 7 } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    // Validate expiration days
    if (isNaN(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
        throw CustomException('يجب أن يكون عدد الأيام بين 1 و 365', 400);
    }

    const shareToken = Document.generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    document.shareToken = shareToken;
    document.shareExpiresAt = expiresAt;
    await document.save();

    res.status(200).json({
        success: true,
        message: 'تم إنشاء رابط المشاركة بنجاح',
        data: {
            shareToken,
            shareUrl: `${process.env.CLIENT_URL}/documents/shared/${shareToken}`,
            expiresAt
        }
    });
});

/**
 * Revoke shareable link
 * DELETE /api/documents/:id/share
 */
const revokeShareLink = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    document.shareToken = null;
    document.shareExpiresAt = null;
    await document.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء رابط المشاركة بنجاح'
    });
});

/**
 * Upload new version
 * POST /api/documents/:id/versions
 */
const uploadVersion = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fileName, originalName, fileSize, url, fileKey, changeNote, mimeType, fileType } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    // Validate required fields for version upload
    if (!fileName || !fileSize || !fileKey || !fileType) {
        throw CustomException('بيانات الإصدار الجديد غير مكتملة', 400);
    }

    // Validate file type
    if (!isAllowedFileType(fileType)) {
        throw CustomException('نوع الملف غير مسموح', 400);
    }

    // Validate file size
    if (!isValidFileSize(fileSize)) {
        throw CustomException('حجم الملف غير صحيح أو يتجاوز الحد الأقصى (100 MB)', 400);
    }

    // Validate file path
    if (!isValidFilePath(fileKey)) {
        throw CustomException('مفتاح الملف يحتوي على أحرف غير صالحة', 400);
    }

    // Mass assignment protection: only allow specific fields for version
    const file = {
        originalName: originalName || fileName,
        fileName: fileName,
        fileSize: fileSize,
        fileKey: fileKey,
        url: url,
        mimeType: mimeType || fileType || document.fileType
    };

    const updatedDocument = await DocumentVersionService.uploadVersion(
        id,
        file,
        lawyerId,
        changeNote
    );

    // Log version upload (Gold Standard - AWS/Google/Microsoft pattern)
    logFileAccess(fileKey, document.module || 'documents', lawyerId, 'upload_version', {
        firmId,
        documentId: id,
        version: updatedDocument.version,
        fileName: fileName,
        fileSize: fileSize,
        remoteIp: req.ip,
        userAgent: req.get('user-agent')
    }).catch(err => logger.error('Failed to log version upload:', err.message));

    res.status(200).json({
        success: true,
        error: false,
        message: 'تم تحميل الإصدار الجديد بنجاح',
        data: updatedDocument
    });
});

/**
 * Get version history
 * GET /api/documents/:id/versions
 */
const getVersionHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId }).lean();

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    // Use DocumentVersionService for comprehensive version history
    const versions = await DocumentVersionService.getVersions(id);

    res.status(200).json({
        success: true,
        error: false,
        data: versions
    });
});

/**
 * Restore version
 * POST /api/documents/:id/versions/:versionId/restore
 */
const restoreVersion = asyncHandler(async (req, res) => {
    const { id, versionId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    // Use DocumentVersionService for version restoration
    const updatedDocument = await DocumentVersionService.restoreVersion(
        id,
        versionId,
        lawyerId
    );

    res.status(200).json({
        success: true,
        error: false,
        message: 'تم استعادة الإصدار بنجاح',
        data: updatedDocument
    });
});

/**
 * Search documents
 * GET /api/documents/search
 */
const searchDocuments = asyncHandler(async (req, res) => {
    const { q } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    if (!q || q.length < 2) {
        throw CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    // IDOR protection: search only documents belonging to user's firm
    const safeQuery = escapeRegex(q);
    const documents = await Document.find({
        lawyerId: lawyerId,
        firmId: firmId,
        $or: [
            { fileName: { $regex: safeQuery, $options: 'i' } },
            { originalName: { $regex: safeQuery, $options: 'i' } },
            { description: { $regex: safeQuery, $options: 'i' } }
        ]
    }).limit(20).lean();

    res.status(200).json({
        success: true,
        data: documents,
        count: documents.length
    });
});

/**
 * Get recent documents
 * GET /api/documents/recent
 */
const getRecentDocuments = asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: get only recent documents from user's firm
    const documents = await Document.find({ lawyerId, firmId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('uploadedBy', 'firstName lastName')
        .populate('caseId', 'title caseNumber')
        .lean();

    res.status(200).json({
        success: true,
        data: documents
    });
});

/**
 * Bulk delete documents
 * POST /api/documents/bulk-delete
 */
const bulkDeleteDocuments = asyncHandler(async (req, res) => {
    const { documentIds } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        throw CustomException('معرفات المستندات مطلوبة', 400);
    }

    // IDOR protection: only delete documents belonging to user's firm
    const documents = await Document.find({
        _id: { $in: documentIds },
        lawyerId,
        firmId
    });

    // Delete from storage (use stored bucket for each document)
    for (const doc of documents) {
        // Validate file path before deletion
        if (!isValidFilePath(doc.fileKey)) {
            logger.error('Invalid file path detected for document:', doc._id);
            continue;
        }

        const bucket = doc.bucket || getBucketForModule(doc.module) || BUCKETS.general;
        try {
            await deleteObject(bucket, doc.fileKey);
        } catch (err) {
            logger.error('Storage delete error:', err);
        }
    }

    const result = await Document.deleteMany({
        _id: { $in: documentIds },
        lawyerId,
        firmId
    });

    // Log bulk file deletions (Gold Standard - AWS/Google/Microsoft pattern)
    for (const doc of documents) {
        logFileAccess(doc.fileKey, doc.module || 'documents', lawyerId, 'bulk_delete', {
            firmId,
            documentId: doc._id,
            fileName: doc.originalName,
            fileSize: doc.fileSize,
            bulkOperation: true,
            totalDeleted: result.deletedCount,
            remoteIp: req.ip,
            userAgent: req.get('user-agent')
        }).catch(err => logger.error('Failed to log bulk delete:', err.message));
    }

    res.status(200).json({
        success: true,
        message: `تم حذف ${result.deletedCount} مستند بنجاح`,
        count: result.deletedCount
    });
});

/**
 * Move document to case
 * PATCH /api/documents/:id/move
 */
const moveDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { caseId } = req.body;
    const lawyerId = req.userID;
    const firmId = req.firmId; // IDOR protection

    // IDOR protection: document must belong to user's firm
    const document = await Document.findOne({ _id: id, lawyerId, firmId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    if (caseId) {
        // IDOR protection: case must belong to user's firm
        const caseExists = await Case.findOne({ _id: caseId, lawyerId, firmId }).lean();
        if (!caseExists) {
            throw CustomException('القضية غير موجودة أو لا تنتمي إلى مؤسستك', 404);
        }
    }

    document.caseId = caseId || null;
    await document.save();

    res.status(200).json({
        success: true,
        message: 'تم نقل المستند بنجاح',
        data: document
    });
});

module.exports = {
    getUploadUrl,
    confirmUpload,
    getDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    getDocumentsByCase,
    getDocumentsByClient,
    getDocumentStats,
    downloadDocument,
    generateShareLink,
    revokeShareLink,
    uploadVersion,
    getVersionHistory,
    restoreVersion,
    searchDocuments,
    getRecentDocuments,
    bulkDeleteDocuments,
    moveDocument
};
