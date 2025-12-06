const { AttendanceRecord, Employee, LeaveRequest } = require('../models');

/**
 * Attendance Controller
 * MODULE 5: الحضور والانصراف
 * Handles all attendance and time tracking operations
 */

// ═══════════════════════════════════════════════════════════════
// CORE CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all attendance records with filtering
 * GET /api/attendance
 */
const getAttendanceRecords = async (req, res) => {
    try {
        const {
            firmId,
            employeeId,
            department,
            status,
            startDate,
            endDate,
            year,
            month,
            page = 1,
            limit = 50,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        const query = {};

        // Multi-tenancy
        if (firmId) query.firmId = firmId;
        if (req.user?.firmId) query.firmId = req.user.firmId;

        // Filters
        if (employeeId) query.employeeId = employeeId;
        if (department) query.department = department;
        if (status) query.status = status;
        if (year) query.year = parseInt(year);
        if (month) query.month = parseInt(month);

        // Date range
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [records, total] = await Promise.all([
            AttendanceRecord.find(query)
                .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic employmentDetails.department')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            AttendanceRecord.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: records,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting attendance records:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance records',
            error: error.message
        });
    }
};

/**
 * Get single attendance record by ID
 * GET /api/attendance/:id
 */
const getAttendanceById = async (req, res) => {
    try {
        const record = await AttendanceRecord.findById(req.params.id)
            .populate('employeeId', 'employeeId personalInfo employmentDetails')
            .populate('checkIn.approvedBy', 'firstName lastName')
            .populate('checkOut.approvedBy', 'firstName lastName')
            .populate('corrections.requestedBy', 'firstName lastName')
            .populate('corrections.reviewedBy', 'firstName lastName');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('Error getting attendance record:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance record',
            error: error.message
        });
    }
};

/**
 * Get attendance record for specific employee on specific date
 * GET /api/attendance/employee/:employeeId/date/:date
 */
const getAttendanceByEmployeeAndDate = async (req, res) => {
    try {
        const { employeeId, date } = req.params;
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const record = await AttendanceRecord.findOne({
            employeeId,
            date: targetDate
        }).populate('employeeId', 'employeeId personalInfo employmentDetails');

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'No attendance record found for this date'
            });
        }

        res.status(200).json({
            success: true,
            data: record
        });
    } catch (error) {
        console.error('Error getting attendance by date:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attendance record',
            error: error.message
        });
    }
};

/**
 * Create manual attendance record
 * POST /api/attendance
 */
const createAttendanceRecord = async (req, res) => {
    try {
        const {
            employeeId,
            date,
            checkIn,
            checkOut,
            status,
            shift,
            notes,
            notesAr,
            exception,
            firmId,
            lawyerId
        } = req.body;

        // Check if employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Check for existing record
        const targetDate = new Date(date);
        targetDate.setHours(0, 0, 0, 0);

        const existingRecord = await AttendanceRecord.findOne({
            employeeId,
            date: targetDate
        });

        if (existingRecord) {
            return res.status(400).json({
                success: false,
                message: 'Attendance record already exists for this date'
            });
        }

        const record = new AttendanceRecord({
            employeeId,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            employeeNameAr: employee.personalInfo?.fullNameArabic,
            employeeNumber: employee.employeeId,
            department: employee.employmentDetails?.department,
            departmentAr: employee.employmentDetails?.departmentAr,
            position: employee.employmentDetails?.jobTitle,
            positionAr: employee.employmentDetails?.jobTitleAr,
            date: targetDate,
            checkIn: checkIn ? {
                time: new Date(checkIn.time),
                source: 'manual_entry',
                notes: checkIn.notes
            } : undefined,
            checkOut: checkOut ? {
                time: new Date(checkOut.time),
                source: 'manual_entry',
                notes: checkOut.notes
            } : undefined,
            status,
            shift,
            notes,
            notesAr,
            exception,
            firmId: firmId || req.user?.firmId,
            lawyerId: lawyerId || req.user?._id,
            createdBy: req.user?._id,
            approval: {
                required: true,
                status: 'pending'
            }
        });

        await record.save();

        res.status(201).json({
            success: true,
            message: 'Attendance record created successfully',
            data: record
        });
    } catch (error) {
        console.error('Error creating attendance record:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating attendance record',
            error: error.message
        });
    }
};

/**
 * Update attendance record
 * PUT /api/attendance/:id
 */
const updateAttendanceRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        // Track history
        const historyEntry = {
            action: 'update',
            field: 'multiple',
            oldValue: record.toObject(),
            newValue: updates,
            changedBy: req.user?._id,
            changedAt: new Date(),
            reason: updates.updateReason || 'Manual update'
        };

        record.history = record.history || [];
        record.history.push(historyEntry);

        // Apply updates
        Object.keys(updates).forEach(key => {
            if (key !== 'updateReason' && key !== '_id') {
                record[key] = updates[key];
            }
        });

        record.lastModifiedBy = req.user?._id;
        record.lastModifiedAt = new Date();

        await record.save();

        res.status(200).json({
            success: true,
            message: 'Attendance record updated successfully',
            data: record
        });
    } catch (error) {
        console.error('Error updating attendance record:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating attendance record',
            error: error.message
        });
    }
};

/**
 * Delete attendance record
 * DELETE /api/attendance/:id
 */
const deleteAttendanceRecord = async (req, res) => {
    try {
        const record = await AttendanceRecord.findByIdAndDelete(req.params.id);

        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Attendance record deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting attendance record:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting attendance record',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CHECK-IN / CHECK-OUT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Employee check-in
 * POST /api/attendance/check-in
 */
const checkIn = async (req, res) => {
    try {
        const {
            employeeId,
            source = 'web',
            deviceType = 'desktop',
            location,
            biometric,
            notes,
            photo,
            firmId,
            lawyerId
        } = req.body;

        const checkInData = {
            source,
            deviceType,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            location,
            biometric,
            notes,
            photo
        };

        const record = await AttendanceRecord.checkIn(
            employeeId,
            firmId || req.user?.firmId,
            lawyerId || req.user?._id,
            checkInData
        );

        res.status(200).json({
            success: true,
            message: 'تم تسجيل الحضور بنجاح - Check-in successful',
            data: {
                attendanceId: record.attendanceId,
                employeeName: record.employeeName,
                checkInTime: record.checkIn.time,
                status: record.status,
                isLate: record.lateArrival?.isLate || false,
                lateBy: record.lateArrival?.lateBy || 0
            }
        });
    } catch (error) {
        console.error('Error during check-in:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error during check-in'
        });
    }
};

/**
 * Employee check-out
 * POST /api/attendance/check-out
 */
const checkOut = async (req, res) => {
    try {
        const {
            employeeId,
            source = 'web',
            deviceType = 'desktop',
            location,
            biometric,
            notes,
            photo,
            firmId
        } = req.body;

        const checkOutData = {
            source,
            deviceType,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            location,
            biometric,
            notes,
            photo
        };

        const record = await AttendanceRecord.checkOut(
            employeeId,
            firmId || req.user?.firmId,
            checkOutData
        );

        res.status(200).json({
            success: true,
            message: 'تم تسجيل الانصراف بنجاح - Check-out successful',
            data: {
                attendanceId: record.attendanceId,
                employeeName: record.employeeName,
                checkInTime: record.checkIn.time,
                checkOutTime: record.checkOut.time,
                hoursWorked: record.hours.net,
                overtimeHours: record.hours.overtime,
                status: record.status,
                isEarlyDeparture: record.earlyDeparture?.isEarly || false,
                earlyBy: record.earlyDeparture?.earlyBy || 0
            }
        });
    } catch (error) {
        console.error('Error during check-out:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Error during check-out'
        });
    }
};

/**
 * Get current check-in status for employee
 * GET /api/attendance/status/:employeeId
 */
const getCheckInStatus = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const record = await AttendanceRecord.findOne({
            employeeId,
            date: today
        });

        if (!record) {
            return res.status(200).json({
                success: true,
                data: {
                    isCheckedIn: false,
                    isCheckedOut: false,
                    isOnBreak: false,
                    record: null
                }
            });
        }

        res.status(200).json({
            success: true,
            data: {
                isCheckedIn: !!record.checkIn?.time,
                isCheckedOut: !!record.checkOut?.time,
                isOnBreak: record.isOnBreak,
                checkInTime: record.checkIn?.time,
                checkOutTime: record.checkOut?.time,
                currentBreak: record.breaks?.find(b => b.status === 'ongoing'),
                hoursWorked: record.hours?.net || 0,
                status: record.status,
                record
            }
        });
    } catch (error) {
        console.error('Error getting check-in status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting check-in status',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// BREAK MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Start break
 * POST /api/attendance/:id/break/start
 */
const startBreak = async (req, res) => {
    try {
        const { id } = req.params;
        const { type = 'personal', isPaid = true, notes } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        if (!record.checkIn?.time) {
            return res.status(400).json({
                success: false,
                message: 'Cannot start break without checking in first'
            });
        }

        if (record.checkOut?.time) {
            return res.status(400).json({
                success: false,
                message: 'Cannot start break after checking out'
            });
        }

        // Check if already on break
        if (record.isOnBreak) {
            return res.status(400).json({
                success: false,
                message: 'Already on break. Please end current break first.'
            });
        }

        const newBreak = record.startBreak(type, isPaid, notes);
        await record.save();

        res.status(200).json({
            success: true,
            message: 'Break started successfully',
            data: {
                breakId: record.breaks.length - 1,
                break: newBreak,
                totalBreaks: record.breaks.length
            }
        });
    } catch (error) {
        console.error('Error starting break:', error);
        res.status(500).json({
            success: false,
            message: 'Error starting break',
            error: error.message
        });
    }
};

/**
 * End break
 * POST /api/attendance/:id/break/end
 */
const endBreak = async (req, res) => {
    try {
        const { id } = req.params;
        const { maxDuration = 30 } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        if (!record.isOnBreak) {
            return res.status(400).json({
                success: false,
                message: 'Not currently on break'
            });
        }

        const endedBreak = record.endBreak(maxDuration);
        await record.save();

        res.status(200).json({
            success: true,
            message: 'Break ended successfully',
            data: {
                break: endedBreak,
                breakSummary: record.breakSummary,
                exceeded: endedBreak.status === 'exceeded',
                exceededBy: endedBreak.exceededBy || 0
            }
        });
    } catch (error) {
        console.error('Error ending break:', error);
        res.status(500).json({
            success: false,
            message: 'Error ending break',
            error: error.message
        });
    }
};

/**
 * Get break history for attendance record
 * GET /api/attendance/:id/breaks
 */
const getBreaks = async (req, res) => {
    try {
        const record = await AttendanceRecord.findById(req.params.id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                breaks: record.breaks || [],
                summary: record.breakSummary,
                isOnBreak: record.isOnBreak,
                currentBreak: record.breaks?.find(b => b.status === 'ongoing')
            }
        });
    } catch (error) {
        console.error('Error getting breaks:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting breaks',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CORRECTION REQUESTS
// ═══════════════════════════════════════════════════════════════

/**
 * Submit correction request
 * POST /api/attendance/:id/corrections
 */
const submitCorrection = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            field,
            originalValue,
            requestedValue,
            reason,
            reasonAr,
            supportingDocument
        } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const correctionRequest = {
            requestId: `COR-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
            requestedBy: req.user?._id,
            requestedAt: new Date(),
            field,
            originalValue,
            requestedValue,
            reason,
            reasonAr,
            supportingDocument,
            status: 'pending'
        };

        record.corrections = record.corrections || [];
        record.corrections.push(correctionRequest);
        await record.save();

        res.status(201).json({
            success: true,
            message: 'Correction request submitted successfully',
            data: correctionRequest
        });
    } catch (error) {
        console.error('Error submitting correction:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting correction request',
            error: error.message
        });
    }
};

/**
 * Review correction request
 * PUT /api/attendance/:id/corrections/:correctionId
 */
const reviewCorrection = async (req, res) => {
    try {
        const { id, correctionId } = req.params;
        const { status, reviewNotes } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const correction = record.corrections?.find(c => c.requestId === correctionId);
        if (!correction) {
            return res.status(404).json({
                success: false,
                message: 'Correction request not found'
            });
        }

        correction.status = status;
        correction.reviewedBy = req.user?._id;
        correction.reviewedAt = new Date();
        correction.reviewNotes = reviewNotes;

        // Apply correction if approved
        if (status === 'approved') {
            const { field, requestedValue } = correction;

            switch (field) {
                case 'checkIn':
                    record.checkIn = record.checkIn || {};
                    record.checkIn.time = new Date(requestedValue);
                    break;
                case 'checkOut':
                    record.checkOut = record.checkOut || {};
                    record.checkOut.time = new Date(requestedValue);
                    break;
                case 'status':
                    record.status = requestedValue;
                    break;
                // Add more field handlers as needed
            }

            correction.appliedAt = new Date();
        }

        await record.save();

        res.status(200).json({
            success: true,
            message: `Correction request ${status}`,
            data: correction
        });
    } catch (error) {
        console.error('Error reviewing correction:', error);
        res.status(500).json({
            success: false,
            message: 'Error reviewing correction request',
            error: error.message
        });
    }
};

/**
 * Get pending corrections
 * GET /api/attendance/corrections/pending
 */
const getPendingCorrections = async (req, res) => {
    try {
        const { firmId } = req.query;

        const records = await AttendanceRecord.find({
            firmId: firmId || req.user?.firmId,
            'corrections.status': 'pending'
        })
        .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic')
        .populate('corrections.requestedBy', 'firstName lastName');

        const pendingCorrections = [];
        records.forEach(record => {
            record.corrections
                .filter(c => c.status === 'pending')
                .forEach(correction => {
                    pendingCorrections.push({
                        attendanceId: record._id,
                        attendanceDate: record.date,
                        employeeId: record.employeeId,
                        employeeName: record.employeeName,
                        correction
                    });
                });
        });

        res.status(200).json({
            success: true,
            data: pendingCorrections,
            total: pendingCorrections.length
        });
    } catch (error) {
        console.error('Error getting pending corrections:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting pending corrections',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// APPROVAL WORKFLOW
// ═══════════════════════════════════════════════════════════════

/**
 * Approve attendance record
 * POST /api/attendance/:id/approve
 */
const approveAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        record.approval = {
            required: true,
            status: 'approved',
            approvedBy: req.user?._id,
            approvedAt: new Date()
        };

        if (notes) {
            record.managerNotes = notes;
        }

        await record.save();

        res.status(200).json({
            success: true,
            message: 'Attendance record approved',
            data: record
        });
    } catch (error) {
        console.error('Error approving attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving attendance',
            error: error.message
        });
    }
};

/**
 * Reject attendance record
 * POST /api/attendance/:id/reject
 */
const rejectAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        record.approval = {
            required: true,
            status: 'rejected',
            rejectedBy: req.user?._id,
            rejectedAt: new Date(),
            rejectionReason: reason
        };

        await record.save();

        res.status(200).json({
            success: true,
            message: 'Attendance record rejected',
            data: record
        });
    } catch (error) {
        console.error('Error rejecting attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting attendance',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// VIOLATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Add violation to attendance record
 * POST /api/attendance/:id/violations
 */
const addViolation = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            type,
            severity = 'minor',
            description,
            descriptionAr,
            penaltyType,
            penaltyAmount,
            penaltyNotes
        } = req.body;

        const typeTranslations = {
            'late_arrival': 'تأخير في الحضور',
            'early_departure': 'مغادرة مبكرة',
            'unauthorized_absence': 'غياب غير مصرح',
            'missed_check_in': 'عدم تسجيل الحضور',
            'missed_check_out': 'عدم تسجيل الانصراف',
            'exceeded_break': 'تجاوز وقت الاستراحة',
            'unauthorized_overtime': 'عمل إضافي غير مصرح',
            'location_violation': 'مخالفة الموقع',
            'multiple_check_in': 'تسجيل حضور متعدد',
            'proxy_attendance': 'حضور بالوكالة',
            'other': 'أخرى'
        };

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const violation = {
            type,
            typeAr: typeTranslations[type] || type,
            severity,
            description,
            descriptionAr,
            detectedAt: new Date(),
            autoDetected: false,
            resolved: false,
            penaltyApplied: !!penaltyType,
            penaltyType,
            penaltyAmount,
            penaltyNotes
        };

        record.violations = record.violations || [];
        record.violations.push(violation);
        record.statusDetails = record.statusDetails || {};
        record.statusDetails.hasViolation = true;

        await record.save();

        res.status(201).json({
            success: true,
            message: 'Violation added successfully',
            data: violation
        });
    } catch (error) {
        console.error('Error adding violation:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding violation',
            error: error.message
        });
    }
};

/**
 * Resolve violation
 * PUT /api/attendance/:id/violations/:violationIndex/resolve
 */
const resolveViolation = async (req, res) => {
    try {
        const { id, violationIndex } = req.params;
        const { resolution } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const index = parseInt(violationIndex);
        if (!record.violations || !record.violations[index]) {
            return res.status(404).json({
                success: false,
                message: 'Violation not found'
            });
        }

        record.violations[index].resolved = true;
        record.violations[index].resolvedBy = req.user?._id;
        record.violations[index].resolvedAt = new Date();
        record.violations[index].resolution = resolution;

        await record.save();

        res.status(200).json({
            success: true,
            message: 'Violation resolved successfully',
            data: record.violations[index]
        });
    } catch (error) {
        console.error('Error resolving violation:', error);
        res.status(500).json({
            success: false,
            message: 'Error resolving violation',
            error: error.message
        });
    }
};

/**
 * Submit violation appeal
 * POST /api/attendance/:id/violations/:violationIndex/appeal
 */
const appealViolation = async (req, res) => {
    try {
        const { id, violationIndex } = req.params;
        const { reason } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        const index = parseInt(violationIndex);
        if (!record.violations || !record.violations[index]) {
            return res.status(404).json({
                success: false,
                message: 'Violation not found'
            });
        }

        record.violations[index].appealSubmitted = true;
        record.violations[index].appealDate = new Date();
        record.violations[index].appealReason = reason;
        record.violations[index].appealStatus = 'pending';

        await record.save();

        res.status(200).json({
            success: true,
            message: 'Appeal submitted successfully',
            data: record.violations[index]
        });
    } catch (error) {
        console.error('Error submitting appeal:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting appeal',
            error: error.message
        });
    }
};

/**
 * Get all violations for a period
 * GET /api/attendance/violations
 */
const getViolations = async (req, res) => {
    try {
        const {
            firmId,
            employeeId,
            startDate,
            endDate,
            type,
            resolved,
            severity
        } = req.query;

        const query = {
            firmId: firmId || req.user?.firmId,
            'violations.0': { $exists: true } // Has at least one violation
        };

        if (employeeId) query.employeeId = employeeId;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const records = await AttendanceRecord.find(query)
            .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic')
            .select('attendanceId date employeeId employeeName violations');

        // Filter violations
        let allViolations = [];
        records.forEach(record => {
            record.violations.forEach((violation, index) => {
                let include = true;
                if (type && violation.type !== type) include = false;
                if (resolved !== undefined && violation.resolved !== (resolved === 'true')) include = false;
                if (severity && violation.severity !== severity) include = false;

                if (include) {
                    allViolations.push({
                        attendanceId: record._id,
                        attendanceDate: record.date,
                        employeeId: record.employeeId,
                        employeeName: record.employeeName,
                        violationIndex: index,
                        violation
                    });
                }
            });
        });

        res.status(200).json({
            success: true,
            data: allViolations,
            total: allViolations.length
        });
    } catch (error) {
        console.error('Error getting violations:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting violations',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// OVERTIME MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Approve overtime
 * POST /api/attendance/:id/overtime/approve
 */
const approveOvertime = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes, compensationType = 'payment' } = req.body;

        const record = await AttendanceRecord.findById(id);
        if (!record) {
            return res.status(404).json({
                success: false,
                message: 'Attendance record not found'
            });
        }

        if (!record.overtime?.hasOvertime) {
            return res.status(400).json({
                success: false,
                message: 'No overtime to approve'
            });
        }

        record.overtime.preApproved = true;
        record.overtime.approvedBy = req.user?._id;
        record.overtime.approvedAt = new Date();
        record.overtime.approvalNotes = notes;
        record.overtime.compensation = record.overtime.compensation || {};
        record.overtime.compensation.type = compensationType;

        await record.save();

        res.status(200).json({
            success: true,
            message: 'Overtime approved successfully',
            data: record.overtime
        });
    } catch (error) {
        console.error('Error approving overtime:', error);
        res.status(500).json({
            success: false,
            message: 'Error approving overtime',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// STATISTICS & REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get today's attendance overview
 * GET /api/attendance/today
 */
const getTodayAttendance = async (req, res) => {
    try {
        const { firmId } = req.query;
        const targetFirmId = firmId || req.user?.firmId;

        const records = await AttendanceRecord.getTodayAttendance(targetFirmId);

        // Get all active employees for comparison
        const Employee = require('../models').Employee;
        const totalEmployees = await Employee.countDocuments({
            firmId: targetFirmId,
            'employmentDetails.employmentStatus': 'active'
        });

        const summary = {
            total: records.length,
            totalEmployees,
            present: records.filter(r => ['present', 'late', 'work_from_home'].includes(r.status)).length,
            absent: totalEmployees - records.filter(r => r.checkIn?.time).length,
            late: records.filter(r => r.lateArrival?.isLate).length,
            onLeave: records.filter(r => r.status === 'on_leave').length,
            workFromHome: records.filter(r => r.status === 'work_from_home').length,
            incomplete: records.filter(r => r.status === 'incomplete').length
        };

        res.status(200).json({
            success: true,
            data: {
                summary,
                records
            }
        });
    } catch (error) {
        console.error('Error getting today attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting today attendance',
            error: error.message
        });
    }
};

/**
 * Get attendance summary for employee
 * GET /api/attendance/summary/:employeeId
 */
const getAttendanceSummary = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { startDate, endDate, firmId } = req.query;

        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        const summary = await AttendanceRecord.getAttendanceSummary(
            employeeId,
            start,
            end,
            firmId || req.user?.firmId
        );

        res.status(200).json({
            success: true,
            data: {
                employeeId,
                period: { startDate: start, endDate: end },
                summary
            }
        });
    } catch (error) {
        console.error('Error getting attendance summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting attendance summary',
            error: error.message
        });
    }
};

/**
 * Get monthly attendance report
 * GET /api/attendance/report/monthly
 */
const getMonthlyReport = async (req, res) => {
    try {
        const { firmId, year, month, department } = req.query;

        const targetYear = parseInt(year) || new Date().getFullYear();
        const targetMonth = parseInt(month) || new Date().getMonth() + 1;

        const query = {
            firmId: firmId || req.user?.firmId,
            year: targetYear,
            month: targetMonth
        };

        if (department) query.department = department;

        const records = await AttendanceRecord.find(query)
            .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic employmentDetails.department')
            .sort({ employeeId: 1, date: 1 });

        // Group by employee
        const employeeReports = {};
        records.forEach(record => {
            const empId = record.employeeId?._id?.toString() || record.employeeId;
            if (!employeeReports[empId]) {
                employeeReports[empId] = {
                    employeeId: record.employeeId,
                    employeeName: record.employeeName,
                    department: record.department,
                    records: [],
                    summary: {
                        presentDays: 0,
                        absentDays: 0,
                        lateDays: 0,
                        leaveDays: 0,
                        totalHoursWorked: 0,
                        totalOvertime: 0,
                        violations: 0
                    }
                };
            }

            employeeReports[empId].records.push(record);

            // Update summary
            const sum = employeeReports[empId].summary;
            if (['present', 'late', 'work_from_home'].includes(record.status)) sum.presentDays++;
            if (record.status === 'absent') sum.absentDays++;
            if (record.lateArrival?.isLate) sum.lateDays++;
            if (record.status === 'on_leave') sum.leaveDays++;
            sum.totalHoursWorked += record.hours?.net || 0;
            sum.totalOvertime += record.hours?.overtime || 0;
            sum.violations += record.violationSummary?.totalViolations || 0;
        });

        res.status(200).json({
            success: true,
            data: {
                year: targetYear,
                month: targetMonth,
                employeeReports: Object.values(employeeReports),
                totalRecords: records.length
            }
        });
    } catch (error) {
        console.error('Error getting monthly report:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting monthly report',
            error: error.message
        });
    }
};

/**
 * Get department attendance statistics
 * GET /api/attendance/stats/department
 */
const getDepartmentStats = async (req, res) => {
    try {
        const { firmId, startDate, endDate } = req.query;

        const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = endDate ? new Date(endDate) : new Date();

        const stats = await AttendanceRecord.aggregate([
            {
                $match: {
                    firmId: mongoose.Types.ObjectId(firmId || req.user?.firmId),
                    date: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: '$department',
                    totalRecords: { $sum: 1 },
                    presentDays: {
                        $sum: { $cond: [{ $in: ['$status', ['present', 'late', 'work_from_home']] }, 1, 0] }
                    },
                    absentDays: {
                        $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
                    },
                    lateDays: {
                        $sum: { $cond: ['$lateArrival.isLate', 1, 0] }
                    },
                    totalHoursWorked: { $sum: '$hours.net' },
                    totalOvertime: { $sum: '$hours.overtime' },
                    violations: { $sum: '$violationSummary.totalViolations' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.status(200).json({
            success: true,
            data: {
                period: { startDate: start, endDate: end },
                departmentStats: stats
            }
        });
    } catch (error) {
        console.error('Error getting department stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting department statistics',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Mark absences for employees who didn't check in
 * POST /api/attendance/mark-absences
 */
const markAbsences = async (req, res) => {
    try {
        const { date, firmId } = req.body;

        const targetDate = date ? new Date(date) : new Date();
        const results = await AttendanceRecord.markAbsences(
            firmId || req.user?.firmId,
            targetDate
        );

        res.status(200).json({
            success: true,
            message: 'Absence marking completed',
            data: results
        });
    } catch (error) {
        console.error('Error marking absences:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking absences',
            error: error.message
        });
    }
};

/**
 * Bulk import attendance records
 * POST /api/attendance/import
 */
const importAttendance = async (req, res) => {
    try {
        const { records, firmId, lawyerId } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({
                success: false,
                message: 'Records array is required'
            });
        }

        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        for (const recordData of records) {
            try {
                const employee = await Employee.findOne({
                    $or: [
                        { _id: recordData.employeeId },
                        { employeeId: recordData.employeeNumber }
                    ],
                    firmId: firmId || req.user?.firmId
                });

                if (!employee) {
                    results.failed++;
                    results.errors.push({
                        record: recordData,
                        error: 'Employee not found'
                    });
                    continue;
                }

                const targetDate = new Date(recordData.date);
                targetDate.setHours(0, 0, 0, 0);

                const existingRecord = await AttendanceRecord.findOne({
                    employeeId: employee._id,
                    date: targetDate
                });

                if (existingRecord) {
                    results.failed++;
                    results.errors.push({
                        record: recordData,
                        error: 'Record already exists for this date'
                    });
                    continue;
                }

                const record = new AttendanceRecord({
                    employeeId: employee._id,
                    employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
                    employeeNameAr: employee.personalInfo?.fullNameArabic,
                    employeeNumber: employee.employeeId,
                    department: employee.employmentDetails?.department,
                    position: employee.employmentDetails?.jobTitle,
                    date: targetDate,
                    checkIn: recordData.checkIn ? {
                        time: new Date(recordData.checkIn),
                        source: 'import'
                    } : undefined,
                    checkOut: recordData.checkOut ? {
                        time: new Date(recordData.checkOut),
                        source: 'import'
                    } : undefined,
                    status: recordData.status || 'pending',
                    notes: recordData.notes,
                    firmId: firmId || req.user?.firmId,
                    lawyerId: lawyerId || req.user?._id,
                    createdBy: req.user?._id
                });

                await record.save();
                results.success++;
            } catch (err) {
                results.failed++;
                results.errors.push({
                    record: recordData,
                    error: err.message
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Import completed',
            data: results
        });
    } catch (error) {
        console.error('Error importing attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Error importing attendance records',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // CRUD
    getAttendanceRecords,
    getAttendanceById,
    getAttendanceByEmployeeAndDate,
    createAttendanceRecord,
    updateAttendanceRecord,
    deleteAttendanceRecord,

    // Check-in/Check-out
    checkIn,
    checkOut,
    getCheckInStatus,

    // Breaks
    startBreak,
    endBreak,
    getBreaks,

    // Corrections
    submitCorrection,
    reviewCorrection,
    getPendingCorrections,

    // Approval
    approveAttendance,
    rejectAttendance,

    // Violations
    addViolation,
    resolveViolation,
    appealViolation,
    getViolations,

    // Overtime
    approveOvertime,

    // Statistics
    getTodayAttendance,
    getAttendanceSummary,
    getMonthlyReport,
    getDepartmentStats,

    // Bulk operations
    markAbsences,
    importAttendance
};
