# Saudi Arabia Labor Law HR System Compliance Checklist

**Research Date:** January 2026
**Based on:** Saudi Labor Law 2025-2026 amendments and Vision 2030 requirements

---

## Table of Contents
1. [Employment Contracts](#1-employment-contracts)
2. [Working Hours & Overtime](#2-working-hours--overtime)
3. [Leave Entitlements](#3-leave-entitlements)
4. [End of Service Benefits (EOSB)](#4-end-of-service-benefits-eosb)
5. [Termination Rules](#5-termination-rules)
6. [Saudization Requirements (Nitaqat)](#6-saudization-requirements-nitaqat)
7. [Mandatory Benefits](#7-mandatory-benefits)
8. [Wage Protection System (WPS)](#8-wage-protection-system-wps)
9. [GOSI Compliance](#9-gosi-compliance)
10. [Qiwa Platform Integration](#10-qiwa-platform-integration)

---

## 1. Employment Contracts

### ✅ Digital Documentation (CRITICAL - 2026 Mandate)

**Implementation Phases:**
- ⚠️ **Phase One (October 6, 2025):** New and updated contracts
- ⚠️ **Phase Two (March 6, 2026):** Existing fixed-term contracts
- ⚠️ **Phase Three (August 6, 2026):** Existing open-ended contracts

**System Requirements:**
- [ ] **Qiwa Platform Integration:** All contracts MUST be digitally registered through Qiwa
- [ ] **Enforceability:** Unregistered contracts are legally INVALID
- [ ] **Dual Storage:** System must maintain both local copy and Qiwa registration status
- [ ] **Auto-sync:** Real-time sync with Qiwa for contract status updates
- [ ] **Alert System:** Warn users when contract is not Qiwa-registered

### ✅ Mandatory Contract Fields

**Personal Information:**
- [ ] Employee full name (Arabic + English)
- [ ] Employer name and address
- [ ] National ID / Iqama number with validation (Luhn algorithm)
- [ ] Nationality

**Employment Terms:**
- [ ] Job title (Arabic + English)
- [ ] Work location
- [ ] Contract type: `indefinite`, `fixed_term`, `part_time`, `temporary`
- [ ] Contract start date
- [ ] Contract end date (for fixed-term only)
- [ ] Probation period (if applicable)

**Compensation:**
- [ ] Basic salary
- [ ] Housing allowance (typically 25% of basic)
- [ ] Transportation allowance (typically 10% of basic)
- [ ] Food allowance OR provision of meals
- [ ] Total gross salary
- [ ] Payment frequency (monthly standard)

**Work Schedule:**
- [ ] Working hours per day (8 hours standard)
- [ ] Working hours per week (48 hours standard)
- [ ] Work days
- [ ] Rest day(s)

**Benefits:**
- [ ] Annual leave entitlement (21 or 30 days)
- [ ] Medical insurance details
- [ ] End of service benefits calculation method
- [ ] Overtime rate (150% of hourly wage)

**Special Provisions:**
- [ ] Air passage entitlement (for expatriates)
- [ ] Provision for repatriation of mortal remains
- [ ] Dispute settlement mechanism

### ✅ Contract Types

**System must support:**
- [ ] **Indefinite (Open-ended):** No end date, requires 60-day notice
- [ ] **Fixed-term:** Specific end date, max 4 years (renewable)
- [ ] **Part-time:** Proportional benefits calculation
- [ ] **Temporary/Seasonal:** For specific projects

### ✅ Probation Period Rules

**Duration:**
- [ ] Maximum: **180 days** (updated Feb 2025, was 90 days)
- [ ] Must be explicitly stated in contract
- [ ] Cannot be applied if not mentioned in contract
- [ ] Validation: Block probation if not in contract

**Termination During Probation:**
- [ ] Either party can terminate without cause
- [ ] **Minimum notice: 1 day**
- [ ] **Special rule:** If termination near end, minimum 7 days notice
- [ ] No EOSB payable during probation
- [ ] No severance required (unless contract specifies)

**Re-employment:**
- [ ] Second probation only allowed for different role
- [ ] Cannot apply probation for same role unless 6+ months gap
- [ ] Validation: Warn if same role + second probation

### ✅ Contract Renewal

- [ ] Fixed-term auto-converts to indefinite after 4 years
- [ ] System alert at 3.5 years to decide renewal or conversion
- [ ] Track total contract duration across renewals
- [ ] Qiwa sync required for all renewals

---

## 2. Working Hours & Overtime

### ✅ Standard Working Hours

**Daily/Weekly Limits:**
- [ ] **Maximum: 8 hours/day** (daily standard)
- [ ] **Maximum: 48 hours/week** (weekly standard)
- [ ] **Maximum time at workplace: 11 hours** (including rest time)
- [ ] Validation: Block time entries exceeding limits

**Ramadan Working Hours:**
- [ ] **Muslim employees: 6 hours/day or 36 hours/week**
- [ ] Auto-adjust schedule during Ramadan month
- [ ] Hijri calendar integration for Ramadan detection
- [ ] Non-Muslim employees: Regular hours (unless company policy states otherwise)

### ✅ Rest Periods

- [ ] **Minimum break: 30 minutes after 5 consecutive hours**
- [ ] Breaks NOT counted as working hours
- [ ] Must allow for rest, meals, and prayers
- [ ] System validation: Enforce break periods

### ✅ Overtime Calculation

**Standard Overtime (Weekdays):**
- [ ] **Rate: 150% of hourly wage** (Hourly wage × 1.5 × OT hours)
- [ ] Formula: `(Monthly Salary ÷ 30 days ÷ 8 hours) × 1.5 × OT hours`
- [ ] Requires employee consent for compensatory leave in lieu of pay

**Holiday/Weekend Overtime:**
- [ ] **Fridays/Saturdays/Public Holidays: Double compensation**
- [ ] Regular wage + 150% overtime = 250% total
- [ ] Validation: Auto-apply holiday rate on official holidays

**Ramadan Overtime:**
- [ ] Hours beyond 6/day for Muslims = overtime at 150%
- [ ] Calculation base: 6-hour workday rate

### ✅ Overtime Limits

- [ ] **Maximum OT per day: 3 hours** (11 total - 8 regular)
- [ ] **Maximum OT per week: 18 hours**
- [ ] **Maximum OT per year: 72 hours** (without written consent)
- [ ] System validation: Block OT requests exceeding limits
- [ ] Alert: Require written consent for >72 hours annually

### ✅ Night Shift Rules

**Definition:**
- [ ] Night work: Between 11 PM and 6 AM (or 10 PM to 6 AM)

**Compensation:**
- [ ] Additional compensation required
- [ ] Options: Adjusted hours, higher wages, or other benefits
- [ ] Employer must provide: Health services, transportation allowance
- [ ] System field: Track night shift differentials

---

## 3. Leave Entitlements

### ✅ Annual Leave (Article 109)

**Entitlement:**
- [ ] **<5 years service: 21 days minimum**
- [ ] **≥5 years service: 30 days minimum**
- [ ] Auto-upgrade at 5-year mark
- [ ] Full wage during leave (includes basic + fixed allowances)

**Calculation:**
- [ ] Leave wage = Average daily wage × Leave days
- [ ] Include all fixed allowances in calculation
- [ ] Pro-rata for partial years

**Carry Forward:**
- [ ] Configurable per company policy
- [ ] Common: Allow carry forward with max limit (e.g., 10 days)
- [ ] Track unused balance year-over-year

**Encashment:**
- [ ] Allowed on termination (unused balance paid out)
- [ ] Some companies allow annual encashment (policy-dependent)
- [ ] Calculate based on daily wage rate

### ✅ Sick Leave (Article 115)

**Entitlement: 120 days per year (total)**

**Payment Structure:**
- [ ] **First 30 days: Full pay (100%)**
- [ ] **Next 60 days: Half pay (50%)**
- [ ] **Final 30 days: Unpaid (0%)**
- [ ] Auto-calculate payment percentage based on sick days used
- [ ] Medical certificate required

**System Requirements:**
- [ ] Track sick leave balance separately
- [ ] Auto-apply payment tier based on days used
- [ ] Validation: Require medical certificate upload

### ✅ Maternity Leave

**Duration:**
- [ ] **12 weeks (84 days) fully paid** (increased from 10 weeks)
- [ ] Can start up to 4 weeks before delivery
- [ ] **Mandatory: 6 weeks AFTER delivery** (employee cannot work)

**Payment:**
- [ ] **<1 year service: 50% of salary**
- [ ] **≥3 years service: 100% of salary**
- [ ] Auto-calculate based on tenure

**Extensions:**
- [ ] Additional 2 months unpaid (optional)
- [ ] **Sick child/special needs:** Additional 1 month paid + 1 month unpaid
- [ ] System: Track maternity status and extensions

**Nursing Breaks:**
- [ ] Daily nursing breaks during working hours
- [ ] Duration: Per company policy (commonly 1-2 hours)

### ✅ Paternity Leave

- [ ] **3 days paid leave** following childbirth
- [ ] Auto-approve upon birth certificate submission

### ✅ Hajj Leave (Article 114)

**Eligibility:**
- [ ] **Minimum: 2 consecutive years of service**
- [ ] **Once per employment with same employer**
- [ ] System validation: Block second Hajj leave request

**Duration:**
- [ ] **10-15 days** (includes Eid Al-Adha holiday)
- [ ] Configurable per company (10-15 range)

**System Requirements:**
- [ ] Track Hajj leave usage (boolean flag)
- [ ] Validate 2-year tenure requirement
- [ ] Auto-include Eid Al-Adha in duration

### ✅ Marriage Leave

- [ ] **5 days paid leave**
- [ ] Typically once per employment
- [ ] Require marriage certificate

### ✅ Bereavement Leave

**Death of First-Degree Relative:**
- [ ] **5 days paid leave**
- [ ] First-degree: Parent, spouse, child, sibling

### ✅ Iddah Leave (Widow's Leave)

**Muslim Widow:**
- [ ] **130 days (4 months 10 days) fully paid**
- [ ] Auto-calculate from death date

**Non-Muslim Widow:**
- [ ] **15 days fully paid**

**System Requirements:**
- [ ] Capture religion in employee profile
- [ ] Auto-calculate duration based on religion
- [ ] Full pay guarantee

### ✅ Examination Leave

**Eligibility:**
- [ ] Students at official educational institutions
- [ ] **Maximum: 10 days per year**
- [ ] Paid leave

**System Requirements:**
- [ ] Track exam leave balance (10 days/year)
- [ ] Require exam schedule/enrollment proof

### ✅ Compensatory Leave

**Purpose:**
- [ ] Unpaid leave after exhausting all leave types
- [ ] Public holiday work (can opt for time-off instead of pay)

---

## 4. End of Service Benefits (EOSB)

### ✅ EOSB Calculation Base (Article 84)

**Actual Wage Includes:**
- [ ] Basic salary
- [ ] All due increments
- [ ] **All fixed allowances** (housing, transport if fixed)
- [ ] Exclude: Variable bonuses, commissions, one-time payments

**System Requirement:**
- [ ] Mark allowances as `includedInEOSB: true/false`
- [ ] Auto-calculate EOSB base from salary components

### ✅ Accrual Rates (Article 84)

**Standard Calculation:**
- [ ] **First 5 years: Half-month wage per year** (0.5 × monthly wage × years)
- [ ] **After 5 years: Full month wage per year** (1 × monthly wage × years)
- [ ] Pro-rata for partial years

**Formula:**
```
If years ≤ 5:
  EOSB = (Last Monthly Wage × 0.5) × Years of Service

If years > 5:
  First 5 years = (Last Monthly Wage × 0.5) × 5
  Remaining years = (Last Monthly Wage × 1.0) × (Years - 5)
  EOSB = First 5 + Remaining
```

### ✅ Termination by Employer (Full EOSB)

**Entitled to Full EOSB:**
- [ ] Normal termination with notice
- [ ] Mutual agreement
- [ ] Contract expiry (fixed-term)
- [ ] Force majeure (company closure)

**System:**
- [ ] Calculate full EOSB based on accrual formula
- [ ] Include all service years
- [ ] Use last wage for calculation

### ✅ Resignation by Employee (Article 85 - Reduced EOSB)

**Reduced Entitlement:**
- [ ] **<2 years service: No EOSB (0%)**
- [ ] **2-5 years: One-third (33.33%)**
- [ ] **5-10 years: Two-thirds (66.67%)**
- [ ] **>10 years: Full EOSB (100%)**

**System Logic:**
```javascript
if (years < 2) return 0;
if (years >= 2 && years < 5) return fullEOSB * 0.3333;
if (years >= 5 && years < 10) return fullEOSB * 0.6667;
if (years >= 10) return fullEOSB;
```

### ✅ Female Employee Special Provision (Article 87)

**Full EOSB on Resignation:**
- [ ] Within **6 months of marriage**
- [ ] Within **3 months of childbirth**

**System:**
- [ ] Track marriage date
- [ ] Track childbirth date
- [ ] Auto-grant full EOSB if resignation within timeframes
- [ ] Override Article 85 reduction

### ✅ Article 81 Termination (Employee Initiated - Full EOSB)

**Full EOSB if employee resigns due to employer breach:**
- [ ] Employer failed to fulfill contractual obligations
- [ ] Fraudulent practices by employer
- [ ] Violence/disrespect toward employee or family
- [ ] Assigned substantially different work without consent
- [ ] Intolerable work environment

**System:**
- [ ] Termination reason field: "Article 81 - Employer Breach"
- [ ] Grant full EOSB regardless of tenure
- [ ] No notice period required

### ✅ Article 80 Termination (No EOSB)

**No EOSB if terminated for serious misconduct:**
- [ ] Violence or assault
- [ ] Repeated failure to perform duties (with warnings)
- [ ] Dishonest behavior, fraud
- [ ] Intentional damage to employer property
- [ ] Forgery in employment documents
- [ ] Excessive absences: 30 days total OR 15 consecutive (with warning)

**System:**
- [ ] Termination reason: "Article 80 - Misconduct"
- [ ] EOSB = 0
- [ ] Warning tracking (required before termination)

### ✅ EOSB Forfeiture (Absence)

**Automatic forfeiture if:**
- [ ] Absent >30 days (intermittent) without legitimate reason
- [ ] Absent >15 consecutive days without legitimate reason
- [ ] Employer must issue written warning first

**System:**
- [ ] Track absences (consecutive and total)
- [ ] Alert at 10/25 days (intermittent) or 10/14 days (consecutive)
- [ ] Require warning issuance before forfeiture

### ✅ Official EOSB Calculator Integration

- [ ] MHRSD provides official calculator: https://www.hrsd.gov.sa/en/ministry-services/services/end-service-benefit-calculator
- [ ] System should match official calculation
- [ ] Provide employee-facing EOSB estimator

---

## 5. Termination Rules

### ✅ Notice Period Requirements

**Indefinite Contracts:**
- [ ] **60 days written notice** (employer to employee)
- [ ] **60 days written notice** (employee to employer if monthly pay)
- [ ] **30 days notice** (employee if not monthly pay)
- [ ] Notice can specify longer period if in contract

**Fixed-term Contracts:**
- [ ] Generally no notice required (contract expires naturally)
- [ ] Unless contract specifies otherwise

**System Requirements:**
- [ ] Track notice period start date
- [ ] Calculate notice end date
- [ ] Alert if notice not given
- [ ] Option: Pay compensation in lieu of notice

### ✅ Notice Period Deferral (Employer)

**Employer rights:**
- [ ] Can defer acceptance of resignation up to **60 days**
- [ ] Must provide written explanation
- [ ] If no response in **30 days**, resignation deemed accepted

**System:**
- [ ] Resignation status: "Pending Acceptance"
- [ ] Auto-accept after 30 days if no action
- [ ] Track deferral period (max 60 days)

### ✅ Resignation Withdrawal

**Employee rights:**
- [ ] Can withdraw resignation within **7 days** of submission
- [ ] Only if employer hasn't already accepted
- [ ] System: "Withdraw" button available for 7 days

### ✅ Article 80 Termination (No Notice, No Compensation)

**Valid grounds (with warnings where required):**
1. [ ] Violence/assault against employer or superiors
2. [ ] Failure to perform duties (after written warnings)
3. [ ] Non-compliance with safety instructions (after warning)
4. [ ] Misconduct, dishonest behavior
5. [ ] Intentional damage to property (report within 24 hours)
6. [ ] Forgery in employment documents
7. [ ] Excessive absence:
   - **30 days (intermittent) OR 15 consecutive days** (updated 2025)
   - Must issue written warning first
8. [ ] Disclosure of trade secrets
9. [ ] Found working for competitor during leave

**System Requirements:**
- [ ] Track warnings issued (date, type, reason)
- [ ] Validation: Require warning before Article 80 termination (where applicable)
- [ ] Absence tracking with auto-alerts
- [ ] 24-hour reporting requirement for property damage

### ✅ Article 81 Employee Rights (No Notice Required)

**Employee can resign immediately with full rights if:**
1. [ ] Employer failed to fulfill contractual obligations
2. [ ] Fraud by employer during hiring
3. [ ] Violence/disrespect toward employee or family
4. [ ] Assigned different work without consent
5. [ ] Intolerable work environment

**Entitlements:**
- [ ] No notice period required
- [ ] Full EOSB (overrides Article 85)
- [ ] All unpaid salaries and allowances
- [ ] Right to file complaints

**System:**
- [ ] Immediate resignation option with Article 81 selection
- [ ] Auto-grant full EOSB
- [ ] Generate complaint filing documentation

### ✅ Severance Pay (Beyond EOSB)

- [ ] EOSB is primary severance
- [ ] Notice compensation if notice not given
- [ ] Additional severance only if specified in contract
- [ ] System: Configurable severance policies

### ✅ Termination Process Requirements

**Employer-initiated:**
- [ ] Provide legitimate reason
- [ ] Issue written termination letter
- [ ] Serve 60-day notice (or pay in lieu)
- [ ] Calculate and pay EOSB
- [ ] Final settlement within reasonable time
- [ ] Update Qiwa platform immediately

**Employee-initiated:**
- [ ] Submit written resignation
- [ ] Serve notice period (or forfeit salary in lieu)
- [ ] Complete handover
- [ ] Receive final settlement
- [ ] Exit interview (optional)

### ✅ Final Settlement Components

**Must include:**
- [ ] Unpaid salary (to last working day)
- [ ] Unused annual leave encashment
- [ ] EOSB calculation
- [ ] Any pending allowances
- [ ] Less: Notice pay if not served
- [ ] Less: Any advances/loans outstanding
- [ ] Less: Damages (if applicable)

**System:**
- [ ] Full Relieving and Settlement (F&F) module
- [ ] Auto-calculate all components
- [ ] Generate final settlement statement
- [ ] Electronic signature and approval workflow

---

## 6. Saudization Requirements (Nitaqat)

### ✅ Nitaqat Color Classification

**System must track and display:**
- [ ] Current classification: Red / Low Green / Medium Green / High Green / Platinum
- [ ] Saudization percentage
- [ ] Target percentage for next tier
- [ ] Real-time calculation
- [ ] Review period: Every **26 weeks**

### ✅ Sector-Specific 2026 Minimums

**Healthcare:**
- [ ] Hospitals: **65%** Saudi employees
- [ ] Community pharmacies: **35%**
- [ ] Other pharmacy businesses: **55%**

**Professional Services:**
- [ ] Engineering (5+ engineers): **30%** (2026)
- [ ] Accounting (5+ accountants): **40%** (increases 10% annually until 2028)
- [ ] Dentistry (3+ dentists): **55%** (by Jan 27, 2026)

**Retail:**
- [ ] Large shopping centers: **50%** minimum (for Green/Platinum)

**Construction:**
- [ ] **10-30%** depending on company size and work type

**General Size-Based:**
- [ ] Small (1-5 employees): Minimum 1 Saudi
- [ ] Medium (6-100): Varies by sector
- [ ] Large (100+): Minimum **30%**

**System Requirements:**
- [ ] Industry/sector dropdown in company profile
- [ ] Auto-calculate required Saudi count
- [ ] Alert when below threshold
- [ ] Forecast impact of hiring decisions

### ✅ Saudization Calculation Rules

**Who counts as Saudi:**
- [ ] Saudi nationals
- [ ] **Foreign investors** (counted as Saudi for quotas - new rule)
- [ ] Disabled workers (may count as 2+ persons depending on disability)

**Salary Thresholds (Nitaqat Scoring):**
- [ ] Saudi earning **<SAR 4,000/month** = counts as **0.5 person**
- [ ] Saudi earning **≥SAR 4,000/month** = counts as **1 person**
- [ ] Validation: Warn if Saudi salary below 4,000 (reduces Nitaqat score)

**System:**
- [ ] Calculate weighted Saudi count
- [ ] Display "Effective Saudi Count" vs "Actual Saudi Count"
- [ ] Salary recommendation: Minimum SAR 4,000 for Saudis

### ✅ Qiwa Skill Level Classification

**Mandatory categories:**
- [ ] **High Skill** (engineers, doctors, specialists)
- [ ] **Skilled** (technicians, nurses, accountants)
- [ ] **Basic/Labour** (manual workers, cleaners, drivers)

**Impact:**
- [ ] Affects visa processing
- [ ] Affects Saudization scoring
- [ ] Affects MHRSD inspection ratings

**System:**
- [ ] Skill level field in employee profile
- [ ] Mandatory for all employees
- [ ] Sync with Qiwa

### ✅ Exemptions

**Special Economic Zones (SEZ):**
- [ ] Years 1-5: **No Saudization requirement**
- [ ] Years 6-10: **Minimum 15%**
- [ ] Field: "SEZ Company" checkbox + start date

### ✅ Penalties for Non-Compliance

**Immediate consequences:**
- [ ] Blockage on MHRSD services
- [ ] Cannot renew GM Iqama
- [ ] Cannot renew Commercial Registration (CR)
- [ ] Cannot issue Saudization Certificate
- [ ] Ineligible for government tenders

**System Alerts:**
- [ ] Real-time Nitaqat status dashboard
- [ ] Red classification warning (critical)
- [ ] Forecast: "If you hire X, classification will become Y"
- [ ] Expiry tracking: CR, Iqama renewals

### ✅ Compliance Tools

- [ ] Integration with Qiwa Nitaqat calculator API
- [ ] Real-time sync of employee data to Qiwa
- [ ] Automated classification monitoring
- [ ] Hiring recommendations for compliance
- [ ] Quarterly Nitaqat compliance reports

---

## 7. Mandatory Benefits

### ✅ Medical Insurance

**Requirement:**
- [ ] **Mandatory for all private sector employees**
- [ ] Must cover employee + dependents (per Cooperative Health Insurance Law)
- [ ] Enrollment in approved health insurance company
- [ ] Active coverage throughout employment
- [ ] **Linked to Iqama (residency permit)** - non-negotiable for legal employment

**System:**
- [ ] Insurance provider name
- [ ] Policy number
- [ ] Coverage start/end dates
- [ ] Dependent coverage tracking
- [ ] Alert 30 days before expiry
- [ ] Integration with insurance providers (optional)

### ✅ Housing Allowance

**Requirement:**
- [ ] Employer must provide housing OR housing allowance
- [ ] Must be specified in employment contract

**Standard Amount:**
- [ ] **Typical: 25% of basic salary**
- [ ] Configurable per company policy
- [ ] Common split: 50% Basic + 25% Housing + 25% Transport

**System:**
- [ ] Housing allowance field in salary structure
- [ ] Mark as `includedInEOSB: true` (if applicable)
- [ ] Auto-calculate at 25% (configurable default)

### ✅ Transportation Allowance

**Requirement:**
- [ ] Provide transportation OR transportation allowance
- [ ] Critical due to limited public transport

**Standard Amount:**
- [ ] **Typical: 10% of basic salary**
- [ ] OR company-provided transport
- [ ] Covers fuel, maintenance, or public transit

**System:**
- [ ] Transportation allowance field
- [ ] OR "Company Transport: Yes/No"
- [ ] Auto-calculate at 10% (configurable default)

### ✅ Food Allowance

**Requirement:**
- [ ] Provide meals OR food allowance
- [ ] Must be in employment contract

**System:**
- [ ] Food allowance field OR "Meals Provided: Yes/No"
- [ ] Configurable amount

### ✅ Air Passage (Expatriates)

**Requirement:**
- [ ] Annual round-trip ticket to home country
- [ ] For employee (+ dependents per contract)
- [ ] Timing: Per contract (commonly annual leave)

**System:**
- [ ] Nationality-based rule (non-Saudi only)
- [ ] Track air ticket entitlement
- [ ] Ticket allowance OR actual ticket
- [ ] Annual frequency

### ✅ Repatriation

**Requirement:**
- [ ] Employer covers repatriation costs on contract end
- [ ] Provision for repatriation of mortal remains (in case of death)
- [ ] Must be in employment contract

**System:**
- [ ] Contract clause tracking
- [ ] Final settlement includes repatriation ticket

### ✅ Visa and Residency Costs

**Employer pays:**
- [ ] Recruitment costs
- [ ] Medical examinations (pre-employment at approved centers)
- [ ] Residency fees (Iqama issuance)
- [ ] Iqama renewals
- [ ] Fines for any delays
- [ ] Exit and re-entry visa fees

**System:**
- [ ] Expense tracking for visa costs
- [ ] Iqama expiry tracking
- [ ] Auto-alert 60 days before Iqama expiry

### ✅ Social Insurance (GOSI)

**Already implemented in codebase:**
- [x] Saudi employees: 21.5% (9.75% employee + 11.75% employer)
- [x] Non-Saudi: 2% (employer only - hazards)
- [x] 2024 Reform: Graduated rates for new employees (9%-11% by 2028)
- [x] Contribution base: Basic + Housing (max SAR 45,000, min SAR 1,500)

**System ensures:**
- [x] GOSI calculation plugin active
- [x] Monthly GOSI report generation
- [x] Payment deadline: 15th of following month
- [x] 2% penalty for late payment

---

## 8. Wage Protection System (WPS)

### ✅ WPS File Generation

**Already implemented in codebase:**
- [x] WPS file format compliance (MHRSD specification)
- [x] SARIE bank ID mapping
- [x] IBAN validation (ISO 7064 Mod 97 checksum)
- [x] National ID validation (Luhn algorithm)
- [x] Salary components breakdown

**System Requirements:**
- [x] Generate WPS file (HDR, DTL, TRL records)
- [x] Validate employee data before submission
- [ ] **Upload to Mudad platform** (integration needed)
- [ ] Track WPS file submission status
- [ ] Parse WPS response file from bank

### ✅ WPS Compliance Deadlines

**CRITICAL: Two separate deadlines:**

**1. Salary Payment Deadline:**
- [ ] **By 10th of following month**
- [ ] Penalty: **SAR 3,000 per employee per month** if late
- [ ] 2+ consecutive months late: MHRSD services suspended

**2. WPS File Upload Deadline:**
- [ ] **Within 30 days of salary due date** (updated March 2025 - was 60 days)
- [ ] Example: Jan payroll (due Jan 31) → WPS upload by Mar 2
- [ ] Penalty: Warning first, then service suspension

**System:**
- [ ] Calculate both deadlines automatically
- [ ] Alert at 7 days, 3 days, 1 day before deadline
- [ ] Track payment status (paid/pending)
- [ ] Track WPS upload status (submitted/pending)
- [ ] Overdue dashboard with penalties calculation

### ✅ WPS Validation Requirements

**Employee Data Validation:**
- [x] Name max 50 characters
- [x] IBAN checksum validation (ISO 7064)
- [x] National ID Luhn validation
- [x] Iqama expiry validation
- [x] Duplicate ID detection (file will be rejected)
- [x] Duplicate IBAN warning
- [x] GOSI calculation verification
- [x] Minimum wage check (SAR 4,000 for Saudis)

**System ensures:**
- [ ] Pre-submission validation report
- [ ] Show errors (must fix) vs warnings
- [ ] Hash total calculation for bank verification
- [ ] File encoding validation (Windows-1256, UTF-8, or ASCII)

---

## 9. GOSI Compliance

### ✅ Contribution Rates (Already Implemented)

**Legacy Employees (before July 3, 2024):**
- [x] Saudi: 21.5% (9.75% employee + 11.75% employer)
- [x] Non-Saudi: 2% (employer only)

**2024 Reform (NEW employees after July 3, 2024):**
- [x] Graduated pension rates: 9% (2024) → 11% (2028)
- [x] Hazards (2%) and SANED (1.5%) unchanged

**System:**
- [x] Track employee start date
- [x] Apply correct rate based on start date
- [x] Auto-calculate graduated rates by year

### ✅ Contribution Base

**Includes:**
- [x] Basic salary
- [x] Housing allowance ONLY
- [x] Exclude: Transport, food, bonuses

**Limits:**
- [x] Maximum: SAR 45,000/month
- [x] Minimum: SAR 1,500/month (NOT SAR 400 - that's Nitaqat threshold)

**System:**
- [x] Mark allowances: `includedInGOSI: true/false`
- [x] Calculate capped salary
- [x] Flag employees above cap

### ✅ GOSI Payment Deadline

- [ ] **15th of following month**
- [ ] Penalty: **2% monthly** on overdue amount
- [ ] Repeated violations: Service suspension

**System:**
- [x] Monthly GOSI payment summary
- [x] Deadline tracker with alerts
- [x] Payment history

### ✅ GOSI Registration

- [ ] All employees must be registered on GOSI portal
- [ ] GOSI number required in employee profile
- [ ] Integration with GOSI API (optional)

---

## 10. Qiwa Platform Integration

### ✅ Mandatory Integrations

**Contract Management:**
- [ ] All new contracts → Qiwa (Oct 2025)
- [ ] Fixed-term contracts → Qiwa (Mar 2026)
- [ ] Open-ended contracts → Qiwa (Aug 2026)
- [ ] Real-time sync of contract status

**Employee Data Sync:**
- [ ] Employee profiles
- [ ] Skill level classification
- [ ] Salary changes
- [ ] Terminations/resignations
- [ ] Update within 24-48 hours of change

**Nitaqat Monitoring:**
- [ ] Real-time classification status
- [ ] Saudization percentage
- [ ] Compliance alerts

**WPS Submission:**
- [ ] Monthly payroll file upload to Mudad (via Qiwa)
- [ ] Track submission status
- [ ] Download response files

### ✅ Qiwa Services to Integrate

- [ ] Contract documentation (e-contracts)
- [ ] Iqama services
- [ ] Work permit services
- [ ] Visa services
- [ ] Wage protection (WPS)
- [ ] Nitaqat calculator
- [ ] Violation tracking
- [ ] Employee complaints

### ✅ API Integration

- [ ] Qiwa API authentication (OAuth)
- [ ] Webhook subscriptions for status updates
- [ ] Error handling and retry logic
- [ ] Audit log of all Qiwa transactions

---

## Implementation Priority Matrix

### 🔴 CRITICAL - Immediate (2026 Legal Deadline)

1. ✅ **Qiwa Contract Integration** (Mar-Aug 2026 deadlines)
2. ✅ **180-day Probation Period** (Feb 2025 amendment)
3. ✅ **WPS 30-day Upload Deadline** (Mar 2025 update)
4. ✅ **2026 Nitaqat Sector Minimums** (Various deadlines)
5. ✅ **GOSI 2024 Reform Rates** (Ongoing)

### 🟠 HIGH - Compliance Risk

6. ✅ Article 80/81 Termination Rules
7. ✅ EOSB Calculation (All scenarios)
8. ✅ 12-week Maternity Leave
9. ✅ Medical Insurance Tracking
10. ✅ Skill Level Classification (Qiwa)

### 🟡 MEDIUM - Operational Efficiency

11. ✅ Leave Management (All types)
12. ✅ Overtime Calculation with Limits
13. ✅ Ramadan Hours Auto-Adjustment
14. ✅ Final Settlement Automation
15. ✅ Nitaqat Forecasting

### 🟢 LOW - Nice to Have

16. ⬜ Insurance Provider Integration
17. ⬜ GOSI Portal Integration
18. ⬜ Qiwa Webhook Subscriptions
19. ⬜ Multi-language Support (AR/EN)
20. ⬜ Advanced Analytics Dashboard

---

## Current Codebase Status

### ✅ Already Implemented (Gold Standard)

Based on file analysis:

**GOSI Compliance:**
- ✅ `src/constants/gosi.constants.js` - Official rates, 2024 reform, calculation functions
- ✅ `src/plugins/gosiCalculation.plugin.js` - Mongoose plugin
- ✅ Contribution base calculation (Basic + Housing, capped at 45k)
- ✅ Saudi vs Non-Saudi rates
- ✅ Legacy vs Reform employee differentiation

**WPS Compliance:**
- ✅ `src/services/wps.service.js` - Full WPS file generation
- ✅ IBAN validation (ISO 7064 Mod 97 checksum)
- ✅ National ID validation (Luhn algorithm)
- ✅ Iqama expiry validation
- ✅ SARIE bank ID mapping
- ✅ Employee data validation
- ✅ Compliance deadlines calculation
- ✅ File encoding validation

**Employee Management:**
- ✅ `src/models/employee.model.js` - Comprehensive employee schema
- ✅ Employment types (indefinite, fixed_term, part_time, temporary)
- ✅ Probation period tracking (90 days - needs update to 180)
- ✅ Work schedule (48h/week, 8h/day)
- ✅ Allowances tracking (housing, transport, etc.)
- ✅ GOSI fields (registered, rates, calculations)
- ✅ Tenure calculation (yearsOfService virtual)
- ✅ Annual leave auto-upgrade (21→30 days at 5 years)

**Leave Management:**
- ✅ `src/models/leavePolicy.model.js` - Leave policy configuration
- ✅ Saudi Labor Law compliance flag
- ✅ Tenure-based allocation
- ✅ Carry forward and encashment
- ✅ Probation restrictions

**Payroll:**
- ✅ `src/controllers/payroll.controller.js` - Payroll processing
- ✅ `src/models/payrollRun.model.js` - Payroll run tracking
- ✅ Salary component breakdown

### ⚠️ Needs Implementation/Update

**High Priority:**
1. ⬜ Qiwa platform integration (API)
2. ⬜ Update probation period: 90 → 180 days
3. ⬜ WPS Mudad upload automation
4. ⬜ Article 80/81 termination workflow
5. ⬜ EOSB calculator (all scenarios)
6. ⬜ Maternity leave: 10 → 12 weeks
7. ⬜ Nitaqat real-time tracking
8. ⬜ Skill level classification field
9. ⬜ Notice period workflows (60-day tracking)
10. ⬜ Ramadan hours auto-adjustment

**Medium Priority:**
11. ⬜ Sick leave payment tiers (30 full, 60 half, 30 unpaid)
12. ⬜ Hajj leave (once per employment)
13. ⬜ Iddah leave (130 days for Muslim widows)
14. ⬜ Overtime limits validation (18h/week, 72h/year)
15. ⬜ Night shift differential tracking
16. ⬜ Final settlement (F&F) module
17. ⬜ Air passage tracking
18. ⬜ Visa/Iqama expiry alerts
19. ⬜ Compliance deadlines dashboard
20. ⬜ WPS response file parsing

---

## Testing & Validation Checklist

### ✅ Calculation Accuracy

- [ ] GOSI calculation matches official MHRSD calculator
- [ ] EOSB calculation matches official MHRSD calculator
- [ ] WPS file format accepted by test bank
- [ ] Overtime calculation matches labor law formula
- [ ] Leave accrual matches policy rules

### ✅ Validation Rules

- [ ] IBAN checksum validation (reject invalid IBANs)
- [ ] National ID Luhn validation (reject invalid IDs)
- [ ] Probation period not applicable if not in contract
- [ ] Cannot exceed maximum overtime limits
- [ ] Salary payment by 10th enforced
- [ ] WPS upload by 30 days enforced
- [ ] GOSI payment by 15th enforced

### ✅ Edge Cases

- [ ] EOSB for female employee resigning after marriage
- [ ] EOSB for Article 81 resignation (full despite <2 years)
- [ ] Article 80 termination during probation
- [ ] Ramadan working hours for non-Muslims
- [ ] Pro-rata annual leave for new joiners
- [ ] GOSI cap at SAR 45,000
- [ ] Nitaqat 0.5 count for Saudi earning <4,000
- [ ] Second probation for different role

### ✅ Compliance Reports

- [ ] Monthly GOSI summary (by 15th)
- [ ] Monthly WPS report (by 30 days)
- [ ] Salary payment status (by 10th)
- [ ] Nitaqat classification status
- [ ] Iqama expiry report (60-day advance)
- [ ] Contract expiry report (90-day advance)
- [ ] Annual leave balance report
- [ ] Sick leave usage report
- [ ] EOSB liability report
- [ ] Overtime hours report (weekly/annual limits)

---

## Legal References

### Primary Sources
- [Saudi Labour Law Updates 2025](https://tascoutsourcing.sa/en/insights/saudi-labour-law-updates-2025)
- [DLA Piper: Amendments to the KSA Labour Law](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/2024/Amendments-to-the-KSA-Labour-Law)
- [Ministry of Human Resources and Social Development (HRSD)](https://www.hrsd.gov.sa)
- [Qiwa Platform](https://www.qiwa.sa)

### Working Hours & Overtime
- [HRSD: Actually working hours](https://www.hrsd.gov.sa/en/knowledge-centre/articles/312)
- [ZenHR: Overtime Calculation Guide 2025](https://blog.zenhr.com/en/overtime-calculation-in-saudi-arabia-a-complete-guide-2025-update)
- [SmartHCM: Overtime Compliance 2026](https://smarthcm.cloud/overtime-compliance-in-saudi-arabia/)

### Leave Entitlements
- [Article 109 Saudi Labor Law](https://etqanlawfirm-sa.com/en/article-109-saudi-labor-law/)
- [HRSD: Regulations on Leaves (PDF)](https://www.hrsd.gov.sa/sites/default/files/2023-03/Regulations%20on%20Leaves.pdf)
- [Vacation Tracker: Saudi Arabia Leave Laws](https://vacationtracker.io/leave-laws/asia/saudi-arabia/)

### EOSB
- [PayrollME: EOSB Calculation](https://payrollmiddleeast.com/how-to-calculate-end-service-benefits-in-ksa/)
- [HRSD: End of Service Benefit Calculator](https://www.hrsd.gov.sa/en/ministry-services/services/end-service-benefit-calculator)

### Termination
- [Articles 80 and 81 Explained](https://ahysp.com/the-legal-framework-governing-termination-and-resignation-in-saudi-arabia/)
- [Etqan Law: Article 81](https://etqanlawfirm-sa.com/en/saudi-labor-law-article-81/)

### Nitaqat
- [Cercli: Nitaqat Requirements](https://www.cercli.com/resources/nitaqat)
- [Expandway: Saudization 2026 Rules](https://expandway.sa/saudi-saudization-2026-hiring-rules/)
- [AstroLabs: Saudization Requirements 2025](https://insight.astrolabs.com/saudization-requirements-2025-must-knows-for-companies-setting-up-a-business-in-saudi-arabia/)

### Employee Benefits
- [Playroll: Employee Benefits in Saudi Arabia](https://www.playroll.com/employee-benefits/saudi-arabia)
- [Asanify: Employee Benefits Guide 2026](https://asanify.com/blog/employer-of-record-saudi-arabia/employee-benefits-in-saudi-arabia-2026/)

---

## Conclusion

This checklist covers **ALL mandatory requirements** for a Saudi Arabia HR system to be fully compliant with the Labor Law as of 2026. The codebase already has excellent foundations in GOSI and WPS compliance (gold standard), but needs critical updates for:

1. **Qiwa integration** (legal deadline 2026)
2. **Probation period extension** (180 days)
3. **WPS 30-day deadline** (March 2025 update)
4. **Nitaqat real-time tracking**
5. **EOSB calculation for all scenarios**

Priority should be given to items marked 🔴 CRITICAL, as these have legal deadlines or penalties for non-compliance.

**Last Updated:** January 8, 2026
**Next Review:** Quarterly (April 2026)
