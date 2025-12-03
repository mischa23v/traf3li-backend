# Backend: Secure JWT Implementation with HttpOnly Cookies

## 🔐 Overview
Implement secure JWT authentication using HttpOnly cookies to protect against XSS attacks while maintaining cross-origin functionality.

---

## 📋 Prerequisites

### 1. Install Required Package
```bash
npm install cookie-parser
```

---

## 🛠️ Implementation Steps

### Step 1: Add Cookie Parser Middleware

**File:** `src/server.js`

Add BEFORE your routes:

```javascript
const cookieParser = require('cookie-parser');

// Add cookie parser middleware
app.use(cookieParser());
```

---

### Step 2: Update CORS Configuration

**File:** `src/server.js`

Ensure CORS allows credentials:

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://traf3li.com',
    'https://www.traf3li.com',
    'https://dashboard.traf3li.com'
  ],
  credentials: true,              // ✅ CRITICAL: Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']  // ✅ Allow frontend to see Set-Cookie
}));
```

---

### Step 3: Update Login Controller to Set HttpOnly Cookies

**File:** `src/controllers/auth.controller.js`

**BEFORE (Insecure - Token in Response Body):**
```javascript
return response.json({
  error: false,
  message: 'Login successful',
  user: userData,
  token: accessToken  // ❌ Exposed to JavaScript (XSS risk)
});
```

**AFTER (Secure - Token in HttpOnly Cookie):**
```javascript
const authLogin = async (request, response) => {
  try {
    const { email, password } = request.body;

    // Validate credentials (your existing logic)
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return response.status(401).json({
        error: true,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token (your existing logic)
    const accessToken = jwt.sign(
      { _id: user._id, email: user.email, isSeller: user.isSeller },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // ✅ Set HttpOnly cookie (NEW)
    response.cookie('accessToken', accessToken, {
      httpOnly: true,                                    // Prevents JavaScript access
      secure: process.env.NODE_ENV === 'production',   // HTTPS only in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Cross-origin
      maxAge: 15 * 60 * 1000,                          // 15 minutes
      path: '/'
    });

    // ✅ Return response WITHOUT token (NEW)
    return response.json({
      error: false,
      message: 'Login successful',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        isSeller: user.isSeller
      }
      // ❌ NO token field here!
    });

  } catch (error) {
    return response.status(500).json({
      error: true,
      message: error.message
    });
  }
};
```

---

### Step 4: Update Authentication Middleware

**File:** `src/middlewares/userMiddleware.js`

**CURRENT CODE (Already correct):**
```javascript
const userMiddleware = (request, response, next) => {
    // Check for token in both cookies and Authorization header
    let token = request.cookies.accessToken;

    // If no token in cookies, check Authorization header
    if (!token && request.headers.authorization) {
        const authHeader = request.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
    }

    try {
        if(!token) {
            throw CustomException('Unauthorized access!', 400);
        }

        const verification = jwt.verify(token, process.env.JWT_SECRET);
        if(verification) {
            request.userID = verification._id;
            request.isSeller = verification.isSeller;

            return next();
        }

        authLogout(request, response);
        throw CustomException('Relogin', 400);
    }
    catch({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}
```

✅ **This middleware is already correct!** It checks cookies first, then Authorization header.

---

### Step 5: Update Logout Controller

**File:** `src/controllers/auth.controller.js`

Add cookie clearing:

```javascript
const authLogout = async (request, response) => {
  try {
    // ✅ Clear the HttpOnly cookie
    response.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    });

    return response.json({
      error: false,
      message: 'Logged out successfully'
    });

  } catch (error) {
    return response.status(500).json({
      error: true,
      message: 'Logout failed'
    });
  }
};
```

---

### Step 6: Environment Variables

**File:** `.env`

Ensure these are set:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
NODE_ENV=production  # or 'development' for local testing

# Other existing vars...
MONGODB_URI=...
```

---

## 🧪 Testing

### Test 1: Login Should Set Cookie

**Using curl:**
```bash
curl -X POST https://api.traf3li.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -c cookies.txt \
  -v
```

**Expected in response headers:**
```
Set-Cookie: accessToken=eyJhbGc...; Path=/; HttpOnly; SameSite=None; Secure
```

**Response body should NOT contain token:**
```json
{
  "error": false,
  "message": "Login successful",
  "user": {
    "_id": "...",
    "username": "...",
    "email": "..."
  }
}
```

---

### Test 2: Authenticated Endpoint Should Work with Cookie

```bash
curl https://api.traf3li.com/api/dashboard/hero-stats \
  -b cookies.txt \
  -v
```

**Expected:** `200 OK` with dashboard data

---

### Test 3: Without Cookie Should Fail

```bash
curl https://api.traf3li.com/api/dashboard/hero-stats
```

**Expected:** `400 Bad Request` with `"Unauthorized access!"`

---

## 🔄 Complete Authentication Flow

1. ✅ User logs in via frontend
2. ✅ Backend validates credentials
3. ✅ Backend sets `accessToken` as HttpOnly cookie
4. ✅ Browser automatically stores cookie (invisible to JavaScript)
5. ✅ Frontend redirects to dashboard
6. ✅ Dashboard makes API call to protected endpoint
7. ✅ Browser automatically includes cookie in request
8. ✅ Backend reads token from `request.cookies.accessToken`
9. ✅ Backend validates token and returns data
10. ✅ Frontend displays data

---

## 🛡️ Security Benefits

| Feature | Benefit |
|---------|---------|
| **HttpOnly** | JavaScript cannot access token (XSS protection) |
| **Secure** | Token only sent over HTTPS in production |
| **SameSite** | Prevents CSRF attacks |
| **Short expiry** | Limits damage if token is compromised |
| **Server-side only** | No client-side token management needed |

---

## ✅ Implementation Checklist

- [ ] Install `cookie-parser` package
- [ ] Add `cookie-parser` middleware to `server.js`
- [ ] Verify CORS allows `credentials: true`
- [ ] Update login controller to set HttpOnly cookie
- [ ] Update login controller to NOT return token in response body
- [ ] Update logout controller to clear cookie
- [ ] Verify middleware reads from `request.cookies.accessToken` (already done)
- [ ] Test login with curl - verify Set-Cookie header
- [ ] Test protected endpoint with cookie - should work
- [ ] Test protected endpoint without cookie - should fail
- [ ] Commit and push changes
- [ ] Deploy to production (Render will auto-deploy)

---

## 📝 Files to Modify

1. **src/server.js** - Add cookie-parser, verify CORS
2. **src/controllers/auth.controller.js** - Update login and logout
3. **src/middlewares/userMiddleware.js** - Already correct ✅
4. **package.json** - Add cookie-parser dependency

---

## 🚀 After Implementation

Once backend changes are deployed:
- Frontend will automatically work (no frontend changes needed)
- Cookies will be set on login
- Dashboard API calls will succeed
- All 400 errors will be resolved

---

## ⚠️ Important Notes

1. **Never return token in response body** - defeats the purpose of HttpOnly
2. **Always set `sameSite: 'none'`** in production for cross-origin (localhost → api.traf3li.com)
3. **Set `secure: true`** only in production (HTTPS required)
4. **Cookie expiry should match JWT expiry** for consistency

---

## 🆘 Troubleshooting

**Issue:** Cookie not being set

**Check:**
- [ ] `cookie-parser` middleware is added BEFORE routes
- [ ] CORS has `credentials: true`
- [ ] Frontend uses `withCredentials: true` in axios config
- [ ] `sameSite` and `secure` settings match environment

**Issue:** Cookie set but not sent in subsequent requests

**Check:**
- [ ] Frontend axios has `withCredentials: true`
- [ ] CORS origin matches exact frontend URL
- [ ] Cookie path is '/'
- [ ] Cookie not expired

---

Generated with Claude Code
