# 🚀 Render Deployment Guide - Traf3li Backend

## Quick Fix Applied ✅

**CRITICAL FIX:** Fixed `NODE_ENV` reference error that was causing server crashes.

Git commit: `b7908af`

---

## 🎯 Current Status

Based on your logs, here's what we know:

✅ **Working:**
- Build successful
- Dependencies installed (0 vulnerabilities)
- Server starts on port 5000
- Socket.io initialized
- MongoDB connection should work

❌ **Was Broken (NOW FIXED):**
- ~~Server crashed due to `NODE_ENV` reference error~~ → **FIXED**

---

## 📋 Render Configuration

### Environment Variables (Required)

Go to your Render Dashboard → Your Service → Environment:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/traf3li
JWT_SECRET=your-strong-random-secret-key
STRIPE_SECRET_KEY=sk_live_or_test_key
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Build Settings

- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`
- **Node Version:** 22.x (or leave default)

---

## 🔄 Deploy Latest Changes

### Method 1: Auto-Deploy (Recommended)

Render auto-deploys when you push to GitHub:

```bash
# Your changes are already pushed
# Render will automatically detect and deploy
```

Check your Render dashboard - it should show "Deploy in progress..."

### Method 2: Manual Deploy

1. Go to Render Dashboard
2. Select your service
3. Click "Manual Deploy" → "Deploy latest commit"

---

## 🧪 Testing After Deployment

### Step 1: Check Deployment Logs

In Render Dashboard → Logs, you should see:

```
✅ Task reminders cron job scheduled
🚀 Server running on port 10000
⚡ Socket.io ready
🌍 Environment: production
🔐 CORS enabled for:
   - https://traf3li.com
   - https://dashboard.traf3li.com
   - https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app
   - All *.vercel.app domains (preview deployments)
🍪 Cookie settings: httpOnly, sameSite=none, secure=true
```

### Step 2: Test Health Endpoint

```bash
curl https://your-render-url.onrender.com/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-23T...",
  "uptime": 123.456
}
```

### Step 3: Test CORS Headers

```bash
curl -H "Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -I \
     https://your-render-url.onrender.com/api/auth/me
```

**Look for these headers:**
```
Access-Control-Allow-Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
```

### Step 4: Test from Browser Console

Open your Vercel app and run:

```javascript
fetch('https://your-render-url.onrender.com/health', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('✅ Backend connected!', data))
  .catch(err => console.error('❌ Error:', err));
```

### Step 5: Test Login

Try logging in from your frontend. Check:
- [ ] Network tab shows successful API calls
- [ ] No CORS errors in console
- [ ] Cookie is set (DevTools → Application → Cookies)
- [ ] Subsequent authenticated requests work

---

## 🔍 Troubleshooting Common Issues

### Issue 1: 403 Forbidden Errors

**Symptom:** API returns 403 status

**Possible Causes:**

1. **MongoDB IP Whitelist**
   - Go to MongoDB Atlas → Network Access
   - Add Render's IP addresses or use `0.0.0.0/0` (allow all)

2. **Missing Environment Variables**
   - Check Render → Environment
   - Verify all required vars are set

3. **Middleware Error**
   - Check Render logs for actual error messages

**Fix:**
```bash
# Check logs for specific error
# Look for authentication or database errors
```

### Issue 2: Server Keeps Restarting

**Symptom:** Logs show repeated "Server running" messages

**Causes:**
- Database connection failure
- Missing environment variables
- Port already in use (shouldn't happen on Render)

**Fix:**
1. Check MongoDB connection string is correct
2. Verify all environment variables are set
3. Check for errors in logs before restart

### Issue 3: CORS Headers Still Missing

**Symptom:** Frontend shows CORS errors

**Causes:**
- Old code still deployed
- Environment variables not set

**Fix:**
1. Verify latest commit is deployed (check commit hash in logs)
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)

### Issue 4: MongoDB Connection Failed

**Symptom:** "MongoServerError" in logs

**Fix:**

1. **Check Connection String Format:**
   ```env
   # Correct format
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
   ```

2. **Whitelist Render IPs in MongoDB Atlas:**
   - Go to MongoDB Atlas → Network Access
   - Add IP: `0.0.0.0/0` (allow all) or Render's specific IPs

3. **Test Connection String:**
   ```bash
   # In Render Shell (Dashboard → Shell)
   node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message))"
   ```

---

## ⚙️ Render-Specific Configuration

### Free Tier Limitations

- Spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 750 hours/month free

### Keep Alive (Optional)

To prevent spin-down, use a cron job:

**UptimeRobot or similar:**
- Ping your health endpoint every 10 minutes
- URL: `https://your-app.onrender.com/health`

### Auto-Deploy Settings

In Render Dashboard → Settings:

- ✅ Auto-Deploy: Yes (deploys on git push)
- Branch: main
- Root Directory: (leave empty)

---

## 🔐 Environment Variables Checklist

Required for production:

- [ ] `NODE_ENV=production`
- [ ] `PORT=10000` (or leave empty, Render sets it)
- [ ] `MONGODB_URI=mongodb+srv://...`
- [ ] `JWT_SECRET=random-32-byte-string`
- [ ] `STRIPE_SECRET_KEY=sk_...`

Optional:

- [ ] `CLIENT_URL=https://traf3li.com`
- [ ] `DASHBOARD_URL=https://dashboard.traf3li.com`
- [ ] `TEST_MODE=false` (disable test payment endpoints)

---

## 📊 Monitoring

### Check Logs

**Real-time:**
```
Render Dashboard → Your Service → Logs
```

**Look for:**
- ✅ "Server running on port..."
- ✅ "CORS enabled for..."
- ✅ MongoDB connection success
- ❌ Any error messages
- ❌ Stack traces

### Common Log Patterns

**Success:**
```
🚀 Server running on port 10000
⚡ Socket.io ready
🌍 Environment: production
```

**MongoDB Connection Error:**
```
MongoServerError: bad auth
```

**Missing Environment Variable:**
```
JWT_SECRET is not defined
```

**Port Conflict (shouldn't happen):**
```
Error: listen EADDRINUSE :::10000
```

---

## 🚀 Quick Deploy Checklist

Before pushing changes:

1. **Test Locally:**
   ```bash
   npm install
   npm start
   # Server should start without errors
   ```

2. **Commit and Push:**
   ```bash
   git add .
   git commit -m "Your message"
   git push origin main
   ```

3. **Watch Deployment:**
   - Open Render Dashboard
   - Watch logs for "Deploy succeeded"
   - Check for error messages

4. **Test Endpoints:**
   - Health check
   - CORS headers
   - Login from frontend

5. **Verify:**
   - [ ] No errors in Render logs
   - [ ] Health endpoint returns 200
   - [ ] CORS headers present
   - [ ] Frontend can connect

---

## 🔗 Quick Links

- **Render Dashboard:** https://dashboard.render.com/
- **MongoDB Atlas:** https://cloud.mongodb.com/
- **GitHub Repo:** https://github.com/mischa23v/traf3li-backend
- **Vercel Frontend:** https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app

---

## 📝 Post-Deployment Steps

After successful deployment:

1. **Update Frontend API URL:**
   ```typescript
   // In your frontend .env or config
   VITE_API_URL=https://your-render-url.onrender.com/api
   ```

2. **Test All Features:**
   - [ ] Login/Logout
   - [ ] Protected routes
   - [ ] Data fetching
   - [ ] File uploads
   - [ ] WebSocket connection

3. **Monitor for 24 Hours:**
   - Check logs periodically
   - Watch for errors
   - Test from different devices

---

## 🆘 Still Having Issues?

### Quick Diagnostics

Run these commands and check output:

```bash
# 1. Test health endpoint
curl https://your-app.onrender.com/health

# 2. Test CORS
curl -I -H "Origin: https://traf3li-dashboard-9e4y2s2su-mischa-alrabehs-projects.vercel.app" \
  https://your-app.onrender.com/health

# 3. Test API endpoint
curl https://your-app.onrender.com/api/questions
```

### Get Help

1. Check Render logs for specific error messages
2. Review MongoDB Atlas network access
3. Verify all environment variables are set correctly
4. Test locally first to isolate if it's a deployment issue

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ Render logs show no errors
- ✅ Health endpoint returns 200 OK
- ✅ CORS headers are present in responses
- ✅ Frontend can make API calls
- ✅ Login works and sets cookies
- ✅ Protected routes work with authentication
- ✅ No 403 or 500 errors

---

**Last Updated:** November 23, 2024
**Git Commit:** b7908af - Fixed NODE_ENV crash
**Status:** Ready to Deploy

Your backend should now deploy successfully on Render! 🎉
