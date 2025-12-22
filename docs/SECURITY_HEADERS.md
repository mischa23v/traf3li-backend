# Security Headers Documentation

This document explains the comprehensive security headers implementation in the Traf3li backend API.

## Table of Contents

- [Overview](#overview)
- [Content Security Policy (CSP)](#content-security-policy-csp)
- [Permissions Policy](#permissions-policy)
- [Cross-Origin Policies](#cross-origin-policies)
- [CORS Configuration](#cors-configuration)
- [Cache Control](#cache-control)
- [Other Security Headers](#other-security-headers)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Overview

The backend implements multiple layers of security headers following OWASP recommendations and modern security best practices. These headers protect against various attack vectors including XSS, clickjacking, CSRF, and data leakage.

### Security Architecture Layers

1. **Content Security Policy (CSP)** - Controls resource loading and script execution
2. **Permissions Policy** - Restricts browser feature access
3. **Cross-Origin Policies** - Isolates browsing contexts
4. **CORS** - Controls cross-origin requests
5. **Cache Control** - Prevents sensitive data caching
6. **Defense-in-depth Headers** - Multiple overlapping protections

## Content Security Policy (CSP)

### What is CSP?

Content Security Policy is a security layer that helps detect and mitigate certain types of attacks, including Cross-Site Scripting (XSS) and data injection attacks.

### Implementation Details

Location: `/src/server.js` (Helmet configuration)

```javascript
// CSP is implemented with nonce-based script execution
scriptSrc: [
    "'self'",
    "'nonce-{nonce}'",        // Nonce-based execution
    "'strict-dynamic'",       // Allow scripts loaded by trusted scripts
    // Trusted external scripts
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com"
]
```

### Key Features

#### 1. Nonce-Based Script Execution

**What it does:**
- Generates a unique nonce (number used once) for each request
- Only scripts with the correct nonce attribute can execute
- Eliminates need for `unsafe-inline` and `unsafe-eval`

**How it works:**
```javascript
// Middleware generates nonce
app.use(generateNonce);

// Nonce is available in res.locals.cspNonce
const nonce = res.locals.cspNonce;

// Include in script tags
<script nonce="${nonce}">
  // This script is allowed to execute
</script>
```

**Why it's configured this way:**
- Prevents XSS attacks from injecting and executing malicious scripts
- More secure than allowlisting domains
- Modern browsers fully support nonce-based CSP

#### 2. strict-dynamic Directive

**What it does:**
- Allows scripts loaded by nonce-trusted scripts to execute
- Simplifies CSP for modern JavaScript applications

**Example:**
```javascript
// Main script with nonce
<script nonce="abc123" src="app.js"></script>

// app.js can dynamically load scripts
const script = document.createElement('script');
script.src = 'module.js';
document.body.appendChild(script);  // ✅ Allowed with strict-dynamic
```

**Why it's configured this way:**
- Supports modern JavaScript bundlers and loaders
- Eliminates need to allowlist every third-party script
- Maintains security while allowing flexibility

#### 3. CSP Violation Reporting

**What it does:**
- Reports CSP violations to backend for monitoring
- Helps identify potential attacks or misconfigurations

**Configuration:**
```javascript
reportUri: ["/api/security/csp-report"]
```

**How to use:**
```bash
# View CSP violations (admin only)
GET /api/security/csp-violations

# Clear violation statistics
DELETE /api/security/csp-violations
```

**Why it's configured this way:**
- Provides visibility into security incidents
- Helps debug CSP configuration issues
- Aggregates common violations for analysis

### CSP Directives Explained

| Directive | Value | Purpose |
|-----------|-------|---------|
| `default-src` | `'self'` | Default policy: only load resources from same origin |
| `script-src` | `'self' 'nonce-{nonce}' 'strict-dynamic'` | Allow scripts from same origin or with valid nonce |
| `style-src` | `'self' 'nonce-{nonce}' 'unsafe-inline'` | Allow styles with nonce (unsafe-inline for fallback) |
| `img-src` | `'self' data: https: blob:` | Allow images from same origin, data URIs, HTTPS, and blobs |
| `connect-src` | `'self' wss: ws:` | Allow AJAX/WebSocket to same origin and WebSocket protocols |
| `font-src` | `'self' data:` | Allow fonts from same origin and data URIs |
| `object-src` | `'none'` | Block Flash, Java, and other plugins |
| `media-src` | `'self'` | Allow audio/video from same origin only |
| `frame-src` | `'none'` | Block iframes (prevents clickjacking) |
| `base-uri` | `'self'` | Restrict `<base>` tag to prevent base tag injection |
| `form-action` | `'self'` | Only allow form submissions to same origin |
| `frame-ancestors` | `'none'` | Prevent page from being embedded in iframe (X-Frame-Options equivalent) |
| `upgrade-insecure-requests` | (enabled in production) | Automatically upgrade HTTP to HTTPS |

### Testing CSP in Report-Only Mode

To test CSP without blocking resources, set environment variable:

```bash
CSP_REPORT_ONLY=true
```

This will report violations without enforcing the policy.

## Permissions Policy

### What is Permissions Policy?

Permissions Policy (formerly Feature Policy) allows you to control which browser features and APIs can be used in your application.

### Implementation Details

Location: `/src/middlewares/securityHeaders.middleware.js`

### Configured Policies

| Feature | Setting | Reason |
|---------|---------|--------|
| `camera` | disabled (`()`) | Not needed for web API |
| `microphone` | disabled (`()`) | Not needed for web API |
| `geolocation` | disabled (`()`) | Use server-side geolocation instead |
| `payment` | `self` only | Allow only for Stripe integration |
| `usb` | disabled (`()`) | Not needed |
| `serial` | disabled (`()`) | Not needed |
| `bluetooth` | disabled (`()`) | Not needed |
| `interest-cohort` | disabled (`()`) | Opt-out of Google FLoC (privacy) |
| `fullscreen` | `self` | Allow fullscreen from same origin |
| `autoplay` | disabled (`()`) | Prevent autoplay videos |

### Header Example

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()
```

### Why it's configured this way

1. **Privacy Protection**: Disables access to sensitive APIs (camera, microphone, geolocation)
2. **Attack Surface Reduction**: Fewer APIs = fewer potential vulnerabilities
3. **Performance**: Disabled features won't be loaded by the browser
4. **Compliance**: Helps meet privacy regulations (GDPR, PDPL)

## Cross-Origin Policies

### Three Related Headers

1. **Cross-Origin-Embedder-Policy (COEP)**
2. **Cross-Origin-Opener-Policy (COOP)**
3. **Cross-Origin-Resource-Policy (CORP)**

### Implementation Details

Location: `/src/middlewares/securityHeaders.middleware.js`

### Configuration

```javascript
// CORP: Allow cross-origin requests (API needs to serve multiple frontends)
res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

// COEP: Unsafe-none for API compatibility
res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

// COOP: Isolate browsing context, allow popups (for OAuth)
res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
```

### What Each Header Does

#### Cross-Origin-Resource-Policy (CORP)

**Purpose**: Controls whether a resource can be loaded cross-origin

**Values**:
- `same-origin` - Only same origin (most restrictive)
- `same-site` - Same site only
- `cross-origin` - Any origin (most permissive)

**Our configuration**: `cross-origin`

**Why**: API needs to serve multiple frontends (dashboard, marketplace, mobile)

#### Cross-Origin-Embedder-Policy (COEP)

**Purpose**: Prevents documents from loading cross-origin resources without explicit permission

**Values**:
- `unsafe-none` - No restrictions (default)
- `require-corp` - Require CORP header on all cross-origin resources

**Our configuration**: `unsafe-none`

**Why**: API serves various clients and third-party integrations

#### Cross-Origin-Opener-Policy (COOP)

**Purpose**: Isolates browsing context from cross-origin windows

**Values**:
- `unsafe-none` - No isolation
- `same-origin-allow-popups` - Isolate but allow popups
- `same-origin` - Full isolation

**Our configuration**: `same-origin-allow-popups`

**Why**: Allows OAuth popup flows while maintaining security

## CORS Configuration

### What is CORS?

Cross-Origin Resource Sharing (CORS) is a mechanism that allows restricted resources to be requested from another domain.

### Implementation Details

Location: `/src/server.js`

### Configuration

```javascript
const corsOptions = {
    origin: function (origin, callback) {
        // Strict validation in production
        // Allow preview deployments in dev/staging only
    },
    credentials: true,  // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [...],
    exposedHeaders: ['Set-Cookie', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    maxAge: 86400  // Cache preflight for 24 hours
}
```

### Allowed Origins

**Production**:
- `https://traf3li.com`
- `https://dashboard.traf3li.com`
- `https://www.traf3li.com`
- `https://www.dashboard.traf3li.com`
- Environment variables: `CLIENT_URL`, `DASHBOARD_URL`

**Development**:
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:3000`
- `http://localhost:8080`
- `*.pages.dev` (Cloudflare Pages - dev/staging only)
- `*.vercel.app` (Vercel - dev/staging only)

### Security Improvements

1. **Production Hardening**: Wildcard domains (`*.pages.dev`) disabled in production
2. **Logging**: All blocked origins are logged for security monitoring
3. **Vary Header**: Ensures proper cache behavior with CDNs
4. **Exposed Headers**: Rate limiting headers exposed for client-side handling

### Why it's configured this way

- **Security**: Prevents unauthorized domains from accessing API
- **Flexibility**: Allows preview deployments in development
- **Monitoring**: Logs help identify misconfigured clients or attacks
- **Performance**: 24-hour preflight caching reduces OPTIONS requests

## Cache Control

### Sensitive Endpoint Cache Control

**What it does**: Prevents caching of sensitive data (auth, payments, personal data)

**Implementation**: `/src/middlewares/securityHeaders.middleware.js`

```javascript
// Applied to sensitive routes
app.use('/api/auth', noCache, authRoute);
app.use('/api/payments', noCache, paymentRoute);
app.use('/api/hr', noCache, hrRoute);
```

**Headers set**:
```
Cache-Control: no-store, no-cache, must-revalidate, private, max-age=0
Pragma: no-cache
Expires: 0
Surrogate-Control: no-store
```

**Why it's configured this way**:
- Prevents sensitive data from being cached by browsers or CDNs
- Ensures users always get fresh data
- Meets compliance requirements (PCI-DSS, GDPR, PDPL)

### Static Asset Cache Control

**What it does**: Optimizes caching for static assets

**Headers by file type**:

| File Type | Cache Duration | Header |
|-----------|----------------|--------|
| Hashed assets (`.abc123.js`) | 1 year | `public, max-age=31536000, immutable` |
| Images | 30 days | `public, max-age=2592000` |
| CSS/JS (no hash) | 1 hour | `public, max-age=3600, must-revalidate` |
| Documents (PDF, DOC) | 1 day | `public, max-age=86400, must-revalidate` |

**Why it's configured this way**:
- Hashed assets never change → long cache
- Frequent updates (CSS/JS) → short cache
- Balance between performance and freshness

## Other Security Headers

### HTTP Strict Transport Security (HSTS)

**Header**: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

**What it does**:
- Forces browsers to use HTTPS
- Prevents SSL stripping attacks
- Includes all subdomains

**Configuration**:
```javascript
hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true, // Apply to all subdomains
    preload: true            // Submit to HSTS preload list
}
```

### X-Content-Type-Options

**Header**: `X-Content-Type-Options: nosniff`

**What it does**: Prevents MIME type sniffing

**Why**: Prevents browsers from executing files with incorrect Content-Type

### X-Frame-Options

**Header**: `X-Frame-Options: DENY`

**What it does**: Prevents page from being embedded in iframe

**Why**: Prevents clickjacking attacks

### Referrer-Policy

**Header**: `Referrer-Policy: strict-origin-when-cross-origin`

**What it does**:
- Same origin: Send full referrer
- Cross-origin HTTPS→HTTPS: Send origin only
- HTTPS→HTTP: Don't send referrer

**Why**: Balances analytics needs with privacy

### X-XSS-Protection

**Header**: `X-XSS-Protection: 1; mode=block`

**What it does**: Enables browser XSS filter (legacy)

**Why**: Defense-in-depth for older browsers

### Vary Header

**Header**: `Vary: Origin, Accept-Encoding`

**What it does**: Tells CDNs to cache different versions based on Origin

**Why**: Ensures CORS headers are cached correctly

## Testing

### Manual Testing

#### 1. Test CSP Headers

```bash
curl -I https://api.traf3li.com/health
```

Look for:
```
content-security-policy: default-src 'self'; script-src 'self' 'nonce-xxx' 'strict-dynamic'...
```

#### 2. Test Permissions Policy

```bash
curl -I https://api.traf3li.com/api/cases
```

Look for:
```
permissions-policy: camera=(), microphone=(), geolocation=()...
```

#### 3. Test CORS

```bash
curl -H "Origin: https://dashboard.traf3li.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://api.traf3li.com/api/cases
```

Should return:
```
Access-Control-Allow-Origin: https://dashboard.traf3li.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Credentials: true
```

#### 4. Test Cache Control (Sensitive Endpoints)

```bash
curl -I https://api.traf3li.com/api/auth/login
```

Should return:
```
Cache-Control: no-store, no-cache, must-revalidate, private
```

#### 5. View CSP Violations

```bash
# Login as admin and get token
TOKEN="your-admin-token"

# Get violations
curl -H "Authorization: Bearer $TOKEN" \
     https://api.traf3li.com/api/security/csp-violations
```

### Automated Testing

Use security scanning tools:

1. **Mozilla Observatory**
   - https://observatory.mozilla.org/
   - Scans security headers and provides grade

2. **Security Headers**
   - https://securityheaders.com/
   - Checks for missing or misconfigured headers

3. **CSP Evaluator**
   - https://csp-evaluator.withgoogle.com/
   - Validates CSP configuration

### Browser DevTools Testing

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for CSP violation warnings:
   ```
   Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'nonce-abc123'"
   ```

## Troubleshooting

### CSP Violations

**Problem**: Scripts not executing

**Solution**:
1. Check if script has nonce attribute
2. Check browser console for CSP violations
3. View violation reports: `GET /api/security/csp-violations`
4. Enable report-only mode: `CSP_REPORT_ONLY=true`

### CORS Errors

**Problem**: Frontend can't access API

**Solution**:
1. Check if origin is in `allowedOrigins` array
2. In production, ensure preview domains are explicitly added
3. Check server logs for blocked origins
4. Verify credentials are enabled on frontend

### Third-Party Scripts Blocked

**Problem**: Google Analytics or other scripts not loading

**Solution**:
1. Add domain to `scriptSrc` directive
2. Or add nonce to script tag: `<script nonce="${cspNonce}" src="...">`
3. Use CSP report-only mode to test

### Cache Issues

**Problem**: Stale data on sensitive endpoints

**Solution**:
1. Verify `noCache` middleware is applied
2. Check Cache-Control headers in response
3. Clear browser cache
4. Check if CDN is caching (shouldn't for `no-store`)

### Performance Issues

**Problem**: Too many CSP violation reports

**Solution**:
1. Fix legitimate violations first
2. Adjust CSP directives to allow needed resources
3. Consider using `report-sample` instead of `report-uri`
4. Implement rate limiting on CSP report endpoint

## Best Practices

1. **Start with Report-Only Mode**
   - Set `CSP_REPORT_ONLY=true`
   - Monitor violations for 1-2 weeks
   - Fix violations before enforcing

2. **Regular Security Audits**
   - Run Mozilla Observatory monthly
   - Review CSP violations weekly
   - Update headers as best practices evolve

3. **Document Exceptions**
   - If you must use `unsafe-inline`, document why
   - Track third-party script additions
   - Review allowlisted domains quarterly

4. **Monitor Violations**
   - Set up alerts for high-risk violations
   - Review aggregated violations monthly
   - Update CSP based on patterns

5. **Testing in Development**
   - Test with CSP enforced locally
   - Use browser DevTools Security tab
   - Test all OAuth flows

## References

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [OWASP: Secure Headers](https://owasp.org/www-project-secure-headers/)
- [Google: CSP Guide](https://web.dev/csp/)
- [Can I Use: CSP](https://caniuse.com/contentsecuritypolicy)
- [Helmet.js Documentation](https://helmetjs.github.io/)

## Support

For questions or issues:
1. Check this documentation
2. Review server logs: `/var/log/traf3li/`
3. Check CSP violations: `GET /api/security/csp-violations`
4. Contact security team: security@traf3li.com
