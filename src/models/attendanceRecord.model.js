const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Attendance & Time Tracking Model
 * MODULE 5: الحضور والانصراف
 * Saudi Labor Law Compliance (Articles 98, 101, 104, 106, 107)
 */

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Location Schema for check-in/check-out
const CheckLocationSchema = new Schema({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
    address: String,
    addressAr: String,
    isWithinGeofence: { type: Boolean, default: true },
    geofenceId: { type: Schema.Types.ObjectId, ref: 'Geofence' },
    distanceFromOffice: Number, // in meters
    accuracy: Number // GPS accuracy in meters
}, { _id: false });

// Biometric Verification Schema
const BiometricSchema = new Schema({
    method: {
        type: String,
        enum: ['fingerprint', 'facial', 'card', 'pin', 'mobile', 'manual', 'qr_code'],
        default: 'manual'
    },
    deviceId: String,
    deviceName: String,
    verified: { type: Boolean, default: false },
    verificationScore: Number, // 0-100 confidence score
    rawData: String // encrypted biometric hash
}, { _id: false });

// Check Details Schema (for check-in and check-out)
const CheckDetailsSchema = new Schema({
    time: Date,
    location: CheckLocationSchema,
    biometric: BiometricSchema,
    ipAddress: String,
    userAgent: String,
    deviceType: { type: String, enum: ['mobile', 'desktop', 'tablet', 'biometric_terminal', 'other'] },
    source: {
        type: String,
        enum: ['web', 'mobile_app', 'biometric', 'manual_entry', 'import', 'api'],
        default: 'web'
    },
    notes: String,
    notesAr: String,
    photo: String, // URL for selfie verification
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date
}, { _id: false });

// Break Schema
const BreakSchema = new Schema({
    type: {
        type: String,
        enum: ['prayer', 'lunch', 'personal', 'medical', 'other'],
        required: false
    },
    typeAr: String,
    startTime: { type: Date, required: false },
    endTime: Date,
    duration: Number, // in minutes
    isPaid: { type: Boolean, default: true },
    isScheduled: { type: Boolean, default: false },
    location: CheckLocationSchema,
    notes: String,
    status: {
        type: String,
        enum: ['ongoing', 'completed', 'exceeded'],
        default: 'ongoing'
    },
    exceededBy: Number // minutes exceeded beyond allowed
}, { _id: false });

// Late Arrival Schema
const LateArrivalSchema = new Schema({
    isLate: { type: Boolean, default: false },
    scheduledTime: Date,
    actualTime: Date,
    lateBy: Number, // minutes
    reason: String,
    reasonAr: String,
    reasonCategory: {
        type: String,
        enum: ['traffic', 'medical', 'family_emergency', 'transportation', 'weather', 'other', 'no_reason']
    },
    isExcused: { type: Boolean, default: false },
    excusedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    excusedAt: Date,
    excuseNotes: String,
    deductionApplied: { type: Boolean, default: false },
    deductionAmount: Number,
    deductionType: { type: String, enum: ['hours', 'percentage', 'fixed'] }
}, { _id: false });

// Early Departure Schema
const EarlyDepartureSchema = new Schema({
    isEarly: { type: Boolean, default: false },
    scheduledTime: Date,
    actualTime: Date,
    earlyBy: Number, // minutes
    reason: String,
    reasonAr: String,
    reasonCategory: {
        type: String,
        enum: ['medical', 'family_emergency', 'appointment', 'personal', 'other', 'no_reason']
    },
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    deductionApplied: { type: Boolean, default: false },
    deductionAmount: Number
}, { _id: false });

// Absence Schema
const AbsenceSchema = new Schema({
    isAbsent: { type: Boolean, default: false },
    type: {
        type: String,
        enum: ['unauthorized', 'authorized', 'leave', 'holiday', 'sick', 'pending']
    },
    typeAr: String,
    reason: String,
    reasonAr: String,
    linkedLeaveRequest: { type: Schema.Types.ObjectId, ref: 'LeaveRequest' },
    isExcused: { type: Boolean, default: false },
    excusedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    excusedAt: Date,
    documentProvided: { type: Boolean, default: false },
    documentUrl: String,
    deductionApplied: { type: Boolean, default: false },
    deductionDays: Number
}, { _id: false });

// Overtime Details Schema (المادة 107)
const OvertimeDetailsSchema = new Schema({
    hasOvertime: { type: Boolean, default: false },
    regularOvertime: { // Normal overtime (150%)
        hours: { type: Number, default: 0 },
        minutes: { type: Number, default: 0 },
        rate: { type: Number, default: 1.5 } // Saudi Labor Law Article 107
    },
    weekendOvertime: { // Weekend/Friday overtime (200%)
        hours: { type: Number, default: 0 },
        minutes: { type: Number, default: 0 },
        rate: { type: Number, default: 2.0 }
    },
    holidayOvertime: { // Public holiday overtime (200%)
        hours: { type: Number, default: 0 },
        minutes: { type: Number, default: 0 },
        rate: { type: Number, default: 2.0 }
    },
    totalOvertimeMinutes: { type: Number, default: 0 },
    preApproved: { type: Boolean, default: false },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    approvalNotes: String,
    reason: String,
    reasonAr: String,
    taskDescription: String,
    taskDescriptionAr: String,
    compensation: {
        type: { type: String, enum: ['payment', 'time_off', 'both'], default: 'payment' },
        calculatedAmount: Number,
        timeOffHours: Number,
        paid: { type: Boolean, default: false },
        paidInPayrollRun: { type: Schema.Types.ObjectId, ref: 'PayrollRun' }
    }
}, { _id: false });

// Violation Schema
const ViolationSchema = new Schema({
    type: {
        type: String,
        enum: [
            'late_arrival',
            'early_departure',
            'unauthorized_absence',
            'missed_check_in',
            'missed_check_out',
            'exceeded_break',
            'unauthorized_overtime',
            'location_violation',
            'multiple_check_in',
            'proxy_attendance',
            'other'
        ],
        required: false
    },
    typeAr: String,
    severity: {
        type: String,
        enum: ['minor', 'moderate', 'major', 'critical'],
        default: 'minor'
    },
    description: String,
    descriptionAr: String,
    detectedAt: { type: Date, default: Date.now },
    autoDetected: { type: Boolean, default: true },
    resolved: { type: Boolean, default: false },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    resolution: String,
    penaltyApplied: { type: Boolean, default: false },
    penaltyType: {
        type: String,
        enum: ['warning', 'deduction', 'suspension', 'termination_warning', 'none']
    },
    penaltyAmount: Number,
    penaltyNotes: String,
    appealSubmitted: { type: Boolean, default: false },
    appealDate: Date,
    appealReason: String,
    appealStatus: { type: String, enum: ['pending', 'approved', 'rejected'] },
    appealDecidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    appealDecidedAt: Date
}, { _id: false });

// Compliance Check Schema (Saudi Labor Law)
const ComplianceCheckSchema = new Schema({
    // Article 98: Maximum 8 hours/day, 48 hours/week
    dailyHoursCompliant: { type: Boolean, default: true },
    weeklyHoursCompliant: { type: Boolean, default: true },
    maxDailyHours: { type: Number, default: 8 },
    maxWeeklyHours: { type: Number, default: 48 },
    actualDailyHours: Number,
    actualWeeklyHours: Number,

    // Article 101: Friday rest day
    fridayRestCompliant: { type: Boolean, default: true },
    workedOnFriday: { type: Boolean, default: false },

    // Article 104: Rest periods
    restPeriodCompliant: { type: Boolean, default: true },
    restPeriodMinutes: Number,
    requiredRestMinutes: { type: Number, default: 30 },

    // Article 106: Ramadan hours (6 hours for Muslims)
    ramadanHoursApplied: { type: Boolean, default: false },
    ramadanMaxHours: { type: Number, default: 6 },

    // Article 107: Overtime limits and rates
    overtimeCompliant: { type: Boolean, default: true },
    monthlyOvertimeHours: Number,
    maxMonthlyOvertime: { type: Number, default: 40 },

    // Overall compliance
    isFullyCompliant: { type: Boolean, default: true },
    violations: [String],
    checkedAt: { type: Date, default: Date.now }
}, { _id: false });

// Correction Request Schema
const CorrectionRequestSchema = new Schema({
    requestId: String,
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date, default: Date.now },
    field: {
        type: String,
        enum: ['checkIn', 'checkOut', 'breaks', 'overtime', 'status', 'other'],
        required: false
    },
    originalValue: Schema.Types.Mixed,
    requestedValue: Schema.Types.Mixed,
    reason: { type: String, required: false },
    reasonAr: String,
    supportingDocument: String,
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'cancelled'],
        default: 'pending'
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,
    appliedAt: Date
}, { _id: false });

// Exception Schema (for special cases)
const ExceptionSchema = new Schema({
    type: {
        type: String,
        enum: [
            'work_from_home',
            'field_work',
            'client_visit',
            'training',
            'conference',
            'flexible_hours',
            'shift_swap',
            'other'
        ]
    },
    typeAr: String,
    description: String,
    descriptionAr: String,
    startDate: Date,
    endDate: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    isRecurring: { type: Boolean, default: false },
    recurringPattern: String // cron pattern
}, { _id: false });

// ═══════════════════════════════════════════════════════════════
// MAIN ATTENDANCE RECORD SCHEMA
// ═══════════════════════════════════════════════════════════════

const AttendanceRecordSchema = new Schema({
    // Unique Identifier
    attendanceId: {
        type: String,
        unique: true
    },

    // ─────────────────────────────────────────────────────────────
    // Employee Information
    // ─────────────────────────────────────────────────────────────
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: false,
        index: true
    },
    employeeName: String,
    employeeNameAr: String,
    employeeNumber: String,
    department: String,
    departmentAr: String,
    position: String,
    positionAr: String,

    // ─────────────────────────────────────────────────────────────
    // Date Information
    // ─────────────────────────────────────────────────────────────
    date: {
        type: Date,
        required: false,
        index: true
    },
    dayOfWeek: {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    },
    dayOfWeekAr: String,
    weekNumber: Number,
    month: Number,
    year: Number,
    isWeekend: { type: Boolean, default: false },
    isHoliday: { type: Boolean, default: false },
    holidayName: String,
    holidayNameAr: String,
    isRamadan: { type: Boolean, default: false },

    // ─────────────────────────────────────────────────────────────
    // Shift/Schedule Information
    // ─────────────────────────────────────────────────────────────
    shift: {
        shiftId: { type: Schema.Types.ObjectId, ref: 'Shift' },
        name: { type: String, default: 'Regular' },
        nameAr: { type: String, default: 'دوام عادي' },
        type: {
            type: String,
            enum: ['regular', 'morning', 'evening', 'night', 'flexible', 'split', 'custom'],
            default: 'regular'
        },
        scheduledStart: Date,
        scheduledEnd: Date,
        scheduledHours: { type: Number, default: 8 },
        breakDuration: { type: Number, default: 60 }, // minutes
        graceMinutes: { type: Number, default: 15 },
        flexibleWindow: { type: Number, default: 0 } // minutes for flexible shifts
    },

    // ─────────────────────────────────────────────────────────────
    // Check-in/Check-out
    // ─────────────────────────────────────────────────────────────
    checkIn: CheckDetailsSchema,
    checkOut: CheckDetailsSchema,

    // Multiple check-ins (for split shifts or re-entry)
    additionalChecks: [{
        checkIn: CheckDetailsSchema,
        checkOut: CheckDetailsSchema,
        reason: String,
        duration: Number // minutes
    }],

    // ─────────────────────────────────────────────────────────────
    // Hours Tracking
    // ─────────────────────────────────────────────────────────────
    hours: {
        scheduled: { type: Number, default: 8 },
        worked: { type: Number, default: 0 },
        regular: { type: Number, default: 0 },
        overtime: { type: Number, default: 0 },
        undertime: { type: Number, default: 0 },
        break: { type: Number, default: 0 },
        net: { type: Number, default: 0 }, // worked - break
        paid: { type: Number, default: 0 },
        unpaid: { type: Number, default: 0 }
    },

    // ─────────────────────────────────────────────────────────────
    // Attendance Status
    // ─────────────────────────────────────────────────────────────
    status: {
        type: String,
        enum: [
            'present',
            'absent',
            'late',
            'half_day',
            'on_leave',
            'holiday',
            'weekend',
            'work_from_home',
            'field_work',
            'training',
            'incomplete', // checked in but not out
            'pending'
        ],
        default: 'pending',
        index: true
    },
    statusAr: String,

    // Detailed status flags
    statusDetails: {
        isPresent: { type: Boolean, default: false },
        isAbsent: { type: Boolean, default: false },
        isLate: { type: Boolean, default: false },
        isEarlyDeparture: { type: Boolean, default: false },
        isHalfDay: { type: Boolean, default: false },
        isOvertime: { type: Boolean, default: false },
        isOnLeave: { type: Boolean, default: false },
        isRemote: { type: Boolean, default: false },
        hasViolation: { type: Boolean, default: false }
    },

    // ─────────────────────────────────────────────────────────────
    // Detailed Tracking
    // ─────────────────────────────────────────────────────────────
    lateArrival: LateArrivalSchema,
    earlyDeparture: EarlyDepartureSchema,
    absence: AbsenceSchema,
    overtime: OvertimeDetailsSchema,

    // ─────────────────────────────────────────────────────────────
    // Breaks
    // ─────────────────────────────────────────────────────────────
    breaks: [BreakSchema],
    breakSummary: {
        totalBreaks: { type: Number, default: 0 },
        totalDuration: { type: Number, default: 0 }, // minutes
        paidBreakMinutes: { type: Number, default: 0 },
        unpaidBreakMinutes: { type: Number, default: 0 },
        exceededBreaks: { type: Number, default: 0 }
    },

    // ─────────────────────────────────────────────────────────────
    // Violations
    // ─────────────────────────────────────────────────────────────
    violations: [ViolationSchema],
    violationSummary: {
        totalViolations: { type: Number, default: 0 },
        unresolvedViolations: { type: Number, default: 0 },
        totalPenalties: { type: Number, default: 0 }
    },

    // ─────────────────────────────────────────────────────────────
    // Compliance
    // ─────────────────────────────────────────────────────────────
    compliance: ComplianceCheckSchema,

    // ─────────────────────────────────────────────────────────────
    // Corrections & Exceptions
    // ─────────────────────────────────────────────────────────────
    corrections: [CorrectionRequestSchema],
    exception: ExceptionSchema,

    // ─────────────────────────────────────────────────────────────
    // Payroll Integration
    // ─────────────────────────────────────────────────────────────
    payroll: {
        processed: { type: Boolean, default: false },
        processedAt: Date,
        payrollRunId: { type: Schema.Types.ObjectId, ref: 'PayrollRun' },
        regularPayHours: { type: Number, default: 0 },
        overtimePayHours: { type: Number, default: 0 },
        deductions: {
            lateDeduction: { type: Number, default: 0 },
            absenceDeduction: { type: Number, default: 0 },
            earlyDepartureDeduction: { type: Number, default: 0 },
            violationDeduction: { type: Number, default: 0 },
            totalDeduction: { type: Number, default: 0 }
        },
        additions: {
            overtimeAddition: { type: Number, default: 0 },
            holidayAddition: { type: Number, default: 0 },
            totalAddition: { type: Number, default: 0 }
        }
    },

    // ─────────────────────────────────────────────────────────────
    // Notes & Comments
    // ─────────────────────────────────────────────────────────────
    notes: String,
    notesAr: String,
    managerNotes: String,
    managerNotesAr: String,
    systemNotes: [String],

    // ─────────────────────────────────────────────────────────────
    // Approval Workflow
    // ─────────────────────────────────────────────────────────────
    approval: {
        required: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['not_required', 'pending', 'approved', 'rejected'],
            default: 'not_required'
        },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        rejectedAt: Date,
        rejectionReason: String
    },

    // ─────────────────────────────────────────────────────────────
    // Multi-tenancy
    // ─────────────────────────────────────────────────────────────
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: false,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ─────────────────────────────────────────────────────────────
    // Audit Trail
    // ─────────────────────────────────────────────────────────────
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastModifiedAt: Date,
    history: [{
        action: String,
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
        changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        reason: String
    }]

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Compound unique index (one record per employee per day)
AttendanceRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// Query optimization indexes
AttendanceRecordSchema.index({ firmId: 1, date: -1 });
AttendanceRecordSchema.index({ firmId: 1, status: 1 });
AttendanceRecordSchema.index({ firmId: 1, employeeId: 1, date: -1 });
AttendanceRecordSchema.index({ firmId: 1, year: 1, month: 1 });
AttendanceRecordSchema.index({ 'payroll.processed': 1, 'payroll.payrollRunId': 1 });

// Geospatial index for location
AttendanceRecordSchema.index({ 'checkIn.location': '2dsphere' });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Calculate if currently on break
AttendanceRecordSchema.virtual('isOnBreak').get(function() {
    if (!this.breaks || this.breaks.length === 0) return false;
    return this.breaks.some(b => b.status === 'ongoing');
});

// Calculate total working duration
AttendanceRecordSchema.virtual('workingDuration').get(function() {
    if (!this.checkIn?.time || !this.checkOut?.time) return 0;
    const start = new Date(this.checkIn.time);
    const end = new Date(this.checkOut.time);
    return Math.round((end - start) / (1000 * 60)); // minutes
});

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

AttendanceRecordSchema.pre('save', async function(next) {
    // Generate attendance ID
    if (this.isNew && !this.attendanceId) {
        const date = this.date || new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const count = await mongoose.model('AttendanceRecord').countDocuments({
            firmId: this.firmId,
            date: {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
            }
        });
        this.attendanceId = `ATT-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    }

    // Set date components
    if (this.date) {
        const d = new Date(this.date);
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const daysAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        this.dayOfWeek = days[d.getDay()];
        this.dayOfWeekAr = daysAr[d.getDay()];
        this.weekNumber = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
        this.month = d.getMonth() + 1;
        this.year = d.getFullYear();
        this.isWeekend = d.getDay() === 5 || d.getDay() === 6; // Friday/Saturday
    }

    // Calculate hours if check-in and check-out exist
    if (this.checkIn?.time && this.checkOut?.time) {
        const start = new Date(this.checkIn.time);
        const end = new Date(this.checkOut.time);
        const workedMinutes = (end - start) / (1000 * 60);
        const breakMinutes = this.breakSummary?.totalDuration || 0;
        const netMinutes = workedMinutes - breakMinutes;

        this.hours.worked = parseFloat((workedMinutes / 60).toFixed(2));
        this.hours.break = parseFloat((breakMinutes / 60).toFixed(2));
        this.hours.net = parseFloat((netMinutes / 60).toFixed(2));

        // Calculate regular vs overtime
        const scheduledMinutes = (this.shift?.scheduledHours || 8) * 60;
        if (netMinutes > scheduledMinutes) {
            this.hours.regular = parseFloat((scheduledMinutes / 60).toFixed(2));
            this.hours.overtime = parseFloat(((netMinutes - scheduledMinutes) / 60).toFixed(2));
            this.overtime = this.overtime || {};
            this.overtime.hasOvertime = true;
            this.overtime.totalOvertimeMinutes = netMinutes - scheduledMinutes;
        } else {
            this.hours.regular = parseFloat((netMinutes / 60).toFixed(2));
            this.hours.undertime = parseFloat(((scheduledMinutes - netMinutes) / 60).toFixed(2));
        }
    }

    // Check for late arrival
    if (this.checkIn?.time && this.shift?.scheduledStart) {
        const scheduledStart = new Date(this.shift.scheduledStart);
        const actualStart = new Date(this.checkIn.time);
        const graceMinutes = this.shift.graceMinutes || 15;
        const lateThreshold = new Date(scheduledStart.getTime() + graceMinutes * 60000);

        if (actualStart > lateThreshold) {
            const lateMinutes = Math.round((actualStart - scheduledStart) / (1000 * 60));
            this.lateArrival = this.lateArrival || {};
            this.lateArrival.isLate = true;
            this.lateArrival.scheduledTime = scheduledStart;
            this.lateArrival.actualTime = actualStart;
            this.lateArrival.lateBy = lateMinutes;
            this.statusDetails = this.statusDetails || {};
            this.statusDetails.isLate = true;
        }
    }

    // Check for early departure
    if (this.checkOut?.time && this.shift?.scheduledEnd) {
        const scheduledEnd = new Date(this.shift.scheduledEnd);
        const actualEnd = new Date(this.checkOut.time);

        if (actualEnd < scheduledEnd) {
            const earlyMinutes = Math.round((scheduledEnd - actualEnd) / (1000 * 60));
            this.earlyDeparture = this.earlyDeparture || {};
            this.earlyDeparture.isEarly = true;
            this.earlyDeparture.scheduledTime = scheduledEnd;
            this.earlyDeparture.actualTime = actualEnd;
            this.earlyDeparture.earlyBy = earlyMinutes;
            this.statusDetails = this.statusDetails || {};
            this.statusDetails.isEarlyDeparture = true;
        }
    }

    // Update status
    this.updateStatus();

    // Update status Arabic translation
    const statusTranslations = {
        'present': 'حاضر',
        'absent': 'غائب',
        'late': 'متأخر',
        'half_day': 'نصف يوم',
        'on_leave': 'في إجازة',
        'holiday': 'عطلة',
        'weekend': 'نهاية الأسبوع',
        'work_from_home': 'عمل من المنزل',
        'field_work': 'عمل ميداني',
        'training': 'تدريب',
        'incomplete': 'غير مكتمل',
        'pending': 'قيد الانتظار'
    };
    this.statusAr = statusTranslations[this.status] || this.status;

    // Calculate break summary
    if (this.breaks && this.breaks.length > 0) {
        let totalDuration = 0;
        let paidMinutes = 0;
        let unpaidMinutes = 0;
        let exceeded = 0;

        this.breaks.forEach(brk => {
            if (brk.duration) {
                totalDuration += brk.duration;
                if (brk.isPaid) {
                    paidMinutes += brk.duration;
                } else {
                    unpaidMinutes += brk.duration;
                }
                if (brk.exceededBy && brk.exceededBy > 0) {
                    exceeded++;
                }
            }
        });

        this.breakSummary = {
            totalBreaks: this.breaks.length,
            totalDuration,
            paidBreakMinutes: paidMinutes,
            unpaidBreakMinutes: unpaidMinutes,
            exceededBreaks: exceeded
        };
    }

    // Calculate violation summary
    if (this.violations && this.violations.length > 0) {
        let totalPenalties = 0;
        let unresolved = 0;

        this.violations.forEach(v => {
            if (v.penaltyAmount) totalPenalties += v.penaltyAmount;
            if (!v.resolved) unresolved++;
        });

        this.violationSummary = {
            totalViolations: this.violations.length,
            unresolvedViolations: unresolved,
            totalPenalties
        };

        this.statusDetails = this.statusDetails || {};
        this.statusDetails.hasViolation = true;
    }

    // Run compliance check
    this.runComplianceCheck();

    next();
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

// Update status based on current state
AttendanceRecordSchema.methods.updateStatus = function() {
    this.statusDetails = this.statusDetails || {};

    if (this.isHoliday) {
        this.status = 'holiday';
        return;
    }

    if (this.isWeekend && !this.checkIn?.time) {
        this.status = 'weekend';
        return;
    }

    if (this.absence?.isAbsent && this.absence?.linkedLeaveRequest) {
        this.status = 'on_leave';
        this.statusDetails.isOnLeave = true;
        return;
    }

    if (this.exception?.type === 'work_from_home') {
        this.status = 'work_from_home';
        this.statusDetails.isRemote = true;
        return;
    }

    if (this.exception?.type === 'field_work') {
        this.status = 'field_work';
        return;
    }

    if (this.exception?.type === 'training') {
        this.status = 'training';
        return;
    }

    if (this.checkIn?.time && !this.checkOut?.time) {
        this.status = 'incomplete';
        return;
    }

    if (!this.checkIn?.time && !this.checkOut?.time) {
        if (this.absence?.isAbsent) {
            this.status = 'absent';
            this.statusDetails.isAbsent = true;
        } else {
            this.status = 'pending';
        }
        return;
    }

    if (this.hours?.net < (this.shift?.scheduledHours || 8) / 2) {
        this.status = 'half_day';
        this.statusDetails.isHalfDay = true;
        return;
    }

    if (this.lateArrival?.isLate) {
        this.status = 'late';
        this.statusDetails.isLate = true;
        return;
    }

    this.status = 'present';
    this.statusDetails.isPresent = true;
};

// Run Saudi Labor Law compliance check
AttendanceRecordSchema.methods.runComplianceCheck = function() {
    this.compliance = this.compliance || {};
    const violations = [];

    // Article 98: Daily hours limit (8 hours)
    if (this.hours?.net > 8) {
        this.compliance.dailyHoursCompliant = false;
        violations.push('Exceeded daily 8-hour limit (Article 98)');
    }
    this.compliance.actualDailyHours = this.hours?.net || 0;

    // Article 101: Friday rest
    if (this.dayOfWeek === 'friday' && this.checkIn?.time) {
        this.compliance.workedOnFriday = true;
        // Note: This may be allowed with overtime compensation
    }

    // Article 104: Rest periods (30 min break for 5+ hours)
    if (this.hours?.worked >= 5) {
        const requiredRest = 30;
        const actualRest = this.breakSummary?.totalDuration || 0;
        if (actualRest < requiredRest) {
            this.compliance.restPeriodCompliant = false;
            violations.push(`Insufficient rest period: ${actualRest}/${requiredRest} min (Article 104)`);
        }
        this.compliance.restPeriodMinutes = actualRest;
    }

    // Article 106: Ramadan hours (6 hours for Muslims)
    if (this.isRamadan) {
        this.compliance.ramadanHoursApplied = true;
        if (this.hours?.net > 6) {
            violations.push('Exceeded Ramadan 6-hour limit (Article 106)');
        }
    }

    // Article 107: Overtime compliance
    if (this.overtime?.hasOvertime) {
        this.compliance.overtimeCompliant = true; // Will be checked at monthly level
    }

    this.compliance.violations = violations;
    this.compliance.isFullyCompliant = violations.length === 0;
    this.compliance.checkedAt = new Date();
};

// Start break
AttendanceRecordSchema.methods.startBreak = function(type, isPaid = true, notes = '') {
    this.breaks = this.breaks || [];
    const typeTranslations = {
        'prayer': 'صلاة',
        'lunch': 'غداء',
        'personal': 'شخصي',
        'medical': 'طبي',
        'other': 'آخر'
    };

    this.breaks.push({
        type,
        typeAr: typeTranslations[type] || type,
        startTime: new Date(),
        isPaid,
        notes,
        status: 'ongoing'
    });

    return this.breaks[this.breaks.length - 1];
};

// End break
AttendanceRecordSchema.methods.endBreak = function(maxDuration = 30) {
    if (!this.breaks || this.breaks.length === 0) return null;

    const currentBreak = this.breaks.find(b => b.status === 'ongoing');
    if (!currentBreak) return null;

    currentBreak.endTime = new Date();
    currentBreak.duration = Math.round((currentBreak.endTime - currentBreak.startTime) / (1000 * 60));

    if (currentBreak.duration > maxDuration) {
        currentBreak.status = 'exceeded';
        currentBreak.exceededBy = currentBreak.duration - maxDuration;
    } else {
        currentBreak.status = 'completed';
    }

    return currentBreak;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get or create attendance record for employee on specific date
AttendanceRecordSchema.statics.getOrCreateRecord = async function(employeeId, date, firmId, lawyerId) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    let record = await this.findOne({
        employeeId,
        date: startOfDay
    });

    if (!record) {
        const Employee = mongoose.model('Employee');
        const employee = await Employee.findById(employeeId);

        if (!employee) {
            throw new Error('Employee not found');
        }

        record = new this({
            employeeId,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            employeeNameAr: employee.personalInfo?.fullNameArabic,
            employeeNumber: employee.employeeId,
            department: employee.employmentDetails?.department,
            departmentAr: employee.employmentDetails?.departmentAr,
            position: employee.employmentDetails?.jobTitle,
            positionAr: employee.employmentDetails?.jobTitleAr,
            date: startOfDay,
            firmId,
            lawyerId
        });

        await record.save();
    }

    return record;
};

// Check in employee
AttendanceRecordSchema.statics.checkIn = async function(employeeId, firmId, lawyerId, checkInData = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let record = await this.getOrCreateRecord(employeeId, today, firmId, lawyerId);

    if (record.checkIn?.time) {
        throw new Error('Already checked in today');
    }

    record.checkIn = {
        time: new Date(),
        source: checkInData.source || 'web',
        deviceType: checkInData.deviceType || 'desktop',
        ipAddress: checkInData.ipAddress,
        userAgent: checkInData.userAgent,
        notes: checkInData.notes,
        location: checkInData.location,
        biometric: checkInData.biometric,
        photo: checkInData.photo
    };

    record.statusDetails = record.statusDetails || {};
    record.statusDetails.isPresent = true;

    await record.save();
    return record;
};

// Check out employee
AttendanceRecordSchema.statics.checkOut = async function(employeeId, firmId, checkOutData = {}) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.findOne({
        employeeId,
        date: today,
        firmId
    });

    if (!record) {
        throw new Error('No check-in record found for today');
    }

    if (record.checkOut?.time) {
        throw new Error('Already checked out today');
    }

    if (!record.checkIn?.time) {
        throw new Error('Cannot check out without checking in first');
    }

    // End any ongoing breaks
    if (record.breaks) {
        record.breaks.forEach(brk => {
            if (brk.status === 'ongoing') {
                brk.endTime = new Date();
                brk.duration = Math.round((brk.endTime - brk.startTime) / (1000 * 60));
                brk.status = 'completed';
            }
        });
    }

    record.checkOut = {
        time: new Date(),
        source: checkOutData.source || 'web',
        deviceType: checkOutData.deviceType || 'desktop',
        ipAddress: checkOutData.ipAddress,
        userAgent: checkOutData.userAgent,
        notes: checkOutData.notes,
        location: checkOutData.location,
        biometric: checkOutData.biometric,
        photo: checkOutData.photo
    };

    await record.save();
    return record;
};

// Get attendance summary for date range
AttendanceRecordSchema.statics.getAttendanceSummary = async function(employeeId, startDate, endDate, firmId) {
    const records = await this.find({
        employeeId,
        firmId,
        date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const summary = {
        totalDays: records.length,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        halfDays: 0,
        leaveDays: 0,
        weekends: 0,
        holidays: 0,
        workFromHome: 0,
        totalWorkedHours: 0,
        totalOvertimeHours: 0,
        totalUndertimeHours: 0,
        averageCheckIn: null,
        averageCheckOut: null,
        violations: 0
    };

    let checkInTimes = [];
    let checkOutTimes = [];

    records.forEach(r => {
        switch (r.status) {
            case 'present': summary.presentDays++; break;
            case 'absent': summary.absentDays++; break;
            case 'late': summary.lateDays++; summary.presentDays++; break;
            case 'half_day': summary.halfDays++; break;
            case 'on_leave': summary.leaveDays++; break;
            case 'weekend': summary.weekends++; break;
            case 'holiday': summary.holidays++; break;
            case 'work_from_home': summary.workFromHome++; summary.presentDays++; break;
        }

        summary.totalWorkedHours += r.hours?.net || 0;
        summary.totalOvertimeHours += r.hours?.overtime || 0;
        summary.totalUndertimeHours += r.hours?.undertime || 0;
        summary.violations += r.violationSummary?.totalViolations || 0;

        if (r.checkIn?.time) {
            const t = new Date(r.checkIn.time);
            checkInTimes.push(t.getHours() * 60 + t.getMinutes());
        }
        if (r.checkOut?.time) {
            const t = new Date(r.checkOut.time);
            checkOutTimes.push(t.getHours() * 60 + t.getMinutes());
        }
    });

    // Calculate averages
    if (checkInTimes.length > 0) {
        const avgIn = Math.round(checkInTimes.reduce((a, b) => a + b, 0) / checkInTimes.length);
        summary.averageCheckIn = `${String(Math.floor(avgIn / 60)).padStart(2, '0')}:${String(avgIn % 60).padStart(2, '0')}`;
    }
    if (checkOutTimes.length > 0) {
        const avgOut = Math.round(checkOutTimes.reduce((a, b) => a + b, 0) / checkOutTimes.length);
        summary.averageCheckOut = `${String(Math.floor(avgOut / 60)).padStart(2, '0')}:${String(avgOut % 60).padStart(2, '0')}`;
    }

    return summary;
};

// Get today's attendance for all employees
AttendanceRecordSchema.statics.getTodayAttendance = async function(firmId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.find({
        firmId,
        date: today
    })
    .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic employmentDetails.department')
    .sort({ 'checkIn.time': 1 });
};

// Mark absence for employees who didn't check in
AttendanceRecordSchema.statics.markAbsences = async function(firmId, date) {
    const Employee = mongoose.model('Employee');
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Get all active employees
    const employees = await Employee.find({
        firmId,
        'employmentDetails.employmentStatus': 'active'
    });

    const results = {
        processed: 0,
        markedAbsent: 0,
        alreadyRecorded: 0,
        errors: []
    };

    for (const emp of employees) {
        results.processed++;
        try {
            const existing = await this.findOne({
                employeeId: emp._id,
                date: targetDate
            });

            if (existing) {
                results.alreadyRecorded++;
                continue;
            }

            // Create absence record
            const record = new this({
                employeeId: emp._id,
                employeeName: emp.personalInfo?.fullNameEnglish || emp.personalInfo?.fullNameArabic,
                employeeNameAr: emp.personalInfo?.fullNameArabic,
                employeeNumber: emp.employeeId,
                department: emp.employmentDetails?.department,
                departmentAr: emp.employmentDetails?.departmentAr,
                position: emp.employmentDetails?.jobTitle,
                positionAr: emp.employmentDetails?.jobTitleAr,
                date: targetDate,
                status: 'absent',
                absence: {
                    isAbsent: true,
                    type: 'unauthorized'
                },
                firmId,
                lawyerId: emp.lawyerId
            });

            await record.save();
            results.markedAbsent++;
        } catch (err) {
            results.errors.push({
                employeeId: emp._id,
                error: err.message
            });
        }
    }

    return results;
};

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);
