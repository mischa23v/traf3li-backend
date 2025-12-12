const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════
// NAJIZ INTEGRATION - SHARED SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Arabic Name Schema (الاسم الرباعي)
const arabicNameSchema = new Schema({
    firstName: { type: String, maxlength: 50 },        // الاسم الأول
    fatherName: { type: String, maxlength: 50 },       // اسم الأب
    grandfatherName: { type: String, maxlength: 50 },  // اسم الجد
    familyName: { type: String, maxlength: 50 },       // اسم العائلة
    fullName: { type: String, maxlength: 200 },        // الاسم الكامل
}, { _id: false });

// National Address Schema (العنوان الوطني)
const nationalAddressSchema = new Schema({
    buildingNumber: { type: String, match: /^\d{4}$/ },     // رقم المبنى
    streetName: { type: String, maxlength: 100 },
    streetNameAr: { type: String, maxlength: 100 },
    district: { type: String, maxlength: 100 },
    districtAr: { type: String, maxlength: 100 },
    city: { type: String, maxlength: 100 },
    cityAr: { type: String, maxlength: 100 },
    region: { type: String, maxlength: 100 },
    regionAr: { type: String, maxlength: 100 },
    regionCode: { type: String, match: /^(0[1-9]|1[0-3])$/ },
    postalCode: { type: String, match: /^\d{5}$/ },
    additionalNumber: { type: String, match: /^\d{4}$/ },
    unitNumber: { type: String, maxlength: 10 },
    shortAddress: { type: String, maxlength: 8 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
}, { _id: false });

// Sponsor Schema (for Iqama holders)
const sponsorSchema = new Schema({
    name: { type: String, maxlength: 100 },
    nameAr: { type: String, maxlength: 100 },
    identityNumber: { type: String, maxlength: 20 },
    relationship: { type: String, maxlength: 50 },
}, { _id: false });

// PO Box Schema
const poBoxSchema = new Schema({
    number: { type: String, maxlength: 20 },
    city: { type: String, maxlength: 100 },
    postalCode: { type: String, maxlength: 10 },
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════

const IDENTITY_TYPES = [
    'national_id',
    'iqama',
    'gcc_id',
    'passport',
    'border_number',
    'visitor_id',
    'temporary_id',
    'diplomatic_id'
];

const GCC_COUNTRIES = ['SA', 'AE', 'KW', 'BH', 'OM', 'QA'];

const GENDERS = ['male', 'female'];

const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed'];

const LEGAL_FORMS = [
    'sole_proprietorship',
    'llc',
    'joint_stock',
    'partnership',
    'limited_partnership',
    'professional_company',
    'branch_of_foreign_company',
    'government_entity',
    'non_profit',
    'other'
];

const RISK_LEVELS = ['low', 'medium', 'high'];

const CONFLICT_CHECK_STATUSES = [
    'not_checked',
    'clear',
    'potential_conflict',
    'confirmed_conflict'
];

const VERIFICATION_SOURCES = ['wathq', 'absher', 'manual', 'najiz', 'saudi_post'];

const PREFERRED_LANGUAGES = ['ar', 'en'];

const PREFERRED_CONTACT_METHODS = ['email', 'phone', 'sms', 'whatsapp'];

module.exports = {
    // Schemas
    arabicNameSchema,
    nationalAddressSchema,
    sponsorSchema,
    poBoxSchema,

    // Enums
    IDENTITY_TYPES,
    GCC_COUNTRIES,
    GENDERS,
    MARITAL_STATUSES,
    LEGAL_FORMS,
    RISK_LEVELS,
    CONFLICT_CHECK_STATUSES,
    VERIFICATION_SOURCES,
    PREFERRED_LANGUAGES,
    PREFERRED_CONTACT_METHODS
};
