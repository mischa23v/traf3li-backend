/**
 * Task Voice Controller
 *
 * Handles voice memos and AI/NLP-powered task creation.
 * Extracted from task.controller.js for maintainability.
 */

const { Task, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { sanitizeRichText } = require('../utils/sanitize');
const { isS3Configured, getTaskFilePresignedUrl } = require('../configs/taskUpload');
const { logFileAccess } = require('../configs/storage');
const logger = require('../utils/logger');

// =============================================================================
// VOICE MEMO FUNCTIONS
// =============================================================================

/**
 * Add voice memo to task
 * POST /api/tasks/:id/voice-memos
 * Note: This endpoint expects the file to be uploaded via the attachments endpoint
 * with additional voice memo metadata
 */
const addVoiceMemo = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { duration, transcription } = req.body;
    const userId = req.userID;

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: id, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    if (!req.file) {
        throw CustomException('No audio file uploaded', 400);
    }

    // Get user name for history (user lookup by ID is safe)
    const user = await User.findById(userId).select('firstName lastName');

    let voiceMemo;

    if (isS3Configured() && req.file.location) {
        // S3 upload
        voiceMemo = {
            fileName: req.file.originalname || `voice-memo-${Date.now()}.webm`,
            fileUrl: req.file.location,
            fileKey: req.file.key,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            storageType: 's3',
            isVoiceMemo: true,
            duration: duration || 0,
            transcription: transcription ? sanitizeRichText(transcription) : null
        };
    } else {
        // Local storage
        voiceMemo = {
            fileName: req.file.originalname || `voice-memo-${Date.now()}.webm`,
            fileUrl: `/uploads/tasks/${req.file.filename}`,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            uploadedBy: userId,
            uploadedAt: new Date(),
            storageType: 'local',
            isVoiceMemo: true,
            duration: duration || 0,
            transcription: transcription ? sanitizeRichText(transcription) : null
        };
    }

    task.attachments.push(voiceMemo);

    // Add history entry
    task.history.push({
        action: 'attachment_added',
        userId,
        userName: user ? `${user.firstName} ${user.lastName}` : undefined,
        details: `Voice memo (${duration || 0}s)`,
        timestamp: new Date()
    });

    await task.save();

    const newVoiceMemo = task.attachments[task.attachments.length - 1];

    // Log voice memo upload (Gold Standard - AWS CloudTrail pattern)
    if (newVoiceMemo.fileKey) {
        logFileAccess(newVoiceMemo.fileKey, 'tasks', userId, 'upload', {
            firmId: req.firmId,
            taskId: id,
            documentId: newVoiceMemo._id,
            fileName: newVoiceMemo.fileName,
            fileSize: newVoiceMemo.fileSize,
            fileType: 'voice_memo',
            duration: duration,
            remoteIp: req.ip,
            userAgent: req.get('user-agent')
        }).catch(err => logger.error('Failed to log voice memo upload:', err.message));
    }

    // Generate download URL if S3
    let downloadUrl = newVoiceMemo.fileUrl;
    if (newVoiceMemo.storageType === 's3' && newVoiceMemo.fileKey) {
        try {
            downloadUrl = await getTaskFilePresignedUrl(newVoiceMemo.fileKey, newVoiceMemo.fileName);
        } catch (err) {
            logger.error('Error generating presigned URL', { error: err.message });
        }
    }

    res.status(201).json({
        success: true,
        message: 'تم إضافة المذكرة الصوتية بنجاح',
        voiceMemo: {
            ...newVoiceMemo.toObject(),
            downloadUrl
        }
    });
});

/**
 * Update voice memo transcription
 * PATCH /api/tasks/:id/voice-memos/:memoId/transcription
 */
const updateVoiceMemoTranscription = asyncHandler(async (req, res) => {
    const { id, memoId } = req.params;
    const { transcription } = req.body;

    // Use req.firmQuery for proper tenant isolation (solo lawyers + firm members)
    const task = await Task.findOne({ _id: id, ...req.firmQuery });
    if (!task) {
        throw CustomException('Task not found', 404);
    }

    const voiceMemo = task.attachments.id(memoId);
    if (!voiceMemo) {
        throw CustomException('Voice memo not found', 404);
    }

    if (!voiceMemo.isVoiceMemo) {
        throw CustomException('This attachment is not a voice memo', 400);
    }

    // Sanitize transcription
    voiceMemo.transcription = transcription ? sanitizeRichText(transcription) : null;

    await task.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث النص',
        voiceMemo
    });
});

// =============================================================================
// VOICE-TO-TASK CONVERSION ENDPOINTS
// =============================================================================

/**
 * Process voice transcription and create task/reminder/event
 * POST /api/tasks/voice-to-item
 */
const processVoiceToItem = asyncHandler(async (req, res) => {
    const { transcription, caseId, timezone, options } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
        throw CustomException('Voice transcription is required', 400);
    }

    // Import voice-to-task service
    const voiceToTaskService = require('../services/voiceToTask.service');

    try {
        // Process the voice transcription to determine type
        const processOptions = {
            timezone: timezone || 'Asia/Riyadh',
            currentDateTime: new Date(),
            caseId,
            ...options
        };

        const processed = await voiceToTaskService.processVoiceTranscription(
            transcription,
            userId,
            firmId,
            processOptions
        );

        // Create the appropriate item based on detected type
        let createdItem;
        let itemType = processed.type;

        switch (processed.type) {
            case 'task':
                createdItem = await voiceToTaskService.createTaskFromVoice(
                    transcription,
                    userId,
                    firmId,
                    caseId
                );
                break;

            case 'reminder':
                createdItem = await voiceToTaskService.createReminderFromVoice(
                    transcription,
                    userId,
                    firmId
                );
                break;

            case 'event':
                createdItem = await voiceToTaskService.createEventFromVoice(
                    transcription,
                    userId,
                    firmId
                );
                break;

            default:
                // Default to task if type is uncertain
                createdItem = await voiceToTaskService.createTaskFromVoice(
                    transcription,
                    userId,
                    firmId,
                    caseId
                );
                itemType = 'task';
        }

        res.status(201).json({
            success: true,
            message: `${itemType === 'task' ? 'Task' : itemType === 'reminder' ? 'Reminder' : 'Event'} created successfully from voice`,
            type: itemType,
            data: createdItem,
            confidence: processed.confidence,
            metadata: processed.metadata
        });
    } catch (error) {
        logger.error('Voice to item conversion error', { error: error.message });
        throw CustomException(error.message || 'Failed to create item from voice', 500);
    }
});

/**
 * Batch process voice memos into tasks/reminders/events
 * POST /api/tasks/voice-to-item/batch
 */
const batchProcessVoiceMemos = asyncHandler(async (req, res) => {
    const { memos } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    if (!Array.isArray(memos) || memos.length === 0) {
        throw CustomException('Memos array is required and must not be empty', 400);
    }

    // Import voice-to-task service
    const voiceToTaskService = require('../services/voiceToTask.service');

    try {
        const results = await voiceToTaskService.processVoiceMemos(memos, userId, firmId);

        const summary = {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            byType: {
                task: results.filter(r => r.type === 'task').length,
                reminder: results.filter(r => r.type === 'reminder').length,
                event: results.filter(r => r.type === 'event').length
            }
        };

        res.status(200).json({
            success: true,
            message: `Processed ${summary.successful} of ${summary.total} voice memos successfully`,
            summary,
            results
        });
    } catch (error) {
        logger.error('Batch voice processing error', { error: error.message });
        throw CustomException(error.message || 'Failed to process voice memos', 500);
    }
});

// =============================================================================
// NLP & AI-POWERED TASK ENDPOINTS
// =============================================================================

/**
 * Create task from natural language
 * POST /api/tasks/parse
 */
const createTaskFromNaturalLanguage = asyncHandler(async (req, res) => {
    const { text } = req.body;
    const userId = req.userID;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw CustomException('Natural language text is required', 400);
    }

    // Import NLP service
    const nlpService = require('../services/nlp.service');

    // Parse the natural language input
    const context = {
        timezone: 'Asia/Riyadh',
        currentDateTime: new Date()
    };

    const parseResult = await nlpService.parseEventFromText(text, context);

    if (!parseResult.success) {
        throw CustomException('Failed to parse natural language input', 400);
    }

    const { eventData, confidence } = parseResult;

    // Map event data to task data - use req.addFirmId for proper tenant isolation
    const taskData = req.addFirmId({
        title: eventData.title || 'Untitled Task',
        description: eventData.description || eventData.notes || '',
        priority: eventData.priority || 'medium',
        status: 'pending',
        dueDate: eventData.startDateTime,
        dueTime: eventData.startDateTime
            ? `${String(new Date(eventData.startDateTime).getHours()).padStart(2, '0')}:${String(new Date(eventData.startDateTime).getMinutes()).padStart(2, '0')}`
            : null,
        tags: eventData.tags || [],
        notes: eventData.notes || '',
        createdBy: userId,
        metadata: {
            nlpParsed: true,
            originalText: text,
            parsingConfidence: confidence,
            parsedAt: new Date()
        }
    });

    // Create the task
    const task = await Task.create(taskData);

    res.status(201).json({
        success: true,
        message: 'Task created from natural language',
        task,
        parsingDetails: {
            confidence,
            originalText: text,
            tokensUsed: parseResult.tokensUsed || 0
        }
    });
});

/**
 * Create task from voice transcription
 * POST /api/tasks/voice
 */
const createTaskFromVoice = asyncHandler(async (req, res) => {
    const { transcription } = req.body;
    const userId = req.userID;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية إنشاء مهام جديدة', 403);
    }

    if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
        throw CustomException('Voice transcription is required', 400);
    }

    // Import voice to task service
    const voiceToTaskService = require('../services/voiceToTask.service');

    // Process voice transcription
    const context = {
        timezone: 'Asia/Riyadh',
        currentDateTime: new Date(),
        userId
    };

    const result = await voiceToTaskService.processVoiceTranscription(transcription, context);

    if (!result.success) {
        throw CustomException('Failed to process voice transcription', 400);
    }

    const { eventData, confidence, metadata } = result;

    // Map event data to task data - use req.addFirmId for proper tenant isolation
    const taskData = req.addFirmId({
        title: eventData.title || 'Untitled Task',
        description: eventData.description || eventData.notes || '',
        priority: eventData.priority || 'medium',
        status: 'pending',
        dueDate: eventData.startDateTime,
        dueTime: eventData.startDateTime
            ? `${String(new Date(eventData.startDateTime).getHours()).padStart(2, '0')}:${String(new Date(eventData.startDateTime).getMinutes()).padStart(2, '0')}`
            : null,
        tags: eventData.tags || [],
        notes: eventData.notes || '',
        createdBy: userId,
        metadata: {
            voiceCreated: true,
            originalTranscription: metadata.originalTranscription,
            cleanedTranscription: metadata.cleanedTranscription,
            parsingConfidence: confidence,
            processedAt: metadata.processedAt
        }
    });

    // Create the task
    const task = await Task.create(taskData);

    res.status(201).json({
        success: true,
        message: 'Task created from voice transcription',
        task,
        processingDetails: {
            confidence,
            originalTranscription: metadata.originalTranscription,
            cleanedTranscription: metadata.cleanedTranscription
        }
    });
});

/**
 * Get smart schedule suggestions
 * GET /api/tasks/smart-schedule
 */
const getSmartScheduleSuggestions = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const firmId = req.firmId;

    // Import smart scheduling service
    const SmartSchedulingService = require('../services/smartScheduling.service');

    // Get query parameters
    const {
        timezone = 'Asia/Riyadh',
        daysAhead = 7,
        includeWorkloadAnalysis = 'true',
        includeDailyNudges = 'true'
    } = req.query;

    // Get user patterns and suggestions
    const patterns = await SmartSchedulingService.getUserPatterns(userId, firmId);

    // Get workload analysis
    const workloadAnalysis = includeWorkloadAnalysis === 'true'
        ? await SmartSchedulingService.analyzeWorkload(userId, firmId, {
            start: new Date(),
            end: new Date(Date.now() + parseInt(daysAhead) * 24 * 60 * 60 * 1000)
        })
        : null;

    // Get daily nudges
    const dailyNudges = includeDailyNudges === 'true'
        ? await SmartSchedulingService.getDailyNudges(userId, firmId)
        : null;

    // Get unscheduled tasks
    const unscheduledTasks = await Task.find({
        firmId,
        createdBy: userId,
        status: { $in: ['pending', 'in_progress'] },
        $or: [
            { dueDate: null },
            { dueTime: null }
        ],
        isDeleted: false
    })
        .select('title priority tags timeTracking')
        .limit(10)
        .lean();

    // Generate suggestions for unscheduled tasks
    const taskSuggestions = [];
    for (const task of unscheduledTasks.slice(0, 5)) {
        const suggestion = await SmartSchedulingService.suggestBestTime(userId, firmId, {
            priority: task.priority || 'medium',
            estimatedMinutes: task.timeTracking?.estimatedMinutes || 60,
            taskType: task.taskType || 'general',
            dueDate: task.dueDate
        });

        taskSuggestions.push({
            taskId: task._id,
            taskTitle: task.title,
            suggestion
        });
    }

    res.status(200).json({
        success: true,
        patterns,
        workloadAnalysis,
        dailyNudges,
        taskSuggestions,
        unscheduledTasksCount: unscheduledTasks.length
    });
});

/**
 * Auto-schedule multiple tasks
 * POST /api/tasks/auto-schedule
 */
const autoScheduleTasks = asyncHandler(async (req, res) => {
    const { taskIds } = req.body;
    const userId = req.userID;
    const firmId = req.firmId;

    // Block departed users
    if (req.isDeparted) {
        throw CustomException('لم يعد لديك صلاحية تعديل المهام', 403);
    }

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        throw CustomException('Array of task IDs is required', 400);
    }

    if (taskIds.length > 20) {
        throw CustomException('Cannot auto-schedule more than 20 tasks at once', 400);
    }

    // Import smart scheduling service
    const SmartSchedulingService = require('../services/smartScheduling.service');

    // Fetch tasks
    const tasks = await Task.find({
        _id: { $in: taskIds },
        createdBy: userId,
        firmId,
        isDeleted: false
    });

    if (tasks.length === 0) {
        throw CustomException('No valid tasks found', 404);
    }

    // Auto-schedule tasks
    const suggestions = await SmartSchedulingService.autoSchedule(userId, firmId, tasks);

    // Apply scheduling suggestions
    const updatedTasks = [];
    for (const suggestion of suggestions) {
        if (suggestion.suggestedDateTime) {
            const task = tasks.find(t => t._id.toString() === suggestion.taskId.toString());
            if (task) {
                task.dueDate = suggestion.suggestedDateTime;
                task.dueTime = suggestion.suggestedDueTime;

                // Add metadata
                if (!task.metadata) task.metadata = {};
                task.metadata.aiScheduled = true;
                task.metadata.scheduledAt = new Date();
                task.metadata.schedulingConfidence = suggestion.confidence;
                task.metadata.schedulingReason = suggestion.reason;

                await task.save();
                updatedTasks.push(task);
            }
        }
    }

    res.status(200).json({
        success: true,
        message: `Successfully auto-scheduled ${updatedTasks.length} task(s)`,
        scheduledTasks: updatedTasks,
        suggestions,
        totalProcessed: tasks.length,
        totalScheduled: updatedTasks.length
    });
});

module.exports = {
    // Voice memo functions
    addVoiceMemo,
    updateVoiceMemoTranscription,
    // Voice-to-task conversion
    processVoiceToItem,
    batchProcessVoiceMemos,
    // NLP & AI functions
    createTaskFromNaturalLanguage,
    createTaskFromVoice,
    getSmartScheduleSuggestions,
    autoScheduleTasks
};
