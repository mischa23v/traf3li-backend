const mongoose = require('mongoose');

/**
 * Salary Slip Model - Payroll Management
 * Supports monthly payroll processing with GOSI calculations
 */

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Generate month code
function getMonthCode(month) {
    const codes = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
        'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return codes[month - 1];
}

// Number to English words (simplified for SAR)
function numberToEnglishWords(num) {
    if (num === 0) return 'Zero Saudi Riyals';

    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const scales = ['', 'Thousand', 'Million', 'Billion'];

    function convertHundreds(n) {
        let result = '';
        if (n >= 100) {
            result += ones[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 20) {
            result += tens[Math.floor(n / 10)] + ' ';
            n %= 10;
        }
        if (n > 0) {
            result += ones[n] + ' ';
        }
        return result;
    }

    let result = '';
    let scaleIndex = 0;
    let n = Math.floor(num);

    while (n > 0) {
        const chunk = n % 1000;
        if (chunk > 0) {
            result = convertHundreds(chunk) + scales[scaleIndex] + ' ' + result;
        }
        n = Math.floor(n / 1000);
        scaleIndex++;
    }

    return result.trim() + ' Saudi Riyals';
}

// Number to Arabic words (simplified)
function numberToArabicWords(num) {
    if (num === 0) return 'صفر ريال سعودي';

    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
        'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
        'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
    const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];

    let n = Math.floor(num);
    let result = '';

    if (n >= 1000000) {
        const millions = Math.floor(n / 1000000);
        result += (millions === 1 ? 'مليون' : millions === 2 ? 'مليونان' : ones[millions] + ' ملايين') + ' ';
        n %= 1000000;
    }

    if (n >= 1000) {
        const thousands = Math.floor(n / 1000);
        if (thousands === 1) result += 'ألف ';
        else if (thousands === 2) result += 'ألفان ';
        else if (thousands <= 10) result += ones[thousands] + ' آلاف ';
        else result += thousands + ' ألف ';
        n %= 1000;
    }

    if (n >= 100) {
        const hundreds = Math.floor(n / 100);
        if (hundreds === 1) result += 'مائة ';
        else if (hundreds === 2) result += 'مائتان ';
        else result += ones[hundreds] + 'مائة ';
        n %= 100;
    }

    if (n >= 20) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        if (one > 0) result += ones[one] + ' و';
        result += tens[ten] + ' ';
    } else if (n > 0) {
        result += ones[n] + ' ';
    }

    return result.trim() + ' ريال سعودي';
}

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

const allowanceItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nameAr: String,
    amount: { type: Number, required: true, default: 0 }
}, { _id: false });

const overtimeSchema = new mongoose.Schema({
    hours: { type: Number, default: 0 },
    rate: { type: Number, default: 1.5 },
    amount: { type: Number, default: 0 }
}, { _id: false });

const payPeriodSchema = new mongoose.Schema({
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    calendarType: { type: String, enum: ['hijri', 'gregorian'], default: 'gregorian' },
    periodStart: Date,
    periodEnd: Date,
    paymentDate: Date,
    workingDays: { type: Number, default: 22 },
    daysWorked: { type: Number, default: 22 }
}, { _id: false });

const earningsSchema = new mongoose.Schema({
    basicSalary: { type: Number, required: true },
    allowances: [allowanceItemSchema],
    totalAllowances: { type: Number, default: 0 },
    overtime: overtimeSchema,
    bonus: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    arrears: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }
}, { _id: false });

const deductionsSchema = new mongoose.Schema({
    gosi: { type: Number, default: 0 },
    gosiEmployer: { type: Number, default: 0 },
    loans: { type: Number, default: 0 },
    advances: { type: Number, default: 0 },
    absences: { type: Number, default: 0 },
    lateDeductions: { type: Number, default: 0 },
    violations: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
    paymentMethod: {
        type: String,
        enum: ['bank_transfer', 'cash', 'check'],
        default: 'bank_transfer'
    },
    bankName: String,
    iban: String,
    accountNumber: String,
    checkNumber: String,
    checkDate: Date,
    status: {
        type: String,
        enum: ['draft', 'approved', 'processing', 'paid', 'failed', 'cancelled'],
        default: 'draft'
    },
    paidOn: Date,
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    transactionReference: String,
    failureReason: String
}, { _id: false });

const wpsSchema = new mongoose.Schema({
    required: { type: Boolean, default: true },
    submitted: { type: Boolean, default: false },
    submissionDate: Date,
    wpsReferenceNumber: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'] }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const salarySlipSchema = new mongoose.Schema({
    slipId: { type: String, unique: true, sparse: true },
    slipNumber: { type: String, unique: true, sparse: true },

    // Employee Reference
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    employeeNumber: String,
    employeeName: String,
    employeeNameAr: String,
    nationalId: String,
    jobTitle: String,
    department: String,

    // Period
    payPeriod: payPeriodSchema,

    // Earnings
    earnings: earningsSchema,

    // Deductions
    deductions: deductionsSchema,

    // Net Pay
    netPay: { type: Number, default: 0 },
    netPayInWords: String,
    netPayInWordsAr: String,

    // Payment
    payment: paymentSchema,

    // WPS
    wps: wpsSchema,

    // Metadata
    generatedOn: { type: Date, default: Date.now },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedOn: Date,
    notes: String,

    // Multi-tenancy
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }

}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Unique constraint: one slip per employee per month/year
salarySlipSchema.index(
    { employeeId: 1, 'payPeriod.month': 1, 'payPeriod.year': 1, firmId: 1 },
    { unique: true }
);
salarySlipSchema.index({ 'payPeriod.month': 1, 'payPeriod.year': 1 });
salarySlipSchema.index({ 'payment.status': 1 });
salarySlipSchema.index({ firmId: 1, 'payPeriod.year': 1, 'payPeriod.month': 1 });
salarySlipSchema.index({ lawyerId: 1, 'payPeriod.year': 1, 'payPeriod.month': 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

salarySlipSchema.pre('save', async function (next) {
    // Generate slip IDs if not present
    if (!this.slipId) {
        const count = await this.constructor.countDocuments({
            'payPeriod.year': this.payPeriod.year,
            $or: [{ firmId: this.firmId }, { lawyerId: this.lawyerId }]
        });
        this.slipId = `SLIP-${this.payPeriod.year}-${String(count + 1).padStart(3, '0')}`;
    }

    if (!this.slipNumber) {
        const monthCount = await this.constructor.countDocuments({
            'payPeriod.month': this.payPeriod.month,
            'payPeriod.year': this.payPeriod.year,
            $or: [{ firmId: this.firmId }, { lawyerId: this.lawyerId }]
        });
        const monthCode = getMonthCode(this.payPeriod.month);
        this.slipNumber = `PS-${monthCode}-${String(monthCount + 1).padStart(3, '0')}`;
    }

    // Calculate period dates if not provided
    if (!this.payPeriod.periodStart) {
        this.payPeriod.periodStart = new Date(this.payPeriod.year, this.payPeriod.month - 1, 1);
    }
    if (!this.payPeriod.periodEnd) {
        this.payPeriod.periodEnd = new Date(this.payPeriod.year, this.payPeriod.month, 0);
    }

    // Set daysWorked to workingDays if not specified
    if (!this.payPeriod.daysWorked) {
        this.payPeriod.daysWorked = this.payPeriod.workingDays || 22;
    }

    // Calculate totalAllowances
    if (this.earnings.allowances && this.earnings.allowances.length > 0) {
        this.earnings.totalAllowances = this.earnings.allowances.reduce(
            (sum, a) => sum + (a.amount || 0), 0
        );
    } else {
        this.earnings.totalAllowances = 0;
    }

    // Calculate overtime amount
    if (this.earnings.overtime && this.earnings.overtime.hours > 0) {
        const workingDays = this.payPeriod.workingDays || 22;
        const hoursPerDay = 8;
        const hourlyRate = this.earnings.basicSalary / (hoursPerDay * workingDays);
        this.earnings.overtime.amount = Math.round(
            this.earnings.overtime.hours * hourlyRate * (this.earnings.overtime.rate || 1.5)
        );
    } else if (this.earnings.overtime) {
        this.earnings.overtime.amount = 0;
    }

    // Calculate totalEarnings
    this.earnings.totalEarnings =
        (this.earnings.basicSalary || 0) +
        (this.earnings.totalAllowances || 0) +
        (this.earnings.overtime?.amount || 0) +
        (this.earnings.bonus || 0) +
        (this.earnings.commission || 0) +
        (this.earnings.arrears || 0);

    // Calculate totalDeductions
    this.deductions.totalDeductions =
        (this.deductions.gosi || 0) +
        (this.deductions.loans || 0) +
        (this.deductions.advances || 0) +
        (this.deductions.absences || 0) +
        (this.deductions.lateDeductions || 0) +
        (this.deductions.violations || 0) +
        (this.deductions.otherDeductions || 0);

    // Calculate netPay
    this.netPay = this.earnings.totalEarnings - this.deductions.totalDeductions;

    // Generate net pay in words
    this.netPayInWords = numberToEnglishWords(this.netPay);
    this.netPayInWordsAr = numberToArabicWords(this.netPay);

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get stats for a period
salarySlipSchema.statics.getStats = async function (firmId, lawyerId, month, year) {
    const baseQuery = firmId ? { firmId } : { lawyerId };
    const query = { ...baseQuery };

    if (month) query['payPeriod.month'] = parseInt(month);
    if (year) query['payPeriod.year'] = parseInt(year);

    const [stats] = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                draft: { $sum: { $cond: [{ $eq: ['$payment.status', 'draft'] }, 1, 0] } },
                approved: { $sum: { $cond: [{ $eq: ['$payment.status', 'approved'] }, 1, 0] } },
                processing: { $sum: { $cond: [{ $eq: ['$payment.status', 'processing'] }, 1, 0] } },
                paid: { $sum: { $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$payment.status', 'failed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$payment.status', 'cancelled'] }, 1, 0] } },
                totalGrossPay: { $sum: '$earnings.totalEarnings' },
                totalDeductions: { $sum: '$deductions.totalDeductions' },
                totalNetPay: { $sum: '$netPay' },
                totalGosi: { $sum: '$deductions.gosi' },
                totalGosiEmployer: { $sum: '$deductions.gosiEmployer' }
            }
        }
    ]);

    // Get by department
    const byDepartment = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: '$department',
                count: { $sum: 1 },
                totalNetPay: { $sum: '$netPay' }
            }
        },
        { $project: { department: '$_id', count: 1, totalNetPay: 1, _id: 0 } }
    ]);

    return {
        total: stats?.total || 0,
        draft: stats?.draft || 0,
        approved: stats?.approved || 0,
        processing: stats?.processing || 0,
        paid: stats?.paid || 0,
        failed: stats?.failed || 0,
        cancelled: stats?.cancelled || 0,
        totalGrossPay: stats?.totalGrossPay || 0,
        totalDeductions: stats?.totalDeductions || 0,
        totalNetPay: stats?.totalNetPay || 0,
        totalGosi: stats?.totalGosi || 0,
        totalGosiEmployer: stats?.totalGosiEmployer || 0,
        byDepartment
    };
};

// Generate slip from employee data
salarySlipSchema.statics.generateFromEmployee = function (employee, month, year, userId, firmId, lawyerId) {
    const isSaudi = employee.personalInfo?.isSaudi !== false;
    const basicSalary = employee.compensation?.basicSalary || 0;

    // Calculate GOSI
    const gosiEmployeeRate = isSaudi ? 9.75 : 0;
    const gosiEmployerRate = isSaudi ? 12.75 : 2;
    const gosi = Math.round(basicSalary * (gosiEmployeeRate / 100));
    const gosiEmployer = Math.round(basicSalary * (gosiEmployerRate / 100));

    // Map allowances
    const allowances = (employee.compensation?.allowances || []).map(a => ({
        name: a.name,
        nameAr: a.nameAr,
        amount: a.amount || 0
    }));

    return {
        employeeId: employee._id,
        employeeNumber: employee.employeeId,
        employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        nationalId: employee.personalInfo?.nationalId,
        jobTitle: employee.employment?.jobTitle || employee.employment?.jobTitleArabic,
        department: employee.employment?.departmentName || employee.organization?.departmentName,

        payPeriod: {
            month,
            year,
            calendarType: 'gregorian',
            workingDays: 22,
            daysWorked: 22
        },

        earnings: {
            basicSalary,
            allowances,
            overtime: { hours: 0, rate: 1.5, amount: 0 },
            bonus: 0,
            commission: 0,
            arrears: 0
        },

        deductions: {
            gosi,
            gosiEmployer,
            loans: 0,
            advances: 0,
            absences: 0,
            lateDeductions: 0,
            violations: 0,
            otherDeductions: 0
        },

        payment: {
            paymentMethod: employee.compensation?.paymentMethod || 'bank_transfer',
            bankName: employee.compensation?.bankDetails?.bankName,
            iban: employee.compensation?.bankDetails?.iban,
            status: 'draft'
        },

        wps: {
            required: true,
            submitted: false
        },

        generatedBy: userId,
        firmId,
        lawyerId
    };
};

module.exports = mongoose.model('SalarySlip', salarySlipSchema);
