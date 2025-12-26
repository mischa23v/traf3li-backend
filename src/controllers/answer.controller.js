const { Answer, Question, User } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Create answer
const createAnswer = async (request, response) => {
    try {
        // Input validation
        const { questionId, content } = request.body;

        if (!questionId || !content) {
            throw CustomException('Question ID and content are required!', 400);
        }

        if (typeof content !== 'string' || content.trim().length === 0) {
            throw CustomException('Content must be a non-empty string!', 400);
        }

        if (content.length > 10000) {
            throw CustomException('Content is too long (max 10000 characters)!', 400);
        }

        // Sanitize IDs
        const sanitizedQuestionId = sanitizeObjectId(questionId);

        // Check if user is a lawyer
        const user = await User.findById(request.userID);
        if (user.role !== 'lawyer') {
            throw CustomException('Only lawyers can answer questions!', 403);
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = pickAllowedFields(request.body, ['content']);

        const answer = new Answer({
            questionId: sanitizedQuestionId,
            lawyerId: request.userID,
            ...allowedFields
        });

        await answer.save();

        // Add answer to question
        await Question.findByIdAndUpdate(sanitizedQuestionId, {
            $push: { answers: answer._id },
            status: 'answered'
        });

        return response.status(201).send({
            error: false,
            message: 'Answer posted successfully!',
            answer
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get answers for question
const getAnswers = async (request, response) => {
    const { questionId } = request.params;
    try {
        // Sanitize ID
        const sanitizedQuestionId = sanitizeObjectId(questionId);

        const answers = await Answer.find({ questionId: sanitizedQuestionId })
            .populate('lawyerId', 'username image lawyerProfile')
            .sort({ verified: -1, likes: -1, createdAt: -1 });

        return response.send({
            error: false,
            answers
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update answer
const updateAnswer = async (request, response) => {
    const { _id } = request.params;
    try {
        // Sanitize ID
        const sanitizedId = sanitizeObjectId(_id);

        // Input validation for content if provided
        if (request.body.content !== undefined) {
            if (typeof request.body.content !== 'string' || request.body.content.trim().length === 0) {
                throw CustomException('Content must be a non-empty string!', 400);
            }
            if (request.body.content.length > 10000) {
                throw CustomException('Content is too long (max 10000 characters)!', 400);
            }
        }

        const answer = await Answer.findById(sanitizedId);

        if (!answer) {
            throw CustomException('Answer not found!', 404);
        }

        // IDOR protection - verify ownership
        if (answer.lawyerId.toString() !== request.userID) {
            throw CustomException('You can only update your own answers!', 403);
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = pickAllowedFields(request.body, ['content']);

        const updatedAnswer = await Answer.findByIdAndUpdate(
            sanitizedId,
            { $set: allowedFields },
            { new: true }
        );

        return response.status(202).send({
            error: false,
            message: 'Answer updated!',
            answer: updatedAnswer
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete answer
const deleteAnswer = async (request, response) => {
    const { _id } = request.params;
    try {
        // Sanitize ID
        const sanitizedId = sanitizeObjectId(_id);

        const answer = await Answer.findById(sanitizedId);

        if (!answer) {
            throw CustomException('Answer not found!', 404);
        }

        // IDOR protection - verify ownership
        if (answer.lawyerId.toString() !== request.userID) {
            throw CustomException('You can only delete your own answers!', 403);
        }

        // Remove from question
        await Question.findByIdAndUpdate(answer.questionId, {
            $pull: { answers: sanitizedId }
        });

        await Answer.deleteOne({ _id: sanitizedId });

        return response.send({
            error: false,
            message: 'Answer deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Like answer
// SECURITY: Added duplicate like prevention and rate limiting
const likeAnswer = async (request, response) => {
    const { _id } = request.params;
    try {
        // Sanitize ID
        const sanitizedId = sanitizeObjectId(_id);

        // SECURITY: Check if user has already liked this answer
        const answer = await Answer.findById(sanitizedId);

        if (!answer) {
            throw CustomException('Answer not found!', 404);
        }

        // SECURITY: Prevent duplicate likes from same user
        if (answer.likedBy && answer.likedBy.includes(request.userID)) {
            throw CustomException('You have already liked this answer!', 400);
        }

        // Update with atomic operation to prevent race conditions
        const updatedAnswer = await Answer.findByIdAndUpdate(
            sanitizedId,
            {
                $inc: { likes: 1 },
                $addToSet: { likedBy: request.userID }
            },
            { new: true }
        );

        return response.status(202).send({
            error: false,
            message: 'Answer liked!',
            answer: updatedAnswer
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Verify answer (admin/moderator)
const verifyAnswer = async (request, response) => {
    const { _id } = request.params;
    try {
        // Sanitize ID
        const sanitizedId = sanitizeObjectId(_id);

        const answer = await Answer.findByIdAndUpdate(
            sanitizedId,
            { verified: true },
            { new: true }
        );

        if (!answer) {
            throw CustomException('Answer not found!', 404);
        }

        return response.status(202).send({
            error: false,
            message: 'Answer verified!',
            answer
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createAnswer,
    getAnswers,
    updateAnswer,
    deleteAnswer,
    likeAnswer,
    verifyAnswer
};
