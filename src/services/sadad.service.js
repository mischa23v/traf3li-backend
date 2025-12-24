/**
 * SADAD Payment System Service
 * Saudi Arabia National Bill Payment System
 *
 * SADAD is the national EBPP (Electronic Bill Presentment and Payment) system
 * operated under Saudi Central Bank (SAMA)
 *
 * This service provides:
 * - Bill inquiry
 * - Bill payment
 * - Payment status tracking
 * - Biller list management
 *
 * Note: Direct SADAD integration requires biller registration with SAMA.
 * This implementation uses bank APIs that provide SADAD services.
 *
 * References:
 * - https://www.sadad.com/
 * - https://developer.anb.com.sa/apis/api/Sadad-Services/doc
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { wrapExternalCall } = require('../utils/externalServiceWrapper');

// Common SADAD biller categories
const BILLER_CATEGORIES = {
    GOVERNMENT: 'government',
    UTILITIES: 'utilities',
    TELECOM: 'telecom',
    EDUCATION: 'education',
    INSURANCE: 'insurance',
    REAL_ESTATE: 'real_estate',
    HEALTH: 'health',
    OTHER: 'other',
};

// Common Saudi billers with their SADAD codes
const COMMON_BILLERS = {
    // Government
    '001': { name: 'Ministry of Interior', nameAr: 'وزارة الداخلية', category: BILLER_CATEGORIES.GOVERNMENT },
    '002': { name: 'Traffic Violations', nameAr: 'المخالفات المرورية', category: BILLER_CATEGORIES.GOVERNMENT },
    '003': { name: 'Passport Fees', nameAr: 'رسوم الجوازات', category: BILLER_CATEGORIES.GOVERNMENT },
    '007': { name: 'GOSI', nameAr: 'التأمينات الاجتماعية', category: BILLER_CATEGORIES.GOVERNMENT },
    '021': { name: 'Zakat & Tax', nameAr: 'الزكاة والدخل', category: BILLER_CATEGORIES.GOVERNMENT },

    // Utilities
    '010': { name: 'Saudi Electricity Company', nameAr: 'شركة الكهرباء', category: BILLER_CATEGORIES.UTILITIES },
    '050': { name: 'National Water Company', nameAr: 'شركة المياه الوطنية', category: BILLER_CATEGORIES.UTILITIES },

    // Telecom
    '028': { name: 'STC', nameAr: 'الاتصالات السعودية', category: BILLER_CATEGORIES.TELECOM },
    '029': { name: 'Mobily', nameAr: 'موبايلي', category: BILLER_CATEGORIES.TELECOM },
    '030': { name: 'Zain', nameAr: 'زين', category: BILLER_CATEGORIES.TELECOM },
};

class SADADService {
    constructor() {
        // Bank API configuration (example: ANB)
        this.bankApiUrl = process.env.SADAD_BANK_API_URL;
        this.apiKey = process.env.SADAD_API_KEY;
        this.clientId = process.env.SADAD_CLIENT_ID;
        this.clientSecret = process.env.SADAD_CLIENT_SECRET;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get OAuth access token from bank API
     */
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await wrapExternalCall('sadad', async () => {
                return await axios.post(
                    `${this.bankApiUrl}/oauth2/token`,
                    new URLSearchParams({
                        grant_type: 'client_credentials',
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        scope: 'sadad'
                    }),
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    }
                );
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;

            return this.accessToken;
        } catch (error) {
            logger.error('SADAD auth error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with SADAD service');
        }
    }

    /**
     * Get API headers
     */
    async getHeaders() {
        const token = await this.getAccessToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-API-Key': this.apiKey,
        };
    }

    /**
     * Get list of available billers
     * @param {string} category - Optional category filter
     */
    async getBillers(category = null) {
        try {
            const headers = await this.getHeaders();
            const params = category ? { category } : {};

            const response = await wrapExternalCall('sadad', async () => {
                return await axios.get(
                    `${this.bankApiUrl}/sadad/v1/billers`,
                    { headers, params }
                );
            });

            return response.data;
        } catch (error) {
            // Return common billers as fallback
            logger.warn('Using fallback biller list:', error.message);
            let billers = Object.entries(COMMON_BILLERS).map(([code, biller]) => ({
                billerCode: code,
                ...biller
            }));

            if (category) {
                billers = billers.filter(b => b.category === category);
            }

            return { billers };
        }
    }

    /**
     * Inquire about a bill
     * @param {string} billerCode - SADAD biller code
     * @param {string} billNumber - Bill/account number with the biller
     */
    async inquireBill(billerCode, billNumber) {
        try {
            const headers = await this.getHeaders();

            const response = await wrapExternalCall('sadad', async () => {
                return await axios.post(
                    `${this.bankApiUrl}/sadad/v1/bills/inquiry`,
                    {
                        billerCode: billerCode,
                        billNumber: billNumber,
                    },
                    { headers }
                );
            });

            return {
                success: true,
                bill: {
                    billerCode: response.data.billerCode,
                    billerName: response.data.billerName,
                    billNumber: response.data.billNumber,
                    billAmount: response.data.billAmount,
                    dueDate: response.data.dueDate,
                    billStatus: response.data.billStatus,
                    minimumAmount: response.data.minimumAmount,
                    maximumAmount: response.data.maximumAmount,
                    allowPartialPayment: response.data.allowPartialPayment,
                    billDetails: response.data.billDetails,
                    expiryDate: response.data.expiryDate,
                }
            };
        } catch (error) {
            logger.error('Bill inquiry error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to inquire bill',
                errorCode: error.response?.data?.errorCode,
            };
        }
    }

    /**
     * Pay a bill via SADAD
     * @param {Object} paymentData - Payment details
     */
    async payBill(paymentData) {
        try {
            const headers = await this.getHeaders();

            // Validate payment data
            const validation = this.validatePaymentData(paymentData);
            if (!validation.valid) {
                return { success: false, errors: validation.errors };
            }

            const response = await wrapExternalCall('sadad', async () => {
                return await axios.post(
                    `${this.bankApiUrl}/sadad/v1/bills/payment`,
                    {
                        billerCode: paymentData.billerCode,
                        billNumber: paymentData.billNumber,
                        amount: paymentData.amount,
                        debitAccount: paymentData.debitAccount, // IBAN
                        paymentReference: paymentData.reference || `PAY${Date.now()}`,
                        remarks: paymentData.remarks,
                    },
                    { headers }
                );
            });

            return {
                success: true,
                payment: {
                    transactionId: response.data.transactionId,
                    sadadNumber: response.data.sadadNumber,
                    billerCode: response.data.billerCode,
                    billNumber: response.data.billNumber,
                    amount: response.data.amount,
                    status: response.data.status,
                    paymentDate: response.data.paymentDate,
                    reference: response.data.reference,
                }
            };
        } catch (error) {
            logger.error('Bill payment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to process payment',
                errorCode: error.response?.data?.errorCode,
            };
        }
    }

    /**
     * Get payment status
     * @param {string} transactionId - Payment transaction ID
     */
    async getPaymentStatus(transactionId) {
        try {
            const headers = await this.getHeaders();

            const response = await wrapExternalCall('sadad', async () => {
                return await axios.get(
                    `${this.bankApiUrl}/sadad/v1/payments/${transactionId}/status`,
                    { headers }
                );
            });

            return {
                success: true,
                status: response.data.status,
                transactionId: response.data.transactionId,
                sadadNumber: response.data.sadadNumber,
                completedAt: response.data.completedAt,
            };
        } catch (error) {
            logger.error('Payment status error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to get payment status',
            };
        }
    }

    /**
     * Get payment history
     * @param {Object} options - Filter options
     */
    async getPaymentHistory(options = {}) {
        try {
            const headers = await this.getHeaders();

            const response = await wrapExternalCall('sadad', async () => {
                return await axios.get(
                    `${this.bankApiUrl}/sadad/v1/payments/history`,
                    {
                        headers,
                        params: {
                            fromDate: options.fromDate,
                            toDate: options.toDate,
                            billerCode: options.billerCode,
                            status: options.status,
                            page: options.page || 1,
                            pageSize: options.pageSize || 20,
                        }
                    }
                );
            });

            return {
                success: true,
                payments: response.data.payments,
                pagination: response.data.pagination,
            };
        } catch (error) {
            logger.error('Payment history error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to get payment history',
            };
        }
    }

    /**
     * Generate SADAD invoice/bill number for your business
     * (If registered as a biller with SADAD)
     * @param {Object} invoiceData - Invoice details
     */
    generateSadadInvoice(invoiceData) {
        // SADAD invoice number format varies by biller
        // This is a generic implementation
        const timestamp = Date.now().toString().slice(-10);
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();

        return {
            sadadNumber: `${invoiceData.billerCode}${timestamp}${random}`,
            amount: invoiceData.amount,
            dueDate: invoiceData.dueDate,
            expiryDate: invoiceData.expiryDate || this.addDays(invoiceData.dueDate, 30),
            customerReference: invoiceData.customerReference,
            description: invoiceData.description,
        };
    }

    /**
     * Validate payment data before processing
     */
    validatePaymentData(paymentData) {
        const errors = [];

        if (!paymentData.billerCode) {
            errors.push('Biller code is required');
        }

        if (!paymentData.billNumber) {
            errors.push('Bill number is required');
        }

        if (!paymentData.amount || paymentData.amount <= 0) {
            errors.push('Valid payment amount is required');
        }

        if (!paymentData.debitAccount) {
            errors.push('Debit account (IBAN) is required');
        }

        if (paymentData.debitAccount && !paymentData.debitAccount.startsWith('SA')) {
            errors.push('Debit account must be a valid Saudi IBAN');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Search billers by name or category
     */
    async searchBillers(query) {
        const allBillers = await this.getBillers();

        if (!query) return allBillers;

        const searchLower = query.toLowerCase();
        const filtered = allBillers.billers.filter(biller =>
            biller.name.toLowerCase().includes(searchLower) ||
            biller.nameAr?.includes(query) ||
            biller.category.toLowerCase().includes(searchLower) ||
            biller.billerCode.includes(query)
        );

        return { billers: filtered };
    }

    /**
     * Get billers by category
     */
    async getBillersByCategory(category) {
        return this.getBillers(category);
    }

    // Helper methods
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
}

module.exports = {
    SADADService: new SADADService(),
    BILLER_CATEGORIES,
    COMMON_BILLERS,
};
