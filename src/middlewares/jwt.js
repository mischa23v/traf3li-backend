/**
 * JWT Authentication Middleware
 * Verifies JWT tokens from cookies or Authorization header
 * Includes token revocation checking via Redis + MongoDB blacklist
 */

const jwt = require('jsonwebtoken');
const { CustomException } = require('../utils');
const tokenRevocationService = require('../services/tokenRevocation.service');

/**
 * Verify JWT Token
 * Supports both cookie-based and header-based authentication
 * Checks token against revocation blacklist (Redis + MongoDB)
 */
const verifyToken = async (req, res, next) => {
    // Check for token in both cookies and Authorization header
    let token = req.cookies?.accessToken;

    // If no token in cookies, check Authorization header
    if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    try {
        if (!token) {
            throw CustomException('Authentication required', 401);
        }

        // 1. Verify JWT signature and expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            throw CustomException('Invalid token', 401);
        }

        // 2. Check if token has been revoked (blacklist check)
        // This is a fast Redis check (< 1ms) with MongoDB fallback
        const isRevoked = await tokenRevocationService.isTokenRevoked(token);

        if (isRevoked) {
            return res.status(401).json({
                error: true,
                message: 'Token has been revoked',
                code: 'TOKEN_REVOKED'
            });
        }

        // 3. Token is valid and not revoked - allow request
        req.userID = decoded._id;
        req.userId = decoded._id; // Alias for consistency
        req.isSeller = decoded.isSeller;
        req.token = token; // Store token for potential revocation on logout

        return next();
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
