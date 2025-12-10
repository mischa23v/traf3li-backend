const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const CaseNotionService = require('../services/caseNotion.service');

// ============================================
// PAGE ENDPOINTS
// ============================================

/**
 * Create a new page
 * POST /api/case-notion/pages
 */
const createPage = asyncHandler(async (req, res) => {
  const { caseId, title, parentId, icon, cover } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!caseId || !title) {
    throw new CustomException('Case ID and title are required', 400);
  }

  const page = await CaseNotionService.createPage({
    caseId,
    title,
    parentId,
    icon,
    cover,
    userId,
    firmId
  });

  res.status(201).json({
    success: true,
    data: page
  });
});

/**
 * Get a single page with all blocks
 * GET /api/case-notion/pages/:pageId
 */
const getPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const page = await CaseNotionService.getPage(pageId, userId, firmId);

  res.status(200).json({
    success: true,
    data: page
  });
});

/**
 * Update page metadata
 * PATCH /api/case-notion/pages/:pageId
 */
const updatePage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { title, icon, cover, properties } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const updatedPage = await CaseNotionService.updatePage(
    pageId,
    { title, icon, cover, properties },
    userId,
    firmId
  );

  res.status(200).json({
    success: true,
    data: updatedPage
  });
});

/**
 * Delete (archive) a page
 * DELETE /api/case-notion/pages/:pageId
 */
const deletePage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  await CaseNotionService.deletePage(pageId, userId, firmId);

  res.status(200).json({
    success: true,
    data: { message: 'Page archived successfully' }
  });
});

/**
 * Duplicate a page
 * POST /api/case-notion/pages/:pageId/duplicate
 */
const duplicatePage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const duplicatedPage = await CaseNotionService.duplicatePage(pageId, userId, firmId);

  res.status(201).json({
    success: true,
    data: duplicatedPage
  });
});

/**
 * Move a page to a new parent
 * POST /api/case-notion/pages/:pageId/move
 */
const movePage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { newParentId, newOrder } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const movedPage = await CaseNotionService.movePage(
    pageId,
    newParentId,
    newOrder,
    userId,
    firmId
  );

  res.status(200).json({
    success: true,
    data: movedPage
  });
});

/**
 * Get all pages for a case (page tree for sidebar)
 * GET /api/case-notion/cases/:caseId/pages
 */
const getCasePages = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!caseId) {
    throw new CustomException('Case ID is required', 400);
  }

  const pages = await CaseNotionService.getCasePages(caseId, userId, firmId);

  res.status(200).json({
    success: true,
    data: pages
  });
});

/**
 * Search pages within a case
 * GET /api/case-notion/cases/:caseId/search
 */
const searchPages = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { q } = req.query;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!caseId) {
    throw new CustomException('Case ID is required', 400);
  }

  if (!q) {
    throw new CustomException('Search query is required', 400);
  }

  const results = await CaseNotionService.searchPages(caseId, q, userId, firmId);

  res.status(200).json({
    success: true,
    data: results
  });
});

/**
 * Get recently accessed pages
 * GET /api/case-notion/pages/recent
 */
const getRecentPages = asyncHandler(async (req, res) => {
  const userId = req.userID;
  const firmId = req.firmId;

  const recentPages = await CaseNotionService.getRecentPages(userId, firmId);

  res.status(200).json({
    success: true,
    data: recentPages
  });
});

/**
 * Toggle favorite status for a page
 * POST /api/case-notion/pages/:pageId/favorite
 */
const toggleFavorite = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const result = await CaseNotionService.toggleFavorite(pageId, userId, firmId);

  res.status(200).json({
    success: true,
    data: result
  });
});

// ============================================
// BLOCK ENDPOINTS
// ============================================

/**
 * Create a new block in a page
 * POST /api/case-notion/pages/:pageId/blocks
 */
const createBlock = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { type, content, parentId, order } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId || !type) {
    throw new CustomException('Page ID and block type are required', 400);
  }

  const block = await CaseNotionService.createBlock({
    pageId,
    type,
    content,
    parentId,
    order,
    userId,
    firmId
  });

  res.status(201).json({
    success: true,
    data: block
  });
});

/**
 * Update a block
 * PATCH /api/case-notion/blocks/:blockId
 */
const updateBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const { content, properties } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId) {
    throw new CustomException('Block ID is required', 400);
  }

  const updatedBlock = await CaseNotionService.updateBlock(
    blockId,
    { content, properties },
    userId,
    firmId
  );

  res.status(200).json({
    success: true,
    data: updatedBlock
  });
});

/**
 * Delete a block
 * DELETE /api/case-notion/blocks/:blockId
 */
const deleteBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId) {
    throw new CustomException('Block ID is required', 400);
  }

  await CaseNotionService.deleteBlock(blockId, userId, firmId);

  res.status(200).json({
    success: true,
    data: { message: 'Block deleted successfully' }
  });
});

/**
 * Move a block to a different location
 * POST /api/case-notion/blocks/:blockId/move
 */
const moveBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const { targetPageId, targetParentId, newOrder } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId) {
    throw new CustomException('Block ID is required', 400);
  }

  const movedBlock = await CaseNotionService.moveBlock(
    blockId,
    { targetPageId, targetParentId, newOrder },
    userId,
    firmId
  );

  res.status(200).json({
    success: true,
    data: movedBlock
  });
});

/**
 * Duplicate a block
 * POST /api/case-notion/blocks/:blockId/duplicate
 */
const duplicateBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId) {
    throw new CustomException('Block ID is required', 400);
  }

  const duplicatedBlock = await CaseNotionService.duplicateBlock(blockId, userId, firmId);

  res.status(201).json({
    success: true,
    data: duplicatedBlock
  });
});

/**
 * Get all blocks for a page
 * GET /api/case-notion/pages/:pageId/blocks
 */
const getPageBlocks = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const blocks = await CaseNotionService.getPageBlocks(pageId, userId, firmId);

  res.status(200).json({
    success: true,
    data: blocks
  });
});

/**
 * Convert a block to a different type
 * POST /api/case-notion/blocks/:blockId/convert
 */
const convertBlockType = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const { newType } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId || !newType) {
    throw new CustomException('Block ID and new type are required', 400);
  }

  const convertedBlock = await CaseNotionService.convertBlockType(
    blockId,
    newType,
    userId,
    firmId
  );

  res.status(200).json({
    success: true,
    data: convertedBlock
  });
});

/**
 * Nest a block under another block
 * POST /api/case-notion/blocks/:blockId/nest
 */
const nestBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const { parentBlockId } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId || !parentBlockId) {
    throw new CustomException('Block ID and parent block ID are required', 400);
  }

  const nestedBlock = await CaseNotionService.nestBlock(
    blockId,
    parentBlockId,
    userId,
    firmId
  );

  res.status(200).json({
    success: true,
    data: nestedBlock
  });
});

/**
 * Unnest a block (move to parent's level)
 * POST /api/case-notion/blocks/:blockId/unnest
 */
const unnestBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId) {
    throw new CustomException('Block ID is required', 400);
  }

  const unnestedBlock = await CaseNotionService.unnestBlock(blockId, userId, firmId);

  res.status(200).json({
    success: true,
    data: unnestedBlock
  });
});

/**
 * Search blocks within a case
 * GET /api/case-notion/cases/:caseId/blocks/search
 */
const searchBlocks = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { q } = req.query;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!caseId) {
    throw new CustomException('Case ID is required', 400);
  }

  if (!q) {
    throw new CustomException('Search query is required', 400);
  }

  const results = await CaseNotionService.searchBlocks(caseId, q, userId, firmId);

  res.status(200).json({
    success: true,
    data: results
  });
});

// ============================================
// SYNCED BLOCK ENDPOINTS
// ============================================

/**
 * Create a new synced block template
 * POST /api/case-notion/synced-blocks
 */
const createSyncedBlock = asyncHandler(async (req, res) => {
  const { name, content, category, description } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!name || !content) {
    throw new CustomException('Name and content are required', 400);
  }

  const syncedBlock = await CaseNotionService.createSyncedBlock({
    name,
    content,
    category,
    description,
    userId,
    firmId
  });

  res.status(201).json({
    success: true,
    data: syncedBlock
  });
});

/**
 * Get all synced blocks
 * GET /api/case-notion/synced-blocks
 */
const getSyncedBlocks = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const userId = req.userID;
  const firmId = req.firmId;

  const syncedBlocks = await CaseNotionService.getSyncedBlocks(category, userId, firmId);

  res.status(200).json({
    success: true,
    data: syncedBlocks
  });
});

/**
 * Get a single synced block
 * GET /api/case-notion/synced-blocks/:syncedBlockId
 */
const getSyncedBlock = asyncHandler(async (req, res) => {
  const { syncedBlockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!syncedBlockId) {
    throw new CustomException('Synced block ID is required', 400);
  }

  const syncedBlock = await CaseNotionService.getSyncedBlock(syncedBlockId, userId, firmId);

  res.status(200).json({
    success: true,
    data: syncedBlock
  });
});

/**
 * Update a synced block
 * PATCH /api/case-notion/synced-blocks/:syncedBlockId
 */
const updateSyncedBlock = asyncHandler(async (req, res) => {
  const { syncedBlockId } = req.params;
  const { content, name } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!syncedBlockId) {
    throw new CustomException('Synced block ID is required', 400);
  }

  const updatedSyncedBlock = await CaseNotionService.updateSyncedBlock(
    syncedBlockId,
    { content, name },
    userId,
    firmId
  );

  res.status(200).json({
    success: true,
    data: updatedSyncedBlock
  });
});

/**
 * Delete a synced block
 * DELETE /api/case-notion/synced-blocks/:syncedBlockId
 */
const deleteSyncedBlock = asyncHandler(async (req, res) => {
  const { syncedBlockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!syncedBlockId) {
    throw new CustomException('Synced block ID is required', 400);
  }

  await CaseNotionService.deleteSyncedBlock(syncedBlockId, userId, firmId);

  res.status(200).json({
    success: true,
    data: { message: 'Synced block deleted successfully' }
  });
});

/**
 * Insert a synced block into a page
 * POST /api/case-notion/synced-blocks/:syncedBlockId/insert
 */
const insertSyncedBlock = asyncHandler(async (req, res) => {
  const { syncedBlockId } = req.params;
  const { pageId, order } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!syncedBlockId || !pageId) {
    throw new CustomException('Synced block ID and page ID are required', 400);
  }

  const insertedBlock = await CaseNotionService.insertSyncedBlock(
    syncedBlockId,
    pageId,
    order,
    userId,
    firmId
  );

  res.status(201).json({
    success: true,
    data: insertedBlock
  });
});

/**
 * Get all instances of a synced block
 * GET /api/case-notion/synced-blocks/:syncedBlockId/instances
 */
const getSyncedBlockInstances = asyncHandler(async (req, res) => {
  const { syncedBlockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!syncedBlockId) {
    throw new CustomException('Synced block ID is required', 400);
  }

  const instances = await CaseNotionService.getSyncedBlockInstances(
    syncedBlockId,
    userId,
    firmId
  );

  res.status(200).json({
    success: true,
    data: instances
  });
});

// ============================================
// DATABASE VIEW ENDPOINTS
// ============================================

/**
 * Create a new database view
 * POST /api/case-notion/pages/:pageId/views
 */
const createView = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { name, type, dataSource, properties, filters, sorts } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId || !name || !type || !dataSource) {
    throw new CustomException('Page ID, name, type, and data source are required', 400);
  }

  const view = await CaseNotionService.createView({
    pageId,
    name,
    type,
    dataSource,
    properties,
    filters,
    sorts,
    userId,
    firmId
  });

  res.status(201).json({
    success: true,
    data: view
  });
});

/**
 * Get all views for a page
 * GET /api/case-notion/pages/:pageId/views
 */
const getViews = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const views = await CaseNotionService.getViews(pageId, userId, firmId);

  res.status(200).json({
    success: true,
    data: views
  });
});

/**
 * Get a single view
 * GET /api/case-notion/views/:viewId
 */
const getView = asyncHandler(async (req, res) => {
  const { viewId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!viewId) {
    throw new CustomException('View ID is required', 400);
  }

  const view = await CaseNotionService.getView(viewId, userId, firmId);

  res.status(200).json({
    success: true,
    data: view
  });
});

/**
 * Update a view
 * PATCH /api/case-notion/views/:viewId
 */
const updateView = asyncHandler(async (req, res) => {
  const { viewId } = req.params;
  const updates = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!viewId) {
    throw new CustomException('View ID is required', 400);
  }

  const updatedView = await CaseNotionService.updateView(viewId, updates, userId, firmId);

  res.status(200).json({
    success: true,
    data: updatedView
  });
});

/**
 * Delete a view
 * DELETE /api/case-notion/views/:viewId
 */
const deleteView = asyncHandler(async (req, res) => {
  const { viewId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!viewId) {
    throw new CustomException('View ID is required', 400);
  }

  await CaseNotionService.deleteView(viewId, userId, firmId);

  res.status(200).json({
    success: true,
    data: { message: 'View deleted successfully' }
  });
});

/**
 * Execute a view and get the formatted data
 * GET /api/case-notion/views/:viewId/data
 */
const executeView = asyncHandler(async (req, res) => {
  const { viewId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!viewId) {
    throw new CustomException('View ID is required', 400);
  }

  const data = await CaseNotionService.executeView(viewId, userId, firmId);

  res.status(200).json({
    success: true,
    data
  });
});

/**
 * Set a view as default for its page
 * POST /api/case-notion/views/:viewId/set-default
 */
const setDefaultView = asyncHandler(async (req, res) => {
  const { viewId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!viewId) {
    throw new CustomException('View ID is required', 400);
  }

  const view = await CaseNotionService.setDefaultView(viewId, userId, firmId);

  res.status(200).json({
    success: true,
    data: view
  });
});

// ============================================
// TEMPLATE ENDPOINTS
// ============================================

/**
 * Save a page as a template
 * POST /api/case-notion/pages/:pageId/save-as-template
 */
const createTemplate = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { name, category, description } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId || !name) {
    throw new CustomException('Page ID and template name are required', 400);
  }

  const template = await CaseNotionService.createTemplate(
    pageId,
    { name, category, description },
    userId,
    firmId
  );

  res.status(201).json({
    success: true,
    data: template
  });
});

/**
 * Get all templates
 * GET /api/case-notion/templates
 */
const getTemplates = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const userId = req.userID;
  const firmId = req.firmId;

  const templates = await CaseNotionService.getTemplates(category, userId, firmId);

  res.status(200).json({
    success: true,
    data: templates
  });
});

/**
 * Create a new page from a template
 * POST /api/case-notion/templates/:templateId/use
 */
const createFromTemplate = asyncHandler(async (req, res) => {
  const { templateId } = req.params;
  const { caseId, title } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!templateId || !caseId) {
    throw new CustomException('Template ID and case ID are required', 400);
  }

  const page = await CaseNotionService.createFromTemplate(
    templateId,
    caseId,
    title,
    userId,
    firmId
  );

  res.status(201).json({
    success: true,
    data: page
  });
});

// ============================================
// AI ENDPOINTS
// ============================================

/**
 * AI autofill for a block
 * POST /api/case-notion/blocks/:blockId/ai-autofill
 */
const aiAutofill = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId) {
    throw new CustomException('Block ID is required', 400);
  }

  const result = await CaseNotionService.aiAutofill(blockId, userId, firmId);

  res.status(200).json({
    success: true,
    data: result
  });
});

/**
 * AI summarize a page
 * POST /api/case-notion/pages/:pageId/ai-summarize
 */
const aiSummarize = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const summary = await CaseNotionService.aiSummarize(pageId, userId, firmId);

  res.status(200).json({
    success: true,
    data: summary
  });
});

/**
 * AI answer a question about case data
 * POST /api/case-notion/cases/:caseId/ai-answer
 */
const aiAnswer = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { question } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!caseId || !question) {
    throw new CustomException('Case ID and question are required', 400);
  }

  const answer = await CaseNotionService.aiAnswer(caseId, question, userId, firmId);

  res.status(200).json({
    success: true,
    data: answer
  });
});

/**
 * AI suggest content for a page
 * POST /api/case-notion/pages/:pageId/ai-suggest
 */
const aiSuggestContent = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { prompt } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId || !prompt) {
    throw new CustomException('Page ID and prompt are required', 400);
  }

  const suggestions = await CaseNotionService.aiSuggestContent(pageId, prompt, userId, firmId);

  res.status(200).json({
    success: true,
    data: suggestions
  });
});

// ============================================
// REAL-TIME/COLLABORATION ENDPOINTS
// ============================================

/**
 * Lock a block for editing
 * POST /api/case-notion/blocks/:blockId/lock
 */
const lockBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId) {
    throw new CustomException('Block ID is required', 400);
  }

  const lock = await CaseNotionService.lockBlock(blockId, userId, firmId);

  res.status(200).json({
    success: true,
    data: lock
  });
});

/**
 * Unlock a block
 * POST /api/case-notion/blocks/:blockId/unlock
 */
const unlockBlock = asyncHandler(async (req, res) => {
  const { blockId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!blockId) {
    throw new CustomException('Block ID is required', 400);
  }

  await CaseNotionService.unlockBlock(blockId, userId, firmId);

  res.status(200).json({
    success: true,
    data: { message: 'Block unlocked successfully' }
  });
});

/**
 * Get all active locks for a page
 * GET /api/case-notion/pages/:pageId/locks
 */
const getActiveLocks = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const locks = await CaseNotionService.getActiveLocks(pageId, userId, firmId);

  res.status(200).json({
    success: true,
    data: locks
  });
});

// ============================================
// EXPORT/IMPORT ENDPOINTS
// ============================================

/**
 * Export a page in various formats
 * GET /api/case-notion/pages/:pageId/export
 */
const exportPage = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const { format } = req.query;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  if (!format || !['markdown', 'html', 'pdf'].includes(format)) {
    throw new CustomException('Valid format (markdown, html, pdf) is required', 400);
  }

  const exported = await CaseNotionService.exportPage(pageId, format, userId, firmId);

  res.status(200).json({
    success: true,
    data: exported
  });
});

/**
 * Import markdown content as a page
 * POST /api/case-notion/cases/:caseId/import
 */
const importMarkdown = asyncHandler(async (req, res) => {
  const { caseId } = req.params;
  const { markdown, title } = req.body;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!caseId || !markdown) {
    throw new CustomException('Case ID and markdown content are required', 400);
  }

  const page = await CaseNotionService.importMarkdown(caseId, markdown, title, userId, firmId);

  res.status(201).json({
    success: true,
    data: page
  });
});

/**
 * Get all backlinks to a page
 * GET /api/case-notion/pages/:pageId/backlinks
 */
const getBacklinks = asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.userID;
  const firmId = req.firmId;

  if (!pageId) {
    throw new CustomException('Page ID is required', 400);
  }

  const backlinks = await CaseNotionService.getBacklinks(pageId, userId, firmId);

  res.status(200).json({
    success: true,
    data: backlinks
  });
});

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Page endpoints
  createPage,
  getPage,
  updatePage,
  deletePage,
  duplicatePage,
  movePage,
  getCasePages,
  searchPages,
  getRecentPages,
  toggleFavorite,

  // Block endpoints
  createBlock,
  updateBlock,
  deleteBlock,
  moveBlock,
  duplicateBlock,
  getPageBlocks,
  convertBlockType,
  nestBlock,
  unnestBlock,
  searchBlocks,

  // Synced block endpoints
  createSyncedBlock,
  getSyncedBlocks,
  getSyncedBlock,
  updateSyncedBlock,
  deleteSyncedBlock,
  insertSyncedBlock,
  getSyncedBlockInstances,

  // Database view endpoints
  createView,
  getViews,
  getView,
  updateView,
  deleteView,
  executeView,
  setDefaultView,

  // Template endpoints
  createTemplate,
  getTemplates,
  createFromTemplate,

  // AI endpoints
  aiAutofill,
  aiSummarize,
  aiAnswer,
  aiSuggestContent,

  // Real-time/collaboration endpoints
  lockBlock,
  unlockBlock,
  getActiveLocks,

  // Export/import endpoints
  exportPage,
  importMarkdown,
  getBacklinks
};
