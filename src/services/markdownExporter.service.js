/**
 * Markdown Exporter Service
 * Exports CaseNotion pages to Markdown format
 */

/**
 * Export page to Markdown
 * @param {Object} pageWithBlocks - Page object with blocks array
 * @returns {string} Markdown string
 */
exports.exportPageToMarkdown = (pageWithBlocks) => {
    let md = `# ${pageWithBlocks.title}\n\n`;

    if (pageWithBlocks.titleAr) {
        md += `**العنوان:** ${pageWithBlocks.titleAr}\n\n`;
    }

    md += `---\n\n`;

    for (const block of pageWithBlocks.blocks || []) {
        md += blockToMarkdown(block);
    }

    return md;
};

/**
 * Convert a single block to Markdown
 * @param {Object} block - Block object
 * @returns {string} Markdown string
 */
function blockToMarkdown(block) {
    const content = block.content?.map(c => formatRichText(c)).join('') || '';

    switch (block.type) {
        case 'heading_1':
            return `# ${content}\n\n`;
        case 'heading_2':
            return `## ${content}\n\n`;
        case 'heading_3':
            return `### ${content}\n\n`;
        case 'bulleted_list':
            return `- ${content}\n`;
        case 'numbered_list':
            return `1. ${content}\n`;
        case 'todo':
            return `- [${block.checked ? 'x' : ' '}] ${content}\n`;
        case 'quote':
            return `> ${content}\n\n`;
        case 'callout':
            return `> ${block.icon || '💡'} **ملاحظة:** ${content}\n\n`;
        case 'code':
            return `\`\`\`${block.language || ''}\n${content}\n\`\`\`\n\n`;
        case 'divider':
            return `---\n\n`;
        case 'party_statement':
            const partyLabels = {
                plaintiff: 'المدعي',
                defendant: 'المدعى عليه',
                witness: 'الشاهد',
                expert: 'الخبير',
                judge: 'القاضي'
            };
            const partyLabel = partyLabels[block.partyType] || block.partyType || 'طرف';
            const dateStr = block.statementDate ? new Date(block.statementDate).toLocaleDateString('ar-SA') : '';
            return `**${partyLabel}** ${dateStr ? `(${dateStr})` : ''}:\n> ${content}\n\n`;
        case 'evidence_item':
            const evidenceLabels = {
                document: 'مستند',
                testimony: 'شهادة',
                physical: 'دليل مادي',
                digital: 'دليل رقمي',
                expert_opinion: 'رأي خبير'
            };
            const evidenceLabel = evidenceLabels[block.evidenceType] || block.evidenceType || 'دليل';
            return `**📋 ${evidenceLabel}:**\n${content}\n\n`;
        case 'legal_citation':
            const citationLabels = {
                law: 'قانون',
                regulation: 'نظام',
                case_precedent: 'سابقة قضائية',
                legal_principle: 'مبدأ قانوني'
            };
            const citationType = citationLabels[block.citationType] || 'مرجع';
            return `**⚖️ ${citationType}:** ${block.citationReference || ''}\n${content}\n\n`;
        case 'timeline_entry':
            const eventDate = block.eventDate ? new Date(block.eventDate).toLocaleDateString('ar-SA') : '';
            return `**📅 ${eventDate}:** ${content}\n\n`;
        case 'table':
            return tableToMarkdown(block.tableData);
        case 'image':
            if (block.fileUrl) {
                return `![${block.caption || 'صورة'}](${block.fileUrl})\n${block.caption ? `*${block.caption}*` : ''}\n\n`;
            }
            return '';
        case 'file':
            if (block.fileUrl) {
                return `📎 [${block.fileName || 'ملف'}](${block.fileUrl})\n\n`;
            }
            return '';
        case 'bookmark':
            if (block.fileUrl) {
                return `🔗 [${content || block.fileUrl}](${block.fileUrl})\n\n`;
            }
            return '';
        case 'toggle':
            return `<details>\n<summary>${content}</summary>\n\n</details>\n\n`;
        case 'equation':
            const equation = block.content?.[0]?.equation?.expression || content;
            return `$$${equation}$$\n\n`;
        default:
            return content ? `${content}\n\n` : '';
    }
}

/**
 * Format rich text with annotations
 * @param {Object} richText - Rich text item
 * @returns {string} Formatted text
 */
function formatRichText(richText) {
    let text = richText.plainText || richText.text?.content || '';

    if (richText.annotations) {
        if (richText.annotations.bold) {
            text = `**${text}**`;
        }
        if (richText.annotations.italic) {
            text = `*${text}*`;
        }
        if (richText.annotations.strikethrough) {
            text = `~~${text}~~`;
        }
        if (richText.annotations.code) {
            text = `\`${text}\``;
        }
    }

    if (richText.text?.link) {
        text = `[${text}](${richText.text.link})`;
    }

    if (richText.type === 'mention' && richText.mention) {
        const mentionName = richText.mention.name || richText.mention.id;
        text = `@${mentionName}`;
    }

    return text;
}

/**
 * Convert table data to Markdown table
 * @param {Object} tableData - Table data object
 * @returns {string} Markdown table
 */
function tableToMarkdown(tableData) {
    if (!tableData || !tableData.rows || tableData.rows.length === 0) {
        return '';
    }

    let md = '';
    const columnCount = tableData.headers?.length || tableData.rows[0]?.length || 0;

    // Headers
    if (tableData.hasHeaderRow && tableData.headers) {
        md += '| ' + tableData.headers.join(' | ') + ' |\n';
        md += '| ' + tableData.headers.map(() => '---').join(' | ') + ' |\n';
    } else {
        // Create placeholder header
        md += '| ' + Array(columnCount).fill(' ').join(' | ') + ' |\n';
        md += '| ' + Array(columnCount).fill('---').join(' | ') + ' |\n';
    }

    // Rows
    for (const row of tableData.rows) {
        md += '| ' + row.map(cell => cell || ' ').join(' | ') + ' |\n';
    }

    return md + '\n';
}
