const jwt = require('jsonwebtoken');
const { CustomException } = require("../utils");

const authenticate = (request, response, next) => {
    const { accessToken } = request.cookies;
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Detailed debug logging to diagnose 401 issues
    console.log(`[AUTH ${requestId}] ========== /auth/me REQUEST ==========`);
    console.log(`[AUTH ${requestId}] Path: ${request.path}`);
    console.log(`[AUTH ${requestId}] Origin: ${request.headers.origin || 'none'}`);
    console.log(`[AUTH ${requestId}] Referer: ${request.headers.referer || 'none'}`);
    console.log(`[AUTH ${requestId}] User-Agent: ${(request.headers['user-agent'] || '').substring(0, 50)}`);
    console.log(`[AUTH ${requestId}] Cookie header raw: ${request.headers.cookie ? request.headers.cookie.substring(0, 100) + '...' : 'MISSING'}`);
    console.log(`[AUTH ${requestId}] Parsed cookies: ${JSON.stringify(Object.keys(request.cookies || {}))}`);
    console.log(`[AUTH ${requestId}] accessToken present: ${!!accessToken}`);
    if (accessToken) {
        console.log(`[AUTH ${requestId}] accessToken length: ${accessToken.length}`);
        console.log(`[AUTH ${requestId}] accessToken prefix: ${accessToken.substring(0, 20)}...`);
    }

    try {
        if (!accessToken) {
            console.log(`[AUTH ${requestId}] ❌ FAILURE: No accessToken cookie`);
            console.log(`[AUTH ${requestId}] This means browser did NOT send the cookie`);
            console.log(`[AUTH ${requestId}] Check: SameSite, Secure, Domain settings`);
            throw CustomException('Access denied - no token', 401);
        }

        const verification = jwt.verify(accessToken, process.env.JWT_SECRET);
        if(verification) {
            console.log(`[AUTH ${requestId}] ✅ SUCCESS: Token valid for user ${verification._id}`);
            request.userID = verification._id;
            return next();
        }

        console.log(`[AUTH ${requestId}] ❌ FAILURE: Token verification returned falsy`);
        throw CustomException('Access denied - invalid token', 401);
    }
    catch(error) {
        // Detailed error logging
        if (error.name === 'TokenExpiredError') {
            console.log(`[AUTH ${requestId}] ❌ FAILURE: Token EXPIRED at ${error.expiredAt}`);
            return response.status(401).send({
                error: true,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
        }
        if (error.name === 'JsonWebTokenError') {
            console.log(`[AUTH ${requestId}] ❌ FAILURE: Invalid token - ${error.message}`);
            return response.status(401).send({
                error: true,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        if (error.name === 'NotBeforeError') {
            console.log(`[AUTH ${requestId}] ❌ FAILURE: Token not yet valid`);
            return response.status(401).send({
                error: true,
                message: 'Token not yet valid',
                code: 'TOKEN_NOT_ACTIVE'
            });
        }

        // Custom exception or other error
        const status = error.status || 500;
        const message = error.message || 'Authentication failed';
        console.log(`[AUTH ${requestId}] ❌ FAILURE: ${message} (status: ${status})`);

        return response.status(status).send({
            error: true,
            message
        });
    }
}

module.exports = authenticate;