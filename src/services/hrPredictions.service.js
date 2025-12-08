const Employee = require('../models/employee.model');
const AttendanceRecord = require('../models/attendanceRecord.model');
const LeaveRequest = require('../models/leaveRequest.model');
const PerformanceReview = require('../models/performanceReview.model');
const mongoose = require('mongoose');

/**
 * HR Predictions Service
 * AI-powered predictions for workforce planning and risk management
 * Uses statistical models and machine learning algorithms
 */

class HRPredictionsService {
    /**
     * 1. ATTRITION RISK SCORING (0-100)
     * Predicts likelihood of employee leaving based on multiple factors
     */
    static async getAttritionRiskScores(firmId, lawyerId, filters = {}) {
        const baseQuery = firmId ? { firmId } : { lawyerId };

        const employees = await Employee.find({
            ...baseQuery,
            'employment.employmentStatus': 'active',
            ...(filters.department && { 'organization.departmentName': filters.department })
        }).lean();

        const attritionScores = await Promise.all(
            employees.map(employee => this._calculateAttritionRisk(employee, firmId, lawyerId))
        );

        // Sort by risk score (highest first)
        attritionScores.sort((a, b) => b.riskScore - a.riskScore);

        // Categorize by risk level
        const highRisk = attritionScores.filter(s => s.riskScore >= 70);
        const mediumRisk = attritionScores.filter(s => s.riskScore >= 40 && s.riskScore < 70);
        const lowRisk = attritionScores.filter(s => s.riskScore < 40);

        return {
            summary: {
                totalEmployees: employees.length,
                highRiskCount: highRisk.length,
                mediumRiskCount: mediumRisk.length,
                lowRiskCount: lowRisk.length,
                averageRiskScore: this._calculateAverage(attritionScores.map(s => s.riskScore))
            },
            highRiskEmployees: highRisk.slice(0, 20), // Top 20 high-risk
            riskDistribution: {
                high: highRisk.length,
                medium: mediumRisk.length,
                low: lowRisk.length
            },
            allScores: attritionScores,
            chartData: {
                riskDistribution: {
                    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                    datasets: [{
                        label: 'Employees',
                        data: [highRisk.length, mediumRisk.length, lowRisk.length]
                    }]
                }
            }
        };
    }

    /**
     * Get individual employee attrition risk
     */
    static async getEmployeeAttritionRisk(firmId, lawyerId, employeeId) {
        const employee = await Employee.findOne({
            _id: employeeId,
            ...(firmId ? { firmId } : { lawyerId })
        }).lean();

        if (!employee) {
            throw new Error('Employee not found');
        }

        const riskAnalysis = await this._calculateAttritionRisk(employee, firmId, lawyerId);

        // Get similar employees who left
        const similarDepartures = await this._findSimilarDepartures(employee, firmId, lawyerId);

        // Suggested interventions
        const interventions = this._suggestRetentionInterventions(riskAnalysis);

        return {
            employee: {
                id: employee._id,
                name: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
                department: employee.organization?.departmentName,
                position: employee.employment?.jobTitle,
                tenure: employee.yearsOfService
            },
            riskAnalysis,
            similarDepartures,
            interventions,
            timeline: this._predictDepartureTimeline(riskAnalysis.riskScore)
        };
    }

    /**
     * Calculate attrition risk for an employee
     */
    static async _calculateAttritionRisk(employee, firmId, lawyerId) {
        const factors = [];
        let totalScore = 0;
        const weights = {
            tenure: 20,
            performance: 20,
            salary: 15,
            engagement: 15,
            absencePattern: 15,
            lastPromotion: 10,
            workload: 5
        };

        // 1. Tenure Factor (higher risk in first year and after 3-5 years)
        const tenure = employee.yearsOfService || 0;
        let tenureScore = 0;
        let tenureReason = '';

        if (tenure < 1) {
            tenureScore = 80; // Very high risk in first year
            tenureReason = 'New employee - high risk in first year';
        } else if (tenure >= 1 && tenure < 3) {
            tenureScore = 40;
            tenureReason = '1-3 years tenure - moderate risk';
        } else if (tenure >= 3 && tenure < 5) {
            tenureScore = 60; // Higher risk - seeking growth
            tenureReason = '3-5 years tenure - may seek new opportunities';
        } else if (tenure >= 5 && tenure < 10) {
            tenureScore = 30;
            tenureReason = '5-10 years tenure - stable';
        } else {
            tenureScore = 20;
            tenureReason = '10+ years tenure - very stable';
        }

        factors.push({
            factor: 'Tenure',
            score: tenureScore,
            weight: weights.tenure,
            weightedScore: (tenureScore * weights.tenure) / 100,
            reason: tenureReason,
            impact: tenureScore >= 60 ? 'high' : tenureScore >= 40 ? 'medium' : 'low'
        });

        totalScore += (tenureScore * weights.tenure) / 100;

        // 2. Performance Factor (low performance = higher risk)
        const recentReview = await PerformanceReview.findOne({
            employeeId: employee._id,
            status: { $in: ['completed', 'acknowledged'] }
        }).sort({ 'reviewPeriod.endDate': -1 }).lean();

        let performanceScore = 50; // Default
        let performanceReason = 'No recent performance review';

        if (recentReview) {
            const score = recentReview.overallScore || 3;
            if (score < 2) {
                performanceScore = 90; // Very high risk - poor performance
                performanceReason = 'Poor performance - may be terminated or leave';
            } else if (score < 3) {
                performanceScore = 70;
                performanceReason = 'Below average performance';
            } else if (score < 4) {
                performanceScore = 40;
                performanceReason = 'Average performance';
            } else if (score < 4.5) {
                performanceScore = 30;
                performanceReason = 'Good performance';
            } else {
                performanceScore = 20;
                performanceReason = 'Excellent performance - retention priority';
            }
        }

        factors.push({
            factor: 'Performance',
            score: performanceScore,
            weight: weights.performance,
            weightedScore: (performanceScore * weights.performance) / 100,
            reason: performanceReason,
            impact: performanceScore >= 70 ? 'high' : performanceScore >= 40 ? 'medium' : 'low'
        });

        totalScore += (performanceScore * weights.performance) / 100;

        // 3. Salary Factor (below market = higher risk)
        const salary = employee.compensation?.basicSalary || 0;
        const allEmployees = await Employee.find({
            ...(firmId ? { firmId } : { lawyerId }),
            'employment.employmentStatus': 'active',
            'employment.jobTitle': employee.employment?.jobTitle
        }).lean();

        const avgSalaryForPosition = allEmployees.length > 0 ?
            allEmployees.reduce((sum, e) => sum + (e.compensation?.basicSalary || 0), 0) / allEmployees.length :
            salary;

        const salaryRatio = avgSalaryForPosition > 0 ? salary / avgSalaryForPosition : 1;

        let salaryScore = 50;
        let salaryReason = '';

        if (salaryRatio < 0.8) {
            salaryScore = 90; // Significantly below market
            salaryReason = 'Salary significantly below market (80% or less)';
        } else if (salaryRatio < 0.9) {
            salaryScore = 70;
            salaryReason = 'Salary below market (80-90%)';
        } else if (salaryRatio < 1.0) {
            salaryScore = 50;
            salaryReason = 'Salary slightly below market';
        } else if (salaryRatio < 1.1) {
            salaryScore = 30;
            salaryReason = 'Salary at market rate';
        } else {
            salaryScore = 20;
            salaryReason = 'Salary above market';
        }

        factors.push({
            factor: 'Salary Competitiveness',
            score: salaryScore,
            weight: weights.salary,
            weightedScore: (salaryScore * weights.salary) / 100,
            reason: salaryReason,
            impact: salaryScore >= 70 ? 'high' : salaryScore >= 50 ? 'medium' : 'low',
            data: {
                currentSalary: salary,
                marketAverage: this._round(avgSalaryForPosition, 2),
                ratio: this._round(salaryRatio * 100, 1)
            }
        });

        totalScore += (salaryScore * weights.salary) / 100;

        // 4. Engagement Factor (estimated from various signals)
        let engagementScore = 50;
        let engagementReason = '';
        const engagementSignals = [];

        // Check for recent leave requests
        const recentLeaves = await LeaveRequest.countDocuments({
            employeeId: employee._id,
            createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        });

        if (recentLeaves > 3) {
            engagementSignals.push('Multiple leave requests recently');
        }

        // Check for low performance scores in recent review
        if (recentReview && recentReview.overallScore < 3) {
            engagementSignals.push('Low performance score');
        }

        // Estimate engagement score
        if (engagementSignals.length >= 2) {
            engagementScore = 80;
            engagementReason = 'Multiple disengagement signals: ' + engagementSignals.join(', ');
        } else if (engagementSignals.length === 1) {
            engagementScore = 60;
            engagementReason = 'Some disengagement signals: ' + engagementSignals.join(', ');
        } else {
            engagementScore = 30;
            engagementReason = 'No significant disengagement signals';
        }

        factors.push({
            factor: 'Engagement',
            score: engagementScore,
            weight: weights.engagement,
            weightedScore: (engagementScore * weights.engagement) / 100,
            reason: engagementReason,
            impact: engagementScore >= 70 ? 'high' : engagementScore >= 50 ? 'medium' : 'low'
        });

        totalScore += (engagementScore * weights.engagement) / 100;

        // 5. Absence Pattern Factor
        const absenceRecords = await AttendanceRecord.find({
            employeeId: employee._id,
            date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            'absence.isAbsent': true
        }).lean();

        const absenceCount = absenceRecords.length;
        let absenceScore = 50;
        let absenceReason = '';

        if (absenceCount > 10) {
            absenceScore = 85;
            absenceReason = 'Very high absence rate (10+ days in 90 days)';
        } else if (absenceCount > 5) {
            absenceScore = 65;
            absenceReason = 'High absence rate (5-10 days in 90 days)';
        } else if (absenceCount > 2) {
            absenceScore = 45;
            absenceReason = 'Moderate absence rate (2-5 days in 90 days)';
        } else {
            absenceScore = 25;
            absenceReason = 'Low absence rate';
        }

        factors.push({
            factor: 'Absence Pattern',
            score: absenceScore,
            weight: weights.absencePattern,
            weightedScore: (absenceScore * weights.absencePattern) / 100,
            reason: absenceReason,
            impact: absenceScore >= 70 ? 'high' : absenceScore >= 50 ? 'medium' : 'low',
            data: {
                absenceCount,
                period: '90 days'
            }
        });

        totalScore += (absenceScore * weights.absencePattern) / 100;

        // 6. Last Promotion Factor (long time without promotion = higher risk)
        const monthsSinceHire = tenure * 12;
        const expectedPromotions = Math.floor(monthsSinceHire / 24); // Expected every 2 years

        let promotionScore = 50;
        let promotionReason = '';

        if (tenure > 3 && expectedPromotions > 0) {
            promotionScore = 70;
            promotionReason = 'No promotion in 3+ years - may feel stagnant';
        } else if (tenure > 2) {
            promotionScore = 50;
            promotionReason = 'No recent promotion (2-3 years)';
        } else {
            promotionScore = 30;
            promotionReason = 'Tenure too short to expect promotion';
        }

        factors.push({
            factor: 'Career Progression',
            score: promotionScore,
            weight: weights.lastPromotion,
            weightedScore: (promotionScore * weights.lastPromotion) / 100,
            reason: promotionReason,
            impact: promotionScore >= 70 ? 'high' : promotionScore >= 50 ? 'medium' : 'low'
        });

        totalScore += (promotionScore * weights.lastPromotion) / 100;

        // 7. Workload Factor (overtime patterns)
        const overtimeRecords = await AttendanceRecord.find({
            employeeId: employee._id,
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            'overtime.hasOvertime': true
        }).lean();

        const overtimeHours = overtimeRecords.reduce(
            (sum, r) => sum + (r.hours?.overtime || 0),
            0
        );

        let workloadScore = 50;
        let workloadReason = '';

        if (overtimeHours > 40) {
            workloadScore = 75; // Excessive overtime
            workloadReason = 'Excessive overtime (40+ hours/month) - burnout risk';
        } else if (overtimeHours > 20) {
            workloadScore = 55;
            workloadReason = 'High overtime (20-40 hours/month)';
        } else if (overtimeHours > 10) {
            workloadScore = 40;
            workloadReason = 'Moderate overtime';
        } else {
            workloadScore = 30;
            workloadReason = 'Normal workload';
        }

        factors.push({
            factor: 'Workload',
            score: workloadScore,
            weight: weights.workload,
            weightedScore: (workloadScore * weights.workload) / 100,
            reason: workloadReason,
            impact: workloadScore >= 70 ? 'high' : workloadScore >= 50 ? 'medium' : 'low',
            data: {
                overtimeHours,
                period: '30 days'
            }
        });

        totalScore += (workloadScore * weights.workload) / 100;

        // Determine risk level
        let riskLevel = 'low';
        if (totalScore >= 70) riskLevel = 'high';
        else if (totalScore >= 40) riskLevel = 'medium';

        return {
            employeeId: employee._id,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            department: employee.organization?.departmentName || employee.employment?.departmentName,
            position: employee.employment?.jobTitle,
            riskScore: this._round(totalScore, 1),
            riskLevel,
            factors,
            topRiskFactors: factors
                .sort((a, b) => b.weightedScore - a.weightedScore)
                .slice(0, 3)
                .map(f => f.factor),
            lastUpdated: new Date()
        };
    }

    /**
     * Suggest retention interventions based on risk factors
     */
    static _suggestRetentionInterventions(riskAnalysis) {
        const interventions = [];

        riskAnalysis.factors.forEach(factor => {
            if (factor.impact === 'high') {
                switch (factor.factor) {
                    case 'Tenure':
                        if (riskAnalysis.factors.find(f => f.factor === 'Tenure')?.score >= 70) {
                            interventions.push({
                                priority: 'high',
                                category: 'Onboarding & Integration',
                                action: 'Enhanced onboarding and mentorship program',
                                description: 'Assign a senior mentor and schedule regular check-ins during first year',
                                timeline: 'Immediate',
                                estimatedCost: 'Low'
                            });
                        }
                        break;

                    case 'Performance':
                        interventions.push({
                            priority: 'high',
                            category: 'Performance Management',
                            action: 'Performance Improvement Plan (PIP)',
                            description: 'Create structured improvement plan with clear goals and support',
                            timeline: '30-90 days',
                            estimatedCost: 'Medium'
                        });
                        break;

                    case 'Salary Competitiveness':
                        interventions.push({
                            priority: 'high',
                            category: 'Compensation',
                            action: 'Salary adjustment to market rate',
                            description: 'Review and adjust salary to be competitive with market',
                            timeline: 'Next compensation cycle',
                            estimatedCost: 'High'
                        });
                        break;

                    case 'Engagement':
                        interventions.push({
                            priority: 'high',
                            category: 'Engagement',
                            action: 'One-on-one meeting with manager',
                            description: 'Schedule regular 1-on-1s to understand concerns and provide support',
                            timeline: 'Immediate',
                            estimatedCost: 'Low'
                        });
                        break;

                    case 'Absence Pattern':
                        interventions.push({
                            priority: 'medium',
                            category: 'Wellness',
                            action: 'Wellness check and support',
                            description: 'Investigate causes of absences and provide appropriate support',
                            timeline: 'Immediate',
                            estimatedCost: 'Low'
                        });
                        break;

                    case 'Career Progression':
                        interventions.push({
                            priority: 'high',
                            category: 'Career Development',
                            action: 'Career development discussion',
                            description: 'Create clear career path and discuss promotion timeline',
                            timeline: 'Within 30 days',
                            estimatedCost: 'Low'
                        });
                        break;

                    case 'Workload':
                        interventions.push({
                            priority: 'high',
                            category: 'Work-Life Balance',
                            action: 'Workload rebalancing',
                            description: 'Review and redistribute workload to prevent burnout',
                            timeline: 'Immediate',
                            estimatedCost: 'Low'
                        });
                        break;
                }
            }
        });

        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        interventions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        return interventions;
    }

    /**
     * Find similar employees who left
     */
    static async _findSimilarDepartures(employee, firmId, lawyerId) {
        const departures = await Employee.find({
            ...(firmId ? { firmId } : { lawyerId }),
            'employment.employmentStatus': { $in: ['terminated', 'resigned'] },
            'employment.jobTitle': employee.employment?.jobTitle,
            'employment.terminationDate': { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }).limit(5).lean();

        return departures.map(d => ({
            name: d.personalInfo?.fullNameEnglish,
            tenure: d.yearsOfService,
            reason: d.employment?.terminationReason || 'Not specified',
            departureDate: d.employment?.terminationDate
        }));
    }

    /**
     * Predict departure timeline
     */
    static _predictDepartureTimeline(riskScore) {
        if (riskScore >= 80) {
            return {
                likelihood: 'Very High',
                timeframe: '0-3 months',
                confidence: 85
            };
        } else if (riskScore >= 70) {
            return {
                likelihood: 'High',
                timeframe: '3-6 months',
                confidence: 75
            };
        } else if (riskScore >= 50) {
            return {
                likelihood: 'Moderate',
                timeframe: '6-12 months',
                confidence: 60
            };
        } else {
            return {
                likelihood: 'Low',
                timeframe: '12+ months',
                confidence: 50
            };
        }
    }

    /**
     * 2. WORKFORCE FORECASTING
     * Predict headcount, attrition, and hiring needs
     */
    static async getWorkforceForecast(firmId, lawyerId, months = 12) {
        const baseQuery = firmId ? { firmId } : { lawyerId };

        // Get current headcount
        const currentHeadcount = await Employee.countDocuments({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        });

        // Get historical turnover rate
        const last12Months = new Date();
        last12Months.setMonth(last12Months.getMonth() - 12);

        const separations = await Employee.countDocuments({
            ...baseQuery,
            'employment.employmentStatus': { $in: ['terminated', 'resigned'] },
            'employment.terminationDate': { $gte: last12Months }
        });

        const avgHeadcount = currentHeadcount; // Simplified
        const annualTurnoverRate = avgHeadcount > 0 ? (separations / avgHeadcount) : 0;
        const monthlyTurnoverRate = annualTurnoverRate / 12;

        // Get attrition risk scores
        const attritionData = await this.getAttritionRiskScores(firmId, lawyerId);
        const highRiskCount = attritionData.highRiskEmployees.length;

        // Forecast by month
        const forecast = [];
        let projectedHeadcount = currentHeadcount;

        for (let i = 1; i <= months; i++) {
            // Predict attrition for this month
            const expectedAttrition = Math.round(projectedHeadcount * monthlyTurnoverRate);

            // Predict hiring needs (maintain headcount + growth)
            const growthRate = 0.02; // 2% monthly growth assumption
            const targetHeadcount = Math.round(currentHeadcount * (1 + (growthRate * i)));
            const hiringNeeded = Math.max(0, targetHeadcount - projectedHeadcount + expectedAttrition);

            projectedHeadcount = projectedHeadcount - expectedAttrition + hiringNeeded;

            const forecastDate = new Date();
            forecastDate.setMonth(forecastDate.getMonth() + i);

            forecast.push({
                month: i,
                date: forecastDate,
                monthName: forecastDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
                projectedHeadcount,
                expectedAttrition,
                hiringNeeded,
                targetHeadcount
            });
        }

        return {
            summary: {
                currentHeadcount,
                projectedHeadcount12Months: forecast[forecast.length - 1]?.projectedHeadcount,
                totalAttritionExpected: forecast.reduce((sum, f) => sum + f.expectedAttrition, 0),
                totalHiringNeeded: forecast.reduce((sum, f) => sum + f.hiringNeeded, 0),
                annualTurnoverRate: this._round(annualTurnoverRate * 100, 2)
            },
            highRiskEmployees: highRiskCount,
            monthlyForecast: forecast,
            assumptions: {
                monthlyTurnoverRate: this._round(monthlyTurnoverRate * 100, 2),
                growthRate: 2.0,
                basedOnHistoricalData: '12 months'
            },
            chartData: {
                headcountProjection: {
                    labels: forecast.map(f => f.monthName),
                    datasets: [
                        {
                            label: 'Projected Headcount',
                            data: forecast.map(f => f.projectedHeadcount)
                        },
                        {
                            label: 'Target Headcount',
                            data: forecast.map(f => f.targetHeadcount)
                        }
                    ]
                },
                attritionAndHiring: {
                    labels: forecast.map(f => f.monthName),
                    datasets: [
                        {
                            label: 'Expected Attrition',
                            data: forecast.map(f => f.expectedAttrition)
                        },
                        {
                            label: 'Hiring Needed',
                            data: forecast.map(f => f.hiringNeeded)
                        }
                    ]
                }
            }
        };
    }

    /**
     * 3. PERFORMANCE PREDICTIONS
     * Identify high-potential employees and predict performance trajectory
     */
    static async getHighPotentialEmployees(firmId, lawyerId, limit = 20) {
        const baseQuery = firmId ? { firmId } : { lawyerId };

        const employees = await Employee.find({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        }).lean();

        const predictions = await Promise.all(
            employees.map(employee => this._predictPerformanceTrajectory(employee, firmId, lawyerId))
        );

        // Filter and sort high-potential employees
        const highPotential = predictions
            .filter(p => p.potentialScore >= 70)
            .sort((a, b) => b.potentialScore - a.potentialScore)
            .slice(0, limit);

        // Promotion readiness
        const promotionReady = predictions
            .filter(p => p.promotionReadiness === 'ready_now')
            .sort((a, b) => b.potentialScore - a.potentialScore)
            .slice(0, 10);

        return {
            summary: {
                totalEvaluated: employees.length,
                highPotentialCount: predictions.filter(p => p.potentialScore >= 70).length,
                promotionReadyCount: promotionReady.length,
                averagePotentialScore: this._round(
                    this._calculateAverage(predictions.map(p => p.potentialScore)),
                    1
                )
            },
            highPotentialEmployees: highPotential,
            promotionReadyEmployees: promotionReady,
            chartData: {
                potentialDistribution: {
                    labels: ['High (70+)', 'Medium (40-69)', 'Low (<40)'],
                    datasets: [{
                        label: 'Employees',
                        data: [
                            predictions.filter(p => p.potentialScore >= 70).length,
                            predictions.filter(p => p.potentialScore >= 40 && p.potentialScore < 70).length,
                            predictions.filter(p => p.potentialScore < 40).length
                        ]
                    }]
                }
            }
        };
    }

    /**
     * Predict performance trajectory for an employee
     */
    static async _predictPerformanceTrajectory(employee, firmId, lawyerId) {
        let potentialScore = 50; // Base score
        const indicators = [];

        // 1. Performance history
        const reviews = await PerformanceReview.find({
            employeeId: employee._id,
            status: { $in: ['completed', 'acknowledged'] }
        }).sort({ 'reviewPeriod.endDate': -1 }).limit(3).lean();

        if (reviews.length > 0) {
            const avgScore = this._calculateAverage(reviews.map(r => r.overallScore || 3));
            if (avgScore >= 4.5) {
                potentialScore += 20;
                indicators.push('Consistently exceptional performance');
            } else if (avgScore >= 4.0) {
                potentialScore += 15;
                indicators.push('Strong performance history');
            } else if (avgScore >= 3.5) {
                potentialScore += 10;
                indicators.push('Above average performance');
            }

            // Check for improvement trend
            if (reviews.length >= 2) {
                const latestScore = reviews[0].overallScore || 3;
                const previousScore = reviews[1].overallScore || 3;
                if (latestScore > previousScore) {
                    potentialScore += 10;
                    indicators.push('Performance improving over time');
                }
            }
        }

        // 2. Tenure sweet spot (2-5 years)
        const tenure = employee.yearsOfService || 0;
        if (tenure >= 2 && tenure <= 5) {
            potentialScore += 15;
            indicators.push('Optimal tenure for growth');
        } else if (tenure < 2) {
            potentialScore += 5;
            indicators.push('Early career - building experience');
        }

        // 3. Attendance and punctuality
        const recentAttendance = await AttendanceRecord.countDocuments({
            employeeId: employee._id,
            date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            status: { $in: ['present', 'late'] }
        });

        const absences = await AttendanceRecord.countDocuments({
            employeeId: employee._id,
            date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            'absence.isAbsent': true
        });

        if (absences === 0) {
            potentialScore += 10;
            indicators.push('Perfect attendance');
        } else if (absences <= 2) {
            potentialScore += 5;
            indicators.push('Good attendance');
        }

        // 4. Age factor (younger = more potential for growth)
        const age = this._getAge(employee.personalInfo?.dateOfBirth);
        if (age && age < 35) {
            potentialScore += 10;
            indicators.push('Young with growth potential');
        } else if (age && age < 45) {
            potentialScore += 5;
            indicators.push('Mid-career professional');
        }

        // Determine promotion readiness
        let promotionReadiness = 'not_ready';
        if (potentialScore >= 80 && tenure >= 2) {
            promotionReadiness = 'ready_now';
        } else if (potentialScore >= 70 && tenure >= 1) {
            promotionReadiness = 'ready_1year';
        } else if (potentialScore >= 60) {
            promotionReadiness = 'ready_2years';
        }

        return {
            employeeId: employee._id,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            department: employee.organization?.departmentName,
            position: employee.employment?.jobTitle,
            potentialScore: Math.min(100, potentialScore),
            indicators,
            promotionReadiness,
            recommendedDevelopment: this._getRecommendedDevelopment(potentialScore),
            expectedTrajectory: potentialScore >= 70 ? 'High potential for leadership' :
                potentialScore >= 50 ? 'Solid contributor' : 'Needs development'
        };
    }

    /**
     * Get recommended development based on potential score
     */
    static _getRecommendedDevelopment(potentialScore) {
        if (potentialScore >= 80) {
            return [
                'Leadership development program',
                'Stretch assignments',
                'Executive coaching',
                'Cross-functional projects'
            ];
        } else if (potentialScore >= 60) {
            return [
                'Advanced technical training',
                'Project management experience',
                'Mentorship program',
                'Professional certifications'
            ];
        } else {
            return [
                'Core skills training',
                'Performance coaching',
                'Job shadowing',
                'Structured feedback sessions'
            ];
        }
    }

    /**
     * 4. ABSENCE PREDICTIONS
     * Predict likely absence days and identify at-risk employees
     */
    static async getAbsencePredictions(firmId, lawyerId) {
        const baseQuery = firmId ? { firmId } : { lawyerId };

        const employees = await Employee.find({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        }).lean();

        const predictions = await Promise.all(
            employees.map(employee => this._predictAbsenceLikelihood(employee, firmId, lawyerId))
        );

        // Sort by risk
        predictions.sort((a, b) => b.absenceRiskScore - a.absenceRiskScore);

        const highRisk = predictions.filter(p => p.absenceRiskScore >= 70);
        const mediumRisk = predictions.filter(p => p.absenceRiskScore >= 40 && p.absenceRiskScore < 70);

        return {
            summary: {
                totalEmployees: employees.length,
                highRiskCount: highRisk.length,
                mediumRiskCount: mediumRisk.length,
                predictedAbsenceDays: predictions.reduce((sum, p) => sum + p.predictedDaysNext30, 0)
            },
            highRiskEmployees: highRisk.slice(0, 20),
            allPredictions: predictions,
            chartData: {
                riskDistribution: {
                    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
                    datasets: [{
                        label: 'Employees',
                        data: [
                            highRisk.length,
                            mediumRisk.length,
                            predictions.filter(p => p.absenceRiskScore < 40).length
                        ]
                    }]
                }
            }
        };
    }

    /**
     * Predict absence likelihood for an employee
     */
    static async _predictAbsenceLikelihood(employee, firmId, lawyerId) {
        // Get historical absence data
        const last90Days = new Date();
        last90Days.setDate(last90Days.getDate() - 90);

        const absences = await AttendanceRecord.find({
            employeeId: employee._id,
            date: { $gte: last90Days },
            'absence.isAbsent': true
        }).lean();

        const absenceCount = absences.length;

        // Calculate absence rate
        const absenceRate = absenceCount / 90; // per day
        const predictedDaysNext30 = Math.round(absenceRate * 30);

        // Calculate risk score based on patterns
        let absenceRiskScore = 0;

        // Historical absence rate
        if (absenceCount > 10) {
            absenceRiskScore += 40;
        } else if (absenceCount > 5) {
            absenceRiskScore += 25;
        } else if (absenceCount > 2) {
            absenceRiskScore += 10;
        }

        // Pattern detection (Monday/Friday)
        const mondayFridayAbsences = absences.filter(a => {
            const day = new Date(a.date).getDay();
            return day === 1 || day === 5;
        }).length;

        if (mondayFridayAbsences > absenceCount * 0.6) {
            absenceRiskScore += 30;
        }

        // Recent trend (last 30 days)
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        const recentAbsences = absences.filter(a => new Date(a.date) >= last30Days).length;

        if (recentAbsences > 5) {
            absenceRiskScore += 30;
        }

        return {
            employeeId: employee._id,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            department: employee.organization?.departmentName,
            absenceRiskScore: Math.min(100, absenceRiskScore),
            historicalAbsences90Days: absenceCount,
            predictedDaysNext30,
            patterns: {
                mondayFridayPattern: mondayFridayAbsences > absenceCount * 0.5,
                recentTrend: recentAbsences > 3 ? 'increasing' : 'stable'
            },
            recommendation: absenceRiskScore >= 70 ? 'Immediate attention needed' :
                absenceRiskScore >= 40 ? 'Monitor closely' : 'Normal'
        };
    }

    /**
     * 5. ENGAGEMENT PREDICTIONS
     * Predict engagement trends and flight risk
     */
    static async getEngagementPredictions(firmId, lawyerId) {
        const baseQuery = firmId ? { firmId } : { lawyerId };

        const employees = await Employee.find({
            ...baseQuery,
            'employment.employmentStatus': 'active'
        }).lean();

        const predictions = await Promise.all(
            employees.map(employee => this._predictEngagementScore(employee, firmId, lawyerId))
        );

        // Calculate trends
        const avgEngagement = this._calculateAverage(predictions.map(p => p.engagementScore));
        const disengaged = predictions.filter(p => p.engagementScore < 40).length;
        const highlyEngaged = predictions.filter(p => p.engagementScore >= 70).length;

        // Flight risk (combination of low engagement + attrition risk)
        const flightRisk = predictions
            .filter(p => p.engagementScore < 50)
            .sort((a, b) => a.engagementScore - b.engagementScore)
            .slice(0, 20);

        return {
            summary: {
                totalEmployees: employees.length,
                averageEngagement: this._round(avgEngagement, 1),
                highlyEngagedCount: highlyEngaged,
                disengagedCount: disengaged,
                flightRiskCount: flightRisk.length
            },
            flightRiskEmployees: flightRisk,
            engagementDistribution: {
                high: highlyEngaged,
                medium: predictions.filter(p => p.engagementScore >= 40 && p.engagementScore < 70).length,
                low: disengaged
            },
            chartData: {
                engagementDistribution: {
                    labels: ['Highly Engaged (70+)', 'Moderately Engaged (40-69)', 'Disengaged (<40)'],
                    datasets: [{
                        label: 'Employees',
                        data: [
                            highlyEngaged,
                            predictions.filter(p => p.engagementScore >= 40 && p.engagementScore < 70).length,
                            disengaged
                        ]
                    }]
                }
            }
        };
    }

    /**
     * Predict engagement score for an employee
     */
    static async _predictEngagementScore(employee, firmId, lawyerId) {
        let engagementScore = 50; // Base score
        const indicators = [];

        // 1. Performance score (high performers are usually more engaged)
        const recentReview = await PerformanceReview.findOne({
            employeeId: employee._id,
            status: { $in: ['completed', 'acknowledged'] }
        }).sort({ 'reviewPeriod.endDate': -1 }).lean();

        if (recentReview) {
            const perfScore = recentReview.overallScore || 3;
            if (perfScore >= 4.5) {
                engagementScore += 20;
                indicators.push('High performance');
            } else if (perfScore >= 4.0) {
                engagementScore += 15;
                indicators.push('Good performance');
            } else if (perfScore < 3.0) {
                engagementScore -= 15;
                indicators.push('Low performance - may indicate disengagement');
            }
        }

        // 2. Attendance patterns
        const absences = await AttendanceRecord.countDocuments({
            employeeId: employee._id,
            date: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
            'absence.isAbsent': true
        });

        if (absences === 0) {
            engagementScore += 15;
            indicators.push('Perfect attendance');
        } else if (absences <= 2) {
            engagementScore += 10;
            indicators.push('Good attendance');
        } else if (absences > 5) {
            engagementScore -= 15;
            indicators.push('High absence rate');
        }

        // 3. Tenure (engagement often dips around year 3-5)
        const tenure = employee.yearsOfService || 0;
        if (tenure < 1) {
            engagementScore += 10;
            indicators.push('New employee - typically engaged');
        } else if (tenure >= 3 && tenure <= 5) {
            engagementScore -= 10;
            indicators.push('Mid-tenure - potential engagement dip');
        } else if (tenure > 10) {
            engagementScore += 5;
            indicators.push('Long tenure - committed');
        }

        // 4. Recent leave requests (excessive requests may indicate burnout)
        const recentLeaves = await LeaveRequest.countDocuments({
            employeeId: employee._id,
            createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        });

        if (recentLeaves > 3) {
            engagementScore -= 10;
            indicators.push('Multiple leave requests - possible burnout');
        }

        engagementScore = Math.max(0, Math.min(100, engagementScore));

        return {
            employeeId: employee._id,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            department: employee.organization?.departmentName,
            engagementScore,
            engagementLevel: engagementScore >= 70 ? 'High' : engagementScore >= 40 ? 'Medium' : 'Low',
            indicators,
            flightRisk: engagementScore < 40,
            recommendations: this._getEngagementRecommendations(engagementScore)
        };
    }

    /**
     * Get engagement improvement recommendations
     */
    static _getEngagementRecommendations(engagementScore) {
        if (engagementScore < 40) {
            return [
                'Immediate manager intervention required',
                'Schedule one-on-one discussion',
                'Assess workload and stress levels',
                'Consider role adjustment or new challenges'
            ];
        } else if (engagementScore < 70) {
            return [
                'Regular check-ins with manager',
                'Provide growth opportunities',
                'Recognition for contributions',
                'Team building activities'
            ];
        } else {
            return [
                'Continue current engagement practices',
                'Consider for leadership roles',
                'Leverage as mentor for others'
            ];
        }
    }

    // Helper methods
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

    static _round(number, decimals = 2) {
        return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }
}

module.exports = HRPredictionsService;
