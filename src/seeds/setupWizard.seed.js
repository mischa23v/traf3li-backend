const SetupSection = require('../models/setupSection.model');
const SetupTask = require('../models/setupTask.model');

// ═══════════════════════════════════════════════════════════════
// SETUP SECTIONS
// ═══════════════════════════════════════════════════════════════

const sections = [
    {
        sectionId: 'company',
        name: 'Company Setup',
        nameAr: 'إعداد الشركة',
        description: 'Set up your company profile and settings',
        descriptionAr: 'إعداد ملف الشركة والإعدادات',
        icon: 'building',
        orderIndex: 1,
        isRequired: true
    },
    {
        sectionId: 'team',
        name: 'Team Setup',
        nameAr: 'إعداد الفريق',
        description: 'Configure team structure and members',
        descriptionAr: 'تكوين هيكل الفريق والأعضاء',
        icon: 'users',
        orderIndex: 2,
        isRequired: true
    },
    {
        sectionId: 'modules',
        name: 'Modules & Features',
        nameAr: 'الوحدات والميزات',
        description: 'Enable and configure system modules',
        descriptionAr: 'تفعيل وإعداد وحدات النظام',
        icon: 'grid',
        orderIndex: 3,
        isRequired: false
    },
    {
        sectionId: 'integrations',
        name: 'Integrations',
        nameAr: 'التكاملات',
        description: 'Connect external services and tools',
        descriptionAr: 'ربط الخدمات والأدوات الخارجية',
        icon: 'link',
        orderIndex: 4,
        isRequired: false
    },
    {
        sectionId: 'preferences',
        name: 'Preferences',
        nameAr: 'التفضيلات',
        description: 'Customize your workspace and notifications',
        descriptionAr: 'تخصيص مساحة العمل والإشعارات',
        icon: 'settings',
        orderIndex: 5,
        isRequired: false
    }
];

// ═══════════════════════════════════════════════════════════════
// SETUP TASKS
// ═══════════════════════════════════════════════════════════════

const tasks = [
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // COMPANY SETUP TASKS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        taskId: 'company_profile',
        sectionId: 'company',
        name: 'Complete Company Profile',
        nameAr: 'استكمال ملف الشركة',
        description: 'Add company name, address, and contact information',
        descriptionAr: 'إضافة اسم الشركة والعنوان ومعلومات الاتصال',
        orderIndex: 1,
        isRequired: true,
        actionUrl: '/settings/company',
        checkEndpoint: '/api/setup/check/company-info',
        estimatedMinutes: 5,
        validationRules: {
            requiredFields: ['name', 'email'],
            requiredModels: [],
            minimumCount: 0
        }
    },
    {
        taskId: 'company_logo',
        sectionId: 'company',
        name: 'Upload Company Logo',
        nameAr: 'رفع شعار الشركة',
        description: 'Upload your company logo for branding',
        descriptionAr: 'رفع شعار شركتك للعلامة التجارية',
        orderIndex: 2,
        isRequired: false,
        actionUrl: '/settings/company/branding',
        checkEndpoint: '/api/setup/check/company-logo',
        estimatedMinutes: 3
    },
    {
        taskId: 'business_hours',
        sectionId: 'company',
        name: 'Set Business Hours',
        nameAr: 'تحديد ساعات العمل',
        description: 'Configure your company working hours',
        descriptionAr: 'إعداد ساعات عمل شركتك',
        orderIndex: 3,
        isRequired: false,
        actionUrl: '/settings/company/hours',
        estimatedMinutes: 5
    },
    {
        taskId: 'fiscal_year',
        sectionId: 'company',
        name: 'Configure Fiscal Year',
        nameAr: 'تكوين السنة المالية',
        description: 'Set up your fiscal year settings',
        descriptionAr: 'إعداد إعدادات السنة المالية',
        orderIndex: 4,
        isRequired: true,
        actionUrl: '/settings/company/fiscal',
        estimatedMinutes: 3,
        dependencies: ['company_profile']
    },
    {
        taskId: 'currency_settings',
        sectionId: 'company',
        name: 'Set Currency',
        nameAr: 'تحديد العملة',
        description: 'Configure default currency and format',
        descriptionAr: 'إعداد العملة الافتراضية والتنسيق',
        orderIndex: 5,
        isRequired: true,
        actionUrl: '/settings/company/currency',
        estimatedMinutes: 2
    },
    {
        taskId: 'tax_settings',
        sectionId: 'company',
        name: 'Configure Tax Settings',
        nameAr: 'إعداد إعدادات الضرائب',
        description: 'Set up VAT and tax configuration',
        descriptionAr: 'إعداد ضريبة القيمة المضافة والضرائب',
        orderIndex: 6,
        isRequired: false,
        actionUrl: '/settings/company/tax',
        estimatedMinutes: 10
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEAM SETUP TASKS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        taskId: 'departments',
        sectionId: 'team',
        name: 'Create Departments',
        nameAr: 'إنشاء الأقسام',
        description: 'Set up your organizational departments',
        descriptionAr: 'إعداد أقسام المؤسسة',
        orderIndex: 1,
        isRequired: true,
        actionUrl: '/settings/departments',
        checkEndpoint: '/api/setup/check/departments',
        estimatedMinutes: 10,
        dependencies: ['company_profile'],
        validationRules: {
            requiredModels: ['Department'],
            minimumCount: 1
        }
    },
    {
        taskId: 'designations',
        sectionId: 'team',
        name: 'Add Job Titles',
        nameAr: 'إضافة المسميات الوظيفية',
        description: 'Define job titles and positions',
        descriptionAr: 'تحديد المسميات الوظيفية والمناصب',
        orderIndex: 2,
        isRequired: true,
        actionUrl: '/settings/designations',
        estimatedMinutes: 10,
        dependencies: ['departments'],
        validationRules: {
            requiredModels: ['Designation'],
            minimumCount: 1
        }
    },
    {
        taskId: 'invite_team',
        sectionId: 'team',
        name: 'Invite Team Members',
        nameAr: 'دعوة أعضاء الفريق',
        description: 'Send invitations to your team members',
        descriptionAr: 'إرسال الدعوات لأعضاء فريقك',
        orderIndex: 3,
        isRequired: false,
        actionUrl: '/settings/team/invite',
        estimatedMinutes: 5,
        dependencies: ['departments', 'designations']
    },
    {
        taskId: 'roles_permissions',
        sectionId: 'team',
        name: 'Configure Roles & Permissions',
        nameAr: 'إعداد الأدوار والصلاحيات',
        description: 'Set up user roles and access permissions',
        descriptionAr: 'إعداد أدوار المستخدمين وصلاحيات الوصول',
        orderIndex: 4,
        isRequired: true,
        actionUrl: '/settings/roles',
        estimatedMinutes: 15,
        dependencies: ['departments']
    },
    {
        taskId: 'approval_workflows',
        sectionId: 'team',
        name: 'Set Up Approval Workflows',
        nameAr: 'إعداد سير عمل الموافقات',
        description: 'Configure approval chains for requests',
        descriptionAr: 'إعداد سلاسل الموافقة للطلبات',
        orderIndex: 5,
        isRequired: false,
        actionUrl: '/settings/workflows',
        estimatedMinutes: 20,
        dependencies: ['roles_permissions']
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MODULES & FEATURES TASKS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        taskId: 'enable_hr_module',
        sectionId: 'modules',
        name: 'Enable HR Module',
        nameAr: 'تفعيل وحدة الموارد البشرية',
        description: 'Activate HR management features',
        descriptionAr: 'تفعيل ميزات إدارة الموارد البشرية',
        orderIndex: 1,
        isRequired: false,
        actionUrl: '/settings/modules/hr',
        estimatedMinutes: 5
    },
    {
        taskId: 'hr_leave_types',
        sectionId: 'modules',
        name: 'Configure Leave Types',
        nameAr: 'إعداد أنواع الإجازات',
        description: 'Set up leave types (annual, sick, etc.)',
        descriptionAr: 'إعداد أنواع الإجازات (سنوية، مرضية، إلخ)',
        orderIndex: 2,
        isRequired: false,
        actionUrl: '/hr/leave-types',
        estimatedMinutes: 10,
        dependencies: ['enable_hr_module']
    },
    {
        taskId: 'hr_shifts',
        sectionId: 'modules',
        name: 'Set Up Work Shifts',
        nameAr: 'إعداد نوبات العمل',
        description: 'Configure work shifts and schedules',
        descriptionAr: 'إعداد نوبات العمل والجداول',
        orderIndex: 3,
        isRequired: false,
        actionUrl: '/hr/shifts',
        estimatedMinutes: 15,
        dependencies: ['enable_hr_module']
    },
    {
        taskId: 'enable_finance_module',
        sectionId: 'modules',
        name: 'Enable Finance Module',
        nameAr: 'تفعيل وحدة المالية',
        description: 'Activate financial management features',
        descriptionAr: 'تفعيل ميزات الإدارة المالية',
        orderIndex: 4,
        isRequired: false,
        actionUrl: '/settings/modules/finance',
        estimatedMinutes: 5
    },
    {
        taskId: 'chart_of_accounts',
        sectionId: 'modules',
        name: 'Set Up Chart of Accounts',
        nameAr: 'إعداد دليل الحسابات',
        description: 'Configure your accounting structure',
        descriptionAr: 'إعداد الهيكل المحاسبي',
        orderIndex: 5,
        isRequired: false,
        actionUrl: '/finance/chart-of-accounts',
        estimatedMinutes: 30,
        dependencies: ['enable_finance_module', 'currency_settings']
    },
    {
        taskId: 'bank_accounts',
        sectionId: 'modules',
        name: 'Add Bank Accounts',
        nameAr: 'إضافة الحسابات البنكية',
        description: 'Connect your company bank accounts',
        descriptionAr: 'ربط الحسابات البنكية للشركة',
        orderIndex: 6,
        isRequired: false,
        actionUrl: '/finance/bank-accounts',
        estimatedMinutes: 10,
        dependencies: ['enable_finance_module']
    },
    {
        taskId: 'enable_projects_module',
        sectionId: 'modules',
        name: 'Enable Project Management',
        nameAr: 'تفعيل إدارة المشاريع',
        description: 'Activate project management features',
        descriptionAr: 'تفعيل ميزات إدارة المشاريع',
        orderIndex: 7,
        isRequired: false,
        actionUrl: '/settings/modules/projects',
        estimatedMinutes: 5
    },
    {
        taskId: 'project_templates',
        sectionId: 'modules',
        name: 'Create Project Templates',
        nameAr: 'إنشاء قوالب المشاريع',
        description: 'Set up reusable project templates',
        descriptionAr: 'إعداد قوالب المشاريع القابلة لإعادة الاستخدام',
        orderIndex: 8,
        isRequired: false,
        actionUrl: '/projects/templates',
        estimatedMinutes: 20,
        dependencies: ['enable_projects_module']
    },
    {
        taskId: 'enable_crm_module',
        sectionId: 'modules',
        name: 'Enable CRM',
        nameAr: 'تفعيل إدارة العملاء',
        description: 'Activate customer relationship management',
        descriptionAr: 'تفعيل إدارة علاقات العملاء',
        orderIndex: 9,
        isRequired: false,
        actionUrl: '/settings/modules/crm',
        estimatedMinutes: 5
    },
    {
        taskId: 'sales_pipeline',
        sectionId: 'modules',
        name: 'Configure Sales Pipeline',
        nameAr: 'إعداد مسار المبيعات',
        description: 'Set up your sales stages and pipeline',
        descriptionAr: 'إعداد مراحل ومسار المبيعات',
        orderIndex: 10,
        isRequired: false,
        actionUrl: '/crm/pipeline',
        estimatedMinutes: 15,
        dependencies: ['enable_crm_module']
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // INTEGRATIONS TASKS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        taskId: 'email_integration',
        sectionId: 'integrations',
        name: 'Connect Email',
        nameAr: 'ربط البريد الإلكتروني',
        description: 'Set up email sending and receiving',
        descriptionAr: 'إعداد إرسال واستقبال البريد الإلكتروني',
        orderIndex: 1,
        isRequired: false,
        actionUrl: '/settings/integrations/email',
        estimatedMinutes: 10
    },
    {
        taskId: 'calendar_sync',
        sectionId: 'integrations',
        name: 'Sync Calendar',
        nameAr: 'مزامنة التقويم',
        description: 'Connect Google Calendar or Outlook',
        descriptionAr: 'ربط تقويم جوجل أو أوتلوك',
        orderIndex: 2,
        isRequired: false,
        actionUrl: '/settings/integrations/calendar',
        estimatedMinutes: 5
    },
    {
        taskId: 'storage_integration',
        sectionId: 'integrations',
        name: 'Configure Cloud Storage',
        nameAr: 'إعداد التخزين السحابي',
        description: 'Connect S3, Google Drive, or OneDrive',
        descriptionAr: 'ربط S3 أو جوجل درايف أو ون درايف',
        orderIndex: 3,
        isRequired: false,
        actionUrl: '/settings/integrations/storage',
        estimatedMinutes: 15
    },
    {
        taskId: 'payment_gateway',
        sectionId: 'integrations',
        name: 'Add Payment Gateway',
        nameAr: 'إضافة بوابة الدفع',
        description: 'Connect payment processing service',
        descriptionAr: 'ربط خدمة معالجة المدفوعات',
        orderIndex: 4,
        isRequired: false,
        actionUrl: '/settings/integrations/payments',
        estimatedMinutes: 20,
        dependencies: ['enable_finance_module']
    },
    {
        taskId: 'sso_integration',
        sectionId: 'integrations',
        name: 'Configure Single Sign-On',
        nameAr: 'إعداد تسجيل الدخول الموحد',
        description: 'Set up SAML or OAuth SSO',
        descriptionAr: 'إعداد SAML أو OAuth للدخول الموحد',
        orderIndex: 5,
        isRequired: false,
        actionUrl: '/settings/integrations/sso',
        estimatedMinutes: 30
    },
    {
        taskId: 'api_keys',
        sectionId: 'integrations',
        name: 'Generate API Keys',
        nameAr: 'إنشاء مفاتيح API',
        description: 'Create API keys for third-party integrations',
        descriptionAr: 'إنشاء مفاتيح API للتكاملات الخارجية',
        orderIndex: 6,
        isRequired: false,
        actionUrl: '/settings/integrations/api',
        estimatedMinutes: 5
    },
    {
        taskId: 'webhooks',
        sectionId: 'integrations',
        name: 'Set Up Webhooks',
        nameAr: 'إعداد Webhooks',
        description: 'Configure webhooks for event notifications',
        descriptionAr: 'إعداد webhooks لإشعارات الأحداث',
        orderIndex: 7,
        isRequired: false,
        actionUrl: '/settings/integrations/webhooks',
        estimatedMinutes: 15
    },

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PREFERENCES TASKS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    {
        taskId: 'language_preferences',
        sectionId: 'preferences',
        name: 'Set Language Preference',
        nameAr: 'تحديد تفضيلات اللغة',
        description: 'Choose your preferred language (English/Arabic)',
        descriptionAr: 'اختر لغتك المفضلة (الإنجليزية/العربية)',
        orderIndex: 1,
        isRequired: false,
        actionUrl: '/settings/preferences/language',
        estimatedMinutes: 1
    },
    {
        taskId: 'timezone',
        sectionId: 'preferences',
        name: 'Set Timezone',
        nameAr: 'تحديد المنطقة الزمنية',
        description: 'Configure your timezone settings',
        descriptionAr: 'إعداد المنطقة الزمنية',
        orderIndex: 2,
        isRequired: false,
        actionUrl: '/settings/preferences/timezone',
        estimatedMinutes: 2
    },
    {
        taskId: 'notification_preferences',
        sectionId: 'preferences',
        name: 'Configure Notifications',
        nameAr: 'إعداد الإشعارات',
        description: 'Set up email and push notification preferences',
        descriptionAr: 'إعداد تفضيلات البريد الإلكتروني والإشعارات',
        orderIndex: 3,
        isRequired: false,
        actionUrl: '/settings/preferences/notifications',
        estimatedMinutes: 5
    },
    {
        taskId: 'date_format',
        sectionId: 'preferences',
        name: 'Set Date Format',
        nameAr: 'تحديد تنسيق التاريخ',
        description: 'Choose your preferred date format',
        descriptionAr: 'اختر تنسيق التاريخ المفضل',
        orderIndex: 4,
        isRequired: false,
        actionUrl: '/settings/preferences/date-format',
        estimatedMinutes: 1
    },
    {
        taskId: 'theme_preferences',
        sectionId: 'preferences',
        name: 'Customize Theme',
        nameAr: 'تخصيص المظهر',
        description: 'Choose light/dark mode and color scheme',
        descriptionAr: 'اختر الوضع الفاتح/الداكن ونظام الألوان',
        orderIndex: 5,
        isRequired: false,
        actionUrl: '/settings/preferences/theme',
        estimatedMinutes: 3
    },
    {
        taskId: 'dashboard_layout',
        sectionId: 'preferences',
        name: 'Customize Dashboard',
        nameAr: 'تخصيص لوحة المعلومات',
        description: 'Arrange widgets and dashboard layout',
        descriptionAr: 'ترتيب الأدوات وتخطيط لوحة المعلومات',
        orderIndex: 6,
        isRequired: false,
        actionUrl: '/settings/preferences/dashboard',
        estimatedMinutes: 10
    },
    {
        taskId: 'email_signature',
        sectionId: 'preferences',
        name: 'Create Email Signature',
        nameAr: 'إنشاء توقيع البريد الإلكتروني',
        description: 'Set up your default email signature',
        descriptionAr: 'إعداد توقيع البريد الإلكتروني الافتراضي',
        orderIndex: 7,
        isRequired: false,
        actionUrl: '/settings/preferences/signature',
        estimatedMinutes: 5
    }
];

// ═══════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════

const seedSetupWizard = async () => {
    try {
        console.log('🌱 Starting setup wizard seed...');

        // Clear existing data
        console.log('🗑️  Clearing existing setup sections and tasks...');
        await SetupSection.deleteMany({});
        await SetupTask.deleteMany({});
        console.log('✅ Existing data cleared');

        // Insert sections
        console.log('📦 Inserting setup sections...');
        const insertedSections = await SetupSection.insertMany(sections);
        console.log(`✅ ${insertedSections.length} setup sections seeded`);

        // Insert tasks
        console.log('📋 Inserting setup tasks...');
        const insertedTasks = await SetupTask.insertMany(tasks);
        console.log(`✅ ${insertedTasks.length} setup tasks seeded`);

        // Summary
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ SETUP WIZARD SEED COMPLETE');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📊 Sections: ${insertedSections.length}`);
        console.log(`📋 Tasks: ${insertedTasks.length}`);
        console.log('\nSections breakdown:');
        for (const section of sections) {
            const sectionTasks = tasks.filter(t => t.sectionId === section.sectionId);
            const requiredTasks = sectionTasks.filter(t => t.isRequired).length;
            console.log(`  • ${section.name}: ${sectionTasks.length} tasks (${requiredTasks} required)`);
        }
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Setup wizard seed failed:', error);
        throw error;
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    seedSetupWizard,
    sections,
    tasks
};
