/**
 * Sales Order Model - Enterprise Gold Standard
 *
 * Complete sales order management with:
 * - Full lifecycle tracking (draft → confirmed → shipped → invoiced → completed)
 * - Partial delivery & invoicing support
 * - Multi-level approval workflows
 * - Down payment/advance tracking
 * - Commission calculation integration
 * - Odoo/ERPNext/SAP feature parity
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const AddressSchema = new Schema({
    addressLine1: { type: String, maxlength: 500 },
    addressLine1Ar: { type: String, maxlength: 500 },
    addressLine2: { type: String, maxlength: 500 },
    addressLine2Ar: { type: String, maxlength: 500 },
    city: { type: String, maxlength: 100 },
    cityAr: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    stateAr: { type: String, maxlength: 100 },
    country: { type: String, default: 'Saudi Arabia', maxlength: 100 },
    countryCode: { type: String, default: 'SA', maxlength: 3 },
    postalCode: { type: String, maxlength: 20 },
    // Saudi National Address fields
    buildingNumber: { type: String, maxlength: 10 },
    additionalNumber: { type: String, maxlength: 10 },
    unitNumber: { type: String, maxlength: 10 },
    district: { type: String, maxlength: 100 },
    districtAr: { type: String, maxlength: 100 },
    // Geo coordinates for delivery
    latitude: Number,
    longitude: Number
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// LINE ITEM SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const SalesOrderItemSchema = new Schema({
    lineId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    lineNumber: { type: Number, required: true },

    // Product Reference
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productCode: { type: String, maxlength: 100 },
    productName: { type: String, required: true, maxlength: 500 },
    productNameAr: { type: String, maxlength: 500 },
    description: { type: String, maxlength: 2000 },
    descriptionAr: { type: String, maxlength: 2000 },

    // Product Type (for different handling)
    itemType: {
        type: String,
        enum: ['product', 'service', 'consumable', 'bundle', 'subscription'],
        default: 'product'
    },

    // Quantities
    quantity: { type: Number, required: true, min: 0, default: 1 },
    unit: { type: String, default: 'unit', maxlength: 50 },
    uomConversionFactor: { type: Number, default: 1 },

    // Fulfillment Tracking
    quantityDelivered: { type: Number, default: 0, min: 0 },
    quantityInvoiced: { type: Number, default: 0, min: 0 },
    quantityReturned: { type: Number, default: 0, min: 0 },
    quantityReserved: { type: Number, default: 0, min: 0 },
    quantityBackordered: { type: Number, default: 0, min: 0 },

    // Pricing
    listPrice: { type: Number, min: 0 }, // Original list price
    unitPrice: { type: Number, required: true, min: 0 },
    priceListId: { type: Schema.Types.ObjectId, ref: 'PriceList' },
    pricingRuleId: { type: Schema.Types.ObjectId, ref: 'PricingRule' },

    // Discounts
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    priceAfterDiscount: { type: Number, min: 0 },

    // Tax
    taxTemplateId: { type: Schema.Types.ObjectId, ref: 'TaxTemplate' },
    taxRate: { type: Number, default: 15, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    taxIncluded: { type: Boolean, default: false },

    // Calculated Totals
    subtotal: { type: Number, min: 0 }, // Before tax
    total: { type: Number, min: 0 }, // After tax

    // Margin Analysis
    costPrice: { type: Number, min: 0 },
    marginAmount: { type: Number },
    marginPercent: { type: Number },

    // Warehouse & Delivery
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    warehouseName: { type: String, maxlength: 200 },
    expectedDeliveryDate: Date,
    actualDeliveryDate: Date,

    // Drop Ship (direct from supplier)
    isDropShip: { type: Boolean, default: false },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    supplierOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },

    // Serial/Batch Tracking
    serialNumbers: [String],
    batchNumber: { type: String, maxlength: 100 },
    expiryDate: Date,

    // Bundle Items (if itemType is 'bundle')
    bundleItems: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product' },
        productName: String,
        quantity: Number
    }],

    // Notes
    notes: { type: String, maxlength: 1000 },
    internalNotes: { type: String, maxlength: 1000 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// TAX LINE SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const TaxLineSchema = new Schema({
    taxName: { type: String, required: true, maxlength: 100 },
    taxNameAr: { type: String, maxlength: 100 },
    taxRate: { type: Number, required: true, min: 0, max: 100 },
    taxableAmount: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    taxAccountId: { type: Schema.Types.ObjectId, ref: 'Account' },
    taxType: {
        type: String,
        enum: ['vat', 'sales_tax', 'service_tax', 'excise', 'customs', 'other'],
        default: 'vat'
    }
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
    comments: { type: String, maxlength: 1000 },
    threshold: { type: Number } // Amount threshold that triggered this approval
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// SALES TEAM CONTRIBUTION SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const SalesContributionSchema = new Schema({
    salesPersonId: { type: Schema.Types.ObjectId, ref: 'SalesPerson', required: true },
    salesPersonName: { type: String, maxlength: 200 },
    role: {
        type: String,
        enum: ['primary', 'support', 'manager', 'partner'],
        default: 'primary'
    },
    contributionPercent: { type: Number, required: true, min: 0, max: 100 },
    contributionAmount: { type: Number, min: 0 },
    commissionRate: { type: Number, min: 0, max: 100 },
    commissionAmount: { type: Number, min: 0 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY/AUDIT SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const HistoryEntrySchema = new Schema({
    action: { type: String, required: true, maxlength: 100 },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, maxlength: 200 },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    field: { type: String, maxlength: 100 },
    details: { type: String, maxlength: 2000 },
    ipAddress: { type: String, maxlength: 50 }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SALES ORDER SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const salesOrderSchema = new Schema({
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
    // ORDER IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    orderNumber: {
        type: String,
        required: true,
        index: true
    },
    orderDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SOURCE DOCUMENT
    // ═══════════════════════════════════════════════════════════════
    sourceType: {
        type: String,
        enum: ['manual', 'quote', 'opportunity', 'ecommerce', 'api', 'recurring'],
        default: 'manual'
    },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote', index: true },
    quoteNumber: { type: String, maxlength: 50 },
    opportunityId: { type: Schema.Types.ObjectId, ref: 'Lead' },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER INFORMATION
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
    customerVatNumber: { type: String, maxlength: 50 },
    customerPoNumber: { type: String, maxlength: 100 }, // Customer's PO reference
    customerReference: { type: String, maxlength: 200 },

    // Addresses
    billingAddressId: { type: Schema.Types.ObjectId },
    billingAddress: AddressSchema,
    shippingAddressId: { type: Schema.Types.ObjectId },
    shippingAddress: AddressSchema,
    sameAsBilling: { type: Boolean, default: true },

    // Contact Person
    contactPersonId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    contactPersonName: { type: String, maxlength: 200 },
    contactPersonEmail: { type: String, maxlength: 200 },
    contactPersonPhone: { type: String, maxlength: 50 },

    // ═══════════════════════════════════════════════════════════════
    // ORDER STATUS - Multi-dimensional tracking
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'draft',
            'pending_approval',
            'approved',
            'confirmed',
            'in_progress',
            'on_hold',
            'partially_shipped',
            'shipped',
            'partially_invoiced',
            'invoiced',
            'completed',
            'cancelled',
            'closed'
        ],
        default: 'draft',
        index: true
    },

    // Sub-statuses for granular tracking
    deliveryStatus: {
        type: String,
        enum: ['not_started', 'partially_delivered', 'fully_delivered', 'not_applicable'],
        default: 'not_started'
    },
    billingStatus: {
        type: String,
        enum: ['not_billed', 'partially_billed', 'fully_billed'],
        default: 'not_billed'
    },
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'partially_paid', 'fully_paid', 'overpaid'],
        default: 'unpaid'
    },

    // ═══════════════════════════════════════════════════════════════
    // LINE ITEMS
    // ═══════════════════════════════════════════════════════════════
    items: [SalesOrderItemSchema],

    // ═══════════════════════════════════════════════════════════════
    // PRICING & DISCOUNTS
    // ═══════════════════════════════════════════════════════════════
    priceListId: { type: Schema.Types.ObjectId, ref: 'PriceList' },
    priceListName: { type: String, maxlength: 200 },
    currency: { type: String, default: 'SAR', maxlength: 3 },
    exchangeRate: { type: Number, default: 1, min: 0 },

    // Order-level discount
    additionalDiscountType: {
        type: String,
        enum: ['percentage', 'amount'],
        default: 'percentage'
    },
    additionalDiscountValue: { type: Number, default: 0, min: 0 },
    additionalDiscountAmount: { type: Number, default: 0, min: 0 },
    discountReason: { type: String, maxlength: 500 },
    couponCode: { type: String, maxlength: 50 },

    // Pricing Rules Applied
    appliedPricingRules: [{
        ruleId: { type: Schema.Types.ObjectId, ref: 'PricingRule' },
        ruleName: String,
        discountAmount: Number
    }],

    // ═══════════════════════════════════════════════════════════════
    // TOTALS & CALCULATIONS
    // ═══════════════════════════════════════════════════════════════
    // Item totals
    itemsSubtotal: { type: Number, default: 0, min: 0 },
    itemsDiscountTotal: { type: Number, default: 0, min: 0 },

    // After order-level discount
    subtotal: { type: Number, default: 0, min: 0 },

    // Tax
    taxLines: [TaxLineSchema],
    taxableAmount: { type: Number, default: 0, min: 0 },
    totalTaxAmount: { type: Number, default: 0, min: 0 },
    taxRate: { type: Number, default: 15, min: 0, max: 100 },

    // Additional Charges
    shippingCost: { type: Number, default: 0, min: 0 },
    handlingCost: { type: Number, default: 0, min: 0 },
    insuranceCost: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    otherChargesDescription: { type: String, maxlength: 500 },

    // Rounding
    roundingAdjustment: { type: Number, default: 0 },

    // Grand Total
    grandTotal: { type: Number, required: true, default: 0, min: 0 },

    // Margin Analysis
    totalCost: { type: Number, default: 0, min: 0 },
    totalMargin: { type: Number, default: 0 },
    marginPercent: { type: Number, default: 0 },

    // ═══════════════════════════════════════════════════════════════
    // PAYMENT TRACKING
    // ═══════════════════════════════════════════════════════════════
    paymentTermsId: { type: Schema.Types.ObjectId, ref: 'PaymentTerms' },
    paymentTerms: { type: String, maxlength: 100 },
    paymentTermsDays: { type: Number, default: 30 },
    paymentDueDate: Date,

    // Down Payment / Advance
    downPaymentRequired: { type: Boolean, default: false },
    downPaymentType: {
        type: String,
        enum: ['percentage', 'fixed_amount'],
        default: 'percentage'
    },
    downPaymentPercent: { type: Number, default: 0, min: 0, max: 100 },
    downPaymentAmount: { type: Number, default: 0, min: 0 },
    downPaymentPaid: { type: Number, default: 0, min: 0 },
    downPaymentInvoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    downPaymentPaidDate: Date,

    // Payment Summary
    totalPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0 },

    // Payment Methods Accepted
    acceptedPaymentMethods: [{
        type: String,
        enum: ['cash', 'bank_transfer', 'credit_card', 'cheque', 'mada', 'apple_pay', 'stc_pay', 'credit']
    }],

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY SETTINGS
    // ═══════════════════════════════════════════════════════════════
    shippingPolicy: {
        type: String,
        enum: ['deliver_all_at_once', 'deliver_as_available', 'deliver_by_date'],
        default: 'deliver_all_at_once'
    },
    expectedDeliveryDate: Date,
    commitmentDate: Date, // Promised delivery date
    actualDeliveryDate: Date,

    deliveryMethod: { type: String, maxlength: 100 },
    shippingCarrier: { type: String, maxlength: 100 },
    shippingCarrierId: { type: Schema.Types.ObjectId, ref: 'ShippingCarrier' },
    shippingService: { type: String, maxlength: 100 },
    incoterms: {
        type: String,
        enum: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'],
        maxlength: 10
    },

    // Default Warehouse
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    warehouseName: { type: String, maxlength: 200 },

    // Delivery Progress
    deliveryProgress: { type: Number, default: 0, min: 0, max: 100 },
    invoicingProgress: { type: Number, default: 0, min: 0, max: 100 },

    // ═══════════════════════════════════════════════════════════════
    // SALES TEAM & COMMISSION
    // ═══════════════════════════════════════════════════════════════
    salesPersonId: {
        type: Schema.Types.ObjectId,
        ref: 'SalesPerson',
        index: true
    },
    salesPersonName: { type: String, maxlength: 200 },
    salesTeamId: { type: Schema.Types.ObjectId, ref: 'SalesTeam' },
    salesTeamName: { type: String, maxlength: 200 },
    territoryId: { type: Schema.Types.ObjectId, ref: 'Territory' },
    territoryName: { type: String, maxlength: 200 },

    // Sales contributions (for team commission split)
    salesContributions: [SalesContributionSchema],

    // Commission
    commissionPlanId: { type: Schema.Types.ObjectId, ref: 'CommissionPlan' },
    commissionAmount: { type: Number, default: 0, min: 0 },
    commissionStatus: {
        type: String,
        enum: ['not_calculated', 'calculated', 'approved', 'paid'],
        default: 'not_calculated'
    },

    // Campaign/Source tracking
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign' },
    campaignName: { type: String, maxlength: 200 },
    sourceChannel: {
        type: String,
        enum: ['direct', 'referral', 'website', 'social', 'email', 'phone', 'partner', 'other'],
        default: 'direct'
    },
    referralId: { type: Schema.Types.ObjectId, ref: 'Referral' },

    // ═══════════════════════════════════════════════════════════════
    // LINKED DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    deliveryNoteIds: [{ type: Schema.Types.ObjectId, ref: 'DeliveryNote' }],
    invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
    downPaymentInvoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
    creditNoteIds: [{ type: Schema.Types.ObjectId, ref: 'CreditNote' }],
    returnOrderIds: [{ type: Schema.Types.ObjectId, ref: 'ReturnOrder' }],
    paymentIds: [{ type: Schema.Types.ObjectId, ref: 'Payment' }],
    purchaseOrderIds: [{ type: Schema.Types.ObjectId, ref: 'PurchaseOrder' }], // For drop ship

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    requiresApproval: { type: Boolean, default: false },
    approvalWorkflowId: { type: Schema.Types.ObjectId, ref: 'ApprovalWorkflow' },
    approvals: [ApprovalSchema],
    currentApprovalLevel: { type: Number, default: 0 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: { type: String, maxlength: 1000 },

    // ═══════════════════════════════════════════════════════════════
    // NOTES & TERMS
    // ═══════════════════════════════════════════════════════════════
    notes: { type: String, maxlength: 5000 },
    notesAr: { type: String, maxlength: 5000 },
    internalNotes: { type: String, maxlength: 5000 },
    termsAndConditions: { type: String, maxlength: 10000 },
    termsAndConditionsAr: { type: String, maxlength: 10000 },
    specialInstructions: { type: String, maxlength: 2000 },

    // ═══════════════════════════════════════════════════════════════
    // HOLD & CANCELLATION
    // ═══════════════════════════════════════════════════════════════
    holdReason: { type: String, maxlength: 1000 },
    holdUntil: Date,
    heldBy: { type: Schema.Types.ObjectId, ref: 'User' },
    heldAt: Date,

    cancellationReason: { type: String, maxlength: 1000 },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // VERSIONING / AMENDMENTS
    // ═══════════════════════════════════════════════════════════════
    revisionNumber: { type: Number, default: 1, min: 1 },
    previousVersionId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    amendedFrom: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    isAmended: { type: Boolean, default: false },

    // ═══════════════════════════════════════════════════════════════
    // PRINT & DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    printCount: { type: Number, default: 0 },
    lastPrintedAt: Date,
    lastPrintedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pdfUrl: { type: String, maxlength: 500 },
    pdfGeneratedAt: Date,
    letterHeadId: { type: Schema.Types.ObjectId, ref: 'LetterHead' },
    templateId: { type: Schema.Types.ObjectId, ref: 'DocumentTemplate' },

    // ═══════════════════════════════════════════════════════════════
    // HISTORY & AUDIT
    // ═══════════════════════════════════════════════════════════════
    history: [HistoryEntrySchema],

    // ═══════════════════════════════════════════════════════════════
    // IMPORTANT DATES
    // ═══════════════════════════════════════════════════════════════
    confirmedAt: Date,
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    submittedAt: Date,
    submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
    closedAt: Date,
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },

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
salesOrderSchema.index({ firmId: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ firmId: 1, status: 1, orderDate: -1 });
salesOrderSchema.index({ firmId: 1, customerId: 1, orderDate: -1 });
salesOrderSchema.index({ firmId: 1, salesPersonId: 1, orderDate: -1 });
salesOrderSchema.index({ firmId: 1, deliveryStatus: 1 });
salesOrderSchema.index({ firmId: 1, billingStatus: 1 });
salesOrderSchema.index({ firmId: 1, paymentStatus: 1 });
salesOrderSchema.index({ firmId: 1, quoteId: 1 });
salesOrderSchema.index({ firmId: 1, expectedDeliveryDate: 1 });
salesOrderSchema.index({ firmId: 1, campaignId: 1 });
salesOrderSchema.index({ lawyerId: 1, status: 1 });
salesOrderSchema.index({ 'items.productId': 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════════════════════
salesOrderSchema.virtual('quantityRemaining').get(function() {
    return this.items.reduce((sum, item) => {
        return sum + (item.quantity - item.quantityDelivered);
    }, 0);
});

salesOrderSchema.virtual('isFullyDelivered').get(function() {
    return this.items.every(item => item.quantityDelivered >= item.quantity);
});

salesOrderSchema.virtual('isFullyInvoiced').get(function() {
    return this.items.every(item => item.quantityInvoiced >= item.quantity);
});

salesOrderSchema.virtual('isOverdue').get(function() {
    if (!this.expectedDeliveryDate) return false;
    return this.status !== 'completed' &&
           this.status !== 'cancelled' &&
           new Date() > this.expectedDeliveryDate;
});

salesOrderSchema.virtual('daysOverdue').get(function() {
    if (!this.isOverdue) return 0;
    const diff = new Date() - this.expectedDeliveryDate;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════
salesOrderSchema.pre('save', async function(next) {
    try {
        // Generate order number if new
        if (this.isNew && !this.orderNumber) {
            const Counter = require('./counter.model');
            const year = new Date().getFullYear();
            const counterId = `salesorder_${this.firmId}_${year}`;
            const seq = await Counter.getNextSequence(counterId);
            this.orderNumber = `SO-${year}-${String(seq).padStart(5, '0')}`;
        }

        // Calculate line item totals
        this.calculateItemTotals();

        // Calculate order totals
        this.calculateOrderTotals();

        // Update delivery/billing status
        this.updateFulfillmentStatus();

        // Calculate progress percentages
        this.calculateProgress();

        next();
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate line item totals
 */
salesOrderSchema.methods.calculateItemTotals = function() {
    this.items.forEach((item, index) => {
        item.lineNumber = index + 1;

        // Calculate price after discount
        const lineSubtotal = item.quantity * item.unitPrice;
        const discountAmount = item.discountPercent > 0
            ? (lineSubtotal * item.discountPercent / 100)
            : item.discountAmount || 0;

        item.discountAmount = Math.round(discountAmount * 100) / 100;
        item.priceAfterDiscount = item.unitPrice * (1 - (item.discountPercent || 0) / 100);

        // Calculate subtotal and tax
        item.subtotal = Math.round((lineSubtotal - item.discountAmount) * 100) / 100;

        if (item.taxIncluded) {
            // Tax-inclusive pricing
            const taxMultiplier = 1 + (item.taxRate / 100);
            item.taxAmount = Math.round((item.subtotal - (item.subtotal / taxMultiplier)) * 100) / 100;
            item.total = item.subtotal;
            item.subtotal = Math.round((item.subtotal / taxMultiplier) * 100) / 100;
        } else {
            // Tax-exclusive pricing
            item.taxAmount = Math.round((item.subtotal * item.taxRate / 100) * 100) / 100;
            item.total = Math.round((item.subtotal + item.taxAmount) * 100) / 100;
        }

        // Calculate margin
        if (item.costPrice && item.costPrice > 0) {
            item.marginAmount = item.subtotal - (item.costPrice * item.quantity);
            item.marginPercent = (item.marginAmount / item.subtotal) * 100;
        }
    });
};

/**
 * Calculate order totals
 */
salesOrderSchema.methods.calculateOrderTotals = function() {
    // Sum item totals
    this.itemsSubtotal = this.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    this.itemsDiscountTotal = this.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);

    // Apply order-level discount
    if (this.additionalDiscountType === 'percentage' && this.additionalDiscountValue > 0) {
        this.additionalDiscountAmount = Math.round((this.itemsSubtotal * this.additionalDiscountValue / 100) * 100) / 100;
    }

    this.subtotal = Math.round((this.itemsSubtotal - this.additionalDiscountAmount) * 100) / 100;

    // Calculate taxes
    this.taxableAmount = this.subtotal;
    this.totalTaxAmount = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);

    // Build tax lines summary
    const taxMap = {};
    this.items.forEach(item => {
        const key = `${item.taxRate}`;
        if (!taxMap[key]) {
            taxMap[key] = { taxRate: item.taxRate, taxableAmount: 0, taxAmount: 0 };
        }
        taxMap[key].taxableAmount += item.subtotal || 0;
        taxMap[key].taxAmount += item.taxAmount || 0;
    });

    this.taxLines = Object.values(taxMap).map(t => ({
        taxName: `VAT ${t.taxRate}%`,
        taxNameAr: `ضريبة القيمة المضافة ${t.taxRate}%`,
        taxRate: t.taxRate,
        taxableAmount: Math.round(t.taxableAmount * 100) / 100,
        taxAmount: Math.round(t.taxAmount * 100) / 100,
        taxType: 'vat'
    }));

    // Calculate grand total
    const charges = (this.shippingCost || 0) +
                   (this.handlingCost || 0) +
                   (this.insuranceCost || 0) +
                   (this.otherCharges || 0);

    this.grandTotal = Math.round((this.subtotal + this.totalTaxAmount + charges + (this.roundingAdjustment || 0)) * 100) / 100;

    // Calculate balance due
    this.balanceDue = Math.round((this.grandTotal - this.totalPaid) * 100) / 100;

    // Calculate margin
    this.totalCost = this.items.reduce((sum, item) => sum + ((item.costPrice || 0) * item.quantity), 0);
    this.totalMargin = this.subtotal - this.totalCost;
    this.marginPercent = this.subtotal > 0 ? (this.totalMargin / this.subtotal) * 100 : 0;
};

/**
 * Update fulfillment status based on line items
 */
salesOrderSchema.methods.updateFulfillmentStatus = function() {
    const totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const deliveredQuantity = this.items.reduce((sum, item) => sum + item.quantityDelivered, 0);
    const invoicedQuantity = this.items.reduce((sum, item) => sum + item.quantityInvoiced, 0);

    // Delivery status
    if (deliveredQuantity === 0) {
        this.deliveryStatus = 'not_started';
    } else if (deliveredQuantity >= totalQuantity) {
        this.deliveryStatus = 'fully_delivered';
    } else {
        this.deliveryStatus = 'partially_delivered';
    }

    // Billing status
    if (invoicedQuantity === 0) {
        this.billingStatus = 'not_billed';
    } else if (invoicedQuantity >= totalQuantity) {
        this.billingStatus = 'fully_billed';
    } else {
        this.billingStatus = 'partially_billed';
    }

    // Payment status
    if (this.totalPaid === 0) {
        this.paymentStatus = 'unpaid';
    } else if (this.totalPaid >= this.grandTotal) {
        this.paymentStatus = this.totalPaid > this.grandTotal ? 'overpaid' : 'fully_paid';
    } else {
        this.paymentStatus = 'partially_paid';
    }
};

/**
 * Calculate progress percentages
 */
salesOrderSchema.methods.calculateProgress = function() {
    const totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const deliveredQuantity = this.items.reduce((sum, item) => sum + item.quantityDelivered, 0);
    const invoicedQuantity = this.items.reduce((sum, item) => sum + item.quantityInvoiced, 0);

    this.deliveryProgress = totalQuantity > 0 ? Math.round((deliveredQuantity / totalQuantity) * 100) : 0;
    this.invoicingProgress = totalQuantity > 0 ? Math.round((invoicedQuantity / totalQuantity) * 100) : 0;
};

/**
 * Add history entry
 */
salesOrderSchema.methods.addHistory = function(action, userId, userName, details, field = null, oldValue = null, newValue = null) {
    this.history.push({
        action,
        performedBy: userId,
        performedByName: userName,
        details,
        field,
        oldValue,
        newValue,
        timestamp: new Date()
    });
};

/**
 * Confirm order
 */
salesOrderSchema.methods.confirm = async function(userId, userName) {
    if (this.status !== 'draft' && this.status !== 'approved') {
        throw new Error('Order can only be confirmed from draft or approved status');
    }

    this.status = 'confirmed';
    this.confirmedAt = new Date();
    this.confirmedBy = userId;
    this.addHistory('confirmed', userId, userName, 'Order confirmed');

    return this.save();
};

/**
 * Cancel order
 */
salesOrderSchema.methods.cancel = async function(userId, userName, reason) {
    if (['completed', 'cancelled'].includes(this.status)) {
        throw new Error('Cannot cancel completed or already cancelled order');
    }

    if (this.deliveryProgress > 0) {
        throw new Error('Cannot cancel order with deliveries. Create return order instead.');
    }

    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = userId;
    this.cancellationReason = reason;
    this.addHistory('cancelled', userId, userName, `Order cancelled: ${reason}`);

    return this.save();
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get orders with filters
 */
salesOrderSchema.statics.getOrders = async function(firmQuery, filters = {}) {
    const query = { ...firmQuery };

    // Status filter
    if (filters.status) {
        query.status = Array.isArray(filters.status)
            ? { $in: filters.status }
            : filters.status;
    }

    // Customer filter
    if (filters.customerId) {
        query.customerId = new mongoose.Types.ObjectId(filters.customerId);
    }

    // Sales person filter
    if (filters.salesPersonId) {
        query.salesPersonId = new mongoose.Types.ObjectId(filters.salesPersonId);
    }

    // Date range
    if (filters.startDate || filters.endDate) {
        query.orderDate = {};
        if (filters.startDate) query.orderDate.$gte = new Date(filters.startDate);
        if (filters.endDate) query.orderDate.$lte = new Date(filters.endDate);
    }

    // Search
    if (filters.search) {
        const searchRegex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [
            { orderNumber: searchRegex },
            { customerName: searchRegex },
            { customerPoNumber: searchRegex }
        ];
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Sort
    const sortField = filters.sortBy || 'orderDate';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const [orders, total] = await Promise.all([
        this.find(query)
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .populate('customerId', 'firstName lastName companyName email')
            .populate('salesPersonId', 'name')
            .populate('createdBy', 'firstName lastName')
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        orders,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get order statistics
 */
salesOrderSchema.statics.getStatistics = async function(firmQuery, dateRange = {}) {
    const matchQuery = { ...firmQuery };

    if (dateRange.startDate || dateRange.endDate) {
        matchQuery.orderDate = {};
        if (dateRange.startDate) matchQuery.orderDate.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) matchQuery.orderDate.$lte = new Date(dateRange.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalValue: { $sum: '$grandTotal' },
                avgOrderValue: { $avg: '$grandTotal' },
                totalPaid: { $sum: '$totalPaid' },
                totalOutstanding: { $sum: '$balanceDue' },
                draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
                confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
            }
        }
    ]);

    return stats[0] || {
        totalOrders: 0,
        totalValue: 0,
        avgOrderValue: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        draft: 0,
        confirmed: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0
    };
};

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
