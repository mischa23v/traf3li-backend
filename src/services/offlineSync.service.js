/**
 * Offline Sync Service - PWA Offline Functionality
 *
 * This service provides offline sync capabilities for PWA functionality.
 * It manages data synchronization between online and offline states,
 * handles conflict resolution, and provides data manifests for caching.
 *
 * Features:
 * - Generate sync manifests for offline caching
 * - Provide essential data for offline operation
 * - Process queued changes from offline mode
 * - Resolve sync conflicts
 * - Track last sync timestamps
 * - Validate offline changes before applying
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const AuditLogService = require('./auditLog.service');

class OfflineSyncService {
  /**
   * Generate manifest of data to cache for offline use
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Sync manifest with entity types and counts
   */
  async generateSyncManifest(userId, firmId) {
    try {
      const User = require('../models/user.model');
      const Client = require('../models/client.model');
      const Invoice = require('../models/invoice.model');
      const Case = require('../models/case.model');
      const Expense = require('../models/expense.model');

      // Get counts for each entity type
      const [clientCount, invoiceCount, caseCount, expenseCount] = await Promise.all([
        Client.countDocuments({
          $or: [{ firmId }, { lawyerId: userId }]
        }).limit(50),
        Invoice.countDocuments({
          $or: [{ firmId }, { lawyerId: userId }]
        }).limit(100),
        Case.countDocuments({
          $or: [{ firmId }, { lawyerId: userId }]
        }),
        Expense.countDocuments({
          $or: [{ firmId }, { lawyerId: userId }]
        })
      ]);

      const manifest = {
        version: '1.0.0',
        generatedAt: new Date(),
        userId,
        firmId,
        entities: {
          user: {
            type: 'user',
            count: 1,
            priority: 1,
            cacheStrategy: 'always'
          },
          clients: {
            type: 'client',
            count: Math.min(clientCount, 50),
            priority: 2,
            cacheStrategy: 'recent',
            limit: 50
          },
          invoices: {
            type: 'invoice',
            count: Math.min(invoiceCount, 100),
            priority: 3,
            cacheStrategy: 'recent',
            limit: 100
          },
          cases: {
            type: 'case',
            count: caseCount,
            priority: 4,
            cacheStrategy: 'all'
          },
          expenses: {
            type: 'expense',
            count: expenseCount,
            priority: 5,
            cacheStrategy: 'recent'
          },
          settings: {
            type: 'settings',
            count: 1,
            priority: 1,
            cacheStrategy: 'always'
          }
        },
        totalSize: clientCount + invoiceCount + caseCount + expenseCount + 2
      };

      return manifest;
    } catch (error) {
      logger.error('OfflineSyncService.generateSyncManifest failed:', error.message);
      throw error;
    }
  }

  /**
   * Get essential data for offline caching
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Array<String>} entityTypes - Entity types to fetch (optional)
   * @returns {Promise<Object>} - Offline cache data
   */
  async getDataForOfflineCache(userId, firmId, entityTypes = []) {
    try {
      const User = require('../models/user.model');
      const Client = require('../models/client.model');
      const Invoice = require('../models/invoice.model');
      const Case = require('../models/case.model');
      const Expense = require('../models/expense.model');
      const BillingRate = require('../models/billingRate.model');
      const Account = require('../models/account.model');

      // Default to all entity types if none specified
      const types = entityTypes.length > 0 ? entityTypes : [
        'user', 'clients', 'invoices', 'cases', 'expenses',
        'billingRates', 'expenseCategories', 'paymentMethods'
      ];

      const data = {};

      // Fetch user profile and settings
      if (types.includes('user')) {
        const user = await User.findById(userId)
          .select('-password -passwordResetToken -refreshTokens')
          .lean();
        data.user = user;
      }

      // Fetch recent clients (last 50)
      if (types.includes('clients')) {
        const clients = await Client.find({
          $or: [{ firmId }, { lawyerId: userId }]
        })
          .sort({ updatedAt: -1, createdAt: -1 })
          .limit(50)
          .select('-__v')
          .lean();
        data.clients = clients;
      }

      // Fetch recent invoices (last 100)
      if (types.includes('invoices')) {
        const invoices = await Invoice.find({
          $or: [{ firmId }, { lawyerId: userId }]
        })
          .sort({ invoiceDate: -1, createdAt: -1 })
          .limit(100)
          .populate('clientId', 'firstName lastName companyName email')
          .select('-__v')
          .lean();
        data.invoices = invoices;
      }

      // Fetch all cases
      if (types.includes('cases')) {
        const cases = await Case.find({
          $or: [{ firmId }, { lawyerId: userId }]
        })
          .sort({ updatedAt: -1 })
          .populate('clientId', 'firstName lastName companyName')
          .select('-__v')
          .lean();
        data.cases = cases;
      }

      // Fetch recent expenses
      if (types.includes('expenses')) {
        const expenses = await Expense.find({
          $or: [{ firmId }, { lawyerId: userId }]
        })
          .sort({ date: -1 })
          .limit(100)
          .select('-__v')
          .lean();
        data.expenses = expenses;
      }

      // Fetch billing rates
      if (types.includes('billingRates')) {
        const billingRates = await BillingRate.find({
          $or: [{ firmId }, { lawyerId: userId }]
        })
          .select('-__v')
          .lean();
        data.billingRates = billingRates;
      }

      // Fetch expense categories (from Chart of Accounts)
      if (types.includes('expenseCategories')) {
        const expenseCategories = await Account.find({
          $or: [{ firmId }, { lawyerId: userId }],
          accountType: 'expense'
        })
          .select('accountCode accountName accountType')
          .lean();
        data.expenseCategories = expenseCategories;
      }

      // Fetch payment methods (from Chart of Accounts)
      if (types.includes('paymentMethods')) {
        const paymentMethods = await Account.find({
          $or: [{ firmId }, { lawyerId: userId }],
          accountType: { $in: ['bank', 'cash'] }
        })
          .select('accountCode accountName accountType')
          .lean();
        data.paymentMethods = paymentMethods;
      }

      // Add metadata
      data._metadata = {
        fetchedAt: new Date(),
        userId,
        firmId,
        entityTypes: types,
        version: '1.0.0'
      };

      return data;
    } catch (error) {
      logger.error('OfflineSyncService.getDataForOfflineCache failed:', error.message);
      throw error;
    }
  }

  /**
   * Process queued changes from offline mode
   * @param {String} userId - User ID
   * @param {Array<Object>} changes - Array of changes to process
   * @returns {Promise<Object>} - Processing results with success/failure counts
   */
  async processSyncQueue(userId, changes) {
    try {
      const results = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        conflicts: [],
        errors: [],
        details: []
      };

      for (const change of changes) {
        results.processed++;

        try {
          // Validate change structure
          const validationResult = await this.validateOfflineChanges([change]);
          if (!validationResult.valid) {
            results.failed++;
            results.errors.push({
              changeId: change.id,
              entityType: change.entityType,
              error: validationResult.errors[0]
            });
            continue;
          }

          // Process based on operation type
          const result = await this._processChange(userId, change);

          if (result.conflict) {
            results.conflicts.push({
              changeId: change.id,
              entityType: change.entityType,
              entityId: change.entityId,
              conflict: result.conflict
            });
          } else if (result.success) {
            results.succeeded++;
            results.details.push({
              changeId: change.id,
              entityType: change.entityType,
              entityId: result.entityId,
              operation: change.operation
            });
          } else {
            results.failed++;
            results.errors.push({
              changeId: change.id,
              entityType: change.entityType,
              error: result.error
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            changeId: change.id,
            entityType: change.entityType,
            error: error.message
          });
          logger.error(`OfflineSyncService.processSyncQueue: Failed to process change ${change.id}:`, error.message);
        }
      }

      // Log sync activity
      await AuditLogService.log(
        'offline_sync',
        'sync',
        null,
        null,
        {
          userId,
          details: {
            processed: results.processed,
            succeeded: results.succeeded,
            failed: results.failed,
            conflicts: results.conflicts.length
          }
        }
      );

      return results;
    } catch (error) {
      logger.error('OfflineSyncService.processSyncQueue failed:', error.message);
      throw error;
    }
  }

  /**
   * Resolve sync conflicts
   * @param {String} userId - User ID
   * @param {Array<Object>} conflicts - Conflicts to resolve
   * @returns {Promise<Object>} - Resolution results
   */
  async resolveConflicts(userId, conflicts) {
    try {
      const results = {
        resolved: 0,
        failed: 0,
        details: []
      };

      for (const conflict of conflicts) {
        try {
          const { entityType, entityId, resolution, localData, serverData } = conflict;

          // Apply resolution strategy
          let result;
          switch (resolution) {
            case 'useLocal':
              result = await this._applyLocalChanges(entityType, entityId, localData);
              break;
            case 'useServer':
              result = { success: true, strategy: 'useServer' };
              break;
            case 'merge':
              result = await this._mergeChanges(entityType, entityId, localData, serverData);
              break;
            default:
              throw new Error(`Unknown resolution strategy: ${resolution}`);
          }

          if (result.success) {
            results.resolved++;
            results.details.push({
              entityType,
              entityId,
              resolution,
              applied: true
            });
          } else {
            results.failed++;
            results.details.push({
              entityType,
              entityId,
              resolution,
              error: result.error
            });
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            error: error.message
          });
          logger.error('OfflineSyncService.resolveConflicts: Failed to resolve conflict:', error.message);
        }
      }

      return results;
    } catch (error) {
      logger.error('OfflineSyncService.resolveConflicts failed:', error.message);
      throw error;
    }
  }

  /**
   * Get last sync timestamp for user
   * @param {String} userId - User ID
   * @returns {Promise<Date|null>} - Last sync timestamp
   */
  async getLastSyncTimestamp(userId) {
    try {
      const User = require('../models/user.model');

      const user = await User.findById(userId).select('lastSyncedAt').lean();
      return user?.lastSyncedAt || null;
    } catch (error) {
      logger.error('OfflineSyncService.getLastSyncTimestamp failed:', error.message);
      return null;
    }
  }

  /**
   * Update sync timestamp for user
   * @param {String} userId - User ID
   * @returns {Promise<Boolean>} - Success status
   */
  async updateSyncTimestamp(userId) {
    try {
      const User = require('../models/user.model');

      await User.findByIdAndUpdate(userId, {
        lastSyncedAt: new Date()
      });

      return true;
    } catch (error) {
      logger.error('OfflineSyncService.updateSyncTimestamp failed:', error.message);
      return false;
    }
  }

  /**
   * Get changes since last sync timestamp
   * @param {String} userId - User ID
   * @param {String} firmId - Firm ID
   * @param {Date} since - Timestamp to get changes since
   * @param {Array<String>} entityTypes - Entity types to check
   * @returns {Promise<Object>} - Changes since timestamp
   */
  async getChangesSince(userId, firmId, since, entityTypes = []) {
    try {
      const Client = require('../models/client.model');
      const Invoice = require('../models/invoice.model');
      const Case = require('../models/case.model');
      const Expense = require('../models/expense.model');

      const types = entityTypes.length > 0 ? entityTypes : [
        'clients', 'invoices', 'cases', 'expenses'
      ];

      const changes = {
        since,
        fetchedAt: new Date(),
        hasChanges: false,
        entities: {}
      };

      const query = {
        $or: [{ firmId }, { lawyerId: userId }],
        updatedAt: { $gt: new Date(since) }
      };

      // Fetch changes for each entity type
      if (types.includes('clients')) {
        const clients = await Client.find(query)
          .select('-__v')
          .lean();
        changes.entities.clients = clients;
        if (clients.length > 0) changes.hasChanges = true;
      }

      if (types.includes('invoices')) {
        const invoices = await Invoice.find(query)
          .populate('clientId', 'firstName lastName companyName email')
          .select('-__v')
          .lean();
        changes.entities.invoices = invoices;
        if (invoices.length > 0) changes.hasChanges = true;
      }

      if (types.includes('cases')) {
        const cases = await Case.find(query)
          .populate('clientId', 'firstName lastName companyName')
          .select('-__v')
          .lean();
        changes.entities.cases = cases;
        if (cases.length > 0) changes.hasChanges = true;
      }

      if (types.includes('expenses')) {
        const expenses = await Expense.find(query)
          .select('-__v')
          .lean();
        changes.entities.expenses = expenses;
        if (expenses.length > 0) changes.hasChanges = true;
      }

      return changes;
    } catch (error) {
      logger.error('OfflineSyncService.getChangesSince failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate offline changes before applying
   * @param {Array<Object>} changes - Changes to validate
   * @returns {Promise<Object>} - Validation result
   */
  async validateOfflineChanges(changes) {
    try {
      const errors = [];

      for (const change of changes) {
        // Validate required fields
        if (!change.id) {
          errors.push({
            changeId: change.id,
            field: 'id',
            error: 'Change ID is required'
          });
        }

        if (!change.entityType) {
          errors.push({
            changeId: change.id,
            field: 'entityType',
            error: 'Entity type is required'
          });
        }

        if (!change.operation) {
          errors.push({
            changeId: change.id,
            field: 'operation',
            error: 'Operation is required'
          });
        }

        // Validate operation type
        const validOperations = ['create', 'update', 'delete'];
        if (change.operation && !validOperations.includes(change.operation)) {
          errors.push({
            changeId: change.id,
            field: 'operation',
            error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
          });
        }

        // Validate entity type
        const validEntityTypes = ['client', 'invoice', 'case', 'expense', 'timeEntry'];
        if (change.entityType && !validEntityTypes.includes(change.entityType)) {
          errors.push({
            changeId: change.id,
            field: 'entityType',
            error: `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`
          });
        }

        // Validate data presence for create/update operations
        if (['create', 'update'].includes(change.operation) && !change.data) {
          errors.push({
            changeId: change.id,
            field: 'data',
            error: 'Data is required for create/update operations'
          });
        }

        // Validate timestamp
        if (change.timestamp) {
          const timestamp = new Date(change.timestamp);
          if (isNaN(timestamp.getTime())) {
            errors.push({
              changeId: change.id,
              field: 'timestamp',
              error: 'Invalid timestamp format'
            });
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('OfflineSyncService.validateOfflineChanges failed:', error.message);
      return {
        valid: false,
        errors: [{ error: error.message }]
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process a single change
   * @private
   */
  async _processChange(userId, change) {
    try {
      const { operation, entityType, entityId, data, timestamp } = change;

      // Get the appropriate model
      const Model = this._getModel(entityType);
      if (!Model) {
        return { success: false, error: `Unknown entity type: ${entityType}` };
      }

      switch (operation) {
        case 'create':
          return await this._createEntity(Model, userId, data);
        case 'update':
          return await this._updateEntity(Model, userId, entityId, data, timestamp);
        case 'delete':
          return await this._deleteEntity(Model, userId, entityId);
        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      logger.error('OfflineSyncService._processChange failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new entity
   * @private
   */
  async _createEntity(Model, userId, data) {
    try {
      const entity = await Model.create({
        ...data,
        createdBy: userId,
        updatedBy: userId
      });

      return {
        success: true,
        entityId: entity._id.toString()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an existing entity
   * @private
   */
  async _updateEntity(Model, userId, entityId, data, timestamp) {
    try {
      // Check for conflicts
      const existing = await Model.findById(entityId).lean();
      if (!existing) {
        return { success: false, error: 'Entity not found' };
      }

      // Check if entity was modified after offline change was made
      if (timestamp && existing.updatedAt > new Date(timestamp)) {
        return {
          success: false,
          conflict: {
            entityId,
            localTimestamp: timestamp,
            serverTimestamp: existing.updatedAt,
            localData: data,
            serverData: existing
          }
        };
      }

      // Apply update
      const updated = await Model.findByIdAndUpdate(
        entityId,
        {
          ...data,
          updatedBy: userId,
          updatedAt: new Date()
        },
        { new: true }
      );

      return {
        success: true,
        entityId: updated._id.toString()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete an entity
   * @private
   */
  async _deleteEntity(Model, userId, entityId) {
    try {
      await Model.findByIdAndDelete(entityId);
      return { success: true, entityId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply local changes (conflict resolution)
   * @private
   */
  async _applyLocalChanges(entityType, entityId, localData) {
    try {
      const Model = this._getModel(entityType);
      if (!Model) {
        return { success: false, error: `Unknown entity type: ${entityType}` };
      }

      await Model.findByIdAndUpdate(entityId, {
        ...localData,
        updatedAt: new Date()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Merge changes (conflict resolution)
   * @private
   */
  async _mergeChanges(entityType, entityId, localData, serverData) {
    try {
      const Model = this._getModel(entityType);
      if (!Model) {
        return { success: false, error: `Unknown entity type: ${entityType}` };
      }

      // Simple merge strategy: prefer local changes for most fields
      // but keep server timestamps and system fields
      const merged = {
        ...serverData,
        ...localData,
        updatedAt: new Date(),
        _id: entityId
      };

      await Model.findByIdAndUpdate(entityId, merged);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get model by entity type
   * @private
   */
  _getModel(entityType) {
    const modelMap = {
      client: require('../models/client.model'),
      invoice: require('../models/invoice.model'),
      case: require('../models/case.model'),
      expense: require('../models/expense.model')
    };

    return modelMap[entityType];
  }
}

// Export singleton instance
module.exports = new OfflineSyncService();
