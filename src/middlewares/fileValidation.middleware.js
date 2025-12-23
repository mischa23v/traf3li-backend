const fs = require('fs').promises;
const path = require('path');
const { validateFile, validateFileSignature } = require('../utils/fileValidator');
const logger = require('../utils/logger');

/**
 * File Validation Middleware
 * Validates uploaded files by checking magic bytes (file signatures)
 * Prevents malicious files disguised as safe file types
 */

/**
 * Create file validation middleware with custom configuration
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.allowedTypes - Whitelist of allowed file types (e.g., ['PDF', 'JPG'])
 * @param {boolean} options.strictMode - If true, reject unknown file types (default: true)
 * @param {boolean} options.validateSignature - If true, validate magic bytes (default: true)
 * @param {Function} options.onValidationFailure - Custom handler for validation failures
 * @returns {Function} - Express middleware function
 */
function createFileValidationMiddleware(options = {}) {
    const {
        allowedTypes = [],
        strictMode = true,
        validateSignature = true,
        onValidationFailure = null
    } = options;

    return async (req, res, next) => {
        try {
            // Skip if no files uploaded
            if (!req.file && (!req.files || req.files.length === 0)) {
                return next();
            }

            // Handle single file upload (req.file)
            if (req.file) {
                const validationResult = await validateSingleFile(
                    req.file,
                    allowedTypes,
                    strictMode,
                    validateSignature
                );

                if (!validationResult.valid) {
                    // Remove uploaded file if validation fails
                    await cleanupFile(req.file);

                    // Call custom failure handler if provided
                    if (onValidationFailure) {
                        return onValidationFailure(req, res, validationResult);
                    }

                    return res.status(400).json({
                        success: false,
                        error: 'File validation failed',
                        message: validationResult.error,
                        code: validationResult.code,
                        details: {
                            filename: req.file.originalname,
                            claimed: validationResult.claimed,
                            actual: validationResult.actual
                        }
                    });
                }

                // Attach validation result to request for downstream use
                req.fileValidation = validationResult;
            }

            // Handle multiple files upload (req.files)
            if (req.files && Array.isArray(req.files)) {
                const validationResults = [];
                const failedFiles = [];

                for (const file of req.files) {
                    const validationResult = await validateSingleFile(
                        file,
                        allowedTypes,
                        strictMode,
                        validateSignature
                    );

                    validationResults.push(validationResult);

                    if (!validationResult.valid) {
                        failedFiles.push({
                            filename: file.originalname,
                            error: validationResult.error,
                            code: validationResult.code
                        });
                    }
                }

                // If any file failed validation, cleanup all files and reject request
                if (failedFiles.length > 0) {
                    // Cleanup all uploaded files
                    await Promise.all(req.files.map(file => cleanupFile(file)));

                    // Call custom failure handler if provided
                    if (onValidationFailure) {
                        return onValidationFailure(req, res, {
                            valid: false,
                            failedFiles
                        });
                    }

                    return res.status(400).json({
                        success: false,
                        error: 'One or more files failed validation',
                        failedFiles
                    });
                }

                // Attach validation results to request
                req.filesValidation = validationResults;
            }

            next();

        } catch (error) {
            logger.error('File validation middleware error:', error);

            // Cleanup files on error
            if (req.file) {
                await cleanupFile(req.file);
            }
            if (req.files && Array.isArray(req.files)) {
                await Promise.all(req.files.map(file => cleanupFile(file)));
            }

            return res.status(500).json({
                success: false,
                error: 'File validation error',
                message: error.message
            });
        }
    };
}

/**
 * Validate a single file
 * @param {Object} file - Multer file object
 * @param {Array<string>} allowedTypes - Whitelist of allowed types
 * @param {boolean} strictMode - Strict validation mode
 * @param {boolean} validateSignature - Whether to validate magic bytes
 * @returns {Promise<Object>} - Validation result
 */
async function validateSingleFile(file, allowedTypes, strictMode, validateSignature) {
    try {
        // Read file buffer
        let buffer;

        // For cloud storage (S3/R2), buffer is in memory
        if (file.buffer) {
            buffer = file.buffer;
        }
        // For local storage, read from disk
        else if (file.path) {
            buffer = await fs.readFile(file.path);
        } else {
            return {
                valid: false,
                error: 'Unable to read file content',
                code: 'READ_ERROR'
            };
        }

        // Validate file using utility
        const validationResult = await validateFile(
            buffer,
            file.originalname,
            file.mimetype,
            allowedTypes
        );

        return validationResult;

    } catch (error) {
        return {
            valid: false,
            error: `File validation error: ${error.message}`,
            code: 'VALIDATION_ERROR'
        };
    }
}

/**
 * Cleanup uploaded file (delete from disk if local storage)
 * @param {Object} file - Multer file object
 */
async function cleanupFile(file) {
    try {
        // Only cleanup local files (cloud storage handles cleanup differently)
        if (file.path && !file.buffer) {
            await fs.unlink(file.path);
        }
    } catch (error) {
        logger.error('Error cleaning up file:', error);
        // Don't throw - cleanup is best effort
    }
}

/**
 * Default file validation middleware
 * Validates all common file types with strict mode enabled
 */
const validateFileMiddleware = createFileValidationMiddleware({
    allowedTypes: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'GIF', 'ZIP'],
    strictMode: true,
    validateSignature: true
});

/**
 * Document validation middleware
 * Validates document files only (PDF, DOCX, XLSX, PPTX)
 */
const validateDocumentMiddleware = createFileValidationMiddleware({
    allowedTypes: ['PDF', 'DOCX', 'XLSX', 'PPTX'],
    strictMode: true,
    validateSignature: true
});

/**
 * Image validation middleware
 * Validates image files only (JPG, PNG, GIF)
 */
const validateImageMiddleware = createFileValidationMiddleware({
    allowedTypes: ['JPG', 'PNG', 'GIF'],
    strictMode: true,
    validateSignature: true
});

/**
 * Archive validation middleware
 * Validates archive files only (ZIP)
 */
const validateArchiveMiddleware = createFileValidationMiddleware({
    allowedTypes: ['ZIP'],
    strictMode: true,
    validateSignature: true
});

/**
 * Lenient validation middleware
 * Validates files but allows unknown types
 */
const validateFileLenientMiddleware = createFileValidationMiddleware({
    allowedTypes: ['PDF', 'DOCX', 'XLSX', 'PPTX', 'JPG', 'PNG', 'GIF', 'ZIP'],
    strictMode: false,
    validateSignature: true
});

module.exports = {
    createFileValidationMiddleware,
    validateFileMiddleware,
    validateDocumentMiddleware,
    validateImageMiddleware,
    validateArchiveMiddleware,
    validateFileLenientMiddleware,
    validateSingleFile,
    cleanupFile
};
