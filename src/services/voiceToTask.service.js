const nlpService = require('./nlp.service');
const { Task, Reminder, Event } = require('../models');
const logger = require('../utils/logger');

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Voice to Task Service
 * Converts voice transcriptions into structured tasks, reminders, and events
 * Integrates with NLP service for intelligent parsing
 */
class VoiceToTaskService {
  /**
   * Process a voice transcription into structured data
   * @param {string} transcription - Voice transcription text
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @param {Object} options - Additional options (timezone, context, etc.)
   * @returns {Promise<Object>} - { type, extractedData, confidence }
   */
  async processVoiceTranscription(transcription, userId, firmId, options = {}) {
    if (!transcription || typeof transcription !== 'string') {
      throw new Error('Valid transcription text is required');
    }

    if (!userId) {
      throw new Error('User ID is required');
    }

    try {
      // Clean up transcription
      const cleanedTranscription = this._cleanTranscription(transcription);

      // Validate transcription quality
      const validation = this.validateTranscription(cleanedTranscription);
      if (!validation.isValid) {
        throw new Error(`Invalid transcription: ${validation.warnings.join(', ')}`);
      }

      // Determine intent type
      const intent = this._determineIntent(cleanedTranscription);

      // Parse based on type using NLP service
      let extractedData;
      let confidence;

      switch (intent.type) {
        case 'task':
          extractedData = await this._parseTask(cleanedTranscription, userId, firmId, options);
          confidence = intent.confidence * validation.confidence;
          break;

        case 'reminder':
          const reminderResult = await nlpService.parseReminderFromText(
            cleanedTranscription,
            {
              userId,
              firmId,
              timezone: options.timezone || 'Asia/Riyadh',
              currentDateTime: options.currentDateTime || new Date()
            }
          );
          extractedData = reminderResult.reminderData;
          confidence = reminderResult.confidence.overall * validation.confidence;
          break;

        case 'event':
          const eventResult = await nlpService.parseEventFromText(
            cleanedTranscription,
            {
              userId,
              firmId,
              timezone: options.timezone || 'Asia/Riyadh',
              currentDateTime: options.currentDateTime || new Date()
            }
          );
          extractedData = eventResult.eventData;
          confidence = eventResult.confidence * validation.confidence;
          break;

        default:
          // Default to task
          extractedData = await this._parseTask(cleanedTranscription, userId, firmId, options);
          confidence = 0.5 * validation.confidence;
      }

      return {
        type: intent.type,
        extractedData,
        confidence,
        metadata: {
          source: 'voice',
          originalTranscription: transcription,
          cleanedTranscription,
          processedAt: new Date(),
          validation
        }
      };
    } catch (error) {
      logger.error('Voice transcription processing error:', error);
      throw new Error(`Failed to process voice transcription: ${error.message}`);
    }
  }

  /**
   * Create task from voice transcription
   * @param {string} transcription - Voice transcription text
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @param {string} caseId - Optional case ID
   * @returns {Promise<Object>} - Created task document
   */
  async createTaskFromVoice(transcription, userId, firmId, caseId = null) {
    try {
      const cleanedTranscription = this._cleanTranscription(transcription);
      const taskData = await this._parseTask(cleanedTranscription, userId, firmId, { caseId });

      // Create task
      const task = await Task.create({
        title: taskData.title,
        description: taskData.description || cleanedTranscription,
        priority: taskData.priority || 'medium',
        status: 'todo',
        label: taskData.label,
        tags: taskData.tags || ['voice-created'],
        dueDate: taskData.dueDate,
        dueTime: taskData.dueTime,
        startDate: taskData.startDate,
        assignedTo: taskData.assignedTo || userId,
        createdBy: userId,
        firmId,
        caseId: caseId || taskData.caseId,
        clientId: taskData.clientId,
        notes: `Created from voice memo\n\nOriginal transcription: "${transcription}"`,
        subtasks: taskData.subtasks || [],
        checklists: taskData.checklists || [],
        timeTracking: {
          estimatedMinutes: taskData.estimatedMinutes || 0,
          actualMinutes: 0,
          sessions: []
        },
        reminders: taskData.reminders || [],
        points: taskData.points || 0
      });

      // Add history entry
      task.history.push({
        action: 'created',
        userId,
        changes: {
          title: task.title,
          status: task.status,
          source: 'voice-transcription'
        },
        timestamp: new Date()
      });

      await task.save();

      // Create linked calendar event if task has a due date
      if (task.dueDate) {
        try {
          const eventStartDateTime = new Date(task.dueDate);
          let isAllDay = true;

          if (task.dueTime) {
            const [hours, minutes] = task.dueTime.split(':');
            eventStartDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            isAllDay = false;
          }

          const linkedEvent = await Event.create({
            title: task.title,
            type: 'task',
            description: task.description,
            startDateTime: eventStartDateTime,
            endDateTime: isAllDay ? null : new Date(eventStartDateTime.getTime() + 60 * 60 * 1000),
            allDay: isAllDay,
            taskId: task._id,
            caseId: task.caseId,
            clientId: task.clientId,
            organizer: userId,
            firmId,
            createdBy: userId,
            attendees: task.assignedTo ? [{ userId: task.assignedTo, status: 'confirmed', role: 'required' }] : [],
            priority: task.priority,
            color: '#10b981',
            tags: task.tags
          });

          task.linkedEventId = linkedEvent._id;
          await task.save();
        } catch (error) {
          logger.error('Error creating linked calendar event:', error);
        }
      }

      // Populate and return
      const populatedTask = await Task.findOne({ _id: task._id, firmId })
        .populate('assignedTo', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .populate('linkedEventId', 'eventId title startDateTime');

      return populatedTask;
    } catch (error) {
      logger.error('Create task from voice error:', error);
      throw new Error(`Failed to create task from voice: ${error.message}`);
    }
  }

  /**
   * Create reminder from voice transcription
   * @param {string} transcription - Voice transcription text
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} - Created reminder document
   */
  async createReminderFromVoice(transcription, userId, firmId) {
    try {
      const cleanedTranscription = this._cleanTranscription(transcription);

      // Parse using NLP service
      const result = await nlpService.parseReminderFromText(
        cleanedTranscription,
        {
          userId,
          firmId,
          timezone: 'Asia/Riyadh',
          currentDateTime: new Date()
        }
      );

      const reminderData = result.reminderData;

      // Create reminder
      const reminder = await Reminder.create({
        reminderId: `RMD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        title: reminderData.title,
        description: reminderData.description || cleanedTranscription,
        userId,
        firmId,
        reminderDateTime: reminderData.reminderDateTime,
        reminderDate: reminderData.reminderDate,
        reminderTime: reminderData.reminderTime,
        priority: reminderData.priority,
        type: reminderData.type,
        status: 'pending',
        tags: reminderData.tags || ['voice-created'],
        notes: `Created from voice memo\n\nOriginal transcription: "${transcription}"`,
        notification: {
          channels: ['push', 'in_app'],
          advanceNotifications: [
            {
              beforeMinutes: 15,
              channels: ['push', 'in_app'],
              sent: false
            }
          ],
          escalation: {
            enabled: false,
            escalateAfterMinutes: 30
          }
        },
        recurring: {
          enabled: false
        },
        metadata: {
          source: 'voice',
          confidence: result.confidence.overall,
          originalTranscription: transcription,
          processedAt: new Date()
        }
      });

      // Populate and return
      const populatedReminder = await Reminder.findOne({ _id: reminder._id, firmId })
        .populate('userId', 'firstName lastName username email image')
        .populate('completedBy', 'firstName lastName')
        .populate('delegatedTo', 'firstName lastName email');

      return populatedReminder;
    } catch (error) {
      logger.error('Create reminder from voice error:', error);
      throw new Error(`Failed to create reminder from voice: ${error.message}`);
    }
  }

  /**
   * Create event from voice transcription
   * @param {string} transcription - Voice transcription text
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Object>} - Created event document
   */
  async createEventFromVoice(transcription, userId, firmId) {
    try {
      const cleanedTranscription = this._cleanTranscription(transcription);

      // Parse using NLP service
      const result = await nlpService.parseEventFromText(
        cleanedTranscription,
        {
          userId,
          firmId,
          timezone: 'Asia/Riyadh',
          currentDateTime: new Date()
        }
      );

      const eventData = result.eventData;

      // Create event
      const event = await Event.create({
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        title: eventData.title,
        description: eventData.description || cleanedTranscription,
        type: eventData.type || 'meeting',
        status: 'scheduled',
        startDateTime: eventData.startDateTime,
        endDateTime: eventData.endDateTime,
        allDay: eventData.allDay || false,
        location: eventData.location,
        organizer: userId,
        firmId,
        createdBy: userId,
        attendees: this._normalizeAttendees(eventData.attendees, userId),
        priority: eventData.priority || 'medium',
        tags: eventData.tags || ['voice-created'],
        color: this._getColorByType(eventData.type),
        notes: `Created from voice memo\n\nOriginal transcription: "${transcription}"`,
        reminders: [
          {
            type: 'notification',
            beforeMinutes: 15,
            sent: false
          }
        ],
        visibility: 'firm',
        metadata: {
          source: 'voice',
          confidence: result.confidence,
          originalTranscription: transcription,
          processedAt: new Date()
        }
      });

      // Populate and return
      const populatedEvent = await Event.findOne({ _id: event._id, firmId })
        .populate('organizer', 'firstName lastName username email image')
        .populate('createdBy', 'firstName lastName username email image')
        .populate('attendees.userId', 'firstName lastName email image')
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName')
        .populate('taskId', 'title status');

      return populatedEvent;
    } catch (error) {
      logger.error('Create event from voice error:', error);
      throw new Error(`Failed to create event from voice: ${error.message}`);
    }
  }

  /**
   * Batch process voice memos
   * @param {Array} memos - Array of { memoId, transcription, ...metadata }
   * @param {string} userId - User ID
   * @param {string} firmId - Firm ID
   * @returns {Promise<Array>} - [{ memoId, createdItem, type, success }]
   */
  async processVoiceMemos(memos, userId, firmId) {
    if (!Array.isArray(memos) || memos.length === 0) {
      throw new Error('Memos array is required and must not be empty');
    }

    const results = [];

    for (const memo of memos) {
      try {
        const { memoId, transcription, caseId, timezone, options = {} } = memo;

        if (!transcription) {
          results.push({
            memoId,
            success: false,
            error: 'Missing transcription',
            type: null,
            createdItem: null
          });
          continue;
        }

        // Process transcription to determine type
        const processed = await this.processVoiceTranscription(
          transcription,
          userId,
          firmId,
          { ...options, timezone, caseId }
        );

        let createdItem;

        // Create appropriate item based on type
        switch (processed.type) {
          case 'task':
            createdItem = await this.createTaskFromVoice(transcription, userId, firmId, caseId);
            break;

          case 'reminder':
            createdItem = await this.createReminderFromVoice(transcription, userId, firmId);
            break;

          case 'event':
            createdItem = await this.createEventFromVoice(transcription, userId, firmId);
            break;

          default:
            // Default to task
            createdItem = await this.createTaskFromVoice(transcription, userId, firmId, caseId);
        }

        results.push({
          memoId,
          success: true,
          type: processed.type,
          createdItem,
          confidence: processed.confidence,
          metadata: processed.metadata
        });
      } catch (error) {
        logger.error(`Error processing memo ${memo.memoId}:`, error);
        results.push({
          memoId: memo.memoId,
          success: false,
          error: error.message,
          type: null,
          createdItem: null
        });
      }
    }

    return results;
  }

  /**
   * Process multiple voice commands/events from a single transcription
   * @param {string} transcription - Voice transcription
   * @param {Object} context - Context
   * @returns {Promise<Array>} - Array of parsed events
   */
  async processMultipleCommands(transcription, context = {}) {
    try {
      const cleanedTranscription = this._cleanTranscription(transcription);

      // Check if transcription contains multiple events
      if (this._containsMultipleEvents(cleanedTranscription)) {
        const events = await nlpService.parseMultipleEvents(cleanedTranscription, context);

        return events.map(event => ({
          ...event,
          metadata: {
            source: 'voice',
            originalTranscription: transcription,
            processedAt: new Date()
          }
        }));
      } else {
        // Single event
        const result = await this.processVoiceTranscription(transcription, context);
        return [result.eventData];
      }
    } catch (error) {
      logger.error('Multiple commands processing error:', error);
      throw error;
    }
  }

  /**
   * Parse task data from transcription
   * @private
   */
  async _parseTask(transcription, userId, firmId, options = {}) {
    try {
      // Use NLP for parsing (we'll leverage event parsing and adapt it for tasks)
      const eventResult = await nlpService.parseEventFromText(
        transcription,
        {
          userId,
          firmId,
          timezone: options.timezone || 'Asia/Riyadh',
          currentDateTime: options.currentDateTime || new Date()
        }
      );

      const eventData = eventResult.eventData;

      // Convert event data to task data
      const taskData = {
        title: eventData.title || this._extractTitle(transcription),
        description: eventData.description || transcription,
        priority: eventData.priority || this._inferPriority(transcription),
        label: this._inferLabel(transcription),
        tags: eventData.tags || [],
        dueDate: eventData.startDateTime,
        dueTime: eventData.startDateTime ? this._extractTime(eventData.startDateTime) : null,
        startDate: options.currentDateTime || new Date(),
        caseId: options.caseId,
        assignedTo: this._extractAssignee(transcription, userId),
        estimatedMinutes: eventData.duration || this._estimateDuration(transcription),
        subtasks: this._extractSubtasks(transcription),
        checklists: this._extractChecklists(transcription),
        reminders: []
      };

      return taskData;
    } catch (error) {
      logger.error('Task parsing error:', error);
      // Fallback to basic parsing
      return {
        title: this._extractTitle(transcription),
        description: transcription,
        priority: this._inferPriority(transcription),
        label: this._inferLabel(transcription),
        tags: ['voice-created'],
        dueDate: null,
        dueTime: null
      };
    }
  }

  /**
   * Determine intent type from transcription
   * @private
   */
  _determineIntent(transcription) {
    const text = transcription.toLowerCase();

    // Reminder indicators
    if (/\b(remind me|reminder|don't forget|remember to)\b/.test(text)) {
      return { type: 'reminder', confidence: 0.9 };
    }

    // Event/meeting indicators
    if (/\b(schedule|meeting|appointment|event|call with|conference|zoom|teams)\b/.test(text)) {
      return { type: 'event', confidence: 0.85 };
    }

    // Task indicators
    if (/\b(task|todo|do|complete|finish|work on|create|need to|have to)\b/.test(text)) {
      return { type: 'task', confidence: 0.8 };
    }

    // Default to task
    return { type: 'task', confidence: 0.5 };
  }

  /**
   * Extract title from transcription
   * @private
   */
  _extractTitle(text) {
    // Remove common prefixes
    let title = text
      .replace(/^(remind me to|reminder to|task to|need to|have to|must|should|todo|create|add)\s+/i, '')
      .trim();

    // Take first sentence or first 100 chars
    const firstSentence = title.split(/[.!?]/)[0];
    title = firstSentence.length > 0 ? firstSentence : title;

    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    return title || 'Voice Task';
  }

  /**
   * Infer priority from text
   * @private
   */
  _inferPriority(text) {
    const lowerText = text.toLowerCase();

    if (/\b(urgent|critical|asap|immediately|emergency|high priority)\b/.test(lowerText)) {
      return 'critical';
    }
    if (/\b(important|high|soon)\b/.test(lowerText)) {
      return 'high';
    }
    if (/\b(low priority|minor|low|whenever)\b/.test(lowerText)) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Infer label from text
   * @private
   */
  _inferLabel(text) {
    const lowerText = text.toLowerCase();

    if (/\b(bug|fix|error|issue|problem)\b/.test(lowerText)) return 'bug';
    if (/\b(feature|new|add|create)\b/.test(lowerText)) return 'feature';
    if (/\b(document|docs|documentation|write)\b/.test(lowerText)) return 'documentation';
    if (/\b(legal|court|case|law)\b/.test(lowerText)) return 'legal';
    if (/\b(urgent|emergency|critical)\b/.test(lowerText)) return 'urgent';
    if (/\b(admin|administrative|paperwork)\b/.test(lowerText)) return 'administrative';

    return null;
  }

  /**
   * Extract time from date
   * @private
   */
  _extractTime(date) {
    if (!date) return null;
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Extract assignee from text
   * @private
   */
  _extractAssignee(text, defaultUserId) {
    // Look for "assign to", "for", "@mention" patterns
    // For now, return default user
    // In production, you'd look up users by name
    return defaultUserId;
  }

  /**
   * Estimate duration from text
   * @private
   */
  _estimateDuration(text) {
    const lowerText = text.toLowerCase();

    // Look for explicit duration mentions
    const minutesMatch = lowerText.match(/(\d+)\s*(?:minute|min)/i);
    if (minutesMatch) return parseInt(minutesMatch[1]);

    const hoursMatch = lowerText.match(/(\d+)\s*(?:hour|hr)/i);
    if (hoursMatch) return parseInt(hoursMatch[1]) * 60;

    // Default estimate based on priority
    const priority = this._inferPriority(text);
    if (priority === 'critical') return 120; // 2 hours
    if (priority === 'high') return 90; // 1.5 hours
    if (priority === 'low') return 30; // 30 minutes

    return 60; // 1 hour default
  }

  /**
   * Extract subtasks from text
   * @private
   */
  _extractSubtasks(text) {
    const subtasks = [];

    // Look for numbered lists or bullet points
    const listPattern = /(?:^|\n)\s*(?:[\d]+\.|[-*])\s*(.+)/gm;
    let match;

    while ((match = listPattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        subtasks.push({
          title: match[1].trim(),
          completed: false,
          order: subtasks.length
        });
      }
    }

    return subtasks;
  }

  /**
   * Extract checklists from text
   * @private
   */
  _extractChecklists(text) {
    const checklists = [];
    const subtasks = this._extractSubtasks(text);

    if (subtasks.length > 0) {
      checklists.push({
        title: 'Voice Memo Checklist',
        items: subtasks.map(st => ({
          text: st.title,
          completed: false
        }))
      });
    }

    return checklists;
  }

  /**
   * Normalize attendees for event creation
   * @private
   */
  _normalizeAttendees(attendees, organizerId) {
    if (!Array.isArray(attendees)) return [];

    return attendees.map(attendee => ({
      name: attendee.name,
      email: attendee.email,
      role: attendee.role || 'required',
      status: 'invited',
      responseStatus: 'pending',
      isRequired: attendee.role !== 'optional',
      notificationSent: false
    }));
  }

  /**
   * Get color by event type
   * @private
   */
  _getColorByType(type) {
    const colorMap = {
      hearing: '#ef4444',
      court_date: '#dc2626',
      meeting: '#3b82f6',
      client_meeting: '#8b5cf6',
      deposition: '#f59e0b',
      mediation: '#10b981',
      deadline: '#ef4444',
      task: '#10b981',
      consultation: '#06b6d4',
      training: '#6366f1'
    };

    return colorMap[type] || '#6b7280';
  }

  /**
   * Clean transcription text
   * @private
   */
  _cleanTranscription(transcription) {
    let cleaned = transcription.trim();

    // Remove common filler words and speech artifacts
    const fillerWords = [
      'um', 'uh', 'umm', 'uhh', 'er', 'ah', 'like',
      'you know', 'i mean', 'basically', 'actually'
    ];

    const fillerPattern = new RegExp(`\\b(${fillerWords.map(escapeRegex).join('|')})\\b`, 'gi');
    cleaned = cleaned.replace(fillerPattern, ' ');

    // Normalize multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

    return cleaned;
  }

  /**
   * Check if transcription contains multiple events
   * @private
   */
  _containsMultipleEvents(text) {
    const multiEventIndicators = [
      /\band then\b/i,
      /\balso\b/i,
      /\bafter that\b/i,
      /\bnext\b/i,
      /\bfollowed by\b/i,
      /,.*(?:meeting|appointment|call|event)/i,
      /;\s*(?:meeting|appointment|call|event)/i
    ];

    return multiEventIndicators.some(pattern => pattern.test(text));
  }

  /**
   * Validate voice transcription quality
   * @param {string} transcription - Voice transcription
   * @returns {Object} - Validation result
   */
  validateTranscription(transcription) {
    const validation = {
      isValid: true,
      warnings: [],
      confidence: 1.0
    };

    // Check minimum length
    if (transcription.length < 10) {
      validation.warnings.push('Transcription is very short');
      validation.confidence -= 0.3;
    }

    // Check for too much repetition (indicates poor transcription)
    const words = transcription.split(/\s+/);
    const uniqueWords = new Set(words);
    const repetitionRatio = uniqueWords.size / words.length;

    if (repetitionRatio < 0.3) {
      validation.warnings.push('High word repetition detected');
      validation.confidence -= 0.2;
    }

    // Check for minimum meaningful content
    const meaningfulWords = words.filter(w => w.length > 3);
    if (meaningfulWords.length < 3) {
      validation.warnings.push('Insufficient meaningful content');
      validation.confidence -= 0.3;
      validation.isValid = false;
    }

    validation.confidence = Math.max(validation.confidence, 0);

    return validation;
  }

  /**
   * Extract event intent from voice command
   * @param {string} transcription - Voice transcription
   * @returns {Object} - Intent and confidence
   */
  extractIntent(transcription) {
    const text = transcription.toLowerCase();

    // Create/schedule intents
    if (/\b(schedule|create|add|set up|book|arrange)\b/.test(text)) {
      return { intent: 'create_event', confidence: 0.9 };
    }

    // Update intents
    if (/\b(reschedule|move|change|update|postpone)\b/.test(text)) {
      return { intent: 'update_event', confidence: 0.85 };
    }

    // Cancel intents
    if (/\b(cancel|remove|delete)\b/.test(text)) {
      return { intent: 'cancel_event', confidence: 0.9 };
    }

    // Query intents
    if (/\b(what|when|show|list|tell me|do i have)\b/.test(text)) {
      return { intent: 'query_events', confidence: 0.8 };
    }

    // Default: assume create event
    return { intent: 'create_event', confidence: 0.5 };
  }

  /**
   * Generate suggestions for improving voice commands
   * @param {string} transcription - Voice transcription
   * @returns {Array} - Array of suggestions
   */
  generateSuggestions(transcription) {
    const suggestions = [];
    const text = transcription.toLowerCase();

    // Check for date/time
    if (!/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at|pm|am|\d+:\d+)\b/.test(text)) {
      suggestions.push('Consider specifying a date and time (e.g., "tomorrow at 2pm")');
    }

    // Check for duration
    if (!/\b(for|duration|minutes|hours|hour|minute)\b/.test(text)) {
      suggestions.push('Consider specifying duration (e.g., "for 1 hour")');
    }

    // Check for priority
    if (!/\b(urgent|important|critical|high|low priority)\b/.test(text)) {
      suggestions.push('Consider mentioning priority level (e.g., "high priority")');
    }

    // Check for assignee
    if (!/\b(assign to|for|with)\b/.test(text)) {
      suggestions.push('Consider mentioning who should handle this (e.g., "assign to John")');
    }

    return suggestions;
  }

  /**
   * Convert speech patterns to formal event data
   * @param {Object} eventData - Event data to formalize
   * @returns {Object} - Formalized event data
   */
  formalizeEventData(eventData) {
    const formalized = { ...eventData };

    // Formalize title (remove casual speech)
    if (formalized.title) {
      formalized.title = formalized.title
        .replace(/\b(gonna|gotta|wanna)\b/gi, match => {
          const replacements = {
            'gonna': 'going to',
            'gotta': 'got to',
            'wanna': 'want to'
          };
          return replacements[match.toLowerCase()] || match;
        })
        .replace(/\b(can't|won't|don't)\b/gi, match => {
          const replacements = {
            "can't": 'cannot',
            "won't": 'will not',
            "don't": 'do not'
          };
          return replacements[match.toLowerCase()] || match;
        });
    }

    // Ensure description is professional
    if (formalized.description) {
      formalized.description = formalized.description
        .replace(/\b(yeah|yep|nope|ok|okay)\b/gi, '')
        .trim();
    }

    return formalized;
  }
}

module.exports = new VoiceToTaskService();
