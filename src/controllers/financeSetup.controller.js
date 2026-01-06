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
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Allowed fields for finance setup updates
const ALLOWED_SETUP_FIELDS = [
    'currentStep',
    'completedSteps',
    'companyInfo',
    'fiscalYear',
    'chartOfAccounts',
    'currency',
    'taxSettings',
    'bankAccounts',
    'openingBalances',
    'invoiceSettings',
    'paymentMethods'
];

// Allowed nested fields for each step
const ALLOWED_STEP_FIELDS = {
    companyInfo: ['name', 'nameAr', 'commercialRegister', 'taxNumber', 'address', 'phone', 'email', 'website'],
    fiscalYear: ['startDate', 'endDate', 'lockDate'],
    chartOfAccounts: ['template', 'customAccounts', 'importFile'],
    currency: ['baseCurrency', 'supportedCurrencies', 'exchangeRateSource'],
    taxSettings: ['vatEnabled', 'vatRate', 'vatNumber', 'taxMethod'],
    bankAccounts: ['accounts'],
    openingBalances: ['balances', 'asOfDate'],
    invoiceSettings: ['prefix', 'startingNumber', 'template', 'paymentTerms'],
    paymentMethods: ['methods', 'defaultMethod']
};

/**
 * Helper to verify firmId ownership
 */
async function verifyFirmAccess(req) {
    if (req.firmId) {
        const sanitizedFirmId = sanitizeObjectId(req.firmId);
        if (!sanitizedFirmId) {
            throw CustomException('Invalid firm ID', 400, {
                messageAr: 'معرف الشركة غير صالح'
            });
        }

        // Verify that the user has access to this firm
        // This assumes req.userFirms contains the list of firms the user can access
        if (req.userFirms && !req.userFirms.includes(sanitizedFirmId.toString())) {
            throw CustomException('Access denied to this firm', 403, {
                messageAr: 'ليس لديك صلاحية الوصول لهذه الشركة'
            });
        }
    }
}

/**
 * Validate finance setup data
 */
function validateFinanceSetupData(data, step = null) {
    // Basic validation for required fields based on step
    if (step === 1 && data.companyInfo) {
        const { name, taxNumber } = data.companyInfo;
        if (name && typeof name !== 'string') {
            throw CustomException('Company name must be a string', 400, {
                messageAr: 'يجب أن يكون اسم الشركة نصاً'
            });
        }
        if (taxNumber && typeof taxNumber !== 'string') {
            throw CustomException('Tax number must be a string', 400, {
                messageAr: 'يجب أن يكون الرقم الضريبي نصاً'
            });
        }
    }

    if (step === 2 && data.fiscalYear) {
        const { startDate, endDate } = data.fiscalYear;
        if (startDate && !isValidDate(startDate)) {
            throw CustomException('Invalid fiscal year start date', 400, {
                messageAr: 'تاريخ بداية السنة المالية غير صالح'
            });
        }
        if (endDate && !isValidDate(endDate)) {
            throw CustomException('Invalid fiscal year end date', 400, {
                messageAr: 'تاريخ نهاية السنة المالية غير صالح'
            });
        }
    }

    if (step === 5 && data.taxSettings) {
        const { vatRate } = data.taxSettings;
        if (vatRate !== undefined && (typeof vatRate !== 'number' || vatRate < 0 || vatRate > 100)) {
            throw CustomException('VAT rate must be a number between 0 and 100', 400, {
                messageAr: 'يجب أن يكون معدل ضريبة القيمة المضافة رقماً بين 0 و 100'
            });
        }
    }

    return true;
}

/**
 * Helper to validate date
 */
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * Get setup status
 */
const getSetupStatus = asyncHandler(async (req, res) => {
    // IDOR Protection: Verify firm access
    await verifyFirmAccess(req);

    const setup = await FinanceSetup.findOne({ ...req.firmQuery });

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
    // IDOR Protection: Verify firm access
    await verifyFirmAccess(req);

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
    // IDOR Protection: Verify firm access
    await verifyFirmAccess(req);

    // Mass Assignment Protection: Only allow specific fields
    const allowedData = pickAllowedFields(req.body, ALLOWED_SETUP_FIELDS);

    // Input Validation: Validate the data
    validateFinanceSetupData(allowedData);

    // Protect critical fields from manipulation
    delete allowedData.setupCompleted;
    delete allowedData.completedAt;
    delete allowedData.completedBy;
    delete allowedData.firmId;
    delete allowedData.lawyerId;
    delete allowedData.createdBy;

    const setup = await FinanceSetup.findOneAndUpdate(
        { ...req.firmQuery },
        {
            $set: {
                ...allowedData,
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
    // IDOR Protection: Verify firm access
    await verifyFirmAccess(req);

    const { step } = req.params;
    const stepNumber = parseInt(step, 10);

    if (stepNumber < 1 || stepNumber > 9) {
        throw CustomException('Invalid step number', 400, {
            messageAr: 'رقم الخطوة غير صالح'
        });
    }

    let setup = await FinanceSetup.findOne({ ...req.firmQuery });

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

    // Mass Assignment Protection: Filter allowed fields for this step
    let stepData;
    if (fieldName && req.body[fieldName]) {
        stepData = pickAllowedFields(req.body[fieldName], ALLOWED_STEP_FIELDS[fieldName] || []);
    } else if (fieldName) {
        stepData = pickAllowedFields(req.body, ALLOWED_STEP_FIELDS[fieldName] || []);
    }

    // Input Validation: Validate the step data
    const validationData = {};
    if (fieldName) {
        validationData[fieldName] = stepData;
    }
    validateFinanceSetupData(validationData, stepNumber);

    // Update the step data
    if (fieldName && stepData) {
        setup[fieldName] = { ...setup[fieldName], ...stepData };
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
    // IDOR Protection: Verify firm access
    await verifyFirmAccess(req);

    const setup = await FinanceSetup.findOne({ ...req.firmQuery });

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
    // IDOR Protection: Verify firm access
    await verifyFirmAccess(req);

    await FinanceSetup.findOneAndUpdate(
        { ...req.firmQuery },
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
