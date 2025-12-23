// Activities for invoice approval workflow
// These run in the worker and can access external resources

const mongoose = require('mongoose');
const Invoice = require('../../models/invoice.model');
const InvoiceApproval = require('../../models/invoiceApproval.model');
const User = require('../../models/user.model');
const emailService = require('../../services/email.service');
const logger = require('../../utils/logger');

/**
 * Log the start of approval workflow
 */
async function logApprovalStart({ invoiceId, firmId, levels }) {
  logger.info(`Starting invoice approval workflow: ${invoiceId}, levels: ${levels}`);

  try {
    // Create audit log entry
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
      invoice.history.push({
        action: 'approval_started',
        date: new Date(),
        note: `Approval workflow started with ${levels} level(s)`
      });
      await invoice.save();
    }
  } catch (error) {
    logger.error('Error logging approval start:', error.message);
  }
}

/**
 * Get approval configuration for a firm
 */
async function getApprovalConfig(firmId) {
  // This would fetch the firm's approval configuration
  // For now, we'll return a default structure
  // In production, this should come from a FirmSettings model

  const Firm = mongoose.model('Firm');
  const firm = await Firm.findById(firmId);

  // Get users with specific roles for approval
  const managers = await User.find({
    firmId,
    role: { $in: ['manager', 'senior_lawyer', 'partner'] },
    isActive: true
  }).sort({ role: 1 });

  // Build approval hierarchy
  const approvalHierarchy = {
    levels: []
  };

  if (managers.length > 0) {
    // Level 1: Manager or Senior Lawyer
    const level1Approver = managers.find(u => u.role === 'manager' || u.role === 'senior_lawyer');
    if (level1Approver) {
      approvalHierarchy.levels.push({
        userId: level1Approver._id,
        email: level1Approver.email,
        name: `${level1Approver.firstName} ${level1Approver.lastName}`,
        role: level1Approver.role
      });
    }

    // Level 2: Director or Partner
    const level2Approver = managers.find(u => u.role === 'partner' || u.role === 'director');
    if (level2Approver && level2Approver._id.toString() !== level1Approver?._id.toString()) {
      approvalHierarchy.levels.push({
        userId: level2Approver._id,
        email: level2Approver.email,
        name: `${level2Approver.firstName} ${level2Approver.lastName}`,
        role: level2Approver.role
      });
    }

    // Level 3: Partner or CFO (for high amounts)
    const level3Approver = managers.find(u => u.role === 'partner' && u._id.toString() !== level1Approver?._id.toString() && u._id.toString() !== level2Approver?._id.toString());
    if (level3Approver) {
      approvalHierarchy.levels.push({
        userId: level3Approver._id,
        email: level3Approver.email,
        name: `${level3Approver.firstName} ${level3Approver.lastName}`,
        role: level3Approver.role
      });
    }
  }

  return approvalHierarchy;
}

/**
 * Get approver for specific level
 */
async function getApproverForLevel({ firmId, level, amount }) {
  try {
    const approvalConfig = await getApprovalConfig(firmId);

    if (approvalConfig.levels.length < level) {
      throw new Error(`No approver configured for level ${level}`);
    }

    const approver = approvalConfig.levels[level - 1];
    logger.info(`Level ${level} approver: ${approver.name} (${approver.email})`);

    return {
      userId: approver.userId,
      email: approver.email,
      name: approver.name,
      role: approver.role
    };
  } catch (error) {
    logger.error(`Error getting approver for level ${level}:`, error.message);
    throw error;
  }
}

/**
 * Notify approver via email
 */
async function notifyApprover({ invoiceId, approverId, level, amount }) {
  try {
    const approver = await User.findById(approverId);
    if (!approver) {
      throw new Error(`Approver not found: ${approverId}`);
    }

    const invoice = await Invoice.findById(invoiceId).populate('clientId');
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const approvalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoiceId}/approve`;

    // Format amount (convert from halalas if needed)
    const amountInSAR = typeof amount === 'number' && amount > 10000 ? (amount / 100).toFixed(2) : amount;

    const emailData = {
      to: approver.email,
      subject: `Invoice Approval Required - Level ${level}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Invoice Approval Required</h2>
          <p>Dear ${approver.firstName},</p>
          <p>An invoice requires your approval at Level ${level}.</p>

          <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Client:</strong> ${invoice.clientId?.name || 'N/A'}</p>
            <p><strong>Amount:</strong> ${amountInSAR} SAR</p>
            <p><strong>Approval Level:</strong> ${level}</p>
            <p><strong>Issue Date:</strong> ${invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : 'N/A'}</p>
            <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</p>
          </div>

          <div style="margin: 30px 0;">
            <a href="${approvalUrl}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Review & Approve Invoice
            </a>
          </div>

          <p style="color: #666; font-size: 12px;">
            Please review and approve or reject this invoice within 48 hours. If no action is taken, the approval will be automatically escalated.
          </p>

          <p>Best regards,<br>Traf3li Legal Management System</p>
        </div>
      `
    };

    await emailService.sendEmail(emailData, false); // Send synchronously for critical notifications
    logger.info(`Approval notification sent to ${approver.email} for invoice ${invoice.invoiceNumber}`);
  } catch (error) {
    logger.error('Error sending approval notification:', error.message);
    throw error;
  }
}

/**
 * Update invoice status based on approval decision
 */
async function updateInvoiceStatus({ invoiceId, status, reason }) {
  try {
    const updateData = {
      'approval.status': status
    };

    if (status === 'approved') {
      updateData['approval.approvedAt'] = new Date();
      updateData.status = 'pending_approval'; // Keep in pending until fully approved
    } else if (status === 'rejected') {
      updateData.status = 'draft'; // Revert to draft if rejected
    } else if (status === 'cancelled') {
      updateData.status = 'draft';
    }

    if (reason) {
      updateData['approval.rejectionReason'] = reason;
    }

    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      updateData,
      { new: true }
    );

    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Add to history
    invoice.history.push({
      action: status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'cancelled',
      date: new Date(),
      note: reason || `Invoice ${status}`
    });

    await invoice.save();

    logger.info(`Invoice ${invoice.invoiceNumber} status updated to: ${status}`);
  } catch (error) {
    logger.error('Error updating invoice status:', error.message);
    throw error;
  }
}

/**
 * Escalate approval to higher level or admin
 */
async function escalateApproval({ invoiceId, fromLevel, firmId }) {
  try {
    logger.warn(`Escalating invoice ${invoiceId} approval from level ${fromLevel}`);

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    // Find firm admin or partners
    const escalationRecipients = await User.find({
      firmId,
      role: { $in: ['admin', 'partner', 'owner'] },
      isActive: true
    });

    if (escalationRecipients.length === 0) {
      logger.error('No escalation recipients found');
      return;
    }

    // Notify all escalation recipients
    for (const recipient of escalationRecipients) {
      const emailData = {
        to: recipient.email,
        subject: `URGENT: Invoice Approval Escalation - ${invoice.invoiceNumber}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff9800; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
              <h2 style="margin: 0;">⚠️ ESCALATION ALERT</h2>
            </div>
            <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
              <p>Dear ${recipient.firstName},</p>
              <p>An invoice approval has been escalated due to timeout at Level ${fromLevel}.</p>

              <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ff9800;">
                <h3 style="margin-top: 0;">Invoice Details</h3>
                <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
                <p><strong>Amount:</strong> ${(invoice.totalAmount / 100).toFixed(2)} SAR</p>
                <p><strong>Escalated From:</strong> Level ${fromLevel}</p>
                <p><strong>Reason:</strong> No response within 48 hours</p>
              </div>

              <p>Please review this invoice immediately and take appropriate action.</p>

              <div style="margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/invoices/${invoiceId}/approve"
                   style="background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Review Escalated Invoice
                </a>
              </div>

              <p>Best regards,<br>Traf3li Legal Management System</p>
            </div>
          </div>
        `
      };

      await emailService.sendEmail(emailData, false);
    }

    // Update invoice history
    invoice.history.push({
      action: 'escalated',
      date: new Date(),
      note: `Approval escalated from level ${fromLevel} due to timeout`
    });
    await invoice.save();

    logger.info(`Escalation notifications sent for invoice ${invoice.invoiceNumber}`);
  } catch (error) {
    logger.error('Error escalating approval:', error.message);
    throw error;
  }
}

/**
 * Notify requester of rejection
 */
async function notifyRejection({ invoiceId, requestedBy, reason }) {
  try {
    const requester = await User.findById(requestedBy);
    if (!requester) {
      throw new Error(`Requester not found: ${requestedBy}`);
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const emailData = {
      to: requester.email,
      subject: `Invoice ${invoice.invoiceNumber} Rejected`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #f44336; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">Invoice Rejected</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p>Dear ${requester.firstName},</p>
            <p>Your invoice has been rejected during the approval process.</p>

            <div style="background: #ffebee; padding: 15px; margin: 20px 0; border-left: 4px solid #f44336;">
              <h3 style="margin-top: 0;">Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Amount:</strong> ${(invoice.totalAmount / 100).toFixed(2)} SAR</p>
              <p><strong>Rejection Reason:</strong> ${reason || 'No reason provided'}</p>
            </div>

            <p>Please review the rejection reason and make necessary corrections before resubmitting.</p>

            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/invoices/${invoiceId}/edit"
                 style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Edit Invoice
              </a>
            </div>

            <p>Best regards,<br>Traf3li Legal Management System</p>
          </div>
        </div>
      `
    };

    await emailService.sendEmail(emailData, false);
    logger.info(`Rejection notification sent to ${requester.email} for invoice ${invoice.invoiceNumber}`);
  } catch (error) {
    logger.error('Error sending rejection notification:', error.message);
    throw error;
  }
}

/**
 * Notify requester of approval completion
 */
async function notifyApprovalComplete({ invoiceId, requestedBy }) {
  try {
    const requester = await User.findById(requestedBy);
    if (!requester) {
      throw new Error(`Requester not found: ${requestedBy}`);
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice not found: ${invoiceId}`);
    }

    const emailData = {
      to: requester.email,
      subject: `Invoice ${invoice.invoiceNumber} Approved`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #4CAF50; color: white; padding: 15px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">✓ Invoice Approved</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
            <p>Dear ${requester.firstName},</p>
            <p>Great news! Your invoice has been fully approved.</p>

            <div style="background: #e8f5e9; padding: 15px; margin: 20px 0; border-left: 4px solid #4CAF50;">
              <h3 style="margin-top: 0;">Invoice Details</h3>
              <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
              <p><strong>Amount:</strong> ${(invoice.totalAmount / 100).toFixed(2)} SAR</p>
              <p><strong>Status:</strong> Approved</p>
              <p><strong>Approved At:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>You can now proceed to send this invoice to the client.</p>

            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/invoices/${invoiceId}"
                 style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Invoice
              </a>
              <a href="${process.env.FRONTEND_URL}/invoices/${invoiceId}/send"
                 style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-left: 10px;">
                Send to Client
              </a>
            </div>

            <p>Best regards,<br>Traf3li Legal Management System</p>
          </div>
        </div>
      `
    };

    await emailService.sendEmail(emailData, false);
    logger.info(`Approval completion notification sent to ${requester.email} for invoice ${invoice.invoiceNumber}`);
  } catch (error) {
    logger.error('Error sending approval completion notification:', error.message);
    throw error;
  }
}

module.exports = {
  logApprovalStart,
  getApproverForLevel,
  notifyApprover,
  updateInvoiceStatus,
  escalateApproval,
  notifyRejection,
  notifyApprovalComplete
};
