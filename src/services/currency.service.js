const ExchangeRate = require('../models/exchangeRate.model');
const axios = require('axios');

class CurrencyService {
    constructor() {
        this.supportedCurrencies = [
            'SAR', 'USD', 'EUR', 'GBP', 'AED', 'QAR', 'KWD', 'BHD', 'OMR',
            'JOD', 'EGP', 'TRY', 'JPY', 'CNY', 'INR', 'PKR', 'CAD', 'AUD'
        ];

        // API configuration (you can use env variables for API keys)
        this.apiConfig = {
            // Free API: https://exchangerate-api.com
            exchangeRateApi: process.env.EXCHANGE_RATE_API_KEY || null,
            // Alternative: https://openexchangerates.org
            openExchangeRates: process.env.OPEN_EXCHANGE_RATES_KEY || null,
            // SAMA (Saudi Arabian Monetary Authority) for official SAR rates
            samaApi: 'https://www.sama.gov.sa/en-us/EconomicReports/Pages/ExchangeRate.aspx'
        };

        // Default rates (fallback if API is unavailable)
        this.defaultRates = {
            'SAR': { 'USD': 0.2666, 'EUR': 0.2450, 'GBP': 0.2100, 'AED': 0.9798 },
            'USD': { 'SAR': 3.75, 'EUR': 0.92, 'GBP': 0.79, 'AED': 3.6725 },
            'EUR': { 'SAR': 4.08, 'USD': 1.09, 'GBP': 0.86, 'AED': 3.99 },
            'GBP': { 'SAR': 4.76, 'USD': 1.27, 'EUR': 1.16, 'AED': 4.66 },
            'AED': { 'SAR': 1.0206, 'USD': 0.2723, 'EUR': 0.2504, 'GBP': 0.2146 }
        };
    }

    /**
     * Get exchange rate for a specific date
     */
    async getExchangeRate(fromCurrency, toCurrency, date = new Date(), firmId = null) {
        try {
            return await ExchangeRate.getRate(fromCurrency, toCurrency, date, firmId);
        } catch (error) {
            // If no rate found, try to fetch from API
            try {
                await this.updateRatesFromAPI(fromCurrency);
                return await ExchangeRate.getRate(fromCurrency, toCurrency, date, firmId);
            } catch (apiError) {
                // Use default rates as last resort
                if (this.defaultRates[fromCurrency] && this.defaultRates[fromCurrency][toCurrency]) {
                    return this.defaultRates[fromCurrency][toCurrency];
                }
                throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`);
            }
        }
    }

    /**
     * Convert amount between currencies
     */
    async convertAmount(amount, fromCurrency, toCurrency, date = new Date(), firmId = null) {
        if (fromCurrency === toCurrency) {
            return amount;
        }

        const rate = await this.getExchangeRate(fromCurrency, toCurrency, date, firmId);
        return amount * rate;
    }

    /**
     * Fetch live rates from API
     */
    async fetchLiveRates(baseCurrency = 'SAR') {
        try {
            // Try primary API
            if (this.apiConfig.exchangeRateApi) {
                return await this.fetchFromExchangeRateApi(baseCurrency);
            }

            // Try alternative API
            if (this.apiConfig.openExchangeRates) {
                return await this.fetchFromOpenExchangeRates(baseCurrency);
            }

            // Use default rates
            return this.defaultRates[baseCurrency] || {};
        } catch (error) {
            // Silently fall back to default rates
            return this.defaultRates[baseCurrency] || {};
        }
    }

    /**
     * Fetch from ExchangeRate-API.com
     */
    async fetchFromExchangeRateApi(baseCurrency) {
        try {
            const apiKey = this.apiConfig.exchangeRateApi || 'demo'; // demo key for testing
            const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`;

            const response = await axios.get(url, { timeout: 5000 });

            if (response.data && response.data.result === 'success') {
                return response.data.conversion_rates;
            }

            throw new Error('Invalid API response');
        } catch (error) {
            throw new Error(`ExchangeRate-API error: ${error.message}`);
        }
    }

    /**
     * Fetch from Open Exchange Rates
     */
    async fetchFromOpenExchangeRates(baseCurrency) {
        try {
            const apiKey = this.apiConfig.openExchangeRates;
            const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${baseCurrency}`;

            const response = await axios.get(url, { timeout: 5000 });

            if (response.data && response.data.rates) {
                return response.data.rates;
            }

            throw new Error('Invalid API response');
        } catch (error) {
            throw new Error(`OpenExchangeRates error: ${error.message}`);
        }
    }

    /**
     * Update rates from API and store in database
     */
    async updateRatesFromAPI(baseCurrency = 'SAR', firmId = null) {
        try {
            const rates = await this.fetchLiveRates(baseCurrency);

            if (!rates || Object.keys(rates).length === 0) {
                throw new Error('No rates fetched from API');
            }

            const results = await ExchangeRate.bulkUpdateRates(baseCurrency, rates, 'api');
            return results;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get historical rate for a specific date
     */
    async getHistoricalRate(fromCurrency, toCurrency, date, firmId = null) {
        try {
            const rate = await ExchangeRate.getRate(fromCurrency, toCurrency, date, firmId);
            return rate;
        } catch (error) {
            // If historical rate not available, use current rate as fallback
            return await this.getExchangeRate(fromCurrency, toCurrency, new Date(), firmId);
        }
    }

    /**
     * Get supported currencies
     */
    async getSupportedCurrencies(baseCurrency = 'SAR', firmId = null) {
        try {
            // Get currencies from database
            const dbCurrencies = await ExchangeRate.getSupportedCurrencies(baseCurrency, firmId);

            // Merge with default supported currencies
            const allCurrencies = [...new Set([...this.supportedCurrencies, ...dbCurrencies])];

            return allCurrencies.sort();
        } catch (error) {
            return this.supportedCurrencies;
        }
    }

    /**
     * Set manual exchange rate
     */
    async setManualRate(firmId, fromCurrency, toCurrency, rate, userId, notes = null) {
        try {
            if (rate <= 0) {
                throw new Error('Exchange rate must be greater than 0');
            }

            const result = await ExchangeRate.setRate({
                baseCurrency: fromCurrency,
                targetCurrency: toCurrency,
                rate,
                source: 'manual',
                firmId,
                createdBy: userId,
                notes
            });

            return result;
        } catch (error) {
            throw new Error(`Failed to set manual rate: ${error.message}`);
        }
    }

    /**
     * Get all current rates for a base currency
     */
    async getCurrentRates(baseCurrency = 'SAR', firmId = null) {
        try {
            const rates = await ExchangeRate.getLatestRates(baseCurrency, firmId);

            // If no rates found, try to fetch from API
            if (!rates || rates.length === 0) {
                await this.updateRatesFromAPI(baseCurrency, firmId);
                return await ExchangeRate.getLatestRates(baseCurrency, firmId);
            }

            return rates;
        } catch (error) {
            throw new Error(`Failed to get current rates: ${error.message}`);
        }
    }

    /**
     * Get historical rates for a date range
     */
    async getHistoricalRates(fromCurrency, toCurrency, startDate, endDate, firmId = null) {
        try {
            return await ExchangeRate.getHistoricalRates(
                fromCurrency,
                toCurrency,
                startDate,
                endDate,
                firmId
            );
        } catch (error) {
            throw new Error(`Failed to get historical rates: ${error.message}`);
        }
    }

    /**
     * Convert multiple amounts at once
     */
    async bulkConvert(conversions, date = new Date(), firmId = null) {
        const results = [];

        for (const conversion of conversions) {
            try {
                const converted = await this.convertAmount(
                    conversion.amount,
                    conversion.from,
                    conversion.to,
                    date,
                    firmId
                );

                results.push({
                    ...conversion,
                    result: converted,
                    success: true
                });
            } catch (error) {
                results.push({
                    ...conversion,
                    result: null,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Get currency information
     */
    getCurrencyInfo(currencyCode) {
        const currencyInfo = {
            'SAR': { name: 'Saudi Riyal', symbol: 'ر.س', decimals: 2, country: 'Saudi Arabia' },
            'USD': { name: 'US Dollar', symbol: '$', decimals: 2, country: 'United States' },
            'EUR': { name: 'Euro', symbol: '€', decimals: 2, country: 'European Union' },
            'GBP': { name: 'British Pound', symbol: '£', decimals: 2, country: 'United Kingdom' },
            'AED': { name: 'UAE Dirham', symbol: 'د.إ', decimals: 2, country: 'UAE' },
            'QAR': { name: 'Qatari Riyal', symbol: 'ر.ق', decimals: 2, country: 'Qatar' },
            'KWD': { name: 'Kuwaiti Dinar', symbol: 'د.ك', decimals: 3, country: 'Kuwait' },
            'BHD': { name: 'Bahraini Dinar', symbol: 'د.ب', decimals: 3, country: 'Bahrain' },
            'OMR': { name: 'Omani Rial', symbol: 'ر.ع.', decimals: 3, country: 'Oman' },
            'JOD': { name: 'Jordanian Dinar', symbol: 'د.ا', decimals: 3, country: 'Jordan' },
            'EGP': { name: 'Egyptian Pound', symbol: 'ج.م', decimals: 2, country: 'Egypt' },
            'TRY': { name: 'Turkish Lira', symbol: '₺', decimals: 2, country: 'Turkey' },
            'JPY': { name: 'Japanese Yen', symbol: '¥', decimals: 0, country: 'Japan' },
            'CNY': { name: 'Chinese Yuan', symbol: '¥', decimals: 2, country: 'China' },
            'INR': { name: 'Indian Rupee', symbol: '₹', decimals: 2, country: 'India' },
            'PKR': { name: 'Pakistani Rupee', symbol: '₨', decimals: 2, country: 'Pakistan' },
            'CAD': { name: 'Canadian Dollar', symbol: 'C$', decimals: 2, country: 'Canada' },
            'AUD': { name: 'Australian Dollar', symbol: 'A$', decimals: 2, country: 'Australia' }
        };

        return currencyInfo[currencyCode.toUpperCase()] || {
            name: currencyCode,
            symbol: currencyCode,
            decimals: 2,
            country: 'Unknown'
        };
    }

    /**
     * Format amount with currency
     */
    formatAmount(amount, currencyCode, locale = 'en-US') {
        const info = this.getCurrencyInfo(currencyCode);

        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency: currencyCode,
                minimumFractionDigits: info.decimals,
                maximumFractionDigits: info.decimals
            }).format(amount);
        } catch (error) {
            // Fallback formatting
            return `${info.symbol} ${amount.toFixed(info.decimals)}`;
        }
    }

    /**
     * Initialize default rates in database
     */
    async initializeDefaultRates() {
        for (const [baseCurrency, rates] of Object.entries(this.defaultRates)) {
            for (const [targetCurrency, rate] of Object.entries(rates)) {
                try {
                    const existing = await ExchangeRate.findOne({
                        baseCurrency,
                        targetCurrency,
                        firmId: null,
                        isActive: true
                    });

                    if (!existing) {
                        await ExchangeRate.create({
                            baseCurrency,
                            targetCurrency,
                            rate,
                            source: 'manual',
                            firmId: null,
                            effectiveDate: new Date(),
                            isActive: true
                        });
                    }
                } catch (error) {
                    // Silently continue on individual rate errors
                }
            }
        }
    }

    /**
     * Scheduled task to update rates daily
     */
    async updateRatesScheduled() {
        const baseCurrencies = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];

        for (const currency of baseCurrencies) {
            try {
                await this.updateRatesFromAPI(currency);
            } catch (error) {
                // Continue with other currencies on error
            }
        }

        // Clean expired rates
        await ExchangeRate.cleanExpiredRates();
    }

    /**
     * Get exchange rate statistics
     */
    async getStatistics(baseCurrency = 'SAR', firmId = null) {
        try {
            const stats = await ExchangeRate.getStatistics(baseCurrency, firmId);
            return stats[0] || {
                totalCurrencies: 0,
                avgRate: 0,
                minRate: 0,
                maxRate: 0,
                sources: []
            };
        } catch (error) {
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }

    /**
     * Validate currency code
     */
    isValidCurrency(currencyCode) {
        return /^[A-Z]{3}$/.test(currencyCode);
    }

    /**
     * Get cross rate (via intermediate currency, typically USD)
     */
    async getCrossRate(fromCurrency, toCurrency, date = new Date(), firmId = null) {
        try {
            // Try direct rate first
            return await this.getExchangeRate(fromCurrency, toCurrency, date, firmId);
        } catch (error) {
            // Try cross rate via USD
            try {
                const fromToUsd = await this.getExchangeRate(fromCurrency, 'USD', date, firmId);
                const usdToTarget = await this.getExchangeRate('USD', toCurrency, date, firmId);
                return fromToUsd * usdToTarget;
            } catch (crossError) {
                throw new Error(`Cannot calculate cross rate: ${crossError.message}`);
            }
        }
    }
}

module.exports = new CurrencyService();
