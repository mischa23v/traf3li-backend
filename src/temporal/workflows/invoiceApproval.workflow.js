const { proxyActivities, defineSignal, defineQuery, sleep, condition } = require('@temporalio/workflow');

// Import activities
const activities = proxyActivities({
  startToCloseTimeout: '5 minutes',
  retry: { maximumAttempts: 3 }
});

// Define signals for external interaction
const approvalDecisionSignal = defineSignal('approvalDecision');
const cancelApprovalSignal = defineSignal('cancelApproval');

// Define queries for status checks
const getApprovalStatusQuery = defineQuery('getApprovalStatus');

/**
 * Invoice Approval Workflow
 * Handles multi-level approval with escalation and timeout handling
 */
async function invoiceApprovalWorkflow(params) {
  const { invoiceId, firmId, amount, requestedBy, approvalLevels } = params;

  // State management
  const state = {
    currentLevel: 1,
    maxLevel: approvalLevels || calculateApprovalLevels(amount),
    decisions: [],
    status: 'pending',
    escalated: false,
    cancelReason: null
  };

  let pendingDecision = null;
  let cancelled = false;

  // Query handler
  getApprovalStatusQuery.handler(() => ({ ...state }));

  // Signal handlers
  approvalDecisionSignal.handler((decision) => {
    pendingDecision = decision;
  });

  cancelApprovalSignal.handler((reason) => {
    cancelled = true;
    state.cancelReason = reason;
  });

  // Notify initial submission
  await activities.logApprovalStart({ invoiceId, firmId, levels: state.maxLevel });

  for (let level = 1; level <= state.maxLevel; level++) {
    if (cancelled) break;

    state.currentLevel = level;
    pendingDecision = null;

    // Get approver for this level
    const approver = await activities.getApproverForLevel({ firmId, level, amount });

    // Notify approver
    await activities.notifyApprover({
      invoiceId,
      approverId: approver.userId,
      level,
      amount
    });

    // Wait for decision or timeout (48 hours)
    const TIMEOUT_MS = 48 * 60 * 60 * 1000;
    const deadline = Date.now() + TIMEOUT_MS;

    const gotDecision = await condition(
      () => pendingDecision !== null || cancelled,
      TIMEOUT_MS
    );

    if (cancelled) {
      state.status = 'cancelled';
      await activities.updateInvoiceStatus({ invoiceId, status: 'cancelled', reason: state.cancelReason });
      return { status: 'cancelled', reason: state.cancelReason, decisions: state.decisions };
    }

    if (!gotDecision) {
      // Timeout - escalate
      state.escalated = true;
      await activities.escalateApproval({ invoiceId, fromLevel: level, firmId });
      state.decisions.push({ level, decision: 'escalated', timestamp: new Date().toISOString() });
      continue;
    }

    // Record decision
    state.decisions.push({
      level,
      ...pendingDecision,
      timestamp: new Date().toISOString()
    });

    if (!pendingDecision.approved) {
      state.status = 'rejected';
      await activities.updateInvoiceStatus({ invoiceId, status: 'rejected', reason: pendingDecision.comment });
      await activities.notifyRejection({ invoiceId, requestedBy, reason: pendingDecision.comment });
      return { status: 'rejected', decisions: state.decisions };
    }
  }

  if (!cancelled) {
    state.status = 'approved';
    await activities.updateInvoiceStatus({ invoiceId, status: 'approved' });
    await activities.notifyApprovalComplete({ invoiceId, requestedBy });
  }

  return { status: state.status, decisions: state.decisions };
}

function calculateApprovalLevels(amount) {
  if (amount >= 100000) return 3;
  if (amount >= 10000) return 2;
  return 1;
}

module.exports = { invoiceApprovalWorkflow };
