const { LegalDocument, User } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Create legal document
const createDocument = async (request, response) => {
    try {
        // Check if user is lawyer or admin
        const user = await User.findById(request.userID);
        if (user.role !== 'lawyer' && user.role !== 'admin') {
            throw CustomException('Only lawyers and admins can create legal documents!', 403);
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = ['title', 'summary', 'content', 'category', 'type', 'keywords', 'fileUrl', 'author', 'publicationDate', 'accessLevel'];
        const documentData = pickAllowedFields(request.body, allowedFields);

        // Input validation
        if (!documentData.title || typeof documentData.title !== 'string' || documentData.title.trim().length === 0) {
            throw CustomException('Title is required and must be a non-empty string!', 400);
        }

        if (!documentData.content || typeof documentData.content !== 'string' || documentData.content.trim().length === 0) {
            throw CustomException('Content is required and must be a non-empty string!', 400);
        }

        if (documentData.category && typeof documentData.category !== 'string') {
            throw CustomException('Category must be a string!', 400);
        }

        if (documentData.type && typeof documentData.type !== 'string') {
            throw CustomException('Type must be a string!', 400);
        }

        // Prevent path traversal attacks in fileUrl
        if (documentData.fileUrl) {
            if (typeof documentData.fileUrl !== 'string') {
                throw CustomException('fileUrl must be a string!', 400);
            }
            // Check for path traversal patterns
            if (documentData.fileUrl.includes('..') || documentData.fileUrl.includes('\\')) {
                throw CustomException('Invalid file path detected!', 400);
            }
        }

        // Validate keywords array
        if (documentData.keywords && !Array.isArray(documentData.keywords)) {
            throw CustomException('Keywords must be an array!', 400);
        }

        // Validate accessLevel
        const validAccessLevels = ['public', 'lawyers-only', 'admin-only'];
        if (documentData.accessLevel && !validAccessLevels.includes(documentData.accessLevel)) {
            throw CustomException('Invalid access level!', 400);
        }

        const document = new LegalDocument({
            ...documentData,
            author: documentData.author || user.username,
            accessLevel: documentData.accessLevel || 'public'
        });

        await document.save();

        return response.status(201).send({
            error: false,
            message: 'Legal document created successfully!',
            document
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all documents
const getDocuments = async (request, response) => {
    const { search, category, type, accessLevel } = request.query;
    try {
        const user = await User.findById(request.userID).catch(() => null);

        const filters = {
            ...(search && { $text: { $search: search } }),
            ...(category && { category }),
            ...(type && { type }),
            ...(accessLevel && { accessLevel })
        };

        // Filter by access level
        if (!user || user.role === 'client') {
            filters.accessLevel = 'public';
        } else if (user.role === 'lawyer') {
            filters.accessLevel = { $in: ['public', 'lawyers-only'] };
        }
        // Admins can see all

        const documents = await LegalDocument.find(filters)
            .sort({ publicationDate: -1, createdAt: -1 })
            .select('-content'); // Don't return full content in list

        return response.send({
            error: false,
            documents
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single document
const getDocument = async (request, response) => {
    try {
        // Sanitize ID to prevent injection attacks
        const documentId = sanitizeObjectId(request.params._id);

        const document = await LegalDocument.findById(documentId);

        if (!document) {
            throw CustomException('Document not found!', 404);
        }

        // Check access
        const user = await User.findById(request.userID).catch(() => null);

        if (document.accessLevel === 'lawyers-only' && (!user || user.role === 'client')) {
            throw CustomException('This document is only accessible to lawyers!', 403);
        }

        if (document.accessLevel === 'admin-only' && (!user || user.role !== 'admin')) {
            throw CustomException('This document is only accessible to admins!', 403);
        }

        // Increment views
        document.views += 1;
        await document.save();

        return response.send({
            error: false,
            document
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update document
const updateDocument = async (request, response) => {
    try {
        // Check if user is admin
        const user = await User.findById(request.userID);
        if (user.role !== 'admin') {
            throw CustomException('Only admins can update legal documents!', 403);
        }

        // Sanitize ID to prevent injection attacks
        const documentId = sanitizeObjectId(request.params._id);

        // Mass assignment protection - only allow specific fields
        const allowedFields = ['title', 'summary', 'content', 'category', 'type', 'keywords', 'fileUrl', 'author', 'publicationDate', 'accessLevel'];
        const updateData = pickAllowedFields(request.body, allowedFields);

        // Input validation
        if (updateData.title !== undefined) {
            if (typeof updateData.title !== 'string' || updateData.title.trim().length === 0) {
                throw CustomException('Title must be a non-empty string!', 400);
            }
        }

        if (updateData.content !== undefined) {
            if (typeof updateData.content !== 'string' || updateData.content.trim().length === 0) {
                throw CustomException('Content must be a non-empty string!', 400);
            }
        }

        // Prevent path traversal attacks in fileUrl
        if (updateData.fileUrl) {
            if (typeof updateData.fileUrl !== 'string') {
                throw CustomException('fileUrl must be a string!', 400);
            }
            if (updateData.fileUrl.includes('..') || updateData.fileUrl.includes('\\')) {
                throw CustomException('Invalid file path detected!', 400);
            }
        }

        // Validate keywords array
        if (updateData.keywords !== undefined && !Array.isArray(updateData.keywords)) {
            throw CustomException('Keywords must be an array!', 400);
        }

        // Validate accessLevel
        if (updateData.accessLevel) {
            const validAccessLevels = ['public', 'lawyers-only', 'admin-only'];
            if (!validAccessLevels.includes(updateData.accessLevel)) {
                throw CustomException('Invalid access level!', 400);
            }
        }

        const document = await LegalDocument.findByIdAndUpdate(
            documentId,
            { $set: updateData },
            { new: true }
        );

        if (!document) {
            throw CustomException('Document not found!', 404);
        }

        return response.status(202).send({
            error: false,
            message: 'Document updated successfully!',
            document
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete document
const deleteDocument = async (request, response) => {
    try {
        // Check if user is admin
        const user = await User.findById(request.userID);
        if (user.role !== 'admin') {
            throw CustomException('Only admins can delete legal documents!', 403);
        }

        // Sanitize ID to prevent injection attacks
        const documentId = sanitizeObjectId(request.params._id);

        const document = await LegalDocument.findById(documentId);

        if (!document) {
            throw CustomException('Document not found!', 404);
        }

        await LegalDocument.deleteOne({ _id: documentId });

        return response.send({
            error: false,
            message: 'Document deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Increment download count
const incrementDownload = async (request, response) => {
    try {
        // Sanitize ID to prevent injection attacks
        const documentId = sanitizeObjectId(request.params._id);

        const document = await LegalDocument.findByIdAndUpdate(
            documentId,
            { $inc: { downloads: 1 } },
            { new: true }
        );

        if (!document) {
            throw CustomException('Document not found!', 404);
        }

        return response.status(202).send({
            error: false,
            message: 'Download recorded!',
            document
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createDocument,
    getDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    incrementDownload
};
