/**
 * Policy Enforcement Service
 *
 * Detects and manages policy violations across expenses, invoices, payments,
 * budgets, vendors, and time entries. Provides comprehensive violation tracking,
 * override management, and escalation workflows.
 *
 * Features:
 * - Multi-entity policy checking (expenses, invoices, payments, etc.)
 * - Violation lifecycle management (create, acknowledge, override, resolve)
 * - Budget compliance monitoring
 * - Vendor approval verification
 * - Rate compliance for time entries
 * - Automated alerting and escalation
 * - Dashboard and reporting
 */

const mongoose = require('mongoose');
const ExpensePolicy = require('../models/expensePolicy.model');
const AuditLogService = require('./auditLog.service');
const NotificationDeliveryService = require('./notificationDelivery.service');
const logger = require('../utils/logger');

// Violation types enum
const VIOLATION_TYPES = {
  EXPENSE_LIMIT: 'expense_limit',
  RECEIPT_REQUIRED: 'receipt_required',
  PREAPPROVAL_REQUIRED: 'preapproval_required',
  BUDGET_EXCEEDED: 'budget_exceeded',
  VENDOR_NOT_APPROVED: 'vendor_not_approved',
  RATE_EXCEEDED: 'rate_exceeded',
  JUSTIFICATION_REQUIRED: 'justification_required',
  DUPLICATE_TRANSACTION: 'duplicate_transaction',
  POLICY_VIOLATION: 'policy_violation',
  CATEGORY_LIMIT: 'category_limit',
  INVOICE_LIMIT: 'invoice_limit',
  PAYMENT_LIMIT: 'payment_limit',
  UNAUTHORIZED_PAYMENT: 'unauthorized_payment'
};

// Violation severity levels
const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Violation statuses
const VIOLATION_STATUSES = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  OVERRIDE_REQUESTED: 'override_requested',
  OVERRIDE_APPROVED: 'override_approved',
  OVERRIDE_REJECTED: 'override_rejected',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated',
  DISMISSED: 'dismissed'
};

class PolicyEnforcementService {
  /**
   * Check expense against policies
   * @param {Object} expense - Expense object
   * @param {String} firmId - Firm ID
   * @param {Object} options - Additional options (userId, userRole, etc.)
   * @returns {Promise<Object>} - { compliant: boolean, violations: [], warnings: [] }
   */
  async checkExpensePolicy(expense, firmId, options = {}) {
    try {
      const violations = [];
      const warnings = [];

      // Get applicable expense policy
      const policy = await ExpensePolicy.getApplicablePolicy(
        firmId,
        null,
        options.userId || expense.createdBy,
        options.userRole,
        options.userDepartment
      );

      if (!policy) {
        logger.warn('PolicyEnforcementService.checkExpensePolicy: No applicable policy found');
        return { compliant: true, violations, warnings };
      }

      // Use the policy's built-in compliance check
      const complianceCheck = await policy.checkCompliance(expense, options.userId);

      if (!complianceCheck.compliant) {
        // Create violation records for each policy violation
        for (const violation of complianceCheck.violations) {
          const violationRecord = await this.createViolation({
            firmId,
            entityType: 'expense',
            entityId: expense._id,
            violationType: violation.type,
            severity: this._determineSeverity(violation.type),
            message: violation.message,
            messageAr: violation.messageAr,
            policyId: policy._id,
            detectedBy: 'system',
            metadata: {
              amount: expense.amount,
              category: expense.category,
              policyName: policy.name
            }
          });

          violations.push(violationRecord);
        }
      }

      // Check for budget compliance if expense is linked to a budget
      if (expense.projectId || expense.departmentId || expense.costCenterId) {
        const budgetCheck = await this.checkBudgetCompliance(expense, firmId);
        if (budgetCheck.violations.length > 0) {
          violations.push(...budgetCheck.violations);
        }
        if (budgetCheck.warnings.length > 0) {
          warnings.push(...budgetCheck.warnings);
        }
      }

      return {
        compliant: violations.length === 0,
        violations,
        warnings,
        requiresApproval: complianceCheck.requiresApproval,
        autoApprove: complianceCheck.autoApprove
      };
    } catch (error) {
      logger.error('PolicyEnforcementService.checkExpensePolicy failed:', error.message);
      return { compliant: false, violations: [], warnings: [], error: error.message };
    }
  }

  /**
   * Check invoice against policies
   * @param {Object} invoice - Invoice object
   * @param {String} firmId - Firm ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - { compliant: boolean, violations: [], warnings: [] }
   */
  async checkInvoicePolicy(invoice, firmId, options = {}) {
    try {
      const violations = [];
      const warnings = [];

      // Check invoice amount limits (if configured)
      const invoiceLimitViolation = await this._checkInvoiceLimit(invoice, firmId);
      if (invoiceLimitViolation) {
        violations.push(invoiceLimitViolation);
      }

      // Check for duplicate invoices
      const duplicateCheck = await this._checkDuplicateInvoice(invoice, firmId);
      if (duplicateCheck) {
        violations.push(duplicateCheck);
      }

      // Check payment terms compliance
      const paymentTermsCheck = await this._checkPaymentTerms(invoice, firmId);
      if (paymentTermsCheck && paymentTermsCheck.severity === 'high') {
        violations.push(paymentTermsCheck);
      } else if (paymentTermsCheck) {
        warnings.push(paymentTermsCheck);
      }

      return {
        compliant: violations.length === 0,
        violations,
        warnings
      };
    } catch (error) {
      logger.error('PolicyEnforcementService.checkInvoicePolicy failed:', error.message);
      return { compliant: false, violations: [], warnings: [], error: error.message };
    }
  }

  /**
   * Check payment against policies
   * @param {Object} payment - Payment object
   * @param {String} firmId - Firm ID
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - { compliant: boolean, violations: [], warnings: [] }
   */
  async checkPaymentPolicy(payment, firmId, options = {}) {
    try {
      const violations = [];
      const warnings = [];

      // Check payment amount limits
      const paymentLimitCheck = await this._checkPaymentLimit(payment, firmId, options);
      if (paymentLimitCheck) {
        violations.push(paymentLimitCheck);
      }

      // Check payment authorization
      const authCheck = await this._checkPaymentAuthorization(payment, firmId, options);
      if (authCheck) {
        violations.push(authCheck);
      }

      // Verify payment against invoice (if applicable)
      if (payment.invoiceId) {
        const invoiceCheck = await this._checkPaymentInvoiceMatch(payment, firmId);
        if (invoiceCheck) {
          violations.push(invoiceCheck);
        }
      }

      return {
        compliant: violations.length === 0,
        violations,
        warnings
      };
    } catch (error) {
      logger.error('PolicyEnforcementService.checkPaymentPolicy failed:', error.message);
      return { compliant: false, violations: [], warnings: [], error: error.message };
    }
  }

  /**
   * Check budget compliance for an entity
   * @param {Object} entity - Entity to check (expense, invoice, etc.)
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - { compliant: boolean, violations: [], warnings: [] }
   */
  async checkBudgetCompliance(entity, firmId) {
    try {
      const violations = [];
      const warnings = [];
      const Budget = mongoose.model('Budget');

      // Determine which budget to check against
      const budgetQuery = {
        firmId: new mongoose.Types.ObjectId(firmId),
        status: 'approved',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      };

      if (entity.departmentId) {
        budgetQuery.departmentId = entity.departmentId;
      } else if (entity.costCenterId) {
        budgetQuery.costCenterId = entity.costCenterId;
      } else if (entity.projectId) {
        budgetQuery.projectId = entity.projectId;
      }

      const budget = await Budget.findOne(budgetQuery).lean();

      if (!budget) {
        // No budget configured, skip check
        return { compliant: true, violations, warnings };
      }

      // Get current spending against this budget
      const currentSpending = await this._calculateCurrentSpending(budget, firmId);
      const entityAmount = entity.totalAmount || entity.amount || 0;
      const projectedTotal = currentSpending + entityAmount;

      // Find applicable budget line item
      const applicableLineItem = this._findApplicableBudgetLineItem(budget, entity);

      if (applicableLineItem) {
        const budgetedAmount = applicableLineItem.budgetedAmount;
        const thresholdPercentage = applicableLineItem.varianceThreshold || budget.varianceAlertThreshold || 10;
        const warningThreshold = budgetedAmount * (1 + thresholdPercentage / 100);

        if (projectedTotal > budgetedAmount) {
          // Budget exceeded
          const violation = await this.createViolation({
            firmId,
            entityType: entity.constructor.modelName || 'expense',
            entityId: entity._id,
            violationType: VIOLATION_TYPES.BUDGET_EXCEEDED,
            severity: SEVERITY_LEVELS.HIGH,
            message: `Budget exceeded: Projected total ${projectedTotal} exceeds budgeted amount ${budgetedAmount}`,
            messageAr: `تجاوز الميزانية: المجموع المتوقع ${projectedTotal} يتجاوز المبلغ المخصص ${budgetedAmount}`,
            metadata: {
              budgetId: budget._id,
              budgetedAmount,
              currentSpending,
              entityAmount,
              projectedTotal,
              variance: projectedTotal - budgetedAmount,
              variancePercentage: ((projectedTotal - budgetedAmount) / budgetedAmount * 100).toFixed(2)
            }
          });
          violations.push(violation);
        } else if (projectedTotal > warningThreshold) {
          // Approaching budget limit
          warnings.push({
            type: 'budget_warning',
            message: `Approaching budget limit: ${((projectedTotal / budgetedAmount) * 100).toFixed(1)}% of budget used`,
            messageAr: `اقتراب من حد الميزانية: تم استخدام ${((projectedTotal / budgetedAmount) * 100).toFixed(1)}% من الميزانية`,
            severity: SEVERITY_LEVELS.MEDIUM,
            metadata: {
              budgetedAmount,
              currentSpending,
              entityAmount,
              projectedTotal,
              utilizationPercentage: ((projectedTotal / budgetedAmount) * 100).toFixed(2)
            }
          });
        }
      }

      return {
        compliant: violations.length === 0,
        violations,
        warnings
      };
    } catch (error) {
      logger.error('PolicyEnforcementService.checkBudgetCompliance failed:', error.message);
      return { compliant: true, violations: [], warnings: [] };
    }
  }

  /**
   * Check if vendor is approved
   * @param {String} vendorId - Vendor ID
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - { approved: boolean, violation: Object }
   */
  async checkVendorApproval(vendorId, firmId) {
    try {
      const Vendor = mongoose.model('Vendor');
      const vendor = await Vendor.findOne({
        _id: vendorId,
        firmId: new mongoose.Types.ObjectId(firmId)
      }).lean();

      if (!vendor) {
        return {
          approved: false,
          violation: {
            type: VIOLATION_TYPES.VENDOR_NOT_APPROVED,
            severity: SEVERITY_LEVELS.HIGH,
            message: 'Vendor not found',
            messageAr: 'المورد غير موجود'
          }
        };
      }

      // Check vendor status and approval
      if (vendor.status === 'inactive' || vendor.status === 'blacklisted') {
        return {
          approved: false,
          violation: {
            type: VIOLATION_TYPES.VENDOR_NOT_APPROVED,
            severity: SEVERITY_LEVELS.CRITICAL,
            message: `Vendor is ${vendor.status}`,
            messageAr: `المورد ${vendor.status === 'inactive' ? 'غير نشط' : 'في القائمة السوداء'}`,
            metadata: {
              vendorId,
              vendorName: vendor.name,
              vendorStatus: vendor.status
            }
          }
        };
      }

      if (vendor.requiresApproval && !vendor.isApproved) {
        return {
          approved: false,
          violation: {
            type: VIOLATION_TYPES.VENDOR_NOT_APPROVED,
            severity: SEVERITY_LEVELS.MEDIUM,
            message: 'Vendor requires approval before transactions',
            messageAr: 'يتطلب المورد موافقة قبل المعاملات',
            metadata: {
              vendorId,
              vendorName: vendor.name
            }
          }
        };
      }

      return { approved: true, violation: null };
    } catch (error) {
      logger.error('PolicyEnforcementService.checkVendorApproval failed:', error.message);
      return { approved: false, violation: null };
    }
  }

  /**
   * Check time entry rate compliance
   * @param {Object} timeEntry - Time entry object
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - { compliant: boolean, violations: [] }
   */
  async checkRateCompliance(timeEntry, firmId) {
    try {
      const violations = [];

      // Get standard rate for the user/role
      const User = mongoose.model('User');
      const user = await User.findOne({
        _id: timeEntry.assigneeId || timeEntry.userId,
        firmId: new mongoose.Types.ObjectId(firmId)
      }).lean();

      if (!user) {
        return { compliant: true, violations };
      }

      // Check if rate exceeds standard rate
      const standardRate = user.hourlyRate || user.defaultHourlyRate || 0;
      const actualRate = timeEntry.hourlyRate || timeEntry.rate || 0;

      if (actualRate > standardRate) {
        const rateExceededPercentage = ((actualRate - standardRate) / standardRate * 100).toFixed(2);

        // Only flag if exceeds by more than 10%
        if (rateExceededPercentage > 10) {
          const violation = await this.createViolation({
            firmId,
            entityType: 'timeEntry',
            entityId: timeEntry._id,
            violationType: VIOLATION_TYPES.RATE_EXCEEDED,
            severity: rateExceededPercentage > 50 ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM,
            message: `Time entry rate ${actualRate} exceeds standard rate ${standardRate} by ${rateExceededPercentage}%`,
            messageAr: `معدل إدخال الوقت ${actualRate} يتجاوز المعدل القياسي ${standardRate} بنسبة ${rateExceededPercentage}%`,
            metadata: {
              userId: user._id,
              userName: `${user.firstName} ${user.lastName}`,
              standardRate,
              actualRate,
              variance: actualRate - standardRate,
              variancePercentage: rateExceededPercentage
            }
          });
          violations.push(violation);
        }
      }

      return {
        compliant: violations.length === 0,
        violations
      };
    } catch (error) {
      logger.error('PolicyEnforcementService.checkRateCompliance failed:', error.message);
      return { compliant: true, violations: [] };
    }
  }

  /**
   * Create a policy violation record
   * @param {Object} violationData - Violation data
   * @returns {Promise<Object>} - Created violation
   */
  async createViolation(violationData) {
    try {
      // For now, we'll store violations in a collection
      // This allows for future migration to a dedicated PolicyViolation model
      const Violation = await this._getViolationModel();

      const violation = await Violation.create({
        firmId: violationData.firmId,
        entityType: violationData.entityType,
        entityId: violationData.entityId,
        violationType: violationData.violationType,
        severity: violationData.severity || SEVERITY_LEVELS.MEDIUM,
        status: VIOLATION_STATUSES.OPEN,
        message: violationData.message,
        messageAr: violationData.messageAr,
        policyId: violationData.policyId,
        detectedBy: violationData.detectedBy || 'system',
        detectedAt: new Date(),
        metadata: violationData.metadata || {},
        requiresAction: violationData.requiresAction !== false,
        autoGenerated: true
      });

      // Log to audit
      await AuditLogService.log(
        'policy_violation_detected',
        violationData.entityType,
        violationData.entityId,
        null,
        {
          firmId: violationData.firmId,
          details: {
            violationType: violationData.violationType,
            severity: violationData.severity,
            message: violationData.message
          }
        }
      );

      // Send alert for high/critical violations
      if (violation.severity === SEVERITY_LEVELS.HIGH || violation.severity === SEVERITY_LEVELS.CRITICAL) {
        await this.sendViolationAlert(violation);
      }

      return violation;
    } catch (error) {
      logger.error('PolicyEnforcementService.createViolation failed:', error.message);
      throw error;
    }
  }

  /**
   * Acknowledge a violation
   * @param {String} violationId - Violation ID
   * @param {String} userId - User acknowledging
   * @param {String} firmId - Firm ID
   * @param {String} notes - Acknowledgment notes
   * @returns {Promise<Object>} - Updated violation
   */
  async acknowledgeViolation(violationId, userId, firmId, notes = '') {
    try {
      const Violation = await this._getViolationModel();

      const violation = await Violation.findOneAndUpdate(
        { _id: violationId, firmId: new mongoose.Types.ObjectId(firmId) },
        {
          status: VIOLATION_STATUSES.ACKNOWLEDGED,
          acknowledgedBy: new mongoose.Types.ObjectId(userId),
          acknowledgedAt: new Date(),
          acknowledgmentNotes: notes,
          $push: {
            history: {
              action: 'acknowledged',
              userId: new mongoose.Types.ObjectId(userId),
              timestamp: new Date(),
              notes
            }
          }
        },
        { new: true }
      );

      if (violation) {
        await AuditLogService.log(
          'violation_acknowledged',
          'policyViolation',
          violationId,
          null,
          {
            userId,
            firmId: violation.firmId,
            details: { notes }
          }
        );
      }

      return violation;
    } catch (error) {
      logger.error('PolicyEnforcementService.acknowledgeViolation failed:', error.message);
      throw error;
    }
  }

  /**
   * Request override approval for a violation
   * @param {String} violationId - Violation ID
   * @param {String} reason - Override reason
   * @param {String} userId - User requesting override
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Updated violation
   */
  async requestOverride(violationId, reason, userId, firmId) {
    try {
      const Violation = await this._getViolationModel();

      const violation = await Violation.findOneAndUpdate(
        { _id: violationId, firmId: new mongoose.Types.ObjectId(firmId) },
        {
          status: VIOLATION_STATUSES.OVERRIDE_REQUESTED,
          overrideRequestedBy: new mongoose.Types.ObjectId(userId),
          overrideRequestedAt: new Date(),
          overrideReason: reason,
          $push: {
            history: {
              action: 'override_requested',
              userId: new mongoose.Types.ObjectId(userId),
              timestamp: new Date(),
              notes: reason
            }
          }
        },
        { new: true }
      );

      if (violation) {
        await AuditLogService.log(
          'violation_override_requested',
          'policyViolation',
          violationId,
          null,
          {
            userId,
            firmId: violation.firmId,
            details: { reason }
          }
        );

        // Send notification to approvers
        await this._notifyOverrideApprovers(violation, reason);
      }

      return violation;
    } catch (error) {
      logger.error('PolicyEnforcementService.requestOverride failed:', error.message);
      throw error;
    }
  }

  /**
   * Approve an override request
   * @param {String} violationId - Violation ID
   * @param {String} approverId - Approver user ID
   * @param {String} firmId - Firm ID
   * @param {String} reason - Approval reason
   * @returns {Promise<Object>} - Updated violation
   */
  async approveOverride(violationId, approverId, firmId, reason = '') {
    try {
      const Violation = await this._getViolationModel();

      const violation = await Violation.findOneAndUpdate(
        { _id: violationId, firmId: new mongoose.Types.ObjectId(firmId) },
        {
          status: VIOLATION_STATUSES.OVERRIDE_APPROVED,
          overrideApprovedBy: new mongoose.Types.ObjectId(approverId),
          overrideApprovedAt: new Date(),
          overrideApprovalReason: reason,
          $push: {
            history: {
              action: 'override_approved',
              userId: new mongoose.Types.ObjectId(approverId),
              timestamp: new Date(),
              notes: reason
            }
          }
        },
        { new: true }
      );

      if (violation) {
        await AuditLogService.log(
          'violation_override_approved',
          'policyViolation',
          violationId,
          null,
          {
            userId: approverId,
            firmId: violation.firmId,
            details: { reason }
          }
        );

        // Notify requester
        if (violation.overrideRequestedBy) {
          await this._notifyOverrideDecision(violation, 'approved');
        }
      }

      return violation;
    } catch (error) {
      logger.error('PolicyEnforcementService.approveOverride failed:', error.message);
      throw error;
    }
  }

  /**
   * Resolve a violation
   * @param {String} violationId - Violation ID
   * @param {String} userId - User resolving
   * @param {String} firmId - Firm ID
   * @param {String} notes - Resolution notes
   * @returns {Promise<Object>} - Updated violation
   */
  async resolveViolation(violationId, userId, firmId, notes = '') {
    try {
      const Violation = await this._getViolationModel();

      const violation = await Violation.findOneAndUpdate(
        { _id: violationId, firmId: new mongoose.Types.ObjectId(firmId) },
        {
          status: VIOLATION_STATUSES.RESOLVED,
          resolvedBy: new mongoose.Types.ObjectId(userId),
          resolvedAt: new Date(),
          resolutionNotes: notes,
          $push: {
            history: {
              action: 'resolved',
              userId: new mongoose.Types.ObjectId(userId),
              timestamp: new Date(),
              notes
            }
          }
        },
        { new: true }
      );

      if (violation) {
        await AuditLogService.log(
          'violation_resolved',
          'policyViolation',
          violationId,
          null,
          {
            userId,
            firmId: violation.firmId,
            details: { notes }
          }
        );
      }

      return violation;
    } catch (error) {
      logger.error('PolicyEnforcementService.resolveViolation failed:', error.message);
      throw error;
    }
  }

  /**
   * Escalate a violation to manager
   * @param {String} violationId - Violation ID
   * @param {String} escalateTo - User ID to escalate to
   * @param {String} firmId - Firm ID
   * @returns {Promise<Object>} - Updated violation
   */
  async escalateViolation(violationId, escalateTo, firmId) {
    try {
      const Violation = await this._getViolationModel();

      const violation = await Violation.findOneAndUpdate(
        { _id: violationId, firmId: new mongoose.Types.ObjectId(firmId) },
        {
          status: VIOLATION_STATUSES.ESCALATED,
          escalatedTo: new mongoose.Types.ObjectId(escalateTo),
          escalatedAt: new Date(),
          $push: {
            history: {
              action: 'escalated',
              userId: new mongoose.Types.ObjectId(escalateTo),
              timestamp: new Date(),
              notes: `Escalated to user ${escalateTo}`
            }
          }
        },
        { new: true }
      );

      if (violation) {
        await AuditLogService.log(
          'violation_escalated',
          'policyViolation',
          violationId,
          null,
          {
            firmId: violation.firmId,
            details: { escalatedTo }
          }
        );

        // Send notification to escalation target
        await this._notifyEscalation(violation, escalateTo);
      }

      return violation;
    } catch (error) {
      logger.error('PolicyEnforcementService.escalateViolation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get violation dashboard statistics
   * @param {String} firmId - Firm ID
   * @param {Object} filters - Optional filters (dateRange, entityType, etc.)
   * @returns {Promise<Object>} - Dashboard statistics
   */
  async getViolationDashboard(firmId, filters = {}) {
    try {
      const Violation = await this._getViolationModel();

      const matchStage = { firmId: new mongoose.Types.ObjectId(firmId) };

      if (filters.startDate || filters.endDate) {
        matchStage.detectedAt = {};
        if (filters.startDate) matchStage.detectedAt.$gte = new Date(filters.startDate);
        if (filters.endDate) matchStage.detectedAt.$lte = new Date(filters.endDate);
      }

      if (filters.entityType) {
        matchStage.entityType = filters.entityType;
      }

      const stats = await Violation.aggregate([
        { $match: matchStage },
        {
          $facet: {
            totalCount: [{ $count: 'count' }],
            byStatus: [
              { $group: { _id: '$status', count: { $sum: 1 } } }
            ],
            bySeverity: [
              { $group: { _id: '$severity', count: { $sum: 1 } } }
            ],
            byType: [
              { $group: { _id: '$violationType', count: { $sum: 1 } } },
              { $sort: { count: -1 } },
              { $limit: 10 }
            ],
            byEntity: [
              { $group: { _id: '$entityType', count: { $sum: 1 } } }
            ],
            recentViolations: [
              { $sort: { detectedAt: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]);

      return {
        totalViolations: stats[0]?.totalCount[0]?.count || 0,
        byStatus: stats[0]?.byStatus || [],
        bySeverity: stats[0]?.bySeverity || [],
        byType: stats[0]?.byType || [],
        byEntity: stats[0]?.byEntity || [],
        recentViolations: stats[0]?.recentViolations || []
      };
    } catch (error) {
      logger.error('PolicyEnforcementService.getViolationDashboard failed:', error.message);
      return {};
    }
  }

  /**
   * Get violations for a specific entity
   * @param {String} entityType - Entity type (expense, invoice, etc.)
   * @param {String} entityId - Entity ID
   * @returns {Promise<Array>} - Array of violations
   */
  async getViolationsForEntity(entityType, entityId) {
    try {
      const Violation = await this._getViolationModel();

      const violations = await Violation.find({
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId)
      })
        .sort({ detectedAt: -1 })
        .lean();

      return violations;
    } catch (error) {
      logger.error('PolicyEnforcementService.getViolationsForEntity failed:', error.message);
      return [];
    }
  }

  /**
   * Send violation alert to approvers
   * @param {Object} violation - Violation object
   * @returns {Promise<void>}
   */
  async sendViolationAlert(violation) {
    try {
      // Get firm admins and managers
      const User = mongoose.model('User');
      const recipients = await User.find({
        firmId: violation.firmId,
        role: { $in: ['admin', 'owner', 'manager', 'finance_manager'] },
        isActive: true
      }).lean();

      for (const recipient of recipients) {
        if (recipient.email) {
          await NotificationDeliveryService.sendEmail({
            to: recipient.email,
            subject: `Policy Violation Alert - ${violation.severity.toUpperCase()}`,
            message: `A ${violation.severity} policy violation has been detected: ${violation.message}`,
            userName: `${recipient.firstName} ${recipient.lastName}`,
            data: {
              violationType: violation.violationType,
              entityType: violation.entityType,
              severity: violation.severity,
              detectedAt: violation.detectedAt,
              link: `/violations/${violation._id}`
            }
          });
        }

        // Create in-app notification
        const QueueService = require('./queue.service');
        QueueService.createNotification({
          userId: recipient._id,
          type: 'policy_violation',
          title: 'Policy Violation Detected',
          message: violation.message,
          priority: violation.severity === SEVERITY_LEVELS.CRITICAL ? 'high' : 'medium',
          link: `/violations/${violation._id}`,
          data: {
            violationType: violation.violationType,
            entityType: violation.entityType,
            entityId: violation.entityId,
            severity: violation.severity
          }
        });
      }
    } catch (error) {
      logger.error('PolicyEnforcementService.sendViolationAlert failed:', error.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PRIVATE HELPER METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get or create violation model
   * @private
   */
  async _getViolationModel() {
    try {
      return mongoose.model('PolicyViolation');
    } catch (error) {
      // Model doesn't exist, create a simple schema
      const violationSchema = new mongoose.Schema({
        firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true, index: true },
        entityType: { type: String, required: true, index: true },
        entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
        violationType: { type: String, required: true, index: true },
        severity: { type: String, enum: Object.values(SEVERITY_LEVELS), default: SEVERITY_LEVELS.MEDIUM },
        status: { type: String, enum: Object.values(VIOLATION_STATUSES), default: VIOLATION_STATUSES.OPEN, index: true },
        message: { type: String, required: true },
        messageAr: { type: String },
        policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpensePolicy' },
        detectedBy: { type: String, default: 'system' },
        detectedAt: { type: Date, default: Date.now, index: true },
        acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        acknowledgedAt: { type: Date },
        acknowledgmentNotes: { type: String },
        overrideRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        overrideRequestedAt: { type: Date },
        overrideReason: { type: String },
        overrideApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        overrideApprovedAt: { type: Date },
        overrideApprovalReason: { type: String },
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        resolvedAt: { type: Date },
        resolutionNotes: { type: String },
        escalatedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        escalatedAt: { type: Date },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
        requiresAction: { type: Boolean, default: true },
        autoGenerated: { type: Boolean, default: true },
        history: [{
          action: String,
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          timestamp: { type: Date, default: Date.now },
          notes: String
        }]
      }, { timestamps: true });

      violationSchema.index({ firmId: 1, status: 1 });
      violationSchema.index({ firmId: 1, entityType: 1, entityId: 1 });
      violationSchema.index({ firmId: 1, severity: 1 });

      return mongoose.model('PolicyViolation', violationSchema);
    }
  }

  /**
   * Determine severity based on violation type
   * @private
   */
  _determineSeverity(violationType) {
    const severityMap = {
      [VIOLATION_TYPES.RECEIPT_REQUIRED]: SEVERITY_LEVELS.MEDIUM,
      [VIOLATION_TYPES.PREAPPROVAL_REQUIRED]: SEVERITY_LEVELS.HIGH,
      [VIOLATION_TYPES.EXPENSE_LIMIT]: SEVERITY_LEVELS.HIGH,
      [VIOLATION_TYPES.BUDGET_EXCEEDED]: SEVERITY_LEVELS.HIGH,
      [VIOLATION_TYPES.VENDOR_NOT_APPROVED]: SEVERITY_LEVELS.CRITICAL,
      [VIOLATION_TYPES.RATE_EXCEEDED]: SEVERITY_LEVELS.MEDIUM,
      [VIOLATION_TYPES.JUSTIFICATION_REQUIRED]: SEVERITY_LEVELS.LOW,
      [VIOLATION_TYPES.DUPLICATE_TRANSACTION]: SEVERITY_LEVELS.HIGH,
      [VIOLATION_TYPES.UNAUTHORIZED_PAYMENT]: SEVERITY_LEVELS.CRITICAL
    };

    return severityMap[violationType] || SEVERITY_LEVELS.MEDIUM;
  }

  /**
   * Check invoice limit
   * @private
   */
  async _checkInvoiceLimit(invoice, firmId) {
    // This would check against configured invoice limits
    // For now, return null (no violation)
    return null;
  }

  /**
   * Check for duplicate invoice
   * @private
   */
  async _checkDuplicateInvoice(invoice, firmId) {
    try {
      if (!invoice.invoiceNumber) return null;

      const Invoice = mongoose.model('Invoice');
      const duplicate = await Invoice.findOne({
        firmId: new mongoose.Types.ObjectId(firmId),
        invoiceNumber: invoice.invoiceNumber,
        _id: { $ne: invoice._id }
      }).lean();

      if (duplicate) {
        return await this.createViolation({
          firmId,
          entityType: 'invoice',
          entityId: invoice._id,
          violationType: VIOLATION_TYPES.DUPLICATE_TRANSACTION,
          severity: SEVERITY_LEVELS.HIGH,
          message: `Duplicate invoice number: ${invoice.invoiceNumber}`,
          messageAr: `رقم فاتورة مكرر: ${invoice.invoiceNumber}`,
          metadata: { duplicateInvoiceId: duplicate._id }
        });
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check payment terms
   * @private
   */
  async _checkPaymentTerms(invoice, firmId) {
    // This would check payment terms compliance
    // For now, return null
    return null;
  }

  /**
   * Check payment limit
   * @private
   */
  async _checkPaymentLimit(payment, firmId, options) {
    // This would check against configured payment limits
    // For now, return null
    return null;
  }

  /**
   * Check payment authorization
   * @private
   */
  async _checkPaymentAuthorization(payment, firmId, options) {
    // This would verify payment authorization
    // For now, return null
    return null;
  }

  /**
   * Check payment matches invoice
   * @private
   */
  async _checkPaymentInvoiceMatch(payment, firmId) {
    // This would verify payment amount matches invoice
    // For now, return null
    return null;
  }

  /**
   * Calculate current spending for budget
   * @private
   */
  async _calculateCurrentSpending(budget, firmId) {
    try {
      const Expense = mongoose.model('Expense');
      const query = {
        firmId: new mongoose.Types.ObjectId(firmId),
        date: {
          $gte: budget.startDate,
          $lte: budget.endDate
        },
        status: { $in: ['approved', 'paid'] }
      };

      if (budget.departmentId) {
        query.departmentId = budget.departmentId;
      } else if (budget.costCenterId) {
        query.costCenterId = budget.costCenterId;
      }

      const result = await Expense.aggregate([
        { $match: query },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);

      return result[0]?.total || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Find applicable budget line item
   * @private
   */
  _findApplicableBudgetLineItem(budget, entity) {
    if (!budget.lineItems || budget.lineItems.length === 0) {
      return null;
    }

    // For now, return the first line item
    // In a real implementation, this would match based on account, period, etc.
    return budget.lineItems[0];
  }

  /**
   * Notify override approvers
   * @private
   */
  async _notifyOverrideApprovers(violation, reason) {
    try {
      const User = mongoose.model('User');
      const approvers = await User.find({
        firmId: violation.firmId,
        role: { $in: ['admin', 'owner', 'finance_manager'] },
        isActive: true
      }).lean();

      for (const approver of approvers) {
        if (approver.email) {
          await NotificationDeliveryService.sendEmail({
            to: approver.email,
            subject: 'Policy Violation Override Request',
            message: `Override requested for policy violation: ${violation.message}. Reason: ${reason}`,
            userName: `${approver.firstName} ${approver.lastName}`,
            data: {
              violationId: violation._id,
              reason,
              link: `/violations/${violation._id}`
            }
          });
        }
      }
    } catch (error) {
      logger.error('PolicyEnforcementService._notifyOverrideApprovers failed:', error.message);
    }
  }

  /**
   * Notify override decision
   * @private
   */
  async _notifyOverrideDecision(violation, decision) {
    try {
      const User = mongoose.model('User');
      const requester = await User.findOne({
        _id: violation.overrideRequestedBy,
        firmId: violation.firmId
      }).lean();

      if (requester && requester.email) {
        await NotificationDeliveryService.sendEmail({
          to: requester.email,
          subject: `Override Request ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your override request for policy violation has been ${decision}.`,
          userName: `${requester.firstName} ${requester.lastName}`,
          data: {
            violationId: violation._id,
            decision,
            link: `/violations/${violation._id}`
          }
        });
      }
    } catch (error) {
      logger.error('PolicyEnforcementService._notifyOverrideDecision failed:', error.message);
    }
  }

  /**
   * Notify escalation target
   * @private
   */
  async _notifyEscalation(violation, escalateTo) {
    try {
      const User = mongoose.model('User');
      const manager = await User.findOne({
        _id: escalateTo,
        firmId: violation.firmId
      }).lean();

      if (manager && manager.email) {
        await NotificationDeliveryService.sendEmail({
          to: manager.email,
          subject: 'Policy Violation Escalated to You',
          message: `A policy violation has been escalated to you for review: ${violation.message}`,
          userName: `${manager.firstName} ${manager.lastName}`,
          data: {
            violationId: violation._id,
            severity: violation.severity,
            link: `/violations/${violation._id}`
          }
        });
      }
    } catch (error) {
      logger.error('PolicyEnforcementService._notifyEscalation failed:', error.message);
    }
  }
}

// Export singleton instance
module.exports = new PolicyEnforcementService();
