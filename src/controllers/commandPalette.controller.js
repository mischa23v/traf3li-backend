/**
 * Command Palette Controller
 *
 * Handles command palette operations including:
 * - Global search across commands and records
 * - Command management and retrieval
 * - Recent items tracking
 * - Saved searches management
 * - Usage analytics tracking
 */

const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const CommandPaletteService = require('../services/commandPalette.service');

/**
 * Search everything (commands, records, recent items)
 * GET /api/command-palette/search
 */
const search = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { q, limit, includeCommands, includeRecords, includeRecent, includeSavedSearches } = req.query;

    // Build options object
    const options = {};
    if (limit) options.limit = parseInt(limit);
    if (includeCommands !== undefined) options.includeCommands = includeCommands === 'true';
    if (includeRecords !== undefined) options.includeRecords = includeRecords === 'true';
    if (includeRecent !== undefined) options.includeRecent = includeRecent === 'true';
    if (includeSavedSearches !== undefined) options.includeSavedSearches = includeSavedSearches === 'true';

    const results = await CommandPaletteService.search(q || '', userId, firmId, options);

    res.status(200).json({
        success: true,
        data: results
    });
});

/**
 * Get all available commands
 * GET /api/command-palette/commands
 */
const getCommands = asyncHandler(async (req, res) => {
    const commands = CommandPaletteService.getAllCommands();

    res.status(200).json({
        success: true,
        data: commands
    });
});

/**
 * Get recent items for user
 * GET /api/command-palette/recent
 */
const getRecentItems = asyncHandler(async (req, res) => {
    const userId = req.userID;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    const recentItems = await CommandPaletteService.getRecentItems(userId);

    res.status(200).json({
        success: true,
        data: recentItems
    });
});

/**
 * Track record view
 * POST /api/command-palette/track/record
 */
const trackRecordView = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['entityType', 'entityId', 'entityName'];
    const trackData = pickAllowedFields(req.body, allowedFields);
    const { entityType, entityId, entityName } = trackData;

    // Validate required fields
    if (!entityType || !entityId || !entityName) {
        throw CustomException('نوع الكيان ومعرف الكيان واسم الكيان مطلوبان', 400);
    }

    // Sanitize entityId to prevent NoSQL injection
    const sanitizedEntityId = sanitizeObjectId(entityId);
    if (!sanitizedEntityId) {
        throw CustomException('معرف الكيان غير صالح', 400);
    }

    // Validate entityType
    const validEntityTypes = ['case', 'client', 'lead', 'contact', 'task', 'invoice'];
    if (!validEntityTypes.includes(entityType.toLowerCase())) {
        throw CustomException('نوع الكيان غير صالح', 400);
    }

    const result = await CommandPaletteService.trackRecordView(
        userId,
        entityType,
        sanitizedEntityId,
        entityName,
        firmId
    );

    res.status(200).json({
        success: true,
        message: 'تم تتبع عرض السجل بنجاح',
        data: result
    });
});

/**
 * Track search query
 * POST /api/command-palette/track/search
 */
const trackSearch = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['query', 'resultCount'];
    const trackData = pickAllowedFields(req.body, allowedFields);
    const { query, resultCount } = trackData;

    // Validate required fields
    if (!query || typeof query !== 'string') {
        throw CustomException('استعلام البحث مطلوب', 400);
    }

    if (query.trim().length === 0) {
        throw CustomException('استعلام البحث لا يمكن أن يكون فارغاً', 400);
    }

    // Validate resultCount if provided
    let validatedResultCount = 0;
    if (resultCount !== undefined) {
        validatedResultCount = parseInt(resultCount);
        if (isNaN(validatedResultCount) || validatedResultCount < 0) {
            throw CustomException('عدد النتائج غير صالح', 400);
        }
    }

    const result = await CommandPaletteService.trackSearch(
        userId,
        query.trim(),
        validatedResultCount,
        firmId
    );

    res.status(200).json({
        success: true,
        message: 'تم تتبع البحث بنجاح',
        data: result
    });
});

/**
 * Track command usage
 * POST /api/command-palette/track/command
 */
const trackCommand = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['command'];
    const trackData = pickAllowedFields(req.body, allowedFields);
    const { command } = trackData;

    // Validate required fields
    if (!command || typeof command !== 'string') {
        throw CustomException('الأمر مطلوب', 400);
    }

    if (command.trim().length === 0) {
        throw CustomException('الأمر لا يمكن أن يكون فارغاً', 400);
    }

    const result = await CommandPaletteService.trackCommand(
        userId,
        command.trim(),
        firmId
    );

    res.status(200).json({
        success: true,
        message: 'تم تتبع استخدام الأمر بنجاح',
        data: result
    });
});

/**
 * Get saved searches for user
 * GET /api/command-palette/saved-searches
 */
const getSavedSearches = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const { q } = req.query;

    if (!userId) {
        throw CustomException('معرف المستخدم مطلوب', 401);
    }

    const savedSearches = await CommandPaletteService.getSavedSearches(userId, q || '');

    res.status(200).json({
        success: true,
        data: savedSearches
    });
});

/**
 * Save a search for user
 * POST /api/command-palette/saved-searches
 */
const saveSearch = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = ['name', 'searchQuery', 'entityType'];
    const searchData = pickAllowedFields(req.body, allowedFields);
    const { name, searchQuery, entityType } = searchData;

    // Validate required fields
    if (!name || typeof name !== 'string') {
        throw CustomException('اسم البحث مطلوب', 400);
    }

    if (name.trim().length === 0) {
        throw CustomException('اسم البحث لا يمكن أن يكون فارغاً', 400);
    }

    if (name.trim().length > 100) {
        throw CustomException('اسم البحث يجب ألا يتجاوز 100 حرف', 400);
    }

    if (!searchQuery || typeof searchQuery !== 'object') {
        throw CustomException('استعلام البحث مطلوب ويجب أن يكون كائناً', 400);
    }

    // Validate entityType if provided
    if (entityType) {
        const validEntityTypes = ['case', 'client', 'lead', 'contact', 'task', 'invoice', 'all'];
        if (!validEntityTypes.includes(entityType.toLowerCase())) {
            throw CustomException('نوع الكيان غير صالح', 400);
        }
    }

    const result = await CommandPaletteService.saveSearch(
        userId,
        name.trim(),
        searchQuery,
        entityType || null,
        firmId
    );

    if (!result) {
        throw CustomException('فشل حفظ البحث', 500);
    }

    res.status(201).json({
        success: true,
        message: 'تم حفظ البحث بنجاح',
        data: result
    });
});

/**
 * Delete a saved search
 * DELETE /api/command-palette/saved-searches/:name
 */
const deleteSavedSearch = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const { name } = req.params;

    // Validate name parameter
    if (!name || typeof name !== 'string') {
        throw CustomException('اسم البحث مطلوب', 400);
    }

    if (name.trim().length === 0) {
        throw CustomException('اسم البحث لا يمكن أن يكون فارغاً', 400);
    }

    const result = await CommandPaletteService.deleteSavedSearch(
        userId,
        decodeURIComponent(name.trim()),
        firmId
    );

    if (!result) {
        throw CustomException('البحث المحفوظ غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف البحث المحفوظ بنجاح'
    });
});

module.exports = {
    search,
    getCommands,
    getRecentItems,
    trackRecordView,
    trackSearch,
    trackCommand,
    getSavedSearches,
    saveSearch,
    deleteSavedSearch
};
