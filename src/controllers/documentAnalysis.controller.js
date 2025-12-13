const DocumentAnalysis = require('../models/documentAnalysis.model');
const Document = require('../models/document.model');
const documentAnalysisService = require('../services/documentAnalysis.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Start document analysis
 * POST /api/document-analysis/:documentId
 */
const analyzeDocument = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { analysisTypes = ['all'], async = false } = req.body;
  const userId = req.userID;
  const firmId = req.firmId || null;

  // Verify document exists and user has access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود', 404);
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
  const { documentId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId || null;

  // Verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود', 404);
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
  const { documentId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId || null;

  // Verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود', 404);
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
  const { documentId } = req.params;
  const { analysisTypes = ['all'] } = req.body;
  const userId = req.userID;
  const firmId = req.firmId || null;

  // Verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود', 404);
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
  const { documentId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId || null;

  // Verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود', 404);
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
  const { documentIds, analysisTypes = ['all'] } = req.body;
  const userId = req.userID;
  const firmId = req.firmId || null;

  if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    throw CustomException('معرفات المستندات مطلوبة', 400);
  }

  // Verify documents exist and user has access
  const query = { _id: { $in: documentIds } };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const documents = await Document.find(query);

  if (documents.length !== documentIds.length) {
    throw CustomException('بعض المستندات غير موجودة أو ليس لديك صلاحية للوصول إليها', 403);
  }

  // Queue all documents for analysis
  const analyses = await Promise.all(
    documentIds.map(documentId =>
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
  const { q, documentType, riskLevel, page = 1, limit = 20 } = req.query;
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
    query.$or = [
      { 'summary.brief': { $regex: q, $options: 'i' } },
      { 'summary.detailed': { $regex: q, $options: 'i' } },
      { 'summary.keyPoints': { $regex: q, $options: 'i' } },
      { 'entities.value': { $regex: q, $options: 'i' } }
    ];
  }

  const analyses = await DocumentAnalysis.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .populate('documentId', 'fileName originalName category')
    .populate('createdBy', 'firstName lastName fullName');

  const total = await DocumentAnalysis.countDocuments(query);

  res.status(200).json({
    success: true,
    data: analyses,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * Find similar documents
 * GET /api/document-analysis/:documentId/similar
 */
const findSimilar = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const { limit = 10 } = req.query;
  const userId = req.userID;
  const firmId = req.firmId || null;

  // Verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود', 404);
  }

  const similar = await documentAnalysisService.searchSimilarDocuments(
    documentId,
    parseInt(limit)
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
  const { documentId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId || null;

  // Verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود', 404);
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
  const { documentId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId || null;

  // Verify document access
  const query = { _id: documentId };
  if (firmId) {
    query.firmId = firmId;
  } else {
    query.lawyerId = userId;
  }

  const document = await Document.findOne(query);
  if (!document) {
    throw CustomException('المستند غير موجود', 404);
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

  const stats = await DocumentAnalysis.getStats(firmId);

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
