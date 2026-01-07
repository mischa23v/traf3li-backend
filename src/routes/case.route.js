const express = require('express');
const { userMiddleware } = require('../middlewares');
const { cacheResponse, invalidateCache } = require('../middlewares/cache.middleware');
const { sanitizeObjectId } = require('../utils/securityUtils');
const {
    validateCreateCase,
    validateUpdateCase,
    validateUpdateStatus,
    validateAssignLawyer,
    validateAddParty,
    validateLinkDocument,
    validateAddNote,
    validateUpdateNote,
    validateAddHearing,
    validateUpdateHearing,
    validateAddTimelineEvent,
    validateUpdateTimelineEvent,
    validateAddClaim,
    validateUpdateClaim,
    validateUpdateOutcome,
    validateUpdateProgress,
    validateDocumentUploadUrl,
    validateConfirmDocumentUpload,
    validateCreateRichDocument,
    validateUpdateRichDocument,
    validateObjectIdParam,
    validateNestedIdParam,
    validateMoveCaseToStage,
    validateEndCase
} = require('../validators/case.validator');
const casePipelineController = require('../controllers/casePipeline.controller');
const {
    createCase,
    getCases,
    getCase,
    updateCase,
    addNote,
    addDocument,
    addHearing,
    updateStatus,
    updateOutcome,
    closeCase,
    addTimelineEvent,
    addClaim,
    updateHearing,
    updateProgress,
    deleteCase,
    deleteNote,
    deleteHearing,
    deleteDocument,
    deleteClaim,
    deleteTimelineEvent,
    getStatistics,
    // S3 Document Management
    getDocumentUploadUrl,
    confirmDocumentUpload,
    getDocumentDownloadUrl,
    deleteDocumentWithS3,
    // Notes, Claims, Timeline CRUD
    updateNote,
    updateClaim,
    updateTimelineEvent,
    // Audit
    getCaseAudit,
    // Rich Documents (CKEditor)
    createRichDocument,
    getRichDocuments,
    getRichDocument,
    updateRichDocument,
    deleteRichDocument,
    getRichDocumentVersions,
    restoreRichDocumentVersion,
    // Rich Document Export
    exportRichDocumentToPdf,
    exportRichDocumentToLatex,
    exportRichDocumentToMarkdown,
    getRichDocumentPreview,
    // Batch endpoints
    getCasesOverview,
    getCaseFull
} = require('../controllers/case.controller');
const app = express.Router();

// Cache TTL: 300 seconds (5 minutes) for case endpoints
const CASE_CACHE_TTL = 300;

// Cache invalidation patterns for case mutations
const caseInvalidationPatterns = [
    'case:firm:{firmId}:*',         // All case caches for the firm
    'dashboard:firm:{firmId}:*'     // Dashboard caches (case counts, stats)
];

// Cache invalidation patterns for specific case
const specificCaseInvalidationPatterns = [
    'case:firm:{firmId}:{_id}:*',   // Specific case caches
    'case:firm:{firmId}:list:*',    // Case list caches
    'dashboard:firm:{firmId}:*'     // Dashboard caches
];

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ENDPOINT: Cases Overview - Replaces 4 separate API calls
// Returns: cases list, statistics, pipeline stats, client stats
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/overview',
    userMiddleware,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        // Use originalUrl but sanitize to prevent cache poisoning
        const sanitizedUrl = req.originalUrl.replace(/[^a-zA-Z0-9_\-\.\/\?\&\=]/g, '');
        return `case:firm:${req.firmId || 'none'}:overview:${sanitizedUrl}`;
    }),
    getCasesOverview
);

app.get('/statistics',
    userMiddleware,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:statistics`),
    getStatistics
);

app.post('/',
    userMiddleware,
    validateCreateCase,
    invalidateCache(caseInvalidationPatterns),
    createCase
);

app.get('/',
    userMiddleware,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        // Use originalUrl but sanitize to prevent cache poisoning
        const sanitizedUrl = req.originalUrl.replace(/[^a-zA-Z0-9_\-\.\/\?\&\=]/g, '');
        return `case:firm:${req.firmId || 'none'}:list:url:${sanitizedUrl}`;
    }),
    getCases
);

// ==================== PIPELINE (defined before /:_id routes) ====================
app.get('/pipeline',
    userMiddleware,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        // Use originalUrl but sanitize to prevent cache poisoning
        const sanitizedUrl = req.originalUrl.replace(/[^a-zA-Z0-9_\-\.\/\?\&\=]/g, '');
        return `case:firm:${req.firmId || 'none'}:pipeline:${sanitizedUrl}`;
    }),
    casePipelineController.getCasesForPipeline
);

app.get('/pipeline/statistics',
    userMiddleware,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        // Use originalUrl but sanitize to prevent cache poisoning
        const sanitizedUrl = req.originalUrl.replace(/[^a-zA-Z0-9_\-\.\/\?\&\=]/g, '');
        return `case:firm:${req.firmId || 'none'}:pipeline:statistics:${sanitizedUrl}`;
    }),
    casePipelineController.getPipelineStatistics
);

app.get('/pipeline/stages/:category',
    userMiddleware,
    casePipelineController.getValidStages
);

app.get('/pipeline/grouped',
    userMiddleware,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        // Use originalUrl but sanitize to prevent cache poisoning
        const sanitizedUrl = req.originalUrl.replace(/[^a-zA-Z0-9_\-\.\/\?\&\=]/g, '');
        return `case:firm:${req.firmId || 'none'}:pipeline:grouped:${sanitizedUrl}`;
    }),
    casePipelineController.getCasesByStage
);

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ENDPOINT: Case Full Details - Replaces 3 separate API calls
// Returns: case details, audit log, related tasks, documents
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/:_id/full',
    userMiddleware,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        const sanitizedId = sanitizeObjectId(req.params._id);
        if (!sanitizedId) return 'case:invalid:id';
        return `case:firm:${req.firmId || 'none'}:${sanitizedId}:full`;
    }),
    getCaseFull
);

app.get('/:_id',
    userMiddleware,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        const sanitizedId = sanitizeObjectId(req.params._id);
        if (!sanitizedId) return 'case:invalid:id';
        return `case:firm:${req.firmId || 'none'}:${sanitizedId}:details`;
    }),
    getCase
);

app.patch('/:_id',
    userMiddleware,
    validateObjectIdParam,
    validateUpdateCase,
    invalidateCache(specificCaseInvalidationPatterns),
    updateCase
);

app.delete('/:_id',
    userMiddleware,
    validateObjectIdParam,
    invalidateCache(specificCaseInvalidationPatterns),
    deleteCase
);

// Update progress
app.patch('/:_id/progress',
    userMiddleware,
    validateObjectIdParam,
    validateUpdateProgress,
    invalidateCache(specificCaseInvalidationPatterns),
    updateProgress
);

// ==================== NOTES ====================
app.get('/:_id/notes',
    userMiddleware,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        const sanitizedId = sanitizeObjectId(req.params._id);
        if (!sanitizedId) return 'case:invalid:id';
        return `case:firm:${req.firmId || 'none'}:${sanitizedId}:notes`;
    }),
    casePipelineController.getNotes
);

app.post('/:_id/notes',
    userMiddleware,
    validateObjectIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    casePipelineController.addNote
);

// Legacy add note endpoint
app.post('/:_id/note',
    userMiddleware,
    validateObjectIdParam,
    validateAddNote,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    addNote
);

app.put('/:_id/notes/:noteId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    casePipelineController.updateNote
);

// Update note (PATCH)
app.patch('/:_id/notes/:noteId',
    userMiddleware,
    validateNestedIdParam,
    validateUpdateNote,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    updateNote
);

app.delete('/:_id/notes/:noteId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteNote
);

// ==================== S3 DOCUMENTS ====================
// Get upload URL
app.post('/:_id/documents/upload-url',
    userMiddleware,
    validateObjectIdParam,
    validateDocumentUploadUrl,
    getDocumentUploadUrl
);

// Confirm upload
app.post('/:_id/documents/confirm',
    userMiddleware,
    validateObjectIdParam,
    validateConfirmDocumentUpload,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    confirmDocumentUpload
);

// Get download URL
app.get('/:_id/documents/:docId/download',
    userMiddleware,
    validateNestedIdParam,
    getDocumentDownloadUrl
);

// Delete document (with S3)
app.delete('/:_id/documents/:docId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteDocumentWithS3
);

// Legacy document endpoints
app.post('/:_id/document',
    userMiddleware,
    validateObjectIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    addDocument
);

app.delete('/:_id/document/:documentId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteDocument
);

// ==================== HEARINGS ====================
// Add hearing
app.post('/:_id/hearing',
    userMiddleware,
    validateObjectIdParam,
    validateAddHearing,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    addHearing
);

// Update hearing
app.patch('/:_id/hearings/:hearingId',
    userMiddleware,
    validateNestedIdParam,
    validateUpdateHearing,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    updateHearing
);

// Delete hearing
app.delete('/:_id/hearings/:hearingId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    deleteHearing
);

// Legacy hearing update/delete routes
app.patch('/:_id/hearing/:hearingId',
    userMiddleware,
    validateNestedIdParam,
    validateUpdateHearing,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    updateHearing
);

app.delete('/:_id/hearing/:hearingId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    deleteHearing
);

// ==================== TIMELINE ====================
// Add timeline event
app.post('/:_id/timeline',
    userMiddleware,
    validateObjectIdParam,
    validateAddTimelineEvent,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    addTimelineEvent
);

// Update timeline event
app.patch('/:_id/timeline/:eventId',
    userMiddleware,
    validateNestedIdParam,
    validateUpdateTimelineEvent,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    updateTimelineEvent
);

// Delete timeline event
app.delete('/:_id/timeline/:eventId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteTimelineEvent
);

// ==================== CLAIMS ====================
// Add claim
app.post('/:_id/claim',
    userMiddleware,
    validateObjectIdParam,
    validateAddClaim,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    addClaim
);

// Update claim
app.patch('/:_id/claims/:claimId',
    userMiddleware,
    validateNestedIdParam,
    validateUpdateClaim,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    updateClaim
);

// Delete claim
app.delete('/:_id/claims/:claimId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteClaim
);

// Legacy claim delete route
app.delete('/:_id/claim/:claimId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteClaim
);

// ==================== STATUS & OUTCOME ====================
// Update status
app.patch('/:_id/status',
    userMiddleware,
    validateObjectIdParam,
    validateUpdateStatus,
    invalidateCache(specificCaseInvalidationPatterns),
    updateStatus
);

// Update outcome
app.patch('/:_id/outcome',
    userMiddleware,
    validateObjectIdParam,
    validateUpdateOutcome,
    invalidateCache(specificCaseInvalidationPatterns),
    updateOutcome
);

// Close case (for KPI tracking)
app.put('/:_id/close',
    userMiddleware,
    validateObjectIdParam,
    invalidateCache(specificCaseInvalidationPatterns),
    closeCase
);

// ==================== AUDIT ====================
// Get case audit history
app.get('/:_id/audit',
    userMiddleware,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        const sanitizedId = sanitizeObjectId(req.params._id);
        if (!sanitizedId) return 'case:invalid:id';
        return `case:firm:${req.firmId || 'none'}:${sanitizedId}:audit`;
    }),
    getCaseAudit
);

// ==================== RICH DOCUMENTS (CKEditor) ====================
// Create rich document
app.post('/:_id/rich-documents',
    userMiddleware,
    validateObjectIdParam,
    validateCreateRichDocument,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    createRichDocument
);

// Get all rich documents for a case
app.get('/:_id/rich-documents',
    userMiddleware,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        const sanitizedId = sanitizeObjectId(req.params._id);
        if (!sanitizedId) return 'case:invalid:id';
        return `case:firm:${req.firmId || 'none'}:${sanitizedId}:rich-documents:list`;
    }),
    getRichDocuments
);

// Get single rich document
app.get('/:_id/rich-documents/:docId',
    userMiddleware,
    validateNestedIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        const sanitizedId = sanitizeObjectId(req.params._id);
        const sanitizedDocId = sanitizeObjectId(req.params.docId);
        if (!sanitizedId || !sanitizedDocId) return 'case:invalid:id';
        return `case:firm:${req.firmId || 'none'}:${sanitizedId}:rich-documents:${sanitizedDocId}`;
    }),
    getRichDocument
);

// Update rich document
app.patch('/:_id/rich-documents/:docId',
    userMiddleware,
    validateNestedIdParam,
    validateUpdateRichDocument,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    updateRichDocument
);

// Delete rich document
app.delete('/:_id/rich-documents/:docId',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteRichDocument
);

// Get rich document version history
app.get('/:_id/rich-documents/:docId/versions',
    userMiddleware,
    validateNestedIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        const sanitizedId = sanitizeObjectId(req.params._id);
        const sanitizedDocId = sanitizeObjectId(req.params.docId);
        if (!sanitizedId || !sanitizedDocId) return 'case:invalid:id';
        return `case:firm:${req.firmId || 'none'}:${sanitizedId}:rich-documents:${sanitizedDocId}:versions`;
    }),
    getRichDocumentVersions
);

// Restore rich document to a previous version
app.post('/:_id/rich-documents/:docId/versions/:versionNumber/restore',
    userMiddleware,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    restoreRichDocumentVersion
);

// ==================== RICH DOCUMENT EXPORT ====================
// Export to PDF
app.get('/:_id/rich-documents/:docId/export/pdf',
    userMiddleware,
    validateNestedIdParam,
    exportRichDocumentToPdf
);

// Export to LaTeX
app.get('/:_id/rich-documents/:docId/export/latex',
    userMiddleware,
    validateNestedIdParam,
    exportRichDocumentToLatex
);

// Export to Markdown
app.get('/:_id/rich-documents/:docId/export/markdown',
    userMiddleware,
    validateNestedIdParam,
    exportRichDocumentToMarkdown
);

// Get HTML preview
app.get('/:_id/rich-documents/:docId/preview',
    userMiddleware,
    validateNestedIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => {
        const sanitizedId = sanitizeObjectId(req.params._id);
        const sanitizedDocId = sanitizeObjectId(req.params.docId);
        if (!sanitizedId || !sanitizedDocId) return 'case:invalid:id';
        return `case:firm:${req.firmId || 'none'}:${sanitizedId}:rich-documents:${sanitizedDocId}:preview`;
    }),
    getRichDocumentPreview
);

// ==================== PIPELINE CASE ACTIONS ====================
app.patch('/:_id/stage',
    userMiddleware,
    validateObjectIdParam,
    validateMoveCaseToStage,
    invalidateCache(specificCaseInvalidationPatterns),
    casePipelineController.moveCaseToStage
);

app.patch('/:_id/end',
    userMiddleware,
    validateObjectIdParam,
    validateEndCase,
    invalidateCache(specificCaseInvalidationPatterns),
    casePipelineController.endCase
);

module.exports = app;
