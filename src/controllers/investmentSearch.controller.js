const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { priceService } = require('../services/priceService');
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

    const results = searchSymbols(q || '', {
        market,
        type,
        limit: parseInt(limit)
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

    // Find symbol in database
    const symbolInfo = findSymbol(symbol);

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

    const { results, errors } = await priceService.getBatchPrices(symbols);

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

    const symbolInfo = findSymbol(symbol);
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
        console.error(`Failed to get quote for ${symbol}:`, error.message);
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
