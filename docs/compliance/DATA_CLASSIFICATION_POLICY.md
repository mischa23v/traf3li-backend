# Data Classification Policy

**Document ID:** DCP-001
**Version:** 1.0
**Effective Date:** December 2024
**Review Date:** December 2025
**Classification:** Internal
**Compliance:** NCA ECC-2:2024, PDPL, CITC CRF

---

## 1. Purpose

This policy establishes data classification standards to ensure appropriate protection of information assets based on their sensitivity and criticality, in compliance with Saudi Arabia's Personal Data Protection Law (PDPL) and NCA requirements.

## 2. Data Classification Levels

### 2.1 Classification Hierarchy

| Level | Label | Description | Examples |
|-------|-------|-------------|----------|
| 4 | **Confidential** | Highest sensitivity, severe business impact if disclosed | Passwords, encryption keys, financial data, legal case details |
| 3 | **Restricted** | Sensitive business data, moderate impact | Client PII, contracts, invoices, internal reports |
| 2 | **Internal** | Internal use only, low impact | Employee info, policies, procedures |
| 1 | **Public** | No restrictions on disclosure | Marketing materials, public documentation |

### 2.2 Detailed Classification Guide

#### CONFIDENTIAL (Level 4)

**Definition:** Information that could cause severe damage to individuals or the organization if disclosed.

**Data Types:**
- Authentication credentials (passwords, tokens, API keys)
- Encryption keys and certificates
- Client legal case documents
- Financial records and banking information
- National ID numbers (Saudi ID, Iqama)
- Health information
- Trade secrets

**Handling Requirements:**
- AES-256-GCM encryption at rest
- TLS 1.2+ for transmission
- Access limited to specific roles
- No sharing via email
- Audit logging required
- MFA required for access
- 7-year retention minimum

#### RESTRICTED (Level 3)

**Definition:** Sensitive information requiring protection but with broader legitimate access needs.

**Data Types:**
- Client personal information (name, email, phone)
- Contract details and terms
- Invoice and payment records
- Internal communications about clients
- Employee performance data
- Business strategies

**Handling Requirements:**
- Encryption at rest recommended
- Secure transmission required
- Role-based access control
- Sharing with NDA only
- Audit logging required
- Standard retention policies

#### INTERNAL (Level 2)

**Definition:** Information intended for internal use that should not be shared externally.

**Data Types:**
- Internal policies and procedures
- Training materials
- Meeting notes
- Project documentation
- Non-sensitive business data

**Handling Requirements:**
- Standard access controls
- Secure internal systems
- No public sharing
- Standard retention

#### PUBLIC (Level 1)

**Definition:** Information approved for public release.

**Data Types:**
- Marketing materials
- Public website content
- Published documentation
- Press releases

**Handling Requirements:**
- No special restrictions
- Review before publication
- Standard retention

## 3. Data Handling Matrix

| Action | Confidential | Restricted | Internal | Public |
|--------|--------------|------------|----------|--------|
| Storage | Encrypted | Encrypted/Protected | Protected | Any |
| Transmission | TLS + Encrypted | TLS | TLS | Any |
| Access Control | MFA + Role-based | Role-based | Authenticated | None |
| Sharing | Prohibited | NDA Required | Internal Only | Open |
| Printing | Prohibited | Restricted | Allowed | Allowed |
| Mobile Access | Prohibited | Restricted | Allowed | Allowed |
| Cloud Storage | Approved only | Approved only | Allowed | Allowed |
| Disposal | Secure deletion | Secure deletion | Standard | Standard |

## 4. Data Inventory

### 4.1 System Data Classification

| Data Category | Classification | Storage | Encryption |
|--------------|----------------|---------|------------|
| User passwords | Confidential | MongoDB | Bcrypt hash |
| JWT secrets | Confidential | Environment | N/A |
| Encryption keys | Confidential | Environment | N/A |
| National ID | Confidential | MongoDB | AES-256-GCM |
| Bank account numbers | Confidential | MongoDB | AES-256-GCM |
| Client names | Restricted | MongoDB | Optional |
| Email addresses | Restricted | MongoDB | Searchable encryption |
| Phone numbers | Restricted | MongoDB | Optional |
| Case details | Confidential | MongoDB | AES-256-GCM |
| Invoice amounts | Restricted | MongoDB | Plain |
| Audit logs | Restricted | MongoDB | Plain |
| Session data | Internal | Redis | Plain |
| Cache data | Internal | Redis | Plain |

### 4.2 Database Field Classification

```javascript
// Mongoose encryption plugin configuration
const encryptedFields = {
  // Confidential fields - always encrypted
  'nationalId': { classification: 'confidential', encrypt: true },
  'bankAccountNumber': { classification: 'confidential', encrypt: true },
  'crNumber': { classification: 'confidential', encrypt: true },

  // Restricted fields - searchable encryption
  'email': { classification: 'restricted', searchable: true },
  'phone': { classification: 'restricted', searchable: true },

  // Internal fields - standard protection
  'notes': { classification: 'internal', encrypt: false }
};
```

## 5. Roles and Responsibilities

### 5.1 Data Owner
- Classify data under their responsibility
- Approve access requests
- Review classifications annually
- Report incidents involving their data

### 5.2 Data Custodian
- Implement technical controls
- Monitor access and usage
- Apply security patches
- Maintain encryption keys

### 5.3 Data User
- Handle data per classification
- Report suspected incidents
- Complete data handling training
- Follow access policies

## 6. PDPL Compliance

### 6.1 Personal Data Categories

| Category | PDPL Classification | Our Classification |
|----------|--------------------|--------------------|
| Sensitive Personal Data | Special protection | Confidential |
| Personal Data | Standard protection | Restricted |
| Non-Personal Data | No PDPL requirement | Internal/Public |

### 6.2 Data Subject Rights

- Right to access personal data
- Right to correction
- Right to deletion
- Right to data portability
- Right to object to processing

### 6.3 Cross-Border Transfer

- NDMO approval required for cross-border transfer
- Adequate protection measures must be in place
- Data localization for sensitive government data

## 7. Labeling Requirements

### 7.1 Electronic Documents

- Include classification in document header
- Use metadata tags where possible
- Apply visual markings (watermarks for confidential)

### 7.2 API Responses

```javascript
// Classification header in API responses
res.set('X-Data-Classification', 'restricted');
```

## 8. Data Retention

| Classification | Minimum Retention | Maximum Retention | Disposal Method |
|----------------|-------------------|-------------------|-----------------|
| Confidential | 7 years | 10 years | Secure deletion |
| Restricted | 5 years | 7 years | Secure deletion |
| Internal | 3 years | 5 years | Standard deletion |
| Public | 1 year | Indefinite | Standard deletion |

## 9. Incident Handling by Classification

| Classification | Detection | Response Time | Notification |
|----------------|-----------|---------------|--------------|
| Confidential | Immediate alert | 15 minutes | NCA, affected parties |
| Restricted | Priority alert | 1 hour | Management, affected parties |
| Internal | Standard alert | 4 hours | Management |
| Public | Log only | 24 hours | None |

## 10. Compliance Checklist

- [ ] All data assets inventoried
- [ ] Classification assigned to all assets
- [ ] Technical controls implemented per classification
- [ ] Staff trained on data handling
- [ ] Annual review completed
- [ ] PDPL compliance verified
- [ ] NCA ECC controls mapped

---

**Document Control:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2024 | Security Team | Initial release |
