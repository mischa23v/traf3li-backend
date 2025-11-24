# Frontend: HttpOnly Cookie Authentication Setup

## 🎯 Overview
Configure the frontend to work with secure HttpOnly cookies for JWT authentication. The backend is already configured - we just need to update the frontend to accept and send cookies automatically.

---

## 🚨 CRITICAL: Why Current Frontend Fails

**Problem:** The frontend is NOT configured to send/receive cookies cross-origin.

**Symptoms:**
- Login appears successful, but no cookies are stored
- All dashboard API calls return 400 "Unauthorized access!"
- `document.cookie` is empty
- `localStorage.getItem('accessToken')` is null

**Root Cause:** Missing `withCredentials: true` in axios configuration.

---

## 📋 Required Changes

### Change 1: Update Axios Instance Configuration

**File:** `src/services/api.ts` (or wherever your axios instance is created)

**BEFORE (WRONG):**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.traf3li.com/api',
  // ❌ Missing withCredentials!
});

export default api;
```

**AFTER (CORRECT):**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.traf3li.com/api',
  withCredentials: true,  // ✅ CRITICAL: Enables cookies
});

export default api;
```

**Why:** Without `withCredentials: true`, the browser will:
- ❌ Ignore `Set-Cookie` headers from the backend
- ❌ Not send cookies with subsequent requests
- ❌ Block cookies due to CORS policy

---

### Change 2: Remove Authorization Header Logic

**File:** `src/services/api.ts`

Since we're using HttpOnly cookies, we **don't need** (and **shouldn't use**) Authorization headers.

**REMOVE THIS (if it exists):**
```typescript
// ❌ DELETE THIS - Not needed with cookies
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

**Why:**
- HttpOnly cookies are sent automatically by the browser
- Trying to set Authorization header manually will conflict with cookies
- Backend will use the cookie, not the header

---

### Change 3: Update Login Handler

**File:** `src/services/authService.ts` (or your auth service file)

**BEFORE (WRONG):**
```typescript
export const login = async (credentials: LoginCredentials) => {
  const response = await api.post('/auth/login', credentials);

  // ❌ WRONG: Trying to store token manually
  if (response.data.token) {
    localStorage.setItem('accessToken', response.data.token);
  }

  return response.data;
};
```

**AFTER (CORRECT):**
```typescript
export const login = async (credentials: LoginCredentials) => {
  const response = await api.post('/auth/login', credentials);

  // ✅ CORRECT: Just return user data
  // Cookie is automatically stored by browser (invisible to JavaScript)
  return response.data;
};
```

**Why:**
- Backend sets cookie in `Set-Cookie` header
- Browser automatically stores the cookie (HttpOnly = JavaScript can't see it)
- No manual storage needed or possible

---

### Change 4: Update Logout Handler

**File:** `src/services/authService.ts`

**BEFORE (WRONG):**
```typescript
export const logout = async () => {
  await api.post('/auth/logout');

  // ❌ WRONG: Trying to clear token manually
  localStorage.removeItem('accessToken');
};
```

**AFTER (CORRECT):**
```typescript
export const logout = async () => {
  await api.post('/auth/logout');

  // ✅ CORRECT: Just call backend
  // Backend clears cookie automatically
  // No manual cleanup needed
};
```

**Why:**
- Backend clears the cookie with `clearCookie()`
- Browser automatically removes the cookie
- Nothing to clean up in localStorage

---

### Change 5: Remove All Token Storage/Retrieval Code

**Search your codebase for these patterns and REMOVE them:**

```typescript
// ❌ DELETE: No token in localStorage
localStorage.setItem('accessToken', token);
localStorage.getItem('accessToken');
localStorage.removeItem('accessToken');

// ❌ DELETE: No token in sessionStorage
sessionStorage.setItem('accessToken', token);
sessionStorage.getItem('accessToken');
sessionStorage.removeItem('accessToken');

// ❌ DELETE: No manual Authorization header
config.headers.Authorization = `Bearer ${token}`;
```

**Why:** HttpOnly cookies handle everything automatically.

---

### Change 6: Handle 401 Errors (Optional but Recommended)

**File:** `src/services/api.ts`

Add response interceptor to handle expired/invalid cookies:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.traf3li.com/api',
  withCredentials: true,
});

// ✅ Handle 401 errors (token expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie expired or invalid - redirect to login
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 📝 Complete Example: Correct API Setup

**File:** `src/services/api.ts`

```typescript
import axios from 'axios';

// Create axios instance with cookie support
const api = axios.create({
  baseURL: 'https://api.traf3li.com/api',
  withCredentials: true,  // ✅ Enable cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export default api;
```

**File:** `src/services/authService.ts`

```typescript
import api from './api';

export interface LoginCredentials {
  username: string;  // Can be username or email
  password: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  isSeller: boolean;
  role: string;
}

export interface LoginResponse {
  error: boolean;
  message: string;
  user: User;
  // ❌ NO token field - it's in cookie!
}

// Login - cookie is automatically stored
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

// Logout - cookie is automatically cleared
export const logout = async (): Promise<void> => {
  await api.post('/auth/logout');
};

// Get current user - cookie is automatically sent
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  return response.data.user;
};
```

---

## 🧪 Testing After Changes

### Step 1: Clear Everything
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.trim().split("=")[0] + "=;expires=" + new Date(0).toUTCString();
});
```

### Step 2: Test Login
1. Go to http://localhost:5173/sign-in
2. Open DevTools → Network tab
3. Enter credentials and click Login
4. Look at the `/auth/login` request response headers
5. **Expected:** `Set-Cookie: accessToken=eyJhbGc...; HttpOnly; Secure; SameSite=None`

### Step 3: Verify Cookie is Stored
```javascript
// Run in browser console
// ❌ This will return empty (HttpOnly cookies are invisible to JS)
console.log(document.cookie);  // Expected: ""

// ✅ Check in DevTools: Application → Cookies → https://api.traf3li.com
// You should see: accessToken with HttpOnly ✓ and Secure ✓
```

### Step 4: Test Dashboard API Call
```javascript
// Run in browser console
fetch('https://api.traf3li.com/api/dashboard/hero-stats', {
  credentials: 'include'  // Important for fetch!
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Expected: Dashboard data, NOT 400 error
```

### Step 5: Verify axios Sends Cookies
1. Go to dashboard page
2. Open DevTools → Network tab
3. Look at any API request (e.g., `/dashboard/hero-stats`)
4. Check Request Headers
5. **Expected:** `Cookie: accessToken=eyJhbGc...`

---

## 🔍 Debugging Guide

### Issue: No `Set-Cookie` header after login

**Check:**
```javascript
// In browser console after login
console.log('withCredentials:', axios.defaults.withCredentials);
// Should be: true
```

**Fix:** Ensure `withCredentials: true` in axios config.

---

### Issue: Cookie not sent with requests

**Check:**
```javascript
// Look at request headers in Network tab
// Should see: Cookie: accessToken=...
```

**Fix:**
- Ensure `withCredentials: true` in axios instance
- Check cookie domain matches (should be `api.traf3li.com`)
- Check cookie hasn't expired

---

### Issue: CORS error

**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Fix:** Backend already configured correctly. Make sure:
- Using correct API URL: `https://api.traf3li.com/api`
- Have `withCredentials: true` in axios
- Not mixing HTTP and HTTPS

---

### Issue: Cookie shows in DevTools but not sent

**Check Cookie Attributes in DevTools:**
- ✅ HttpOnly: Should be checked
- ✅ Secure: Should be checked
- ✅ SameSite: Should be "None"
- ✅ Domain: Should be `api.traf3li.com` or `.traf3li.com`
- ✅ Path: Should be `/`

**If any are wrong:** Backend issue (already fixed).

---

## 📋 Frontend Checklist

- [ ] Update axios instance with `withCredentials: true`
- [ ] Remove all Authorization header logic
- [ ] Remove all localStorage token code
- [ ] Update login handler (don't store token)
- [ ] Update logout handler (don't clear token)
- [ ] Add 401 error interceptor (optional)
- [ ] Test login - verify Set-Cookie header
- [ ] Test dashboard - verify Cookie header in requests
- [ ] Test logout - verify cookie is cleared
- [ ] Commit changes

---

## 🎯 Expected Behavior After Fix

### Before Login:
- ❌ No cookies
- ❌ Dashboard API calls fail with 400
- ❌ User sees "Unauthorized" errors

### After Login:
- ✅ Backend sends `Set-Cookie` header
- ✅ Browser stores cookie (invisible to JavaScript)
- ✅ All API calls automatically include cookie
- ✅ Dashboard loads successfully
- ✅ No 400 errors

### After Logout:
- ✅ Backend clears cookie
- ✅ Browser removes cookie
- ✅ Subsequent API calls fail with 401
- ✅ User redirected to login

---

## 🔐 Security Benefits

| Feature | Protection |
|---------|-----------|
| **HttpOnly** | ✅ JavaScript cannot access token (XSS-safe) |
| **Secure** | ✅ Only sent over HTTPS (MITM-safe) |
| **SameSite=None** | ✅ Works cross-origin (localhost → production) |
| **Automatic** | ✅ Browser handles storage/sending (no bugs) |
| **Short expiry** | ✅ 7 days - limits damage if compromised |

---

## 🆚 Before vs After

### Before (Insecure):
```typescript
// ❌ Token exposed to JavaScript
const response = await api.post('/auth/login', creds);
localStorage.setItem('token', response.data.token);  // XSS vulnerable!

api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  return config;
});
```

### After (Secure):
```typescript
// ✅ Token in HttpOnly cookie (invisible to JavaScript)
const api = axios.create({
  baseURL: 'https://api.traf3li.com/api',
  withCredentials: true  // That's it! Browser handles everything
});

const response = await api.post('/auth/login', creds);
// Cookie automatically stored and sent with all requests
```

---

## 📞 Support

If issues persist after these changes:

1. **Check backend logs** on Render for any errors
2. **Verify CORS headers** in browser Network tab
3. **Check cookie attributes** in Application → Cookies
4. **Share screenshots** of:
   - Network tab showing `/auth/login` response headers
   - Application → Cookies showing stored cookies
   - Network tab showing dashboard request headers

---

## ✅ Summary

**Only 1 change is critical:**
```typescript
const api = axios.create({
  baseURL: 'https://api.traf3li.com/api',
  withCredentials: true,  // ← Add this line!
});
```

Everything else (removing localStorage code, manual headers) is cleanup to prevent bugs.

**Backend is ready. Frontend needs this one line. Then it works. 🎉**

---

Generated with Claude Code
