const Employee = require('../models/employee.model');
const AttendanceRecord = require('../models/attendanceRecord.model');
const LeaveRequest = require('../models/leaveRequest.model');
const PerformanceReview = require('../models/performanceReview.model');
const HRAnalyticsSnapshot = require('../models/hrAnalyticsSnapshot.model');
const mongoose = require('mongoose');

/**
 * HR Analytics Service
 * Provides comprehensive HR analytics across 9 key areas
 * Uses MongoDB aggregation pipelines for efficient analytics
 * Supports date range filtering, department filtering, and period comparisons
 */

class HRAnalyticsService {
    /**
     * Get complete dashboard data
     */
    static async getDashboard(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const dateRange = this._getDateRange(filters);

        const [
            demographics,
            turnover,
            absenteeism,
            attendance,
            performance,
            leave,
            saudization
        ] = await Promise.all([
            this.getWorkforceDemographics(firmId, lawyerId, filters),
            this.getTurnoverAnalysis(firmId, lawyerId, filters),
            this.getAbsenteeismMetrics(firmId, lawyerId, filters),
            this.getAttendanceAnalytics(firmId, lawyerId, filters),
            this.getPerformanceAnalytics(firmId, lawyerId, filters),
            this.getLeaveAnalytics(firmId, lawyerId, filters),
            this.getSaudizationCompliance(firmId, lawyerId)
        ]);

        return {
            overview: {
                totalEmployees: demographics.summary.totalEmployees,
                activeEmployees: demographics.summary.activeEmployees,
                turnoverRate: turnover.summary.turnoverRate,
                absenteeismRate: absenteeism.summary.absenteeismRate,
                attendanceRate: attendance.summary.attendanceRate,
                averagePerformanceScore: performance.summary.averageScore,
                saudizationRate: saudization.saudiPercentage
            },
            demographics,
            turnover,
            absenteeism,
            attendance,
            performance,
            leave,
            saudization,
            period: {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            }
        };
    }

    /**
     * 1. WORKFORCE DEMOGRAPHICS
     */
    static async getWorkforceDemographics(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const query = {
            ...baseQuery,
            ...(filters.department && { 'organization.departmentName': filters.department }),
            ...(filters.status && { 'employment.employmentStatus': filters.status })
        };

        // Get all active employees
        const employees = await Employee.find({
            ...query,
            'employment.employmentStatus': 'active'
        }).lean();

        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(e => e.employment?.employmentStatus === 'active').length;

        // Age Distribution
        const ageDistribution = this._calculateAgeDistribution(employees);

        // Gender Breakdown
        const genderBreakdown = this._calculateGenderBreakdown(employees);

        // Department Distribution
        const departmentDistribution = this._calculateDepartmentDistribution(employees);

        // Tenure Distribution
        const tenureDistribution = this._calculateTenureDistribution(employees);

        // Nationality Breakdown
        const nationalityBreakdown = this._calculateNationalityBreakdown(employees);

        // Saudization Ratio
        const saudization = this._calculateSaudizationRatio(employees);

        // Employment Type Breakdown
        const employmentTypeBreakdown = this._calculateEmploymentTypeBreakdown(employees);

        // Get comparison data
        const previousPeriod = await this._getPreviousPeriodComparison(
            firmId,
            lawyerId,
            'demographics',
            filters
        );

        return {
            summary: {
                totalEmployees,
                activeEmployees,
                inactiveEmployees: totalEmployees - activeEmployees,
                averageAge: this._calculateAverage(employees.map(e => this._getAge(e.personalInfo?.dateOfBirth))),
                averageTenure: this._calculateAverage(employees.map(e => e.yearsOfService || 0))
            },
            ageDistribution,
            genderBreakdown,
            departmentDistribution,
            tenureDistribution,
            nationalityBreakdown,
            saudization,
            employmentTypeBreakdown,
            comparison: previousPeriod,
            chartData: {
                ageDistribution: {
                    labels: ageDistribution.map(d => d.range),
                    datasets: [{
                        label: 'Employees',
                        data: ageDistribution.map(d => d.count)
                    }]
                },
                departmentDistribution: {
                    labels: departmentDistribution.map(d => d.department),
                    datasets: [{
                        label: 'Headcount',
                        data: departmentDistribution.map(d => d.count)
                    }]
                },
                genderBreakdown: {
                    labels: ['Male', 'Female'],
                    datasets: [{
                        label: 'Count',
                        data: [genderBreakdown.male, genderBreakdown.female]
                    }]
                }
            }
        };
    }

    /**
     * 2. TURNOVER ANALYSIS
     */
    static async getTurnoverAnalysis(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const dateRange = this._getDateRange(filters);

        // Get separations in period
        const separations = await Employee.find({
            ...baseQuery,
            'employment.employmentStatus': { $in: ['terminated', 'resigned'] },
            'employment.terminationDate': {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            },
            ...(filters.department && { 'organization.departmentName': filters.department })
        }).lean();

        // Get headcount at start and end of period
        const startingHeadcount = await Employee.countDocuments({
            ...baseQuery,
            'employment.hireDate': { $lte: dateRange.startDate },
            $or: [
                { 'employment.terminationDate': { $exists: false } },
                { 'employment.terminationDate': { $gte: dateRange.startDate } }
            ]
        });

        const endingHeadcount = await Employee.countDocuments({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        });

        const averageHeadcount = (startingHeadcount + endingHeadcount) / 2;

        // Calculate turnover metrics
        const totalSeparations = separations.length;
        const voluntarySeparations = separations.filter(e => e.employment?.employmentStatus === 'resigned').length;
        const involuntarySeparations = separations.filter(e => e.employment?.employmentStatus === 'terminated').length;

        const turnoverRate = averageHeadcount > 0 ? (totalSeparations / averageHeadcount) * 100 : 0;
        const voluntaryTurnoverRate = averageHeadcount > 0 ? (voluntarySeparations / averageHeadcount) * 100 : 0;
        const involuntaryTurnoverRate = averageHeadcount > 0 ? (involuntarySeparations / averageHeadcount) * 100 : 0;
        const retentionRate = 100 - turnoverRate;

        // Turnover by department
        const byDepartment = this._groupByDepartment(separations, endingHeadcount);

        // Turnover by tenure
        const byTenure = this._calculateTurnoverByTenure(separations);

        // Average tenure before leaving
        const tenuresBeforeLeaving = separations.map(e => e.yearsOfService || 0);
        const averageTenureBeforeLeaving = this._calculateAverage(tenuresBeforeLeaving);

        // 90-day turnover (new hires leaving within 90 days)
        const ninetyDayTurnover = separations.filter(e => {
            const hireDate = new Date(e.employment?.hireDate);
            const terminationDate = new Date(e.employment?.terminationDate);
            const diffDays = (terminationDate - hireDate) / (1000 * 60 * 60 * 24);
            return diffDays <= 90;
        }).length;

        const ninetyDayTurnoverRate = totalSeparations > 0 ? (ninetyDayTurnover / totalSeparations) * 100 : 0;

        // Cost of turnover (estimated)
        const averageSalary = this._calculateAverage(separations.map(e => e.compensation?.basicSalary || 0));
        const costPerSeparation = averageSalary * 1.5; // Estimated cost (150% of annual salary)
        const totalCost = costPerSeparation * totalSeparations;

        // Get comparison data
        const previousPeriod = await this._getPreviousPeriodComparison(
            firmId,
            lawyerId,
            'turnover',
            filters
        );

        return {
            summary: {
                turnoverRate: this._round(turnoverRate, 2),
                voluntaryTurnoverRate: this._round(voluntaryTurnoverRate, 2),
                involuntaryTurnoverRate: this._round(involuntaryTurnoverRate, 2),
                retentionRate: this._round(retentionRate, 2),
                totalSeparations,
                averageTenureBeforeLeaving: this._round(averageTenureBeforeLeaving, 2)
            },
            headcount: {
                startingHeadcount,
                endingHeadcount,
                averageHeadcount: this._round(averageHeadcount, 0)
            },
            separations: {
                total: totalSeparations,
                voluntary: voluntarySeparations,
                involuntary: involuntarySeparations
            },
            byDepartment,
            byTenure,
            ninetyDayTurnover: {
                count: ninetyDayTurnover,
                rate: this._round(ninetyDayTurnoverRate, 2)
            },
            costAnalysis: {
                totalCost: this._round(totalCost, 2),
                averageCostPerSeparation: this._round(costPerSeparation, 2),
                estimatedRecruitmentCost: this._round(totalCost * 0.3, 2),
                estimatedTrainingCost: this._round(totalCost * 0.2, 2),
                estimatedProductivityLoss: this._round(totalCost * 0.5, 2)
            },
            comparison: previousPeriod,
            chartData: {
                monthlyTurnover: await this._getMonthlyTurnoverTrend(firmId, lawyerId, dateRange),
                byDepartment: {
                    labels: byDepartment.map(d => d.department),
                    datasets: [{
                        label: 'Turnover Rate (%)',
                        data: byDepartment.map(d => d.turnoverRate)
                    }]
                },
                byTenure: {
                    labels: byTenure.map(t => t.tenureRange),
                    datasets: [{
                        label: 'Separations',
                        data: byTenure.map(t => t.count)
                    }]
                }
            }
        };
    }

    /**
     * 3. ABSENTEEISM TRACKING
     */
    static async getAbsenteeismMetrics(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const dateRange = this._getDateRange(filters);

        const query = {
            ...baseQuery,
            date: { $gte: dateRange.startDate, $lte: dateRange.endDate },
            'absence.isAbsent': true,
            ...(filters.department && { department: filters.department })
        };

        // Get all absence records
        const absences = await AttendanceRecord.find(query).lean();

        const totalAbsences = absences.length;
        const totalAbsenceDays = absences.reduce((sum, a) => sum + 1, 0);

        // Calculate absenteeism rate
        const totalEmployees = await Employee.countDocuments({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        });

        const workingDays = this._getWorkingDays(dateRange.startDate, dateRange.endDate);
        const expectedWorkingDays = totalEmployees * workingDays;
        const absenteeismRate = expectedWorkingDays > 0 ? (totalAbsenceDays / expectedWorkingDays) * 100 : 0;

        // By type
        const byType = {
            unauthorized: absences.filter(a => a.absence?.type === 'unauthorized').length,
            authorized: absences.filter(a => a.absence?.type === 'authorized').length,
            sick: absences.filter(a => a.absence?.type === 'sick').length,
            emergency: absences.filter(a => a.absence?.type === 'leave').length
        };

        // By department
        const byDepartment = await this._getAbsencesByDepartment(absences, expectedWorkingDays);

        // Patterns (Monday/Friday)
        const patterns = this._analyzeAbsencePatterns(absences);

        // Sick leave patterns
        const sickLeave = absences.filter(a => a.absence?.type === 'sick');
        const sickLeaveDays = sickLeave.length;
        const averageSickLeavePerEmployee = totalEmployees > 0 ? sickLeaveDays / totalEmployees : 0;

        // Cost of absenteeism (estimated)
        const employees = await Employee.find({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        }).lean();
        const averageDailySalary = this._calculateAverage(employees.map(e => (e.compensation?.basicSalary || 0) / 30));
        const totalCost = totalAbsenceDays * averageDailySalary;

        // Get comparison data
        const previousPeriod = await this._getPreviousPeriodComparison(
            firmId,
            lawyerId,
            'absenteeism',
            filters
        );

        return {
            summary: {
                totalAbsences,
                totalAbsenceDays,
                absenteeismRate: this._round(absenteeismRate, 2),
                averageAbsencesPerEmployee: this._round(totalAbsences / totalEmployees, 2)
            },
            byType,
            byDepartment,
            patterns,
            sickLeave: {
                totalDays: sickLeaveDays,
                averagePerEmployee: this._round(averageSickLeavePerEmployee, 2)
            },
            costAnalysis: {
                totalCost: this._round(totalCost, 2),
                averageCostPerDay: this._round(averageDailySalary, 2),
                directCosts: this._round(totalCost * 0.7, 2),
                indirectCosts: this._round(totalCost * 0.3, 2)
            },
            comparison: previousPeriod,
            chartData: {
                monthlyTrend: await this._getMonthlyAbsenteeismTrend(firmId, lawyerId, dateRange),
                byType: {
                    labels: Object.keys(byType),
                    datasets: [{
                        label: 'Absences',
                        data: Object.values(byType)
                    }]
                },
                patterns: {
                    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                    datasets: [{
                        label: 'Absences',
                        data: patterns.byDayOfWeek || []
                    }]
                }
            }
        };
    }

    /**
     * 4. LEAVE ANALYTICS
     */
    static async getLeaveAnalytics(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const dateRange = this._getDateRange(filters);

        const query = {
            ...baseQuery,
            'dates.startDate': { $gte: dateRange.startDate, $lte: dateRange.endDate },
            ...(filters.department && { department: filters.department })
        };

        // Get all leave requests
        const leaves = await LeaveRequest.find(query).lean();

        const totalLeaveRequests = leaves.length;
        const approvedLeaves = leaves.filter(l => l.status === 'approved').length;
        const rejectedLeaves = leaves.filter(l => l.status === 'rejected').length;
        const pendingLeaves = leaves.filter(l => l.status === 'pending_approval' || l.status === 'submitted').length;
        const approvalRate = totalLeaveRequests > 0 ? (approvedLeaves / totalLeaveRequests) * 100 : 0;

        // Total leave days
        const totalLeaveDaysTaken = leaves
            .filter(l => l.status === 'approved')
            .reduce((sum, l) => sum + (l.dates?.workingDays || 0), 0);

        const totalEmployees = await Employee.countDocuments({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        });

        const averageLeaveDaysPerEmployee = totalEmployees > 0 ? totalLeaveDaysTaken / totalEmployees : 0;

        // By type
        const byType = this._groupLeavesByType(leaves.filter(l => l.status === 'approved'));

        // Balance trends
        const balanceTrends = await this._calculateLeaveBalanceTrends(firmId, lawyerId);

        // Upcoming leaves (forecast)
        const today = new Date();
        const next30Days = new Date(today);
        next30Days.setDate(today.getDate() + 30);
        const next60Days = new Date(today);
        next60Days.setDate(today.getDate() + 60);
        const next90Days = new Date(today);
        next90Days.setDate(today.getDate() + 90);

        const upcomingLeaves = {
            next30Days: await LeaveRequest.countDocuments({
                ...baseQuery,
                status: 'approved',
                'dates.startDate': { $gte: today, $lte: next30Days }
            }),
            next60Days: await LeaveRequest.countDocuments({
                ...baseQuery,
                status: 'approved',
                'dates.startDate': { $gte: today, $lte: next60Days }
            }),
            next90Days: await LeaveRequest.countDocuments({
                ...baseQuery,
                status: 'approved',
                'dates.startDate': { $gte: today, $lte: next90Days }
            })
        };

        // Get comparison data
        const previousPeriod = await this._getPreviousPeriodComparison(
            firmId,
            lawyerId,
            'leave',
            filters
        );

        return {
            summary: {
                totalLeaveRequests,
                approvedLeaves,
                rejectedLeaves,
                pendingLeaves,
                approvalRate: this._round(approvalRate, 2),
                totalLeaveDaysTaken,
                averageLeaveDaysPerEmployee: this._round(averageLeaveDaysPerEmployee, 2)
            },
            byType,
            balanceTrends,
            upcomingLeaves,
            comparison: previousPeriod,
            chartData: {
                monthlyTrend: await this._getMonthlyLeaveTrend(firmId, lawyerId, dateRange),
                byType: {
                    labels: byType.map(t => t.leaveTypeName),
                    datasets: [{
                        label: 'Leave Days',
                        data: byType.map(t => t.totalDays)
                    }]
                },
                approvalRate: {
                    labels: ['Approved', 'Rejected', 'Pending'],
                    datasets: [{
                        label: 'Count',
                        data: [approvedLeaves, rejectedLeaves, pendingLeaves]
                    }]
                }
            }
        };
    }

    /**
     * 5. ATTENDANCE ANALYTICS
     */
    static async getAttendanceAnalytics(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const dateRange = this._getDateRange(filters);

        const query = {
            ...baseQuery,
            date: { $gte: dateRange.startDate, $lte: dateRange.endDate },
            ...(filters.department && { department: filters.department })
        };

        // Get all attendance records
        const records = await AttendanceRecord.find(query).lean();

        const totalAttendanceRecords = records.length;
        const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
        const absentDays = records.filter(r => r.status === 'absent').length;

        const totalEmployees = await Employee.countDocuments({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        });

        const workingDays = this._getWorkingDays(dateRange.startDate, dateRange.endDate);
        const expectedAttendance = totalEmployees * workingDays;
        const attendanceRate = expectedAttendance > 0 ? (presentDays / expectedAttendance) * 100 : 0;

        // Punctuality metrics
        const lateArrivals = records.filter(r => r.lateArrival?.isLate).length;
        const onTimeArrivals = presentDays - lateArrivals;
        const lateArrivalRate = presentDays > 0 ? (lateArrivals / presentDays) * 100 : 0;

        const lateMinutes = records
            .filter(r => r.lateArrival?.isLate)
            .map(r => r.lateArrival?.lateBy || 0);
        const averageLateMinutes = this._calculateAverage(lateMinutes);

        const earlyDepartures = records.filter(r => r.earlyDeparture?.isEarly).length;
        const earlyDepartureRate = presentDays > 0 ? (earlyDepartures / presentDays) * 100 : 0;

        // Working hours analysis
        const totalHours = records.reduce((sum, r) => sum + (r.hours?.net || 0), 0);
        const averageHoursPerDay = records.length > 0 ? totalHours / records.length : 0;
        const averageHoursPerEmployee = totalEmployees > 0 ? totalHours / totalEmployees : 0;

        const regularHours = records.reduce((sum, r) => sum + (r.hours?.regular || 0), 0);
        const overtimeHours = records.reduce((sum, r) => sum + (r.hours?.overtime || 0), 0);
        const overtimeRate = regularHours > 0 ? (overtimeHours / regularHours) * 100 : 0;

        // Overtime analysis
        const recordsWithOvertime = records.filter(r => (r.hours?.overtime || 0) > 0);
        const totalOvertimeCost = await this._calculateOvertimeCost(recordsWithOvertime);

        // Compliance
        const missedCheckIns = records.filter(r => !r.checkIn?.time).length;
        const missedCheckOuts = records.filter(r => r.checkIn?.time && !r.checkOut?.time).length;
        const violationCount = records.reduce((sum, r) => sum + (r.violationSummary?.totalViolations || 0), 0);
        const complianceRate = totalAttendanceRecords > 0 ?
            ((totalAttendanceRecords - violationCount) / totalAttendanceRecords) * 100 : 100;

        // Average check-in/check-out times
        const checkInTimes = records
            .filter(r => r.checkIn?.time)
            .map(r => this._getTimeInMinutes(new Date(r.checkIn.time)));
        const averageCheckInTime = this._minutesToTimeString(this._calculateAverage(checkInTimes));

        const checkOutTimes = records
            .filter(r => r.checkOut?.time)
            .map(r => this._getTimeInMinutes(new Date(r.checkOut.time)));
        const averageCheckOutTime = this._minutesToTimeString(this._calculateAverage(checkOutTimes));

        // Get comparison data
        const previousPeriod = await this._getPreviousPeriodComparison(
            firmId,
            lawyerId,
            'attendance',
            filters
        );

        return {
            summary: {
                attendanceRate: this._round(attendanceRate, 2),
                totalAttendanceRecords,
                presentDays,
                absentDays,
                lateArrivalRate: this._round(lateArrivalRate, 2),
                averageHoursPerEmployee: this._round(averageHoursPerEmployee, 2)
            },
            punctuality: {
                onTimeArrivals,
                lateArrivals,
                lateArrivalRate: this._round(lateArrivalRate, 2),
                averageLateMinutes: this._round(averageLateMinutes, 2),
                earlyDepartures,
                earlyDepartureRate: this._round(earlyDepartureRate, 2)
            },
            workingHours: {
                totalHours: this._round(totalHours, 2),
                averageHoursPerEmployee: this._round(averageHoursPerEmployee, 2),
                averageHoursPerDay: this._round(averageHoursPerDay, 2),
                regularHours: this._round(regularHours, 2),
                overtimeHours: this._round(overtimeHours, 2),
                overtimeRate: this._round(overtimeRate, 2)
            },
            overtime: {
                totalOvertimeHours: this._round(overtimeHours, 2),
                totalOvertimeCost: this._round(totalOvertimeCost, 2),
                employeesWithOvertime: recordsWithOvertime.length,
                averageOvertimePerEmployee: recordsWithOvertime.length > 0 ?
                    this._round(overtimeHours / recordsWithOvertime.length, 2) : 0
            },
            compliance: {
                missedCheckIns,
                missedCheckOuts,
                violationCount,
                complianceRate: this._round(complianceRate, 2)
            },
            averageTimes: {
                averageCheckInTime,
                averageCheckOutTime
            },
            comparison: previousPeriod,
            chartData: {
                dailyAttendance: await this._getDailyAttendanceTrend(firmId, lawyerId, dateRange),
                punctuality: {
                    labels: ['On Time', 'Late'],
                    datasets: [{
                        label: 'Count',
                        data: [onTimeArrivals, lateArrivals]
                    }]
                },
                overtimeTrend: await this._getOvertimeTrend(firmId, lawyerId, dateRange)
            }
        };
    }

    /**
     * 6. PERFORMANCE ANALYTICS
     */
    static async getPerformanceAnalytics(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const dateRange = this._getDateRange(filters);

        const query = {
            ...baseQuery,
            'reviewPeriod.startDate': { $gte: dateRange.startDate, $lte: dateRange.endDate },
            ...(filters.department && { department: filters.department })
        };

        // Get all performance reviews
        const reviews = await PerformanceReview.find(query).lean();

        const totalReviews = reviews.length;
        const completedReviews = reviews.filter(r => r.status === 'completed' || r.status === 'acknowledged').length;
        const pendingReviews = reviews.filter(r => r.status !== 'completed' && r.status !== 'acknowledged').length;

        const today = new Date();
        const overdueReviews = reviews.filter(r => {
            const dueDate = new Date(r.reviewPeriod?.reviewDueDate || r.dueDate);
            return (r.status !== 'completed' && r.status !== 'acknowledged') && dueDate < today;
        }).length;

        const completionRate = totalReviews > 0 ? (completedReviews / totalReviews) * 100 : 0;

        // Rating distribution
        const completedReviewsData = reviews.filter(r => r.status === 'completed' || r.status === 'acknowledged');
        const ratingDistribution = {
            exceptional: completedReviewsData.filter(r => r.finalRating === 'exceptional').length,
            exceedsExpectations: completedReviewsData.filter(r => r.finalRating === 'exceeds_expectations').length,
            meetsExpectations: completedReviewsData.filter(r => r.finalRating === 'meets_expectations').length,
            needsImprovement: completedReviewsData.filter(r => r.finalRating === 'needs_improvement').length,
            unsatisfactory: completedReviewsData.filter(r => r.finalRating === 'unsatisfactory').length
        };

        // Average scores
        const scores = completedReviewsData.filter(r => r.overallScore).map(r => r.overallScore);
        const averageOverallScore = this._calculateAverage(scores);

        const competencyScores = completedReviewsData
            .filter(r => r.scores?.competencyAverage)
            .map(r => r.scores.competencyAverage);
        const averageCompetencyScore = this._calculateAverage(competencyScores);

        const goalsScores = completedReviewsData
            .filter(r => r.scores?.goalsAverage)
            .map(r => r.scores.goalsAverage);
        const averageGoalsScore = this._calculateAverage(goalsScores);

        // By department
        const byDepartment = this._groupPerformanceByDepartment(completedReviewsData);

        // High/Low performers
        const highPerformers = completedReviewsData.filter(r => r.overallScore >= 4).length;
        const lowPerformers = completedReviewsData.filter(r => r.overallScore < 2.5).length;

        // Goal achievement
        const allGoals = completedReviewsData.flatMap(r => r.goals || []);
        const achievedGoals = allGoals.filter(g => g.status === 'completed' || g.status === 'exceeded').length;
        const goalAchievementRate = allGoals.length > 0 ? (achievedGoals / allGoals.length) * 100 : 0;

        // Get comparison data
        const previousPeriod = await this._getPreviousPeriodComparison(
            firmId,
            lawyerId,
            'performance',
            filters
        );

        return {
            summary: {
                totalReviews,
                completedReviews,
                pendingReviews,
                overdueReviews,
                completionRate: this._round(completionRate, 2),
                averageScore: this._round(averageOverallScore, 2)
            },
            ratingDistribution,
            averageScores: {
                overall: this._round(averageOverallScore, 2),
                competency: this._round(averageCompetencyScore, 2),
                goals: this._round(averageGoalsScore, 2)
            },
            byDepartment,
            performers: {
                highPerformers,
                lowPerformers,
                highPerformerPercentage: completedReviewsData.length > 0 ?
                    this._round((highPerformers / completedReviewsData.length) * 100, 2) : 0,
                lowPerformerPercentage: completedReviewsData.length > 0 ?
                    this._round((lowPerformers / completedReviewsData.length) * 100, 2) : 0
            },
            goalMetrics: {
                totalGoals: allGoals.length,
                achievedGoals,
                goalAchievementRate: this._round(goalAchievementRate, 2)
            },
            comparison: previousPeriod,
            chartData: {
                ratingDistribution: {
                    labels: ['Exceptional', 'Exceeds', 'Meets', 'Needs Improvement', 'Unsatisfactory'],
                    datasets: [{
                        label: 'Count',
                        data: [
                            ratingDistribution.exceptional,
                            ratingDistribution.exceedsExpectations,
                            ratingDistribution.meetsExpectations,
                            ratingDistribution.needsImprovement,
                            ratingDistribution.unsatisfactory
                        ]
                    }]
                },
                departmentComparison: {
                    labels: byDepartment.map(d => d.department),
                    datasets: [{
                        label: 'Average Score',
                        data: byDepartment.map(d => d.averageScore)
                    }]
                }
            }
        };
    }

    /**
     * 7. RECRUITMENT ANALYTICS
     */
    static async getRecruitmentAnalytics(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const dateRange = this._getDateRange(filters);

        // Get new hires in period
        const newHires = await Employee.find({
            ...baseQuery,
            'employment.hireDate': {
                $gte: dateRange.startDate,
                $lte: dateRange.endDate
            }
        }).lean();

        const totalNewHires = newHires.length;

        // Calculate time to hire (from creation to hire)
        const timeToHireData = newHires
            .filter(e => e.employment?.hireDate && e.createdAt)
            .map(e => {
                const created = new Date(e.createdAt);
                const hired = new Date(e.employment.hireDate);
                return (hired - created) / (1000 * 60 * 60 * 24); // days
            });

        const averageTimeToHire = this._calculateAverage(timeToHireData);
        const medianTimeToHire = this._calculateMedian(timeToHireData);

        // Estimated cost per hire (industry average: 1.5x monthly salary)
        const avgSalary = this._calculateAverage(newHires.map(e => e.compensation?.basicSalary || 0));
        const costPerHire = avgSalary * 1.5;
        const totalRecruitmentCost = costPerHire * totalNewHires;

        // Source effectiveness (if tracked)
        // Note: This would require additional fields in Employee model
        const sourceEffectiveness = [
            { source: 'LinkedIn', applications: 0, hires: 0, conversionRate: 0, costPerHire: 0 },
            { source: 'Indeed', applications: 0, hires: 0, conversionRate: 0, costPerHire: 0 },
            { source: 'Referral', applications: 0, hires: 0, conversionRate: 0, costPerHire: 0 },
            { source: 'Direct', applications: 0, hires: 0, conversionRate: 0, costPerHire: 0 }
        ];

        // Quality of hire (retention after 90 days and 1 year)
        const hires90DaysAgo = await Employee.find({
            ...baseQuery,
            'employment.hireDate': {
                $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                $lte: new Date()
            }
        });

        const stillEmployedAfter90Days = hires90DaysAgo.filter(
            e => e.employment?.employmentStatus === 'active'
        ).length;
        const retentionRateAfter90Days = hires90DaysAgo.length > 0 ?
            (stillEmployedAfter90Days / hires90DaysAgo.length) * 100 : 0;

        // Get comparison data
        const previousPeriod = await this._getPreviousPeriodComparison(
            firmId,
            lawyerId,
            'recruitment',
            filters
        );

        return {
            summary: {
                totalNewHires,
                averageTimeToHire: this._round(averageTimeToHire, 2),
                medianTimeToHire: this._round(medianTimeToHire, 2),
                costPerHire: this._round(costPerHire, 2),
                totalRecruitmentCost: this._round(totalRecruitmentCost, 2)
            },
            timeToHire: {
                average: this._round(averageTimeToHire, 2),
                median: this._round(medianTimeToHire, 2),
                min: Math.min(...timeToHireData, 0),
                max: Math.max(...timeToHireData, 0)
            },
            costBreakdown: {
                totalCost: this._round(totalRecruitmentCost, 2),
                averageCostPerHire: this._round(costPerHire, 2),
                estimatedAdvertisingCost: this._round(totalRecruitmentCost * 0.3, 2),
                estimatedAgencyFees: this._round(totalRecruitmentCost * 0.4, 2),
                estimatedInternalCosts: this._round(totalRecruitmentCost * 0.3, 2)
            },
            sourceEffectiveness,
            qualityOfHire: {
                retentionRateAfter90Days: this._round(retentionRateAfter90Days, 2),
                stillEmployedAfter90Days,
                totalHires90DaysAgo: hires90DaysAgo.length
            },
            byDepartment: this._groupNewHiresByDepartment(newHires),
            comparison: previousPeriod,
            chartData: {
                monthlyHires: await this._getMonthlyHiresTrend(firmId, lawyerId, dateRange),
                timeToHire: {
                    labels: ['0-30 days', '31-60 days', '61-90 days', '90+ days'],
                    datasets: [{
                        label: 'Hires',
                        data: this._groupTimeToHire(timeToHireData)
                    }]
                }
            }
        };
    }

    /**
     * 8. COMPENSATION ANALYTICS
     */
    static async getCompensationAnalytics(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };

        const employees = await Employee.find({
            ...baseQuery,
            'employment.employmentStatus': 'active',
            ...(filters.department && { 'organization.departmentName': filters.department })
        }).lean();

        const salaries = employees.map(e => e.compensation?.basicSalary || 0);
        const averageSalary = this._calculateAverage(salaries);
        const medianSalary = this._calculateMedian(salaries);
        const totalPayroll = salaries.reduce((sum, s) => sum + s, 0);

        // Salary range
        const salaryRange = {
            min: Math.min(...salaries),
            max: Math.max(...salaries),
            q1: this._calculatePercentile(salaries, 25),
            q3: this._calculatePercentile(salaries, 75)
        };

        // Salary distribution
        const salaryDistribution = this._calculateSalaryDistribution(salaries);

        // By department
        const byDepartment = this._groupSalaryByDepartment(employees);

        // Pay equity analysis
        const maleEmployees = employees.filter(e => e.personalInfo?.gender === 'male');
        const femaleEmployees = employees.filter(e => e.personalInfo?.gender === 'female');
        const maleAverageSalary = this._calculateAverage(maleEmployees.map(e => e.compensation?.basicSalary || 0));
        const femaleAverageSalary = this._calculateAverage(femaleEmployees.map(e => e.compensation?.basicSalary || 0));
        const genderPayGap = maleAverageSalary > 0 ?
            ((maleAverageSalary - femaleAverageSalary) / maleAverageSalary) * 100 : 0;

        // Saudi vs Non-Saudi
        const saudiEmployees = employees.filter(e => e.personalInfo?.isSaudi);
        const nonSaudiEmployees = employees.filter(e => !e.personalInfo?.isSaudi);
        const saudiAverageSalary = this._calculateAverage(saudiEmployees.map(e => e.compensation?.basicSalary || 0));
        const nonSaudiAverageSalary = this._calculateAverage(nonSaudiEmployees.map(e => e.compensation?.basicSalary || 0));
        const nationalityPayGap = saudiAverageSalary > 0 ?
            ((saudiAverageSalary - nonSaudiAverageSalary) / saudiAverageSalary) * 100 : 0;

        // GOSI contributions
        const totalEmployeeContributions = employees.reduce((sum, e) => {
            if (!e.gosi?.registered) return sum;
            return sum + ((e.compensation?.basicSalary || 0) * ((e.gosi?.employeeContribution || 0) / 100));
        }, 0);

        const totalEmployerContributions = employees.reduce((sum, e) => {
            if (!e.gosi?.registered) return sum;
            return sum + ((e.compensation?.basicSalary || 0) * ((e.gosi?.employerContribution || 0) / 100));
        }, 0);

        // Get comparison data
        const previousPeriod = await this._getPreviousPeriodComparison(
            firmId,
            lawyerId,
            'compensation',
            filters
        );

        return {
            summary: {
                totalPayroll: this._round(totalPayroll, 2),
                averageSalary: this._round(averageSalary, 2),
                medianSalary: this._round(medianSalary, 2),
                totalEmployees: employees.length
            },
            salaryRange,
            salaryDistribution,
            byDepartment,
            payEquity: {
                genderPayGap: this._round(genderPayGap, 2),
                maleAverageSalary: this._round(maleAverageSalary, 2),
                femaleAverageSalary: this._round(femaleAverageSalary, 2),
                maleCount: maleEmployees.length,
                femaleCount: femaleEmployees.length,
                nationalityPayGap: this._round(nationalityPayGap, 2),
                saudiAverageSalary: this._round(saudiAverageSalary, 2),
                nonSaudiAverageSalary: this._round(nonSaudiAverageSalary, 2),
                saudiCount: saudiEmployees.length,
                nonSaudiCount: nonSaudiEmployees.length
            },
            gosiContributions: {
                totalEmployeeContributions: this._round(totalEmployeeContributions, 2),
                totalEmployerContributions: this._round(totalEmployerContributions, 2),
                totalContributions: this._round(totalEmployeeContributions + totalEmployerContributions, 2)
            },
            comparison: previousPeriod,
            chartData: {
                salaryDistribution: {
                    labels: salaryDistribution.map(d => d.range),
                    datasets: [{
                        label: 'Employees',
                        data: salaryDistribution.map(d => d.count)
                    }]
                },
                departmentComparison: {
                    labels: byDepartment.map(d => d.department),
                    datasets: [{
                        label: 'Average Salary',
                        data: byDepartment.map(d => d.averageSalary)
                    }]
                }
            }
        };
    }

    /**
     * 9. TRAINING ANALYTICS
     */
    static async getTrainingAnalytics(firmId, lawyerId, filters = {}) {
        const baseQuery = filters?.isSoloLawyer ? { lawyerId } : { firmId };
        const dateRange = this._getDateRange(filters);

        // Note: This assumes a Training model exists
        // If not, return placeholder data
        const Training = mongoose.models.Training;
        if (!Training) {
            return {
                summary: {
                    message: 'Training analytics require Training model to be implemented'
                },
                chartData: {}
            };
        }

        const trainings = await Training.find({
            ...baseQuery,
            startDate: { $gte: dateRange.startDate, $lte: dateRange.endDate }
        }).lean();

        const totalPrograms = trainings.length;
        const activePrograms = trainings.filter(t => t.status === 'active' || t.status === 'in_progress').length;
        const completedPrograms = trainings.filter(t => t.status === 'completed').length;

        // Calculate participation
        const allParticipants = trainings.flatMap(t => t.participants || []);
        const uniqueEmployees = [...new Set(allParticipants.map(p => p.employeeId?.toString()))];

        const totalEmployees = await Employee.countDocuments({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        });

        const participationRate = totalEmployees > 0 ? (uniqueEmployees.length / totalEmployees) * 100 : 0;

        return {
            summary: {
                totalPrograms,
                activePrograms,
                completedPrograms,
                totalParticipants: allParticipants.length,
                uniqueEmployeesTrained: uniqueEmployees.length,
                participationRate: this._round(participationRate, 2)
            },
            chartData: {}
        };
    }

    /**
     * SAUDIZATION COMPLIANCE
     */
    static async getSaudizationCompliance(firmId, lawyerId, options = {}) {
        const baseQuery = options?.isSoloLawyer ? { lawyerId } : { firmId };

        const employees = await Employee.find({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        }).lean();

        const totalEmployees = employees.length;
        const saudiEmployees = employees.filter(e => e.personalInfo?.isSaudi).length;
        const nonSaudiEmployees = totalEmployees - saudiEmployees;

        const saudiPercentage = totalEmployees > 0 ? (saudiEmployees / totalEmployees) * 100 : 0;
        const nonSaudiPercentage = 100 - saudiPercentage;

        // Nitaqat compliance (assuming 50% target for green zone)
        const complianceTarget = 50;
        const greenZoneMin = 50;

        let complianceStatus = 'compliant';
        if (saudiPercentage < greenZoneMin - 10) {
            complianceStatus = 'non_compliant';
        } else if (saudiPercentage < greenZoneMin) {
            complianceStatus = 'at_risk';
        }

        return {
            totalEmployees,
            saudiEmployees,
            nonSaudiEmployees,
            saudiPercentage: this._round(saudiPercentage, 2),
            nonSaudiPercentage: this._round(nonSaudiPercentage, 2),
            complianceTarget,
            greenZoneMin,
            complianceStatus,
            gapToCompliance: Math.max(0, greenZoneMin - saudiPercentage),
            employeesNeeded: Math.max(0, Math.ceil((greenZoneMin * totalEmployees / 100) - saudiEmployees))
        };
    }

    /**
     * TAKE SNAPSHOT
     */
    static async takeSnapshot(firmId, lawyerId, snapshotType = 'monthly') {
        const startTime = Date.now();

        const [
            demographics,
            turnover,
            absenteeism,
            leave,
            attendance,
            performance,
            recruitment,
            compensation,
            training
        ] = await Promise.all([
            this.getWorkforceDemographics(firmId, lawyerId),
            this.getTurnoverAnalysis(firmId, lawyerId),
            this.getAbsenteeismMetrics(firmId, lawyerId),
            this.getLeaveAnalytics(firmId, lawyerId),
            this.getAttendanceAnalytics(firmId, lawyerId),
            this.getPerformanceAnalytics(firmId, lawyerId),
            this.getRecruitmentAnalytics(firmId, lawyerId),
            this.getCompensationAnalytics(firmId, lawyerId),
            this.getTrainingAnalytics(firmId, lawyerId)
        ]);

        const snapshot = new HRAnalyticsSnapshot({
            firmId,
            lawyerId,
            snapshotType,
            snapshotDate: new Date(),
            period: this._getCurrentPeriod(),
            demographics: demographics.summary,
            turnover: turnover.summary,
            absenteeism: absenteeism.summary,
            leave: leave.summary,
            attendance: attendance.summary,
            performance: performance.summary,
            recruitment: recruitment.summary,
            compensation: compensation.summary,
            training: training.summary,
            metadata: {
                generatedAt: new Date(),
                generationDuration: Date.now() - startTime
            }
        });

        await snapshot.save();
        return snapshot;
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    static _getDateRange(filters) {
        if (filters.startDate && filters.endDate) {
            return {
                startDate: new Date(filters.startDate),
                endDate: new Date(filters.endDate)
            };
        }

        // Default: current month
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        return { startDate, endDate };
    }

    static _getCurrentPeriod() {
        const now = new Date();
        return {
            startDate: new Date(now.getFullYear(), now.getMonth(), 1),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
            year: now.getFullYear(),
            quarter: Math.floor(now.getMonth() / 3) + 1,
            month: now.getMonth() + 1,
            week: Math.ceil(now.getDate() / 7)
        };
    }

    static _getAge(dateOfBirth) {
        if (!dateOfBirth) return null;
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    static _calculateAverage(numbers) {
        const validNumbers = numbers.filter(n => n != null && !isNaN(n));
        if (validNumbers.length === 0) return 0;
        return validNumbers.reduce((sum, n) => sum + n, 0) / validNumbers.length;
    }

    static _calculateMedian(numbers) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }

    static _calculatePercentile(numbers, percentile) {
        const sorted = [...numbers].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }

    static _round(number, decimals = 2) {
        return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    static _getWorkingDays(startDate, endDate) {
        let count = 0;
        const current = new Date(startDate);
        while (current <= endDate) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 5 && dayOfWeek !== 6) { // Not Friday or Saturday
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
        return count;
    }

    static _getTimeInMinutes(date) {
        return date.getHours() * 60 + date.getMinutes();
    }

    static _minutesToTimeString(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = Math.floor(minutes % 60);
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    static _calculateAgeDistribution(employees) {
        const ranges = [
            { range: '18-25', min: 18, max: 25, count: 0 },
            { range: '26-35', min: 26, max: 35, count: 0 },
            { range: '36-45', min: 36, max: 45, count: 0 },
            { range: '46-55', min: 46, max: 55, count: 0 },
            { range: '56+', min: 56, max: 999, count: 0 }
        ];

        employees.forEach(e => {
            const age = this._getAge(e.personalInfo?.dateOfBirth);
            if (age) {
                const range = ranges.find(r => age >= r.min && age <= r.max);
                if (range) range.count++;
            }
        });

        const total = employees.length;
        return ranges.map(r => ({
            range: r.range,
            count: r.count,
            percentage: total > 0 ? this._round((r.count / total) * 100, 1) : 0
        }));
    }

    static _calculateGenderBreakdown(employees) {
        const male = employees.filter(e => e.personalInfo?.gender === 'male').length;
        const female = employees.filter(e => e.personalInfo?.gender === 'female').length;
        const total = employees.length;

        return {
            male,
            female,
            malePercentage: total > 0 ? this._round((male / total) * 100, 1) : 0,
            femalePercentage: total > 0 ? this._round((female / total) * 100, 1) : 0
        };
    }

    static _calculateDepartmentDistribution(employees) {
        const departments = {};
        employees.forEach(e => {
            const dept = e.organization?.departmentName || e.employment?.departmentName || 'Unassigned';
            departments[dept] = (departments[dept] || 0) + 1;
        });

        const total = employees.length;
        return Object.entries(departments).map(([department, count]) => ({
            department,
            count,
            percentage: total > 0 ? this._round((count / total) * 100, 1) : 0
        }));
    }

    static _calculateTenureDistribution(employees) {
        const ranges = [
            { range: '0-1 year', min: 0, max: 1, count: 0 },
            { range: '1-3 years', min: 1, max: 3, count: 0 },
            { range: '3-5 years', min: 3, max: 5, count: 0 },
            { range: '5-10 years', min: 5, max: 10, count: 0 },
            { range: '10+ years', min: 10, max: 999, count: 0 }
        ];

        employees.forEach(e => {
            const tenure = e.yearsOfService || 0;
            const range = ranges.find(r => tenure >= r.min && tenure < r.max);
            if (range) range.count++;
        });

        const total = employees.length;
        return ranges.map(r => ({
            range: r.range,
            count: r.count,
            percentage: total > 0 ? this._round((r.count / total) * 100, 1) : 0
        }));
    }

    static _calculateNationalityBreakdown(employees) {
        const nationalities = {};
        employees.forEach(e => {
            const nationality = e.personalInfo?.nationality || 'Unknown';
            nationalities[nationality] = (nationalities[nationality] || 0) + 1;
        });

        const total = employees.length;
        return Object.entries(nationalities)
            .map(([nationality, count]) => ({
                nationality,
                count,
                percentage: total > 0 ? this._round((count / total) * 100, 1) : 0
            }))
            .sort((a, b) => b.count - a.count);
    }

    static _calculateSaudizationRatio(employees) {
        const totalSaudis = employees.filter(e => e.personalInfo?.isSaudi).length;
        const totalNonSaudis = employees.length - totalSaudis;
        const saudiPercentage = employees.length > 0 ? (totalSaudis / employees.length) * 100 : 0;

        const complianceTarget = 50;
        const greenZoneMin = 50;

        let complianceStatus = 'compliant';
        if (saudiPercentage < greenZoneMin - 10) {
            complianceStatus = 'non_compliant';
        } else if (saudiPercentage < greenZoneMin) {
            complianceStatus = 'at_risk';
        }

        return {
            totalSaudis,
            totalNonSaudis,
            saudiPercentage: this._round(saudiPercentage, 2),
            nonSaudiPercentage: this._round(100 - saudiPercentage, 2),
            complianceTarget,
            greenZoneMin,
            complianceStatus,
            actualRatio: this._round(saudiPercentage, 2)
        };
    }

    static _calculateEmploymentTypeBreakdown(employees) {
        return {
            fullTime: employees.filter(e => e.employment?.employmentType === 'full_time').length,
            partTime: employees.filter(e => e.employment?.employmentType === 'part_time').length,
            contract: employees.filter(e => e.employment?.employmentType === 'contract').length,
            temporary: employees.filter(e => e.employment?.employmentType === 'temporary').length
        };
    }

    static _groupByDepartment(employees, totalHeadcount) {
        const departments = {};
        employees.forEach(e => {
            const dept = e.organization?.departmentName || e.employment?.departmentName || 'Unassigned';
            if (!departments[dept]) {
                departments[dept] = { count: 0, headcount: 0 };
            }
            departments[dept].count++;
        });

        return Object.entries(departments).map(([department, data]) => ({
            department,
            separations: data.count,
            headcount: data.headcount || 1,
            turnoverRate: this._round((data.count / (data.headcount || 1)) * 100, 2)
        }));
    }

    static _calculateTurnoverByTenure(separations) {
        const ranges = [
            { tenureRange: '0-1 year', min: 0, max: 1, count: 0 },
            { tenureRange: '1-3 years', min: 1, max: 3, count: 0 },
            { tenureRange: '3-5 years', min: 3, max: 5, count: 0 },
            { tenureRange: '5+ years', min: 5, max: 999, count: 0 }
        ];

        separations.forEach(e => {
            const tenure = e.yearsOfService || 0;
            const range = ranges.find(r => tenure >= r.min && tenure < r.max);
            if (range) range.count++;
        });

        const total = separations.length;
        return ranges.map(r => ({
            tenureRange: r.tenureRange,
            count: r.count,
            percentage: total > 0 ? this._round((r.count / total) * 100, 1) : 0
        }));
    }

    static _analyzeAbsencePatterns(absences) {
        const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
        let mondayAbsences = 0;
        let fridayAbsences = 0;

        absences.forEach(a => {
            const dayOfWeek = new Date(a.date).getDay();
            byDayOfWeek[dayOfWeek]++;
            if (dayOfWeek === 1) mondayAbsences++; // Monday
            if (dayOfWeek === 5) fridayAbsences++; // Friday
        });

        const weekendAdjacent = mondayAbsences + fridayAbsences;

        return {
            mondayAbsences,
            fridayAbsences,
            weekendAdjacent,
            byDayOfWeek: byDayOfWeek.slice(0, 5) // Mon-Fri
        };
    }

    static async _getAbsencesByDepartment(absences, expectedWorkingDays) {
        const departments = {};
        absences.forEach(a => {
            const dept = a.department || 'Unassigned';
            departments[dept] = (departments[dept] || 0) + 1;
        });

        return Object.entries(departments).map(([department, count]) => ({
            department,
            absences: count,
            absenceRate: expectedWorkingDays > 0 ?
                this._round((count / expectedWorkingDays) * 100, 2) : 0
        }));
    }

    static _groupLeavesByType(leaves) {
        const byType = {};
        leaves.forEach(l => {
            const type = l.leaveType;
            if (!byType[type]) {
                byType[type] = {
                    leaveType: type,
                    leaveTypeName: l.leaveTypeName,
                    leaveTypeNameAr: l.leaveTypeNameAr,
                    count: 0,
                    totalDays: 0
                };
            }
            byType[type].count++;
            byType[type].totalDays += l.dates?.workingDays || 0;
        });

        return Object.values(byType).map(t => ({
            ...t,
            averageDuration: t.count > 0 ? this._round(t.totalDays / t.count, 1) : 0
        }));
    }

    static async _calculateLeaveBalanceTrends(firmId, lawyerId) {
        // This would require a LeaveBalance model
        return {
            totalEntitlement: 0,
            totalUsed: 0,
            totalRemaining: 0,
            utilizationRate: 0,
            averageBalance: 0
        };
    }

    static async _calculateOvertimeCost(records) {
        // Simplified: assume 1.5x hourly rate for overtime
        let totalCost = 0;
        for (const record of records) {
            const employee = await Employee.findById(record.employeeId).lean();
            if (employee) {
                const hourlyRate = (employee.compensation?.basicSalary || 0) / 160; // ~20 working days * 8 hours
                const overtimeHours = record.hours?.overtime || 0;
                totalCost += hourlyRate * overtimeHours * 1.5;
            }
        }
        return totalCost;
    }

    static _groupPerformanceByDepartment(reviews) {
        const departments = {};
        reviews.forEach(r => {
            const dept = r.department || 'Unassigned';
            if (!departments[dept]) {
                departments[dept] = { scores: [], topPerformers: 0, lowPerformers: 0 };
            }
            if (r.overallScore) {
                departments[dept].scores.push(r.overallScore);
                if (r.overallScore >= 4) departments[dept].topPerformers++;
                if (r.overallScore < 2.5) departments[dept].lowPerformers++;
            }
        });

        return Object.entries(departments).map(([department, data]) => ({
            department,
            averageScore: this._round(this._calculateAverage(data.scores), 2),
            reviewsCompleted: data.scores.length,
            topPerformers: data.topPerformers,
            lowPerformers: data.lowPerformers
        }));
    }

    static _groupNewHiresByDepartment(newHires) {
        const departments = {};
        newHires.forEach(e => {
            const dept = e.organization?.departmentName || e.employment?.departmentName || 'Unassigned';
            departments[dept] = (departments[dept] || 0) + 1;
        });

        return Object.entries(departments).map(([department, count]) => ({
            department,
            hires: count
        }));
    }

    static _groupTimeToHire(timeToHireData) {
        const ranges = [0, 0, 0, 0]; // 0-30, 31-60, 61-90, 90+
        timeToHireData.forEach(days => {
            if (days <= 30) ranges[0]++;
            else if (days <= 60) ranges[1]++;
            else if (days <= 90) ranges[2]++;
            else ranges[3]++;
        });
        return ranges;
    }

    static _calculateSalaryDistribution(salaries) {
        const ranges = [
            { range: '0-5,000', min: 0, max: 5000, count: 0 },
            { range: '5,001-10,000', min: 5001, max: 10000, count: 0 },
            { range: '10,001-15,000', min: 10001, max: 15000, count: 0 },
            { range: '15,001-20,000', min: 15001, max: 20000, count: 0 },
            { range: '20,001+', min: 20001, max: 999999, count: 0 }
        ];

        salaries.forEach(s => {
            const range = ranges.find(r => s >= r.min && s <= r.max);
            if (range) range.count++;
        });

        const total = salaries.length;
        return ranges.map(r => ({
            range: r.range,
            count: r.count,
            percentage: total > 0 ? this._round((r.count / total) * 100, 1) : 0
        }));
    }

    static _groupSalaryByDepartment(employees) {
        const departments = {};
        employees.forEach(e => {
            const dept = e.organization?.departmentName || e.employment?.departmentName || 'Unassigned';
            if (!departments[dept]) {
                departments[dept] = { salaries: [], count: 0 };
            }
            departments[dept].salaries.push(e.compensation?.basicSalary || 0);
            departments[dept].count++;
        });

        return Object.entries(departments).map(([department, data]) => ({
            department,
            averageSalary: this._round(this._calculateAverage(data.salaries), 2),
            medianSalary: this._round(this._calculateMedian(data.salaries), 2),
            totalPayroll: this._round(data.salaries.reduce((sum, s) => sum + s, 0), 2),
            headcount: data.count
        }));
    }

    static async _getMonthlyTurnoverTrend(firmId, lawyerId, dateRange) {
        // Implementation for monthly trend chart data
        return [];
    }

    static async _getMonthlyAbsenteeismTrend(firmId, lawyerId, dateRange) {
        // Implementation for monthly trend chart data
        return [];
    }

    static async _getMonthlyLeaveTrend(firmId, lawyerId, dateRange) {
        // Implementation for monthly trend chart data
        return [];
    }

    static async _getDailyAttendanceTrend(firmId, lawyerId, dateRange) {
        // Implementation for daily trend chart data
        return [];
    }

    static async _getOvertimeTrend(firmId, lawyerId, dateRange) {
        // Implementation for overtime trend chart data
        return [];
    }

    static async _getMonthlyHiresTrend(firmId, lawyerId, dateRange) {
        // Implementation for monthly hires trend chart data
        return [];
    }

    static async _getPreviousPeriodComparison(firmId, lawyerId, metric, filters) {
        // Get previous period snapshot for comparison
        const previousSnapshot = await HRAnalyticsSnapshot.findOne({
            ...(filters?.isSoloLawyer ? { lawyerId } : { firmId }),
            snapshotType: 'monthly'
        }).sort({ snapshotDate: -1 }).skip(1);

        if (!previousSnapshot) return null;

        return {
            previousPeriod: previousSnapshot.snapshotDate,
            changes: {}
        };
    }
}

module.exports = HRAnalyticsService;
