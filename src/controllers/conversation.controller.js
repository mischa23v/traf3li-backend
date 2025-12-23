const { Conversation } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

const createConversation = async (request, response) => {
    try {
        // Mass assignment protection - only allow specific fields
        const allowedFields = pickAllowedFields(request.body, ['to', 'from']);
        const { to, from } = allowedFields;

        // Input validation
        if (!to || !from) {
            throw CustomException('Both "to" and "from" fields are required', 400);
        }

        // Sanitize ObjectIds to prevent injection
        const sanitizedTo = sanitizeObjectId(to);
        const sanitizedFrom = sanitizeObjectId(from);

        if (!sanitizedTo || !sanitizedFrom) {
            throw CustomException('Invalid user IDs provided', 400);
        }

        // IDOR protection - ensure the authenticated user is part of the conversation
        if (request.isSeller && sanitizedFrom !== request.userID) {
            throw CustomException('Unauthorized: You can only create conversations as yourself', 403);
        }
        if (!request.isSeller && sanitizedTo !== request.userID && sanitizedFrom !== request.userID) {
            throw CustomException('Unauthorized: You must be part of the conversation', 403);
        }

        const conversation = new Conversation({
            sellerID: request.isSeller ? request.userID : sanitizedTo,
            buyerID: request.isSeller ? sanitizedFrom : request.userID,
            readBySeller: request.isSeller,
            readByBuyer: !request.isSeller
        });

        await conversation.save();
        return response.status(201).send(conversation);
    }
    catch ({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const getConversations = async (request, response) => {
    try {
        const conversation = await Conversation.find(request.isSeller ? { sellerID: request.userID } : { buyerID: request.userID }).populate(request.isSeller ? 'buyerID' : 'sellerID', 'username image email').sort({ updatedAt: -1 });
        return response.send(conversation);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const getSingleConversation = async (request, response) => {
    try {
        const { sellerID, buyerID } = request.params;

        // Input validation
        if (!sellerID || !buyerID) {
            throw CustomException('Both sellerID and buyerID are required', 400);
        }

        // Sanitize ObjectIds to prevent injection
        const sanitizedSellerID = sanitizeObjectId(sellerID);
        const sanitizedBuyerID = sanitizeObjectId(buyerID);

        if (!sanitizedSellerID || !sanitizedBuyerID) {
            throw CustomException('Invalid IDs provided', 400);
        }

        const conversation = await Conversation.findOne({ sellerID: sanitizedSellerID, buyerID: sanitizedBuyerID });

        if (!conversation) {
            throw CustomException('No such conversation found!', 404);
        }

        // IDOR protection - ensure the authenticated user is part of this conversation
        const isAuthorized = (
            conversation.sellerID.toString() === request.userID ||
            conversation.buyerID.toString() === request.userID
        );

        if (!isAuthorized) {
            throw CustomException('Unauthorized: You can only access your own conversations', 403);
        }

        return response.send(conversation);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const updateConversation = async (request, response) => {
    try {
        const { conversationID } = request.params;

        // Input validation
        if (!conversationID) {
            throw CustomException('conversationID is required', 400);
        }

        // Sanitize ObjectId to prevent injection
        const sanitizedConversationID = sanitizeObjectId(conversationID);

        if (!sanitizedConversationID) {
            throw CustomException('Invalid conversationID provided', 400);
        }

        // First, fetch the conversation to verify ownership
        const existingConversation = await Conversation.findOne({ conversationID: sanitizedConversationID });

        if (!existingConversation) {
            throw CustomException('Conversation not found', 404);
        }

        // IDOR protection - ensure the authenticated user is part of this conversation
        const isAuthorized = (
            existingConversation.sellerID.toString() === request.userID ||
            existingConversation.buyerID.toString() === request.userID
        );

        if (!isAuthorized) {
            throw CustomException('Unauthorized: You can only update your own conversations', 403);
        }

        // Mass assignment protection - only allow specific fields to be updated
        const allowedFields = pickAllowedFields(request.body, ['readBySeller', 'readByBuyer']);

        // Build update object with only allowed fields
        const updateData = {};
        if (allowedFields.readBySeller !== undefined) {
            updateData.readBySeller = Boolean(allowedFields.readBySeller);
        }
        if (allowedFields.readByBuyer !== undefined) {
            updateData.readByBuyer = Boolean(allowedFields.readByBuyer);
        }

        // If no valid fields to update, use default behavior (mark as read)
        if (Object.keys(updateData).length === 0) {
            updateData.readBySeller = true;
            updateData.readByBuyer = true;
        }

        const conversation = await Conversation.findOneAndUpdate(
            { conversationID: sanitizedConversationID },
            { $set: updateData },
            { new: true }
        );

        return response.send(conversation);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

module.exports = {
    createConversation,
    getConversations,
    getSingleConversation,
    updateConversation
}