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
 * - Dynamic command registration
 * - Permission-based filtering
 * - Frecency-based ranking (frequency + recency)
 * - Keyboard shortcuts management
 * - Context-aware quick actions
 */

const mongoose = require('mongoose');
const UserActivity = require('../models/userActivity.model');
const PermissionEnforcer = require('./permissionEnforcer.service');
const logger = require('../utils/logger');

class CommandPaletteService {
  constructor() {
    // Command registry (in-memory storage for dynamic commands)
    this.commandRegistry = new Map();

    // Initialize with default commands
    this._initializeDefaultCommands();
  }

  /**
   * Initialize default system commands
   * @private
   */
  _initializeDefaultCommands() {
    // Navigation commands
    const navigationCommands = [
      {
        id: 'go_dashboard',
        name: 'Go to Dashboard',
        nameAr: 'الذهاب إلى لوحة القيادة',
        description: 'Navigate to the dashboard',
        descriptionAr: 'الانتقال إلى لوحة القيادة',
        category: 'navigation',
        shortcuts: [{ key: 'd', modifiers: ['g'] }],
        icon: 'dashboard',
        path: '/dashboard',
        permissions: []
      },
      {
        id: 'go_leads',
        name: 'Go to Leads',
        nameAr: 'الذهاب إلى العملاء المحتملين',
        description: 'Navigate to leads list',
        descriptionAr: 'الانتقال إلى قائمة العملاء المحتملين',
        category: 'navigation',
        shortcuts: [{ key: 'l', modifiers: ['g'] }],
        icon: 'users',
        path: '/leads',
        permissions: ['lead.view']
      },
      {
        id: 'go_cases',
        name: 'Go to Cases',
        nameAr: 'الذهاب إلى القضايا',
        description: 'Navigate to cases list',
        descriptionAr: 'الانتقال إلى قائمة القضايا',
        category: 'navigation',
        shortcuts: [{ key: 'c', modifiers: ['g'] }],
        icon: 'briefcase',
        path: '/cases',
        permissions: ['case.view']
      },
      {
        id: 'go_tasks',
        name: 'Go to Tasks',
        nameAr: 'الذهاب إلى المهام',
        description: 'Navigate to tasks list',
        descriptionAr: 'الانتقال إلى قائمة المهام',
        category: 'navigation',
        shortcuts: [{ key: 't', modifiers: ['g'] }],
        icon: 'tasks',
        path: '/tasks',
        permissions: ['task.view']
      },
      {
        id: 'go_invoices',
        name: 'Go to Invoices',
        nameAr: 'الذهاب إلى الفواتير',
        description: 'Navigate to invoices list',
        descriptionAr: 'الانتقال إلى قائمة الفواتير',
        category: 'navigation',
        shortcuts: [{ key: 'i', modifiers: ['g'] }],
        icon: 'file-invoice',
        path: '/invoices',
        permissions: ['invoice.view']
      },
      {
        id: 'go_clients',
        name: 'Go to Clients',
        nameAr: 'الذهاب إلى العملاء',
        description: 'Navigate to clients list',
        descriptionAr: 'الانتقال إلى قائمة العملاء',
        category: 'navigation',
        shortcuts: [{ key: 'k', modifiers: ['g'] }],
        icon: 'user-tie',
        path: '/clients',
        permissions: ['client.view']
      },
      {
        id: 'go_contacts',
        name: 'Go to Contacts',
        nameAr: 'الذهاب إلى جهات الاتصال',
        description: 'Navigate to contacts list',
        descriptionAr: 'الانتقال إلى قائمة جهات الاتصال',
        category: 'navigation',
        shortcuts: [{ key: 'o', modifiers: ['g'] }],
        icon: 'address-book',
        path: '/contacts',
        permissions: ['contact.view']
      },
      {
        id: 'go_calendar',
        name: 'Go to Calendar',
        nameAr: 'الذهاب إلى التقويم',
        description: 'Navigate to calendar',
        descriptionAr: 'الانتقال إلى التقويم',
        category: 'navigation',
        shortcuts: [{ key: 'a', modifiers: ['g'] }],
        icon: 'calendar',
        path: '/calendar',
        permissions: []
      },
      {
        id: 'go_reports',
        name: 'Go to Reports',
        nameAr: 'الذهاب إلى التقارير',
        description: 'Navigate to reports',
        descriptionAr: 'الانتقال إلى التقارير',
        category: 'navigation',
        shortcuts: [{ key: 'r', modifiers: ['g'] }],
        icon: 'chart-bar',
        path: '/reports',
        permissions: ['report.view']
      },
      {
        id: 'go_settings',
        name: 'Go to Settings',
        nameAr: 'الذهاب إلى الإعدادات',
        description: 'Navigate to settings',
        descriptionAr: 'الانتقال إلى الإعدادات',
        category: 'settings',
        shortcuts: [{ key: 's', modifiers: ['g'] }],
        icon: 'cog',
        path: '/settings',
        permissions: ['settings.view']
      }
    ];

    // Create commands
    const createCommands = [
      {
        id: 'create_invoice',
        name: 'Create Invoice',
        nameAr: 'إنشاء فاتورة',
        description: 'Create a new invoice',
        descriptionAr: 'إنشاء فاتورة جديدة',
        category: 'create',
        shortcuts: [{ key: 'i', modifiers: ['n'] }],
        icon: 'plus',
        action: 'create_invoice',
        permissions: ['invoice.create']
      },
      {
        id: 'create_client',
        name: 'Create Client',
        nameAr: 'إنشاء عميل',
        description: 'Create a new client',
        descriptionAr: 'إنشاء عميل جديد',
        category: 'create',
        shortcuts: [{ key: 'k', modifiers: ['n'] }],
        icon: 'plus',
        action: 'create_client',
        permissions: ['client.create']
      },
      {
        id: 'create_case',
        name: 'Create Case',
        nameAr: 'إنشاء قضية',
        description: 'Create a new case',
        descriptionAr: 'إنشاء قضية جديدة',
        category: 'create',
        shortcuts: [{ key: 'c', modifiers: ['n'] }],
        icon: 'plus',
        action: 'create_case',
        permissions: ['case.create']
      },
      {
        id: 'create_lead',
        name: 'Create Lead',
        nameAr: 'إنشاء عميل محتمل',
        description: 'Create a new lead',
        descriptionAr: 'إنشاء عميل محتمل جديد',
        category: 'create',
        shortcuts: [{ key: 'l', modifiers: ['n'] }],
        icon: 'plus',
        action: 'create_lead',
        permissions: ['lead.create']
      },
      {
        id: 'create_task',
        name: 'Create Task',
        nameAr: 'إنشاء مهمة',
        description: 'Create a new task',
        descriptionAr: 'إنشاء مهمة جديدة',
        category: 'create',
        shortcuts: [{ key: 't', modifiers: ['n'] }],
        icon: 'plus',
        action: 'create_task',
        permissions: ['task.create']
      },
      {
        id: 'create_contact',
        name: 'Create Contact',
        nameAr: 'إنشاء جهة اتصال',
        description: 'Create a new contact',
        descriptionAr: 'إنشاء جهة اتصال جديدة',
        category: 'create',
        shortcuts: [{ key: 'o', modifiers: ['n'] }],
        icon: 'plus',
        action: 'create_contact',
        permissions: ['contact.create']
      }
    ];

    // Search commands
    const searchCommands = [
      {
        id: 'search_invoices',
        name: 'Search Invoices',
        nameAr: 'البحث في الفواتير',
        description: 'Search for invoices',
        descriptionAr: 'البحث عن الفواتير',
        category: 'search',
        shortcuts: [{ key: 'f', modifiers: ['ctrl', 'shift'], contextKey: 'i' }],
        icon: 'search',
        action: 'search_invoices',
        permissions: ['invoice.view']
      },
      {
        id: 'search_clients',
        name: 'Search Clients',
        nameAr: 'البحث في العملاء',
        description: 'Search for clients',
        descriptionAr: 'البحث عن العملاء',
        category: 'search',
        shortcuts: [{ key: 'f', modifiers: ['ctrl', 'shift'], contextKey: 'k' }],
        icon: 'search',
        action: 'search_clients',
        permissions: ['client.view']
      },
      {
        id: 'search_cases',
        name: 'Search Cases',
        nameAr: 'البحث في القضايا',
        description: 'Search for cases',
        descriptionAr: 'البحث عن القضايا',
        category: 'search',
        shortcuts: [{ key: 'f', modifiers: ['ctrl', 'shift'], contextKey: 'c' }],
        icon: 'search',
        action: 'search_cases',
        permissions: ['case.view']
      }
    ];

    // Action commands
    const actionCommands = [
      {
        id: 'open_command_palette',
        name: 'Command Palette',
        nameAr: 'لوحة الأوامر',
        description: 'Open command palette',
        descriptionAr: 'فتح لوحة الأوامر',
        category: 'actions',
        shortcuts: [{ key: 'k', modifiers: ['ctrl'] }, { key: 'p', modifiers: ['ctrl'] }],
        icon: 'terminal',
        action: 'open_command_palette',
        permissions: []
      },
      {
        id: 'switch_firm',
        name: 'Switch Firm',
        nameAr: 'تبديل الشركة',
        description: 'Switch to a different firm',
        descriptionAr: 'التبديل إلى شركة أخرى',
        category: 'settings',
        shortcuts: [{ key: 'f', modifiers: ['ctrl', 'shift'] }],
        icon: 'building',
        action: 'switch_firm',
        permissions: []
      },
      {
        id: 'global_search',
        name: 'Global Search',
        nameAr: 'البحث الشامل',
        description: 'Search across all entities',
        descriptionAr: 'البحث في جميع الكيانات',
        category: 'search',
        shortcuts: [{ key: '/', modifiers: [] }],
        icon: 'search',
        action: 'global_search',
        permissions: []
      }
    ];

    // Register all default commands
    [...navigationCommands, ...createCommands, ...searchCommands, ...actionCommands].forEach(cmd => {
      this.commandRegistry.set(cmd.id, cmd);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // COMMAND MANAGEMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Register a new command
   * @param {Object} command - Command configuration
   * @param {String} command.id - Unique command identifier
   * @param {String} command.name - Command name (English)
   * @param {String} command.nameAr - Command name (Arabic)
   * @param {String} command.description - Command description (English)
   * @param {String} command.descriptionAr - Command description (Arabic)
   * @param {String} command.action - Action to execute
   * @param {Array} command.shortcuts - Keyboard shortcuts
   * @param {String} command.category - Command category (navigation, create, search, actions, settings)
   * @param {Array} command.permissions - Required permissions
   * @param {String} command.icon - Icon name
   * @param {String} command.path - Navigation path (optional)
   * @param {Array} command.keywords - Additional search keywords (optional)
   * @returns {Object} - Registered command
   */
  registerCommand(command) {
    try {
      // Validate required fields
      if (!command.id || !command.name || !command.category) {
        logger.error('CommandPaletteService.registerCommand: Missing required fields');
        throw new Error('Command must have id, name, and category');
      }

      // Validate category
      const validCategories = ['navigation', 'create', 'search', 'actions', 'settings'];
      if (!validCategories.includes(command.category)) {
        logger.error(`CommandPaletteService.registerCommand: Invalid category ${command.category}`);
        throw new Error(`Category must be one of: ${validCategories.join(', ')}`);
      }

      // Check if command already exists
      if (this.commandRegistry.has(command.id)) {
        logger.warn(`CommandPaletteService.registerCommand: Command ${command.id} already exists, overwriting`);
      }

      // Normalize command structure
      const normalizedCommand = {
        id: command.id,
        name: command.name,
        nameAr: command.nameAr || command.name,
        description: command.description || '',
        descriptionAr: command.descriptionAr || command.description || '',
        action: command.action || null,
        path: command.path || null,
        shortcuts: command.shortcuts || [],
        category: command.category,
        permissions: command.permissions || [],
        icon: command.icon || 'command',
        keywords: command.keywords || [],
        metadata: command.metadata || {},
        isCustom: true,
        createdAt: new Date()
      };

      // Register command
      this.commandRegistry.set(command.id, normalizedCommand);

      logger.info(`CommandPaletteService.registerCommand: Registered command ${command.id}`);

      return normalizedCommand;
    } catch (error) {
      logger.error('CommandPaletteService.registerCommand failed:', error.message);
      throw error;
    }
  }

  /**
   * Get available commands for a user
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} context - Additional context
   * @param {String} context.userRole - User's role
   * @param {Object} options - Options
   * @param {Boolean} options.includeRecent - Include frecency ranking
   * @param {Boolean} options.filterByPermissions - Filter by user permissions
   * @param {String} options.category - Filter by category
   * @returns {Promise<Object>} - Commands grouped by category with frecency scores
   */
  async getCommands(userId, firmId, context = {}, options = {}) {
    try {
      const {
        includeRecent = true,
        filterByPermissions = true,
        category = null
      } = options;

      // Get all commands from registry
      let commands = Array.from(this.commandRegistry.values());

      // Filter by category if specified
      if (category) {
        commands = commands.filter(cmd => cmd.category === category);
      }

      // Filter by permissions
      if (filterByPermissions && firmId && userId && context.userRole) {
        commands = await this._filterCommandsByPermissions(commands, userId, firmId, context.userRole);
      }

      // Get user activity for frecency calculation
      let recentCommands = [];
      if (includeRecent && userId) {
        const activity = await UserActivity.findOne({
          userId: new mongoose.Types.ObjectId(userId)
        }).lean();

        recentCommands = activity?.recentCommands || [];
      }

      // Calculate frecency scores
      const commandsWithFrecency = commands.map(cmd => {
        const frecency = this._calculateFrecency(cmd.id, recentCommands);
        return {
          ...cmd,
          frecency,
          lastUsed: this._getLastUsed(cmd.id, recentCommands)
        };
      });

      // Sort by frecency (higher first)
      commandsWithFrecency.sort((a, b) => b.frecency - a.frecency);

      // Group by category
      const grouped = {
        navigation: [],
        create: [],
        search: [],
        actions: [],
        settings: [],
        all: commandsWithFrecency
      };

      commandsWithFrecency.forEach(cmd => {
        if (grouped[cmd.category]) {
          grouped[cmd.category].push(cmd);
        }
      });

      return grouped;
    } catch (error) {
      logger.error('CommandPaletteService.getCommands failed:', error.message);
      return {
        navigation: [],
        create: [],
        search: [],
        actions: [],
        settings: [],
        all: []
      };
    }
  }

  /**
   * Search commands with fuzzy matching
   * @param {String} query - Search query
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} context - Additional context
   * @param {String} context.userRole - User's role
   * @param {Object} options - Search options
   * @param {Number} options.limit - Maximum results to return
   * @param {Boolean} options.fuzzy - Enable fuzzy matching
   * @returns {Promise<Array>} - Ranked search results
   */
  async searchCommands(query, userId, firmId, context = {}, options = {}) {
    try {
      const { limit = 10, fuzzy = true } = options;

      if (!query || typeof query !== 'string') {
        return [];
      }

      const normalizedQuery = query.toLowerCase().trim();

      // Get all available commands for user
      const commandsData = await this.getCommands(userId, firmId, context, {
        includeRecent: true,
        filterByPermissions: true
      });
      const commands = commandsData.all;

      // Search and rank commands
      const results = commands.map(cmd => {
        const score = this._calculateSearchScore(cmd, normalizedQuery, fuzzy);
        return { ...cmd, searchScore: score };
      })
        .filter(cmd => cmd.searchScore > 0)
        .sort((a, b) => {
          // Sort by search score first, then by frecency
          if (b.searchScore !== a.searchScore) {
            return b.searchScore - a.searchScore;
          }
          return b.frecency - a.frecency;
        })
        .slice(0, limit);

      return results;
    } catch (error) {
      logger.error('CommandPaletteService.searchCommands failed:', error.message);
      return [];
    }
  }

  /**
   * Execute a command
   * @param {String} commandId - Command ID
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Object} params - Command parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   */
  async executeCommand(commandId, userId, firmId, params = {}, context = {}) {
    try {
      // Validate inputs
      if (!commandId || !userId) {
        logger.error('CommandPaletteService.executeCommand: Missing commandId or userId');
        return {
          success: false,
          error: 'Missing required parameters'
        };
      }

      // Get command
      const command = this.commandRegistry.get(commandId);
      if (!command) {
        logger.error(`CommandPaletteService.executeCommand: Command ${commandId} not found`);
        return {
          success: false,
          error: 'Command not found'
        };
      }

      // Check permissions
      if (command.permissions && command.permissions.length > 0 && firmId && context.userRole) {
        const hasPermission = await this._checkCommandPermissions(
          command,
          userId,
          firmId,
          context.userRole
        );

        if (!hasPermission) {
          logger.warn(`CommandPaletteService.executeCommand: User ${userId} lacks permission for command ${commandId}`);
          return {
            success: false,
            error: 'Insufficient permissions',
            errorAr: 'ليس لديك صلاحية لتنفيذ هذا الأمر'
          };
        }
      }

      // Track command execution
      await this.trackCommand(userId, commandId, firmId);

      // Execute command action
      const result = {
        success: true,
        command: {
          id: command.id,
          name: command.name,
          nameAr: command.nameAr,
          action: command.action,
          path: command.path
        },
        params,
        executedAt: new Date()
      };

      logger.info(`CommandPaletteService.executeCommand: Executed command ${commandId} for user ${userId}`);

      return result;
    } catch (error) {
      logger.error('CommandPaletteService.executeCommand failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get recent commands for a user (with frecency ranking)
   * @param {String} userId - User ID
   * @param {Number} limit - Maximum number of commands to return
   * @returns {Promise<Array>} - Recent commands with details
   */
  async getRecentCommands(userId, limit = 10) {
    try {
      if (!userId) {
        logger.error('CommandPaletteService.getRecentCommands: Missing userId');
        return [];
      }

      // Get user activity
      const activity = await UserActivity.findOne({
        userId: new mongoose.Types.ObjectId(userId)
      }).lean();

      if (!activity || !activity.recentCommands || activity.recentCommands.length === 0) {
        return [];
      }

      // Calculate frecency for each recent command
      const recentWithFrecency = activity.recentCommands
        .map(rc => {
          const command = this.commandRegistry.get(rc.command);
          if (!command) return null;

          const frecency = this._calculateFrecency(rc.command, activity.recentCommands);

          return {
            ...command,
            lastUsed: rc.timestamp,
            frecency
          };
        })
        .filter(cmd => cmd !== null)
        .sort((a, b) => b.frecency - a.frecency)
        .slice(0, limit);

      return recentWithFrecency;
    } catch (error) {
      logger.error('CommandPaletteService.getRecentCommands failed:', error.message);
      return [];
    }
  }

  /**
   * Get context-aware quick actions
   * @param {Object} context - Current context
   * @param {String} context.page - Current page/route
   * @param {String} context.entity - Current entity type
   * @param {String} context.entityId - Current entity ID
   * @param {String} context.userId - User ID
   * @param {String} context.firmId - Firm ID
   * @param {String} context.userRole - User role
   * @returns {Promise<Array>} - Context-aware quick actions
   */
  async getQuickActions(context = {}) {
    try {
      const { page, entity, entityId, userId, firmId, userRole } = context;

      // Get all commands
      const commandsData = await this.getCommands(userId, firmId, { userRole }, {
        includeRecent: true,
        filterByPermissions: true
      });

      const allCommands = commandsData.all;
      const quickActions = [];

      // Page-based quick actions
      if (page) {
        // Navigation quick actions based on current page
        if (page === '/dashboard') {
          quickActions.push(
            ...allCommands.filter(cmd =>
              ['create_invoice', 'create_client', 'create_case', 'global_search'].includes(cmd.id)
            )
          );
        } else if (page.startsWith('/invoices')) {
          quickActions.push(
            ...allCommands.filter(cmd =>
              ['create_invoice', 'search_invoices', 'go_clients'].includes(cmd.id)
            )
          );
        } else if (page.startsWith('/clients')) {
          quickActions.push(
            ...allCommands.filter(cmd =>
              ['create_client', 'search_clients', 'create_case'].includes(cmd.id)
            )
          );
        } else if (page.startsWith('/cases')) {
          quickActions.push(
            ...allCommands.filter(cmd =>
              ['create_case', 'search_cases', 'create_task'].includes(cmd.id)
            )
          );
        }
      }

      // Entity-based quick actions
      if (entity && entityId) {
        // Add entity-specific actions
        const entityActions = {
          invoice: ['create_invoice', 'search_invoices'],
          client: ['create_client', 'create_case', 'create_invoice'],
          case: ['create_task', 'search_cases'],
          lead: ['create_lead', 'go_leads']
        };

        if (entityActions[entity]) {
          quickActions.push(
            ...allCommands.filter(cmd => entityActions[entity].includes(cmd.id))
          );
        }
      }

      // Remove duplicates and limit to 6 quick actions
      const uniqueActions = Array.from(
        new Map(quickActions.map(cmd => [cmd.id, cmd])).values()
      ).slice(0, 6);

      return uniqueActions;
    } catch (error) {
      logger.error('CommandPaletteService.getQuickActions failed:', error.message);
      return [];
    }
  }

  /**
   * Register a keyboard shortcut
   * @param {String} userId - User ID
   * @param {Object} shortcut - Shortcut configuration
   * @param {String} shortcut.commandId - Command ID
   * @param {String} shortcut.key - Key
   * @param {Array} shortcut.modifiers - Modifier keys (ctrl, shift, alt, meta)
   * @param {String} shortcut.description - Shortcut description
   * @returns {Promise<Object>} - Updated shortcuts
   */
  async registerKeyboardShortcut(userId, shortcut) {
    try {
      if (!userId || !shortcut || !shortcut.commandId || !shortcut.key) {
        logger.error('CommandPaletteService.registerKeyboardShortcut: Missing required parameters');
        return null;
      }

      // Verify command exists
      const command = this.commandRegistry.get(shortcut.commandId);
      if (!command) {
        logger.error(`CommandPaletteService.registerKeyboardShortcut: Command ${shortcut.commandId} not found`);
        return null;
      }

      // Get or create user activity
      const activity = await UserActivity.getOrCreate(
        new mongoose.Types.ObjectId(userId),
        null
      );

      // Initialize shortcuts object if not exists
      if (!activity.shortcuts) {
        activity.shortcuts = {};
      }

      // Create shortcut key
      const modifiers = shortcut.modifiers || [];
      const shortcutKey = [...modifiers, shortcut.key].join('+').toLowerCase();

      // Add shortcut
      activity.shortcuts[shortcutKey] = {
        commandId: shortcut.commandId,
        key: shortcut.key,
        modifiers,
        description: shortcut.description || command.description,
        createdAt: new Date()
      };

      await activity.save();

      logger.info(`CommandPaletteService.registerKeyboardShortcut: Registered shortcut ${shortcutKey} for user ${userId}`);

      return activity.shortcuts;
    } catch (error) {
      logger.error('CommandPaletteService.registerKeyboardShortcut failed:', error.message);
      return null;
    }
  }

  /**
   * Get all keyboard shortcuts for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} - User's keyboard shortcuts with command details
   */
  async getKeyboardShortcuts(userId) {
    try {
      if (!userId) {
        logger.error('CommandPaletteService.getKeyboardShortcuts: Missing userId');
        return [];
      }

      // Get default shortcuts from commands
      const allCommands = Array.from(this.commandRegistry.values());
      const defaultShortcuts = [];

      allCommands.forEach(cmd => {
        if (cmd.shortcuts && cmd.shortcuts.length > 0) {
          cmd.shortcuts.forEach(shortcut => {
            const modifiers = shortcut.modifiers || [];
            const shortcutKey = [...modifiers, shortcut.key].join('+').toLowerCase();

            defaultShortcuts.push({
              key: shortcutKey,
              commandId: cmd.id,
              commandName: cmd.name,
              commandNameAr: cmd.nameAr,
              description: cmd.description,
              descriptionAr: cmd.descriptionAr,
              category: cmd.category,
              icon: cmd.icon,
              modifiers,
              keyName: shortcut.key,
              isDefault: true
            });
          });
        }
      });

      // Get user-customized shortcuts
      const activity = await UserActivity.findOne({
        userId: new mongoose.Types.ObjectId(userId)
      }).lean();

      const customShortcuts = [];
      if (activity && activity.shortcuts) {
        Object.entries(activity.shortcuts).forEach(([key, shortcut]) => {
          const command = this.commandRegistry.get(shortcut.commandId);
          if (command) {
            customShortcuts.push({
              key,
              commandId: shortcut.commandId,
              commandName: command.name,
              commandNameAr: command.nameAr,
              description: shortcut.description || command.description,
              category: command.category,
              icon: command.icon,
              modifiers: shortcut.modifiers,
              keyName: shortcut.key,
              isDefault: false,
              createdAt: shortcut.createdAt
            });
          }
        });
      }

      // Merge custom shortcuts with defaults (custom overrides default)
      const shortcutsMap = new Map();

      // Add defaults first
      defaultShortcuts.forEach(s => shortcutsMap.set(s.key, s));

      // Override with custom
      customShortcuts.forEach(s => shortcutsMap.set(s.key, s));

      return Array.from(shortcutsMap.values());
    } catch (error) {
      logger.error('CommandPaletteService.getKeyboardShortcuts failed:', error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Filter commands by user permissions
   * @private
   */
  async _filterCommandsByPermissions(commands, userId, firmId, userRole) {
    const filtered = [];

    for (const cmd of commands) {
      // Commands with no permissions are available to all
      if (!cmd.permissions || cmd.permissions.length === 0) {
        filtered.push(cmd);
        continue;
      }

      // Check if user has any of the required permissions
      let hasPermission = false;
      for (const permission of cmd.permissions) {
        const [resource, action] = permission.split('.');

        try {
          const result = await PermissionEnforcer.check(
            new mongoose.Types.ObjectId(firmId),
            {
              subject: { userId, role: userRole },
              resource: { namespace: resource, type: resource },
              action: action || 'view'
            },
            {},
            { skipLog: true }
          );

          if (result.allowed) {
            hasPermission = true;
            break;
          }
        } catch (error) {
          logger.warn(`Permission check failed for ${permission}:`, error.message);
        }
      }

      if (hasPermission) {
        filtered.push(cmd);
      }
    }

    return filtered;
  }

  /**
   * Check if user has permission to execute a command
   * @private
   */
  async _checkCommandPermissions(command, userId, firmId, userRole) {
    if (!command.permissions || command.permissions.length === 0) {
      return true;
    }

    for (const permission of command.permissions) {
      const [resource, action] = permission.split('.');

      try {
        const result = await PermissionEnforcer.check(
          new mongoose.Types.ObjectId(firmId),
          {
            subject: { userId, role: userRole },
            resource: { namespace: resource, type: resource },
            action: action || 'view'
          },
          {},
          { skipLog: true }
        );

        if (result.allowed) {
          return true;
        }
      } catch (error) {
        logger.warn(`Permission check failed for ${permission}:`, error.message);
      }
    }

    return false;
  }

  /**
   * Calculate frecency score (frequency + recency)
   * @private
   * @param {String} commandId - Command ID
   * @param {Array} recentCommands - Recent command executions
   * @returns {Number} - Frecency score
   */
  _calculateFrecency(commandId, recentCommands) {
    const now = Date.now();
    let score = 0;

    // Find all executions of this command
    const executions = recentCommands.filter(rc => rc.command === commandId);

    if (executions.length === 0) {
      return 0;
    }

    executions.forEach(exec => {
      const ageInDays = (now - new Date(exec.timestamp).getTime()) / (1000 * 60 * 60 * 24);

      // Decay function: more recent = higher score
      // Score decreases exponentially with age
      let recencyScore = Math.exp(-ageInDays / 7); // Half-life of 7 days

      score += recencyScore;
    });

    // Boost by frequency (number of executions)
    score *= (1 + Math.log(executions.length + 1));

    return score;
  }

  /**
   * Get last used timestamp for a command
   * @private
   */
  _getLastUsed(commandId, recentCommands) {
    const executions = recentCommands.filter(rc => rc.command === commandId);
    if (executions.length === 0) return null;

    return executions.reduce((latest, exec) => {
      const execTime = new Date(exec.timestamp);
      return execTime > latest ? execTime : latest;
    }, new Date(0));
  }

  /**
   * Calculate search score for a command
   * @private
   * @param {Object} command - Command object
   * @param {String} query - Search query (normalized)
   * @param {Boolean} fuzzy - Enable fuzzy matching
   * @returns {Number} - Search score (higher is better match)
   */
  _calculateSearchScore(command, query, fuzzy = true) {
    let score = 0;

    const name = (command.name || '').toLowerCase();
    const nameAr = (command.nameAr || '').toLowerCase();
    const description = (command.description || '').toLowerCase();
    const descriptionAr = (command.descriptionAr || '').toLowerCase();
    const keywords = (command.keywords || []).map(k => k.toLowerCase());

    // Exact match in name (highest priority)
    if (name === query || nameAr === query) {
      score += 100;
    }

    // Starts with query in name
    if (name.startsWith(query) || nameAr.startsWith(query)) {
      score += 50;
    }

    // Contains query in name
    if (name.includes(query) || nameAr.includes(query)) {
      score += 30;
    }

    // Contains query in description
    if (description.includes(query) || descriptionAr.includes(query)) {
      score += 15;
    }

    // Keyword match
    keywords.forEach(keyword => {
      if (keyword.includes(query)) {
        score += 20;
      }
    });

    // Fuzzy matching (if enabled and no exact matches)
    if (fuzzy && score === 0) {
      const fuzzyScore = this._fuzzyMatch(name, query) || this._fuzzyMatch(nameAr, query);
      if (fuzzyScore > 0.5) {
        score += fuzzyScore * 10;
      }
    }

    return score;
  }

  /**
   * Simple fuzzy matching algorithm
   * @private
   * @param {String} text - Text to search in
   * @param {String} pattern - Pattern to search for
   * @returns {Number} - Match score (0-1)
   */
  _fuzzyMatch(text, pattern) {
    if (!text || !pattern) return 0;

    let score = 0;
    let patternIdx = 0;
    let bestScore = 0;

    for (let i = 0; i < text.length && patternIdx < pattern.length; i++) {
      if (text[i] === pattern[patternIdx]) {
        score += 1;
        patternIdx++;
      }
    }

    if (patternIdx === pattern.length) {
      bestScore = score / text.length;
    }

    return bestScore;
  }

  // ═══════════════════════════════════════════════════════════════
  // EXISTING METHODS (PRESERVED)
  // ═══════════════════════════════════════════════════════════════

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
   * Get all available commands (without user filtering)
   * @returns {Object} - All commands grouped by category
   */
  getAllCommands() {
    const allCommands = Array.from(this.commandRegistry.values());

    return {
      navigation: allCommands.filter(cmd => cmd.category === 'navigation'),
      create: allCommands.filter(cmd => cmd.category === 'create'),
      search: allCommands.filter(cmd => cmd.category === 'search'),
      actions: allCommands.filter(cmd => cmd.category === 'actions'),
      settings: allCommands.filter(cmd => cmd.category === 'settings'),
      all: allCommands
    };
  }

  /**
   * Get command by ID
   * @param {String} commandId - Command ID
   * @returns {Object|null} - Command or null
   */
  getCommandById(commandId) {
    try {
      return this.commandRegistry.get(commandId) || null;
    } catch (error) {
      logger.error('CommandPaletteService.getCommandById failed:', error.message);
      return null;
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
