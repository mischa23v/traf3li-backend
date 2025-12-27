const mongoose = require('mongoose');

// Helper function to escape regex special characters
const escapeRegex = (str) => {
    if (typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════════════════════
// SAUDI ARABIA ADMINISTRATIVE DATA - NAJIZ INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

// 13 Saudi Administrative Regions (المناطق الإدارية)
const SAUDI_REGIONS = [
    { code: '01', nameAr: 'منطقة الرياض', nameEn: 'Riyadh Region', capitalAr: 'الرياض', capitalEn: 'Riyadh' },
    { code: '02', nameAr: 'منطقة مكة المكرمة', nameEn: 'Makkah Region', capitalAr: 'مكة المكرمة', capitalEn: 'Makkah' },
    { code: '03', nameAr: 'منطقة المدينة المنورة', nameEn: 'Madinah Region', capitalAr: 'المدينة المنورة', capitalEn: 'Madinah' },
    { code: '04', nameAr: 'منطقة القصيم', nameEn: 'Al-Qassim Region', capitalAr: 'بريدة', capitalEn: 'Buraidah' },
    { code: '05', nameAr: 'المنطقة الشرقية', nameEn: 'Eastern Region', capitalAr: 'الدمام', capitalEn: 'Dammam' },
    { code: '06', nameAr: 'منطقة عسير', nameEn: 'Asir Region', capitalAr: 'أبها', capitalEn: 'Abha' },
    { code: '07', nameAr: 'منطقة تبوك', nameEn: 'Tabuk Region', capitalAr: 'تبوك', capitalEn: 'Tabuk' },
    { code: '08', nameAr: 'منطقة حائل', nameEn: 'Hail Region', capitalAr: 'حائل', capitalEn: 'Hail' },
    { code: '09', nameAr: 'منطقة الحدود الشمالية', nameEn: 'Northern Borders Region', capitalAr: 'عرعر', capitalEn: 'Arar' },
    { code: '10', nameAr: 'منطقة جازان', nameEn: 'Jazan Region', capitalAr: 'جازان', capitalEn: 'Jazan' },
    { code: '11', nameAr: 'منطقة نجران', nameEn: 'Najran Region', capitalAr: 'نجران', capitalEn: 'Najran' },
    { code: '12', nameAr: 'منطقة الباحة', nameEn: 'Al-Bahah Region', capitalAr: 'الباحة', capitalEn: 'Al-Bahah' },
    { code: '13', nameAr: 'منطقة الجوف', nameEn: 'Al-Jawf Region', capitalAr: 'سكاكا', capitalEn: 'Sakakah' }
];

// Region codes for enum validation
const REGION_CODES = SAUDI_REGIONS.map(r => r.code);

// Cities by Region (131 major cities)
const SAUDI_CITIES_BY_REGION = {
    '01': [ // Riyadh
        { nameAr: 'الرياض', nameEn: 'Riyadh' },
        { nameAr: 'الخرج', nameEn: 'Al-Kharj' },
        { nameAr: 'الدوادمي', nameEn: 'Al-Dawadmi' },
        { nameAr: 'المجمعة', nameEn: 'Al-Majmaah' },
        { nameAr: 'الزلفي', nameEn: 'Al-Zulfi' },
        { nameAr: 'شقراء', nameEn: 'Shaqra' },
        { nameAr: 'عفيف', nameEn: 'Afif' },
        { nameAr: 'وادي الدواسر', nameEn: 'Wadi Al-Dawasir' },
        { nameAr: 'الأفلاج', nameEn: 'Al-Aflaj' },
        { nameAr: 'حوطة بني تميم', nameEn: 'Hotat Bani Tamim' },
        { nameAr: 'السليل', nameEn: 'Al-Sulayil' },
        { nameAr: 'الحريق', nameEn: 'Al-Hariq' },
        { nameAr: 'ضرما', nameEn: 'Dirma' },
        { nameAr: 'الدرعية', nameEn: 'Diriyah' },
        { nameAr: 'المزاحمية', nameEn: 'Al-Muzahimiyah' },
        { nameAr: 'رماح', nameEn: 'Rumah' }
    ],
    '02': [ // Makkah
        { nameAr: 'مكة المكرمة', nameEn: 'Makkah' },
        { nameAr: 'جدة', nameEn: 'Jeddah' },
        { nameAr: 'الطائف', nameEn: 'Taif' },
        { nameAr: 'رابغ', nameEn: 'Rabigh' },
        { nameAr: 'الجموم', nameEn: 'Al-Jumum' },
        { nameAr: 'خليص', nameEn: 'Khulais' },
        { nameAr: 'القنفذة', nameEn: 'Al-Qunfudhah' },
        { nameAr: 'الليث', nameEn: 'Al-Lith' },
        { nameAr: 'أضم', nameEn: 'Adham' },
        { nameAr: 'تربة', nameEn: 'Turbah' },
        { nameAr: 'رنية', nameEn: 'Ranyah' },
        { nameAr: 'الخرمة', nameEn: 'Al-Khurmah' },
        { nameAr: 'الموية', nameEn: 'Al-Muwayh' },
        { nameAr: 'ميسان', nameEn: 'Maysan' },
        { nameAr: 'بحرة', nameEn: 'Bahrah' }
    ],
    '03': [ // Madinah
        { nameAr: 'المدينة المنورة', nameEn: 'Madinah' },
        { nameAr: 'ينبع', nameEn: 'Yanbu' },
        { nameAr: 'العلا', nameEn: 'Al-Ula' },
        { nameAr: 'بدر', nameEn: 'Badr' },
        { nameAr: 'خيبر', nameEn: 'Khaybar' },
        { nameAr: 'المهد', nameEn: 'Al-Mahd' },
        { nameAr: 'العيص', nameEn: 'Al-Ais' },
        { nameAr: 'الحناكية', nameEn: 'Al-Hanakiyah' },
        { nameAr: 'وادي الفرع', nameEn: 'Wadi Al-Fara' }
    ],
    '04': [ // Al-Qassim
        { nameAr: 'بريدة', nameEn: 'Buraidah' },
        { nameAr: 'عنيزة', nameEn: 'Unaizah' },
        { nameAr: 'الرس', nameEn: 'Al-Rass' },
        { nameAr: 'المذنب', nameEn: 'Al-Mithnab' },
        { nameAr: 'البكيرية', nameEn: 'Al-Bukayriyah' },
        { nameAr: 'البدائع', nameEn: 'Al-Badai' },
        { nameAr: 'رياض الخبراء', nameEn: 'Riyadh Al-Khabra' },
        { nameAr: 'عيون الجواء', nameEn: 'Uyun Al-Jiwa' },
        { nameAr: 'الأسياح', nameEn: 'Al-Asyah' },
        { nameAr: 'النبهانية', nameEn: 'Al-Nabhaniyah' }
    ],
    '05': [ // Eastern Region
        { nameAr: 'الدمام', nameEn: 'Dammam' },
        { nameAr: 'الخبر', nameEn: 'Khobar' },
        { nameAr: 'الظهران', nameEn: 'Dhahran' },
        { nameAr: 'الأحساء', nameEn: 'Al-Ahsa' },
        { nameAr: 'الهفوف', nameEn: 'Hofuf' },
        { nameAr: 'المبرز', nameEn: 'Al-Mubarraz' },
        { nameAr: 'الجبيل', nameEn: 'Jubail' },
        { nameAr: 'القطيف', nameEn: 'Qatif' },
        { nameAr: 'رأس تنورة', nameEn: 'Ras Tanura' },
        { nameAr: 'بقيق', nameEn: 'Buqayq' },
        { nameAr: 'النعيرية', nameEn: 'Al-Nuayriyah' },
        { nameAr: 'حفر الباطن', nameEn: 'Hafar Al-Batin' },
        { nameAr: 'الخفجي', nameEn: 'Khafji' },
        { nameAr: 'سيهات', nameEn: 'Saihat' },
        { nameAr: 'صفوى', nameEn: 'Safwa' }
    ],
    '06': [ // Asir
        { nameAr: 'أبها', nameEn: 'Abha' },
        { nameAr: 'خميس مشيط', nameEn: 'Khamis Mushait' },
        { nameAr: 'بيشة', nameEn: 'Bisha' },
        { nameAr: 'النماص', nameEn: 'Al-Namas' },
        { nameAr: 'سراة عبيدة', nameEn: 'Sarat Abidah' },
        { nameAr: 'أحد رفيدة', nameEn: 'Ahad Rufaidah' },
        { nameAr: 'المجاردة', nameEn: 'Al-Majardah' },
        { nameAr: 'رجال ألمع', nameEn: 'Rijal Almaa' },
        { nameAr: 'ظهران الجنوب', nameEn: 'Dhahran Al-Janoub' },
        { nameAr: 'تثليث', nameEn: 'Tathlith' },
        { nameAr: 'محايل', nameEn: 'Muhayil' },
        { nameAr: 'بارق', nameEn: 'Bariq' },
        { nameAr: 'تنومة', nameEn: 'Tanomah' }
    ],
    '07': [ // Tabuk
        { nameAr: 'تبوك', nameEn: 'Tabuk' },
        { nameAr: 'الوجه', nameEn: 'Al-Wajh' },
        { nameAr: 'ضباء', nameEn: 'Duba' },
        { nameAr: 'تيماء', nameEn: 'Tayma' },
        { nameAr: 'أملج', nameEn: 'Umluj' },
        { nameAr: 'حقل', nameEn: 'Haql' },
        { nameAr: 'البدع', nameEn: 'Al-Bada' }
    ],
    '08': [ // Hail
        { nameAr: 'حائل', nameEn: 'Hail' },
        { nameAr: 'بقعاء', nameEn: 'Baqa' },
        { nameAr: 'الغزالة', nameEn: 'Al-Ghazalah' },
        { nameAr: 'الشنان', nameEn: 'Al-Shinan' },
        { nameAr: 'السليمي', nameEn: 'Al-Sulaymi' },
        { nameAr: 'موقق', nameEn: 'Mawqaq' },
        { nameAr: 'الحائط', nameEn: 'Al-Hait' },
        { nameAr: 'سميراء', nameEn: 'Samira' }
    ],
    '09': [ // Northern Borders
        { nameAr: 'عرعر', nameEn: 'Arar' },
        { nameAr: 'رفحاء', nameEn: 'Rafha' },
        { nameAr: 'طريف', nameEn: 'Turaif' },
        { nameAr: 'العويقيلة', nameEn: 'Al-Uwayqilah' },
        { nameAr: 'الشعبة', nameEn: 'Al-Shuabah' }
    ],
    '10': [ // Jazan
        { nameAr: 'جازان', nameEn: 'Jazan' },
        { nameAr: 'صبيا', nameEn: 'Sabya' },
        { nameAr: 'أبو عريش', nameEn: 'Abu Arish' },
        { nameAr: 'صامطة', nameEn: 'Samtah' },
        { nameAr: 'الدرب', nameEn: 'Al-Darb' },
        { nameAr: 'بيش', nameEn: 'Bish' },
        { nameAr: 'فيفا', nameEn: 'Fifa' },
        { nameAr: 'العارضة', nameEn: 'Al-Aridah' },
        { nameAr: 'الريث', nameEn: 'Al-Raith' },
        { nameAr: 'ضمد', nameEn: 'Damad' },
        { nameAr: 'أحد المسارحة', nameEn: 'Ahad Al-Masarihah' },
        { nameAr: 'فرسان', nameEn: 'Farasan' }
    ],
    '11': [ // Najran
        { nameAr: 'نجران', nameEn: 'Najran' },
        { nameAr: 'شرورة', nameEn: 'Sharurah' },
        { nameAr: 'حبونا', nameEn: 'Habuna' },
        { nameAr: 'بدر الجنوب', nameEn: 'Badr Al-Janoub' },
        { nameAr: 'ثار', nameEn: 'Thar' },
        { nameAr: 'خباش', nameEn: 'Khubash' },
        { nameAr: 'يدمة', nameEn: 'Yadamah' }
    ],
    '12': [ // Al-Bahah
        { nameAr: 'الباحة', nameEn: 'Al-Baha' },
        { nameAr: 'بلجرشي', nameEn: 'Baljurashi' },
        { nameAr: 'المخواة', nameEn: 'Al-Mikhwah' },
        { nameAr: 'المندق', nameEn: 'Al-Mandaq' },
        { nameAr: 'قلوة', nameEn: 'Qilwah' },
        { nameAr: 'العقيق', nameEn: 'Al-Aqiq' },
        { nameAr: 'غامد الزناد', nameEn: 'Ghamid Al-Zinad' },
        { nameAr: 'القرى', nameEn: 'Al-Qura' }
    ],
    '13': [ // Al-Jawf
        { nameAr: 'سكاكا', nameEn: 'Sakakah' },
        { nameAr: 'دومة الجندل', nameEn: 'Dumat Al-Jandal' },
        { nameAr: 'القريات', nameEn: 'Qurayyat' },
        { nameAr: 'طبرجل', nameEn: 'Tabarjal' },
        { nameAr: 'صوير', nameEn: 'Suwayr' }
    ]
};

// All city names for enum validation
const ALL_CITY_NAMES_AR = Object.values(SAUDI_CITIES_BY_REGION).flat().map(c => c.nameAr);
const ALL_CITY_NAMES_EN = Object.values(SAUDI_CITIES_BY_REGION).flat().map(c => c.nameEn);

// Najiz Identity Document Types
const NAJIZ_IDENTITY_TYPES = [
    'national_id',      // الهوية الوطنية (10 digits, starts with 1)
    'iqama',            // الإقامة (10 digits, starts with 2)
    'gcc_id',           // هوية مواطني دول الخليج
    'passport',         // جواز السفر
    'border_number',    // رقم الحدود
    'visitor_id',       // هوية زائر
    'temporary_id',     // هوية مؤقتة
    'diplomatic_id'     // هوية دبلوماسية
];

// Gender options for Najiz
const GENDER_OPTIONS = ['male', 'female'];

// Marital status options
const MARITAL_STATUS_OPTIONS = ['single', 'married', 'divorced', 'widowed'];

// Email sub-schema
const emailSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['work', 'personal', 'other'],
        default: 'work'
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    canContact: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// Phone sub-schema
const phoneSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['mobile', 'work', 'home', 'fax', 'other'],
        default: 'mobile'
    },
    number: {
        type: String,
        trim: true
    },
    countryCode: {
        type: String,
        default: '+966'
    },
    isPrimary: {
        type: Boolean,
        default: false
    },
    canSMS: {
        type: Boolean,
        default: true
    },
    canWhatsApp: {
        type: Boolean,
        default: true
    }
}, { _id: false });

const contactSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // BASIC INFO - English Name
    // ═══════════════════════════════════════════════════════════════
    salutation: {
        type: String,
        enum: ['mr', 'mrs', 'ms', 'dr', 'eng', 'prof', 'sheikh', 'his_excellency', 'her_excellency', null],
        default: null
    },
    salutationAr: {
        type: String,
        enum: ['السيد', 'السيدة', 'الآنسة', 'الدكتور', 'الدكتورة', 'المهندس', 'المهندسة', 'الأستاذ', 'الأستاذة', 'الشيخ', 'الشيخة', 'صاحب السمو', 'صاحبة السمو', 'صاحب المعالي', 'صاحبة المعالي', null],
        default: null
    },
    firstName: {
        type: String,
        required: false,
        trim: true,
        maxlength: 100,
        default: 'Unknown'
    },
    middleName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    lastName: {
        type: String,
        required: false,
        trim: true,
        maxlength: 100,
        default: 'Contact'
    },
    preferredName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    suffix: {
        type: String,
        trim: true,
        maxlength: 50
    },

    // ═══════════════════════════════════════════════════════════════
    // ARABIC NAME - 4-PART STRUCTURE (الاسم الرباعي)
    // Required for Najiz integration
    // ═══════════════════════════════════════════════════════════════
    arabicName: {
        // الاسم الأول - First name
        firstName: {
            type: String,
            trim: true,
            maxlength: 50
        },
        // اسم الأب - Father's name
        fatherName: {
            type: String,
            trim: true,
            maxlength: 50
        },
        // اسم الجد - Grandfather's name
        grandfatherName: {
            type: String,
            trim: true,
            maxlength: 50
        },
        // اسم العائلة - Family/Tribe name
        familyName: {
            type: String,
            trim: true,
            maxlength: 50
        },
        // الاسم الرباعي الكامل - Full 4-part name (auto-generated or manual)
        fullName: {
            type: String,
            trim: true,
            maxlength: 200
        }
    },

    // Legacy field for backward compatibility
    fullNameArabic: {
        type: String,
        trim: true,
        maxlength: 200
    },

    // ═══════════════════════════════════════════════════════════════
    // GENDER & PERSONAL DETAILS (Najiz required)
    // ═══════════════════════════════════════════════════════════════
    gender: {
        type: String,
        enum: GENDER_OPTIONS
    },
    maritalStatus: {
        type: String,
        enum: MARITAL_STATUS_OPTIONS
    },

    // ═══════════════════════════════════════════════════════════════
    // TYPE & CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: ['individual', 'organization', 'court', 'attorney', 'expert', 'government', 'other'],
        required: false,
        default: 'individual'
    },
    primaryRole: {
        type: String,
        enum: [
            'client_contact', 'opposing_party', 'opposing_counsel', 'witness',
            'expert_witness', 'judge', 'court_clerk', 'mediator', 'arbitrator',
            'referral_source', 'vendor', 'other', null
        ],
        default: null
    },
    relationshipTypes: [{
        type: String,
        enum: [
            'current_client', 'former_client', 'prospect', 'adverse_party',
            'related_party', 'referral_source', 'business_contact', 'personal_contact'
        ]
    }],

    // ═══════════════════════════════════════════════════════════════
    // CONTACT INFORMATION
    // ═══════════════════════════════════════════════════════════════
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    alternatePhone: {
        type: String,
        trim: true
    },
    emails: [emailSchema],
    phones: [phoneSchema],
    mobile: {
        type: String,
        trim: true
    },
    fax: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYMENT/AFFILIATION
    // ═══════════════════════════════════════════════════════════════
    company: {
        type: String,
        trim: true,
        maxlength: 200
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    title: {
        type: String,
        trim: true,
        maxlength: 100
    },
    department: {
        type: String,
        trim: true,
        maxlength: 100
    },

    // ═══════════════════════════════════════════════════════════════
    // ORGANIZATIONAL
    // ═══════════════════════════════════════════════════════════════
    reportsTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },

    // ═══════════════════════════════════════════════════════════════
    // ASSISTANT INFO
    // ═══════════════════════════════════════════════════════════════
    assistantName: {
        type: String,
        trim: true,
        maxlength: 100
    },
    assistantPhone: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SOCIAL PROFILES
    // ═══════════════════════════════════════════════════════════════
    socialProfiles: {
        linkedin: { type: String, trim: true },
        twitter: { type: String, trim: true },
        facebook: { type: String, trim: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEREST AREAS
    // ═══════════════════════════════════════════════════════════════
    interestAreaIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterestArea'
    }],

    // ═══════════════════════════════════════════════════════════════
    // TAG REFERENCES
    // ═══════════════════════════════════════════════════════════════
    tagIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tag'
    }],

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY TRACKING
    // ═══════════════════════════════════════════════════════════════
    lastActivityDate: {
        type: Date
    },
    leadSource: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMAIL PREFERENCES
    // ═══════════════════════════════════════════════════════════════
    emailOptOut: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // SAUDI-SPECIFIC IDENTIFICATION - NAJIZ INTEGRATION
    // ═══════════════════════════════════════════════════════════════

    // Primary identity type as per Najiz system
    identityType: {
        type: String,
        enum: NAJIZ_IDENTITY_TYPES,
        default: 'national_id'
    },

    // الهوية الوطنية - Saudi National ID (10 digits, starts with 1)
    nationalId: {
        type: String,
        trim: true,
        maxlength: 10,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^1\d{9}$/.test(v);
            },
            message: 'National ID must be 10 digits starting with 1'
        }
    },

    // الإقامة - Resident ID for non-Saudis (10 digits, starts with 2)
    iqamaNumber: {
        type: String,
        trim: true,
        maxlength: 10,
        validate: {
            validator: function(v) {
                if (!v) return true;
                return /^2\d{9}$/.test(v);
            },
            message: 'Iqama number must be 10 digits starting with 2'
        }
    },

    // هوية مواطني دول الخليج - GCC ID
    gccId: {
        type: String,
        trim: true,
        maxlength: 15
    },
    gccCountry: {
        type: String,
        enum: ['UAE', 'Kuwait', 'Bahrain', 'Oman', 'Qatar', null],
        default: null
    },

    // رقم الحدود - Border number for visitors
    borderNumber: {
        type: String,
        trim: true,
        maxlength: 15
    },

    // هوية زائر - Visitor ID
    visitorId: {
        type: String,
        trim: true,
        maxlength: 15
    },

    // جواز السفر - Passport
    passportNumber: {
        type: String,
        trim: true,
        maxlength: 20
    },
    passportCountry: {
        type: String,
        trim: true
    },
    passportIssueDate: {
        type: Date
    },
    passportExpiryDate: {
        type: Date
    },
    passportIssuePlace: {
        type: String,
        trim: true
    },

    // Identity document issue/expiry dates
    identityIssueDate: {
        type: Date
    },
    identityExpiryDate: {
        type: Date
    },
    identityIssuePlace: {
        type: String,
        trim: true
    },

    // Date of birth (Gregorian and Hijri)
    dateOfBirth: {
        type: Date
    },
    dateOfBirthHijri: {
        type: String,  // Format: YYYY/MM/DD (e.g., 1400/01/15)
        trim: true,
        maxlength: 10
    },
    placeOfBirth: {
        type: String,
        trim: true
    },

    // Nationality information
    nationality: {
        type: String,
        default: 'سعودي'
    },
    nationalityCode: {
        type: String,
        trim: true,
        maxlength: 3  // ISO 3166-1 alpha-3
    },

    // Sponsor information (for Iqama holders)
    sponsor: {
        name: { type: String, trim: true },
        nameAr: { type: String, trim: true },
        identityNumber: { type: String, trim: true },
        relationship: { type: String, trim: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIMARY ADDRESS - SAUDI NATIONAL ADDRESS (العنوان الوطني)
    // 7-Component Structure as per Saudi Post specifications
    // ═══════════════════════════════════════════════════════════════

    // Legacy simple address field
    address: {
        type: String,
        trim: true
    },

    // Saudi National Address Structure
    nationalAddress: {
        // رقم المبنى - Building Number (4 digits)
        buildingNumber: {
            type: String,
            trim: true,
            maxlength: 4,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^\d{4}$/.test(v);
                },
                message: 'Building number must be exactly 4 digits'
            }
        },
        // اسم الشارع - Street Name
        streetName: {
            type: String,
            trim: true,
            maxlength: 100
        },
        streetNameAr: {
            type: String,
            trim: true,
            maxlength: 100
        },
        // الحي - District/Neighborhood
        district: {
            type: String,
            trim: true,
            maxlength: 100
        },
        districtAr: {
            type: String,
            trim: true,
            maxlength: 100
        },
        // المدينة - City
        city: {
            type: String,
            trim: true,
            maxlength: 100
        },
        cityAr: {
            type: String,
            trim: true,
            maxlength: 100
        },
        // المنطقة - Region (one of 13 Saudi regions)
        region: {
            type: String,
            trim: true,
            maxlength: 100
        },
        regionCode: {
            type: String,
            enum: [...REGION_CODES, null],
            default: null
        },
        // الرمز البريدي - Postal Code (5 digits)
        postalCode: {
            type: String,
            trim: true,
            maxlength: 5,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^\d{5}$/.test(v);
                },
                message: 'Postal code must be exactly 5 digits'
            }
        },
        // الرقم الإضافي - Additional Number (4 digits)
        additionalNumber: {
            type: String,
            trim: true,
            maxlength: 4,
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^\d{4}$/.test(v);
                },
                message: 'Additional number must be exactly 4 digits'
            }
        },
        // رقم الوحدة - Unit Number (apartment, office, etc.)
        unitNumber: {
            type: String,
            trim: true,
            maxlength: 10
        },
        // العنوان المختصر - Short Address (8 characters: XXXX YYYY)
        shortAddress: {
            type: String,
            trim: true,
            maxlength: 9,  // Format: XXXX YYYY
            validate: {
                validator: function(v) {
                    if (!v) return true;
                    return /^[A-Z]{4}\d{4}$/.test(v.replace(/\s/g, ''));
                },
                message: 'Short address must be in format XXXX9999'
            }
        },
        // Latitude/Longitude for mapping
        latitude: {
            type: Number,
            min: -90,
            max: 90
        },
        longitude: {
            type: Number,
            min: -180,
            max: 180
        },
        // Is this address verified with Saudi Post?
        isVerified: {
            type: Boolean,
            default: false
        },
        verifiedAt: {
            type: Date
        }
    },

    // Legacy fields for backward compatibility
    buildingNumber: {
        type: String,
        trim: true
    },
    district: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    province: {
        type: String,
        trim: true
    },
    postalCode: {
        type: String,
        trim: true
    },
    country: {
        type: String,
        default: 'المملكة العربية السعودية'
    },

    // ═══════════════════════════════════════════════════════════════
    // SECONDARY/WORK ADDRESS
    // ═══════════════════════════════════════════════════════════════
    workAddress: {
        buildingNumber: { type: String, trim: true, maxlength: 4 },
        streetName: { type: String, trim: true, maxlength: 100 },
        streetNameAr: { type: String, trim: true, maxlength: 100 },
        district: { type: String, trim: true, maxlength: 100 },
        districtAr: { type: String, trim: true, maxlength: 100 },
        city: { type: String, trim: true, maxlength: 100 },
        cityAr: { type: String, trim: true, maxlength: 100 },
        region: { type: String, trim: true, maxlength: 100 },
        regionCode: { type: String, enum: [...REGION_CODES, null], default: null },
        postalCode: { type: String, trim: true, maxlength: 5 },
        additionalNumber: { type: String, trim: true, maxlength: 4 },
        unitNumber: { type: String, trim: true, maxlength: 10 },
        shortAddress: { type: String, trim: true, maxlength: 9 },
        latitude: { type: Number },
        longitude: { type: Number }
    },

    // ═══════════════════════════════════════════════════════════════
    // PO BOX ADDRESS (صندوق البريد)
    // ═══════════════════════════════════════════════════════════════
    poBox: {
        number: { type: String, trim: true, maxlength: 10 },
        city: { type: String, trim: true },
        postalCode: { type: String, trim: true, maxlength: 5 }
    },

    // ═══════════════════════════════════════════════════════════════
    // COMMUNICATION PREFERENCES
    // ═══════════════════════════════════════════════════════════════
    preferredLanguage: {
        type: String,
        enum: ['ar', 'en'],
        default: 'ar'
    },
    preferredContactMethod: {
        type: String,
        enum: ['email', 'phone', 'sms', 'whatsapp', 'in_person', null],
        default: null
    },
    bestTimeToContact: {
        type: String,
        trim: true
    },
    doNotContact: {
        type: Boolean,
        default: false
    },
    doNotEmail: {
        type: Boolean,
        default: false
    },
    doNotCall: {
        type: Boolean,
        default: false
    },
    doNotSMS: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // CONFLICT CHECK (CRITICAL for law firms)
    // ═══════════════════════════════════════════════════════════════
    conflictCheckStatus: {
        type: String,
        enum: ['not_checked', 'clear', 'potential_conflict', 'confirmed_conflict'],
        default: 'not_checked'
    },
    conflictNotes: {
        type: String,
        maxlength: 2000
    },
    conflictCheckDate: {
        type: Date
    },
    conflictCheckedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & PRIORITY
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived', 'deceased'],
        default: 'active'
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'vip'],
        default: 'normal'
    },
    vipStatus: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // RISK ASSESSMENT
    // ═══════════════════════════════════════════════════════════════
    riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', null],
        default: null
    },
    isBlacklisted: {
        type: Boolean,
        default: false
    },
    blacklistReason: {
        type: String,
        maxlength: 1000
    },

    // ═══════════════════════════════════════════════════════════════
    // TAGS & CATEGORIES
    // ═══════════════════════════════════════════════════════════════
    tags: [{
        type: String,
        trim: true
    }],
    practiceAreas: [{
        type: String,
        trim: true
    }],

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 5000
    },

    // ═══════════════════════════════════════════════════════════════
    // LINKED ENTITIES
    // ═══════════════════════════════════════════════════════════════
    linkedCases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case'
    }],
    linkedClients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    }],

    // ═══════════════════════════════════════════════════════════════
    // DEDUPLICATION & MERGE TRACKING
    // ═══════════════════════════════════════════════════════════════
    duplicateOf: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    },
    duplicateScore: {
        type: Number,
        min: 0,
        max: 100
    },
    duplicateCheckedAt: {
        type: Date
    },
    mergedFrom: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact'
    }],
    mergedAt: {
        type: Date
    },
    mergedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    isMaster: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ENRICHMENT DATA
    // ═══════════════════════════════════════════════════════════════
    enrichmentData: {
        clearbit: mongoose.Schema.Types.Mixed,
        zoominfo: mongoose.Schema.Types.Mixed,
        lastEnrichedAt: Date,
        enrichmentSource: String,
        confidence: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // ENHANCED COMMUNICATION PREFERENCES
    // ═══════════════════════════════════════════════════════════════
    communicationPreferences: {
        preferredChannel: {
            type: String,
            enum: ['email', 'phone', 'whatsapp', 'sms']
        },
        preferredTime: String,
        timezone: String,
        doNotContact: {
            type: Boolean,
            default: false
        },
        doNotContactReason: String
    },

    // ═══════════════════════════════════════════════════════════════
    // AUDIT
    // ═══════════════════════════════════════════════════════════════
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
contactSchema.index({ lawyerId: 1, status: 1 });
contactSchema.index({ firmId: 1, status: 1 });
contactSchema.index({ lawyerId: 1, type: 1 });
contactSchema.index({ lawyerId: 1, primaryRole: 1 });
contactSchema.index({ lawyerId: 1, conflictCheckStatus: 1 });
contactSchema.index({ lawyerId: 1, organizationId: 1 });
contactSchema.index({ lawyerId: 1, createdAt: -1 });

// Identity indexes for Najiz lookups
contactSchema.index({ nationalId: 1 }, { sparse: true });
contactSchema.index({ iqamaNumber: 1 }, { sparse: true });
contactSchema.index({ gccId: 1 }, { sparse: true });
contactSchema.index({ passportNumber: 1, passportCountry: 1 }, { sparse: true });
contactSchema.index({ firmId: 1, identityType: 1 });

// Address indexes
contactSchema.index({ 'nationalAddress.regionCode': 1 });
contactSchema.index({ 'nationalAddress.city': 1 });
contactSchema.index({ 'nationalAddress.shortAddress': 1 }, { sparse: true });

// Arabic name search index
contactSchema.index({ 'arabicName.firstName': 1, 'arabicName.familyName': 1 });
contactSchema.index({ 'arabicName.fullName': 'text', firstName: 'text', lastName: 'text', email: 'text', company: 'text', fullNameArabic: 'text' });

// Deduplication indexes
contactSchema.index({ duplicateOf: 1 }, { sparse: true });
contactSchema.index({ isMaster: 1, status: 1 });
contactSchema.index({ firmId: 1, isMaster: 1 }, { sparse: true });

// New field indexes
contactSchema.index({ reportsTo: 1 }, { sparse: true });
contactSchema.index({ tagIds: 1 });
contactSchema.index({ interestAreaIds: 1 });
contactSchema.index({ lastActivityDate: 1 });
contactSchema.index({ firmId: 1, lastActivityDate: -1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// English full name
contactSchema.virtual('fullName').get(function() {
    const parts = [this.firstName, this.middleName, this.lastName].filter(Boolean);
    return parts.join(' ');
});

// Display name (preferred or constructed)
contactSchema.virtual('displayName').get(function() {
    if (this.preferredName) return this.preferredName;
    return `${this.firstName} ${this.lastName}`.trim();
});

// Arabic full name (الاسم الرباعي)
contactSchema.virtual('fullArabicName').get(function() {
    if (this.arabicName?.fullName) return this.arabicName.fullName;
    if (this.arabicName) {
        const parts = [
            this.arabicName.firstName,
            this.arabicName.fatherName,
            this.arabicName.grandfatherName,
            this.arabicName.familyName
        ].filter(Boolean);
        return parts.join(' ');
    }
    return this.fullNameArabic || '';
});

// Formatted national address
contactSchema.virtual('formattedNationalAddress').get(function() {
    if (!this.nationalAddress) return '';
    const addr = this.nationalAddress;
    const parts = [
        addr.buildingNumber,
        addr.streetNameAr || addr.streetName,
        addr.districtAr || addr.district,
        addr.cityAr || addr.city,
        addr.postalCode,
        addr.additionalNumber ? `-${addr.additionalNumber}` : ''
    ].filter(Boolean);
    return parts.join(', ');
});

// Short address display
contactSchema.virtual('displayShortAddress').get(function() {
    return this.nationalAddress?.shortAddress || '';
});

// Primary identity number based on type
contactSchema.virtual('primaryIdentityNumber').get(function() {
    switch (this.identityType) {
        case 'national_id': return this.nationalId;
        case 'iqama': return this.iqamaNumber;
        case 'gcc_id': return this.gccId;
        case 'passport': return this.passportNumber;
        case 'border_number': return this.borderNumber;
        case 'visitor_id': return this.visitorId;
        default: return this.nationalId || this.iqamaNumber || this.passportNumber;
    }
});

// Ensure virtuals are included in JSON
contactSchema.set('toJSON', { virtuals: true });
contactSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

// Auto-generate Arabic full name if parts are provided
contactSchema.pre('save', function(next) {
    if (this.arabicName && !this.arabicName.fullName) {
        const parts = [
            this.arabicName.firstName,
            this.arabicName.fatherName,
            this.arabicName.grandfatherName,
            this.arabicName.familyName
        ].filter(Boolean);
        if (parts.length > 0) {
            this.arabicName.fullName = parts.join(' ');
        }
    }
    // Also populate legacy field for backward compatibility
    if (this.arabicName?.fullName && !this.fullNameArabic) {
        this.fullNameArabic = this.arabicName.fullName;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Search contacts with filters
contactSchema.statics.searchContacts = async function(lawyerId, searchTerm, filters = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: { $ne: 'archived' }
    };

    if (searchTerm) {
        query.$or = [
            { firstName: { $regex: escapeRegex(searchTerm), $options: 'i' } },
            { lastName: { $regex: escapeRegex(searchTerm), $options: 'i' } },
            { fullNameArabic: { $regex: escapeRegex(searchTerm), $options: 'i' } },
            { email: { $regex: escapeRegex(searchTerm), $options: 'i' } },
            { phone: { $regex: escapeRegex(searchTerm), $options: 'i' } },
            { company: { $regex: escapeRegex(searchTerm), $options: 'i' } },
            { nationalId: { $regex: escapeRegex(searchTerm), $options: 'i' } }
        ];
    }

    if (filters.type) query.type = filters.type;
    if (filters.primaryRole) query.primaryRole = filters.primaryRole;
    if (filters.status) query.status = filters.status;
    if (filters.conflictCheckStatus) query.conflictCheckStatus = filters.conflictCheckStatus;
    if (filters.vipStatus !== undefined) query.vipStatus = filters.vipStatus;
    if (filters.organizationId) query.organizationId = new mongoose.Types.ObjectId(filters.organizationId);
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };

    const sort = {};
    sort[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;

    return await this.find(query)
        .populate('organizationId', 'legalName tradeName')
        .sort(sort)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Get contacts with pagination
contactSchema.statics.getContacts = async function(lawyerId, filters = {}) {
    const query = {};

    // Multi-tenancy: firmId first, then lawyerId fallback
    if (filters.firmId) {
        query.firmId = new mongoose.Types.ObjectId(filters.firmId);
    } else {
        query.lawyerId = new mongoose.Types.ObjectId(lawyerId);
    }

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.primaryRole) query.primaryRole = filters.primaryRole;
    if (filters.conflictCheckStatus) query.conflictCheckStatus = filters.conflictCheckStatus;
    if (filters.vipStatus !== undefined) query.vipStatus = filters.vipStatus;
    if (filters.organizationId) query.organizationId = new mongoose.Types.ObjectId(filters.organizationId);
    if (filters.tags && filters.tags.length > 0) query.tags = { $in: filters.tags };

    if (filters.search) {
        query.$or = [
            { firstName: { $regex: escapeRegex(filters.search), $options: 'i' } },
            { lastName: { $regex: escapeRegex(filters.search), $options: 'i' } },
            { fullNameArabic: { $regex: escapeRegex(filters.search), $options: 'i' } },
            { email: { $regex: escapeRegex(filters.search), $options: 'i' } },
            { phone: { $regex: escapeRegex(filters.search), $options: 'i' } },
            { company: { $regex: escapeRegex(filters.search), $options: 'i' } }
        ];
    }

    const sort = {};
    sort[filters.sortBy || 'createdAt'] = filters.sortOrder === 'asc' ? 1 : -1;

    return await this.find(query)
        .populate('organizationId', 'legalName tradeName')
        .sort(sort)
        .limit(filters.limit || 50)
        .skip(filters.skip || 0);
};

// Conflict check method
contactSchema.statics.checkConflicts = async function(lawyerId, checkData) {
    const matches = [];
    const searchTerms = [];

    // Build search terms from check data
    if (checkData.names && checkData.names.length > 0) {
        searchTerms.push(...checkData.names);
    }
    if (checkData.email) searchTerms.push(checkData.email);
    if (checkData.phone) searchTerms.push(checkData.phone);
    if (checkData.nationalId) searchTerms.push(checkData.nationalId);

    // Search for matches
    for (const term of searchTerms) {
        const results = await this.find({
            lawyerId: new mongoose.Types.ObjectId(lawyerId),
            $or: [
                { firstName: { $regex: escapeRegex(term), $options: 'i' } },
                { lastName: { $regex: escapeRegex(term), $options: 'i' } },
                { fullNameArabic: { $regex: escapeRegex(term), $options: 'i' } },
                { email: { $regex: escapeRegex(term), $options: 'i' } },
                { phone: { $regex: escapeRegex(term), $options: 'i' } },
                { nationalId: term }
            ]
        }).populate('linkedCases', 'caseNumber title');

        for (const contact of results) {
            if (!matches.find(m => m.entityId.toString() === contact._id.toString())) {
                matches.push({
                    entityType: 'contact',
                    entityId: contact._id,
                    entityName: contact.fullName,
                    matchType: contact.nationalId === checkData.nationalId ? 'id' :
                               contact.email === checkData.email ? 'email' :
                               contact.phone === checkData.phone ? 'phone' : 'name',
                    matchScore: contact.nationalId === checkData.nationalId ? 100 :
                                contact.email === checkData.email ? 90 :
                                contact.phone === checkData.phone ? 85 : 70,
                    caseNumbers: contact.linkedCases?.map(c => c.caseNumber) || []
                });
            }
        }
    }

    return matches;
};

const Contact = mongoose.model('Contact', contactSchema);

// Export model and constants for use in frontend/validation
module.exports = Contact;
module.exports.Contact = Contact;
module.exports.SAUDI_REGIONS = SAUDI_REGIONS;
module.exports.SAUDI_CITIES_BY_REGION = SAUDI_CITIES_BY_REGION;
module.exports.REGION_CODES = REGION_CODES;
module.exports.ALL_CITY_NAMES_AR = ALL_CITY_NAMES_AR;
module.exports.ALL_CITY_NAMES_EN = ALL_CITY_NAMES_EN;
module.exports.NAJIZ_IDENTITY_TYPES = NAJIZ_IDENTITY_TYPES;
module.exports.GENDER_OPTIONS = GENDER_OPTIONS;
module.exports.MARITAL_STATUS_OPTIONS = MARITAL_STATUS_OPTIONS;
