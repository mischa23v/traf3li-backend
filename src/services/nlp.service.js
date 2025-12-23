const Anthropic = require('@anthropic-ai/sdk');
// NOTE: Install chrono-node by running: npm install chrono-node
const chrono = require('chrono-node');
const AISettingsService = require('./aiSettings.service');
const logger = require('../utils/logger');

/**
 * Helper function to add hours to a date
 * @param {Date} date - Original date
 * @param {number} hours - Hours to add
 * @returns {Date} New date with hours added
 */
function addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
}

/**
 * Helper function to add days to a date
 * @param {Date} date - Original date
 * @param {number} days - Days to add
 * @returns {Date} New date with days added
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Natural Language Processing Service
 * Uses chrono-node for date/time parsing and Claude for intent extraction
 * Supports both English and Arabic text for Saudi Arabia market
 *
 * API keys are provided by the firm (user-configured in settings)
 */
class NLPService {
  constructor() {
    // Default client using environment variable (fallback)
    this.anthropic = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      : null;
    this.model = 'claude-3-5-sonnet-20241022';

    // Cache for firm-specific clients (TTL: 5 minutes)
    this._clientCache = new Map();
    this._cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Priority keywords in English and Arabic
    this.priorityKeywords = {
      critical: ['urgent', 'critical', 'asap', 'emergency', 'عاجل', 'طارئ', 'فوري'],
      high: ['high priority', 'important', 'soon', 'مهم', 'عالي', 'قريباً'],
      medium: ['medium', 'normal', 'متوسط', 'عادي'],
      low: ['low priority', 'when possible', 'منخفض', 'عند الإمكان', 'لا يستعجل']
    };

    // Recurrence keywords in English and Arabic
    this.recurrenceKeywords = {
      daily: ['daily', 'every day', 'everyday', 'يومي', 'كل يوم'],
      weekly: ['weekly', 'every week', 'أسبوعي', 'كل أسبوع'],
      biweekly: ['biweekly', 'every two weeks', 'كل أسبوعين'],
      monthly: ['monthly', 'every month', 'شهري', 'كل شهر'],
      quarterly: ['quarterly', 'every quarter', 'ربع سنوي', 'كل ربع سنة'],
      yearly: ['yearly', 'annually', 'every year', 'سنوي', 'كل سنة']
    };

    // Action type keywords
    this.actionKeywords = {
      call: ['call', 'phone', 'اتصال', 'اتصل', 'هاتف'],
      meeting: ['meeting', 'meet', 'اجتماع', 'لقاء', 'مقابلة'],
      review: ['review', 'check', 'مراجعة', 'تدقيق', 'فحص'],
      file: ['file', 'submit', 'تقديم', 'رفع', 'ملف'],
      remind: ['remind', 'reminder', 'تذكير', 'ذكرني'],
      deadline: ['deadline', 'due', 'موعد نهائي', 'آخر موعد']
    };

    // Days of week in English and Arabic
    this.daysOfWeek = {
      en: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    };
  }

  /**
   * Get Anthropic client for a specific firm
   * Uses firm's API key from settings, falls back to environment variable
   * @param {string} firmId - Firm ID
   * @returns {Promise<Anthropic|null>} Anthropic client or null if not configured
   */
  async _getClientForFirm(firmId) {
    // Check cache first
    const cached = this._clientCache.get(firmId);
    if (cached && Date.now() - cached.timestamp < this._cacheTimeout) {
      return cached.client;
    }

    // Try to get firm's API key
    if (firmId) {
      try {
        const apiKey = await AISettingsService.getApiKey(firmId, 'anthropic');
        if (apiKey) {
          const client = new Anthropic({ apiKey });
          this._clientCache.set(firmId, { client, timestamp: Date.now() });
          return client;
        }
      } catch (error) {
        logger.warn('Failed to get firm API key:', error.message);
      }
    }

    // Fall back to default client (environment variable)
    if (this.anthropic) {
      return this.anthropic;
    }

    return null;
  }

  /**
   * Check if NLP is available for a firm
   * @param {string} firmId - Firm ID
   * @returns {Promise<boolean>} Whether NLP is available
   */
  async isAvailable(firmId) {
    const client = await this._getClientForFirm(firmId);
    return client !== null;
  }

  /**
   * Main parsing function - parses natural language input into structured data
   * @param {string} text - Natural language input
   * @param {Object} options - Parsing options
   * @param {Date} options.referenceDate - Reference date for relative dates (default: now)
   * @param {string} options.timezone - Timezone (default: 'Asia/Riyadh')
   * @param {string} options.userId - User ID for context
   * @param {string} options.firmId - Firm ID for API key lookup
   * @returns {Promise<Object>} Parsed structured data
   */
  async parseNaturalLanguage(text, options = {}) {
    try {
      const {
        referenceDate = new Date(),
        timezone = 'Asia/Riyadh',
        userId = null,
        firmId = null
      } = options;

      // Detect language
      const language = this._detectLanguage(text);

      // Parse date/time
      const dateTimeInfo = this.parseDateTime(text, referenceDate);

      // Extract priority
      const priority = this.extractPriority(text);

      // Parse recurrence
      const recurrence = this.parseRecurrence(text);

      // Classify intent using Claude AI
      const intentInfo = await this.classifyIntent(text, {
        language,
        hasDateTime: !!dateTimeInfo.startDateTime,
        hasRecurrence: recurrence.enabled,
        firmId
      });

      // Extract participants (names, contacts)
      const participants = this._extractParticipants(text, language);

      // Extract location
      const location = this._extractLocation(text, language);

      // Generate clean title
      const title = this._generateTitle(text, intentInfo.type, language);

      // Combine all information
      const result = {
        // Core data
        title,
        rawText: text,
        language,

        // Date/Time
        dateTime: dateTimeInfo.startDateTime,
        endDateTime: dateTimeInfo.endDateTime,
        allDay: dateTimeInfo.allDay || false,

        // Priority
        priority,

        // Recurrence
        recurrence,

        // Intent classification
        type: intentInfo.type,
        confidence: intentInfo.confidence,
        entities: intentInfo.entities,

        // Additional context
        participants,
        location,

        // Metadata
        timezone,
        parsedAt: new Date(),
        userId
      };

      return result;
    } catch (error) {
      logger.error('NLP parsing error:', error);
      throw new Error(`Failed to parse natural language: ${error.message}`);
    }
  }

  /**
   * Parse date and time from text using chrono-node
   * @param {string} text - Input text
   * @param {Date} referenceDate - Reference date for relative parsing
   * @returns {Object} Date/time information
   */
  parseDateTime(text, referenceDate = new Date()) {
    try {
      // Use chrono-node to parse dates
      // chrono supports natural language like "tomorrow", "next Monday", "in 2 weeks"
      const results = chrono.parse(text, referenceDate, { forwardDate: true });

      if (results.length === 0) {
        return {
          startDateTime: null,
          endDateTime: null,
          isRecurring: false,
          recurrencePattern: null,
          allDay: false
        };
      }

      // Get the first (most relevant) date
      const parsed = results[0];
      const startDateTime = parsed.start.date();
      const endDateTime = parsed.end ? parsed.end.date() : null;

      // Check if it's an all-day event (no specific time mentioned)
      const hasTime = parsed.start.get('hour') !== null;
      const allDay = !hasTime;

      // Check for recurring patterns
      const textLower = text.toLowerCase();
      const isRecurring = this._isRecurringPattern(textLower);

      return {
        startDateTime,
        endDateTime,
        isRecurring,
        recurrencePattern: isRecurring ? this._extractRecurrencePattern(textLower) : null,
        allDay,
        chronoResult: {
          text: parsed.text,
          index: parsed.index,
          tags: parsed.start.tags
        }
      };
    } catch (error) {
      logger.error('Date parsing error:', error);
      return {
        startDateTime: null,
        endDateTime: null,
        isRecurring: false,
        recurrencePattern: null,
        allDay: false,
        error: error.message
      };
    }
  }

  /**
   * Extract priority level from text
   * @param {string} text - Input text
   * @returns {string} Priority level: 'low' | 'medium' | 'high' | 'critical'
   */
  extractPriority(text) {
    const textLower = text.toLowerCase();

    // Check critical priority first (highest priority)
    for (const keyword of this.priorityKeywords.critical) {
      if (textLower.includes(keyword.toLowerCase())) {
        return 'critical';
      }
    }

    // Check high priority
    for (const keyword of this.priorityKeywords.high) {
      if (textLower.includes(keyword.toLowerCase())) {
        return 'high';
      }
    }

    // Check low priority
    for (const keyword of this.priorityKeywords.low) {
      if (textLower.includes(keyword.toLowerCase())) {
        return 'low';
      }
    }

    // Check medium priority explicitly
    for (const keyword of this.priorityKeywords.medium) {
      if (textLower.includes(keyword.toLowerCase())) {
        return 'medium';
      }
    }

    // Default to medium if no priority specified
    return 'medium';
  }

  /**
   * Parse recurrence pattern from text
   * @param {string} text - Input text
   * @returns {Object} Recurrence configuration
   */
  parseRecurrence(text) {
    const textLower = text.toLowerCase();
    const result = {
      enabled: false,
      frequency: null,
      interval: 1,
      daysOfWeek: [],
      endDate: null,
      maxOccurrences: null
    };

    // Check if text contains recurrence keywords
    let frequency = null;
    for (const [freq, keywords] of Object.entries(this.recurrenceKeywords)) {
      for (const keyword of keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          frequency = freq;
          result.enabled = true;
          break;
        }
      }
      if (frequency) break;
    }

    if (!frequency) {
      return result;
    }

    result.frequency = frequency;

    // Extract specific days for weekly recurrence
    if (frequency === 'weekly' || textLower.includes('every')) {
      const daysFound = [];

      // Check English days
      this.daysOfWeek.en.forEach((day, index) => {
        if (textLower.includes(day)) {
          daysFound.push(index);
        }
      });

      // Check Arabic days
      this.daysOfWeek.ar.forEach((day, index) => {
        if (text.includes(day)) {
          daysFound.push(index);
        }
      });

      if (daysFound.length > 0) {
        result.daysOfWeek = [...new Set(daysFound)]; // Remove duplicates
      }
    }

    // Extract duration/end date
    // Look for patterns like "for 3 months", "for 10 times", "until December"
    const durationMatch = textLower.match(/for (\d+) (week|month|year|time)/);
    if (durationMatch) {
      const count = parseInt(durationMatch[1]);
      const unit = durationMatch[2];

      if (unit === 'time' || unit === 'times') {
        result.maxOccurrences = count;
      } else {
        // Calculate end date based on duration
        const endDate = new Date();
        if (unit === 'week') endDate.setDate(endDate.getDate() + count * 7);
        if (unit === 'month') endDate.setMonth(endDate.getMonth() + count);
        if (unit === 'year') endDate.setFullYear(endDate.getFullYear() + count);
        result.endDate = endDate;
      }
    }

    // Look for Arabic duration patterns
    const arabicDurationMatch = text.match(/لمدة (\d+) (أسبوع|شهر|سنة)/);
    if (arabicDurationMatch) {
      const count = parseInt(arabicDurationMatch[1]);
      const unit = arabicDurationMatch[2];

      const endDate = new Date();
      if (unit === 'أسبوع') endDate.setDate(endDate.getDate() + count * 7);
      if (unit === 'شهر') endDate.setMonth(endDate.getMonth() + count);
      if (unit === 'سنة') endDate.setFullYear(endDate.getFullYear() + count);
      result.endDate = endDate;
    }

    return result;
  }

  /**
   * Classify intent using Claude AI
   * @param {string} text - Input text
   * @param {Object} context - Additional context
   * @param {string} context.firmId - Firm ID for API key lookup
   * @returns {Promise<Object>} Intent classification result
   */
  async classifyIntent(text, context = {}) {
    try {
      const { language = 'en', hasDateTime = false, hasRecurrence = false, firmId = null } = context;

      // Get firm-specific client
      const client = await this._getClientForFirm(firmId);
      if (!client) {
        logger.warn('No Anthropic client available, using fallback classification');
        return this._fallbackIntentClassification(text);
      }

      const prompt = `Analyze this natural language input and classify the intent. The text is in ${language === 'ar' ? 'Arabic' : 'English'}.

Text: "${text}"

Return a JSON object with:
{
  "type": "task" | "event" | "reminder" | "deadline" | "meeting" | "call" | "review",
  "confidence": 0.0-1.0,
  "entities": {
    "person": ["names of people mentioned"],
    "organization": ["organizations mentioned"],
    "document": ["documents/files mentioned"],
    "action": "main action verb",
    "subject": "what the action is about",
    "caseNumber": "case number if mentioned",
    "contractNumber": "contract number if mentioned"
  },
  "summary": "brief summary of the intent",
  "suggestedCategory": "suggested category for legal context"
}

Context:
- Has specific date/time: ${hasDateTime}
- Is recurring: ${hasRecurrence}
- Language: ${language}

Focus on legal/law firm context. Common types include:
- task: general to-do item
- event: scheduled event or appointment
- reminder: reminder to do something
- deadline: legal deadline or due date
- meeting: meeting with client or team
- call: phone call to make
- review: document review or case review`;

      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Track usage if firm ID provided
      if (firmId) {
        AISettingsService.incrementUsage(firmId, 'anthropic', response.usage.input_tokens + response.usage.output_tokens).catch(() => {});
      }

      const result = this._parseJSONResponse(response.content[0].text);

      return {
        type: result.type || 'task',
        confidence: result.confidence || 0.7,
        entities: result.entities || {},
        summary: result.summary || '',
        suggestedCategory: result.suggestedCategory || null,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens
      };
    } catch (error) {
      logger.error('Intent classification error:', error);

      // Fallback to rule-based classification
      return this._fallbackIntentClassification(text);
    }
  }

  /**
   * LEGACY METHOD: Parse natural language text into structured reminder data
   * @deprecated Use parseNaturalLanguage instead
   * @param {string} text - Natural language input
   * @param {Object} context - Additional context (userId, timezone, firmId, etc.)
   * @returns {Promise<Object>} - Parsed reminder data with confidence score
   */
  async parseReminderFromText(text, context = {}) {
    const { timezone = 'Asia/Riyadh', currentDateTime = new Date(), firmId = null } = context;

    // Get firm-specific client
    const client = await this._getClientForFirm(firmId);
    if (!client) {
      throw new Error('NLP service not configured. Please add your Anthropic API key in Settings > AI Services.');
    }

    try {
      const currentDateStr = currentDateTime.toISOString();

      const prompt = `You are an AI assistant that parses natural language into structured reminder data.

Current context:
- Current date/time: ${currentDateStr}
- Timezone: ${timezone}

Parse the following text and extract reminder information. Return a JSON object with this EXACT structure:

{
  "title": "string - brief title for the reminder (required, max 100 chars)",
  "description": "string - detailed description if provided (optional)",
  "reminderDateTime": "ISO 8601 datetime string - when the reminder should trigger",
  "priority": "string - low, medium, high, or critical",
  "type": "string - general, meeting, deadline, followup, call, email, or other",
  "tags": ["array", "of", "relevant", "tags"],
  "notes": "string - any additional notes or context",
  "relatedTo": {
    "type": "string - case, task, event, client (if mentioned)",
    "identifier": "string - name or number if mentioned"
  },
  "confidence": {
    "title": number 0-1,
    "dateTime": number 0-1,
    "priority": number 0-1,
    "type": number 0-1,
    "overall": number 0-1
  }
}

Rules for parsing:

1. DATE/TIME PARSING:
   - "tomorrow" = next day at specified time or 9 AM
   - "next Monday" = the upcoming Monday
   - "in 2 hours" = current time + 2 hours
   - "at 3pm" = today at 15:00 (if future) or tomorrow at 15:00 (if past)
   - "today" = same day
   - If no time specified, default to 9:00 AM
   - If no date specified, assume today if time is future, tomorrow if past

2. PRIORITY INFERENCE:
   - "urgent", "critical", "important", "ASAP", "immediately" → critical
   - "high priority", "high" → high
   - "low priority", "low", "minor" → low
   - default → medium

3. TYPE INFERENCE:
   - "call", "phone", "ring up", "contact by phone" → call
   - "meeting", "meet with", "conference" → meeting
   - "deadline", "due", "submit by", "finish by" → deadline
   - "follow up", "followup", "check in", "check on" → followup
   - "email", "send email", "write to", "message" → email
   - default → general

4. TAGS:
   - Extract person names, companies, topics, locations
   - Extract action verbs (call, review, submit, etc.)
   - Keep tags concise and relevant

5. RELATED ENTITIES:
   - Look for mentions of case numbers, client names, task references
   - Example: "Case #123", "John Doe case", "invoice for ABC Corp"

Input text to parse:
"${text}"

Return ONLY the JSON object, no additional text.`;

      const response = await client.messages.create({
        model: this.model,
        max_tokens: 1536,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Track usage
      if (firmId) {
        AISettingsService.incrementUsage(firmId, 'anthropic', response.usage.input_tokens + response.usage.output_tokens).catch(() => {});
      }

      const rawResult = this._parseJSONResponse(response.content[0].text);
      const reminderData = this._postProcessReminderData(rawResult, currentDateTime, timezone);

      // Calculate overall confidence if not provided
      if (!reminderData.confidence || !reminderData.confidence.overall) {
        reminderData.confidence = {
          ...reminderData.confidence,
          overall: this._calculateReminderConfidence(reminderData)
        };
      }

      return {
        success: true,
        reminderData,
        confidence: reminderData.confidence,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        rawParsing: rawResult,
        parsedFrom: 'nlp',
        rawText: text
      };
    } catch (error) {
      logger.error('Reminder NLP parsing error:', error);
      throw new Error(`Failed to parse reminder from text: ${error.message}`);
    }
  }

  /**
   * Post-process parsed reminder data
   * @private
   */
  _postProcessReminderData(rawData, currentDateTime, timezone) {
    const processed = { ...rawData };

    // Ensure title exists
    if (!processed.title || processed.title.trim().length === 0) {
      processed.title = this._extractTitleFromText(processed.description || 'Reminder');
    }

    // Truncate title to 100 chars
    if (processed.title.length > 100) {
      processed.title = processed.title.substring(0, 97) + '...';
    }

    // Process reminder date/time
    if (processed.reminderDateTime) {
      try {
        processed.reminderDateTime = new Date(processed.reminderDateTime);

        // If reminder time is in the past, move it forward
        if (processed.reminderDateTime < currentDateTime) {
          const diffMs = currentDateTime - processed.reminderDateTime;
          // If less than 1 day in the past, move to tomorrow
          if (diffMs < 86400000) {
            processed.reminderDateTime = addDays(processed.reminderDateTime, 1);
          } else {
            // Otherwise set to 1 hour from now
            processed.reminderDateTime = addHours(currentDateTime, 1);
          }
        }
      } catch (error) {
        // Default to 1 hour from now
        processed.reminderDateTime = addHours(currentDateTime, 1);
      }
    } else {
      // No date/time found - default to 1 hour from now
      processed.reminderDateTime = addHours(currentDateTime, 1);
    }

    // Normalize priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(processed.priority)) {
      processed.priority = 'medium';
    }

    // Normalize type
    const validTypes = ['general', 'meeting', 'deadline', 'followup', 'call', 'email'];
    if (!validTypes.includes(processed.type)) {
      processed.type = 'general';
    }

    // Ensure tags is an array
    if (!Array.isArray(processed.tags)) {
      processed.tags = [];
    }

    // Extract legacy fields for compatibility
    processed.reminderDate = processed.reminderDateTime;
    processed.reminderTime = processed.reminderDateTime.toTimeString().substring(0, 5);

    return processed;
  }

  /**
   * Calculate reminder confidence score
   * @private
   */
  _calculateReminderConfidence(reminderData) {
    let confidence = 0.5; // Base confidence

    if (reminderData.title && reminderData.title !== 'Reminder') confidence += 0.15;
    if (reminderData.reminderDateTime) confidence += 0.2;
    if (reminderData.description) confidence += 0.1;
    if (reminderData.priority && reminderData.priority !== 'medium') confidence += 0.05;
    if (reminderData.type && reminderData.type !== 'general') confidence += 0.05;
    if (reminderData.tags && reminderData.tags.length > 0) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  /**
   * Extract title from text
   * @private
   */
  _extractTitleFromText(text) {
    let title = text
      .replace(/^(remind me to|reminder to|remind me|remember to|don't forget to|todo)\s+/i, '')
      .trim();

    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    return title || 'Reminder';
  }

  /**
   * Parse natural language text into event data
   * @param {string} text - Natural language input
   * @param {Object} context - Additional context (userId, timezone, firmId, etc.)
   * @returns {Promise<Object>} - Parsed event data with confidence scores
   */
  async parseEventFromText(text, context = {}) {
    const { timezone = 'Asia/Riyadh', currentDateTime = new Date(), firmId = null } = context;

    // Get firm-specific client
    const client = await this._getClientForFirm(firmId);
    if (!client) {
      throw new Error('NLP service not configured. Please add your Anthropic API key in Settings > AI Services.');
    }

    try {
      // Build comprehensive prompt for Claude
      const prompt = this._buildParsingPrompt(text, currentDateTime, timezone);

      // Call Claude API
      const response = await client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Track usage
      if (firmId) {
        AISettingsService.incrementUsage(firmId, 'anthropic', response.usage.input_tokens + response.usage.output_tokens).catch(() => {});
      }

      // Parse Claude's response
      const rawResult = this._parseJSONResponse(response.content[0].text);

      // Post-process and validate the parsed data
      const eventData = this._postProcessEventData(rawResult, currentDateTime, timezone);

      // Calculate overall confidence
      const confidence = this._calculateConfidence(eventData);

      return {
        success: true,
        eventData,
        confidence,
        tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
        rawParsing: rawResult
      };
    } catch (error) {
      logger.error('NLP parsing error:', error);
      throw new Error(`Failed to parse event from text: ${error.message}`);
    }
  }

  /**
   * Build parsing prompt for Claude
   * @private
   */
  _buildParsingPrompt(text, currentDateTime, timezone) {
    const currentDateStr = currentDateTime.toISOString();
    const currentDay = currentDateTime.toLocaleDateString('en-US', { weekday: 'long' });

    return `You are an AI assistant that parses natural language text into structured event data for a calendar/scheduling system.

Current context:
- Current date/time: ${currentDateStr} (${currentDay})
- Timezone: ${timezone}

Parse the following text and extract event information. Return a JSON object with this EXACT structure:

{
  "title": "string - event title/subject",
  "description": "string - detailed description if any",
  "type": "string - one of: meeting, hearing, deadline, task, consultation, appointment, conference, training, other",
  "startDateTime": "ISO 8601 datetime string",
  "endDateTime": "ISO 8601 datetime string or null",
  "allDay": boolean,
  "duration": number - duration in minutes if mentioned,
  "location": {
    "type": "string - physical, virtual, or hybrid",
    "address": "string - physical address if mentioned",
    "virtualLink": "string - meeting link if mentioned",
    "virtualPlatform": "string - zoom, teams, google_meet, webex, or other"
  },
  "attendees": [
    {
      "name": "string - attendee name",
      "email": "string - email if mentioned",
      "role": "string - required or optional"
    }
  ],
  "priority": "string - low, medium, high, or critical based on urgency indicators",
  "tags": ["array of relevant tags"],
  "notes": "string - additional notes or context",
  "confidence": {
    "title": number 0-1,
    "dateTime": number 0-1,
    "duration": number 0-1,
    "location": number 0-1,
    "overall": number 0-1
  }
}

Rules for parsing:
1. DATE/TIME PARSING:
   - "tomorrow" = next day
   - "next Monday" = the upcoming Monday
   - "in 2 hours" = current time + 2 hours
   - "at 2pm" = today at 14:00 (if future) or tomorrow at 14:00 (if past)
   - Default to 1 hour duration if not specified
   - If only date mentioned, make it all-day event

2. EVENT TYPE INFERENCE:
   - "meeting with" → meeting
   - "court hearing", "trial" → hearing
   - "deadline", "due" → deadline
   - "appointment", "visit" → appointment
   - "call", "phone call" → meeting (virtual)
   - "conference", "seminar" → conference

3. LOCATION PARSING:
   - Meeting links (zoom.us, teams, meet.google) → virtual
   - Physical addresses → physical
   - Both → hybrid

4. PRIORITY INFERENCE:
   - Words like "urgent", "ASAP", "critical" → high/critical
   - "important" → high
   - Default → medium

5. ATTENDEES:
   - Extract names mentioned after "with", "and", or comma-separated
   - Extract emails if present

Input text to parse:
"${text}"

Return ONLY the JSON object, no additional text.`;
  }

  /**
   * Post-process parsed event data
   * @private
   */
  _postProcessEventData(rawData, currentDateTime, timezone) {
    const processed = { ...rawData };

    // Ensure required fields
    if (!processed.title) {
      processed.title = 'Untitled Event';
    }

    // Process dates
    if (processed.startDateTime) {
      try {
        processed.startDateTime = new Date(processed.startDateTime);
        // If start time is in the past, move it to tomorrow
        if (processed.startDateTime < currentDateTime && !processed.allDay) {
          processed.startDateTime = addDays(processed.startDateTime, 1);
        }
      } catch (error) {
        processed.startDateTime = addHours(currentDateTime, 1);
      }
    } else {
      // Default to 1 hour from now
      processed.startDateTime = addHours(currentDateTime, 1);
    }

    // Process end date/time
    if (processed.endDateTime) {
      try {
        processed.endDateTime = new Date(processed.endDateTime);
      } catch (error) {
        processed.endDateTime = null;
      }
    }

    // Calculate end time from duration if not set
    if (!processed.endDateTime && processed.duration) {
      processed.endDateTime = addHours(processed.startDateTime, processed.duration / 60);
    } else if (!processed.endDateTime && !processed.allDay) {
      // Default 1 hour duration
      processed.endDateTime = addHours(processed.startDateTime, 1);
    }

    // Ensure type is valid
    const validTypes = ['meeting', 'hearing', 'deadline', 'task', 'consultation', 'appointment', 'conference', 'training', 'other'];
    if (!validTypes.includes(processed.type)) {
      processed.type = 'meeting';
    }

    // Ensure priority is valid
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(processed.priority)) {
      processed.priority = 'medium';
    }

    // Ensure tags is an array
    if (!Array.isArray(processed.tags)) {
      processed.tags = [];
    }

    // Ensure attendees is an array
    if (!Array.isArray(processed.attendees)) {
      processed.attendees = [];
    }

    // Clean up location
    if (processed.location && typeof processed.location === 'object') {
      // Determine location type if not set
      if (!processed.location.type) {
        if (processed.location.virtualLink || processed.location.virtualPlatform) {
          processed.location.type = 'virtual';
        } else if (processed.location.address) {
          processed.location.type = 'physical';
        }
      }
    } else {
      processed.location = null;
    }

    return processed;
  }

  /**
   * Calculate overall confidence score
   * @private
   */
  _calculateConfidence(eventData) {
    if (eventData.confidence && typeof eventData.confidence === 'object') {
      const scores = Object.values(eventData.confidence).filter(v => typeof v === 'number');
      if (scores.length > 0) {
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
      }
    }

    // Fallback confidence calculation
    let confidence = 0.5; // Base confidence

    if (eventData.title && eventData.title !== 'Untitled Event') confidence += 0.2;
    if (eventData.startDateTime) confidence += 0.15;
    if (eventData.endDateTime || eventData.duration) confidence += 0.1;
    if (eventData.location) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  /**
   * Parse multiple events from text (batch processing)
   * @param {string} text - Text containing multiple events
   * @param {Object} context - Context including firmId
   * @returns {Promise<Array>} - Array of parsed events
   */
  async parseMultipleEvents(text, context = {}) {
    const { timezone = 'Asia/Riyadh', currentDateTime = new Date(), firmId = null } = context;

    // Get firm-specific client
    const client = await this._getClientForFirm(firmId);
    if (!client) {
      logger.warn('No Anthropic client available for parseMultipleEvents');
      return [];
    }

    try {
      const prompt = `Parse the following text and extract ALL events/meetings mentioned. Return a JSON array where each element is an event object.

Current context:
- Current date/time: ${currentDateTime.toISOString()}
- Timezone: ${timezone}

For each event, extract:
{
  "title": "event title",
  "startDateTime": "ISO datetime",
  "endDateTime": "ISO datetime or null",
  "duration": number in minutes,
  "type": "meeting/hearing/deadline/task/etc",
  "location": "location description",
  "attendees": ["list of attendee names"]
}

Text to parse:
"${text}"

Return ONLY a JSON array, no additional text.`;

      const response = await client.messages.create({
        model: this.model,
        max_tokens: 3072,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Track usage
      if (firmId) {
        AISettingsService.incrementUsage(firmId, 'anthropic', response.usage.input_tokens + response.usage.output_tokens).catch(() => {});
      }

      const events = this._parseJSONResponse(response.content[0].text);

      if (!Array.isArray(events)) {
        return [];
      }

      // Post-process each event
      return events.map(event => ({
        ...this._postProcessEventData(event, currentDateTime, timezone),
        confidence: 0.7 // Lower confidence for batch parsing
      }));
    } catch (error) {
      logger.error('Batch parsing error:', error);
      return [];
    }
  }

  /**
   * Extract action items from meeting notes
   * @param {string} notes - Meeting notes text
   * @param {string} firmId - Firm ID for API key lookup
   * @returns {Promise<Array>} - Extracted action items
   */
  async extractActionItems(notes, firmId = null) {
    // Get firm-specific client
    const client = await this._getClientForFirm(firmId);
    if (!client) {
      logger.warn('No Anthropic client available for extractActionItems');
      return [];
    }

    try {
      const prompt = `Extract all action items and tasks from these meeting notes. Return a JSON array of action items.

Each action item should have:
{
  "description": "what needs to be done",
  "assignee": "who is responsible (if mentioned)",
  "dueDate": "ISO date if deadline mentioned",
  "priority": "low/medium/high"
}

Meeting notes:
"${notes}"

Return ONLY a JSON array.`;

      const response = await client.messages.create({
        model: this.model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Track usage
      if (firmId) {
        AISettingsService.incrementUsage(firmId, 'anthropic', response.usage.input_tokens + response.usage.output_tokens).catch(() => {});
      }

      const items = this._parseJSONResponse(response.content[0].text);
      return Array.isArray(items) ? items : [];
    } catch (error) {
      logger.error('Action items extraction error:', error);
      return [];
    }
  }

  /**
   * Suggest event title based on description
   * @param {string} description - Event description
   * @param {string} firmId - Firm ID for API key lookup
   * @returns {Promise<string>} - Suggested title
   */
  async suggestEventTitle(description, firmId = null) {
    // Get firm-specific client
    const client = await this._getClientForFirm(firmId);
    if (!client) {
      return 'New Event';
    }

    try {
      const prompt = `Generate a concise, professional event title (max 60 characters) for this event description:

"${description}"

Return ONLY the title, nothing else.`;

      const response = await client.messages.create({
        model: this.model,
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Track usage
      if (firmId) {
        AISettingsService.incrementUsage(firmId, 'anthropic', response.usage.input_tokens + response.usage.output_tokens).catch(() => {});
      }

      return response.content[0].text.trim().replace(/['"]/g, '');
    } catch (error) {
      logger.error('Title suggestion error:', error);
      return 'New Event';
    }
  }

  /**
   * Helper: Parse JSON response from Claude
   * @private
   */
  _parseJSONResponse(text) {
    try {
      // Remove markdown code blocks if present
      let cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      // Try to find JSON in the response
      const jsonMatch = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Try parsing the whole text
      return JSON.parse(cleanText);
    } catch (error) {
      logger.error('Error parsing JSON response:', error);
      logger.error('Raw text:', text);
      return {};
    }
  }

  /**
   * Detect language (Arabic or English)
   * @private
   */
  _detectLanguage(text) {
    // Simple Arabic detection: check for Arabic characters
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text) ? 'ar' : 'en';
  }

  /**
   * Check if text contains recurring pattern
   * @private
   */
  _isRecurringPattern(textLower) {
    const recurringWords = [
      'every', 'daily', 'weekly', 'monthly', 'yearly', 'recurring', 'repeat',
      'كل', 'يومي', 'أسبوعي', 'شهري', 'سنوي', 'متكرر'
    ];
    return recurringWords.some(word => textLower.includes(word));
  }

  /**
   * Extract recurrence pattern details
   * @private
   */
  _extractRecurrencePattern(textLower) {
    for (const [freq, keywords] of Object.entries(this.recurrenceKeywords)) {
      for (const keyword of keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          return freq;
        }
      }
    }
    return 'custom';
  }

  /**
   * Extract participant names from text
   * @private
   */
  _extractParticipants(text, language) {
    const participants = [];

    // Common patterns for participant extraction
    const patterns = [
      /(?:with|meet|call|contact)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi, // English
      /(?:مع|لقاء|اتصال)\s+([\u0600-\u06FF\s]+)/g // Arabic
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim()) {
          participants.push(match[1].trim());
        }
      }
    }

    return [...new Set(participants)]; // Remove duplicates
  }

  /**
   * Extract location from text
   * @private
   */
  _extractLocation(text, language) {
    // Common patterns for location extraction
    const patterns = [
      /(?:at|in|location:|venue:)\s+([^,.\n]+)/gi, // English
      /(?:في|بـ|المكان:|الموقع:)\s+([^,.\n]+)/g // Arabic
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * Generate clean title from text
   * @private
   */
  _generateTitle(text, type, language) {
    // Remove date/time phrases and priority keywords
    let title = text;

    // Remove common date patterns
    title = title.replace(/\b(tomorrow|today|tonight|yesterday)\b/gi, '');
    title = title.replace(/\b(next|last)\s+(week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '');
    title = title.replace(/\bin\s+\d+\s+(day|week|month|year)s?\b/gi, '');
    title = title.replace(/\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi, '');

    // Remove priority keywords
    Object.values(this.priorityKeywords).flat().forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      title = title.replace(regex, '');
    });

    // Remove recurrence keywords
    Object.values(this.recurrenceKeywords).flat().forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      title = title.replace(regex, '');
    });

    // Clean up extra spaces
    title = title.replace(/\s+/g, ' ').trim();

    // Capitalize first letter
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // If title is too short, use the original text
    if (title.length < 5) {
      title = text;
    }

    // Limit length
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    return title;
  }

  /**
   * Fallback intent classification (rule-based)
   * @private
   */
  _fallbackIntentClassification(text) {
    const textLower = text.toLowerCase();
    let type = 'task';
    let confidence = 0.6;

    // Check for specific action types
    if (this.actionKeywords.call.some(kw => textLower.includes(kw))) {
      type = 'call';
      confidence = 0.8;
    } else if (this.actionKeywords.meeting.some(kw => textLower.includes(kw))) {
      type = 'meeting';
      confidence = 0.8;
    } else if (this.actionKeywords.review.some(kw => textLower.includes(kw))) {
      type = 'review';
      confidence = 0.8;
    } else if (this.actionKeywords.remind.some(kw => textLower.includes(kw))) {
      type = 'reminder';
      confidence = 0.8;
    } else if (this.actionKeywords.deadline.some(kw => textLower.includes(kw))) {
      type = 'deadline';
      confidence = 0.8;
    } else if (this.actionKeywords.file.some(kw => textLower.includes(kw))) {
      type = 'task';
      confidence = 0.7;
    }

    return {
      type,
      confidence,
      entities: {},
      summary: text,
      suggestedCategory: null,
      tokensUsed: 0
    };
  }

  /**
   * Batch parse multiple natural language inputs
   * @param {Array<string>} texts - Array of input texts
   * @param {Object} options - Parsing options
   * @returns {Promise<Array>} Array of parsed results
   */
  async batchParse(texts, options = {}) {
    const results = [];

    for (const text of texts) {
      try {
        const result = await this.parseNaturalLanguage(text, options);
        results.push({ success: true, data: result });
      } catch (error) {
        results.push({ success: false, error: error.message, text });
      }
    }

    return results;
  }

  /**
   * Extract case-related information for legal context
   * @param {string} text - Input text
   * @returns {Object} Case information
   */
  extractCaseInfo(text) {
    const caseInfo = {
      caseNumber: null,
      courtName: null,
      parties: [],
      references: []
    };

    // Extract case number patterns
    const caseNumberPatterns = [
      /case\s*#?\s*(\d+\/\d+)/gi,
      /(?:قضية|دعوى)\s*(?:رقم)?\s*(\d+\/\d+)/g,
      /\b(\d{4,}\/\d{4})\b/g
    ];

    for (const pattern of caseNumberPatterns) {
      const match = text.match(pattern);
      if (match) {
        caseInfo.caseNumber = match[1] || match[0];
        break;
      }
    }

    // Extract court names (Saudi courts)
    const saudiCourts = [
      'المحكمة العامة', 'محكمة الاستئناف', 'المحكمة العليا',
      'محكمة التنفيذ', 'المحكمة التجارية', 'المحكمة الإدارية',
      'General Court', 'Court of Appeal', 'Supreme Court',
      'Execution Court', 'Commercial Court', 'Administrative Court'
    ];

    for (const court of saudiCourts) {
      if (text.includes(court)) {
        caseInfo.courtName = court;
        break;
      }
    }

    return caseInfo;
  }

  /**
   * Suggest smart completions for partial input
   * @param {string} partialText - Partial input text
   * @param {Object} context - User context
   * @returns {Promise<Array>} Suggested completions
   */
  async suggestCompletions(partialText, context = {}) {
    // This could be enhanced with ML-based suggestions
    // For now, provide basic pattern-based suggestions
    const suggestions = [];

    if (partialText.length < 3) {
      return suggestions;
    }

    const textLower = partialText.toLowerCase();

    // Common legal task templates
    const templates = [
      'Review contract for {client} by {date}',
      'File motion in case #{number} before {deadline}',
      'Meeting with {client} on {date} at {time}',
      'Call {person} regarding {matter}',
      'Draft {document} for {case}',
      'Court hearing on {date} at {location}',
      'مراجعة العقد مع {العميل} قبل {التاريخ}',
      'تقديم مذكرة في القضية رقم {الرقم}',
      'اجتماع مع {العميل} يوم {التاريخ}'
    ];

    // Filter templates that match the partial text
    for (const template of templates) {
      if (template.toLowerCase().includes(textLower)) {
        suggestions.push({
          text: template,
          type: 'template',
          confidence: 0.7
        });
      }
    }

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }
}

module.exports = new NLPService();
