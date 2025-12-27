/**
 * Quote Workflow Service
 * Security: All methods require firmId parameter for multi-tenant isolation
 *
 * Handles comprehensive quote workflow including:
 * - Quote creation and duplication
 * - Version management and comparison
 * - Approval workflows
 * - Quote sending and tracking
 * - Client responses
 * - Conversion to invoices/contracts
 * - Expiry management
 * - Analytics and metrics
 */

const Quote = require('../models/quote.model');
const Lead = require('../models/lead.model');
const Client = require('../models/client.model');
const Invoice = require('../models/invoice.model');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const EmailService = require('./email.service');
const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Helper for regex safety
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

class QuoteWorkflowService {
    // ═══════════════════════════════════════════════════════════════
    // 1. QUOTE CREATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create quote from lead
     * @param {string} leadId - Lead ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     * @param {object} quoteData - Quote data
     */
    async createFromLead(leadId, firmId, lawyerId, quoteData) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedLeadId = sanitizeObjectId(leadId);

        // Fetch lead with firm isolation
        const lead = await Lead.findOne({
            _id: sanitizedLeadId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!lead) {
            throw CustomException('Lead not found', 404);
        }

        // Build customer info from lead
        const customerInfo = {
            name: lead.type === 'company'
                ? lead.companyName
                : `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            email: lead.email,
            phone: lead.phone,
            company: lead.type === 'company' ? lead.companyName : null,
            address: lead.address
        };

        // Create quote
        const quote = new Quote({
            ...quoteData,
            firmId: new mongoose.Types.ObjectId(firmId),
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            leadId: sanitizedLeadId,
            customerInfo,
            createdBy: new mongoose.Types.ObjectId(lawyerId),
            status: 'draft'
        });

        await quote.save();

        logger.info(`Quote ${quote.quoteId} created from lead ${lead.leadId}`);
        return quote;
    }

    /**
     * Create quote for existing client
     * @param {string} clientId - Client ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     * @param {object} quoteData - Quote data
     */
    async createFromClient(clientId, firmId, lawyerId, quoteData) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedClientId = sanitizeObjectId(clientId);

        // Fetch client with firm isolation
        const client = await Client.findOne({
            _id: sanitizedClientId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!client) {
            throw CustomException('Client not found', 404);
        }

        // Build customer info from client
        const customerInfo = {
            name: client.displayName || client.companyName,
            email: client.email,
            phone: client.phone,
            company: client.clientType === 'company' ? client.companyName : null,
            address: client.address
        };

        // Create quote
        const quote = new Quote({
            ...quoteData,
            firmId: new mongoose.Types.ObjectId(firmId),
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            clientId: sanitizedClientId,
            customerInfo,
            createdBy: new mongoose.Types.ObjectId(lawyerId),
            status: 'draft'
        });

        await quote.save();

        logger.info(`Quote ${quote.quoteId} created for client ${client.clientNumber}`);
        return quote;
    }

    /**
     * Duplicate existing quote
     * @param {string} quoteId - Quote ID to duplicate
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     */
    async duplicateQuote(quoteId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        // Fetch original quote with firm isolation
        const originalQuote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!originalQuote) {
            throw CustomException('Quote not found', 404);
        }

        // Create duplicate (exclude certain fields)
        const quoteObject = originalQuote.toObject();
        delete quoteObject._id;
        delete quoteObject.quoteId;
        delete quoteObject.createdAt;
        delete quoteObject.updatedAt;
        delete quoteObject.sentAt;
        delete quoteObject.viewedAt;
        delete quoteObject.respondedAt;
        delete quoteObject.viewHistory;
        delete quoteObject.signatures;
        delete quoteObject.pdfUrl;
        delete quoteObject.pdfGeneratedAt;

        const duplicatedQuote = new Quote({
            ...quoteObject,
            status: 'draft',
            title: `${originalQuote.title} (Copy)`,
            createdBy: new mongoose.Types.ObjectId(lawyerId),
            revisionNumber: 1,
            previousVersionId: null
        });

        await duplicatedQuote.save();

        logger.info(`Quote ${originalQuote.quoteId} duplicated to ${duplicatedQuote.quoteId}`);
        return duplicatedQuote;
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. QUOTE VERSIONING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create new revision of quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     * @param {object} changes - Changes to apply
     */
    async createRevision(quoteId, firmId, lawyerId, changes) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        // Fetch current quote with firm isolation
        const currentQuote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!currentQuote) {
            throw CustomException('Quote not found', 404);
        }

        // Create new revision
        const quoteObject = currentQuote.toObject();
        delete quoteObject._id;
        delete quoteObject.quoteId;
        delete quoteObject.createdAt;
        delete quoteObject.updatedAt;

        const revision = new Quote({
            ...quoteObject,
            ...changes,
            status: 'revised',
            revisionNumber: (currentQuote.revisionNumber || 1) + 1,
            previousVersionId: currentQuote._id,
            createdBy: new mongoose.Types.ObjectId(lawyerId)
        });

        await revision.save();

        // Update original to mark as revised
        currentQuote.status = 'revised';
        await currentQuote.save();

        logger.info(`Quote revision created: ${revision.quoteId} (v${revision.revisionNumber})`);
        return revision;
    }

    /**
     * Get version history of quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     */
    async getVersionHistory(quoteId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        // Get current quote
        const currentQuote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!currentQuote) {
            throw CustomException('Quote not found', 404);
        }

        // Build version chain
        const versions = [currentQuote];
        let previousId = currentQuote.previousVersionId;

        while (previousId) {
            const previousVersion = await Quote.findOne({
                _id: previousId,
                firmId: new mongoose.Types.ObjectId(firmId)
            });

            if (!previousVersion) break;

            versions.push(previousVersion);
            previousId = previousVersion.previousVersionId;
        }

        // Sort by revision number descending
        versions.sort((a, b) => b.revisionNumber - a.revisionNumber);

        return versions;
    }

    /**
     * Compare two versions of quote
     * @param {string} quoteId - Base quote ID
     * @param {number} version1 - First version number
     * @param {number} version2 - Second version number
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     */
    async compareVersions(quoteId, version1, version2, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        // Get all versions
        const versions = await this.getVersionHistory(sanitizedQuoteId, firmId);

        const v1 = versions.find(v => v.revisionNumber === version1);
        const v2 = versions.find(v => v.revisionNumber === version2);

        if (!v1 || !v2) {
            throw CustomException('One or both versions not found', 404);
        }

        // Compare key fields
        const differences = {
            title: v1.title !== v2.title ? { v1: v1.title, v2: v2.title } : null,
            totals: v1.totals.grandTotal !== v2.totals.grandTotal
                ? { v1: v1.totals.grandTotal, v2: v2.totals.grandTotal }
                : null,
            itemCount: v1.items.length !== v2.items.length
                ? { v1: v1.items.length, v2: v2.items.length }
                : null,
            validUntil: v1.validUntil?.getTime() !== v2.validUntil?.getTime()
                ? { v1: v1.validUntil, v2: v2.validUntil }
                : null,
            status: v1.status !== v2.status ? { v1: v1.status, v2: v2.status } : null
        };

        // Remove null differences
        Object.keys(differences).forEach(key => {
            if (differences[key] === null) delete differences[key];
        });

        return {
            version1: v1,
            version2: v2,
            differences
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. QUOTE APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Submit quote for approval
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID submitting
     * @param {array} approverIds - Array of approver user IDs
     */
    async submitForApproval(quoteId, firmId, lawyerId, approverIds) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Initialize approvals array if not exists
        if (!quote.approvals) {
            quote.approvals = [];
        }

        // Create approval records
        const approvals = approverIds.map(approverId => ({
            approverId: new mongoose.Types.ObjectId(sanitizeObjectId(approverId)),
            status: 'pending',
            requestedAt: new Date(),
            requestedBy: new mongoose.Types.ObjectId(lawyerId)
        }));

        quote.approvals = approvals;
        quote.approvalStatus = 'pending';

        await quote.save();

        logger.info(`Quote ${quote.quoteId} submitted for approval to ${approverIds.length} approvers`);

        // TODO: Send notification emails to approvers

        return quote;
    }

    /**
     * Approve quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} approverId - Approver user ID
     * @param {string} notes - Approval notes
     */
    async approveQuote(quoteId, firmId, approverId, notes = '') {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);
        const sanitizedApproverId = sanitizeObjectId(approverId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Find approval record
        const approval = quote.approvals?.find(
            a => a.approverId.toString() === sanitizedApproverId
        );

        if (!approval) {
            throw CustomException('No approval request found for this user', 404);
        }

        if (approval.status !== 'pending') {
            throw CustomException('Approval already processed', 400);
        }

        // Update approval
        approval.status = 'approved';
        approval.approvedAt = new Date();
        approval.notes = notes;

        // Check if all approvals are complete
        const allApproved = quote.approvals.every(a => a.status === 'approved');
        const anyRejected = quote.approvals.some(a => a.status === 'rejected');

        if (allApproved) {
            quote.approvalStatus = 'approved';
        } else if (anyRejected) {
            quote.approvalStatus = 'rejected';
        } else {
            quote.approvalStatus = 'pending';
        }

        await quote.save();

        logger.info(`Quote ${quote.quoteId} approved by ${approverId}`);
        return quote;
    }

    /**
     * Reject quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} approverId - Approver user ID
     * @param {string} reason - Rejection reason
     */
    async rejectQuote(quoteId, firmId, approverId, reason) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);
        const sanitizedApproverId = sanitizeObjectId(approverId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Find approval record
        const approval = quote.approvals?.find(
            a => a.approverId.toString() === sanitizedApproverId
        );

        if (!approval) {
            throw CustomException('No approval request found for this user', 404);
        }

        if (approval.status !== 'pending') {
            throw CustomException('Approval already processed', 400);
        }

        // Update approval
        approval.status = 'rejected';
        approval.rejectedAt = new Date();
        approval.notes = reason;

        // One rejection fails the entire approval
        quote.approvalStatus = 'rejected';

        await quote.save();

        logger.info(`Quote ${quote.quoteId} rejected by ${approverId}`);
        return quote;
    }

    /**
     * Get approval status
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     */
    async getApprovalStatus(quoteId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        })
        .populate('approvals.approverId', 'firstName lastName email')
        .populate('approvals.requestedBy', 'firstName lastName');

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        return {
            quoteId: quote.quoteId,
            approvalStatus: quote.approvalStatus || 'not_requested',
            approvals: quote.approvals || [],
            totalApprovers: quote.approvals?.length || 0,
            approvedCount: quote.approvals?.filter(a => a.status === 'approved').length || 0,
            rejectedCount: quote.approvals?.filter(a => a.status === 'rejected').length || 0,
            pendingCount: quote.approvals?.filter(a => a.status === 'pending').length || 0
        };
    }

    /**
     * Get quotes pending approval for user
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} approverId - Approver user ID
     */
    async getPendingApprovals(firmId, approverId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedApproverId = sanitizeObjectId(approverId);

        const quotes = await Quote.find({
            firmId: new mongoose.Types.ObjectId(firmId),
            'approvals.approverId': new mongoose.Types.ObjectId(sanitizedApproverId),
            'approvals.status': 'pending'
        })
        .populate('createdBy', 'firstName lastName email')
        .populate('clientId', 'firstName lastName companyName')
        .populate('leadId', 'firstName lastName companyName')
        .sort({ createdAt: -1 });

        return quotes;
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. QUOTE SENDING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Send quote to client via email
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     * @param {string} recipientEmail - Recipient email
     * @param {string} message - Custom message
     */
    async sendToClient(quoteId, firmId, lawyerId, recipientEmail, message = '') {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Check if quote needs approval
        if (quote.approvalStatus === 'pending') {
            throw CustomException('Quote is pending approval', 400);
        }

        if (quote.approvalStatus === 'rejected') {
            throw CustomException('Quote has been rejected', 400);
        }

        // Generate secure view link
        const viewToken = await this.generateViewLink(quoteId, firmId);

        // Build email HTML
        const viewUrl = `${process.env.APP_URL || 'https://app.traf3li.com'}/quotes/view/${viewToken}`;

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>عرض سعر جديد من ${process.env.APP_NAME || 'Traf3li'}</h2>

                <p>مرحباً ${quote.customerInfo.name || 'عزيزي العميل'},</p>

                ${message ? `<p>${message}</p>` : ''}

                <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
                    <h3>${quote.title}</h3>
                    <p><strong>رقم العرض:</strong> ${quote.quoteId}</p>
                    <p><strong>التاريخ:</strong> ${quote.quoteDate?.toLocaleDateString('ar-SA')}</p>
                    <p><strong>صالح حتى:</strong> ${quote.validUntil?.toLocaleDateString('ar-SA')}</p>
                    <p><strong>المبلغ الإجمالي:</strong> ${quote.totals.grandTotal.toLocaleString()} ${quote.currency}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${viewUrl}"
                       style="background-color: #0066cc; color: white; padding: 12px 30px;
                              text-decoration: none; border-radius: 5px; display: inline-block;">
                        عرض التفاصيل
                    </a>
                </div>

                <p style="color: #666; font-size: 12px;">
                    إذا كان لديك أي أسئلة، يرجى التواصل معنا.
                </p>
            </div>
        `;

        // Send email
        await EmailService.sendEmail({
            to: recipientEmail,
            subject: `عرض سعر ${quote.quoteId} - ${quote.title}`,
            html: emailHtml
        });

        // Update quote status
        if (quote.status === 'draft') {
            quote.status = 'sent';
        }
        quote.sentAt = new Date();

        // Record in send history
        if (!quote.sendHistory) {
            quote.sendHistory = [];
        }
        quote.sendHistory.push({
            sentAt: new Date(),
            sentTo: recipientEmail,
            sentBy: new mongoose.Types.ObjectId(lawyerId),
            message
        });

        await quote.save();

        logger.info(`Quote ${quote.quoteId} sent to ${recipientEmail}`);
        return { quote, viewUrl };
    }

    /**
     * Resend quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     */
    async resendQuote(quoteId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (!quote.customerInfo?.email) {
            throw CustomException('No customer email found', 400);
        }

        return this.sendToClient(
            quoteId,
            firmId,
            lawyerId,
            quote.customerInfo.email,
            'نعيد إرسال عرض السعر حسب طلبكم'
        );
    }

    /**
     * Generate secure view link for quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     */
    async generateViewLink(quoteId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Generate secure token (valid for 90 days)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 90);

        // Store token in quote
        quote.viewToken = token;
        quote.viewTokenExpiresAt = expiresAt;
        await quote.save();

        return token;
    }

    /**
     * Track quote view
     * @param {string} quoteId - Quote ID
     * @param {object} viewerInfo - Viewer information
     */
    async trackView(quoteId, viewerInfo = {}) {
        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({ _id: sanitizedQuoteId });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        // Record view using the model's method
        await quote.recordView(
            viewerInfo.ipAddress || 'unknown',
            viewerInfo.userAgent || 'unknown'
        );

        logger.info(`Quote ${quote.quoteId} viewed from ${viewerInfo.ipAddress}`);
        return quote;
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. QUOTE RESPONSE (Client Actions)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Client accepts quote
     * @param {string} quoteId - Quote ID
     * @param {object} signatureData - Signature data
     */
    async acceptQuote(quoteId, signatureData) {
        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({ _id: sanitizedQuoteId });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status === 'accepted') {
            throw CustomException('Quote already accepted', 400);
        }

        if (quote.isExpired) {
            throw CustomException('Quote has expired', 400);
        }

        // Record client signature
        if (!quote.signatures) {
            quote.signatures = {};
        }

        quote.signatures.clientSignature = {
            signedByName: signatureData.name,
            signedByEmail: signatureData.email,
            signedAt: new Date(),
            signature: signatureData.signature,
            ipAddress: signatureData.ipAddress
        };

        quote.status = 'accepted';
        quote.respondedAt = new Date();

        await quote.save();

        logger.info(`Quote ${quote.quoteId} accepted by client`);

        // TODO: Send notification to firm

        return quote;
    }

    /**
     * Client rejects quote
     * @param {string} quoteId - Quote ID
     * @param {string} reason - Rejection reason
     */
    async rejectQuoteByClient(quoteId, reason) {
        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({ _id: sanitizedQuoteId });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status === 'accepted') {
            throw CustomException('Cannot reject an accepted quote', 400);
        }

        quote.status = 'rejected';
        quote.respondedAt = new Date();
        quote.clientNotes = reason;

        await quote.save();

        logger.info(`Quote ${quote.quoteId} rejected by client`);

        // TODO: Send notification to firm

        return quote;
    }

    /**
     * Client requests changes
     * @param {string} quoteId - Quote ID
     * @param {array} changeRequests - Array of change requests
     */
    async requestChanges(quoteId, changeRequests) {
        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({ _id: sanitizedQuoteId });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status === 'accepted') {
            throw CustomException('Cannot request changes on accepted quote', 400);
        }

        // Store change requests
        if (!quote.changeRequests) {
            quote.changeRequests = [];
        }

        quote.changeRequests.push({
            requestedAt: new Date(),
            changes: changeRequests,
            status: 'pending'
        });

        quote.clientNotes = changeRequests.map(r => r.description).join('\n');

        await quote.save();

        logger.info(`Change requests submitted for quote ${quote.quoteId}`);

        // TODO: Send notification to firm

        return quote;
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. QUOTE CONVERSION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Convert accepted quote to invoice
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     * @param {object} invoiceData - Additional invoice data
     */
    async convertToInvoice(quoteId, firmId, lawyerId, invoiceData = {}) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        }).populate('clientId');

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status !== 'accepted') {
            throw CustomException('Only accepted quotes can be converted to invoices', 400);
        }

        if (!quote.clientId) {
            throw CustomException('Quote must be linked to a client', 400);
        }

        // Map quote items to invoice line items
        const lineItems = quote.items.map(item => ({
            type: 'product',
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountType: 'percentage',
            discountValue: item.discount || 0,
            taxable: item.taxRate > 0,
            lineTotal: item.total
        }));

        // Create invoice
        const invoice = new Invoice({
            firmId: new mongoose.Types.ObjectId(firmId),
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            clientId: quote.clientId._id,
            quoteId: quote._id,

            invoiceType: 'standard',
            status: 'draft',

            lineItems,

            subtotal: quote.totals.subtotal,
            taxAmount: quote.totals.taxTotal,
            discountAmount: quote.totals.discountTotal,
            totalAmount: quote.totals.grandTotal,

            currency: quote.currency,

            notes: quote.description,
            termsAndConditions: quote.termsAndConditions,

            dueDate: invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default

            createdBy: new mongoose.Types.ObjectId(lawyerId),

            ...invoiceData
        });

        await invoice.save();

        // Update quote
        quote.convertedToInvoice = true;
        quote.invoiceId = invoice._id;
        await quote.save();

        logger.info(`Quote ${quote.quoteId} converted to invoice ${invoice.invoiceNumber}`);
        return invoice;
    }

    /**
     * Generate contract from quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     */
    async convertToContract(quoteId, firmId, lawyerId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        if (quote.status !== 'accepted') {
            throw CustomException('Only accepted quotes can be converted to contracts', 400);
        }

        // TODO: Implement contract generation
        // This would integrate with a document/contract service

        logger.info(`Contract generation initiated for quote ${quote.quoteId}`);

        return {
            message: 'Contract generation feature coming soon',
            quoteId: quote.quoteId
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. QUOTE EXPIRY
    // ═══════════════════════════════════════════════════════════════

    /**
     * Check if quote is expired
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     */
    async checkExpiry(quoteId, firmId) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        return {
            quoteId: quote.quoteId,
            isExpired: quote.isExpired,
            validUntil: quote.validUntil,
            daysUntilExpiry: quote.daysUntilExpiry,
            status: quote.status
        };
    }

    /**
     * Extend validity of quote
     * @param {string} quoteId - Quote ID
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {string} lawyerId - Lawyer ID
     * @param {Date} newExpiryDate - New expiry date
     */
    async extendValidity(quoteId, firmId, lawyerId, newExpiryDate) {
        if (!firmId) throw new Error('firmId is required');

        const sanitizedQuoteId = sanitizeObjectId(quoteId);

        const quote = await Quote.findOne({
            _id: sanitizedQuoteId,
            firmId: new mongoose.Types.ObjectId(firmId)
        });

        if (!quote) {
            throw CustomException('Quote not found', 404);
        }

        const oldExpiry = quote.validUntil;
        quote.validUntil = new Date(newExpiryDate);

        // If quote was expired, change status back to sent
        if (quote.status === 'expired') {
            quote.status = 'sent';
        }

        await quote.save();

        logger.info(`Quote ${quote.quoteId} validity extended from ${oldExpiry} to ${newExpiryDate}`);
        return quote;
    }

    /**
     * Process expired quotes (batch operation)
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     */
    async processExpiredQuotes(firmId) {
        if (!firmId) throw new Error('firmId is required');

        const now = new Date();

        // Find quotes that should be expired
        const expiredQuotes = await Quote.find({
            firmId: new mongoose.Types.ObjectId(firmId),
            validUntil: { $lt: now },
            status: { $in: ['sent', 'viewed'] }
        });

        const results = {
            processed: 0,
            expired: []
        };

        for (const quote of expiredQuotes) {
            quote.status = 'expired';
            await quote.save();

            results.processed++;
            results.expired.push({
                quoteId: quote.quoteId,
                title: quote.title,
                validUntil: quote.validUntil
            });
        }

        logger.info(`Processed ${results.processed} expired quotes for firm ${firmId}`);
        return results;
    }

    // ═══════════════════════════════════════════════════════════════
    // 8. ANALYTICS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get quote metrics
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {object} dateRange - Date range { start, end }
     */
    async getQuoteMetrics(firmId, dateRange = {}) {
        if (!firmId) throw new Error('firmId is required');

        const matchQuery = {
            firmId: new mongoose.Types.ObjectId(firmId)
        };

        if (dateRange.start) {
            matchQuery.createdAt = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.createdAt = {
                ...matchQuery.createdAt,
                $lte: new Date(dateRange.end)
            };
        }

        const [statusStats, valueStats, totalQuotes] = await Promise.all([
            // Status breakdown
            Quote.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalValue: { $sum: '$totals.grandTotal' }
                    }
                }
            ]),

            // Overall value stats
            Quote.aggregate([
                { $match: matchQuery },
                {
                    $group: {
                        _id: null,
                        totalValue: { $sum: '$totals.grandTotal' },
                        avgValue: { $avg: '$totals.grandTotal' },
                        maxValue: { $max: '$totals.grandTotal' },
                        minValue: { $min: '$totals.grandTotal' }
                    }
                }
            ]),

            // Total count
            Quote.countDocuments(matchQuery)
        ]);

        return {
            totalQuotes,
            byStatus: statusStats,
            valueMetrics: valueStats[0] || {
                totalValue: 0,
                avgValue: 0,
                maxValue: 0,
                minValue: 0
            }
        };
    }

    /**
     * Get quote conversion rate
     * @param {string} firmId - Firm ID (REQUIRED for multi-tenancy)
     * @param {object} dateRange - Date range { start, end }
     */
    async getConversionRate(firmId, dateRange = {}) {
        if (!firmId) throw new Error('firmId is required');

        const matchQuery = {
            firmId: new mongoose.Types.ObjectId(firmId)
        };

        if (dateRange.start) {
            matchQuery.createdAt = { $gte: new Date(dateRange.start) };
        }
        if (dateRange.end) {
            matchQuery.createdAt = {
                ...matchQuery.createdAt,
                $lte: new Date(dateRange.end)
            };
        }

        const [total, accepted, converted] = await Promise.all([
            Quote.countDocuments(matchQuery),
            Quote.countDocuments({ ...matchQuery, status: 'accepted' }),
            Quote.countDocuments({ ...matchQuery, convertedToInvoice: true })
        ]);

        const acceptanceRate = total > 0 ? ((accepted / total) * 100).toFixed(2) : 0;
        const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(2) : 0;

        return {
            totalQuotes: total,
            acceptedQuotes: accepted,
            convertedToInvoice: converted,
            acceptanceRate: parseFloat(acceptanceRate),
            conversionRate: parseFloat(conversionRate),
            dateRange
        };
    }
}

module.exports = new QuoteWorkflowService();
