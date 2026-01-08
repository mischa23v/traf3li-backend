/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  WHO'S OUT CALENDAR CONTROLLER                                               ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                               ║
 * ║  Enterprise-grade Who's Out Calendar feature inspired by:                    ║
 * ║  - BambooHR Who's Out widget                                                 ║
 * ║  - ZenHR Team Calendar                                                       ║
 * ║  - Jisr Attendance Dashboard                                                 ║
 * ║                                                                               ║
 * ║  Features:                                                                   ║
 * ║  - Today's absences overview                                                 ║
 * ║  - Weekly/Monthly calendar view                                              ║
 * ║  - Department/team filtering                                                 ║
 * ║  - Absence type breakdown                                                    ║
 * ║  - Upcoming absences                                                         ║
 * ║  - Coverage planning                                                         ║
 * ║                                                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

const { LeaveRequest, Employee } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper for regex safety
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Absence type colors for UI rendering
const ABSENCE_TYPE_COLORS = {
    annual: { color: '#10B981', colorAr: 'أخضر', name: 'Annual Leave', nameAr: 'إجازة سنوية' },
    sick: { color: '#EF4444', colorAr: 'أحمر', name: 'Sick Leave', nameAr: 'إجازة مرضية' },
    maternity: { color: '#F472B6', colorAr: 'وردي', name: 'Maternity Leave', nameAr: 'إجازة وضع' },
    paternity: { color: '#3B82F6', colorAr: 'أزرق', name: 'Paternity Leave', nameAr: 'إجازة أبوة' },
    hajj: { color: '#8B5CF6', colorAr: 'بنفسجي', name: 'Hajj Leave', nameAr: 'إجازة حج' },
    iddah: { color: '#1F2937', colorAr: 'رمادي داكن', name: 'Iddah Leave', nameAr: 'إجازة عدة' },
    marriage: { color: '#EC4899', colorAr: 'زهري', name: 'Marriage Leave', nameAr: 'إجازة زواج' },
    death: { color: '#6B7280', colorAr: 'رمادي', name: 'Death Leave', nameAr: 'إجازة وفاة' },
    birth: { color: '#06B6D4', colorAr: 'تركواز', name: 'Birth Leave', nameAr: 'إجازة ولادة' },
    exam: { color: '#F59E0B', colorAr: 'برتقالي', name: 'Exam Leave', nameAr: 'إجازة امتحان' },
    unpaid: { color: '#9CA3AF', colorAr: 'رمادي فاتح', name: 'Unpaid Leave', nameAr: 'إجازة بدون راتب' },
    remote_work: { color: '#14B8A6', colorAr: 'أزرق مخضر', name: 'Remote Work', nameAr: 'عمل عن بعد' },
    business_trip: { color: '#6366F1', colorAr: 'نيلي', name: 'Business Trip', nameAr: 'رحلة عمل' }
};

// ═══════════════════════════════════════════════════════════════
// GET TODAY'S ABSENCES
// GET /api/hr/whos-out/today
// ═══════════════════════════════════════════════════════════════
const getTodayAbsences = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build firm query
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Find all approved leaves that include today
    const absences = await LeaveRequest.find({
        ...baseQuery,
        status: { $in: ['approved', 'completed'] },
        'dates.startDate': { $lte: tomorrow },
        'dates.endDate': { $gte: today }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic personalInfo.avatar employment.departmentName employment.jobTitle')
        .select('employeeId employeeName employeeNameAr department leaveType dates')
        .sort({ 'employeeName': 1 })
        .lean();

    // Group by department
    const byDepartment = {};
    const byType = {};
    let totalOut = 0;

    absences.forEach(absence => {
        totalOut++;
        const dept = absence.department || 'Unassigned';
        const type = absence.leaveType || 'other';

        // Group by department
        if (!byDepartment[dept]) {
            byDepartment[dept] = [];
        }
        byDepartment[dept].push({
            _id: absence._id,
            employeeId: absence.employeeId?._id,
            employeeNumber: absence.employeeId?.employeeId,
            employeeName: absence.employeeName || absence.employeeId?.personalInfo?.fullNameEnglish,
            employeeNameAr: absence.employeeNameAr || absence.employeeId?.personalInfo?.fullNameArabic,
            avatar: absence.employeeId?.personalInfo?.avatar,
            department: absence.department,
            jobTitle: absence.employeeId?.employment?.jobTitle,
            leaveType: type,
            leaveTypeInfo: ABSENCE_TYPE_COLORS[type] || { color: '#9CA3AF', name: type, nameAr: type },
            startDate: absence.dates.startDate,
            endDate: absence.dates.endDate,
            daysRemaining: Math.ceil((new Date(absence.dates.endDate) - today) / (1000 * 60 * 60 * 24))
        });

        // Group by type
        if (!byType[type]) {
            byType[type] = {
                count: 0,
                ...ABSENCE_TYPE_COLORS[type] || { color: '#9CA3AF', name: type, nameAr: type }
            };
        }
        byType[type].count++;
    });

    // Get total employee count for percentage
    const totalEmployees = await Employee.countDocuments({
        ...baseQuery,
        'employment.employmentStatus': 'active'
    });

    return res.json({
        success: true,
        date: today.toISOString().split('T')[0],
        dateAr: today.toLocaleDateString('ar-SA'),
        summary: {
            totalOut,
            totalEmployees,
            percentageOut: totalEmployees > 0 ? Math.round((totalOut / totalEmployees) * 100) : 0,
            percentageOutAr: totalEmployees > 0 ? `${Math.round((totalOut / totalEmployees) * 100)}%` : '0%'
        },
        byDepartment,
        byType: Object.entries(byType).map(([type, data]) => ({
            type,
            ...data
        })),
        absences: absences.map(a => ({
            _id: a._id,
            employeeId: a.employeeId?._id,
            employeeName: a.employeeName || a.employeeId?.personalInfo?.fullNameEnglish,
            employeeNameAr: a.employeeNameAr || a.employeeId?.personalInfo?.fullNameArabic,
            avatar: a.employeeId?.personalInfo?.avatar,
            department: a.department,
            leaveType: a.leaveType,
            leaveTypeInfo: ABSENCE_TYPE_COLORS[a.leaveType] || { color: '#9CA3AF', name: a.leaveType, nameAr: a.leaveType },
            startDate: a.dates.startDate,
            endDate: a.dates.endDate
        }))
    });
});

// ═══════════════════════════════════════════════════════════════
// GET WEEKLY CALENDAR
// GET /api/hr/whos-out/week
// ═══════════════════════════════════════════════════════════════
const getWeeklyCalendar = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { weekStart, department } = req.query;

    // Calculate week boundaries
    let startDate;
    if (weekStart) {
        startDate = new Date(weekStart);
    } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
    }
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    // Build firm query
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Add department filter if provided
    if (department && department !== 'all') {
        baseQuery.department = department;
    }

    // Find all approved leaves that overlap with the week
    const absences = await LeaveRequest.find({
        ...baseQuery,
        status: { $in: ['approved', 'completed'] },
        'dates.startDate': { $lt: endDate },
        'dates.endDate': { $gte: startDate }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic personalInfo.avatar employment.departmentName')
        .select('employeeId employeeName employeeNameAr department leaveType dates')
        .sort({ 'dates.startDate': 1 })
        .lean();

    // Build calendar days
    const days = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);

        const dayAbsences = absences.filter(a => {
            const leaveStart = new Date(a.dates.startDate);
            const leaveEnd = new Date(a.dates.endDate);
            leaveStart.setHours(0, 0, 0, 0);
            leaveEnd.setHours(23, 59, 59, 999);
            return currentDate >= leaveStart && currentDate <= leaveEnd;
        });

        days.push({
            date: currentDate.toISOString().split('T')[0],
            dayName: dayNames[currentDate.getDay()],
            dayNameAr: dayNamesAr[currentDate.getDay()],
            isToday: currentDate.toDateString() === new Date().toDateString(),
            isWeekend: currentDate.getDay() === 5 || currentDate.getDay() === 6, // Fri/Sat for Saudi
            absenceCount: dayAbsences.length,
            absences: dayAbsences.map(a => ({
                _id: a._id,
                employeeId: a.employeeId?._id,
                employeeName: a.employeeName || a.employeeId?.personalInfo?.fullNameEnglish,
                employeeNameAr: a.employeeNameAr || a.employeeId?.personalInfo?.fullNameArabic,
                avatar: a.employeeId?.personalInfo?.avatar,
                department: a.department,
                leaveType: a.leaveType,
                leaveTypeInfo: ABSENCE_TYPE_COLORS[a.leaveType] || { color: '#9CA3AF', name: a.leaveType, nameAr: a.leaveType }
            }))
        });
    }

    // Get unique departments for filter
    const departments = await Employee.distinct('employment.departmentName', {
        ...baseQuery,
        'employment.employmentStatus': 'active'
    });

    return res.json({
        success: true,
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        days,
        departments: ['all', ...departments.filter(Boolean)],
        totalAbsencesThisWeek: absences.length
    });
});

// ═══════════════════════════════════════════════════════════════
// GET MONTHLY CALENDAR
// GET /api/hr/whos-out/month
// ═══════════════════════════════════════════════════════════════
const getMonthlyCalendar = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { year, month, department } = req.query;

    // Calculate month boundaries
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Build firm query
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Add department filter if provided
    if (department && department !== 'all') {
        baseQuery.department = department;
    }

    // Find all approved leaves that overlap with the month
    const absences = await LeaveRequest.find({
        ...baseQuery,
        status: { $in: ['approved', 'completed'] },
        'dates.startDate': { $lte: endDate },
        'dates.endDate': { $gte: startDate }
    })
        .select('employeeName employeeNameAr department leaveType dates')
        .lean();

    // Build calendar grid
    const calendar = {};
    const daysInMonth = endDate.getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(targetYear, targetMonth - 1, day);
        const dateKey = currentDate.toISOString().split('T')[0];

        const dayAbsences = absences.filter(a => {
            const leaveStart = new Date(a.dates.startDate);
            const leaveEnd = new Date(a.dates.endDate);
            leaveStart.setHours(0, 0, 0, 0);
            leaveEnd.setHours(23, 59, 59, 999);
            return currentDate >= leaveStart && currentDate <= leaveEnd;
        });

        calendar[dateKey] = {
            date: dateKey,
            dayOfWeek: currentDate.getDay(),
            isWeekend: currentDate.getDay() === 5 || currentDate.getDay() === 6,
            absenceCount: dayAbsences.length,
            absences: dayAbsences.map(a => ({
                employeeName: a.employeeName,
                employeeNameAr: a.employeeNameAr,
                department: a.department,
                leaveType: a.leaveType,
                leaveTypeInfo: ABSENCE_TYPE_COLORS[a.leaveType] || { color: '#9CA3AF', name: a.leaveType, nameAr: a.leaveType }
            }))
        };
    }

    // Calculate statistics
    const absencesByType = {};
    absences.forEach(a => {
        const type = a.leaveType || 'other';
        if (!absencesByType[type]) {
            absencesByType[type] = { count: 0, totalDays: 0, ...ABSENCE_TYPE_COLORS[type] };
        }
        absencesByType[type].count++;
        absencesByType[type].totalDays += a.dates.workingDays || a.dates.totalDays || 1;
    });

    return res.json({
        success: true,
        year: targetYear,
        month: targetMonth,
        monthName: startDate.toLocaleDateString('en-US', { month: 'long' }),
        monthNameAr: startDate.toLocaleDateString('ar-SA', { month: 'long' }),
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        calendar,
        statistics: {
            totalAbsences: absences.length,
            absencesByType: Object.entries(absencesByType).map(([type, data]) => ({
                type,
                ...data
            }))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// GET UPCOMING ABSENCES
// GET /api/hr/whos-out/upcoming
// ═══════════════════════════════════════════════════════════════
const getUpcomingAbsences = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { days = 30, department } = req.query;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    // Build firm query
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Add department filter if provided
    if (department && department !== 'all') {
        baseQuery.department = department;
    }

    // Find upcoming approved leaves
    const upcomingAbsences = await LeaveRequest.find({
        ...baseQuery,
        status: { $in: ['approved'] },
        'dates.startDate': { $gt: today, $lte: futureDate }
    })
        .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic personalInfo.avatar employment.departmentName employment.jobTitle')
        .select('employeeId employeeName employeeNameAr department leaveType dates workHandover')
        .sort({ 'dates.startDate': 1 })
        .lean();

    // Group by start date for timeline view
    const byDate = {};
    upcomingAbsences.forEach(absence => {
        const dateKey = new Date(absence.dates.startDate).toISOString().split('T')[0];
        if (!byDate[dateKey]) {
            byDate[dateKey] = [];
        }
        byDate[dateKey].push({
            _id: absence._id,
            employeeId: absence.employeeId?._id,
            employeeName: absence.employeeName || absence.employeeId?.personalInfo?.fullNameEnglish,
            employeeNameAr: absence.employeeNameAr || absence.employeeId?.personalInfo?.fullNameArabic,
            avatar: absence.employeeId?.personalInfo?.avatar,
            department: absence.department,
            jobTitle: absence.employeeId?.employment?.jobTitle,
            leaveType: absence.leaveType,
            leaveTypeInfo: ABSENCE_TYPE_COLORS[absence.leaveType] || { color: '#9CA3AF', name: absence.leaveType, nameAr: absence.leaveType },
            startDate: absence.dates.startDate,
            endDate: absence.dates.endDate,
            totalDays: absence.dates.workingDays || absence.dates.totalDays,
            daysUntilStart: Math.ceil((new Date(absence.dates.startDate) - today) / (1000 * 60 * 60 * 24)),
            hasHandover: absence.workHandover?.handoverCompleted || false
        });
    });

    return res.json({
        success: true,
        lookAheadDays: parseInt(days),
        totalUpcoming: upcomingAbsences.length,
        byDate,
        timeline: Object.entries(byDate).map(([date, absences]) => ({
            date,
            dateFormatted: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            dateFormattedAr: new Date(date).toLocaleDateString('ar-SA', { weekday: 'short', month: 'short', day: 'numeric' }),
            count: absences.length,
            absences
        }))
    });
});

// ═══════════════════════════════════════════════════════════════
// GET DEPARTMENT COVERAGE
// GET /api/hr/whos-out/coverage/:department
// ═══════════════════════════════════════════════════════════════
const getDepartmentCoverage = asyncHandler(async (req, res) => {
    const { department } = req.params;
    const lawyerId = req.userID;
    const firmId = req.firmId;
    const { startDate, endDate } = req.query;

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Build firm query
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Get department employees
    const employeeQuery = {
        ...baseQuery,
        'employment.employmentStatus': 'active'
    };
    if (department !== 'all') {
        employeeQuery['employment.departmentName'] = department;
    }

    const employees = await Employee.find(employeeQuery)
        .select('employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic employment.departmentName employment.jobTitle')
        .lean();

    const totalEmployees = employees.length;

    // Get leaves in the period
    const leaveQuery = {
        ...baseQuery,
        status: { $in: ['approved', 'completed'] },
        'dates.startDate': { $lte: end },
        'dates.endDate': { $gte: start }
    };
    if (department !== 'all') {
        leaveQuery.department = department;
    }

    const leaves = await LeaveRequest.find(leaveQuery)
        .select('employeeId employeeName dates leaveType')
        .lean();

    // Calculate coverage by day
    const coverageByDay = [];
    const currentDate = new Date(start);

    while (currentDate <= end) {
        const dayLeaves = leaves.filter(l => {
            const leaveStart = new Date(l.dates.startDate);
            const leaveEnd = new Date(l.dates.endDate);
            leaveStart.setHours(0, 0, 0, 0);
            leaveEnd.setHours(23, 59, 59, 999);
            return currentDate >= leaveStart && currentDate <= leaveEnd;
        });

        const presentCount = totalEmployees - dayLeaves.length;
        const coveragePercentage = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 100;

        coverageByDay.push({
            date: currentDate.toISOString().split('T')[0],
            totalEmployees,
            absent: dayLeaves.length,
            present: presentCount,
            coveragePercentage,
            coverageStatus: coveragePercentage >= 80 ? 'good' : coveragePercentage >= 60 ? 'warning' : 'critical',
            absentEmployees: dayLeaves.map(l => ({
                employeeId: l.employeeId,
                employeeName: l.employeeName,
                leaveType: l.leaveType
            }))
        });

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Find critical coverage days
    const criticalDays = coverageByDay.filter(d => d.coveragePercentage < 60);
    const warningDays = coverageByDay.filter(d => d.coveragePercentage >= 60 && d.coveragePercentage < 80);

    return res.json({
        success: true,
        department: department === 'all' ? 'All Departments' : department,
        departmentAr: department === 'all' ? 'جميع الأقسام' : department,
        period: {
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0]
        },
        totalEmployees,
        averageCoverage: Math.round(coverageByDay.reduce((sum, d) => sum + d.coveragePercentage, 0) / coverageByDay.length),
        criticalDaysCount: criticalDays.length,
        warningDaysCount: warningDays.length,
        coverageByDay,
        criticalDays,
        warningDays
    });
});

// ═══════════════════════════════════════════════════════════════
// GET ALL DEPARTMENTS SUMMARY
// GET /api/hr/whos-out/departments
// ═══════════════════════════════════════════════════════════════
const getDepartmentsSummary = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build firm query
    const isSoloLawyer = req.isSoloLawyer;
    const baseQuery = {};
    if (isSoloLawyer || !firmId) {
        baseQuery.lawyerId = lawyerId;
    } else {
        baseQuery.firmId = firmId;
    }

    // Get all departments with employee counts
    const departments = await Employee.aggregate([
        { $match: { ...baseQuery, 'employment.employmentStatus': 'active' } },
        {
            $group: {
                _id: '$employment.departmentName',
                totalEmployees: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    // Get today's absences by department
    const todayAbsences = await LeaveRequest.aggregate([
        {
            $match: {
                ...baseQuery,
                status: { $in: ['approved', 'completed'] },
                'dates.startDate': { $lte: tomorrow },
                'dates.endDate': { $gte: today }
            }
        },
        {
            $group: {
                _id: '$department',
                absentCount: { $sum: 1 }
            }
        }
    ]);

    // Combine data
    const absenceMap = {};
    todayAbsences.forEach(a => {
        absenceMap[a._id || 'Unassigned'] = a.absentCount;
    });

    const summary = departments.map(dept => {
        const deptName = dept._id || 'Unassigned';
        const absent = absenceMap[deptName] || 0;
        const present = dept.totalEmployees - absent;
        const coveragePercentage = dept.totalEmployees > 0 ? Math.round((present / dept.totalEmployees) * 100) : 100;

        return {
            department: deptName,
            departmentAr: deptName, // Would need translation lookup
            totalEmployees: dept.totalEmployees,
            absent,
            present,
            coveragePercentage,
            coverageStatus: coveragePercentage >= 80 ? 'good' : coveragePercentage >= 60 ? 'warning' : 'critical'
        };
    });

    // Calculate overall
    const overall = {
        totalEmployees: summary.reduce((sum, d) => sum + d.totalEmployees, 0),
        totalAbsent: summary.reduce((sum, d) => sum + d.absent, 0),
        totalPresent: summary.reduce((sum, d) => sum + d.present, 0)
    };
    overall.overallCoverage = overall.totalEmployees > 0
        ? Math.round((overall.totalPresent / overall.totalEmployees) * 100)
        : 100;

    return res.json({
        success: true,
        date: today.toISOString().split('T')[0],
        overall,
        departments: summary
    });
});

module.exports = {
    getTodayAbsences,
    getWeeklyCalendar,
    getMonthlyCalendar,
    getUpcomingAbsences,
    getDepartmentCoverage,
    getDepartmentsSummary
};
