const { fileTypeFromBuffer } = require('file-type');

/**
 * File Validator Utility
 * Validates file signatures (magic bytes) to prevent malicious file uploads
 * Ensures uploaded files match their claimed type and extension
 */

// Supported file types with their MIME types and extensions
const SUPPORTED_FILE_TYPES = {
    PDF: {
        mimeTypes: ['application/pdf'],
        extensions: ['pdf'],
        description: 'PDF Document'
    },
    DOCX: {
        mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        extensions: ['docx'],
        description: 'Word Document'
    },
    XLSX: {
        mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        extensions: ['xlsx'],
        description: 'Excel Spreadsheet'
    },
    PPTX: {
        mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        extensions: ['pptx'],
        description: 'PowerPoint Presentation'
    },
    JPG: {
        mimeTypes: ['image/jpeg'],
        extensions: ['jpg', 'jpeg'],
        description: 'JPEG Image'
    },
    PNG: {
        mimeTypes: ['image/png'],
        extensions: ['png'],
        description: 'PNG Image'
    },
    GIF: {
        mimeTypes: ['image/gif'],
        extensions: ['gif'],
        description: 'GIF Image'
    },
    ZIP: {
        mimeTypes: ['application/zip', 'application/x-zip-compressed'],
        extensions: ['zip'],
        description: 'ZIP Archive'
    }
};

// Minimum file sizes required to have a valid signature (in bytes)
const MIN_FILE_SIZE = {
    PDF: 4,      // %PDF
    DOCX: 4,     // PK (ZIP header)
    XLSX: 4,     // PK (ZIP header)
    PPTX: 4,     // PK (ZIP header)
    JPG: 3,      // FF D8 FF
    PNG: 8,      // 89 50 4E 47 0D 0A 1A 0A
    GIF: 6,      // GIF87a or GIF89a
    ZIP: 4       // PK
};

/**
 * Get the actual file type from buffer content
 * @param {Buffer} buffer - File buffer to analyze
 * @returns {Promise<Object|null>} - File type info or null
 */
async function getActualFileType(buffer) {
    try {
        // Handle empty or too small files
        if (!buffer || buffer.length === 0) {
            return { error: 'Empty file', code: 'EMPTY_FILE' };
        }

        // Use file-type library for detection
        const fileType = await fileTypeFromBuffer(buffer);

        if (!fileType) {
            // file-type couldn't detect - might be text file or unknown
            return { error: 'Unable to detect file type', code: 'UNKNOWN_TYPE' };
        }

        return {
            mime: fileType.mime,
            ext: fileType.ext
        };
    } catch (error) {
        return {
            error: error.message,
            code: 'DETECTION_ERROR'
        };
    }
}

/**
 * Validate file signature against expected extension
 * @param {Buffer} buffer - File buffer to validate
 * @param {string} claimedExtension - Extension from filename (e.g., 'pdf')
 * @param {string} claimedMimeType - MIME type from multer
 * @returns {Promise<Object>} - Validation result
 */
async function validateFileSignature(buffer, claimedExtension, claimedMimeType) {
    try {
        // Check if buffer is valid
        if (!buffer || buffer.length === 0) {
            return {
                valid: false,
                error: 'Empty file provided',
                code: 'EMPTY_FILE'
            };
        }

        // Get actual file type from magic bytes
        const actualType = await getActualFileType(buffer);

        // Handle detection errors
        if (actualType.error) {
            return {
                valid: false,
                error: actualType.error,
                code: actualType.code
            };
        }

        // Normalize claimed extension (remove dot if present)
        const normalizedExtension = claimedExtension.toLowerCase().replace('.', '');

        // Find matching supported type
        let matchedType = null;
        for (const [typeName, typeInfo] of Object.entries(SUPPORTED_FILE_TYPES)) {
            if (typeInfo.extensions.includes(normalizedExtension) ||
                typeInfo.mimeTypes.includes(claimedMimeType)) {
                matchedType = { name: typeName, info: typeInfo };
                break;
            }
        }

        // Check if claimed type is supported
        if (!matchedType) {
            return {
                valid: false,
                error: `Unsupported file type: ${normalizedExtension}`,
                code: 'UNSUPPORTED_TYPE',
                claimed: { extension: normalizedExtension, mimeType: claimedMimeType }
            };
        }

        // Validate actual type matches claimed type
        const actualExtension = actualType.ext;
        const actualMimeType = actualType.mime;

        // Check if actual type matches claimed extension
        const extensionMatches = matchedType.info.extensions.includes(actualExtension);
        const mimeMatches = matchedType.info.mimeTypes.includes(actualMimeType);

        if (!extensionMatches && !mimeMatches) {
            return {
                valid: false,
                error: `File signature mismatch: claimed ${normalizedExtension} but detected ${actualExtension}`,
                code: 'SIGNATURE_MISMATCH',
                claimed: { extension: normalizedExtension, mimeType: claimedMimeType },
                actual: { extension: actualExtension, mimeType: actualMimeType }
            };
        }

        // File is valid
        return {
            valid: true,
            fileType: matchedType.name,
            extension: actualExtension,
            mimeType: actualMimeType
        };

    } catch (error) {
        return {
            valid: false,
            error: `Validation error: ${error.message}`,
            code: 'VALIDATION_ERROR'
        };
    }
}

/**
 * Check if file type is allowed against a whitelist
 * @param {Buffer} buffer - File buffer to validate
 * @param {Array<string>} allowedTypes - Array of allowed type names (e.g., ['PDF', 'JPG', 'PNG'])
 * @returns {Promise<Object>} - Validation result
 */
async function isAllowedFileType(buffer, allowedTypes = []) {
    try {
        // Check if buffer is valid
        if (!buffer || buffer.length === 0) {
            return {
                allowed: false,
                error: 'Empty file provided',
                code: 'EMPTY_FILE'
            };
        }

        // Default to all supported types if no whitelist provided
        const whitelist = allowedTypes.length > 0
            ? allowedTypes.map(t => t.toUpperCase())
            : Object.keys(SUPPORTED_FILE_TYPES);

        // Get actual file type
        const actualType = await getActualFileType(buffer);

        // Handle detection errors
        if (actualType.error) {
            return {
                allowed: false,
                error: actualType.error,
                code: actualType.code
            };
        }

        // Find which type this file matches
        let detectedTypeName = null;
        for (const [typeName, typeInfo] of Object.entries(SUPPORTED_FILE_TYPES)) {
            if (typeInfo.extensions.includes(actualType.ext) ||
                typeInfo.mimeTypes.includes(actualType.mime)) {
                detectedTypeName = typeName;
                break;
            }
        }

        // Check if detected type is in whitelist
        if (!detectedTypeName || !whitelist.includes(detectedTypeName)) {
            return {
                allowed: false,
                error: `File type not allowed: ${detectedTypeName || actualType.ext}`,
                code: 'TYPE_NOT_ALLOWED',
                detected: detectedTypeName,
                allowedTypes: whitelist
            };
        }

        return {
            allowed: true,
            fileType: detectedTypeName,
            extension: actualType.ext,
            mimeType: actualType.mime
        };

    } catch (error) {
        return {
            allowed: false,
            error: `Validation error: ${error.message}`,
            code: 'VALIDATION_ERROR'
        };
    }
}

/**
 * Validate file size for signature detection
 * @param {Buffer} buffer - File buffer
 * @param {string} fileType - Expected file type
 * @returns {Object} - Validation result
 */
function validateFileSize(buffer, fileType) {
    if (!buffer || buffer.length === 0) {
        return {
            valid: false,
            error: 'Empty file',
            code: 'EMPTY_FILE'
        };
    }

    const minSize = MIN_FILE_SIZE[fileType.toUpperCase()] || 4;

    if (buffer.length < minSize) {
        return {
            valid: false,
            error: `File too small to contain valid ${fileType} signature (minimum ${minSize} bytes)`,
            code: 'FILE_TOO_SMALL',
            size: buffer.length,
            minimumSize: minSize
        };
    }

    return {
        valid: true,
        size: buffer.length
    };
}

/**
 * Comprehensive file validation
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Original filename
 * @param {string} mimeType - Claimed MIME type
 * @param {Array<string>} allowedTypes - Optional whitelist of allowed types
 * @returns {Promise<Object>} - Validation result
 */
async function validateFile(buffer, filename, mimeType, allowedTypes = []) {
    try {
        // Extract extension from filename
        const extension = filename.split('.').pop().toLowerCase();

        // Validate file signature
        const signatureValidation = await validateFileSignature(buffer, extension, mimeType);

        if (!signatureValidation.valid) {
            return signatureValidation;
        }

        // If whitelist provided, check against it
        if (allowedTypes.length > 0) {
            const whitelistValidation = await isAllowedFileType(buffer, allowedTypes);

            if (!whitelistValidation.allowed) {
                return {
                    valid: false,
                    ...whitelistValidation
                };
            }
        }

        return {
            valid: true,
            fileType: signatureValidation.fileType,
            extension: signatureValidation.extension,
            mimeType: signatureValidation.mimeType,
            size: buffer.length
        };

    } catch (error) {
        return {
            valid: false,
            error: `Validation error: ${error.message}`,
            code: 'VALIDATION_ERROR'
        };
    }
}

module.exports = {
    validateFileSignature,
    getActualFileType,
    isAllowedFileType,
    validateFile,
    validateFileSize,
    SUPPORTED_FILE_TYPES,
    MIN_FILE_SIZE
};
