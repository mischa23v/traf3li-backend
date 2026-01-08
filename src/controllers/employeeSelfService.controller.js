/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  EMPLOYEE SELF-SERVICE PORTAL CONTROLLER                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  Unified Employee Self-Service Portal - Inspired by:                         ║
 * ║  - Odoo Employee Self-Service                                                ║
 * ║  - ERPNext HRMS Self-Service                                                 ║
 * ║  - BambooHR Employee Access                                                  ║
 * ║  - ZenHR Employee Portal                                                     ║
 * ║  - Jisr Employee App                                                         ║
 * ║                                                                               ║
 * ║  Features:                                                                   ║
 * ║  - Personal information view                                                 ║
 * ║  - Leave balance and requests                                                ║
 * ║  - Loan and advance requests                                                 ║
 * ║  - Document access                                                           ║
 * ║  - Payslip viewing                                                           ║
 * ║  - Attendance history                                                        ║
 * ║  - Pending approvals                                                         ║
 * ║  - Quick actions                                                             ║
 * ║                                                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const {
    Employee,
    LeaveAllocation,
    LeaveRequest,
    EmployeeLoan,
    EmployeeAdvance,
    PayrollRun,
    Attendance
} = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// GET MY DASHBOARD (Employee's Main Portal View)
// GET /api/hr/self-service/dashboard
// ═══════════════════════════════════════════════════════════════
const getMyDashboard = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;

    // Build query to find employee by user ID
    const baseQuery = firmId ? { firmId } : { lawyerId };

    // Find employee record for current user
    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    }).lean();

    if (!employee) {
        // User is not linked to an employee record - return admin view
        return res.json({
            success: true,
            isEmployee: false,
            message: 'User is not linked to an employee record',
            messageAr: 'المستخدم غير مرتبط بسجل موظف'
        });
    }

    const today = new Date();
    const currentYear = today.getFullYear();

    // Parallel fetch all employee data
    const [
        leaveAllocations,
        pendingLeaveRequests,
        approvedUpcomingLeaves,
        activeLoans,
        activeAdvances,
        recentPayslips,
        pendingApprovals
    ] = await Promise.all([
        // Leave balances
        LeaveAllocation.find({
            ...baseQuery,
            employeeId: employee._id,
            year: currentYear
        }).select('leaveType allocated used balance').lean(),

        // Pending leave requests
        LeaveRequest.countDocuments({
            ...baseQuery,
            employeeId: employee._id,
            status: { $in: ['pending', 'submitted'] }
        }),

        // Upcoming approved leaves
        LeaveRequest.find({
            ...baseQuery,
            employeeId: employee._id,
            status: 'approved',
            'dates.startDate': { $gte: today }
        }).select('leaveType dates').sort({ 'dates.startDate': 1 }).limit(3).lean(),

        // Active loans
        EmployeeLoan?.find({
            ...baseQuery,
            employeeId: employee._id,
            status: { $in: ['disbursed', 'recovering'] }
        }).select('loanType loanAmount balance.remainingBalance repayment.installmentAmount').lean() || [],

        // Active advances
        EmployeeAdvance?.find({
            ...baseQuery,
            employeeId: employee._id,
            status: { $in: ['disbursed', 'recovering'] }
        }).select('advanceType advanceAmount balance.remainingBalance repayment.installmentAmount').lean() || [],

        // Recent payslips (last 3)
        PayrollRun?.find({
            ...baseQuery,
            'employees.employeeId': employee._id,
            status: 'completed'
        }).select('payrollPeriod processedDate').sort({ payrollPeriod: -1 }).limit(3).lean() || [],

        // Count pending approvals (if user is an approver)
        countPendingApprovals(baseQuery, userId)
    ]);

    // Calculate leave summary
    const leaveSummary = {};
    leaveAllocations.forEach(alloc => {
        leaveSummary[alloc.leaveType] = {
            allocated: alloc.allocated,
            used: alloc.used,
            balance: alloc.balance
        };
    });

    // Calculate total outstanding loans/advances
    const totalLoanBalance = activeLoans.reduce((sum, loan) => sum + (loan.balance?.remainingBalance || 0), 0);
    const totalAdvanceBalance = activeAdvances.reduce((sum, adv) => sum + (adv.balance?.remainingBalance || 0), 0);
    const monthlyDeductions = activeLoans.reduce((sum, loan) => sum + (loan.repayment?.installmentAmount || 0), 0)
        + activeAdvances.reduce((sum, adv) => sum + (adv.repayment?.installmentAmount || 0), 0);

    return res.json({
        success: true,
        isEmployee: true,
        employeeId: employee._id,
        employeeNumber: employee.employeeId,
        profile: {
            name: employee.personalInfo?.fullNameEnglish,
            nameAr: employee.personalInfo?.fullNameArabic,
            avatar: employee.personalInfo?.avatar,
            department: employee.employment?.departmentName,
            jobTitle: employee.employment?.jobTitle,
            hireDate: employee.employment?.hireDate,
            employmentStatus: employee.employment?.employmentStatus
        },
        leave: {
            balances: leaveSummary,
            pendingRequests: pendingLeaveRequests,
            upcomingLeaves: approvedUpcomingLeaves.map(l => ({
                type: l.leaveType,
                startDate: l.dates.startDate,
                endDate: l.dates.endDate
            }))
        },
        financial: {
            activeLoans: activeLoans.length,
            activeAdvances: activeAdvances.length,
            totalOutstanding: totalLoanBalance + totalAdvanceBalance,
            monthlyDeductions,
            loans: activeLoans.map(l => ({
                type: l.loanType,
                originalAmount: l.loanAmount,
                remaining: l.balance?.remainingBalance
            })),
            advances: activeAdvances.map(a => ({
                type: a.advanceType,
                originalAmount: a.advanceAmount,
                remaining: a.balance?.remainingBalance
            }))
        },
        payroll: {
            recentPayslips: recentPayslips.map(p => ({
                period: p.payrollPeriod,
                processedDate: p.processedDate
            }))
        },
        approvals: {
            pendingCount: pendingApprovals
        },
        quickActions: [
            { key: 'request_leave', label: 'Request Leave', labelAr: 'طلب إجازة', icon: 'calendar' },
            { key: 'request_advance', label: 'Request Advance', labelAr: 'طلب سلفة', icon: 'money' },
            { key: 'view_payslips', label: 'View Payslips', labelAr: 'عرض قسائم الراتب', icon: 'document' },
            { key: 'update_info', label: 'Update Info', labelAr: 'تحديث البيانات', icon: 'edit' }
        ]
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MY PROFILE
// GET /api/hr/self-service/profile
// ═══════════════════════════════════════════════════════════════
const getMyProfile = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    })
        .select('-__v -createdBy -updatedBy')
        .lean();

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    // Remove sensitive fields from response
    const safeProfile = {
        _id: employee._id,
        employeeId: employee.employeeId,
        personalInfo: {
            fullNameEnglish: employee.personalInfo?.fullNameEnglish,
            fullNameArabic: employee.personalInfo?.fullNameArabic,
            email: employee.personalInfo?.email,
            mobile: employee.personalInfo?.mobile,
            dateOfBirth: employee.personalInfo?.dateOfBirth,
            gender: employee.personalInfo?.gender,
            maritalStatus: employee.personalInfo?.maritalStatus,
            nationality: employee.personalInfo?.nationality,
            avatar: employee.personalInfo?.avatar
        },
        employment: {
            hireDate: employee.employment?.hireDate,
            jobTitle: employee.employment?.jobTitle,
            jobTitleArabic: employee.employment?.jobTitleArabic,
            departmentName: employee.employment?.departmentName,
            employmentStatus: employee.employment?.employmentStatus,
            contractType: employee.employment?.contractType
        },
        address: employee.address,
        emergencyContact: employee.emergencyContact,
        bankDetails: {
            bankName: employee.bankDetails?.bankName,
            // Mask account number
            accountNumber: employee.bankDetails?.accountNumber
                ? '****' + employee.bankDetails.accountNumber.slice(-4)
                : null,
            // Mask IBAN
            iban: employee.bankDetails?.iban
                ? employee.bankDetails.iban.slice(0, 4) + '****' + employee.bankDetails.iban.slice(-4)
                : null
        }
    };

    return res.json({
        success: true,
        data: safeProfile
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE MY PROFILE (Limited Fields)
// PATCH /api/hr/self-service/profile
// ═══════════════════════════════════════════════════════════════
const updateMyProfile = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;

    const baseQuery = firmId ? { firmId } : { lawyerId };

    // Employee can only update these fields
    const allowedFields = [
        'personalInfo.mobile',
        'personalInfo.avatar',
        'address.street',
        'address.city',
        'address.district',
        'address.postalCode',
        'emergencyContact.name',
        'emergencyContact.relationship',
        'emergencyContact.phone'
    ];

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    });

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    // Apply updates only to allowed fields
    const updates = {};
    allowedFields.forEach(field => {
        const value = field.split('.').reduce((obj, key) => obj?.[key], req.body);
        if (value !== undefined) {
            updates[field] = value;
        }
    });

    // Use $set for nested field updates
    if (Object.keys(updates).length > 0) {
        await Employee.findByIdAndUpdate(employee._id, { $set: updates });
    }

    return res.json({
        success: true,
        message: 'Profile updated successfully',
        messageAr: 'تم تحديث الملف الشخصي بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MY LEAVE BALANCES
// GET /api/hr/self-service/leave/balances
// ═══════════════════════════════════════════════════════════════
const getMyLeaveBalances = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;
    const { year } = req.query;

    const baseQuery = firmId ? { firmId } : { lawyerId };
    const targetYear = parseInt(year) || new Date().getFullYear();

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    }).select('_id').lean();

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    const allocations = await LeaveAllocation.find({
        ...baseQuery,
        employeeId: employee._id,
        year: targetYear
    }).lean();

    // Format for display
    const balances = allocations.map(alloc => ({
        leaveType: alloc.leaveType,
        leaveTypeName: getLeaveTypeName(alloc.leaveType),
        leaveTypeNameAr: getLeaveTypeNameAr(alloc.leaveType),
        allocated: alloc.allocated,
        used: alloc.used,
        pending: alloc.pending || 0,
        balance: alloc.balance,
        carryForward: alloc.carryForward || 0,
        encashed: alloc.encashed || 0
    }));

    return res.json({
        success: true,
        year: targetYear,
        data: balances
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MY LEAVE REQUESTS
// GET /api/hr/self-service/leave/requests
// ═══════════════════════════════════════════════════════════════
const getMyLeaveRequests = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;
    const { status, page = 1, limit = 10 } = req.query;

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    }).select('_id').lean();

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    const query = {
        ...baseQuery,
        employeeId: employee._id
    };

    if (status) {
        query.status = status;
    }

    const [requests, total] = await Promise.all([
        LeaveRequest.find(query)
            .sort({ createdAt: -1 })
            .skip((parseInt(page) - 1) * parseInt(limit))
            .limit(parseInt(limit))
            .lean(),
        LeaveRequest.countDocuments(query)
    ]);

    return res.json({
        success: true,
        data: requests.map(r => ({
            _id: r._id,
            requestNumber: r.requestNumber,
            leaveType: r.leaveType,
            leaveTypeName: getLeaveTypeName(r.leaveType),
            leaveTypeNameAr: getLeaveTypeNameAr(r.leaveType),
            startDate: r.dates?.startDate,
            endDate: r.dates?.endDate,
            totalDays: r.dates?.workingDays || r.dates?.totalDays,
            status: r.status,
            statusAr: getStatusAr(r.status),
            reason: r.reason,
            createdAt: r.createdAt,
            approvalDate: r.approvalDate
        })),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// SUBMIT LEAVE REQUEST
// POST /api/hr/self-service/leave/request
// ═══════════════════════════════════════════════════════════════
const submitLeaveRequest = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    }).lean();

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    // Mass assignment protection
    const allowedFields = [
        'leaveType',
        'startDate',
        'endDate',
        'reason',
        'reasonAr',
        'halfDay',
        'halfDayPeriod',
        'attachments'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    const { leaveType, startDate, endDate, reason, reasonAr, halfDay, halfDayPeriod, attachments } = safeData;

    // Validation
    if (!leaveType || !startDate || !endDate) {
        throw CustomException('Leave type, start date, and end date are required', 400);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
        throw CustomException('Start date cannot be after end date', 400);
    }

    // Check balance
    const currentYear = start.getFullYear();
    const allocation = await LeaveAllocation.findOne({
        ...baseQuery,
        employeeId: employee._id,
        leaveType: leaveType.toUpperCase(),
        year: currentYear
    });

    if (!allocation) {
        throw CustomException(`No leave allocation found for ${leaveType}`, 400);
    }

    // Calculate working days (excluding weekends - Fri/Sat for Saudi)
    let workingDays = 0;
    const current = new Date(start);
    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 5 && dayOfWeek !== 6) { // Friday = 5, Saturday = 6
            workingDays++;
        }
        current.setDate(current.getDate() + 1);
    }

    if (halfDay) {
        workingDays = 0.5;
    }

    if (workingDays > allocation.balance) {
        throw CustomException(
            `Insufficient leave balance. Requested: ${workingDays} days, Available: ${allocation.balance} days`,
            400
        );
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
        firmId: firmId || null,
        lawyerId: lawyerId,
        employeeId: employee._id,
        employeeName: employee.personalInfo?.fullNameEnglish,
        employeeNameAr: employee.personalInfo?.fullNameArabic,
        department: employee.employment?.departmentName,
        leaveType: leaveType.toUpperCase(),
        dates: {
            startDate: start,
            endDate: end,
            totalDays: workingDays,
            workingDays
        },
        halfDay: halfDay || false,
        halfDayPeriod: halfDayPeriod || null,
        reason,
        reasonAr,
        status: 'submitted',
        requestStatus: 'pending_approval',
        submittedAt: new Date(),
        submittedBy: userId,
        createdBy: userId,
        attachments: attachments || []
    });

    // Update allocation pending count
    allocation.pending = (allocation.pending || 0) + workingDays;
    await allocation.save();

    return res.status(201).json({
        success: true,
        message: 'Leave request submitted successfully',
        messageAr: 'تم تقديم طلب الإجازة بنجاح',
        data: {
            _id: leaveRequest._id,
            requestNumber: leaveRequest.requestNumber,
            leaveType: leaveRequest.leaveType,
            startDate: leaveRequest.dates.startDate,
            endDate: leaveRequest.dates.endDate,
            totalDays: workingDays,
            status: leaveRequest.status
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// CANCEL MY LEAVE REQUEST
// POST /api/hr/self-service/leave/request/:requestId/cancel
// ═══════════════════════════════════════════════════════════════
const cancelMyLeaveRequest = asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;

    if (!sanitizeObjectId(requestId)) {
        throw CustomException('Invalid request ID', 400);
    }

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    }).select('_id').lean();

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    const leaveRequest = await LeaveRequest.findOne({
        _id: requestId,
        ...baseQuery,
        employeeId: employee._id
    });

    if (!leaveRequest) {
        throw CustomException('Leave request not found', 404);
    }

    // Can only cancel pending or submitted requests
    if (!['pending', 'submitted', 'draft'].includes(leaveRequest.status)) {
        throw CustomException('Only pending or submitted requests can be cancelled', 400);
    }

    // Mass assignment protection - only allow reason field
    const allowedFields = ['reason'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    // Sanitize reason - limit length and strip HTML
    const reason = typeof safeData.reason === 'string'
        ? safeData.reason.substring(0, 500).replace(/<[^>]*>/g, '')
        : 'Cancelled by employee';

    // Update request status
    leaveRequest.status = 'cancelled';
    leaveRequest.cancelledAt = new Date();
    leaveRequest.cancelledBy = userId;
    leaveRequest.cancellationReason = reason;
    await leaveRequest.save();

    // Restore pending days in allocation
    const allocation = await LeaveAllocation.findOne({
        ...baseQuery,
        employeeId: employee._id,
        leaveType: leaveRequest.leaveType,
        year: new Date(leaveRequest.dates.startDate).getFullYear()
    });

    if (allocation) {
        allocation.pending = Math.max(0, (allocation.pending || 0) - leaveRequest.dates.workingDays);
        await allocation.save();
    }

    return res.json({
        success: true,
        message: 'Leave request cancelled successfully',
        messageAr: 'تم إلغاء طلب الإجازة بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MY LOANS
// GET /api/hr/self-service/loans
// ═══════════════════════════════════════════════════════════════
const getMyLoans = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    }).select('_id').lean();

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    const loans = await EmployeeLoan?.find({
        ...baseQuery,
        employeeId: employee._id
    })
        .sort({ createdAt: -1 })
        .lean() || [];

    return res.json({
        success: true,
        data: loans.map(loan => ({
            _id: loan._id,
            loanNumber: loan.loanNumber,
            loanType: loan.loanType,
            loanTypeName: getLoanTypeName(loan.loanType),
            loanTypeNameAr: getLoanTypeNameAr(loan.loanType),
            originalAmount: loan.loanAmount,
            remainingBalance: loan.balance?.remainingBalance,
            monthlyInstallment: loan.repayment?.installmentAmount,
            totalInstallments: loan.repayment?.installments,
            paidInstallments: loan.repaymentSchedule?.summary?.paidInstallments || 0,
            status: loan.status,
            statusAr: getStatusAr(loan.status),
            requestDate: loan.requestDate,
            disbursementDate: loan.disbursementDate
        }))
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MY ADVANCES
// GET /api/hr/self-service/advances
// ═══════════════════════════════════════════════════════════════
const getMyAdvances = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    }).select('_id').lean();

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    const advances = await EmployeeAdvance?.find({
        ...baseQuery,
        employeeId: employee._id
    })
        .sort({ createdAt: -1 })
        .lean() || [];

    return res.json({
        success: true,
        data: advances.map(adv => ({
            _id: adv._id,
            advanceNumber: adv.advanceNumber,
            advanceType: adv.advanceType,
            advanceTypeName: getAdvanceTypeName(adv.advanceType),
            advanceTypeNameAr: getAdvanceTypeNameAr(adv.advanceType),
            originalAmount: adv.advanceAmount,
            remainingBalance: adv.balance?.remainingBalance,
            monthlyInstallment: adv.repayment?.installmentAmount,
            totalInstallments: adv.repayment?.installments,
            paidInstallments: adv.repaymentSchedule?.summary?.paidInstallments || 0,
            status: adv.status,
            statusAr: getStatusAr(adv.status),
            requestDate: adv.requestDate,
            disbursementDate: adv.disbursementDate,
            isEmergency: adv.isEmergency
        }))
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MY PAYSLIPS
// GET /api/hr/self-service/payslips
// ═══════════════════════════════════════════════════════════════
const getMyPayslips = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;
    const { year } = req.query;

    const baseQuery = firmId ? { firmId } : { lawyerId };

    const employee = await Employee.findOne({
        ...baseQuery,
        $or: [
            { userId: userId },
            { 'personalInfo.email': req.user?.email }
        ]
    }).select('_id').lean();

    if (!employee) {
        throw CustomException('Employee record not found', 404);
    }

    // Build payroll query
    const payrollQuery = {
        ...baseQuery,
        status: 'completed'
    };

    if (year) {
        const startOfYear = new Date(parseInt(year), 0, 1);
        const endOfYear = new Date(parseInt(year), 11, 31);
        payrollQuery.payrollPeriod = { $gte: startOfYear, $lte: endOfYear };
    }

    const payrollRuns = await PayrollRun?.find(payrollQuery)
        .sort({ payrollPeriod: -1 })
        .lean() || [];

    // Extract employee's payslip data from each run
    const payslips = payrollRuns.map(run => {
        const empData = run.employees?.find(e =>
            e.employeeId?.toString() === employee._id.toString()
        );

        if (!empData) return null;

        return {
            payrollRunId: run._id,
            period: run.payrollPeriod,
            periodFormatted: new Date(run.payrollPeriod).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            periodFormattedAr: new Date(run.payrollPeriod).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' }),
            processedDate: run.processedDate,
            basicSalary: empData.basicSalary,
            grossSalary: empData.grossSalary,
            totalDeductions: empData.totalDeductions,
            netSalary: empData.netSalary,
            // Don't expose full breakdown for security
            hasPayslipPdf: !!empData.payslipUrl
        };
    }).filter(Boolean);

    return res.json({
        success: true,
        data: payslips
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MY PENDING APPROVALS (As Approver)
// GET /api/hr/self-service/approvals/pending
// ═══════════════════════════════════════════════════════════════
const getMyPendingApprovals = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;
    const lawyerId = req.isSoloLawyer ? userId : null;
    const { type, page = 1, limit = 10 } = req.query;

    const baseQuery = firmId ? { firmId } : { lawyerId };

    // Gather pending items where user is approver
    const results = [];

    // Leave requests pending approval
    if (!type || type === 'leave') {
        const pendingLeaves = await LeaveRequest.find({
            ...baseQuery,
            status: { $in: ['submitted', 'pending'] }
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        pendingLeaves.forEach(req => {
            results.push({
                type: 'leave_request',
                typeAr: 'طلب إجازة',
                _id: req._id,
                requestNumber: req.requestNumber,
                employeeName: req.employeeName,
                employeeNameAr: req.employeeNameAr,
                department: req.department,
                summary: `${req.leaveType} - ${req.dates?.workingDays || 0} days`,
                summaryAr: `${getLeaveTypeNameAr(req.leaveType)} - ${req.dates?.workingDays || 0} يوم`,
                requestDate: req.createdAt,
                urgency: 'normal'
            });
        });
    }

    // Loan requests pending approval
    if (!type || type === 'loan') {
        const pendingLoans = await EmployeeLoan?.find({
            ...baseQuery,
            status: 'pending'
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean() || [];

        pendingLoans.forEach(loan => {
            results.push({
                type: 'loan_request',
                typeAr: 'طلب قرض',
                _id: loan._id,
                requestNumber: loan.loanNumber,
                employeeName: loan.employeeName,
                employeeNameAr: loan.employeeNameAr,
                department: loan.department,
                summary: `${loan.loanType} - ${loan.loanAmount?.toLocaleString()} SAR`,
                summaryAr: `${getLoanTypeNameAr(loan.loanType)} - ${loan.loanAmount?.toLocaleString()} ريال`,
                requestDate: loan.requestDate,
                urgency: loan.isEmergency ? 'urgent' : 'normal'
            });
        });
    }

    // Advance requests pending approval
    if (!type || type === 'advance') {
        const pendingAdvances = await EmployeeAdvance?.find({
            ...baseQuery,
            status: 'pending'
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean() || [];

        pendingAdvances.forEach(adv => {
            results.push({
                type: 'advance_request',
                typeAr: 'طلب سلفة',
                _id: adv._id,
                requestNumber: adv.advanceNumber,
                employeeName: adv.employeeName,
                employeeNameAr: adv.employeeNameAr,
                department: adv.department,
                summary: `${adv.advanceType} - ${adv.advanceAmount?.toLocaleString()} SAR`,
                summaryAr: `${getAdvanceTypeNameAr(adv.advanceType)} - ${adv.advanceAmount?.toLocaleString()} ريال`,
                requestDate: adv.requestDate,
                urgency: adv.isEmergency ? 'urgent' : 'normal'
            });
        });
    }

    // Sort by date and paginate
    results.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    const paginatedResults = results.slice((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit));

    return res.json({
        success: true,
        data: paginatedResults,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: results.length,
            pages: Math.ceil(results.length / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

async function countPendingApprovals(baseQuery, userId) {
    let count = 0;

    // Count pending leave requests
    count += await LeaveRequest.countDocuments({
        ...baseQuery,
        status: { $in: ['submitted', 'pending'] }
    });

    // Count pending loans
    if (EmployeeLoan) {
        count += await EmployeeLoan.countDocuments({
            ...baseQuery,
            status: 'pending'
        });
    }

    // Count pending advances
    if (EmployeeAdvance) {
        count += await EmployeeAdvance.countDocuments({
            ...baseQuery,
            status: 'pending'
        });
    }

    return count;
}

function getLeaveTypeName(type) {
    const names = {
        ANNUAL: 'Annual Leave',
        SICK: 'Sick Leave',
        MATERNITY: 'Maternity Leave',
        PATERNITY: 'Paternity Leave',
        HAJJ: 'Hajj Leave',
        IDDAH: 'Iddah Leave',
        MARRIAGE: 'Marriage Leave',
        DEATH: 'Death Leave',
        BIRTH: 'Birth Leave',
        EXAM: 'Exam Leave',
        UNPAID: 'Unpaid Leave'
    };
    return names[type?.toUpperCase()] || type;
}

function getLeaveTypeNameAr(type) {
    const names = {
        ANNUAL: 'إجازة سنوية',
        SICK: 'إجازة مرضية',
        MATERNITY: 'إجازة وضع',
        PATERNITY: 'إجازة أبوة',
        HAJJ: 'إجازة حج',
        IDDAH: 'إجازة عدة',
        MARRIAGE: 'إجازة زواج',
        DEATH: 'إجازة وفاة',
        BIRTH: 'إجازة ولادة',
        EXAM: 'إجازة امتحان',
        UNPAID: 'إجازة بدون راتب'
    };
    return names[type?.toUpperCase()] || type;
}

function getLoanTypeName(type) {
    const names = {
        personal: 'Personal Loan',
        housing: 'Housing Loan',
        vehicle: 'Vehicle Loan',
        education: 'Education Loan',
        emergency: 'Emergency Loan',
        marriage: 'Marriage Loan',
        medical: 'Medical Loan',
        hajj: 'Hajj Loan',
        furniture: 'Furniture Loan',
        computer: 'Computer Loan',
        travel: 'Travel Loan'
    };
    return names[type] || type;
}

function getLoanTypeNameAr(type) {
    const names = {
        personal: 'قرض شخصي',
        housing: 'قرض سكن',
        vehicle: 'قرض سيارة',
        education: 'قرض تعليم',
        emergency: 'قرض طوارئ',
        marriage: 'قرض زواج',
        medical: 'قرض طبي',
        hajj: 'قرض حج',
        furniture: 'قرض أثاث',
        computer: 'قرض حاسوب',
        travel: 'قرض سفر'
    };
    return names[type] || type;
}

function getAdvanceTypeName(type) {
    const names = {
        salary: 'Salary Advance',
        emergency: 'Emergency Advance',
        travel: 'Travel Advance',
        relocation: 'Relocation Advance',
        medical: 'Medical Advance',
        education: 'Education Advance',
        housing: 'Housing Advance',
        end_of_year: 'End of Year Advance'
    };
    return names[type] || type;
}

function getAdvanceTypeNameAr(type) {
    const names = {
        salary: 'سلفة راتب',
        emergency: 'سلفة طوارئ',
        travel: 'سلفة سفر',
        relocation: 'سلفة انتقال',
        medical: 'سلفة طبية',
        education: 'سلفة تعليم',
        housing: 'سلفة سكن',
        end_of_year: 'سلفة نهاية السنة'
    };
    return names[type] || type;
}

function getStatusAr(status) {
    const statuses = {
        pending: 'قيد الانتظار',
        submitted: 'مقدم',
        approved: 'موافق عليه',
        rejected: 'مرفوض',
        cancelled: 'ملغى',
        completed: 'مكتمل',
        disbursed: 'صُرف',
        recovering: 'يتم الاسترداد',
        draft: 'مسودة'
    };
    return statuses[status] || status;
}

module.exports = {
    getMyDashboard,
    getMyProfile,
    updateMyProfile,
    getMyLeaveBalances,
    getMyLeaveRequests,
    submitLeaveRequest,
    cancelMyLeaveRequest,
    getMyLoans,
    getMyAdvances,
    getMyPayslips,
    getMyPendingApprovals
};
