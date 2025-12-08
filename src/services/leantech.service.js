/**
 * Lean Technologies Open Banking Service
 * Saudi Arabia Open Banking API Integration
 *
 * Documentation: https://docs.leantech.me
 *
 * This service handles:
 * - Bank account linking via LinkSDK
 * - Transaction data retrieval
 * - Account balance fetching
 * - Payment initiation
 * - Identity verification
 */

const axios = require('axios');

class LeanTechService {
    constructor() {
        this.baseUrl = process.env.LEAN_API_URL || 'https://api.leantech.me';
        this.sandboxUrl = process.env.LEAN_SANDBOX_URL || 'https://sandbox.leantech.me';
        this.authUrl = process.env.LEAN_AUTH_URL || 'https://auth.leantech.me';
        this.appToken = process.env.LEAN_APP_TOKEN;
        this.clientId = process.env.LEAN_CLIENT_ID;
        this.clientSecret = process.env.LEAN_CLIENT_SECRET;
        this.isSandbox = process.env.LEAN_SANDBOX === 'true';
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * Get the API base URL based on environment
     */
    getApiUrl() {
        return this.isSandbox ? this.sandboxUrl : this.baseUrl;
    }

    /**
     * Generate OAuth2 access token
     * Must be done on backend - never expose client_secret to frontend
     */
    async getAccessToken() {
        // Return cached token if still valid
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await axios.post(
                `${this.authUrl}/oauth2/token`,
                new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'client_credentials',
                    scope: 'api'
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Token typically expires in 1 hour, refresh 5 minutes early
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

            return this.accessToken;
        } catch (error) {
            console.error('Lean OAuth token error:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Lean API');
        }
    }

    /**
     * Get headers for API requests
     */
    async getHeaders() {
        const token = await this.getAccessToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'lean-app-token': this.appToken
        };
    }

    /**
     * Create a new customer in Lean
     * @param {string} appUserId - Your internal user ID
     * @returns {Object} Customer object with customer_id
     */
    async createCustomer(appUserId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(
                `${this.getApiUrl()}/customers/v1`,
                { app_user_id: appUserId },
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Create customer error:', error.response?.data || error.message);
            throw new Error('Failed to create Lean customer');
        }
    }

    /**
     * Get customer by ID
     */
    async getCustomer(customerId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/customers/v1/${customerId}`,
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Get customer error:', error.response?.data || error.message);
            throw new Error('Failed to get Lean customer');
        }
    }

    /**
     * Get list of supported banks
     * @returns {Array} List of bank identifiers
     */
    async getBanks() {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/banks/v1/`,
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Get banks error:', error.response?.data || error.message);
            throw new Error('Failed to get supported banks');
        }
    }

    /**
     * Get customer-scoped auth token for LinkSDK
     * This token is used to initialize the frontend LinkSDK
     * @param {string} customerId - Lean customer ID
     */
    async getCustomerToken(customerId) {
        try {
            const response = await axios.post(
                `${this.authUrl}/oauth2/token`,
                new URLSearchParams({
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    grant_type: 'client_credentials',
                    scope: `customer:${customerId}`
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            return {
                access_token: response.data.access_token,
                expires_in: response.data.expires_in
            };
        } catch (error) {
            console.error('Get customer token error:', error.response?.data || error.message);
            throw new Error('Failed to get customer token for LinkSDK');
        }
    }

    /**
     * Get all entities (connected bank accounts) for a customer
     */
    async getEntities(customerId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/customers/v1/${customerId}/entities`,
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Get entities error:', error.response?.data || error.message);
            throw new Error('Failed to get connected entities');
        }
    }

    /**
     * Get accounts for an entity
     * @param {string} entityId - Connected bank entity ID
     * @param {boolean} verbose - Include regional data format
     */
    async getAccounts(entityId, verbose = true) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/data/v2/accounts`,
                {
                    headers,
                    params: {
                        entity_id: entityId,
                        verbose: verbose
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Get accounts error:', error.response?.data || error.message);
            throw new Error('Failed to get bank accounts');
        }
    }

    /**
     * Get account balance
     * @param {string} accountId - Bank account ID from getAccounts
     */
    async getBalance(accountId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/data/v2/balance`,
                {
                    headers,
                    params: { account_id: accountId }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Get balance error:', error.response?.data || error.message);
            throw new Error('Failed to get account balance');
        }
    }

    /**
     * Get transactions for an account
     * @param {string} accountId - Bank account ID
     * @param {Object} options - Pagination and filter options
     */
    async getTransactions(accountId, options = {}) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/data/v2/transactions`,
                {
                    headers,
                    params: {
                        account_id: accountId,
                        page: options.page || 1,
                        page_size: options.pageSize || 50,
                        from_date: options.fromDate,
                        to_date: options.toDate
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Get transactions error:', error.response?.data || error.message);
            throw new Error('Failed to get transactions');
        }
    }

    /**
     * Get identity information for an entity
     */
    async getIdentity(entityId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/data/v2/identity`,
                {
                    headers,
                    params: { entity_id: entityId }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Get identity error:', error.response?.data || error.message);
            throw new Error('Failed to get identity information');
        }
    }

    /**
     * Create a payment source for payment initiation
     */
    async createPaymentSource(customerId, entityId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(
                `${this.getApiUrl()}/payments/v1/sources`,
                {
                    customer_id: customerId,
                    entity_id: entityId
                },
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Create payment source error:', error.response?.data || error.message);
            throw new Error('Failed to create payment source');
        }
    }

    /**
     * Get payment destinations (beneficiaries)
     */
    async getPaymentDestinations(customerId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/payments/v1/destinations`,
                {
                    headers,
                    params: { customer_id: customerId }
                }
            );
            return response.data;
        } catch (error) {
            console.error('Get destinations error:', error.response?.data || error.message);
            throw new Error('Failed to get payment destinations');
        }
    }

    /**
     * Create a payment destination (beneficiary)
     */
    async createPaymentDestination(customerId, destinationData) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(
                `${this.getApiUrl()}/payments/v1/destinations`,
                {
                    customer_id: customerId,
                    ...destinationData
                },
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Create destination error:', error.response?.data || error.message);
            throw new Error('Failed to create payment destination');
        }
    }

    /**
     * Initiate a payment
     * @param {Object} paymentData - Payment details
     */
    async initiatePayment(paymentData) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(
                `${this.getApiUrl()}/payments/v1/intents`,
                {
                    amount: paymentData.amount,
                    currency: paymentData.currency || 'SAR',
                    payment_source_id: paymentData.paymentSourceId,
                    payment_destination_id: paymentData.paymentDestinationId,
                    description: paymentData.description
                },
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Initiate payment error:', error.response?.data || error.message);
            throw new Error('Failed to initiate payment');
        }
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(paymentIntentId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(
                `${this.getApiUrl()}/payments/v1/intents/${paymentIntentId}`,
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Get payment status error:', error.response?.data || error.message);
            throw new Error('Failed to get payment status');
        }
    }

    /**
     * Disconnect an entity (revoke bank connection)
     */
    async disconnectEntity(entityId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.delete(
                `${this.getApiUrl()}/entities/v1/${entityId}`,
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Disconnect entity error:', error.response?.data || error.message);
            throw new Error('Failed to disconnect bank account');
        }
    }

    /**
     * Refresh entity data
     */
    async refreshEntity(entityId) {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(
                `${this.getApiUrl()}/entities/v1/${entityId}/refresh`,
                {},
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Refresh entity error:', error.response?.data || error.message);
            throw new Error('Failed to refresh entity data');
        }
    }

    /**
     * Verify webhook signature
     * @param {string} payload - Raw webhook payload
     * @param {string} signature - X-Lean-Signature header value
     */
    verifyWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const webhookSecret = process.env.LEAN_WEBHOOK_SECRET;

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }
}

module.exports = new LeanTechService();
