const { Offboarding, Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ═══════════════════════════════════════════════════════════════
// DEFAULT CLEARANCE TASKS
// ═══════════════════════════════════════════════════════════════

const getDefaultITTasks = () => [
    { taskId: 'IT-001', task: 'email_deactivation', taskName: 'Deactivate Email', taskNameAr: 'تعطيل البريد الإلكتروني' },
    { taskId: 'IT-002', task: 'system_access_revoked', taskName: 'Revoke System Access', taskNameAr: 'إلغاء صلاحيات النظام' },
    { taskId: 'IT-003', task: 'vpn_disabled', taskName: 'Disable VPN Access', taskNameAr: 'تعطيل VPN' },
    { taskId: 'IT-004', task: 'data_backup', taskName: 'Backup Employee Data', taskNameAr: 'نسخ البيانات احتياطياً' },
    { taskId: 'IT-005', task: 'laptop_returned', taskName: 'Collect Laptop/Equipment', taskNameAr: 'استلام الحاسب المحمول' }
];

const getDefaultFinanceTasks = () => [
    { taskId: 'FIN-001', task: 'loans_cleared', taskName: 'Clear Outstanding Loans', taskNameAr: 'تسوية القروض' },
    { taskId: 'FIN-002', task: 'advances_cleared', taskName: 'Clear Salary Advances', taskNameAr: 'تسوية السلف' },
    { taskId: 'FIN-003', task: 'expense_claims_settled', taskName: 'Settle Expense Claims', taskNameAr: 'تسوية مطالبات المصروفات' },
    { taskId: 'FIN-004', task: 'credit_card_returned', taskName: 'Return Credit Card', taskNameAr: 'استلام بطاقة الائتمان' },
    { taskId: 'FIN-005', task: 'final_settlement_calculated', taskName: 'Calculate Final Settlement', taskNameAr: 'حساب التسوية النهائية' }
];

const getDefaultHRTasks = () => [
    { taskId: 'HR-001', task: 'exit_interview_completed', taskName: 'Conduct Exit Interview', taskNameAr: 'إجراء مقابلة الخروج' },
    { taskId: 'HR-002', task: 'documents_collected', taskName: 'Collect Documents', taskNameAr: 'جمع المستندات' },
    { taskId: 'HR-003', task: 'final_settlement_approved', taskName: 'Approve Final Settlement', taskNameAr: 'اعتماد التسوية النهائية' },
    { taskId: 'HR-004', task: 'experience_certificate_prepared', taskName: 'Prepare Experience Certificate', taskNameAr: 'إعداد شهادة الخبرة' },
    { taskId: 'HR-005', task: 'clearance_form_signed', taskName: 'Sign Clearance Form', taskNameAr: 'توقيع نموذج الإخلاء' }
];

const getDefaultDeptTasks = () => [
    { taskId: 'DEPT-001', task: 'handover_completed', taskName: 'Complete Handover', taskNameAr: 'إتمام التسليم' },
    { taskId: 'DEPT-002', task: 'knowledge_transferred', taskName: 'Transfer Knowledge', taskNameAr: 'نقل المعرفة' },
    { taskId: 'DEPT-003', task: 'department_property_returned', taskName: 'Return Department Property', taskNameAr: 'استلام ممتلكات القسم' }
];

const getDefaultMgrTasks = () => [
    { taskId: 'MGR-001', task: 'handover_approved', taskName: 'Approve Handover', taskNameAr: 'الموافقة على التسليم' },
    { taskId: 'MGR-002', task: 'final_feedback_provided', taskName: 'Provide Final Feedback', taskNameAr: 'تقديم التقييم النهائي' },
    { taskId: 'MGR-003', task: 'no_objection_certificate', taskName: 'Issue NOC', taskNameAr: 'شهادة عدم ممانعة' }
];

// ═══════════════════════════════════════════════════════════════
// GET ALL OFFBOARDINGS
// GET /api/hr/offboarding
// ═══════════════════════════════════════════════════════════════
const getOffboardings = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const {
        status,
        exitType,
        department,
        exitDateFrom,
        exitDateTo,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
    } = req.query;

    // Build query
    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (status) query.status = status;
    if (exitType) query.exitType = exitType;
    if (department) query.department = department;

    if (exitDateFrom || exitDateTo) {
        query['dates.exitEffectiveDate'] = {};
        if (exitDateFrom) query['dates.exitEffectiveDate'].$gte = new Date(exitDateFrom);
        if (exitDateTo) query['dates.exitEffectiveDate'].$lte = new Date(exitDateTo);
    }

    if (search) {
        query.$or = [
            { employeeName: { $regex: escapeRegex(search), $options: 'i' } },
            { employeeNameAr: { $regex: escapeRegex(search), $options: 'i' } },
            { offboardingId: { $regex: escapeRegex(search), $options: 'i' } },
            { offboardingNumber: { $regex: escapeRegex(search), $options: 'i' } },
            { employeeNumber: { $regex: escapeRegex(search), $options: 'i' } },
            { nationalId: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    // Build sort
    const sortField = sortBy === 'lastWorkingDay' ? 'dates.lastWorkingDay' :
        sortBy === 'employeeName' ? 'employeeName' :
            sortBy === 'status' ? 'status' :
                sortBy === 'exitType' ? 'exitType' : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1 };

    const [offboardings, total] = await Promise.all([
        Offboarding.find(query)
            .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish employment')
            .populate('managerId', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName')
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .lean(),
        Offboarding.countDocuments(query)
    ]);

    return res.json({
        success: true,
        data: offboardings,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET OFFBOARDING STATS
// GET /api/hr/offboarding/stats
// ═══════════════════════════════════════════════════════════════
const getOffboardingStats = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const stats = await Offboarding.getStats(firmId, lawyerId);

    return res.json({
        success: true,
        ...stats
    });
});

// ═══════════════════════════════════════════════════════════════
// GET SINGLE OFFBOARDING
// GET /api/hr/offboarding/:offboardingId
// ═══════════════════════════════════════════════════════════════
const getOffboarding = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    const offboarding = await Offboarding.findById(offboardingId)
        .populate('employeeId', 'employeeId personalInfo employment compensation gosi')
        .populate('managerId', 'firstName lastName email')
        .populate('createdBy', 'firstName lastName')
        .populate('lastModifiedBy', 'firstName lastName');

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    return res.json({
        success: true,
        data: offboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// CREATE OFFBOARDING
// POST /api/hr/offboarding
// ═══════════════════════════════════════════════════════════════
const createOffboarding = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'employeeId', 'employeeNumber', 'employeeName', 'employeeNameAr',
        'nationalId', 'department', 'jobTitle', 'jobTitleAr',
        'managerId', 'managerName', 'exitType', 'noticeDate',
        'lastWorkingDay', 'exitEffectiveDate', 'noticePeriodDays', 'notes'
    ];
    const filteredData = pickAllowedFields(req.body, allowedFields);

    const {
        employeeId,
        employeeNumber,
        employeeName,
        employeeNameAr,
        nationalId,
        department,
        jobTitle,
        jobTitleAr,
        managerId,
        managerName,
        exitType,
        noticeDate,
        lastWorkingDay,
        exitEffectiveDate,
        noticePeriodDays = 30,
        notes
    } = filteredData;

    // Input validation
    if (!employeeId) {
        throw CustomException('Employee ID is required', 400);
    }
    if (!employeeName) {
        throw CustomException('Employee name is required', 400);
    }
    if (!exitType) {
        throw CustomException('Exit type is required', 400);
    }
    if (!lastWorkingDay) {
        throw CustomException('Last working day is required', 400);
    }

    // Validate exit type
    const validExitTypes = ['resignation', 'termination', 'contract_end', 'retirement', 'death', 'mutual_agreement'];
    if (!validExitTypes.includes(exitType)) {
        throw CustomException(`Invalid exit type. Must be one of: ${validExitTypes.join(', ')}`, 400);
    }

    // Validate and sanitize IDs
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    // Validate dates
    const lastWorkDate = new Date(lastWorkingDay);
    if (isNaN(lastWorkDate.getTime())) {
        throw CustomException('Invalid last working day date', 400);
    }

    // Validate notice period days
    if (noticePeriodDays && (isNaN(noticePeriodDays) || noticePeriodDays < 0 || noticePeriodDays > 365)) {
        throw CustomException('Notice period days must be between 0 and 365', 400);
    }

    // Fetch employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // Check access to employee
    const hasEmployeeAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasEmployeeAccess) {
        throw CustomException('Access denied to this employee', 403);
    }

    // Check if offboarding already exists for this employee
    const existingOffboarding = await Offboarding.findOne({
        employeeId,
        status: { $nin: ['completed', 'cancelled'] },
        $or: [{ firmId }, { lawyerId }]
    });

    if (existingOffboarding) {
        throw CustomException('An active offboarding already exists for this employee', 400);
    }

    // Calculate service duration
    const hireDate = employee.employment?.hireDate || new Date();
    const exitDate = new Date(lastWorkingDay);
    const totalDays = Math.floor((exitDate - new Date(hireDate)) / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const remainingDays = totalDays % 365;
    const months = Math.floor(remainingDays / 30);
    const days = remainingDays % 30;

    // Set exit effective date
    const effectiveDate = exitEffectiveDate
        ? new Date(exitEffectiveDate)
        : new Date(new Date(lastWorkingDay).getTime() + 24 * 60 * 60 * 1000);

    // Prepare offboarding data
    const offboardingData = {
        employeeId,
        employeeNumber: employeeNumber || employee.employeeId,
        employeeName,
        employeeNameAr: employeeNameAr || employee.personalInfo?.fullNameArabic,
        nationalId,
        email: employee.personalInfo?.email,
        phone: employee.personalInfo?.mobile,

        department: department || employee.organization?.departmentName || employee.employment?.departmentName,
        jobTitle,
        jobTitleAr: jobTitleAr || employee.employment?.jobTitleArabic,

        employmentType: employee.employment?.employmentType || 'full_time',
        contractType: employee.employment?.contractType || 'indefinite',
        hireDate: employee.employment?.hireDate,

        managerId: managerId || employee.employment?.reportsTo,
        managerName,

        exitType,

        dates: {
            noticeDate: noticeDate ? new Date(noticeDate) : new Date(),
            lastWorkingDay: new Date(lastWorkingDay),
            exitEffectiveDate: effectiveDate
        },

        noticePeriod: {
            requiredDays: noticePeriodDays,
            noticeDaysServed: 0,
            buyoutApplied: false
        },

        serviceDuration: {
            years,
            months,
            days,
            totalMonths: years * 12 + months,
            totalDays
        },

        status: 'initiated',

        // Initialize exit interview (not required for death)
        exitInterview: {
            required: exitType !== 'death',
            scheduled: false,
            conducted: false,
            completed: false
        },

        // Initialize clearance
        clearance: {
            required: true,
            itemsToReturn: [],
            allItemsReturned: false,
            itClearance: {
                required: true,
                tasks: getDefaultITTasks(),
                cleared: false
            },
            financeClearance: {
                required: true,
                tasks: getDefaultFinanceTasks(),
                cleared: false
            },
            hrClearance: {
                required: true,
                tasks: getDefaultHRTasks(),
                cleared: false
            },
            departmentClearance: {
                required: true,
                tasks: getDefaultDeptTasks(),
                cleared: false
            },
            managerClearance: {
                required: true,
                tasks: getDefaultMgrTasks(),
                cleared: false
            },
            allClearancesObtained: false
        },

        // Initialize final documents
        finalDocuments: {
            experienceCertificate: {
                required: true,
                requested: false,
                prepared: false,
                issued: false
            },
            gosiClearance: {
                required: true,
                finalMonthSubmitted: false
            }
        },

        // Initialize completion
        completion: {
            exitInterviewCompleted: false,
            clearanceCompleted: false,
            knowledgeTransferCompleted: false,
            finalSettlementCompleted: false,
            documentsIssued: false,
            allTasksCompleted: false,
            offboardingCompleted: false
        },

        // Initialize timeline
        timeline: [{
            eventId: `EVT-${Date.now()}`,
            eventType: exitType === 'resignation' ? 'resignation_submitted' : 'termination_issued',
            eventDate: new Date(),
            description: `Offboarding initiated - ${exitType}`,
            descriptionAr: `بدء إنهاء الخدمة - ${exitType}`,
            performedBy: lawyerId,
            status: 'completed'
        }],

        notes: notes || {},

        firmId: firmId || null,
        lawyerId: firmId ? null : lawyerId,
        createdBy: lawyerId
    };

    const offboarding = await Offboarding.create(offboardingData);

    // Populate and return
    await offboarding.populate([
        { path: 'employeeId', select: 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish' },
        { path: 'managerId', select: 'firstName lastName email' },
        { path: 'createdBy', select: 'firstName lastName' }
    ]);

    return res.status(201).json({
        success: true,
        message: 'Offboarding created successfully',
        data: offboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE OFFBOARDING
// PATCH /api/hr/offboarding/:offboardingId
// ═══════════════════════════════════════════════════════════════
const updateOffboarding = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Prevent updates if completed
    if (offboarding.status === 'completed') {
        throw CustomException('Cannot update completed offboarding', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedUpdates = [
        'employeeName', 'employeeNameAr', 'department', 'jobTitle', 'jobTitleAr',
        'managerId', 'managerName', 'exitType', 'dates', 'noticePeriod',
        'resignation', 'termination', 'contractEnd', 'retirement', 'death', 'mutualAgreement',
        'knowledgeTransfer', 'notes', 'rehireEligibility'
    ];
    const filteredData = pickAllowedFields(req.body, allowedUpdates);

    // Input validation for exitType if provided
    if (filteredData.exitType) {
        const validExitTypes = ['resignation', 'termination', 'contract_end', 'retirement', 'death', 'mutual_agreement'];
        if (!validExitTypes.includes(filteredData.exitType)) {
            throw CustomException(`Invalid exit type. Must be one of: ${validExitTypes.join(', ')}`, 400);
        }
    }

    // Validate dates if provided
    if (filteredData.dates) {
        if (filteredData.dates.lastWorkingDay) {
            const lastWorkDate = new Date(filteredData.dates.lastWorkingDay);
            if (isNaN(lastWorkDate.getTime())) {
                throw CustomException('Invalid last working day date', 400);
            }
        }
        if (filteredData.dates.exitEffectiveDate) {
            const exitDate = new Date(filteredData.dates.exitEffectiveDate);
            if (isNaN(exitDate.getTime())) {
                throw CustomException('Invalid exit effective date', 400);
            }
        }
    }

    // Validate managerId if provided
    if (filteredData.managerId) {
        const sanitizedManagerId = sanitizeObjectId(filteredData.managerId);
        if (!sanitizedManagerId) {
            throw CustomException('Invalid manager ID format', 400);
        }
    }

    // Apply updates
    allowedUpdates.forEach(field => {
        if (filteredData[field] !== undefined) {
            if (typeof filteredData[field] === 'object' && !Array.isArray(filteredData[field])) {
                offboarding[field] = { ...offboarding[field]?.toObject?.() || offboarding[field] || {}, ...filteredData[field] };
            } else {
                offboarding[field] = filteredData[field];
            }
        }
    });

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: 'Offboarding updated successfully',
        data: offboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// DELETE OFFBOARDING
// DELETE /api/hr/offboarding/:offboardingId
// ═══════════════════════════════════════════════════════════════
const deleteOffboarding = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Only allow deletion if initiated or cancelled
    if (!['initiated', 'cancelled'].includes(offboarding.status)) {
        throw CustomException('Only initiated or cancelled offboardings can be deleted', 400);
    }

    await Offboarding.findOneAndDelete({ _id: offboardingId, ...hasAccess ? (firmId ? { firmId } : { lawyerId }) : {} });

    return res.json({
        success: true,
        message: 'Offboarding deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE STATUS
// PATCH /api/hr/offboarding/:offboardingId/status
// ═══════════════════════════════════════════════════════════════
const updateStatus = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = ['status'];
    const filteredData = pickAllowedFields(req.body, allowedFields);
    const { status } = filteredData;

    // Input validation
    if (!status) {
        throw CustomException('Status is required', 400);
    }

    const validStatuses = ['initiated', 'in_progress', 'clearance_pending', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
        throw CustomException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Validate status transitions
    const validTransitions = {
        'initiated': ['in_progress', 'cancelled'],
        'in_progress': ['clearance_pending', 'cancelled'],
        'clearance_pending': ['completed', 'in_progress'],
        'completed': [],
        'cancelled': ['initiated']
    };

    if (!validTransitions[offboarding.status]?.includes(status)) {
        throw CustomException(`Invalid status transition from ${offboarding.status} to ${status}`, 400);
    }

    const previousStatus = offboarding.status;
    offboarding.status = status;
    offboarding.lastModifiedBy = lawyerId;

    // Add timeline event
    offboarding.timeline.push({
        eventId: `EVT-${Date.now()}`,
        eventType: 'status_changed',
        eventDate: new Date(),
        description: `Status changed from ${previousStatus} to ${status}`,
        performedBy: lawyerId,
        status: 'completed'
    });

    await offboarding.save();

    return res.json({
        success: true,
        message: `Offboarding status updated to ${status}`,
        data: offboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE EXIT INTERVIEW
// POST /api/hr/offboarding/:offboardingId/exit-interview
// ═══════════════════════════════════════════════════════════════
const completeExitInterview = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'scheduled', 'scheduledDate', 'conducted', 'conductedDate',
        'interviewedBy', 'interviewerRole', 'interviewMethod',
        'responses', 'interviewerNotes', 'keyInsights', 'actionItems', 'completed'
    ];
    const filteredData = pickAllowedFields(req.body, allowedFields);

    const {
        scheduled,
        scheduledDate,
        conducted,
        conductedDate,
        interviewedBy,
        interviewerRole,
        interviewMethod,
        responses,
        interviewerNotes,
        keyInsights,
        actionItems,
        completed
    } = filteredData;

    // Input validation
    if (scheduledDate) {
        const schedDate = new Date(scheduledDate);
        if (isNaN(schedDate.getTime())) {
            throw CustomException('Invalid scheduled date', 400);
        }
    }
    if (conductedDate) {
        const condDate = new Date(conductedDate);
        if (isNaN(condDate.getTime())) {
            throw CustomException('Invalid conducted date', 400);
        }
    }
    if (interviewMethod) {
        const validMethods = ['in_person', 'video', 'phone', 'written'];
        if (!validMethods.includes(interviewMethod)) {
            throw CustomException(`Invalid interview method. Must be one of: ${validMethods.join(', ')}`, 400);
        }
    }
    if (interviewedBy) {
        const sanitizedInterviewerId = sanitizeObjectId(interviewedBy);
        if (!sanitizedInterviewerId) {
            throw CustomException('Invalid interviewer ID format', 400);
        }
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Update exit interview
    offboarding.exitInterview = {
        ...offboarding.exitInterview?.toObject?.() || offboarding.exitInterview || {},
        scheduled: scheduled ?? offboarding.exitInterview?.scheduled,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : offboarding.exitInterview?.scheduledDate,
        conducted: conducted ?? offboarding.exitInterview?.conducted,
        conductedDate: conducted ? (conductedDate ? new Date(conductedDate) : new Date()) : offboarding.exitInterview?.conductedDate,
        interviewedBy: interviewedBy || lawyerId,
        interviewerRole,
        interviewMethod,
        responses: responses || offboarding.exitInterview?.responses,
        interviewerNotes,
        keyInsights: keyInsights || [],
        actionItems: actionItems || [],
        completed: completed ?? false,
        completionDate: completed ? new Date() : null
    };

    // Update completion tracking
    offboarding.completion.exitInterviewCompleted = completed ?? false;

    // Add timeline event
    if (completed) {
        offboarding.timeline.push({
            eventId: `EVT-${Date.now()}`,
            eventType: 'exit_interview',
            eventDate: new Date(),
            description: 'Exit interview completed',
            descriptionAr: 'تم إجراء مقابلة الخروج',
            performedBy: lawyerId,
            status: 'completed'
        });
    }

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: completed ? 'Exit interview completed successfully' : 'Exit interview updated',
        data: offboarding.exitInterview
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE CLEARANCE ITEM
// PATCH /api/hr/offboarding/:offboardingId/clearance/items/:itemId
// ═══════════════════════════════════════════════════════════════
const updateClearanceItem = asyncHandler(async (req, res) => {
    const { offboardingId, itemId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize IDs
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'returned', 'returnedDate', 'returnedTo', 'condition',
        'damageNotes', 'damageCharge', 'notReturnedReason', 'replacementCost'
    ];
    const filteredData = pickAllowedFields(req.body, allowedFields);

    const {
        returned,
        returnedDate,
        returnedTo,
        condition,
        damageNotes,
        damageCharge,
        notReturnedReason,
        replacementCost
    } = filteredData;

    // Input validation
    if (returnedDate) {
        const retDate = new Date(returnedDate);
        if (isNaN(retDate.getTime())) {
            throw CustomException('Invalid returned date', 400);
        }
    }
    if (condition) {
        const validConditions = ['good', 'fair', 'damaged', 'lost'];
        if (!validConditions.includes(condition)) {
            throw CustomException(`Invalid condition. Must be one of: ${validConditions.join(', ')}`, 400);
        }
    }
    if (damageCharge !== undefined) {
        if (isNaN(damageCharge) || damageCharge < 0) {
            throw CustomException('Damage charge must be a non-negative number', 400);
        }
    }
    if (replacementCost !== undefined) {
        if (isNaN(replacementCost) || replacementCost < 0) {
            throw CustomException('Replacement cost must be a non-negative number', 400);
        }
    }
    if (returnedTo) {
        const sanitizedReturnedToId = sanitizeObjectId(returnedTo);
        if (!sanitizedReturnedToId) {
            throw CustomException('Invalid returnedTo ID format', 400);
        }
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Find item
    const itemIndex = offboarding.clearance.itemsToReturn.findIndex(
        i => i.itemId === itemId || i._id?.toString() === itemId
    );

    if (itemIndex === -1) {
        throw CustomException('Clearance item not found', 404);
    }

    // Update item
    const item = offboarding.clearance.itemsToReturn[itemIndex];
    if (returned !== undefined) item.returned = returned;
    if (returnedDate) item.returnedDate = new Date(returnedDate);
    if (returnedTo) item.returnedTo = returnedTo;
    if (condition) item.condition = condition;
    if (damageNotes) item.damageNotes = damageNotes;
    if (damageCharge !== undefined) item.damageCharge = damageCharge;
    if (notReturnedReason) item.notReturnedReason = notReturnedReason;
    if (replacementCost !== undefined) item.replacementCost = replacementCost;

    // Check if all items returned
    offboarding.clearance.allItemsReturned = offboarding.clearance.itemsToReturn.every(i => i.returned);

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: 'Clearance item updated successfully',
        data: item
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE CLEARANCE SECTION
// POST /api/hr/offboarding/:offboardingId/clearance/:section/complete
// ═══════════════════════════════════════════════════════════════
const completeClearanceSection = asyncHandler(async (req, res) => {
    const { offboardingId, section } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = ['clearedBy', 'notes'];
    const filteredData = pickAllowedFields(req.body, allowedFields);
    const { clearedBy, notes } = filteredData;

    // Validate clearedBy if provided
    if (clearedBy) {
        const sanitizedClearedById = sanitizeObjectId(clearedBy);
        if (!sanitizedClearedById) {
            throw CustomException('Invalid clearedBy ID format', 400);
        }
    }

    const sectionMap = {
        'it': 'itClearance',
        'finance': 'financeClearance',
        'hr': 'hrClearance',
        'department': 'departmentClearance',
        'manager': 'managerClearance'
    };

    if (!sectionMap[section]) {
        throw CustomException('Invalid clearance section. Must be: it, finance, hr, department, or manager', 400);
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const sectionKey = sectionMap[section];

    // Mark all tasks as completed
    if (offboarding.clearance[sectionKey].tasks) {
        offboarding.clearance[sectionKey].tasks.forEach(task => {
            task.completed = true;
            task.completedDate = new Date();
            task.completedBy = clearedBy || lawyerId;
        });
    }

    // Mark section as cleared
    offboarding.clearance[sectionKey].cleared = true;
    offboarding.clearance[sectionKey].clearedBy = clearedBy || lawyerId;
    offboarding.clearance[sectionKey].clearanceDate = new Date();
    if (notes) offboarding.clearance[sectionKey].notes = notes;

    // Check if all clearances obtained
    offboarding.clearance.allClearancesObtained =
        offboarding.clearance.itClearance?.cleared &&
        offboarding.clearance.financeClearance?.cleared &&
        offboarding.clearance.hrClearance?.cleared &&
        offboarding.clearance.departmentClearance?.cleared &&
        offboarding.clearance.managerClearance?.cleared;

    if (offboarding.clearance.allClearancesObtained) {
        offboarding.clearance.finalClearanceDate = new Date();
        offboarding.completion.clearanceCompleted = true;

        // Add timeline event
        offboarding.timeline.push({
            eventId: `EVT-${Date.now()}`,
            eventType: 'clearance_completed',
            eventDate: new Date(),
            description: 'All clearances obtained',
            descriptionAr: 'تم الحصول على جميع الموافقات',
            performedBy: lawyerId,
            status: 'completed'
        });
    } else {
        // Add timeline event for section clearance
        offboarding.timeline.push({
            eventId: `EVT-${Date.now()}`,
            eventType: 'section_cleared',
            eventDate: new Date(),
            description: `${section.toUpperCase()} clearance completed`,
            performedBy: lawyerId,
            status: 'completed'
        });
    }

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: `${section.toUpperCase()} clearance completed`,
        data: {
            section: sectionKey,
            cleared: true,
            allClearancesObtained: offboarding.clearance.allClearancesObtained
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// CALCULATE SETTLEMENT
// POST /api/hr/offboarding/:offboardingId/calculate-settlement
// ═══════════════════════════════════════════════════════════════
const calculateSettlement = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    const offboarding = await Offboarding.findById(offboardingId)
        .populate('employeeId');

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const employee = offboarding.employeeId;
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    // IDOR Protection - Verify employee belongs to same firm/lawyer
    const hasEmployeeAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasEmployeeAccess) {
        throw CustomException('Access denied to employee data', 403);
    }

    // Get salary info
    const basicSalary = employee.compensation?.basicSalary || 0;
    const grossSalary = employee.grossSalary || basicSalary;
    const dailyWage = basicSalary / 30;

    // Service duration
    const years = offboarding.serviceDuration.years || 0;
    const months = offboarding.serviceDuration.months || 0;
    const totalMonths = offboarding.serviceDuration.totalMonths || 0;

    // ========== EARNINGS ==========

    // Outstanding salary (prorated for partial month)
    const lastWorkingDay = new Date(offboarding.dates.lastWorkingDay);
    const dayOfMonth = lastWorkingDay.getDate();
    const unpaidDays = 30 - dayOfMonth;
    const outstandingSalary = {
        applicable: unpaidDays > 0,
        workingDaysInLastMonth: dayOfMonth,
        paidDaysInLastMonth: dayOfMonth,
        unpaidDays: 0, // Already paid up to last working day
        amount: 0
    };

    // Unused annual leave (Article 109)
    const totalEntitlement = years >= 5 ? 30 : 21;
    const daysUsed = employee.leave?.annualLeaveTaken || 0;
    const carriedForward = employee.leave?.carriedForward || 0;
    const totalUnusedDays = Math.max(0, (totalEntitlement + carriedForward) - daysUsed);
    const unusedAnnualLeave = {
        applicable: totalUnusedDays > 0,
        totalEntitlement,
        daysUsed,
        daysRemaining: totalEntitlement - daysUsed,
        carriedForwardDays: carriedForward,
        totalUnusedDays,
        dailyRate: dailyWage,
        amount: totalUnusedDays * dailyWage
    };

    // EOSB calculation (Articles 84-87)
    const eosb = offboarding.calculateEOSB(basicSalary);

    const totalEarnings = outstandingSalary.amount + unusedAnnualLeave.amount + eosb.finalEOSB;

    // ========== DEDUCTIONS ==========

    // Notice period shortfall
    let noticeShortfall = { applicable: false, deductionAmount: 0 };
    if (offboarding.noticePeriod.noticeDaysServed < offboarding.noticePeriod.requiredDays) {
        const shortfallDays = offboarding.noticePeriod.requiredDays - offboarding.noticePeriod.noticeDaysServed;
        noticeShortfall = {
            applicable: true,
            requiredNoticeDays: offboarding.noticePeriod.requiredDays,
            servedNoticeDays: offboarding.noticePeriod.noticeDaysServed,
            shortfallDays,
            dailyWage,
            deductionAmount: shortfallDays * dailyWage
        };
    }

    // Unreturned property
    const unreturnedItems = offboarding.clearance.itemsToReturn?.filter(i => !i.returned) || [];
    const unreturnedDeduction = unreturnedItems.reduce((sum, item) => sum + (item.replacementCost || 0), 0);

    const totalDeductions = noticeShortfall.deductionAmount + unreturnedDeduction;

    // ========== NET SETTLEMENT ==========
    const netPayable = totalEarnings - totalDeductions;

    // Validate settlement amounts
    if (isNaN(totalEarnings) || totalEarnings < 0) {
        throw CustomException('Invalid total earnings calculation', 400);
    }
    if (isNaN(totalDeductions) || totalDeductions < 0) {
        throw CustomException('Invalid total deductions calculation', 400);
    }
    if (isNaN(netPayable)) {
        throw CustomException('Invalid net payable calculation', 400);
    }

    // Validate individual amounts
    if (isNaN(outstandingSalary.amount) || outstandingSalary.amount < 0) {
        throw CustomException('Invalid outstanding salary amount', 400);
    }
    if (isNaN(unusedAnnualLeave.amount) || unusedAnnualLeave.amount < 0) {
        throw CustomException('Invalid unused annual leave amount', 400);
    }
    if (isNaN(eosb.finalEOSB) || eosb.finalEOSB < 0) {
        throw CustomException('Invalid EOSB amount', 400);
    }
    if (isNaN(basicSalary) || basicSalary < 0) {
        throw CustomException('Invalid basic salary', 400);
    }

    // Ensure reasonable limits (e.g., settlement should not exceed 10 years of salary)
    const maxReasonableSettlement = basicSalary * 12 * 10; // 10 years worth
    if (netPayable > maxReasonableSettlement) {
        throw CustomException('Settlement amount exceeds reasonable limits. Please review calculations.', 400);
    }

    // Update offboarding
    offboarding.finalSettlement = {
        calculated: true,
        calculationDate: new Date(),
        calculatedBy: lawyerId,

        calculationBase: {
            lastBasicSalary: basicSalary,
            lastGrossSalary: grossSalary,
            dailyWage,
            serviceYears: years,
            serviceMonths: months,
            serviceDays: offboarding.serviceDuration.days || 0,
            totalServiceMonths: totalMonths
        },

        earnings: {
            outstandingSalary,
            unusedAnnualLeave,
            eosb,
            unpaidOvertime: { applicable: false, amount: 0 },
            unpaidBonuses: { applicable: false, amount: 0 },
            otherAllowances: { applicable: false, totalAmount: 0 },
            totalEarnings
        },

        deductions: {
            outstandingLoans: { applicable: false, loans: [], totalLoansDeduction: 0 },
            outstandingAdvances: { applicable: false, advances: [], totalAdvancesDeduction: 0 },
            noticeShortfall,
            unreturnedProperty: {
                applicable: unreturnedItems.length > 0,
                items: unreturnedItems,
                totalDeduction: unreturnedDeduction
            },
            damages: { applicable: false, amount: 0 },
            otherDeductions: { applicable: false, totalAmount: 0 },
            totalDeductions
        },

        netSettlement: {
            grossAmount: totalEarnings,
            totalDeductions,
            netPayable
        },

        payment: {
            paymentMethod: 'bank_transfer',
            paymentStatus: 'pending'
        },

        finalApproved: false
    };

    // Add timeline event
    offboarding.timeline.push({
        eventId: `EVT-${Date.now()}`,
        eventType: 'settlement_calculated',
        eventDate: new Date(),
        description: `Final settlement calculated: ${netPayable.toFixed(2)} SAR`,
        performedBy: lawyerId,
        status: 'completed'
    });

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: 'Final settlement calculated successfully',
        data: offboarding.finalSettlement
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVE SETTLEMENT
// POST /api/hr/offboarding/:offboardingId/approve-settlement
// ═══════════════════════════════════════════════════════════════
const approveSettlement = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = ['comments'];
    const filteredData = pickAllowedFields(req.body, allowedFields);
    const { comments } = filteredData;

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!offboarding.finalSettlement?.calculated) {
        throw CustomException('Settlement has not been calculated yet', 400);
    }

    // Validate settlement amounts before approval
    const netPayable = offboarding.finalSettlement?.netSettlement?.netPayable;
    if (netPayable === undefined || isNaN(netPayable)) {
        throw CustomException('Invalid settlement amount. Please recalculate.', 400);
    }

    offboarding.finalSettlement.finalApproved = true;
    offboarding.finalSettlement.finalApprovalDate = new Date();
    offboarding.finalSettlement.approvedBy = lawyerId;

    // Add approval record
    if (!offboarding.finalSettlement.approvals) {
        offboarding.finalSettlement.approvals = [];
    }
    offboarding.finalSettlement.approvals.push({
        approverRole: 'HR',
        approverId: lawyerId,
        approved: true,
        approvalDate: new Date(),
        comments
    });

    // Add timeline event
    offboarding.timeline.push({
        eventId: `EVT-${Date.now()}`,
        eventType: 'settlement_approved',
        eventDate: new Date(),
        description: 'Final settlement approved',
        descriptionAr: 'تم اعتماد التسوية النهائية',
        performedBy: lawyerId,
        status: 'completed'
    });

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: 'Settlement approved successfully',
        data: offboarding.finalSettlement
    });
});

// ═══════════════════════════════════════════════════════════════
// PROCESS PAYMENT
// POST /api/hr/offboarding/:offboardingId/process-payment
// ═══════════════════════════════════════════════════════════════
const processPayment = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = ['paymentMethod', 'paymentReference', 'bankDetails', 'checkDetails'];
    const filteredData = pickAllowedFields(req.body, allowedFields);

    const {
        paymentMethod,
        paymentReference,
        bankDetails,
        checkDetails
    } = filteredData;

    // Input validation
    if (!paymentMethod) {
        throw CustomException('Payment method is required', 400);
    }
    const validPaymentMethods = ['bank_transfer', 'check', 'cash', 'wire_transfer'];
    if (!validPaymentMethods.includes(paymentMethod)) {
        throw CustomException(`Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`, 400);
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    if (!offboarding.finalSettlement?.finalApproved) {
        throw CustomException('Settlement has not been approved yet', 400);
    }

    // Validate settlement amount before processing payment
    const netPayable = offboarding.finalSettlement?.netSettlement?.netPayable;
    if (netPayable === undefined || isNaN(netPayable) || netPayable < 0) {
        throw CustomException('Invalid settlement amount. Cannot process payment.', 400);
    }

    offboarding.finalSettlement.payment = {
        paymentMethod,
        bankDetails: bankDetails || offboarding.finalSettlement.payment?.bankDetails,
        checkDetails: checkDetails || offboarding.finalSettlement.payment?.checkDetails,
        paymentStatus: 'paid',
        paymentDate: new Date(),
        paymentReference
    };

    offboarding.completion.finalSettlementCompleted = true;

    // Add timeline event
    offboarding.timeline.push({
        eventId: `EVT-${Date.now()}`,
        eventType: 'settlement_paid',
        eventDate: new Date(),
        description: `Settlement paid via ${paymentMethod}`,
        performedBy: lawyerId,
        status: 'completed'
    });

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: 'Payment processed successfully',
        data: offboarding.finalSettlement.payment
    });
});

// ═══════════════════════════════════════════════════════════════
// ISSUE EXPERIENCE CERTIFICATE
// POST /api/hr/offboarding/:offboardingId/issue-experience-certificate
// ═══════════════════════════════════════════════════════════════
const issueExperienceCertificate = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = ['certificateContent', 'deliveryMethod'];
    const filteredData = pickAllowedFields(req.body, allowedFields);
    const { certificateContent, deliveryMethod } = filteredData;

    // Input validation
    if (deliveryMethod) {
        const validMethods = ['email', 'postal', 'in_person', 'courier'];
        if (!validMethods.includes(deliveryMethod)) {
            throw CustomException(`Invalid delivery method. Must be one of: ${validMethods.join(', ')}`, 400);
        }
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const certificateNumber = `EXP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    offboarding.finalDocuments.experienceCertificate = {
        required: true,
        requested: true,
        requestDate: new Date(),
        prepared: true,
        preparedDate: new Date(),
        preparedBy: lawyerId,
        certificateContent: certificateContent || {
            employeeName: offboarding.employeeName,
            nationalId: offboarding.nationalId,
            jobTitle: offboarding.jobTitle,
            department: offboarding.department,
            joinDate: offboarding.hireDate,
            exitDate: offboarding.dates.exitEffectiveDate,
            serviceDuration: `${offboarding.serviceDuration.years} years, ${offboarding.serviceDuration.months} months`,
            goodConduct: true
        },
        issued: true,
        issueDate: new Date(),
        certificateNumber,
        arabicVersion: { generated: true },
        englishVersion: { generated: true },
        officialStamp: true,
        authorizedSignature: true,
        delivered: false,
        deliveryMethod
    };

    offboarding.completion.documentsIssued = true;

    // Add timeline event
    offboarding.timeline.push({
        eventId: `EVT-${Date.now()}`,
        eventType: 'documents_issued',
        eventDate: new Date(),
        description: 'Experience certificate issued',
        descriptionAr: 'تم إصدار شهادة الخبرة',
        performedBy: lawyerId,
        status: 'completed'
    });

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: 'Experience certificate issued successfully',
        data: offboarding.finalDocuments.experienceCertificate
    });
});

// ═══════════════════════════════════════════════════════════════
// COMPLETE OFFBOARDING
// POST /api/hr/offboarding/:offboardingId/complete
// ═══════════════════════════════════════════════════════════════
const completeOffboarding = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    // Validate all required tasks are completed
    const missing = [];
    if (!offboarding.completion.exitInterviewCompleted && offboarding.exitType !== 'death') {
        missing.push('Exit Interview');
    }
    if (!offboarding.completion.clearanceCompleted) {
        missing.push('Clearance');
    }
    if (!offboarding.completion.finalSettlementCompleted) {
        missing.push('Final Settlement');
    }
    if (!offboarding.completion.documentsIssued) {
        missing.push('Documents');
    }

    // Validate proper access revocation - ensure IT clearance includes critical tasks
    const itClearance = offboarding.clearance?.itClearance;
    if (itClearance?.required) {
        if (!itClearance.cleared) {
            missing.push('IT Clearance (required for access revocation)');
        } else {
            // Verify critical IT tasks are completed
            const criticalTasks = ['email_deactivation', 'system_access_revoked', 'vpn_disabled'];
            const incompleteTasks = itClearance.tasks?.filter(task =>
                criticalTasks.includes(task.task) && !task.completed
            ) || [];

            if (incompleteTasks.length > 0) {
                missing.push(`IT Access Revocation (incomplete: ${incompleteTasks.map(t => t.taskName).join(', ')})`);
            }
        }
    }

    // Validate all clearance items are returned
    if (offboarding.clearance?.itemsToReturn?.length > 0) {
        const unreturnedItems = offboarding.clearance.itemsToReturn.filter(item => !item.returned);
        if (unreturnedItems.length > 0) {
            missing.push(`Unreturned Items (${unreturnedItems.length} items pending)`);
        }
    }

    // Validate final settlement has been paid
    if (offboarding.finalSettlement?.payment?.paymentStatus !== 'paid') {
        missing.push('Final Settlement Payment (not yet paid)');
    }

    if (missing.length > 0) {
        throw CustomException(`Cannot complete. Missing: ${missing.join(', ')}`, 400);
    }

    offboarding.status = 'completed';
    offboarding.completion.allTasksCompleted = true;
    offboarding.completion.offboardingCompleted = true;
    offboarding.completion.completionDate = new Date();
    offboarding.completion.caseClosed = true;
    offboarding.completion.closedDate = new Date();
    offboarding.completion.closedBy = lawyerId;

    // Issue clearance certificate
    offboarding.clearance.clearanceCertificate = {
        issued: true,
        issueDate: new Date()
    };

    // Add timeline event
    offboarding.timeline.push({
        eventId: `EVT-${Date.now()}`,
        eventType: 'offboarding_completed',
        eventDate: new Date(),
        description: 'Offboarding process completed',
        descriptionAr: 'تم إكمال عملية إنهاء الخدمة',
        performedBy: lawyerId,
        status: 'completed'
    });

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    // Update employee status
    const employeeAccessQuery = firmId ? { firmId } : { lawyerId };
    await Employee.findOneAndUpdate(
        { _id: offboarding.employeeId, ...employeeAccessQuery },
        {
            'employment.employmentStatus': 'terminated',
            'employment.terminationDate': offboarding.dates.exitEffectiveDate,
            'employment.terminationReason': offboarding.exitType
        }
    );

    return res.json({
        success: true,
        message: 'Offboarding completed successfully',
        data: offboarding
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK DELETE
// POST /api/hr/offboarding/bulk-delete
// ═══════════════════════════════════════════════════════════════
const bulkDelete = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Mass assignment protection
    const allowedFields = ['ids'];
    const filteredData = pickAllowedFields(req.body, allowedFields);
    const { ids } = filteredData;

    // Input validation
    if (!ids || !Array.isArray(ids)) {
        throw CustomException('IDs array is required', 400);
    }
    if (ids.length === 0) {
        throw CustomException('IDs array cannot be empty', 400);
    }
    if (ids.length > 100) {
        throw CustomException('Cannot delete more than 100 items at once', 400);
    }

    // Validate and sanitize all IDs
    const sanitizedIds = ids.map(id => {
        const sanitized = sanitizeObjectId(id);
        if (!sanitized) {
            throw CustomException(`Invalid ID format: ${id}`, 400);
        }
        return sanitized;
    });

    const query = {
        _id: { $in: sanitizedIds },
        status: { $in: ['initiated', 'cancelled'] }
    };

    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const result = await Offboarding.deleteMany(query);

    return res.json({
        success: true,
        message: `${result.deletedCount} offboarding(s) deleted successfully`,
        deleted: result.deletedCount,
        failed: ids.length - result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// GET BY EMPLOYEE
// GET /api/hr/offboarding/by-employee/:employeeId
// ═══════════════════════════════════════════════════════════════
const getByEmployee = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize employeeId
    const sanitizedEmployeeId = sanitizeObjectId(employeeId);
    if (!sanitizedEmployeeId) {
        throw CustomException('Invalid employee ID format', 400);
    }

    // IDOR Protection - Verify employee belongs to the firm/lawyer
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        throw CustomException('Employee not found', 404);
    }

    const hasEmployeeAccess = firmId
        ? employee.firmId?.toString() === firmId.toString()
        : employee.lawyerId?.toString() === lawyerId;

    if (!hasEmployeeAccess) {
        throw CustomException('Access denied to this employee', 403);
    }

    const query = { employeeId };
    if (firmId) {
        query.firmId = firmId;
    } else {
        query.lawyerId = lawyerId;
    }

    const offboardings = await Offboarding.find(query)
        .populate('employeeId', 'employeeId personalInfo.fullNameArabic personalInfo.fullNameEnglish')
        .populate('managerId', 'firstName lastName email')
        .sort({ createdAt: -1 });

    return res.json({
        success: true,
        data: offboardings
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PENDING CLEARANCES
// GET /api/hr/offboarding/pending-clearances
// ═══════════════════════════════════════════════════════════════
const getPendingClearances = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const pendingClearances = await Offboarding.getPendingClearances(firmId, lawyerId);

    // Format response
    const formatted = pendingClearances.map(off => {
        const pendingSections = [];
        if (!off.clearance?.itClearance?.cleared) pendingSections.push('IT');
        if (!off.clearance?.financeClearance?.cleared) pendingSections.push('Finance');
        if (!off.clearance?.hrClearance?.cleared) pendingSections.push('HR');
        if (!off.clearance?.departmentClearance?.cleared) pendingSections.push('Department');
        if (!off.clearance?.managerClearance?.cleared) pendingSections.push('Manager');

        const daysOverdue = Math.max(0, Math.floor((new Date() - new Date(off.dates.lastWorkingDay)) / (1000 * 60 * 60 * 24)));

        return {
            offboardingId: off.offboardingId,
            employeeName: off.employeeName,
            employeeNameAr: off.employeeNameAr,
            pendingSections,
            daysOverdue,
            lastWorkingDay: off.dates.lastWorkingDay
        };
    });

    return res.json({
        success: true,
        data: formatted
    });
});

// ═══════════════════════════════════════════════════════════════
// GET PENDING SETTLEMENTS
// GET /api/hr/offboarding/pending-settlements
// ═══════════════════════════════════════════════════════════════
const getPendingSettlements = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const pendingSettlements = await Offboarding.getPendingSettlements(firmId, lawyerId);

    // Format response
    const formatted = pendingSettlements.map(off => ({
        offboardingId: off.offboardingId,
        employeeName: off.employeeName,
        employeeNameAr: off.employeeNameAr,
        amount: off.finalSettlement?.netSettlement?.netPayable || 0,
        status: off.finalSettlement?.payment?.paymentStatus || 'pending'
    }));

    return res.json({
        success: true,
        data: formatted
    });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE REHIRE ELIGIBILITY
// PATCH /api/hr/offboarding/:offboardingId/rehire-eligibility
// ═══════════════════════════════════════════════════════════════
const updateRehireEligibility = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'eligibilityCategory', 'eligibilityReason', 'conditions',
        'notes', 'coolingOffPeriod'
    ];
    const filteredData = pickAllowedFields(req.body, allowedFields);

    const {
        eligibilityCategory,
        eligibilityReason,
        conditions,
        notes,
        coolingOffPeriod
    } = filteredData;

    // Input validation
    if (!eligibilityCategory) {
        throw CustomException('Eligibility category is required', 400);
    }

    const validCategories = ['eligible', 'eligible_with_conditions', 'not_eligible', 'blacklisted'];
    if (!validCategories.includes(eligibilityCategory)) {
        throw CustomException(`Invalid eligibility category. Must be one of: ${validCategories.join(', ')}`, 400);
    }

    // Validate cooling off period if provided
    if (coolingOffPeriod?.periodMonths !== undefined) {
        if (isNaN(coolingOffPeriod.periodMonths) || coolingOffPeriod.periodMonths < 0 || coolingOffPeriod.periodMonths > 120) {
            throw CustomException('Cooling off period must be between 0 and 120 months', 400);
        }
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    offboarding.rehireEligibility = {
        eligible: eligibilityCategory === 'eligible',
        eligibilityCategory,
        eligibilityReason,
        conditions: conditions || [],
        notes,
        evaluatedBy: lawyerId,
        evaluationDate: new Date(),
        coolingOffPeriod: coolingOffPeriod || {}
    };

    // Calculate earliest rehire date if cooling off period specified
    if (coolingOffPeriod?.periodMonths && offboarding.dates.exitEffectiveDate) {
        const earliestDate = new Date(offboarding.dates.exitEffectiveDate);
        earliestDate.setMonth(earliestDate.getMonth() + coolingOffPeriod.periodMonths);
        offboarding.rehireEligibility.coolingOffPeriod.earliestRehireDate = earliestDate;
    }

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.json({
        success: true,
        message: 'Rehire eligibility updated successfully',
        data: offboarding.rehireEligibility
    });
});

// ═══════════════════════════════════════════════════════════════
// ADD CLEARANCE ITEM
// POST /api/hr/offboarding/:offboardingId/clearance/items
// ═══════════════════════════════════════════════════════════════
const addClearanceItem = asyncHandler(async (req, res) => {
    const { offboardingId } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Validate and sanitize offboardingId
    const sanitizedOffboardingId = sanitizeObjectId(offboardingId);
    if (!sanitizedOffboardingId) {
        throw CustomException('Invalid offboarding ID format', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'itemType', 'itemDescription', 'itemDescriptionAr',
        'serialNumber', 'assetId', 'replacementCost'
    ];
    const filteredData = pickAllowedFields(req.body, allowedFields);

    const {
        itemType,
        itemDescription,
        itemDescriptionAr,
        serialNumber,
        assetId,
        replacementCost
    } = filteredData;

    // Input validation
    if (!itemType) {
        throw CustomException('Item type is required', 400);
    }
    if (!itemDescription) {
        throw CustomException('Item description is required', 400);
    }

    const validItemTypes = ['laptop', 'phone', 'tablet', 'access_card', 'keys', 'uniform', 'equipment', 'documents', 'other'];
    if (!validItemTypes.includes(itemType)) {
        throw CustomException(`Invalid item type. Must be one of: ${validItemTypes.join(', ')}`, 400);
    }

    if (replacementCost !== undefined) {
        if (isNaN(replacementCost) || replacementCost < 0) {
            throw CustomException('Replacement cost must be a non-negative number', 400);
        }
        // Reasonable limit check
        if (replacementCost > 1000000) {
            throw CustomException('Replacement cost exceeds reasonable limits', 400);
        }
    }

    const offboarding = await Offboarding.findById(offboardingId);

    if (!offboarding) {
        throw CustomException('Offboarding not found', 404);
    }

    // IDOR Protection - Check access
    const hasAccess = firmId
        ? offboarding.firmId?.toString() === firmId.toString()
        : offboarding.lawyerId?.toString() === lawyerId;

    if (!hasAccess) {
        throw CustomException('Access denied', 403);
    }

    const newItem = {
        itemId: `ITEM-${Date.now()}`,
        itemType,
        itemDescription,
        itemDescriptionAr,
        serialNumber,
        assetId,
        replacementCost,
        returned: false
    };

    offboarding.clearance.itemsToReturn.push(newItem);
    offboarding.clearance.allItemsReturned = false;

    offboarding.lastModifiedBy = lawyerId;
    await offboarding.save();

    return res.status(201).json({
        success: true,
        message: 'Clearance item added successfully',
        data: newItem
    });
});

module.exports = {
    getOffboardings,
    getOffboardingStats,
    getOffboarding,
    createOffboarding,
    updateOffboarding,
    deleteOffboarding,
    updateStatus,
    completeExitInterview,
    updateClearanceItem,
    completeClearanceSection,
    calculateSettlement,
    approveSettlement,
    processPayment,
    issueExperienceCertificate,
    completeOffboarding,
    bulkDelete,
    getByEmployee,
    getPendingClearances,
    getPendingSettlements,
    updateRehireEligibility,
    addClearanceItem
};
