const mongoose = require('mongoose');

/**
 * Attendance Tracking Model
 * Records employee clock-in/out, work hours, and integrates with Payroll
 */
const attendanceSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // CLOCK IN/OUT
    // ═══════════════════════════════════════════════════════════════
    clockIn: {
        time: Date,
        location: {
            type: { type: String, enum: ['Point'] },
            coordinates: [Number]  // [longitude, latitude]
        },
        ipAddress: String,
        device: String,
        method: {
            type: String,
            enum: ['manual', 'biometric', 'geolocation', 'qr_code', 'system'],
            default: 'manual'
        },
        notes: String
    },
    clockOut: {
        time: Date,
        location: {
            type: { type: String, enum: ['Point'] },
            coordinates: [Number]
        },
        ipAddress: String,
        device: String,
        method: {
            type: String,
            enum: ['manual', 'biometric', 'geolocation', 'qr_code', 'system'],
            default: 'manual'
        },
        notes: String
    },

    // ═══════════════════════════════════════════════════════════════
    // BREAKS
    // ═══════════════════════════════════════════════════════════════
    breaks: [{
        startTime: Date,
        endTime: Date,
        duration: Number,  // minutes
        type: {
            type: String,
            enum: ['lunch', 'prayer', 'personal', 'other'],
            default: 'personal'
        }
    }],
    totalBreakMinutes: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // WORK HOURS CALCULATION
    // ═══════════════════════════════════════════════════════════════
    scheduledStartTime: Date,
    scheduledEndTime: Date,
    scheduledHours: {
        type: Number,
        default: 8
    },
    actualHours: {
        type: Number,
        default: 0
    },
    netWorkHours: {
        type: Number,
        default: 0  // actualHours - breaks
    },
    overtimeHours: {
        type: Number,
        default: 0
    },
    undertimeHours: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'present',          // حاضر
            'absent',           // غائب
            'late',             // متأخر
            'early_leave',      // انصراف مبكر
            'half_day',         // نصف يوم
            'on_leave',         // في إجازة
            'holiday',          // عطلة
            'weekend',          // نهاية الأسبوع
            'work_from_home',   // عمل من المنزل
            'business_trip',    // رحلة عمل
            'sick'              // مريض
        ],
        default: 'present',
        index: true
    },
    isLate: {
        type: Boolean,
        default: false
    },
    lateMinutes: {
        type: Number,
        default: 0
    },
    isEarlyLeave: {
        type: Boolean,
        default: false
    },
    earlyLeaveMinutes: {
        type: Number,
        default: 0
    },

    // ═══════════════════════════════════════════════════════════════
    // LINKED RECORDS
    // ═══════════════════════════════════════════════════════════════
    leaveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leave'
    },
    payrollId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Payroll'
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVALS & ADJUSTMENTS
    // ═══════════════════════════════════════════════════════════════
    adjustments: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        reason: String,
        adjustedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        adjustedAt: { type: Date, default: Date.now }
    }],
    isManualEntry: {
        type: Boolean,
        default: false
    },
    manualEntryReason: String,
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    approvedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════════════
    notes: String,
    supervisorNotes: String,

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
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
attendanceSchema.index({ lawyerId: 1, date: -1 });
attendanceSchema.index({ employeeId: 1, date: -1 });
attendanceSchema.index({ lawyerId: 1, employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ 'clockIn.location': '2dsphere' });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
attendanceSchema.pre('save', function(next) {
    // Calculate work hours
    if (this.clockIn?.time && this.clockOut?.time) {
        const diffMs = this.clockOut.time - this.clockIn.time;
        this.actualHours = diffMs / (1000 * 60 * 60);

        // Calculate net work hours (minus breaks)
        this.netWorkHours = this.actualHours - (this.totalBreakMinutes / 60);

        // Calculate overtime/undertime
        if (this.netWorkHours > this.scheduledHours) {
            this.overtimeHours = this.netWorkHours - this.scheduledHours;
            this.undertimeHours = 0;
        } else {
            this.overtimeHours = 0;
            this.undertimeHours = this.scheduledHours - this.netWorkHours;
        }
    }

    // Check if late
    if (this.clockIn?.time && this.scheduledStartTime) {
        const lateMs = this.clockIn.time - this.scheduledStartTime;
        if (lateMs > 0) {
            this.isLate = true;
            this.lateMinutes = Math.ceil(lateMs / (1000 * 60));
            if (this.status === 'present') {
                this.status = 'late';
            }
        }
    }

    // Check for early leave
    if (this.clockOut?.time && this.scheduledEndTime) {
        const earlyMs = this.scheduledEndTime - this.clockOut.time;
        if (earlyMs > 0) {
            this.isEarlyLeave = true;
            this.earlyLeaveMinutes = Math.ceil(earlyMs / (1000 * 60));
            if (this.status === 'present' || this.status === 'late') {
                this.status = 'early_leave';
            }
        }
    }

    // Calculate total break minutes
    if (this.breaks && this.breaks.length > 0) {
        this.totalBreakMinutes = this.breaks.reduce((total, brk) => {
            if (brk.startTime && brk.endTime) {
                return total + Math.round((brk.endTime - brk.startTime) / (1000 * 60));
            }
            return total + (brk.duration || 0);
        }, 0);
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get attendance for a date range
attendanceSchema.statics.getForPeriod = async function(lawyerId, employeeId, startDate, endDate) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        date: { $gte: startDate, $lte: endDate }
    };

    if (employeeId) {
        query.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    return this.find(query)
        .populate('employeeId', 'firstName lastName employeeId')
        .sort({ date: 1 });
};

// Get attendance summary for payroll
attendanceSchema.statics.getSummaryForPayroll = async function(lawyerId, employeeId, startDate, endDate) {
    const records = await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        employeeId: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: startDate, $lte: endDate }
    });

    const summary = {
        totalDays: records.length,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        totalLateMinutes: 0,
        earlyLeaveDays: 0,
        totalEarlyLeaveMinutes: 0,
        totalWorkHours: 0,
        totalOvertimeHours: 0,
        totalUndertimeHours: 0,
        leaveDays: 0,
        holidayDays: 0,
        weekendDays: 0
    };

    records.forEach(record => {
        summary.totalWorkHours += record.netWorkHours || 0;
        summary.totalOvertimeHours += record.overtimeHours || 0;
        summary.totalUndertimeHours += record.undertimeHours || 0;

        switch (record.status) {
            case 'present':
                summary.presentDays++;
                break;
            case 'absent':
                summary.absentDays++;
                break;
            case 'late':
                summary.presentDays++;
                summary.lateDays++;
                summary.totalLateMinutes += record.lateMinutes || 0;
                break;
            case 'early_leave':
                summary.presentDays++;
                summary.earlyLeaveDays++;
                summary.totalEarlyLeaveMinutes += record.earlyLeaveMinutes || 0;
                break;
            case 'on_leave':
            case 'sick':
                summary.leaveDays++;
                break;
            case 'holiday':
                summary.holidayDays++;
                break;
            case 'weekend':
                summary.weekendDays++;
                break;
            default:
                summary.presentDays++;
        }
    });

    return summary;
};

// Clock in employee
attendanceSchema.statics.clockIn = async function(lawyerId, employeeId, data = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already clocked in today
    let attendance = await this.findOne({
        lawyerId,
        employeeId,
        date: today
    });

    if (attendance && attendance.clockIn?.time) {
        throw new Error('Already clocked in today');
    }

    if (!attendance) {
        attendance = new this({
            lawyerId,
            employeeId,
            date: today
        });
    }

    attendance.clockIn = {
        time: new Date(),
        location: data.location,
        ipAddress: data.ipAddress,
        device: data.device,
        method: data.method || 'manual',
        notes: data.notes
    };
    attendance.status = 'present';

    await attendance.save();
    return attendance;
};

// Clock out employee
attendanceSchema.statics.clockOut = async function(lawyerId, employeeId, data = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await this.findOne({
        lawyerId,
        employeeId,
        date: today
    });

    if (!attendance) {
        throw new Error('No clock-in record found for today');
    }

    if (attendance.clockOut?.time) {
        throw new Error('Already clocked out today');
    }

    attendance.clockOut = {
        time: new Date(),
        location: data.location,
        ipAddress: data.ipAddress,
        device: data.device,
        method: data.method || 'manual',
        notes: data.notes
    };

    await attendance.save();
    return attendance;
};

// Mark absent for employees who didn't clock in
attendanceSchema.statics.markAbsent = async function(lawyerId, date) {
    const Employee = mongoose.model('Employee');

    // Get all active employees
    const employees = await Employee.find({
        lawyerId,
        status: 'active'
    });

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const results = [];

    for (const employee of employees) {
        // Check if attendance exists
        const existing = await this.findOne({
            lawyerId,
            employeeId: employee._id,
            date: targetDate
        });

        if (!existing) {
            // Check if on leave
            const Leave = mongoose.model('Leave');
            const leave = await Leave.findOne({
                employeeId: employee._id,
                status: 'approved',
                startDate: { $lte: targetDate },
                endDate: { $gte: targetDate }
            });

            const attendance = await this.create({
                lawyerId,
                employeeId: employee._id,
                date: targetDate,
                status: leave ? 'on_leave' : 'absent',
                leaveId: leave?._id
            });

            results.push(attendance);
        }
    }

    return results;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
