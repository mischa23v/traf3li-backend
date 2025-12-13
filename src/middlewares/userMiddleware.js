const jwt = require('jsonwebtoken');
const { CustomException } = require('../utils');

const userMiddleware = (request, response, next) => {
    // ══════════════════════════════════════════════════════════════════
    // 🔍 DEBUG: User Middleware (JWT Verification)
    // ══════════════════════════════════════════════════════════════════
    console.log('\n' + '─'.repeat(80));
    console.log('🔐 [USER MIDDLEWARE] Starting JWT verification...');
    console.log('📍 Route:', request.method, request.originalUrl);
    console.log('🍪 Cookie Token Present:', !!request.cookies.accessToken);
    console.log('🔑 Auth Header Present:', !!request.headers.authorization);
    console.log('─'.repeat(80));

    // Check for token in both cookies and Authorization header
    let token = request.cookies.accessToken;

    // If no token in cookies, check Authorization header
    if (!token && request.headers.authorization) {
        const authHeader = request.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
            console.log('🔑 [USER MIDDLEWARE] Using token from Authorization header');
        }
    } else if (token) {
        console.log('🍪 [USER MIDDLEWARE] Using token from cookie');
    }

    try {
        if(!token) {
            console.log('❌ [USER MIDDLEWARE] No token found!');
            throw CustomException('Unauthorized access!', 401);
        }

        console.log('🔍 [USER MIDDLEWARE] Verifying token...');
        console.log('📋 Token length:', token.length);
        console.log('📋 Token preview:', token.substring(0, 20) + '...');

        const verification = jwt.verify(token, process.env.JWT_SECRET);
        if(verification) {
            console.log('✅ [USER MIDDLEWARE] Token verified successfully!');
            console.log('👤 User ID:', verification._id);
            console.log('🏷️ Is Seller:', verification.isSeller);
            console.log('📋 Token payload:', JSON.stringify(verification, null, 2));

            request.userID = verification._id;
            request.isSeller = verification.isSeller;

            console.log('✅ [USER MIDDLEWARE] Calling next()');
            console.log('─'.repeat(80) + '\n');
            return next();
        }

        console.log('❌ [USER MIDDLEWARE] Token verification returned falsy');
        throw CustomException('Invalid token', 401);
    }
    catch(error) {
        console.log('❌ [USER MIDDLEWARE] ERROR!');
        console.log('🔴 Error Name:', error.name);
        console.log('🔴 Error Message:', error.message);
        console.log('─'.repeat(80) + '\n');

        // Handle JWT-specific errors with 401 status
        if (error.name === 'TokenExpiredError') {
            console.log('🔴 [USER MIDDLEWARE] Token expired at:', error.expiredAt);
            return response.status(401).send({
                error: true,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
        }
        if (error.name === 'JsonWebTokenError') {
            console.log('🔴 [USER MIDDLEWARE] Invalid JWT');
            return response.status(401).send({
                error: true,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        if (error.name === 'NotBeforeError') {
            console.log('🔴 [USER MIDDLEWARE] Token not yet valid');
            return response.status(401).send({
                error: true,
                message: 'Token not yet valid',
                code: 'TOKEN_NOT_ACTIVE'
            });
        }

        // Handle custom exceptions and other errors
        const status = error.status || 500;
        const message = error.message || 'Authentication failed';

        console.log('🔴 [USER MIDDLEWARE] Returning status:', status);
        return response.status(status).send({
            error: true,
            message
        });
    }
}

module.exports = userMiddleware;