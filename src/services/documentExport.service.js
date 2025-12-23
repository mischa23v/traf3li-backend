/**
 * Document Export Service
 * Handles PDF generation with Arabic RTL support, LaTeX export, and other formats
 * Uses Puppeteer for PDF generation (best for Arabic/RTL text)
 */

const sanitizeHtml = require('sanitize-html');
const logger = require('../utils/logger');

// HTML sanitization config for document export (defense-in-depth against XSS)
const EXPORT_SANITIZE_CONFIG = {
    allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'ul', 'ol', 'li',
        'a',
        'blockquote', 'pre', 'code',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span', 'img'
    ],
    allowedAttributes: {
        'a': ['href', 'target', 'rel'],
        'img': ['src', 'alt', 'width', 'height', 'style'],
        'div': ['class', 'id', 'style'],
        'span': ['class', 'id', 'style'],
        'p': ['class', 'id', 'style'],
        'h1': ['class', 'id', 'style'],
        'h2': ['class', 'id', 'style'],
        'h3': ['class', 'id', 'style'],
        'h4': ['class', 'id', 'style'],
        'h5': ['class', 'id', 'style'],
        'h6': ['class', 'id', 'style'],
        'table': ['class', 'id', 'style'],
        'td': ['colspan', 'rowspan', 'style'],
        'th': ['colspan', 'rowspan', 'style'],
        'tr': ['style'],
        'ul': ['style'],
        'ol': ['style'],
        'li': ['style']
    },
    allowedSchemes: ['http', 'https', 'data'],
    allowedSchemesByTag: {
        a: ['http', 'https', 'mailto'],
        img: ['http', 'https', 'data']
    },
    disallowedTagsMode: 'recursiveEscape',
    allowProtocolRelative: false,
    enforceHtmlBoundary: true
};

/**
 * Sanitize HTML content for safe rendering in exports
 * Prevents XSS attacks when rendering user content in PDF/HTML exports
 */
const sanitizeExportContent = (content) => {
    if (!content) return '';
    return sanitizeHtml(content, EXPORT_SANITIZE_CONFIG);
};

// Lazy load puppeteer - it's optional and may not be available in all environments
let puppeteer = null;
const getPuppeteer = () => {
    if (puppeteer === null) {
        try {
            puppeteer = require('puppeteer');
        } catch (err) {
            logger.warn('Puppeteer not available - PDF export will be disabled');
            puppeteer = false;
        }
    }
    return puppeteer;
};
const { getUploadPresignedUrl, getDownloadPresignedUrl, BUCKETS } = require('../configs/s3');
const crypto = require('crypto');

// Arabic-friendly HTML template
const generateHtmlTemplate = (page, options = {}) => {
    const {
        includeAttachments = false,
        includeMetadata = true,
        direction = 'rtl',
        fontFamily = 'Amiri, Arial, sans-serif',
        fontSize = '14px'
    } = options;

    const isRtl = direction === 'rtl';

    return `
<!DOCTYPE html>
<html lang="${isRtl ? 'ar' : 'en'}" dir="${direction}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.title || page.titleAr || 'Document'}</title>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: ${fontFamily};
            font-size: ${fontSize};
            line-height: 1.8;
            direction: ${direction};
            text-align: ${isRtl ? 'right' : 'left'};
            padding: 40px;
            margin: 0;
            color: #1a1a1a;
            background: #fff;
        }

        .header {
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .title {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 10px 0;
            color: #111;
        }

        .title-ar {
            font-family: 'Amiri', serif;
            font-size: 28px;
        }

        .metadata {
            font-size: 12px;
            color: #666;
            margin-top: 15px;
        }

        .metadata-item {
            display: inline-block;
            margin-${isRtl ? 'left' : 'right'}: 20px;
        }

        .content {
            font-family: ${isRtl ? "'Amiri', 'Cairo', serif" : fontFamily};
        }

        .content h1 { font-size: 22px; margin: 25px 0 15px; }
        .content h2 { font-size: 18px; margin: 20px 0 12px; }
        .content h3 { font-size: 16px; margin: 18px 0 10px; }

        .content p {
            margin: 12px 0;
            text-align: justify;
        }

        .content ul, .content ol {
            padding-${isRtl ? 'right' : 'left'}: 30px;
        }

        .content table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        .content table th,
        .content table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: ${isRtl ? 'right' : 'left'};
        }

        .content table th {
            background: #f5f5f5;
            font-weight: 600;
        }

        .content blockquote {
            border-${isRtl ? 'right' : 'left'}: 4px solid #ddd;
            margin: 20px 0;
            padding: 10px 20px;
            background: #f9f9f9;
            font-style: italic;
        }

        .content code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            direction: ltr;
        }

        .content pre {
            background: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            direction: ltr;
            text-align: left;
        }

        .attachments {
            margin-top: 40px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }

        .attachments-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
        }

        .attachment-item {
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }

        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #888;
            text-align: center;
        }

        @media print {
            body {
                padding: 20px;
            }
            .no-print {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title ${isRtl ? 'title-ar' : ''}">${isRtl ? (page.titleAr || page.title) : page.title}</h1>
        ${page.titleAr && page.title && isRtl ? `<div style="font-size: 16px; color: #666;">${page.title}</div>` : ''}
        ${includeMetadata ? `
        <div class="metadata">
            ${page.caseId?.caseNumber ? `<span class="metadata-item">${isRtl ? 'رقم القضية:' : 'Case:'} ${page.caseId.caseNumber}</span>` : ''}
            ${page.pageType ? `<span class="metadata-item">${isRtl ? 'النوع:' : 'Type:'} ${page.pageType}</span>` : ''}
            ${page.createdAt ? `<span class="metadata-item">${isRtl ? 'التاريخ:' : 'Date:'} ${new Date(page.createdAt).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}</span>` : ''}
            ${page.version ? `<span class="metadata-item">${isRtl ? 'الإصدار:' : 'Version:'} ${page.version}</span>` : ''}
        </div>
        ` : ''}
    </div>

    <div class="content">
        ${sanitizeExportContent(page.content || page.contentText || '')}
    </div>

    ${includeAttachments && page.attachments?.length > 0 ? `
    <div class="attachments">
        <div class="attachments-title">${isRtl ? 'المرفقات' : 'Attachments'}</div>
        ${page.attachments.map(att => `
            <div class="attachment-item">
                ${att.fileName || att.fileNameAr || 'Attachment'}
                ${att.fileSize ? ` (${formatFileSize(att.fileSize)})` : ''}
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        ${isRtl ? 'تم إنشاء هذا المستند بواسطة نظام ترافلي القانوني' : 'Generated by Trafeli Legal System'}
        - ${new Date().toLocaleString(isRtl ? 'ar-SA' : 'en-US')}
    </div>
</body>
</html>
`;
};

// Format file size helper
const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Generate PDF using Puppeteer (best for Arabic/RTL)
const generatePdf = async (page, options = {}) => {
    const pptr = getPuppeteer();
    if (!pptr) {
        throw new Error('PDF export is not available - puppeteer is not installed');
    }

    const {
        format = 'A4',
        margin = { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        landscape = false,
        printBackground = true,
        direction = 'rtl'
    } = options;

    let browser = null;

    try {
        browser = await pptr.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--font-render-hinting=none'
            ]
        });

        const browserPage = await browser.newPage();

        // Generate HTML
        const html = generateHtmlTemplate(page, { ...options, direction });

        await browserPage.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Wait for fonts to load
        await browserPage.evaluateHandle('document.fonts.ready');

        // Generate PDF
        const pdfBuffer = await browserPage.pdf({
            format,
            margin,
            landscape,
            printBackground,
            preferCSSPageSize: true
        });

        return pdfBuffer;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// Generate LaTeX export
const generateLatex = (page, options = {}) => {
    const { direction = 'rtl' } = options;
    const isRtl = direction === 'rtl';

    const escapeLatex = (text) => {
        if (!text) return '';
        return text
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/[&%$#_{}~^]/g, '\\$&')
            .replace(/\n/g, '\\\\\n');
    };

    const title = isRtl ? (page.titleAr || page.title) : page.title;
    const content = page.contentText || page.content || '';

    // Strip HTML tags for plain LaTeX content
    const plainContent = content.replace(/<[^>]*>/g, '');

    return `\\documentclass[12pt,a4paper]{article}

% Arabic/RTL Support
\\usepackage{polyglossia}
\\setmainlanguage${isRtl ? '{arabic}' : '{english}'}
${isRtl ? '\\setotherlanguage{english}' : '\\setotherlanguage{arabic}'}

% Fonts for Arabic
\\usepackage{fontspec}
${isRtl ? `\\setmainfont{Amiri}
\\newfontfamily\\arabicfont[Script=Arabic]{Amiri}` : '\\setmainfont{Times New Roman}'}

% Other packages
\\usepackage{geometry}
\\geometry{margin=2.5cm}
\\usepackage{hyperref}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{longtable}

% Document info
\\title{${escapeLatex(title)}}
\\author{Trafeli Legal System}
\\date{${new Date().toLocaleDateString(isRtl ? 'ar-SA' : 'en-US')}}

\\begin{document}

\\maketitle

${page.summary ? `\\begin{abstract}\n${escapeLatex(page.summary)}\n\\end{abstract}` : ''}

${escapeLatex(plainContent)}

${page.attachments?.length > 0 ? `
\\section*{${isRtl ? 'المرفقات' : 'Attachments'}}
\\begin{itemize}
${page.attachments.map(att => `\\item ${escapeLatex(att.fileName || att.fileNameAr)}`).join('\n')}
\\end{itemize}
` : ''}

\\end{document}
`;
};

// Generate Markdown export
const generateMarkdown = (page, options = {}) => {
    const { direction = 'rtl', includeMetadata = true } = options;
    const isRtl = direction === 'rtl';

    const title = isRtl ? (page.titleAr || page.title) : page.title;
    const content = page.content || page.contentText || '';

    // Convert HTML to markdown (basic conversion)
    let mdContent = content
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
        .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1')
        .replace(/<ol[^>]*>(.*?)<\/ol>/gis, '$1')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '');

    let md = `# ${title}\n\n`;

    if (includeMetadata) {
        md += `---\n`;
        if (page.caseId?.caseNumber) md += `${isRtl ? 'رقم القضية' : 'Case'}: ${page.caseId.caseNumber}\n`;
        if (page.pageType) md += `${isRtl ? 'النوع' : 'Type'}: ${page.pageType}\n`;
        if (page.createdAt) md += `${isRtl ? 'التاريخ' : 'Date'}: ${new Date(page.createdAt).toLocaleDateString()}\n`;
        md += `---\n\n`;
    }

    md += mdContent;

    if (page.attachments?.length > 0) {
        md += `\n\n## ${isRtl ? 'المرفقات' : 'Attachments'}\n\n`;
        page.attachments.forEach(att => {
            md += `- ${att.fileName || att.fileNameAr}\n`;
        });
    }

    return md;
};

// Upload generated file to S3 and return URL
const uploadExportToS3 = async (buffer, fileName, contentType) => {
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileKey = `exports/${uniqueId}/${fileName}`;

    // Get presigned URL for upload
    const uploadUrl = await getUploadPresignedUrl(fileKey, contentType, 'general');

    // Upload using fetch
    const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: buffer,
        headers: {
            'Content-Type': contentType
        }
    });

    if (!response.ok) {
        throw new Error('Failed to upload export file to S3');
    }

    // Return download URL
    const downloadUrl = await getDownloadPresignedUrl(fileKey, 'general', fileName);

    return {
        fileKey,
        downloadUrl,
        fileName
    };
};

module.exports = {
    generatePdf,
    generateLatex,
    generateMarkdown,
    generateHtmlTemplate,
    uploadExportToS3,
    formatFileSize
};
