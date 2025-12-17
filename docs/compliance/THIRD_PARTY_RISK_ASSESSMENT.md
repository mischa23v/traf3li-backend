# Third-Party Risk Assessment

**Document ID:** TPRA-001
**Version:** 1.0
**Assessment Date:** December 2024
**Next Review:** June 2025
**Classification:** Internal
**Compliance:** NCA ECC-2:2024 Section 4-1

---

## 1. Purpose

This document assesses the security posture of third-party service providers used by Traf3li, in compliance with NCA Essential Cybersecurity Controls requirements for third-party cybersecurity.

## 2. Third-Party Inventory

### 2.1 Critical Service Providers

| Vendor | Service | Data Handled | Criticality |
|--------|---------|--------------|-------------|
| MongoDB Atlas | Database | All application data | Critical |
| Upstash | Redis Cache | Session data, cache | High |
| AWS S3 | File Storage | Documents, attachments | High |
| Render | Application Hosting | Application runtime | Critical |
| Stripe | Payment Processing | Payment info | Critical |
| Resend | Email Service | Email addresses, content | Medium |
| Sentry | Error Tracking | Error logs, stack traces | Medium |
| Anthropic | AI Services | Conversation data | Medium |

### 2.2 Supporting Vendors

| Vendor | Service | Data Handled | Criticality |
|--------|---------|--------------|-------------|
| Cloudflare | CDN/DNS | Traffic metadata | Medium |
| GitHub | Source Control | Source code | High |
| npm | Package Registry | Dependencies | Medium |

## 3. Vendor Security Assessments

### 3.1 MongoDB Atlas

**Service:** Database as a Service (DBaaS)

| Category | Assessment | Status |
|----------|------------|--------|
| SOC 2 Type II | Certified | ✅ |
| ISO 27001 | Certified | ✅ |
| GDPR Compliance | Compliant | ✅ |
| Encryption at Rest | AES-256 | ✅ |
| Encryption in Transit | TLS 1.2+ | ✅ |
| Data Residency | ME-South-1 (Bahrain) | ✅ |
| Access Controls | RBAC, IP Whitelist | ✅ |
| Backup | Automated daily | ✅ |

**Risk Level:** LOW

**Recommendations:**
- Enable audit logging
- Review IP whitelist quarterly
- Enable advanced encryption (client-side)

---

### 3.2 Upstash (Redis)

**Service:** Serverless Redis

| Category | Assessment | Status |
|----------|------------|--------|
| SOC 2 Type II | Certified | ✅ |
| Encryption at Rest | AES-256 | ✅ |
| Encryption in Transit | TLS | ✅ |
| Data Residency | AWS eu-west-1 | ⚠️ |
| Access Controls | Token-based | ✅ |

**Risk Level:** MEDIUM

**Recommendations:**
- Request Middle East region when available
- Review data stored in Redis (ensure no PII)
- Implement connection encryption

**Mitigation:**
- Only store session IDs and cache data
- No sensitive PII in Redis
- Short TTL on all cached data

---

### 3.3 AWS S3

**Service:** Object Storage

| Category | Assessment | Status |
|----------|------------|--------|
| SOC 2 Type II | Certified | ✅ |
| ISO 27001 | Certified | ✅ |
| Encryption at Rest | AES-256 | ✅ |
| Encryption in Transit | TLS 1.2+ | ✅ |
| Data Residency | me-south-1 (Bahrain) | ✅ |
| Access Controls | IAM, Bucket Policies | ✅ |
| Versioning | Enabled | ✅ |

**Risk Level:** LOW

**Recommendations:**
- Enable access logging
- Review bucket policies quarterly
- Enable MFA delete for critical buckets

---

### 3.4 Render

**Service:** Application Hosting (PaaS)

| Category | Assessment | Status |
|----------|------------|--------|
| SOC 2 Type II | Certified | ✅ |
| Encryption in Transit | TLS 1.2+ | ✅ |
| DDoS Protection | Included | ✅ |
| Auto-scaling | Available | ✅ |
| Logging | Available | ✅ |

**Risk Level:** LOW

**Recommendations:**
- Enable private networking if available
- Review environment variables security
- Enable deploy notifications

---

### 3.5 Stripe

**Service:** Payment Processing

| Category | Assessment | Status |
|----------|------------|--------|
| PCI DSS Level 1 | Certified | ✅ |
| SOC 2 Type II | Certified | ✅ |
| ISO 27001 | Certified | ✅ |
| Encryption | End-to-end | ✅ |
| 3D Secure | Supported | ✅ |
| Fraud Detection | Built-in | ✅ |

**Risk Level:** LOW

**Recommendations:**
- Enable Radar for fraud detection
- Use Stripe.js (no card data on our servers)
- Review webhook signatures

**Data Handling:**
- No card numbers stored locally
- Only Stripe customer/payment IDs stored
- PCI compliance maintained by Stripe

---

### 3.6 Resend

**Service:** Transactional Email

| Category | Assessment | Status |
|----------|------------|--------|
| SOC 2 Type II | In Progress | ⚠️ |
| Encryption in Transit | TLS | ✅ |
| SPF/DKIM/DMARC | Supported | ✅ |
| Data Retention | 30 days | ✅ |

**Risk Level:** MEDIUM

**Recommendations:**
- Review email content for sensitive data
- Enable email encryption where possible
- Monitor delivery rates

---

### 3.7 Sentry

**Service:** Error Tracking

| Category | Assessment | Status |
|----------|------------|--------|
| SOC 2 Type II | Certified | ✅ |
| GDPR Compliance | Compliant | ✅ |
| Data Scrubbing | Configurable | ✅ |
| Data Retention | 90 days | ✅ |

**Risk Level:** LOW

**Recommendations:**
- Enable PII scrubbing
- Review captured data regularly
- Configure sensitive field filtering

**Current Configuration:**
```javascript
Sentry.init({
  beforeSend(event) {
    // Scrub sensitive data
    if (event.request?.cookies) {
      event.request.cookies = '[FILTERED]';
    }
    return event;
  }
});
```

---

### 3.8 Anthropic (Claude AI)

**Service:** AI/LLM Services

| Category | Assessment | Status |
|----------|------------|--------|
| SOC 2 Type II | Certified | ✅ |
| Data Retention | 0 days (API) | ✅ |
| Model Training | Not on API data | ✅ |
| Encryption | TLS | ✅ |

**Risk Level:** LOW

**Recommendations:**
- Do not send PII to AI
- Implement prompt sanitization
- Review usage policies

**Data Handling:**
- No client personal data sent to AI
- Only case summaries and generic queries
- Prompt templates sanitize input

---

## 4. Risk Summary Matrix

| Vendor | Risk Level | Data Sensitivity | Residency Compliant | Action Required |
|--------|------------|------------------|---------------------|-----------------|
| MongoDB Atlas | LOW | HIGH | ✅ | Monitor |
| Upstash | MEDIUM | LOW | ⚠️ | Review data stored |
| AWS S3 | LOW | HIGH | ✅ | Monitor |
| Render | LOW | MEDIUM | N/A | Monitor |
| Stripe | LOW | HIGH | ✅ | Monitor |
| Resend | MEDIUM | LOW | N/A | Review content |
| Sentry | LOW | LOW | N/A | Enable scrubbing |
| Anthropic | LOW | LOW | N/A | Monitor usage |

## 5. Contractual Requirements

### 5.1 Required Contract Clauses

All third-party agreements must include:

- [ ] Data protection obligations
- [ ] Security requirements
- [ ] Incident notification procedures
- [ ] Right to audit
- [ ] Termination and data return
- [ ] Subcontractor controls
- [ ] Compliance certifications

### 5.2 Contract Review Status

| Vendor | Contract Reviewed | DPA Signed | Security Addendum |
|--------|-------------------|------------|-------------------|
| MongoDB Atlas | ✅ | ✅ | ✅ |
| Upstash | ✅ | ✅ | N/A |
| AWS | ✅ | ✅ | ✅ |
| Render | ✅ | ✅ | N/A |
| Stripe | ✅ | ✅ | ✅ |
| Resend | ✅ | ⚠️ | N/A |
| Sentry | ✅ | ✅ | N/A |
| Anthropic | ✅ | ✅ | N/A |

## 6. Monitoring & Review

### 6.1 Continuous Monitoring

- Monthly: Service availability check
- Quarterly: Security certification review
- Bi-annually: Full risk assessment
- Annually: Contract review

### 6.2 Incident Reporting

All vendors must report:
- Security breaches within 24 hours
- Service outages within 1 hour
- Compliance changes within 30 days

## 7. Recommendations Summary

### Immediate Actions
1. ⚠️ Review data stored in Upstash Redis
2. ⚠️ Complete DPA with Resend
3. Enable PII scrubbing in Sentry

### Short-term (30 days)
4. Enable audit logging in MongoDB Atlas
5. Review AWS S3 bucket policies
6. Document AI data handling procedures

### Medium-term (90 days)
7. Conduct penetration test on integrations
8. Review all vendor contracts
9. Implement vendor performance monitoring

## 8. Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | _________________ | _________ | ________ |
| ISO | _________________ | _________ | ________ |

---

**Document Control:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 2024 | Security Team | Initial assessment |
