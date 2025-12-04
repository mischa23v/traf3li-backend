/**
 * Smart Categorization Utility
 *
 * Auto-suggests expense categories based on description keywords.
 * Supports both Arabic and English descriptions.
 */

/**
 * Category definitions with keywords and account codes
 */
const categoryDefinitions = {
    // Office & Administrative
    office_rent: {
        keywords: [
            'إيجار', 'ايجار', 'rent', 'إيجار مكتب', 'office rent', 'أجرة',
            'إيجار شهري', 'monthly rent', 'عقد إيجار', 'lease'
        ],
        accountCode: '5201',
        nameEn: 'Office Rent',
        nameAr: 'إيجار المكتب',
        confidence: 0.95
    },
    utilities: {
        keywords: [
            'كهرباء', 'electricity', 'ماء', 'water', 'فاتورة كهرباء', 'فاتورة ماء',
            'utility', 'utilities', 'فواتير', 'bills', 'غاز', 'gas', 'انترنت', 'internet',
            'اتصالات', 'stc', 'موبايلي', 'mobily', 'زين', 'zain'
        ],
        accountCode: '5210',
        nameEn: 'Utilities',
        nameAr: 'المرافق',
        confidence: 0.90
    },
    office_supplies: {
        keywords: [
            'قرطاسية', 'stationery', 'مستلزمات', 'supplies', 'أوراق', 'paper',
            'حبر', 'ink', 'طابعة', 'printer', 'أقلام', 'pens', 'مكتبية',
            'office supplies', 'ملفات', 'folders', 'دباسة', 'stapler'
        ],
        accountCode: '5203',
        nameEn: 'Office Supplies',
        nameAr: 'مستلزمات مكتبية',
        confidence: 0.85
    },

    // Travel & Transportation
    travel: {
        keywords: [
            'سفر', 'travel', 'رحلة', 'trip', 'طيران', 'flight', 'فندق', 'hotel',
            'إقامة', 'accommodation', 'حجز', 'booking', 'تذكرة', 'ticket',
            'سفرية', 'business trip', 'مطار', 'airport'
        ],
        accountCode: '5300',
        nameEn: 'Travel',
        nameAr: 'سفر',
        confidence: 0.90
    },
    transport: {
        keywords: [
            'مواصلات', 'transport', 'تاكسي', 'taxi', 'أوبر', 'uber', 'كريم', 'careem',
            'بنزين', 'petrol', 'gasoline', 'fuel', 'وقود', 'parking', 'مواقف',
            'سيارة', 'car', 'نقل', 'transportation', 'أجرة'
        ],
        accountCode: '5301',
        nameEn: 'Transportation',
        nameAr: 'مواصلات',
        confidence: 0.85
    },

    // Court & Legal
    court_fees: {
        keywords: [
            'رسوم محكمة', 'court fees', 'رسوم قضائية', 'judicial fees', 'محكمة',
            'court', 'دعوى', 'case filing', 'رسوم تنفيذ', 'execution fees',
            'رسوم استئناف', 'appeal fees', 'ناجز', 'najiz', 'وزارة العدل',
            'ministry of justice', 'تسجيل دعوى', 'رسم', 'طلب تنفيذ'
        ],
        accountCode: '5401',
        nameEn: 'Court Fees',
        nameAr: 'رسوم المحكمة',
        confidence: 0.95
    },
    legal_research: {
        keywords: [
            'بحث قانوني', 'legal research', 'مراجع', 'references', 'كتب قانونية',
            'legal books', 'اشتراك قانوني', 'legal subscription', 'westlaw',
            'lexis', 'مكتبة', 'library'
        ],
        accountCode: '5402',
        nameEn: 'Legal Research',
        nameAr: 'بحث قانوني',
        confidence: 0.85
    },

    // Professional Services
    professional_services: {
        keywords: [
            'استشارات', 'consulting', 'خدمات مهنية', 'professional services',
            'محاسب', 'accountant', 'مراجع', 'auditor', 'خبير', 'expert',
            'مترجم', 'translator', 'ترجمة', 'translation', 'توثيق', 'notary',
            'كاتب عدل', 'شهادة خبير'
        ],
        accountCode: '5400',
        nameEn: 'Professional Services',
        nameAr: 'خدمات مهنية',
        confidence: 0.85
    },

    // Technology & Software
    software: {
        keywords: [
            'برامج', 'software', 'اشتراك', 'subscription', 'تطبيق', 'app',
            'microsoft', 'مايكروسوفت', 'office 365', 'adobe', 'أدوبي',
            'google', 'جوجل', 'zoom', 'slack', 'dropbox', 'cloud', 'سحابة',
            'hosting', 'استضافة', 'domain', 'نطاق', 'saas'
        ],
        accountCode: '5204',
        nameEn: 'Software & Subscriptions',
        nameAr: 'برامج واشتراكات',
        confidence: 0.90
    },
    equipment: {
        keywords: [
            'أجهزة', 'equipment', 'كمبيوتر', 'computer', 'لابتوب', 'laptop',
            'طابعة', 'printer', 'ماسح', 'scanner', 'شاشة', 'monitor',
            'هاتف', 'phone', 'جوال', 'mobile', 'آيفون', 'iphone', 'سامسونج'
        ],
        accountCode: '5205',
        nameEn: 'Equipment',
        nameAr: 'أجهزة ومعدات',
        confidence: 0.85
    },

    // Food & Entertainment
    meals: {
        keywords: [
            'وجبات', 'meals', 'غداء', 'lunch', 'عشاء', 'dinner', 'فطور', 'breakfast',
            'مطعم', 'restaurant', 'قهوة', 'coffee', 'كافيه', 'cafe', 'ضيافة',
            'hospitality', 'اجتماع عمل', 'business meeting', 'طعام', 'food'
        ],
        accountCode: '5303',
        nameEn: 'Meals & Entertainment',
        nameAr: 'وجبات وضيافة',
        confidence: 0.80
    },

    // Marketing & Advertising
    marketing: {
        keywords: [
            'إعلان', 'advertising', 'تسويق', 'marketing', 'دعاية', 'promotion',
            'فيسبوك', 'facebook', 'انستقرام', 'instagram', 'جوجل', 'google ads',
            'لينكدإن', 'linkedin', 'سناب', 'snapchat', 'تويتر', 'twitter',
            'حملة إعلانية', 'ad campaign', 'بروشور', 'brochure'
        ],
        accountCode: '5500',
        nameEn: 'Marketing & Advertising',
        nameAr: 'تسويق وإعلان',
        confidence: 0.85
    },

    // Insurance
    insurance: {
        keywords: [
            'تأمين', 'insurance', 'تأمين طبي', 'health insurance', 'تأمين سيارة',
            'car insurance', 'تأمين مكتب', 'office insurance', 'بوليصة', 'policy',
            'تامين', 'bupa', 'بوبا', 'تكافل', 'takaful', 'medgulf'
        ],
        accountCode: '5206',
        nameEn: 'Insurance',
        nameAr: 'تأمين',
        confidence: 0.90
    },

    // Salaries & HR
    salaries: {
        keywords: [
            'راتب', 'salary', 'رواتب', 'salaries', 'أجور', 'wages', 'مكافأة',
            'bonus', 'عمولة', 'commission', 'تأمينات اجتماعية', 'gosi',
            'نهاية خدمة', 'end of service', 'بدلات', 'allowances'
        ],
        accountCode: '5100',
        nameEn: 'Salaries & Wages',
        nameAr: 'رواتب وأجور',
        confidence: 0.95
    },

    // Training & Development
    training: {
        keywords: [
            'تدريب', 'training', 'دورة', 'course', 'ورشة', 'workshop',
            'مؤتمر', 'conference', 'ندوة', 'seminar', 'تطوير', 'development',
            'شهادة', 'certification', 'تعليم', 'education'
        ],
        accountCode: '5207',
        nameEn: 'Training & Development',
        nameAr: 'تدريب وتطوير',
        confidence: 0.85
    },

    // Maintenance
    maintenance: {
        keywords: [
            'صيانة', 'maintenance', 'إصلاح', 'repair', 'تصليح', 'fix',
            'تكييف', 'ac', 'air conditioning', 'نظافة', 'cleaning',
            'سباكة', 'plumbing', 'كهربائي', 'electrician'
        ],
        accountCode: '5208',
        nameEn: 'Maintenance & Repairs',
        nameAr: 'صيانة وإصلاحات',
        confidence: 0.85
    },

    // Bank Charges
    bank_charges: {
        keywords: [
            'رسوم بنكية', 'bank charges', 'عمولة بنكية', 'bank fees',
            'تحويل', 'transfer fee', 'رسوم حساب', 'account fees',
            'رسوم بطاقة', 'card fees', 'رسوم سحب', 'withdrawal fees'
        ],
        accountCode: '5209',
        nameEn: 'Bank Charges',
        nameAr: 'رسوم بنكية',
        confidence: 0.90
    },

    // Government Fees
    government_fees: {
        keywords: [
            'رسوم حكومية', 'government fees', 'تجديد رخصة', 'license renewal',
            'رخصة تجارية', 'commercial license', 'سجل تجاري', 'cr',
            'commercial registration', 'غرفة تجارية', 'chamber of commerce',
            'بلدية', 'municipality', 'وزارة', 'ministry', 'تصريح', 'permit'
        ],
        accountCode: '5403',
        nameEn: 'Government Fees',
        nameAr: 'رسوم حكومية',
        confidence: 0.90
    },

    // Other/Miscellaneous
    other: {
        keywords: [],
        accountCode: '5600',
        nameEn: 'Other Expenses',
        nameAr: 'مصروفات أخرى',
        confidence: 0.50
    }
};

/**
 * Normalize text for matching
 * - Lowercase
 * - Remove diacritics (Arabic tashkeel)
 * - Normalize Arabic letters
 */
function normalizeText(text) {
    if (!text) return '';

    return text
        .toLowerCase()
        .trim()
        // Remove Arabic diacritics
        .replace(/[\u064B-\u065F\u0670]/g, '')
        // Normalize Arabic letters
        .replace(/[أإآا]/g, 'ا')
        .replace(/[ىي]/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي');
}

/**
 * Calculate match score for a category
 */
function calculateMatchScore(description, category) {
    const normalizedDesc = normalizeText(description);
    const words = normalizedDesc.split(/\s+/);

    let matchCount = 0;
    let totalKeywords = category.keywords.length;
    let exactMatch = false;

    for (const keyword of category.keywords) {
        const normalizedKeyword = normalizeText(keyword);

        // Exact phrase match (highest priority)
        if (normalizedDesc.includes(normalizedKeyword)) {
            matchCount += 2;
            if (normalizedDesc === normalizedKeyword) {
                exactMatch = true;
            }
        }

        // Word-level match
        for (const word of words) {
            if (word === normalizedKeyword || normalizedKeyword.includes(word)) {
                matchCount += 1;
            }
        }
    }

    if (totalKeywords === 0) return 0;

    // Calculate score (0-1)
    let score = matchCount / (totalKeywords * 2);

    // Bonus for exact match
    if (exactMatch) score = Math.min(1, score + 0.3);

    // Apply category confidence factor
    score *= category.confidence;

    return Math.min(1, score);
}

/**
 * Suggest category based on description
 * @param {string} description - Expense description
 * @returns {Object} Suggested category with confidence score
 */
function suggestCategory(description) {
    if (!description || description.trim().length === 0) {
        return {
            category: 'other',
            ...categoryDefinitions.other,
            confidence: 0,
            suggestions: []
        };
    }

    const scores = [];

    for (const [categoryKey, categoryDef] of Object.entries(categoryDefinitions)) {
        if (categoryKey === 'other') continue;

        const score = calculateMatchScore(description, categoryDef);
        if (score > 0.1) {
            scores.push({
                category: categoryKey,
                ...categoryDef,
                score
            });
        }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Get top suggestion
    const topSuggestion = scores[0] || {
        category: 'other',
        ...categoryDefinitions.other,
        score: 0.5
    };

    // Get alternative suggestions (top 3)
    const alternatives = scores.slice(1, 4).map(s => ({
        category: s.category,
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        accountCode: s.accountCode,
        confidence: Math.round(s.score * 100)
    }));

    return {
        category: topSuggestion.category,
        nameEn: topSuggestion.nameEn,
        nameAr: topSuggestion.nameAr,
        accountCode: topSuggestion.accountCode,
        confidence: Math.round(topSuggestion.score * 100),
        suggestions: alternatives
    };
}

/**
 * Suggest categories for multiple descriptions (batch)
 * @param {string[]} descriptions - Array of expense descriptions
 * @returns {Object[]} Array of suggestions
 */
function suggestCategoriesBatch(descriptions) {
    return descriptions.map(desc => ({
        description: desc,
        suggestion: suggestCategory(desc)
    }));
}

/**
 * Get all available categories
 * @returns {Object[]} List of all categories
 */
function getAllCategories() {
    return Object.entries(categoryDefinitions).map(([key, def]) => ({
        category: key,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        accountCode: def.accountCode
    }));
}

/**
 * Get category by key
 * @param {string} categoryKey - Category key
 * @returns {Object|null} Category definition
 */
function getCategory(categoryKey) {
    const def = categoryDefinitions[categoryKey];
    if (!def) return null;

    return {
        category: categoryKey,
        nameEn: def.nameEn,
        nameAr: def.nameAr,
        accountCode: def.accountCode
    };
}

/**
 * Map legacy category names to new categories
 */
const legacyCategoryMap = {
    'office_supplies': 'office_supplies',
    'travel': 'travel',
    'court_fees': 'court_fees',
    'professional_services': 'professional_services',
    'software': 'software',
    'communication': 'utilities',
    'transport': 'transport',
    'meals': 'meals',
    'other': 'other'
};

/**
 * Get account code for a category
 * @param {string} category - Category key
 * @returns {string} Account code
 */
function getAccountCodeForCategory(category) {
    const mappedCategory = legacyCategoryMap[category] || category;
    const def = categoryDefinitions[mappedCategory];
    return def ? def.accountCode : '5600'; // Default to "Other Expenses"
}

module.exports = {
    suggestCategory,
    suggestCategoriesBatch,
    getAllCategories,
    getCategory,
    getAccountCodeForCategory,
    categoryDefinitions
};
