/**
 * Lock Date Service - Fiscal Period Management & Transaction Date Control
 *
 * This service provides a high-level API for managing lock dates in the accounting system.
 * It implements Odoo-inspired lock date functionality for controlling when accounting
 * entries can be edited, ensuring fiscal period integrity and compliance.
 *
 * Features:
 * - Multiple lock types (fiscal, tax, purchase, sale, hard)
 * - Transaction date validation
 * - Fiscal period management
 * - Period lock/reopen with audit trail
 * - Comprehensive history tracking
 */

const LockDate = require('../models/lockDate.model');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class LockDateService {
  /**
   * Get all lock dates for a firm
   * Creates default configuration if none exists
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Lock date configuration
   */
  async getLockDates(firmId) {
    try {
      return await LockDate.getLockDates(firmId);
    } catch (error) {
      logger.error('LockDateService.getLockDates failed:', error.message);
      throw error;
    }
  }

  /**
   * Update a lock date
   * @param {String} firmId - Firm ID
   * @param {String} lockType - Type of lock (fiscal, tax, purchase, sale, hard)
   * @param {Date} lockDate - New lock date
   * @param {Object} context - Request context (user, reason, etc.)
   * @returns {Promise<Object>} - Updated lock date configuration
   */
  async updateLockDate(firmId, lockType, lockDate, context = {}) {
    try {
      const validTypes = ['fiscal', 'tax', 'purchase', 'sale', 'hard'];

      if (!validTypes.includes(lockType)) {
        throw CustomException(
          `Invalid lock type. Must be one of: ${validTypes.join(', ')}`,
          400,
          {
            code: 'INVALID_LOCK_TYPE',
            messageAr: `نوع القفل غير صالح. يجب أن يكون أحد: ${validTypes.join(', ')}`
          }
        );
      }

      // Validate date format
      const newLockDate = new Date(lockDate);
      if (isNaN(newLockDate.getTime())) {
        throw CustomException(
          'Invalid lock date format',
          400,
          {
            code: 'INVALID_DATE_FORMAT',
            messageAr: 'تنسيق تاريخ القفل غير صالح'
          }
        );
      }

      // Get current lock dates
      const currentConfig = await this.getLockDates(firmId);
      const fieldName = `${lockType}LockDate`;
      const oldDate = currentConfig[fieldName];

      // Special validation for hard lock: cannot move backward
      if (lockType === 'hard' && oldDate && newLockDate < oldDate) {
        throw CustomException(
          'Hard lock date cannot be moved backward. This would allow editing of previously locked periods.',
          403,
          {
            code: 'HARD_LOCK_CANNOT_MOVE_BACKWARD',
            messageAr: 'لا يمكن نقل تاريخ القفل الصارم للخلف. سيسمح ذلك بتحرير الفترات المقفلة مسبقًا.'
          }
        );
      }

      // Update the lock date
      const userId = context.userId || context.user?._id || context.user?.id;
      const reason = context.reason || null;

      const updatedConfig = await LockDate.updateLockDate(
        firmId,
        lockType,
        newLockDate,
        userId,
        reason
      );

      // Log to audit trail
      await this._auditLockChange(firmId, lockType, oldDate, newLockDate, context);

      return updatedConfig;
    } catch (error) {
      logger.error('LockDateService.updateLockDate failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if a date is locked
   * @param {String} firmId - Firm ID
   * @param {Date} date - Date to check
   * @param {String} lockType - Type of entry (sale, purchase, bank, expense, journal, all)
   * @returns {Promise<Object>} - { isLocked: boolean, lockDate: Date, lockType: string, message: string }
   */
  async checkDateLocked(firmId, date, lockType = 'all') {
    try {
      return await LockDate.checkDateLocked(firmId, date, lockType);
    } catch (error) {
      logger.error('LockDateService.checkDateLocked failed:', error.message);
      // SECURITY: Fail secure - treat errors as locked to prevent unauthorized access
      return {
        isLocked: true,
        lockDate: null,
        lockType: 'error',
        message: 'Unable to verify lock status. Transaction blocked for safety.'
      };
    }
  }

  /**
   * Validate a transaction date
   * Throws CustomException if date is locked
   * @param {String} firmId - Firm ID
   * @param {Date} transactionDate - Transaction date to validate
   * @param {String} transactionType - Type of transaction (sale, purchase, bank, expense, journal)
   * @param {Object} context - Request context
   * @returns {Promise<Boolean>} - True if valid
   * @throws {CustomException} - If date is locked
   */
  async validateTransaction(firmId, transactionDate, transactionType, context = {}) {
    try {
      const validTypes = ['sale', 'purchase', 'bank', 'expense', 'journal'];

      if (!validTypes.includes(transactionType)) {
        throw CustomException(
          `Invalid transaction type. Must be one of: ${validTypes.join(', ')}`,
          400,
          {
            code: 'INVALID_TRANSACTION_TYPE',
            messageAr: `نوع المعاملة غير صالح. يجب أن يكون أحد: ${validTypes.join(', ')}`
          }
        );
      }

      // Validate date format
      const checkDate = new Date(transactionDate);
      if (isNaN(checkDate.getTime())) {
        throw CustomException(
          'Invalid transaction date format',
          400,
          {
            code: 'INVALID_DATE_FORMAT',
            messageAr: 'تنسيق تاريخ المعاملة غير صالح'
          }
        );
      }

      // Check if date is locked
      const lockStatus = await this.checkDateLocked(firmId, checkDate, transactionType);

      if (lockStatus.isLocked) {
        const lockDateStr = lockStatus.lockDate ?
          new Date(lockStatus.lockDate).toLocaleDateString() :
          'unknown';

        throw CustomException(
          `Transaction date is locked. ${lockStatus.message} Lock date: ${lockDateStr}`,
          403,
          {
            code: 'DATE_LOCKED',
            messageAr: `تاريخ المعاملة مقفل. ${lockStatus.message} تاريخ القفل: ${lockDateStr}`,
            lockDate: lockStatus.lockDate,
            lockType: lockStatus.lockType
          }
        );
      }

      return true;
    } catch (error) {
      logger.error('LockDateService.validateTransaction failed:', error.message);
      throw error;
    }
  }

  /**
   * Lock a fiscal period
   * @param {String} firmId - Firm ID
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @param {String} periodName - Name of the period (e.g., "Q1 2024", "January 2024")
   * @param {Object} context - Request context (user, reason, etc.)
   * @returns {Promise<Object>} - Updated lock date configuration
   */
  async lockPeriod(firmId, startDate, endDate, periodName, context = {}) {
    try {
      // Validate dates
      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);

      if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
        throw CustomException(
          'Invalid period date format',
          400,
          {
            code: 'INVALID_DATE_FORMAT',
            messageAr: 'تنسيق تاريخ الفترة غير صالح'
          }
        );
      }

      if (periodEnd <= periodStart) {
        throw CustomException(
          'Period end date must be after start date',
          400,
          {
            code: 'INVALID_PERIOD_RANGE',
            messageAr: 'يجب أن يكون تاريخ انتهاء الفترة بعد تاريخ البداية'
          }
        );
      }

      if (!periodName || periodName.trim().length === 0) {
        throw CustomException(
          'Period name is required',
          400,
          {
            code: 'PERIOD_NAME_REQUIRED',
            messageAr: 'اسم الفترة مطلوب'
          }
        );
      }

      // Lock the period
      const userId = context.userId || context.user?._id || context.user?.id;

      if (!userId) {
        throw CustomException(
          'User ID is required to lock a period',
          400,
          {
            code: 'USER_ID_REQUIRED',
            messageAr: 'معرف المستخدم مطلوب لقفل الفترة'
          }
        );
      }

      const updatedConfig = await LockDate.lockPeriod(
        firmId,
        periodStart,
        periodEnd,
        periodName,
        userId
      );

      // Log to audit trail
      await this._auditLockChange(
        firmId,
        'period_lock',
        null,
        periodEnd,
        {
          ...context,
          details: {
            action: 'lock_period',
            periodName,
            startDate: periodStart,
            endDate: periodEnd
          }
        }
      );

      return updatedConfig;
    } catch (error) {
      logger.error('LockDateService.lockPeriod failed:', error.message);
      throw error;
    }
  }

  /**
   * Reopen a closed period
   * Requires special permission check (handled by controller/middleware)
   * @param {String} firmId - Firm ID
   * @param {String} periodName - Name of the period to reopen
   * @param {String} reason - Reason for reopening (required)
   * @param {Object} context - Request context (user, etc.)
   * @returns {Promise<Object>} - Updated lock date configuration
   */
  async reopenPeriod(firmId, periodName, reason, context = {}) {
    try {
      if (!periodName || periodName.trim().length === 0) {
        throw CustomException(
          'Period name is required',
          400,
          {
            code: 'PERIOD_NAME_REQUIRED',
            messageAr: 'اسم الفترة مطلوب'
          }
        );
      }

      if (!reason || reason.trim().length === 0) {
        throw CustomException(
          'Reason is required to reopen a period',
          400,
          {
            code: 'REOPEN_REASON_REQUIRED',
            messageAr: 'السبب مطلوب لإعادة فتح الفترة'
          }
        );
      }

      const userId = context.userId || context.user?._id || context.user?.id;

      if (!userId) {
        throw CustomException(
          'User ID is required to reopen a period',
          400,
          {
            code: 'USER_ID_REQUIRED',
            messageAr: 'معرف المستخدم مطلوب لإعادة فتح الفترة'
          }
        );
      }

      // Reopen the period
      const updatedConfig = await LockDate.reopenPeriod(
        firmId,
        periodName,
        userId,
        reason
      );

      // Log to audit trail
      await this._auditLockChange(
        firmId,
        'period_reopen',
        null,
        null,
        {
          ...context,
          details: {
            action: 'reopen_period',
            periodName,
            reason
          }
        }
      );

      return updatedConfig;
    } catch (error) {
      logger.error('LockDateService.reopenPeriod failed:', error.message);
      throw error;
    }
  }

  /**
   * Get list of fiscal periods with lock status
   * @param {String} firmId - Firm ID
   * @returns {Promise<Array>} - List of fiscal periods
   */
  async getFiscalPeriods(firmId) {
    try {
      const lockConfig = await this.getLockDates(firmId);

      if (!lockConfig.periodLockHistory || lockConfig.periodLockHistory.length === 0) {
        return [];
      }

      // Map period lock history to a more user-friendly format
      const periods = lockConfig.periodLockHistory.map(period => ({
        periodName: period.period_name,
        startDate: period.start_date,
        endDate: period.end_date,
        isLocked: !period.reopened_at,
        lockedAt: period.locked_at,
        lockedBy: period.locked_by,
        reopenedAt: period.reopened_at || null,
        reopenedBy: period.reopened_by || null,
        reopenReason: period.reopen_reason || null
      }));

      // Sort by end date descending (most recent first)
      periods.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

      return periods;
    } catch (error) {
      logger.error('LockDateService.getFiscalPeriods failed:', error.message);
      return [];
    }
  }

  /**
   * Get lock date change history
   * @param {String} firmId - Firm ID
   * @param {Object} options - Query options (limit, offset, lockType filter)
   * @returns {Promise<Array>} - Lock date change history
   */
  async getLockHistory(firmId, options = {}) {
    try {
      const lockConfig = await this.getLockDates(firmId);

      if (!lockConfig.lockDates || lockConfig.lockDates.length === 0) {
        return [];
      }

      let history = lockConfig.lockDates.map(lock => ({
        lockType: lock.lock_type,
        lockDate: lock.lock_date,
        lockedBy: lock.locked_by,
        lockedAt: lock.locked_at,
        reason: lock.reason || null
      }));

      // Filter by lock type if specified
      if (options.lockType) {
        history = history.filter(h => h.lockType === options.lockType);
      }

      // Sort by locked_at descending (most recent first)
      history.sort((a, b) => new Date(b.lockedAt) - new Date(a.lockedAt));

      // Apply pagination
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      history = history.slice(offset, offset + limit);

      return history;
    } catch (error) {
      logger.error('LockDateService.getLockHistory failed:', error.message);
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get the applicable lock date for a specific lock type
   * @param {Object} lockConfig - Lock date configuration object
   * @param {String} lockType - Type of lock to check
   * @returns {Date|null} - The applicable lock date
   * @private
   */
  _getLockDateForType(lockConfig, lockType) {
    const typeMapping = {
      fiscal: 'fiscalLockDate',
      tax: 'taxLockDate',
      purchase: 'purchaseLockDate',
      sale: 'saleLockDate',
      hard: 'hardLockDate',
      all: 'fiscalLockDate'
    };

    const fieldName = typeMapping[lockType];
    return lockConfig[fieldName] || null;
  }

  /**
   * Log lock date changes to audit trail
   * @param {String} firmId - Firm ID
   * @param {String} lockType - Type of lock changed
   * @param {Date} oldDate - Previous lock date
   * @param {Date} newDate - New lock date
   * @param {Object} context - Request context
   * @private
   */
  async _auditLockChange(firmId, lockType, oldDate, newDate, context = {}) {
    try {
      // Import audit log service (lazy load to avoid circular dependency)
      const auditLogService = require('./auditLog.service');

      const changes = {
        before: { lockType, lockDate: oldDate },
        after: { lockType, lockDate: newDate }
      };

      await auditLogService.log(
        'update_lock_date',
        'lock_date',
        null,
        changes,
        {
          ...context,
          firmId,
          severity: lockType === 'hard' ? 'critical' : 'high',
          complianceTags: ['SOX', 'FISCAL_CONTROL'],
          details: {
            lockType,
            oldDate: oldDate ? oldDate.toISOString() : null,
            newDate: newDate ? newDate.toISOString() : null,
            reason: context.reason || context.details?.reason || null,
            ...context.details
          }
        }
      );
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      logger.error('LockDateService._auditLockChange failed:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new LockDateService();
