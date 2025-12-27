/**
 * Approval Workflow Service - Comprehensive Generic Approval System
 *
 * This service provides a complete approval workflow system that can be used
 * for any entity type (quotes, discounts, expenses, etc.).
 *
 * Features:
 * - Generic approval request creation and management
 * - Approval chain templates (reusable workflows)
 * - Approval rules (when approval is needed)
 * - Multi-level approval chains
 * - Delegation, escalation, and auto-approval
 * - Comprehensive notifications and reminders
 * - Approval metrics and analytics
 *
 * Security: All methods require firmId for multi-tenant isolation
 */

const mongoose = require('mongoose');
const ApprovalRequest = require('../models/approvalRequest.model');
const ApprovalChain = require('../models/approvalChain.model');
const ApprovalRule = require('../models/approvalRule.model');
const { sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class ApprovalWorkflowService {
    // ═══════════════════════════════════════════════════════════════
    // APPROVAL REQUEST CREATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create approval request
     * @param {String} entityType - Entity type (quote, expense, etc.)
     * @param {String} entityId - Entity ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} requesterId - Requester user ID
     * @param {Array} approverIds - Array of approver user IDs
     * @param {Object} data - Entity-specific data snapshot
     * @returns {Promise<Object|null>} - Created approval request or null
     */
    async createApprovalRequest(entityType, entityId, firmId, requesterId, approverIds, data) {
        if (!firmId) throw new Error('firmId is required');
        if (!entityType || !entityId || !requesterId || !approverIds || !data) {
            throw new Error('Missing required parameters');
        }

        const sanitizedEntityId = sanitizeObjectId(entityId);
        const sanitizedRequesterId = sanitizeObjectId(requesterId);
        if (!sanitizedEntityId || !sanitizedRequesterId) {
            throw new Error('Invalid ID parameters');
        }

        // Generate request number
        const requestNumber = await ApprovalRequest.generateRequestNumber(firmId);

        // Build approval chain from approver IDs
        const approvalChain = approverIds.map((approverId, index) => ({
            approverId: new mongoose.Types.ObjectId(sanitizeObjectId(approverId)),
            order: index + 1,
            status: 'pending'
        }));

        // Create approval request
        const request = new ApprovalRequest({
            requestNumber,
            entityType,
            entityId: sanitizedEntityId,
            firmId: new mongoose.Types.ObjectId(firmId),
            requesterId: sanitizedRequesterId,
            status: 'pending',
            priority: data.priority || 'normal',
            dueDate: data.dueDate || null,
            approvalChain,
            currentLevel: 1, // Start at first level
            data,
            history: [{
                action: 'created',
                performedBy: sanitizedRequesterId,
                timestamp: new Date(),
                notes: 'Approval request created',
                newStatus: 'pending'
            }],
            createdBy: sanitizedRequesterId
        });

        await request.save();

        return ApprovalRequest.findOne({ _id: request._id, firmId })
            .populate('requesterId', 'firstName lastName email avatar')
            .populate('approvalChain.approverId', 'firstName lastName email')
            .lean();
    }

    /**
     * Get approval request by ID
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Object|null>} - Approval request or null
     */
    async getApprovalRequest(requestId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        if (!sanitizedId) return null;

        return ApprovalRequest.findOne({ _id: sanitizedId, firmId })
            .populate('requesterId', 'firstName lastName email avatar')
            .populate('approvalChain.approverId', 'firstName lastName email')
            .populate('approvalChain.delegatedTo', 'firstName lastName email')
            .populate('completedBy', 'firstName lastName email')
            .lean();
    }

    /**
     * Cancel approval request
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} requesterId - Requester user ID (must match original requester)
     * @param {String} reason - Cancellation reason
     * @returns {Promise<Object|null>} - Updated approval request or null
     */
    async cancelApprovalRequest(requestId, firmId, requesterId, reason) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        const sanitizedRequesterId = sanitizeObjectId(requesterId);
        if (!sanitizedId || !sanitizedRequesterId) return null;

        // Find request with firm isolation
        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request) return null;

        // Verify requester
        if (request.requesterId.toString() !== sanitizedRequesterId) {
            throw new Error('Only the original requester can cancel this request');
        }

        // Verify status
        if (request.status !== 'pending') {
            throw new Error('Only pending requests can be cancelled');
        }

        // Update request
        request.status = 'cancelled';
        request.completedAt = new Date();
        request.completedBy = sanitizedRequesterId;
        request.history.push({
            action: 'cancelled',
            performedBy: sanitizedRequesterId,
            timestamp: new Date(),
            notes: reason,
            previousStatus: 'pending',
            newStatus: 'cancelled'
        });

        await request.save();

        return ApprovalRequest.findOne({ _id: sanitizedId, firmId })
            .populate('requesterId', 'firstName lastName email avatar')
            .populate('completedBy', 'firstName lastName email')
            .lean();
    }

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL CHAIN MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create approval chain template
     * @param {Object} chainData - Chain configuration
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer/User ID creating the chain
     * @returns {Promise<Object|null>} - Created approval chain or null
     */
    async createApprovalChain(chainData, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');
        if (!chainData.name || !chainData.entityTypes || !chainData.steps) {
            throw new Error('Missing required chain data');
        }

        const sanitizedLawyerId = sanitizeObjectId(lawyerId);
        if (!sanitizedLawyerId) throw new Error('Invalid lawyerId');

        const chain = new ApprovalChain({
            ...chainData,
            firmId: new mongoose.Types.ObjectId(firmId),
            lawyerId: sanitizedLawyerId,
            createdBy: sanitizedLawyerId
        });

        await chain.save();

        return ApprovalChain.findOne({ _id: chain._id, firmId }).lean();
    }

    /**
     * Update approval chain
     * @param {String} chainId - Chain ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer/User ID updating the chain
     * @param {Object} updates - Update data
     * @returns {Promise<Object|null>} - Updated approval chain or null
     */
    async updateApprovalChain(chainId, firmId, lawyerId, updates) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(chainId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);
        if (!sanitizedId || !sanitizedLawyerId) return null;

        // Prevent updating sensitive fields
        delete updates.firmId;
        delete updates.createdBy;
        delete updates._id;

        const chain = await ApprovalChain.findOneAndUpdate(
            { _id: sanitizedId, firmId },
            {
                ...updates,
                updatedBy: sanitizedLawyerId
            },
            { new: true }
        ).lean();

        return chain;
    }

    /**
     * Delete approval chain
     * @param {String} chainId - Chain ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer/User ID deleting the chain
     * @returns {Promise<Boolean>} - Success status
     */
    async deleteApprovalChain(chainId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(chainId);
        if (!sanitizedId) return false;

        const result = await ApprovalChain.findOneAndDelete({ _id: sanitizedId, firmId });
        return !!result;
    }

    /**
     * Get approval chains for entity type
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} entityType - Entity type
     * @returns {Promise<Array>} - Approval chains
     */
    async getApprovalChains(firmId, entityType) {
        if (!firmId) throw new Error('firmId is required');

        const query = { firmId, isActive: true };
        if (entityType) {
            query.entityTypes = entityType;
        }

        return ApprovalChain.find(query)
            .sort({ isDefault: -1, name: 1 })
            .lean();
    }

    /**
     * Apply approval chain to request
     * @param {String} requestId - Request ID
     * @param {String} chainId - Chain ID to apply
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Object|null>} - Updated request or null
     */
    async applyApprovalChain(requestId, chainId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedRequestId = sanitizeObjectId(requestId);
        const sanitizedChainId = sanitizeObjectId(chainId);
        if (!sanitizedRequestId || !sanitizedChainId) return null;

        // Get request and chain
        const request = await ApprovalRequest.findOne({ _id: sanitizedRequestId, firmId });
        const chain = await ApprovalChain.findOne({ _id: sanitizedChainId, firmId });

        if (!request || !chain) return null;

        // Build approval chain from template
        const approvalChain = [];
        for (const step of chain.steps) {
            const approverIds = await this._resolveApprovers(step, firmId, request);
            approverIds.forEach(approverId => {
                approvalChain.push({
                    approverId: new mongoose.Types.ObjectId(approverId),
                    order: step.order,
                    status: 'pending'
                });
            });
        }

        request.approvalChain = approvalChain;
        request.currentLevel = 1;
        await request.save();

        return this.getApprovalRequest(sanitizedRequestId, firmId);
    }

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL PROCESSING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Approve request
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} approverId - Approver user ID
     * @param {String} notes - Approval notes
     * @returns {Promise<Object|null>} - Updated request or null
     */
    async approve(requestId, firmId, approverId, notes = '') {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        const sanitizedApproverId = sanitizeObjectId(approverId);
        if (!sanitizedId || !sanitizedApproverId) return null;

        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request || request.status !== 'pending') return null;

        // Find approver in chain at current level
        const approverInChain = request.approvalChain.find(
            a => a.order === request.currentLevel &&
                 a.approverId.toString() === sanitizedApproverId &&
                 a.status === 'pending'
        );

        if (!approverInChain) {
            throw new Error('User is not a pending approver at current level');
        }

        // Prevent self-approval if configured
        if (request.requesterId.toString() === sanitizedApproverId) {
            // Check if self-approval is prevented (would need chain config)
            // For now, allow it
        }

        // Update approver status
        approverInChain.status = 'approved';
        approverInChain.actionDate = new Date();
        approverInChain.notes = notes;

        // Add to history
        request.history.push({
            action: 'approved',
            performedBy: sanitizedApproverId,
            timestamp: new Date(),
            notes,
            metadata: { level: request.currentLevel }
        });

        // Check if current level is complete
        const approversAtLevel = request.approvalChain.filter(a => a.order === request.currentLevel);
        const approvedAtLevel = approversAtLevel.filter(a => a.status === 'approved');

        // Simple: all approvers at level must approve
        if (approvedAtLevel.length === approversAtLevel.length) {
            // Move to next level or complete
            const maxLevel = Math.max(...request.approvalChain.map(a => a.order));

            if (request.currentLevel >= maxLevel) {
                // All levels approved - complete request
                request.status = 'approved';
                request.completedAt = new Date();
                request.completedBy = sanitizedApproverId;
                request.history.push({
                    action: 'approved',
                    performedBy: sanitizedApproverId,
                    timestamp: new Date(),
                    notes: 'All approval levels completed',
                    previousStatus: 'pending',
                    newStatus: 'approved'
                });
            } else {
                // Move to next level
                request.currentLevel += 1;
            }
        }

        await request.save();

        return this.getApprovalRequest(sanitizedId, firmId);
    }

    /**
     * Reject request
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} approverId - Approver user ID
     * @param {String} reason - Rejection reason
     * @returns {Promise<Object|null>} - Updated request or null
     */
    async reject(requestId, firmId, approverId, reason) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        const sanitizedApproverId = sanitizeObjectId(approverId);
        if (!sanitizedId || !sanitizedApproverId) return null;

        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request || request.status !== 'pending') return null;

        // Find approver in chain at current level
        const approverInChain = request.approvalChain.find(
            a => a.order === request.currentLevel &&
                 a.approverId.toString() === sanitizedApproverId &&
                 a.status === 'pending'
        );

        if (!approverInChain) {
            throw new Error('User is not a pending approver at current level');
        }

        // Update approver status
        approverInChain.status = 'rejected';
        approverInChain.actionDate = new Date();
        approverInChain.notes = reason;

        // Reject entire request
        request.status = 'rejected';
        request.completedAt = new Date();
        request.completedBy = sanitizedApproverId;
        request.history.push({
            action: 'rejected',
            performedBy: sanitizedApproverId,
            timestamp: new Date(),
            notes: reason,
            previousStatus: 'pending',
            newStatus: 'rejected'
        });

        await request.save();

        return this.getApprovalRequest(sanitizedId, firmId);
    }

    /**
     * Request more info
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} approverId - Approver user ID
     * @param {String} questions - Questions/info needed
     * @returns {Promise<Object|null>} - Updated request or null
     */
    async requestMoreInfo(requestId, firmId, approverId, questions) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        const sanitizedApproverId = sanitizeObjectId(approverId);
        if (!sanitizedId || !sanitizedApproverId) return null;

        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request || request.status !== 'pending') return null;

        // Update status
        request.status = 'info_requested';
        request.history.push({
            action: 'info_requested',
            performedBy: sanitizedApproverId,
            timestamp: new Date(),
            notes: questions,
            previousStatus: 'pending',
            newStatus: 'info_requested'
        });

        await request.save();

        return this.getApprovalRequest(sanitizedId, firmId);
    }

    /**
     * Delegate to another approver
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} approverId - Current approver user ID
     * @param {String} delegateId - Delegate to user ID
     * @param {String} reason - Delegation reason
     * @returns {Promise<Object|null>} - Updated request or null
     */
    async delegate(requestId, firmId, approverId, delegateId, reason) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        const sanitizedApproverId = sanitizeObjectId(approverId);
        const sanitizedDelegateId = sanitizeObjectId(delegateId);
        if (!sanitizedId || !sanitizedApproverId || !sanitizedDelegateId) return null;

        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request || request.status !== 'pending') return null;

        // Find approver in chain
        const approverInChain = request.approvalChain.find(
            a => a.order === request.currentLevel &&
                 a.approverId.toString() === sanitizedApproverId &&
                 a.status === 'pending'
        );

        if (!approverInChain) {
            throw new Error('User is not a pending approver at current level');
        }

        // Update delegation
        approverInChain.status = 'delegated';
        approverInChain.actionDate = new Date();
        approverInChain.delegatedTo = sanitizedDelegateId;
        approverInChain.delegatedReason = reason;

        // Add new approver
        request.approvalChain.push({
            approverId: sanitizedDelegateId,
            order: request.currentLevel,
            status: 'pending'
        });

        request.history.push({
            action: 'delegated',
            performedBy: sanitizedApproverId,
            timestamp: new Date(),
            notes: reason,
            metadata: { delegatedTo: sanitizedDelegateId }
        });

        await request.save();

        return this.getApprovalRequest(sanitizedId, firmId);
    }

    /**
     * Escalate to next level
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} reason - Escalation reason
     * @returns {Promise<Object|null>} - Updated request or null
     */
    async escalate(requestId, firmId, reason) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        if (!sanitizedId) return null;

        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request || request.status !== 'pending') return null;

        // Skip current level and move to next
        const approversAtLevel = request.approvalChain.filter(a => a.order === request.currentLevel);
        approversAtLevel.forEach(a => {
            if (a.status === 'pending') {
                a.status = 'skipped';
                a.notes = `Escalated: ${reason}`;
            }
        });

        const maxLevel = Math.max(...request.approvalChain.map(a => a.order));
        if (request.currentLevel < maxLevel) {
            request.currentLevel += 1;
        }

        request.history.push({
            action: 'escalated',
            timestamp: new Date(),
            notes: reason,
            metadata: { level: request.currentLevel }
        });

        await request.save();

        return this.getApprovalRequest(sanitizedId, firmId);
    }

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL QUERIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get pending approvals for approver
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} approverId - Approver user ID
     * @returns {Promise<Array>} - Pending approval requests
     */
    async getPendingApprovals(firmId, approverId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedApproverId = sanitizeObjectId(approverId);
        if (!sanitizedApproverId) return [];

        return ApprovalRequest.getPendingForApprover(firmId, sanitizedApproverId, { limit: 100 });
    }

    /**
     * Get my submitted requests
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} requesterId - Requester user ID
     * @returns {Promise<Array>} - My approval requests
     */
    async getMyRequests(firmId, requesterId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedRequesterId = sanitizeObjectId(requesterId);
        if (!sanitizedRequesterId) return [];

        return ApprovalRequest.getMyRequests(firmId, sanitizedRequesterId, { limit: 100 });
    }

    /**
     * Get approval history for entity
     * @param {String} entityType - Entity type
     * @param {String} entityId - Entity ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Array>} - Approval history
     */
    async getApprovalHistory(entityType, entityId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedEntityId = sanitizeObjectId(entityId);
        if (!sanitizedEntityId) return [];

        return ApprovalRequest.getHistoryForEntity(firmId, entityType, sanitizedEntityId);
    }

    /**
     * Get approval statistics
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {Object} dateRange - Date range {startDate, endDate}
     * @returns {Promise<Object>} - Approval statistics
     */
    async getApprovalStats(firmId, dateRange = {}) {
        if (!firmId) throw new Error('firmId is required');

        return ApprovalRequest.getStats(firmId, dateRange);
    }

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL RULES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create approval rule
     * @param {Object} ruleData - Rule configuration
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer/User ID creating the rule
     * @returns {Promise<Object|null>} - Created rule or null
     */
    async createApprovalRule(ruleData, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedLawyerId = sanitizeObjectId(lawyerId);
        if (!sanitizedLawyerId) throw new Error('Invalid lawyerId');

        return ApprovalRule.addRule(firmId, ruleData, sanitizedLawyerId);
    }

    /**
     * Update approval rule
     * @param {String} ruleId - Rule ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer/User ID updating the rule
     * @param {Object} updates - Update data
     * @returns {Promise<Object|null>} - Updated rule or null
     */
    async updateApprovalRule(ruleId, firmId, lawyerId, updates) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedRuleId = sanitizeObjectId(ruleId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);
        if (!sanitizedRuleId || !sanitizedLawyerId) return null;

        return ApprovalRule.updateRule(firmId, sanitizedRuleId, updates, sanitizedLawyerId);
    }

    /**
     * Delete approval rule
     * @param {String} ruleId - Rule ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer/User ID deleting the rule
     * @returns {Promise<Object|null>} - Updated rule set or null
     */
    async deleteApprovalRule(ruleId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedRuleId = sanitizeObjectId(ruleId);
        const sanitizedLawyerId = sanitizeObjectId(lawyerId);
        if (!sanitizedRuleId || !sanitizedLawyerId) return null;

        return ApprovalRule.deleteRule(firmId, sanitizedRuleId, sanitizedLawyerId);
    }

    /**
     * Evaluate rules to check if approval needed
     * @param {String} entityType - Entity type
     * @param {Object} entityData - Entity data to evaluate
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Object>} - {requiresApproval, rule, approvers}
     */
    async evaluateRules(entityType, entityData, firmId) {
        if (!firmId) throw new Error('firmId is required');

        // Map entity type to module/action
        const moduleActionMap = {
            quote: { module: 'finance', action: 'create' },
            discount: { module: 'finance', action: 'approve_invoice' },
            expense: { module: 'expenses', action: 'approve_expense' },
            invoice: { module: 'invoices', action: 'approve_invoice' }
        };

        const mapping = moduleActionMap[entityType];
        if (!mapping) {
            return { requiresApproval: false };
        }

        return ApprovalRule.requiresApproval(
            firmId,
            mapping.module,
            mapping.action,
            entityData
        );
    }

    /**
     * Get applicable rules for entity type
     * @param {String} entityType - Entity type
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Array>} - Applicable rules
     */
    async getApplicableRules(entityType, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const ruleSet = await ApprovalRule.findOne({ firmId }).lean();
        if (!ruleSet) return [];

        // Filter rules by entity type
        return ruleSet.rules.filter(rule => rule.isActive);
    }

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Notify approvers
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Boolean>} - Success status
     */
    async notifyApprovers(requestId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        if (!sanitizedId) return false;

        const request = await this.getApprovalRequest(sanitizedId, firmId);
        if (!request) return false;

        // Get current level approvers
        const currentApprovers = request.approvalChain.filter(
            a => a.order === request.currentLevel && a.status === 'pending'
        );

        // TODO: Send notifications via notification service
        // For now, just return success
        return true;
    }

    /**
     * Notify requestor
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} action - Action taken (approved, rejected, etc.)
     * @returns {Promise<Boolean>} - Success status
     */
    async notifyRequestor(requestId, firmId, action) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        if (!sanitizedId) return false;

        const request = await this.getApprovalRequest(sanitizedId, firmId);
        if (!request) return false;

        // TODO: Send notification to requestor
        return true;
    }

    /**
     * Send reminder for pending approval
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Boolean>} - Success status
     */
    async sendReminder(requestId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        if (!sanitizedId) return false;

        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request || request.status !== 'pending') return false;

        // Get current level approvers
        const currentApprovers = request.approvalChain.filter(
            a => a.order === request.currentLevel && a.status === 'pending'
        );

        // Record reminder
        currentApprovers.forEach(approver => {
            request.remindersSent.push({
                sentAt: new Date(),
                to: approver.approverId
            });
        });

        await request.save();

        // TODO: Send actual reminder notifications
        return true;
    }

    /**
     * Get overdue approvals
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {Number} overdueHours - Hours to consider overdue
     * @returns {Promise<Array>} - Overdue approval requests
     */
    async getOverdueApprovals(firmId, overdueHours = 24) {
        if (!firmId) throw new Error('firmId is required');

        return ApprovalRequest.getOverdue(firmId, overdueHours);
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTO-APPROVAL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Set auto-approval rule
     * @param {Object} ruleData - Auto-approval rule data
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} lawyerId - Lawyer/User ID
     * @returns {Promise<Object|null>} - Created rule or null
     */
    async setAutoApprovalRule(ruleData, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');

        // Add auto-approval hours to rule
        ruleData.autoApproveAfterHours = ruleData.autoApproveAfterHours || 48;
        return this.createApprovalRule(ruleData, firmId, lawyerId);
    }

    /**
     * Check if request can be auto-approved
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Boolean>} - Can be auto-approved
     */
    async checkAutoApproval(requestId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        if (!sanitizedId) return false;

        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request || request.status !== 'pending') return false;

        // Check if auto-approval time has passed
        if (request.autoApprovalAt && new Date() >= request.autoApprovalAt) {
            return true;
        }

        return false;
    }

    /**
     * Process auto-approval
     * @param {String} requestId - Request ID
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @returns {Promise<Object|null>} - Updated request or null
     */
    async processAutoApproval(requestId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedId = sanitizeObjectId(requestId);
        if (!sanitizedId) return null;

        const request = await ApprovalRequest.findOne({ _id: sanitizedId, firmId });
        if (!request || request.status !== 'pending') return null;

        // Auto-approve
        request.status = 'approved';
        request.autoApproved = true;
        request.autoApprovalReason = 'Auto-approved due to timeout';
        request.completedAt = new Date();
        request.history.push({
            action: 'auto_approved',
            timestamp: new Date(),
            notes: 'Auto-approved due to timeout',
            previousStatus: 'pending',
            newStatus: 'approved'
        });

        await request.save();

        return this.getApprovalRequest(sanitizedId, firmId);
    }

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL METRICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get average approval time
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} entityType - Entity type (optional)
     * @param {Object} dateRange - Date range {startDate, endDate}
     * @returns {Promise<Number>} - Average approval time in hours
     */
    async getAverageApprovalTime(firmId, entityType, dateRange = {}) {
        if (!firmId) throw new Error('firmId is required');

        const matchQuery = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: { $in: ['approved', 'rejected'] },
            completedAt: { $exists: true }
        };

        if (entityType) {
            matchQuery.entityType = entityType;
        }

        if (dateRange.startDate || dateRange.endDate) {
            matchQuery.createdAt = {};
            if (dateRange.startDate) matchQuery.createdAt.$gte = new Date(dateRange.startDate);
            if (dateRange.endDate) matchQuery.createdAt.$lte = new Date(dateRange.endDate);
        }

        const requests = await ApprovalRequest.find(matchQuery)
            .select('createdAt completedAt')
            .lean();

        if (requests.length === 0) return 0;

        const totalTime = requests.reduce((sum, req) => {
            const duration = req.completedAt - req.createdAt;
            return sum + duration;
        }, 0);

        return Math.round(totalTime / requests.length / (1000 * 60 * 60));
    }

    /**
     * Get approval rates
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {String} entityType - Entity type (optional)
     * @param {Object} dateRange - Date range {startDate, endDate}
     * @returns {Promise<Object>} - Approval/rejection rates
     */
    async getApprovalRates(firmId, entityType, dateRange = {}) {
        if (!firmId) throw new Error('firmId is required');

        const matchQuery = { firmId: new mongoose.Types.ObjectId(firmId) };

        if (entityType) {
            matchQuery.entityType = entityType;
        }

        if (dateRange.startDate || dateRange.endDate) {
            matchQuery.createdAt = {};
            if (dateRange.startDate) matchQuery.createdAt.$gte = new Date(dateRange.startDate);
            if (dateRange.endDate) matchQuery.createdAt.$lte = new Date(dateRange.endDate);
        }

        const stats = await ApprovalRequest.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const result = {
            total: 0,
            approved: 0,
            rejected: 0,
            pending: 0,
            cancelled: 0,
            approvalRate: 0,
            rejectionRate: 0
        };

        stats.forEach(s => {
            result[s._id] = s.count;
            result.total += s.count;
        });

        if (result.total > 0) {
            result.approvalRate = ((result.approved / result.total) * 100).toFixed(2);
            result.rejectionRate = ((result.rejected / result.total) * 100).toFixed(2);
        }

        return result;
    }

    /**
     * Get approval bottlenecks
     * @param {String} firmId - Firm ID (REQUIRED for multi-tenant isolation)
     * @param {Object} dateRange - Date range {startDate, endDate}
     * @returns {Promise<Array>} - Bottleneck analysis
     */
    async getBottlenecks(firmId, dateRange = {}) {
        if (!firmId) throw new Error('firmId is required');

        const matchQuery = {
            firmId: new mongoose.Types.ObjectId(firmId),
            status: 'pending'
        };

        if (dateRange.startDate || dateRange.endDate) {
            matchQuery.createdAt = {};
            if (dateRange.startDate) matchQuery.createdAt.$gte = new Date(dateRange.startDate);
            if (dateRange.endDate) matchQuery.createdAt.$lte = new Date(dateRange.endDate);
        }

        // Group by current level and count
        const bottlenecks = await ApprovalRequest.aggregate([
            { $match: matchQuery },
            { $unwind: '$approvalChain' },
            {
                $match: {
                    'approvalChain.status': 'pending',
                    $expr: { $eq: ['$approvalChain.order', '$currentLevel'] }
                }
            },
            {
                $group: {
                    _id: '$approvalChain.approverId',
                    count: { $sum: 1 },
                    requests: { $push: { id: '$_id', entityType: '$entityType', createdAt: '$createdAt' } }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Populate approver details
        const User = mongoose.model('User');
        for (const bottleneck of bottlenecks) {
            const user = await User.findOne({ _id: bottleneck._id, firmId })
                .select('firstName lastName email')
                .lean();
            bottleneck.approver = user;
        }

        return bottlenecks;
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Resolve approvers from step configuration
     * @private
     */
    async _resolveApprovers(step, firmId, request) {
        const User = mongoose.model('User');

        switch (step.approverType) {
            case 'specific':
                return step.approverIds || [];

            case 'role':
                const usersWithRole = await User.find({
                    firmId,
                    role: step.role,
                    isActive: true
                }).select('_id').lean();
                return usersWithRole.map(u => u._id);

            case 'manager':
            case 'requester_manager':
                const requester = await User.findOne({ _id: request.requesterId, firmId }).lean();
                if (requester && requester.managerId) {
                    return [requester.managerId];
                }
                return [];

            case 'dynamic':
                // Get value from entity data
                if (step.dynamicField && request.data) {
                    const value = this._getNestedValue(request.data, step.dynamicField);
                    if (Array.isArray(value)) return value;
                    if (value) return [value];
                }
                return [];

            default:
                return [];
        }
    }

    /**
     * Get nested value from object
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}

// Export singleton instance
module.exports = new ApprovalWorkflowService();
