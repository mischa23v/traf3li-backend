const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const { cacheResponse, invalidateCache } = require('../middlewares/cache.middleware');
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
    firmFilter,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:overview:${req.originalUrl}`),
    getCasesOverview
);

/**
 * @openapi
 * /api/cases/statistics:
 *   get:
 *     summary: Get case statistics
 *     description: Returns aggregated statistics about cases (by status, type, priority)
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/statistics',
    userMiddleware,
    firmFilter,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:statistics`),
    getStatistics
);

/**
 * @openapi
 * /api/cases:
 *   post:
 *     summary: Create a new case
 *     description: Creates a new legal case in the system
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCaseRequest'
 *     responses:
 *       201:
 *         description: Case created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaseResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
app.post('/',
    userMiddleware,
    firmFilter,
    validateCreateCase,
    invalidateCache(caseInvalidationPatterns),
    createCase
);

/**
 * @openapi
 * /api/cases:
 *   get:
 *     summary: Get all cases
 *     description: Retrieves a paginated list of cases with optional filtering
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/pageParam'
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/sortParam'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, pending, closed, won, lost, settled]
 *         description: Filter by case status
 *       - in: query
 *         name: caseType
 *         schema:
 *           type: string
 *         description: Filter by case type
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filter by client ID
 *     responses:
 *       200:
 *         description: Cases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaseListResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/',
    userMiddleware,
    firmFilter,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:list:url:${req.originalUrl}`),
    getCases
);

// ==================== PIPELINE (defined before /:_id routes) ====================
/**
 * @openapi
 * /api/cases/pipeline:
 *   get:
 *     summary: Get cases for pipeline view
 *     description: Returns cases formatted for pipeline kanban view with linked item counts
 *     tags:
 *       - Cases
 *       - Pipeline
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by case category (labor, commercial, civil, etc.)
 *       - in: query
 *         name: outcome
 *         schema:
 *           type: string
 *           enum: [ongoing, won, lost, settled]
 *         description: Filter by outcome
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         description: Filter by priority
 *     responses:
 *       200:
 *         description: Cases retrieved successfully with pipeline data
 */
app.get('/pipeline',
    userMiddleware,
    firmFilter,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:pipeline:${req.originalUrl}`),
    casePipelineController.getCasesForPipeline
);

/**
 * @openapi
 * /api/cases/pipeline/statistics:
 *   get:
 *     summary: Get pipeline statistics
 *     description: Returns aggregated statistics for pipeline view
 *     tags:
 *       - Cases
 *       - Pipeline
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by case category
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
app.get('/pipeline/statistics',
    userMiddleware,
    firmFilter,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:pipeline:statistics:${req.originalUrl}`),
    casePipelineController.getPipelineStatistics
);

/**
 * @openapi
 * /api/cases/pipeline/stages/{category}:
 *   get:
 *     summary: Get valid stages for category
 *     description: Returns the valid stage IDs for a given case category
 *     tags:
 *       - Cases
 *       - Pipeline
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *         description: Case category (labor, commercial, civil, etc.)
 *     responses:
 *       200:
 *         description: Valid stages retrieved successfully
 */
app.get('/pipeline/stages/:category',
    userMiddleware,
    casePipelineController.getValidStages
);

/**
 * @openapi
 * /api/cases/pipeline/grouped:
 *   get:
 *     summary: Get cases grouped by stage (Kanban board)
 *     description: Returns cases grouped by pipeline stage for Kanban board view
 *     tags:
 *       - Cases
 *       - Pipeline
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by case category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed, all]
 *         description: Filter by status (active excludes closed/completed)
 *     responses:
 *       200:
 *         description: Cases grouped by stage successfully
 */
app.get('/pipeline/grouped',
    userMiddleware,
    firmFilter,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:pipeline:grouped:${req.originalUrl}`),
    casePipelineController.getCasesByStage
);

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH ENDPOINT: Case Full Details - Replaces 3 separate API calls
// Returns: case details, audit log, related tasks, documents
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/:_id/full',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:${req.params._id}:full`),
    getCaseFull
);

/**
 * @openapi
 * /api/cases/{_id}:
 *   get:
 *     summary: Get case by ID
 *     description: Retrieves detailed information about a specific case
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaseResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
app.get('/:_id',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:${req.params._id}:details`),
    getCase
);

/**
 * @openapi
 * /api/cases/{_id}:
 *   patch:
 *     summary: Update case
 *     description: Updates an existing case's information
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCaseRequest'
 *     responses:
 *       200:
 *         description: Case updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaseResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
app.patch('/:_id',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateUpdateCase,
    invalidateCache(specificCaseInvalidationPatterns),
    updateCase
);

/**
 * @openapi
 * /api/cases/{_id}:
 *   delete:
 *     summary: Delete case
 *     description: Deletes a case from the system
 *     tags:
 *       - Cases
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     responses:
 *       200:
 *         description: Case deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Case deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
app.delete('/:_id',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    invalidateCache(specificCaseInvalidationPatterns),
    deleteCase
);

// Update progress
app.patch('/:_id/progress',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateUpdateProgress,
    invalidateCache(specificCaseInvalidationPatterns),
    updateProgress
);

// ==================== NOTES ====================
/**
 * @openapi
 * /api/cases/{_id}/notes:
 *   get:
 *     summary: Get notes for a case
 *     description: Returns all notes for a case with pagination
 *     tags:
 *       - Cases
 *       - Notes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 50
 *         description: Max notes to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           default: 0
 *         description: Skip notes
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -date
 *         description: Sort field (prefix with - for descending)
 *     responses:
 *       200:
 *         description: Notes retrieved successfully
 */
app.get('/:_id/notes',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:${req.params._id}:notes`),
    casePipelineController.getNotes
);

/**
 * @openapi
 * /api/cases/{_id}/notes:
 *   post:
 *     summary: Add a note to a case
 *     description: Add a new note with optional privacy and stage linking
 *     tags:
 *       - Cases
 *       - Notes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Note text content
 *               isPrivate:
 *                 type: boolean
 *                 default: false
 *                 description: Whether note is private to creator
 *               stageId:
 *                 type: string
 *                 description: Link note to specific stage
 *     responses:
 *       200:
 *         description: Note added successfully
 */
app.post('/:_id/notes',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    casePipelineController.addNote
);

// Legacy add note endpoint
app.post('/:_id/note',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateAddNote,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    addNote
);

/**
 * @openapi
 * /api/cases/{_id}/notes/{noteId}:
 *   put:
 *     summary: Update a note
 *     description: Update note text or privacy setting
 *     tags:
 *       - Cases
 *       - Notes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: Note ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Note updated successfully
 */
app.put('/:_id/notes/:noteId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    casePipelineController.updateNote
);

// Update note (PATCH)
app.patch('/:_id/notes/:noteId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    validateUpdateNote,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    updateNote
);

/**
 * @openapi
 * /api/cases/{_id}/notes/{noteId}:
 *   delete:
 *     summary: Delete a note
 *     description: Delete a note from a case
 *     tags:
 *       - Cases
 *       - Notes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note deleted successfully
 */
app.delete('/:_id/notes/:noteId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteNote
);

// ==================== S3 DOCUMENTS ====================
// Get upload URL
app.post('/:_id/documents/upload-url',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateDocumentUploadUrl,
    getDocumentUploadUrl
);

// Confirm upload
app.post('/:_id/documents/confirm',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateConfirmDocumentUpload,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    confirmDocumentUpload
);

// Get download URL
app.get('/:_id/documents/:docId/download',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    getDocumentDownloadUrl
);

// Delete document (with S3)
app.delete('/:_id/documents/:docId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteDocumentWithS3
);

// Legacy document endpoints
app.post('/:_id/document',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    addDocument
);

app.delete('/:_id/document/:documentId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteDocument
);

// ==================== HEARINGS ====================
// Add hearing
app.post('/:_id/hearing',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateAddHearing,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    addHearing
);

// Update hearing
app.patch('/:_id/hearings/:hearingId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    validateUpdateHearing,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    updateHearing
);

// Delete hearing
app.delete('/:_id/hearings/:hearingId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    deleteHearing
);

// Legacy hearing update/delete routes
app.patch('/:_id/hearing/:hearingId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    validateUpdateHearing,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    updateHearing
);

app.delete('/:_id/hearing/:hearingId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*', 'dashboard:firm:{firmId}:*']),
    deleteHearing
);

// ==================== TIMELINE ====================
// Add timeline event
app.post('/:_id/timeline',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateAddTimelineEvent,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    addTimelineEvent
);

// Update timeline event
app.patch('/:_id/timeline/:eventId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    validateUpdateTimelineEvent,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    updateTimelineEvent
);

// Delete timeline event
app.delete('/:_id/timeline/:eventId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteTimelineEvent
);

// ==================== CLAIMS ====================
// Add claim
app.post('/:_id/claim',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateAddClaim,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    addClaim
);

// Update claim
app.patch('/:_id/claims/:claimId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    validateUpdateClaim,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    updateClaim
);

// Delete claim
app.delete('/:_id/claims/:claimId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteClaim
);

// Legacy claim delete route
app.delete('/:_id/claim/:claimId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteClaim
);

// ==================== STATUS & OUTCOME ====================
// Update status
app.patch('/:_id/status',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateUpdateStatus,
    invalidateCache(specificCaseInvalidationPatterns),
    updateStatus
);

// Update outcome
app.patch('/:_id/outcome',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateUpdateOutcome,
    invalidateCache(specificCaseInvalidationPatterns),
    updateOutcome
);

// Close case (for KPI tracking)
app.put('/:_id/close',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    invalidateCache(specificCaseInvalidationPatterns),
    closeCase
);

// ==================== AUDIT ====================
// Get case audit history
app.get('/:_id/audit',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:${req.params._id}:audit`),
    getCaseAudit
);

// ==================== RICH DOCUMENTS (CKEditor) ====================
// Create rich document
app.post('/:_id/rich-documents',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateCreateRichDocument,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    createRichDocument
);

// Get all rich documents for a case
app.get('/:_id/rich-documents',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:${req.params._id}:rich-documents:list`),
    getRichDocuments
);

// Get single rich document
app.get('/:_id/rich-documents/:docId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:${req.params._id}:rich-documents:${req.params.docId}`),
    getRichDocument
);

// Update rich document
app.patch('/:_id/rich-documents/:docId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    validateUpdateRichDocument,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    updateRichDocument
);

// Delete rich document
app.delete('/:_id/rich-documents/:docId',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    deleteRichDocument
);

// Get rich document version history
app.get('/:_id/rich-documents/:docId/versions',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:${req.params._id}:rich-documents:${req.params.docId}:versions`),
    getRichDocumentVersions
);

// Restore rich document to a previous version
app.post('/:_id/rich-documents/:docId/versions/:versionNumber/restore',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    invalidateCache(['case:firm:{firmId}:{_id}:*']),
    restoreRichDocumentVersion
);

// ==================== RICH DOCUMENT EXPORT ====================
// Export to PDF
app.get('/:_id/rich-documents/:docId/export/pdf',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    exportRichDocumentToPdf
);

// Export to LaTeX
app.get('/:_id/rich-documents/:docId/export/latex',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    exportRichDocumentToLatex
);

// Export to Markdown
app.get('/:_id/rich-documents/:docId/export/markdown',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    exportRichDocumentToMarkdown
);

// Get HTML preview
app.get('/:_id/rich-documents/:docId/preview',
    userMiddleware,
    firmFilter,
    validateNestedIdParam,
    cacheResponse(CASE_CACHE_TTL, (req) => `case:firm:${req.firmId || 'none'}:${req.params._id}:rich-documents:${req.params.docId}:preview`),
    getRichDocumentPreview
);

// ==================== PIPELINE CASE ACTIONS ====================
/**
 * @openapi
 * /api/cases/{_id}/stage:
 *   patch:
 *     summary: Move case to stage
 *     description: Move a case to a different stage in the pipeline
 *     tags:
 *       - Cases
 *       - Pipeline
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newStage
 *             properties:
 *               newStage:
 *                 type: string
 *                 description: Target stage ID
 *               notes:
 *                 type: string
 *                 description: Optional notes about the stage change
 *     responses:
 *       200:
 *         description: Case moved successfully
 *       400:
 *         description: Invalid stage for case category
 *       404:
 *         description: Case not found
 */
app.patch('/:_id/stage',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateMoveCaseToStage,
    invalidateCache(specificCaseInvalidationPatterns),
    casePipelineController.moveCaseToStage
);

/**
 * @openapi
 * /api/cases/{_id}/end:
 *   patch:
 *     summary: End case
 *     description: End a case with final outcome
 *     tags:
 *       - Cases
 *       - Pipeline
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: _id
 *         required: true
 *         schema:
 *           type: string
 *         description: Case ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outcome
 *             properties:
 *               outcome:
 *                 type: string
 *                 enum: [won, lost, settled]
 *               endReason:
 *                 type: string
 *                 enum: [final_judgment, settlement, withdrawal, dismissal, reconciliation, execution_complete, other]
 *               finalAmount:
 *                 type: number
 *               notes:
 *                 type: string
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Case ended successfully
 *       400:
 *         description: Case already ended or validation error
 *       404:
 *         description: Case not found
 */
app.patch('/:_id/end',
    userMiddleware,
    firmFilter,
    validateObjectIdParam,
    validateEndCase,
    invalidateCache(specificCaseInvalidationPatterns),
    casePipelineController.endCase
);

module.exports = app;
