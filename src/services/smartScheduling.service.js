const Task = require('../models/task.model');
const Event = require('../models/event.model');
const TimeEntry = require('../models/timeEntry.model');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// AI SMART SCHEDULING SERVICE - INTELLIGENT TASK SCHEDULING
// ═══════════════════════════════════════════════════════════════

class SmartSchedulingService {
    // ═══════════════════════════════════════════════════════════
    // USER PRODUCTIVITY PATTERNS
    // ═══════════════════════════════════════════════════════════

    /**
     * Get user's productivity patterns based on historical data
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} firmId - Firm ID
     * @returns {Object} Productivity patterns
     */
    static async getUserPatterns(userId, firmId) {
        try {
            const now = new Date();
            const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

            // Analyze completed tasks
            const taskPatterns = await this._analyzeTaskCompletionPatterns(
                userId,
                firmId,
                threeMonthsAgo,
                now
            );

            // Analyze time entries
            const timePatterns = await this._analyzeTimeEntryPatterns(
                userId,
                firmId,
                threeMonthsAgo,
                now
            );

            // Analyze event patterns
            const eventPatterns = await this._analyzeEventPatterns(
                userId,
                firmId,
                threeMonthsAgo,
                now
            );

            // Combine patterns
            const mostProductiveHours = this._combineMostProductiveHours(
                taskPatterns.hourlyDistribution,
                timePatterns.hourlyDistribution
            );

            const preferredDays = this._combinePreferredDays(
                taskPatterns.dayDistribution,
                timePatterns.dayDistribution
            );

            return {
                mostProductiveHours,
                preferredDays,
                avgTaskDuration: taskPatterns.avgDuration,
                completionRates: {
                    overall: taskPatterns.completionRate,
                    byPriority: taskPatterns.completionByPriority,
                    byTaskType: taskPatterns.completionByType,
                    byDayOfWeek: taskPatterns.completionByDay,
                    byTimeOfDay: taskPatterns.completionByHour
                },
                workloadPatterns: {
                    peakDays: preferredDays.slice(0, 3),
                    peakHours: mostProductiveHours.slice(0, 4),
                    avgTasksPerDay: taskPatterns.avgTasksPerDay,
                    avgHoursPerDay: timePatterns.avgHoursPerDay
                },
                insights: this._generatePatternInsights(
                    mostProductiveHours,
                    preferredDays,
                    taskPatterns,
                    timePatterns
                )
            };
        } catch (error) {
            logger.error('Error getting user patterns:', error);
            throw error;
        }
    }

    /**
     * Analyze task completion patterns
     */
    static async _analyzeTaskCompletionPatterns(userId, firmId, startDate, endDate) {
        const completedTasks = await Task.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    assignedTo: new mongoose.Types.ObjectId(userId),
                    status: 'done',
                    completedAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $project: {
                    hour: { $hour: '$completedAt' },
                    dayOfWeek: { $dayOfWeek: '$completedAt' },
                    priority: 1,
                    taskType: 1,
                    duration: {
                        $divide: [
                            { $subtract: ['$completedAt', '$createdAt'] },
                            1000 * 60 * 60 // Convert to hours
                        ]
                    },
                    timeTracked: '$timeTracking.actualMinutes'
                }
            }
        ]);

        const totalTasks = await Task.countDocuments({
            firmId: new mongoose.Types.ObjectId(firmId),
            assignedTo: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate, $lte: endDate }
        });

        // Hourly distribution
        const hourlyDistribution = Array(24).fill(0);
        completedTasks.forEach(task => {
            hourlyDistribution[task.hour] += 1;
        });

        // Day of week distribution (1=Sunday, 7=Saturday)
        const dayDistribution = Array(7).fill(0);
        completedTasks.forEach(task => {
            dayDistribution[task.dayOfWeek - 1] += 1;
        });

        // Completion by priority
        const completionByPriority = {};
        const priorityGroups = ['none', 'low', 'medium', 'high', 'critical'];
        for (const priority of priorityGroups) {
            const total = await Task.countDocuments({
                firmId: new mongoose.Types.ObjectId(firmId),
                assignedTo: new mongoose.Types.ObjectId(userId),
                priority,
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const completed = completedTasks.filter(t => t.priority === priority).length;
            completionByPriority[priority] = total > 0 ? (completed / total) * 100 : 0;
        }

        // Completion by task type
        const completionByType = {};
        const taskTypes = [...new Set(completedTasks.map(t => t.taskType).filter(Boolean))];
        for (const type of taskTypes) {
            const total = await Task.countDocuments({
                firmId: new mongoose.Types.ObjectId(firmId),
                assignedTo: new mongoose.Types.ObjectId(userId),
                taskType: type,
                createdAt: { $gte: startDate, $lte: endDate }
            });
            const completed = completedTasks.filter(t => t.taskType === type).length;
            completionByType[type] = total > 0 ? (completed / total) * 100 : 0;
        }

        // Average duration
        const avgDuration = completedTasks.length > 0
            ? completedTasks.reduce((sum, t) => sum + (t.timeTracked || 0), 0) / completedTasks.length
            : 60; // Default 60 minutes

        // Completion rate
        const completionRate = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;

        // Days active
        const daysInRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const avgTasksPerDay = completedTasks.length / Math.max(daysInRange, 1);

        return {
            hourlyDistribution,
            dayDistribution,
            completionByPriority,
            completionByType,
            completionByDay: dayDistribution.map((count, idx) => ({
                day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx],
                completionRate: totalTasks > 0 ? (count / totalTasks) * 100 : 0
            })),
            completionByHour: hourlyDistribution.map((count, hour) => ({
                hour,
                completionRate: totalTasks > 0 ? (count / totalTasks) * 100 : 0
            })),
            avgDuration,
            completionRate,
            avgTasksPerDay
        };
    }

    /**
     * Analyze time entry patterns
     */
    static async _analyzeTimeEntryPatterns(userId, firmId, startDate, endDate) {
        const timeEntries = await TimeEntry.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    assigneeId: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $project: {
                    hour: {
                        $cond: {
                            if: { $ne: ['$startTime', null] },
                            then: { $toInt: { $substr: ['$startTime', 0, 2] } },
                            else: 9 // Default to 9 AM if no start time
                        }
                    },
                    dayOfWeek: { $dayOfWeek: '$date' },
                    duration: 1,
                    activityCode: 1,
                    timeType: 1
                }
            }
        ]);

        // Hourly distribution (based on when work was done)
        const hourlyDistribution = Array(24).fill(0);
        timeEntries.forEach(entry => {
            hourlyDistribution[entry.hour] += entry.duration;
        });

        // Day distribution
        const dayDistribution = Array(7).fill(0);
        timeEntries.forEach(entry => {
            dayDistribution[entry.dayOfWeek - 1] += entry.duration;
        });

        // Total hours
        const totalMinutes = timeEntries.reduce((sum, e) => sum + e.duration, 0);
        const daysInRange = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const avgHoursPerDay = totalMinutes / 60 / Math.max(daysInRange, 1);

        return {
            hourlyDistribution,
            dayDistribution,
            totalHours: totalMinutes / 60,
            avgHoursPerDay,
            entriesCount: timeEntries.length
        };
    }

    /**
     * Analyze event patterns
     */
    static async _analyzeEventPatterns(userId, firmId, startDate, endDate) {
        const events = await Event.aggregate([
            {
                $match: {
                    firmId: new mongoose.Types.ObjectId(firmId),
                    $or: [
                        { organizer: new mongoose.Types.ObjectId(userId) },
                        { 'attendees.userId': new mongoose.Types.ObjectId(userId) }
                    ],
                    startDateTime: { $gte: startDate, $lte: endDate },
                    status: { $in: ['completed', 'confirmed', 'scheduled'] }
                }
            },
            {
                $project: {
                    hour: { $hour: '$startDateTime' },
                    dayOfWeek: { $dayOfWeek: '$startDateTime' },
                    type: 1,
                    duration: {
                        $divide: [
                            { $subtract: ['$endDateTime', '$startDateTime'] },
                            1000 * 60 // Convert to minutes
                        ]
                    }
                }
            }
        ]);

        const hourlyDistribution = Array(24).fill(0);
        const dayDistribution = Array(7).fill(0);

        events.forEach(event => {
            hourlyDistribution[event.hour] += 1;
            dayDistribution[event.dayOfWeek - 1] += 1;
        });

        return {
            hourlyDistribution,
            dayDistribution,
            totalEvents: events.length
        };
    }

    /**
     * Combine most productive hours from different sources
     */
    static _combineMostProductiveHours(taskHourly, timeHourly) {
        const combined = taskHourly.map((tasks, hour) => {
            const timeMinutes = timeHourly[hour] || 0;
            // Normalize and weight (tasks count more than time logged)
            const score = (tasks * 2) + (timeMinutes / 60);
            return { hour, score, tasks, timeMinutes };
        });

        return combined
            .sort((a, b) => b.score - a.score)
            .map(h => ({
                hour: h.hour,
                hourFormatted: this._formatHour(h.hour),
                productivityScore: Math.round(h.score * 10) / 10,
                tasksCompleted: h.tasks,
                minutesWorked: Math.round(h.timeMinutes)
            }));
    }

    /**
     * Combine preferred days
     */
    static _combinePreferredDays(taskDaily, timeDaily) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const combined = taskDaily.map((tasks, idx) => {
            const timeMinutes = timeDaily[idx] || 0;
            const score = (tasks * 2) + (timeMinutes / 60);
            return {
                day: dayNames[idx],
                dayOfWeek: idx,
                score,
                tasks,
                timeMinutes
            };
        });

        return combined
            .sort((a, b) => b.score - a.score)
            .map(d => ({
                day: d.day,
                dayOfWeek: d.dayOfWeek,
                productivityScore: Math.round(d.score * 10) / 10,
                tasksCompleted: d.tasks,
                minutesWorked: Math.round(d.timeMinutes)
            }));
    }

    /**
     * Generate insights from patterns
     */
    static _generatePatternInsights(productiveHours, preferredDays, taskPatterns, timePatterns) {
        const insights = [];

        // Peak productivity time
        if (productiveHours.length > 0) {
            const topHour = productiveHours[0];
            insights.push({
                type: 'peak_time',
                message: `Your peak productivity is around ${topHour.hourFormatted}`,
                recommendation: 'Schedule important tasks during this time'
            });
        }

        // Best day
        if (preferredDays.length > 0) {
            const topDay = preferredDays[0];
            insights.push({
                type: 'best_day',
                message: `${topDay.day} is your most productive day`,
                recommendation: 'Plan critical tasks for this day'
            });
        }

        // Completion rate insight
        if (taskPatterns.completionRate < 60) {
            insights.push({
                type: 'low_completion',
                message: `Your task completion rate is ${Math.round(taskPatterns.completionRate)}%`,
                recommendation: 'Consider breaking down tasks into smaller subtasks'
            });
        }

        // High priority completion
        if (taskPatterns.completionByPriority.high > 80) {
            insights.push({
                type: 'high_priority_focus',
                message: 'You excel at completing high-priority tasks',
                recommendation: 'Continue prioritizing critical work'
            });
        }

        // Average task duration
        if (taskPatterns.avgDuration > 180) {
            insights.push({
                type: 'long_tasks',
                message: 'Your tasks average over 3 hours',
                recommendation: 'Consider time-blocking for deep work sessions'
            });
        }

        return insights;
    }

    // ═══════════════════════════════════════════════════════════
    // SMART SCHEDULING SUGGESTIONS
    // ═══════════════════════════════════════════════════════════

    /**
     * Suggest best time for a new task
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} taskDetails - Task details (priority, estimatedMinutes, taskType)
     * @returns {Object} Scheduling suggestion
     */
    static async suggestBestTime(userId, firmId, taskDetails) {
        try {
            const { priority = 'medium', estimatedMinutes = 60, taskType = 'general', dueDate = null } = taskDetails;

            // Get user patterns
            const patterns = await this.getUserPatterns(userId, firmId);

            // Get availability for next 14 days
            const availability = await this._getAvailabilityNext14Days(userId, firmId);

            // Find best slot
            const suggestion = await this._findBestTimeSlot(
                patterns,
                availability,
                estimatedMinutes,
                priority,
                taskType,
                dueDate
            );

            return suggestion;
        } catch (error) {
            logger.error('Error suggesting best time:', error);
            throw error;
        }
    }

    /**
     * Get availability for next 14 days
     */
    static async _getAvailabilityNext14Days(userId, firmId) {
        const now = new Date();
        const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        // Get all scheduled events
        const events = await Event.find({
            firmId,
            $or: [
                { organizer: userId },
                { 'attendees.userId': userId }
            ],
            startDateTime: { $gte: now, $lte: twoWeeksLater },
            status: { $in: ['scheduled', 'confirmed'] }
        }).select('startDateTime endDateTime type').lean();

        // Get tasks with specific due times
        const tasks = await Task.find({
            firmId,
            assignedTo: userId,
            status: { $in: ['todo', 'in_progress'] },
            dueDate: { $gte: now, $lte: twoWeeksLater },
            dueTime: { $exists: true, $ne: null }
        }).select('dueDate dueTime timeTracking.estimatedMinutes').lean();

        // Build availability map (14 days x 24 hours)
        const availability = [];
        for (let day = 0; day < 14; day++) {
            const date = new Date(now);
            date.setDate(date.getDate() + day);
            date.setHours(0, 0, 0, 0);

            const dayAvailability = {
                date,
                dayOfWeek: date.getDay(),
                hours: Array(24).fill(true) // All hours available by default
            };

            // Mark event hours as unavailable
            events.forEach(event => {
                const eventDate = new Date(event.startDateTime);
                if (eventDate.toDateString() === date.toDateString()) {
                    const startHour = eventDate.getHours();
                    const endHour = event.endDateTime ? new Date(event.endDateTime).getHours() : startHour + 1;
                    for (let hour = startHour; hour <= endHour; hour++) {
                        if (hour < 24) dayAvailability.hours[hour] = false;
                    }
                }
            });

            // Mark task due time hours as unavailable
            tasks.forEach(task => {
                const taskDate = new Date(task.dueDate);
                if (taskDate.toDateString() === date.toDateString() && task.dueTime) {
                    const [hour] = task.dueTime.split(':').map(Number);
                    const duration = Math.ceil((task.timeTracking?.estimatedMinutes || 60) / 60);
                    for (let h = hour; h < hour + duration && h < 24; h++) {
                        dayAvailability.hours[h] = false;
                    }
                }
            });

            // Mark non-working hours as unavailable (before 7 AM and after 7 PM)
            for (let hour = 0; hour < 7; hour++) {
                dayAvailability.hours[hour] = false;
            }
            for (let hour = 19; hour < 24; hour++) {
                dayAvailability.hours[hour] = false;
            }

            availability.push(dayAvailability);
        }

        return availability;
    }

    /**
     * Find best time slot
     */
    static async _findBestTimeSlot(patterns, availability, estimatedMinutes, priority, taskType, dueDate) {
        const durationHours = Math.ceil(estimatedMinutes / 60);
        const candidates = [];

        // Get productive hours (top 6)
        const productiveHours = patterns.mostProductiveHours.slice(0, 6).map(h => h.hour);

        // Get productive days (top 5)
        const productiveDays = patterns.preferredDays.slice(0, 5).map(d => d.dayOfWeek);

        // Find all possible slots
        availability.forEach(day => {
            for (let hour = 7; hour <= 19 - durationHours; hour++) {
                // Check if consecutive hours are available
                let slotAvailable = true;
                for (let h = hour; h < hour + durationHours && h < 24; h++) {
                    if (!day.hours[h]) {
                        slotAvailable = false;
                        break;
                    }
                }

                if (slotAvailable) {
                    // Calculate score
                    let score = 0;

                    // Productivity match
                    if (productiveHours.includes(hour)) {
                        score += 30;
                    }

                    // Day preference match
                    if (productiveDays.includes(day.dayOfWeek)) {
                        score += 20;
                    }

                    // Priority-based urgency
                    if (priority === 'critical' || priority === 'high') {
                        // Prefer sooner
                        const daysFromNow = Math.floor((day.date - new Date()) / (1000 * 60 * 60 * 24));
                        score += Math.max(0, 20 - daysFromNow * 2);
                    }

                    // Due date consideration
                    if (dueDate) {
                        const daysUntilDue = Math.floor((new Date(dueDate) - day.date) / (1000 * 60 * 60 * 24));
                        if (daysUntilDue < 3 && daysUntilDue >= 0) {
                            score += 15; // Urgent
                        }
                    }

                    // Morning vs afternoon preference
                    if (hour >= 9 && hour <= 11) {
                        score += 10; // Morning bonus
                    }

                    candidates.push({
                        dateTime: new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), hour),
                        score,
                        hour,
                        dayOfWeek: day.dayOfWeek,
                        reason: this._generateReasonForSlot(hour, day.dayOfWeek, productiveHours, productiveDays, priority)
                    });
                }
            }
        });

        // Sort by score
        candidates.sort((a, b) => b.score - a.score);

        if (candidates.length === 0) {
            return {
                suggestedDateTime: null,
                confidence: 0,
                reason: 'No available time slots found in the next 14 days',
                alternatives: []
            };
        }

        const best = candidates[0];
        const alternatives = candidates.slice(1, 4);

        return {
            suggestedDateTime: best.dateTime,
            confidence: Math.min(100, Math.round((best.score / 75) * 100)),
            reason: best.reason,
            alternatives: alternatives.map(alt => ({
                dateTime: alt.dateTime,
                reason: alt.reason,
                confidence: Math.min(100, Math.round((alt.score / 75) * 100))
            }))
        };
    }

    /**
     * Generate reason for slot selection
     */
    static _generateReasonForSlot(hour, dayOfWeek, productiveHours, productiveDays, priority) {
        const reasons = [];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        if (productiveHours.includes(hour)) {
            reasons.push(`${this._formatHour(hour)} is one of your most productive times`);
        }

        if (productiveDays.includes(dayOfWeek)) {
            reasons.push(`${dayNames[dayOfWeek]} is a highly productive day for you`);
        }

        if (hour >= 9 && hour <= 11) {
            reasons.push('Morning slot for better focus');
        }

        if (priority === 'critical' || priority === 'high') {
            reasons.push('Early scheduling for high-priority task');
        }

        if (reasons.length === 0) {
            reasons.push('Available time slot matches your schedule');
        }

        return reasons.join('; ');
    }

    // ═══════════════════════════════════════════════════════════
    // DURATION PREDICTION
    // ═══════════════════════════════════════════════════════════

    /**
     * Predict task duration based on history
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} firmId - Firm ID
     * @param {String} taskType - Task type
     * @param {String} complexity - Task complexity (low, medium, high)
     * @returns {Object} Duration prediction
     */
    static async predictDuration(userId, firmId, taskType = 'general', complexity = 'medium') {
        try {
            // Get historical data for similar tasks
            const similarTasks = await Task.find({
                firmId,
                assignedTo: userId,
                taskType,
                status: 'done',
                'timeTracking.actualMinutes': { $gt: 0 }
            })
            .select('timeTracking.actualMinutes priority')
            .limit(50)
            .lean();

            if (similarTasks.length === 0) {
                // No historical data - use defaults
                return this._getDefaultDuration(taskType, complexity);
            }

            // Calculate statistics
            const durations = similarTasks.map(t => t.timeTracking.actualMinutes);
            const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
            const median = this._calculateMedian(durations);
            const stdDev = this._calculateStdDev(durations, avgDuration);

            // Adjust for complexity
            let estimatedMinutes = median; // Use median as it's more robust
            const complexityMultiplier = {
                'low': 0.7,
                'medium': 1.0,
                'high': 1.5
            };
            estimatedMinutes *= (complexityMultiplier[complexity] || 1.0);

            // Confidence based on sample size and variance
            const confidence = Math.min(
                100,
                Math.round((similarTasks.length / 20) * 100 * (1 - Math.min(stdDev / avgDuration, 1)))
            );

            return {
                estimatedMinutes: Math.round(estimatedMinutes),
                confidence,
                basedOn: {
                    sampleSize: similarTasks.length,
                    average: Math.round(avgDuration),
                    median: Math.round(median),
                    range: {
                        min: Math.round(Math.min(...durations)),
                        max: Math.round(Math.max(...durations))
                    },
                    taskType,
                    complexity
                },
                recommendation: this._getDurationRecommendation(estimatedMinutes, confidence)
            };
        } catch (error) {
            logger.error('Error predicting duration:', error);
            throw error;
        }
    }

    /**
     * Get default duration when no historical data exists
     */
    static _getDefaultDuration(taskType, complexity) {
        const defaults = {
            'court_hearing': { low: 90, medium: 120, high: 180 },
            'document_review': { low: 45, medium: 90, high: 150 },
            'client_meeting': { low: 30, medium: 60, high: 90 },
            'filing_deadline': { low: 30, medium: 60, high: 120 },
            'research': { low: 60, medium: 120, high: 240 },
            'drafting': { low: 90, medium: 180, high: 360 },
            'general': { low: 30, medium: 60, high: 120 }
        };

        const typeDefaults = defaults[taskType] || defaults.general;
        const estimatedMinutes = typeDefaults[complexity] || typeDefaults.medium;

        return {
            estimatedMinutes,
            confidence: 30, // Low confidence for defaults
            basedOn: {
                sampleSize: 0,
                average: estimatedMinutes,
                median: estimatedMinutes,
                range: { min: estimatedMinutes, max: estimatedMinutes },
                taskType,
                complexity
            },
            recommendation: 'Default estimate - no historical data available. Actual time may vary.'
        };
    }

    /**
     * Get duration recommendation
     */
    static _getDurationRecommendation(estimatedMinutes, confidence) {
        if (confidence > 70) {
            return `High confidence estimate based on your history`;
        } else if (confidence > 40) {
            return `Moderate confidence - consider adding buffer time`;
        } else {
            return `Low confidence - estimate may vary significantly`;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // WORKLOAD ANALYSIS
    // ═══════════════════════════════════════════════════════════

    /**
     * Analyze workload and suggest reschedules
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} firmId - Firm ID
     * @param {Object} dateRange - { start, end }
     * @returns {Object} Workload analysis
     */
    static async analyzeWorkload(userId, firmId, dateRange = {}) {
        try {
            const start = dateRange.start ? new Date(dateRange.start) : new Date();
            const end = dateRange.end ? new Date(dateRange.end) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

            // Get all tasks in range
            const tasks = await Task.find({
                firmId,
                assignedTo: userId,
                status: { $in: ['todo', 'in_progress'] },
                dueDate: { $gte: start, $lte: end }
            })
            .select('title dueDate priority timeTracking.estimatedMinutes taskType')
            .lean();

            // Get all events in range
            const events = await Event.find({
                firmId,
                $or: [
                    { organizer: userId },
                    { 'attendees.userId': userId }
                ],
                startDateTime: { $gte: start, $lte: end },
                status: { $in: ['scheduled', 'confirmed'] }
            })
            .select('title startDateTime endDateTime type')
            .lean();

            // Calculate daily workload
            const dailyWorkload = this._calculateDailyWorkload(tasks, events, start, end);

            // Identify overloaded days (>8 hours)
            const overloadedDays = dailyWorkload.filter(day => day.totalHours > 8);

            // Generate reschedule suggestions
            const suggestedReschedules = this._generateReschedules(
                overloadedDays,
                dailyWorkload,
                tasks
            );

            // Calculate balance score (0-100)
            const balanceScore = this._calculateBalanceScore(dailyWorkload);

            return {
                overloadedDays: overloadedDays.map(day => ({
                    date: day.date,
                    totalHours: day.totalHours,
                    taskCount: day.taskCount,
                    eventCount: day.eventCount,
                    overloadBy: Math.round((day.totalHours - 8) * 10) / 10
                })),
                suggestedReschedules,
                balanceScore,
                summary: {
                    totalDays: dailyWorkload.length,
                    averageHoursPerDay: Math.round(
                        (dailyWorkload.reduce((sum, d) => sum + d.totalHours, 0) / dailyWorkload.length) * 10
                    ) / 10,
                    overloadedDaysCount: overloadedDays.length,
                    lighterDaysCount: dailyWorkload.filter(d => d.totalHours < 4).length,
                    recommendation: this._getWorkloadRecommendation(balanceScore, overloadedDays.length)
                }
            };
        } catch (error) {
            logger.error('Error analyzing workload:', error);
            throw error;
        }
    }

    /**
     * Calculate daily workload
     */
    static _calculateDailyWorkload(tasks, events, start, end) {
        const dailyWorkload = [];
        const current = new Date(start);

        while (current <= end) {
            const dayStart = new Date(current);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(23, 59, 59, 999);

            // Tasks for this day
            const dayTasks = tasks.filter(task => {
                const taskDate = new Date(task.dueDate);
                return taskDate >= dayStart && taskDate <= dayEnd;
            });

            // Events for this day
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.startDateTime);
                return eventDate >= dayStart && eventDate <= dayEnd;
            });

            // Calculate hours
            const taskHours = dayTasks.reduce((sum, task) => {
                return sum + ((task.timeTracking?.estimatedMinutes || 60) / 60);
            }, 0);

            const eventHours = dayEvents.reduce((sum, event) => {
                const duration = event.endDateTime
                    ? (new Date(event.endDateTime) - new Date(event.startDateTime)) / (1000 * 60 * 60)
                    : 1;
                return sum + duration;
            }, 0);

            dailyWorkload.push({
                date: new Date(dayStart),
                dayOfWeek: dayStart.getDay(),
                totalHours: Math.round((taskHours + eventHours) * 10) / 10,
                taskHours: Math.round(taskHours * 10) / 10,
                eventHours: Math.round(eventHours * 10) / 10,
                taskCount: dayTasks.length,
                eventCount: dayEvents.length,
                tasks: dayTasks,
                events: dayEvents
            });

            current.setDate(current.getDate() + 1);
        }

        return dailyWorkload;
    }

    /**
     * Generate reschedule suggestions
     */
    static _generateReschedules(overloadedDays, allDays, allTasks) {
        const suggestions = [];

        overloadedDays.forEach(overloadedDay => {
            // Find tasks that can be moved
            const movableTasks = overloadedDay.tasks
                .filter(task => task.priority !== 'critical')
                .sort((a, b) => {
                    const priorityOrder = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                });

            // Find lighter days
            const lighterDays = allDays
                .filter(day => day.totalHours < 6 && day.date > overloadedDay.date)
                .sort((a, b) => a.totalHours - b.totalHours);

            // Suggest moving tasks
            movableTasks.forEach(task => {
                if (lighterDays.length > 0 && overloadedDay.totalHours > 8) {
                    const targetDay = lighterDays[0];
                    const taskHours = (task.timeTracking?.estimatedMinutes || 60) / 60;

                    suggestions.push({
                        taskId: task._id,
                        taskTitle: task.title,
                        currentDate: overloadedDay.date,
                        suggestedDate: targetDay.date,
                        reason: `Move from overloaded day (${overloadedDay.totalHours}h) to lighter day (${targetDay.totalHours}h)`,
                        impact: {
                            fromDayNewHours: Math.round((overloadedDay.totalHours - taskHours) * 10) / 10,
                            toDayNewHours: Math.round((targetDay.totalHours + taskHours) * 10) / 10
                        }
                    });

                    // Update workload for next iteration
                    overloadedDay.totalHours -= taskHours;
                    targetDay.totalHours += taskHours;
                }
            });
        });

        return suggestions;
    }

    /**
     * Calculate balance score
     */
    static _calculateBalanceScore(dailyWorkload) {
        if (dailyWorkload.length === 0) return 100;

        const hours = dailyWorkload.map(d => d.totalHours);
        const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
        const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
        const stdDev = Math.sqrt(variance);

        // Lower standard deviation = better balance = higher score
        // Ideal: stdDev close to 0, Poor: stdDev > 3
        const score = Math.max(0, 100 - (stdDev / 3) * 100);
        return Math.round(score);
    }

    /**
     * Get workload recommendation
     */
    static _getWorkloadRecommendation(balanceScore, overloadedCount) {
        if (balanceScore >= 80) {
            return 'Your workload is well-balanced';
        } else if (balanceScore >= 60) {
            return 'Workload is acceptable but could be better distributed';
        } else if (overloadedCount > 3) {
            return `You have ${overloadedCount} overloaded days. Consider rescheduling tasks.`;
        } else {
            return 'Workload is unevenly distributed. Review the reschedule suggestions.';
        }
    }

    // ═══════════════════════════════════════════════════════════
    // DAILY NUDGES
    // ═══════════════════════════════════════════════════════════

    /**
     * Get smart nudges for the day
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} firmId - Firm ID
     * @returns {Array} Daily nudges
     */
    static async getDailyNudges(userId, firmId) {
        try {
            const nudges = [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Check today's workload
            const todayTasks = await Task.countDocuments({
                firmId,
                assignedTo: userId,
                status: { $in: ['todo', 'in_progress'] },
                dueDate: { $gte: today, $lt: tomorrow }
            });

            if (todayTasks > 8) {
                nudges.push({
                    type: 'overload_warning',
                    message: `You have ${todayTasks} tasks due today`,
                    actionSuggestion: 'Consider rescheduling low-priority tasks',
                    priority: 'high'
                });
            }

            // Check overdue tasks
            const overdueTasks = await Task.countDocuments({
                firmId,
                assignedTo: userId,
                status: { $in: ['todo', 'in_progress'] },
                dueDate: { $lt: today }
            });

            if (overdueTasks > 0) {
                nudges.push({
                    type: 'overdue_tasks',
                    message: `You have ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}`,
                    actionSuggestion: 'Review and reschedule or complete them today',
                    priority: 'critical'
                });
            }

            // Check upcoming events
            const upcomingEvents = await Event.countDocuments({
                firmId,
                $or: [
                    { organizer: userId },
                    { 'attendees.userId': userId }
                ],
                startDateTime: { $gte: today, $lt: tomorrow },
                status: { $in: ['scheduled', 'confirmed'] }
            });

            if (upcomingEvents > 5) {
                nudges.push({
                    type: 'busy_day',
                    message: `You have ${upcomingEvents} events scheduled today`,
                    actionSuggestion: 'Minimize context switching - group similar tasks',
                    priority: 'medium'
                });
            }

            // Check for tasks without estimated time
            const tasksWithoutEstimate = await Task.countDocuments({
                firmId,
                assignedTo: userId,
                status: { $in: ['todo', 'in_progress'] },
                'timeTracking.estimatedMinutes': { $lte: 0 }
            });

            if (tasksWithoutEstimate > 0) {
                nudges.push({
                    type: 'missing_estimates',
                    message: `${tasksWithoutEstimate} tasks are missing time estimates`,
                    actionSuggestion: 'Add time estimates for better planning',
                    priority: 'low'
                });
            }

            // Productivity pattern nudge
            const patterns = await this.getUserPatterns(userId, firmId);
            if (patterns.mostProductiveHours.length > 0) {
                const currentHour = new Date().getHours();
                const topHours = patterns.mostProductiveHours.slice(0, 3).map(h => h.hour);
                if (topHours.includes(currentHour)) {
                    nudges.push({
                        type: 'peak_productivity',
                        message: 'You\'re in your peak productivity window!',
                        actionSuggestion: 'Focus on your most important task now',
                        priority: 'high'
                    });
                }
            }

            // Check for long-running in-progress tasks
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const staleTasks = await Task.countDocuments({
                firmId,
                assignedTo: userId,
                status: 'in_progress',
                updatedAt: { $lt: sevenDaysAgo }
            });

            if (staleTasks > 0) {
                nudges.push({
                    type: 'stale_tasks',
                    message: `${staleTasks} task${staleTasks > 1 ? 's have' : ' has'} been in progress for over a week`,
                    actionSuggestion: 'Review and update status or break into subtasks',
                    priority: 'medium'
                });
            }

            return nudges;
        } catch (error) {
            logger.error('Error getting daily nudges:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // AUTO-SCHEDULING
    // ═══════════════════════════════════════════════════════════

    /**
     * Auto-schedule tasks based on patterns
     * @param {ObjectId} userId - User ID
     * @param {ObjectId} firmId - Firm ID
     * @param {Array} tasks - Array of tasks to schedule
     * @returns {Array} Scheduling suggestions
     */
    static async autoSchedule(userId, firmId, tasks) {
        try {
            const patterns = await this.getUserPatterns(userId, firmId);
            const suggestions = [];

            for (const task of tasks) {
                const taskDetails = {
                    priority: task.priority || 'medium',
                    estimatedMinutes: task.timeTracking?.estimatedMinutes || 60,
                    taskType: task.taskType || 'general',
                    dueDate: task.dueDate
                };

                const suggestion = await this.suggestBestTime(userId, firmId, taskDetails);

                suggestions.push({
                    taskId: task._id,
                    taskTitle: task.title,
                    suggestedDateTime: suggestion.suggestedDateTime,
                    suggestedDueTime: suggestion.suggestedDateTime
                        ? `${String(suggestion.suggestedDateTime.getHours()).padStart(2, '0')}:${String(suggestion.suggestedDateTime.getMinutes()).padStart(2, '0')}`
                        : null,
                    confidence: suggestion.confidence,
                    reason: suggestion.reason,
                    alternatives: suggestion.alternatives
                });
            }

            return suggestions;
        } catch (error) {
            logger.error('Error auto-scheduling tasks:', error);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════

    static _formatHour(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:00 ${period}`;
    }

    static _calculateMedian(arr) {
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    static _calculateStdDev(arr, mean) {
        const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
        return Math.sqrt(variance);
    }
}

module.exports = SmartSchedulingService;
