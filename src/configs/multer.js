const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Use absolute path from project root for container compatibility
const uploadDir = path.join(process.cwd(), 'uploads', 'messages');

/**
 * SECURITY: Sanitize filename to prevent path traversal and null byte attacks
 * Gold Standard: AWS S3, Google Cloud Storage patterns
 *
 * Attacks prevented:
 * - Path traversal: "../../../etc/passwd.pdf" → "etc_passwd.pdf"
 * - Null bytes: "image.png\x00.js" → "image.png.js" (null removed)
 * - Double extensions: "file.php.jpg" → safe (extension validated separately)
 * - Unicode attacks: Various unicode normalization attacks
 *
 * @param {string} originalname - Original filename from upload
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (originalname) => {
    if (!originalname || typeof originalname !== 'string') {
        return `file_${Date.now()}`;
    }

    // Remove null bytes (critical for preventing null byte injection)
    let sanitized = originalname.replace(/\0/g, '');

    // Normalize unicode to prevent homograph attacks
    sanitized = sanitized.normalize('NFKC');

    // Remove path separators and traversal sequences
    sanitized = sanitized.replace(/[\/\\]/g, '_');
    sanitized = sanitized.replace(/\.\./g, '_');

    // Remove or replace dangerous characters
    // Keep only alphanumeric, dots, hyphens, underscores, and spaces
    sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_ ]/g, '_');

    // Prevent multiple consecutive dots (..pdf, ...exe)
    sanitized = sanitized.replace(/\.{2,}/g, '.');

    // Prevent leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

    // Ensure filename isn't empty after sanitization
    if (!sanitized || sanitized.length === 0) {
        return `file_${Date.now()}`;
    }

    // Limit filename length (255 is common filesystem limit)
    if (sanitized.length > 200) {
        const ext = path.extname(sanitized);
        const name = sanitized.slice(0, 200 - ext.length);
        sanitized = name + ext;
    }

    return sanitized;
};

/**
 * Get safe file extension
 * @param {string} filename - Filename
 * @returns {string} - Safe extension with dot
 */
const getSafeExtension = (filename) => {
    const ext = path.extname(filename).toLowerCase();
    // Only allow safe extensions
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.pdf', '.doc', '.docx', '.txt', '.mp4', '.webm'];
    return allowedExtensions.includes(ext) ? ext : '.bin';
};

// Ensure uploads directory exists (may already exist from Dockerfile)
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  logger.warn(`Warning: Could not create upload directory ${uploadDir}:`, err.message);
  // Directory should be pre-created in Dockerfile for production
}

// Configure storage with SECURITY-hardened filename handling
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // SECURITY: Generate cryptographically random filename
    // Gold Standard: AWS S3 pattern - never trust user-provided filenames
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const safeExt = getSafeExtension(sanitizeFilename(file.originalname));

    // Format: {timestamp}-{random}.{ext}
    // This prevents:
    // - Path traversal attacks
    // - Null byte injection
    // - Filename collision attacks
    // - Executable disguise attacks
    cb(null, `${timestamp}-${randomBytes}${safeExt}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, documents, and videos are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

// Import malware scan middleware for easy integration
const malwareScanMiddleware = require('../middlewares/malwareScan.middleware');

// Import file validation middleware for magic byte validation
const {
  validateFileMiddleware,
  validateImageMiddleware,
  createFileValidationMiddleware
} = require('../middlewares/fileValidation.middleware');

module.exports = upload;
module.exports.malwareScan = malwareScanMiddleware; // Export malware scan middleware

// Export file validation middleware for use in routes
module.exports.validateFile = validateFileMiddleware;
module.exports.validateImage = validateImageMiddleware;
module.exports.createFileValidation = createFileValidationMiddleware;

// Export security utilities for use in other upload handlers
module.exports.sanitizeFilename = sanitizeFilename;
module.exports.getSafeExtension = getSafeExtension;
