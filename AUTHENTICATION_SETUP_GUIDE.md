# Complete Authentication Setup Guide - Traf3li Backend

This guide contains all the code and configuration needed to set up authentication in your backend.

## Table of Contents
1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Database Model](#database-model)
4. [Authentication Controller](#authentication-controller)
5. [Middleware](#middleware)
6. [Routes](#routes)
7. [Server Configuration](#server-configuration)
8. [Frontend Integration](#frontend-integration)
9. [Testing](#testing)

---

## Overview

**Authentication System Features:**
- JWT token-based authentication
- HttpOnly cookies for security
- Bcrypt password hashing
- Login with username OR email
- Role-based access (client, lawyer, admin)
- 7-day token expiration
- CORS support for multiple origins

**Tech Stack:**
- JWT (jsonwebtoken)
- Bcrypt for password hashing
- HttpOnly cookies
- Express.js

---

## Environment Setup

### 1. Install Required Packages

```bash
npm install jsonwebtoken bcrypt cookie-parser cors express mongoose
```

### 2. Environment Variables

Create a `.env` file in your project root:

```env
# JWT Secret (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_generated_secret_key_here

# Database
MONGODB_URI=mongodb://localhost:27017/traf3li

# Server
PORT=8080
NODE_ENV=development

# Frontend URLs (for CORS)
CLIENT_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5174

# Optional: Stripe (if using payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Model

### User Model (`src/models/user.model.js`)

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: false,
    },
    country: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    isSeller: {
        type: Boolean,
        default: false,
        required: false,
    },
    role: {
        type: String,
        enum: ['client', 'lawyer', 'admin'],
        default: 'client',
        required: false
    },
    lawyerProfile: {
        specialization: {
            type: [String],
            default: []
        },
        licenseNumber: {
            type: String,
            required: false
        },
        barAssociation: {
            type: String,
            required: false
        },
        yearsExperience: {
            type: Number,
            default: 0
        },
        verified: {
            type: Boolean,
            default: false
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        },
        casesWon: {
            type: Number,
            default: 0
        },
        casesTotal: {
            type: Number,
            default: 0
        },
        languages: {
            type: [String],
            default: ['arabic']
        },
        firmID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Firm',
            required: false
        }
    }
}, {
    versionKey: false,
    timestamps: true
});

// Index for better query performance
userSchema.index({ role: 1, 'lawyerProfile.specialization': 1, 'lawyerProfile.rating': -1 });

module.exports = mongoose.model('User', userSchema);
```

---

## Utility Functions

### Custom Exception (`src/utils/CustomException.js`)

```javascript
const CustomException = (message, status) => {
    const error = new Error(message);
    error.status = status;
    return error;
}

module.exports = CustomException;
```

### Utils Index (`src/utils/index.js`)

```javascript
const CustomException = require('./CustomException');

module.exports = {
    CustomException
}
```

---

## Authentication Controller

### Auth Controller (`src/controllers/auth.controller.js`)

```javascript
const { User } = require('../models');
const { CustomException } = require('../utils');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const { JWT_SECRET, NODE_ENV } = process.env;
const saltRounds = 10;

/**
 * REGISTER - Create new user account
 * POST /api/auth/register
 */
const authRegister = async (request, response) => {
    const { username, email, phone, password, image, isSeller, description, role, country } = request.body;

    try {
        // Hash password
        const hash = bcrypt.hashSync(password, saltRounds);

        const user = new User({
            username,
            email,
            password: hash,
            image,
            country: country || 'Saudi Arabia',
            description,
            isSeller,
            phone,
            role: role || (isSeller ? 'lawyer' : 'client')
        });

        await user.save();

        return response.status(201).send({
            error: false,
            message: 'New user created!'
        });
    }
    catch({message}) {
        console.log('Registration error:', message);
        if(message.includes('E11000')) {
            return response.status(400).send({
                error: true,
                message: 'Choose a unique username!'
            });
        }
        return response.status(500).send({
            error: true,
            message: 'Something went wrong!'
        });
    }
}

/**
 * LOGIN - Authenticate user
 * POST /api/auth/login
 * Accepts username OR email in username field
 */
const authLogin = async (request, response) => {
    const { username, password } = request.body;

    try {
        // Accept both username AND email for login
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username }  // Allow email in username field
            ]
        });

        if(!user) {
            throw CustomException('Check username or password!', 404);
        }

        // Verify password
        const match = bcrypt.compareSync(password, user.password);

        if(match) {
            // Remove password from response
            const { password, ...data } = user._doc;

            // Generate JWT token
            const token = jwt.sign({
                _id: user._id,
                isSeller: user.isSeller
            }, JWT_SECRET, { expiresIn: '7 days' });

            // Cookie configuration
            const cookieConfig = {
                httpOnly: true,  // Prevents JavaScript access (XSS protection)
                sameSite: NODE_ENV === 'production' ? 'none' : 'strict',
                secure: NODE_ENV === 'production',  // HTTPS only in production
                maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days in milliseconds
                path: '/'
            }

            // Set cookie and return user data
            return response.cookie('accessToken', token, cookieConfig)
                .status(202).send({
                    error: false,
                    message: 'Success!',
                    user: data
                });
        }

        throw CustomException('Check username or password!', 404);
    }
    catch({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
}

/**
 * LOGOUT - Clear authentication cookie
 * POST /api/auth/logout
 */
const authLogout = async (request, response) => {
    return response.clearCookie('accessToken', {
        sameSite: 'none',
        secure: true
    })
    .send({
        error: false,
        message: 'User have been logged out!'
    });
}

/**
 * AUTH STATUS - Get current user info
 * GET /api/auth/me
 * Requires: authenticate middleware
 */
const authStatus = async (request, response) => {
    try {
        const user = await User.findOne({ _id: request.userID }).select('-password');

        if(!user) {
            throw CustomException('User not found!', 404);
        }

        return response.send({
            error: false,
            message: 'Success!',
            user
        });
    }
    catch({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        });
    }
}

module.exports = {
    authLogin,
    authLogout,
    authRegister,
    authStatus
};
```

---

## Middleware

### Basic Authentication Middleware (`src/middlewares/authenticate.js`)

```javascript
const jwt = require('jsonwebtoken');
const { CustomException } = require("../utils");

/**
 * Authenticate Middleware
 * Verifies JWT token from cookies
 * Adds userID to request object
 */
const authenticate = (request, response, next) => {
    const { accessToken } = request.cookies;

    try {
        if (!accessToken) {
            throw CustomException('Access denied!', 401);
        }

        const verification = jwt.verify(accessToken, process.env.JWT_SECRET);
        if(verification) {
            request.userID = verification._id;
            return next();
        }

        throw CustomException('Access denied!', 401);
    }
    catch({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

module.exports = authenticate;
```

### User Middleware (Enhanced) (`src/middlewares/userMiddleware.js`)

```javascript
const jwt = require('jsonwebtoken');
const { CustomException } = require('../utils');
const { authLogout } = require('../controllers/auth.controller');

/**
 * User Middleware
 * Verifies JWT token and extracts user info
 * Adds userID and isSeller to request object
 */
const userMiddleware = (request, response, next) => {
    const token = request.cookies.accessToken;

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

module.exports = userMiddleware;
```

### Middleware Index (`src/middlewares/index.js`)

```javascript
const authenticate = require('./authenticate');
const userMiddleware = require('./userMiddleware');

module.exports = {
    authenticate,
    userMiddleware
};
```

---

## Routes

### Auth Routes (`src/routes/auth.route.js`)

```javascript
const express = require('express');
const { authLogin, authLogout, authRegister, authStatus } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares');

const app = express.Router();

// Public routes
app.post('/register', authRegister);
app.post('/login', authLogin);
app.post('/logout', authLogout);

// Protected route
app.get('/me', authenticate, authStatus);

module.exports = app;
```

---

## Server Configuration

### Main Server Setup (`src/server.js`)

```javascript
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const connectDB = require('./configs/db');
const { authRoute } = require('./routes');

const app = express();
const server = http.createServer(app);

// Security Middleware
app.use(helmet());

// CORS Configuration - CRITICAL for cookie-based auth
app.use(cors({
    origin: [
        // Production URLs
        'https://traf3li.com',
        'https://dashboard.traf3li.com',
        'https://www.traf3li.com',
        'https://www.dashboard.traf3li.com',

        // Development URLs
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',

        // Environment variables
        process.env.CLIENT_URL,
        process.env.DASHBOARD_URL
    ].filter(Boolean), // Remove undefined values
    credentials: true  // CRITICAL: Allows HttpOnly cookies
}));

// Body Parser
app.use(express.json());

// Cookie Parser - REQUIRED for authentication
app.use(cookieParser());

// Static files
app.use('/uploads', express.static('uploads'));

// Auth Routes
app.use('/api/auth', authRoute);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Database Connection
connectDB();

// Start Server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
```

---

## Frontend Integration

### JavaScript/Axios Example

```javascript
import axios from 'axios';

// Configure axios to send cookies
const api = axios.create({
    baseURL: 'http://localhost:8080/api',
    withCredentials: true  // CRITICAL: Enables cookies
});

// Register
async function register(userData) {
    try {
        const response = await api.post('/auth/register', {
            username: 'john_doe',
            email: 'john@example.com',
            password: 'SecurePass123!',
            phone: '+966501234567',
            country: 'Saudi Arabia',
            isSeller: false
        });

        console.log(response.data);
        // { error: false, message: 'New user created!' }
    } catch (error) {
        console.error(error.response.data);
    }
}

// Login
async function login(username, password) {
    try {
        const response = await api.post('/auth/login', {
            username,  // Can be username OR email
            password
        });

        console.log(response.data);
        // { error: false, message: 'Success!', user: {...} }

        // Cookie is automatically stored by browser
        return response.data.user;
    } catch (error) {
        console.error(error.response.data);
    }
}

// Get Current User
async function getCurrentUser() {
    try {
        const response = await api.get('/auth/me');
        return response.data.user;
    } catch (error) {
        console.error('Not authenticated');
        return null;
    }
}

// Logout
async function logout() {
    try {
        const response = await api.post('/auth/logout');
        console.log(response.data.message);
        // Cookie is automatically cleared
    } catch (error) {
        console.error(error.response.data);
    }
}
```

### Fetch API Example

```javascript
// Login with Fetch
async function login(username, password) {
    const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',  // CRITICAL: Enables cookies
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.message);
    }

    return data.user;
}

// Get current user
async function getCurrentUser() {
    const response = await fetch('http://localhost:8080/api/auth/me', {
        credentials: 'include'  // CRITICAL: Sends cookies
    });

    const data = await response.json();
    return data.error ? null : data.user;
}
```

### React Hook Example

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api',
    withCredentials: true
});

export function useAuth() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    async function checkAuth() {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data.user);
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }

    async function login(username, password) {
        const response = await api.post('/auth/login', { username, password });
        setUser(response.data.user);
        return response.data;
    }

    async function logout() {
        await api.post('/auth/logout');
        setUser(null);
    }

    async function register(userData) {
        const response = await api.post('/auth/register', userData);
        return response.data;
    }

    return {
        user,
        loading,
        login,
        logout,
        register,
        checkAuth
    };
}
```

---

## Testing

### Manual Testing with cURL

**1. Register a new user:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_user",
    "email": "test@example.com",
    "password": "Test123!",
    "phone": "+966501234567",
    "country": "Saudi Arabia",
    "isSeller": false
  }'
```

**2. Login (get cookie):**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "username": "test_user",
    "password": "Test123!"
  }'
```

**3. Get current user (use cookie):**
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -b cookies.txt
```

**4. Logout:**
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -b cookies.txt
```

### Postman Testing

1. **Set up Postman:**
   - Enable "Save cookies" in Settings
   - Use the same domain for all requests

2. **Register:**
   - Method: POST
   - URL: `http://localhost:8080/api/auth/register`
   - Body (JSON):
   ```json
   {
     "username": "postman_user",
     "email": "postman@test.com",
     "password": "Test123!",
     "phone": "+966501234567",
     "isSeller": false
   }
   ```

3. **Login:**
   - Method: POST
   - URL: `http://localhost:8080/api/auth/login`
   - Body (JSON):
   ```json
   {
     "username": "postman_user",
     "password": "Test123!"
   }
   ```
   - Cookie will be automatically saved

4. **Get User:**
   - Method: GET
   - URL: `http://localhost:8080/api/auth/me`
   - Cookie will be automatically sent

---

## Common Issues & Solutions

### 1. CORS Errors
**Problem:** "Access to fetch has been blocked by CORS policy"

**Solution:**
- Ensure `credentials: true` in CORS config
- Add your frontend URL to allowed origins
- Use `withCredentials: true` in frontend requests

### 2. Cookies Not Being Set
**Problem:** Login successful but cookie not saved

**Solution:**
- Check `sameSite` and `secure` settings
- In development, use `sameSite: 'strict'` and `secure: false`
- In production, use `sameSite: 'none'` and `secure: true` (HTTPS required)

### 3. Unauthorized on Protected Routes
**Problem:** Cookie exists but still getting 401

**Solution:**
- Verify JWT_SECRET is set in .env
- Check token expiration
- Ensure `cookieParser()` middleware is before routes

### 4. Login with Email Not Working
**Problem:** Can login with username but not email

**Solution:**
- Backend already supports this via `$or` query
- Ensure frontend sends email in the `username` field

---

## Security Best Practices

1. **Environment Variables**
   - Never commit `.env` file
   - Use strong, random JWT_SECRET
   - Rotate secrets periodically

2. **Password Security**
   - Minimum 8 characters
   - Require special characters, numbers
   - Use bcrypt with salt rounds ≥ 10

3. **Cookie Security**
   - Always use `httpOnly: true`
   - Use `secure: true` in production (HTTPS)
   - Set appropriate `sameSite` value

4. **Token Management**
   - Set reasonable expiration (7 days)
   - Implement refresh tokens for longer sessions
   - Invalidate tokens on logout

5. **Rate Limiting**
   - Limit login attempts
   - Use express-rate-limit middleware
   - Block IPs after failed attempts

6. **HTTPS**
   - Always use HTTPS in production
   - Cookies with `secure: true` only work on HTTPS

---

## API Endpoints Summary

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/auth/register` | No | Create new user account |
| POST | `/api/auth/login` | No | Login (username or email) |
| POST | `/api/auth/logout` | No | Logout and clear cookie |
| GET | `/api/auth/me` | Yes | Get current user info |

---

## Response Format

**Success Response:**
```json
{
  "error": false,
  "message": "Success message",
  "user": {
    "_id": "...",
    "username": "...",
    "email": "...",
    // ... other fields (no password)
  }
}
```

**Error Response:**
```json
{
  "error": true,
  "message": "Error message"
}
```

---

## Complete File Structure

```
traf3li-backend/
├── src/
│   ├── controllers/
│   │   └── auth.controller.js          # Auth logic
│   ├── middlewares/
│   │   ├── authenticate.js             # Basic auth
│   │   ├── userMiddleware.js           # Enhanced auth
│   │   └── index.js                    # Export all
│   ├── models/
│   │   └── user.model.js               # User schema
│   ├── routes/
│   │   └── auth.route.js               # Auth routes
│   ├── utils/
│   │   ├── CustomException.js          # Error handler
│   │   └── index.js                    # Export utils
│   └── server.js                       # Main server
├── .env                                 # Environment vars
├── .env.example                         # Template
└── package.json
```

---

## Next Steps

1. **Set up environment variables** (`.env` file)
2. **Start MongoDB** (`mongod`)
3. **Run the server** (`npm start`)
4. **Test with Postman** or frontend
5. **Add rate limiting** (optional but recommended)
6. **Implement refresh tokens** (for production)
7. **Add email verification** (optional)
8. **Set up password reset** (optional)

---

**That's it!** You now have a complete, secure authentication system. 🎉
