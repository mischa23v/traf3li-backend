/**
 * PDF Exporter Service
 * Exports CaseNotion pages to PDF format
 */

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Convert a single block to HTML
 */
function blockToHtml(block) {
    const content = block.content?.map(c => c.plainText || c.text?.content || '').join('') || '';
    const escapedContent = escapeHtml(content);

    switch (block.type) {
        case 'heading_1':
            return '<h1>' + escapedContent + '</h1>\n';
        case 'heading_2':
            return '<h2>' + escapedContent + '</h2>\n';
        case 'heading_3':
            return '<h3>' + escapedContent + '</h3>\n';
        case 'bulleted_list':
            return '<ul><li>' + escapedContent + '</li></ul>\n';
        case 'numbered_list':
            return '<ol><li>' + escapedContent + '</li></ol>\n';
        case 'todo':
            const checked = block.checked ? 'checked' : '';
            const checkmark = block.checked ? '✓' : '';
            return '<div class="todo-item"><span class="todo-checkbox ' + checked + '">' + checkmark + '</span><span>' + escapedContent + '</span></div>\n';
        case 'quote':
            return '<blockquote>' + escapedContent + '</blockquote>\n';
        case 'callout':
            return '<div class="callout"><span class="callout-icon">' + (block.icon || '💡') + '</span><span>' + escapedContent + '</span></div>\n';
        case 'code':
            return '<pre><code>' + escapedContent + '</code></pre>\n';
        case 'divider':
            return '<hr>\n';
        case 'party_statement':
            const partyClass = block.partyType || 'plaintiff';
            const partyLabels = {
                plaintiff: 'المدعي',
                defendant: 'المدعى عليه',
                witness: 'الشاهد',
                expert: 'الخبير',
                judge: 'القاضي'
            };
            return '<div class="party-statement ' + partyClass + '"><div class="party-label">' + (partyLabels[partyClass] || partyClass) + '</div><div>' + escapedContent + '</div></div>\n';
        case 'evidence_item':
            const evidenceLabels = {
                document: 'مستند',
                testimony: 'شهادة',
                physical: 'دليل مادي',
                digital: 'دليل رقمي',
                expert_opinion: 'رأي خبير'
            };
            return '<div class="evidence-item"><div class="evidence-label">' + (evidenceLabels[block.evidenceType] || block.evidenceType || 'دليل') + '</div><div>' + escapedContent + '</div></div>\n';
        case 'legal_citation':
            const citationLabels = {
                law: 'قانون',
                regulation: 'نظام',
                case_precedent: 'سابقة قضائية',
                legal_principle: 'مبدأ قانوني'
            };
            return '<div class="legal-citation"><div class="citation-ref">' + (citationLabels[block.citationType] || 'مرجع') + ': ' + escapeHtml(block.citationReference || '') + '</div><div>' + escapedContent + '</div></div>\n';
        case 'timeline_entry':
            const dateStr = block.eventDate ? new Date(block.eventDate).toLocaleDateString('ar-SA') : '';
            return '<div class="timeline-entry"><div class="timeline-date">' + dateStr + '</div><div>' + escapedContent + '</div></div>\n';
        case 'table':
            if (block.tableData) {
                let tableHtml = '<table>';
                if (block.tableData.hasHeaderRow && block.tableData.headers) {
                    tableHtml += '<thead><tr>';
                    for (const header of block.tableData.headers) {
                        tableHtml += '<th>' + escapeHtml(header) + '</th>';
                    }
                    tableHtml += '</tr></thead>';
                }
                tableHtml += '<tbody>';
                for (const row of block.tableData.rows || []) {
                    tableHtml += '<tr>';
                    for (const cell of row) {
                        tableHtml += '<td>' + escapeHtml(cell) + '</td>';
                    }
                    tableHtml += '</tr>';
                }
                tableHtml += '</tbody></table>\n';
                return tableHtml;
            }
            return '';
        case 'image':
            if (block.fileUrl) {
                let imgHtml = '<figure><img src="' + escapeHtml(block.fileUrl) + '" alt="' + escapeHtml(block.caption || '') + '"/>';
                if (block.caption) {
                    imgHtml += '<figcaption>' + escapeHtml(block.caption) + '</figcaption>';
                }
                imgHtml += '</figure>\n';
                return imgHtml;
            }
            return '';
        case 'toggle':
            return '<details><summary>' + escapedContent + '</summary><div class="toggle-content"></div></details>\n';
        default:
            return '<p>' + escapedContent + '</p>\n';
    }
}

/**
 * Generate HTML from page blocks
 */
exports.generateHtmlFromBlocks = (page) => {
    const styles = `
        * { box-sizing: border-box; }
        body {
            font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
            line-height: 1.8;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            color: #1a1a1a;
            direction: rtl;
        }
        h1 { font-size: 2em; margin-bottom: 0.5em; border-bottom: 2px solid #e5e5e5; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; margin-top: 1.5em; margin-bottom: 0.5em; }
        h3 { font-size: 1.2em; margin-top: 1em; margin-bottom: 0.5em; }
        p { margin: 0.8em 0; }
        blockquote {
            border-right: 4px solid #3b82f6;
            padding-right: 1em;
            margin: 1em 0;
            background: #f8fafc;
            padding: 1em;
            border-radius: 0 8px 8px 0;
        }
        .callout {
            background: #f5f5f5;
            padding: 1em;
            border-radius: 8px;
            margin: 1em 0;
            display: flex;
            align-items: flex-start;
            gap: 0.5em;
        }
        .party-statement {
            border-right: 4px solid #3b82f6;
            padding: 1em;
            margin: 1em 0;
            background: #eff6ff;
            border-radius: 0 8px 8px 0;
        }
        .party-statement.plaintiff { border-color: #10b981; background: #ecfdf5; }
        .party-statement.defendant { border-color: #ef4444; background: #fef2f2; }
        .party-statement.witness { border-color: #f59e0b; background: #fffbeb; }
        .party-statement.expert { border-color: #8b5cf6; background: #f5f3ff; }
        .party-statement.judge { border-color: #6366f1; background: #eef2ff; }
        .party-label { font-weight: bold; text-transform: uppercase; font-size: 0.75em; margin-bottom: 0.5em; opacity: 0.8; }
        .evidence-item { border: 1px solid #10b981; padding: 1em; margin: 1em 0; border-radius: 8px; background: #f0fdf4; }
        .evidence-label { font-weight: bold; color: #059669; font-size: 0.85em; margin-bottom: 0.5em; }
        .legal-citation { background: #eff6ff; padding: 1em; margin: 1em 0; border-radius: 8px; border-right: 3px solid #3b82f6; }
        .citation-ref { font-weight: bold; color: #1d4ed8; margin-bottom: 0.5em; }
        ul, ol { padding-right: 2em; margin: 0.5em 0; }
        li { margin: 0.3em 0; }
        .todo-item { list-style: none; display: flex; align-items: flex-start; gap: 0.5em; }
        .todo-checkbox { width: 18px; height: 18px; border: 2px solid #d1d5db; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; }
        .todo-checkbox.checked { background: #10b981; border-color: #10b981; color: white; }
        code { background: #1e293b; color: #e2e8f0; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; }
        pre { background: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 8px; overflow-x: auto; direction: ltr; text-align: left; }
        pre code { background: transparent; padding: 0; }
        hr { border: none; border-top: 1px solid #e5e5e5; margin: 2em 0; }
        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
        th, td { border: 1px solid #e5e5e5; padding: 0.75em; text-align: right; }
        th { background: #f8fafc; font-weight: 600; }
        .timeline-entry { border-right: 3px solid #6366f1; padding: 1em; margin: 1em 0; background: #eef2ff; border-radius: 0 8px 8px 0; }
        .timeline-date { font-weight: bold; color: #4f46e5; font-size: 0.9em; }
        img { max-width: 100%; height: auto; border-radius: 8px; margin: 1em 0; }
    `;

    let html = '<!DOCTYPE html>\n<html dir="rtl" lang="ar">\n<head>\n';
    html += '<meta charset="UTF-8">\n';
    html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
    html += '<title>' + escapeHtml(page.title) + '</title>\n';
    html += '<style>' + styles + '</style>\n';
    html += '</head>\n<body>\n';
    html += '<h1>' + escapeHtml(page.title) + '</h1>\n';

    for (const block of page.blocks || []) {
        html += blockToHtml(block);
    }

    html += '</body>\n</html>';
    return html;
};

/**
 * Export page to PDF
 */
exports.exportPageToPdf = async (pageWithBlocks) => {
    const html = exports.generateHtmlFromBlocks(pageWithBlocks);

    try {
        const puppeteer = require('puppeteer');
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }
        });

        await browser.close();
        return pdfBuffer;
    } catch (error) {
        console.warn('Puppeteer not available, returning HTML instead:', error.message);
        return Buffer.from(html, 'utf-8');
    }
};
