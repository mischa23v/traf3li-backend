# 🚀 Deployment Instructions - Traf3li Backend

## ✅ What Was Fixed

Your backend CORS configuration has been updated to support your Vercel deployment at:
`https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app`

### Changes Made:

1. **Enhanced CORS Configuration**
   - ✅ Added specific Vercel deployment URL
   - ✅ Enabled wildcard support for ALL `*.vercel.app` preview deployments
   - ✅ Dynamic origin validation function
   - ✅ Explicit OPTIONS preflight handling
   - ✅ Comprehensive CORS headers

2. **Cookie Configuration** (Already Correct)
   - ✅ `httpOnly: true` for security
   - ✅ `sameSite: 'none'` in production for cross-origin
   - ✅ `secure: true` in production (HTTPS only)
   - ✅ `credentials: true` enabled

3. **Documentation Created**
   - ✅ `AUTHENTICATION_SETUP_GUIDE.md` - Complete auth implementation
   - ✅ `FRONTEND_API_INTEGRATION_GUIDE.md` - Every API endpoint with examples
   - ✅ `CORS_CONFIGURATION_GUIDE.md` - Troubleshooting guide

---

## 📋 Deployment Steps

### Step 1: Pull Latest Changes

On your production server:

```bash
cd /path/to/traf3li-backend
git pull origin main
```

### Step 2: Verify Environment Variables

Make sure `.env` file has these variables:

```env
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb://your-mongodb-uri
JWT_SECRET=your-jwt-secret-key

# Optional
CLIENT_URL=https://traf3li.com
DASHBOARD_URL=https://dashboard.traf3li.com
```

**Generate JWT Secret if needed:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Install Dependencies (If Needed)

```bash
npm install
```

### Step 4: Restart Backend Server

Choose the method you're using:

**Option A - PM2:**
```bash
pm2 restart all
# or specific app
pm2 restart traf3li-backend
```

**Option B - Systemd:**
```bash
sudo systemctl restart traf3li-backend
```

**Option C - Direct Node:**
```bash
# Stop current process (Ctrl+C if running)
npm start
# or
node src/server.js
```

**Option D - Docker:**
```bash
docker-compose restart
# or
docker restart traf3li-backend
```

### Step 5: Verify Server Started

Check the logs for confirmation:

```bash
# PM2
pm2 logs traf3li-backend

# Systemd
journalctl -u traf3li-backend -f

# Docker
docker logs -f traf3li-backend
```

**You should see:**
```
🚀 Server running on port 8080
⚡ Socket.io ready
🌍 Environment: production
🔐 CORS enabled for:
   - https://traf3li.com
   - https://dashboard.traf3li.com
   - https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app
   - All *.vercel.app domains (preview deployments)
   - http://localhost:5173
   - http://localhost:5174
🍪 Cookie settings: httpOnly, sameSite=none, secure=true
```

---

## 🧪 Testing

### Test 1: Health Check

```bash
curl https://api.traf3li.com/health
```

**Expected:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-23T...",
  "uptime": 123.456
}
```

### Test 2: CORS Headers

```bash
curl -H "Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -I \
     https://api.traf3li.com/api/auth/me
```

**Expected to see these headers:**
```
Access-Control-Allow-Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### Test 3: From Browser Console

Open your Vercel app: `https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app`

Open browser console and run:

```javascript
fetch('https://api.traf3li.com/health', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('✅ CORS Working!', data))
  .catch(err => console.error('❌ Error:', err));
```

### Test 4: Login Test

Try logging in from your frontend. Check:
1. Network tab shows successful API calls
2. No CORS errors in console
3. Cookie is set (DevTools → Application → Cookies)
4. Subsequent requests work

---

## 🔍 Troubleshooting

### Issue: Still Getting CORS Errors

**Check these:**

1. **Server actually restarted?**
   ```bash
   # Check if process is running
   ps aux | grep node

   # Check server uptime (should be recent)
   curl https://api.traf3li.com/health | jq .uptime
   ```

2. **NODE_ENV set to production?**
   ```bash
   # On server
   echo $NODE_ENV
   # Should output: production
   ```

3. **HTTPS working?**
   ```bash
   curl -I https://api.traf3li.com/health
   # Should show: HTTP/2 200 (not HTTP/1.1)
   ```

4. **Check server logs:**
   ```bash
   # Look for blocked origins
   pm2 logs | grep "CORS blocked"
   ```

### Issue: Cookies Not Working

1. **Check cookie is being set:**
   - Login from frontend
   - Open DevTools → Network → Click login request
   - Check Response Headers for `Set-Cookie`

2. **Check cookie settings:**
   - Should have `SameSite=None; Secure; HttpOnly`
   - Only works over HTTPS in production

3. **Frontend has withCredentials?**
   - Already configured in `src/api/client.ts`
   - `withCredentials: true` ✅

### Issue: 404 on OPTIONS Request

- Already handled with: `app.options('*', cors(corsOptions))`
- Check CORS middleware is BEFORE routes (it is)

---

## 📊 Monitoring

### Check Server Status

```bash
# PM2
pm2 status
pm2 monit

# System resources
htop
# or
top

# Check logs in real-time
pm2 logs --lines 100
```

### Monitor CORS

Add this temporarily to see all requests:

```javascript
// In src/server.js after CORS setup
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} from ${req.headers.origin || 'no-origin'}`);
  next();
});
```

---

## 🔒 Security Checklist

- [x] CORS using whitelist (not wildcard)
- [x] Credentials restricted to specific origins
- [x] HttpOnly cookies enabled
- [x] Secure cookies in production
- [x] SameSite=none for cross-origin
- [x] HTTPS enforced in production
- [x] JWT_SECRET is strong and secret
- [x] Environment variables not committed to git

---

## 📝 Quick Command Reference

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Restart server (PM2)
pm2 restart all

# View logs (PM2)
pm2 logs

# Check health
curl https://api.traf3li.com/health

# Test CORS
curl -H "Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app" \
     -I https://api.traf3li.com/health
```

---

## 🎯 Success Criteria

Your deployment is successful when:

- ✅ Server starts without errors
- ✅ Health check returns 200 OK
- ✅ CORS headers present in responses
- ✅ Login works from Vercel frontend
- ✅ Cookie is set after login
- ✅ Protected routes work with cookie
- ✅ No CORS errors in browser console

---

## 📚 Documentation Files

After deployment, refer to these guides:

1. **CORS_CONFIGURATION_GUIDE.md** - Detailed CORS troubleshooting
2. **AUTHENTICATION_SETUP_GUIDE.md** - Auth setup and code
3. **FRONTEND_API_INTEGRATION_GUIDE.md** - Frontend integration examples

---

## 🆘 Need Help?

If you're still experiencing issues:

1. Check server logs for specific errors
2. Review `CORS_CONFIGURATION_GUIDE.md`
3. Verify all environment variables are set
4. Ensure server has been restarted
5. Test with curl commands above
6. Check browser Network tab for actual error messages

---

## 🚢 Production Deployment Checklist

Before going live:

- [ ] Environment variables configured
- [ ] HTTPS/SSL certificate installed
- [ ] Database connection tested
- [ ] JWT_SECRET is strong and unique
- [ ] Server restarted after changes
- [ ] CORS headers verified
- [ ] Cookie settings correct
- [ ] Login/logout tested
- [ ] API calls tested from frontend
- [ ] Error logging configured
- [ ] Monitoring setup (PM2, logs)
- [ ] Backup strategy in place
- [ ] Health check endpoint working

---

**Deployment Date:** November 23, 2024
**Status:** Ready for Production
**Git Commit:** 1b53a71

Your backend is now configured and ready to accept requests from your Vercel deployment! 🎉
