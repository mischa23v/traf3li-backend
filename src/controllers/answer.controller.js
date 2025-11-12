const { Answer, Question, User } = require('../models');
const { CustomException } = require('../utils');

// Create answer
const createAnswer = async (request, response) => {
    const { questionId, content } = request.body;
    try {
        // Check if user is a lawyer
        const user = await User.findById(request.userID);
        if (user.role !== 'lawyer') {
            throw CustomException('Only lawyers can answer questions!', 403);
        }

        const answer = new Answer({
            questionId,
            lawyerId: request.userID,
            content
        });

        await answer.save();

        // Add answer to question
        await Question.findByIdAndUpdate(questionId, {
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
        const answers = await Answer.find({ questionId })
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
        const answer = await Answer.findById(_id);

        if (!answer) {
            throw CustomException('Answer not found!', 404);
        }

        if (answer.lawyerId.toString() !== request.userID) {
            throw CustomException('You can only update your own answers!', 403);
        }

        const updatedAnswer = await Answer.findByIdAndUpdate(
            _id,
            { $set: request.body },
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
        const answer = await Answer.findById(_id);

        if (!answer) {
            throw CustomException('Answer not found!', 404);
        }

        if (answer.lawyerId.toString() !== request.userID) {
            throw CustomException('You can only delete your own answers!', 403);
        }

        // Remove from question
        await Question.findByIdAndUpdate(answer.questionId, {
            $pull: { answers: _id }
        });

        await Answer.deleteOne({ _id });

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
const likeAnswer = async (request, response) => {
    const { _id } = request.params;
    try {
        const answer = await Answer.findByIdAndUpdate(
            _id,
            { $inc: { likes: 1 } },
            { new: true }
        );

        if (!answer) {
            throw CustomException('Answer not found!', 404);
        }

        return response.status(202).send({
            error: false,
            message: 'Answer liked!',
            answer
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
        const answer = await Answer.findByIdAndUpdate(
            _id,
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
