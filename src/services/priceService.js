const axios = require('axios');
const { findSymbol, ALL_SYMBOLS } = require('../data/symbols');

// Simple in-memory cache
const priceCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

/**
 * Price Service for fetching real-time stock/crypto/forex prices
 * Supports multiple data sources with fallback
 */
class PriceService {
    constructor() {
        this.yahooBaseUrl = 'https://query1.finance.yahoo.com/v8/finance/chart';
    }

    /**
     * Get cached price if valid
     */
    getCached(key) {
        const cached = priceCache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
        return null;
    }

    /**
     * Set cache
     */
    setCache(key, data) {
        priceCache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get price from Yahoo Finance API
     * @param {string} yahooSymbol - Yahoo Finance symbol (e.g., 'AAPL', '1120.SR')
     */
    async getPriceFromYahoo(yahooSymbol) {
        const cacheKey = `yahoo:${yahooSymbol}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const response = await axios.get(`${this.yahooBaseUrl}/${yahooSymbol}`, {
                params: {
                    interval: '1d',
                    range: '2d'
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const result = response.data?.chart?.result?.[0];
            if (!result) {
                throw new Error(`No data returned for ${yahooSymbol}`);
            }

            const meta = result.meta;
            const quote = result.indicators?.quote?.[0];
            const timestamps = result.timestamp || [];

            // Get current price and previous close
            const currentPrice = meta.regularMarketPrice || 0;
            const previousClose = meta.previousClose || meta.chartPreviousClose || currentPrice;
            const change = currentPrice - previousClose;
            const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

            // Get high/low from today's data
            const lastIdx = timestamps.length - 1;
            const high = quote?.high?.[lastIdx] || meta.regularMarketDayHigh || currentPrice;
            const low = quote?.low?.[lastIdx] || meta.regularMarketDayLow || currentPrice;
            const volume = quote?.volume?.[lastIdx] || meta.regularMarketVolume || 0;

            const priceData = {
                symbol: yahooSymbol,
                price: currentPrice,
                previousClose,
                change: Math.round(change * 100) / 100,
                changePercent: Math.round(changePercent * 100) / 100,
                high,
                low,
                volume,
                currency: meta.currency || 'USD',
                exchangeName: meta.exchangeName || '',
                lastUpdated: new Date(),
                source: 'yahoo'
            };

            this.setCache(cacheKey, priceData);
            return priceData;
        } catch (error) {
            console.error(`Yahoo Finance error for ${yahooSymbol}:`, error.message);
            throw new Error(`Failed to fetch price for ${yahooSymbol}: ${error.message}`);
        }
    }

    /**
     * Get price with automatic symbol resolution
     * @param {string} symbol - Symbol code (e.g., '1120', 'AAPL', 'BTC')
     */
    async getPrice(symbol) {
        // Find symbol in database
        const symbolInfo = findSymbol(symbol);

        if (symbolInfo && symbolInfo.yahoo) {
            try {
                const quote = await this.getPriceFromYahoo(symbolInfo.yahoo);
                return {
                    ...quote,
                    symbolInfo
                };
            } catch (error) {
                console.error(`Failed to get price for ${symbol}:`, error.message);
                throw error;
            }
        }

        // Try direct Yahoo lookup if not in database
        try {
            return await this.getPriceFromYahoo(symbol);
        } catch (error) {
            throw new Error(`Symbol ${symbol} not found or price unavailable`);
        }
    }

    /**
     * Get prices for multiple symbols
     * @param {string[]} symbols - Array of symbol codes
     */
    async getBatchPrices(symbols) {
        const results = new Map();
        const errors = [];

        // Process in parallel with concurrency limit
        const batchSize = 5;
        for (let i = 0; i < symbols.length; i += batchSize) {
            const batch = symbols.slice(i, i + batchSize);
            const promises = batch.map(async (symbol) => {
                try {
                    const quote = await this.getPrice(symbol);
                    results.set(symbol, quote);
                } catch (error) {
                    errors.push({ symbol, error: error.message });
                }
            });

            await Promise.all(promises);

            // Rate limiting between batches
            if (i + batchSize < symbols.length) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        return { results, errors };
    }

    /**
     * Get quote with price in halalas
     * @param {string} symbol - Symbol code
     */
    async getQuoteInHalalas(symbol) {
        const quote = await this.getPrice(symbol);

        // Convert to halalas (multiply by 100)
        return {
            ...quote,
            priceHalalas: Math.round(quote.price * 100),
            previousCloseHalalas: Math.round(quote.previousClose * 100),
            changeHalalas: Math.round(quote.change * 100),
            highHalalas: Math.round(quote.high * 100),
            lowHalalas: Math.round(quote.low * 100)
        };
    }

    /**
     * Update investment prices from database
     * @param {Object} Investment - Investment model
     * @param {string} market - Market to update ('tadawul', 'us', 'crypto', etc.)
     */
    async updateInvestmentPrices(Investment, market = null) {
        const query = { status: 'active' };
        if (market) {
            query.market = market;
        }

        const investments = await Investment.find(query);
        const updated = [];
        const failed = [];

        for (const investment of investments) {
            try {
                const symbolInfo = findSymbol(investment.symbol);
                if (!symbolInfo) {
                    failed.push({ id: investment._id, symbol: investment.symbol, error: 'Symbol not found' });
                    continue;
                }

                const quote = await this.getPriceFromYahoo(symbolInfo.yahoo);

                // Convert price to halalas
                const priceInHalalas = Math.round(quote.price * 100);

                investment.updatePrice({
                    price: priceInHalalas,
                    previousClose: Math.round(quote.previousClose * 100),
                    change: Math.round(quote.change * 100),
                    changePercent: quote.changePercent,
                    high: Math.round(quote.high * 100),
                    low: Math.round(quote.low * 100),
                    volume: quote.volume,
                    source: 'yahoo'
                });

                await investment.save();
                updated.push({ id: investment._id, symbol: investment.symbol, price: priceInHalalas });

                // Rate limiting
                await new Promise(r => setTimeout(r, 300));
            } catch (error) {
                failed.push({ id: investment._id, symbol: investment.symbol, error: error.message });
            }
        }

        return { updated, failed };
    }

    /**
     * Clear price cache
     */
    clearCache() {
        priceCache.clear();
    }

    /**
     * Get cache stats
     */
    getCacheStats() {
        return {
            size: priceCache.size,
            keys: Array.from(priceCache.keys())
        };
    }
}

// Singleton instance
const priceService = new PriceService();

module.exports = {
    priceService,
    PriceService
};
