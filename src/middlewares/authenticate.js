const jwt = require('jsonwebtoken');
const { CustomException } = require("../utils");

const authenticate = (request, response, next) => {
    const { accessToken } = request.cookies;

    try {
        if (!accessToken) {
            throw CustomException('Access denied - no token', 401);
        }

        const verification = jwt.verify(accessToken, process.env.JWT_SECRET);
        if(verification) {
            request.userID = verification._id;
            return next();
        }

        throw CustomException('Access denied - invalid token', 401);
    }
    catch(error) {
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

        const status = error.status || 500;
        const message = error.message || 'Authentication failed';

        return response.status(status).send({
            error: true,
            message
        });
    }
}

module.exports = authenticate;
