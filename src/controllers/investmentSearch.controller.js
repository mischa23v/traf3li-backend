const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const { priceService } = require('../services/priceService');
const logger = require('../utils/logger');
const {
    findSymbol,
    searchSymbols,
    getSymbolsByMarket,
    getSymbolsByType,
    ALL_SYMBOLS,
    SAUDI_STOCKS,
    SAUDI_REITS,
    SAUDI_ETFS,
    INTERNATIONAL_STOCKS,
    FOREX_PAIRS,
    CRYPTO,
    COMMODITIES
} = require('../data/symbols');

// ═══════════════════════════════════════════════════════════════
// SEARCH SYMBOLS
// ═══════════════════════════════════════════════════════════════
const searchInvestmentSymbols = asyncHandler(async (req, res) => {
    const { q, market, type, limit = 20 } = req.query;

    // Validate and sanitize search query
    if (q && typeof q !== 'string') {
        throw CustomException('Invalid search query format', 400);
    }

    // Sanitize search term to prevent injection
    const sanitizedQuery = q ? q.trim().replace(/[<>{}$]/g, '').substring(0, 100) : '';

    // Validate market parameter
    const validMarkets = ['tadawul', 'us', 'forex', 'crypto', 'commodities'];
    if (market && !validMarkets.includes(market)) {
        throw CustomException(`Invalid market. Valid options: ${validMarkets.join(', ')}`, 400);
    }

    // Validate type parameter
    const validTypes = ['stock', 'reit', 'etf', 'forex', 'crypto', 'commodity'];
    if (type && !validTypes.includes(type)) {
        throw CustomException(`Invalid type. Valid options: ${validTypes.join(', ')}`, 400);
    }

    // Validate and sanitize limit
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        throw CustomException('Limit must be a number between 1 and 100', 400);
    }

    const results = searchSymbols(sanitizedQuery, {
        market,
        type,
        limit: parsedLimit
    });

    return res.json({
        success: true,
        count: results.length,
        data: results
    });
});

// ═══════════════════════════════════════════════════════════════
// GET QUOTE
// ═══════════════════════════════════════════════════════════════
const getQuote = asyncHandler(async (req, res) => {
    const { symbol } = req.query;

    if (!symbol) {
        throw CustomException('Symbol is required', 400);
    }

    // Validate symbol format (alphanumeric, dots, hyphens only)
    if (typeof symbol !== 'string' || !/^[A-Za-z0-9.\-]+$/.test(symbol) || symbol.length > 20) {
        throw CustomException('Invalid symbol format', 400);
    }

    // Sanitize symbol - uppercase and trim
    const sanitizedSymbol = symbol.trim().toUpperCase();

    // Find symbol in database
    const symbolInfo = findSymbol(sanitizedSymbol);

    if (!symbolInfo) {
        throw CustomException('Symbol not found in database', 404);
    }

    try {
        const quote = await priceService.getPriceFromYahoo(symbolInfo.yahoo);

        return res.json({
            success: true,
            data: {
                symbol: symbolInfo,
                quote: {
                    price: quote.price,
                    priceHalalas: Math.round(quote.price * 100),
                    previousClose: quote.previousClose,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    high: quote.high,
                    low: quote.low,
                    volume: quote.volume,
                    currency: quote.currency,
                    lastUpdated: quote.lastUpdated,
                    source: quote.source
                }
            }
        });
    } catch (error) {
        throw CustomException(`Failed to get quote: ${error.message}`, 500);
    }
});

// ═══════════════════════════════════════════════════════════════
// GET BATCH QUOTES
// ═══════════════════════════════════════════════════════════════
const getBatchQuotes = asyncHandler(async (req, res) => {
    const { symbols } = req.body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
        throw CustomException('Symbols array is required', 400);
    }

    if (symbols.length > 20) {
        throw CustomException('Maximum 20 symbols allowed per request', 400);
    }

    // Validate and sanitize each symbol
    const sanitizedSymbols = symbols.map((symbol, index) => {
        if (typeof symbol !== 'string') {
            throw CustomException(`Symbol at index ${index} must be a string`, 400);
        }

        // Validate symbol format
        if (!/^[A-Za-z0-9.\-]+$/.test(symbol) || symbol.length > 20) {
            throw CustomException(`Invalid symbol format at index ${index}`, 400);
        }

        return symbol.trim().toUpperCase();
    });

    const { results, errors } = await priceService.getBatchPrices(sanitizedSymbols);

    const quotes = {};
    for (const [symbol, quote] of results) {
        quotes[symbol] = {
            price: quote.price,
            priceHalalas: Math.round(quote.price * 100),
            change: quote.change,
            changePercent: quote.changePercent,
            lastUpdated: quote.lastUpdated
        };
    }

    return res.json({
        success: true,
        data: {
            quotes,
            errors
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SYMBOLS BY MARKET
// ═══════════════════════════════════════════════════════════════
const getSymbolsByMarketEndpoint = asyncHandler(async (req, res) => {
    const { market } = req.params;

    const validMarkets = ['tadawul', 'us', 'forex', 'crypto', 'commodities'];
    if (!validMarkets.includes(market)) {
        throw CustomException(`Invalid market. Valid options: ${validMarkets.join(', ')}`, 400);
    }

    const symbols = getSymbolsByMarket(market);

    return res.json({
        success: true,
        market,
        count: symbols.length,
        data: symbols
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SYMBOLS BY TYPE
// ═══════════════════════════════════════════════════════════════
const getSymbolsByTypeEndpoint = asyncHandler(async (req, res) => {
    const { type } = req.params;

    const validTypes = ['stock', 'reit', 'etf', 'forex', 'crypto', 'commodity'];
    if (!validTypes.includes(type)) {
        throw CustomException(`Invalid type. Valid options: ${validTypes.join(', ')}`, 400);
    }

    const symbols = getSymbolsByType(type);

    return res.json({
        success: true,
        type,
        count: symbols.length,
        data: symbols
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ALL MARKETS
// ═══════════════════════════════════════════════════════════════
const getMarkets = asyncHandler(async (req, res) => {
    const markets = [
        {
            id: 'tadawul',
            name: 'السوق السعودي',
            nameEn: 'Saudi Exchange (Tadawul)',
            symbolCount: SAUDI_STOCKS.length + SAUDI_REITS.length + SAUDI_ETFS.length
        },
        {
            id: 'us',
            name: 'الأسواق الأمريكية',
            nameEn: 'US Markets',
            symbolCount: INTERNATIONAL_STOCKS.length
        },
        {
            id: 'forex',
            name: 'سوق العملات',
            nameEn: 'Forex',
            symbolCount: FOREX_PAIRS.length
        },
        {
            id: 'crypto',
            name: 'العملات الرقمية',
            nameEn: 'Cryptocurrencies',
            symbolCount: CRYPTO.length
        },
        {
            id: 'commodities',
            name: 'السلع',
            nameEn: 'Commodities',
            symbolCount: COMMODITIES.length
        }
    ];

    return res.json({
        success: true,
        data: markets
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ALL TYPES
// ═══════════════════════════════════════════════════════════════
const getTypes = asyncHandler(async (req, res) => {
    const types = [
        { id: 'stock', name: 'أسهم', nameEn: 'Stocks' },
        { id: 'reit', name: 'صناديق الريت', nameEn: 'REITs' },
        { id: 'etf', name: 'صناديق المؤشرات', nameEn: 'ETFs' },
        { id: 'mutual_fund', name: 'صناديق استثمارية', nameEn: 'Mutual Funds' },
        { id: 'sukuk', name: 'صكوك', nameEn: 'Sukuk' },
        { id: 'bond', name: 'سندات', nameEn: 'Bonds' },
        { id: 'forex', name: 'عملات', nameEn: 'Forex' },
        { id: 'crypto', name: 'عملات رقمية', nameEn: 'Cryptocurrencies' },
        { id: 'commodity', name: 'سلع', nameEn: 'Commodities' }
    ];

    return res.json({
        success: true,
        data: types
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SECTORS
// ═══════════════════════════════════════════════════════════════
const getSectors = asyncHandler(async (req, res) => {
    const { market } = req.query;

    // Validate market parameter if provided
    if (market) {
        const validMarkets = ['tadawul', 'us', 'forex', 'crypto', 'commodities'];
        if (!validMarkets.includes(market)) {
            throw CustomException(`Invalid market. Valid options: ${validMarkets.join(', ')}`, 400);
        }
    }

    let symbols = ALL_SYMBOLS;
    if (market) {
        symbols = getSymbolsByMarket(market);
    }

    // Get unique sectors
    const sectorsMap = new Map();
    for (const symbol of symbols) {
        if (symbol.sector && !sectorsMap.has(symbol.sector)) {
            sectorsMap.set(symbol.sector, {
                id: symbol.sector.toLowerCase().replace(/\s+/g, '_'),
                name: symbol.sectorAr,
                nameEn: symbol.sector
            });
        }
    }

    const sectors = Array.from(sectorsMap.values());

    return res.json({
        success: true,
        data: sectors
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SYMBOL DETAILS
// ═══════════════════════════════════════════════════════════════
const getSymbolDetails = asyncHandler(async (req, res) => {
    const { symbol } = req.params;

    // Validate symbol format
    if (!symbol || typeof symbol !== 'string') {
        throw CustomException('Symbol is required', 400);
    }

    // Validate symbol format (alphanumeric, dots, hyphens only)
    if (!/^[A-Za-z0-9.\-]+$/.test(symbol) || symbol.length > 20) {
        throw CustomException('Invalid symbol format', 400);
    }

    // Sanitize symbol - uppercase and trim
    const sanitizedSymbol = symbol.trim().toUpperCase();

    const symbolInfo = findSymbol(sanitizedSymbol);
    if (!symbolInfo) {
        throw CustomException('Symbol not found', 404);
    }

    // Try to get current quote
    let quote = null;
    try {
        const quoteData = await priceService.getPriceFromYahoo(symbolInfo.yahoo);
        quote = {
            price: quoteData.price,
            priceHalalas: Math.round(quoteData.price * 100),
            previousClose: quoteData.previousClose,
            change: quoteData.change,
            changePercent: quoteData.changePercent,
            high: quoteData.high,
            low: quoteData.low,
            volume: quoteData.volume,
            currency: quoteData.currency,
            lastUpdated: quoteData.lastUpdated
        };
    } catch (error) {
        logger.error(`Failed to get quote for ${sanitizedSymbol}:`, error.message);
    }

    return res.json({
        success: true,
        data: {
            ...symbolInfo,
            quote
        }
    });
});

module.exports = {
    searchInvestmentSymbols,
    getQuote,
    getBatchQuotes,
    getSymbolsByMarketEndpoint,
    getSymbolsByTypeEndpoint,
    getMarkets,
    getTypes,
    getSectors,
    getSymbolDetails
};
