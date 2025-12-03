const { Message, Conversation } = require('../models');
const { createNotification } = require('./notification.controller');
const { getIO } = require('../configs/socket');

const createMessage = async (request, response) => {
    const { conversationID, description } = request.body;
    
    try {
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

        const message = new Message({
            conversationID,
            userID: request.userID,
            description: description || '',
            attachments
        });
        
        await message.save();
        
        const conversation = await Conversation.findOneAndUpdate(
            { conversationID },
            {
                $set: {
                    readBySeller: request.isSeller,
                    readByBuyer: !request.isSeller,
                    lastMessage: description || '📎 Attachment'
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
            ? conversation.buyerID._id 
            : conversation.sellerID._id;
        
        const senderName = request.isSeller
            ? conversation.sellerID.username
            : conversation.buyerID.username;

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
        return response.status(status).send({
            error: true,
            message
        })
    }
};

const getMessages = async (request, response) => {
    const { conversationID } = request.params;
    
    try {
        const messages = await Message.find({ conversationID })
            .populate('userID', 'username image email')
            .populate('readBy.userId', 'username')
            .sort({ createdAt: 1 });
        
        return response.send(messages);
    }
    catch({message, status = 500}) {
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
        return response.status(status).send({
            error: true,
            message
        })
    }
};

module.exports = {
    createMessage,
    getMessages,
    markAsRead
};
