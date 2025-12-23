/**
 * Default Page Templates Seed
 * Run with: node src/seeds/defaultTemplates.seed.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');

const templates = [
    {
        name: 'Case Strategy Template',
        nameAr: 'قالب استراتيجية القضية',
        description: 'Comprehensive template for planning case strategy',
        descriptionAr: 'قالب شامل لتخطيط استراتيجية القضية',
        category: 'case_strategy',
        icon: { type: 'emoji', emoji: '🎯' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Case Strategy' }, plainText: 'Case Strategy' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Case Overview' }, plainText: 'Case Overview' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'Summarize the key facts and legal issues...' }, plainText: 'Summarize the key facts and legal issues...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Strengths' }, plainText: 'Strengths' }] },
            { type: 'bulleted_list', content: [{ type: 'text', text: { content: 'List case strengths...' }, plainText: 'List case strengths...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Weaknesses' }, plainText: 'Weaknesses' }] },
            { type: 'bulleted_list', content: [{ type: 'text', text: { content: 'List potential weaknesses...' }, plainText: 'List potential weaknesses...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Legal Arguments' }, plainText: 'Legal Arguments' }] },
            { type: 'numbered_list', content: [{ type: 'text', text: { content: 'Primary argument...' }, plainText: 'Primary argument...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Action Plan' }, plainText: 'Action Plan' }] },
            { type: 'todo', content: [{ type: 'text', text: { content: 'First action item...' }, plainText: 'First action item...' }], checked: false },
            { type: 'todo', content: [{ type: 'text', text: { content: 'Second action item...' }, plainText: 'Second action item...' }], checked: false }
        ]
    },
    {
        name: 'Court Hearing Notes',
        nameAr: 'محضر جلسة المحكمة',
        description: 'Template for documenting court hearing proceedings',
        descriptionAr: 'قالب لتوثيق جلسات المحكمة',
        category: 'court_hearing',
        icon: { type: 'emoji', emoji: '⚖️' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Hearing Notes' }, plainText: 'Hearing Notes' }] },
            { type: 'callout', icon: '📅', content: [{ type: 'text', text: { content: 'Date: [Enter date] | Court: [Enter court name]' }, plainText: 'Date: [Enter date] | Court: [Enter court name]' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Judge Statements' }, plainText: 'Judge Statements' }] },
            { type: 'party_statement', partyType: 'judge', content: [{ type: 'text', text: { content: 'Record judge statements here...' }, plainText: 'Record judge statements here...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Plaintiff Arguments' }, plainText: 'Plaintiff Arguments' }] },
            { type: 'party_statement', partyType: 'plaintiff', content: [{ type: 'text', text: { content: 'Record plaintiff arguments...' }, plainText: 'Record plaintiff arguments...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Defendant Arguments' }, plainText: 'Defendant Arguments' }] },
            { type: 'party_statement', partyType: 'defendant', content: [{ type: 'text', text: { content: 'Record defendant arguments...' }, plainText: 'Record defendant arguments...' }] },
            { type: 'divider', content: [] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Next Steps' }, plainText: 'Next Steps' }] },
            { type: 'todo', content: [{ type: 'text', text: { content: 'Follow up action...' }, plainText: 'Follow up action...' }], checked: false }
        ]
    },
    {
        name: 'Evidence Collection',
        nameAr: 'جمع الأدلة',
        description: 'Template for organizing and analyzing evidence',
        descriptionAr: 'قالب لتنظيم وتحليل الأدلة',
        category: 'evidence_analysis',
        icon: { type: 'emoji', emoji: '🔍' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Evidence Collection' }, plainText: 'Evidence Collection' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Documentary Evidence' }, plainText: 'Documentary Evidence' }] },
            { type: 'evidence_item', evidenceType: 'document', content: [{ type: 'text', text: { content: 'Document description...' }, plainText: 'Document description...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Witness Testimony' }, plainText: 'Witness Testimony' }] },
            { type: 'evidence_item', evidenceType: 'testimony', content: [{ type: 'text', text: { content: 'Testimony summary...' }, plainText: 'Testimony summary...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Digital Evidence' }, plainText: 'Digital Evidence' }] },
            { type: 'evidence_item', evidenceType: 'digital', content: [{ type: 'text', text: { content: 'Digital evidence details...' }, plainText: 'Digital evidence details...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Expert Opinions' }, plainText: 'Expert Opinions' }] },
            { type: 'evidence_item', evidenceType: 'expert_opinion', content: [{ type: 'text', text: { content: 'Expert opinion summary...' }, plainText: 'Expert opinion summary...' }] }
        ]
    },
    {
        name: 'Legal Research',
        nameAr: 'البحث القانوني',
        description: 'Template for legal research and citations',
        descriptionAr: 'قالب للبحث القانوني والمراجع',
        category: 'legal_research',
        icon: { type: 'emoji', emoji: '📚' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Legal Research' }, plainText: 'Legal Research' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Research Question' }, plainText: 'Research Question' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'State the legal question being researched...' }, plainText: 'State the legal question being researched...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Applicable Laws' }, plainText: 'Applicable Laws' }] },
            { type: 'legal_citation', citationType: 'law', citationReference: '', content: [{ type: 'text', text: { content: 'Citation details...' }, plainText: 'Citation details...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Regulations' }, plainText: 'Regulations' }] },
            { type: 'legal_citation', citationType: 'regulation', citationReference: '', content: [{ type: 'text', text: { content: 'Regulation details...' }, plainText: 'Regulation details...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Case Precedents' }, plainText: 'Case Precedents' }] },
            { type: 'legal_citation', citationType: 'case_precedent', citationReference: '', content: [{ type: 'text', text: { content: 'Precedent details...' }, plainText: 'Precedent details...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Conclusion' }, plainText: 'Conclusion' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'Summary of research findings...' }, plainText: 'Summary of research findings...' }] }
        ]
    },
    {
        name: 'Client Meeting Notes',
        nameAr: 'ملاحظات اجتماع العميل',
        description: 'Template for documenting client meetings',
        descriptionAr: 'قالب لتوثيق اجتماعات العملاء',
        category: 'client_meeting',
        icon: { type: 'emoji', emoji: '🤝' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Client Meeting Notes' }, plainText: 'Client Meeting Notes' }] },
            { type: 'callout', icon: '📅', content: [{ type: 'text', text: { content: 'Date: [Enter date] | Duration: [Enter duration]' }, plainText: 'Date: [Enter date] | Duration: [Enter duration]' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Attendees' }, plainText: 'Attendees' }] },
            { type: 'bulleted_list', content: [{ type: 'text', text: { content: 'List attendees...' }, plainText: 'List attendees...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Agenda' }, plainText: 'Agenda' }] },
            { type: 'numbered_list', content: [{ type: 'text', text: { content: 'Agenda item 1...' }, plainText: 'Agenda item 1...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Discussion Points' }, plainText: 'Discussion Points' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'Key discussion points...' }, plainText: 'Key discussion points...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Client Concerns' }, plainText: 'Client Concerns' }] },
            { type: 'bulleted_list', content: [{ type: 'text', text: { content: 'List concerns raised...' }, plainText: 'List concerns raised...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Action Items' }, plainText: 'Action Items' }] },
            { type: 'todo', content: [{ type: 'text', text: { content: 'Action item...' }, plainText: 'Action item...' }], checked: false }
        ]
    },
    {
        name: 'Case Timeline',
        nameAr: 'الجدول الزمني للقضية',
        description: 'Template for creating a chronological case timeline',
        descriptionAr: 'قالب لإنشاء جدول زمني للقضية',
        category: 'case_timeline',
        icon: { type: 'emoji', emoji: '📅' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Case Timeline' }, plainText: 'Case Timeline' }] },
            { type: 'callout', icon: '📋', content: [{ type: 'text', text: { content: 'Add events in chronological order' }, plainText: 'Add events in chronological order' }] },
            { type: 'timeline_entry', eventDate: null, eventType: 'filing', content: [{ type: 'text', text: { content: 'Case filed...' }, plainText: 'Case filed...' }] },
            { type: 'timeline_entry', eventDate: null, eventType: 'hearing', content: [{ type: 'text', text: { content: 'First hearing...' }, plainText: 'First hearing...' }] },
            { type: 'timeline_entry', eventDate: null, eventType: 'submission', content: [{ type: 'text', text: { content: 'Document submission...' }, plainText: 'Document submission...' }] },
            { type: 'divider', content: [] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Upcoming Dates' }, plainText: 'Upcoming Dates' }] },
            { type: 'todo', content: [{ type: 'text', text: { content: 'Next deadline...' }, plainText: 'Next deadline...' }], checked: false }
        ]
    },
    {
        name: 'Witness Interview',
        nameAr: 'مقابلة الشاهد',
        description: 'Template for documenting witness interviews',
        descriptionAr: 'قالب لتوثيق مقابلات الشهود',
        category: 'witness_interview',
        icon: { type: 'emoji', emoji: '👤' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Witness Interview' }, plainText: 'Witness Interview' }] },
            { type: 'callout', icon: '📅', content: [{ type: 'text', text: { content: 'Date: [Date] | Location: [Location]' }, plainText: 'Date: [Date] | Location: [Location]' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Witness Information' }, plainText: 'Witness Information' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'Name: \nRelationship to case: \nContact: ' }, plainText: 'Name: \nRelationship to case: \nContact: ' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Testimony Summary' }, plainText: 'Testimony Summary' }] },
            { type: 'party_statement', partyType: 'witness', content: [{ type: 'text', text: { content: 'Record witness statement...' }, plainText: 'Record witness statement...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Key Points' }, plainText: 'Key Points' }] },
            { type: 'bulleted_list', content: [{ type: 'text', text: { content: 'Key point from testimony...' }, plainText: 'Key point from testimony...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Credibility Assessment' }, plainText: 'Credibility Assessment' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'Assess witness credibility...' }, plainText: 'Assess witness credibility...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Follow-up Questions' }, plainText: 'Follow-up Questions' }] },
            { type: 'todo', content: [{ type: 'text', text: { content: 'Question to clarify...' }, plainText: 'Question to clarify...' }], checked: false }
        ]
    },
    {
        name: 'Settlement Negotiation',
        nameAr: 'مفاوضات التسوية',
        description: 'Template for tracking settlement negotiations',
        descriptionAr: 'قالب لتتبع مفاوضات التسوية',
        category: 'settlement_negotiation',
        icon: { type: 'emoji', emoji: '🤝' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Settlement Negotiation' }, plainText: 'Settlement Negotiation' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Our Position' }, plainText: 'Our Position' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'State our settlement position...' }, plainText: 'State our settlement position...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Opposing Position' }, plainText: 'Opposing Position' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'State opposing party position...' }, plainText: 'State opposing party position...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Negotiation History' }, plainText: 'Negotiation History' }] },
            { type: 'timeline_entry', eventDate: null, content: [{ type: 'text', text: { content: 'Initial offer...' }, plainText: 'Initial offer...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Terms Under Discussion' }, plainText: 'Terms Under Discussion' }] },
            { type: 'numbered_list', content: [{ type: 'text', text: { content: 'Term 1...' }, plainText: 'Term 1...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Recommendation' }, plainText: 'Recommendation' }] },
            { type: 'callout', icon: '💡', content: [{ type: 'text', text: { content: 'Settlement recommendation...' }, plainText: 'Settlement recommendation...' }] }
        ]
    },
    {
        name: 'Brainstorming Session',
        nameAr: 'جلسة العصف الذهني',
        description: 'Template for case brainstorming sessions',
        descriptionAr: 'قالب لجلسات العصف الذهني',
        category: 'brainstorming',
        icon: { type: 'emoji', emoji: '💡' },
        isGlobal: true,
        blocks: [
            { type: 'heading_1', content: [{ type: 'text', text: { content: 'Brainstorming Session' }, plainText: 'Brainstorming Session' }] },
            { type: 'callout', icon: '🎯', content: [{ type: 'text', text: { content: 'Topic: [Enter brainstorm topic]' }, plainText: 'Topic: [Enter brainstorm topic]' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Ideas' }, plainText: 'Ideas' }] },
            { type: 'bulleted_list', content: [{ type: 'text', text: { content: 'Idea 1...' }, plainText: 'Idea 1...' }] },
            { type: 'bulleted_list', content: [{ type: 'text', text: { content: 'Idea 2...' }, plainText: 'Idea 2...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Pros & Cons' }, plainText: 'Pros & Cons' }] },
            { type: 'table', tableData: { headers: ['Option', 'Pros', 'Cons'], rows: [['Option 1', '', '']], hasHeaderRow: true } },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Selected Approach' }, plainText: 'Selected Approach' }] },
            { type: 'text', content: [{ type: 'text', text: { content: 'Document chosen approach and rationale...' }, plainText: 'Document chosen approach and rationale...' }] },
            { type: 'heading_2', content: [{ type: 'text', text: { content: 'Next Steps' }, plainText: 'Next Steps' }] },
            { type: 'todo', content: [{ type: 'text', text: { content: 'Action to implement...' }, plainText: 'Action to implement...' }], checked: false }
        ]
    }
];

const seedTemplates = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        logger.info('Connected to MongoDB');

        const PageTemplate = require('../models/pageTemplate.model');

        // Check existing templates
        const existingCount = await PageTemplate.countDocuments({ isGlobal: true });

        if (existingCount > 0) {
            logger.info('Global templates already exist. Skipping seed.');
            await mongoose.disconnect();
            return;
        }

        // Create admin user ID placeholder (templates without createdBy)
        for (const template of templates) {
            await PageTemplate.create({
                ...template,
                createdBy: new mongoose.Types.ObjectId() // Placeholder
            });
            logger.info('Created template:', template.name);
        }

        logger.info('\nSeeded', templates.length, 'default templates');
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB');
    } catch (error) {
        logger.error('Seed failed:', error);
        process.exit(1);
    }
};

// Run if called directly
if (require.main === module) {
    seedTemplates();
}

module.exports = { templates, seedTemplates };
