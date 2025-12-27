/**
 * Macro Service - Canned Responses and Automated Actions
 *
 * This service provides a high-level API for managing and applying macros.
 * Macros are pre-defined templates with automated actions that can be applied
 * to conversations/tickets for efficient customer support workflows.
 *
 * Features:
 * - Apply macros to conversations with variable substitution
 * - Execute automated actions (status changes, assignments, tags, etc.)
 * - Smart macro suggestions based on conversation content
 * - Access control (personal, team, global scopes)
 * - Usage analytics and tracking
 * - Keyboard shortcuts for quick access
 */

const mongoose = require('mongoose');
const Macro = require('../models/macro.model');
const Conversation = require('../models/conversation.model');
const logger = require('../utils/logger');
const auditLogService = require('./auditLog.service');

class MacroService {
  /**
   * Apply macro to conversation/ticket
   * @param {String} macroId - Macro ID
   * @param {String} conversationId - Conversation ID
   * @param {Object} variables - Variables for template interpolation
   * @param {String} userId - User ID applying the macro
   * @returns {Promise<Object>} Updated conversation and execution result
   */
  async applyMacro(macroId, conversationId, variables = {}, userId, firmId) {
    try {
      // Get macro
      const macro = await Macro.findOne({ _id: macroId, firmId })
        .populate('ownerId', 'firstName lastName')
        .populate('teamId', 'name');

      if (!macro) {
        throw new Error('Macro not found');
      }

      if (!macro.isActive) {
        throw new Error('Macro is not active');
      }

      // Get conversation
      const conversation = await Conversation.findOne({ _id: conversationId, firmId })
        .populate('contactId', 'name email phone');

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check user access to macro
      // Note: userTeams should be passed from the caller, but we'll handle it here
      const userHasAccess = macro.scope === 'global' ||
        (macro.scope === 'personal' && macro.ownerId?._id?.toString() === userId.toString());

      if (!userHasAccess) {
        throw new Error('User does not have access to this macro');
      }

      const executionResult = {
        macroId,
        macroName: macro.name,
        conversationId,
        responseSent: false,
        actionsExecuted: [],
        errors: []
      };

      // Build context for variable interpolation
      const context = {
        conversation: conversation.toObject(),
        contact: conversation.contactId,
        user: { id: userId },
        ...variables
      };

      // If responseTemplate exists, interpolate variables and add message
      if (macro.responseTemplate && macro.responseTemplate.body) {
        try {
          const interpolatedResponse = this.interpolateVariables(
            macro.responseTemplate.body,
            context
          );

          let interpolatedSubject = null;
          if (macro.responseTemplate.subject) {
            interpolatedSubject = this.interpolateVariables(
              macro.responseTemplate.subject,
              context
            );
          }

          // Add message to conversation
          const messageData = {
            direction: 'outbound',
            content: interpolatedResponse,
            contentType: macro.responseTemplate.bodyType || 'text',
            sentBy: new mongoose.Types.ObjectId(userId),
            sentAt: new Date()
          };

          conversation.addMessage(messageData);
          executionResult.responseSent = true;
          executionResult.response = {
            subject: interpolatedSubject,
            body: interpolatedResponse,
            bodyType: macro.responseTemplate.bodyType
          };
        } catch (error) {
          logger.error('MacroService.applyMacro - Response template error:', error.message);
          executionResult.errors.push({
            step: 'response_template',
            error: error.message
          });
        }
      }

      // Execute all actions in order
      const sortedActions = macro.getSortedActions();
      for (const action of sortedActions) {
        try {
          const actionResult = await this.executeAction(action, conversation, context);
          executionResult.actionsExecuted.push({
            type: action.type,
            success: true,
            result: actionResult
          });
        } catch (error) {
          logger.error(`MacroService.applyMacro - Action ${action.type} error:`, error.message);
          executionResult.errors.push({
            step: 'action',
            actionType: action.type,
            error: error.message
          });
          executionResult.actionsExecuted.push({
            type: action.type,
            success: false,
            error: error.message
          });
        }
      }

      // Save conversation
      await conversation.save();

      // Update usage stats
      await macro.recordUsage();

      // Audit log
      await auditLogService.log(
        'apply_macro',
        'conversation',
        conversationId,
        null,
        {
          userId,
          firmId: conversation.firmId,
          details: {
            macroId,
            macroName: macro.name,
            actionsCount: sortedActions.length,
            responseSent: executionResult.responseSent,
            errorsCount: executionResult.errors.length
          }
        }
      );

      return {
        conversation,
        executionResult
      };
    } catch (error) {
      logger.error('MacroService.applyMacro failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute a single action
   * @param {Object} action - Action configuration from macro
   * @param {Object} conversation - Conversation document
   * @param {Object} context - Execution context with variables
   * @returns {Promise<Object>} Action execution result
   */
  async executeAction(action, conversation, context) {
    try {
      // Check condition if specified
      if (action.condition) {
        const conditionMet = this._checkCondition(conversation, action.condition);
        if (!conditionMet) {
          return { skipped: true, reason: 'Condition not met' };
        }
      }

      let result = {};

      switch (action.type) {
        case 'set_status':
          conversation.status = action.value;
          result = { status: action.value };
          break;

        case 'set_priority':
          conversation.priority = action.value;
          result = { priority: action.value };
          break;

        case 'assign_to':
          conversation.assignedTo = new mongoose.Types.ObjectId(action.value);
          result = { assignedTo: action.value };
          break;

        case 'add_tag':
          const tagsToAdd = Array.isArray(action.value) ? action.value : [action.value];
          conversation.tags = conversation.tags || [];
          tagsToAdd.forEach(tag => {
            if (!conversation.tags.includes(tag)) {
              conversation.tags.push(tag);
            }
          });
          result = { tagsAdded: tagsToAdd };
          break;

        case 'remove_tag':
          const tagsToRemove = Array.isArray(action.value) ? action.value : [action.value];
          conversation.tags = conversation.tags || [];
          conversation.tags = conversation.tags.filter(tag => !tagsToRemove.includes(tag));
          result = { tagsRemoved: tagsToRemove };
          break;

        case 'set_field':
          if (!action.field) {
            throw new Error('Field name is required for set_field action');
          }
          conversation.customFields = conversation.customFields || {};

          // Interpolate value if it's a string
          let fieldValue = action.value;
          if (typeof fieldValue === 'string') {
            fieldValue = this.interpolateVariables(fieldValue, context);
          }

          conversation.customFields[action.field] = fieldValue;
          conversation.markModified('customFields');
          result = { field: action.field, value: fieldValue };
          break;

        case 'apply_sla':
          conversation.slaInstanceId = new mongoose.Types.ObjectId(action.value);
          result = { slaInstanceId: action.value };
          break;

        case 'send_notification':
          // Note: This would integrate with a notification service
          // For now, we just log it
          logger.info('MacroService.executeAction - send_notification:', {
            conversationId: conversation._id,
            notification: action.value
          });
          result = { notificationQueued: true, config: action.value };
          break;

        case 'close':
          conversation.close();
          result = { closed: true, reason: action.value?.reason || 'Macro action' };
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return result;
    } catch (error) {
      logger.error('MacroService.executeAction failed:', error.message);
      throw error;
    }
  }

  /**
   * Interpolate variables in template
   * Replaces {{variable_name}} with actual values
   * Supports nested paths like {{customer.name}}
   * @param {String} template - Template string with variables
   * @param {Object} variables - Variables object
   * @returns {String} Interpolated string
   */
  interpolateVariables(template, variables) {
    if (!template || typeof template !== 'string') {
      return template;
    }

    let result = template;

    // Match patterns like {{variable_name}} or {{nested.field.path}}
    const placeholderPattern = /\{\{([a-zA-Z0-9_.]+)\}\}/g;

    result = result.replace(placeholderPattern, (match, fieldPath) => {
      const value = this._getNestedValue(variables, fieldPath);

      // Handle different value types
      if (value === undefined || value === null) {
        return match; // Keep original placeholder if value not found
      }

      if (typeof value === 'object') {
        // For objects, try to stringify nicely
        if (value.toString && value.toString !== Object.prototype.toString) {
          return value.toString();
        }
        return JSON.stringify(value);
      }

      return String(value);
    });

    return result;
  }

  /**
   * Suggest macros based on conversation content
   * @param {String} conversationId - Conversation ID
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Array<String>} userTeams - User's team IDs (optional)
   * @returns {Promise<Array>} Array of suggested macros
   */
  async suggestMacros(conversationId, userId, firmId, userTeams = []) {
    try {
      // Get conversation
      const conversation = await Conversation.findOne({ _id: conversationId, firmId }).lean();
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get last inbound message
      const inboundMessages = conversation.messages.filter(m => m.direction === 'inbound');
      if (inboundMessages.length === 0) {
        // No inbound messages, return popular/recent macros
        return this._getDefaultSuggestions(firmId, userId, userTeams);
      }

      const lastInbound = inboundMessages[inboundMessages.length - 1];

      // Extract keywords from last inbound message
      const keywords = this._extractKeywords(lastInbound.content);

      // Find macros with matching suggestFor keywords
      const keywordMatches = await Macro.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        suggestFor: { $in: keywords },
        $or: [
          { scope: 'global' },
          { scope: 'personal', ownerId: new mongoose.Types.ObjectId(userId) },
          {
            scope: 'team',
            teamId: { $in: userTeams.map(id => new mongoose.Types.ObjectId(id)) }
          }
        ]
      })
        .populate('ownerId', 'firstName lastName')
        .populate('teamId', 'name')
        .sort({ usageCount: -1 })
        .limit(5)
        .lean();

      // Also get recently used macros
      const recentMacros = await this.getRecentMacrosForUser(firmId, userId, userTeams, 3);

      // Also get popular macros
      const popularMacros = await this.getPopularMacros(firmId, 3);

      // Combine and deduplicate
      const suggestions = this._deduplicateMacros([
        ...keywordMatches,
        ...recentMacros,
        ...popularMacros
      ]);

      // Add relevance score
      return suggestions.slice(0, 10).map((macro, index) => ({
        ...macro,
        relevanceScore: this._calculateRelevance(macro, keywords, index),
        matchedKeywords: keywords.filter(k => macro.suggestFor?.includes(k))
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);

    } catch (error) {
      logger.error('MacroService.suggestMacros failed:', error.message);
      return [];
    }
  }

  /**
   * Get macros accessible to user
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @param {Array<String>} userTeams - User's team IDs
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of accessible macros
   */
  async getMacrosForUser(firmId, userId, userTeams = [], options = {}) {
    try {
      const {
        category = null,
        search = null,
        isActive = true,
        limit = 100,
        sort = 'name'
      } = options;

      const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive,
        $or: [
          { scope: 'global' },
          { scope: 'personal', ownerId: new mongoose.Types.ObjectId(userId) },
          {
            scope: 'team',
            teamId: { $in: userTeams.map(id => new mongoose.Types.ObjectId(id)) }
          }
        ]
      };

      // Filter by category if specified
      if (category) {
        query.category = new RegExp(`^${category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      }

      // Search by text if specified
      if (search) {
        query.$text = { $search: search };
      }

      // Determine sort order
      let sortOption = {};
      if (sort === 'usage') {
        sortOption = { usageCount: -1, name: 1 };
      } else if (sort === 'recent') {
        sortOption = { lastUsedAt: -1, name: 1 };
      } else {
        sortOption = { name: 1 };
      }

      const macros = await Macro.find(query)
        .populate('ownerId', 'firstName lastName email')
        .populate('teamId', 'name')
        .populate('createdBy', 'firstName lastName')
        .sort(sortOption)
        .limit(limit)
        .lean();

      return macros;
    } catch (error) {
      logger.error('MacroService.getMacrosForUser failed:', error.message);
      throw error;
    }
  }

  /**
   * Get macro by shortcut
   * @param {String} firmId - Firm ID
   * @param {String} shortcut - Shortcut string (e.g., '/refund')
   * @param {String} userId - User ID
   * @param {Array<String>} userTeams - User's team IDs
   * @returns {Promise<Object|null>} Macro or null
   */
  async getMacroByShortcut(firmId, shortcut, userId, userTeams = []) {
    try {
      const macro = await Macro.findByShortcut(
        firmId,
        shortcut,
        userId,
        userTeams
      );

      return macro;
    } catch (error) {
      logger.error('MacroService.getMacroByShortcut failed:', error.message);
      return null;
    }
  }

  /**
   * Get popular macros
   * @param {String} firmId - Firm ID
   * @param {Number} limit - Number of results (default: 10)
   * @returns {Promise<Array>} Array of popular macros
   */
  async getPopularMacros(firmId, limit = 10) {
    try {
      const macros = await Macro.getPopular(firmId, limit);
      return macros;
    } catch (error) {
      logger.error('MacroService.getPopularMacros failed:', error.message);
      return [];
    }
  }

  /**
   * Get recently used macros for user
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @param {Array<String>} userTeams - User's team IDs
   * @param {Number} limit - Number of results (default: 10)
   * @returns {Promise<Array>} Array of recently used macros
   */
  async getRecentMacrosForUser(firmId, userId, userTeams = [], limit = 10) {
    try {
      const macros = await Macro.find({
        firmId: new mongoose.Types.ObjectId(firmId),
        isActive: true,
        lastUsedAt: { $exists: true },
        $or: [
          { scope: 'global' },
          { scope: 'personal', ownerId: new mongoose.Types.ObjectId(userId) },
          {
            scope: 'team',
            teamId: { $in: userTeams.map(id => new mongoose.Types.ObjectId(id)) }
          }
        ]
      })
        .populate('ownerId', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort({ lastUsedAt: -1 })
        .limit(limit)
        .lean();

      return macros;
    } catch (error) {
      logger.error('MacroService.getRecentMacrosForUser failed:', error.message);
      return [];
    }
  }

  /**
   * Create macro
   * @param {Object} data - Macro data
   * @param {String} userId - User ID creating the macro
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} Created macro
   */
  async createMacro(data, userId, firmId) {
    try {
      // Validate data
      this._validateMacroData(data);

      // Prepare macro data
      const macroData = {
        firmId: new mongoose.Types.ObjectId(firmId),
        name: data.name,
        category: data.category || null,
        description: data.description || null,
        scope: data.scope || 'personal',
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdBy: new mongoose.Types.ObjectId(userId),

        // Response template
        responseTemplate: data.responseTemplate || null,

        // Actions
        actions: data.actions || [],

        // Access control
        ownerId: data.ownerId ? new mongoose.Types.ObjectId(data.ownerId) : new mongoose.Types.ObjectId(userId),
        teamId: data.teamId ? new mongoose.Types.ObjectId(data.teamId) : null,

        // Quick access
        shortcuts: data.shortcuts || [],
        suggestFor: data.suggestFor || [],

        // Metadata
        isFavorite: data.isFavorite || false
      };

      // Validate scope-specific requirements
      if (macroData.scope === 'personal' && !macroData.ownerId) {
        throw new Error('Personal scope requires ownerId');
      }

      if (macroData.scope === 'team' && !macroData.teamId) {
        throw new Error('Team scope requires teamId');
      }

      // Create macro
      const macro = await Macro.create(macroData);

      // Audit log
      await auditLogService.log(
        'create',
        'macro',
        macro._id.toString(),
        null,
        {
          userId,
          firmId,
          details: {
            macroName: macro.name,
            scope: macro.scope,
            hasResponse: !!(macro.responseTemplate && macro.responseTemplate.body),
            actionsCount: macro.actions ? macro.actions.length : 0
          }
        }
      );

      return macro;
    } catch (error) {
      logger.error('MacroService.createMacro failed:', error.message);
      throw error;
    }
  }

  /**
   * Update macro
   * @param {String} macroId - Macro ID
   * @param {Object} data - Update data
   * @param {String} userId - User ID updating the macro
   * @returns {Promise<Object>} Updated macro
   */
  async updateMacro(macroId, data, userId, firmId) {
    try {
      const macro = await Macro.findOne({ _id: macroId, firmId });

      if (!macro) {
        throw new Error('Macro not found');
      }

      // Store before state for audit
      const beforeState = macro.toObject();

      // Update fields
      const updateFields = [
        'name', 'category', 'description', 'scope', 'isActive',
        'responseTemplate', 'actions', 'shortcuts', 'suggestFor',
        'isFavorite', 'ownerId', 'teamId'
      ];

      updateFields.forEach(field => {
        if (data[field] !== undefined) {
          if (field === 'ownerId' && data[field]) {
            macro[field] = new mongoose.Types.ObjectId(data[field]);
          } else if (field === 'teamId' && data[field]) {
            macro[field] = new mongoose.Types.ObjectId(data[field]);
          } else {
            macro[field] = data[field];
          }
        }
      });

      macro.updatedBy = new mongoose.Types.ObjectId(userId);

      await macro.save();

      // Audit log
      await auditLogService.log(
        'update',
        'macro',
        macroId,
        { before: beforeState, after: macro.toObject() },
        {
          userId,
          firmId: macro.firmId,
          details: {
            macroName: macro.name
          }
        }
      );

      return macro;
    } catch (error) {
      logger.error('MacroService.updateMacro failed:', error.message);
      throw error;
    }
  }

  /**
   * Delete macro
   * @param {String} macroId - Macro ID
   * @param {String} userId - User ID deleting the macro
   * @returns {Promise<Object>} Deleted macro
   */
  async deleteMacro(macroId, userId, firmId) {
    try {
      const macro = await Macro.findOne({ _id: macroId, firmId });

      if (!macro) {
        throw new Error('Macro not found');
      }

      const macroName = macro.name;
      const firmId = macro.firmId;

      await macro.deleteOne();

      // Audit log
      await auditLogService.log(
        'delete',
        'macro',
        macroId,
        null,
        {
          userId,
          firmId,
          details: {
            macroName
          }
        }
      );

      return macro;
    } catch (error) {
      logger.error('MacroService.deleteMacro failed:', error.message);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get nested value from object by path
   * @private
   * @param {Object} obj - Object to traverse
   * @param {String} path - Dot-notation path (e.g., 'user.name')
   * @returns {*} Value at path or undefined
   */
  _getNestedValue(obj, path) {
    if (!path) return undefined;

    const parts = path.split('.');
    let value = obj;

    for (const part of parts) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[part];
    }

    return value;
  }

  /**
   * Check if condition matches conversation state
   * @private
   * @param {Object} conversation - Conversation document
   * @param {Object} condition - Condition to check (MongoDB query format)
   * @returns {Boolean} True if condition met
   */
  _checkCondition(conversation, condition) {
    try {
      // Simple condition checking
      // For more complex conditions, consider using a library
      for (const [key, value] of Object.entries(condition)) {
        const conversationValue = this._getNestedValue(conversation, key);

        if (typeof value === 'object' && !Array.isArray(value)) {
          // Handle MongoDB operators like $in, $ne, etc.
          for (const [operator, opValue] of Object.entries(value)) {
            switch (operator) {
              case '$in':
                if (!Array.isArray(opValue) || !opValue.includes(conversationValue)) {
                  return false;
                }
                break;
              case '$ne':
                if (conversationValue === opValue) {
                  return false;
                }
                break;
              case '$gt':
                if (conversationValue <= opValue) {
                  return false;
                }
                break;
              case '$gte':
                if (conversationValue < opValue) {
                  return false;
                }
                break;
              case '$lt':
                if (conversationValue >= opValue) {
                  return false;
                }
                break;
              case '$lte':
                if (conversationValue > opValue) {
                  return false;
                }
                break;
              default:
                logger.warn(`Unknown operator in condition: ${operator}`);
            }
          }
        } else {
          // Simple equality check
          if (conversationValue !== value) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      logger.error('MacroService._checkCondition failed:', error.message);
      return false;
    }
  }

  /**
   * Extract keywords from text for macro suggestions
   * @private
   * @param {String} text - Text to extract keywords from
   * @returns {Array<String>} Array of keywords
   */
  _extractKeywords(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // Convert to lowercase and remove punctuation
    const cleaned = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Split into words
    const words = cleaned.split(' ');

    // Filter out common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their'
    ]);

    const keywords = words
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter((word, index, self) => self.indexOf(word) === index); // Remove duplicates

    return keywords;
  }

  /**
   * Get default macro suggestions (popular and recent)
   * @private
   * @param {String} firmId - Firm ID
   * @param {String} userId - User ID
   * @param {Array<String>} userTeams - User's team IDs
   * @returns {Promise<Array>} Array of suggested macros
   */
  async _getDefaultSuggestions(firmId, userId, userTeams = []) {
    try {
      const popular = await this.getPopularMacros(firmId, 5);
      const recent = await this.getRecentMacrosForUser(firmId, userId, userTeams, 5);

      return this._deduplicateMacros([...popular, ...recent]).slice(0, 10);
    } catch (error) {
      logger.error('MacroService._getDefaultSuggestions failed:', error.message);
      return [];
    }
  }

  /**
   * Deduplicate array of macros by ID
   * @private
   * @param {Array} macros - Array of macro objects
   * @returns {Array} Deduplicated array
   */
  _deduplicateMacros(macros) {
    const seen = new Set();
    return macros.filter(macro => {
      const id = macro._id.toString();
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });
  }

  /**
   * Calculate relevance score for macro suggestion
   * @private
   * @param {Object} macro - Macro object
   * @param {Array<String>} keywords - Extracted keywords
   * @param {Number} index - Position in results
   * @returns {Number} Relevance score
   */
  _calculateRelevance(macro, keywords, index) {
    let score = 0;

    // Keyword matches (highest weight)
    const matchCount = keywords.filter(k => macro.suggestFor?.includes(k)).length;
    score += matchCount * 10;

    // Usage count (medium weight)
    score += (macro.usageCount || 0) * 0.1;

    // Recency (low weight)
    if (macro.lastUsedAt) {
      const daysSinceUse = (Date.now() - new Date(macro.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 5 - daysSinceUse);
    }

    // Position penalty (to break ties)
    score -= index * 0.01;

    return score;
  }

  /**
   * Validate macro data before creation/update
   * @private
   * @param {Object} data - Macro data
   * @throws {Error} If validation fails
   */
  _validateMacroData(data) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new Error('Macro name is required');
    }

    // Validate that at least response or actions exist
    const hasResponse = data.responseTemplate && data.responseTemplate.body;
    const hasActions = data.actions && data.actions.length > 0;

    if (!hasResponse && !hasActions) {
      throw new Error('Macro must have either a response template or actions');
    }

    // Validate actions
    if (data.actions && data.actions.length > 0) {
      data.actions.forEach((action, index) => {
        if (!action.type) {
          throw new Error(`Action ${index}: type is required`);
        }
        if (action.type === 'set_field' && !action.field) {
          throw new Error(`Action ${index}: set_field requires field property`);
        }
        if (action.value === undefined || action.value === null) {
          throw new Error(`Action ${index}: value is required`);
        }
      });
    }

    // Validate scope
    if (data.scope && !['personal', 'team', 'global'].includes(data.scope)) {
      throw new Error('Invalid scope. Must be personal, team, or global');
    }
  }
}

// Export singleton instance
module.exports = new MacroService();
