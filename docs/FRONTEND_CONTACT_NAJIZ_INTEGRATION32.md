# Frontend Contact Model - Najiz Integration Guide

## Overview

This guide documents the enhanced Contact model with comprehensive Saudi Arabia Najiz (Ministry of Justice) integration. The Contact model now includes:

- **4-Part Arabic Name Structure** (الاسم الرباعي)
- **Saudi National Address** (العنوان الوطني) - 7 components
- **All 13 Saudi Administrative Regions** with 131+ cities
- **8 Identity Document Types** per Najiz requirements
- **Complete Validation Rules** for Saudi-specific fields

---

## Table of Contents

1. [Data Structures](#data-structures)
2. [Saudi Regions & Cities](#saudi-regions--cities)
3. [Identity Types](#identity-types)
4. [National Address Structure](#national-address-structure)
5. [Arabic Name Structure](#arabic-name-structure)
6. [TypeScript Interfaces](#typescript-interfaces)
7. [React Components](#react-components)
8. [Validation Rules](#validation-rules)
9. [API Endpoints](#api-endpoints)
10. [Migration Guide](#migration-guide)

---

## Data Structures

### Saudi Regions (13 Administrative Regions)

```typescript
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
```

### Identity Document Types

```typescript
const NAJIZ_IDENTITY_TYPES = [
  'national_id',      // الهوية الوطنية - Saudi National ID (10 digits, starts with 1)
  'iqama',            // الإقامة - Resident ID (10 digits, starts with 2)
  'gcc_id',           // هوية مواطني دول الخليج - GCC ID
  'passport',         // جواز السفر - Passport
  'border_number',    // رقم الحدود - Border number
  'visitor_id',       // هوية زائر - Visitor ID
  'temporary_id',     // هوية مؤقتة - Temporary ID
  'diplomatic_id'     // هوية دبلوماسية - Diplomatic ID
];
```

---

## Saudi Regions & Cities

### Complete Cities by Region

```typescript
const SAUDI_CITIES_BY_REGION = {
  '01': [ // Riyadh Region (16 cities)
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
  '02': [ // Makkah Region (15 cities)
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
  '03': [ // Madinah Region (9 cities)
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
  '04': [ // Al-Qassim Region (10 cities)
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
  '05': [ // Eastern Region (15 cities)
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
  '06': [ // Asir Region (13 cities)
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
  '07': [ // Tabuk Region (7 cities)
    { nameAr: 'تبوك', nameEn: 'Tabuk' },
    { nameAr: 'الوجه', nameEn: 'Al-Wajh' },
    { nameAr: 'ضباء', nameEn: 'Duba' },
    { nameAr: 'تيماء', nameEn: 'Tayma' },
    { nameAr: 'أملج', nameEn: 'Umluj' },
    { nameAr: 'حقل', nameEn: 'Haql' },
    { nameAr: 'البدع', nameEn: 'Al-Bada' }
  ],
  '08': [ // Hail Region (8 cities)
    { nameAr: 'حائل', nameEn: 'Hail' },
    { nameAr: 'بقعاء', nameEn: 'Baqa' },
    { nameAr: 'الغزالة', nameEn: 'Al-Ghazalah' },
    { nameAr: 'الشنان', nameEn: 'Al-Shinan' },
    { nameAr: 'السليمي', nameEn: 'Al-Sulaymi' },
    { nameAr: 'موقق', nameEn: 'Mawqaq' },
    { nameAr: 'الحائط', nameEn: 'Al-Hait' },
    { nameAr: 'سميراء', nameEn: 'Samira' }
  ],
  '09': [ // Northern Borders Region (5 cities)
    { nameAr: 'عرعر', nameEn: 'Arar' },
    { nameAr: 'رفحاء', nameEn: 'Rafha' },
    { nameAr: 'طريف', nameEn: 'Turaif' },
    { nameAr: 'العويقيلة', nameEn: 'Al-Uwayqilah' },
    { nameAr: 'الشعبة', nameEn: 'Al-Shuabah' }
  ],
  '10': [ // Jazan Region (12 cities)
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
  '11': [ // Najran Region (7 cities)
    { nameAr: 'نجران', nameEn: 'Najran' },
    { nameAr: 'شرورة', nameEn: 'Sharurah' },
    { nameAr: 'حبونا', nameEn: 'Habuna' },
    { nameAr: 'بدر الجنوب', nameEn: 'Badr Al-Janoub' },
    { nameAr: 'ثار', nameEn: 'Thar' },
    { nameAr: 'خباش', nameEn: 'Khubash' },
    { nameAr: 'يدمة', nameEn: 'Yadamah' }
  ],
  '12': [ // Al-Bahah Region (8 cities)
    { nameAr: 'الباحة', nameEn: 'Al-Baha' },
    { nameAr: 'بلجرشي', nameEn: 'Baljurashi' },
    { nameAr: 'المخواة', nameEn: 'Al-Mikhwah' },
    { nameAr: 'المندق', nameEn: 'Al-Mandaq' },
    { nameAr: 'قلوة', nameEn: 'Qilwah' },
    { nameAr: 'العقيق', nameEn: 'Al-Aqiq' },
    { nameAr: 'غامد الزناد', nameEn: 'Ghamid Al-Zinad' },
    { nameAr: 'القرى', nameEn: 'Al-Qura' }
  ],
  '13': [ // Al-Jawf Region (5 cities)
    { nameAr: 'سكاكا', nameEn: 'Sakakah' },
    { nameAr: 'دومة الجندل', nameEn: 'Dumat Al-Jandal' },
    { nameAr: 'القريات', nameEn: 'Qurayyat' },
    { nameAr: 'طبرجل', nameEn: 'Tabarjal' },
    { nameAr: 'صوير', nameEn: 'Suwayr' }
  ]
};
```

---

## TypeScript Interfaces

### Contact Interface

```typescript
// Saudi Region
interface SaudiRegion {
  code: string;      // '01' - '13'
  nameAr: string;    // منطقة الرياض
  nameEn: string;    // Riyadh Region
  capitalAr: string; // الرياض
  capitalEn: string; // Riyadh
}

// Saudi City
interface SaudiCity {
  nameAr: string;  // الرياض
  nameEn: string;  // Riyadh
}

// Arabic Name Structure (الاسم الرباعي)
interface ArabicName {
  firstName: string;        // الاسم الأول
  fatherName: string;       // اسم الأب
  grandfatherName: string;  // اسم الجد
  familyName: string;       // اسم العائلة
  fullName?: string;        // الاسم الرباعي الكامل (auto-generated)
}

// National Address Structure (العنوان الوطني)
interface NationalAddress {
  buildingNumber: string;     // رقم المبنى (4 digits)
  streetName: string;         // اسم الشارع (English)
  streetNameAr: string;       // اسم الشارع (Arabic)
  district: string;           // الحي (English)
  districtAr: string;         // الحي (Arabic)
  city: string;               // المدينة (English)
  cityAr: string;             // المدينة (Arabic)
  region: string;             // المنطقة (English)
  regionCode: string;         // رمز المنطقة ('01' - '13')
  postalCode: string;         // الرمز البريدي (5 digits)
  additionalNumber: string;   // الرقم الإضافي (4 digits)
  unitNumber?: string;        // رقم الوحدة
  shortAddress?: string;      // العنوان المختصر (XXXX9999)
  latitude?: number;          // خط العرض
  longitude?: number;         // خط الطول
  isVerified?: boolean;       // التحقق من العنوان
  verifiedAt?: Date;          // تاريخ التحقق
}

// Sponsor Information (for Iqama holders)
interface Sponsor {
  name: string;
  nameAr: string;
  identityNumber: string;
  relationship: string;
}

// PO Box
interface POBox {
  number: string;
  city: string;
  postalCode: string;
}

// Identity Types
type NajizIdentityType =
  | 'national_id'
  | 'iqama'
  | 'gcc_id'
  | 'passport'
  | 'border_number'
  | 'visitor_id'
  | 'temporary_id'
  | 'diplomatic_id';

type Gender = 'male' | 'female';
type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed';
type GCCCountry = 'UAE' | 'Kuwait' | 'Bahrain' | 'Oman' | 'Qatar';

// Salutation options
type SalutationEn = 'mr' | 'mrs' | 'ms' | 'dr' | 'eng' | 'prof' | 'sheikh' | 'his_excellency' | 'her_excellency';
type SalutationAr = 'السيد' | 'السيدة' | 'الآنسة' | 'الدكتور' | 'الدكتورة' | 'المهندس' | 'المهندسة' | 'الأستاذ' | 'الأستاذة' | 'الشيخ' | 'الشيخة' | 'صاحب السمو' | 'صاحبة السمو' | 'صاحب المعالي' | 'صاحبة المعالي';

// Main Contact Interface
interface Contact {
  _id: string;
  firmId: string;
  lawyerId: string;

  // English Name
  salutation?: SalutationEn;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  suffix?: string;

  // Arabic Name (الاسم الرباعي)
  salutationAr?: SalutationAr;
  arabicName?: ArabicName;
  fullNameArabic?: string;  // Legacy field

  // Personal Details
  gender?: Gender;
  maritalStatus?: MaritalStatus;

  // Type & Classification
  type: 'individual' | 'organization' | 'court' | 'attorney' | 'expert' | 'government' | 'other';
  primaryRole?: string;
  relationshipTypes?: string[];

  // Contact Information
  email?: string;
  phone?: string;
  alternatePhone?: string;
  emails?: Email[];
  phones?: Phone[];

  // Employment
  company?: string;
  organizationId?: string;
  title?: string;
  department?: string;

  // Identity (Najiz)
  identityType: NajizIdentityType;
  nationalId?: string;         // Saudi ID (starts with 1)
  iqamaNumber?: string;        // Resident ID (starts with 2)
  gccId?: string;
  gccCountry?: GCCCountry;
  borderNumber?: string;
  visitorId?: string;
  passportNumber?: string;
  passportCountry?: string;
  passportIssueDate?: Date;
  passportExpiryDate?: Date;
  passportIssuePlace?: string;
  identityIssueDate?: Date;
  identityExpiryDate?: Date;
  identityIssuePlace?: string;
  dateOfBirth?: Date;
  dateOfBirthHijri?: string;   // Format: YYYY/MM/DD
  placeOfBirth?: string;
  nationality?: string;
  nationalityCode?: string;    // ISO 3166-1 alpha-3
  sponsor?: Sponsor;

  // Addresses
  address?: string;            // Legacy
  nationalAddress?: NationalAddress;
  workAddress?: NationalAddress;
  poBox?: POBox;

  // Legacy address fields
  buildingNumber?: string;
  district?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;

  // Communication Preferences
  preferredLanguage?: 'ar' | 'en';
  preferredContactMethod?: string;
  bestTimeToContact?: string;
  doNotContact?: boolean;
  doNotEmail?: boolean;
  doNotCall?: boolean;
  doNotSMS?: boolean;

  // Conflict Check
  conflictCheckStatus?: 'not_checked' | 'clear' | 'potential_conflict' | 'confirmed_conflict';
  conflictNotes?: string;
  conflictCheckDate?: Date;
  conflictCheckedBy?: string;

  // Status
  status: 'active' | 'inactive' | 'archived' | 'deceased';
  priority?: 'low' | 'normal' | 'high' | 'vip';
  vipStatus?: boolean;

  // Risk
  riskLevel?: 'low' | 'medium' | 'high';
  isBlacklisted?: boolean;
  blacklistReason?: string;

  // Tags
  tags?: string[];
  practiceAreas?: string[];

  // Notes
  notes?: string;

  // Linked Entities
  linkedCases?: string[];
  linkedClients?: string[];

  // Audit
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  fullName: string;
  displayName: string;
  fullArabicName: string;
  formattedNationalAddress: string;
  displayShortAddress: string;
  primaryIdentityNumber: string;
}
```

---

## React Components

### Region Selector Component

```tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SAUDI_REGIONS = [
  { code: '01', nameAr: 'منطقة الرياض', nameEn: 'Riyadh Region' },
  { code: '02', nameAr: 'منطقة مكة المكرمة', nameEn: 'Makkah Region' },
  { code: '03', nameAr: 'منطقة المدينة المنورة', nameEn: 'Madinah Region' },
  { code: '04', nameAr: 'منطقة القصيم', nameEn: 'Al-Qassim Region' },
  { code: '05', nameAr: 'المنطقة الشرقية', nameEn: 'Eastern Region' },
  { code: '06', nameAr: 'منطقة عسير', nameEn: 'Asir Region' },
  { code: '07', nameAr: 'منطقة تبوك', nameEn: 'Tabuk Region' },
  { code: '08', nameAr: 'منطقة حائل', nameEn: 'Hail Region' },
  { code: '09', nameAr: 'منطقة الحدود الشمالية', nameEn: 'Northern Borders Region' },
  { code: '10', nameAr: 'منطقة جازان', nameEn: 'Jazan Region' },
  { code: '11', nameAr: 'منطقة نجران', nameEn: 'Najran Region' },
  { code: '12', nameAr: 'منطقة الباحة', nameEn: 'Al-Bahah Region' },
  { code: '13', nameAr: 'منطقة الجوف', nameEn: 'Al-Jawf Region' }
];

interface RegionSelectorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'ar' | 'en';
  placeholder?: string;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  value,
  onChange,
  language = 'ar',
  placeholder = 'اختر المنطقة'
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {SAUDI_REGIONS.map((region) => (
          <SelectItem key={region.code} value={region.code}>
            {language === 'ar' ? region.nameAr : region.nameEn}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### City Selector Component (Dependent on Region)

```tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SAUDI_CITIES_BY_REGION } from './constants';

interface CitySelectorProps {
  regionCode: string;
  value: string;
  onChange: (value: string) => void;
  language?: 'ar' | 'en';
  placeholder?: string;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  regionCode,
  value,
  onChange,
  language = 'ar',
  placeholder = 'اختر المدينة'
}) => {
  const cities = SAUDI_CITIES_BY_REGION[regionCode] || [];

  return (
    <Select value={value} onValueChange={onChange} disabled={!regionCode}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {cities.map((city, index) => (
          <SelectItem key={index} value={language === 'ar' ? city.nameAr : city.nameEn}>
            {language === 'ar' ? city.nameAr : city.nameEn}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

### Arabic Name Form Component

```tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ArabicNameFormProps {
  value: {
    firstName?: string;
    fatherName?: string;
    grandfatherName?: string;
    familyName?: string;
  };
  onChange: (value: any) => void;
}

export const ArabicNameForm: React.FC<ArabicNameFormProps> = ({ value, onChange }) => {
  const handleChange = (field: string, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">الاسم الرباعي</h3>
      <p className="text-sm text-muted-foreground">
        أدخل الاسم الرباعي كما يظهر في الهوية الوطنية
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">الاسم الأول *</Label>
          <Input
            id="firstName"
            dir="rtl"
            value={value.firstName || ''}
            onChange={(e) => handleChange('firstName', e.target.value)}
            placeholder="محمد"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fatherName">اسم الأب *</Label>
          <Input
            id="fatherName"
            dir="rtl"
            value={value.fatherName || ''}
            onChange={(e) => handleChange('fatherName', e.target.value)}
            placeholder="عبدالله"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="grandfatherName">اسم الجد *</Label>
          <Input
            id="grandfatherName"
            dir="rtl"
            value={value.grandfatherName || ''}
            onChange={(e) => handleChange('grandfatherName', e.target.value)}
            placeholder="أحمد"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="familyName">اسم العائلة *</Label>
          <Input
            id="familyName"
            dir="rtl"
            value={value.familyName || ''}
            onChange={(e) => handleChange('familyName', e.target.value)}
            placeholder="السعيد"
          />
        </div>
      </div>

      <div className="p-3 bg-muted rounded-lg">
        <Label className="text-sm">الاسم الكامل:</Label>
        <p className="font-medium" dir="rtl">
          {[value.firstName, value.fatherName, value.grandfatherName, value.familyName]
            .filter(Boolean)
            .join(' ') || 'أدخل الاسم الرباعي'}
        </p>
      </div>
    </div>
  );
};
```

### National Address Form Component

```tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RegionSelector } from './RegionSelector';
import { CitySelector } from './CitySelector';

interface NationalAddressFormProps {
  value: any;
  onChange: (value: any) => void;
  language?: 'ar' | 'en';
}

export const NationalAddressForm: React.FC<NationalAddressFormProps> = ({
  value = {},
  onChange,
  language = 'ar'
}) => {
  const handleChange = (field: string, fieldValue: string) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">
        {language === 'ar' ? 'العنوان الوطني' : 'National Address'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Building Number */}
        <div className="space-y-2">
          <Label htmlFor="buildingNumber">
            {language === 'ar' ? 'رقم المبنى' : 'Building Number'}
          </Label>
          <Input
            id="buildingNumber"
            value={value.buildingNumber || ''}
            onChange={(e) => handleChange('buildingNumber', e.target.value)}
            placeholder="1234"
            maxLength={4}
            pattern="\d{4}"
          />
          <p className="text-xs text-muted-foreground">4 أرقام</p>
        </div>

        {/* Street Name */}
        <div className="space-y-2">
          <Label htmlFor="streetName">
            {language === 'ar' ? 'اسم الشارع' : 'Street Name'}
          </Label>
          <Input
            id="streetName"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            value={language === 'ar' ? value.streetNameAr || '' : value.streetName || ''}
            onChange={(e) => handleChange(
              language === 'ar' ? 'streetNameAr' : 'streetName',
              e.target.value
            )}
            placeholder={language === 'ar' ? 'شارع الملك فهد' : 'King Fahd Street'}
          />
        </div>

        {/* District */}
        <div className="space-y-2">
          <Label htmlFor="district">
            {language === 'ar' ? 'الحي' : 'District'}
          </Label>
          <Input
            id="district"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
            value={language === 'ar' ? value.districtAr || '' : value.district || ''}
            onChange={(e) => handleChange(
              language === 'ar' ? 'districtAr' : 'district',
              e.target.value
            )}
            placeholder={language === 'ar' ? 'حي العليا' : 'Al-Olaya District'}
          />
        </div>

        {/* Region */}
        <div className="space-y-2">
          <Label htmlFor="region">
            {language === 'ar' ? 'المنطقة' : 'Region'}
          </Label>
          <RegionSelector
            value={value.regionCode || ''}
            onChange={(code) => handleChange('regionCode', code)}
            language={language}
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="city">
            {language === 'ar' ? 'المدينة' : 'City'}
          </Label>
          <CitySelector
            regionCode={value.regionCode || ''}
            value={language === 'ar' ? value.cityAr || '' : value.city || ''}
            onChange={(city) => handleChange(
              language === 'ar' ? 'cityAr' : 'city',
              city
            )}
            language={language}
          />
        </div>

        {/* Postal Code */}
        <div className="space-y-2">
          <Label htmlFor="postalCode">
            {language === 'ar' ? 'الرمز البريدي' : 'Postal Code'}
          </Label>
          <Input
            id="postalCode"
            value={value.postalCode || ''}
            onChange={(e) => handleChange('postalCode', e.target.value)}
            placeholder="12345"
            maxLength={5}
            pattern="\d{5}"
          />
          <p className="text-xs text-muted-foreground">5 أرقام</p>
        </div>

        {/* Additional Number */}
        <div className="space-y-2">
          <Label htmlFor="additionalNumber">
            {language === 'ar' ? 'الرقم الإضافي' : 'Additional Number'}
          </Label>
          <Input
            id="additionalNumber"
            value={value.additionalNumber || ''}
            onChange={(e) => handleChange('additionalNumber', e.target.value)}
            placeholder="6789"
            maxLength={4}
            pattern="\d{4}"
          />
          <p className="text-xs text-muted-foreground">4 أرقام</p>
        </div>

        {/* Unit Number */}
        <div className="space-y-2">
          <Label htmlFor="unitNumber">
            {language === 'ar' ? 'رقم الوحدة' : 'Unit Number'}
          </Label>
          <Input
            id="unitNumber"
            value={value.unitNumber || ''}
            onChange={(e) => handleChange('unitNumber', e.target.value)}
            placeholder="101"
          />
        </div>

        {/* Short Address */}
        <div className="space-y-2">
          <Label htmlFor="shortAddress">
            {language === 'ar' ? 'العنوان المختصر' : 'Short Address'}
          </Label>
          <Input
            id="shortAddress"
            value={value.shortAddress || ''}
            onChange={(e) => handleChange('shortAddress', e.target.value)}
            placeholder="ABCD1234"
            maxLength={8}
          />
          <p className="text-xs text-muted-foreground">مثال: ABCD1234</p>
        </div>
      </div>
    </div>
  );
};
```

### Identity Type Selector

```tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const IDENTITY_TYPES = [
  { value: 'national_id', labelAr: 'الهوية الوطنية', labelEn: 'Saudi National ID' },
  { value: 'iqama', labelAr: 'الإقامة', labelEn: 'Resident ID (Iqama)' },
  { value: 'gcc_id', labelAr: 'هوية مواطني الخليج', labelEn: 'GCC ID' },
  { value: 'passport', labelAr: 'جواز السفر', labelEn: 'Passport' },
  { value: 'border_number', labelAr: 'رقم الحدود', labelEn: 'Border Number' },
  { value: 'visitor_id', labelAr: 'هوية زائر', labelEn: 'Visitor ID' },
  { value: 'temporary_id', labelAr: 'هوية مؤقتة', labelEn: 'Temporary ID' },
  { value: 'diplomatic_id', labelAr: 'هوية دبلوماسية', labelEn: 'Diplomatic ID' }
];

interface IdentityTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'ar' | 'en';
}

export const IdentityTypeSelector: React.FC<IdentityTypeSelectorProps> = ({
  value,
  onChange,
  language = 'ar'
}) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={language === 'ar' ? 'نوع الهوية' : 'Identity Type'} />
      </SelectTrigger>
      <SelectContent>
        {IDENTITY_TYPES.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            {language === 'ar' ? type.labelAr : type.labelEn}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

---

## Validation Rules

### National ID Validation

```typescript
// Saudi National ID: 10 digits, starts with 1
export const validateNationalId = (id: string): boolean => {
  return /^1\d{9}$/.test(id);
};

// Iqama Number: 10 digits, starts with 2
export const validateIqamaNumber = (id: string): boolean => {
  return /^2\d{9}$/.test(id);
};

// Postal Code: exactly 5 digits
export const validatePostalCode = (code: string): boolean => {
  return /^\d{5}$/.test(code);
};

// Building Number: exactly 4 digits
export const validateBuildingNumber = (num: string): boolean => {
  return /^\d{4}$/.test(num);
};

// Additional Number: exactly 4 digits
export const validateAdditionalNumber = (num: string): boolean => {
  return /^\d{4}$/.test(num);
};

// Short Address: 4 letters + 4 digits
export const validateShortAddress = (addr: string): boolean => {
  return /^[A-Z]{4}\d{4}$/.test(addr.replace(/\s/g, ''));
};

// Hijri Date: YYYY/MM/DD format
export const validateHijriDate = (date: string): boolean => {
  return /^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|30)$/.test(date);
};
```

### Contact Validation Schema (Zod)

```typescript
import { z } from 'zod';

const arabicNameSchema = z.object({
  firstName: z.string().max(50).optional(),
  fatherName: z.string().max(50).optional(),
  grandfatherName: z.string().max(50).optional(),
  familyName: z.string().max(50).optional(),
  fullName: z.string().max(200).optional()
});

const nationalAddressSchema = z.object({
  buildingNumber: z.string().regex(/^\d{4}$/).optional(),
  streetName: z.string().max(100).optional(),
  streetNameAr: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  districtAr: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  cityAr: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  regionCode: z.string().regex(/^(0[1-9]|1[0-3])$/).optional(),
  postalCode: z.string().regex(/^\d{5}$/).optional(),
  additionalNumber: z.string().regex(/^\d{4}$/).optional(),
  unitNumber: z.string().max(10).optional(),
  shortAddress: z.string().regex(/^[A-Z]{4}\d{4}$/).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isVerified: z.boolean().optional(),
  verifiedAt: z.date().optional()
});

export const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  arabicName: arabicNameSchema.optional(),

  identityType: z.enum([
    'national_id', 'iqama', 'gcc_id', 'passport',
    'border_number', 'visitor_id', 'temporary_id', 'diplomatic_id'
  ]).default('national_id'),

  nationalId: z.string().regex(/^1\d{9}$/).optional(),
  iqamaNumber: z.string().regex(/^2\d{9}$/).optional(),

  nationalAddress: nationalAddressSchema.optional(),

  dateOfBirthHijri: z.string().regex(/^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|30)$/).optional()
});
```

---

## API Endpoints

### GET /api/contacts

Get contacts with filtering support for new fields.

**Query Parameters:**
- `regionCode` - Filter by Saudi region
- `city` - Filter by city
- `identityType` - Filter by identity type
- `search` - Search in Arabic name, national ID, etc.

### GET /api/contacts/regions

Get list of Saudi regions with cities.

**Response:**
```json
{
  "regions": [
    {
      "code": "01",
      "nameAr": "منطقة الرياض",
      "nameEn": "Riyadh Region",
      "capitalAr": "الرياض",
      "capitalEn": "Riyadh",
      "cities": [
        { "nameAr": "الرياض", "nameEn": "Riyadh" },
        { "nameAr": "الخرج", "nameEn": "Al-Kharj" }
      ]
    }
  ]
}
```

### POST /api/contacts

Create contact with full Najiz fields.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "arabicName": {
    "firstName": "محمد",
    "fatherName": "عبدالله",
    "grandfatherName": "أحمد",
    "familyName": "السعيد"
  },
  "identityType": "national_id",
  "nationalId": "1234567890",
  "nationalAddress": {
    "buildingNumber": "1234",
    "streetNameAr": "شارع الملك فهد",
    "districtAr": "حي العليا",
    "cityAr": "الرياض",
    "regionCode": "01",
    "postalCode": "12345",
    "additionalNumber": "6789"
  }
}
```

---

## Migration Guide

### From Legacy to New Structure

```typescript
// Migrating existing contacts to new structure
const migrateContact = (oldContact: any) => {
  return {
    ...oldContact,

    // Migrate full Arabic name to structured format
    arabicName: oldContact.fullNameArabic ? {
      fullName: oldContact.fullNameArabic
    } : undefined,

    // Migrate legacy address to nationalAddress
    nationalAddress: {
      buildingNumber: oldContact.buildingNumber,
      district: oldContact.district,
      districtAr: oldContact.district,
      city: oldContact.city,
      cityAr: oldContact.city,
      region: oldContact.province,
      postalCode: oldContact.postalCode
    },

    // Set identity type based on available ID
    identityType: oldContact.nationalId ? 'national_id' :
                  oldContact.iqamaNumber ? 'iqama' :
                  oldContact.passportNumber ? 'passport' : 'national_id'
  };
};
```

---

## Summary Statistics

- **13 Saudi Administrative Regions**
- **131+ Major Cities** (5-16 per region)
- **8 Identity Document Types**
- **7-Component National Address Structure**
- **4-Part Arabic Name Structure**
- **15+ New Database Indexes** for performance
- **6 Virtual Fields** for computed values
- **Full Backward Compatibility** with legacy fields

---

## Related Documentation

- [FRONTEND_NAJIZ_INTEGRATION32.md](./FRONTEND_NAJIZ_INTEGRATION32.md) - Case & Contract Najiz integration
- [FRONTEND_CASENOTION_INTEGRATION32.md](./FRONTEND_CASENOTION_INTEGRATION32.md) - CaseNotion workspace integration
