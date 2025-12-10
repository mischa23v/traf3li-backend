const jwt = require('jsonwebtoken');
const { CustomException } = require("../utils");

const authenticate = (request, response, next) => {
    const { accessToken } = request.cookies;

    // Debug logging for cookie issues
    console.log('[AUTH DEBUG] authenticate middleware called');
    console.log('[AUTH DEBUG] Origin:', request.headers.origin);
    console.log('[AUTH DEBUG] Cookie header:', request.headers.cookie ? 'present' : 'missing');
    console.log('[AUTH DEBUG] Cookies parsed:', Object.keys(request.cookies || {}));
    console.log('[AUTH DEBUG] accessToken present:', !!accessToken);

    try {
        if (!accessToken) {
            console.log('[AUTH DEBUG] No accessToken in cookies - returning 401');
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