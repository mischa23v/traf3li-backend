// ============================================================
// SAUDI STOCKS (Tadawul) - Major Companies
// ============================================================
const SAUDI_STOCKS = [
    // Banking (البنوك)
    { symbol: '1120', tv: 'TADAWUL:1120', yahoo: '1120.SR', nameAr: 'مصرف الراجحي', nameEn: 'Al Rajhi Bank', sector: 'Banking', sectorAr: 'البنوك' },
    { symbol: '1180', tv: 'TADAWUL:1180', yahoo: '1180.SR', nameAr: 'بنك الأهلي', nameEn: 'Saudi National Bank', sector: 'Banking', sectorAr: 'البنوك' },
    { symbol: '1150', tv: 'TADAWUL:1150', yahoo: '1150.SR', nameAr: 'بنك الإنماء', nameEn: 'Alinma Bank', sector: 'Banking', sectorAr: 'البنوك' },
    { symbol: '1050', tv: 'TADAWUL:1050', yahoo: '1050.SR', nameAr: 'بنك الجزيرة', nameEn: 'Bank AlJazira', sector: 'Banking', sectorAr: 'البنوك' },
    { symbol: '1020', tv: 'TADAWUL:1020', yahoo: '1020.SR', nameAr: 'بنك الرياض', nameEn: 'Riyad Bank', sector: 'Banking', sectorAr: 'البنوك' },
    { symbol: '1030', tv: 'TADAWUL:1030', yahoo: '1030.SR', nameAr: 'البنك السعودي الفرنسي', nameEn: 'Banque Saudi Fransi', sector: 'Banking', sectorAr: 'البنوك' },
    { symbol: '1010', tv: 'TADAWUL:1010', yahoo: '1010.SR', nameAr: 'البنك السعودي البريطاني', nameEn: 'SABB', sector: 'Banking', sectorAr: 'البنوك' },
    { symbol: '1060', tv: 'TADAWUL:1060', yahoo: '1060.SR', nameAr: 'البنك العربي الوطني', nameEn: 'Arab National Bank', sector: 'Banking', sectorAr: 'البنوك' },

    // Energy (الطاقة)
    { symbol: '2222', tv: 'TADAWUL:2222', yahoo: '2222.SR', nameAr: 'أرامكو السعودية', nameEn: 'Saudi Aramco', sector: 'Energy', sectorAr: 'الطاقة' },
    { symbol: '2082', tv: 'TADAWUL:2082', yahoo: '2082.SR', nameAr: 'أكوا باور', nameEn: 'ACWA Power', sector: 'Energy', sectorAr: 'الطاقة' },

    // Petrochemicals (البتروكيماويات)
    { symbol: '2010', tv: 'TADAWUL:2010', yahoo: '2010.SR', nameAr: 'سابك', nameEn: 'SABIC', sector: 'Petrochemicals', sectorAr: 'البتروكيماويات' },
    { symbol: '2330', tv: 'TADAWUL:2330', yahoo: '2330.SR', nameAr: 'المتقدمة', nameEn: 'Advanced Petrochemical', sector: 'Petrochemicals', sectorAr: 'البتروكيماويات' },
    { symbol: '2310', tv: 'TADAWUL:2310', yahoo: '2310.SR', nameAr: 'سبكيم', nameEn: 'SIPCHEM', sector: 'Petrochemicals', sectorAr: 'البتروكيماويات' },
    { symbol: '2290', tv: 'TADAWUL:2290', yahoo: '2290.SR', nameAr: 'ينساب', nameEn: 'Yanbu Petrochemical', sector: 'Petrochemicals', sectorAr: 'البتروكيماويات' },
    { symbol: '2380', tv: 'TADAWUL:2380', yahoo: '2380.SR', nameAr: 'بترو رابغ', nameEn: 'Petro Rabigh', sector: 'Petrochemicals', sectorAr: 'البتروكيماويات' },

    // Telecom (الاتصالات)
    { symbol: '7010', tv: 'TADAWUL:7010', yahoo: '7010.SR', nameAr: 'الاتصالات السعودية', nameEn: 'STC', sector: 'Telecom', sectorAr: 'الاتصالات' },
    { symbol: '7020', tv: 'TADAWUL:7020', yahoo: '7020.SR', nameAr: 'اتحاد اتصالات', nameEn: 'Mobily', sector: 'Telecom', sectorAr: 'الاتصالات' },
    { symbol: '7030', tv: 'TADAWUL:7030', yahoo: '7030.SR', nameAr: 'زين السعودية', nameEn: 'Zain KSA', sector: 'Telecom', sectorAr: 'الاتصالات' },

    // Retail (التجزئة)
    { symbol: '4190', tv: 'TADAWUL:4190', yahoo: '4190.SR', nameAr: 'جرير', nameEn: 'Jarir Marketing', sector: 'Retail', sectorAr: 'التجزئة' },
    { symbol: '4003', tv: 'TADAWUL:4003', yahoo: '4003.SR', nameAr: 'إكسترا', nameEn: 'Extra', sector: 'Retail', sectorAr: 'التجزئة' },
    { symbol: '4001', tv: 'TADAWUL:4001', yahoo: '4001.SR', nameAr: 'عبدالله العثيم', nameEn: 'Abdullah Al Othaim', sector: 'Retail', sectorAr: 'التجزئة' },

    // Food (الأغذية)
    { symbol: '2280', tv: 'TADAWUL:2280', yahoo: '2280.SR', nameAr: 'المراعي', nameEn: 'Almarai', sector: 'Food', sectorAr: 'الأغذية' },
    { symbol: '6010', tv: 'TADAWUL:6010', yahoo: '6010.SR', nameAr: 'نادك', nameEn: 'NADEC', sector: 'Food', sectorAr: 'الأغذية' },
    { symbol: '2270', tv: 'TADAWUL:2270', yahoo: '2270.SR', nameAr: 'صافولا', nameEn: 'Savola', sector: 'Food', sectorAr: 'الأغذية' },

    // Healthcare (الرعاية الصحية)
    { symbol: '4002', tv: 'TADAWUL:4002', yahoo: '4002.SR', nameAr: 'المواساة', nameEn: 'Mouwasat Medical', sector: 'Healthcare', sectorAr: 'الرعاية الصحية' },
    { symbol: '4004', tv: 'TADAWUL:4004', yahoo: '4004.SR', nameAr: 'دله الصحية', nameEn: 'Dallah Healthcare', sector: 'Healthcare', sectorAr: 'الرعاية الصحية' },
    { symbol: '4005', tv: 'TADAWUL:4005', yahoo: '4005.SR', nameAr: 'رعاية', nameEn: 'Care', sector: 'Healthcare', sectorAr: 'الرعاية الصحية' },

    // Real Estate (العقارات)
    { symbol: '4300', tv: 'TADAWUL:4300', yahoo: '4300.SR', nameAr: 'دار الأركان', nameEn: 'Dar Al Arkan', sector: 'Real Estate', sectorAr: 'العقارات' },
    { symbol: '4250', tv: 'TADAWUL:4250', yahoo: '4250.SR', nameAr: 'جبل عمر', nameEn: 'Jabal Omar', sector: 'Real Estate', sectorAr: 'العقارات' },

    // Insurance (التأمين)
    { symbol: '8010', tv: 'TADAWUL:8010', yahoo: '8010.SR', nameAr: 'التعاونية', nameEn: 'Tawuniya', sector: 'Insurance', sectorAr: 'التأمين' },

    // Industrial (الصناعة)
    { symbol: '1211', tv: 'TADAWUL:1211', yahoo: '1211.SR', nameAr: 'معادن', nameEn: 'Maaden', sector: 'Industrial', sectorAr: 'الصناعة' },
    { symbol: '3010', tv: 'TADAWUL:3010', yahoo: '3010.SR', nameAr: 'أسمنت العربية', nameEn: 'Arabian Cement', sector: 'Industrial', sectorAr: 'الصناعة' },

    // Utilities (المرافق)
    { symbol: '5110', tv: 'TADAWUL:5110', yahoo: '5110.SR', nameAr: 'الكهرباء', nameEn: 'Saudi Electricity', sector: 'Utilities', sectorAr: 'المرافق العامة' },

    // Financial Services
    { symbol: '1111', tv: 'TADAWUL:1111', yahoo: '1111.SR', nameAr: 'مجموعة تداول', nameEn: 'Tadawul Group', sector: 'Financial Services', sectorAr: 'الخدمات المالية' },
];

// ============================================================
// SAUDI REITs (صناديق الريت)
// ============================================================
const SAUDI_REITS = [
    { symbol: '4330', tv: 'TADAWUL:4330', yahoo: '4330.SR', nameAr: 'الرياض ريت', nameEn: 'Riyad REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4331', tv: 'TADAWUL:4331', yahoo: '4331.SR', nameAr: 'الجزيرة ريت', nameEn: 'Aljazira Mawten REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4332', tv: 'TADAWUL:4332', yahoo: '4332.SR', nameAr: 'جدوى ريت الحرمين', nameEn: 'Jadwa REIT Al Haramain', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4334', tv: 'TADAWUL:4334', yahoo: '4334.SR', nameAr: 'سدكو كابيتال ريت', nameEn: 'SEDCO Capital REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4335', tv: 'TADAWUL:4335', yahoo: '4335.SR', nameAr: 'مشاركة ريت', nameEn: 'Musharaka REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4336', tv: 'TADAWUL:4336', yahoo: '4336.SR', nameAr: 'ملكية ريت', nameEn: 'Mulkia REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4337', tv: 'TADAWUL:4337', yahoo: '4337.SR', nameAr: 'سيكو السعودية ريت', nameEn: 'SICO Saudi REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4338', tv: 'TADAWUL:4338', yahoo: '4338.SR', nameAr: 'الأندلس ريت', nameEn: 'Alandalus REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4339', tv: 'TADAWUL:4339', yahoo: '4339.SR', nameAr: 'دراية ريت', nameEn: 'Derayah REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4340', tv: 'TADAWUL:4340', yahoo: '4340.SR', nameAr: 'الراجحي ريت', nameEn: 'Al Rajhi REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4342', tv: 'TADAWUL:4342', yahoo: '4342.SR', nameAr: 'جدوى ريت السعودية', nameEn: 'Jadwa Saudi REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4344', tv: 'TADAWUL:4344', yahoo: '4344.SR', nameAr: 'الإنماء ريت للتجزئة', nameEn: 'Alinma Retail REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4345', tv: 'TADAWUL:4345', yahoo: '4345.SR', nameAr: 'الخبير ريت', nameEn: 'Alkhabeer REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4346', tv: 'TADAWUL:4346', yahoo: '4346.SR', nameAr: 'مبكو ريت', nameEn: 'MEFIC REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4347', tv: 'TADAWUL:4347', yahoo: '4347.SR', nameAr: 'بنيان ريت', nameEn: 'Bonyan REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
    { symbol: '4348', tv: 'TADAWUL:4348', yahoo: '4348.SR', nameAr: 'الأهلي ريت', nameEn: 'AlAhli REIT', sector: 'REIT', sectorAr: 'صناديق الريت' },
];

// ============================================================
// SAUDI ETFs (صناديق المؤشرات)
// ============================================================
const SAUDI_ETFS = [
    { symbol: '9001', tv: 'TADAWUL:9001', yahoo: '9001.SR', nameAr: 'صندوق فالكم 30', nameEn: 'FALCOM 30 ETF', sector: 'ETF', sectorAr: 'صناديق المؤشرات' },
    { symbol: '9002', tv: 'TADAWUL:9002', yahoo: '9002.SR', nameAr: 'صندوق إم إس سي آي', nameEn: 'MSCI Tadawul 30 ETF', sector: 'ETF', sectorAr: 'صناديق المؤشرات' },
    { symbol: '9003', tv: 'TADAWUL:9003', yahoo: '9003.SR', nameAr: 'صندوق الإنماء', nameEn: 'Alinma ETF', sector: 'ETF', sectorAr: 'صناديق المؤشرات' },
];

// ============================================================
// INTERNATIONAL STOCKS (US Markets)
// ============================================================
const INTERNATIONAL_STOCKS = [
    // US Tech Giants
    { symbol: 'AAPL', tv: 'NASDAQ:AAPL', yahoo: 'AAPL', nameAr: 'أبل', nameEn: 'Apple Inc.', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'GOOGL', tv: 'NASDAQ:GOOGL', yahoo: 'GOOGL', nameAr: 'جوجل', nameEn: 'Alphabet Inc.', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'MSFT', tv: 'NASDAQ:MSFT', yahoo: 'MSFT', nameAr: 'مايكروسوفت', nameEn: 'Microsoft Corp.', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'AMZN', tv: 'NASDAQ:AMZN', yahoo: 'AMZN', nameAr: 'أمازون', nameEn: 'Amazon.com Inc.', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'TSLA', tv: 'NASDAQ:TSLA', yahoo: 'TSLA', nameAr: 'تسلا', nameEn: 'Tesla Inc.', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'META', tv: 'NASDAQ:META', yahoo: 'META', nameAr: 'ميتا', nameEn: 'Meta Platforms', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'NVDA', tv: 'NASDAQ:NVDA', yahoo: 'NVDA', nameAr: 'نفيديا', nameEn: 'NVIDIA Corp.', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'AMD', tv: 'NASDAQ:AMD', yahoo: 'AMD', nameAr: 'إيه إم دي', nameEn: 'AMD Inc.', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'NFLX', tv: 'NASDAQ:NFLX', yahoo: 'NFLX', nameAr: 'نتفليكس', nameEn: 'Netflix Inc.', sector: 'Technology', sectorAr: 'التقنية' },
    { symbol: 'UBER', tv: 'NYSE:UBER', yahoo: 'UBER', nameAr: 'أوبر', nameEn: 'Uber Technologies', sector: 'Technology', sectorAr: 'التقنية' },

    // Finance
    { symbol: 'JPM', tv: 'NYSE:JPM', yahoo: 'JPM', nameAr: 'جي بي مورغان', nameEn: 'JPMorgan Chase', sector: 'Finance', sectorAr: 'المالية' },
    { symbol: 'V', tv: 'NYSE:V', yahoo: 'V', nameAr: 'فيزا', nameEn: 'Visa Inc.', sector: 'Finance', sectorAr: 'المالية' },
    { symbol: 'MA', tv: 'NYSE:MA', yahoo: 'MA', nameAr: 'ماستركارد', nameEn: 'Mastercard Inc.', sector: 'Finance', sectorAr: 'المالية' },

    // Consumer
    { symbol: 'KO', tv: 'NYSE:KO', yahoo: 'KO', nameAr: 'كوكاكولا', nameEn: 'Coca-Cola', sector: 'Consumer', sectorAr: 'السلع الاستهلاكية' },
    { symbol: 'PEP', tv: 'NASDAQ:PEP', yahoo: 'PEP', nameAr: 'بيبسي', nameEn: 'PepsiCo Inc.', sector: 'Consumer', sectorAr: 'السلع الاستهلاكية' },
    { symbol: 'MCD', tv: 'NYSE:MCD', yahoo: 'MCD', nameAr: 'ماكدونالدز', nameEn: 'McDonalds Corp.', sector: 'Consumer', sectorAr: 'السلع الاستهلاكية' },
];

// ============================================================
// FOREX PAIRS (العملات)
// ============================================================
const FOREX_PAIRS = [
    { symbol: 'EUR/USD', tv: 'FX:EURUSD', yahoo: 'EURUSD=X', nameAr: 'اليورو/الدولار', nameEn: 'EUR/USD', sector: 'Forex', sectorAr: 'العملات' },
    { symbol: 'GBP/USD', tv: 'FX:GBPUSD', yahoo: 'GBPUSD=X', nameAr: 'الجنيه/الدولار', nameEn: 'GBP/USD', sector: 'Forex', sectorAr: 'العملات' },
    { symbol: 'USD/JPY', tv: 'FX:USDJPY', yahoo: 'USDJPY=X', nameAr: 'الدولار/الين', nameEn: 'USD/JPY', sector: 'Forex', sectorAr: 'العملات' },
    { symbol: 'USD/SAR', tv: 'FX:USDSAR', yahoo: 'SAR=X', nameAr: 'الدولار/الريال', nameEn: 'USD/SAR', sector: 'Forex', sectorAr: 'العملات' },
    { symbol: 'EUR/SAR', tv: 'FX_IDC:EURSAR', yahoo: 'EURSAR=X', nameAr: 'اليورو/الريال', nameEn: 'EUR/SAR', sector: 'Forex', sectorAr: 'العملات' },
    { symbol: 'USD/CHF', tv: 'FX:USDCHF', yahoo: 'USDCHF=X', nameAr: 'الدولار/الفرنك', nameEn: 'USD/CHF', sector: 'Forex', sectorAr: 'العملات' },
    { symbol: 'AUD/USD', tv: 'FX:AUDUSD', yahoo: 'AUDUSD=X', nameAr: 'الأسترالي/الدولار', nameEn: 'AUD/USD', sector: 'Forex', sectorAr: 'العملات' },
];

// ============================================================
// CRYPTOCURRENCIES (العملات الرقمية)
// ============================================================
const CRYPTO = [
    { symbol: 'BTC', tv: 'COINBASE:BTCUSD', yahoo: 'BTC-USD', nameAr: 'بيتكوين', nameEn: 'Bitcoin', sector: 'Crypto', sectorAr: 'العملات الرقمية' },
    { symbol: 'ETH', tv: 'COINBASE:ETHUSD', yahoo: 'ETH-USD', nameAr: 'إيثيريوم', nameEn: 'Ethereum', sector: 'Crypto', sectorAr: 'العملات الرقمية' },
    { symbol: 'XRP', tv: 'COINBASE:XRPUSD', yahoo: 'XRP-USD', nameAr: 'ريبل', nameEn: 'Ripple XRP', sector: 'Crypto', sectorAr: 'العملات الرقمية' },
    { symbol: 'SOL', tv: 'COINBASE:SOLUSD', yahoo: 'SOL-USD', nameAr: 'سولانا', nameEn: 'Solana', sector: 'Crypto', sectorAr: 'العملات الرقمية' },
    { symbol: 'BNB', tv: 'BINANCE:BNBUSD', yahoo: 'BNB-USD', nameAr: 'بينانس', nameEn: 'BNB', sector: 'Crypto', sectorAr: 'العملات الرقمية' },
    { symbol: 'ADA', tv: 'COINBASE:ADAUSD', yahoo: 'ADA-USD', nameAr: 'كاردانو', nameEn: 'Cardano', sector: 'Crypto', sectorAr: 'العملات الرقمية' },
    { symbol: 'DOGE', tv: 'COINBASE:DOGEUSD', yahoo: 'DOGE-USD', nameAr: 'دوجكوين', nameEn: 'Dogecoin', sector: 'Crypto', sectorAr: 'العملات الرقمية' },
];

// ============================================================
// COMMODITIES (السلع)
// ============================================================
const COMMODITIES = [
    { symbol: 'GOLD', tv: 'COMEX:GC1!', yahoo: 'GC=F', nameAr: 'الذهب', nameEn: 'Gold Futures', sector: 'Commodities', sectorAr: 'السلع' },
    { symbol: 'SILVER', tv: 'COMEX:SI1!', yahoo: 'SI=F', nameAr: 'الفضة', nameEn: 'Silver Futures', sector: 'Commodities', sectorAr: 'السلع' },
    { symbol: 'OIL', tv: 'NYMEX:CL1!', yahoo: 'CL=F', nameAr: 'النفط الخام', nameEn: 'Crude Oil WTI', sector: 'Commodities', sectorAr: 'السلع' },
    { symbol: 'BRENT', tv: 'NYMEX:BZ1!', yahoo: 'BZ=F', nameAr: 'نفط برنت', nameEn: 'Brent Crude Oil', sector: 'Commodities', sectorAr: 'السلع' },
    { symbol: 'NATGAS', tv: 'NYMEX:NG1!', yahoo: 'NG=F', nameAr: 'الغاز الطبيعي', nameEn: 'Natural Gas', sector: 'Commodities', sectorAr: 'السلع' },
    { symbol: 'COPPER', tv: 'COMEX:HG1!', yahoo: 'HG=F', nameAr: 'النحاس', nameEn: 'Copper Futures', sector: 'Commodities', sectorAr: 'السلع' },
    { symbol: 'PLATINUM', tv: 'NYMEX:PL1!', yahoo: 'PL=F', nameAr: 'البلاتين', nameEn: 'Platinum Futures', sector: 'Commodities', sectorAr: 'السلع' },
];

// ============================================================
// ALL SYMBOLS COMBINED
// ============================================================
const ALL_SYMBOLS = [
    ...SAUDI_STOCKS.map(s => ({ ...s, market: 'tadawul', type: 'stock' })),
    ...SAUDI_REITS.map(s => ({ ...s, market: 'tadawul', type: 'reit' })),
    ...SAUDI_ETFS.map(s => ({ ...s, market: 'tadawul', type: 'etf' })),
    ...INTERNATIONAL_STOCKS.map(s => ({ ...s, market: 'us', type: 'stock' })),
    ...FOREX_PAIRS.map(s => ({ ...s, market: 'forex', type: 'forex' })),
    ...CRYPTO.map(s => ({ ...s, market: 'crypto', type: 'crypto' })),
    ...COMMODITIES.map(s => ({ ...s, market: 'commodities', type: 'commodity' })),
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Find symbol by symbol code
 */
function findSymbol(symbolCode) {
    return ALL_SYMBOLS.find(s =>
        s.symbol.toLowerCase() === symbolCode.toLowerCase()
    );
}

/**
 * Search symbols by query
 */
function searchSymbols(query, options = {}) {
    const { market, type, limit = 20 } = options;
    const q = query.toLowerCase();

    let results = ALL_SYMBOLS;

    // Filter by market
    if (market && market !== 'all') {
        results = results.filter(s => s.market === market);
    }

    // Filter by type
    if (type && type !== 'all') {
        results = results.filter(s => s.type === type);
    }

    // Search by query
    if (q) {
        results = results.filter(s =>
            s.symbol.toLowerCase().includes(q) ||
            s.nameAr.includes(q) ||
            s.nameEn.toLowerCase().includes(q) ||
            s.sector.toLowerCase().includes(q) ||
            s.sectorAr.includes(q)
        );
    }

    return results.slice(0, limit);
}

/**
 * Get symbols by market
 */
function getSymbolsByMarket(market) {
    return ALL_SYMBOLS.filter(s => s.market === market);
}

/**
 * Get symbols by type
 */
function getSymbolsByType(type) {
    return ALL_SYMBOLS.filter(s => s.type === type);
}

module.exports = {
    SAUDI_STOCKS,
    SAUDI_REITS,
    SAUDI_ETFS,
    INTERNATIONAL_STOCKS,
    FOREX_PAIRS,
    CRYPTO,
    COMMODITIES,
    ALL_SYMBOLS,
    findSymbol,
    searchSymbols,
    getSymbolsByMarket,
    getSymbolsByType
};
