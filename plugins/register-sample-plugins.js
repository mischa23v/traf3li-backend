/**
 * Script to register sample plugins
 *
 * Run this script to register the sample plugins in the database.
 * Usage: node plugins/register-sample-plugins.js
 */

const mongoose = require('mongoose');
const Plugin = require('../src/models/plugin.model');

// Plugin configurations
const plugins = [
    {
        name: 'slack-notifications',
        displayName: 'Slack Notifications',
        description: 'Send notifications to Slack channels when events occur in your firm',
        version: '1.0.0',
        author: 'Traf3li Team',
        category: 'integration',
        entryPoint: 'slack-notifications/index.js',
        permissions: ['cases:read', 'invoices:read', 'tasks:read'],
        settings: {
            webhookUrl: {
                type: 'string',
                required: true,
                label: 'Slack Webhook URL',
                description: 'Your Slack incoming webhook URL (https://hooks.slack.com/...)',
                placeholder: 'https://hooks.slack.com/services/...'
            },
            notifyOnCaseCreated: {
                type: 'boolean',
                required: false,
                label: 'Notify on Case Created',
                description: 'Send notification when a new case is created',
                default: true
            },
            notifyOnInvoicePaid: {
                type: 'boolean',
                required: false,
                label: 'Notify on Invoice Paid',
                description: 'Send notification when an invoice is paid',
                default: true
            },
            notifyOnTaskOverdue: {
                type: 'boolean',
                required: false,
                label: 'Notify on Task Overdue',
                description: 'Send notification when a task becomes overdue',
                default: true
            }
        },
        hooks: [
            { event: 'case:created', handler: 'hooks.case:created' },
            { event: 'invoice:paid', handler: 'hooks.invoice:paid' },
            { event: 'task:overdue', handler: 'hooks.task:overdue' }
        ],
        routes: [
            {
                method: 'POST',
                path: '/test',
                handler: 'routes.testConnection',
                auth: true,
                permissions: []
            }
        ],
        isSystem: true,
        isActive: true,
        icon: '🔔',
        documentation: 'Connect your Slack workspace to receive real-time notifications',
        supportUrl: 'https://support.traf3li.com/slack-integration'
    },
    {
        name: 'custom-reports',
        displayName: 'Custom Reports',
        description: 'Generate advanced PDF and Excel reports with custom formatting',
        version: '1.0.0',
        author: 'Traf3li Team',
        category: 'reporting',
        entryPoint: 'custom-reports/index.js',
        permissions: ['cases:read', 'invoices:read', 'time-entries:read', 'reports:create'],
        settings: {
            defaultFormat: {
                type: 'string',
                required: false,
                label: 'Default Report Format',
                description: 'Default format for generated reports',
                enum: ['pdf', 'excel'],
                default: 'pdf'
            },
            includeFirmLogo: {
                type: 'boolean',
                required: false,
                label: 'Include Firm Logo',
                description: 'Include firm logo in reports',
                default: true
            },
            autoGenerateMonthly: {
                type: 'boolean',
                required: false,
                label: 'Auto-Generate Monthly Reports',
                description: 'Automatically generate monthly summary reports',
                default: false
            }
        },
        hooks: [
            { event: 'monthly:report', handler: 'hooks.monthly:report' }
        ],
        routes: [
            {
                method: 'POST',
                path: '/case-summary',
                handler: 'routes.generateCaseSummary',
                auth: true,
                permissions: ['reports:create']
            },
            {
                method: 'POST',
                path: '/financial',
                handler: 'routes.generateFinancialReport',
                auth: true,
                permissions: ['reports:create', 'invoices:read']
            },
            {
                method: 'POST',
                path: '/time-tracking',
                handler: 'routes.generateTimeReport',
                auth: true,
                permissions: ['reports:create', 'time-entries:read']
            }
        ],
        isSystem: true,
        isActive: true,
        icon: '📊',
        documentation: 'Create professional reports with custom templates and branding',
        supportUrl: 'https://support.traf3li.com/custom-reports'
    },
    {
        name: 'ai-suggestions',
        displayName: 'AI-Powered Suggestions',
        description: 'Get AI-powered insights, suggestions, and analysis for your cases',
        version: '1.0.0',
        author: 'Traf3li Team',
        category: 'automation',
        entryPoint: 'ai-suggestions/index.js',
        permissions: ['cases:read', 'cases:write', 'documents:read', 'ai:use'],
        settings: {
            aiModel: {
                type: 'string',
                required: false,
                label: 'AI Model',
                description: 'AI model to use for suggestions',
                enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3'],
                default: 'gpt-3.5-turbo'
            },
            openaiApiKey: {
                type: 'string',
                required: false,
                label: 'OpenAI API Key',
                description: 'Your OpenAI API key (optional, uses firm settings if not provided)',
                placeholder: 'sk-...'
            },
            suggestSimilarCases: {
                type: 'boolean',
                required: false,
                label: 'Suggest Similar Cases',
                description: 'Automatically suggest similar cases when creating new cases',
                default: true
            },
            suggestDocumentTemplates: {
                type: 'boolean',
                required: false,
                label: 'Suggest Document Templates',
                description: 'Suggest relevant templates when uploading documents',
                default: true
            },
            suggestNextTasks: {
                type: 'boolean',
                required: false,
                label: 'Suggest Next Tasks',
                description: 'Suggest tasks based on case status changes',
                default: true
            }
        },
        hooks: [
            { event: 'case:created', handler: 'hooks.case:created' },
            { event: 'document:uploaded', handler: 'hooks.document:uploaded' },
            { event: 'case:status_changed', handler: 'hooks.case:status_changed' }
        ],
        routes: [
            {
                method: 'POST',
                path: '/analyze-case',
                handler: 'routes.analyzeCase',
                auth: true,
                permissions: ['cases:read', 'ai:use']
            },
            {
                method: 'POST',
                path: '/summarize-document',
                handler: 'routes.summarizeDocument',
                auth: true,
                permissions: ['documents:read', 'ai:use']
            },
            {
                method: 'POST',
                path: '/research-topics',
                handler: 'routes.suggestResearchTopics',
                auth: true,
                permissions: ['cases:read', 'ai:use']
            }
        ],
        isSystem: true,
        isActive: true,
        icon: '🤖',
        documentation: 'Leverage AI to analyze cases, summarize documents, and get intelligent suggestions',
        supportUrl: 'https://support.traf3li.com/ai-suggestions'
    }
];

async function registerPlugins() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/traf3li';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Register each plugin
        for (const pluginConfig of plugins) {
            // Check if plugin already exists
            const existingPlugin = await Plugin.findOne({ name: pluginConfig.name });

            if (existingPlugin) {
                console.log(`✓ Plugin '${pluginConfig.name}' already registered, updating...`);
                await Plugin.findByIdAndUpdate(existingPlugin._id, pluginConfig);
            } else {
                console.log(`+ Registering plugin '${pluginConfig.name}'...`);
                await Plugin.create(pluginConfig);
            }

            console.log(`  ${pluginConfig.icon} ${pluginConfig.displayName} v${pluginConfig.version}`);
        }

        console.log('\n✅ All sample plugins registered successfully!');
        console.log(`\nRegistered ${plugins.length} plugins:`);
        plugins.forEach(p => console.log(`  - ${p.displayName}`));

    } catch (error) {
        console.error('❌ Error registering plugins:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    }
}

// Run if called directly
if (require.main === module) {
    registerPlugins();
}

module.exports = { registerPlugins, plugins };
