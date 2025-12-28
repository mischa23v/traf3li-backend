/**
 * ZATCA E-Invoice Plugin
 *
 * Saudi Arabia's mandatory e-invoicing system (Fatoorah).
 * Phase 2 compliance with clearance and reporting requirements.
 *
 * Invoice Types:
 * ┌───────┬─────────────────────────────┐
 * │ Code  │ Type                        │
 * ├───────┼─────────────────────────────┤
 * │ 388   │ Tax Invoice                 │
 * │ 386   │ Prepayment Invoice          │
 * │ 383   │ Debit Note                  │
 * │ 381   │ Credit Note                 │
 * └───────┴─────────────────────────────┘
 *
 * Invoice Subtypes:
 * ┌─────────┬────────────────────────────┐
 * │ Code    │ Description                │
 * ├─────────┼────────────────────────────┤
 * │ 0100000 │ B2B (requires clearance)   │
 * │ 0200000 │ B2C (reporting only)       │
 * └─────────┴────────────────────────────┘
 *
 * Usage:
 * ```javascript
 * const zatcaPlugin = require('./plugins/zatcaEInvoice.plugin');
 * invoiceSchema.plugin(zatcaPlugin);
 * ```
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════
// ZATCA CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ZATCA_CONFIG = {
    // API Endpoints
    endpoints: {
        production: {
            clearance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single',
            reporting: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/reporting/single',
            compliance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/compliance'
        },
        sandbox: {
            clearance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/clearance/single',
            reporting: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single',
            compliance: 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/compliance'
        }
    },

    // Invoice Types
    invoiceTypes: {
        TAX_INVOICE: '388',
        PREPAYMENT: '386',
        DEBIT_NOTE: '383',
        CREDIT_NOTE: '381'
    },

    // Invoice Subtypes
    invoiceSubtypes: {
        B2B: '0100000',  // Business to Business (clearance required)
        B2C: '0200000'   // Business to Consumer (reporting only)
    },

    // Saudi VAT Rate
    vatRate: 0.15,

    // TLV Tags for QR Code
    tlvTags: {
        SELLER_NAME: 1,
        VAT_NUMBER: 2,
        TIMESTAMP: 3,
        INVOICE_TOTAL: 4,
        VAT_TOTAL: 5,
        HASH: 6,
        SIGNATURE: 7,
        PUBLIC_KEY: 8
    },

    // Required Fields
    requiredSellerFields: [
        'name', 'vatNumber', 'crNumber',
        'street', 'buildingNumber', 'city', 'postalCode', 'country'
    ],

    requiredBuyerFields: {
        B2B: ['name', 'vatNumber', 'street', 'city', 'country'],
        B2C: ['name'] // Minimal for B2C
    }
};

// ═══════════════════════════════════════════════════════════════
// ZATCA SCHEMA EXTENSION
// ═══════════════════════════════════════════════════════════════

const zatcaAddressSchema = new mongoose.Schema({
    street: { type: String, trim: true },
    buildingNumber: { type: String, trim: true },
    secondaryNumber: { type: String, trim: true },
    district: { type: String, trim: true },
    city: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    province: { type: String, trim: true },
    country: { type: String, default: 'SA', maxlength: 2 }
}, { _id: false });

const zatcaDetailsSchema = new mongoose.Schema({
    // Invoice Classification
    invoiceType: {
        type: String,
        enum: Object.values(ZATCA_CONFIG.invoiceTypes),
        default: ZATCA_CONFIG.invoiceTypes.TAX_INVOICE
    },
    invoiceSubtype: {
        type: String,
        enum: Object.values(ZATCA_CONFIG.invoiceSubtypes),
        default: ZATCA_CONFIG.invoiceSubtypes.B2B
    },

    // Invoice Identifiers
    invoiceUUID: {
        type: String,
        trim: true
    },
    invoiceCounterValue: {
        type: Number,
        min: 1
    },

    // Hash Chain
    invoiceHash: {
        type: String,
        trim: true
    },
    previousInvoiceHash: {
        type: String,
        trim: true,
        default: '0' // Genesis hash
    },

    // QR Code & Signature
    qrCode: {
        type: String // Base64 encoded
    },
    cryptographicStamp: {
        type: String
    },
    digitalSignature: {
        type: String
    },

    // XML Invoice
    xmlInvoice: {
        type: String // UBL 2.1 XML
    },

    // Seller Information
    seller: {
        name: { type: String, trim: true },
        nameAr: { type: String, trim: true },
        vatNumber: {
            type: String,
            trim: true,
            validate: {
                validator: function(v) {
                    return !v || /^3\d{13}3$/.test(v);
                },
                message: 'VAT number must be 15 digits starting and ending with 3'
            }
        },
        crNumber: { type: String, trim: true },
        address: zatcaAddressSchema
    },

    // Buyer Information
    buyer: {
        name: { type: String, trim: true },
        nameAr: { type: String, trim: true },
        vatNumber: { type: String, trim: true },
        crNumber: { type: String, trim: true },
        nationalId: { type: String, trim: true },
        address: zatcaAddressSchema
    },

    // Submission Status
    status: {
        type: String,
        enum: ['draft', 'pending', 'submitted', 'cleared', 'reported', 'rejected', 'warning'],
        default: 'draft',
        index: true
    },

    // ZATCA Response
    clearanceStatus: {
        type: String,
        enum: ['NOT_SUBMITTED', 'PENDING', 'CLEARED', 'REPORTED', 'REJECTED', 'WARNING'],
        default: 'NOT_SUBMITTED'
    },
    submissionDate: Date,
    clearanceDate: Date,
    zatcaResponse: {
        requestId: String,
        invoiceHash: String,
        validationResults: [{
            type: { type: String },
            status: String,
            code: String,
            message: String,
            category: String
        }],
        warnings: [String],
        errors: [String]
    },

    // Rejection/Error handling
    rejectionReason: String,
    rejectionCode: String,
    retryCount: { type: Number, default: 0 },
    lastRetryAt: Date,

    // Audit
    generatedAt: Date,
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Encode value to TLV format
 */
function encodeTLV(tag, value) {
    const valueBuffer = Buffer.from(value, 'utf8');
    const tagBuffer = Buffer.from([tag]);
    const lengthBuffer = Buffer.from([valueBuffer.length]);
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

/**
 * Generate QR code data in TLV format
 */
function generateQRData(params) {
    const {
        sellerName,
        vatNumber,
        timestamp,
        totalWithVat,
        vatAmount,
        invoiceHash
    } = params;

    const tlvData = Buffer.concat([
        encodeTLV(ZATCA_CONFIG.tlvTags.SELLER_NAME, sellerName),
        encodeTLV(ZATCA_CONFIG.tlvTags.VAT_NUMBER, vatNumber),
        encodeTLV(ZATCA_CONFIG.tlvTags.TIMESTAMP, timestamp),
        encodeTLV(ZATCA_CONFIG.tlvTags.INVOICE_TOTAL, totalWithVat.toFixed(2)),
        encodeTLV(ZATCA_CONFIG.tlvTags.VAT_TOTAL, vatAmount.toFixed(2))
    ]);

    // Add hash if available
    if (invoiceHash) {
        const hashTlv = encodeTLV(ZATCA_CONFIG.tlvTags.HASH, invoiceHash);
        return Buffer.concat([tlvData, hashTlv]).toString('base64');
    }

    return tlvData.toString('base64');
}

/**
 * Generate invoice hash
 */
function generateInvoiceHash(invoiceData, previousHash = '0') {
    const hashInput = JSON.stringify({
        invoiceNumber: invoiceData.invoiceNumber,
        issueDate: invoiceData.issueDate,
        sellerVat: invoiceData.sellerVat,
        buyerVat: invoiceData.buyerVat,
        total: invoiceData.total,
        vatAmount: invoiceData.vatAmount,
        previousHash
    });

    return crypto
        .createHash('sha256')
        .update(hashInput)
        .digest('base64');
}

/**
 * Format date for ZATCA (ISO 8601)
 */
function formatZATCADate(date) {
    return new Date(date).toISOString();
}

// ═══════════════════════════════════════════════════════════════
// PLUGIN FUNCTION
// ═══════════════════════════════════════════════════════════════

function zatcaEInvoicePlugin(schema, options = {}) {
    const {
        fieldName = 'zatca',
        autoGenerateUUID = true,
        autoGenerateHash = true,
        autoGenerateQR = true
    } = options;

    // Add ZATCA schema to the parent schema
    schema.add({
        [fieldName]: {
            type: zatcaDetailsSchema,
            default: () => ({})
        }
    });

    // ═══════════════════════════════════════════════════════════════
    // INSTANCE METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Initialize ZATCA data
     * @param {Object} params - Initialization parameters
     */
    schema.methods.initializeZATCA = function(params = {}) {
        const {
            invoiceType = ZATCA_CONFIG.invoiceTypes.TAX_INVOICE,
            invoiceSubtype = ZATCA_CONFIG.invoiceSubtypes.B2B,
            seller = {},
            buyer = {},
            userId = null
        } = params;

        this[fieldName] = {
            ...this[fieldName],
            invoiceType,
            invoiceSubtype,
            invoiceUUID: autoGenerateUUID ? uuidv4() : this[fieldName]?.invoiceUUID,
            seller,
            buyer,
            status: 'draft',
            generatedAt: new Date(),
            generatedBy: userId
        };

        return this[fieldName];
    };

    /**
     * Generate invoice hash
     * @param {string} previousHash - Previous invoice hash in chain
     */
    schema.methods.generateZATCAHash = function(previousHash = '0') {
        const invoiceData = {
            invoiceNumber: this.invoiceNumber,
            issueDate: this.issueDate || this.createdAt,
            sellerVat: this[fieldName]?.seller?.vatNumber,
            buyerVat: this[fieldName]?.buyer?.vatNumber,
            total: this.totalAmount || this.total,
            vatAmount: this.vatAmount || this.taxAmount || 0,
            previousHash
        };

        const hash = generateInvoiceHash(invoiceData, previousHash);

        this[fieldName].invoiceHash = hash;
        this[fieldName].previousInvoiceHash = previousHash;

        return hash;
    };

    /**
     * Generate QR code data
     */
    schema.methods.generateZATCAQRCode = function() {
        const zatca = this[fieldName];
        if (!zatca?.seller?.vatNumber) {
            throw new Error('Seller VAT number is required for QR code generation');
        }

        const qrData = generateQRData({
            sellerName: zatca.seller.name || zatca.seller.nameAr,
            vatNumber: zatca.seller.vatNumber,
            timestamp: formatZATCADate(this.issueDate || this.createdAt),
            totalWithVat: this.totalAmount || this.total || 0,
            vatAmount: this.vatAmount || this.taxAmount || 0,
            invoiceHash: zatca.invoiceHash
        });

        this[fieldName].qrCode = qrData;
        return qrData;
    };

    /**
     * Generate UBL 2.1 XML invoice
     */
    schema.methods.generateZATCAXML = function() {
        const zatca = this[fieldName];
        const items = this.items || this.lineItems || [];

        // Build UBL XML
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${this.invoiceNumber}</cbc:ID>
    <cbc:UUID>${zatca.invoiceUUID || uuidv4()}</cbc:UUID>
    <cbc:IssueDate>${formatZATCADate(this.issueDate || this.createdAt).split('T')[0]}</cbc:IssueDate>
    <cbc:IssueTime>${formatZATCADate(this.issueDate || this.createdAt).split('T')[1]}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${zatca.invoiceSubtype}">${zatca.invoiceType}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>

    <!-- Seller -->
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${zatca.seller?.crNumber || ''}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PostalAddress>
                <cbc:StreetName>${zatca.seller?.address?.street || ''}</cbc:StreetName>
                <cbc:BuildingNumber>${zatca.seller?.address?.buildingNumber || ''}</cbc:BuildingNumber>
                <cbc:CityName>${zatca.seller?.address?.city || ''}</cbc:CityName>
                <cbc:PostalZone>${zatca.seller?.address?.postalCode || ''}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>${zatca.seller?.address?.country || 'SA'}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${zatca.seller?.vatNumber || ''}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${zatca.seller?.name || ''}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <!-- Buyer -->
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="${zatca.buyer?.vatNumber ? 'VAT' : 'NAT'}">${zatca.buyer?.vatNumber || zatca.buyer?.nationalId || ''}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PostalAddress>
                <cbc:StreetName>${zatca.buyer?.address?.street || ''}</cbc:StreetName>
                <cbc:CityName>${zatca.buyer?.address?.city || ''}</cbc:CityName>
                <cac:Country>
                    <cbc:IdentificationCode>${zatca.buyer?.address?.country || 'SA'}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${zatca.buyer?.name || ''}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>

    <!-- Tax Total -->
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="SAR">${(this.vatAmount || this.taxAmount || 0).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="SAR">${(this.subtotal || this.amount || 0).toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="SAR">${(this.vatAmount || this.taxAmount || 0).toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <!-- Legal Monetary Total -->
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="SAR">${(this.subtotal || this.amount || 0).toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="SAR">${(this.subtotal || this.amount || 0).toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="SAR">${(this.totalAmount || this.total || 0).toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="SAR">${(this.totalAmount || this.total || 0).toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>

    <!-- Invoice Lines -->
    ${items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${item.quantity || 1}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="SAR">${(item.amount || item.total || 0).toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="SAR">${(item.taxAmount || (item.amount * 0.15) || 0).toFixed(2)}</cbc:TaxAmount>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${item.description || item.name || 'Service'}</cbc:Name>
            <cac:ClassifiedTaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>15.00</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:ClassifiedTaxCategory>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="SAR">${(item.rate || item.unitPrice || item.amount || 0).toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join('')}
</Invoice>`;

        this[fieldName].xmlInvoice = xml;
        return xml;
    };

    /**
     * Validate invoice for ZATCA compliance
     * @returns {Object} Validation result
     */
    schema.methods.validateForZATCA = function() {
        const errors = [];
        const warnings = [];
        const zatca = this[fieldName];

        // Check invoice UUID
        if (!zatca?.invoiceUUID) {
            errors.push('Invoice UUID is required');
        }

        // Check seller information
        if (!zatca?.seller?.vatNumber) {
            errors.push('Seller VAT number is required');
        } else if (!/^3\d{13}3$/.test(zatca.seller.vatNumber)) {
            errors.push('Seller VAT number format invalid (must be 15 digits starting/ending with 3)');
        }

        if (!zatca?.seller?.name) {
            errors.push('Seller name is required');
        }

        if (!zatca?.seller?.address?.city) {
            errors.push('Seller city is required');
        }

        if (!zatca?.seller?.address?.street) {
            warnings.push('Seller street address recommended');
        }

        // Check buyer information for B2B
        if (zatca?.invoiceSubtype === ZATCA_CONFIG.invoiceSubtypes.B2B) {
            if (!zatca?.buyer?.vatNumber) {
                errors.push('Buyer VAT number required for B2B invoices');
            } else if (!/^3\d{13}3$/.test(zatca.buyer.vatNumber)) {
                errors.push('Buyer VAT number format invalid');
            }

            if (!zatca?.buyer?.name) {
                errors.push('Buyer name required for B2B invoices');
            }
        }

        // Check amounts
        const total = this.totalAmount || this.total || 0;
        const vat = this.vatAmount || this.taxAmount || 0;

        if (total <= 0) {
            errors.push('Invoice total must be greater than 0');
        }

        if (vat < 0) {
            errors.push('VAT amount cannot be negative');
        }

        // Verify VAT calculation
        const subtotal = this.subtotal || this.amount || (total - vat);
        const expectedVat = subtotal * ZATCA_CONFIG.vatRate;
        if (Math.abs(vat - expectedVat) > 0.01 && vat > 0) {
            warnings.push(`VAT amount (${vat}) differs from expected (${expectedVat.toFixed(2)})`);
        }

        // Check line items
        const items = this.items || this.lineItems || [];
        if (items.length === 0) {
            errors.push('At least one line item is required');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            canSubmit: errors.length === 0
        };
    };

    /**
     * Prepare invoice for ZATCA submission
     */
    schema.methods.prepareForZATCA = async function(options = {}) {
        const { previousHash = '0', userId = null } = options;

        // Generate UUID if not exists
        if (!this[fieldName]?.invoiceUUID) {
            this[fieldName].invoiceUUID = uuidv4();
        }

        // Generate hash
        if (autoGenerateHash) {
            this.generateZATCAHash(previousHash);
        }

        // Generate QR code
        if (autoGenerateQR) {
            this.generateZATCAQRCode();
        }

        // Generate XML
        this.generateZATCAXML();

        // Update status
        this[fieldName].status = 'pending';
        this[fieldName].generatedAt = new Date();
        this[fieldName].generatedBy = userId;

        return {
            uuid: this[fieldName].invoiceUUID,
            hash: this[fieldName].invoiceHash,
            qrCode: this[fieldName].qrCode,
            xml: this[fieldName].xmlInvoice
        };
    };

    /**
     * Record ZATCA submission result
     * @param {Object} response - ZATCA API response
     */
    schema.methods.recordZATCAResponse = function(response) {
        const { success, cleared, warnings, errors, requestId, invoiceHash } = response;

        this[fieldName].zatcaResponse = {
            requestId,
            invoiceHash,
            validationResults: response.validationResults || [],
            warnings: warnings || [],
            errors: errors || []
        };

        this[fieldName].submissionDate = new Date();

        if (success) {
            if (cleared) {
                this[fieldName].status = 'cleared';
                this[fieldName].clearanceStatus = 'CLEARED';
                this[fieldName].clearanceDate = new Date();
            } else {
                this[fieldName].status = 'reported';
                this[fieldName].clearanceStatus = 'REPORTED';
            }
        } else if (warnings?.length > 0 && !errors?.length) {
            this[fieldName].status = 'warning';
            this[fieldName].clearanceStatus = 'WARNING';
        } else {
            this[fieldName].status = 'rejected';
            this[fieldName].clearanceStatus = 'REJECTED';
            this[fieldName].rejectionReason = errors?.[0] || 'Unknown error';
            this[fieldName].retryCount = (this[fieldName].retryCount || 0) + 1;
            this[fieldName].lastRetryAt = new Date();
        }

        return this[fieldName];
    };

    /**
     * Get ZATCA compliance status
     */
    schema.methods.getZATCAStatus = function() {
        const zatca = this[fieldName];

        return {
            invoiceNumber: this.invoiceNumber,
            uuid: zatca?.invoiceUUID,
            type: zatca?.invoiceType,
            subtype: zatca?.invoiceSubtype,
            status: zatca?.status,
            clearanceStatus: zatca?.clearanceStatus,
            submissionDate: zatca?.submissionDate,
            clearanceDate: zatca?.clearanceDate,
            hasQRCode: !!zatca?.qrCode,
            hasHash: !!zatca?.invoiceHash,
            hasXML: !!zatca?.xmlInvoice,
            warnings: zatca?.zatcaResponse?.warnings || [],
            errors: zatca?.zatcaResponse?.errors || [],
            retryCount: zatca?.retryCount || 0,
            requiresClearance: zatca?.invoiceSubtype === ZATCA_CONFIG.invoiceSubtypes.B2B
        };
    };

    // ═══════════════════════════════════════════════════════════════
    // STATIC METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get ZATCA configuration
     */
    schema.statics.getZATCAConfig = function() {
        return { ...ZATCA_CONFIG };
    };

    /**
     * Get pending invoices for submission
     */
    schema.statics.getPendingZATCASubmissions = async function(firmId, limit = 50) {
        return this.find({
            firmId: new mongoose.Types.ObjectId(firmId),
            [`${fieldName}.status`]: { $in: ['draft', 'pending'] },
            status: { $ne: 'void' }
        })
            .sort({ createdAt: 1 })
            .limit(limit);
    };

    /**
     * Get failed submissions for retry
     */
    schema.statics.getFailedZATCASubmissions = async function(firmId, maxRetries = 3) {
        return this.find({
            firmId: new mongoose.Types.ObjectId(firmId),
            [`${fieldName}.status`]: 'rejected',
            [`${fieldName}.retryCount`]: { $lt: maxRetries }
        })
            .sort({ [`${fieldName}.lastRetryAt`]: 1 });
    };

    /**
     * Get ZATCA submission statistics
     */
    schema.statics.getZATCAStatistics = async function(firmId, startDate, endDate) {
        const match = {
            firmId: new mongoose.Types.ObjectId(firmId)
        };

        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = new Date(startDate);
            if (endDate) match.createdAt.$lte = new Date(endDate);
        }

        const stats = await this.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    draft: {
                        $sum: { $cond: [{ $eq: [`$${fieldName}.status`, 'draft'] }, 1, 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $eq: [`$${fieldName}.status`, 'pending'] }, 1, 0] }
                    },
                    cleared: {
                        $sum: { $cond: [{ $eq: [`$${fieldName}.status`, 'cleared'] }, 1, 0] }
                    },
                    reported: {
                        $sum: { $cond: [{ $eq: [`$${fieldName}.status`, 'reported'] }, 1, 0] }
                    },
                    rejected: {
                        $sum: { $cond: [{ $eq: [`$${fieldName}.status`, 'rejected'] }, 1, 0] }
                    },
                    warning: {
                        $sum: { $cond: [{ $eq: [`$${fieldName}.status`, 'warning'] }, 1, 0] }
                    },
                    b2bCount: {
                        $sum: { $cond: [{ $eq: [`$${fieldName}.invoiceSubtype`, ZATCA_CONFIG.invoiceSubtypes.B2B] }, 1, 0] }
                    },
                    b2cCount: {
                        $sum: { $cond: [{ $eq: [`$${fieldName}.invoiceSubtype`, ZATCA_CONFIG.invoiceSubtypes.B2C] }, 1, 0] }
                    }
                }
            }
        ]);

        const result = stats[0] || {};

        return {
            ...result,
            successRate: result.total > 0
                ? (((result.cleared || 0) + (result.reported || 0)) / result.total * 100).toFixed(1) + '%'
                : '0%',
            complianceRate: result.total > 0
                ? ((result.total - (result.draft || 0) - (result.rejected || 0)) / result.total * 100).toFixed(1) + '%'
                : '0%'
        };
    };

    /**
     * Get last invoice hash for chain
     */
    schema.statics.getLastInvoiceHash = async function(firmId) {
        const lastInvoice = await this.findOne({
            firmId: new mongoose.Types.ObjectId(firmId),
            [`${fieldName}.invoiceHash`]: { $exists: true, $ne: null }
        })
            .sort({ createdAt: -1 })
            .select(`${fieldName}.invoiceHash`);

        return lastInvoice?.[fieldName]?.invoiceHash || '0';
    };

    // ═══════════════════════════════════════════════════════════════
    // INDEXES
    // ═══════════════════════════════════════════════════════════════

    schema.index({ [`${fieldName}.status`]: 1 });
    schema.index({ [`${fieldName}.invoiceUUID`]: 1 });
    schema.index({ [`${fieldName}.clearanceStatus`]: 1 });
    schema.index({ [`${fieldName}.submissionDate`]: -1 });
    schema.index({ [`${fieldName}.seller.vatNumber`]: 1 });
}

// Export plugin and configuration
module.exports = zatcaEInvoicePlugin;
module.exports.ZATCA_CONFIG = ZATCA_CONFIG;
module.exports.zatcaDetailsSchema = zatcaDetailsSchema;
module.exports.generateQRData = generateQRData;
module.exports.generateInvoiceHash = generateInvoiceHash;
