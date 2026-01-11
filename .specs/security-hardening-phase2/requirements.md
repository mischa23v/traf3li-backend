# Security Hardening Phase 2 - Requirements

## Overview

This document defines requirements for fixing critical security vulnerabilities discovered during security audit comparing our system against Instagram data leaks, WSO2 CVEs (elm.sa), and MongoDB exploitation patterns.

**Vulnerabilities to Fix:**
1. **CVE-2025-0663 Pattern** - Single encryption key across all tenants (CRITICAL)
2. **NoSQL Injection** - 4 endpoints with unsanitized regex/input (CRITICAL)
3. **API Scraping** - Unpaginated list endpoints (HIGH)
4. **IDOR** - User profile viewable by any authenticated user (MEDIUM)

---

## 🧠 Reasoning (Thinking Out Loud)

### What I Searched
- Searched `src/utils/encryption.js` → Single global `ENCRYPTION_KEY` used for all tenants
- Searched `$regex` in controllers → Found 4 unsanitized regex patterns
- Searched unpaginated `.find()` → Found `contact.controller.js` lines 554, 580
- Searched `User.findById` without firmQuery → Found `user.controller.js` line 32

### Decisions Made

| Decision | Why | Alternatives Considered |
|----------|-----|------------------------|
| Use HKDF for per-tenant keys | Industry standard (AWS, Google), deterministic derivation | Per-tenant stored keys (rejected: key management overhead) |
| Derive from global key + firmId/lawyerId | No migration needed, backwards compatible | Store per-tenant keys in DB (rejected: chicken-egg problem) |
| Add escapeRegex to 4 endpoints | Consistent with existing pattern in codebase | Reject regex entirely (rejected: breaks search UX) |
| Add pagination with max 100 limit | Matches existing pattern in `contact.controller.js:129` | Cursor-based (rejected: overengineering) |
| Restrict user profile to same-tenant | Follows firmQuery pattern | Make fully public (rejected: PII exposure) |

### What Could Break

| File | Risk | Likelihood | Mitigation |
|------|------|------------|------------|
| `encryption.js` | Existing encrypted data | LOW | KDF produces same key for same tenant |
| `contact.controller.js` | Frontend expects all results | MEDIUM | Frontend must handle pagination |
| `user.controller.js` | Frontend fetches user profiles | LOW | Only affects cross-tenant fetches |

### Frontend Impact Assessment

| Change | Frontend Action Required |
|--------|-------------------------|
| Per-tenant encryption | **NONE** - transparent to API |
| Pagination on contacts | **YES** - Add page/limit params, handle pagination response |
| User profile restriction | **MINIMAL** - Only fails if fetching cross-tenant user |
| NoSQL injection fixes | **NONE** - transparent, regex still works |

---

## Gold Standard Compliance

### Applicable Patterns

| Category | Pattern | How It Applies |
|----------|---------|----------------|
| Security | Per-tenant encryption (CVE-2025-0663 fix) | Derive unique key per firmId/lawyerId |
| Security | Regex injection prevention | Use `escapeRegex()` on all user-provided regex input |
| Security | IDOR protection | Restrict user profile to same-tenant access |
| Security | API scraping prevention | Max pagination limits on all list endpoints |
| Reliability | Backwards compatibility | Existing data remains decryptable |
| Data Integrity | Key derivation deterministic | Same tenant always gets same derived key |

### Not Applicable

| Pattern | Why N/A |
|---------|---------|
| OAuth state | No OAuth changes |
| Calendar sync | No calendar changes |
| Queue logging | Already implemented |

---

## User Stories

### 1. Per-Tenant Encryption Key Derivation (CRITICAL)

As a **security engineer**, I want each tenant's data encrypted with a unique derived key so that a database leak only exposes one tenant's data.

**Current State (VULNERABLE):**
```javascript
// src/utils/encryption.js - GLOBAL KEY
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;  // Same for ALL tenants
  return Buffer.from(key, 'hex');
};
```

**Acceptance Criteria:**

1. WHEN encrypting data for a tenant THE SYSTEM SHALL derive a unique key using HKDF-SHA256
2. WHEN no tenantId is available (system-level) THE SYSTEM SHALL use the global key
3. WHEN decrypting existing data THE SYSTEM SHALL detect format and use appropriate key
4. WHEN firmId changes (user moves firms) THE SYSTEM SHALL re-encrypt data on next save
5. THE SYSTEM SHALL NOT break existing encrypted data (backwards compatible)

**Technical Specification:**

```javascript
const crypto = require('crypto');

/**
 * Derive per-tenant encryption key using HKDF
 * @param {string} tenantId - firmId or lawyerId (24-char hex ObjectId)
 * @returns {Buffer} - 32-byte derived key
 */
const deriveTenantKey = (tenantId) => {
    if (!tenantId) {
        // System-level encryption (no tenant context)
        return getGlobalEncryptionKey();
    }

    const masterKey = getGlobalEncryptionKey();
    const salt = Buffer.from('traf3li-tenant-key-v1', 'utf8');
    const info = Buffer.from(`tenant:${tenantId}`, 'utf8');

    // HKDF-SHA256: deterministic key derivation
    return crypto.hkdfSync('sha256', masterKey, salt, info, 32);
};

/**
 * Encrypt with per-tenant key
 * Format: v2:tenantId:iv:authTag:encrypted
 */
const encryptWithTenant = (plaintext, tenantId) => {
    const key = deriveTenantKey(tenantId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // v2 format includes tenantId for future key rotation
    return `v2:${tenantId || 'system'}:${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt with automatic format detection
 */
const decryptWithTenant = (ciphertext, tenantId) => {
    const parts = ciphertext.split(':');

    // v2 format: v2:tenantId:iv:authTag:encrypted
    if (parts[0] === 'v2') {
        const [, storedTenantId, ivHex, authTagHex, encrypted] = parts;
        const key = deriveTenantKey(storedTenantId === 'system' ? null : storedTenantId);
        // ... decrypt
    }

    // v1 format (legacy): iv:authTag:encrypted - use global key
    if (parts.length === 3) {
        const key = getGlobalEncryptionKey();
        // ... decrypt with legacy global key
    }
};
```

**Gold Standard Requirements:**
- THE SYSTEM SHALL use HKDF-SHA256 (RFC 5869) for key derivation
- THE SYSTEM SHALL use deterministic derivation (no random salt per encryption)
- THE SYSTEM SHALL include version prefix for future key rotation
- THE SYSTEM SHALL maintain backwards compatibility with v1 format

---

### 2. Fix NoSQL Injection Vulnerabilities (CRITICAL)

As a **security engineer**, I want all user input sanitized before use in MongoDB queries so that attackers cannot inject regex patterns or operators.

**Vulnerable Endpoints:**

| File | Line | Field | Current | Fix |
|------|------|-------|---------|-----|
| `trades.controller.js` | 347 | `symbol` | `{ $regex: symbol }` | `{ $regex: escapeRegex(symbol) }` |
| `employeeBenefit.controller.js` | 299 | `providerName` | `{ $regex: providerName }` | `{ $regex: escapeRegex(providerName) }` |
| `recruitment.controller.js` | 656 | `email` | Direct from body | Validate email format |
| `compensationReward.controller.js` | 1382 | `_id` | Not sanitized | `sanitizeObjectId(req.params.id)` |

**Acceptance Criteria:**

1. WHEN `symbol` query param contains regex metacharacters THE SYSTEM SHALL escape them
2. WHEN `providerName` query param contains regex metacharacters THE SYSTEM SHALL escape them
3. WHEN `email` in request body is not a valid email format THE SYSTEM SHALL return 400
4. WHEN `_id` param is not a valid ObjectId THE SYSTEM SHALL return 400
5. THE SYSTEM SHALL use existing `escapeRegex()` from `securityUtils.js`

**Gold Standard Requirements:**
- THE SYSTEM SHALL sanitize ALL user input before use in queries
- THE SYSTEM SHALL return 400 for invalid input (never 500)
- THE SYSTEM SHALL use consistent sanitization across all endpoints

---

### 3. Add Pagination to Unpaginated Endpoints (HIGH)

As a **security engineer**, I want all list endpoints paginated so that attackers cannot scrape entire datasets in single requests.

**Vulnerable Endpoints:**

| File | Line | Endpoint | Current |
|------|------|----------|---------|
| `contact.controller.js` | 554 | `GET /contacts/by-case/:caseId` | Returns ALL contacts |
| `contact.controller.js` | 580 | `GET /contacts/by-client/:clientId` | Returns ALL contacts |

**Acceptance Criteria:**

1. WHEN `page` param not provided THE SYSTEM SHALL default to page 1
2. WHEN `limit` param not provided THE SYSTEM SHALL default to limit 20
3. WHEN `limit` exceeds 100 THE SYSTEM SHALL cap at 100 (prevent scraping)
4. THE SYSTEM SHALL return `{ success, data, pagination: { page, limit, total, pages } }`
5. THE SYSTEM SHALL use same pattern as existing `getAllContacts` (line 129)

**Response Shape:**
```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 156,
        "pages": 8
    }
}
```

**Frontend Requirements:**
- Frontend MUST update to pass `page` and `limit` query params
- Frontend MUST handle paginated response and implement pagination UI
- Frontend SHOULD preload first page immediately, lazy-load subsequent pages

---

### 4. Restrict User Profile Access (MEDIUM)

As a **security engineer**, I want user profiles only accessible to same-tenant users so that attackers cannot enumerate all users.

**Current State (VULNERABLE):**
```javascript
// user.controller.js:32 - Any authenticated user can view ANY user profile
const user = await User.findById(sanitizedId).select('-password').lean();
```

**Acceptance Criteria:**

1. WHEN requesting own profile THE SYSTEM SHALL return full profile
2. WHEN requesting same-tenant user profile THE SYSTEM SHALL return limited public fields
3. WHEN requesting cross-tenant user profile THE SYSTEM SHALL return 404 (IDOR protection)
4. WHEN user is a public lawyer profile THE SYSTEM SHALL allow public access (existing behavior)

**Public Fields (same-tenant view):**
```javascript
const PUBLIC_FIELDS = [
    'firstName', 'lastName', 'email', 'profilePicture',
    'role', 'specialization', 'languages'
];
```

**Gold Standard Requirements:**
- THE SYSTEM SHALL use `...req.firmQuery` pattern for tenant check
- THE SYSTEM SHALL NOT reveal that user exists in different tenant (return 404, not 403)
- THE SYSTEM SHALL allow self-access regardless of firmQuery

---

## API Requirements

### Modified Endpoints

| Method | Endpoint | Change | Permission |
|--------|----------|--------|------------|
| GET | `/api/contacts/by-case/:caseId` | Add pagination (page, limit) | Authenticated |
| GET | `/api/contacts/by-client/:clientId` | Add pagination (page, limit) | Authenticated |
| GET | `/api/users/:id` | Restrict to same-tenant or self | Authenticated |
| GET | `/api/trades` | Fix symbol regex injection | Authenticated |
| GET | `/api/benefits` | Fix providerName regex injection | Authenticated |

### Request Parameters

**Pagination (contacts endpoints):**
| Param | Type | Default | Max | Description |
|-------|------|---------|-----|-------------|
| `page` | number | 1 | - | Page number |
| `limit` | number | 20 | 100 | Results per page |

### Response Shape

**Paginated Response:**
```json
{
    "success": true,
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 156,
        "pages": 8
    }
}
```

---

## Non-Functional Requirements

### Security (Gold Standard)

- WHEN encrypting tenant data THE SYSTEM SHALL use per-tenant derived key (HKDF-SHA256)
- WHEN user input contains regex metacharacters THE SYSTEM SHALL escape them
- WHEN accessing other tenant's user THE SYSTEM SHALL return 404 (not 403)
- WHEN list endpoint limit exceeds 100 THE SYSTEM SHALL cap at 100
- THE SYSTEM SHALL maintain backwards compatibility with existing encrypted data

### Performance

- WHEN deriving tenant key THE SYSTEM SHALL cache result (HKDF is CPU-intensive)
- THE SYSTEM SHALL respond within 500ms (p95) for all modified endpoints
- THE SYSTEM SHALL NOT add significant latency to encryption operations

### Data Integrity

- WHEN migrating encryption format THE SYSTEM SHALL preserve all existing data
- WHEN re-encrypting on save THE SYSTEM SHALL use new v2 format
- THE SYSTEM SHALL log encryption format migrations for audit

---

## Environment Variables

**Existing (no changes):**
```bash
ENCRYPTION_KEY=<64-char-hex>  # Master key for HKDF derivation
```

**No new environment variables needed** - per-tenant keys are derived from master key.

---

## Migration Strategy

### Per-Tenant Encryption

1. **No manual migration required** - HKDF derivation is deterministic
2. **Automatic upgrade on save** - When document is saved, re-encrypts with v2 format
3. **Backwards compatible read** - v1 format decrypts with global key

### Timeline

| Phase | Action | Risk |
|-------|--------|------|
| Deploy | New code with v2 format support | None - reads both formats |
| Gradual | Documents re-encrypt on save | None - transparent |
| Optional | Background job to re-encrypt all | Low - for cleanup |

---

## Out of Scope

- Key rotation (Phase 3)
- Hardware Security Module (HSM) integration (Phase 3)
- Per-field encryption (current: per-document)
- Real-time bot detection (requires ML/behavioral analysis)

---

## Open Questions

1. **Should we add rate limiting per-endpoint?** Currently using global smart rate limiter.
   - Recommendation: Yes, add 10/min limit for `by-case` and `by-client` endpoints

2. **Should existing v1 encrypted data be proactively migrated?**
   - Recommendation: Optional background job, not blocking deployment

3. **Should user profile restriction apply to admin users?**
   - Recommendation: No, admins can view all users within their firm

---

## Verification Plan

After implementation, verify:

- [ ] `node --check` passes on all modified files
- [ ] New encryption uses v2 format with tenantId
- [ ] Legacy v1 format still decrypts correctly
- [ ] `escapeRegex()` called on symbol, providerName params
- [ ] Email validation on recruitment endpoint
- [ ] ObjectId sanitization on compensationReward endpoint
- [ ] Pagination on contacts/by-case returns max 100
- [ ] Pagination on contacts/by-client returns max 100
- [ ] User profile returns 404 for cross-tenant access
- [ ] User profile returns full data for self
- [ ] **Run `/fix-isolation`** - no violations
- [ ] **Run `/security-audit`** - Gold Standard compliance

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/utils/encryption.js` | Add `deriveTenantKey()`, `encryptWithTenant()`, `decryptWithTenant()` |
| `src/controllers/trades.controller.js` | Line 347: Add `escapeRegex(symbol)` |
| `src/controllers/employeeBenefit.controller.js` | Line 299: Add `escapeRegex(providerName)` |
| `src/controllers/recruitment.controller.js` | Line 656: Add email validation |
| `src/controllers/compensationReward.controller.js` | Line 1382: Add `sanitizeObjectId()` |
| `src/controllers/contact.controller.js` | Lines 554, 580: Add pagination |
| `src/controllers/user.controller.js` | Lines 32-52: Add tenant restriction |

---

**Approve? (yes/no)**
