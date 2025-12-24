/**
 * Macro Controller
 * Manages canned responses and automated actions for conversations
 */

const MacroService = require('../services/macro.service');
const { Macro } = require('../models');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ============================================
// SECURITY CONFIGURATION
// ============================================

// Allowed fields for mass assignment protection
const ALLOWED_MACRO_FIELDS = [
  'name', 'category', 'description', 'scope', 'isActive',
  'responseTemplate', 'actions', 'shortcuts', 'suggestFor',
  'isFavorite', 'ownerId', 'teamId'
];

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Get user teams from request
 * @param {Object} req - Request object
 * @returns {Array<String>} Array of team IDs
 */
const getUserTeams = (req) => {
  // Teams could be in various places depending on the auth middleware
  if (req.user?.teams) {
    return Array.isArray(req.user.teams)
      ? req.user.teams.map(t => typeof t === 'string' ? t : t._id?.toString() || t.toString())
      : [];
  }
  if (req.teams) {
    return Array.isArray(req.teams)
      ? req.teams.map(t => typeof t === 'string' ? t : t._id?.toString() || t.toString())
      : [];
  }
  return [];
};

/**
 * Validate macro access
 * @param {Object} macro - Macro document
 * @param {String} userId - User ID
 * @param {Array<String>} userTeams - User's team IDs
 * @returns {Boolean} True if user has access
 */
const canAccessMacro = (macro, userId, userTeams = []) => {
  if (macro.scope === 'global') {
    return true;
  }

  if (macro.scope === 'personal') {
    return macro.ownerId?.toString() === userId.toString();
  }

  if (macro.scope === 'team') {
    return userTeams.some(teamId => teamId === macro.teamId?.toString());
  }

  return false;
};

/**
 * Validate macro modification access
 * Only owner or admin can modify personal/team macros
 * @param {Object} macro - Macro document
 * @param {String} userId - User ID
 * @param {Boolean} isAdmin - Is user admin
 * @returns {Boolean} True if user can modify
 */
const canModifyMacro = (macro, userId, isAdmin = false) => {
  if (isAdmin) {
    return true;
  }

  // Personal macros can only be modified by owner
  if (macro.scope === 'personal') {
    return macro.ownerId?.toString() === userId.toString();
  }

  // Team/global macros can be modified by creator or owner
  return macro.ownerId?.toString() === userId.toString() ||
         macro.createdBy?.toString() === userId.toString();
};

// ============================================
// MACRO CRUD
// ============================================

/**
 * List macros
 * GET /api/macros
 * Query: category, search, page, limit, sort
 */
exports.listMacros = async (req, res) => {
  try {
    const userId = req.userID;
    const firmId = req.firmId;
    const userTeams = getUserTeams(req);

    if (!firmId) {
      return res.status(400).json({
        success: false,
        message: 'Firm ID is required'
      });
    }

    const {
      category = null,
      search = null,
      page = 1,
      limit = 50,
      sort = 'name',
      isActive = 'true'
    } = req.query;

    // Validate pagination parameters
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Get macros using service
    const macros = await MacroService.getMacrosForUser(firmId, userId, userTeams, {
      category,
      search,
      isActive: isActive === 'true',
      limit: limitNum,
      sort
    });

    // For pagination, we need total count
    const query = {
      firmId,
      isActive: isActive === 'true',
      $or: [
        { scope: 'global' },
        { scope: 'personal', ownerId: userId },
        { scope: 'team', teamId: { $in: userTeams } }
      ]
    };

    if (category) {
      query.category = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
    }

    if (search) {
      query.$text = { $search: search };
    }

    const total = await Macro.countDocuments(query);

    res.json({
      success: true,
      data: macros,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    logger.error('Error listing macros:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving macros',
      error: error.message
    });
  }
};

/**
 * Create macro
 * POST /api/macros
 */
exports.createMacro = async (req, res) => {
  try {
    const userId = req.userID;
    const firmId = req.firmId;

    if (!firmId) {
      return res.status(400).json({
        success: false,
        message: 'Firm ID is required'
      });
    }

    // Mass assignment protection - only allow specific fields
    const filteredData = pickAllowedFields(req.body, ALLOWED_MACRO_FIELDS);

    // Validate required fields
    if (!filteredData.name || typeof filteredData.name !== 'string' || filteredData.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Macro name is required'
      });
    }

    // Validate scope
    if (filteredData.scope && !['personal', 'team', 'global'].includes(filteredData.scope)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scope. Must be personal, team, or global'
      });
    }

    // Only admins can create global macros
    if (filteredData.scope === 'global' && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can create global macros'
      });
    }

    // Validate team ID if team scope
    if (filteredData.scope === 'team' && filteredData.teamId) {
      const sanitizedTeamId = sanitizeObjectId(filteredData.teamId);
      if (!sanitizedTeamId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid team ID format'
        });
      }
    }

    // Create macro using service
    const macro = await MacroService.createMacro(filteredData, userId, firmId);

    res.status(201).json({
      success: true,
      message: 'Macro created successfully',
      data: macro
    });
  } catch (error) {
    logger.error('Error creating macro:', error);

    // Handle validation errors
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating macro',
      error: error.message
    });
  }
};

/**
 * Get single macro
 * GET /api/macros/:id
 */
exports.getMacro = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const userTeams = getUserTeams(req);

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid macro ID format'
      });
    }

    // Get macro
    const macro = await Macro.findById(id)
      .populate('ownerId', 'firstName lastName email')
      .populate('teamId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!macro) {
      return res.status(404).json({
        success: false,
        message: 'Macro not found'
      });
    }

    // IDOR protection - verify firm ownership
    if (macro.firmId?.toString() !== firmId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify user has access to this macro
    if (!canAccessMacro(macro, userId, userTeams)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this macro'
      });
    }

    res.json({
      success: true,
      data: macro
    });
  } catch (error) {
    logger.error('Error getting macro:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving macro',
      error: error.message
    });
  }
};

/**
 * Update macro
 * PUT /api/macros/:id
 */
exports.updateMacro = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const userTeams = getUserTeams(req);

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid macro ID format'
      });
    }

    // Get existing macro
    const existingMacro = await Macro.findById(id);

    if (!existingMacro) {
      return res.status(404).json({
        success: false,
        message: 'Macro not found'
      });
    }

    // IDOR protection - verify firm ownership
    if (existingMacro.firmId?.toString() !== firmId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify user can modify this macro
    const isAdmin = req.user?.isAdmin || false;
    if (!canModifyMacro(existingMacro, userId, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to modify this macro'
      });
    }

    // Mass assignment protection - only allow specific fields
    const filteredData = pickAllowedFields(req.body, ALLOWED_MACRO_FIELDS);

    // Validate scope if being changed
    if (filteredData.scope && !['personal', 'team', 'global'].includes(filteredData.scope)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid scope. Must be personal, team, or global'
      });
    }

    // Only admins can change to global scope
    if (filteredData.scope === 'global' && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can set global scope'
      });
    }

    // Update macro using service
    const updatedMacro = await MacroService.updateMacro(id, filteredData, userId);

    res.json({
      success: true,
      message: 'Macro updated successfully',
      data: updatedMacro
    });
  } catch (error) {
    logger.error('Error updating macro:', error);

    // Handle validation errors
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating macro',
      error: error.message
    });
  }
};

/**
 * Delete macro
 * DELETE /api/macros/:id
 */
exports.deleteMacro = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;

    // Validate ID parameter
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid macro ID format'
      });
    }

    // Get existing macro
    const existingMacro = await Macro.findById(id);

    if (!existingMacro) {
      return res.status(404).json({
        success: false,
        message: 'Macro not found'
      });
    }

    // IDOR protection - verify firm ownership
    if (existingMacro.firmId?.toString() !== firmId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify user can modify this macro
    const isAdmin = req.user?.isAdmin || false;
    if (!canModifyMacro(existingMacro, userId, isAdmin)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this macro'
      });
    }

    // Delete macro using service
    await MacroService.deleteMacro(id, userId);

    res.json({
      success: true,
      message: 'Macro deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting macro:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting macro',
      error: error.message
    });
  }
};

// ============================================
// MACRO OPERATIONS
// ============================================

/**
 * Apply macro to conversation
 * POST /api/macros/:id/apply/:conversationId
 */
exports.applyMacro = async (req, res) => {
  try {
    const { id: macroId, conversationId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const userTeams = getUserTeams(req);

    // Validate IDs
    const sanitizedMacroId = sanitizeObjectId(macroId);
    const sanitizedConversationId = sanitizeObjectId(conversationId);

    if (!sanitizedMacroId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid macro ID format'
      });
    }

    if (!sanitizedConversationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format'
      });
    }

    // Get macro to verify access
    const macro = await Macro.findById(macroId);

    if (!macro) {
      return res.status(404).json({
        success: false,
        message: 'Macro not found'
      });
    }

    // IDOR protection - verify firm ownership
    if (macro.firmId?.toString() !== firmId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to macro'
      });
    }

    // Verify user has access to this macro
    if (!canAccessMacro(macro, userId, userTeams)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this macro'
      });
    }

    // Get variables from request body (mass assignment protection)
    const variables = req.body.variables || {};

    // Apply macro using service
    const result = await MacroService.applyMacro(macroId, conversationId, variables, userId);

    res.json({
      success: true,
      message: 'Macro applied successfully',
      data: {
        conversationId: result.conversation._id,
        executionResult: result.executionResult
      }
    });
  } catch (error) {
    logger.error('Error applying macro:', error);

    // Handle specific errors
    if (error.message.includes('not found') || error.message.includes('not active')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('access')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error applying macro',
      error: error.message
    });
  }
};

/**
 * Get macro suggestions for conversation
 * GET /api/macros/suggest/:conversationId
 */
exports.suggestMacros = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const userTeams = getUserTeams(req);

    if (!firmId) {
      return res.status(400).json({
        success: false,
        message: 'Firm ID is required'
      });
    }

    // Validate conversation ID
    const sanitizedConversationId = sanitizeObjectId(conversationId);
    if (!sanitizedConversationId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format'
      });
    }

    // Get suggestions using service
    const suggestions = await MacroService.suggestMacros(conversationId, userId, firmId, userTeams);

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    logger.error('Error getting macro suggestions:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error getting macro suggestions',
      error: error.message
    });
  }
};

/**
 * Get popular macros
 * GET /api/macros/popular
 */
exports.getPopularMacros = async (req, res) => {
  try {
    const firmId = req.firmId;
    const { limit = 10 } = req.query;

    if (!firmId) {
      return res.status(400).json({
        success: false,
        message: 'Firm ID is required'
      });
    }

    // Validate limit
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));

    // Get popular macros using service
    const macros = await MacroService.getPopularMacros(firmId, limitNum);

    res.json({
      success: true,
      data: macros
    });
  } catch (error) {
    logger.error('Error getting popular macros:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving popular macros',
      error: error.message
    });
  }
};

/**
 * Get macro by shortcut
 * GET /api/macros/shortcut/:shortcut
 */
exports.getByShortcut = async (req, res) => {
  try {
    const { shortcut } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const userTeams = getUserTeams(req);

    if (!firmId) {
      return res.status(400).json({
        success: false,
        message: 'Firm ID is required'
      });
    }

    // Validate shortcut
    if (!shortcut || typeof shortcut !== 'string' || shortcut.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Shortcut is required'
      });
    }

    // Get macro by shortcut using service
    const macro = await MacroService.getMacroByShortcut(firmId, shortcut.trim(), userId, userTeams);

    if (!macro) {
      return res.status(404).json({
        success: false,
        message: 'Macro not found with this shortcut'
      });
    }

    res.json({
      success: true,
      data: macro
    });
  } catch (error) {
    logger.error('Error getting macro by shortcut:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving macro',
      error: error.message
    });
  }
};
