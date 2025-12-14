/**
 * Case Constants
 *
 * Centralized constants for case management including courts, committees,
 * arbitration centers, regions, and validation patterns.
 */

// ═══════════════════════════════════════════════════════════════
// ENTITY TYPES (نوع الجهة)
// ═══════════════════════════════════════════════════════════════
const ENTITY_TYPES = {
    court: 'court',
    committee: 'committee',
    arbitration: 'arbitration'
};

const ENTITY_TYPE_LABELS = {
    court: 'محكمة',
    committee: 'لجنة شبه قضائية',
    arbitration: 'مركز تحكيم'
};

// ═══════════════════════════════════════════════════════════════
// COURTS (المحاكم)
// ═══════════════════════════════════════════════════════════════
const COURTS = {
    general: 'general',
    criminal: 'criminal',
    commercial: 'commercial',
    labor: 'labor',
    family: 'family',
    execution: 'execution',
    administrative: 'administrative',
    administrative_appeal: 'administrative_appeal',
    appeal: 'appeal',
    supreme: 'supreme'
};

const COURT_LABELS = {
    general: 'المحكمة العامة',
    criminal: 'المحكمة الجزائية',
    commercial: 'المحكمة التجارية',
    labor: 'المحكمة العمالية',
    family: 'محكمة الأحوال الشخصية',
    execution: 'محكمة التنفيذ',
    administrative: 'المحكمة الإدارية (ديوان المظالم)',
    administrative_appeal: 'محكمة الاستئناف الإدارية',
    appeal: 'محكمة الاستئناف',
    supreme: 'المحكمة العليا'
};

// ═══════════════════════════════════════════════════════════════
// COMMITTEES (اللجان شبه القضائية)
// ═══════════════════════════════════════════════════════════════
const COMMITTEES = {
    banking: 'banking',
    securities: 'securities',
    insurance: 'insurance',
    customs: 'customs',
    tax: 'tax',
    zakat: 'zakat',
    real_estate: 'real_estate',
    competition: 'competition',
    capital_market: 'capital_market',
    intellectual_property: 'intellectual_property'
};

const COMMITTEE_LABELS = {
    banking: 'لجنة المنازعات المصرفية',
    securities: 'لجنة الفصل في منازعات الأوراق المالية',
    insurance: 'لجنة الفصل في المنازعات والمخالفات التأمينية',
    customs: 'لجنة الفصل في المخالفات والمنازعات الجمركية',
    tax: 'لجنة الفصل في المخالفات والمنازعات الضريبية',
    zakat: 'لجنة الفصل في المخالفات والمنازعات الزكوية',
    real_estate: 'لجنة النزاعات العقارية',
    competition: 'لجنة الفصل في مخالفات نظام المنافسة',
    capital_market: 'لجنة الفصل في منازعات هيئة السوق المالية',
    intellectual_property: 'لجنة النظر في مخالفات الملكية الفكرية'
};

// ═══════════════════════════════════════════════════════════════
// ARBITRATION CENTERS (مراكز التحكيم)
// ═══════════════════════════════════════════════════════════════
const ARBITRATION_CENTERS = {
    scca: 'scca',
    sba_arbitration: 'sba_arbitration',
    riyadh_chamber: 'riyadh_chamber',
    jeddah_chamber: 'jeddah_chamber',
    eastern_chamber: 'eastern_chamber',
    gcc_commercial: 'gcc_commercial',
    other: 'other'
};

const ARBITRATION_CENTER_LABELS = {
    scca: 'المركز السعودي للتحكيم التجاري (SCCA)',
    sba_arbitration: 'مركز هيئة المحامين للتسوية والتحكيم',
    riyadh_chamber: 'مركز تحكيم الغرفة التجارية بالرياض',
    jeddah_chamber: 'مركز تحكيم الغرفة التجارية بجدة',
    eastern_chamber: 'مركز تحكيم الغرفة التجارية بالشرقية',
    gcc_commercial: 'مركز التحكيم التجاري لدول الخليج',
    other: 'مركز تحكيم آخر'
};

// ═══════════════════════════════════════════════════════════════
// SAUDI REGIONS (المناطق الإدارية)
// ═══════════════════════════════════════════════════════════════
const REGIONS = {
    riyadh: 'riyadh',
    makkah: 'makkah',
    madinah: 'madinah',
    qassim: 'qassim',
    eastern: 'eastern',
    asir: 'asir',
    tabuk: 'tabuk',
    hail: 'hail',
    northern: 'northern',
    jazan: 'jazan',
    najran: 'najran',
    baha: 'baha',
    jawf: 'jawf'
};

const REGION_LABELS = {
    riyadh: 'منطقة الرياض',
    makkah: 'منطقة مكة المكرمة',
    madinah: 'منطقة المدينة المنورة',
    qassim: 'منطقة القصيم',
    eastern: 'المنطقة الشرقية',
    asir: 'منطقة عسير',
    tabuk: 'منطقة تبوك',
    hail: 'منطقة حائل',
    northern: 'منطقة الحدود الشمالية',
    jazan: 'منطقة جازان',
    najran: 'منطقة نجران',
    baha: 'منطقة الباحة',
    jawf: 'منطقة الجوف'
};

const REGION_CITIES = {
    riyadh: ['الرياض', 'الخرج', 'الدوادمي', 'المجمعة', 'الزلفي', 'وادي الدواسر', 'الأفلاج', 'حوطة بني تميم', 'عفيف', 'السليل', 'ضرماء', 'المزاحمية', 'رماح', 'ثادق', 'حريملاء', 'الحريق', 'الغاط', 'مرات', 'الدرعية'],
    makkah: ['مكة المكرمة', 'جدة', 'الطائف', 'القنفذة', 'الليث', 'رابغ', 'خليص', 'الجموم', 'الكامل', 'تربة', 'الخرمة', 'رنية', 'الموية'],
    madinah: ['المدينة المنورة', 'ينبع', 'العلا', 'المهد', 'الحناكية', 'بدر', 'خيبر', 'العيص', 'وادي الفرع'],
    qassim: ['بريدة', 'عنيزة', 'الرس', 'البدائع', 'البكيرية', 'الأسياح', 'المذنب', 'رياض الخبراء', 'عيون الجواء', 'الشماسية', 'عقلة الصقور', 'ضرية', 'النبهانية'],
    eastern: ['الدمام', 'الأحساء', 'الخبر', 'الجبيل', 'حفر الباطن', 'القطيف', 'الظهران', 'رأس تنورة', 'بقيق', 'الخفجي', 'النعيرية', 'قرية العليا', 'العديد'],
    asir: ['أبها', 'خميس مشيط', 'بيشة', 'النماص', 'محايل', 'ظهران الجنوب', 'تثليث', 'سراة عبيدة', 'رجال ألمع', 'أحد رفيدة', 'بلقرن', 'المجاردة', 'تنومة', 'البرك'],
    tabuk: ['تبوك', 'الوجه', 'ضباء', 'تيماء', 'أملج', 'حقل', 'البدع'],
    hail: ['حائل', 'بقعاء', 'الشنان', 'الغزالة', 'الشملي', 'موقق', 'السليمي'],
    northern: ['عرعر', 'رفحاء', 'طريف', 'العويقيلة'],
    jazan: ['جازان', 'صبيا', 'أبو عريش', 'صامطة', 'بيش', 'الدرب', 'فرسان', 'الريث', 'ضمد', 'الحرث', 'هروب', 'فيفاء', 'العارضة', 'أحد المسارحة', 'الطوال', 'العيدابي'],
    najran: ['نجران', 'شرورة', 'حبونا', 'بدر الجنوب', 'يدمة', 'ثار', 'خباش'],
    baha: ['الباحة', 'بلجرشي', 'المندق', 'المخواة', 'قلوة', 'العقيق', 'غامد الزناد', 'الحجرة', 'بني حسن', 'القرى'],
    jawf: ['سكاكا', 'دومة الجندل', 'القريات', 'طبرجل', 'صوير']
};

// ═══════════════════════════════════════════════════════════════
// CASE CATEGORIES (تصنيفات القضايا)
// ═══════════════════════════════════════════════════════════════
const CASE_CATEGORIES = {
    labor: 'labor',
    commercial: 'commercial',
    civil: 'civil',
    criminal: 'criminal',
    family: 'family',
    administrative: 'administrative',
    other: 'other'
};

const CASE_CATEGORY_LABELS = {
    labor: 'عمالية',
    commercial: 'تجارية',
    civil: 'مدنية',
    criminal: 'جزائية',
    family: 'أحوال شخصية',
    administrative: 'إدارية',
    other: 'أخرى'
};

const CASE_SUB_CATEGORIES = {
    labor: {
        wages: 'أجور ومستحقات',
        termination: 'فصل تعسفي',
        end_of_service: 'مكافأة نهاية الخدمة',
        work_injury: 'إصابات عمل',
        vacation: 'إجازات',
        contract_dispute: 'نزاع عقد عمل'
    },
    commercial: {
        contract: 'نزاعات العقود',
        partnership: 'نزاعات الشراكة',
        debt: 'مطالبات مالية',
        insurance: 'تأمين',
        banking: 'مصرفية',
        cheque: 'شيكات'
    },
    civil: {
        property: 'عقارات',
        compensation: 'تعويضات',
        contract: 'عقود',
        tort: 'ضرر'
    },
    criminal: {
        fraud: 'احتيال',
        embezzlement: 'اختلاس',
        defamation: 'قذف وسب',
        other: 'أخرى'
    },
    family: {
        divorce: 'طلاق',
        custody: 'حضانة',
        alimony: 'نفقة',
        inheritance: 'إرث',
        marriage: 'زواج'
    },
    administrative: {
        gov_contract: 'عقود حكومية',
        employee_dispute: 'نزاعات موظفين',
        decision_appeal: 'طعن في قرار'
    },
    other: {}
};

// ═══════════════════════════════════════════════════════════════
// CLAIM TYPES (أنواع المطالبات)
// ═══════════════════════════════════════════════════════════════
const CLAIM_TYPES = {
    wages: 'wages',
    end_of_service: 'end_of_service',
    vacation_allowance: 'vacation_allowance',
    overtime: 'overtime',
    transportation: 'transportation',
    housing: 'housing',
    compensation: 'compensation',
    financial_claim: 'financial_claim',
    other: 'other'
};

const CLAIM_TYPE_LABELS = {
    wages: 'أجور متأخرة',
    end_of_service: 'مكافأة نهاية الخدمة',
    vacation_allowance: 'بدل إجازات',
    overtime: 'ساعات إضافية',
    transportation: 'بدل نقل',
    housing: 'بدل سكن',
    compensation: 'تعويض',
    financial_claim: 'مطالبة مالية',
    other: 'أخرى'
};

// ═══════════════════════════════════════════════════════════════
// POWER OF ATTORNEY SCOPE (نطاق الوكالة)
// ═══════════════════════════════════════════════════════════════
const POA_SCOPE = {
    general: 'general',
    specific: 'specific',
    litigation: 'litigation'
};

const POA_SCOPE_LABELS = {
    general: 'وكالة عامة',
    specific: 'وكالة خاصة',
    litigation: 'وكالة خصومة'
};

// ═══════════════════════════════════════════════════════════════
// PARTY TYPES (أنواع الأطراف)
// ═══════════════════════════════════════════════════════════════
const PARTY_TYPES = {
    individual: 'individual',
    company: 'company',
    government: 'government'
};

const PARTY_TYPE_LABELS = {
    individual: 'شخص طبيعي',
    company: 'شخص اعتباري (شركة/مؤسسة)',
    government: 'جهة حكومية'
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION PATTERNS
// ═══════════════════════════════════════════════════════════════
const VALIDATION_PATTERNS = {
    // Saudi National ID (رقم الهوية) - 10 digits, starts with 1 (Saudi) or 2 (Resident)
    nationalId: /^[12]\d{9}$/,

    // Unified National Number for establishments (الرقم الوطني الموحد للمنشأة)
    // 10 digits, starts with 7
    unifiedNumber: /^7\d{9}$/,

    // Commercial Registration Number (السجل التجاري) - 10 digits
    crNumber: /^\d{10}$/,

    // Saudi Phone Number
    saudiPhone: /^(\+966|966|0)?5\d{8}$/,

    // Email validation
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

    // Internal reference format: YYYY/XXXX
    internalReference: /^\d{4}\/\d{4}$/
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION MESSAGES
// ═══════════════════════════════════════════════════════════════
const VALIDATION_MESSAGES = {
    unifiedNumber: {
        ar: 'الرقم الوطني الموحد يجب أن يبدأ بـ 7 ويتكون من 10 أرقام',
        en: 'Unified national number must start with 7 and be exactly 10 digits'
    },
    nationalId: {
        ar: 'رقم الهوية يجب أن يبدأ بـ 1 أو 2 ويتكون من 10 أرقام',
        en: 'National ID must start with 1 or 2 and be exactly 10 digits'
    },
    crNumber: {
        ar: 'رقم السجل التجاري يجب أن يتكون من 10 أرقام',
        en: 'Commercial registration number must be exactly 10 digits'
    },
    arbitrationCenterRequired: {
        ar: 'يجب اختيار مركز التحكيم',
        en: 'Arbitration center is required'
    },
    courtRequired: {
        ar: 'يجب اختيار المحكمة',
        en: 'Court is required'
    },
    committeeRequired: {
        ar: 'يجب اختيار اللجنة',
        en: 'Committee is required'
    }
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate unified national number format
 * @param {string} number - The unified number to validate
 * @returns {boolean} - True if valid
 */
const validateUnifiedNumber = (number) => {
    if (!number) return true; // Optional field
    return VALIDATION_PATTERNS.unifiedNumber.test(number);
};

/**
 * Validate national ID format
 * @param {string} id - The national ID to validate
 * @returns {boolean} - True if valid
 */
const validateNationalId = (id) => {
    if (!id) return true; // Optional field
    return VALIDATION_PATTERNS.nationalId.test(id);
};

/**
 * Validate commercial registration number format
 * @param {string} number - The CR number to validate
 * @returns {boolean} - True if valid
 */
const validateCrNumber = (number) => {
    if (!number) return true; // Optional field
    return VALIDATION_PATTERNS.crNumber.test(number);
};

/**
 * Get label for a given entity type, court, committee, etc.
 * @param {string} type - The lookup type ('court', 'committee', 'arbitration', 'region', etc.)
 * @param {string} value - The value to look up
 * @returns {string} - The Arabic label or the original value if not found
 */
const getLabel = (type, value) => {
    if (!value) return '';

    const labelMaps = {
        entityType: ENTITY_TYPE_LABELS,
        court: COURT_LABELS,
        committee: COMMITTEE_LABELS,
        arbitrationCenter: ARBITRATION_CENTER_LABELS,
        region: REGION_LABELS,
        category: CASE_CATEGORY_LABELS,
        claimType: CLAIM_TYPE_LABELS,
        poaScope: POA_SCOPE_LABELS,
        partyType: PARTY_TYPE_LABELS
    };

    const labelMap = labelMaps[type];
    return labelMap ? (labelMap[value] || value) : value;
};

/**
 * Get cities for a given region
 * @param {string} region - The region key
 * @returns {string[]} - Array of city names
 */
const getCitiesForRegion = (region) => {
    return REGION_CITIES[region] || [];
};

/**
 * Get sub-categories for a given case category
 * @param {string} category - The case category key
 * @returns {object} - Object with sub-category keys and labels
 */
const getSubCategories = (category) => {
    return CASE_SUB_CATEGORIES[category] || {};
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════
module.exports = {
    // Entity Types
    ENTITY_TYPES,
    ENTITY_TYPE_LABELS,

    // Courts
    COURTS,
    COURT_LABELS,

    // Committees
    COMMITTEES,
    COMMITTEE_LABELS,

    // Arbitration Centers
    ARBITRATION_CENTERS,
    ARBITRATION_CENTER_LABELS,

    // Regions
    REGIONS,
    REGION_LABELS,
    REGION_CITIES,

    // Case Categories
    CASE_CATEGORIES,
    CASE_CATEGORY_LABELS,
    CASE_SUB_CATEGORIES,

    // Claim Types
    CLAIM_TYPES,
    CLAIM_TYPE_LABELS,

    // POA Scope
    POA_SCOPE,
    POA_SCOPE_LABELS,

    // Party Types
    PARTY_TYPES,
    PARTY_TYPE_LABELS,

    // Validation
    VALIDATION_PATTERNS,
    VALIDATION_MESSAGES,

    // Helper Functions
    validateUnifiedNumber,
    validateNationalId,
    validateCrNumber,
    getLabel,
    getCitiesForRegion,
    getSubCategories
};
