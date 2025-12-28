/**
 * Return Order (RMA) Model - Enterprise Gold Standard
 *
 * Complete return merchandise authorization with:
 * - Multi-step approval workflow
 * - Item-level inspection
 * - Multiple resolution types (refund, replacement, credit, repair)
 * - Restocking fee support
 * - Pickup/return logistics
 * - Credit note generation
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// RETURN ITEM SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const ReturnItemSchema = new Schema({
    lineId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    lineNumber: { type: Number, required: true },

    // Source Reference
    originalLineItemId: { type: String },
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    salesOrderNumber: { type: String, maxlength: 50 },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    invoiceNumber: { type: String, maxlength: 50 },
    deliveryNoteId: { type: Schema.Types.ObjectId, ref: 'DeliveryNote' },
    deliveryNoteNumber: { type: String, maxlength: 50 },

    // Product
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productCode: { type: String, maxlength: 100 },
    productName: { type: String, required: true, maxlength: 500 },
    productNameAr: { type: String, maxlength: 500 },
    description: { type: String, maxlength: 2000 },

    // Quantities
    orderedQuantity: { type: Number, min: 0 },
    deliveredQuantity: { type: Number, min: 0 },
    returnQuantity: { type: Number, required: true, min: 1 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
    acceptedQuantity: { type: Number, default: 0, min: 0 },
    rejectedQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'unit', maxlength: 50 },

    // Pricing
    unitPrice: { type: Number, min: 0 },
    totalPrice: { type: Number, min: 0 },
    restockingFeePercent: { type: Number, default: 0, min: 0, max: 100 },
    restockingFeeAmount: { type: Number, default: 0, min: 0 },
    refundAmount: { type: Number, default: 0, min: 0 },

    // Reason
    reason: {
        type: String,
        enum: [
            'defective',
            'damaged_in_transit',
            'wrong_item',
            'wrong_quantity',
            'not_as_described',
            'quality_issue',
            'changed_mind',
            'duplicate_order',
            'late_delivery',
            'no_longer_needed',
            'warranty_claim',
            'other'
        ],
        required: true
    },
    reasonDetail: { type: String, maxlength: 1000 },
    reasonDetailAr: { type: String, maxlength: 1000 },

    // Serial/Batch
    serialNumbers: [{ type: String, maxlength: 100 }],
    batchNumbers: [{ type: String, maxlength: 100 }],

    // Inspection
    inspectionStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'not_required'],
        default: 'pending'
    },
    inspectionResult: {
        type: String,
        enum: [
            'acceptable',
            'acceptable_with_damage',
            'damaged_by_customer',
            'missing_parts',
            'used',
            'different_item',
            'counterfeit',
            'rejected'
        ]
    },
    inspectionNotes: { type: String, maxlength: 2000 },
    inspectionPhotos: [{ type: String, maxlength: 500 }],
    inspectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: Date,

    // Resolution
    resolution: {
        type: String,
        enum: ['refund', 'replacement', 'credit_note', 'repair', 'exchange', 'reject', 'pending'],
        default: 'pending'
    },
    resolutionNotes: { type: String, maxlength: 1000 },

    // Disposition
    disposition: {
        type: String,
        enum: [
            'return_to_stock',
            'return_to_vendor',
            'scrap',
            'refurbish',
            'donate',
            'pending'
        ],
        default: 'pending'
    },
    dispositionWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    dispositionNotes: { type: String, maxlength: 500 },

    // Item Status
    status: {
        type: String,
        enum: ['pending', 'received', 'inspected', 'processed', 'rejected', 'cancelled'],
        default: 'pending'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// PICKUP/SHIPPING SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const ReturnShippingSchema = new Schema({
    method: {
        type: String,
        enum: ['customer_ship', 'company_pickup', 'drop_off', 'no_return_required'],
        required: true
    },

    // Customer Shipping
    customerTrackingNumber: { type: String, maxlength: 100 },
    customerCarrier: { type: String, maxlength: 100 },
    customerShippingCost: { type: Number, default: 0, min: 0 },
    shippingCostPaidBy: {
        type: String,
        enum: ['customer', 'company'],
        default: 'customer'
    },
    shippingLabelUrl: { type: String, maxlength: 500 },
    shippingLabelGeneratedAt: Date,

    // Company Pickup
    pickupAddress: {
        addressLine1: { type: String, maxlength: 500 },
        addressLine1Ar: { type: String, maxlength: 500 },
        city: { type: String, maxlength: 100 },
        country: { type: String, default: 'Saudi Arabia' },
        postalCode: { type: String, maxlength: 20 },
        latitude: Number,
        longitude: Number
    },
    pickupContactName: { type: String, maxlength: 200 },
    pickupContactPhone: { type: String, maxlength: 50 },
    pickupScheduledDate: Date,
    pickupScheduledTimeSlot: {
        start: { type: String, maxlength: 10 },
        end: { type: String, maxlength: 10 }
    },
    pickupCompletedDate: Date,
    pickupDriverId: { type: Schema.Types.ObjectId, ref: 'User' },
    pickupDriverName: { type: String, maxlength: 200 },
    pickupNotes: { type: String, maxlength: 500 },

    // Drop-off
    dropOffLocationId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    dropOffLocationName: { type: String, maxlength: 200 },
    dropOffAddress: { type: String, maxlength: 500 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const ApprovalSchema = new Schema({
    level: { type: Number, required: true },
    approverRole: { type: String, maxlength: 100 },
    approverId: { type: Schema.Types.ObjectId, ref: 'User' },
    approverName: { type: String, maxlength: 200 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'skipped'],
        default: 'pending'
    },
    approvedAt: Date,
    comments: { type: String, maxlength: 1000 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const HistoryEntrySchema = new Schema({
    action: { type: String, required: true, maxlength: 100 },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, maxlength: 200 },
    details: { type: String, maxlength: 2000 },
    oldStatus: { type: String, maxlength: 50 },
    newStatus: { type: String, maxlength: 50 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RETURN ORDER SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const returnOrderSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (REQUIRED)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    returnNumber: {
        type: String,
        required: true,
        index: true
    },
    returnDate: {
        type: Date,
        required: true,
        default: Date.now
    },

    // ═══════════════════════════════════════════════════════════════
    // SOURCE DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    sourceType: {
        type: String,
        enum: ['sales_order', 'invoice', 'delivery_note'],
        required: true
    },
    sourceId: {
        type: Schema.Types.ObjectId,
        required: true,
        index: true
    },
    sourceNumber: { type: String, maxlength: 50 },
    sourceDate: Date,

    // Additional source references
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    salesOrderNumber: { type: String, maxlength: 50 },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    invoiceNumber: { type: String, maxlength: 50 },
    deliveryNoteId: { type: Schema.Types.ObjectId, ref: 'DeliveryNote' },
    deliveryNoteNumber: { type: String, maxlength: 50 },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER
    // ═══════════════════════════════════════════════════════════════
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    customerName: { type: String, maxlength: 300 },
    customerNameAr: { type: String, maxlength: 300 },
    customerEmail: { type: String, maxlength: 200 },
    customerPhone: { type: String, maxlength: 50 },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'draft',
            'submitted',
            'pending_approval',
            'approved',
            'rejected',
            'awaiting_return',
            'received',
            'inspecting',
            'inspected',
            'processing',
            'processed',
            'completed',
            'cancelled'
        ],
        default: 'draft',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ITEMS
    // ═══════════════════════════════════════════════════════════════
    items: [ReturnItemSchema],

    // ═══════════════════════════════════════════════════════════════
    // REASON (Overall)
    // ═══════════════════════════════════════════════════════════════
    primaryReason: {
        type: String,
        enum: [
            'defective',
            'damaged_in_transit',
            'wrong_item',
            'not_as_described',
            'quality_issue',
            'changed_mind',
            'duplicate_order',
            'late_delivery',
            'warranty_claim',
            'other'
        ],
        required: true
    },
    reasonDetail: { type: String, maxlength: 2000 },
    reasonDetailAr: { type: String, maxlength: 2000 },
    customerPhotos: [{ type: String, maxlength: 500 }],

    // ═══════════════════════════════════════════════════════════════
    // REQUESTED RESOLUTION
    // ═══════════════════════════════════════════════════════════════
    requestedResolution: {
        type: String,
        enum: ['refund', 'replacement', 'credit_note', 'repair', 'exchange'],
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTUAL RESOLUTION
    // ═══════════════════════════════════════════════════════════════
    actualResolution: {
        type: String,
        enum: ['refund', 'replacement', 'credit_note', 'repair', 'exchange', 'partial_refund', 'rejected', 'pending']
    },
    resolutionNotes: { type: String, maxlength: 2000 },

    // ═══════════════════════════════════════════════════════════════
    // AMOUNTS
    // ═══════════════════════════════════════════════════════════════
    originalAmount: { type: Number, min: 0 },
    returnAmount: { type: Number, min: 0 },
    currency: { type: String, default: 'SAR', maxlength: 3 },

    // Restocking Fee
    applyRestockingFee: { type: Boolean, default: false },
    restockingFeePercent: { type: Number, default: 0, min: 0, max: 100 },
    restockingFeeAmount: { type: Number, default: 0, min: 0 },

    // Tax
    vatRate: { type: Number, default: 15, min: 0, max: 100 },
    vatAmount: { type: Number, default: 0, min: 0 },

    // Final refund
    refundAmount: { type: Number, default: 0, min: 0 },
    shippingRefund: { type: Number, default: 0, min: 0 },
    totalRefundAmount: { type: Number, default: 0, min: 0 },

    // ═══════════════════════════════════════════════════════════════
    // SHIPPING / PICKUP
    // ═══════════════════════════════════════════════════════════════
    returnShipping: ReturnShippingSchema,

    // ═══════════════════════════════════════════════════════════════
    // RECEIVING
    // ═══════════════════════════════════════════════════════════════
    receivingWarehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    receivingWarehouseName: { type: String, maxlength: 200 },
    receivedDate: Date,
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receivedByName: { type: String, maxlength: 200 },
    receivingNotes: { type: String, maxlength: 1000 },
    receivingPhotos: [{ type: String, maxlength: 500 }],
    packageCondition: {
        type: String,
        enum: ['good', 'damaged', 'opened', 'missing_items']
    },

    // ═══════════════════════════════════════════════════════════════
    // INSPECTION
    // ═══════════════════════════════════════════════════════════════
    requiresInspection: { type: Boolean, default: true },
    inspectionDate: Date,
    inspectionCompletedDate: Date,
    overallInspectionResult: {
        type: String,
        enum: ['passed', 'passed_with_issues', 'failed', 'pending']
    },
    inspectionSummary: { type: String, maxlength: 2000 },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL
    // ═══════════════════════════════════════════════════════════════
    requiresApproval: { type: Boolean, default: true },
    approvalThreshold: { type: Number }, // Auto-approve below this amount
    approvals: [ApprovalSchema],
    currentApprovalLevel: { type: Number, default: 0 },

    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: { type: String, maxlength: 1000 },

    // ═══════════════════════════════════════════════════════════════
    // GENERATED DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    creditNoteId: { type: Schema.Types.ObjectId, ref: 'CreditNote' },
    creditNoteNumber: { type: String, maxlength: 50 },
    replacementOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    replacementOrderNumber: { type: String, maxlength: 50 },
    refundPaymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    refundPaymentReference: { type: String, maxlength: 100 },
    refundDate: Date,
    refundMethod: {
        type: String,
        enum: ['original_method', 'bank_transfer', 'cash', 'credit_note', 'store_credit']
    },

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    requestedDate: { type: Date, default: Date.now },
    submittedDate: Date,
    expiryDate: Date, // Return request expires
    processedDate: Date,
    completedDate: Date,

    // ═══════════════════════════════════════════════════════════════
    // WARRANTY
    // ═══════════════════════════════════════════════════════════════
    isWarrantyClaim: { type: Boolean, default: false },
    warrantyId: { type: Schema.Types.ObjectId, ref: 'Warranty' },
    warrantyExpiryDate: Date,
    warrantyClaimNumber: { type: String, maxlength: 50 },

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    customerNotes: { type: String, maxlength: 2000 },
    internalNotes: { type: String, maxlength: 2000 },

    // ═══════════════════════════════════════════════════════════════
    // CANCELLATION
    // ═══════════════════════════════════════════════════════════════
    cancellationReason: { type: String, maxlength: 1000 },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // HISTORY
    // ═══════════════════════════════════════════════════════════════
    history: [HistoryEntrySchema],

    // ═══════════════════════════════════════════════════════════════
    // DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    pdfUrl: { type: String, maxlength: 500 },
    rmaLabelUrl: { type: String, maxlength: 500 },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOM FIELDS
    // ═══════════════════════════════════════════════════════════════
    customFields: { type: Map, of: Schema.Types.Mixed },
    tags: [{ type: String, trim: true, maxlength: 50 }],

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════════
returnOrderSchema.index({ firmId: 1, returnNumber: 1 }, { unique: true });
returnOrderSchema.index({ firmId: 1, status: 1, returnDate: -1 });
returnOrderSchema.index({ firmId: 1, customerId: 1 });
returnOrderSchema.index({ firmId: 1, sourceId: 1 });
returnOrderSchema.index({ firmId: 1, salesOrderId: 1 });
returnOrderSchema.index({ firmId: 1, invoiceId: 1 });
returnOrderSchema.index({ lawyerId: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════════════════════
returnOrderSchema.virtual('totalReturnQuantity').get(function() {
    return this.items.reduce((sum, item) => sum + item.returnQuantity, 0);
});

returnOrderSchema.virtual('totalReceivedQuantity').get(function() {
    return this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
});

returnOrderSchema.virtual('isFullyReceived').get(function() {
    return this.items.every(item => item.receivedQuantity >= item.returnQuantity);
});

returnOrderSchema.virtual('isFullyInspected').get(function() {
    return this.items.every(item =>
        item.inspectionStatus === 'completed' || item.inspectionStatus === 'not_required'
    );
});

returnOrderSchema.virtual('daysOpen').get(function() {
    if (this.completedDate || this.cancelledAt) {
        const endDate = this.completedDate || this.cancelledAt;
        return Math.ceil((endDate - this.requestedDate) / (1000 * 60 * 60 * 24));
    }
    return Math.ceil((new Date() - this.requestedDate) / (1000 * 60 * 60 * 24));
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════
returnOrderSchema.pre('save', async function(next) {
    try {
        // Generate return number if new
        if (this.isNew && !this.returnNumber) {
            const Counter = require('./counter.model');
            const year = new Date().getFullYear();
            const counterId = `returnorder_${this.firmId}_${year}`;
            const seq = await Counter.getNextSequence(counterId);
            this.returnNumber = `RMA-${year}-${String(seq).padStart(5, '0')}`;
        }

        // Update line numbers
        this.items.forEach((item, index) => {
            item.lineNumber = index + 1;
        });

        // Calculate amounts
        this.calculateAmounts();

        next();
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate amounts
 */
returnOrderSchema.methods.calculateAmounts = function() {
    // Calculate return amount
    this.returnAmount = this.items.reduce((sum, item) => {
        return sum + (item.unitPrice || 0) * item.returnQuantity;
    }, 0);

    // Calculate restocking fee
    if (this.applyRestockingFee && this.restockingFeePercent > 0) {
        this.restockingFeeAmount = Math.round((this.returnAmount * this.restockingFeePercent / 100) * 100) / 100;
    }

    // Calculate refund amount
    this.refundAmount = this.returnAmount - this.restockingFeeAmount;

    // Add shipping refund if applicable
    this.totalRefundAmount = this.refundAmount + (this.shippingRefund || 0);

    // Calculate VAT
    this.vatAmount = Math.round((this.refundAmount * this.vatRate / 100) * 100) / 100;
};

/**
 * Add history entry
 */
returnOrderSchema.methods.addHistory = function(action, userId, userName, details, oldStatus = null, newStatus = null) {
    this.history.push({
        action,
        performedBy: userId,
        performedByName: userName,
        details,
        oldStatus,
        newStatus,
        timestamp: new Date()
    });
};

/**
 * Submit for approval
 */
returnOrderSchema.methods.submit = async function(userId, userName) {
    if (this.status !== 'draft') {
        throw new Error('Only draft returns can be submitted');
    }

    this.status = this.requiresApproval ? 'pending_approval' : 'approved';
    this.submittedDate = new Date();
    this.addHistory('submitted', userId, userName, 'Return request submitted', 'draft', this.status);

    return this.save();
};

/**
 * Approve return
 */
returnOrderSchema.methods.approve = async function(userId, userName, comments = '') {
    if (this.status !== 'pending_approval') {
        throw new Error('Return is not pending approval');
    }

    this.status = 'approved';
    this.approvedBy = userId;
    this.approvedAt = new Date();
    this.addHistory('approved', userId, userName, comments || 'Return approved', 'pending_approval', 'approved');

    return this.save();
};

/**
 * Reject return
 */
returnOrderSchema.methods.reject = async function(userId, userName, reason) {
    if (!['pending_approval', 'submitted'].includes(this.status)) {
        throw new Error('Return cannot be rejected');
    }

    this.status = 'rejected';
    this.rejectedBy = userId;
    this.rejectedAt = new Date();
    this.rejectionReason = reason;
    this.addHistory('rejected', userId, userName, `Rejected: ${reason}`, this.status, 'rejected');

    return this.save();
};

/**
 * Mark as received
 */
returnOrderSchema.methods.receive = async function(receivingData, userId, userName) {
    if (!['approved', 'awaiting_return'].includes(this.status)) {
        throw new Error('Return must be approved before receiving');
    }

    this.status = 'received';
    this.receivedDate = receivingData.date || new Date();
    this.receivedBy = userId;
    this.receivedByName = userName;
    this.receivingWarehouseId = receivingData.warehouseId;
    this.receivingWarehouseName = receivingData.warehouseName;
    this.receivingNotes = receivingData.notes;
    this.packageCondition = receivingData.packageCondition;

    // Update item received quantities
    if (receivingData.items) {
        receivingData.items.forEach(ri => {
            const item = this.items.find(i => i.lineId === ri.lineId);
            if (item) {
                item.receivedQuantity = ri.receivedQuantity;
                item.status = 'received';
            }
        });
    } else {
        // Mark all items as received
        this.items.forEach(item => {
            item.receivedQuantity = item.returnQuantity;
            item.status = 'received';
        });
    }

    this.addHistory('received', userId, userName, `Items received at ${receivingData.warehouseName}`, this.status, 'received');

    return this.save();
};

/**
 * Complete inspection
 */
returnOrderSchema.methods.completeInspection = async function(inspectionData, userId, userName) {
    if (this.status !== 'received' && this.status !== 'inspecting') {
        throw new Error('Items must be received before inspection');
    }

    // Update item inspection results
    inspectionData.items.forEach(ii => {
        const item = this.items.find(i => i.lineId === ii.lineId);
        if (item) {
            item.inspectionStatus = 'completed';
            item.inspectionResult = ii.result;
            item.inspectionNotes = ii.notes;
            item.inspectedBy = userId;
            item.inspectedAt = new Date();
            item.acceptedQuantity = ii.acceptedQuantity || 0;
            item.rejectedQuantity = ii.rejectedQuantity || 0;
            item.resolution = ii.resolution;
            item.disposition = ii.disposition;
            item.status = 'inspected';
        }
    });

    this.status = 'inspected';
    this.inspectionCompletedDate = new Date();
    this.overallInspectionResult = inspectionData.overallResult;
    this.inspectionSummary = inspectionData.summary;

    // Recalculate amounts based on accepted quantities
    this.calculateAmounts();

    this.addHistory('inspection_completed', userId, userName, inspectionData.summary, 'received', 'inspected');

    return this.save();
};

/**
 * Process return (generate credit note/refund)
 */
returnOrderSchema.methods.process = async function(resolutionData, userId, userName) {
    if (this.status !== 'inspected') {
        throw new Error('Inspection must be completed before processing');
    }

    this.status = 'processed';
    this.actualResolution = resolutionData.resolution;
    this.resolutionNotes = resolutionData.notes;
    this.processedDate = new Date();

    if (resolutionData.creditNoteId) {
        this.creditNoteId = resolutionData.creditNoteId;
        this.creditNoteNumber = resolutionData.creditNoteNumber;
    }

    if (resolutionData.replacementOrderId) {
        this.replacementOrderId = resolutionData.replacementOrderId;
        this.replacementOrderNumber = resolutionData.replacementOrderNumber;
    }

    // Update item statuses
    this.items.forEach(item => {
        item.status = 'processed';
    });

    this.addHistory('processed', userId, userName, `Resolution: ${resolutionData.resolution}`, 'inspected', 'processed');

    return this.save();
};

/**
 * Complete return
 */
returnOrderSchema.methods.complete = async function(userId, userName) {
    if (this.status !== 'processed') {
        throw new Error('Return must be processed before completion');
    }

    this.status = 'completed';
    this.completedDate = new Date();

    this.addHistory('completed', userId, userName, 'Return completed', 'processed', 'completed');

    return this.save();
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get return orders with filters
 */
returnOrderSchema.statics.getReturnOrders = async function(firmQuery, filters = {}) {
    const query = { ...firmQuery };

    if (filters.status) {
        query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
    }

    if (filters.customerId) {
        query.customerId = new mongoose.Types.ObjectId(filters.customerId);
    }

    if (filters.sourceId) {
        query.sourceId = new mongoose.Types.ObjectId(filters.sourceId);
    }

    if (filters.startDate || filters.endDate) {
        query.returnDate = {};
        if (filters.startDate) query.returnDate.$gte = new Date(filters.startDate);
        if (filters.endDate) query.returnDate.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
        const searchRegex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [
            { returnNumber: searchRegex },
            { customerName: searchRegex },
            { sourceNumber: searchRegex }
        ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const sortField = filters.sortBy || 'returnDate';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const [returns, total] = await Promise.all([
        this.find(query)
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .populate('customerId', 'firstName lastName companyName')
            .populate('createdBy', 'firstName lastName')
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        returns,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
};

/**
 * Get statistics
 */
returnOrderSchema.statics.getStatistics = async function(firmQuery, dateRange = {}) {
    const matchQuery = { ...firmQuery };

    if (dateRange.startDate || dateRange.endDate) {
        matchQuery.returnDate = {};
        if (dateRange.startDate) matchQuery.returnDate.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) matchQuery.returnDate.$lte = new Date(dateRange.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalReturns: { $sum: 1 },
                totalRefundAmount: { $sum: '$totalRefundAmount' },
                pending: { $sum: { $cond: [{ $in: ['$status', ['draft', 'submitted', 'pending_approval']] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                received: { $sum: { $cond: [{ $eq: ['$status', 'received'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
                byReason: { $push: '$primaryReason' }
            }
        }
    ]);

    // Count reasons
    const result = stats[0] || {
        totalReturns: 0,
        totalRefundAmount: 0,
        pending: 0,
        approved: 0,
        received: 0,
        completed: 0,
        rejected: 0
    };

    if (result.byReason) {
        result.reasonBreakdown = result.byReason.reduce((acc, reason) => {
            acc[reason] = (acc[reason] || 0) + 1;
            return acc;
        }, {});
        delete result.byReason;
    }

    return result;
};

module.exports = mongoose.model('ReturnOrder', returnOrderSchema);
