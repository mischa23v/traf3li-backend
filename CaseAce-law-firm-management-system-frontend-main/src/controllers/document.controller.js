const { Document, Case, Client } = require('../models');
const DocumentVersion = require('../models/documentVersion.model');
const DocumentVersionService = require('../services/documentVersionService');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { s3, getSignedUrl, deleteObject, BUCKETS } = require('../configs/s3');
const crypto = require('crypto');

/**
 * Upload document (get presigned URL)
 * POST /api/documents/upload
 */
const getUploadUrl = asyncHandler(async (req, res) => {
    const { fileName, fileType, category, caseId, clientId, description, isConfidential } = req.body;
    const lawyerId = req.userID;

    if (!fileName || !fileType || !category) {
        throw CustomException('اسم الملف ونوعه والفئة مطلوبة', 400);
    }

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileKey = `documents/${lawyerId}/${year}/${month}/${uniqueId}-${fileName}`;

    const uploadUrl = await getSignedUrl(BUCKETS.general, fileKey, fileType, 'putObject');

    res.status(200).json({
        success: true,
        data: {
            uploadUrl,
            fileKey,
            expiresIn: 3600
        }
    });
});

/**
 * Confirm document upload
 * POST /api/documents/confirm
 */
const confirmUpload = asyncHandler(async (req, res) => {
    const {
        fileName, originalName, fileType, fileSize, fileKey, url,
        category, caseId, clientId, description, isConfidential, tags
    } = req.body;
    const lawyerId = req.userID;

    if (!fileName || !fileKey || !category) {
        throw CustomException('بيانات الملف غير مكتملة', 400);
    }

    const document = await Document.create({
        lawyerId,
        fileName,
        originalName: originalName || fileName,
        fileType,
        fileSize,
        url: url || `https://${BUCKETS.general}.s3.amazonaws.com/${fileKey}`,
        fileKey,
        category,
        caseId,
        clientId,
        description,
        isConfidential: isConfidential || false,
        tags: tags || [],
        uploadedBy: lawyerId
    });

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

    const query = { lawyerId };

    if (category) query.category = category;
    if (caseId) query.caseId = caseId;
    if (clientId) query.clientId = clientId;

    if (search) {
        query.$or = [
            { fileName: { $regex: search, $options: 'i' } },
            { originalName: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const documents = await Document.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('uploadedBy', 'firstName lastName')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'name fullName');

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

    const document = await Document.findOne({ _id: id, lawyerId })
        .populate('uploadedBy', 'firstName lastName')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'name fullName');

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

    const document = await Document.findOne({ _id: id, lawyerId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    const allowedFields = [
        'fileName', 'category', 'description', 'tags',
        'isConfidential', 'caseId', 'clientId'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            document[field] = req.body[field];
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

    const document = await Document.findOne({ _id: id, lawyerId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    // Delete from S3
    try {
        await deleteObject(BUCKETS.general, document.fileKey);
    } catch (err) {
        console.error('S3 delete error:', err);
    }

    await Document.findByIdAndDelete(id);

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

    const documents = await Document.getDocumentsByCase(lawyerId, caseId);

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

    const documents = await Document.getDocumentsByClient(lawyerId, clientId);

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

    const totalDocuments = await Document.countDocuments({ lawyerId });

    const byCategory = await Document.aggregate([
        { $match: { lawyerId: lawyerId } },
        { $group: { _id: '$category', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } }
    ]);

    const totalSize = await Document.aggregate([
        { $match: { lawyerId: lawyerId } },
        { $group: { _id: null, total: { $sum: '$fileSize' } } }
    ]);

    const recentDocuments = await Document.find({ lawyerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('fileName category createdAt');

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

    const document = await Document.findOne({ _id: id, lawyerId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    const downloadUrl = await getSignedUrl(BUCKETS.general, document.fileKey, document.fileType, 'getObject');

    // Update access count
    document.accessCount += 1;
    document.lastAccessedAt = new Date();
    await document.save();

    res.status(200).json({
        success: true,
        data: {
            downloadUrl,
            fileName: document.originalName,
            expiresIn: 3600
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

    const document = await Document.findOne({ _id: id, lawyerId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
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

    const document = await Document.findOne({ _id: id, lawyerId });

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

    const document = await Document.findOne({ _id: id, lawyerId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    // Use DocumentVersionService for enhanced version management
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

    const document = await Document.findOne({ _id: id, lawyerId });

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

    const document = await Document.findOne({ _id: id, lawyerId });

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

    if (!q || q.length < 2) {
        throw CustomException('يجب أن يكون مصطلح البحث حرفين على الأقل', 400);
    }

    const documents = await Document.searchDocuments(lawyerId, q);

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

    const documents = await Document.find({ lawyerId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate('uploadedBy', 'firstName lastName')
        .populate('caseId', 'title caseNumber');

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

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
        throw CustomException('معرفات المستندات مطلوبة', 400);
    }

    const documents = await Document.find({
        _id: { $in: documentIds },
        lawyerId
    });

    // Delete from S3
    for (const doc of documents) {
        try {
            await deleteObject(BUCKETS.general, doc.fileKey);
        } catch (err) {
            console.error('S3 delete error:', err);
        }
    }

    const result = await Document.deleteMany({
        _id: { $in: documentIds },
        lawyerId
    });

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

    const document = await Document.findOne({ _id: id, lawyerId });

    if (!document) {
        throw CustomException('المستند غير موجود', 404);
    }

    if (caseId) {
        const caseExists = await Case.findOne({ _id: caseId, lawyerId });
        if (!caseExists) {
            throw CustomException('القضية غير موجودة', 404);
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
