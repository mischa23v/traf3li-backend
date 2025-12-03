# CORS Configuration & Troubleshooting Guide

## Current Configuration Status

✅ **CORS is now configured to support:**
- Production domains (traf3li.com, dashboard.traf3li.com)
- Vercel deployment: `https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app`
- **All Vercel preview deployments** (*.vercel.app)
- Local development (localhost:5173, 5174, 3000, 8080)

✅ **Cookie configuration:**
- `httpOnly: true` - Prevents JavaScript access (XSS protection)
- `sameSite: 'none'` in production - Allows cross-origin requests
- `secure: true` in production - HTTPS only
- `credentials: true` - Allows cookies to be sent

---

## Quick Start Checklist

Before deploying, make sure:

- [ ] `NODE_ENV=production` is set in your environment
- [ ] Backend is running on HTTPS (required for `secure: true` cookies)
- [ ] JWT_SECRET is set in environment variables
- [ ] MongoDB connection string is configured
- [ ] Server is restarted after CORS changes

---

## Testing CORS Configuration

### 1. Test with cURL (Terminal)

```bash
# Test preflight request
curl -H "Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     --verbose \
     https://api.traf3li.com/api/auth/me
```

**Expected response headers:**
```
Access-Control-Allow-Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name
```

### 2. Test with Browser Console

Open your Vercel deployment and run in the console:

```javascript
// Test basic API call
fetch('https://api.traf3li.com/health', {
  method: 'GET',
  credentials: 'include',
})
  .then(res => res.json())
  .then(data => console.log('✅ CORS working!', data))
  .catch(err => console.error('❌ CORS failed:', err));

// Test authenticated endpoint
fetch('https://api.traf3li.com/api/auth/me', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then(res => res.json())
  .then(data => console.log('Auth check:', data))
  .catch(err => console.error('Auth failed:', err));
```

### 3. Check Network Tab

1. Open Chrome DevTools → Network tab
2. Make an API request from your app
3. Click on the request
4. Check the "Headers" section

**Look for these response headers:**
```
Access-Control-Allow-Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app
Access-Control-Allow-Credentials: true
```

**If you see these request headers, preflight is working:**
```
Access-Control-Request-Method: GET (or POST, etc.)
Access-Control-Request-Headers: content-type
```

---

## Common CORS Issues & Solutions

### Issue 1: "No 'Access-Control-Allow-Origin' header"

**Symptom:**
```
Access to fetch at 'https://api.traf3li.com/...' from origin 'https://...'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header
is present on the requested resource.
```

**Causes & Solutions:**

1. **Server not running**
   ```bash
   # Start the server
   npm start
   ```

2. **CORS middleware not applied**
   - Already fixed in `src/server.js`
   - CORS middleware is applied BEFORE routes

3. **Wrong environment**
   ```bash
   # Set NODE_ENV
   export NODE_ENV=production
   # or in .env file
   NODE_ENV=production
   ```

---

### Issue 2: Cookies Not Being Sent/Received

**Symptom:** Login appears successful but subsequent requests show as unauthenticated.

**Causes & Solutions:**

1. **Frontend missing `withCredentials: true`**
   - ✅ Already configured in frontend `api.ts`
   ```typescript
   withCredentials: true
   ```

2. **Backend not using HTTPS in production**
   - Cookies with `secure: true` ONLY work over HTTPS
   - Most hosting providers (Render, Railway, Heroku) provide automatic HTTPS

3. **SameSite setting incorrect**
   - ✅ Already configured:
   ```javascript
   sameSite: NODE_ENV === 'production' ? 'none' : 'strict'
   ```

4. **Cookie domain mismatch**
   - Current config uses no explicit domain (works for all)
   - Optional: Set `.traf3li.com` to share across subdomains

---

### Issue 3: OPTIONS Request Failing

**Symptom:** Browser sends OPTIONS request which returns 404 or 500.

**Solution:**
- ✅ Already handled with explicit OPTIONS handler:
```javascript
app.options('*', cors(corsOptions));
```

---

### Issue 4: Different Origin Each Deployment

**Symptom:** Each Vercel preview deployment has a different URL.

**Solution:**
- ✅ Already configured to allow ALL Vercel deployments:
```javascript
// Allow all Vercel preview deployments
if (origin.includes('.vercel.app')) {
    return callback(null, true);
}
```

---

### Issue 5: CORS Working in Development but Not Production

**Checklist:**

1. **Environment variable set?**
   ```bash
   echo $NODE_ENV
   # Should output: production
   ```

2. **HTTPS enabled?**
   ```bash
   # Your API must use HTTPS in production
   curl -I https://api.traf3li.com/health
   ```

3. **Correct production URL?**
   - Check `src/server.js` lines 56-75 for allowed origins
   - Your Vercel URL should be in the list

4. **Server restarted after changes?**
   ```bash
   # Restart the backend server
   pm2 restart all
   # or
   systemctl restart your-app
   ```

---

## Environment Variables Required

Create a `.env` file in your backend root:

```env
# Required
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb://...
JWT_SECRET=your_secret_key_here

# Optional - For additional CORS origins
CLIENT_URL=https://traf3li.com
DASHBOARD_URL=https://dashboard.traf3li.com

# Other
STRIPE_SECRET_KEY=sk_...
```

---

## Security Best Practices

### 1. Cookie Security

Current configuration is secure:

```javascript
{
  httpOnly: true,        // ✅ Prevents XSS attacks
  secure: true,          // ✅ HTTPS only in production
  sameSite: 'none',      // ✅ Required for cross-origin
  maxAge: 7 days,        // ✅ Reasonable expiration
  path: '/'              // ✅ Available to all routes
}
```

### 2. CORS Origin Validation

Current implementation:
- ✅ Uses function-based origin validation
- ✅ Logs blocked origins for monitoring
- ✅ Whitelist approach (secure)
- ✅ Allows specific patterns (*.vercel.app)

### 3. What NOT to Do

❌ **NEVER use wildcard with credentials:**
```javascript
// BAD - This will NOT work
origin: '*',
credentials: true
```

❌ **NEVER disable CORS completely:**
```javascript
// BAD - Major security risk
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});
```

❌ **NEVER commit secrets:**
```bash
# Add to .gitignore
.env
.env.production
.env.local
```

---

## Monitoring & Debugging

### Enable Debug Logging

Add to your backend:

```javascript
// In src/server.js, add after corsOptions
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} from ${req.headers.origin}`);
  next();
});
```

### Watch Server Logs

```bash
# If using PM2
pm2 logs

# If using systemd
journalctl -u your-app -f

# If running directly
npm start
```

**Look for:**
- ✅ `CORS enabled for:` on startup
- ✅ Incoming request origins
- 🚫 `CORS blocked origin:` messages (indicates blocked request)

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] HTTPS/SSL configured on backend
- [ ] Environment variables set (JWT_SECRET, MONGODB_URI, etc.)
- [ ] CORS configuration includes production frontend URL
- [ ] Cookie settings use `secure: true` and `sameSite: 'none'`
- [ ] Server restarted after configuration changes
- [ ] Test API calls from production frontend
- [ ] Check browser console for CORS errors
- [ ] Verify cookies are being set (DevTools → Application → Cookies)

---

## Adding New Frontend Origins

When you deploy to a new domain:

1. **Edit `src/server.js`:**
   ```javascript
   const allowedOrigins = [
       // ... existing origins ...
       'https://new-domain.com',  // Add here
   ];
   ```

2. **Or use environment variable:**
   ```env
   # In .env
   ADDITIONAL_ORIGIN=https://new-domain.com
   ```

   ```javascript
   // In server.js
   const allowedOrigins = [
       // ... existing origins ...
       process.env.ADDITIONAL_ORIGIN,
   ].filter(Boolean);
   ```

3. **Restart server:**
   ```bash
   npm restart
   # or
   pm2 restart all
   ```

---

## Testing Checklist

Use this checklist to verify CORS is working:

### Basic Tests
- [ ] Health check endpoint works: `GET /health`
- [ ] Public endpoint works: `GET /api/questions`
- [ ] Preflight request succeeds (OPTIONS)
- [ ] CORS headers present in response

### Authentication Tests
- [ ] Login endpoint works: `POST /api/auth/login`
- [ ] Cookie is set after login
- [ ] Protected endpoint works: `GET /api/auth/me`
- [ ] Cookie is sent with subsequent requests
- [ ] Logout clears cookie

### Cross-Origin Tests
- [ ] Requests work from Vercel deployment
- [ ] Requests work from localhost
- [ ] Requests work from production domain
- [ ] WebSocket connection works (if using)

---

## Quick Reference

### Frontend Configuration (Already Set)

```typescript
// src/api/client.ts
const apiClient = axios.create({
  baseURL: 'https://api.traf3li.com/api',
  withCredentials: true, // ✅ Required for cookies
});
```

### Backend Configuration (Already Set)

```javascript
// src/server.js
app.use(cors({
  origin: function (origin, callback) {
    // Dynamic origin validation
    if (!origin || origin.includes('.vercel.app') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  // ... other options
}));
```

---

## Support & Resources

- **CORS Documentation:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **Express CORS Package:** https://www.npmjs.com/package/cors
- **Vercel Domains:** https://vercel.com/docs/concepts/projects/domains

---

## Troubleshooting Command

Run this to test your CORS configuration:

```bash
#!/bin/bash
echo "Testing CORS configuration..."

BACKEND="https://api.traf3li.com"
FRONTEND="https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app"

echo "\n1. Testing preflight request..."
curl -H "Origin: $FRONTEND" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -I \
     "$BACKEND/api/auth/me"

echo "\n2. Testing actual request..."
curl -H "Origin: $FRONTEND" \
     -H "Content-Type: application/json" \
     -I \
     "$BACKEND/health"

echo "\nDone! Check for 'Access-Control-Allow-Origin' headers above."
```

Save as `test-cors.sh`, make executable with `chmod +x test-cors.sh`, and run with `./test-cors.sh`.

---

**Last Updated:** November 2024
**Status:** ✅ CORS Configured for Vercel Deployment

If you continue to experience CORS issues after following this guide, check the server logs for blocked origins and ensure the backend server has been restarted.
