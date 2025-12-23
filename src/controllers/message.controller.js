const { Message, Conversation } = require('../models');
const { createNotification } = require('./notification.controller');
const { getIO } = require('../configs/socket');
const { pickAllowedFields, sanitizeForLog, sanitizeString } = require('../utils/securityUtils');

/**
 * Escape HTML entities to prevent XSS attacks
 * Prevents script injection in message content
 */
const escapeHtml = (text) => {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, char => map[char]);
};

const createMessage = async (request, response) => {
    try {
        // SECURITY: Mass assignment protection - only allow specific fields
        const allowedFields = ['conversationID', 'description'];
        const safeInput = pickAllowedFields(request.body, allowedFields);

        const { conversationID, description } = safeInput;

        // Validate required fields
        if (!conversationID) {
            return response.status(400).send({
                error: true,
                message: 'conversationID is required'
            });
        }

        // SECURITY: IDOR Protection - Verify user is a participant in this conversation
        const conversation = await Conversation.findOne({ conversationID })
            .populate('sellerID buyerID', '_id username');

        if (!conversation) {
            return response.status(404).send({
                error: true,
                message: 'Conversation not found'
            });
        }

        // Verify user is either seller or buyer in this conversation
        const userIdString = request.userID.toString();
        const isParticipant =
            conversation.sellerID._id.toString() === userIdString ||
            conversation.buyerID._id.toString() === userIdString;

        if (!isParticipant) {
            console.error(`IDOR attempt: User ${sanitizeForLog(userIdString)} tried to access conversation ${sanitizeForLog(conversationID)}`);
            return response.status(403).send({
                error: true,
                message: 'Unauthorized access to this conversation'
            });
        }

        // Handle attachments
        const attachments = [];
        if (request.files && request.files.length > 0) {
            request.files.forEach(file => {
                const fileType = file.mimetype.startsWith('image/') ? 'image' :
                                file.mimetype.startsWith('video/') ? 'video' :
                                file.mimetype.includes('pdf') || file.mimetype.includes('document') ? 'document' :
                                'other';

                attachments.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    url: `/uploads/messages/${file.filename}`,
                    type: fileType
                });
            });
        }

        // SECURITY: XSS Protection - Sanitize and escape description content
        const sanitizedDescription = escapeHtml(sanitizeString(description || ''));

        const message = new Message({
            conversationID,
            userID: request.userID,
            description: sanitizedDescription,
            attachments
        });

        await message.save();

        const updatedConversation = await Conversation.findOneAndUpdate(
            { conversationID },
            {
                $set: {
                    readBySeller: request.isSeller,
                    readByBuyer: !request.isSeller,
                    lastMessage: sanitizedDescription || '📎 Attachment'
                }
            },
            { new: true }
        ).populate('sellerID buyerID', 'username');

        // Populate message
        await message.populate('userID', 'username image email');

        // Emit via Socket.io
        const io = getIO();
        io.to(conversationID).emit('message:receive', {
            message,
            conversationID
        });

        // Create notification for recipient
        const recipientId = request.isSeller
            ? updatedConversation.buyerID._id
            : updatedConversation.sellerID._id;

        const senderName = request.isSeller
            ? updatedConversation.sellerID.username
            : updatedConversation.buyerID.username;

        await createNotification({
            userId: recipientId,
            type: 'message',
            title: 'رسالة جديدة',
            message: `رسالة جديدة من ${senderName}`,
            link: `/messages/${conversationID}`,
            data: {
                conversationID,
                senderId: request.userID
            },
            icon: '💬',
            priority: 'medium'
        });

        return response.status(201).send(message);
    }
    catch({message, status = 500}) {
        console.error(`Error creating message: ${sanitizeForLog(message)}`);
        return response.status(status).send({
            error: true,
            message
        })
    }
};

const getMessages = async (request, response) => {
    const { conversationID } = request.params;

    try {
        // SECURITY: IDOR Protection - Verify user is a participant in this conversation
        const conversation = await Conversation.findOne({ conversationID });

        if (!conversation) {
            return response.status(404).send({
                error: true,
                message: 'Conversation not found'
            });
        }

        // Verify user is either seller or buyer in this conversation
        const userIdString = request.userID.toString();
        const isParticipant =
            conversation.sellerID.toString() === userIdString ||
            conversation.buyerID.toString() === userIdString;

        if (!isParticipant) {
            console.error(`IDOR attempt: User ${sanitizeForLog(userIdString)} tried to access messages from conversation ${sanitizeForLog(conversationID)}`);
            return response.status(403).send({
                error: true,
                message: 'Unauthorized access to this conversation'
            });
        }

        const messages = await Message.find({ conversationID })
            .populate('userID', 'username image email')
            .populate('readBy.userId', 'username')
            .sort({ createdAt: 1 });

        return response.send(messages);
    }
    catch({message, status = 500}) {
        console.error(`Error retrieving messages: ${sanitizeForLog(message)}`);
        return response.status(status).send({
            error: true,
            message
        })
    }
};

// Mark messages as read
const markAsRead = async (request, response) => {
    const { conversationID } = request.params;

    try {
        // SECURITY: IDOR Protection - Verify user is a participant in this conversation
        const conversation = await Conversation.findOne({ conversationID });

        if (!conversation) {
            return response.status(404).send({
                error: true,
                message: 'Conversation not found'
            });
        }

        // Verify user is either seller or buyer in this conversation
        const userIdString = request.userID.toString();
        const isParticipant =
            conversation.sellerID.toString() === userIdString ||
            conversation.buyerID.toString() === userIdString;

        if (!isParticipant) {
            console.error(`IDOR attempt: User ${sanitizeForLog(userIdString)} tried to mark messages as read in conversation ${sanitizeForLog(conversationID)}`);
            return response.status(403).send({
                error: true,
                message: 'Unauthorized access to this conversation'
            });
        }

        await Message.updateMany(
            {
                conversationID,
                userID: { $ne: request.userID },
                'readBy.userId': { $ne: request.userID }
            },
            {
                $push: {
                    readBy: {
                        userId: request.userID,
                        readAt: new Date()
                    }
                }
            }
        );

        // Emit read status via Socket.io
        const io = getIO();
        io.to(conversationID).emit('messages:read', {
            userId: request.userID,
            conversationID
        });

        return response.send({ success: true });
    }
    catch({message, status = 500}) {
        console.error(`Error marking messages as read: ${sanitizeForLog(message)}`);
        return response.status(status).send({
            error: true,
            message
        })
    }
};

// Get message stats
const getMessageStats = async (request, response) => {
    const userId = request.userID;

    try {
        // Get all conversations where user is a participant
        const conversations = await Conversation.find({
            $or: [
                { sellerID: userId },
                { buyerID: userId }
            ]
        });

        const conversationIds = conversations.map(c => c.conversationID);
        const totalConversations = conversations.length;

        // Count unread conversations (where the read flag for current user is false)
        const unreadConversations = conversations.filter(conv => {
            const isSeller = conv.sellerID.toString() === userId.toString();
            return isSeller ? !conv.readBySeller : !conv.readByBuyer;
        }).length;

        // Count total unread messages (messages not sent by user and not in readBy)
        const unreadMessages = await Message.countDocuments({
            conversationID: { $in: conversationIds },
            userID: { $ne: userId },
            'readBy.userId': { $ne: userId }
        });

        // Count total messages in user's conversations
        const totalMessages = await Message.countDocuments({
            conversationID: { $in: conversationIds }
        });

        return response.send({
            success: true,
            data: {
                unreadMessages,
                unreadConversations,
                totalConversations,
                totalMessages
            }
        });
    }
    catch({message, status = 500}) {
        console.error(`Error retrieving message stats: ${sanitizeForLog(message)}`);
        return response.status(status).send({
            error: true,
            message
        })
    }
};

module.exports = {
    createMessage,
    getMessages,
    markAsRead,
    getMessageStats
};
