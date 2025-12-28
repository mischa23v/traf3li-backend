const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Sales Settings Model - Firm-Level Sales Configuration
 *
 * Centralized configuration for all sales module features.
 * Inspired by: Odoo Sales Settings, ERPNext Selling Settings,
 * SAP Sales Configuration, Salesforce Sales Cloud Settings
 *
 * Features:
 * - Quotation and order settings
 * - Pricing and discount policies
 * - Delivery and fulfillment rules
 * - Commission configuration
 * - Tax and compliance settings
 * - Notification preferences
 * - Integration settings
 */

const SalesSettingsSchema = new Schema({
    // Multi-tenant isolation
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        unique: true,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ===================
    // QUOTATION SETTINGS
    // ===================
    quotation: {
        // Numbering
        numberPrefix: {
            type: String,
            default: 'QT'
        },
        numberSuffix: String,
        numberSequence: {
            type: Number,
            default: 1
        },
        numberPadding: {
            type: Number,
            default: 6
        },
        includeYearInNumber: {
            type: Boolean,
            default: true
        },
        resetSequenceYearly: {
            type: Boolean,
            default: true
        },

        // Validity
        defaultValidityDays: {
            type: Number,
            default: 30
        },
        reminderBeforeExpiryDays: {
            type: Number,
            default: 7
        },
        autoExpireQuotes: {
            type: Boolean,
            default: false
        },

        // Approval
        requireApprovalAbove: {
            type: Number,
            default: 0 // 0 = no approval required
        },
        approvalLevels: [{
            threshold: Number,
            approverRole: {
                type: String,
                enum: ['manager', 'director', 'vp_sales', 'cfo', 'custom']
            },
            customApprover: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        }],

        // Discount limits
        maxDiscountPercentWithoutApproval: {
            type: Number,
            default: 10
        },
        allowNegotiatedPricing: {
            type: Boolean,
            default: true
        },

        // Terms
        defaultTermsAndConditions: String,
        defaultPaymentTerms: String,
        defaultNotes: String,

        // Template
        defaultTemplateId: {
            type: Schema.Types.ObjectId,
            ref: 'DocumentTemplate'
        },
        showProductImages: {
            type: Boolean,
            default: true
        },
        showProductDescriptions: {
            type: Boolean,
            default: true
        },
        showTaxBreakdown: {
            type: Boolean,
            default: true
        },
        showDiscountColumn: {
            type: Boolean,
            default: true
        }
    },

    // ===================
    // SALES ORDER SETTINGS
    // ===================
    salesOrder: {
        // Numbering
        numberPrefix: {
            type: String,
            default: 'SO'
        },
        numberSuffix: String,
        numberSequence: {
            type: Number,
            default: 1
        },
        numberPadding: {
            type: Number,
            default: 6
        },
        includeYearInNumber: {
            type: Boolean,
            default: true
        },
        resetSequenceYearly: {
            type: Boolean,
            default: true
        },

        // Order processing
        requireDownPayment: {
            type: Boolean,
            default: false
        },
        defaultDownPaymentPercentage: {
            type: Number,
            default: 30
        },
        allowPartialDelivery: {
            type: Boolean,
            default: true
        },
        allowPartialInvoicing: {
            type: Boolean,
            default: true
        },
        allowBackorders: {
            type: Boolean,
            default: true
        },

        // Confirmation
        autoConfirmPaidOrders: {
            type: Boolean,
            default: false
        },
        requireCustomerAcceptance: {
            type: Boolean,
            default: false
        },
        sendConfirmationEmail: {
            type: Boolean,
            default: true
        },

        // Approval
        requireApprovalAbove: {
            type: Number,
            default: 0
        },
        approvalLevels: [{
            threshold: Number,
            approverRole: String,
            customApprover: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        }],

        // Fulfillment
        defaultWarehouseId: {
            type: Schema.Types.ObjectId,
            ref: 'Warehouse'
        },
        defaultShippingMethod: String,
        defaultDeliveryLeadDays: {
            type: Number,
            default: 3
        },

        // Terms
        defaultTermsAndConditions: String,
        defaultIncoterms: {
            type: String,
            enum: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF', null],
            default: null
        },

        // Cancellation
        allowCancellationBeforeDelivery: {
            type: Boolean,
            default: true
        },
        cancellationPenaltyPercentage: {
            type: Number,
            default: 0
        },

        // Lock rules
        lockAfterConfirmation: {
            type: Boolean,
            default: true
        },
        allowedModificationsAfterConfirmation: {
            type: [String],
            default: ['notes', 'expectedDeliveryDate']
        }
    },

    // ===================
    // PRICING SETTINGS
    // ===================
    pricing: {
        // Default price list
        defaultPriceListId: {
            type: Schema.Types.ObjectId,
            ref: 'PriceList'
        },

        // Price calculation
        pricesIncludeTax: {
            type: Boolean,
            default: false
        },
        roundingMethod: {
            type: String,
            enum: ['none', 'round_up', 'round_down', 'round_nearest', 'round_to_05', 'round_to_10'],
            default: 'round_nearest'
        },
        roundingPrecision: {
            type: Number,
            default: 2
        },

        // Discount policies
        allowManualDiscounts: {
            type: Boolean,
            default: true
        },
        maxLineDiscountPercent: {
            type: Number,
            default: 50
        },
        maxOrderDiscountPercent: {
            type: Number,
            default: 30
        },
        stackableDiscounts: {
            type: Boolean,
            default: false
        },
        discountCalculationOrder: {
            type: String,
            enum: ['line_first', 'order_first', 'best_for_customer'],
            default: 'line_first'
        },

        // Minimum prices
        enforceMinimumPrice: {
            type: Boolean,
            default: false
        },
        minimumMarginPercent: {
            type: Number,
            default: 0
        },
        belowCostWarning: {
            type: Boolean,
            default: true
        },
        belowCostApprovalRequired: {
            type: Boolean,
            default: true
        },

        // Currency
        defaultCurrency: {
            type: String,
            default: 'SAR'
        },
        allowMultipleCurrencies: {
            type: Boolean,
            default: true
        },
        exchangeRateSource: {
            type: String,
            enum: ['manual', 'api', 'daily_rate'],
            default: 'manual'
        },
        exchangeRateMargin: {
            type: Number,
            default: 0
        },

        // Pricing rules
        enablePricingRules: {
            type: Boolean,
            default: true
        },
        applyRulesAutomatically: {
            type: Boolean,
            default: true
        },
        maxRulesPerTransaction: {
            type: Number,
            default: 10
        }
    },

    // ===================
    // TAX SETTINGS
    // ===================
    tax: {
        // Default tax
        defaultTaxRate: {
            type: Number,
            default: 15 // Saudi VAT
        },
        defaultTaxName: {
            type: String,
            default: 'VAT'
        },
        taxId: {
            type: Schema.Types.ObjectId,
            ref: 'Tax'
        },

        // Tax calculation
        taxCalculationMethod: {
            type: String,
            enum: ['line_by_line', 'order_total'],
            default: 'line_by_line'
        },
        taxRoundingMethod: {
            type: String,
            enum: ['per_line', 'per_order'],
            default: 'per_line'
        },

        // Tax display
        showTaxInLineItems: {
            type: Boolean,
            default: true
        },
        showTaxSummary: {
            type: Boolean,
            default: true
        },
        taxInclusiveDisplay: {
            type: Boolean,
            default: false
        },

        // Tax exemption
        allowTaxExemption: {
            type: Boolean,
            default: true
        },
        requireTaxExemptionCertificate: {
            type: Boolean,
            default: true
        },

        // Compliance
        vatNumber: String,
        taxRegistrationNumber: String,
        zatcaIntegrationEnabled: {
            type: Boolean,
            default: false
        },
        zatcaPhase: {
            type: String,
            enum: ['phase1', 'phase2'],
            default: 'phase1'
        }
    },

    // ===================
    // DELIVERY SETTINGS
    // ===================
    delivery: {
        // Numbering
        deliveryNotePrefix: {
            type: String,
            default: 'DN'
        },
        deliveryNoteSequence: {
            type: Number,
            default: 1
        },

        // Delivery options
        defaultDeliveryMethod: {
            type: String,
            enum: ['standard', 'express', 'same_day', 'pickup', 'scheduled'],
            default: 'standard'
        },
        enablePartialDelivery: {
            type: Boolean,
            default: true
        },
        requireDeliverySignature: {
            type: Boolean,
            default: true
        },
        requireProofOfDelivery: {
            type: Boolean,
            default: true
        },
        allowPhotoProof: {
            type: Boolean,
            default: true
        },

        // Shipping
        defaultCarrierId: {
            type: Schema.Types.ObjectId,
            ref: 'Carrier'
        },
        calculateShippingAutomatically: {
            type: Boolean,
            default: false
        },
        freeShippingThreshold: {
            type: Number,
            default: 0 // 0 = disabled
        },
        defaultShippingCharge: {
            type: Number,
            default: 0
        },

        // Tracking
        enableShipmentTracking: {
            type: Boolean,
            default: true
        },
        sendTrackingToCustomer: {
            type: Boolean,
            default: true
        },

        // Delivery attempts
        maxDeliveryAttempts: {
            type: Number,
            default: 3
        },
        daysBetweenAttempts: {
            type: Number,
            default: 1
        },

        // Time windows
        enableDeliveryWindows: {
            type: Boolean,
            default: false
        },
        deliveryWindows: [{
            name: String,
            startTime: String, // "09:00"
            endTime: String,   // "13:00"
            additionalCharge: Number
        }]
    },

    // ===================
    // RETURN/RMA SETTINGS
    // ===================
    returns: {
        // Numbering
        rmaPrefix: {
            type: String,
            default: 'RMA'
        },
        rmaSequence: {
            type: Number,
            default: 1
        },

        // Return policy
        enableReturns: {
            type: Boolean,
            default: true
        },
        returnWindowDays: {
            type: Number,
            default: 30
        },
        requireReturnReason: {
            type: Boolean,
            default: true
        },
        allowReturnWithoutReceipt: {
            type: Boolean,
            default: false
        },

        // Return reasons
        returnReasons: [{
            code: String,
            name: String,
            requiresInspection: Boolean,
            autoApprove: Boolean,
            restockingFeePercent: Number
        }],

        // Approval
        requireApproval: {
            type: Boolean,
            default: true
        },
        autoApproveBelow: {
            type: Number,
            default: 0
        },

        // Inspection
        requireInspection: {
            type: Boolean,
            default: true
        },
        inspectionSLA: {
            type: Number,
            default: 3 // days
        },

        // Refund
        defaultResolution: {
            type: String,
            enum: ['refund', 'replacement', 'credit_note', 'repair'],
            default: 'refund'
        },
        refundMethod: {
            type: String,
            enum: ['original_payment', 'store_credit', 'bank_transfer'],
            default: 'original_payment'
        },
        processingTimeDays: {
            type: Number,
            default: 7
        },

        // Restocking
        chargeRestockingFee: {
            type: Boolean,
            default: false
        },
        defaultRestockingFeePercent: {
            type: Number,
            default: 15
        },

        // Return shipping
        whoPayeReturnShipping: {
            type: String,
            enum: ['customer', 'company', 'depends_on_reason'],
            default: 'depends_on_reason'
        },
        provideReturnLabel: {
            type: Boolean,
            default: true
        }
    },

    // ===================
    // COMMISSION SETTINGS
    // ===================
    commission: {
        // Enable/disable
        enableCommissions: {
            type: Boolean,
            default: true
        },

        // Calculation basis
        commissionBasis: {
            type: String,
            enum: ['revenue', 'profit', 'margin', 'collected'],
            default: 'revenue'
        },
        calculateOn: {
            type: String,
            enum: ['order_confirmed', 'order_delivered', 'order_invoiced', 'payment_received'],
            default: 'payment_received'
        },

        // Default rates
        defaultCommissionRate: {
            type: Number,
            default: 5
        },
        defaultPlanId: {
            type: Schema.Types.ObjectId,
            ref: 'CommissionPlan'
        },

        // Settlement
        settlementPeriod: {
            type: String,
            enum: ['weekly', 'biweekly', 'monthly', 'quarterly'],
            default: 'monthly'
        },
        settlementDayOfMonth: {
            type: Number,
            default: 1
        },
        paymentDelay: {
            type: Number,
            default: 0 // days after settlement period ends
        },

        // Holdback
        enableHoldback: {
            type: Boolean,
            default: false
        },
        holdbackPercentage: {
            type: Number,
            default: 20
        },
        holdbackReleaseDays: {
            type: Number,
            default: 90
        },

        // Clawback
        enableClawback: {
            type: Boolean,
            default: true
        },
        clawbackWindowDays: {
            type: Number,
            default: 90
        },
        clawbackEvents: {
            type: [String],
            default: ['refund', 'chargeback', 'cancellation']
        },

        // Team
        enableTeamSplit: {
            type: Boolean,
            default: true
        },
        enableManagerOverride: {
            type: Boolean,
            default: true
        },
        defaultManagerOverridePercent: {
            type: Number,
            default: 5
        },

        // Approval
        requireSettlementApproval: {
            type: Boolean,
            default: true
        },
        approvalThreshold: {
            type: Number,
            default: 0
        },

        // Caps
        enableCommissionCap: {
            type: Boolean,
            default: false
        },
        monthlyCapAmount: {
            type: Number,
            default: 0
        },
        yearlyCapAmount: {
            type: Number,
            default: 0
        }
    },

    // ===================
    // NOTIFICATION SETTINGS
    // ===================
    notifications: {
        // Email notifications
        emailEnabled: {
            type: Boolean,
            default: true
        },

        // Quote notifications
        sendQuoteCreated: {
            type: Boolean,
            default: true
        },
        sendQuoteExpiring: {
            type: Boolean,
            default: true
        },
        sendQuoteAccepted: {
            type: Boolean,
            default: true
        },

        // Order notifications
        sendOrderConfirmation: {
            type: Boolean,
            default: true
        },
        sendOrderShipped: {
            type: Boolean,
            default: true
        },
        sendOrderDelivered: {
            type: Boolean,
            default: true
        },

        // Internal alerts
        alertOnLargeOrder: {
            type: Boolean,
            default: true
        },
        largeOrderThreshold: {
            type: Number,
            default: 50000
        },
        alertOnLowMargin: {
            type: Boolean,
            default: true
        },
        lowMarginThreshold: {
            type: Number,
            default: 10
        },

        // Commission notifications
        sendCommissionStatement: {
            type: Boolean,
            default: true
        },
        sendCommissionPaid: {
            type: Boolean,
            default: true
        },

        // Reminder settings
        paymentReminderDays: {
            type: [Number],
            default: [7, 3, 1]
        },
        overdueReminderDays: {
            type: [Number],
            default: [1, 7, 14, 30]
        }
    },

    // ===================
    // DOCUMENT SETTINGS
    // ===================
    documents: {
        // Company info on documents
        companyName: String,
        companyLogo: String,
        companyAddress: String,
        companyPhone: String,
        companyEmail: String,
        companyWebsite: String,
        companyVatNumber: String,
        companyCommercialRegister: String,

        // Document templates
        quoteTemplateId: {
            type: Schema.Types.ObjectId,
            ref: 'DocumentTemplate'
        },
        orderTemplateId: {
            type: Schema.Types.ObjectId,
            ref: 'DocumentTemplate'
        },
        deliveryNoteTemplateId: {
            type: Schema.Types.ObjectId,
            ref: 'DocumentTemplate'
        },
        invoiceTemplateId: {
            type: Schema.Types.ObjectId,
            ref: 'DocumentTemplate'
        },

        // PDF settings
        pdfPaperSize: {
            type: String,
            enum: ['A4', 'Letter', 'Legal'],
            default: 'A4'
        },
        pdfOrientation: {
            type: String,
            enum: ['portrait', 'landscape'],
            default: 'portrait'
        },
        showLogo: {
            type: Boolean,
            default: true
        },
        showWatermark: {
            type: Boolean,
            default: false
        },
        watermarkText: String,

        // Footer
        defaultFooterText: String,
        showBankDetails: {
            type: Boolean,
            default: true
        },
        bankDetails: String
    },

    // ===================
    // INTEGRATION SETTINGS
    // ===================
    integrations: {
        // Accounting
        accountingIntegration: {
            enabled: {
                type: Boolean,
                default: false
            },
            system: {
                type: String,
                enum: ['quickbooks', 'xero', 'sage', 'zoho', 'custom', null],
                default: null
            },
            autoSyncInvoices: Boolean,
            autoSyncPayments: Boolean,
            defaultRevenueAccount: String,
            defaultReceivableAccount: String
        },

        // Inventory
        inventoryIntegration: {
            enabled: {
                type: Boolean,
                default: false
            },
            checkStockOnOrder: Boolean,
            reserveStockOnOrder: Boolean,
            autoDeductOnDelivery: Boolean
        },

        // Shipping
        shippingIntegration: {
            enabled: {
                type: Boolean,
                default: false
            },
            carriers: [{
                carrierId: {
                    type: Schema.Types.ObjectId,
                    ref: 'Carrier'
                },
                carrierName: String,
                apiKey: String,
                accountNumber: String,
                isDefault: Boolean
            }]
        },

        // Payment
        paymentIntegration: {
            enabled: {
                type: Boolean,
                default: false
            },
            gateways: [{
                gateway: String,
                enabled: Boolean,
                isDefault: Boolean
            }]
        },

        // E-commerce
        ecommerceIntegration: {
            enabled: {
                type: Boolean,
                default: false
            },
            platform: String,
            syncOrders: Boolean,
            syncProducts: Boolean,
            syncInventory: Boolean
        }
    },

    // ===================
    // WORKFLOW SETTINGS
    // ===================
    workflow: {
        // Quote to order
        autoConvertAcceptedQuotes: {
            type: Boolean,
            default: false
        },

        // Order workflow
        orderWorkflowSteps: {
            type: [String],
            default: ['draft', 'pending_approval', 'confirmed', 'processing', 'shipped', 'delivered', 'completed']
        },
        skipApprovalForSmallOrders: {
            type: Boolean,
            default: true
        },
        smallOrderThreshold: {
            type: Number,
            default: 5000
        },

        // Auto-actions
        autoConfirmPaidOrders: {
            type: Boolean,
            default: false
        },
        autoCompleteDeliveredOrders: {
            type: Boolean,
            default: true
        },
        autoCloseAfterDays: {
            type: Number,
            default: 7
        },

        // Escalation
        enableEscalation: {
            type: Boolean,
            default: true
        },
        escalationRules: [{
            condition: String,
            escalateAfterHours: Number,
            escalateTo: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            notificationTemplate: String
        }]
    },

    // ===================
    // REGIONAL SETTINGS
    // ===================
    regional: {
        // Locale
        defaultLanguage: {
            type: String,
            default: 'ar'
        },
        supportedLanguages: {
            type: [String],
            default: ['ar', 'en']
        },

        // Date/Time
        dateFormat: {
            type: String,
            default: 'DD/MM/YYYY'
        },
        timeFormat: {
            type: String,
            enum: ['12h', '24h'],
            default: '24h'
        },
        timezone: {
            type: String,
            default: 'Asia/Riyadh'
        },

        // Numbers
        numberFormat: {
            type: String,
            default: '1,234.56'
        },
        decimalPlaces: {
            type: Number,
            default: 2
        },
        thousandsSeparator: {
            type: String,
            default: ','
        },
        decimalSeparator: {
            type: String,
            default: '.'
        },

        // Units
        weightUnit: {
            type: String,
            enum: ['kg', 'lb'],
            default: 'kg'
        },
        dimensionUnit: {
            type: String,
            enum: ['cm', 'in', 'm'],
            default: 'cm'
        },

        // Fiscal
        fiscalYearStart: {
            type: Number,
            default: 1 // January
        }
    },

    // ===================
    // ADVANCED SETTINGS
    // ===================
    advanced: {
        // Performance
        enableCaching: {
            type: Boolean,
            default: true
        },
        cacheTTL: {
            type: Number,
            default: 3600 // seconds
        },

        // Audit
        enableAuditLog: {
            type: Boolean,
            default: true
        },
        auditRetentionDays: {
            type: Number,
            default: 365
        },

        // API
        enablePublicAPI: {
            type: Boolean,
            default: false
        },
        apiRateLimit: {
            type: Number,
            default: 1000
        },

        // Data
        enableDataExport: {
            type: Boolean,
            default: true
        },
        exportFormats: {
            type: [String],
            default: ['csv', 'xlsx', 'pdf']
        },

        // Customization
        customFields: [{
            entity: {
                type: String,
                enum: ['quote', 'order', 'delivery', 'return']
            },
            fieldName: String,
            fieldType: {
                type: String,
                enum: ['text', 'number', 'date', 'select', 'multiselect', 'checkbox']
            },
            label: String,
            options: [String],
            required: Boolean,
            showInList: Boolean,
            showInPDF: Boolean
        }]
    },

    // Tracking
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    lastReviewedAt: Date,
    lastReviewedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
SalesSettingsSchema.index({ firmId: 1 }, { unique: true });
SalesSettingsSchema.index({ lawyerId: 1 });

// Instance Methods
SalesSettingsSchema.methods.getNextQuoteNumber = async function() {
    const year = new Date().getFullYear();
    const prefix = this.quotation.numberPrefix || 'QT';
    const padding = this.quotation.numberPadding || 6;
    const seq = this.quotation.numberSequence;

    let number = prefix;
    if (this.quotation.includeYearInNumber) {
        number += `-${year}`;
    }
    number += `-${String(seq).padStart(padding, '0')}`;
    if (this.quotation.numberSuffix) {
        number += this.quotation.numberSuffix;
    }

    this.quotation.numberSequence = seq + 1;
    await this.save();

    return number;
};

SalesSettingsSchema.methods.getNextOrderNumber = async function() {
    const year = new Date().getFullYear();
    const prefix = this.salesOrder.numberPrefix || 'SO';
    const padding = this.salesOrder.numberPadding || 6;
    const seq = this.salesOrder.numberSequence;

    let number = prefix;
    if (this.salesOrder.includeYearInNumber) {
        number += `-${year}`;
    }
    number += `-${String(seq).padStart(padding, '0')}`;
    if (this.salesOrder.numberSuffix) {
        number += this.salesOrder.numberSuffix;
    }

    this.salesOrder.numberSequence = seq + 1;
    await this.save();

    return number;
};

SalesSettingsSchema.methods.getNextDeliveryNoteNumber = async function() {
    const prefix = this.delivery.deliveryNotePrefix || 'DN';
    const seq = this.delivery.deliveryNoteSequence;
    const year = new Date().getFullYear();

    const number = `${prefix}-${year}-${String(seq).padStart(6, '0')}`;

    this.delivery.deliveryNoteSequence = seq + 1;
    await this.save();

    return number;
};

SalesSettingsSchema.methods.getNextRMANumber = async function() {
    const prefix = this.returns.rmaPrefix || 'RMA';
    const seq = this.returns.rmaSequence;
    const year = new Date().getFullYear();

    const number = `${prefix}-${year}-${String(seq).padStart(6, '0')}`;

    this.returns.rmaSequence = seq + 1;
    await this.save();

    return number;
};

SalesSettingsSchema.methods.resetYearlySequences = async function() {
    if (this.quotation.resetSequenceYearly) {
        this.quotation.numberSequence = 1;
    }
    if (this.salesOrder.resetSequenceYearly) {
        this.salesOrder.numberSequence = 1;
    }
    this.delivery.deliveryNoteSequence = 1;
    this.returns.rmaSequence = 1;

    await this.save();
};

SalesSettingsSchema.methods.getApprovalRequired = function(type, amount, discountPercent) {
    let settings;
    switch (type) {
        case 'quote':
            settings = this.quotation;
            break;
        case 'order':
            settings = this.salesOrder;
            break;
        default:
            return { required: false };
    }

    // Check amount threshold
    if (settings.requireApprovalAbove && amount >= settings.requireApprovalAbove) {
        const level = settings.approvalLevels?.find(l => amount >= l.threshold);
        return {
            required: true,
            reason: 'amount_threshold',
            approverRole: level?.approverRole || 'manager',
            customApprover: level?.customApprover
        };
    }

    // Check discount threshold (for quotes)
    if (type === 'quote' && discountPercent > this.quotation.maxDiscountPercentWithoutApproval) {
        return {
            required: true,
            reason: 'discount_threshold',
            approverRole: 'manager'
        };
    }

    return { required: false };
};

SalesSettingsSchema.methods.validatePricing = function(unitPrice, costPrice, discountPercent) {
    const issues = [];

    // Check minimum margin
    if (this.pricing.enforceMinimumPrice && costPrice > 0) {
        const margin = ((unitPrice - costPrice) / unitPrice) * 100;
        if (margin < this.pricing.minimumMarginPercent) {
            issues.push({
                type: 'low_margin',
                message: `Margin ${margin.toFixed(2)}% is below minimum ${this.pricing.minimumMarginPercent}%`
            });
        }
    }

    // Check below cost
    if (this.pricing.belowCostWarning && unitPrice < costPrice) {
        issues.push({
            type: 'below_cost',
            message: 'Price is below cost',
            requiresApproval: this.pricing.belowCostApprovalRequired
        });
    }

    // Check discount limits
    if (discountPercent > this.pricing.maxLineDiscountPercent) {
        issues.push({
            type: 'discount_exceeded',
            message: `Discount ${discountPercent}% exceeds maximum ${this.pricing.maxLineDiscountPercent}%`
        });
    }

    return {
        valid: issues.length === 0,
        issues
    };
};

// Static Methods
SalesSettingsSchema.statics.getOrCreate = async function(firmId, userId) {
    let settings = await this.findOne({ firmId });

    if (!settings) {
        settings = await this.create({
            firmId,
            createdBy: userId
        });
    }

    return settings;
};

SalesSettingsSchema.statics.findByFirm = function(firmId) {
    return this.findOne({ firmId });
};

const SalesSettings = mongoose.model('SalesSettings', SalesSettingsSchema);

module.exports = SalesSettings;
