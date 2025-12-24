/**
 * Command Palette Service
 *
 * Powers keyboard-first navigation and global search for the application.
 * Provides unified interface for commands, global search, recent items, and saved searches.
 *
 * Features:
 * - Command definitions for navigation and actions
 * - Global search across multiple models (leads, clients, cases, tasks, etc.)
 * - Recent item tracking via UserActivity model
 * - Saved search management
 * - Command usage analytics
 */

const mongoose = require('mongoose');
const UserActivity = require('../models/userActivity.model');
const logger = require('../utils/logger');

class CommandPaletteService {
  constructor() {
    // Define available navigation commands
    this.commands = {
      navigation: [
        { id: 'go_dashboard', label: 'Go to Dashboard', keys: ['g', 'd'], icon: 'dashboard', path: '/dashboard' },
        { id: 'go_leads', label: 'Go to Leads', keys: ['g', 'l'], icon: 'users', path: '/leads' },
        { id: 'go_cases', label: 'Go to Cases', keys: ['g', 'c'], icon: 'briefcase', path: '/cases' },
        { id: 'go_tasks', label: 'Go to Tasks', keys: ['g', 't'], icon: 'tasks', path: '/tasks' },
        { id: 'go_invoices', label: 'Go to Invoices', keys: ['g', 'i'], icon: 'file-invoice', path: '/invoices' },
        { id: 'go_clients', label: 'Go to Clients', keys: ['g', 'k'], icon: 'user-tie', path: '/clients' },
        { id: 'go_contacts', label: 'Go to Contacts', keys: ['g', 'o'], icon: 'address-book', path: '/contacts' },
        { id: 'go_calendar', label: 'Go to Calendar', keys: ['g', 'a'], icon: 'calendar', path: '/calendar' },
        { id: 'go_reports', label: 'Go to Reports', keys: ['g', 'r'], icon: 'chart-bar', path: '/reports' },
        { id: 'go_settings', label: 'Go to Settings', keys: ['g', 's'], icon: 'cog', path: '/settings' }
      ],
      actions: [
        { id: 'new_lead', label: 'New Lead', keys: ['n', 'l'], icon: 'plus', action: 'create_lead' },
        { id: 'new_case', label: 'New Case', keys: ['n', 'c'], icon: 'plus', action: 'create_case' },
        { id: 'new_task', label: 'New Task', keys: ['n', 't'], icon: 'plus', action: 'create_task' },
        { id: 'new_invoice', label: 'New Invoice', keys: ['n', 'i'], icon: 'plus', action: 'create_invoice' },
        { id: 'new_client', label: 'New Client', keys: ['n', 'k'], icon: 'plus', action: 'create_client' },
        { id: 'new_contact', label: 'New Contact', keys: ['n', 'o'], icon: 'plus', action: 'create_contact' },
        { id: 'search', label: 'Search', keys: ['/'], icon: 'search', action: 'open_search' },
        { id: 'command_palette', label: 'Command Palette', keys: ['ctrl', 'k'], icon: 'terminal', action: 'open_command_palette' }
      ]
    };
  }

  /**
   * Search across commands and records
   * @param {String} query - Search query
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} options - Search options
   * @param {Number} options.limit - Limit for record results (default: 10)
   * @param {Boolean} options.includeCommands - Include command results (default: true)
   * @param {Boolean} options.includeRecords - Include record results (default: true)
   * @param {Boolean} options.includeRecent - Include recent items (default: true)
   * @param {Boolean} options.includeSavedSearches - Include saved searches (default: true)
   * @returns {Promise<Object>} - Search results
   */
  async search(query, userId, firmId, options = {}) {
    try {
      const {
        limit = 10,
        includeCommands = true,
        includeRecords = true,
        includeRecent = true,
        includeSavedSearches = true
      } = options;

      const results = {
        commands: [],
        records: [],
        recent: [],
        savedSearches: []
      };

      // Search commands by label (if query is provided and includeCommands is true)
      if (query && includeCommands) {
        results.commands = this.searchCommands(query);
      }

      // Global search across records (minimum 2 characters)
      if (query && query.length >= 2 && includeRecords) {
        results.records = await this.globalSearch(query, firmId, limit);
      }

      // Get recent items
      if (includeRecent) {
        results.recent = await this.getRecentItems(userId);
      }

      // Get saved searches
      if (includeSavedSearches) {
        results.savedSearches = await this.getSavedSearches(userId, query);
      }

      return results;
    } catch (error) {
      logger.error('CommandPaletteService.search failed:', error.message);
      return {
        commands: [],
        records: [],
        recent: [],
        savedSearches: [],
        error: error.message
      };
    }
  }

  /**
   * Search commands by label
   * @param {String} query - Search query
   * @returns {Array} - Matching commands
   */
  searchCommands(query) {
    try {
      if (!query || typeof query !== 'string') {
        return [];
      }

      const normalizedQuery = query.toLowerCase().trim();
      const allCommands = [...this.commands.navigation, ...this.commands.actions];

      return allCommands
        .filter(cmd => cmd.label.toLowerCase().includes(normalizedQuery))
        .slice(0, 5);
    } catch (error) {
      logger.error('CommandPaletteService.searchCommands failed:', error.message);
      return [];
    }
  }

  /**
   * Global search across models
   * @param {String} query - Search query
   * @param {String} firmId - Firm ID
   * @param {Number} limit - Maximum results to return (default: 10)
   * @returns {Promise<Array>} - Search results
   */
  async globalSearch(query, firmId, limit = 10) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return [];
      }

      const normalizedQuery = query.trim();

      // Define searchable models and their fields
      const searchModels = [
        { model: 'Lead', fields: ['name', 'email', 'phone', 'company'], displayField: 'name', subtitleField: 'email' },
        { model: 'Contact', fields: ['name', 'email', 'phone'], displayField: 'name', subtitleField: 'email' },
        { model: 'Client', fields: ['name', 'email', 'phone'], displayField: 'name', subtitleField: 'email' },
        { model: 'Case', fields: ['title', 'caseNumber'], displayField: 'title', subtitleField: 'caseNumber' },
        { model: 'Task', fields: ['title', 'description'], displayField: 'title', subtitleField: 'status' },
        { model: 'Invoice', fields: ['invoiceNumber'], displayField: 'invoiceNumber', subtitleField: 'status' }
      ];

      const results = [];

      // Search each model
      for (const { model, fields, displayField, subtitleField } of searchModels) {
        try {
          const Model = mongoose.model(model);

          // Build query with OR conditions for each searchable field
          const $or = fields.map(field => ({
            [field]: { $regex: normalizedQuery, $options: 'i' }
          }));

          // Execute search
          const items = await Model.find({
            firmId: new mongoose.Types.ObjectId(firmId),
            $or
          })
            .limit(5)
            .lean()
            .select(fields.concat([displayField, subtitleField, 'status']))
            .exec();

          // Transform results
          const transformedItems = items.map(item => ({
            type: model.toLowerCase(),
            id: item._id,
            name: item[displayField] || item.title || item.invoiceNumber || 'Untitled',
            subtitle: item[subtitleField] || item.status || '',
            model: model
          }));

          results.push(...transformedItems);
        } catch (modelError) {
          // Model might not exist or query failed, continue to next model
          logger.warn(`CommandPaletteService.globalSearch: Failed to search ${model}:`, modelError.message);
        }
      }

      // Sort by relevance (simple sort, could be enhanced)
      // Prioritize exact matches, then partial matches at start of string
      const sortedResults = results.sort((a, b) => {
        const aNameLower = (a.name || '').toLowerCase();
        const bNameLower = (b.name || '').toLowerCase();
        const queryLower = normalizedQuery.toLowerCase();

        // Exact match
        if (aNameLower === queryLower) return -1;
        if (bNameLower === queryLower) return 1;

        // Starts with query
        if (aNameLower.startsWith(queryLower) && !bNameLower.startsWith(queryLower)) return -1;
        if (bNameLower.startsWith(queryLower) && !aNameLower.startsWith(queryLower)) return 1;

        // Alphabetical
        return aNameLower.localeCompare(bNameLower);
      });

      return sortedResults.slice(0, limit);
    } catch (error) {
      logger.error('CommandPaletteService.globalSearch failed:', error.message);
      return [];
    }
  }

  /**
   * Track record view in user activity
   * @param {String} userId - User ID
   * @param {String} entityType - Entity type (case, client, lead, etc.)
   * @param {String} entityId - Entity ID
   * @param {String} entityName - Entity display name
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Updated activity or null
   */
  async trackRecordView(userId, entityType, entityId, entityName, firmId) {
    try {
      if (!userId || !entityType || !entityId || !entityName) {
        logger.error('CommandPaletteService.trackRecordView: Missing required parameters');
        return null;
      }

      // Get or create user activity
      const activity = await UserActivity.getOrCreate(
        new mongoose.Types.ObjectId(userId),
        firmId ? new mongoose.Types.ObjectId(firmId) : null
      );

      // Track the record view
      await activity.trackRecordView(
        entityType.toLowerCase(),
        new mongoose.Types.ObjectId(entityId),
        entityName
      );

      return activity;
    } catch (error) {
      logger.error('CommandPaletteService.trackRecordView failed:', error.message);
      return null;
    }
  }

  /**
   * Track search query in user activity
   * @param {String} userId - User ID
   * @param {String} query - Search query
   * @param {Number} resultCount - Number of results returned
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Updated activity or null
   */
  async trackSearch(userId, query, resultCount, firmId) {
    try {
      if (!userId || !query) {
        logger.error('CommandPaletteService.trackSearch: Missing required parameters');
        return null;
      }

      // Get or create user activity
      const activity = await UserActivity.getOrCreate(
        new mongoose.Types.ObjectId(userId),
        firmId ? new mongoose.Types.ObjectId(firmId) : null
      );

      // Track the search
      await activity.trackSearch(query, resultCount || 0);

      return activity;
    } catch (error) {
      logger.error('CommandPaletteService.trackSearch failed:', error.message);
      return null;
    }
  }

  /**
   * Track command usage in user activity
   * @param {String} userId - User ID
   * @param {String} command - Command ID or label
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Updated activity or null
   */
  async trackCommand(userId, command, firmId) {
    try {
      if (!userId || !command) {
        logger.error('CommandPaletteService.trackCommand: Missing required parameters');
        return null;
      }

      // Get or create user activity
      const activity = await UserActivity.getOrCreate(
        new mongoose.Types.ObjectId(userId),
        firmId ? new mongoose.Types.ObjectId(firmId) : null
      );

      // Track the command
      await activity.trackCommand(command);

      return activity;
    } catch (error) {
      logger.error('CommandPaletteService.trackCommand failed:', error.message);
      return null;
    }
  }

  /**
   * Get recent items for user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Recent records
   */
  async getRecentItems(userId) {
    try {
      if (!userId) {
        logger.error('CommandPaletteService.getRecentItems: Missing userId');
        return [];
      }

      // Get user activity
      const activity = await UserActivity.findOne({
        userId: new mongoose.Types.ObjectId(userId)
      }).lean();

      if (!activity) {
        return [];
      }

      // Return recent records (limited to 10 most recent)
      return activity.recentRecords?.slice(0, 10) || [];
    } catch (error) {
      logger.error('CommandPaletteService.getRecentItems failed:', error.message);
      return [];
    }
  }

  /**
   * Get saved searches for user
   * @param {String} userId - User ID
   * @param {String} query - Optional filter query
   * @returns {Promise<Array>} - Saved searches
   */
  async getSavedSearches(userId, query = '') {
    try {
      if (!userId) {
        logger.error('CommandPaletteService.getSavedSearches: Missing userId');
        return [];
      }

      // Get user activity
      const activity = await UserActivity.findOne({
        userId: new mongoose.Types.ObjectId(userId)
      }).lean();

      if (!activity) {
        return [];
      }

      let savedSearches = activity.savedSearches || [];

      // Filter by query if provided
      if (query && typeof query === 'string' && query.trim().length > 0) {
        const normalizedQuery = query.toLowerCase().trim();
        savedSearches = savedSearches.filter(search =>
          search.name.toLowerCase().includes(normalizedQuery)
        );
      }

      return savedSearches;
    } catch (error) {
      logger.error('CommandPaletteService.getSavedSearches failed:', error.message);
      return [];
    }
  }

  /**
   * Save a search for user
   * @param {String} userId - User ID
   * @param {String} name - Search name
   * @param {Object} searchQuery - Search query object
   * @param {String} entityType - Entity type (optional)
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Saved search or null
   */
  async saveSearch(userId, name, searchQuery, entityType, firmId) {
    try {
      if (!userId || !name || !searchQuery) {
        logger.error('CommandPaletteService.saveSearch: Missing required parameters');
        return null;
      }

      // Get or create user activity
      const activity = await UserActivity.getOrCreate(
        new mongoose.Types.ObjectId(userId),
        firmId ? new mongoose.Types.ObjectId(firmId) : null
      );

      // Add saved search
      const savedSearch = await activity.addSavedSearch(name, searchQuery, entityType || null);

      return savedSearch;
    } catch (error) {
      logger.error('CommandPaletteService.saveSearch failed:', error.message);
      return null;
    }
  }

  /**
   * Delete a saved search
   * @param {String} userId - User ID
   * @param {String} name - Search name to delete
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object|null>} - Result or null
   */
  async deleteSavedSearch(userId, name, firmId) {
    try {
      if (!userId || !name) {
        logger.error('CommandPaletteService.deleteSavedSearch: Missing required parameters');
        return null;
      }

      // Get user activity
      const activity = await UserActivity.findOne({
        userId: new mongoose.Types.ObjectId(userId)
      });

      if (!activity) {
        logger.error('CommandPaletteService.deleteSavedSearch: User activity not found');
        return null;
      }

      // Remove saved search
      const result = await activity.removeSavedSearch(name);

      return result;
    } catch (error) {
      logger.error('CommandPaletteService.deleteSavedSearch failed:', error.message);
      return null;
    }
  }

  /**
   * Get all available commands
   * @returns {Object} - All commands grouped by category
   */
  getAllCommands() {
    return {
      navigation: [...this.commands.navigation],
      actions: [...this.commands.actions],
      all: [...this.commands.navigation, ...this.commands.actions]
    };
  }

  /**
   * Get command by ID
   * @param {String} commandId - Command ID
   * @returns {Object|null} - Command or null
   */
  getCommandById(commandId) {
    try {
      const allCommands = [...this.commands.navigation, ...this.commands.actions];
      return allCommands.find(cmd => cmd.id === commandId) || null;
    } catch (error) {
      logger.error('CommandPaletteService.getCommandById failed:', error.message);
      return null;
    }
  }

  /**
   * Get recent commands for user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Recent commands
   */
  async getRecentCommands(userId) {
    try {
      if (!userId) {
        logger.error('CommandPaletteService.getRecentCommands: Missing userId');
        return [];
      }

      // Get user activity
      const activity = await UserActivity.findOne({
        userId: new mongoose.Types.ObjectId(userId)
      }).lean();

      if (!activity) {
        return [];
      }

      // Return recent commands (limited to 10 most recent)
      return activity.recentCommands?.slice(0, 10) || [];
    } catch (error) {
      logger.error('CommandPaletteService.getRecentCommands failed:', error.message);
      return [];
    }
  }

  /**
   * Get recent searches for user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - Recent searches
   */
  async getRecentSearches(userId) {
    try {
      if (!userId) {
        logger.error('CommandPaletteService.getRecentSearches: Missing userId');
        return [];
      }

      // Get user activity
      const activity = await UserActivity.findOne({
        userId: new mongoose.Types.ObjectId(userId)
      }).lean();

      if (!activity) {
        return [];
      }

      // Return recent searches (limited to 10 most recent)
      return activity.recentSearches?.slice(0, 10) || [];
    } catch (error) {
      logger.error('CommandPaletteService.getRecentSearches failed:', error.message);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new CommandPaletteService();
