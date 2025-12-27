const sanitizeHtml = require('sanitize-html');

/**
 * HTML Sanitization utility for rich text content
 * Supports Arabic RTL content and common text editor features
 */

// Configuration for rich text content (descriptions, notes)
const richTextConfig = {
    allowedTags: [
        // Structure
        'div', 'span', 'p', 'br', 'hr',
        // Headings
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        // Text formatting
        'b', 'i', 'u', 's', 'strong', 'em', 'mark', 'del', 'ins', 'sub', 'sup',
        // Lists
        'ul', 'ol', 'li',
        // Links
        'a',
        // Images
        'img',
        // Tables
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
        // Blockquote and code
        'blockquote', 'pre', 'code',
        // RTL support
        'bdo',
        // Semantic
        'article', 'section', 'aside', 'header', 'footer', 'nav', 'figure', 'figcaption',
        // Media embeds (for documents/PDFs)
        'iframe', 'embed', 'object', 'video', 'audio', 'source'
    ],
    allowedAttributes: {
        '*': [
            // Global attributes
            'class', 'id', 'style',
            // RTL/LTR support for Arabic
            'dir', 'lang',
            // Accessibility
            'title', 'aria-label', 'aria-describedby', 'role',
            // Data attributes (for editor metadata)
            'data-*'
        ],
        'a': ['href', 'target', 'rel', 'download'],
        'img': ['src', 'alt', 'width', 'height', 'loading'],
        'iframe': ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'sandbox'],
        'embed': ['src', 'type', 'width', 'height'],
        'object': ['data', 'type', 'width', 'height'],
        'video': ['src', 'controls', 'width', 'height', 'autoplay', 'muted', 'loop', 'poster'],
        'audio': ['src', 'controls', 'autoplay', 'muted', 'loop'],
        'source': ['src', 'type'],
        'td': ['colspan', 'rowspan', 'headers'],
        'th': ['colspan', 'rowspan', 'scope', 'headers'],
        'col': ['span'],
        'colgroup': ['span'],
        'bdo': ['dir']
    },
    allowedStyles: {
        '*': {
            // Text styling
            'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/, /^[a-z]+$/],
            'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/, /^[a-z]+$/],
            'font-size': [/^\d+(?:px|em|rem|%)$/],
            'font-weight': [/^(?:normal|bold|bolder|lighter|\d{3})$/],
            'font-style': [/^(?:normal|italic|oblique)$/],
            'font-family': [/^[\w\s,-]+$/],
            'text-align': [/^(?:left|right|center|justify|start|end)$/],
            'text-decoration': [/^[\w\s-]+$/],
            'line-height': [/^[\d.]+(?:px|em|rem|%)?$/],
            // RTL support
            'direction': [/^(?:ltr|rtl)$/],
            'unicode-bidi': [/^[\w-]+$/],
            // Layout
            'margin': [/^[\d\s.]+(?:px|em|rem|%|auto)$/],
            'margin-top': [/^[\d.]+(?:px|em|rem|%|auto)$/],
            'margin-bottom': [/^[\d.]+(?:px|em|rem|%|auto)$/],
            'margin-left': [/^[\d.]+(?:px|em|rem|%|auto)$/],
            'margin-right': [/^[\d.]+(?:px|em|rem|%|auto)$/],
            'padding': [/^[\d\s.]+(?:px|em|rem|%)$/],
            'padding-top': [/^[\d.]+(?:px|em|rem|%)$/],
            'padding-bottom': [/^[\d.]+(?:px|em|rem|%)$/],
            'padding-left': [/^[\d.]+(?:px|em|rem|%)$/],
            'padding-right': [/^[\d.]+(?:px|em|rem|%)$/],
            'width': [/^[\d.]+(?:px|em|rem|%|auto)$/],
            'height': [/^[\d.]+(?:px|em|rem|%|auto)$/],
            'max-width': [/^[\d.]+(?:px|em|rem|%|none)$/],
            'max-height': [/^[\d.]+(?:px|em|rem|%|none)$/],
            // Display
            'display': [/^(?:block|inline|inline-block|flex|none)$/],
            'float': [/^(?:left|right|none)$/],
            // Borders
            'border': [/^[\w\s#().,-]+$/],
            'border-radius': [/^[\d.]+(?:px|em|rem|%)$/],
            // Lists
            'list-style-type': [/^[\w-]+$/]
        }
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'data'],
    allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
        a: ['http', 'https', 'mailto', 'tel']
    },
    allowedIframeHostnames: [
        // Document viewers
        'docs.google.com',
        'drive.google.com',
        'onedrive.live.com',
        // Your own domain for document viewing
        'api.traf3li.com',
        'traf3li.com'
    ],
    // Transform URLs to be safe
    transformTags: {
        'a': (tagName, attribs) => {
            return {
                tagName: 'a',
                attribs: {
                    ...attribs,
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }
            };
        }
    }
};

// Configuration for comments (more restrictive)
const commentConfig = {
    allowedTags: [
        'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'span'
    ],
    allowedAttributes: {
        '*': ['class', 'dir', 'lang'],
        'a': ['href', 'target', 'rel'],
        'span': ['class', 'dir']
    },
    allowedStyles: {
        '*': {
            'direction': [/^(?:ltr|rtl)$/],
            'text-align': [/^(?:left|right|center|start|end)$/]
        }
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
        'a': (tagName, attribs) => {
            return {
                tagName: 'a',
                attribs: {
                    ...attribs,
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }
            };
        }
    }
};

// Plain text only (strip all HTML)
const plainTextConfig = {
    allowedTags: [],
    allowedAttributes: {}
};

/**
 * Sanitize rich text content (descriptions, notes)
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
const sanitizeRichText = (html) => {
    if (!html || typeof html !== 'string') return '';
    return sanitizeHtml(html, richTextConfig);
};

/**
 * Sanitize comment content (more restrictive)
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML
 */
const sanitizeComment = (html) => {
    if (!html || typeof html !== 'string') return '';
    return sanitizeHtml(html, commentConfig);
};

/**
 * Strip all HTML, return plain text only
 * @param {string} html - HTML content to strip
 * @returns {string} - Plain text
 */
const stripHtml = (html) => {
    if (!html || typeof html !== 'string') return '';
    return sanitizeHtml(html, plainTextConfig);
};

/**
 * Check if content contains potentially dangerous scripts
 * @param {string} content - Content to check
 * @returns {boolean} - True if dangerous content detected
 */
const hasDangerousContent = (content) => {
    if (!content || typeof content !== 'string') return false;

    const dangerousPatterns = [
        /<script\b/i,
        /javascript:/i,
        /on\w+\s*=/i,  // onclick, onerror, etc.
        /data:text\/html/i,
        /<iframe[^>]*src\s*=\s*["']?(?!https?:\/\/(?:docs\.google\.com|drive\.google\.com|api\.traf3li\.com))/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
};

/**
 * Sanitize content based on field type
 * @param {string} content - Content to sanitize
 * @param {string} fieldType - Type of field: 'richText', 'comment', 'plain'
 * @returns {string} - Sanitized content
 */
const sanitize = (content, fieldType = 'richText') => {
    switch (fieldType) {
        case 'comment':
            return sanitizeComment(content);
        case 'plain':
            return stripHtml(content);
        case 'richText':
        default:
            return sanitizeRichText(content);
    }
};

/**
 * Sanitize filename for Content-Disposition headers
 * Prevents header injection by removing newlines, carriage returns, and other dangerous characters
 * @param {string} filename - Filename to sanitize
 * @param {number} maxLength - Maximum length (default: 255)
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (filename, maxLength = 255) => {
    if (!filename || typeof filename !== 'string') {
        return 'download';
    }

    // Remove path separators and null bytes
    let sanitized = filename.replace(/[\/\\:\x00]/g, '');

    // Remove newlines, carriage returns, and other control characters that could cause header injection
    sanitized = sanitized.replace(/[\r\n\t\x00-\x1f\x7f]/g, '');

    // Remove quotes and semicolons that could break the header
    sanitized = sanitized.replace(/[";]/g, '');

    // Keep only safe characters: alphanumeric, spaces, dots, dashes, underscores, and Arabic/Unicode letters
    sanitized = sanitized.replace(/[^\w\s.-\u0600-\u06FF]/g, '_');

    // Collapse multiple spaces or underscores
    sanitized = sanitized.replace(/\s+/g, '_').replace(/_+/g, '_');

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, maxLength);

    // Ensure we have a valid filename
    return sanitized || 'download';
};

/**
 * Sanitize email HTML content for safe display
 * More restrictive than rich text to prevent email-based XSS attacks
 * @param {string} html - HTML content from email
 * @returns {string} - Sanitized HTML safe for display
 */
const sanitizeEmailHtml = (html) => {
    if (!html || typeof html !== 'string') return '';

    // Very restrictive config for email content
    const emailConfig = {
        allowedTags: [
            'div', 'span', 'p', 'br', 'hr',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'b', 'i', 'u', 's', 'strong', 'em', 'mark', 'del', 'ins',
            'ul', 'ol', 'li',
            'a', 'img',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'blockquote', 'pre', 'code'
        ],
        allowedAttributes: {
            '*': ['class', 'dir'],
            'a': ['href', 'target', 'rel'],
            'img': ['src', 'alt', 'width', 'height'],
            'td': ['colspan', 'rowspan'],
            'th': ['colspan', 'rowspan']
        },
        allowedStyles: {
            '*': {
                'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
                'background-color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb\(/, /^rgba\(/],
                'font-size': [/^\d+(?:px|em|rem|%)$/],
                'font-weight': [/^(?:normal|bold|bolder|lighter|\d{3})$/],
                'text-align': [/^(?:left|right|center|justify)$/]
            }
        },
        allowedSchemes: ['http', 'https', 'mailto'],
        allowedSchemesByTag: {
            img: ['http', 'https', 'data'],
            a: ['http', 'https', 'mailto']
        },
        // No iframes or embeds in emails
        allowedIframeHostnames: [],
        transformTags: {
            'a': (tagName, attribs) => {
                return {
                    tagName: 'a',
                    attribs: {
                        ...attribs,
                        target: '_blank',
                        rel: 'noopener noreferrer nofollow'
                    }
                };
            }
        },
        // Disallow CSS styles that could be used for phishing
        disallowedTagsMode: 'discard'
    };

    return sanitizeHtml(html, emailConfig);
};

module.exports = {
    sanitize,
    sanitizeRichText,
    sanitizeComment,
    stripHtml,
    hasDangerousContent,
    sanitizeFilename,
    sanitizeEmailHtml,
    richTextConfig,
    commentConfig
};
