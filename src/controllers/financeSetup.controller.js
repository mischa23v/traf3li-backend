/**
 * Finance Setup Wizard Controller
 *
 * Handles the multi-step finance configuration wizard
 */

const FinanceSetup = require('../models/financeSetup.model');
const Account = require('../models/account.model');
const FiscalPeriod = require('../models/fiscalPeriod.model');
const PaymentTerms = require('../models/paymentTerms.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get setup status
 */
const getSetupStatus = asyncHandler(async (req, res) => {
    const query = req.firmId ? { firmId: req.firmId } : { lawyerId: req.userID };
    const setup = await FinanceSetup.findOne(query);

    res.json({
        success: true,
        data: {
            setupCompleted: setup?.setupCompleted || false,
            currentStep: setup?.currentStep || 1,
            completedSteps: setup?.completedSteps || []
        }
    });
});

/**
 * Get current setup data
 */
const getSetup = asyncHandler(async (req, res) => {
    const setup = await FinanceSetup.getOrCreate(
        req.firmId,
        req.firmId ? null : req.userID,
        req.userID
    );

    res.json({
        success: true,
        data: setup
    });
});

/**
 * Update setup (save progress)
 */
const updateSetup = asyncHandler(async (req, res) => {
    const query = req.firmId ? { firmId: req.firmId } : { lawyerId: req.userID };

    const setup = await FinanceSetup.findOneAndUpdate(
        query,
        {
            $set: {
                ...req.body,
                updatedBy: req.userID
            }
        },
        { new: true, upsert: true }
    );

    res.json({
        success: true,
        data: setup,
        message: 'Setup saved successfully',
        messageAr: 'تم حفظ الإعدادات بنجاح'
    });
});

/**
 * Update specific step
 */
const updateStep = asyncHandler(async (req, res) => {
    const { step } = req.params;
    const stepNumber = parseInt(step, 10);

    if (stepNumber < 1 || stepNumber > 9) {
        throw CustomException('Invalid step number', 400, {
            messageAr: 'رقم الخطوة غير صالح'
        });
    }

    const query = req.firmId ? { firmId: req.firmId } : { lawyerId: req.userID };
    let setup = await FinanceSetup.findOne(query);

    if (!setup) {
        setup = await FinanceSetup.getOrCreate(
            req.firmId,
            req.firmId ? null : req.userID,
            req.userID
        );
    }

    // Update the specific step data
    const stepFields = {
        1: 'companyInfo',
        2: 'fiscalYear',
        3: 'chartOfAccounts',
        4: 'currency',
        5: 'taxSettings',
        6: 'bankAccounts',
        7: 'openingBalances',
        8: 'invoiceSettings',
        9: 'paymentMethods'
    };

    const fieldName = stepFields[stepNumber];
    if (fieldName && req.body[fieldName]) {
        setup[fieldName] = { ...setup[fieldName], ...req.body[fieldName] };
    } else if (fieldName) {
        setup[fieldName] = req.body;
    }

    // Mark step as completed
    await setup.completeStep(stepNumber, req.userID);

    res.json({
        success: true,
        data: setup,
        message: `Step ${stepNumber} saved`,
        messageAr: `تم حفظ الخطوة ${stepNumber}`
    });
});

/**
 * Complete setup
 */
const completeSetup = asyncHandler(async (req, res) => {
    const query = req.firmId ? { firmId: req.firmId } : { lawyerId: req.userID };
    const setup = await FinanceSetup.findOne(query);

    if (!setup) {
        throw CustomException('Setup not found. Please start the setup wizard.', 404, {
            messageAr: 'لم يتم العثور على الإعدادات. يرجى بدء معالج الإعداد.'
        });
    }

    if (setup.setupCompleted) {
        throw CustomException('Setup is already completed', 400, {
            messageAr: 'تم إكمال الإعداد مسبقاً'
        });
    }

    if (!setup.canComplete()) {
        throw CustomException('Please complete all required steps before finishing setup', 400, {
            messageAr: 'يرجى إكمال جميع الخطوات المطلوبة قبل إنهاء الإعداد'
        });
    }

    // 1. Initialize Chart of Accounts if selected template
    if (setup.chartOfAccounts.template && !setup.chartOfAccounts.initialized) {
        await initializeChartOfAccounts(setup, req.userID);
        setup.chartOfAccounts.initialized = true;
        setup.chartOfAccounts.initializationDate = new Date();
    }

    // 2. Create Fiscal Year and Periods
    if (setup.fiscalYear.startDate) {
        await initializeFiscalYear(setup, req.userID);
    }

    // 3. Initialize Payment Terms
    await PaymentTerms.initializeDefaults(
        req.firmId,
        req.firmId ? null : req.userID,
        req.userID
    );

    // 4. Mark setup as complete
    await setup.completeSetup(req.userID);

    res.json({
        success: true,
        data: setup,
        message: 'Finance setup completed successfully!',
        messageAr: 'تم إكمال إعداد النظام المالي بنجاح!'
    });
});

/**
 * Reset setup (for testing/re-configuration)
 */
const resetSetup = asyncHandler(async (req, res) => {
    const query = req.firmId ? { firmId: req.firmId } : { lawyerId: req.userID };

    await FinanceSetup.findOneAndUpdate(
        query,
        {
            $set: {
                setupCompleted: false,
                completedAt: null,
                completedBy: null,
                currentStep: 1,
                completedSteps: [],
                'chartOfAccounts.initialized': false,
                updatedBy: req.userID
            }
        }
    );

    res.json({
        success: true,
        message: 'Setup has been reset',
        messageAr: 'تم إعادة تعيين الإعداد'
    });
});

/**
 * Get available templates
 */
const getTemplates = asyncHandler(async (req, res) => {
    const templates = [
        {
            id: 'saudi_standard',
            name: 'Saudi Standard',
            nameAr: 'المعيار السعودي',
            description: 'Standard chart of accounts following Saudi accounting standards',
            descriptionAr: 'دليل حسابات قياسي يتبع المعايير المحاسبية السعودية'
        },
        {
            id: 'ifrs',
            name: 'IFRS',
            nameAr: 'المعايير الدولية',
            description: 'International Financial Reporting Standards compliant',
            descriptionAr: 'متوافق مع المعايير الدولية لإعداد التقارير المالية'
        },
        {
            id: 'custom',
            name: 'Custom',
            nameAr: 'مخصص',
            description: 'Start with a blank chart and build your own',
            descriptionAr: 'ابدأ بدليل فارغ وأنشئ دليلك الخاص'
        }
    ];

    res.json({
        success: true,
        data: templates
    });
});

// Helper Functions

async function initializeChartOfAccounts(setup, userId) {
    const query = setup.firmId ? { firmId: setup.firmId } : { lawyerId: setup.lawyerId };

    if (setup.chartOfAccounts.template === 'saudi_standard') {
        const accounts = getSaudiStandardAccounts(query, userId);

        // Create accounts in order (parents first)
        for (const account of accounts) {
            const existing = await Account.findOne({ ...query, code: account.code });
            if (!existing) {
                await Account.create(account);
            }
        }
    }
}

function getSaudiStandardAccounts(query, userId) {
    return [
        // Assets
        { ...query, code: '1000', name: 'Assets', nameAr: 'الأصول', type: 'Asset', isSystem: true, createdBy: userId },
        { ...query, code: '1100', name: 'Current Assets', nameAr: 'الأصول المتداولة', type: 'Asset', subType: 'Current Asset', parentCode: '1000', isSystem: true, createdBy: userId },
        { ...query, code: '1110', name: 'Cash in Hand', nameAr: 'النقدية في الصندوق', type: 'Asset', subType: 'Current Asset', parentCode: '1100', isSystem: true, createdBy: userId },
        { ...query, code: '1120', name: 'Bank Accounts', nameAr: 'الحسابات البنكية', type: 'Asset', subType: 'Current Asset', parentCode: '1100', isSystem: true, createdBy: userId },
        { ...query, code: '1130', name: 'Accounts Receivable', nameAr: 'العملاء - المدينون', type: 'Asset', subType: 'Current Asset', parentCode: '1100', isSystem: true, createdBy: userId },
        { ...query, code: '1140', name: 'Prepaid Expenses', nameAr: 'المصروفات المدفوعة مقدماً', type: 'Asset', subType: 'Current Asset', parentCode: '1100', isSystem: true, createdBy: userId },
        { ...query, code: '1200', name: 'Fixed Assets', nameAr: 'الأصول الثابتة', type: 'Asset', subType: 'Fixed Asset', parentCode: '1000', isSystem: true, createdBy: userId },
        { ...query, code: '1210', name: 'Furniture & Equipment', nameAr: 'الأثاث والمعدات', type: 'Asset', subType: 'Fixed Asset', parentCode: '1200', isSystem: true, createdBy: userId },
        { ...query, code: '1220', name: 'Computer Equipment', nameAr: 'أجهزة الحاسب', type: 'Asset', subType: 'Fixed Asset', parentCode: '1200', isSystem: true, createdBy: userId },
        { ...query, code: '1290', name: 'Accumulated Depreciation', nameAr: 'مجمع الإهلاك', type: 'Asset', subType: 'Fixed Asset', parentCode: '1200', isSystem: true, createdBy: userId },

        // Liabilities
        { ...query, code: '2000', name: 'Liabilities', nameAr: 'الخصوم', type: 'Liability', isSystem: true, createdBy: userId },
        { ...query, code: '2100', name: 'Current Liabilities', nameAr: 'الخصوم المتداولة', type: 'Liability', subType: 'Current Liability', parentCode: '2000', isSystem: true, createdBy: userId },
        { ...query, code: '2110', name: 'Accounts Payable', nameAr: 'الموردون - الدائنون', type: 'Liability', subType: 'Current Liability', parentCode: '2100', isSystem: true, createdBy: userId },
        { ...query, code: '2120', name: 'VAT Payable', nameAr: 'ضريبة القيمة المضافة المستحقة', type: 'Liability', subType: 'Current Liability', parentCode: '2100', isSystem: true, createdBy: userId },
        { ...query, code: '2130', name: 'Accrued Expenses', nameAr: 'المصروفات المستحقة', type: 'Liability', subType: 'Current Liability', parentCode: '2100', isSystem: true, createdBy: userId },
        { ...query, code: '2140', name: 'Client Trust Liability', nameAr: 'أمانات العملاء', type: 'Liability', subType: 'Current Liability', parentCode: '2100', isSystem: true, createdBy: userId },
        { ...query, code: '2150', name: 'Unearned Revenue', nameAr: 'الإيرادات غير المكتسبة', type: 'Liability', subType: 'Current Liability', parentCode: '2100', isSystem: true, createdBy: userId },

        // Equity
        { ...query, code: '3000', name: 'Equity', nameAr: 'حقوق الملكية', type: 'Equity', isSystem: true, createdBy: userId },
        { ...query, code: '3100', name: 'Capital', nameAr: 'رأس المال', type: 'Equity', parentCode: '3000', isSystem: true, createdBy: userId },
        { ...query, code: '3200', name: 'Retained Earnings', nameAr: 'الأرباح المحتجزة', type: 'Equity', subType: 'Retained Earnings', parentCode: '3000', isSystem: true, createdBy: userId },
        { ...query, code: '3300', name: 'Owner Drawings', nameAr: 'مسحوبات المالك', type: 'Equity', parentCode: '3000', isSystem: true, createdBy: userId },

        // Income
        { ...query, code: '4000', name: 'Income', nameAr: 'الإيرادات', type: 'Income', isSystem: true, createdBy: userId },
        { ...query, code: '4100', name: 'Legal Services Revenue', nameAr: 'إيرادات الخدمات القانونية', type: 'Income', subType: 'Operating Income', parentCode: '4000', isSystem: true, createdBy: userId },
        { ...query, code: '4110', name: 'Consultation Fees', nameAr: 'أتعاب الاستشارات', type: 'Income', subType: 'Operating Income', parentCode: '4100', isSystem: true, createdBy: userId },
        { ...query, code: '4120', name: 'Litigation Fees', nameAr: 'أتعاب التقاضي', type: 'Income', subType: 'Operating Income', parentCode: '4100', isSystem: true, createdBy: userId },
        { ...query, code: '4130', name: 'Contract Review Fees', nameAr: 'أتعاب مراجعة العقود', type: 'Income', subType: 'Operating Income', parentCode: '4100', isSystem: true, createdBy: userId },
        { ...query, code: '4140', name: 'Retainer Fees', nameAr: 'الأتعاب الشهرية', type: 'Income', subType: 'Operating Income', parentCode: '4100', isSystem: true, createdBy: userId },
        { ...query, code: '4200', name: 'Other Income', nameAr: 'إيرادات أخرى', type: 'Income', subType: 'Other Income', parentCode: '4000', isSystem: true, createdBy: userId },
        { ...query, code: '4210', name: 'Interest Income', nameAr: 'إيرادات الفوائد', type: 'Income', subType: 'Other Income', parentCode: '4200', isSystem: true, createdBy: userId },

        // Expenses
        { ...query, code: '5000', name: 'Expenses', nameAr: 'المصروفات', type: 'Expense', isSystem: true, createdBy: userId },
        { ...query, code: '5100', name: 'Operating Expenses', nameAr: 'المصروفات التشغيلية', type: 'Expense', subType: 'Operating Expense', parentCode: '5000', isSystem: true, createdBy: userId },
        { ...query, code: '5110', name: 'Salaries & Wages', nameAr: 'الرواتب والأجور', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5120', name: 'Rent Expense', nameAr: 'مصروف الإيجار', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5130', name: 'Utilities', nameAr: 'المرافق', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5140', name: 'Office Supplies', nameAr: 'مستلزمات المكتب', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5150', name: 'Professional Development', nameAr: 'التطوير المهني', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5160', name: 'Travel Expense', nameAr: 'مصروفات السفر', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5170', name: 'Court Fees', nameAr: 'رسوم المحاكم', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5180', name: 'Insurance', nameAr: 'التأمين', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5190', name: 'Depreciation Expense', nameAr: 'مصروف الإهلاك', type: 'Expense', subType: 'Operating Expense', parentCode: '5100', isSystem: true, createdBy: userId },
        { ...query, code: '5200', name: 'Administrative Expenses', nameAr: 'المصروفات الإدارية', type: 'Expense', subType: 'Operating Expense', parentCode: '5000', isSystem: true, createdBy: userId },
        { ...query, code: '5210', name: 'Bank Charges', nameAr: 'رسوم بنكية', type: 'Expense', subType: 'Operating Expense', parentCode: '5200', isSystem: true, createdBy: userId },
        { ...query, code: '5220', name: 'License & Fees', nameAr: 'رخص ورسوم', type: 'Expense', subType: 'Operating Expense', parentCode: '5200', isSystem: true, createdBy: userId }
    ];
}

async function initializeFiscalYear(setup, userId) {
    const query = setup.firmId ? { firmId: setup.firmId } : { lawyerId: setup.lawyerId };

    const startDate = new Date(setup.fiscalYear.startDate);
    const year = startDate.getFullYear();

    // Check if fiscal year already exists
    const existing = await FiscalPeriod.findOne({
        ...query,
        fiscalYear: year
    });

    if (!existing) {
        await FiscalPeriod.createFiscalYear(
            query.lawyerId || query.firmId,
            year,
            userId,
            startDate.getMonth() + 1
        );
    }
}

module.exports = {
    getSetupStatus,
    getSetup,
    updateSetup,
    updateStep,
    completeSetup,
    resetSetup,
    getTemplates
};
