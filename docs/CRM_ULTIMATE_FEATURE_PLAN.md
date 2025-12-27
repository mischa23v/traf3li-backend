# Ultimate CRM Feature Plan

## Executive Summary

This document contains a comprehensive analysis comparing our CRM/Pipeline system against 5 major open-source ERP/CRM systems:
- **Odoo** - 13+ models, 80+ fields, 50+ features
- **ERPNext** - 38+ DocTypes, 200+ fields, 30+ features
- **Dolibarr** - 20+ tables, 150+ fields, 40+ features
- **Apache OFBiz** - 30+ entities, 200+ fields, 35+ features
- **iDempiere** - 25+ tables, 150+ fields, 30+ features

### Our Current State
- **15+ models** with robust CRM functionality
- **Unique Saudi integrations** (Najiz, Absher, Wathq)
- **BANT Qualification** - Best-in-class lead qualification
- **Deal Health Scoring** - AI-driven, unique feature
- **Stakeholder Mapping** - Enterprise-grade capability
- **Arabic 4-part name support** (الاسم الرباعي)
- **7-part Saudi National Address** format

---

## Gap Analysis Summary

### What We Have (Strengths)

| Feature | Our Implementation | vs Competitors |
|---------|-------------------|----------------|
| BANT Qualification | Full 4-dimension + scoring | **BETTER** than all |
| Deal Health Scoring | 6-factor AI analysis | **UNIQUE** |
| Stakeholder Mapping | Role, influence, sentiment | **UNIQUE** |
| Saudi Integration | Najiz, Absher, Wathq | **UNIQUE** |
| Arabic Name (4-part) | الاسم الرباعي support | **UNIQUE** |
| National Address (7-part) | Full Saudi format | **UNIQUE** |
| Conflict Checking | Legal-specific | **UNIQUE** |
| Lead Scoring | AI/ML-based, 0-150 scale | Equal to Odoo |
| Pipeline Automation | Stage triggers | Equal to Odoo |
| Deal Room | Collaborative docs | **UNIQUE** |
| Multi-tenancy | firmId + lawyerId | **BETTER** security |

### What We're Missing (Gaps)

| Feature | Priority | Found In |
|---------|----------|----------|
| Sales Team Management | **CRITICAL** | All systems |
| Territory Management | **CRITICAL** | All systems |
| Marketing Campaigns | **CRITICAL** | All systems |
| Quote/Proposal Items | **CRITICAL** | All systems |
| Products/Services Catalog | **CRITICAL** | All systems |
| Expected Revenue Field | **CRITICAL** | All systems |
| Sales Forecasting | HIGH | Odoo, ERPNext, OFBiz, iDempiere |
| Lost Reason Tracking | HIGH | Odoo, ERPNext, Dolibarr |
| Tags/Categories | HIGH | Odoo, ERPNext, Dolibarr |
| Email Campaigns | HIGH | All systems |
| Email Tracking (opens/clicks) | HIGH | Odoo, ERPNext |
| UTM Parameters | HIGH | Odoo, ERPNext |
| First Response Time | HIGH | ERPNext |
| Duplicate Detection | HIGH | Odoo, ERPNext, iDempiere |
| Auto-Assignment Rules | HIGH | Odoo, ERPNext, OFBiz |
| Import/Export Wizard | HIGH | All systems |
| Dashboard Widgets | HIGH | All systems |

---

## Phase 1: New Models Required

### 1.1 SalesTeam Model

```javascript
// src/models/salesTeam.model.js
const salesTeamSchema = new Schema({
  firmId: { type: ObjectId, ref: 'Firm', required: true },
  teamId: { type: String, unique: true }, // TEAM-####

  // Basic Info
  name: { type: String, required: true },
  nameAr: String,
  description: String,
  color: String,
  icon: String,

  // Team Lead
  leaderId: { type: ObjectId, ref: 'User', required: true },

  // Members
  members: [{
    userId: { type: ObjectId, ref: 'User' },
    role: { type: String, enum: ['leader', 'member', 'support'] },
    joinedAt: Date,
    isActive: { type: Boolean, default: true }
  }],

  // Pipeline Assignment
  defaultPipelineId: { type: ObjectId, ref: 'Pipeline' },
  pipelines: [{ type: ObjectId, ref: 'Pipeline' }],

  // Territories
  territories: [{ type: ObjectId, ref: 'Territory' }],

  // Email Alias (for lead capture)
  emailAlias: String,

  // Targets
  targets: {
    monthly: { leads: Number, opportunities: Number, revenue: Number, wonDeals: Number },
    quarterly: { leads: Number, opportunities: Number, revenue: Number, wonDeals: Number }
  },

  // Settings
  settings: {
    useLeads: { type: Boolean, default: true },
    useOpportunities: { type: Boolean, default: true },
    autoAssignmentEnabled: { type: Boolean, default: false },
    assignmentMethod: { type: String, enum: ['round_robin', 'load_balanced', 'manual'], default: 'manual' },
    maxLeadsPerMember: Number,
    assignmentPeriodDays: { type: Number, default: 30 }
  },

  // Stats (cached)
  stats: {
    totalLeads: { type: Number, default: 0 },
    activeOpportunities: { type: Number, default: 0 },
    opportunityAmount: { type: Number, default: 0 },
    overdueCount: { type: Number, default: 0 },
    wonThisMonth: { type: Number, default: 0 },
    lostThisMonth: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    lastUpdated: Date
  },

  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false }
}, { timestamps: true });
```

### 1.2 Territory Model

```javascript
// src/models/territory.model.js
const territorySchema = new Schema({
  firmId: { type: ObjectId, ref: 'Firm', required: true },
  territoryId: { type: String, unique: true }, // TERR-####

  // Hierarchy
  name: { type: String, required: true },
  nameAr: String,
  code: String,
  parentTerritoryId: { type: ObjectId, ref: 'Territory' },
  level: { type: Number, default: 0 }, // 0=country, 1=region, 2=city, 3=district

  // Geographic Definition
  type: { type: String, enum: ['country', 'region', 'city', 'district', 'custom'], default: 'custom' },

  // Saudi-specific regions
  saudiRegion: {
    type: String,
    enum: ['riyadh', 'makkah', 'madinah', 'eastern', 'asir', 'tabuk', 'hail',
           'northern_borders', 'jazan', 'najran', 'bahah', 'jawf', 'qassim']
  },

  countries: [String],
  cities: [String],
  postalCodes: [String],

  // Assignment
  managerId: { type: ObjectId, ref: 'User' },
  salesTeamId: { type: ObjectId, ref: 'SalesTeam' },
  assignedUsers: [{ type: ObjectId, ref: 'User' }],

  // Targets & Stats
  targets: { annualRevenue: Number, quarterlyRevenue: Number, monthlyLeads: Number },
  stats: { totalClients: Number, totalLeads: Number, totalRevenue: Number, pipelineValue: Number },

  isActive: { type: Boolean, default: true },
  isGroup: { type: Boolean, default: false }
}, { timestamps: true });
```

### 1.3 Campaign Model

```javascript
// src/models/campaign.model.js
const campaignSchema = new Schema({
  firmId: { type: ObjectId, ref: 'Firm', required: true },
  campaignId: { type: String, unique: true }, // CAMP-YYYY-####

  name: { type: String, required: true },
  nameAr: String,
  description: String,

  type: { type: String, enum: ['email', 'social', 'event', 'webinar', 'referral', 'advertising', 'content', 'other'], required: true },
  channel: { type: String, enum: ['email', 'linkedin', 'twitter', 'facebook', 'instagram', 'google_ads', 'whatsapp', 'sms', 'phone', 'in_person', 'website', 'other'] },

  startDate: { type: Date, required: true },
  endDate: Date,
  status: { type: String, enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'], default: 'draft' },

  budget: { planned: Number, actual: Number, currency: { type: String, default: 'SAR' } },
  targets: { expectedLeads: Number, expectedConversions: Number, expectedRevenue: Number, expectedResponseRate: Number },

  utm: { source: String, medium: String, campaign: String, term: String, content: String },

  parentCampaignId: { type: ObjectId, ref: 'Campaign' },
  ownerId: { type: ObjectId, ref: 'User', required: true },
  teamId: { type: ObjectId, ref: 'SalesTeam' },

  results: {
    leadsGenerated: { type: Number, default: 0 },
    leadsConverted: { type: Number, default: 0 },
    opportunitiesCreated: { type: Number, default: 0 },
    dealsWon: { type: Number, default: 0 },
    revenueGenerated: { type: Number, default: 0 },
    emailsSent: { type: Number, default: 0 },
    emailsOpened: { type: Number, default: 0 },
    emailsClicked: { type: Number, default: 0 },
    roi: { type: Number, default: 0 }
  },

  tags: [String],
  notes: String
}, { timestamps: true });
```

### 1.4 Product Model

```javascript
// src/models/product.model.js
const productSchema = new Schema({
  firmId: { type: ObjectId, ref: 'Firm', required: true },
  productId: { type: String, unique: true }, // PROD-####

  name: { type: String, required: true },
  nameAr: String,
  code: String,
  description: String,
  descriptionAr: String,

  type: { type: String, enum: ['service', 'product', 'subscription', 'retainer', 'hourly'], required: true },
  category: String,
  practiceArea: String,

  pricing: {
    unitPrice: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    priceType: { type: String, enum: ['fixed', 'per_hour', 'per_day', 'per_month', 'per_year', 'custom'], default: 'fixed' },
    minPrice: Number,
    maxPrice: Number,
    taxRate: { type: Number, default: 15 },
    taxInclusive: { type: Boolean, default: false }
  },

  recurring: {
    isRecurring: { type: Boolean, default: false },
    interval: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'yearly'] },
    intervalCount: { type: Number, default: 1 }
  },

  unit: { type: String, enum: ['hour', 'day', 'session', 'case', 'month', 'year', 'unit', 'other'], default: 'unit' },
  isActive: { type: Boolean, default: true },
  isTaxable: { type: Boolean, default: true },

  stats: { timesQuoted: Number, timesSold: Number, totalRevenue: Number },
  tags: [String]
}, { timestamps: true });
```

### 1.5 Quote Model

```javascript
// src/models/quote.model.js
const quoteSchema = new Schema({
  firmId: { type: ObjectId, ref: 'Firm', required: true },
  lawyerId: { type: ObjectId, ref: 'User', required: true },
  quoteId: { type: String, unique: true }, // QT-YYYY-#####

  leadId: { type: ObjectId, ref: 'Lead' },
  clientId: { type: ObjectId, ref: 'Client' },
  contactId: { type: ObjectId, ref: 'Contact' },

  title: { type: String, required: true },
  titleAr: String,
  description: String,

  status: { type: String, enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'], default: 'draft' },

  quoteDate: { type: Date, default: Date.now },
  validUntil: Date,
  sentAt: Date,
  viewedAt: Date,
  respondedAt: Date,

  customerInfo: { name: String, email: String, phone: String, company: String, address: String },

  items: [{
    itemId: String,
    productId: { type: ObjectId, ref: 'Product' },
    description: { type: String, required: true },
    descriptionAr: String,
    quantity: { type: Number, required: true, default: 1 },
    unit: String,
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 15 },
    taxAmount: { type: Number, default: 0 },
    subtotal: { type: Number, required: true },
    total: { type: Number, required: true },
    sortOrder: Number,
    isOptional: { type: Boolean, default: false },
    notes: String
  }],

  totals: {
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 }
  },

  currency: { type: String, default: 'SAR' },

  paymentTerms: {
    type: { type: String, enum: ['immediate', 'net_15', 'net_30', 'net_60', 'custom'] },
    customDays: Number,
    depositRequired: Boolean,
    depositPercent: Number,
    depositAmount: Number,
    notes: String
  },

  termsAndConditions: String,
  termsAndConditionsAr: String,

  signatures: {
    firmSignature: { signedBy: ObjectId, signedAt: Date, signature: String },
    clientSignature: { signedAt: Date, signature: String, signedByName: String, signedByEmail: String, ipAddress: String }
  },

  viewHistory: [{ viewedAt: Date, ipAddress: String, userAgent: String, duration: Number }],

  pdfUrl: String,
  pdfGeneratedAt: Date,

  internalNotes: String,
  clientNotes: String,

  lostReasonId: { type: ObjectId, ref: 'LostReason' },
  lostNotes: String,

  createdBy: { type: ObjectId, ref: 'User' },
  assignedTo: { type: ObjectId, ref: 'User' },

  revisionNumber: { type: Number, default: 1 },
  previousVersionId: { type: ObjectId, ref: 'Quote' },

  tags: [String]
}, { timestamps: true });
```

### 1.6 LostReason Model

```javascript
// src/models/lostReason.model.js
const lostReasonSchema = new Schema({
  firmId: { type: ObjectId, ref: 'Firm', required: true },

  name: { type: String, required: true },
  nameAr: String,
  description: String,

  category: { type: String, enum: ['price', 'competition', 'timing', 'needs', 'internal', 'other'], default: 'other' },
  applicableTo: [{ type: String, enum: ['lead', 'opportunity', 'quote'] }],

  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },

  usageCount: { type: Number, default: 0 }
}, { timestamps: true });
```

### 1.7 Tag Model

```javascript
// src/models/tag.model.js
const tagSchema = new Schema({
  firmId: { type: ObjectId, ref: 'Firm', required: true },

  name: { type: String, required: true },
  nameAr: String,
  slug: String,
  color: { type: String, default: '#6366f1' },

  entityTypes: [{ type: String, enum: ['lead', 'client', 'contact', 'case', 'quote', 'campaign'] }],
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

### 1.8 Additional Models

- **EmailTemplate** - Email templates for campaigns and automation
- **SalesForecast** - Revenue forecasting by period/team/territory
- **ContactList** - Email list management for campaigns
- **ActivityPlan** - Activity sequences for lead nurturing

---

## Phase 2: Lead Model Enhancements

Add these fields to the existing Lead model:

```javascript
// Additional fields for lead.model.js

// Contact - Add Mobile separately
mobile: String,
fax: String,
website: String,

// Address - Add State
'address.state': String,
'address.stateCode': String,

// Financial (CRITICAL)
expectedRevenue: { type: Number, default: 0 },
weightedRevenue: { type: Number, default: 0 }, // expectedRevenue * (probability/100)
recurringRevenue: { amount: Number, interval: String },
currency: { type: String, default: 'SAR' },

// Business Info
industry: String,
industryCode: String,
numberOfEmployees: { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] },
annualRevenue: Number,

// UTM Tracking
utm: { source: String, medium: String, campaign: String, term: String, content: String },

// References
campaignId: { type: ObjectId, ref: 'Campaign' },
territoryId: { type: ObjectId, ref: 'Territory' },
salesTeamId: { type: ObjectId, ref: 'SalesTeam' },

// Metrics
metrics: {
  daysToAssign: Number,
  daysToClose: Number,
  firstResponseTime: Number,
  totalActivities: { type: Number, default: 0 },
  lastActivityDaysAgo: Number
},

// Lost Tracking
lostReasonId: { type: ObjectId, ref: 'LostReason' },
lostReasonDetails: String,
lostDate: Date,
lostToCompetitor: String,

// Tags
tagIds: [{ type: ObjectId, ref: 'Tag' }],

// Data Quality
dataQuality: {
  emailValid: Boolean,
  phoneValid: Boolean,
  enriched: Boolean,
  enrichedAt: Date,
  enrichmentSource: String
}
```

---

## Phase 3: New API Endpoints

### Sales Teams API
```
GET    /api/sales-teams              - List teams
POST   /api/sales-teams              - Create team
GET    /api/sales-teams/:id          - Get team
PUT    /api/sales-teams/:id          - Update team
DELETE /api/sales-teams/:id          - Delete team
POST   /api/sales-teams/:id/members  - Add member
DELETE /api/sales-teams/:id/members/:userId - Remove member
GET    /api/sales-teams/:id/stats    - Team statistics
GET    /api/sales-teams/:id/leaderboard - Team leaderboard
```

### Territories API
```
GET    /api/territories              - List territories
POST   /api/territories              - Create territory
GET    /api/territories/:id          - Get territory
PUT    /api/territories/:id          - Update territory
DELETE /api/territories/:id          - Delete territory
GET    /api/territories/:id/tree     - Get hierarchy tree
GET    /api/territories/:id/stats    - Territory statistics
```

### Campaigns API
```
GET    /api/campaigns                - List campaigns
POST   /api/campaigns                - Create campaign
GET    /api/campaigns/:id            - Get campaign
PUT    /api/campaigns/:id            - Update campaign
DELETE /api/campaigns/:id            - Delete campaign
POST   /api/campaigns/:id/launch     - Launch campaign
POST   /api/campaigns/:id/pause      - Pause campaign
GET    /api/campaigns/:id/stats      - Campaign statistics
GET    /api/campaigns/:id/leads      - Leads from campaign
```

### Products API
```
GET    /api/products                 - List products
POST   /api/products                 - Create product
GET    /api/products/:id             - Get product
PUT    /api/products/:id             - Update product
DELETE /api/products/:id             - Delete product
```

### Quotes API
```
GET    /api/quotes                   - List quotes
POST   /api/quotes                   - Create quote
GET    /api/quotes/:id               - Get quote
PUT    /api/quotes/:id               - Update quote
DELETE /api/quotes/:id               - Delete quote
POST   /api/quotes/:id/send          - Send quote
POST   /api/quotes/:id/accept        - Accept quote
POST   /api/quotes/:id/reject        - Reject quote
GET    /api/quotes/:id/pdf           - Generate PDF
POST   /api/quotes/:id/duplicate     - Duplicate quote
POST   /api/quotes/:id/items         - Add item
PUT    /api/quotes/:id/items/:itemId - Update item
DELETE /api/quotes/:id/items/:itemId - Delete item
```

### Analytics API
```
GET    /api/analytics/dashboard           - Main CRM dashboard
GET    /api/analytics/pipeline            - Pipeline analysis
GET    /api/analytics/sales-funnel        - Sales funnel visualization
GET    /api/analytics/forecast            - Forecast report
GET    /api/analytics/lead-sources        - Lead source analysis
GET    /api/analytics/win-loss            - Win/loss analysis
GET    /api/analytics/activity            - Activity report
GET    /api/analytics/team-performance    - Team performance
GET    /api/analytics/territory           - Territory analysis
GET    /api/analytics/campaign-roi        - Campaign ROI
GET    /api/analytics/first-response      - First response time
GET    /api/analytics/conversion-rates    - Conversion rates
```

---

## Phase 4: New Services

1. **autoAssignment.service.js** - Round robin, load balanced assignment
2. **campaignEmail.service.js** - Bulk email campaigns
3. **emailTracking.service.js** - Open/click tracking
4. **forecast.service.js** - Forecast calculations
5. **quoteGeneration.service.js** - PDF generation
6. **duplicateDetection.service.js** - Find duplicates
7. **dataEnrichment.service.js** - Enrich lead data
8. **activitySequence.service.js** - Execute activity plans
9. **dashboardAggregation.service.js** - Dashboard metrics
10. **territoryAssignment.service.js** - Auto-assign by territory

---

## Implementation Priority

### Critical (Phase 1)
- [ ] SalesTeam model & controller
- [ ] Territory model & controller
- [ ] Campaign model & controller
- [ ] Product model & controller
- [ ] Quote model & controller
- [ ] LostReason model & controller
- [ ] Tag model & controller
- [ ] Lead model enhancements (expectedRevenue, UTM, etc.)

### High Priority (Phase 2)
- [ ] EmailTemplate model & controller
- [ ] SalesForecast model & controller
- [ ] Analytics controller with dashboard endpoints
- [ ] Auto-assignment service
- [ ] Duplicate detection service

### Medium Priority (Phase 3)
- [ ] ContactList model & controller
- [ ] ActivityPlan model & controller
- [ ] Campaign email service
- [ ] Email tracking service
- [ ] Quote PDF generation

### Lower Priority (Phase 4)
- [ ] Data enrichment service
- [ ] Activity sequence service
- [ ] Advanced reporting
- [ ] Import/Export wizard

---

## Comparison Sources

Research conducted on:
- **Odoo 19.0** - GitHub (odoo/odoo), Official Documentation
- **ERPNext v15** - GitHub (frappe/erpnext), Official Documentation
- **Dolibarr** - GitHub (Dolibarr/dolibarr), Wiki Documentation
- **Apache OFBiz** - GitHub (apache/ofbiz-framework), Confluence Wiki
- **iDempiere** - GitHub (idempiere/idempiere), Wiki Documentation

---

## Our Competitive Advantages

These features are **UNIQUE** to our system and should be preserved:

1. **BANT Qualification** - 4-dimension scoring with breakdown
2. **Deal Health Scoring** - 6-factor AI analysis
3. **Stakeholder Mapping** - Role, influence, sentiment tracking
4. **Saudi Government Integration** - Najiz, Absher, Wathq
5. **Arabic 4-Part Name** - الاسم الرباعي support
6. **7-Part National Address** - Full Saudi postal format
7. **Conflict Checking** - Legal industry specific
8. **Deal Room** - Collaborative document sharing
9. **Multi-tenancy Security** - firmId + lawyerId isolation
