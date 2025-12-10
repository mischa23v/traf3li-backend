/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from cookies or Authorization header
 */

const jwt = require('jsonwebtoken');
const { CustomException } = require('../utils');

/**
 * Verify JWT Token
 * Supports both cookie-based and header-based authentication
 */
const verifyToken = (req, res, next) => {
    // Check for token in both cookies and Authorization header
    let token = req.cookies?.accessToken;

    // Debug logging for cookie issues
    console.log('[AUTH DEBUG] verifyToken middleware called');
    console.log('[AUTH DEBUG] Origin:', req.headers.origin);
    console.log('[AUTH DEBUG] Cookie header raw:', req.headers.cookie);
    console.log('[AUTH DEBUG] Cookies parsed:', Object.keys(req.cookies || {}));
    console.log('[AUTH DEBUG] accessToken from cookie:', token ? 'present' : 'missing');

    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
            console.log('[AUTH DEBUG] accessToken from Authorization header:', 'present');
        }
    }

    try {
        if (!token) {
            console.log('[AUTH DEBUG] No token found - returning 401');
            throw CustomException('Authentication required', 401);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded) {
            req.userID = decoded._id;
            req.userId = decoded._id; // Alias for consistency
            req.isSeller = decoded.isSeller;
            return next();
        }

        throw CustomException('Invalid token', 401);
    } catch (error) {
        // Handle JWT-specific errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: true,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: true,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }

        // Handle custom exceptions
        const status = error.status || 401;
        const message = error.message || 'Authentication failed';
        return res.status(status).json({
            error: true,
            message
        });
    }
};

module.exports = {
    verifyToken
};
