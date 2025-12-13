const jwt = require('jsonwebtoken');
const { CustomException } = require('../utils');

const userMiddleware = (request, response, next) => {
    // Check for token in both cookies and Authorization header
    let token = request.cookies.accessToken;

    // If no token in cookies, check Authorization header
    if (!token && request.headers.authorization) {
        const authHeader = request.headers.authorization;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    try {
        if(!token) {
            throw CustomException('Unauthorized access!', 401);
        }

        const verification = jwt.verify(token, process.env.JWT_SECRET);
        if(verification) {
            request.userID = verification._id;
            request.isSeller = verification.isSeller;
            return next();
        }

        throw CustomException('Invalid token', 401);
    }
    catch(error) {
        // Handle JWT-specific errors with 401 status
        if (error.name === 'TokenExpiredError') {
            return response.status(401).send({
                error: true,
                message: 'Token expired',
                code: 'TOKEN_EXPIRED',
                expiredAt: error.expiredAt
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return response.status(401).send({
                error: true,
                message: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        if (error.name === 'NotBeforeError') {
            return response.status(401).send({
                error: true,
                message: 'Token not yet valid',
                code: 'TOKEN_NOT_ACTIVE'
            });
        }

        // Handle custom exceptions and other errors
        const status = error.status || 500;
        const message = error.message || 'Authentication failed';

        return response.status(status).send({
            error: true,
            message
        });
    }
}

module.exports = userMiddleware;