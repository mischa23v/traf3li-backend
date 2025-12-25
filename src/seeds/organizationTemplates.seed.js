/**
 * Organization Templates Seed
 * Creates default organization templates for different firm sizes and types
 *
 * Run with: node src/seeds/organizationTemplates.seed.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');
const OrganizationTemplate = require('../models/organizationTemplate.model');

const templates = [
    // ═══════════════════════════════════════════════════════════════
    // 1. STANDARD LAW FIRM - Full hierarchy
    // ═══════════════════════════════════════════════════════════════
    {
        name: 'Standard Law Firm',
        nameAr: 'مكتب محاماة قياسي',
        description: 'Complete role hierarchy suitable for established law firms with multiple departments',
        descriptionAr: 'هيكل أدوار كامل مناسب لمكاتب المحاماة الراسخة مع أقسام متعددة',
        isDefault: true, // This is the default template
        isActive: true,
        isGlobal: true,
        roles: [
            {
                name: 'owner',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'full', settings: 'full', team: 'full', hr: 'full',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: true, canViewFinance: true, canManageTeam: true
                },
                isDefault: false,
                description: 'Firm owner with complete control',
                descriptionAr: 'صاحب المكتب مع كامل الصلاحيات'
            },
            {
                name: 'admin',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'full', settings: 'edit', team: 'full', hr: 'full',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: true, canViewFinance: true, canManageTeam: true
                },
                isDefault: false,
                description: 'Administrative manager with extensive access',
                descriptionAr: 'مدير إداري مع صلاحيات واسعة'
            },
            {
                name: 'partner',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'edit',
                    expenses: 'edit', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'view', settings: 'view', team: 'view', hr: 'none',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: false, canViewFinance: true, canManageTeam: false
                },
                isDefault: false,
                description: 'Senior partner with full case management',
                descriptionAr: 'شريك أول مع إدارة كاملة للقضايا'
            },
            {
                name: 'lawyer',
                permissions: {
                    clients: 'edit', cases: 'edit', leads: 'edit', invoices: 'edit', payments: 'view',
                    expenses: 'edit', documents: 'edit', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'view', settings: 'none', team: 'view', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: true,
                description: 'Standard lawyer with case handling capabilities',
                descriptionAr: 'محامي عادي مع قدرات إدارة القضايا'
            },
            {
                name: 'paralegal',
                permissions: {
                    clients: 'edit', cases: 'edit', leads: 'edit', invoices: 'view', payments: 'none',
                    expenses: 'view', documents: 'edit', tasks: 'edit', events: 'edit', timeTracking: 'edit',
                    reports: 'none', settings: 'none', team: 'view', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: false,
                description: 'Legal assistant supporting lawyers',
                descriptionAr: 'مساعد قانوني يدعم المحامين'
            },
            {
                name: 'secretary',
                permissions: {
                    clients: 'view', cases: 'view', leads: 'edit', invoices: 'view', payments: 'view',
                    expenses: 'view', documents: 'view', tasks: 'edit', events: 'edit', timeTracking: 'view',
                    reports: 'none', settings: 'none', team: 'view', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: false,
                description: 'Administrative support staff',
                descriptionAr: 'موظف دعم إداري'
            },
            {
                name: 'accountant',
                permissions: {
                    clients: 'view', cases: 'none', leads: 'none', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'view', tasks: 'edit', events: 'edit', timeTracking: 'view',
                    reports: 'full', settings: 'none', team: 'none', hr: 'view',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: false, canViewFinance: true, canManageTeam: false
                },
                isDefault: false,
                description: 'Financial management and accounting',
                descriptionAr: 'إدارة مالية ومحاسبة'
            }
        ],
        settings: {
            maxConcurrentSessions: 5,
            sessionTimeout: 7,
            mfaRequired: false,
            ipRestrictionEnabled: false,
            defaultRateLimits: { api: 1000, upload: 50, export: 10 },
            passwordPolicy: {
                minLength: 8,
                requireUppercase: false,
                requireNumbers: false,
                maxAgeDays: 90,
                preventReuse: 5
            },
            timezone: 'Asia/Riyadh',
            language: 'ar',
            dateFormat: 'DD/MM/YYYY',
            fiscalYearStart: 1,
            defaultCasePrefix: 'CASE',
            defaultClientPrefix: 'CLT',
            numberingFormat: 'yearly',
            defaultCurrency: 'SAR',
            defaultPaymentTerms: 30,
            invoicePrefix: 'INV',
            dataRetentionDays: 365,
            autoDeleteOldData: false
        },
        features: {
            nlpTaskCreation: false,
            voiceToTask: false,
            smartScheduling: false,
            aiAssistant: false,
            zatcaIntegration: false,
            advancedReports: true,
            multiCurrency: false,
            apiAccess: false,
            customBranding: false,
            dealRooms: true,
            clientPortal: true,
            documentSharing: true,
            ssoEnabled: false,
            auditLogs: true,
            encryptionAtRest: false
        },
        subscriptionDefaults: {
            plan: 'professional',
            trialDays: 14,
            maxUsers: 10,
            maxCases: 500,
            maxClients: 1000,
            maxStorageGB: 20
        },
        metadata: {
            targetFirmSize: 'medium',
            targetPracticeAreas: ['general', 'corporate', 'litigation'],
            recommendedFor: ['Established firms', 'Multiple departments', 'Full team hierarchy'],
            notes: 'Best for firms with 5-20 employees needing complete role separation'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 2. SOLO PRACTITIONER - Minimal setup
    // ═══════════════════════════════════════════════════════════════
    {
        name: 'Solo Practitioner',
        nameAr: 'محامي فردي',
        description: 'Streamlined setup for individual lawyers practicing independently',
        descriptionAr: 'إعداد مبسط للمحامين الأفراد الذين يمارسون بشكل مستقل',
        isDefault: false,
        isActive: true,
        isGlobal: true,
        roles: [
            {
                name: 'owner',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'full', settings: 'full', team: 'full', hr: 'none',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: true, canViewFinance: true, canManageTeam: false
                },
                isDefault: true,
                description: 'Solo practitioner with full access',
                descriptionAr: 'محامي فردي مع كامل الصلاحيات'
            },
            {
                name: 'secretary',
                permissions: {
                    clients: 'view', cases: 'view', leads: 'edit', invoices: 'view', payments: 'none',
                    expenses: 'view', documents: 'view', tasks: 'edit', events: 'edit', timeTracking: 'view',
                    reports: 'none', settings: 'none', team: 'none', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: false,
                description: 'Optional administrative assistant',
                descriptionAr: 'مساعد إداري اختياري'
            }
        ],
        settings: {
            maxConcurrentSessions: 3,
            sessionTimeout: 14,
            mfaRequired: false,
            ipRestrictionEnabled: false,
            defaultRateLimits: { api: 500, upload: 30, export: 10 },
            passwordPolicy: {
                minLength: 8,
                requireUppercase: false,
                requireNumbers: false,
                maxAgeDays: 0,
                preventReuse: 0
            },
            timezone: 'Asia/Riyadh',
            language: 'ar',
            dateFormat: 'DD/MM/YYYY',
            fiscalYearStart: 1,
            defaultCasePrefix: 'CASE',
            defaultClientPrefix: 'CLT',
            numberingFormat: 'sequential',
            defaultCurrency: 'SAR',
            defaultPaymentTerms: 30,
            invoicePrefix: 'INV',
            dataRetentionDays: 365,
            autoDeleteOldData: false
        },
        features: {
            nlpTaskCreation: false,
            voiceToTask: false,
            smartScheduling: false,
            aiAssistant: false,
            zatcaIntegration: false,
            advancedReports: false,
            multiCurrency: false,
            apiAccess: false,
            customBranding: false,
            dealRooms: false,
            clientPortal: false,
            documentSharing: true,
            ssoEnabled: false,
            auditLogs: false,
            encryptionAtRest: false
        },
        subscriptionDefaults: {
            plan: 'starter',
            trialDays: 14,
            maxUsers: 2,
            maxCases: 50,
            maxClients: 100,
            maxStorageGB: 5
        },
        metadata: {
            targetFirmSize: 'solo',
            targetPracticeAreas: ['general', 'family', 'real_estate'],
            recommendedFor: ['Individual lawyers', 'Small practices', 'Starting out'],
            notes: 'Ideal for solo practitioners or firms with 1-2 people'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 3. ENTERPRISE FIRM - All features enabled
    // ═══════════════════════════════════════════════════════════════
    {
        name: 'Enterprise Firm',
        nameAr: 'مؤسسة قانونية كبرى',
        description: 'Advanced configuration for large law firms with enterprise requirements',
        descriptionAr: 'تكوين متقدم لمكاتب المحاماة الكبيرة مع متطلبات المؤسسات',
        isDefault: false,
        isActive: true,
        isGlobal: true,
        roles: [
            {
                name: 'owner',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'full', settings: 'full', team: 'full', hr: 'full',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: true, canViewFinance: true, canManageTeam: true
                },
                isDefault: false,
                description: 'Managing partner with full control',
                descriptionAr: 'شريك إداري مع كامل الصلاحيات'
            },
            {
                name: 'admin',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'full', settings: 'edit', team: 'full', hr: 'full',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: true, canViewFinance: true, canManageTeam: true
                },
                isDefault: false,
                description: 'Operations manager',
                descriptionAr: 'مدير العمليات'
            },
            {
                name: 'partner',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'edit',
                    expenses: 'edit', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'view', settings: 'view', team: 'view', hr: 'none',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: false, canViewFinance: true, canManageTeam: false
                },
                isDefault: false,
                description: 'Senior partner managing cases',
                descriptionAr: 'شريك أول يدير القضايا'
            },
            {
                name: 'lawyer',
                permissions: {
                    clients: 'edit', cases: 'edit', leads: 'edit', invoices: 'edit', payments: 'view',
                    expenses: 'edit', documents: 'edit', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'view', settings: 'none', team: 'view', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: true,
                description: 'Associate lawyer',
                descriptionAr: 'محامي مساعد'
            },
            {
                name: 'paralegal',
                permissions: {
                    clients: 'edit', cases: 'edit', leads: 'edit', invoices: 'view', payments: 'none',
                    expenses: 'view', documents: 'edit', tasks: 'edit', events: 'edit', timeTracking: 'edit',
                    reports: 'none', settings: 'none', team: 'view', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: false,
                description: 'Paralegal support',
                descriptionAr: 'دعم قانوني'
            },
            {
                name: 'secretary',
                permissions: {
                    clients: 'view', cases: 'view', leads: 'edit', invoices: 'view', payments: 'view',
                    expenses: 'view', documents: 'view', tasks: 'edit', events: 'edit', timeTracking: 'view',
                    reports: 'none', settings: 'none', team: 'view', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: false,
                description: 'Administrative support',
                descriptionAr: 'دعم إداري'
            },
            {
                name: 'accountant',
                permissions: {
                    clients: 'view', cases: 'none', leads: 'none', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'view', tasks: 'edit', events: 'edit', timeTracking: 'view',
                    reports: 'full', settings: 'none', team: 'none', hr: 'view',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: false, canViewFinance: true, canManageTeam: false
                },
                isDefault: false,
                description: 'Finance department',
                descriptionAr: 'قسم المالية'
            }
        ],
        settings: {
            maxConcurrentSessions: 10,
            sessionTimeout: 3,
            mfaRequired: true,
            ipRestrictionEnabled: true,
            defaultRateLimits: { api: 5000, upload: 200, export: 50 },
            passwordPolicy: {
                minLength: 12,
                requireUppercase: true,
                requireNumbers: true,
                requireSpecialChars: true,
                maxAgeDays: 60,
                preventReuse: 12
            },
            timezone: 'Asia/Riyadh',
            language: 'ar',
            dateFormat: 'DD/MM/YYYY',
            fiscalYearStart: 1,
            defaultCasePrefix: 'CASE',
            defaultClientPrefix: 'CLT',
            numberingFormat: 'yearly',
            defaultCurrency: 'SAR',
            defaultPaymentTerms: 30,
            invoicePrefix: 'INV',
            dataRetentionDays: 2555,
            autoDeleteOldData: false
        },
        features: {
            nlpTaskCreation: true,
            voiceToTask: true,
            smartScheduling: true,
            aiAssistant: true,
            zatcaIntegration: true,
            advancedReports: true,
            multiCurrency: true,
            apiAccess: true,
            customBranding: true,
            dealRooms: true,
            clientPortal: true,
            documentSharing: true,
            ssoEnabled: true,
            auditLogs: true,
            encryptionAtRest: true
        },
        subscriptionDefaults: {
            plan: 'enterprise',
            trialDays: 30,
            maxUsers: 100,
            maxCases: 10000,
            maxClients: 20000,
            maxStorageGB: 500
        },
        metadata: {
            targetFirmSize: 'enterprise',
            targetPracticeAreas: ['all'],
            recommendedFor: ['Large firms', 'Multiple offices', 'Enterprise security needs'],
            notes: 'For firms with 50+ employees requiring advanced security and all features'
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 4. BOUTIQUE FIRM - Mid-size configuration
    // ═══════════════════════════════════════════════════════════════
    {
        name: 'Boutique Firm',
        nameAr: 'مكتب متخصص',
        description: 'Balanced configuration for specialized mid-size firms',
        descriptionAr: 'تكوين متوازن لمكاتب متوسطة الحجم متخصصة',
        isDefault: false,
        isActive: true,
        isGlobal: true,
        roles: [
            {
                name: 'owner',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'full', settings: 'full', team: 'full', hr: 'full',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: true, canViewFinance: true, canManageTeam: true
                },
                isDefault: false,
                description: 'Founding partner',
                descriptionAr: 'شريك مؤسس'
            },
            {
                name: 'partner',
                permissions: {
                    clients: 'full', cases: 'full', leads: 'full', invoices: 'full', payments: 'view',
                    expenses: 'edit', documents: 'full', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'view', settings: 'view', team: 'view', hr: 'none',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: false, canViewFinance: true, canManageTeam: false
                },
                isDefault: false,
                description: 'Equity partner',
                descriptionAr: 'شريك بحصة'
            },
            {
                name: 'lawyer',
                permissions: {
                    clients: 'edit', cases: 'edit', leads: 'edit', invoices: 'edit', payments: 'view',
                    expenses: 'edit', documents: 'edit', tasks: 'full', events: 'full', timeTracking: 'full',
                    reports: 'view', settings: 'none', team: 'view', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: true,
                description: 'Associate attorney',
                descriptionAr: 'محامي مشارك'
            },
            {
                name: 'paralegal',
                permissions: {
                    clients: 'edit', cases: 'edit', leads: 'edit', invoices: 'view', payments: 'none',
                    expenses: 'view', documents: 'edit', tasks: 'edit', events: 'edit', timeTracking: 'edit',
                    reports: 'none', settings: 'none', team: 'view', hr: 'none',
                    canApproveInvoices: false, canManageRetainers: false, canExportData: false,
                    canDeleteRecords: false, canViewFinance: false, canManageTeam: false
                },
                isDefault: false,
                description: 'Legal assistant',
                descriptionAr: 'مساعد قانوني'
            },
            {
                name: 'accountant',
                permissions: {
                    clients: 'view', cases: 'none', leads: 'none', invoices: 'full', payments: 'full',
                    expenses: 'full', documents: 'view', tasks: 'edit', events: 'edit', timeTracking: 'view',
                    reports: 'full', settings: 'none', team: 'none', hr: 'view',
                    canApproveInvoices: true, canManageRetainers: true, canExportData: true,
                    canDeleteRecords: false, canViewFinance: true, canManageTeam: false
                },
                isDefault: false,
                description: 'Financial manager',
                descriptionAr: 'مدير مالي'
            }
        ],
        settings: {
            maxConcurrentSessions: 5,
            sessionTimeout: 5,
            mfaRequired: false,
            ipRestrictionEnabled: false,
            defaultRateLimits: { api: 2000, upload: 100, export: 20 },
            passwordPolicy: {
                minLength: 10,
                requireUppercase: true,
                requireNumbers: true,
                maxAgeDays: 90,
                preventReuse: 8
            },
            timezone: 'Asia/Riyadh',
            language: 'ar',
            dateFormat: 'DD/MM/YYYY',
            fiscalYearStart: 1,
            defaultCasePrefix: 'CASE',
            defaultClientPrefix: 'CLT',
            numberingFormat: 'yearly',
            defaultCurrency: 'SAR',
            defaultPaymentTerms: 30,
            invoicePrefix: 'INV',
            dataRetentionDays: 730,
            autoDeleteOldData: false
        },
        features: {
            nlpTaskCreation: false,
            voiceToTask: false,
            smartScheduling: true,
            aiAssistant: false,
            zatcaIntegration: true,
            advancedReports: true,
            multiCurrency: false,
            apiAccess: false,
            customBranding: true,
            dealRooms: true,
            clientPortal: true,
            documentSharing: true,
            ssoEnabled: false,
            auditLogs: true,
            encryptionAtRest: false
        },
        subscriptionDefaults: {
            plan: 'professional',
            trialDays: 14,
            maxUsers: 20,
            maxCases: 2000,
            maxClients: 5000,
            maxStorageGB: 100
        },
        metadata: {
            targetFirmSize: 'medium',
            targetPracticeAreas: ['specialized', 'corporate', 'intellectual_property'],
            recommendedFor: ['Specialized practices', '5-20 lawyers', 'Growing firms'],
            notes: 'Perfect for boutique firms focusing on specific practice areas'
        }
    }
];

/**
 * Seed the database with default templates
 */
async function seedTemplates() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        logger.info('✓ Connected to MongoDB');

        // Clear existing templates (optional - uncomment if you want to reset)
        // await OrganizationTemplate.deleteMany({ isGlobal: true });
        // logger.info('✓ Cleared existing global templates');

        // Insert templates
        const results = [];
        for (const templateData of templates) {
            try {
                // Check if template already exists
                const existing = await OrganizationTemplate.findOne({
                    name: templateData.name,
                    isGlobal: true
                });

                if (existing) {
                    logger.info(`⊘ Template "${templateData.name}" already exists, skipping`);
                    results.push({ name: templateData.name, status: 'skipped' });
                    continue;
                }

                // Create template
                const template = await OrganizationTemplate.create(templateData);
                logger.info(`✓ Created template: ${template.name}`);
                results.push({ name: template.name, status: 'created', id: template._id });
            } catch (error) {
                logger.error(`✗ Failed to create template "${templateData.name}":`, error.message);
                results.push({ name: templateData.name, status: 'failed', error: error.message });
            }
        }

        // Print summary
        logger.info('\n═══════════════════════════════════════════════════');
        logger.info('SEED SUMMARY');
        logger.info('═══════════════════════════════════════════════════');
        logger.info(`Total templates: ${templates.length}`);
        logger.info(`Created: ${results.filter(r => r.status === 'created').length}`);
        logger.info(`Skipped: ${results.filter(r => r.status === 'skipped').length}`);
        logger.info(`Failed: ${results.filter(r => r.status === 'failed').length}`);
        logger.info('═══════════════════════════════════════════════════\n');

        // Verify default template
        const defaultTemplate = await OrganizationTemplate.findOne({ isDefault: true });
        if (defaultTemplate) {
            logger.info(`✓ Default template: ${defaultTemplate.name}`);
        } else {
            logger.warn('⚠ No default template found!');
        }

        process.exit(0);
    } catch (error) {
        logger.error('✗ Seed failed:', error);
        process.exit(1);
    }
}

// Run seeder
if (require.main === module) {
    seedTemplates();
}

module.exports = { templates, seedTemplates };
