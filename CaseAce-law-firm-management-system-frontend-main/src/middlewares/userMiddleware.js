const jwt = require('jsonwebtoken');
const { CustomException } = require('../utils');
const { authLogout } = require('../controllers/auth.controller');

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