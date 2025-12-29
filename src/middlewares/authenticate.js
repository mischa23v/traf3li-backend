const jwt = require('jsonwebtoken');
const { CustomException } = require("../utils");
const logger = require('../utils/contextLogger');

const authenticate = (request, response, next) => {
    // Check for token in both cookies and Authorization header (matching jwt.js behavior)
    let accessToken = request.cookies?.accessToken;

    // If no token in cookies, check Authorization header
    if (!accessToken && request.headers.authorization) {
        const authHeader = request.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    try {
        if (!accessToken) {
            logger.warn('Authentication failed - no token provided', {
                endpoint: request.originalUrl,
                method: request.method,
                ip: request.ip || request.headers['x-forwarded-for']?.split(',')[0]
            });
            return response.status(401).json({
                error: true,
                message: 'Authentication required',
                messageEn: 'Authentication required',
                messageAr: 'المصادقة مطلوبة',
                code: 'NO_TOKEN'
            });
        }

        const verification = jwt.verify(accessToken, process.env.JWT_SECRET);
        if(verification) {
            // Handle both 'id' and '_id' in token payload (generateToken uses 'id')
            request.userID = verification._id || verification.id;
            return next();
        }

        // This shouldn't be reached if verify succeeds, but keep for safety
        logger.warn('Token verification succeeded but no user ID found');
        return response.status(401).json({
            error: true,
            message: 'Invalid token',
            messageEn: 'Invalid token',
            messageAr: 'رمز غير صالح',
            code: 'INVALID_TOKEN'
        });
    }
    catch(error) {
        // Handle JWT-specific errors with detailed logging
        if (error.name === 'TokenExpiredError') {
            logger.info('Token expired', {
                expiredAt: error.expiredAt,
                endpoint: request.originalUrl
            });
            return response.status(401).json({
                error: true,
                message: 'Token expired',
                messageEn: 'Token expired',
                messageAr: 'انتهت صلاحية الرمز',
                code: 'TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
        }

        if (error.name === 'JsonWebTokenError') {
            logger.warn('Invalid JWT token', {
                error: error.message,
                endpoint: request.originalUrl
            });
            return response.status(401).json({
                error: true,
                message: 'Invalid token',
                messageEn: 'Invalid token',
                messageAr: 'رمز غير صالح',
                code: 'INVALID_TOKEN'
            });
        }

        if (error.name === 'NotBeforeError') {
            logger.warn('Token not yet valid', {
                date: error.date,
                endpoint: request.originalUrl
            });
            return response.status(401).json({
                error: true,
                message: 'Token not yet valid',
                messageEn: 'Token not yet valid',
                messageAr: 'الرمز ليس صالحاً بعد',
                code: 'TOKEN_NOT_ACTIVE'
            });
        }

        // Generic authentication error
        const status = error.status || 401;
        logger.error('Authentication failed', {
            error: error.message,
            status,
            endpoint: request.originalUrl
        });

        return response.status(status).json({
            error: true,
            message: 'Authentication failed',
            messageEn: 'Authentication failed',
            messageAr: 'فشلت المصادقة',
            code: 'AUTH_FAILED'
        });
    }
}

module.exports = authenticate;
