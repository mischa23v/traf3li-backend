const express = require('express');
const router = express.Router();
const { Connection, Client } = require('@temporalio/client');
const Invoice = require('../models/invoice.model');
const InvoiceApproval = require('../models/invoiceApproval.model');
const { authenticate, checkFirmPermission } = require('../middlewares');
const logger = require('../utils/logger');

// Middleware
router.use(authenticate);

// Temporal client (will be initialized on first use)
let temporalClient = null;

router.post('/:id/submit-approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalLevels, notes } = req.body;
    const userId = req.user._id;
    const firmId = req.user.firmId;

    // Get invoice
    const invoice = await Invoice.findOne({ _id: id, firmId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check if already has pending approval
    const existingWorkflowId = getWorkflowId(id);
    const client = await getTemporalClient();

    try {
      // Check if workflow already exists
      const handle = client.workflow.getHandle(existingWorkflowId);
      const description = await handle.describe();

      if (description.status.name !== 'COMPLETED' && description.status.name !== 'FAILED') {
        return res.status(400).json({
          message: 'Invoice approval workflow already in progress',
          workflowId: existingWorkflowId
        });
      }
    } catch (error) {
      // Workflow doesn't exist, which is fine
    }

    // Start workflow
    const workflowParams = {
      invoiceId: id,
      firmId: firmId.toString(),
      amount: invoice.totalAmount,
      requestedBy: userId.toString(),
      approvalLevels: approvalLevels || undefined
    };

    const handle = await client.workflow.start('invoiceApprovalWorkflow', {
      taskQueue: 'invoice-approval',
      workflowId: existingWorkflowId,
      args: [workflowParams]
    });

    // Update invoice status
    invoice.status = 'pending_approval';
    invoice.approval = {
      required: true,
      workflowId: existingWorkflowId,
      workflowRunId: handle.firstExecutionRunId,
      submittedAt: new Date(),
      submittedBy: userId
    };

    if (notes) {
      invoice.approval.notes = notes;
    }

    invoice.history.push({
      action: 'approval_submitted',
      date: new Date(),
      user: userId,
      note: notes || 'Invoice submitted for approval via Temporal workflow'
    });

    await invoice.save();

    logger.info(`Started approval workflow for invoice ${invoice.invoiceNumber}: ${existingWorkflowId}`);

    res.status(200).json({
      message: 'Invoice approval workflow started',
      workflowId: existingWorkflowId,
      workflowRunId: handle.firstExecutionRunId,
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status
      }
    });
  } catch (error) {
    logger.error('Error starting approval workflow:', error);
    res.status(500).json({
      message: 'Failed to start approval workflow',
      error: error.message
    });
  }
});

router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.user._id;
    const firmId = req.user.firmId;

    // Get invoice
    const invoice = await Invoice.findOne({ _id: id, firmId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!invoice.approval?.workflowId) {
      return res.status(400).json({ message: 'No approval workflow found for this invoice' });
    }

    // Get workflow handle
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(invoice.approval.workflowId);

    // Send approval signal
    await handle.signal('approvalDecision', {
      approved: true,
      approverId: userId.toString(),
      comment: comment || '',
      timestamp: new Date().toISOString()
    });

    // Update invoice history
    invoice.history.push({
      action: 'approved',
      date: new Date(),
      user: userId,
      note: comment || 'Invoice approved'
    });
    await invoice.save();

    logger.info(`Approval signal sent for invoice ${invoice.invoiceNumber} by user ${userId}`);

    res.status(200).json({
      message: 'Approval signal sent successfully',
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status
      }
    });
  } catch (error) {
    logger.error('Error sending approval signal:', error);
    res.status(500).json({
      message: 'Failed to send approval signal',
      error: error.message
    });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const firmId = req.user.firmId;

    if (!reason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    // Get invoice
    const invoice = await Invoice.findOne({ _id: id, firmId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!invoice.approval?.workflowId) {
      return res.status(400).json({ message: 'No approval workflow found for this invoice' });
    }

    // Get workflow handle
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(invoice.approval.workflowId);

    // Send rejection signal
    await handle.signal('approvalDecision', {
      approved: false,
      approverId: userId.toString(),
      comment: reason,
      timestamp: new Date().toISOString()
    });

    // Update invoice history
    invoice.history.push({
      action: 'rejected',
      date: new Date(),
      user: userId,
      note: reason
    });
    await invoice.save();

    logger.info(`Rejection signal sent for invoice ${invoice.invoiceNumber} by user ${userId}`);

    res.status(200).json({
      message: 'Rejection signal sent successfully',
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status
      }
    });
  } catch (error) {
    logger.error('Error sending rejection signal:', error);
    res.status(500).json({
      message: 'Failed to send rejection signal',
      error: error.message
    });
  }
});

router.get('/:id/approval-status', async (req, res) => {
  try {
    const { id } = req.params;
    const firmId = req.user.firmId;

    // Get invoice
    const invoice = await Invoice.findOne({ _id: id, firmId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!invoice.approval?.workflowId) {
      return res.status(404).json({
        message: 'No approval workflow found for this invoice',
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          approvalRequired: false
        }
      });
    }

    // Get workflow handle
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(invoice.approval.workflowId);

    // Query workflow status
    const status = await handle.query('getApprovalStatus');
    const description = await handle.describe();

    res.status(200).json({
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status
      },
      workflow: {
        workflowId: invoice.approval.workflowId,
        runId: description.runId,
        status: description.status.name,
        startTime: description.startTime,
        closeTime: description.closeTime
      },
      approval: status
    });
  } catch (error) {
    logger.error('Error querying approval status:', error);
    res.status(500).json({
      message: 'Failed to query approval status',
      error: error.message
    });
  }
});

router.post('/:id/cancel-approval', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    const firmId = req.user.firmId;

    // Get invoice
    const invoice = await Invoice.findOne({ _id: id, firmId });
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (!invoice.approval?.workflowId) {
      return res.status(400).json({ message: 'No approval workflow found for this invoice' });
    }

    // Get workflow handle
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(invoice.approval.workflowId);

    // Send cancellation signal
    await handle.signal('cancelApproval', reason || 'Cancelled by user');

    // Update invoice
    invoice.status = 'draft';
    invoice.approval.status = 'cancelled';
    invoice.approval.cancelledAt = new Date();
    invoice.approval.cancelledBy = userId;

    invoice.history.push({
      action: 'approval_cancelled',
      date: new Date(),
      user: userId,
      note: reason || 'Approval workflow cancelled'
    });

    await invoice.save();

    logger.info(`Approval workflow cancelled for invoice ${invoice.invoiceNumber} by user ${userId}`);

    res.status(200).json({
      message: 'Approval workflow cancelled successfully',
      invoice: {
        id: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status
      }
    });
  } catch (error) {
    logger.error('Error cancelling approval workflow:', error);
    res.status(500).json({
      message: 'Failed to cancel approval workflow',
      error: error.message
    });
  }
});

router.get('/pending-approvals', async (req, res) => {
  try {
    const userId = req.user._id;
    const firmId = req.user.firmId;

    // Find invoices with pending approvals
    const invoices = await Invoice.find({
      firmId,
      status: 'pending_approval',
      'approval.workflowId': { $exists: true }
    })
      .populate('clientId', 'name email')
      .populate('approval.submittedBy', 'firstName lastName email')
      .sort({ 'approval.submittedAt': -1 });

    const client = await getTemporalClient();
    const pendingApprovals = [];

    for (const invoice of invoices) {
      try {
        const handle = client.workflow.getHandle(invoice.approval.workflowId);
        const status = await handle.query('getApprovalStatus');

        // Check if current user is the current approver
        // (This would require additional logic to match user to approval level)
        pendingApprovals.push({
          invoice: {
            id: invoice._id,
            invoiceNumber: invoice.invoiceNumber,
            amount: invoice.totalAmount,
            client: invoice.clientId,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate
          },
          approval: {
            workflowId: invoice.approval.workflowId,
            submittedAt: invoice.approval.submittedAt,
            submittedBy: invoice.approval.submittedBy,
            currentLevel: status.currentLevel,
            maxLevel: status.maxLevel,
            status: status.status,
            decisions: status.decisions
          }
        });
      } catch (error) {
        logger.error(`Error querying workflow for invoice ${invoice._id}:`, error.message);
      }
    }

    res.status(200).json({
      count: pendingApprovals.length,
      approvals: pendingApprovals
    });
  } catch (error) {
    logger.error('Error getting pending approvals:', error);
    res.status(500).json({
      message: 'Failed to get pending approvals',
      error: error.message
    });
  }
});

module.exports = router;
