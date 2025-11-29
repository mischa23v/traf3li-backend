const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    // Auto-generated leave request ID
    leaveId: {
        type: String,
        unique: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // EMPLOYEE REFERENCE - مرجع الموظف
    // ═══════════════════════════════════════════════════════════════
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // LEAVE DETAILS - تفاصيل الإجازة
    // ═══════════════════════════════════════════════════════════════
    leaveType: {
        type: String,
        enum: [
            'annual',       // إجازة سنوية
            'sick',         // إجازة مرضية
            'personal',     // إجازة شخصية
            'unpaid',       // إجازة بدون راتب
            'maternity',    // إجازة أمومة
            'paternity',    // إجازة أبوة
            'hajj',         // إجازة حج
            'marriage',     // إجازة زواج
            'bereavement',  // إجازة عزاء
            'emergency',    // إجازة طارئة
            'study',        // إجازة دراسية
            'compensatory', // إجازة تعويضية
            'other'
        ],
        required: true
    },

    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },

    // Duration calculation
    totalDays: {
        type: Number,
        required: true,
        min: 0.5 // Allow half days
    },

    // For half-day leaves
    isHalfDay: {
        type: Boolean,
        default: false
    },
    halfDayType: {
        type: String,
        enum: ['morning', 'afternoon'],
        default: null
    },

    // ═══════════════════════════════════════════════════════════════
    // REASON & DOCUMENTATION - السبب والتوثيق
    // ═══════════════════════════════════════════════════════════════
    reason: {
        type: String,
        required: true,
        maxlength: 1000
    },

    // Attachments (e.g., medical certificates)
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileKey: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now }
    }],

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL WORKFLOW - سير عمل الموافقة
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending',
        index: true
    },

    // Substitute/replacement employee during leave
    substituteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },

    // Approval details
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,
    rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    rejectedAt: Date,
    rejectionReason: String,
    cancelledAt: Date,
    cancellationReason: String,

    // ═══════════════════════════════════════════════════════════════
    // BALANCE TRACKING - تتبع الرصيد
    // ═══════════════════════════════════════════════════════════════
    balanceBeforeRequest: { type: Number, default: 0 },
    balanceAfterApproval: { type: Number, default: 0 },
    isPaid: {
        type: Boolean,
        default: true
    },

    // ═══════════════════════════════════════════════════════════════
    // METADATA - البيانات الوصفية
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 500
    },

    // For tracking return from leave
    returnDate: Date,
    actualReturnDate: Date,

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ lawyerId: 1, startDate: -1 });
leaveSchema.index({ lawyerId: 1, leaveType: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

// Generate leave ID before saving
leaveSchema.pre('save', async function(next) {
    if (!this.leaveId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: { $gte: new Date(year, 0, 1) }
        });
        this.leaveId = `LV-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Static method: Get leave balance for employee
leaveSchema.statics.getLeaveBalance = async function(employeeId, leaveType, year) {
    const Employee = mongoose.model('Employee');
    const employee = await Employee.findById(employeeId);

    if (!employee) return { available: 0, used: 0, pending: 0 };

    // Get total balance from employee record
    const totalBalance = employee.leaveBalances[leaveType] || 0;

    // Calculate used leaves
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31);

    const usedLeaves = await this.aggregate([
        {
            $match: {
                employeeId: new mongoose.Types.ObjectId(employeeId),
                leaveType,
                status: 'approved',
                startDate: { $gte: startOfYear, $lte: endOfYear }
            }
        },
        {
            $group: {
                _id: null,
                totalUsed: { $sum: '$totalDays' }
            }
        }
    ]);

    const used = usedLeaves[0]?.totalUsed || 0;

    // Calculate pending leaves
    const pendingLeaves = await this.aggregate([
        {
            $match: {
                employeeId: new mongoose.Types.ObjectId(employeeId),
                leaveType,
                status: 'pending',
                startDate: { $gte: startOfYear, $lte: endOfYear }
            }
        },
        {
            $group: {
                _id: null,
                totalPending: { $sum: '$totalDays' }
            }
        }
    ]);

    const pending = pendingLeaves[0]?.totalPending || 0;

    return {
        total: totalBalance,
        used,
        pending,
        available: totalBalance - used - pending
    };
};

// Static method: Check for overlapping leaves
leaveSchema.statics.checkOverlap = async function(employeeId, startDate, endDate, excludeId = null) {
    const query = {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        status: { $in: ['pending', 'approved'] },
        $or: [
            { startDate: { $lte: endDate, $gte: startDate } },
            { endDate: { $lte: endDate, $gte: startDate } },
            { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
        ]
    };

    if (excludeId) {
        query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    return await this.findOne(query);
};

// Static method: Get leave statistics for period
leaveSchema.statics.getLeaveStats = async function(lawyerId, startDate, endDate) {
    return await this.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                status: 'approved',
                startDate: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$leaveType',
                count: { $sum: 1 },
                totalDays: { $sum: '$totalDays' }
            }
        },
        { $sort: { totalDays: -1 } }
    ]);
};

// Static method: Get employees on leave today
leaveSchema.statics.getEmployeesOnLeaveToday = async function(lawyerId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        status: 'approved',
        startDate: { $lte: today },
        endDate: { $gte: today }
    }).populate('employeeId', 'firstName lastName employeeId department');
};

module.exports = mongoose.model('Leave', leaveSchema);
