/**
 * ZATCA (Zakat, Tax and Customs Authority) E-Invoice Service
 *
 * This service handles Saudi Arabia's electronic invoicing requirements including:
 * - QR Code generation (TLV format per ZATCA specifications)
 * - Invoice hash generation for chain integrity
 * - UBL 2.1 XML invoice generation
 * - ZATCA API integration for clearance/reporting
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const logger = require('../utils/logger');
const { wrapExternalCall } = require('../utils/externalServiceWrapper');

const ZATCA_API_URL = process.env.ZATCA_API_URL || 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';

/**
 * Generate QR Code data per ZATCA TLV (Tag-Length-Value) format
 * Tags:
 * 1 - Seller Name
 * 2 - VAT Registration Number
 * 3 - Timestamp (ISO 8601)
 * 4 - Invoice Total (with VAT)
 * 5 - VAT Amount
 * 6 - Invoice Hash (optional for Phase 2)
 * 7 - ECDSA Signature (optional for Phase 2)
 * 8 - Public Key (optional for Phase 2)
 *
 * @param {Object} invoice - Invoice document
 * @param {String} sellerName - Seller/firm name
 * @returns {String} Base64 encoded QR code data
 */
const generateQRCode = async (invoice, sellerName = '') => {
    const tlvData = [
        { tag: 1, value: sellerName || invoice.zatca?.sellerVATNumber || '' },
        { tag: 2, value: invoice.zatca?.sellerVATNumber || '' },
        { tag: 3, value: invoice.issueDate.toISOString() },
        { tag: 4, value: invoice.totalAmount.toFixed(2) },
        { tag: 5, value: invoice.vatAmount.toFixed(2) }
    ];

    // Add invoice hash for Phase 2 compliance if available
    if (invoice.zatca?.invoiceHash) {
        tlvData.push({ tag: 6, value: invoice.zatca.invoiceHash });
    }

    let tlvBuffer = Buffer.alloc(0);

    for (const item of tlvData) {
        const valueBuffer = Buffer.from(String(item.value), 'utf8');
        const tagBuffer = Buffer.from([item.tag]);
        const lengthBuffer = Buffer.from([valueBuffer.length]);
        tlvBuffer = Buffer.concat([tlvBuffer, tagBuffer, lengthBuffer, valueBuffer]);
    }

    return tlvBuffer.toString('base64');
};

/**
 * Generate invoice hash for chain integrity
 * Creates SHA-256 hash of invoice data combined with previous invoice hash
 *
 * @param {Object} invoice - Invoice document
 * @param {String} previousHash - Hash of the previous invoice (empty for first invoice)
 * @returns {String} Hex-encoded SHA-256 hash
 */
const generateInvoiceHash = (invoice, previousHash = '') => {
    const dataToHash = [
        invoice.invoiceNumber,
        invoice.issueDate.toISOString(),
        invoice.totalAmount.toString(),
        invoice.vatAmount.toString(),
        invoice.zatca?.sellerVATNumber || '',
        invoice.zatca?.buyerVATNumber || '',
        previousHash
    ].join('|');

    return crypto.createHash('sha256').update(dataToHash).digest('hex');
};

/**
 * Generate UUID for invoice (per ZATCA requirements)
 * @returns {String} UUID v4
 */
const generateUUID = () => {
    return uuidv4();
};

/**
 * Generate UBL 2.1 XML Invoice for ZATCA submission
 *
 * @param {Object} invoice - Invoice document (populated)
 * @param {String} uuid - Invoice UUID
 * @param {String} hash - Invoice hash
 * @returns {String} UBL 2.1 compliant XML string
 */
const generateUBLXML = (invoice, uuid, hash) => {
    const issueDate = invoice.issueDate.toISOString().split('T')[0];
    const issueTime = invoice.issueDate.toISOString().split('T')[1].split('.')[0];

    // Generate line items XML
    const lineItemsXML = invoice.items
        .filter(item => item.type !== 'comment' && item.type !== 'subtotal')
        .map((item, index) => {
            const vatPercent = invoice.vatRate || 15;
            const lineVat = item.taxable !== false ? (item.lineTotal * (vatPercent / 100)).toFixed(2) : '0.00';

            return `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${invoice.currency}">${item.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="${invoice.currency}">${lineVat}</cbc:TaxAmount>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Name>${escapeXml(item.description)}</cbc:Name>
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${invoice.currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
        }).join('');

    // Determine invoice type name
    const invoiceTypeNames = {
        '388': 'Tax Invoice',
        '386': 'Prepayment Invoice',
        '383': 'Debit Note',
        '381': 'Credit Note'
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">

    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
    <cbc:ID>${invoice.invoiceNumber}</cbc:ID>
    <cbc:UUID>${uuid}</cbc:UUID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
    <cbc:IssueTime>${issueTime}</cbc:IssueTime>
    <cbc:InvoiceTypeCode name="${invoice.zatca?.invoiceSubtype || '0200000'}">${invoice.zatca?.invoiceType || '388'}</cbc:InvoiceTypeCode>
    <cbc:Note>${escapeXml(invoice.customerNotes || '')}</cbc:Note>
    <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
    <cbc:TaxCurrencyCode>${invoice.currency}</cbc:TaxCurrencyCode>

    <cac:AdditionalDocumentReference>
        <cbc:ID>ICV</cbc:ID>
        <cbc:UUID>${invoice.invoiceNumber.split('-').pop()}</cbc:UUID>
    </cac:AdditionalDocumentReference>

    <cac:AdditionalDocumentReference>
        <cbc:ID>PIH</cbc:ID>
        <cac:Attachment>
            <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${hash}</cbc:EmbeddedDocumentBinaryObject>
        </cac:Attachment>
    </cac:AdditionalDocumentReference>

    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${invoice.zatca?.sellerCR || ''}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyIdentification>
                <cbc:ID schemeID="VAT">${invoice.zatca?.sellerVATNumber || ''}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(invoice.zatca?.sellerAddress?.street || '')}</cbc:StreetName>
                <cbc:BuildingNumber>${invoice.zatca?.sellerAddress?.buildingNumber || ''}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${escapeXml(invoice.zatca?.sellerAddress?.province || '')}</cbc:CitySubdivisionName>
                <cbc:CityName>${escapeXml(invoice.zatca?.sellerAddress?.city || '')}</cbc:CityName>
                <cbc:PostalZone>${invoice.zatca?.sellerAddress?.postalCode || ''}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>${invoice.zatca?.sellerAddress?.country || 'SA'}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${invoice.zatca?.sellerVATNumber || ''}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName>${escapeXml(invoice.zatca?.sellerVATNumber || '')}</cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>

    <cac:AccountingCustomerParty>
        <cac:Party>
            ${invoice.zatca?.invoiceSubtype === '0100000' ? `
            <cac:PartyIdentification>
                <cbc:ID schemeID="VAT">${invoice.zatca?.buyerVATNumber || ''}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyIdentification>
                <cbc:ID schemeID="CRN">${invoice.zatca?.buyerCR || ''}</cbc:ID>
            </cac:PartyIdentification>` : ''}
            <cac:PostalAddress>
                <cbc:StreetName>${escapeXml(invoice.zatca?.buyerAddress?.street || '')}</cbc:StreetName>
                <cbc:BuildingNumber>${invoice.zatca?.buyerAddress?.buildingNumber || ''}</cbc:BuildingNumber>
                <cbc:CitySubdivisionName>${escapeXml(invoice.zatca?.buyerAddress?.province || '')}</cbc:CitySubdivisionName>
                <cbc:CityName>${escapeXml(invoice.zatca?.buyerAddress?.city || '')}</cbc:CityName>
                <cbc:PostalZone>${invoice.zatca?.buyerAddress?.postalCode || ''}</cbc:PostalZone>
                <cac:Country>
                    <cbc:IdentificationCode>${invoice.zatca?.buyerAddress?.country || 'SA'}</cbc:IdentificationCode>
                </cac:Country>
            </cac:PostalAddress>
            ${invoice.zatca?.invoiceSubtype === '0100000' ? `
            <cac:PartyTaxScheme>
                <cbc:CompanyID>${invoice.zatca?.buyerVATNumber || ''}</cbc:CompanyID>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:PartyTaxScheme>` : ''}
        </cac:Party>
    </cac:AccountingCustomerParty>

    <cac:Delivery>
        <cbc:ActualDeliveryDate>${issueDate}</cbc:ActualDeliveryDate>
    </cac:Delivery>

    <cac:PaymentMeans>
        <cbc:PaymentMeansCode>10</cbc:PaymentMeansCode>
    </cac:PaymentMeans>

    ${invoice.discountAmount > 0 ? `
    <cac:AllowanceCharge>
        <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
        <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
        <cbc:Amount currencyID="${invoice.currency}">${invoice.discountAmount.toFixed(2)}</cbc:Amount>
    </cac:AllowanceCharge>` : ''}

    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${invoice.currency}">${invoice.taxableAmount.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.vatAmount.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cbc:ID>S</cbc:ID>
                <cbc:Percent>${invoice.vatRate}</cbc:Percent>
                <cac:TaxScheme>
                    <cbc:ID>VAT</cbc:ID>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>

    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.taxableAmount.toFixed(2)}</cbc:TaxExclusiveAmount>
        <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.totalAmount.toFixed(2)}</cbc:TaxInclusiveAmount>
        ${invoice.discountAmount > 0 ? `
        <cbc:AllowanceTotalAmount currencyID="${invoice.currency}">${invoice.discountAmount.toFixed(2)}</cbc:AllowanceTotalAmount>` : ''}
        <cbc:PrepaidAmount currencyID="${invoice.currency}">${(invoice.depositAmount + invoice.applyFromRetainer).toFixed(2)}</cbc:PrepaidAmount>
        <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.balanceDue.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    ${lineItemsXML}
</Invoice>`;
};

/**
 * Escape special XML characters
 * @param {String} str - String to escape
 * @returns {String} Escaped string
 */
const escapeXml = (str) => {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
};

/**
 * Submit invoice to ZATCA for clearance (B2B) or reporting (B2C)
 *
 * @param {Object} invoice - Invoice document (populated)
 * @returns {Object} ZATCA response including status, stamps, etc.
 */
const submitToZATCA = async (invoice) => {
    try {
        // Generate required fields
        const invoiceUUID = generateUUID();

        // Get previous invoice hash for chain integrity
        const Invoice = require('../models/invoice.model');
        const previousInvoice = await Invoice.findOne({
            lawyerId: invoice.lawyerId,
            'zatca.status': { $in: ['cleared', 'reported'] }
        }).sort({ createdAt: -1 });

        const previousHash = previousInvoice?.zatca?.invoiceHash || '';
        const invoiceHash = generateInvoiceHash(invoice, previousHash);
        const qrCode = await generateQRCode(invoice);

        // Generate UBL 2.1 XML
        const xmlInvoice = generateUBLXML(invoice, invoiceUUID, invoiceHash);

        // Determine endpoint based on invoice subtype
        // 0100000 = B2B (requires clearance)
        // 0200000 = B2C (requires reporting only)
        const isB2B = invoice.zatca?.invoiceSubtype === '0100000';
        const endpoint = isB2B ? 'invoices/clearance/single' : 'invoices/reporting/single';

        // Prepare request
        const requestBody = {
            invoiceHash,
            uuid: invoiceUUID,
            invoice: Buffer.from(xmlInvoice).toString('base64')
        };

        // Check if ZATCA API token is configured
        if (!process.env.ZATCA_API_TOKEN) {
            logger.warn('ZATCA API Token not configured - returning mock success');
            return {
                status: 'cleared',
                cryptographicStamp: 'MOCK_STAMP_' + Date.now(),
                clearanceDate: new Date(),
                invoiceUUID,
                invoiceHash,
                qrCode,
                xmlInvoice
            };
        }

        // Submit to ZATCA API (with circuit breaker protection)
        const response = await wrapExternalCall('zatca', async () => {
            return await axios.post(
                `${ZATCA_API_URL}/${endpoint}`,
                requestBody,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.ZATCA_API_TOKEN}`,
                        'Clearance-Status': isB2B ? '1' : '0'
                    },
                    timeout: 30000 // 30 second timeout
                }
            );
        });

        // Handle success response
        if (response.data.clearanceStatus === 'CLEARED' || response.data.reportingStatus === 'REPORTED') {
            return {
                status: isB2B ? 'cleared' : 'reported',
                cryptographicStamp: response.data.clearedInvoice || response.data.reportedInvoice,
                clearanceDate: new Date(),
                invoiceUUID,
                invoiceHash,
                qrCode,
                xmlInvoice
            };
        } else {
            // Handle rejection
            const errorMessages = response.data.validationResults?.errorMessages || [];
            const warningMessages = response.data.validationResults?.warningMessages || [];

            return {
                status: 'rejected',
                rejectionReason: errorMessages.length > 0
                    ? errorMessages.join('; ')
                    : 'Unknown error from ZATCA',
                warnings: warningMessages,
                invoiceUUID,
                invoiceHash,
                qrCode
            };
        }

    } catch (error) {
        logger.error('ZATCA submission error:', error.response?.data || error.message);

        // Return structured error
        if (error.response) {
            return {
                status: 'rejected',
                rejectionReason: error.response.data?.message ||
                    error.response.data?.error ||
                    `ZATCA API Error: ${error.response.status}`,
                invoiceUUID: null,
                invoiceHash: null
            };
        }

        throw new Error(`خطأ في الإرسال إلى هيئة الزكاة: ${error.message}`);
    }
};

/**
 * Validate invoice for ZATCA compliance before submission
 *
 * @param {Object} invoice - Invoice document
 * @returns {Object} Validation result with errors and warnings
 */
const validateForZATCA = (invoice) => {
    const errors = [];
    const warnings = [];

    // Required seller information
    if (!invoice.zatca?.sellerVATNumber) {
        errors.push('الرقم الضريبي للبائع مطلوب - Seller VAT number is required');
    } else if (!/^[0-9]{15}$/.test(invoice.zatca.sellerVATNumber)) {
        errors.push('الرقم الضريبي للبائع يجب أن يكون 15 رقم - Seller VAT number must be 15 digits');
    }

    // B2B requires buyer VAT number
    if (invoice.zatca?.invoiceSubtype === '0100000') {
        if (!invoice.zatca?.buyerVATNumber) {
            errors.push('الرقم الضريبي للمشتري مطلوب للفواتير B2B - Buyer VAT number is required for B2B invoices');
        } else if (!/^[0-9]{15}$/.test(invoice.zatca.buyerVATNumber)) {
            errors.push('الرقم الضريبي للمشتري يجب أن يكون 15 رقم - Buyer VAT number must be 15 digits');
        }
    }

    // Address validation
    if (!invoice.zatca?.sellerAddress?.city) {
        warnings.push('عنوان البائع غير مكتمل - Seller address is incomplete');
    }

    // Invoice items validation
    if (!invoice.items || invoice.items.length === 0) {
        errors.push('الفاتورة يجب أن تحتوي على عنصر واحد على الأقل - Invoice must have at least one item');
    }

    // Amount validation
    if (invoice.totalAmount <= 0) {
        errors.push('إجمالي الفاتورة يجب أن يكون أكبر من صفر - Invoice total must be greater than zero');
    }

    // VAT validation
    if (invoice.vatRate !== 0 && invoice.vatRate !== 5 && invoice.vatRate !== 15) {
        warnings.push('معدل ضريبة القيمة المضافة غير معتاد - Unusual VAT rate');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Get ZATCA compliance status for an invoice
 *
 * @param {Object} invoice - Invoice document
 * @returns {Object} Compliance status
 */
const getComplianceStatus = (invoice) => {
    const validation = validateForZATCA(invoice);

    return {
        zatcaStatus: invoice.zatca?.status || 'draft',
        isCompliant: validation.isValid,
        hasQRCode: !!invoice.zatca?.qrCode,
        hasHash: !!invoice.zatca?.invoiceHash,
        hasUUID: !!invoice.zatca?.invoiceUUID,
        clearanceDate: invoice.zatca?.clearanceDate,
        errors: validation.errors,
        warnings: validation.warnings
    };
};

module.exports = {
    generateQRCode,
    generateInvoiceHash,
    generateUUID,
    generateUBLXML,
    submitToZATCA,
    validateForZATCA,
    getComplianceStatus
};
