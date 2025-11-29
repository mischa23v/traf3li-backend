const mongoose = require('mongoose');

// Break schema for tracking breaks during the day
const breakSchema = new mongoose.Schema({
    startTime: { type: Date, required: true },
    endTime: Date,
    duration: { type: Number, default: 0 }, // in minutes
    type: {
        type: String,
        enum: ['lunch', 'prayer', 'personal', 'other'],
        default: 'other'
    }
}, { _id: true });

const attendanceSchema = new mongoose.Schema({
    // Auto-generated attendance ID
    attendanceId: {
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
    // DATE & TIME - التاريخ والوقت
    // ═══════════════════════════════════════════════════════════════
    date: {
        type: Date,
        required: true,
        index: true
    },

    // Check-in
    checkIn: {
        type: Date,
        required: true
    },
    checkInMethod: {
        type: String,
        enum: ['manual', 'biometric', 'mobile_app', 'web', 'auto'],
        default: 'manual'
    },
    checkInLocation: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    checkInNote: String,

    // Check-out
    checkOut: Date,
    checkOutMethod: {
        type: String,
        enum: ['manual', 'biometric', 'mobile_app', 'web', 'auto'],
        default: 'manual'
    },
    checkOutLocation: {
        latitude: Number,
        longitude: Number,
        address: String
    },
    checkOutNote: String,

    // ═══════════════════════════════════════════════════════════════
    // BREAKS - الاستراحات
    // ═══════════════════════════════════════════════════════════════
    breaks: [breakSchema],
    totalBreakTime: { type: Number, default: 0 }, // in minutes

    // ═══════════════════════════════════════════════════════════════
    // WORK HOURS CALCULATION - حساب ساعات العمل
    // ═══════════════════════════════════════════════════════════════
    // Expected work schedule
    expectedCheckIn: Date,
    expectedCheckOut: Date,
    expectedWorkHours: { type: Number, default: 8 },

    // Actual hours
    totalWorkHours: { type: Number, default: 0 },
    netWorkHours: { type: Number, default: 0 }, // Excluding breaks

    // Overtime
    overtimeHours: { type: Number, default: 0 },
    overtimeApproved: { type: Boolean, default: false },
    overtimeApprovedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS & VARIATIONS - الحالة والتغيرات
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'present',      // حاضر
            'absent',       // غائب
            'late',         // متأخر
            'early_leave',  // انصراف مبكر
            'half_day',     // نصف يوم
            'on_leave',     // في إجازة
            'holiday',      // عطلة
            'work_from_home', // عمل من المنزل
            'business_trip'   // رحلة عمل
        ],
        default: 'present',
        index: true
    },

    // Late tracking
    isLate: { type: Boolean, default: false },
    lateMinutes: { type: Number, default: 0 },
    lateReason: String,
    lateExcused: { type: Boolean, default: false },

    // Early leave tracking
    isEarlyLeave: { type: Boolean, default: false },
    earlyLeaveMinutes: { type: Number, default: 0 },
    earlyLeaveReason: String,
    earlyLeaveApproved: { type: Boolean, default: false },

    // ═══════════════════════════════════════════════════════════════
    // LINKED LEAVE - الإجازة المرتبطة
    // ═══════════════════════════════════════════════════════════════
    leaveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Leave'
    },

    // ═══════════════════════════════════════════════════════════════
    // APPROVAL & VERIFICATION - الموافقة والتحقق
    // ═══════════════════════════════════════════════════════════════
    isVerified: { type: Boolean, default: false },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    verifiedAt: Date,

    // Manual adjustments
    isManuallyAdjusted: { type: Boolean, default: false },
    adjustedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adjustmentReason: String,
    originalCheckIn: Date,
    originalCheckOut: Date,

    // ═══════════════════════════════════════════════════════════════
    // METADATA - البيانات الوصفية
    // ═══════════════════════════════════════════════════════════════
    notes: {
        type: String,
        maxlength: 500
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Compound indexes
attendanceSchema.index({ employeeId: 1, date: -1 });
attendanceSchema.index({ lawyerId: 1, date: -1 });
attendanceSchema.index({ lawyerId: 1, status: 1, date: -1 });

// Generate attendance ID before saving
attendanceSchema.pre('save', async function(next) {
    if (!this.attendanceId) {
        const dateStr = this.date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.attendanceId = `ATT-${dateStr}-${random}`;
    }

    // Calculate work hours if both check-in and check-out exist
    if (this.checkIn && this.checkOut) {
        this.calculateWorkHours();
    }

    next();
});

// Method to calculate work hours
attendanceSchema.methods.calculateWorkHours = function() {
    if (!this.checkIn || !this.checkOut) return;

    const diffMs = this.checkOut - this.checkIn;
    this.totalWorkHours = diffMs / (1000 * 60 * 60); // Convert to hours

    // Calculate total break time
    this.totalBreakTime = this.breaks.reduce((sum, b) => sum + (b.duration || 0), 0);

    // Net work hours = Total - Breaks
    this.netWorkHours = this.totalWorkHours - (this.totalBreakTime / 60);

    // Calculate overtime (anything over expected hours)
    if (this.netWorkHours > this.expectedWorkHours) {
        this.overtimeHours = this.netWorkHours - this.expectedWorkHours;
    } else {
        this.overtimeHours = 0;
    }

    // Check if late
    if (this.expectedCheckIn && this.checkIn > this.expectedCheckIn) {
        this.isLate = true;
        this.lateMinutes = Math.round((this.checkIn - this.expectedCheckIn) / (1000 * 60));
    }

    // Check if early leave
    if (this.expectedCheckOut && this.checkOut < this.expectedCheckOut) {
        this.isEarlyLeave = true;
        this.earlyLeaveMinutes = Math.round((this.expectedCheckOut - this.checkOut) / (1000 * 60));
    }
};

// Method to start a break
attendanceSchema.methods.startBreak = function(type = 'other') {
    this.breaks.push({
        startTime: new Date(),
        type
    });
};

// Method to end a break
attendanceSchema.methods.endBreak = function() {
    const currentBreak = this.breaks.find(b => !b.endTime);
    if (currentBreak) {
        currentBreak.endTime = new Date();
        currentBreak.duration = Math.round((currentBreak.endTime - currentBreak.startTime) / (1000 * 60));
    }
};

// Static method: Get attendance for date
attendanceSchema.statics.getAttendanceForDate = async function(lawyerId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await this.find({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('employeeId', 'firstName lastName employeeId department');
};

// Static method: Get employee attendance for period
attendanceSchema.statics.getEmployeeAttendance = async function(employeeId, startDate, endDate) {
    return await this.find({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });
};

// Static method: Get attendance summary for period
attendanceSchema.statics.getAttendanceSummary = async function(lawyerId, startDate, endDate) {
    return await this.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                date: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
};

// Static method: Get late arrivals summary
attendanceSchema.statics.getLateArrivalsSummary = async function(lawyerId, startDate, endDate) {
    return await this.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                date: { $gte: startDate, $lte: endDate },
                isLate: true
            }
        },
        {
            $group: {
                _id: '$employeeId',
                lateCount: { $sum: 1 },
                totalLateMinutes: { $sum: '$lateMinutes' }
            }
        },
        {
            $lookup: {
                from: 'employees',
                localField: '_id',
                foreignField: '_id',
                as: 'employee'
            }
        },
        { $unwind: '$employee' },
        {
            $project: {
                employeeId: '$_id',
                employeeName: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
                employeeIdNumber: '$employee.employeeId',
                lateCount: 1,
                totalLateMinutes: 1
            }
        },
        { $sort: { lateCount: -1 } }
    ]);
};

// Static method: Check if employee has attendance for date
attendanceSchema.statics.hasAttendanceForDate = async function(employeeId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await this.findOne({
        employeeId: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: startOfDay, $lte: endOfDay }
    });

    return !!attendance;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
