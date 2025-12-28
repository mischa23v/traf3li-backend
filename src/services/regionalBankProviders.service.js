/**
 * Regional Bank Providers Service
 * Expands bank feed coverage with Saudi/GCC banks via Open Banking providers
 *
 * Supported Providers:
 * - Lean Technologies (Saudi Arabia's leading open banking - 20+ banks)
 * - Tarabut Gateway (MENA region - 60+ banks)
 * - Fintech Galaxy (GCC aggregator)
 * - Direct bank APIs (for banks with direct API access)
 */

const mongoose = require('mongoose');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// PROVIDER CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

const PROVIDERS = {
    // Lean Technologies - Saudi Arabia's premier open banking platform
    lean: {
        name: 'Lean Technologies',
        baseUrl: process.env.LEAN_API_URL || 'https://api.leantech.me',
        sandbox: process.env.LEAN_SANDBOX_URL || 'https://sandbox.leantech.me',
        region: 'SAU',
        supportedCountries: ['SA', 'AE', 'BH'],
        banks: [
            { id: 'ALRAJHI_SAU', name: 'Al Rajhi Bank', nameAr: 'مصرف الراجحي', bic: 'RJHISARI' },
            { id: 'SNB_SAU', name: 'Saudi National Bank (SNB)', nameAr: 'البنك الأهلي السعودي', bic: 'NCBKSAJE' },
            { id: 'SAMBA_SAU', name: 'Samba Financial Group', nameAr: 'مجموعة سامبا المالية', bic: 'SAMBSARI' },
            { id: 'RIYAD_SAU', name: 'Riyad Bank', nameAr: 'بنك الرياض', bic: 'RIABORIY' },
            { id: 'SABB_SAU', name: 'SABB (Saudi British Bank)', nameAr: 'ساب', bic: 'SABBSARI' },
            { id: 'BSF_SAU', name: 'Banque Saudi Fransi', nameAr: 'البنك السعودي الفرنسي', bic: 'BSFRSARI' },
            { id: 'ANB_SAU', name: 'Arab National Bank', nameAr: 'البنك العربي الوطني', bic: 'ARNBSARI' },
            { id: 'ALINMA_SAU', name: 'Alinma Bank', nameAr: 'مصرف الإنماء', bic: 'INMASARI' },
            { id: 'ALBILAD_SAU', name: 'Bank AlBilad', nameAr: 'بنك البلاد', bic: 'ALBISARI' },
            { id: 'ALJAZIRA_SAU', name: 'Bank AlJazira', nameAr: 'بنك الجزيرة', bic: 'BJAZSAJE' },
            { id: 'GIB_SAU', name: 'Gulf International Bank', nameAr: 'بنك الخليج الدولي', bic: 'GULFSARI' },
            { id: 'SIB_SAU', name: 'Saudi Investment Bank', nameAr: 'البنك السعودي للاستثمار', bic: 'SIBCSARI' },
            // UAE Banks via Lean
            { id: 'ADCB_UAE', name: 'Abu Dhabi Commercial Bank', bic: 'ADCBAEAA' },
            { id: 'FAB_UAE', name: 'First Abu Dhabi Bank', bic: 'NBABORAR' },
            { id: 'ENBD_UAE', name: 'Emirates NBD', bic: 'EABORAE' },
            { id: 'DIB_UAE', name: 'Dubai Islamic Bank', bic: 'DUABORAE' },
            { id: 'MASHREQ_UAE', name: 'Mashreq Bank', bic: 'BOMLAEAD' },
            { id: 'RAK_UAE', name: 'RAK Bank', bic: 'NABORAKR' },
            // Bahrain Banks via Lean
            { id: 'NBB_BHR', name: 'National Bank of Bahrain', bic: 'NABORABH' },
            { id: 'BBK_BHR', name: 'BBK', bic: 'BBKUBHBM' }
        ],
        features: ['accounts', 'transactions', 'balances', 'identity', 'payments'],
        rateLimit: { requests: 100, window: 60000 } // 100 requests per minute
    },

    // Tarabut Gateway - MENA region's largest open banking platform
    tarabut: {
        name: 'Tarabut Gateway',
        baseUrl: process.env.TARABUT_API_URL || 'https://api.tarabut.com',
        sandbox: process.env.TARABUT_SANDBOX_URL || 'https://sandbox.tarabut.com',
        region: 'MENA',
        supportedCountries: ['SA', 'AE', 'BH', 'OM', 'KW', 'QA', 'EG', 'JO'],
        banks: [
            // Additional Saudi banks
            { id: 'SAIB_SAU', name: 'Saudi Awwal Bank', nameAr: 'البنك السعودي الأول', bic: 'SAABORIY' },
            // Kuwait Banks
            { id: 'NBK_KWT', name: 'National Bank of Kuwait', bic: 'NABORAKW' },
            { id: 'KFH_KWT', name: 'Kuwait Finance House', bic: 'KFHOKOWW' },
            { id: 'BURGAN_KWT', name: 'Burgan Bank', bic: 'BURGKWKW' },
            { id: 'ABK_KWT', name: 'Al Ahli Bank of Kuwait', bic: 'AABORAKW' },
            { id: 'GBK_KWT', name: 'Gulf Bank Kuwait', bic: 'GULFORKO' },
            // Qatar Banks
            { id: 'QNB_QAT', name: 'Qatar National Bank', bic: 'QNBAQAQA' },
            { id: 'QIB_QAT', name: 'Qatar Islamic Bank', bic: 'QISBQAQA' },
            { id: 'CBQ_QAT', name: 'Commercial Bank of Qatar', bic: 'CBQAQAQA' },
            // Oman Banks
            { id: 'BM_OMN', name: 'Bank Muscat', bic: 'BMSIOMRX' },
            { id: 'NBO_OMN', name: 'National Bank of Oman', bic: 'NABOROMR' },
            { id: 'BDO_OMN', name: 'Bank Dhofar', bic: 'BDOFORX' },
            // Egypt Banks
            { id: 'NBE_EGY', name: 'National Bank of Egypt', bic: 'NBEGEGCX' },
            { id: 'CIB_EGY', name: 'Commercial International Bank', bic: 'CIBEEGCX' },
            { id: 'ALEXBANK_EGY', name: 'Bank of Alexandria', bic: 'ALEXEGCX' },
            // Jordan Banks
            { id: 'AJIB_JOR', name: 'Arab Jordan Investment Bank', bic: 'AJIBJOAM' },
            { id: 'BOJ_JOR', name: 'Bank of Jordan', bic: 'BOJOJORA' }
        ],
        features: ['accounts', 'transactions', 'balances', 'identity', 'payments', 'beneficiaries'],
        rateLimit: { requests: 60, window: 60000 }
    },

    // Fintech Galaxy - GCC payment and banking aggregator
    fintechGalaxy: {
        name: 'Fintech Galaxy',
        baseUrl: process.env.FINTECH_GALAXY_API_URL || 'https://api.fintechgalaxy.com',
        sandbox: process.env.FINTECH_GALAXY_SANDBOX_URL || 'https://sandbox.fintechgalaxy.com',
        region: 'GCC',
        supportedCountries: ['SA', 'AE', 'BH', 'KW', 'QA', 'OM'],
        banks: [], // Uses aggregated bank list from primary providers
        features: ['accounts', 'transactions', 'balances'],
        rateLimit: { requests: 50, window: 60000 }
    },

    // SAMA (Saudi Central Bank) Open Banking - direct regulatory API
    samaOpenBanking: {
        name: 'SAMA Open Banking',
        baseUrl: process.env.SAMA_OPEN_BANKING_URL || 'https://openbanking.sama.gov.sa',
        sandbox: process.env.SAMA_SANDBOX_URL || 'https://sandbox.openbanking.sama.gov.sa',
        region: 'SAU',
        supportedCountries: ['SA'],
        banks: [], // All SAMA-regulated banks
        features: ['accounts', 'transactions', 'balances', 'payments'],
        rateLimit: { requests: 30, window: 60000 },
        requiresTPPLicense: true
    }
};

// ═══════════════════════════════════════════════════════════════
// PROVIDER REGISTRY - All supported banks consolidated
// ═══════════════════════════════════════════════════════════════

const BANK_REGISTRY = {
    // Saudi Arabia (SA)
    SA: [
        { bankId: 'ALRAJHI', name: 'Al Rajhi Bank', nameAr: 'مصرف الراجحي', bic: 'RJHISARI', providers: ['lean', 'tarabut'] },
        { bankId: 'SNB', name: 'Saudi National Bank', nameAr: 'البنك الأهلي السعودي', bic: 'NCBKSAJE', providers: ['lean', 'tarabut'] },
        { bankId: 'RIYAD', name: 'Riyad Bank', nameAr: 'بنك الرياض', bic: 'RIABORIY', providers: ['lean', 'tarabut'] },
        { bankId: 'SABB', name: 'SABB', nameAr: 'ساب', bic: 'SABBSARI', providers: ['lean', 'tarabut'] },
        { bankId: 'BSF', name: 'Banque Saudi Fransi', nameAr: 'البنك السعودي الفرنسي', bic: 'BSFRSARI', providers: ['lean', 'tarabut'] },
        { bankId: 'ANB', name: 'Arab National Bank', nameAr: 'البنك العربي الوطني', bic: 'ARNBSARI', providers: ['lean', 'tarabut'] },
        { bankId: 'ALINMA', name: 'Alinma Bank', nameAr: 'مصرف الإنماء', bic: 'INMASARI', providers: ['lean', 'tarabut'] },
        { bankId: 'ALBILAD', name: 'Bank AlBilad', nameAr: 'بنك البلاد', bic: 'ALBISARI', providers: ['lean', 'tarabut'] },
        { bankId: 'ALJAZIRA', name: 'Bank AlJazira', nameAr: 'بنك الجزيرة', bic: 'BJAZSAJE', providers: ['lean', 'tarabut'] },
        { bankId: 'SIB', name: 'Saudi Investment Bank', nameAr: 'البنك السعودي للاستثمار', bic: 'SIBCSARI', providers: ['lean'] },
        { bankId: 'GIB', name: 'Gulf International Bank', nameAr: 'بنك الخليج الدولي', bic: 'GULFSARI', providers: ['lean'] }
    ],
    // UAE
    AE: [
        { bankId: 'FAB', name: 'First Abu Dhabi Bank', bic: 'NBADORAR', providers: ['lean', 'tarabut'] },
        { bankId: 'ENBD', name: 'Emirates NBD', bic: 'EABODAE', providers: ['lean', 'tarabut'] },
        { bankId: 'ADCB', name: 'Abu Dhabi Commercial Bank', bic: 'ADCBAEAA', providers: ['lean', 'tarabut'] },
        { bankId: 'DIB', name: 'Dubai Islamic Bank', bic: 'DUABORAE', providers: ['lean', 'tarabut'] },
        { bankId: 'MASHREQ', name: 'Mashreq Bank', bic: 'BOMLAEAD', providers: ['lean', 'tarabut'] },
        { bankId: 'RAK', name: 'RAK Bank', bic: 'NABORAKR', providers: ['lean'] },
        { bankId: 'CBD', name: 'Commercial Bank of Dubai', bic: 'CBDUAEAD', providers: ['tarabut'] },
        { bankId: 'ADIB', name: 'Abu Dhabi Islamic Bank', bic: 'ABDIAEAD', providers: ['tarabut'] }
    ],
    // Kuwait
    KW: [
        { bankId: 'NBK', name: 'National Bank of Kuwait', bic: 'NABORAKW', providers: ['tarabut'] },
        { bankId: 'KFH', name: 'Kuwait Finance House', bic: 'KFHOKOWW', providers: ['tarabut'] },
        { bankId: 'BURGAN', name: 'Burgan Bank', bic: 'BURGKWKW', providers: ['tarabut'] },
        { bankId: 'ABK', name: 'Al Ahli Bank of Kuwait', bic: 'AABORAKW', providers: ['tarabut'] },
        { bankId: 'GBK', name: 'Gulf Bank Kuwait', bic: 'GULFORKO', providers: ['tarabut'] }
    ],
    // Bahrain
    BH: [
        { bankId: 'NBB', name: 'National Bank of Bahrain', bic: 'NABORABH', providers: ['lean', 'tarabut'] },
        { bankId: 'BBK', name: 'BBK', bic: 'BBKUBHBM', providers: ['lean', 'tarabut'] },
        { bankId: 'BISB', name: 'Bahrain Islamic Bank', bic: 'BISBORBH', providers: ['tarabut'] }
    ],
    // Qatar
    QA: [
        { bankId: 'QNB', name: 'Qatar National Bank', bic: 'QNBAQAQA', providers: ['tarabut'] },
        { bankId: 'QIB', name: 'Qatar Islamic Bank', bic: 'QISBQAQA', providers: ['tarabut'] },
        { bankId: 'CBQ', name: 'Commercial Bank of Qatar', bic: 'CBQAQAQA', providers: ['tarabut'] },
        { bankId: 'DOHA', name: 'Doha Bank', bic: 'DOHBQAQA', providers: ['tarabut'] }
    ],
    // Oman
    OM: [
        { bankId: 'BM', name: 'Bank Muscat', bic: 'BMSIOMRX', providers: ['tarabut'] },
        { bankId: 'NBO', name: 'National Bank of Oman', bic: 'NABOROMR', providers: ['tarabut'] },
        { bankId: 'BDO', name: 'Bank Dhofar', bic: 'BDOFORX', providers: ['tarabut'] }
    ],
    // Egypt
    EG: [
        { bankId: 'NBE', name: 'National Bank of Egypt', bic: 'NBEGEGCX', providers: ['tarabut'] },
        { bankId: 'CIB', name: 'Commercial International Bank', bic: 'CIBEEGCX', providers: ['tarabut'] },
        { bankId: 'ALEXBANK', name: 'Bank of Alexandria', bic: 'ALEXEGCX', providers: ['tarabut'] },
        { bankId: 'AAIB', name: 'Arab African International Bank', bic: 'ARAIEGCX', providers: ['tarabut'] }
    ],
    // Jordan
    JO: [
        { bankId: 'AJIB', name: 'Arab Jordan Investment Bank', bic: 'AJIBJOAM', providers: ['tarabut'] },
        { bankId: 'BOJ', name: 'Bank of Jordan', bic: 'BOJOJORA', providers: ['tarabut'] },
        { bankId: 'AHLI', name: 'Jordan Ahli Bank', bic: 'AHLIJOA' , providers: ['tarabut'] }
    ]
};

// ═══════════════════════════════════════════════════════════════
// SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class RegionalBankProvidersService {
    constructor() {
        this.providers = PROVIDERS;
        this.bankRegistry = BANK_REGISTRY;
        this.httpClients = {};
        this.rateLimiters = {};
    }

    /**
     * Get all supported banks for a country
     * @param {string} countryCode - ISO country code (SA, AE, etc.)
     * @returns {Array} List of supported banks
     */
    getSupportedBanks(countryCode) {
        return this.bankRegistry[countryCode] || [];
    }

    /**
     * Get all supported countries
     * @returns {Array} List of country codes
     */
    getSupportedCountries() {
        return Object.keys(this.bankRegistry);
    }

    /**
     * Get total bank count
     * @returns {number} Total supported banks
     */
    getTotalBankCount() {
        return Object.values(this.bankRegistry).reduce((sum, banks) => sum + banks.length, 0);
    }

    /**
     * Find bank by BIC/SWIFT code
     * @param {string} bic - BIC/SWIFT code
     * @returns {Object|null} Bank details
     */
    findBankByBIC(bic) {
        for (const [country, banks] of Object.entries(this.bankRegistry)) {
            const bank = banks.find(b => b.bic === bic);
            if (bank) return { ...bank, country };
        }
        return null;
    }

    /**
     * Find bank by IBAN prefix
     * @param {string} iban - IBAN
     * @returns {Object|null} Bank details
     */
    findBankByIBAN(iban) {
        if (!iban || iban.length < 4) return null;

        const countryCode = iban.substring(0, 2).toUpperCase();
        const banks = this.bankRegistry[countryCode];

        if (!banks) return null;

        // Saudi IBAN structure: SA + 2 check digits + 2 bank code + 18 account
        if (countryCode === 'SA' && iban.length >= 6) {
            const bankCode = iban.substring(4, 6);
            const saudiBankCodes = {
                '10': 'SNB',
                '20': 'RIYAD',
                '30': 'SABB',
                '40': 'SAIB',
                '45': 'BSF',
                '50': 'ALINMA',
                '55': 'ANB',
                '60': 'ALBILAD',
                '65': 'SIB',
                '75': 'GIB',
                '80': 'ALRAJHI',
                '85': 'ALJAZIRA'
            };
            const bankId = saudiBankCodes[bankCode];
            if (bankId) {
                return banks.find(b => b.bankId === bankId);
            }
        }

        return null;
    }

    /**
     * Get best provider for a bank
     * @param {string} bankId - Bank identifier
     * @param {string} countryCode - Country code
     * @returns {string|null} Provider name
     */
    getBestProviderForBank(bankId, countryCode) {
        const banks = this.bankRegistry[countryCode];
        if (!banks) return null;

        const bank = banks.find(b => b.bankId === bankId);
        if (!bank || !bank.providers.length) return null;

        // Prefer Lean for Saudi banks (best coverage)
        if (bank.providers.includes('lean') && countryCode === 'SA') {
            return 'lean';
        }

        // Otherwise return first available provider
        return bank.providers[0];
    }

    /**
     * Initialize connection to a bank via provider
     * @param {Object} params - Connection parameters
     * @returns {Object} Connection result with link URL
     */
    async initializeBankConnection(params) {
        const { bankId, countryCode, firmId, userId, redirectUrl } = params;

        const provider = this.getBestProviderForBank(bankId, countryCode);
        if (!provider) {
            throw new Error(`No provider available for bank ${bankId} in ${countryCode}`);
        }

        const providerConfig = this.providers[provider];
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? providerConfig.sandbox : providerConfig.baseUrl;

        switch (provider) {
            case 'lean':
                return await this._initLeanConnection({ bankId, countryCode, firmId, userId, redirectUrl, baseUrl });
            case 'tarabut':
                return await this._initTarabutConnection({ bankId, countryCode, firmId, userId, redirectUrl, baseUrl });
            default:
                throw new Error(`Provider ${provider} not yet implemented`);
        }
    }

    /**
     * Initialize Lean Technologies connection
     * @private
     */
    async _initLeanConnection(params) {
        const { bankId, countryCode, firmId, userId, redirectUrl, baseUrl } = params;

        try {
            const response = await axios.post(`${baseUrl}/customers/v1/permissions`, {
                app_token: process.env.LEAN_APP_TOKEN,
                customer_id: `${firmId}_${userId}`,
                permissions: ['accounts', 'transactions', 'balance', 'identity'],
                bank_identifier: `${bankId}_${countryCode}`,
                redirect_url: redirectUrl,
                sandbox: process.env.NODE_ENV !== 'production'
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.LEAN_API_KEY}`,
                    'Content-Type': 'application/json',
                    'lean-app-token': process.env.LEAN_APP_TOKEN
                }
            });

            return {
                provider: 'lean',
                linkUrl: response.data.link_url,
                linkId: response.data.link_id,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
                status: 'pending'
            };
        } catch (error) {
            logger.error('Lean connection initialization failed:', error.response?.data || error.message);
            throw new Error(`Failed to initialize Lean connection: ${error.message}`);
        }
    }

    /**
     * Initialize Tarabut Gateway connection
     * @private
     */
    async _initTarabutConnection(params) {
        const { bankId, countryCode, firmId, userId, redirectUrl, baseUrl } = params;

        try {
            const response = await axios.post(`${baseUrl}/v1/connect/init`, {
                client_id: process.env.TARABUT_CLIENT_ID,
                client_secret: process.env.TARABUT_CLIENT_SECRET,
                user_reference: `${firmId}_${userId}`,
                bank_id: bankId,
                country: countryCode,
                callback_url: redirectUrl,
                scope: ['accounts', 'transactions', 'balances']
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.TARABUT_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                provider: 'tarabut',
                linkUrl: response.data.authorization_url,
                linkId: response.data.session_id,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000),
                status: 'pending'
            };
        } catch (error) {
            logger.error('Tarabut connection initialization failed:', error.response?.data || error.message);
            throw new Error(`Failed to initialize Tarabut connection: ${error.message}`);
        }
    }

    /**
     * Exchange authorization code for access token
     * @param {Object} params - Exchange parameters
     * @returns {Object} Token data
     */
    async exchangeAuthCode(params) {
        const { provider, code, linkId, firmId, userId } = params;

        switch (provider) {
            case 'lean':
                return await this._exchangeLeanCode({ code, linkId, firmId, userId });
            case 'tarabut':
                return await this._exchangeTarabutCode({ code, linkId, firmId, userId });
            default:
                throw new Error(`Provider ${provider} not supported`);
        }
    }

    /**
     * Exchange Lean auth code
     * @private
     */
    async _exchangeLeanCode(params) {
        const { code, linkId } = params;
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? this.providers.lean.sandbox : this.providers.lean.baseUrl;

        try {
            const response = await axios.post(`${baseUrl}/auth/v1/token`, {
                app_token: process.env.LEAN_APP_TOKEN,
                grant_type: 'authorization_code',
                code: code,
                link_id: linkId
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.LEAN_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
                entityId: response.data.entity_id,
                permissions: response.data.permissions
            };
        } catch (error) {
            logger.error('Lean token exchange failed:', error.response?.data || error.message);
            throw new Error(`Failed to exchange Lean auth code: ${error.message}`);
        }
    }

    /**
     * Exchange Tarabut auth code
     * @private
     */
    async _exchangeTarabutCode(params) {
        const { code, linkId } = params;
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? this.providers.tarabut.sandbox : this.providers.tarabut.baseUrl;

        try {
            const response = await axios.post(`${baseUrl}/v1/connect/token`, {
                client_id: process.env.TARABUT_CLIENT_ID,
                client_secret: process.env.TARABUT_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                session_id: linkId
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
                consentId: response.data.consent_id
            };
        } catch (error) {
            logger.error('Tarabut token exchange failed:', error.response?.data || error.message);
            throw new Error(`Failed to exchange Tarabut auth code: ${error.message}`);
        }
    }

    /**
     * Fetch accounts from provider
     * @param {Object} params - Request parameters
     * @returns {Array} List of bank accounts
     */
    async fetchAccounts(params) {
        const { provider, accessToken, entityId } = params;

        switch (provider) {
            case 'lean':
                return await this._fetchLeanAccounts({ accessToken, entityId });
            case 'tarabut':
                return await this._fetchTarabutAccounts({ accessToken });
            default:
                throw new Error(`Provider ${provider} not supported`);
        }
    }

    /**
     * Fetch Lean accounts
     * @private
     */
    async _fetchLeanAccounts(params) {
        const { accessToken, entityId } = params;
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? this.providers.lean.sandbox : this.providers.lean.baseUrl;

        try {
            const response = await axios.get(`${baseUrl}/data/v1/accounts`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'lean-app-token': process.env.LEAN_APP_TOKEN
                },
                params: { entity_id: entityId }
            });

            return response.data.accounts.map(acc => ({
                externalId: acc.account_id,
                accountNumber: acc.account_number,
                iban: acc.iban,
                name: acc.name,
                type: this._mapAccountType(acc.account_type),
                currency: acc.currency,
                balance: acc.balance?.available || 0,
                bankName: acc.institution?.name,
                bankId: acc.institution?.identifier
            }));
        } catch (error) {
            logger.error('Lean fetch accounts failed:', error.response?.data || error.message);
            throw new Error(`Failed to fetch Lean accounts: ${error.message}`);
        }
    }

    /**
     * Fetch Tarabut accounts
     * @private
     */
    async _fetchTarabutAccounts(params) {
        const { accessToken } = params;
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? this.providers.tarabut.sandbox : this.providers.tarabut.baseUrl;

        try {
            const response = await axios.get(`${baseUrl}/v1/accounts`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            return response.data.data.map(acc => ({
                externalId: acc.account_id,
                accountNumber: acc.account_number,
                iban: acc.iban,
                name: acc.nickname || acc.account_type,
                type: this._mapAccountType(acc.account_type),
                currency: acc.currency,
                balance: acc.balance?.available || 0,
                bankName: acc.bank_name,
                bankId: acc.bank_id
            }));
        } catch (error) {
            logger.error('Tarabut fetch accounts failed:', error.response?.data || error.message);
            throw new Error(`Failed to fetch Tarabut accounts: ${error.message}`);
        }
    }

    /**
     * Fetch transactions from provider
     * @param {Object} params - Request parameters
     * @returns {Array} List of transactions
     */
    async fetchTransactions(params) {
        const { provider, accessToken, accountId, entityId, fromDate, toDate } = params;

        switch (provider) {
            case 'lean':
                return await this._fetchLeanTransactions({ accessToken, accountId, entityId, fromDate, toDate });
            case 'tarabut':
                return await this._fetchTarabutTransactions({ accessToken, accountId, fromDate, toDate });
            default:
                throw new Error(`Provider ${provider} not supported`);
        }
    }

    /**
     * Fetch Lean transactions
     * @private
     */
    async _fetchLeanTransactions(params) {
        const { accessToken, accountId, entityId, fromDate, toDate } = params;
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? this.providers.lean.sandbox : this.providers.lean.baseUrl;

        try {
            const response = await axios.get(`${baseUrl}/data/v1/transactions`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'lean-app-token': process.env.LEAN_APP_TOKEN
                },
                params: {
                    entity_id: entityId,
                    account_id: accountId,
                    from_date: fromDate.toISOString().split('T')[0],
                    to_date: toDate.toISOString().split('T')[0]
                }
            });

            return response.data.transactions.map(txn => ({
                externalId: txn.transaction_id,
                date: new Date(txn.timestamp),
                description: txn.description,
                amount: Math.abs(txn.amount),
                type: txn.amount >= 0 ? 'credit' : 'debit',
                balance: txn.balance,
                reference: txn.reference,
                category: txn.category,
                merchant: txn.merchant?.name,
                status: txn.status,
                rawData: txn
            }));
        } catch (error) {
            logger.error('Lean fetch transactions failed:', error.response?.data || error.message);
            throw new Error(`Failed to fetch Lean transactions: ${error.message}`);
        }
    }

    /**
     * Fetch Tarabut transactions
     * @private
     */
    async _fetchTarabutTransactions(params) {
        const { accessToken, accountId, fromDate, toDate } = params;
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? this.providers.tarabut.sandbox : this.providers.tarabut.baseUrl;

        try {
            const response = await axios.get(`${baseUrl}/v1/accounts/${accountId}/transactions`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                params: {
                    from_date: fromDate.toISOString().split('T')[0],
                    to_date: toDate.toISOString().split('T')[0]
                }
            });

            return response.data.data.map(txn => ({
                externalId: txn.transaction_id,
                date: new Date(txn.booking_date || txn.value_date),
                description: txn.description || txn.transaction_information,
                amount: Math.abs(parseFloat(txn.amount)),
                type: txn.credit_debit_indicator === 'CREDIT' ? 'credit' : 'debit',
                balance: parseFloat(txn.balance_after || 0),
                reference: txn.reference,
                category: txn.category,
                merchant: txn.merchant_name,
                status: txn.status,
                rawData: txn
            }));
        } catch (error) {
            logger.error('Tarabut fetch transactions failed:', error.response?.data || error.message);
            throw new Error(`Failed to fetch Tarabut transactions: ${error.message}`);
        }
    }

    /**
     * Refresh access token
     * @param {Object} params - Refresh parameters
     * @returns {Object} New token data
     */
    async refreshToken(params) {
        const { provider, refreshToken } = params;

        switch (provider) {
            case 'lean':
                return await this._refreshLeanToken(refreshToken);
            case 'tarabut':
                return await this._refreshTarabutToken(refreshToken);
            default:
                throw new Error(`Provider ${provider} not supported`);
        }
    }

    /**
     * Refresh Lean token
     * @private
     */
    async _refreshLeanToken(refreshToken) {
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? this.providers.lean.sandbox : this.providers.lean.baseUrl;

        try {
            const response = await axios.post(`${baseUrl}/auth/v1/token`, {
                app_token: process.env.LEAN_APP_TOKEN,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }, {
                headers: {
                    'Authorization': `Bearer ${process.env.LEAN_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
            };
        } catch (error) {
            logger.error('Lean token refresh failed:', error.response?.data || error.message);
            throw new Error(`Failed to refresh Lean token: ${error.message}`);
        }
    }

    /**
     * Refresh Tarabut token
     * @private
     */
    async _refreshTarabutToken(refreshToken) {
        const useSandbox = process.env.NODE_ENV !== 'production';
        const baseUrl = useSandbox ? this.providers.tarabut.sandbox : this.providers.tarabut.baseUrl;

        try {
            const response = await axios.post(`${baseUrl}/v1/connect/token`, {
                client_id: process.env.TARABUT_CLIENT_ID,
                client_secret: process.env.TARABUT_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            return {
                accessToken: response.data.access_token,
                refreshToken: response.data.refresh_token,
                expiresAt: new Date(Date.now() + response.data.expires_in * 1000)
            };
        } catch (error) {
            logger.error('Tarabut token refresh failed:', error.response?.data || error.message);
            throw new Error(`Failed to refresh Tarabut token: ${error.message}`);
        }
    }

    /**
     * Map external account type to internal type
     * @private
     */
    _mapAccountType(externalType) {
        const typeMap = {
            'CURRENT': 'checking',
            'CHECKING': 'checking',
            'SAVINGS': 'savings',
            'CREDIT_CARD': 'credit_card',
            'CREDIT': 'credit_card',
            'INVESTMENT': 'investment',
            'LOAN': 'loan',
            'MORTGAGE': 'loan'
        };
        return typeMap[externalType?.toUpperCase()] || 'other';
    }

    /**
     * Get provider statistics
     * @returns {Object} Provider coverage stats
     */
    getProviderStats() {
        const stats = {
            totalProviders: Object.keys(this.providers).length,
            totalCountries: this.getSupportedCountries().length,
            totalBanks: this.getTotalBankCount(),
            byCountry: {},
            byProvider: {}
        };

        for (const [country, banks] of Object.entries(this.bankRegistry)) {
            stats.byCountry[country] = banks.length;
        }

        for (const [providerName, config] of Object.entries(this.providers)) {
            stats.byProvider[providerName] = {
                name: config.name,
                region: config.region,
                countries: config.supportedCountries,
                features: config.features
            };
        }

        return stats;
    }
}

// Export singleton instance
module.exports = new RegionalBankProvidersService();
