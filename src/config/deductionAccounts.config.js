/**
 * Deduction Accounts Configuration (ERPNext Parity)
 * Standard deduction accounts for Saudi Arabia
 * Used in payment deductions for tax withholding, GOSI, etc.
 */

const DEDUCTION_ACCOUNTS = [
    {
        code: '2210',
        name: 'ضريبة الاستقطاع المستحقة',
        nameEn: 'Withholding Tax Payable',
        rate: 5,
        description: 'Standard 5% withholding tax on payments to non-residents',
        descriptionAr: 'ضريبة استقطاع 5% على المدفوعات لغير المقيمين',
        applicableTo: ['vendor_payment'],
        category: 'tax'
    },
    {
        code: '2211',
        name: 'ضريبة الاستقطاع - الخدمات الفنية',
        nameEn: 'Withholding Tax - Technical Services',
        rate: 15,
        description: '15% withholding tax on technical services from non-residents',
        descriptionAr: 'ضريبة استقطاع 15% على الخدمات الفنية من غير المقيمين',
        applicableTo: ['vendor_payment'],
        category: 'tax'
    },
    {
        code: '2220',
        name: 'ضريبة القيمة المضافة المستحقة',
        nameEn: 'VAT Payable',
        rate: 15,
        description: 'Standard 15% VAT',
        descriptionAr: 'ضريبة القيمة المضافة 15%',
        applicableTo: ['customer_payment', 'vendor_payment'],
        category: 'tax'
    },
    {
        code: '2230',
        name: 'التأمينات الاجتماعية المستحقة - مساهمة صاحب العمل',
        nameEn: 'GOSI Payable - Employer Contribution',
        rate: 12,
        description: 'GOSI employer contribution (9.75% social + 2% SANED + 0.25% occupational hazards)',
        descriptionAr: 'مساهمة صاحب العمل في التأمينات (9.75% اجتماعي + 2% ساند + 0.25% أخطار مهنية)',
        applicableTo: ['employee'],
        category: 'social_insurance'
    },
    {
        code: '2231',
        name: 'التأمينات الاجتماعية المستحقة - مساهمة الموظف',
        nameEn: 'GOSI Payable - Employee Contribution',
        rate: 10.75,
        description: 'GOSI employee contribution (9.75% social + 1% SANED)',
        descriptionAr: 'مساهمة الموظف في التأمينات (9.75% اجتماعي + 1% ساند)',
        applicableTo: ['employee'],
        category: 'social_insurance'
    },
    {
        code: '2240',
        name: 'رسوم إدارية مستحقة',
        nameEn: 'Administrative Fees Payable',
        rate: null,
        description: 'Administrative and processing fees',
        descriptionAr: 'رسوم إدارية ومعالجة',
        applicableTo: ['customer_payment', 'vendor_payment'],
        category: 'fees'
    },
    {
        code: '2241',
        name: 'رسوم بنكية مستحقة',
        nameEn: 'Bank Fees Payable',
        rate: null,
        description: 'Bank transfer and processing fees',
        descriptionAr: 'رسوم تحويل ومعالجة بنكية',
        applicableTo: ['customer_payment', 'vendor_payment', 'refund'],
        category: 'fees'
    },
    {
        code: '2250',
        name: 'زكاة مستحقة',
        nameEn: 'Zakat Payable',
        rate: 2.5,
        description: 'Zakat at 2.5% on qualifying assets',
        descriptionAr: 'زكاة 2.5% على الأصول المؤهلة',
        applicableTo: ['customer_payment'],
        category: 'zakat'
    },
    {
        code: '2260',
        name: 'غرامات وجزاءات',
        nameEn: 'Penalties and Fines',
        rate: null,
        description: 'Late payment penalties and other fines',
        descriptionAr: 'غرامات التأخير وجزاءات أخرى',
        applicableTo: ['customer_payment', 'vendor_payment'],
        category: 'penalty'
    },
    {
        code: '2270',
        name: 'خصومات أخرى',
        nameEn: 'Other Deductions',
        rate: null,
        description: 'Other miscellaneous deductions',
        descriptionAr: 'خصومات متنوعة أخرى',
        applicableTo: ['customer_payment', 'vendor_payment', 'employee'],
        category: 'other'
    }
];

// Deduction categories
const DEDUCTION_CATEGORIES = [
    { code: 'tax', name: 'Taxes', nameAr: 'الضرائب' },
    { code: 'social_insurance', name: 'Social Insurance', nameAr: 'التأمينات الاجتماعية' },
    { code: 'fees', name: 'Fees', nameAr: 'الرسوم' },
    { code: 'zakat', name: 'Zakat', nameAr: 'الزكاة' },
    { code: 'penalty', name: 'Penalties', nameAr: 'الغرامات' },
    { code: 'other', name: 'Other', nameAr: 'أخرى' }
];

/**
 * Get deduction accounts by payment type
 */
function getDeductionsByPaymentType(paymentType) {
    return DEDUCTION_ACCOUNTS.filter(account =>
        account.applicableTo.includes(paymentType)
    );
}

/**
 * Get deduction account by code
 */
function getDeductionByCode(code) {
    return DEDUCTION_ACCOUNTS.find(account => account.code === code);
}

/**
 * Calculate deduction amount
 */
function calculateDeductionAmount(baseAmount, deductionCode) {
    const deduction = getDeductionByCode(deductionCode);
    if (!deduction || deduction.rate === null) {
        return 0;
    }
    return Math.round(baseAmount * (deduction.rate / 100));
}

/**
 * Get all deduction accounts for dropdown
 */
function getAllDeductionAccounts() {
    return DEDUCTION_ACCOUNTS.map(account => ({
        code: account.code,
        name: account.name,
        nameEn: account.nameEn,
        rate: account.rate,
        category: account.category
    }));
}

module.exports = {
    DEDUCTION_ACCOUNTS,
    DEDUCTION_CATEGORIES,
    getDeductionsByPaymentType,
    getDeductionByCode,
    calculateDeductionAmount,
    getAllDeductionAccounts
};
