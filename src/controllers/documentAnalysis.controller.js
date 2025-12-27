const DocumentAnalysis = require('../models/documentAnalysis.model');
const Document = require('../models/document.model');
const documentAnalysisService = require('../services/documentAnalysis.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Start document analysis
 * POST /api/document-analysis/:documentId
 */
const analyzeDocument = asyncHandler(async (req, res) => {
  // Prevent path traversal - sanitize documentId
  const documentId = sanitizeObjectId(req.params.documentId, 'معرف المستند غير صالح');

  // Mass assignment protection - only allow specific fields
  const allowedFields = pickAllowedFields(req.body, ['analysisTypes', 'async']);
  const { analysisTypes = ['all'], async = false } = allowedFields;

  // Input validation for analysisTypes
  if (!Array.isArray(analysisTypes)) {
    throw CustomException('analysisTypes يجب أن يكون مصفوفة', 400);
  }

  const validAnalysisTypes = ['all', 'classification', 'entities', 'summary', 'risk', 'compliance'];
  const invalidTypes = analysisTypes.filter(type => !validAnalysisTypes.includes(type));
  if (invalidTypes.length > 0) {
    throw CustomException(`أنواع تحليل غير صالحة: ${invalidTypes.join(', ')}`, 400);
  }

  if (typeof async !== 'boolean') {
    throw CustomException('async يجب أن يكون قيمة منطقية', 400);
  }

  const userId = req.userID;
  const firmId = req.firmId || null;

  // IDOR protection - verify document exists and user has access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
  }

  // Check if analysis already exists and is in progress - DISABLED for testing flexibility
  // const existingAnalysis = await DocumentAnalysis.findOne({
  //   documentId,
  //   status: { $in: ['pending', 'processing'] }
  // });

  // if (existingAnalysis) {
  //   return res.status(409).json({
  //     success: false,
  //     message: 'التحليل قيد التنفيذ بالفعل',
  //     data: existingAnalysis
  //   });
  // }

  if (async) {
    // Queue for background processing
    const analysis = await documentAnalysisService.queueAnalysis(documentId, {
      userId,
      firmId,
      analysisTypes
    });

    return res.status(202).json({
      success: true,
      message: 'تم إضافة المستند إلى قائمة الانتظار للتحليل',
      data: analysis
    });
  } else {
    // Process immediately
    const analysis = await documentAnalysisService.analyzeDocument(documentId, {
      userId,
      firmId,
      analysisTypes
    });

    return res.status(201).json({
      success: true,
      message: 'تم تحليل المستند بنجاح',
      data: analysis
    });
  }
});

/**
 * Get document analysis
 * GET /api/document-analysis/:documentId
 */
const getAnalysis = asyncHandler(async (req, res) => {
  // Prevent path traversal - sanitize documentId
  const documentId = sanitizeObjectId(req.params.documentId, 'معرف المستند غير صالح');

  const userId = req.userID;
  const firmId = req.firmId || null;

  // IDOR protection - verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
  }

  // Get latest analysis
  const analysis = await DocumentAnalysis.getLatestAnalysis(documentId, firmId);

  if (!analysis) {
    return res.status(404).json({
      success: false,
      message: 'لم يتم العثور على تحليل لهذا المستند'
    });
  }

  res.status(200).json({
    success: true,
    data: analysis
  });
});

/**
 * Delete document analysis
 * DELETE /api/document-analysis/:documentId
 */
const deleteAnalysis = asyncHandler(async (req, res) => {
  // Prevent path traversal - sanitize documentId
  const documentId = sanitizeObjectId(req.params.documentId, 'معرف المستند غير صالح');

  const userId = req.userID;
  const firmId = req.firmId || null;

  // IDOR protection - verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
  }

  // Delete all analyses for this document
  const deleteQuery = { documentId };
  if (firmId) {
    deleteQuery.firmId = firmId;
  }

  const result = await DocumentAnalysis.deleteMany(deleteQuery);

  res.status(200).json({
    success: true,
    message: `تم حذف ${result.deletedCount} تحليل بنجاح`,
    count: result.deletedCount
  });
});

/**
 * Re-analyze document
 * POST /api/document-analysis/:documentId/reanalyze
 */
const reanalyzeDocument = asyncHandler(async (req, res) => {
  // Prevent path traversal - sanitize documentId
  const documentId = sanitizeObjectId(req.params.documentId, 'معرف المستند غير صالح');

  // Mass assignment protection - only allow specific fields
  const allowedFields = pickAllowedFields(req.body, ['analysisTypes']);
  const { analysisTypes = ['all'] } = allowedFields;

  // Input validation for analysisTypes
  if (!Array.isArray(analysisTypes)) {
    throw CustomException('analysisTypes يجب أن يكون مصفوفة', 400);
  }

  const validAnalysisTypes = ['all', 'classification', 'entities', 'summary', 'risk', 'compliance'];
  const invalidTypes = analysisTypes.filter(type => !validAnalysisTypes.includes(type));
  if (invalidTypes.length > 0) {
    throw CustomException(`أنواع تحليل غير صالحة: ${invalidTypes.join(', ')}`, 400);
  }

  const userId = req.userID;
  const firmId = req.firmId || null;

  // IDOR protection - verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
  }

  // Perform new analysis
  const analysis = await documentAnalysisService.analyzeDocument(documentId, {
    userId,
    firmId,
    analysisTypes
  });

  res.status(201).json({
    success: true,
    message: 'تم إعادة تحليل المستند بنجاح',
    data: analysis
  });
});

/**
 * Get analysis status
 * GET /api/document-analysis/:documentId/status
 */
const getAnalysisStatus = asyncHandler(async (req, res) => {
  // Prevent path traversal - sanitize documentId
  const documentId = sanitizeObjectId(req.params.documentId, 'معرف المستند غير صالح');

  const userId = req.userID;
  const firmId = req.firmId || null;

  // IDOR protection - verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
  }

  const analysis = await documentAnalysisService.getAnalysisStatus(documentId, firmId);

  if (!analysis) {
    return res.status(404).json({
      success: false,
      message: 'لم يتم العثور على تحليل',
      data: { status: 'not_started' }
    });
  }

  res.status(200).json({
    success: true,
    data: {
      status: analysis.status,
      startedAt: analysis.startedAt,
      completedAt: analysis.completedAt,
      processingTime: analysis.processingTime,
      error: analysis.error
    }
  });
});

/**
 * Batch analyze multiple documents
 * POST /api/document-analysis/batch
 */
const batchAnalyze = asyncHandler(async (req, res) => {
  // Mass assignment protection - only allow specific fields
  const allowedFields = pickAllowedFields(req.body, ['documentIds', 'analysisTypes']);
  const { documentIds, analysisTypes = ['all'] } = allowedFields;

  const userId = req.userID;
  const firmId = req.firmId || null;

  // Input validation for documentIds
  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    throw CustomException('معرفات المستندات مطلوبة', 400);
  }

  if (documentIds.length > 50) {
    throw CustomException('لا يمكن تحليل أكثر من 50 مستند في وقت واحد', 400);
  }

  // Sanitize all documentIds to prevent path traversal
  const sanitizedDocumentIds = documentIds.map(id => sanitizeObjectId(id, 'أحد معرفات المستندات غير صالح'));

  // Input validation for analysisTypes
  if (!Array.isArray(analysisTypes)) {
    throw CustomException('analysisTypes يجب أن يكون مصفوفة', 400);
  }

  const validAnalysisTypes = ['all', 'classification', 'entities', 'summary', 'risk', 'compliance'];
  const invalidTypes = analysisTypes.filter(type => !validAnalysisTypes.includes(type));
  if (invalidTypes.length > 0) {
    throw CustomException(`أنواع تحليل غير صالحة: ${invalidTypes.join(', ')}`, 400);
  }

  // IDOR protection - verify documents exist and user has access
  const query = { _id: { $in: sanitizedDocumentIds } };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const documents = await Document.find(query);

  if (documents.length !== sanitizedDocumentIds.length) {
    throw CustomException('بعض المستندات غير موجودة أو ليس لديك صلاحية للوصول إليها', 403);
  }

  // Queue all documents for analysis
  const analyses = await Promise.all(
    sanitizedDocumentIds.map(documentId =>
      documentAnalysisService.queueAnalysis(documentId, {
        userId,
        firmId,
        analysisTypes
      })
    )
  );

  res.status(202).json({
    success: true,
    message: `تم إضافة ${analyses.length} مستند إلى قائمة الانتظار للتحليل`,
    data: analyses
  });
});

/**
 * Semantic search across analyzed documents
 * GET /api/document-analysis/search
 */
const semanticSearch = asyncHandler(async (req, res) => {
  // Mass assignment protection - only allow specific query parameters
  const allowedFields = pickAllowedFields(req.query, ['q', 'documentType', 'riskLevel', 'page', 'limit']);
  const { q, documentType, riskLevel, page = 1, limit = 20 } = allowedFields;

  // Input validation for pagination
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  if (isNaN(parsedPage) || parsedPage < 1) {
    throw CustomException('رقم الصفحة يجب أن يكون رقماً موجباً', 400);
  }

  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    throw CustomException('الحد يجب أن يكون بين 1 و 100', 400);
  }

  // Input validation for search query
  if (q && typeof q !== 'string') {
    throw CustomException('استعلام البحث يجب أن يكون نصاً', 400);
  }

  if (q && q.length > 500) {
    throw CustomException('استعلام البحث طويل جداً', 400);
  }

  // Input validation for filters
  const validDocumentTypes = ['contract', 'lawsuit', 'agreement', 'power-of-attorney', 'other'];
  if (documentType && !validDocumentTypes.includes(documentType)) {
    throw CustomException('نوع المستند غير صالح', 400);
  }

  const validRiskLevels = ['low', 'medium', 'high', 'critical'];
  if (riskLevel && !validRiskLevels.includes(riskLevel)) {
    throw CustomException('مستوى المخاطر غير صالح', 400);
  }

  const userId = req.userID;
  const firmId = req.firmId || null;

  const query = { status: 'completed' };

  if (firmId) {
    query.firmId = firmId;
  } else {
    // For solo lawyers, filter by their documents
    const userDocs = await Document.find({ lawyerId: userId }).select('_id');
    query.documentId = { $in: userDocs.map(d => d._id) };
  }

  // Add filters
  if (documentType) {
    query['classification.documentType'] = documentType;
  }

  if (riskLevel) {
    query['riskAnalysis.overallRisk'] = riskLevel;
  }

  // Text search across summary and entities
  if (q) {
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { 'summary.brief': { $regex: escapedQ, $options: 'i' } },
      { 'summary.detailed': { $regex: escapedQ, $options: 'i' } },
      { 'summary.keyPoints': { $regex: escapedQ, $options: 'i' } },
      { 'entities.value': { $regex: escapedQ, $options: 'i' } }
    ];
  }

  const analyses = await DocumentAnalysis.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .skip((parsedPage - 1) * parsedLimit)
    .populate('documentId', 'fileName originalName category')
    .populate('createdBy', 'firstName lastName fullName');

  const total = await DocumentAnalysis.countDocuments(query);

  res.status(200).json({
    success: true,
    data: analyses,
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit)
    }
  });
});

/**
 * Find similar documents
 * GET /api/document-analysis/:documentId/similar
 */
const findSimilar = asyncHandler(async (req, res) => {
  // Prevent path traversal - sanitize documentId
  const documentId = sanitizeObjectId(req.params.documentId, 'معرف المستند غير صالح');

  // Mass assignment protection - only allow specific query parameters
  const allowedFields = pickAllowedFields(req.query, ['limit']);
  const { limit = 10 } = allowedFields;

  // Input validation for limit
  const parsedLimit = parseInt(limit);
  if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
    throw CustomException('الحد يجب أن يكون بين 1 و 50', 400);
  }

  const userId = req.userID;
  const firmId = req.firmId || null;

  // IDOR protection - verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
  }

  const similar = await documentAnalysisService.searchSimilarDocuments(
    documentId,
    parsedLimit
  );

  res.status(200).json({
    success: true,
    data: similar,
    count: similar.length
  });
});

/**
 * Generate analysis report
 * GET /api/document-analysis/:documentId/report
 */
const generateReport = asyncHandler(async (req, res) => {
  // Prevent path traversal - sanitize documentId
  const documentId = sanitizeObjectId(req.params.documentId, 'معرف المستند غير صالح');

  const userId = req.userID;
  const firmId = req.firmId || null;

  // IDOR protection - verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
  }

  const report = await documentAnalysisService.generateAnalysisReport(documentId);

  res.status(200).json({
    success: true,
    data: report
  });
});

/**
 * Get analysis history for a document
 * GET /api/document-analysis/:documentId/history
 */
const getAnalysisHistory = asyncHandler(async (req, res) => {
  // Prevent path traversal - sanitize documentId
  const documentId = sanitizeObjectId(req.params.documentId, 'معرف المستند غير صالح');

  const userId = req.userID;
  const firmId = req.firmId || null;

  // IDOR protection - verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود أو ليس لديك صلاحية للوصول إليه', 404);
  }

  const history = await DocumentAnalysis.getDocumentHistory(documentId, firmId);

  res.status(200).json({
    success: true,
    data: history,
    count: history.length
  });
});

/**
 * Get analysis statistics
 * GET /api/document-analysis/stats
 */
const getStats = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const firmId = req.firmId || null;

  // SECURITY: Pass both firmId and userId for multi-tenant isolation
  const stats = await DocumentAnalysis.getStats(firmId, userId);

  res.status(200).json({
    success: true,
    data: stats
  });
});

module.exports = {
  analyzeDocument,
  getAnalysis,
  deleteAnalysis,
  reanalyzeDocument,
  getAnalysisStatus,
  batchAnalyze,
  semanticSearch,
  findSimilar,
  generateReport,
  getAnalysisHistory,
  getStats
};
