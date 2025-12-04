# TRAF3LI Frontend Integration - Complete Guide

## Table of Contents
1. [Environment Setup](#1-environment-setup)
2. [Email OTP Authentication](#2-email-otp-authentication)
3. [In-App Notifications (Socket.io)](#3-in-app-notifications-socketio)
4. [Push Notifications](#4-push-notifications)
5. [Notification API Endpoints](#5-notification-api-endpoints)
6. [Reminder API Endpoints](#6-reminder-api-endpoints)
7. [Event API Endpoints](#7-event-api-endpoints)
8. [Error Handling](#8-error-handling)
9. [Testing Guide](#9-testing-guide)

---

## 1. Environment Setup

### Backend Environment Variables (`.env`)

```env
# ============================================
# RESEND EMAIL SERVICE
# ============================================
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
FROM_EMAIL=onboarding@resend.dev
FROM_NAME=TRAF3LI

# ============================================
# OTP CONFIGURATION
# ============================================
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6
OTP_SECRET_SALT=your-random-32-character-string-here

# ============================================
# PUSH NOTIFICATIONS (VAPID KEYS)
# ============================================
VAPID_PUBLIC_KEY=BBPHXE1quI58UtPRW7BUWKGyqX7G2dJuYwsBpJi27_seabDaBY2J_c5GzN83rzBthjcx_iCtIkWX1z3x1iwf6J0
VAPID_PRIVATE_KEY=LTVebQxXKGp9lqMjHdDJn92ZuBRvSyoJcHWH9PjE2m8
VAPID_SUBJECT=mailto:admin@trafeli.com

# ============================================
# CLIENT URLS
# ============================================
CLIENT_URL=https://your-frontend-url.com
DASHBOARD_URL=https://your-dashboard-url.com
```

### Frontend Environment Variables (`.env`)

```env
REACT_APP_API_URL=https://your-backend-url.com
REACT_APP_VAPID_PUBLIC_KEY=BBPHXE1quI58UtPRW7BUWKGyqX7G2dJuYwsBpJi27_seabDaBY2J_c5GzN83rzBthjcx_iCtIkWX1z3x1iwf6J0
```

---

## 2. Email OTP Authentication

### 2.1 Backend Controller to Create

Create file: `src/controllers/otp.controller.js`

```javascript
const { EmailOTP } = require('../models');
const { generateOTP, hashOTP } = require('../utils/otp.utils');
const NotificationDeliveryService = require('../services/notificationDelivery.service');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

/**
 * Send OTP to email
 * POST /api/auth/send-otp
 */
const sendOTP = async (req, res) => {
  try {
    const { email, purpose = 'login' } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
        errorAr: 'عنوان البريد الإلكتروني غير صالح'
      });
    }

    // Check rate limit (5 OTPs per hour, 1 min between requests)
    const rateLimit = await EmailOTP.checkRateLimit(email, purpose);
    if (rateLimit.limited) {
      return res.status(429).json({
        success: false,
        error: rateLimit.message,
        errorAr: rateLimit.messageAr,
        waitTime: rateLimit.waitTime || 60
      });
    }

    // For login, check if user exists
    if (purpose === 'login') {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found. Please register first.',
          errorAr: 'المستخدم غير موجود. يرجى التسجيل أولاً.'
        });
      }
    }

    // Generate OTP
    const otpCode = generateOTP(6);
    const otpHash = hashOTP(otpCode);

    // Store OTP in database
    await EmailOTP.createOTP(email, otpCode, purpose, 5, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Get user name if exists
    const user = await User.findOne({ email: email.toLowerCase() });
    const userName = user ? `${user.firstName} ${user.lastName}` : 'User';

    // Send OTP email
    const emailResult = await NotificationDeliveryService.sendEmailOTP(
      email,
      otpCode,
      userName
    );

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to send OTP email',
        errorAr: 'فشل إرسال رمز التحقق'
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      messageAr: 'تم إرسال رمز التحقق بنجاح',
      expiresIn: 5 * 60, // 5 minutes in seconds
      email: email
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose = 'login' } = req.body;

    // Validate input
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email and OTP are required',
        errorAr: 'البريد الإلكتروني ورمز التحقق مطلوبان'
      });
    }

    // Verify OTP
    const otpHash = hashOTP(otp);
    const result = await EmailOTP.verifyOTP(email, otpHash, purpose);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        errorAr: result.errorAr,
        attemptsLeft: result.attemptsLeft
      });
    }

    // Get or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user && purpose === 'registration') {
      // For registration, user should be created separately
      return res.status(200).json({
        success: true,
        verified: true,
        message: 'OTP verified. Proceed with registration.',
        messageAr: 'تم التحقق من الرمز. أكمل التسجيل.'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        errorAr: 'المستخدم غير موجود'
      });
    }

    // Generate JWT tokens
    const accessToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      messageAr: 'تم تسجيل الدخول بنجاح',
      accessToken,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        image: user.image
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      errorAr: 'حدث خطأ في الخادم'
    });
  }
};

/**
 * Resend OTP
 * POST /api/auth/resend-otp
 */
const resendOTP = async (req, res) => {
  // Same as sendOTP - it handles rate limiting
  return sendOTP(req, res);
};

module.exports = {
  sendOTP,
  verifyOTP,
  resendOTP
};
```

### 2.2 Backend Routes to Add

Add to `src/routes/auth.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP, resendOTP } = require('../controllers/otp.controller');

// OTP Routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

module.exports = router;
```

### 2.3 Frontend Implementation

#### API Service (`services/authApi.js`)

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  /**
   * Send OTP to email
   * @param {string} email - User email
   * @param {string} purpose - 'login' | 'registration' | 'password_reset'
   */
  sendOTP: async (email, purpose = 'login') => {
    try {
      const response = await api.post('/api/auth/send-otp', { email, purpose });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

  /**
   * Verify OTP
   * @param {string} email - User email
   * @param {string} otp - 6-digit OTP code
   * @param {string} purpose - 'login' | 'registration' | 'password_reset'
   */
  verifyOTP: async (email, otp, purpose = 'login') => {
    try {
      const response = await api.post('/api/auth/verify-otp', { email, otp, purpose });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  },

  /**
   * Resend OTP
   * @param {string} email - User email
   * @param {string} purpose - 'login' | 'registration' | 'password_reset'
   */
  resendOTP: async (email, purpose = 'login') => {
    try {
      const response = await api.post('/api/auth/resend-otp', { email, purpose });
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: 'Network error' };
    }
  }
};
```

#### Login Component (`components/LoginWithOTP.jsx`)

```jsx
import React, { useState, useEffect } from 'react';
import { authApi } from '../services/authApi';

const LoginWithOTP = ({ onLoginSuccess }) => {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authApi.sendOTP(email, 'login');

      if (result.success) {
        setStep('otp');
        setCountdown(60); // 60 seconds before resend allowed
      }
    } catch (err) {
      setError(err.errorAr || err.error || 'فشل إرسال رمز التحقق');

      // Handle rate limit
      if (err.waitTime) {
        setCountdown(err.waitTime);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authApi.verifyOTP(email, otp, 'login');

      if (result.success) {
        // Store tokens
        localStorage.setItem('accessToken', result.accessToken);
        localStorage.setItem('refreshToken', result.refreshToken);
        localStorage.setItem('user', JSON.stringify(result.user));

        // Callback
        onLoginSuccess(result.user);
      }
    } catch (err) {
      setError(err.errorAr || err.error || 'رمز التحقق غير صحيح');

      // Update attempts left
      if (err.attemptsLeft !== undefined) {
        setAttemptsLeft(err.attemptsLeft);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setLoading(true);
    setError('');

    try {
      const result = await authApi.resendOTP(email, 'login');

      if (result.success) {
        setCountdown(60);
        setOtp('');
        setAttemptsLeft(3);
      }
    } catch (err) {
      setError(err.errorAr || err.error || 'فشل إعادة إرسال الرمز');

      if (err.waitTime) {
        setCountdown(err.waitTime);
      }
    } finally {
      setLoading(false);
    }
  };

  // Render email step
  if (step === 'email') {
    return (
      <div className="login-container" dir="rtl">
        <h2>تسجيل الدخول</h2>
        <p>أدخل بريدك الإلكتروني لتلقي رمز التحقق</p>

        <form onSubmit={handleSendOTP}>
          <div className="form-group">
            <label>البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading || countdown > 0}>
            {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
          </button>

          {countdown > 0 && (
            <p className="countdown">انتظر {countdown} ثانية</p>
          )}
        </form>
      </div>
    );
  }

  // Render OTP step
  return (
    <div className="login-container" dir="rtl">
      <h2>أدخل رمز التحقق</h2>
      <p>تم إرسال رمز التحقق إلى {email}</p>

      <form onSubmit={handleVerifyOTP}>
        <div className="form-group">
          <label>رمز التحقق (6 أرقام)</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            required
            disabled={loading}
            className="otp-input"
            autoComplete="one-time-code"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        {attemptsLeft < 3 && (
          <p className="attempts-warning">
            المحاولات المتبقية: {attemptsLeft}
          </p>
        )}

        <button type="submit" disabled={loading || otp.length !== 6}>
          {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
        </button>
      </form>

      <div className="resend-section">
        <button
          onClick={handleResendOTP}
          disabled={countdown > 0 || loading}
          className="resend-button"
        >
          {countdown > 0 ? `إعادة الإرسال بعد ${countdown} ثانية` : 'إعادة إرسال الرمز'}
        </button>

        <button
          onClick={() => { setStep('email'); setError(''); }}
          className="back-button"
        >
          تغيير البريد الإلكتروني
        </button>
      </div>
    </div>
  );
};

export default LoginWithOTP;
```

#### CSS Styles (`styles/login.css`)

```css
.login-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 30px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.login-container h2 {
  margin-bottom: 10px;
  color: #1e40af;
}

.login-container p {
  color: #666;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
}

.form-group input:focus {
  border-color: #1e40af;
  outline: none;
}

.otp-input {
  text-align: center;
  font-size: 24px !important;
  letter-spacing: 8px;
  font-family: monospace;
}

button[type="submit"] {
  width: 100%;
  padding: 14px;
  background: #1e40af;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
}

button[type="submit"]:disabled {
  background: #ccc;
  cursor: not-allowed;
}

button[type="submit"]:hover:not(:disabled) {
  background: #1e3a8a;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 15px;
  text-align: center;
}

.countdown {
  text-align: center;
  color: #666;
  margin-top: 10px;
}

.attempts-warning {
  color: #f59e0b;
  text-align: center;
  margin-bottom: 15px;
}

.resend-section {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resend-button, .back-button {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.resend-button:disabled {
  color: #999;
  cursor: not-allowed;
}
```

---

## 3. In-App Notifications (Socket.io)

### 3.1 Socket Context (`contexts/SocketContext.jsx`)

```jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      return;
    }

    // Connect to socket
    const socketInstance = io(process.env.REACT_APP_API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setConnected(false);
    });

    // Notification events
    socketInstance.on('notification', (notification) => {
      console.log('New notification:', notification);

      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);

      // Update unread count
      setUnreadCount(prev => prev + 1);

      // Show toast notification
      showNotificationToast(notification);
    });

    socketInstance.on('notificationCount', (count) => {
      setUnreadCount(count);
    });

    socketInstance.on('notificationsRead', () => {
      setUnreadCount(0);
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true }))
      );
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Show browser notification toast
  const showNotificationToast = (notification) => {
    // You can use a toast library like react-toastify
    // Or implement your own toast component

    // Example with browser notification (if permitted)
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo192.png',
        dir: 'rtl',
        lang: 'ar'
      });
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n._id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/notifications/read-all`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const value = {
    socket,
    connected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
```

### 3.2 Notification Bell Component (`components/NotificationBell.jsx`)

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle notification click
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigate to link
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  // Get icon based on notification type
  const getIcon = (type) => {
    const icons = {
      task: '📋',
      hearing: '⚖️',
      event: '📅',
      message: '💬',
      payment: '💰',
      case: '📁',
      deadline: '⏰',
      order: '🛒',
      proposal: '📄',
      review: '⭐'
    };
    return icons[type] || '🔔';
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    if (seconds < 60) return 'الآن';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    return `منذ ${Math.floor(seconds / 86400)} يوم`;
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="الإشعارات"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" dir="rtl">
          <div className="dropdown-header">
            <h3>الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-state">
                <span>🔔</span>
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-icon">
                    {notification.icon || getIcon(notification.type)}
                  </span>
                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  {!notification.read && <span className="unread-dot" />}
                </div>
              ))
            )}
          </div>

          <div className="dropdown-footer">
            <button onClick={() => { navigate('/notifications'); setIsOpen(false); }}>
              عرض كل الإشعارات
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
```

### 3.3 Notification Bell Styles (`styles/notification-bell.css`)

```css
.notification-bell {
  position: relative;
}

.bell-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  position: relative;
  font-size: 24px;
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  background: #dc2626;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 360px;
  max-height: 500px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  z-index: 1000;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
}

.dropdown-header h3 {
  margin: 0;
  font-size: 16px;
}

.mark-all-read {
  background: none;
  border: none;
  color: #1e40af;
  cursor: pointer;
  font-size: 12px;
}

.notification-list {
  max-height: 380px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 15px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s;
}

.notification-item:hover {
  background: #f9fafb;
}

.notification-item.unread {
  background: #f0f9ff;
}

.notification-icon {
  font-size: 24px;
  margin-left: 12px;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: 600;
  margin: 0 0 4px 0;
  font-size: 14px;
}

.notification-message {
  color: #666;
  margin: 0 0 4px 0;
  font-size: 13px;
}

.notification-time {
  color: #999;
  font-size: 11px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #1e40af;
  border-radius: 50%;
  margin-top: 6px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.empty-state span {
  font-size: 48px;
  display: block;
  margin-bottom: 10px;
}

.dropdown-footer {
  padding: 10px;
  border-top: 1px solid #eee;
  text-align: center;
}

.dropdown-footer button {
  background: none;
  border: none;
  color: #1e40af;
  cursor: pointer;
  font-size: 14px;
}
```

---

## 4. Push Notifications

### 4.1 Service Worker (`public/sw.js`)

```javascript
/* eslint-disable no-restricted-globals */

// Push notification handler
self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'ترافعلي',
    body: 'لديك إشعار جديد',
    icon: '/logo192.png',
    badge: '/badge.png',
    url: '/'
  };

  // Parse push data
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/badge.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [100, 50, 100],
    tag: data.tag || 'default',
    renotify: true,
    requireInteraction: data.priority === 'urgent',
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
      type: data.type
    },
    actions: [
      {
        action: 'open',
        title: 'فتح',
        icon: '/icons/open.png'
      },
      {
        action: 'close',
        title: 'إغلاق',
        icon: '/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const url = event.notification.data?.url || '/';

  if (event.action === 'close') {
    return;
  }

  // Open or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already an open window
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Notification close handler
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed:', event);
});

// Service worker install
self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Service worker activate
self.addEventListener('activate', function(event) {
  console.log('[SW] Service worker activated');
  event.waitUntil(clients.claim());
});
```

### 4.2 Push Notification Utility (`utils/pushNotifications.js`)

```javascript
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY ||
  'BBPHXE1quI58UtPRW7BUWKGyqX7G2dJuYwsBpJi27_seabDaBY2J_c5GzN83rzBthjcx_iCtIkWX1z3x1iwf6J0';

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
  return 'serviceWorker' in navigator &&
         'PushManager' in window &&
         'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getPermissionStatus() {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted', 'denied', 'default'
}

/**
 * Request notification permission
 */
export async function requestPermission() {
  if (!isPushSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      return { success: true, permission };
    } else {
      return {
        success: false,
        permission,
        error: permission === 'denied'
          ? 'تم رفض إذن الإشعارات. يرجى تفعيله من إعدادات المتصفح.'
          : 'لم يتم منح إذن الإشعارات'
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Register service worker
 */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('Service worker registered:', registration.scope);

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    throw error;
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush() {
  if (!isPushSupported()) {
    return {
      success: false,
      error: 'Push notifications not supported in this browser'
    };
  }

  try {
    // Request permission first
    const permissionResult = await requestPermission();
    if (!permissionResult.success) {
      return permissionResult;
    }

    // Register service worker
    const registration = await registerServiceWorker();

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // Send subscription to backend
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/users/push-subscription`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save subscription to server');
    }

    console.log('Push subscription successful');

    return {
      success: true,
      subscription: subscription.toJSON()
    };

  } catch (error) {
    console.error('Push subscription failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe locally
      await subscription.unsubscribe();

      // Remove from backend
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/push-subscription`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Unsubscribe failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is subscribed to push
 */
export async function isSubscribed() {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    return false;
  }
}
```

### 4.3 Push Notification Settings Component (`components/PushNotificationSettings.jsx`)

```jsx
import React, { useState, useEffect } from 'react';
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed
} from '../utils/pushNotifications';

const PushNotificationSettings = () => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      setSupported(isPushSupported());
      setPermission(getPermissionStatus());
      setSubscribed(await isSubscribed());
    };

    checkStatus();
  }, []);

  const handleToggle = async () => {
    setLoading(true);
    setError('');

    try {
      if (subscribed) {
        const result = await unsubscribeFromPush();
        if (result.success) {
          setSubscribed(false);
        } else {
          setError(result.error);
        }
      } else {
        const result = await subscribeToPush();
        if (result.success) {
          setSubscribed(true);
          setPermission('granted');
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="push-settings" dir="rtl">
        <h3>إشعارات الدفع</h3>
        <p className="not-supported">
          ⚠️ متصفحك لا يدعم إشعارات الدفع
        </p>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="push-settings" dir="rtl">
        <h3>إشعارات الدفع</h3>
        <p className="permission-denied">
          ❌ تم رفض إذن الإشعارات.
          <br />
          لتفعيلها، افتح إعدادات المتصفح واسمح بالإشعارات لهذا الموقع.
        </p>
      </div>
    );
  }

  return (
    <div className="push-settings" dir="rtl">
      <h3>إشعارات الدفع</h3>
      <p>احصل على إشعارات فورية للتذكيرات والمهام والرسائل</p>

      <div className="toggle-container">
        <label className="toggle">
          <input
            type="checkbox"
            checked={subscribed}
            onChange={handleToggle}
            disabled={loading}
          />
          <span className="slider"></span>
        </label>
        <span>{subscribed ? 'مفعّل' : 'معطّل'}</span>
      </div>

      {loading && <p className="loading">جاري الحفظ...</p>}
      {error && <p className="error">{error}</p>}

      {subscribed && (
        <p className="success">✓ ستصلك إشعارات فورية على هذا الجهاز</p>
      )}
    </div>
  );
};

export default PushNotificationSettings;
```

### 4.4 Backend Endpoint for Push Subscription

Add to `src/controllers/user.controller.js`:

```javascript
/**
 * Save push subscription
 * POST /api/users/push-subscription
 */
const savePushSubscription = async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.userId;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription'
      });
    }

    await User.findByIdAndUpdate(userId, {
      pushSubscription: subscription
    });

    res.status(200).json({
      success: true,
      message: 'Push subscription saved'
    });
  } catch (error) {
    console.error('Save push subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save subscription'
    });
  }
};

/**
 * Delete push subscription
 * DELETE /api/users/push-subscription
 */
const deletePushSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;

    await User.findByIdAndUpdate(userId, {
      $unset: { pushSubscription: 1 }
    });

    res.status(200).json({
      success: true,
      message: 'Push subscription removed'
    });
  } catch (error) {
    console.error('Delete push subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove subscription'
    });
  }
};

module.exports = {
  savePushSubscription,
  deletePushSubscription
};
```

Add to `src/routes/user.routes.js`:

```javascript
const { savePushSubscription, deletePushSubscription } = require('../controllers/user.controller');
const { authenticateToken } = require('../middleware/auth');

router.post('/push-subscription', authenticateToken, savePushSubscription);
router.delete('/push-subscription', authenticateToken, deletePushSubscription);
```

Add field to User model (`src/models/user.model.js`):

```javascript
// Add this field to userSchema
pushSubscription: {
  type: mongoose.Schema.Types.Mixed,
  required: false
}
```

---

## 5. Notification API Endpoints

### Full API Reference

```javascript
// Base URL: /api/notifications

// GET /api/notifications
// Get paginated notifications
// Query params: page, limit, read (true/false)
// Response:
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "...",
        "userId": "...",
        "type": "task",
        "title": "تذكير بمهمة",
        "message": "مهمة جديدة تنتهي غداً",
        "link": "/tasks",
        "read": false,
        "icon": "📋",
        "priority": "high",
        "data": { "taskId": "..." },
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}

// GET /api/notifications/unread
// Get unread count
// Response:
{
  "success": true,
  "count": 5
}

// PUT /api/notifications/:id/read
// Mark single notification as read
// Response:
{
  "success": true,
  "message": "Notification marked as read"
}

// PUT /api/notifications/read-all
// Mark all notifications as read
// Response:
{
  "success": true,
  "message": "All notifications marked as read",
  "modifiedCount": 5
}

// DELETE /api/notifications/:id
// Delete notification
// Response:
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## 6. Reminder API Endpoints

```javascript
// Base URL: /api/reminders

// GET /api/reminders
// Get user reminders
// Query: status, priority, startDate, endDate, page, limit
// Response:
{
  "success": true,
  "data": {
    "reminders": [...],
    "pagination": {...}
  }
}

// POST /api/reminders
// Create reminder
// Body:
{
  "title": "موعد هام",
  "description": "تفاصيل...",
  "reminderDateTime": "2024-01-20T10:00:00Z",
  "priority": "high",
  "type": "meeting",
  "notification": {
    "channels": ["email", "push", "in_app"],
    "advanceNotifications": [
      { "beforeMinutes": 60, "channels": ["push"] },
      { "beforeMinutes": 15, "channels": ["push", "in_app"] }
    ]
  },
  "relatedCase": "caseId",
  "relatedTask": "taskId",
  "recurring": {
    "enabled": true,
    "frequency": "weekly",
    "interval": 1,
    "daysOfWeek": [0, 3]
  }
}

// POST /api/reminders/:id/snooze
// Snooze reminder
// Body:
{
  "minutes": 30,
  "reason": "مشغول حالياً"
}

// POST /api/reminders/:id/complete
// Mark reminder as completed
// Body:
{
  "completionNote": "تم الانتهاء"
}

// POST /api/reminders/:id/dismiss
// Dismiss reminder
```

---

## 7. Event API Endpoints

```javascript
// Base URL: /api/events

// GET /api/events
// Get events for date range
// Query: startDate, endDate, type, status, caseId
// Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "eventId": "EVT-202401-0001",
      "title": "جلسة محكمة",
      "type": "hearing",
      "status": "scheduled",
      "startDateTime": "2024-01-20T09:00:00Z",
      "endDateTime": "2024-01-20T11:00:00Z",
      "location": {
        "name": "المحكمة العامة",
        "address": "..."
      },
      "caseId": {...},
      "attendees": [...],
      "reminders": [
        { "beforeMinutes": 60, "type": "push", "sent": false },
        { "beforeMinutes": 1440, "type": "email", "sent": false }
      ]
    }
  ]
}

// POST /api/events
// Create event
// Body:
{
  "title": "اجتماع مع العميل",
  "type": "client_meeting",
  "startDateTime": "2024-01-20T14:00:00Z",
  "endDateTime": "2024-01-20T15:00:00Z",
  "location": {
    "name": "مكتب المحاماة",
    "address": "الرياض",
    "virtualLink": "https://zoom.us/j/xxx"
  },
  "attendees": [
    { "userId": "...", "role": "required" },
    { "email": "client@email.com", "name": "العميل", "role": "required" }
  ],
  "reminders": [
    { "type": "email", "beforeMinutes": 1440 },
    { "type": "push", "beforeMinutes": 60 },
    { "type": "push", "beforeMinutes": 15 }
  ],
  "caseId": "..."
}

// POST /api/events/:id/rsvp
// Update RSVP
// Body:
{
  "status": "confirmed",
  "responseNote": "سأحضر"
}
```

---

## 8. Error Handling

### Standard Error Response Format

```javascript
{
  "success": false,
  "error": "Error message in English",
  "errorAr": "رسالة الخطأ بالعربية",
  "code": "ERROR_CODE",
  "details": {} // Optional additional details
}
```

### Common Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Not authenticated |
| `FORBIDDEN` | 403 | Not authorized |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal error |

### Frontend Error Handler

```javascript
// utils/errorHandler.js
export const handleApiError = (error) => {
  const response = error.response?.data || {};

  // Check for specific error types
  if (error.response?.status === 429) {
    return {
      message: response.errorAr || 'تم تجاوز عدد الطلبات. يرجى الانتظار.',
      waitTime: response.waitTime
    };
  }

  if (error.response?.status === 401) {
    // Clear tokens and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return { message: 'جلستك انتهت. يرجى تسجيل الدخول مرة أخرى.' };
  }

  if (error.response?.status === 403) {
    return { message: 'ليس لديك صلاحية للقيام بهذا الإجراء.' };
  }

  if (error.response?.status === 404) {
    return { message: response.errorAr || 'العنصر غير موجود.' };
  }

  // Default error message
  return {
    message: response.errorAr || response.error || 'حدث خطأ. يرجى المحاولة مرة أخرى.'
  };
};
```

---

## 9. Testing Guide

### Test OTP Flow

```bash
# 1. Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "purpose": "login"}'

# Expected: { "success": true, "message": "OTP sent successfully" }

# 2. Verify OTP (use OTP from email)
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456", "purpose": "login"}'

# Expected: { "success": true, "accessToken": "...", "refreshToken": "..." }
```

### Test Notifications

```bash
# Get notifications
curl -X GET http://localhost:5000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Mark as read
curl -X PUT http://localhost:5000/api/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Push (Manual)

1. Open browser DevTools → Application → Service Workers
2. Verify sw.js is registered
3. Check Push subscription in Application → Service Workers
4. Use "Push" button in DevTools to test

---

## Summary Checklist

### ✅ Backend Tasks (ALL COMPLETED)
- [x] NotificationDeliveryService created (`src/services/notificationDelivery.service.js`)
- [x] EmailOTP model created (`src/models/emailOtp.model.js`)
- [x] OTP utilities created (`src/utils/otp.utils.js`)
- [x] OTP controller created (`src/controllers/otp.controller.js`)
- [x] Push subscription controller created (`src/controllers/pushSubscription.controller.js`)
- [x] Cron jobs configured (9 jobs in `src/utils/taskReminders.js`)
- [x] Rate limiting implemented (1 email/hour, OTP unlimited)
- [x] OTP routes added to `auth.route.js`
- [x] Push subscription routes added to `user.route.js`
- [x] pushSubscription + notificationPreferences fields added to User model

### Frontend Tasks
- [ ] Create authApi service (`services/authApi.js`)
- [ ] Create LoginWithOTP component (`components/LoginWithOTP.jsx`)
- [ ] Create SocketContext provider (`contexts/SocketContext.jsx`)
- [ ] Create NotificationBell component (`components/NotificationBell.jsx`)
- [ ] Create service worker (`public/sw.js`)
- [ ] Create pushNotifications utility (`utils/pushNotifications.js`)
- [ ] Create PushNotificationSettings component (`components/PushNotificationSettings.jsx`)
- [ ] Add environment variables to `.env`
- [ ] Test OTP flow
- [ ] Test Socket.io notifications
- [ ] Test push notifications

---

## 10. Important Notes for Frontend Developer

### Rate Limiting - What You Need to Know

| Email Type | Rate Limited? | Notes |
|------------|---------------|-------|
| **OTP** | NO | Always sends. Own limit: 5/hour, 1min between |
| **Password Reset** | NO | Always sends |
| **Welcome** | NO | Sent once on registration |
| **Reminders** | YES | 1 per hour max |
| **Notifications** | YES | 1 per hour max |

**Important**: OTP emails have their own rate limiting in the backend:
- Max 5 OTP requests per email per hour
- Must wait 60 seconds between OTP requests
- Max 3 verification attempts per OTP

### VAPID Public Key (Copy This)
```
BBPHXE1quI58UtPRW7BUWKGyqX7G2dJuYwsBpJi27_seabDaBY2J_c5GzN83rzBthjcx_iCtIkWX1z3x1iwf6J0
```

### API Base URLs
- **Auth OTP**: `/api/auth/send-otp`, `/api/auth/verify-otp`, `/api/auth/resend-otp`
- **Push Subscription**: `/api/users/push-subscription`, `/api/users/vapid-public-key`
- **Notifications**: `/api/notifications`, `/api/notifications/:id/read`
- **Reminders**: `/api/reminders`, `/api/reminders/:id/snooze`

### Socket.io Events to Listen For
```javascript
socket.on('notification', (data) => { /* new notification */ });
socket.on('notificationCount', (count) => { /* unread count update */ });
socket.on('notificationsRead', () => { /* all marked as read */ });
```

### Error Response Format
All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "English error message",
  "errorAr": "رسالة الخطأ بالعربية",
  "waitTime": 60  // Only for rate limit errors
}
```

---

## Questions?

Contact backend team for any integration issues.
