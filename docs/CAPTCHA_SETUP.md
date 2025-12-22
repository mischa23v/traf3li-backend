# CAPTCHA Verification Service

Comprehensive CAPTCHA verification service supporting multiple providers for enhanced security and flexibility.

## Supported Providers

1. **Google reCAPTCHA v2/v3**
   - v2: Checkbox challenge
   - v3: Invisible verification with risk scoring (0.0 to 1.0)
   - Best for: General purpose, high accuracy

2. **hCaptcha**
   - Privacy-focused alternative to reCAPTCHA
   - GDPR compliant
   - Best for: Privacy-conscious applications

3. **Cloudflare Turnstile**
   - Modern, user-friendly CAPTCHA
   - Minimal user interaction
   - Best for: Fast user experience, Cloudflare users

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Google reCAPTCHA
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here
RECAPTCHA_MIN_SCORE=0.5  # For reCAPTCHA v3 (0.0 to 1.0, default: 0.5)

# hCaptcha
HCAPTCHA_SECRET_KEY=your_hcaptcha_secret_key_here

# Cloudflare Turnstile
TURNSTILE_SECRET_KEY=your_turnstile_secret_key_here
```

**Note:** Only configure the providers you want to use. At least one provider must be configured for the service to work.

### Getting API Keys

#### Google reCAPTCHA
1. Visit [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Register a new site
3. Choose reCAPTCHA v2 or v3
4. Add your domains
5. Copy the Secret Key to `RECAPTCHA_SECRET_KEY`

#### hCaptcha
1. Visit [hCaptcha Dashboard](https://dashboard.hcaptcha.com/)
2. Register a new site
3. Add your domains
4. Copy the Secret Key to `HCAPTCHA_SECRET_KEY`

#### Cloudflare Turnstile
1. Visit [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to Turnstile
3. Create a new site
4. Add your domains
5. Copy the Secret Key to `TURNSTILE_SECRET_KEY`

## API Endpoints

### 1. Verify CAPTCHA Token

**POST** `/api/auth/verify-captcha`

Verifies a CAPTCHA token from the client.

#### Request Body
```json
{
  "provider": "recaptcha",
  "token": "03AGdBq24PBCbwiDRaS9cVUCvu9QgJdx..."
}
```

#### Parameters
- `provider` (string, required): Provider name (`recaptcha`, `hcaptcha`, or `turnstile`)
- `token` (string, required): CAPTCHA token from client

#### Success Response (200 OK)
```json
{
  "error": false,
  "message": "CAPTCHA verified successfully",
  "messageAr": "تم التحقق من CAPTCHA بنجاح",
  "verified": true,
  "provider": "recaptcha",
  "providerName": "Google reCAPTCHA",
  "score": 0.9,
  "action": "login",
  "hostname": "example.com",
  "challengeTimestamp": "2024-01-15T10:30:00Z"
}
```

#### Failure Response (400 Bad Request)
```json
{
  "error": true,
  "message": "CAPTCHA verification failed",
  "messageAr": "فشل التحقق من CAPTCHA",
  "verified": false,
  "provider": "recaptcha",
  "providerName": "Google reCAPTCHA",
  "errorCodes": ["invalid-input-response"],
  "code": "VERIFICATION_FAILED",
  "details": "The response parameter (token) is invalid or malformed"
}
```

#### Provider Not Configured (503 Service Unavailable)
```json
{
  "error": true,
  "message": "CAPTCHA provider \"recaptcha\" is not configured or enabled",
  "messageAr": "مزود CAPTCHA \"recaptcha\" غير مكوّن أو مفعّل",
  "code": "PROVIDER_NOT_CONFIGURED",
  "enabledProviders": ["hcaptcha", "turnstile"]
}
```

### 2. Get Enabled Providers

**GET** `/api/auth/captcha/providers`

Returns a list of configured and enabled CAPTCHA providers.

#### Success Response (200 OK)
```json
{
  "error": false,
  "message": "Found 2 enabled CAPTCHA provider(s)",
  "messageAr": "تم العثور على 2 مزود CAPTCHA مفعّل",
  "providers": [
    {
      "key": "recaptcha",
      "name": "Google reCAPTCHA",
      "hasMinScore": true
    },
    {
      "key": "hcaptcha",
      "name": "hCaptcha",
      "hasMinScore": false
    }
  ],
  "count": 2,
  "defaultProvider": "recaptcha",
  "allProviders": ["recaptcha", "hcaptcha", "turnstile"]
}
```

### 3. Get Provider Status

**GET** `/api/auth/captcha/status/:provider`

Returns the configuration and status of a specific CAPTCHA provider.

#### Parameters
- `provider` (path parameter): Provider key (`recaptcha`, `hcaptcha`, or `turnstile`)

#### Success Response (200 OK)
```json
{
  "error": false,
  "provider": "recaptcha",
  "enabled": true,
  "configured": true,
  "config": {
    "name": "Google reCAPTCHA",
    "verifyUrl": "https://www.google.com/recaptcha/api/siteverify",
    "minScore": 0.5
  }
}
```

## Frontend Integration Examples

### React/Next.js Example

#### 1. Install Client Library

```bash
# For Google reCAPTCHA
npm install react-google-recaptcha

# For hCaptcha
npm install @hcaptcha/react-hcaptcha

# For Cloudflare Turnstile
npm install @marsidev/react-turnstile
```

#### 2. React Component with reCAPTCHA v2

```jsx
import { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

function LoginForm() {
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!captchaToken) {
      alert('Please complete the CAPTCHA');
      return;
    }

    try {
      // Verify CAPTCHA
      const captchaResponse = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'recaptcha',
          token: captchaToken
        })
      });

      const captchaResult = await captchaResponse.json();

      if (!captchaResult.verified) {
        alert('CAPTCHA verification failed');
        return;
      }

      // Proceed with form submission
      // ... your login logic here

    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}

      <ReCAPTCHA
        sitekey="YOUR_RECAPTCHA_SITE_KEY"
        onChange={handleCaptchaChange}
      />

      <button type="submit">Login</button>
    </form>
  );
}
```

#### 3. React Component with reCAPTCHA v3 (Invisible)

```jsx
import { useEffect, useState } from 'react';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

function LoginFormInner() {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!executeRecaptcha) {
      console.log('Execute recaptcha not yet available');
      return;
    }

    try {
      // Execute reCAPTCHA
      const token = await executeRecaptcha('login');

      // Verify CAPTCHA
      const captchaResponse = await fetch('/api/auth/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'recaptcha',
          token: token
        })
      });

      const captchaResult = await captchaResponse.json();

      if (!captchaResult.verified) {
        alert(`CAPTCHA verification failed. Score: ${captchaResult.score}`);
        return;
      }

      console.log('CAPTCHA score:', captchaResult.score);

      // Proceed with form submission
      // ... your login logic here

    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}
      <button type="submit">Login</button>
    </form>
  );
}

function LoginForm() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey="YOUR_RECAPTCHA_V3_SITE_KEY">
      <LoginFormInner />
    </GoogleReCaptchaProvider>
  );
}
```

#### 4. hCaptcha Example

```jsx
import HCaptcha from '@hcaptcha/react-hcaptcha';

function LoginForm() {
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleVerify = (token) => {
    setCaptchaToken(token);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!captchaToken) {
      alert('Please complete the CAPTCHA');
      return;
    }

    const response = await fetch('/api/auth/verify-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'hcaptcha',
        token: captchaToken
      })
    });

    const result = await response.json();

    if (result.verified) {
      // Proceed with login
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}

      <HCaptcha
        sitekey="YOUR_HCAPTCHA_SITE_KEY"
        onVerify={handleVerify}
      />

      <button type="submit">Login</button>
    </form>
  );
}
```

#### 5. Cloudflare Turnstile Example

```jsx
import { Turnstile } from '@marsidev/react-turnstile';

function LoginForm() {
  const [captchaToken, setCaptchaToken] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!captchaToken) {
      alert('Please complete the CAPTCHA');
      return;
    }

    const response = await fetch('/api/auth/verify-captcha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'turnstile',
        token: captchaToken
      })
    });

    const result = await response.json();

    if (result.verified) {
      // Proceed with login
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form fields */}

      <Turnstile
        siteKey="YOUR_TURNSTILE_SITE_KEY"
        onSuccess={setCaptchaToken}
      />

      <button type="submit">Login</button>
    </form>
  );
}
```

## Service Usage in Backend

### Direct Service Call

```javascript
const captchaService = require('./services/captcha.service');

// Verify CAPTCHA
const result = await captchaService.verifyCaptcha(
  'recaptcha',
  token,
  clientIp
);

if (result.success) {
  console.log('CAPTCHA verified!');
  if (result.score) {
    console.log('Score:', result.score);
  }
} else {
  console.log('CAPTCHA failed:', result.errorCodes);
}
```

### Check Enabled Providers

```javascript
const enabled = captchaService.getEnabledProviders();
console.log('Enabled providers:', enabled);
// [{ key: 'recaptcha', name: 'Google reCAPTCHA', hasMinScore: true }]
```

### Check if Provider is Enabled

```javascript
if (captchaService.isProviderEnabled('recaptcha')) {
  // Use reCAPTCHA
}
```

### Fallback with Multiple Providers

```javascript
const result = await captchaService.verifyCaptchaWithFallback(
  token,
  ['recaptcha', 'hcaptcha', 'turnstile'],
  clientIp
);

if (result.success) {
  console.log('Verified with:', result.provider);
}
```

## Error Codes

### Common Error Codes

- `missing-input-secret`: The secret parameter is missing
- `invalid-input-secret`: The secret parameter is invalid or malformed
- `missing-input-response`: The response parameter (token) is missing
- `invalid-input-response`: The response parameter (token) is invalid or malformed
- `bad-request`: The request is invalid or malformed
- `timeout-or-duplicate`: The response is no longer valid (timeout or duplicate)
- `invalid-token`: The token is invalid or has expired
- `score-too-low`: The CAPTCHA score is below the required threshold (reCAPTCHA v3)
- `network-error`: Failed to connect to CAPTCHA provider
- `provider-error`: CAPTCHA provider returned an error
- `verification-error`: CAPTCHA verification failed

## Best Practices

### 1. Security

- **Always verify on the server**: Never trust client-side CAPTCHA verification
- **Use HTTPS**: All CAPTCHA requests should be over HTTPS
- **Rotate keys regularly**: Change your secret keys periodically
- **Monitor failed attempts**: Track and alert on unusual patterns

### 2. User Experience

- **Choose appropriate provider**: Consider your user base and privacy requirements
- **reCAPTCHA v3 for invisible**: Best UX, but requires score tuning
- **Fallback providers**: Configure multiple providers for redundancy
- **Clear error messages**: Help users understand why verification failed

### 3. Configuration

- **Set appropriate score threshold**: For reCAPTCHA v3, balance security vs. UX
  - `0.9-1.0`: Very likely legitimate
  - `0.5-0.9`: Likely legitimate
  - `0.0-0.5`: Likely bot
- **Environment-specific keys**: Use different keys for dev/staging/production
- **Monitor provider status**: Check enabled providers on startup

### 4. Rate Limiting

The CAPTCHA endpoints use rate limiting:
- `/verify-captcha`: Auth rate limiter (moderate limits)
- `/captcha/providers`: Public rate limiter (relaxed limits)
- `/captcha/status/:provider`: Public rate limiter (relaxed limits)

### 5. Integration Points

Consider adding CAPTCHA verification to:
- **Login forms**: Prevent brute force attacks
- **Registration forms**: Prevent bot accounts
- **Password reset**: Prevent enumeration attacks
- **Contact forms**: Prevent spam
- **API endpoints**: Protect sensitive operations
- **Comment/review forms**: Prevent spam

## Troubleshooting

### Provider Not Configured

**Error:** `CAPTCHA provider "recaptcha" is not configured or enabled`

**Solution:** Add the secret key to your `.env` file:
```bash
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

### Invalid Token

**Error:** `invalid-input-response`

**Possible causes:**
- Token has expired (typically 2 minutes)
- Token was already used (tokens are single-use)
- Token is from wrong site key
- Token is malformed

**Solution:** Generate a new token on the client

### Network Errors

**Error:** `Failed to connect to CAPTCHA provider`

**Possible causes:**
- Network connectivity issues
- Provider service outage
- Firewall blocking outbound requests

**Solution:**
- Check network connectivity
- Configure fallback providers
- Check provider status pages

### Low Score (reCAPTCHA v3)

**Error:** `score-too-low`

**Possible causes:**
- Legitimate user with low score
- Bot detection
- Threshold set too high

**Solution:**
- Adjust `RECAPTCHA_MIN_SCORE` in `.env`
- Consider secondary verification for borderline scores
- Use reCAPTCHA v2 as fallback for low scores

## Testing

### Unit Tests

```javascript
const captchaService = require('./services/captcha.service');

describe('CAPTCHA Service', () => {
  it('should verify valid reCAPTCHA token', async () => {
    const result = await captchaService.verifyCaptcha(
      'recaptcha',
      'test_token',
      '127.0.0.1'
    );

    expect(result.success).toBe(true);
  });

  it('should reject invalid token', async () => {
    const result = await captchaService.verifyCaptcha(
      'recaptcha',
      'invalid_token',
      '127.0.0.1'
    );

    expect(result.success).toBe(false);
    expect(result.errorCodes).toContain('invalid-input-response');
  });
});
```

### Manual Testing with cURL

```bash
# Verify CAPTCHA
curl -X POST http://localhost:8080/api/auth/verify-captcha \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "recaptcha",
    "token": "03AGdBq24..."
  }'

# Get enabled providers
curl http://localhost:8080/api/auth/captcha/providers

# Get provider status
curl http://localhost:8080/api/auth/captcha/status/recaptcha
```

## Performance Considerations

- **Timeout**: Verification requests timeout after 10 seconds
- **Caching**: Consider caching successful verifications temporarily
- **Rate limiting**: Built-in rate limiting prevents abuse
- **Parallel providers**: Fallback system tries providers sequentially

## Privacy & Compliance

### GDPR Compliance

- **reCAPTCHA**: Sends data to Google (consider privacy policy)
- **hCaptcha**: Privacy-focused, GDPR compliant
- **Turnstile**: Cloudflare's privacy-respecting option

### Data Handling

- Secret keys are stored in environment variables only
- Tokens are never logged or stored
- IP addresses are optionally sent to providers for verification
- No user data is retained by the service

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review provider documentation
3. Check application logs for detailed error messages
4. Contact your system administrator

## License

This CAPTCHA service is part of the Traf3li backend application.
