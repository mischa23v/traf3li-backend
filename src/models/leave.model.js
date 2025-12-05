const mongoose = require('mongoose');

/**
 * Leave Management Model
 * Tracks employee leave requests, balances, and approvals
 * Integrates with Payroll for salary calculations
 */
const leaveSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    leaveId: {
        type: String,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // LEAVE DETAILS
    // ═══════════════════════════════════════════════════════════════
    leaveType: {
        type: String,
        enum: [
            'annual',           // إجازة سنوية
            'sick',             // إجازة مرضية
            'unpaid',           // إجازة بدون راتب
            'maternity',        // إجازة أمومة
            'paternity',        // إجازة أبوة
            'marriage',         // إجازة زواج
            'bereavement',      // إجازة وفاة
            'hajj',             // إجازة حج
            'compensatory',     // إجازة تعويضية
            'emergency',        // إجازة طارئة
            'study',            // إجازة دراسية
            'other'             // أخرى
        ],
        required: true,
        index: true
    },
    startDate: {
        type: Date,
        required: true,
        index: true
    },
    endDate: {
        type: Date,
        required: true
    },
    totalDays: {
        type: Number,
        required: true,
        min: 0.5  // Allow half days
    },
    isHalfDay: {
        type: Boolean,
        default: false
    },
    halfDayPeriod: {
        type: String,
        enum: ['morning', 'afternoon']
    },

    // ═══════════════════════════════════════════════════════════════
    // REQUEST INFO
    // ═══════════════════════════════════════════════════════════════
    reason: {
        type: String,
        maxlength: 1000
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,
    approvalNotes: String,

    // ═══════════════════════════════════════════════════════════════
    // BALANCE TRACKING
    // ═══════════════════════════════════════════════════════════════
    balanceBefore: {
        type: Number,
        default: 0
    },
    balanceAfter: {
        type: Number,
        default: 0
    },
    affectsBalance: {
        type: Boolean,
        default: true  // Some leave types don't affect balance (e.g., unpaid)
    },

    // ═══════════════════════════════════════════════════════════════
    // PAYROLL INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    affectsSalary: {
        type: Boolean,
        default: false  // Only unpaid leave affects salary
    },
    salaryDeduction: {
        type: Number,
        default: 0
    },
    payrollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payroll'
    },

    // ═══════════════════════════════════════════════════════════════
    // REPLACEMENT
    // ═══════════════════════════════════════════════════════════════
    replacementEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    handoverNotes: String,

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    requestedAt: {
        type: Date,
        default: Date.now
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
leaveSchema.index({ lawyerId: 1, employeeId: 1, startDate: -1 });
leaveSchema.index({ lawyerId: 1, status: 1 });
leaveSchema.index({ employeeId: 1, leaveType: 1, startDate: 1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
leaveSchema.pre('save', async function(next) {
    // Generate leave ID
    if (!this.leaveId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.leaveId = `LV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
    }

    // Calculate total days if not provided
    if (!this.totalDays && this.startDate && this.endDate) {
        const diffTime = Math.abs(this.endDate - this.startDate);
        this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (this.isHalfDay) this.totalDays = 0.5;
    }

    // Set salary deduction for unpaid leave
    if (this.leaveType === 'unpaid') {
        this.affectsSalary = true;
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get leave balance for an employee
leaveSchema.statics.getBalance = async function(employeeId, leaveType, year = new Date().getFullYear()) {
    const Employee = mongoose.model('Employee');
    const employee = await Employee.findById(employeeId);

    if (!employee) return null;

    // Get annual entitlement from employee record
    const entitlement = employee.leaveEntitlement?.[leaveType] || 0;

    // Calculate used leave this year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);

    const usedLeave = await this.aggregate([
        {
            $match: {
                employeeId: new mongoose.Types.ObjectId(employeeId),
                leaveType,
                status: 'approved',
                startDate: { $gte: yearStart, $lte: yearEnd },
                affectsBalance: true
            }
        },
        {
            $group: {
                _id: null,
                totalUsed: { $sum: '$totalDays' }
            }
        }
    ]);

    const used = usedLeave[0]?.totalUsed || 0;
    const remaining = entitlement - used;

    return {
        entitlement,
        used,
        remaining,
        year
    };
};

// Get all leave balances for an employee
leaveSchema.statics.getAllBalances = async function(employeeId, year = new Date().getFullYear()) {
    const leaveTypes = ['annual', 'sick', 'personal', 'compensatory'];
    const balances = {};

    for (const type of leaveTypes) {
        balances[type] = await this.getBalance(employeeId, type, year);
    }

    return balances;
};

// Get leaves for payroll period
leaveSchema.statics.getForPayroll = async function(lawyerId, employeeId, startDate, endDate) {
    return this.find({
        lawyerId,
        employeeId,
        status: 'approved',
        affectsSalary: true,
        $or: [
            { startDate: { $gte: startDate, $lte: endDate } },
            { endDate: { $gte: startDate, $lte: endDate } },
            { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
        ]
    });
};

// Get pending leave requests
leaveSchema.statics.getPending = async function(lawyerId, limit = 20) {
    return this.find({
        lawyerId,
        status: 'pending'
    })
    .populate('employeeId', 'firstName lastName employeeId')
    .sort({ requestedAt: 1 })
    .limit(limit);
};

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Approve leave request
leaveSchema.methods.approve = async function(approverId, notes) {
    this.status = 'approved';
    this.approvedBy = approverId;
    this.approvedAt = new Date();
    this.approvalNotes = notes;

    // Update balance
    if (this.affectsBalance) {
        const balance = await this.constructor.getBalance(
            this.employeeId,
            this.leaveType
        );
        this.balanceBefore = balance?.remaining + this.totalDays || 0;
        this.balanceAfter = balance?.remaining || 0;
    }

    await this.save();
    return this;
};

// Reject leave request
leaveSchema.methods.reject = async function(approverId, reason) {
    this.status = 'rejected';
    this.approvedBy = approverId;
    this.approvedAt = new Date();
    this.rejectionReason = reason;
    await this.save();
    return this;
};

// Cancel leave request
leaveSchema.methods.cancel = async function(userId, reason) {
    if (this.status !== 'pending' && this.status !== 'approved') {
        throw new Error('Cannot cancel this leave request');
    }

    this.status = 'cancelled';
    this.updatedBy = userId;
    this.approvalNotes = `Cancelled: ${reason}`;
    await this.save();
    return this;
};

module.exports = mongoose.model('Leave', leaveSchema);
