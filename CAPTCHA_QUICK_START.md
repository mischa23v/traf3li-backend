# CAPTCHA Service - Quick Start Guide

## What Was Created

### 1. Service Layer
**File:** `/home/user/traf3li-backend/src/services/captcha.service.js`

Core CAPTCHA verification logic supporting:
- Google reCAPTCHA v2/v3
- hCaptcha
- Cloudflare Turnstile

### 2. Controller Layer
**File:** `/home/user/traf3li-backend/src/controllers/captcha.controller.js`

HTTP request handlers for CAPTCHA endpoints with:
- Request validation
- Error handling
- Arabic/English response messages

### 3. Route Layer
**File:** `/home/user/traf3li-backend/src/routes/captcha.route.js`

RESTful API endpoints:
- `POST /api/auth/verify-captcha` - Verify CAPTCHA token
- `GET /api/auth/captcha/providers` - List enabled providers
- `GET /api/auth/captcha/status/:provider` - Check provider status

### 4. Documentation
**File:** `/home/user/traf3li-backend/docs/CAPTCHA_SETUP.md`

Comprehensive guide with:
- Configuration instructions
- API documentation
- Frontend integration examples
- Troubleshooting guide

### 5. Environment Template
**File:** `/home/user/traf3li-backend/.env.captcha.example`

Environment variable template for CAPTCHA configuration

## Quick Setup (5 minutes)

### Step 1: Get API Keys

Choose at least one provider and get your API keys:

**Google reCAPTCHA:** https://www.google.com/recaptcha/admin
**hCaptcha:** https://dashboard.hcaptcha.com/
**Cloudflare Turnstile:** https://dash.cloudflare.com/ (Turnstile section)

### Step 2: Configure Environment

Add to your `.env` file:

```bash
# Choose at least one provider
RECAPTCHA_SECRET_KEY=your_secret_key_here
RECAPTCHA_MIN_SCORE=0.5

# Optional: Additional providers for fallback
# HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key
# TURNSTILE_SECRET_KEY=your_turnstile_secret_key
```

### Step 3: Restart Server

```bash
npm run dev
# or
npm start
```

### Step 4: Test the API

```bash
# Check available providers
curl http://localhost:8080/api/auth/captcha/providers

# Verify a CAPTCHA token
curl -X POST http://localhost:8080/api/auth/verify-captcha \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "recaptcha",
    "token": "your_token_here"
  }'
```

## API Endpoints

### Verify CAPTCHA
```
POST /api/auth/verify-captcha
Content-Type: application/json

{
  "provider": "recaptcha",
  "token": "03AGdBq24..."
}
```

### Get Enabled Providers
```
GET /api/auth/captcha/providers
```

### Check Provider Status
```
GET /api/auth/captcha/status/recaptcha
```

## Frontend Integration

### Basic Example (any framework)

```javascript
// 1. Get CAPTCHA token from user interaction
const captchaToken = await getCaptchaToken(); // Your CAPTCHA widget

// 2. Verify with backend
const response = await fetch('/api/auth/verify-captcha', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'recaptcha',
    token: captchaToken
  })
});

const result = await response.json();

// 3. Check verification result
if (result.verified) {
  console.log('✓ CAPTCHA verified!');
  if (result.score) {
    console.log('Score:', result.score); // For reCAPTCHA v3
  }
  // Proceed with your form submission
} else {
  console.error('✗ CAPTCHA failed:', result.errorCodes);
  // Show error to user
}
```

### React Hook Example

```jsx
import { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

function useCapt() {
  const [token, setToken] = useState(null);
  const [verified, setVerified] = useState(false);

  const verifyCaptcha = async (token) => {
    const response = await fetch('/api/auth/verify-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'recaptcha',
        token
      })
    });

    const result = await response.json();
    setVerified(result.verified);
    return result;
  };

  return { token, setToken, verified, verifyCaptcha };
}

function MyForm() {
  const { setToken, verifyCaptcha } = useCaptcha();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = await verifyCaptcha(token);
    if (result.verified) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}

      <ReCAPTCHA
        sitekey="YOUR_SITE_KEY"
        onChange={setToken}
      />

      <button type="submit">Submit</button>
    </form>
  );
}
```

## Common Use Cases

### 1. Protect Login Forms

```javascript
// In your login controller
const captchaResult = await captchaService.verifyCaptcha(
  'recaptcha',
  req.body.captchaToken,
  req.ip
);

if (!captchaResult.success) {
  return res.status(400).json({
    error: 'CAPTCHA verification failed'
  });
}

// Proceed with login...
```

### 2. Protect Registration

```javascript
// In your registration controller
app.post('/api/auth/register', async (req, res) => {
  // Verify CAPTCHA first
  const captchaResult = await captchaService.verifyCaptcha(
    req.body.captchaProvider || 'recaptcha',
    req.body.captchaToken,
    req.ip
  );

  if (!captchaResult.success) {
    return res.status(400).json({
      error: 'Please complete CAPTCHA verification'
    });
  }

  // Proceed with registration...
});
```

### 3. Protect Contact Forms

```javascript
// In your contact form controller
app.post('/api/contact', async (req, res) => {
  // Verify CAPTCHA
  const captchaResult = await captchaService.verifyCaptcha(
    'hcaptcha',
    req.body.captchaToken,
    req.ip
  );

  if (!captchaResult.success) {
    return res.status(400).json({
      error: 'CAPTCHA verification required'
    });
  }

  // Send contact email...
});
```

## Error Handling

```javascript
try {
  const result = await captchaService.verifyCaptcha(
    provider,
    token,
    clientIp
  );

  if (result.success) {
    // CAPTCHA verified successfully
    console.log('✓ Verified');
  } else {
    // CAPTCHA verification failed
    console.error('✗ Failed:', result.errorCodes);

    // Common error codes:
    // - invalid-input-response: Token invalid/expired
    // - timeout-or-duplicate: Token already used
    // - score-too-low: reCAPTCHA v3 score below threshold
  }

} catch (error) {
  // Configuration or network error
  console.error('CAPTCHA service error:', error.message);
}
```

## Troubleshooting

### Issue: "Provider not configured"

**Solution:** Add the secret key to `.env`:
```bash
RECAPTCHA_SECRET_KEY=your_key_here
```

### Issue: "Invalid token"

**Common causes:**
- Token expired (typically 2 minutes)
- Token already used (single-use)
- Wrong site key used

**Solution:** Generate a new token

### Issue: Low score (reCAPTCHA v3)

**Solution:** Adjust threshold in `.env`:
```bash
RECAPTCHA_MIN_SCORE=0.3  # Lower threshold
```

## Provider Comparison

| Feature | reCAPTCHA v2 | reCAPTCHA v3 | hCaptcha | Turnstile |
|---------|-------------|-------------|----------|-----------|
| User interaction | Yes (checkbox) | No (invisible) | Yes (challenge) | Minimal |
| Score-based | No | Yes (0.0-1.0) | No | No |
| Privacy | Medium | Medium | High | High |
| GDPR compliant | With consent | With consent | Yes | Yes |
| Bot detection | Good | Excellent | Good | Good |
| User experience | Moderate | Excellent | Moderate | Excellent |

## Best Practices

1. **Use reCAPTCHA v3 for best UX** - Invisible, no user interaction
2. **Configure fallback providers** - Redundancy for high availability
3. **Monitor verification rates** - Detect attacks or misconfigurations
4. **Adjust score threshold** - Balance security vs user experience
5. **Rate limit endpoints** - Built-in, but monitor unusual patterns
6. **Log failed attempts** - Track suspicious activity

## Support

For detailed documentation, see:
- `/home/user/traf3li-backend/docs/CAPTCHA_SETUP.md`

For configuration examples, see:
- `/home/user/traf3li-backend/.env.captcha.example`

## File Locations

- Service: `/home/user/traf3li-backend/src/services/captcha.service.js`
- Controller: `/home/user/traf3li-backend/src/controllers/captcha.controller.js`
- Routes: `/home/user/traf3li-backend/src/routes/captcha.route.js`
- Docs: `/home/user/traf3li-backend/docs/CAPTCHA_SETUP.md`

## Next Steps

1. ✓ Files created and integrated
2. → Configure your `.env` with at least one provider's secret key
3. → Restart your server
4. → Test the API endpoints
5. → Integrate into your frontend forms
6. → Monitor and adjust score thresholds as needed

---

**Ready to use!** The CAPTCHA service is fully integrated and waiting for your API keys.
