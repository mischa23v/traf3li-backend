/**
 * Invoice Service - Comprehensive Invoice Management
 *
 * This service extracts all business logic from invoice.controller.js to provide
 * a clean, reusable API for invoice operations across the application.
 *
 * Features:
 * - Invoice CRUD with comprehensive validation
 * - State machine for status transitions
 * - Payment processing and retainer application
 * - Discount and total calculations
 * - PDF generation and email delivery
 * - ZATCA e-invoicing integration
 * - Recurring invoice conversion
 * - Multi-tenant support with firm isolation
 * - GL integration for accounting
 *
 * @module services/invoice.service
 */

const mongoose = require('mongoose');
const { Invoice, Case, Order, User, Payment, Retainer, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const { toHalalas, fromHalalas, addAmounts, subtractAmounts } = require('../utils/currency');

// ZATCA services
const {
    generateQRCode,
    generateInvoiceHash,
    generateUUID,
    generateUBLXML,
    submitToZATCA,
    validateForZATCA
} = require('./zatcaService');

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate due date based on payment terms
 * @param {String} paymentTerms - Payment terms (net_30, net_60, etc.)
 * @param {Date} issueDate - Invoice issue date
 * @returns {Date} - Calculated due date
 */
const calculateDueDate = (paymentTerms, issueDate = new Date()) => {
    const date = new Date(issueDate);
    const daysMap = {
        'due_on_receipt': 0,
        'net_7': 7,
        'net_15': 15,
        'net_30': 30,
        'net_45': 45,
        'net_60': 60,
        'net_90': 90
    };

    if (paymentTerms === 'eom') {
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
    } else {
        date.setDate(date.getDate() + (daysMap[paymentTerms] || 30));
    }

    return date;
};

/**
 * Validate client exists and get client ID from case or contract
 * @param {String} bodyClientId - Client ID from request body
 * @param {String} caseId - Case ID
 * @param {String} contractId - Contract ID
 * @param {String} firmId - Firm ID for isolation
 * @param {String} lawyerId - Lawyer ID for isolation (solo lawyers)
 * @returns {Promise<String>} - Client ID
 */
const resolveClientId = async (bodyClientId, caseId, contractId, firmId, lawyerId) => {
    let clientId = bodyClientId;

    if (!clientId && caseId) {
        const query = { _id: caseId };
        if (firmId) {
            query.firmId = firmId;
        } else if (lawyerId) {
            query.lawyerId = lawyerId;
        }
        const caseDoc = await Case.findOne(query);
        if (caseDoc) clientId = caseDoc.clientId;
    } else if (!clientId && contractId) {
        const query = { _id: contractId };
        if (firmId) {
            query.firmId = firmId;
        } else if (lawyerId) {
            query.lawyerId = lawyerId;
        }
        const contract = await Order.findOne(query);
        if (contract) clientId = contract.buyerID;
    }

    if (!clientId) {
        throw CustomException('Client ID is required', 400);
    }

    return clientId;
};

/**
 * Validate retainer balance for application
 * @param {Number} applyFromRetainer - Amount to apply from retainer
 * @param {String} clientId - Client ID
 * @param {String} lawyerId - Lawyer ID
 * @param {String} firmId - Firm ID
 * @param {Boolean} isSoloLawyer - Is solo lawyer flag
 * @returns {Promise<void>}
 */
const validateRetainerBalance = async (applyFromRetainer, clientId, lawyerId, firmId, isSoloLawyer) => {
    if (applyFromRetainer > 0) {
        const retainerQuery = { clientId, status: 'active' };
        if (isSoloLawyer || !firmId) {
            retainerQuery.lawyerId = lawyerId;
        } else {
            retainerQuery.firmId = firmId;
        }
        const retainer = await Retainer.findOne(retainerQuery);

        if (!retainer || retainer.currentBalance < applyFromRetainer) {
            throw CustomException('رصيد العربون غير كافٍ - Insufficient retainer balance', 400);
        }
    }
};

// ═══════════════════════════════════════════════════════════════
// CORE INVOICE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create invoice with all validations
 * @param {Object} data - Invoice data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID creating the invoice
 * @param {Object} context - Additional context (req object properties)
 * @returns {Promise<Object>} - Created invoice
 */
const createInvoice = async (data, firmId, userId, context = {}) => {
    try {
        // Check if user is a lawyer and belongs to the firm
        const user = await User.findOne({ _id: userId, firmId });
        if (!user) {
            throw CustomException('User not found or unauthorized', 403);
        }
        if (user.role !== 'lawyer') {
            throw CustomException('Only lawyers can create invoices!', 403);
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = [
            'clientId', 'caseId', 'contractId', 'items', 'subtotal', 'vatRate', 'vatAmount',
            'totalAmount', 'dueDate', 'paymentTerms', 'notes', 'customerNotes', 'internalNotes',
            'discountType', 'discountValue', 'clientType', 'responsibleAttorneyId',
            'billingArrangement', 'departmentId', 'locationId', 'firmSize',
            'customerPONumber', 'matterNumber', 'termsTemplate', 'termsAndConditions',
            'zatca', 'applyFromRetainer', 'paymentPlan', 'bankAccountId',
            'paymentInstructions', 'enableOnlinePayment', 'lateFees', 'approval',
            'email', 'attachments', 'wip', 'budget'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        // Sanitize ObjectIds
        if (safeData.clientId) safeData.clientId = sanitizeObjectId(safeData.clientId);
        if (safeData.caseId) safeData.caseId = sanitizeObjectId(safeData.caseId);
        if (safeData.contractId) safeData.contractId = sanitizeObjectId(safeData.contractId);

        const {
            clientId: bodyClientId,
            caseId,
            contractId,
            items,
            vatRate = 15,
            dueDate,
            paymentTerms = 'net_30',
            notes,
            customerNotes,
            internalNotes,
            discountType,
            discountValue = 0,
            clientType,
            responsibleAttorneyId,
            billingArrangement,
            departmentId,
            locationId,
            firmSize,
            customerPONumber,
            matterNumber,
            termsTemplate,
            termsAndConditions,
            zatca,
            applyFromRetainer,
            paymentPlan,
            bankAccountId,
            paymentInstructions,
            enableOnlinePayment,
            lateFees,
            approval,
            email,
            attachments,
            wip,
            budget
        } = safeData;

        // Resolve client ID
        const clientId = await resolveClientId(bodyClientId, caseId, contractId, firmId, userId);

        // Calculate totals from items to prevent manipulation
        const { calculatedSubtotal, calculatedVatAmount, calculatedTotalAmount } = calculateTotals({
            items,
            discountType,
            discountValue,
            vatRate
        });

        // Calculate due date if not provided
        const finalDueDate = dueDate ? new Date(dueDate) : calculateDueDate(paymentTerms);

        // Validate retainer application
        await validateRetainerBalance(
            applyFromRetainer,
            clientId,
            userId,
            firmId,
            context.isSoloLawyer
        );

        // Create invoice
        const invoice = new Invoice({
            caseId,
            contractId,
            lawyerId: userId,
            firmId,
            clientId,
            clientType: clientType || 'individual',
            items,
            subtotal: calculatedSubtotal,
            vatRate,
            vatAmount: calculatedVatAmount,
            totalAmount: calculatedTotalAmount,
            balanceDue: calculatedTotalAmount - (applyFromRetainer || 0),
            discountType,
            discountValue,
            dueDate: finalDueDate,
            paymentTerms,
            notes,
            customerNotes,
            internalNotes,
            responsibleAttorneyId: responsibleAttorneyId || userId,
            billingArrangement,
            departmentId,
            locationId,
            firmSize,
            customerPONumber,
            matterNumber,
            termsTemplate,
            termsAndConditions,
            zatca: zatca || {},
            applyFromRetainer: applyFromRetainer || 0,
            paymentPlan: paymentPlan || { enabled: false },
            bankAccountId,
            paymentInstructions,
            enableOnlinePayment: enableOnlinePayment || false,
            lateFees: lateFees || { enabled: false },
            approval: approval || { required: false },
            email: email || {},
            attachments: attachments || [],
            wip: wip || {},
            budget: budget || {},
            createdBy: userId,
            history: [{
                action: 'created',
                date: new Date(),
                user: userId
            }]
        });

        await invoice.save();

        // Apply retainer if specified
        if (applyFromRetainer > 0) {
            const retainer = await Retainer.findOne({
                clientId,
                lawyerId: userId,
                status: 'active'
            });

            if (retainer) {
                await retainer.consume(applyFromRetainer, invoice._id, `Applied to invoice ${invoice.invoiceNumber}`);
                invoice.retainerTransactionId = retainer._id;
                await invoice.save();
            }
        }

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'invoice_created',
            userId,
            clientId,
            relatedModel: 'Invoice',
            relatedId: invoice._id,
            description: `Invoice ${invoice.invoiceNumber} created for ${fromHalalas(calculatedTotalAmount)} SAR`,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
        });

        // Populate relations
        await invoice.populate([
            { path: 'lawyerId', select: 'firstName lastName username email' },
            { path: 'clientId', select: 'firstName lastName username email' },
            { path: 'caseId', select: 'title caseNumber' },
            { path: 'responsibleAttorneyId', select: 'firstName lastName' }
        ]);

        return invoice;
    } catch (error) {
        logger.error('Error creating invoice:', error);
        throw error;
    }
};

/**
 * Update invoice with state machine checks
 * @param {String} invoiceId - Invoice ID
 * @param {Object} data - Update data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID performing update
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} - Updated invoice
 */
const updateInvoice = async (invoiceId, data, firmId, userId, context = {}) => {
    try {
        // IDOR Protection - include firmId/lawyerId in query
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = userId;
        }

        const invoice = await Invoice.findOne(query);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        // State machine check - only allow updates in certain states
        if (!['draft', 'pending_approval'].includes(invoice.status)) {
            throw CustomException('Cannot update sent or paid invoices!', 400);
        }

        // Mass assignment protection
        const allowedFields = [
            'items', 'subtotal', 'vatRate', 'vatAmount', 'totalAmount',
            'dueDate', 'paymentTerms', 'notes', 'customerNotes', 'internalNotes',
            'discountType', 'discountValue', 'clientType', 'responsibleAttorneyId',
            'billingArrangement', 'departmentId', 'locationId', 'firmSize',
            'customerPONumber', 'matterNumber', 'termsTemplate', 'termsAndConditions',
            'zatca', 'paymentPlan', 'bankAccountId', 'paymentInstructions',
            'enableOnlinePayment', 'lateFees', 'approval', 'email', 'attachments',
            'wip', 'budget'
        ];
        const safeData = pickAllowedFields(data, allowedFields);

        // If items are being updated, recalculate amounts
        if (safeData.items) {
            const { calculatedSubtotal, calculatedVatAmount, calculatedTotalAmount } = calculateTotals({
                items: safeData.items,
                discountType: safeData.discountType || invoice.discountType,
                discountValue: safeData.discountValue !== undefined ? safeData.discountValue : invoice.discountValue,
                vatRate: safeData.vatRate !== undefined ? safeData.vatRate : invoice.vatRate
            });

            // Use calculated values
            safeData.subtotal = calculatedSubtotal;
            safeData.vatAmount = calculatedVatAmount;
            safeData.totalAmount = calculatedTotalAmount;
        }

        // Update allowed fields
        Object.keys(safeData).forEach(field => {
            invoice[field] = safeData[field];
        });

        // Recalculate balance due if totalAmount changed
        if (safeData.totalAmount !== undefined) {
            invoice.balanceDue = safeData.totalAmount - (invoice.amountPaid || 0) - (invoice.applyFromRetainer || 0);
        }

        invoice.updatedBy = userId;

        // Add to history
        invoice.history.push({
            action: 'updated',
            date: new Date(),
            user: userId
        });

        await invoice.save();

        await invoice.populate([
            { path: 'lawyerId', select: 'firstName lastName username email' },
            { path: 'clientId', select: 'firstName lastName username email' },
            { path: 'caseId', select: 'title caseNumber' }
        ]);

        return invoice;
    } catch (error) {
        logger.error('Error updating invoice:', error);
        throw error;
    }
};

/**
 * Send invoice via email and update status
 * @param {String} invoiceId - Invoice ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID sending the invoice
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} - Updated invoice
 */
const sendInvoice = async (invoiceId, firmId, userId, context = {}) => {
    try {
        // IDOR Protection - include firmId/lawyerId in query
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = userId;
        }

        const invoice = await Invoice.findOne(query)
            .populate('clientId', 'firstName lastName email');

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        // Validate status transition
        validateStatusTransition(invoice, 'sent');

        // Check if approval is required but not approved
        if (invoice.approval?.required && invoice.status !== 'pending_approval') {
            if (!invoice.approval.approvedAt) {
                throw CustomException('الفاتورة تحتاج موافقة قبل الإرسال - Invoice requires approval before sending', 400);
            }
        }

        // Generate ZATCA QR code for B2C invoices
        if (invoice.zatca?.invoiceSubtype === '0200000' || !invoice.zatca?.invoiceSubtype) {
            const qrCode = await generateQRCode(invoice);
            invoice.zatca = invoice.zatca || {};
            invoice.zatca.qrCode = qrCode;
            invoice.zatca.invoiceUUID = invoice.zatca.invoiceUUID || generateUUID();
        }

        invoice.status = 'sent';
        invoice.sentAt = new Date();
        invoice.email = invoice.email || {};
        invoice.email.sentAt = new Date();

        invoice.history.push({
            action: 'sent',
            date: new Date(),
            user: userId
        });

        await invoice.save();

        // TODO: Send email notification to client
        // const emailService = require('./email.service');
        // await emailService.sendInvoice(invoice, invoice.clientId);

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'invoice_sent',
            userId,
            clientId: invoice.clientId._id || invoice.clientId,
            relatedModel: 'Invoice',
            relatedId: invoice._id,
            description: `Invoice ${invoice.invoiceNumber} sent to client`,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
        });

        await invoice.populate([
            { path: 'lawyerId', select: 'firstName lastName username email' },
            { path: 'clientId', select: 'firstName lastName username email' }
        ]);

        return invoice;
    } catch (error) {
        logger.error('Error sending invoice:', error);
        throw error;
    }
};

/**
 * Void invoice with GL reversals
 * @param {String} invoiceId - Invoice ID
 * @param {String} reason - Reason for voiding
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID voiding the invoice
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} - Voided invoice
 */
const voidInvoice = async (invoiceId, reason, firmId, userId, context = {}) => {
    try {
        // IDOR Protection - include firmId/lawyerId in query
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = userId;
        }

        const invoice = await Invoice.findOne(query);

        if (!invoice) {
            throw CustomException('الفاتورة غير موجودة', 404);
        }

        if (invoice.status === 'void') {
            throw CustomException('الفاتورة ملغاة مسبقاً', 400);
        }

        if (invoice.amountPaid > 0) {
            throw CustomException('لا يمكن إلغاء فاتورة بها دفعات. قم بإنشاء إشعار دائن بدلاً من ذلك', 400);
        }

        // Reverse GL entries if posted
        if (invoice.glEntries && invoice.glEntries.length > 0) {
            const GeneralLedger = mongoose.model('GeneralLedger');
            for (const glEntryId of invoice.glEntries) {
                const glQuery = { _id: glEntryId };
                if (firmId) {
                    glQuery.firmId = firmId;
                } else {
                    glQuery.lawyerId = userId;
                }
                const glEntry = await GeneralLedger.findOne(glQuery);
                if (glEntry && glEntry.status === 'posted') {
                    await glEntry.reverse({
                        description: `Void invoice ${invoice.invoiceNumber}`,
                        descriptionAr: `إلغاء فاتورة ${invoice.invoiceNumber}`,
                        createdBy: userId
                    });
                }
            }
        }

        // Reverse retainer application if any
        if (invoice.applyFromRetainer > 0 && invoice.retainerTransactionId) {
            const retainerQuery = { _id: invoice.retainerTransactionId };
            if (firmId) {
                retainerQuery.firmId = firmId;
            } else {
                retainerQuery.lawyerId = userId;
            }
            const retainer = await Retainer.findOne(retainerQuery);
            if (retainer) {
                await retainer.deposit(invoice.applyFromRetainer);
            }
        }

        invoice.status = 'void';
        invoice.voidedAt = new Date();
        invoice.voidReason = reason;
        invoice.updatedBy = userId;

        invoice.history.push({
            action: 'voided',
            date: new Date(),
            user: userId,
            note: reason
        });

        await invoice.save();

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'invoice_voided',
            userId,
            relatedModel: 'Invoice',
            relatedId: invoice._id,
            description: `Invoice ${invoice.invoiceNumber} voided. Reason: ${reason}`,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
        });

        return invoice;
    } catch (error) {
        logger.error('Error voiding invoice:', error);
        throw error;
    }
};

/**
 * Apply payment to invoice
 * @param {String} invoiceId - Invoice ID
 * @param {Object} paymentData - Payment data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID applying payment
 * @param {Object} context - Additional context
 * @returns {Promise<Object>} - Payment and updated invoice
 */
const applyPayment = async (invoiceId, paymentData, firmId, userId, context = {}) => {
    try {
        const { amount, paymentMethod, reference, paymentDate, notes, bankAccountId } = paymentData;

        // IDOR Protection - include firmId/lawyerId in query
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = userId;
        }

        const invoice = await Invoice.findOne(query);

        if (!invoice) {
            throw CustomException('الفاتورة غير موجودة - Invoice not found!', 404);
        }

        if (invoice.status === 'void' || invoice.status === 'paid') {
            throw CustomException('لا يمكن تسجيل دفعة لهذه الفاتورة', 400);
        }

        // Validate payment amount
        if (amount <= 0) {
            throw CustomException('Payment amount must be greater than zero', 400);
        }

        if (amount > invoice.balanceDue) {
            throw CustomException('مبلغ الدفعة أكبر من المبلغ المستحق - Payment exceeds balance due', 400);
        }

        // Create payment record
        const payment = new Payment({
            clientId: invoice.clientId,
            invoiceId: invoice._id,
            caseId: invoice.caseId,
            lawyerId: invoice.lawyerId,
            amount,
            paymentMethod: paymentMethod || 'bank_transfer',
            transactionId: reference,
            paymentDate: paymentDate || new Date(),
            notes,
            bankAccountId,
            status: 'completed',
            createdBy: userId,
            processedBy: userId
        });

        await payment.save();

        // Update invoice
        invoice.amountPaid = addAmounts(invoice.amountPaid || 0, amount);
        invoice.balanceDue = subtractAmounts(
            subtractAmounts(invoice.totalAmount, invoice.amountPaid),
            invoice.applyFromRetainer || 0
        );

        if (invoice.balanceDue <= 0) {
            invoice.status = 'paid';
            invoice.paidDate = new Date();
        } else if (invoice.amountPaid > 0) {
            invoice.status = 'partial';
        }

        invoice.history.push({
            action: 'payment_received',
            date: new Date(),
            user: userId,
            note: `Payment of ${fromHalalas(amount)} SAR received`
        });

        await invoice.save();

        // Log activity
        await BillingActivity.logActivity({
            activityType: 'payment_received',
            userId,
            clientId: invoice.clientId,
            relatedModel: 'Payment',
            relatedId: payment._id,
            description: `Payment of ${fromHalalas(amount)} SAR received for invoice ${invoice.invoiceNumber}`,
            amount,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent
        });

        await payment.populate([
            { path: 'clientId', select: 'firstName lastName email' },
            { path: 'invoiceId', select: 'invoiceNumber totalAmount status balanceDue' }
        ]);

        return {
            payment,
            invoice: {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                totalAmount: invoice.totalAmount,
                amountPaid: invoice.amountPaid,
                balanceDue: invoice.balanceDue,
                status: invoice.status
            }
        };
    } catch (error) {
        logger.error('Error applying payment:', error);
        throw error;
    }
};

/**
 * Recalculate all totals (subtotal, tax, discounts, total)
 * @param {Object} params - Calculation parameters
 * @param {Array} params.items - Invoice items
 * @param {String} params.discountType - Discount type (percentage or fixed)
 * @param {Number} params.discountValue - Discount value
 * @param {Number} params.vatRate - VAT rate
 * @returns {Object} - Calculated totals
 */
const calculateTotals = ({ items, discountType, discountValue = 0, vatRate = 15 }) => {
    // Calculate subtotal from items to prevent manipulation
    let calculatedSubtotal = 0;
    if (items && items.length > 0) {
        calculatedSubtotal = items.reduce((sum, item) => {
            if (item.type === 'discount' || item.type === 'comment' || item.type === 'subtotal') {
                return sum;
            }
            const itemTotal = item.quantity * item.unitPrice;
            // Validate item total to prevent manipulation
            if (item.total && Math.abs(item.total - itemTotal) > 0.01) {
                throw CustomException('Invalid item total detected - possible manipulation', 400);
            }
            return sum + itemTotal;
        }, 0);
    }

    // Apply discount before VAT
    let discountedSubtotal = calculatedSubtotal;
    if (discountType === 'percentage' && discountValue > 0) {
        if (discountValue > 100) {
            throw CustomException('Discount percentage cannot exceed 100%', 400);
        }
        discountedSubtotal = calculatedSubtotal * (1 - discountValue / 100);
    } else if (discountType === 'fixed' && discountValue > 0) {
        if (discountValue > calculatedSubtotal) {
            throw CustomException('Fixed discount cannot exceed subtotal', 400);
        }
        discountedSubtotal = calculatedSubtotal - discountValue;
    }

    // Calculate VAT and total - don't trust user input
    const calculatedVatAmount = discountedSubtotal * (vatRate / 100);
    const calculatedTotalAmount = discountedSubtotal + calculatedVatAmount;

    return {
        calculatedSubtotal,
        calculatedVatAmount,
        calculatedTotalAmount,
        discountedSubtotal
    };
};

/**
 * Apply discount to invoice
 * @param {String} invoiceId - Invoice ID
 * @param {Object} discountData - Discount data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Updated invoice
 */
const applyDiscount = async (invoiceId, discountData, firmId, userId) => {
    try {
        const { discountType, discountValue } = discountData;

        // IDOR Protection - include firmId/lawyerId in query
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = userId;
        }

        const invoice = await Invoice.findOne(query);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        // State machine check
        if (!['draft', 'pending_approval'].includes(invoice.status)) {
            throw CustomException('Cannot apply discount to sent or paid invoices!', 400);
        }

        // Apply discount
        invoice.discountType = discountType;
        invoice.discountValue = discountValue;

        // Recalculate totals
        invoice.calculateTotals();

        invoice.updatedBy = userId;
        invoice.history.push({
            action: 'updated',
            date: new Date(),
            user: userId,
            note: `Discount applied: ${discountValue}${discountType === 'percentage' ? '%' : ' SAR'}`
        });

        await invoice.save();

        return invoice;
    } catch (error) {
        logger.error('Error applying discount:', error);
        throw error;
    }
};

/**
 * Generate PDF for invoice
 * @param {String} invoiceId - Invoice ID
 * @param {String} firmId - Firm ID
 * @param {Object} options - PDF generation options
 * @returns {Promise<Object>} - PDF generation job info
 */
const generatePDF = async (invoiceId, firmId, options = {}) => {
    try {
        // IDOR Protection - include firmId in query
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (firmId) {
            query.firmId = firmId;
        }

        const invoice = await Invoice.findOne(query)
            .populate('clientId', 'name email phone address')
            .populate('lawyerId', 'name')
            .populate('caseId', 'caseNumber title');

        if (!invoice) {
            throw CustomException('الفاتورة غير موجودة', 404);
        }

        // Import QueueService
        const QueueService = require('./queue.service');

        // Prepare invoice data for PDF generation
        const invoiceData = {
            invoiceNumber: invoice.invoiceNumber,
            invoiceId: invoice._id.toString(),
            date: invoice.issueDate,
            dueDate: invoice.dueDate,
            clientName: invoice.clientId?.name || 'N/A',
            clientEmail: invoice.clientId?.email,
            clientPhone: invoice.clientId?.phone,
            clientAddress: invoice.clientId?.address,
            items: invoice.items || [],
            subtotal: invoice.subtotal,
            vatRate: invoice.vatRate || 15,
            vatAmount: invoice.vatAmount,
            totalAmount: invoice.totalAmount,
            currency: invoice.currency || 'SAR',
            notes: invoice.notes,
            paymentTerms: invoice.paymentTerms,
            qrCode: invoice.zatca?.qrCode
        };

        // Queue PDF generation
        const job = await QueueService.generatePDF(
            { invoiceId: invoice._id, invoiceData },
            'invoice',
            { priority: options.download ? 1 : 3 }
        );

        return {
            jobId: job.jobId,
            queueName: job.queueName,
            message: 'PDF generation queued successfully'
        };
    } catch (error) {
        logger.error('Error generating PDF:', error);
        throw error;
    }
};

/**
 * Duplicate an invoice
 * @param {String} invoiceId - Invoice ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID duplicating the invoice
 * @returns {Promise<Object>} - Duplicated invoice
 */
const duplicateInvoice = async (invoiceId, firmId, userId) => {
    try {
        // IDOR Protection - include firmId/lawyerId in query
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = userId;
        }

        const originalInvoice = await Invoice.findOne(query);

        if (!originalInvoice) {
            throw CustomException('الفاتورة غير موجودة', 404);
        }

        // Create duplicate
        const duplicateData = originalInvoice.toObject();
        delete duplicateData._id;
        delete duplicateData.invoiceNumber; // Will be auto-generated
        delete duplicateData.status;
        delete duplicateData.amountPaid;
        delete duplicateData.paidDate;
        delete duplicateData.sentAt;
        delete duplicateData.viewedAt;
        delete duplicateData.voidedAt;
        delete duplicateData.voidReason;
        delete duplicateData.zatca;
        delete duplicateData.glEntries;
        delete duplicateData.paymentIntent;
        delete duplicateData.history;
        delete duplicateData.createdAt;
        delete duplicateData.updatedAt;

        const newInvoice = new Invoice({
            ...duplicateData,
            status: 'draft',
            issueDate: new Date(),
            dueDate: calculateDueDate(duplicateData.paymentTerms),
            createdBy: userId,
            applyFromRetainer: 0,
            balanceDue: duplicateData.totalAmount,
            zatca: {},
            history: [{
                action: 'created',
                date: new Date(),
                user: userId,
                note: `Duplicated from ${originalInvoice.invoiceNumber}`
            }]
        });

        await newInvoice.save();

        await newInvoice.populate([
            { path: 'lawyerId', select: 'firstName lastName username email' },
            { path: 'clientId', select: 'firstName lastName username email' }
        ]);

        return newInvoice;
    } catch (error) {
        logger.error('Error duplicating invoice:', error);
        throw error;
    }
};

/**
 * Convert invoice to recurring template
 * @param {String} invoiceId - Invoice ID
 * @param {Object} schedule - Recurring schedule
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} - Recurring invoice template
 */
const convertToRecurring = async (invoiceId, schedule, firmId, userId) => {
    try {
        // IDOR Protection - include firmId/lawyerId in query
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (firmId) {
            query.firmId = firmId;
        } else {
            query.lawyerId = userId;
        }

        const invoice = await Invoice.findOne(query);

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        const RecurringInvoice = mongoose.model('RecurringInvoice');

        // Create recurring invoice template
        const recurringInvoice = new RecurringInvoice({
            firmId,
            lawyerId: invoice.lawyerId,
            clientId: invoice.clientId,
            caseId: invoice.caseId,
            templateName: `Recurring - ${invoice.invoiceNumber}`,
            items: invoice.items,
            subtotal: invoice.subtotal,
            vatRate: invoice.vatRate,
            vatAmount: invoice.vatAmount,
            totalAmount: invoice.totalAmount,
            discountType: invoice.discountType,
            discountValue: invoice.discountValue,
            paymentTerms: invoice.paymentTerms,
            notes: invoice.notes,
            customerNotes: invoice.customerNotes,
            termsAndConditions: invoice.termsAndConditions,
            frequency: schedule.frequency || 'monthly',
            startDate: schedule.startDate || new Date(),
            endDate: schedule.endDate,
            nextInvoiceDate: schedule.nextInvoiceDate || schedule.startDate || new Date(),
            autoSend: schedule.autoSend || false,
            status: 'active',
            createdBy: userId,
            originalInvoiceId: invoice._id
        });

        await recurringInvoice.save();

        logger.info(`Invoice ${invoice.invoiceNumber} converted to recurring template ${recurringInvoice._id}`);

        return recurringInvoice;
    } catch (error) {
        logger.error('Error converting to recurring invoice:', error);
        throw error;
    }
};

/**
 * Get invoice with all populated relations
 * @param {String} invoiceId - Invoice ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID (optional, for access control)
 * @returns {Promise<Object>} - Invoice with relations
 */
const getInvoiceWithRelations = async (invoiceId, firmId, userId = null) => {
    try {
        // IDOR Protection - include firmId/lawyerId in query when userId is provided
        const query = { _id: sanitizeObjectId(invoiceId) };
        if (userId) {
            if (firmId) {
                query.firmId = firmId;
            } else {
                // For solo lawyers or when checking access
                query.$or = [
                    { lawyerId: userId },
                    { clientId: userId }
                ];
            }
        }

        const invoice = await Invoice.findOne(query)
            .populate('lawyerId', 'firstName lastName username image email country phone')
            .populate('clientId', 'firstName lastName username image email country phone')
            .populate('caseId', 'title caseNumber')
            .populate('contractId')
            .populate('responsibleAttorneyId', 'firstName lastName email')
            .populate('items.attorneyId', 'firstName lastName')
            .populate('bankAccountId')
            .populate('approval.chain.approverId', 'firstName lastName email');

        if (!invoice) {
            throw CustomException('Invoice not found!', 404);
        }

        return invoice;
    } catch (error) {
        logger.error('Error getting invoice with relations:', error);
        throw error;
    }
};

/**
 * Validate status transition using state machine
 * @param {Object} invoice - Invoice object
 * @param {String} newStatus - New status to transition to
 * @returns {Boolean} - True if transition is valid
 * @throws {Error} - If transition is invalid
 */
const validateStatusTransition = (invoice, newStatus) => {
    const currentStatus = invoice.status;

    // Define valid state transitions
    const validTransitions = {
        draft: ['pending_approval', 'sent', 'void', 'cancelled'],
        pending_approval: ['draft', 'sent', 'void', 'cancelled'],
        sent: ['viewed', 'partial', 'paid', 'overdue', 'void'],
        viewed: ['partial', 'paid', 'overdue', 'void'],
        partial: ['paid', 'overdue', 'void'],
        overdue: ['partial', 'paid', 'void', 'written_off'],
        paid: [], // Paid invoices cannot transition
        void: [], // Voided invoices cannot transition
        written_off: [], // Written off invoices cannot transition
        cancelled: [] // Cancelled invoices cannot transition
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
        throw CustomException(
            `Invalid status transition from ${currentStatus} to ${newStatus}`,
            400
        );
    }

    return true;
};

// ═══════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Core operations
    createInvoice,
    updateInvoice,
    sendInvoice,
    voidInvoice,
    applyPayment,

    // Calculations and discounts
    calculateTotals,
    applyDiscount,

    // PDF and documents
    generatePDF,

    // Invoice operations
    duplicateInvoice,
    convertToRecurring,
    getInvoiceWithRelations,

    // State machine
    validateStatusTransition,

    // Helper functions (exported for testing and reuse)
    calculateDueDate,
    resolveClientId,
    validateRetainerBalance
};
