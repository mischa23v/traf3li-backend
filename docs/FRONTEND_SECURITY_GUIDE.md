# Frontend Security Implementation Guide

> **Target**: dashboard.traf3li.com
> **Hosting**: Cloudflare Pages / Render
> **Framework**: Vite + React/Vue SPA
> **Current Grade**: A- → **Target Grade**: A+

---

## Scope - What This Guide Covers

**This guide is for FRONTEND INFRASTRUCTURE/HOSTING security:**
- Cloudflare dashboard settings
- `_headers` file for hosting
- `security.txt` file creation
- Vite build configuration (SRI)
- Cloudflare Worker for CSP nonces

**For other security topics, see:**
| Topic | File |
|-------|------|
| Backend security headers (Express/Helmet) | `SECURITY_HEADERS.md` |
| API authentication & cookies | `FRONTEND_SECURITY_COMPLETE_GUIDE.md` |
| CSRF & session management | `FRONTEND_AUTH_COMPLETE_GUIDE.md` |
| Rate limiting | `RATE_LIMITING.md` |

---

## Table of Contents

1. [HSTS Configuration (Priority: HIGH)](#1-hsts-configuration)
2. [Security.txt (Priority: MEDIUM)](#2-securitytxt)
3. [Subresource Integrity - SRI (Priority: MEDIUM)](#3-subresource-integrity-sri)
4. [CSP Nonces via Cloudflare Worker (Priority: LOW)](#4-csp-nonces-optional)
5. [Remove CORS Wildcard (Priority: LOW)](#5-remove-cors-wildcard)
6. [Verification Commands](#6-verification)

---

## 1. HSTS Configuration

### What is HSTS?
HTTP Strict Transport Security forces browsers to only use HTTPS. Once set, browsers remember this for the specified duration and automatically upgrade HTTP to HTTPS.

### Current State (Problem)
```
Current:  max-age=2592000 (30 days)
Required: max-age=31536000 (1 year) + preload
```

### Why This Matters
- **30 days is too short**: If a user doesn't visit for 31 days, their browser "forgets" HTTPS-only
- **Without preload**: First visit is still vulnerable to MITM (man-in-the-middle)
- **With preload**: Browser ships with HTTPS requirement built-in (gold standard)

---

### Option A: Cloudflare Dashboard (Recommended)

1. **Login to Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com
   - Select your domain: `traf3li.com`

2. **Navigate to SSL/TLS Settings**
   ```
   SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)
   ```

3. **Configure HSTS**
   ```
   ┌─────────────────────────────────────────────────────────────┐
   │ Enable HSTS:                    ✅ ON                       │
   │ Max-Age:                        12 months (recommended)     │
   │ Include subdomains:             ✅ ON                       │
   │ Preload:                        ✅ ON                       │
   │ No-Sniff Header:                ✅ ON                       │
   └─────────────────────────────────────────────────────────────┘
   ```

4. **Click Save**

5. **Submit to HSTS Preload List** (After 1 week of testing)
   - Go to: https://hstspreload.org
   - Enter: `traf3li.com`
   - Follow submission process
   - Takes 1-4 months to propagate to browsers

---

### Option B: Cloudflare Pages `_headers` File

If using Cloudflare Pages, create a `_headers` file in your `public/` folder:

**File: `public/_headers`**
```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
```

---

### Option C: Render Dashboard

If hosting on Render:

1. Go to Render Dashboard → Your Service → Settings
2. Find "Headers" section
3. Add header rule:
   ```
   Path: /*
   Header: Strict-Transport-Security
   Value: max-age=31536000; includeSubDomains; preload
   ```

---

### Option D: Vite Plugin (Build-time Headers)

**File: `vite.config.js`**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-headers',
      writeBundle() {
        const fs = require('fs');
        const headers = `/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
`;
        fs.writeFileSync('dist/_headers', headers);
      }
    }
  ]
});
```

---

### Verification

```bash
# Check HSTS header
curl -sI https://dashboard.traf3li.com/ | grep -i strict-transport

# Expected output:
# strict-transport-security: max-age=31536000; includeSubDomains; preload
```

---

## 2. Security.txt

### What is security.txt?
A standard file (RFC 9116) that tells security researchers how to report vulnerabilities. Required by many compliance frameworks.

### Implementation

**Create file: `public/.well-known/security.txt`**
```
# Traf3li Security Policy
# https://securitytxt.org/

Contact: mailto:security@traf3li.com
Contact: https://traf3li.com/security
Expires: 2027-01-07T00:00:00.000Z
Encryption: https://traf3li.com/.well-known/pgp-key.txt
Preferred-Languages: en, ar
Canonical: https://dashboard.traf3li.com/.well-known/security.txt
Policy: https://traf3li.com/security-policy

# If you discover a vulnerability, please report it responsibly.
# We commit to:
# - Acknowledging receipt within 24 hours
# - Providing a fix timeline within 7 days
# - Not pursuing legal action for good-faith reports
```

### Optional: PGP Key for Encrypted Reports

**Create file: `public/.well-known/pgp-key.txt`**
```
-----BEGIN PGP PUBLIC KEY BLOCK-----
[Your PGP public key here - generate with GPG if needed]
-----END PGP PUBLIC KEY BLOCK-----
```

### Generate PGP Key (Optional)
```bash
# Generate a new key pair
gpg --gen-key

# Export public key
gpg --armor --export security@traf3li.com > public/.well-known/pgp-key.txt
```

### Verification

```bash
# Check security.txt exists
curl -s https://dashboard.traf3li.com/.well-known/security.txt

# Should return the contents of your security.txt file
```

---

## 3. Subresource Integrity (SRI)

### What is SRI?
SRI ensures that external scripts/stylesheets haven't been tampered with. If a CDN is compromised, the browser will refuse to load modified files.

### Current State (Problem)
```html
<!-- No integrity check - vulnerable to CDN compromise -->
<script src="https://cdn.jsdelivr.net/npm/some-library.js"></script>
```

### Target State
```html
<!-- With SRI - browser verifies hash before executing -->
<script
  src="https://cdn.jsdelivr.net/npm/some-library.js"
  integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxxx..."
  crossorigin="anonymous"
></script>
```

---

### Implementation for Vite

**File: `vite.config.js`**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import sri from 'rollup-plugin-sri';

export default defineConfig({
  plugins: [
    react(),
    sri({
      algorithms: ['sha384'],
      publicPath: '/',
    }),
  ],
  build: {
    rollupOptions: {
      plugins: [
        sri({
          algorithms: ['sha384'],
        }),
      ],
    },
  },
});
```

**Install the plugin:**
```bash
npm install rollup-plugin-sri --save-dev
# or
yarn add rollup-plugin-sri --dev
# or
pnpm add rollup-plugin-sri --save-dev
```

---

### Manual SRI for External CDN Scripts

If you have external scripts in `index.html`:

**Before:**
```html
<script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
```

**After (with SRI):**
```html
<script
  src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"
  integrity="sha384-GENERATED_HASH_HERE"
  crossorigin="anonymous"
></script>
```

**Generate SRI hash:**
```bash
# Method 1: Use srihash.org
# Go to https://www.srihash.org/ and paste the URL

# Method 2: Command line
curl -s https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js | \
  openssl dgst -sha384 -binary | \
  openssl base64 -A

# Method 3: Node.js script
node -e "
const crypto = require('crypto');
const https = require('https');
https.get('https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const hash = crypto.createHash('sha384').update(data).digest('base64');
    console.log('sha384-' + hash);
  });
});
"
```

---

### SRI for Google Fonts (Special Case)

Google Fonts can't use SRI because they serve different files based on User-Agent. Options:

**Option 1: Self-host fonts (Recommended)**
```bash
# Install google-fonts-helper
npm install -g google-fonts-helper

# Download fonts locally
google-fonts-helper download -f Inter -o public/fonts

# Then reference locally in CSS
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
}
```

**Option 2: Use Fontsource (npm packages)**
```bash
npm install @fontsource/inter

# In your main.js/App.js
import '@fontsource/inter';
```

---

### Verification

```bash
# After build, check if SRI is in HTML
cat dist/index.html | grep -o 'integrity="sha[^"]*"' | head -5

# Should output:
# integrity="sha384-..."
# integrity="sha384-..."
```

---

## 4. CSP Nonces (Optional)

### What are CSP Nonces?
Nonces (number-used-once) are random values that allow specific inline scripts while blocking XSS attacks. More secure than `unsafe-inline`.

### Current State
```
script-src 'self' 'unsafe-inline' ...
```

### Target State
```
script-src 'self' 'nonce-RANDOM123' 'strict-dynamic' ...
```

### Why It's Complex for SPAs
- Nonces must be **unique per request**
- Static SPAs have no server to generate nonces
- Requires Cloudflare Worker or edge function

---

### Implementation: Cloudflare Worker

**Step 1: Create Worker**

Go to Cloudflare Dashboard → Workers & Pages → Create Worker

**File: `csp-nonce-worker.js`**
```javascript
/**
 * Cloudflare Worker: CSP Nonce Injection
 *
 * This worker intercepts HTML responses and:
 * 1. Generates a cryptographically random nonce
 * 2. Adds nonce to all inline <script> tags
 * 3. Sets CSP header with the nonce
 */

async function handleRequest(request) {
  // Fetch the original response
  const response = await fetch(request);

  // Only process HTML responses
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // Generate cryptographically random nonce
  const nonce = generateNonce();

  // Get original HTML
  let html = await response.text();

  // Add nonce to inline scripts
  // Matches: <script> or <script type="...">
  html = html.replace(
    /<script(?=(\s|>))/gi,
    `<script nonce="${nonce}"`
  );

  // Build new CSP header with nonce
  const csp = buildCSP(nonce);

  // Create new response with modified headers
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Content-Security-Policy', csp);

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array));
}

function buildCSP(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com https://js.hcaptcha.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.traf3li.com wss://api.traf3li.com https://*.sentry.io https://cloudflareinsights.com https://www.google-analytics.com https://www.googletagmanager.com https://*.workers.dev https://challenges.cloudflare.com",
    "frame-src https://www.google.com https://js.hcaptcha.com https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join('; ');
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
```

**Step 2: Deploy Worker**
```bash
# Using Wrangler CLI
npm install -g wrangler
wrangler login
wrangler publish
```

**Step 3: Add Route**
In Cloudflare Dashboard:
```
Workers Routes → Add Route
Route: dashboard.traf3li.com/*
Worker: csp-nonce-worker
```

---

### Alternative: Keep unsafe-inline (Acceptable for SPAs)

For static SPAs, `unsafe-inline` with a strong CSP is acceptable:

**File: `public/_headers`**
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com https://js.hcaptcha.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://api.traf3li.com wss://api.traf3li.com https://*.sentry.io https://cloudflareinsights.com https://www.google-analytics.com https://www.googletagmanager.com https://*.workers.dev https://challenges.cloudflare.com; frame-src https://www.google.com https://js.hcaptcha.com https://challenges.cloudflare.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; upgrade-insecure-requests
```

**Why this is still secure:**
1. XSS requires injecting `<script>` tags
2. Your app is a compiled SPA - no server-side rendering injection point
3. `unsafe-inline` only allows inline scripts, not external injection
4. Combined with other CSP rules, attack surface is minimal

---

## 5. Remove CORS Wildcard

### Current State (Problem)
```
access-control-allow-origin: *
```

### Why It's Low Priority for Frontend
- Frontend serves static HTML/JS/CSS
- No sensitive data in responses
- The **API** CORS is what matters (and it's properly configured)

### Fix (Optional)

**File: `public/_headers`**
```
/*
  ! Access-Control-Allow-Origin
```

Or in Cloudflare Transform Rules:
```
Remove header: Access-Control-Allow-Origin
```

---

## 6. Verification

### Complete Security Check Script

**File: `scripts/security-check.sh`**
```bash
#!/bin/bash

DOMAIN="https://dashboard.traf3li.com"
PASS="✅"
FAIL="❌"

echo "🔒 Security Header Check for $DOMAIN"
echo "=========================================="

# Fetch headers once
HEADERS=$(curl -sI "$DOMAIN" 2>&1)

# HSTS
if echo "$HEADERS" | grep -qi "strict-transport-security.*max-age=31536000"; then
  if echo "$HEADERS" | grep -qi "preload"; then
    echo "$PASS HSTS: 1 year with preload"
  else
    echo "⚠️  HSTS: 1 year but missing preload"
  fi
else
  echo "$FAIL HSTS: Not set or too short"
fi

# X-Content-Type-Options
if echo "$HEADERS" | grep -qi "x-content-type-options.*nosniff"; then
  echo "$PASS X-Content-Type-Options: nosniff"
else
  echo "$FAIL X-Content-Type-Options: missing"
fi

# X-Frame-Options
if echo "$HEADERS" | grep -qi "x-frame-options.*deny"; then
  echo "$PASS X-Frame-Options: DENY"
else
  echo "$FAIL X-Frame-Options: missing or weak"
fi

# Referrer-Policy
if echo "$HEADERS" | grep -qi "referrer-policy"; then
  echo "$PASS Referrer-Policy: present"
else
  echo "$FAIL Referrer-Policy: missing"
fi

# CSP
if echo "$HEADERS" | grep -qi "content-security-policy"; then
  echo "$PASS CSP: present"
else
  echo "$FAIL CSP: missing"
fi

# Permissions-Policy
if echo "$HEADERS" | grep -qi "permissions-policy"; then
  echo "$PASS Permissions-Policy: present"
else
  echo "$FAIL Permissions-Policy: missing"
fi

# security.txt
SECURITY_TXT=$(curl -s "$DOMAIN/.well-known/security.txt" 2>&1)
if echo "$SECURITY_TXT" | grep -qi "contact:"; then
  echo "$PASS security.txt: present"
else
  echo "$FAIL security.txt: missing"
fi

echo ""
echo "=========================================="
echo "Run this after deployment to verify fixes"
```

**Make executable:**
```bash
chmod +x scripts/security-check.sh
./scripts/security-check.sh
```

---

## Backend Reference: How API Security Works

The backend (api.traf3li.com) has stricter security that you can reference:

### Backend CSP Nonce Generation

**File: `src/middlewares/nonce.middleware.js`**
```javascript
const crypto = require('crypto');

/**
 * Nonce Generation Middleware for CSP
 *
 * Generates a cryptographically secure nonce for Content Security Policy
 * This allows inline scripts to execute only when they have the correct nonce attribute
 *
 * Usage:
 * - Middleware generates a unique nonce per request
 * - Nonce is stored in res.locals.cspNonce
 * - Include nonce in CSP header: script-src 'nonce-{nonce}'
 * - Add nonce attribute to inline scripts: <script nonce="{nonce}">
 */
const generateNonce = (req, res, next) => {
    // Generate cryptographically secure random nonce (128 bits)
    // Base64 encoding for CSP compatibility
    const nonce = crypto.randomBytes(16).toString('base64');

    // Store nonce in response locals for use in templates/CSP header
    res.locals.cspNonce = nonce;

    // Optional: Add nonce to request object for logging/debugging
    req.cspNonce = nonce;

    next();
};

module.exports = { generateNonce };
```

### Backend Security Headers

**File: `src/middlewares/securityHeaders.middleware.js`**
```javascript
/**
 * Permissions Policy Middleware
 * Controls which browser features and APIs can be used
 */
const permissionsPolicy = (req, res, next) => {
    const policy = [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=(self)',
        'usb=()',
        'serial=()',
        'bluetooth=()',
        'ambient-light-sensor=()',
        'accelerometer=()',
        'gyroscope=()',
        'magnetometer=()',
        'screen-wake-lock=()',
        'interest-cohort=()',  // Opt-out of FLoC
        'fullscreen=(self)',
        'picture-in-picture=(self)',
        'autoplay=()',
        'encrypted-media=()',
        'sync-xhr=(self)',
        'document-domain=()',
        'speaker-selection=()'
    ];

    res.setHeader('Permissions-Policy', policy.join(', '));
    next();
};

/**
 * Cross-Origin Policies for API
 */
const crossOriginPolicies = (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    next();
};
```

### Backend Basic Security Headers

**File: `src/middlewares/security.middleware.js`**
```javascript
const securityHeaders = (req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('X-Powered-By');
    next();
};

const noCache = (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    next();
};
```

### Backend HSTS

**File: `src/middlewares/security.middleware.js`**
```javascript
res.setHeader(
  'Strict-Transport-Security',
  'max-age=31536000; includeSubDomains; preload'
);
```

### Backend Headers Set

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` |
| `Cross-Origin-Resource-Policy` | `cross-origin` |
| `Origin-Agent-Cluster` | `?1` |
| `X-DNS-Prefetch-Control` | `off` |
| `X-Download-Options` | `noopen` |
| `X-Permitted-Cross-Domain-Policies` | `none` |

---

## Summary Checklist

| Task | Priority | Effort | File to Modify |
|------|----------|--------|----------------|
| HSTS 1 year + preload | 🔴 HIGH | 5 min | Cloudflare Dashboard |
| security.txt | 🟡 MEDIUM | 5 min | `public/.well-known/security.txt` |
| SRI for external scripts | 🟡 MEDIUM | 30 min | `vite.config.js` + build |
| CSP Nonces (optional) | 🟢 LOW | 2 hrs | Cloudflare Worker |
| Remove CORS `*` | 🟢 LOW | 5 min | `public/_headers` |

---

## Questions?

If anything is unclear, refer to:
- [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)
- [HSTS Preload](https://hstspreload.org/)
- [SRI Hash Generator](https://www.srihash.org/)
