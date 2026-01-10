# Complete CRM API Contracts

> **Version:** 1.0.0
> **Base URL:** `https://api.traf3li.com/api`
> **Authentication:** Bearer Token (JWT)

---

## Table of Contents

1. [Clients API](#1-clients-api)
2. [Contacts API](#2-contacts-api)
3. [Organizations API](#3-organizations-api)
4. [Leads API](#4-leads-api)
5. [CRM Transactions API](#5-crm-transactions-api)
6. [CRM Activities API](#6-crm-activities-api)
7. [Team Members API](#7-team-members-api)
8. [CRM Dashboard API](#8-crm-dashboard-api)
9. [All Enums Reference](#9-all-enums-reference)

---

# 1. CLIENTS API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/clients` | Create new client |
| `GET` | `/clients` | List all clients |
| `GET` | `/clients/search` | Search clients (autocomplete) |
| `GET` | `/clients/stats` | Get client statistics |
| `GET` | `/clients/top-revenue` | Get top clients by revenue |
| `GET` | `/clients/:id` | Get single client |
| `GET` | `/clients/:id/full` | Get client with related data |
| `GET` | `/clients/:id/billing-info` | Get billing information |
| `GET` | `/clients/:id/cases` | Get client's cases |
| `GET` | `/clients/:id/invoices` | Get client's invoices |
| `GET` | `/clients/:id/payments` | Get client's payments |
| `PUT` | `/clients/:id` | Update client |
| `PATCH` | `/clients/:id/status` | Update status |
| `PATCH` | `/clients/:id/flags` | Update flags |
| `POST` | `/clients/:id/attachments` | Upload attachments |
| `DELETE` | `/clients/:id/attachments/:attachmentId` | Delete attachment |
| `POST` | `/clients/:id/conflict-check` | Run conflict check |
| `POST` | `/clients/:id/verify/wathq` | Verify via Wathq |
| `POST` | `/clients/:id/verify/absher` | Verify via Absher |
| `POST` | `/clients/:id/verify/address` | Verify address |
| `DELETE` | `/clients/:id` | Delete client |
| `DELETE` | `/clients/bulk` | Bulk delete |

---

## Create Client

### `POST /api/clients`

Creates a new client (individual or company).

### Request Headers
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Body Schema

```json
{
  "clientType": "individual | company",

  "firstName": "string (max 50, required for individual)",
  "lastName": "string (max 50, required for individual)",
  "fullNameArabic": "string (max 150)",
  "fullNameEnglish": "string (max 150)",
  "nationalId": "string (10 digits, starts with 1)",
  "iqamaNumber": "string (10 digits, starts with 2)",
  "gender": "male | female",
  "dateOfBirth": "ISO 8601 date",
  "dateOfBirthHijri": "string (1400/01/15 format)",
  "maritalStatus": "single | married | divorced | widowed",
  "nationality": "string",

  "companyName": "string (max 200, required for company)",
  "companyNameEnglish": "string (max 200)",
  "crNumber": "string (10 digits)",
  "unifiedNumber": "string (max 20)",
  "vatNumber": "string (15 digits, starts with 3)",
  "legalForm": "llc | joint_stock | partnership | sole_proprietorship | branch | professional | other",
  "capital": "number",
  "authorizedPerson": "string",

  "email": "string (valid email)",
  "phone": "string (+966501234567 E.164 format)",
  "alternatePhone": "string",
  "whatsapp": "string",
  "mobile": "string",
  "fax": "string",
  "preferredContact": "phone | email | whatsapp | sms",

  "address": {
    "city": "string",
    "district": "string",
    "street": "string",
    "postalCode": "string (5 digits)",
    "country": "string (default: Saudi Arabia)"
  },

  "nationalAddress": {
    "buildingNumber": "string (4 digits)",
    "streetName": "string",
    "streetNameAr": "string",
    "district": "string",
    "districtAr": "string",
    "city": "string",
    "cityAr": "string",
    "region": "string",
    "regionCode": "01-13",
    "postalCode": "string (5 digits)",
    "additionalNumber": "string (4 digits)",
    "shortAddress": "string (XXXX9999 format)"
  },

  "billing": {
    "type": "hourly | flat_fee | contingency | retainer",
    "hourlyRate": "number (in halalas)",
    "flatFee": "number",
    "retainerAmount": "number",
    "paymentTerms": "immediate | net_15 | net_30 | net_45 | net_60",
    "creditLimit": "number"
  },

  "vatRegistration": {
    "isRegistered": "boolean",
    "vatNumber": "string"
  },

  "clientSource": "website | referral | returning | ads | social | walkin | platform | external | cold_call | event",
  "clientTier": "standard | premium | vip",
  "status": "active | inactive | archived | pending",
  "notes": "string",
  "tags": ["string"],

  "assignments": {
    "responsibleLawyerId": "ObjectId",
    "assistantLawyerId": "ObjectId",
    "paralegalId": "ObjectId"
  }
}
```

### Example Request

```bash
curl -X POST https://api.traf3li.com/api/clients \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "clientType": "individual",
    "firstName": "أحمد",
    "lastName": "الشمري",
    "fullNameArabic": "أحمد بن محمد بن عبدالله الشمري",
    "nationalId": "1234567890",
    "gender": "male",
    "dateOfBirth": "1985-03-15",
    "phone": "+966501234567",
    "email": "ahmed.shamri@email.com",
    "nationalAddress": {
      "buildingNumber": "1234",
      "streetName": "King Fahd Road",
      "streetNameAr": "طريق الملك فهد",
      "district": "Al Olaya",
      "districtAr": "العليا",
      "city": "Riyadh",
      "cityAr": "الرياض",
      "regionCode": "01",
      "postalCode": "12345",
      "additionalNumber": "6789"
    },
    "billing": {
      "type": "hourly",
      "hourlyRate": 50000,
      "paymentTerms": "net_30"
    },
    "clientSource": "referral",
    "clientTier": "premium",
    "status": "active",
    "tags": ["VIP", "قضايا تجارية"]
  }'
```

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "تم إنشاء العميل بنجاح",
  "messageEn": "Client created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "clientNumber": "CLT-00001",
    "clientType": "individual",
    "firstName": "أحمد",
    "lastName": "الشمري",
    "fullNameArabic": "أحمد بن محمد بن عبدالله الشمري",
    "displayName": "أحمد الشمري",
    "nationalId": "1234567890",
    "gender": "male",
    "dateOfBirth": "1985-03-15T00:00:00.000Z",
    "phone": "+966501234567",
    "email": "ahmed.shamri@email.com",
    "nationalAddress": {
      "buildingNumber": "1234",
      "streetName": "King Fahd Road",
      "streetNameAr": "طريق الملك فهد",
      "district": "Al Olaya",
      "districtAr": "العليا",
      "city": "Riyadh",
      "cityAr": "الرياض",
      "regionCode": "01",
      "postalCode": "12345",
      "additionalNumber": "6789",
      "isVerified": false
    },
    "billing": {
      "type": "hourly",
      "hourlyRate": 50000,
      "paymentTerms": "net_30"
    },
    "clientSource": "referral",
    "clientTier": "premium",
    "status": "active",
    "tags": ["VIP", "قضايا تجارية"],
    "flags": {
      "isVip": false,
      "isHighRisk": false,
      "needsApproval": false,
      "isBlacklisted": false
    },
    "conflictCheck": {
      "checked": false,
      "hasConflict": false
    },
    "firmId": "507f1f77bcf86cd799439000",
    "createdBy": "507f1f77bcf86cd799439022",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Responses

**Status:** `400 Bad Request`
```json
{
  "success": false,
  "error": true,
  "message": "بيانات غير صالحة",
  "messageEn": "Invalid data",
  "errors": [
    {
      "field": "nationalId",
      "message": "National ID must be 10 digits starting with 1"
    }
  ]
}
```

**Status:** `409 Conflict`
```json
{
  "success": false,
  "error": true,
  "message": "العميل موجود بالفعل",
  "messageEn": "Client already exists",
  "code": "DUPLICATE_CLIENT",
  "duplicateFields": ["nationalId", "email"]
}
```

---

## List Clients

### `GET /api/clients`

Returns paginated list of clients with filtering and sorting.

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | - | Filter: `active`, `inactive`, `archived`, `pending` |
| `clientType` | string | - | Filter: `individual`, `company` |
| `clientTier` | string | - | Filter: `standard`, `premium`, `vip` |
| `clientSource` | string | - | Filter by source |
| `search` | string | - | Search name, email, phone, ID |
| `responsibleLawyerId` | ObjectId | - | Filter by assigned lawyer |
| `tags` | string | - | Comma-separated tags |
| `hasConflict` | boolean | - | Filter by conflict status |
| `isVip` | boolean | - | Filter VIP clients |
| `isHighRisk` | boolean | - | Filter high-risk clients |
| `createdAfter` | ISO date | - | Created after date |
| `createdBefore` | ISO date | - | Created before date |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | string | `desc` | `asc` or `desc` |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page (max 100) |

### Example Request

```bash
curl -X GET "https://api.traf3li.com/api/clients?status=active&clientType=company&clientTier=vip&search=شركة&sortBy=createdAt&sortOrder=desc&page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "clientNumber": "CLT-00001",
      "clientType": "company",
      "companyName": "شركة التقنية المتقدمة",
      "companyNameEnglish": "Advanced Technology Co.",
      "crNumber": "1010123456",
      "vatNumber": "310123456789012",
      "email": "info@advtech.sa",
      "phone": "+966112345678",
      "status": "active",
      "clientTier": "vip",
      "clientSource": "referral",
      "flags": {
        "isVip": true,
        "isHighRisk": false,
        "needsApproval": false,
        "isBlacklisted": false
      },
      "assignments": {
        "responsibleLawyerId": {
          "_id": "507f1f77bcf86cd799439022",
          "firstName": "محمد",
          "lastName": "العتيبي"
        }
      },
      "lastContactedAt": "2024-01-10T14:30:00.000Z",
      "createdAt": "2023-06-15T08:00:00.000Z",
      "updatedAt": "2024-01-10T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Get Client Full Details

### `GET /api/clients/:id/full`

Returns client with all related data (cases, invoices, payments) in a single request.

### Example Request

```bash
curl -X GET "https://api.traf3li.com/api/clients/507f1f77bcf86cd799439011/full" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "client": {
      "_id": "507f1f77bcf86cd799439011",
      "clientNumber": "CLT-00001",
      "clientType": "company",
      "companyName": "شركة التقنية المتقدمة",
      "email": "info@advtech.sa",
      "phone": "+966112345678",
      "status": "active",
      "clientTier": "vip",
      "billing": {
        "type": "retainer",
        "retainerAmount": 1000000,
        "paymentTerms": "net_30"
      },
      "wathqVerified": true,
      "wathqVerifiedAt": "2023-06-20T10:00:00.000Z"
    },
    "cases": [
      {
        "_id": "507f1f77bcf86cd799439100",
        "caseNumber": "CASE-2024-00123",
        "title": "قضية تجارية - مطالبة مالية",
        "status": "active",
        "category": "commercial",
        "claimAmount": 5000000,
        "createdAt": "2024-01-05T09:00:00.000Z"
      }
    ],
    "invoices": [
      {
        "_id": "507f1f77bcf86cd799439200",
        "invoiceNumber": "INV-2024-00045",
        "totalAmount": 250000,
        "amountPaid": 250000,
        "status": "paid",
        "dueDate": "2024-02-15T00:00:00.000Z"
      }
    ],
    "payments": [
      {
        "_id": "507f1f77bcf86cd799439300",
        "amount": 250000,
        "paymentMethod": "bank_transfer",
        "paymentDate": "2024-01-20T00:00:00.000Z",
        "status": "completed"
      }
    ],
    "summary": {
      "cases": {
        "total": 5,
        "active": 2,
        "closed": 3,
        "won": 2,
        "lost": 1
      },
      "invoices": {
        "total": 12,
        "totalAmount": 3500000,
        "paid": 3000000,
        "pending": 500000,
        "overdue": 0
      },
      "payments": {
        "total": 10,
        "totalAmount": 3000000
      }
    }
  }
}
```

---

## Update Client Flags

### `PATCH /api/clients/:id/flags`

Update client flags (VIP, high-risk, blacklist status).

### Request Body

```json
{
  "isVip": true,
  "isHighRisk": false,
  "needsApproval": false,
  "isBlacklisted": false,
  "blacklistReason": null
}
```

### Example Request

```bash
curl -X PATCH "https://api.traf3li.com/api/clients/507f1f77bcf86cd799439011/flags" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "isVip": true,
    "isHighRisk": false
  }'
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "تم تحديث حالة العميل",
  "messageEn": "Client flags updated",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "flags": {
      "isVip": true,
      "isHighRisk": false,
      "needsApproval": false,
      "isBlacklisted": false
    }
  }
}
```

---

## Verify Client via Wathq

### `POST /api/clients/:id/verify/wathq`

Verify company details using Saudi Wathq API (Commercial Registration).

### Request Body

```json
{
  "crNumber": "1010123456"
}
```

### Example Request

```bash
curl -X POST "https://api.traf3li.com/api/clients/507f1f77bcf86cd799439011/verify/wathq" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"crNumber": "1010123456"}'
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "تم التحقق من السجل التجاري بنجاح",
  "messageEn": "Commercial registration verified successfully",
  "data": {
    "verified": true,
    "verifiedAt": "2024-01-15T10:30:00.000Z",
    "wathqData": {
      "crNumber": "1010123456",
      "companyName": "شركة التقنية المتقدمة",
      "companyNameEn": "Advanced Technology Company",
      "status": "active",
      "issueDate": "2015-03-20",
      "expiryDate": "2025-03-20",
      "capital": 10000000,
      "legalForm": "llc",
      "city": "الرياض",
      "activities": [
        {
          "code": "620100",
          "description": "برمجة الحاسب الآلي"
        }
      ]
    }
  }
}
```

---

# 2. CONTACTS API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/contacts` | Create contact |
| `GET` | `/contacts` | List contacts |
| `GET` | `/contacts/search` | Search contacts |
| `GET` | `/contacts/case/:caseId` | Get contacts by case |
| `GET` | `/contacts/client/:clientId` | Get contacts by client |
| `GET` | `/contacts/:id` | Get single contact |
| `PUT` | `/contacts/:id` | Update contact |
| `POST` | `/contacts/:id/link-case` | Link to case |
| `DELETE` | `/contacts/:id/unlink-case/:caseId` | Unlink from case |
| `POST` | `/contacts/:id/link-client` | Link to client |
| `DELETE` | `/contacts/:id/unlink-client/:clientId` | Unlink from client |
| `DELETE` | `/contacts/:id` | Delete contact |
| `DELETE` | `/contacts/bulk` | Bulk delete |

---

## Create Contact

### `POST /api/contacts`

### Request Body Schema

```json
{
  "salutation": "mr | mrs | ms | dr | eng | prof | sheikh | his_excellency | her_excellency",
  "salutationAr": "السيد | السيدة | الآنسة | الدكتور | المهندس | الأستاذ | الشيخ | صاحب السمو | صاحب المعالي",
  "firstName": "string (required, max 100)",
  "middleName": "string (max 100)",
  "lastName": "string (required, max 100)",
  "preferredName": "string (max 100)",
  "fullNameArabic": "string (max 200)",

  "arabicName": {
    "firstName": "string (الاسم الأول)",
    "fatherName": "string (اسم الأب)",
    "grandfatherName": "string (اسم الجد)",
    "familyName": "string (اسم العائلة)",
    "fullName": "string (auto-generated)"
  },

  "gender": "male | female",
  "maritalStatus": "single | married | divorced | widowed",
  "dateOfBirth": "ISO 8601 date",
  "dateOfBirthHijri": "string (1400/01/15)",
  "placeOfBirth": "string",
  "nationality": "string",
  "nationalityCode": "string (ISO 3166-1 alpha-3)",

  "type": "individual | organization | court | attorney | expert | government | other",
  "primaryRole": "client_contact | opposing_party | opposing_counsel | witness | expert_witness | judge | court_clerk | mediator | arbitrator | referral_source | vendor | other",
  "relationshipTypes": ["current_client", "former_client", "prospect", "adverse_party", "related_party"],

  "email": "string",
  "phone": "string",
  "alternatePhone": "string",
  "mobile": "string",
  "workPhone": "string",
  "fax": "string",
  "whatsapp": "string",
  "skype": "string",
  "telegram": "string",

  "company": "string",
  "organizationId": "ObjectId",
  "title": "string (job title)",
  "department": "string",
  "careerLevel": "entry | junior | mid | senior | lead | manager | director | vp | c_level | executive | owner",

  "identityType": "national_id | iqama | gcc_id | passport | border_number | visitor_id",
  "nationalId": "string (10 digits, starts with 1)",
  "iqamaNumber": "string (10 digits, starts with 2)",
  "gccId": "string",
  "gccCountry": "UAE | Kuwait | Bahrain | Oman | Qatar",
  "passportNumber": "string",
  "passportCountry": "string",
  "passportExpiryDate": "ISO 8601 date",
  "borderNumber": "string",
  "visitorId": "string",

  "nationalAddress": {
    "buildingNumber": "string (4 digits)",
    "streetName": "string",
    "streetNameAr": "string",
    "district": "string",
    "districtAr": "string",
    "city": "string",
    "cityAr": "string",
    "region": "string",
    "regionCode": "01-13",
    "postalCode": "string (5 digits)",
    "additionalNumber": "string (4 digits)",
    "shortAddress": "string (XXXX9999)"
  },

  "sponsor": {
    "name": "string",
    "nameAr": "string",
    "identityNumber": "string",
    "relationship": "string"
  },

  "preferredLanguage": "ar | en",
  "preferredContactMethod": "email | phone | sms | whatsapp | in_person",
  "bestTimeToContact": "string",
  "doNotContact": "boolean",
  "doNotEmail": "boolean",
  "doNotCall": "boolean",
  "doNotSMS": "boolean",

  "conflictCheckStatus": "not_checked | clear | potential_conflict | confirmed_conflict",
  "conflictNotes": "string",

  "status": "active | inactive | archived | deceased",
  "priority": "low | normal | high | vip",
  "vipStatus": "boolean",
  "riskLevel": "low | medium | high",
  "isBlacklisted": "boolean",
  "blacklistReason": "string",

  "tags": ["string"],
  "practiceAreas": ["string"],
  "notes": "string (max 5000)",

  "linkedCases": ["ObjectId"],
  "linkedClients": ["ObjectId"]
}
```

### Example Request

```bash
curl -X POST https://api.traf3li.com/api/contacts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "salutation": "dr",
    "salutationAr": "الدكتور",
    "firstName": "Khalid",
    "lastName": "Al-Rashid",
    "arabicName": {
      "firstName": "خالد",
      "fatherName": "محمد",
      "grandfatherName": "عبدالله",
      "familyName": "الراشد"
    },
    "gender": "male",
    "type": "expert",
    "primaryRole": "expert_witness",
    "email": "dr.khalid@expert.sa",
    "phone": "+966501234567",
    "mobile": "+966551234567",
    "company": "مركز الخبراء للاستشارات",
    "title": "خبير محاسبي معتمد",
    "identityType": "national_id",
    "nationalId": "1087654321",
    "nationalAddress": {
      "buildingNumber": "5678",
      "streetNameAr": "شارع العليا",
      "districtAr": "العليا",
      "cityAr": "الرياض",
      "regionCode": "01",
      "postalCode": "12244"
    },
    "preferredLanguage": "ar",
    "preferredContactMethod": "phone",
    "status": "active",
    "priority": "high",
    "practiceAreas": ["قضايا تجارية", "محاسبة قضائية"],
    "tags": ["خبير معتمد", "محاسبة"]
  }'
```

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "تم إنشاء جهة الاتصال بنجاح",
  "messageEn": "Contact created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439050",
    "salutation": "dr",
    "salutationAr": "الدكتور",
    "firstName": "Khalid",
    "lastName": "Al-Rashid",
    "fullName": "Khalid Al-Rashid",
    "displayName": "Khalid Al-Rashid",
    "arabicName": {
      "firstName": "خالد",
      "fatherName": "محمد",
      "grandfatherName": "عبدالله",
      "familyName": "الراشد",
      "fullName": "خالد محمد عبدالله الراشد"
    },
    "fullArabicName": "خالد محمد عبدالله الراشد",
    "gender": "male",
    "type": "expert",
    "primaryRole": "expert_witness",
    "email": "dr.khalid@expert.sa",
    "phone": "+966501234567",
    "mobile": "+966551234567",
    "company": "مركز الخبراء للاستشارات",
    "title": "خبير محاسبي معتمد",
    "identityType": "national_id",
    "nationalId": "1087654321",
    "nationalAddress": {
      "buildingNumber": "5678",
      "streetNameAr": "شارع العليا",
      "districtAr": "العليا",
      "cityAr": "الرياض",
      "regionCode": "01",
      "postalCode": "12244",
      "isVerified": false
    },
    "formattedNationalAddress": "5678, شارع العليا, العليا, الرياض, 12244",
    "primaryIdentityNumber": "1087654321",
    "preferredLanguage": "ar",
    "preferredContactMethod": "phone",
    "status": "active",
    "priority": "high",
    "conflictCheckStatus": "not_checked",
    "practiceAreas": ["قضايا تجارية", "محاسبة قضائية"],
    "tags": ["خبير معتمد", "محاسبة"],
    "linkedCases": [],
    "linkedClients": [],
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

# 3. ORGANIZATIONS API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/organizations` | Create organization |
| `GET` | `/organizations` | List organizations |
| `GET` | `/organizations/search` | Search organizations |
| `GET` | `/organizations/client/:clientId` | Get by client |
| `GET` | `/organizations/:id` | Get single |
| `PUT` | `/organizations/:id` | Update |
| `POST` | `/organizations/:id/link-client` | Link to client |
| `POST` | `/organizations/:id/link-contact` | Link to contact |
| `POST` | `/organizations/:id/link-case` | Link to case |
| `DELETE` | `/organizations/:id` | Delete |
| `DELETE` | `/organizations/bulk` | Bulk delete |

---

## Create Organization

### `POST /api/organizations`

### Request Body Schema

```json
{
  "legalName": "string (required, max 200)",
  "legalNameAr": "string (max 200)",
  "tradeName": "string (max 200)",
  "tradeNameAr": "string (max 200)",

  "type": "llc | joint_stock | partnership | sole_proprietorship | branch | government | nonprofit | professional | holding | company | court | law_firm | other",
  "status": "active | inactive | suspended | dissolved | pending | archived",
  "industry": "string",
  "subIndustry": "string",
  "size": "micro | small | medium | large | enterprise",

  "commercialRegistration": "string (10 digits)",
  "crIssueDate": "ISO 8601 date",
  "crExpiryDate": "ISO 8601 date",
  "vatNumber": "string (15 digits, starts with 3)",
  "unifiedNumber": "string",

  "phone": "string",
  "email": "string",
  "website": "string",
  "fax": "string",

  "address": "string",
  "city": "string",
  "postalCode": "string",
  "nationalAddress": "string",
  "poBox": "string",

  "headquartersAddress": {
    "buildingNumber": "string",
    "streetName": "string",
    "district": "string",
    "city": "string",
    "regionCode": "string",
    "postalCode": "string"
  },

  "billingType": "hourly | fixed | contingency | retainer",
  "preferredPaymentMethod": "bank_transfer | check | cash | credit_card",
  "billingCycle": "monthly | quarterly | upon_completion",

  "keyContacts": [{
    "contactId": "ObjectId",
    "role": "string",
    "isPrimary": "boolean"
  }],

  "conflictCheckStatus": "not_checked | clear | potential_conflict | confirmed_conflict",

  "tags": ["string"],
  "practiceAreas": ["string"],
  "notes": "string"
}
```

### Example Request

```bash
curl -X POST https://api.traf3li.com/api/organizations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "legalName": "شركة الخليج للمحاماة والاستشارات القانونية",
    "legalNameAr": "شركة الخليج للمحاماة والاستشارات القانونية",
    "tradeName": "Gulf Legal",
    "type": "law_firm",
    "status": "active",
    "size": "medium",
    "commercialRegistration": "1010567890",
    "vatNumber": "310567890123456",
    "phone": "+966112223344",
    "email": "info@gulflegal.sa",
    "website": "https://gulflegal.sa",
    "city": "Riyadh",
    "billingType": "hourly",
    "preferredPaymentMethod": "bank_transfer",
    "practiceAreas": ["قانون الشركات", "الملكية الفكرية"]
  }'
```

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "تم إنشاء المنظمة بنجاح",
  "messageEn": "Organization created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439060",
    "legalName": "شركة الخليج للمحاماة والاستشارات القانونية",
    "tradeName": "Gulf Legal",
    "type": "law_firm",
    "status": "active",
    "size": "medium",
    "commercialRegistration": "1010567890",
    "vatNumber": "310567890123456",
    "phone": "+966112223344",
    "email": "info@gulflegal.sa",
    "website": "https://gulflegal.sa",
    "city": "Riyadh",
    "billingType": "hourly",
    "preferredPaymentMethod": "bank_transfer",
    "practiceAreas": ["قانون الشركات", "الملكية الفكرية"],
    "conflictCheckStatus": "not_checked",
    "linkedClients": [],
    "linkedContacts": [],
    "linkedCases": [],
    "createdAt": "2024-01-15T12:00:00.000Z",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

# 4. LEADS API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/leads` | Create lead |
| `GET` | `/leads` | List leads |
| `GET` | `/leads/overview` | CRM overview (batch) |
| `GET` | `/leads/stats` | Lead statistics |
| `GET` | `/leads/follow-up` | Leads needing follow-up |
| `GET` | `/leads/pipeline/:pipelineId` | Leads by pipeline (Kanban) |
| `GET` | `/leads/:id` | Get single lead |
| `PUT` | `/leads/:id` | Update lead |
| `POST` | `/leads/:id/status` | Update status |
| `POST` | `/leads/:id/move` | Move to pipeline stage |
| `GET` | `/leads/:id/conversion-preview` | Preview conversion |
| `POST` | `/leads/:id/convert` | Convert to client |
| `GET` | `/leads/:id/activities` | Get activities |
| `POST` | `/leads/:id/activities` | Log activity |
| `POST` | `/leads/:id/follow-up` | Schedule follow-up |
| `POST` | `/leads/:id/verify/wathq` | Verify via Wathq |
| `POST` | `/leads/:id/conflict-check` | Run conflict check |
| `DELETE` | `/leads/:id` | Delete lead |
| `POST` | `/leads/bulk-delete` | Bulk delete |

---

## Create Lead

### `POST /api/leads`

### Request Body Schema

```json
{
  "type": "individual | company",

  "salutation": "Mr | Mrs | Ms | Dr | Prof | Eng | Sheikh | Prince | Princess",
  "firstName": "string",
  "lastName": "string",
  "displayName": "string",
  "preferredName": "string",
  "fullNameArabic": "string",
  "fullNameEnglish": "string",

  "arabicName": {
    "firstName": "string",
    "fatherName": "string",
    "grandfatherName": "string",
    "familyName": "string"
  },

  "companyName": "string",
  "companyNameAr": "string",
  "companyType": "sme | enterprise | government | startup | ngo | law_firm | other",
  "contactPerson": "string",
  "jobTitle": "string",
  "department": "string",
  "industry": "string",
  "numberOfEmployees": "1-10 | 11-50 | 51-200 | 201-500 | 501-1000 | 1000+",
  "annualRevenue": "number",

  "email": "string (required)",
  "alternateEmail": "string",
  "phone": "string (required)",
  "alternatePhone": "string",
  "whatsapp": "string",
  "mobile": "string",
  "fax": "string",
  "website": "string",
  "linkedinUrl": "string",

  "preferredContactMethod": "phone | email | whatsapp | in_person | sms",
  "bestTimeToCall": "morning | afternoon | evening | anytime",
  "preferredLanguage": "ar | en",

  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "postalCode": "string",
    "country": "string"
  },

  "nationalId": "string",
  "iqamaNumber": "string",
  "commercialRegistration": "string",
  "vatNumber": "string",

  "nationalAddress": {
    "buildingNumber": "string",
    "streetName": "string",
    "district": "string",
    "city": "string",
    "regionCode": "string",
    "postalCode": "string"
  },

  "source": {
    "type": "website | referral | social_media | advertising | cold_call | walk_in | event | other",
    "referralId": "ObjectId",
    "referralName": "string",
    "campaign": "string",
    "medium": "string",
    "notes": "string"
  },

  "utm": {
    "source": "string",
    "medium": "string",
    "campaign": "string",
    "term": "string",
    "content": "string"
  },

  "intake": {
    "practiceArea": "string",
    "caseType": "civil | criminal | family | commercial | labor | real_estate | administrative | execution | other",
    "caseDescription": "string",
    "urgency": "low | normal | high | urgent | critical",
    "estimatedValue": "number",
    "opposingParty": "string",
    "courtName": "string",
    "courtDeadline": "ISO 8601 date",
    "statuteOfLimitations": "ISO 8601 date",
    "currentStatus": "string",
    "desiredOutcome": "string",
    "deadline": "ISO 8601 date",
    "hasDocuments": "boolean"
  },

  "qualification": {
    "budget": "unknown | low | medium | high | premium",
    "budgetAmount": "number (in halalas)",
    "budgetNotes": "string",
    "authority": "unknown | decision_maker | influencer | researcher",
    "authorityNotes": "string",
    "need": "unknown | urgent | planning | exploring",
    "needDescription": "string",
    "timeline": "unknown | immediate | this_month | this_quarter | this_year | no_timeline",
    "timelineNotes": "string",
    "notes": "string"
  },

  "assignedTo": "ObjectId",
  "backupAssignee": "ObjectId",
  "teamMembers": ["ObjectId"],

  "status": "new | contacted | qualified | proposal | negotiation | won | lost | dormant",
  "pipelineId": "ObjectId",
  "pipelineStageId": "ObjectId",
  "probability": "number (0-100)",
  "expectedCloseDate": "ISO 8601 date",

  "estimatedValue": "number",
  "currency": "string (default: SAR)",
  "proposedFeeType": "hourly | fixed | contingency | retainer | hybrid",
  "proposedAmount": "number",

  "forecastCategory": "pipeline | best_case | commit | closed_won | omitted",

  "competition": {
    "status": "none | identified | evaluating | head_to_head | won | lost_to_competitor",
    "competitors": [{
      "name": "string",
      "strengths": "string",
      "weaknesses": "string",
      "priceComparison": "lower | similar | higher | unknown",
      "threatLevel": "low | medium | high | critical"
    }],
    "competitiveAdvantage": "string",
    "winStrategy": "string"
  },

  "conflictCheckStatus": "not_checked | clear | potential_conflict | confirmed_conflict",
  "conflictNotes": "string",

  "riskLevel": "low | medium | high | critical",
  "isBlacklisted": "boolean",
  "blacklistReason": "string",
  "isVIP": "boolean",

  "tags": ["string"],
  "practiceArea": "string",
  "notes": "string",
  "internalNotes": "string",
  "priority": "low | normal | high | urgent",

  "nextFollowUpDate": "ISO 8601 date",
  "nextFollowUpNote": "string"
}
```

### Example Request

```bash
curl -X POST https://api.traf3li.com/api/leads \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "company",
    "companyName": "شركة النخبة للتجارة",
    "companyNameAr": "شركة النخبة للتجارة",
    "companyType": "sme",
    "contactPerson": "فهد العنزي",
    "jobTitle": "المدير التنفيذي",
    "industry": "تجارة الجملة",
    "numberOfEmployees": "51-200",
    "email": "fahad@nokbah.sa",
    "phone": "+966501112233",
    "whatsapp": "+966501112233",
    "preferredContactMethod": "whatsapp",
    "bestTimeToCall": "morning",
    "source": {
      "type": "referral",
      "referralName": "أحمد الشمري",
      "notes": "إحالة من عميل سابق"
    },
    "intake": {
      "practiceArea": "قانون تجاري",
      "caseType": "commercial",
      "caseDescription": "نزاع تجاري مع مورد بخصوص عقد توريد",
      "urgency": "high",
      "estimatedValue": 500000,
      "opposingParty": "شركة التوريدات العربية",
      "desiredOutcome": "التعويض عن الأضرار وإنهاء العقد"
    },
    "qualification": {
      "budget": "high",
      "budgetAmount": 5000000,
      "authority": "decision_maker",
      "need": "urgent",
      "timeline": "this_month"
    },
    "status": "new",
    "priority": "high",
    "estimatedValue": 500000,
    "proposedFeeType": "contingency",
    "tags": ["قضية تجارية", "عاجل", "إحالة"]
  }'
```

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "تم إنشاء العميل المحتمل بنجاح",
  "messageEn": "Lead created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439070",
    "leadId": "LEAD-202401-0001",
    "type": "company",
    "companyName": "شركة النخبة للتجارة",
    "displayName": "شركة النخبة للتجارة",
    "contactPerson": "فهد العنزي",
    "jobTitle": "المدير التنفيذي",
    "email": "fahad@nokbah.sa",
    "phone": "+966501112233",
    "status": "new",
    "probability": 10,
    "estimatedValue": 500000,
    "weightedRevenue": 50000,
    "leadScore": 98,
    "qualification": {
      "budget": "high",
      "budgetAmount": 5000000,
      "authority": "decision_maker",
      "need": "urgent",
      "timeline": "this_month",
      "score": 98,
      "scoreBreakdown": {
        "budgetScore": 23,
        "authorityScore": 30,
        "needScore": 30,
        "timelineScore": 23,
        "engagementScore": 0,
        "fitScore": 7
      }
    },
    "intake": {
      "practiceArea": "قانون تجاري",
      "caseType": "commercial",
      "caseDescription": "نزاع تجاري مع مورد بخصوص عقد توريد",
      "urgency": "high",
      "estimatedValue": 500000,
      "opposingParty": "شركة التوريدات العربية",
      "desiredOutcome": "التعويض عن الأضرار وإنهاء العقد",
      "conflictCheckCompleted": false
    },
    "source": {
      "type": "referral",
      "referralName": "أحمد الشمري",
      "notes": "إحالة من عميل سابق"
    },
    "proposedFeeType": "contingency",
    "priority": "high",
    "tags": ["قضية تجارية", "عاجل", "إحالة"],
    "conflictCheckStatus": "not_checked",
    "convertedToClient": false,
    "activityCount": 0,
    "callCount": 0,
    "emailCount": 0,
    "meetingCount": 0,
    "daysSinceCreated": 0,
    "createdAt": "2024-01-15T13:00:00.000Z",
    "updatedAt": "2024-01-15T13:00:00.000Z"
  }
}
```

---

## Convert Lead to Client

### `POST /api/leads/:id/convert`

Converts a lead to a client with optional case creation.

### Request Body

```json
{
  "createCase": true,
  "caseTitle": "قضية تجارية - شركة النخبة للتجارة"
}
```

### Example Request

```bash
curl -X POST "https://api.traf3li.com/api/leads/507f1f77bcf86cd799439070/convert" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "createCase": true,
    "caseTitle": "قضية تجارية - نزاع توريد"
  }'
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "تم تحويل العميل المحتمل بنجاح",
  "messageEn": "Lead converted successfully",
  "data": {
    "lead": {
      "_id": "507f1f77bcf86cd799439070",
      "leadId": "LEAD-202401-0001",
      "status": "won",
      "convertedToClient": true,
      "convertedAt": "2024-01-15T14:00:00.000Z"
    },
    "client": {
      "_id": "507f1f77bcf86cd799439080",
      "clientNumber": "CLT-00025",
      "clientType": "company",
      "companyName": "شركة النخبة للتجارة",
      "status": "active"
    },
    "case": {
      "_id": "507f1f77bcf86cd799439090",
      "caseNumber": "CASE-2024-00050",
      "title": "قضية تجارية - نزاع توريد",
      "status": "active",
      "category": "commercial"
    }
  }
}
```

---

## CRM Overview (Dashboard)

### `GET /api/leads/overview`

Returns comprehensive CRM dashboard data in a single request.

### Example Request

```bash
curl -X GET "https://api.traf3li.com/api/leads/overview" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "leads": {
      "total": 156,
      "new": 23,
      "contacted": 45,
      "qualified": 38,
      "proposal": 25,
      "negotiation": 15,
      "won": 8,
      "lost": 2,
      "converted": 8,
      "totalValue": 15500000,
      "conversionRate": 5.13
    },
    "activities": {
      "today": 12,
      "thisWeek": 45,
      "upcoming": 28,
      "overdue": 5
    },
    "pipeline": {
      "byStage": {
        "507f1f77bcf86cd799439001": {
          "stageName": "جديد",
          "count": 23,
          "value": 2500000
        },
        "507f1f77bcf86cd799439002": {
          "stageName": "تم التواصل",
          "count": 45,
          "value": 4500000
        }
      },
      "totalValue": 15500000
    },
    "performance": {
      "team": [
        {
          "userId": "507f1f77bcf86cd799439022",
          "userName": "محمد العتيبي",
          "count": 25,
          "converted": 5,
          "conversionRate": 20.0
        }
      ],
      "topPerformer": {
        "userId": "507f1f77bcf86cd799439022",
        "userName": "محمد العتيبي",
        "conversionRate": 20.0
      }
    },
    "recentActivities": [
      {
        "_id": "507f1f77bcf86cd799439100",
        "type": "call",
        "title": "مكالمة متابعة",
        "entityType": "lead",
        "entityId": "507f1f77bcf86cd799439070",
        "performedAt": "2024-01-15T13:30:00.000Z"
      }
    ],
    "upcomingFollowUps": [
      {
        "_id": "507f1f77bcf86cd799439070",
        "leadId": "LEAD-202401-0001",
        "displayName": "شركة النخبة للتجارة",
        "nextFollowUpDate": "2024-01-16T09:00:00.000Z",
        "nextFollowUpNote": "متابعة العرض المقدم"
      }
    ]
  }
}
```

---

# 5. CRM TRANSACTIONS API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transactions` | Create transaction |
| `GET` | `/transactions` | List transactions |
| `GET` | `/transactions/:id` | Get single |
| `PUT` | `/transactions/:id` | Update |
| `DELETE` | `/transactions/:id` | Delete |
| `POST` | `/transactions/:id/cancel` | Cancel |
| `GET` | `/transactions/balance` | Get balance |
| `GET` | `/transactions/summary` | Get summary |
| `GET` | `/transactions/by-category` | Group by category |
| `DELETE` | `/transactions/bulk` | Bulk delete |

---

## Create Transaction

### `POST /api/transactions`

### Request Body Schema

```json
{
  "type": "income | expense | transfer (required)",
  "amount": "number >= 0 (required, in halalas)",
  "category": "string (required)",
  "description": "string (required, max 500)",
  "paymentMethod": "cash | card | transfer | check (required)",
  "invoiceId": "ObjectId (optional)",
  "expenseId": "ObjectId (optional)",
  "caseId": "ObjectId (optional)",
  "referenceNumber": "string (optional)",
  "date": "ISO 8601 (default: now)",
  "status": "completed | pending | cancelled",
  "notes": "string (max 1000)"
}
```

### Example Request

```bash
curl -X POST https://api.traf3li.com/api/transactions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "type": "income",
    "amount": 250000,
    "category": "أتعاب محاماة",
    "description": "دفعة أولى - قضية تجارية",
    "paymentMethod": "transfer",
    "invoiceId": "507f1f77bcf86cd799439200",
    "caseId": "507f1f77bcf86cd799439090",
    "referenceNumber": "TRF-2024-001234",
    "date": "2024-01-15T10:00:00.000Z",
    "notes": "تحويل بنكي من بنك الراجحي"
  }'
```

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "تم إنشاء المعاملة بنجاح",
  "messageEn": "Transaction created successfully",
  "transaction": {
    "_id": "507f1f77bcf86cd799439300",
    "transactionId": "TXN-202401-0001",
    "type": "income",
    "amount": 250000,
    "category": "أتعاب محاماة",
    "description": "دفعة أولى - قضية تجارية",
    "date": "2024-01-15T10:00:00.000Z",
    "paymentMethod": "transfer",
    "reference": "TRF-2024-001234",
    "relatedInvoice": {
      "_id": "507f1f77bcf86cd799439200",
      "invoiceNumber": "INV-2024-00045",
      "totalAmount": 500000
    },
    "relatedCase": {
      "_id": "507f1f77bcf86cd799439090",
      "caseNumber": "CASE-2024-00050",
      "title": "قضية تجارية - نزاع توريد"
    },
    "status": "completed",
    "notes": "تحويل بنكي من بنك الراجحي",
    "balance": 1250000,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

## Get Transaction Summary

### `GET /api/transactions/summary`

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO date | Start of period |
| `endDate` | ISO date | End of period |
| `type` | string | Filter by type |
| `category` | string | Filter by category |
| `caseId` | ObjectId | Filter by case |

### Example Request

```bash
curl -X GET "https://api.traf3li.com/api/transactions/summary?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "summary": {
    "income": 5500000,
    "expense": 1200000,
    "transfer": 0,
    "incomeCount": 22,
    "expenseCount": 15,
    "transferCount": 0,
    "balance": 4300000,
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z"
    }
  }
}
```

---

# 6. CRM ACTIVITIES API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/activities` | Schedule activity |
| `GET` | `/activities` | List activities |
| `GET` | `/activities/:id` | Get single |
| `GET` | `/activities/my` | My activities |
| `GET` | `/activities/stats` | Statistics |
| `GET` | `/activities/entity/:entityType/:entityId` | Entity activities |
| `POST` | `/activities/:id/done` | Mark as done |
| `POST` | `/activities/:id/cancel` | Cancel |
| `PATCH` | `/activities/:id/reschedule` | Reschedule |
| `PATCH` | `/activities/:id/reassign` | Reassign |
| `GET` | `/activities/types` | Get activity types |
| `POST` | `/activities/types` | Create type |

---

## Schedule Activity

### `POST /api/activities`

### Request Body Schema

```json
{
  "res_model": "string (required, e.g., 'Lead', 'Client', 'Case')",
  "res_id": "ObjectId (required)",
  "activity_type_id": "ObjectId (required)",
  "summary": "string (required, max 500)",
  "note": "string (max 10000)",
  "date_deadline": "ISO 8601 (required)",
  "user_id": "ObjectId (default: current user)"
}
```

### Example Request

```bash
curl -X POST https://api.traf3li.com/api/activities \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "res_model": "Lead",
    "res_id": "507f1f77bcf86cd799439070",
    "activity_type_id": "507f1f77bcf86cd799439400",
    "summary": "متابعة هاتفية للعرض المقدم",
    "note": "التأكد من استلام العرض ومناقشة الشروط",
    "date_deadline": "2024-01-16T09:00:00.000Z"
  }'
```

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "تم جدولة النشاط بنجاح",
  "messageEn": "Activity scheduled successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439500",
    "res_model": "Lead",
    "res_id": "507f1f77bcf86cd799439070",
    "activity_type_id": {
      "_id": "507f1f77bcf86cd799439400",
      "name": "Call",
      "nameAr": "مكالمة",
      "icon": "Phone",
      "color": "#3B82F6"
    },
    "summary": "متابعة هاتفية للعرض المقدم",
    "note": "التأكد من استلام العرض ومناقشة الشروط",
    "date_deadline": "2024-01-16T09:00:00.000Z",
    "user_id": {
      "_id": "507f1f77bcf86cd799439022",
      "firstName": "محمد",
      "lastName": "العتيبي",
      "email": "m.otaibi@firm.sa"
    },
    "state": "planned",
    "createdBy": {
      "_id": "507f1f77bcf86cd799439022",
      "firstName": "محمد",
      "lastName": "العتيبي"
    },
    "createdAt": "2024-01-15T14:00:00.000Z",
    "updatedAt": "2024-01-15T14:00:00.000Z"
  }
}
```

---

## Mark Activity as Done

### `POST /api/activities/:id/done`

### Request Body

```json
{
  "feedback": "string (optional, max 2000)"
}
```

### Example Request

```bash
curl -X POST "https://api.traf3li.com/api/activities/507f1f77bcf86cd799439500/done" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "تم التواصل مع العميل وتم الاتفاق على موعد اجتماع يوم الأحد"
  }'
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "تم إكمال النشاط",
  "messageEn": "Activity marked as done",
  "data": {
    "_id": "507f1f77bcf86cd799439500",
    "state": "done",
    "done_date": "2024-01-16T09:30:00.000Z",
    "done_by": {
      "_id": "507f1f77bcf86cd799439022",
      "firstName": "محمد",
      "lastName": "العتيبي"
    },
    "feedback": "تم التواصل مع العميل وتم الاتفاق على موعد اجتماع يوم الأحد"
  }
}
```

---

# 7. TEAM MEMBERS API

## Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/team` | List team members |
| `GET` | `/team/stats` | Team statistics |
| `GET` | `/team/options` | Dropdown options |
| `POST` | `/team/invite` | Invite member |
| `GET` | `/team/:id` | Get member |
| `PATCH` | `/team/:id` | Update member |
| `DELETE` | `/team/:id` | Remove member |
| `POST` | `/team/:id/resend-invite` | Resend invitation |
| `DELETE` | `/team/:id/revoke-invite` | Revoke invitation |
| `PATCH` | `/team/:id/permissions` | Update permissions |
| `PATCH` | `/team/:id/role` | Change role |
| `POST` | `/team/:id/suspend` | Suspend |
| `POST` | `/team/:id/activate` | Activate |
| `POST` | `/team/:id/depart` | Process departure |
| `GET` | `/team/:id/activity` | Activity log |

---

## Invite Team Member

### `POST /api/team/invite`

### Request Body Schema

```json
{
  "email": "string (required, valid email)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "role": "owner | admin | partner | senior_lawyer | lawyer | paralegal | secretary | accountant | intern",
  "phone": "string",
  "department": "string",
  "employmentType": "full_time | part_time | contractor | consultant",
  "message": "string (custom invitation message)"
}
```

### Example Request

```bash
curl -X POST https://api.traf3li.com/api/team/invite \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sara.qhtani@lawfirm.sa",
    "firstName": "سارة",
    "lastName": "القحطاني",
    "role": "lawyer",
    "phone": "+966501234567",
    "department": "القضايا التجارية",
    "employmentType": "full_time",
    "message": "مرحباً سارة، يسعدنا انضمامك لفريقنا"
  }'
```

### Success Response

**Status:** `201 Created`

```json
{
  "success": true,
  "message": "تم إرسال الدعوة بنجاح",
  "messageEn": "Invitation sent successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439600",
    "staffId": "STAFF-2024-0015",
    "email": "sara.qhtani@lawfirm.sa",
    "firstName": "سارة",
    "lastName": "القحطاني",
    "fullName": "سارة القحطاني",
    "displayName": "سارة القحطاني",
    "role": "lawyer",
    "roleDisplay": "محامي",
    "status": "pending_approval",
    "statusDisplay": "في انتظار الموافقة",
    "employmentType": "full_time",
    "department": "القضايا التجارية",
    "permissions": {
      "modules": [
        { "name": "cases", "access": "edit", "requiresApproval": false },
        { "name": "clients", "access": "edit", "requiresApproval": false },
        { "name": "documents", "access": "edit", "requiresApproval": false },
        { "name": "tasks", "access": "full", "requiresApproval": false },
        { "name": "finance", "access": "view", "requiresApproval": true },
        { "name": "hr", "access": "none", "requiresApproval": false },
        { "name": "reports", "access": "view", "requiresApproval": false },
        { "name": "settings", "access": "none", "requiresApproval": false },
        { "name": "team", "access": "view", "requiresApproval": false }
      ],
      "customPermissions": []
    },
    "invitationStatus": "pending",
    "invitedAt": "2024-01-15T15:00:00.000Z",
    "invitationExpiresAt": "2024-01-18T15:00:00.000Z",
    "invitedBy": {
      "_id": "507f1f77bcf86cd799439022",
      "firstName": "محمد",
      "lastName": "العتيبي"
    },
    "createdAt": "2024-01-15T15:00:00.000Z"
  }
}
```

---

## Update Member Permissions

### `PATCH /api/team/:id/permissions`

### Request Body Schema

```json
{
  "modules": [
    {
      "name": "cases | clients | finance | hr | reports | documents | tasks | settings | team",
      "access": "none | view | edit | full",
      "requiresApproval": "boolean"
    }
  ],
  "customPermissions": ["string"]
}
```

### Example Request

```bash
curl -X PATCH "https://api.traf3li.com/api/team/507f1f77bcf86cd799439600/permissions" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "modules": [
      { "name": "cases", "access": "full", "requiresApproval": false },
      { "name": "clients", "access": "full", "requiresApproval": false },
      { "name": "finance", "access": "edit", "requiresApproval": true },
      { "name": "hr", "access": "view", "requiresApproval": false }
    ],
    "customPermissions": ["invoices.approve", "cases.delete"]
  }'
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "message": "تم تحديث الصلاحيات",
  "messageEn": "Permissions updated",
  "data": {
    "_id": "507f1f77bcf86cd799439600",
    "permissions": {
      "modules": [
        { "name": "cases", "access": "full", "requiresApproval": false },
        { "name": "clients", "access": "full", "requiresApproval": false },
        { "name": "finance", "access": "edit", "requiresApproval": true },
        { "name": "hr", "access": "view", "requiresApproval": false },
        { "name": "reports", "access": "view", "requiresApproval": false },
        { "name": "documents", "access": "edit", "requiresApproval": false },
        { "name": "tasks", "access": "full", "requiresApproval": false },
        { "name": "settings", "access": "none", "requiresApproval": false },
        { "name": "team", "access": "view", "requiresApproval": false }
      ],
      "customPermissions": ["invoices.approve", "cases.delete"]
    }
  }
}
```

---

## Get Team Statistics

### `GET /api/team/stats`

### Example Request

```bash
curl -X GET "https://api.traf3li.com/api/team/stats" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "stats": {
    "total": 25,
    "active": 22,
    "pending": 2,
    "suspended": 1,
    "byRole": {
      "owner": 1,
      "admin": 2,
      "partner": 3,
      "senior_lawyer": 4,
      "lawyer": 8,
      "paralegal": 3,
      "secretary": 2,
      "accountant": 1,
      "intern": 1
    },
    "byStatus": {
      "active": 22,
      "pending_approval": 2,
      "suspended": 1,
      "departed": 0,
      "on_leave": 0
    },
    "byDepartment": {
      "القضايا التجارية": 8,
      "قضايا العمل": 5,
      "القضايا الجنائية": 4,
      "الشؤون الإدارية": 3,
      "المحاسبة": 2,
      "غير محدد": 3
    }
  }
}
```

---

# 8. CRM DASHBOARD API

## Endpoints Overview

| Method | Endpoint | Cache | Description |
|--------|----------|-------|-------------|
| `GET` | `/dashboard/summary` | 60s | Combined summary |
| `GET` | `/dashboard/analytics` | 300s | Analytics metrics |
| `GET` | `/dashboard/reports` | 300s | Reports with charts |
| `GET` | `/dashboard/hero-stats` | 300s | Top-level metrics |
| `GET` | `/dashboard/stats` | 300s | Detailed stats |
| `GET` | `/dashboard/financial-summary` | 300s | Financial overview |
| `GET` | `/dashboard/today-events` | 300s | Today's events |
| `GET` | `/dashboard/crm-stats` | 300s | CRM statistics |
| `GET` | `/dashboard/hr-stats` | 300s | HR statistics |
| `GET` | `/dashboard/finance-stats` | 300s | Finance statistics |

---

## Get Dashboard Summary

### `GET /api/dashboard/summary`

### Example Request

```bash
curl -X GET "https://api.traf3li.com/api/dashboard/summary" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "data": {
    "caseStats": {
      "total": 245,
      "active": 78,
      "pending": 23,
      "closed": 144,
      "won": 98,
      "lost": 46
    },
    "taskStats": {
      "total": 512,
      "byStatus": {
        "todo": 45,
        "in_progress": 68,
        "completed": 385,
        "cancelled": 14
      }
    },
    "reminderStats": {
      "total": 89,
      "byStatus": {
        "pending": 34,
        "completed": 52,
        "snoozed": 3
      }
    },
    "todayEvents": [
      {
        "_id": "507f1f77bcf86cd799439700",
        "title": "جلسة محكمة - قضية النخبة",
        "startDate": "2024-01-15T10:00:00.000Z",
        "endDate": "2024-01-15T12:00:00.000Z",
        "location": "المحكمة التجارية - الرياض",
        "type": "court_hearing",
        "status": "confirmed"
      }
    ],
    "financialSummary": {
      "totalRevenue": 25500000,
      "totalExpenses": 8500000,
      "pendingAmount": 3200000,
      "overdueAmount": 850000,
      "netProfit": 17000000
    }
  }
}
```

---

## Get CRM Statistics

### `GET /api/dashboard/crm-stats`

### Example Request

```bash
curl -X GET "https://api.traf3li.com/api/dashboard/crm-stats" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Success Response

**Status:** `200 OK`

```json
{
  "success": true,
  "stats": {
    "totalClients": 342,
    "newClientsThisMonth": 18,
    "activeLeads": 156,
    "conversionRate": 12.5,
    "averageLeadValue": 850000,
    "totalPipelineValue": 132600000,
    "clientsByStatus": {
      "active": 298,
      "inactive": 32,
      "archived": 12
    },
    "clientsByTier": {
      "standard": 245,
      "premium": 72,
      "vip": 25
    },
    "leadsByStatus": {
      "new": 45,
      "contacted": 38,
      "qualified": 32,
      "proposal": 22,
      "negotiation": 12,
      "won": 5,
      "lost": 2
    },
    "leadsBySource": {
      "referral": 58,
      "website": 42,
      "social_media": 28,
      "advertising": 15,
      "walk_in": 8,
      "event": 5
    }
  }
}
```

---

# 9. ALL ENUMS REFERENCE

## Client Enums

| Field | Values |
|-------|--------|
| `clientType` | `individual`, `company` |
| `status` | `active`, `inactive`, `archived`, `pending` |
| `clientTier` | `standard`, `premium`, `vip` |
| `clientSource` | `website`, `referral`, `returning`, `ads`, `social`, `walkin`, `platform`, `external`, `cold_call`, `event` |
| `billing.type` | `hourly`, `flat_fee`, `contingency`, `retainer` |
| `billing.paymentTerms` | `immediate`, `net_15`, `net_30`, `net_45`, `net_60` |

## Contact Enums

| Field | Values |
|-------|--------|
| `type` | `individual`, `organization`, `court`, `attorney`, `expert`, `government`, `other` |
| `primaryRole` | `client_contact`, `opposing_party`, `opposing_counsel`, `witness`, `expert_witness`, `judge`, `court_clerk`, `mediator`, `arbitrator`, `referral_source`, `vendor`, `other` |
| `status` | `active`, `inactive`, `archived`, `deceased` |
| `priority` | `low`, `normal`, `high`, `vip` |
| `careerLevel` | `entry`, `junior`, `mid`, `senior`, `lead`, `manager`, `director`, `vp`, `c_level`, `executive`, `owner` |
| `identityType` | `national_id`, `iqama`, `gcc_id`, `passport`, `border_number`, `visitor_id`, `temporary_id`, `diplomatic_id` |
| `conflictCheckStatus` | `not_checked`, `clear`, `potential_conflict`, `confirmed_conflict` |
| `preferredContactMethod` | `email`, `phone`, `sms`, `whatsapp`, `in_person` |
| `gccCountry` | `UAE`, `Kuwait`, `Bahrain`, `Oman`, `Qatar` |

## Organization Enums

| Field | Values |
|-------|--------|
| `type` | `llc`, `joint_stock`, `partnership`, `sole_proprietorship`, `branch`, `government`, `nonprofit`, `professional`, `holding`, `company`, `court`, `law_firm`, `other` |
| `status` | `active`, `inactive`, `suspended`, `dissolved`, `pending`, `archived` |
| `size` | `micro`, `small`, `medium`, `large`, `enterprise` |
| `billingType` | `hourly`, `fixed`, `contingency`, `retainer` |
| `preferredPaymentMethod` | `bank_transfer`, `check`, `cash`, `credit_card` |
| `billingCycle` | `monthly`, `quarterly`, `upon_completion` |

## Lead Enums

| Field | Values |
|-------|--------|
| `type` | `individual`, `company` |
| `status` | `new`, `contacted`, `qualified`, `proposal`, `negotiation`, `won`, `lost`, `dormant` |
| `source.type` | `website`, `referral`, `social_media`, `advertising`, `cold_call`, `walk_in`, `event`, `other` |
| `intake.caseType` | `civil`, `criminal`, `family`, `commercial`, `labor`, `real_estate`, `administrative`, `execution`, `other` |
| `intake.urgency` | `low`, `normal`, `high`, `urgent`, `critical` |
| `qualification.budget` | `unknown`, `low`, `medium`, `high`, `premium` |
| `qualification.authority` | `unknown`, `decision_maker`, `influencer`, `researcher` |
| `qualification.need` | `unknown`, `urgent`, `planning`, `exploring` |
| `qualification.timeline` | `unknown`, `immediate`, `this_month`, `this_quarter`, `this_year`, `no_timeline` |
| `proposedFeeType` | `hourly`, `fixed`, `contingency`, `retainer`, `hybrid` |
| `lost.reason` | `price`, `competitor`, `no_response`, `not_qualified`, `timing`, `no_budget`, `went_cold`, `duplicate`, `other` |
| `forecastCategory` | `pipeline`, `best_case`, `commit`, `closed_won`, `omitted` |
| `competition.status` | `none`, `identified`, `evaluating`, `head_to_head`, `won`, `lost_to_competitor` |
| `riskLevel` | `low`, `medium`, `high`, `critical` |
| `priority` | `low`, `normal`, `high`, `urgent` |

## Transaction Enums

| Field | Values |
|-------|--------|
| `type` | `income`, `expense`, `transfer` |
| `status` | `completed`, `pending`, `cancelled` |
| `paymentMethod` | `cash`, `card`, `transfer`, `check` |

## Activity Enums

| Field | Values |
|-------|--------|
| `state` | `planned`, `today`, `overdue`, `done`, `cancelled` |
| `delayUnit` | `minutes`, `hours`, `days`, `weeks`, `months` |

## Team Member Enums

| Field | Values |
|-------|--------|
| `role` | `owner`, `admin`, `partner`, `senior_lawyer`, `lawyer`, `paralegal`, `secretary`, `accountant`, `intern` |
| `status` | `active`, `inactive`, `pending_approval`, `suspended`, `departed`, `on_leave`, `terminated`, `probation` |
| `employmentType` | `full_time`, `part_time`, `contractor`, `consultant` |
| `permissions.modules[].name` | `cases`, `clients`, `finance`, `hr`, `reports`, `documents`, `tasks`, `settings`, `team` |
| `permissions.modules[].access` | `none`, `view`, `edit`, `full` |
| `departureReason` | `resignation`, `termination`, `retirement`, `transfer` |

## Saudi-Specific Enums

| Field | Values |
|-------|--------|
| `regionCode` | `01`-`13` (Saudi administrative regions) |
| `gender` | `male`, `female` |
| `maritalStatus` | `single`, `married`, `divorced`, `widowed` |
| `legalForm` | `llc`, `joint_stock`, `partnership`, `sole_proprietorship`, `branch`, `professional`, `other` |
| `preferredLanguage` | `ar`, `en` |

---

# Error Responses

## Standard Error Response

```json
{
  "success": false,
  "error": true,
  "message": "رسالة الخطأ بالعربية",
  "messageEn": "Error message in English",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (invalid/expired token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Not Found |
| `409` | Conflict (duplicate resource) |
| `422` | Unprocessable Entity |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |

---

# Rate Limiting

- **Authenticated requests:** 100 requests/minute
- **Public endpoints:** 20 requests/minute
- **Bulk operations:** 10 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705325400
```

---

# Pagination

All list endpoints return paginated results:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Field to sort by
- `sortOrder`: `asc` or `desc`

---

# Multi-Tenancy

All requests are automatically scoped to the user's firm/lawyer context via the `authenticatedApi` middleware.

- **Firm members:** Access data filtered by `firmId`
- **Solo lawyers:** Access data filtered by `lawyerId`

The tenant context is extracted from the JWT token claims.

---

# Notes

1. **All monetary values are in halalas** (1 SAR = 100 halalas)
2. **All dates are in ISO 8601 format** (UTC timezone)
3. **Arabic text is fully supported** in all string fields
4. **Sensitive fields are encrypted** at rest (nationalId, iqamaNumber, crNumber)
5. **All endpoints require authentication** except public endpoints
