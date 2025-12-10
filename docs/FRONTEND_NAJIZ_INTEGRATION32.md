# Najiz Platform Integration - Frontend Guide

## Overview

This documentation covers the comprehensive integration of Saudi Arabia's Najiz (ناجز) judicial platform fields into the Case and LegalContract models.

**Najiz Platform**: https://najiz.sa/
- 160+ electronic judicial services
- 180+ courts across Saudi Arabia
- Serves individuals, businesses, government, and lawyers

---

## Table of Contents

1. [Case Model Fields](#1-case-model-fields)
2. [LegalContract Model Fields](#2-legalcontract-model-fields)
3. [Saudi-Specific Enums](#3-saudi-specific-enums)
4. [API Endpoints](#4-api-endpoints)
5. [React Components](#5-react-components)
6. [Validation Rules](#6-validation-rules)
7. [Dropdown Data](#7-dropdown-data)
8. [Date Handling](#8-date-handling)
9. [RTL Support](#9-rtl-support)

---

## 1. Case Model Fields

### 1.1 Najiz Case Information (`najiz`)

```typescript
interface NajizCaseInfo {
  // Case Registration
  caseNumber: string;           // رقم القضية
  applicationNumber: string;    // رقم الطلب
  referenceNumber: string;      // رقم المرجع
  yearHijri: string;           // السنة الهجرية
  yearGregorian: number;       // السنة الميلادية

  // Filing Dates
  filingDate: Date;            // تاريخ تقديم الدعوى
  filingDateHijri: string;
  registrationDate: Date;      // تاريخ قيد الدعوى

  // Classification (3-level system)
  mainClassification: 'عامة' | 'جزائية' | 'أحوال_شخصية' | 'تجارية' | 'عمالية' | 'تنفيذ';
  mainClassificationEn: 'general' | 'criminal' | 'personal_status' | 'commercial' | 'labor' | 'enforcement';
  subClassification: string;    // التصنيف الفرعي
  caseType: string;            // نوع الدعوى
  caseTypeCode: string;

  // Court Information
  court: {
    type: 'supreme' | 'appeal' | 'general' | 'criminal' | 'personal_status' | 'commercial' | 'labor' | 'enforcement';
    typeAr: string;
    name: string;
    city: string;
    region: string;
    circuitNumber: string;
    circuitType: string;
  };

  // Judicial Panel
  judicialPanel: {
    panelNumber: string;
    presidingJudge: string;
    judges: string[];
    clerk: string;
  };

  // Status
  najizStatus: 'pending_registration' | 'registered' | 'scheduled' | 'in_session' |
               'postponed' | 'judgment_issued' | 'appealed' | 'final' |
               'enforcement' | 'closed' | 'archived';

  // Sessions
  sessions: NajizSession[];

  // Judgment
  judgment: {
    hasJudgment: boolean;
    judgmentNumber: string;
    judgmentDate: Date;
    judgmentDateHijri: string;
    judgmentType: 'in_favor' | 'against' | 'partial' | 'dismissed' | 'settled';
    summary: string;
    fullText: string;
    awardedAmount: number;
    currency: string;
    executionStatus: 'pending' | 'in_execution' | 'executed' | 'not_applicable';
    deedNumber: string;
  };

  // Appeal
  appeal: {
    hasAppeal: boolean;
    appealNumber: string;
    appealDate: Date;
    appealDeadline: Date;
    appealCourt: string;
    appealStatus: 'filed' | 'under_review' | 'hearing_scheduled' | 'decided' | 'rejected' | 'accepted';
    supremeCourtReview: {
      requested: boolean;
      requestDate: Date;
      result: string;
    };
  };

  // E-Litigation
  eLitigation: {
    enabled: boolean;
    virtualHearing: boolean;
    virtualHearingUrl: string;
    electronicPleadings: ElectronicPleading[];
    electronicNotifications: ElectronicNotification[];
  };

  // Sync
  lastSyncedAt: Date;
  syncStatus: 'synced' | 'pending' | 'error';
}
```

### 1.2 Plaintiff/Defendant Information

```typescript
interface PartyInfo {
  type: 'individual' | 'company' | 'government';

  // Individual Fields
  nationalId: string;
  identityType: 'national_id' | 'iqama' | 'visitor_id' | 'gcc_id' | 'passport';
  fullNameArabic: string;      // الاسم الرباعي
  firstName: string;
  fatherName: string;
  grandfatherName: string;
  familyName: string;
  fullNameEnglish: string;
  nationality: string;
  gender: 'male' | 'female';

  // Company Fields
  crNumber: string;            // رقم السجل التجاري
  companyName: string;
  companyNameEnglish: string;
  unifiedNumber: string;       // الرقم الموحد
  authorizedRepresentative: {
    name: string;
    nationalId: string;
    position: string;
    phone: string;
  };

  // Contact
  phone: string;
  email: string;

  // National Address
  nationalAddress: NationalAddress;

  // POA
  powerOfAttorney: {
    hasPOA: boolean;
    poaNumber: string;
    lawyerName: string;
    lawyerLicenseNumber: string;
    lawyerPhone: string;
    issueDate: Date;
    expiryDate: Date;
    authorizations: string[];
  };

  // Defendant only
  responseStatus?: 'not_notified' | 'notified' | 'responded' | 'no_response';
  responseDate?: Date;
  defenseStatement?: string;
}
```

### 1.3 Labor Case Details

```typescript
interface LaborCaseDetails {
  laborOfficeReferral: {
    hasReferral: boolean;
    referralNumber: string;    // رقم الإحالة
    referralDate: Date;
    settlementMinutes: string; // محضر التسوية
    settlementDate: Date;
    mediatorName: string;
  };

  employee: {
    name: string;
    nationalId: string;
    iqamaNumber: string;
    nationality: string;
    phone: string;
    jobTitle: string;
    department: string;
    employmentStartDate: Date;
    employmentEndDate: Date;
    lastSalary: number;
    contractType: 'definite' | 'indefinite' | 'part_time' | 'seasonal';
    workCity: string;
  };

  employer: {
    companyName: string;
    crNumber: string;
    unifiedNumber: string;
    molNumber: string;         // رقم وزارة العمل
    industry: string;
    phone: string;
    address: string;
    city: string;
    authorizedRep: AuthorizedRep;
  };

  claimTypes: Array<{
    type: LaborClaimType;
    amount: number;
    period: string;
    description: string;
  }>;

  gosiComplaint: {
    hasComplaint: boolean;
    complaintNumber: string;
    complaintDate: Date;
    complaintType: string;
    status: string;
  };

  isSmallClaim: boolean;       // Under SAR 50,000 = final, no appeal
  totalClaimAmount: number;
}

type LaborClaimType =
  | 'wages'
  | 'overtime'
  | 'end_of_service'
  | 'leave_balance'
  | 'work_injury'
  | 'wrongful_termination'
  | 'housing_allowance'
  | 'transport_allowance'
  | 'medical_insurance'
  | 'gosi_subscription'
  | 'certificate_of_experience'
  | 'contract_violation'
  | 'discrimination'
  | 'harassment';
```

### 1.4 Commercial Case Details

```typescript
interface CommercialCaseDetails {
  claimValue: number;
  currency: string;
  isAboveThreshold: boolean;   // > 100,000 SAR

  contract: {
    hasContract: boolean;
    contractNumber: string;
    contractDate: Date;
    contractType: 'sale' | 'lease' | 'service' | 'partnership' | 'agency' | 'franchise' | 'construction' | 'other';
    contractValue: number;
    partyOneName: string;
    partyTwoName: string;
  };

  bankingDetails: {
    bankName: string;
    accountNumber: string;
    chequeNumber: string;
    chequeDate: Date;
    chequeAmount: number;
    promissoryNoteNumber: string;
    promissoryNoteDate: Date;
    promissoryNoteAmount: number;
  };

  bankruptcy: {
    isBankruptcyCase: boolean;
    type: 'protective_settlement' | 'financial_restructuring' | 'liquidation';
    trusteeAppointment: { trusteeName: string; appointmentDate: Date; };
    creditorsMeeting: Array<{ date: Date; outcome: string; }>;
  };

  preLitigationNotice: {
    sent: boolean;
    sentDate: Date;
    method: string;
    proofAttached: boolean;
  };

  attorneyRequired: boolean;
}
```

### 1.5 Personal Status Details

```typescript
interface PersonalStatusDetails {
  caseCategory: 'marriage' | 'divorce' | 'custody' | 'alimony' | 'visitation' |
                'inheritance' | 'guardianship' | 'waqf' | 'will';

  marriageInfo: {
    marriageContractNumber: string;
    marriageDate: Date;
    marriageDateHijri: string;
    divorceDate: Date;
    divorceDateHijri: string;
    divorceType: 'talaq' | 'khula' | 'judicial' | 'faskh';
    iddahEndDate: Date;        // عدة المرأة
    mahr: {
      advanced: number;
      deferred: number;
    };
  };

  custodyInfo: {
    children: Array<{
      name: string;
      nationalId: string;
      dateOfBirth: Date;
      gender: 'male' | 'female';
      currentCustodian: string;
      requestedCustodian: string;
    }>;
    visitationSchedule: string;
    travelPermission: string;
  };

  supportInfo: {
    type: 'child_support' | 'wife_support' | 'parent_support';
    currentAmount: number;
    requestedAmount: number;
    frequency: 'monthly' | 'yearly' | 'one_time';
  };

  inheritanceInfo: {
    deceasedName: string;
    deceasedNationalId: string;
    deathDate: Date;
    deathCertificateNumber: string;
    heirCertificateNumber: string;  // صك حصر الورثة
    heirs: Array<{
      name: string;
      nationalId: string;
      relationship: string;
      share: string;            // e.g., "1/4", "1/8"
    }>;
    estateValue: number;
    realEstateIncluded: boolean;
  };

  guardianshipInfo: {
    type: 'minor' | 'interdiction' | 'property';
    wardName: string;
    wardNationalId: string;
    currentGuardian: string;
    requestedGuardian: string;
    guardianshipReason: string;
  };

  feeExempt: boolean;          // Family cases are exempt
}
```

### 1.6 Enforcement Details

```typescript
interface EnforcementDetails {
  hasEnforcementRequest: boolean;

  enforcementRequest: {
    requestNumber: string;
    requestDate: Date;
    enforcementCourt: string;
    enforcementCircuit: string;
  };

  enforcementDocument: {
    type: 'judgment' | 'judicial_decision' | 'judicial_order' | 'cheque' |
          'promissory_note' | 'bill_of_exchange' | 'notarized_contract' |
          'settlement' | 'arbitration_award' | 'foreign_judgment';
    documentNumber: string;
    documentDate: Date;
    issuingAuthority: string;
    amount: number;
    currency: string;
  };

  actions: Array<{
    type: 'notification' | 'publication' | 'service_suspension' | 'account_freeze' |
          'asset_attachment' | 'travel_ban' | 'id_suspension' | 'property_seizure';
    date: Date;
    status: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
    details: string;
  }>;

  paymentInfo: {
    totalDue: number;
    amountPaid: number;
    remainingBalance: number;
    paymentSchedule: Array<{
      dueDate: Date;
      amount: number;
      paid: boolean;
      paidDate: Date;
    }>;
    ibanNumber: string;
  };

  debtorStatus: {
    hasAssets: boolean;
    assetsDescription: string;
    isAbsconding: boolean;
    isInsolvent: boolean;
    insolvencyRequestDate: Date;
  };
}
```

### 1.7 Judicial Costs

```typescript
interface JudicialCosts {
  isExempt: boolean;
  exemptionReason: string;     // "family case", "bankruptcy", "public right"

  filingFee: {
    amount: number;
    paidDate: Date;
    receiptNumber: string;
    paymentMethod: 'sadad' | 'mada' | 'credit_card';
  };

  additionalFees: Array<{
    type: string;              // "expert fees", "translation fees"
    amount: number;
    paidDate: Date;
    receiptNumber: string;
  }>;

  totalPaid: number;
  calculatorUsed: boolean;     // https://cfee.moj.gov.sa/index.html
}
```

---

## 2. LegalContract Model Fields

### 2.1 Basic Contract Info

```typescript
interface LegalContract {
  contractNumber: string;      // Auto-generated: CTR-YYYY-XXXXXX
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  contractType: ContractType;
  contractTypeAr: string;

  // Dates
  draftDate: Date;
  executionDate: Date;
  effectiveDate: Date;
  expiryDate: Date;
  executionDateHijri: string;
  effectiveDateHijri: string;
  expiryDateHijri: string;

  // Duration
  duration: {
    value: number;
    unit: 'days' | 'weeks' | 'months' | 'years';
    autoRenew: boolean;
    renewalTerms: string;
    noticePeriod: { value: number; unit: 'days' | 'weeks' | 'months'; };
  };

  // Financial
  financialTerms: {
    totalValue: number;
    currency: string;
    paymentSchedule: PaymentScheduleItem[];
    advancePayment: number;
    retentionAmount: number;
    penaltyClause: PenaltyClause;
    vatIncluded: boolean;
    vatAmount: number;
  };

  // Status
  status: ContractStatus;

  // Language
  language: 'ar' | 'en' | 'bilingual';
  textDirection: 'rtl' | 'ltr';
}

type ContractType =
  // Commercial
  | 'sale' | 'purchase' | 'lease' | 'rental' | 'service' | 'employment'
  | 'partnership' | 'joint_venture' | 'agency' | 'franchise' | 'distribution'
  | 'construction' | 'maintenance' | 'supply' | 'consulting' | 'license'
  // Legal Documents
  | 'power_of_attorney' | 'settlement' | 'release' | 'non_disclosure'
  | 'non_compete' | 'guarantee' | 'mortgage' | 'pledge'
  // Personal Status
  | 'marriage_contract' | 'divorce_agreement' | 'custody_agreement'
  | 'alimony_agreement' | 'inheritance_distribution' | 'waqf_deed' | 'will'
  // Other
  | 'memorandum_of_understanding' | 'letter_of_intent' | 'other';

type ContractStatus =
  | 'draft' | 'under_review' | 'pending_approval' | 'approved'
  | 'pending_signature' | 'partially_signed' | 'fully_signed'
  | 'active' | 'expired' | 'terminated' | 'suspended'
  | 'in_dispute' | 'in_enforcement' | 'completed' | 'archived';
```

### 2.2 Contract Parties

```typescript
interface ContractParty {
  role: PartyRole;
  roleAr: string;
  partyType: 'individual' | 'company' | 'government';

  // Individual
  fullNameArabic: string;
  firstName: string;
  fatherName: string;
  grandfatherName: string;
  familyName: string;
  fullNameEnglish: string;
  nationality: string;
  nationalId: string;
  identityType: IdentityType;
  idExpiryDate: Date;
  gender: 'male' | 'female';
  dateOfBirth: Date;
  profession: string;

  // Company
  companyName: string;
  companyNameEnglish: string;
  crNumber: string;
  unifiedNumber: string;
  crExpiryDate: Date;
  capital: number;
  mainActivity: string;
  authorizedRep: AuthorizedRep;

  // Contact
  phone: string;
  email: string;
  nationalAddress: NationalAddress;

  // Signature
  signatureStatus: 'pending' | 'signed' | 'declined' | 'not_required';
  signedDate: Date;
  signatureMethod: 'physical' | 'electronic' | 'nafath' | 'absher';
  signatureReference: string;
}

type PartyRole =
  | 'party_one' | 'party_two' | 'first_party' | 'second_party'
  | 'seller' | 'buyer' | 'lessor' | 'lessee'
  | 'employer' | 'employee' | 'principal' | 'agent'
  | 'guarantor' | 'beneficiary' | 'witness';
```

### 2.3 Najiz Integration

```typescript
interface ContractNajizIntegration {
  isNotarized: boolean;
  notarizationType: 'notary_public' | 'court' | 'embassy' | 'virtual_notary';
  notaryNumber: string;
  notarizationNumber: string;
  notarizationDate: Date;
  notarizationDateHijri: string;
  notaryCity: string;
  notaryBranch: string;

  electronicDeedNumber: string;
  verificationCode: string;
  qrCode: string;

  // Marriage Contract
  marriageRegistration: {
    registrationNumber: string;
    registrationDate: Date;
    maazounName: string;
    maazounNumber: string;
    witnesses: Array<{ name: string; nationalId: string; }>;
  };

  // Real Estate
  realEstateTransfer: {
    deedNumber: string;
    oldDeedNumber: string;
    propertyType: string;
    propertyLocation: {
      city: string;
      district: string;
      plotNumber: string;
      planNumber: string;
    };
    propertyArea: number;
    transferDate: Date;
  };

  // POA
  poaDetails: {
    poaNumber: string;
    poaType: 'general' | 'specific' | 'litigation';
    authorizations: string[];
    limitations: string;
    validFrom: Date;
    validUntil: Date;
    isRevoked: boolean;
    revocationDate: Date;
    revocationNumber: string;
  };

  lastSyncedAt: Date;
  syncStatus: 'synced' | 'pending' | 'error' | 'not_applicable';
}
```

---

## 3. Saudi-Specific Enums

### 3.1 National Address Format

```typescript
interface NationalAddress {
  buildingNumber: string;    // رقم المبنى (4 digits)
  streetName: string;        // اسم الشارع
  district: string;          // الحي
  city: string;              // المدينة
  region: string;            // المنطقة
  postalCode: string;        // الرمز البريدي (5 digits)
  additionalNumber: string;  // الرقم الإضافي (4 digits)
  shortAddress: string;      // العنوان المختصر (e.g., RHMA3184)
  country: string;           // Default: 'Saudi Arabia'
}
```

### 3.2 Identity Types

| Code | Arabic | English |
|------|--------|---------|
| `national_id` | هوية وطنية | National ID |
| `iqama` | إقامة | Residence Permit |
| `visitor_id` | هوية زائر | Visitor ID |
| `gcc_id` | هوية وطنية خليجية | GCC National ID |
| `passport` | جواز سفر | Passport |

### 3.3 Court Types

| Code | Arabic | English |
|------|--------|---------|
| `supreme` | المحكمة العليا | Supreme Court |
| `appeal` | محكمة الاستئناف | Court of Appeal |
| `general` | المحكمة العامة | General Court |
| `criminal` | المحكمة الجزائية | Criminal Court |
| `personal_status` | محكمة الأحوال الشخصية | Personal Status Court |
| `commercial` | المحكمة التجارية | Commercial Court |
| `labor` | المحكمة العمالية | Labor Court |
| `enforcement` | محكمة التنفيذ | Enforcement Court |

### 3.4 Case Classifications

| Main | Arabic | Sub-Classifications |
|------|--------|---------------------|
| `general` | عامة | عقارية, مروري, حقوقية |
| `criminal` | جزائية | تعزير, حدود, قصاص |
| `personal_status` | أحوال شخصية | نكاح, طلاق, حضانة, ميراث, ولاية, وقف |
| `commercial` | تجارية | عقود, شراكات, إفلاس |
| `labor` | عمالية | أجور, تعويض, إنهاء علاقة |
| `enforcement` | تنفيذ | تنفيذ مالي, تنفيذ مباشر |

### 3.5 POA Authorizations

```typescript
const POA_AUTHORIZATIONS = [
  { value: 'litigation', ar: 'المرافعة' },
  { value: 'settlement', ar: 'الصلح' },
  { value: 'acknowledgment', ar: 'الإقرار' },
  { value: 'collection', ar: 'القبض' },
  { value: 'discharge', ar: 'الإبراء' },
  { value: 'sub_delegation', ar: 'توكيل الغير' },
  { value: 'buy_sell', ar: 'البيع والشراء' },
  { value: 'lease', ar: 'الإيجار' },
  { value: 'mortgage', ar: 'الرهن' },
  { value: 'waiver', ar: 'التنازل' },
  { value: 'appeal', ar: 'الاستئناف' }
];
```

---

## 4. API Endpoints

### 4.1 Case Endpoints (Existing)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cases` | List cases with new Najiz fields |
| GET | `/api/cases/:id` | Get case with full Najiz data |
| POST | `/api/cases` | Create case with Najiz info |
| PATCH | `/api/cases/:id` | Update case Najiz fields |

### 4.2 Contract Endpoints (New - `/api/contracts`)

#### CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts` | List contracts (paginated, filtered) |
| GET | `/api/contracts/:id` | Get single contract |
| POST | `/api/contracts` | Create contract |
| PATCH | `/api/contracts/:id` | Update contract |
| DELETE | `/api/contracts/:id` | Archive contract |
| GET | `/api/contracts/search?q=` | Search contracts |

#### Parties
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contracts/:id/parties` | Add party |
| PATCH | `/api/contracts/:id/parties/:idx` | Update party |
| DELETE | `/api/contracts/:id/parties/:idx` | Remove party |

#### Signatures
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contracts/:id/signatures/initiate` | Start signature workflow |
| POST | `/api/contracts/:id/signatures/:idx` | Record signature |
| GET | `/api/contracts/:id/signatures` | Get signature status |

#### Amendments & Versions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contracts/:id/amendments` | Add amendment |
| GET | `/api/contracts/:id/amendments` | Get amendments |
| POST | `/api/contracts/:id/versions` | Create version |
| GET | `/api/contracts/:id/versions` | Get version history |
| POST | `/api/contracts/:id/versions/:v/revert` | Revert to version |

#### Najiz Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contracts/:id/notarization` | Record notarization |
| GET | `/api/contracts/:id/notarization/verify` | Verify with Najiz |

#### Enforcement
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/contracts/:id/breach` | Record breach |
| POST | `/api/contracts/:id/enforcement` | Initiate enforcement |
| PATCH | `/api/contracts/:id/enforcement` | Update status |
| POST | `/api/contracts/:id/link-case` | Link to case |

#### Reporting
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts/expiring?days=30` | Expiring contracts |
| GET | `/api/contracts/client/:clientId` | Client contracts |
| GET | `/api/contracts/statistics` | Contract stats |

#### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contracts/templates` | Get templates |
| POST | `/api/contracts/templates/:id/use` | Create from template |
| POST | `/api/contracts/:id/save-as-template` | Save as template |

---

## 5. React Components

### 5.1 National Address Input

```tsx
interface NationalAddressInputProps {
  value: NationalAddress;
  onChange: (address: NationalAddress) => void;
  required?: boolean;
  disabled?: boolean;
}

const NationalAddressInput: React.FC<NationalAddressInputProps> = ({
  value,
  onChange,
  required = false,
  disabled = false
}) => {
  return (
    <div className="national-address-form" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        {/* Building Number - 4 digits */}
        <div>
          <label>رقم المبنى</label>
          <input
            type="text"
            maxLength={4}
            pattern="\d{4}"
            value={value.buildingNumber || ''}
            onChange={(e) => onChange({ ...value, buildingNumber: e.target.value })}
            placeholder="1234"
            required={required}
            disabled={disabled}
          />
        </div>

        {/* Street Name */}
        <div>
          <label>اسم الشارع</label>
          <input
            type="text"
            value={value.streetName || ''}
            onChange={(e) => onChange({ ...value, streetName: e.target.value })}
            required={required}
            disabled={disabled}
          />
        </div>

        {/* District */}
        <div>
          <label>الحي</label>
          <input
            type="text"
            value={value.district || ''}
            onChange={(e) => onChange({ ...value, district: e.target.value })}
            required={required}
            disabled={disabled}
          />
        </div>

        {/* City Dropdown */}
        <div>
          <label>المدينة</label>
          <select
            value={value.city || ''}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            required={required}
            disabled={disabled}
          >
            <option value="">اختر المدينة</option>
            {SAUDI_CITIES.map(city => (
              <option key={city.value} value={city.value}>{city.label}</option>
            ))}
          </select>
        </div>

        {/* Region Dropdown */}
        <div>
          <label>المنطقة</label>
          <select
            value={value.region || ''}
            onChange={(e) => onChange({ ...value, region: e.target.value })}
            required={required}
            disabled={disabled}
          >
            <option value="">اختر المنطقة</option>
            {SAUDI_REGIONS.map(region => (
              <option key={region.value} value={region.value}>{region.label}</option>
            ))}
          </select>
        </div>

        {/* Postal Code - 5 digits */}
        <div>
          <label>الرمز البريدي</label>
          <input
            type="text"
            maxLength={5}
            pattern="\d{5}"
            value={value.postalCode || ''}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value })}
            placeholder="12345"
            required={required}
            disabled={disabled}
          />
        </div>

        {/* Additional Number - 4 digits */}
        <div>
          <label>الرقم الإضافي</label>
          <input
            type="text"
            maxLength={4}
            pattern="\d{4}"
            value={value.additionalNumber || ''}
            onChange={(e) => onChange({ ...value, additionalNumber: e.target.value })}
            placeholder="1234"
            disabled={disabled}
          />
        </div>

        {/* Short Address */}
        <div>
          <label>العنوان المختصر</label>
          <input
            type="text"
            maxLength={8}
            value={value.shortAddress || ''}
            onChange={(e) => onChange({ ...value, shortAddress: e.target.value })}
            placeholder="RHMA3184"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};
```

### 5.2 Case Classification Selector

```tsx
interface CaseClassificationSelectorProps {
  mainClassification: string;
  subClassification: string;
  caseType: string;
  onChange: (data: { main: string; sub: string; type: string }) => void;
}

const CaseClassificationSelector: React.FC<CaseClassificationSelectorProps> = ({
  mainClassification,
  subClassification,
  caseType,
  onChange
}) => {
  const [subOptions, setSubOptions] = useState<SelectOption[]>([]);
  const [typeOptions, setTypeOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (mainClassification) {
      setSubOptions(CASE_SUB_CLASSIFICATIONS[mainClassification] || []);
      setTypeOptions([]);
    }
  }, [mainClassification]);

  useEffect(() => {
    if (subClassification) {
      setTypeOptions(CASE_TYPES[`${mainClassification}_${subClassification}`] || []);
    }
  }, [mainClassification, subClassification]);

  return (
    <div className="case-classification" dir="rtl">
      {/* Main Classification */}
      <div>
        <label>التصنيف الرئيسي</label>
        <select
          value={mainClassification}
          onChange={(e) => onChange({ main: e.target.value, sub: '', type: '' })}
          required
        >
          <option value="">اختر التصنيف</option>
          <option value="عامة">عامة (General)</option>
          <option value="جزائية">جزائية (Criminal)</option>
          <option value="أحوال_شخصية">أحوال شخصية (Personal Status)</option>
          <option value="تجارية">تجارية (Commercial)</option>
          <option value="عمالية">عمالية (Labor)</option>
          <option value="تنفيذ">تنفيذ (Enforcement)</option>
        </select>
      </div>

      {/* Sub Classification */}
      {subOptions.length > 0 && (
        <div>
          <label>التصنيف الفرعي</label>
          <select
            value={subClassification}
            onChange={(e) => onChange({ main: mainClassification, sub: e.target.value, type: '' })}
            required
          >
            <option value="">اختر التصنيف الفرعي</option>
            {subOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Case Type */}
      {typeOptions.length > 0 && (
        <div>
          <label>نوع الدعوى</label>
          <select
            value={caseType}
            onChange={(e) => onChange({ main: mainClassification, sub: subClassification, type: e.target.value })}
            required
          >
            <option value="">اختر نوع الدعوى</option>
            {typeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};
```

### 5.3 Party Information Form

```tsx
interface PartyFormProps {
  party: PartyInfo;
  onChange: (party: PartyInfo) => void;
  partyLabel: string;  // "المدعي" or "المدعى عليه"
}

const PartyForm: React.FC<PartyFormProps> = ({ party, onChange, partyLabel }) => {
  return (
    <div className="party-form" dir="rtl">
      <h3>{partyLabel}</h3>

      {/* Party Type */}
      <div>
        <label>نوع الطرف</label>
        <select
          value={party.type}
          onChange={(e) => onChange({ ...party, type: e.target.value as PartyInfo['type'] })}
        >
          <option value="individual">فرد</option>
          <option value="company">شركة</option>
          <option value="government">جهة حكومية</option>
        </select>
      </div>

      {party.type === 'individual' && (
        <>
          {/* Identity Type */}
          <div>
            <label>نوع الهوية</label>
            <select
              value={party.identityType}
              onChange={(e) => onChange({ ...party, identityType: e.target.value as IdentityType })}
            >
              <option value="national_id">هوية وطنية</option>
              <option value="iqama">إقامة</option>
              <option value="visitor_id">هوية زائر</option>
              <option value="gcc_id">هوية خليجية</option>
              <option value="passport">جواز سفر</option>
            </select>
          </div>

          {/* National ID */}
          <div>
            <label>رقم الهوية</label>
            <input
              type="text"
              maxLength={10}
              pattern="[12]\d{9}"
              value={party.nationalId || ''}
              onChange={(e) => onChange({ ...party, nationalId: e.target.value })}
              placeholder="1XXXXXXXXX أو 2XXXXXXXXX"
            />
          </div>

          {/* Four-part Arabic Name */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label>الاسم الأول</label>
              <input
                value={party.firstName || ''}
                onChange={(e) => onChange({ ...party, firstName: e.target.value })}
              />
            </div>
            <div>
              <label>اسم الأب</label>
              <input
                value={party.fatherName || ''}
                onChange={(e) => onChange({ ...party, fatherName: e.target.value })}
              />
            </div>
            <div>
              <label>اسم الجد</label>
              <input
                value={party.grandfatherName || ''}
                onChange={(e) => onChange({ ...party, grandfatherName: e.target.value })}
              />
            </div>
            <div>
              <label>اسم العائلة</label>
              <input
                value={party.familyName || ''}
                onChange={(e) => onChange({ ...party, familyName: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      {party.type === 'company' && (
        <>
          {/* CR Number */}
          <div>
            <label>رقم السجل التجاري</label>
            <input
              type="text"
              maxLength={10}
              pattern="\d{10}"
              value={party.crNumber || ''}
              onChange={(e) => onChange({ ...party, crNumber: e.target.value })}
            />
          </div>

          {/* Company Name */}
          <div>
            <label>اسم الشركة</label>
            <input
              value={party.companyName || ''}
              onChange={(e) => onChange({ ...party, companyName: e.target.value })}
            />
          </div>

          {/* Authorized Representative */}
          <fieldset>
            <legend>الممثل النظامي</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label>الاسم</label>
                <input
                  value={party.authorizedRepresentative?.name || ''}
                  onChange={(e) => onChange({
                    ...party,
                    authorizedRepresentative: {
                      ...party.authorizedRepresentative,
                      name: e.target.value
                    }
                  })}
                />
              </div>
              <div>
                <label>المنصب</label>
                <input
                  value={party.authorizedRepresentative?.position || ''}
                  onChange={(e) => onChange({
                    ...party,
                    authorizedRepresentative: {
                      ...party.authorizedRepresentative,
                      position: e.target.value
                    }
                  })}
                />
              </div>
            </div>
          </fieldset>
        </>
      )}

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>رقم الجوال</label>
          <input
            type="tel"
            pattern="05\d{8}"
            value={party.phone || ''}
            onChange={(e) => onChange({ ...party, phone: e.target.value })}
            placeholder="05XXXXXXXX"
          />
        </div>
        <div>
          <label>البريد الإلكتروني</label>
          <input
            type="email"
            value={party.email || ''}
            onChange={(e) => onChange({ ...party, email: e.target.value })}
          />
        </div>
      </div>

      {/* National Address */}
      <NationalAddressInput
        value={party.nationalAddress || {}}
        onChange={(address) => onChange({ ...party, nationalAddress: address })}
      />
    </div>
  );
};
```

---

## 6. Validation Rules

### 6.1 Identity Validation

```typescript
const VALIDATION_RULES = {
  nationalId: {
    pattern: /^[12]\d{9}$/,
    message: 'رقم الهوية يجب أن يكون 10 أرقام يبدأ بـ 1 (سعودي) أو 2 (مقيم)',
    validate: (value: string) => {
      if (!value) return true;
      // Starts with 1 = Saudi, 2 = Resident
      return /^[12]\d{9}$/.test(value);
    }
  },

  crNumber: {
    pattern: /^\d{10}$/,
    message: 'رقم السجل التجاري يجب أن يكون 10 أرقام',
    validate: (value: string) => /^\d{10}$/.test(value)
  },

  phone: {
    pattern: /^05\d{8}$/,
    message: 'رقم الجوال يجب أن يكون بصيغة 05XXXXXXXX',
    validate: (value: string) => /^05\d{8}$/.test(value)
  },

  postalCode: {
    pattern: /^\d{5}$/,
    message: 'الرمز البريدي يجب أن يكون 5 أرقام',
    validate: (value: string) => /^\d{5}$/.test(value)
  },

  buildingNumber: {
    pattern: /^\d{4}$/,
    message: 'رقم المبنى يجب أن يكون 4 أرقام',
    validate: (value: string) => /^\d{4}$/.test(value)
  },

  additionalNumber: {
    pattern: /^\d{4}$/,
    message: 'الرقم الإضافي يجب أن يكون 4 أرقام',
    validate: (value: string) => !value || /^\d{4}$/.test(value)
  },

  shortAddress: {
    pattern: /^[A-Z]{4}\d{4}$/,
    message: 'العنوان المختصر يجب أن يكون 4 حروف و4 أرقام (مثال: RHMA3184)',
    validate: (value: string) => !value || /^[A-Z]{4}\d{4}$/.test(value)
  }
};
```

---

## 7. Dropdown Data

### 7.1 Saudi Regions (13 Regions)

```typescript
const SAUDI_REGIONS = [
  { value: 'riyadh', label: 'الرياض', labelEn: 'Riyadh' },
  { value: 'makkah', label: 'مكة المكرمة', labelEn: 'Makkah' },
  { value: 'madinah', label: 'المدينة المنورة', labelEn: 'Madinah' },
  { value: 'eastern', label: 'المنطقة الشرقية', labelEn: 'Eastern Province' },
  { value: 'qassim', label: 'القصيم', labelEn: 'Qassim' },
  { value: 'asir', label: 'عسير', labelEn: 'Asir' },
  { value: 'tabuk', label: 'تبوك', labelEn: 'Tabuk' },
  { value: 'hail', label: 'حائل', labelEn: 'Hail' },
  { value: 'northern_border', label: 'الحدود الشمالية', labelEn: 'Northern Border' },
  { value: 'jazan', label: 'جازان', labelEn: 'Jazan' },
  { value: 'najran', label: 'نجران', labelEn: 'Najran' },
  { value: 'baha', label: 'الباحة', labelEn: 'Al-Baha' },
  { value: 'jouf', label: 'الجوف', labelEn: 'Al-Jouf' }
];
```

### 7.2 Major Cities by Region

```typescript
const SAUDI_CITIES = {
  riyadh: [
    { value: 'riyadh', label: 'الرياض' },
    { value: 'kharj', label: 'الخرج' },
    { value: 'dawadmi', label: 'الدوادمي' }
  ],
  makkah: [
    { value: 'makkah', label: 'مكة المكرمة' },
    { value: 'jeddah', label: 'جدة' },
    { value: 'taif', label: 'الطائف' }
  ],
  eastern: [
    { value: 'dammam', label: 'الدمام' },
    { value: 'dhahran', label: 'الظهران' },
    { value: 'khobar', label: 'الخبر' },
    { value: 'jubail', label: 'الجبيل' },
    { value: 'qatif', label: 'القطيف' },
    { value: 'hofuf', label: 'الهفوف' }
  ],
  madinah: [
    { value: 'madinah', label: 'المدينة المنورة' },
    { value: 'yanbu', label: 'ينبع' }
  ],
  // ... continue for all regions
};
```

---

## 8. Date Handling

### 8.1 Hijri/Gregorian Conversion

```typescript
// Using moment-hijri library
import moment from 'moment-hijri';

// Convert Gregorian to Hijri
const toHijri = (gregorianDate: Date): string => {
  return moment(gregorianDate).format('iYYYY/iMM/iDD');
};

// Convert Hijri to Gregorian
const toGregorian = (hijriDate: string): Date => {
  return moment(hijriDate, 'iYYYY/iMM/iDD').toDate();
};

// Display format for dates
const formatDate = (date: Date, includeHijri: boolean = true): string => {
  const gregorian = moment(date).format('YYYY/MM/DD');
  if (!includeHijri) return gregorian;
  const hijri = moment(date).format('iYYYY/iMM/iDD');
  return `${gregorian} (${hijri})`;
};
```

### 8.2 Date Display Component

```tsx
interface DateDisplayProps {
  date: Date;
  hijriDate?: string;
  showBoth?: boolean;
}

const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  hijriDate,
  showBoth = true
}) => {
  const gregorian = moment(date).format('YYYY/MM/DD');
  const hijri = hijriDate || moment(date).format('iYYYY/iMM/iDD');

  return (
    <span className="date-display" dir="ltr">
      {gregorian}
      {showBoth && <span className="hijri-date"> ({hijri} هـ)</span>}
    </span>
  );
};
```

---

## 9. RTL Support

### 9.1 CSS Considerations

```css
/* Base RTL styles */
.rtl-form {
  direction: rtl;
  text-align: right;
}

/* Form labels */
.rtl-form label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

/* Input alignment */
.rtl-form input,
.rtl-form select,
.rtl-form textarea {
  direction: rtl;
  text-align: right;
}

/* Number inputs - keep LTR for numbers */
.rtl-form input[type="number"],
.rtl-form input[type="tel"],
.rtl-form .number-input {
  direction: ltr;
  text-align: left;
}

/* Grid layout for RTL */
.rtl-grid {
  display: grid;
  gap: 1rem;
}

/* Two column layout */
.rtl-grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

/* Reverse order for specific elements */
.rtl-reverse {
  flex-direction: row-reverse;
}

/* Table RTL */
.rtl-table {
  direction: rtl;
}

.rtl-table th,
.rtl-table td {
  text-align: right;
}
```

### 9.2 Layout Hook

```typescript
import { useEffect, useState } from 'react';

export const useRTL = () => {
  const [isRTL, setIsRTL] = useState(true);

  useEffect(() => {
    // Get language from settings or localStorage
    const lang = localStorage.getItem('language') || 'ar';
    setIsRTL(lang === 'ar');
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  const toggleRTL = () => {
    const newRTL = !isRTL;
    setIsRTL(newRTL);
    localStorage.setItem('language', newRTL ? 'ar' : 'en');
    document.documentElement.dir = newRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = newRTL ? 'ar' : 'en';
  };

  return { isRTL, toggleRTL };
};
```

---

## 10. Usage Examples

### 10.1 Create Case with Najiz Info

```typescript
const createCase = async (caseData: CaseInput) => {
  const response = await fetch('/api/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: caseData.title,
      description: caseData.description,
      category: caseData.category,

      // Najiz fields
      najiz: {
        mainClassification: 'عمالية',
        mainClassificationEn: 'labor',
        subClassification: 'أجور',
        caseType: 'مطالبة بأجور متأخرة',
        court: {
          type: 'labor',
          typeAr: 'المحكمة العمالية',
          city: 'الرياض',
          region: 'riyadh'
        }
      },

      // Plaintiff
      plaintiff: {
        type: 'individual',
        nationalId: '1234567890',
        identityType: 'national_id',
        fullNameArabic: 'محمد أحمد علي السعيد',
        firstName: 'محمد',
        fatherName: 'أحمد',
        grandfatherName: 'علي',
        familyName: 'السعيد',
        phone: '0512345678',
        nationalAddress: {
          buildingNumber: '1234',
          streetName: 'شارع الملك فهد',
          district: 'العليا',
          city: 'الرياض',
          region: 'riyadh',
          postalCode: '12345',
          additionalNumber: '5678'
        }
      },

      // Labor case details
      laborCaseDetails: {
        laborOfficeReferral: {
          hasReferral: true,
          referralNumber: 'REF-2024-12345',
          referralDate: new Date()
        },
        claimTypes: [
          { type: 'wages', amount: 50000, period: '5 months' },
          { type: 'end_of_service', amount: 25000 }
        ],
        totalClaimAmount: 75000,
        isSmallClaim: false
      }
    })
  });

  return response.json();
};
```

### 10.2 Create Contract

```typescript
const createContract = async (contractData: ContractInput) => {
  const response = await fetch('/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'عقد إيجار تجاري',
      titleAr: 'عقد إيجار تجاري',
      contractType: 'lease',
      language: 'ar',
      textDirection: 'rtl',

      parties: [
        {
          role: 'lessor',
          roleAr: 'المؤجر',
          partyType: 'company',
          companyName: 'شركة العقارات المتحدة',
          crNumber: '1010123456',
          nationalAddress: { /* ... */ }
        },
        {
          role: 'lessee',
          roleAr: 'المستأجر',
          partyType: 'individual',
          fullNameArabic: 'محمد أحمد علي',
          nationalId: '1234567890',
          nationalAddress: { /* ... */ }
        }
      ],

      financialTerms: {
        totalValue: 120000,
        currency: 'SAR',
        paymentSchedule: [
          { description: 'الدفعة الأولى', amount: 30000, dueDate: new Date() },
          { description: 'الدفعة الثانية', amount: 30000, dueDate: new Date() }
        ]
      },

      duration: {
        value: 1,
        unit: 'years',
        autoRenew: true,
        noticePeriod: { value: 30, unit: 'days' }
      }
    })
  });

  return response.json();
};
```

---

## Appendix: Fee Calculator

Use the official MOJ fee calculator for judicial costs:
https://cfee.moj.gov.sa/index.html

Exempt cases:
- Personal status (family) cases
- Bankruptcy cases
- Public right criminal cases
- Financially eligible individuals

---

*Last Updated: December 2024*
*Version: 1.0*
