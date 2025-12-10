# Voice-to-Task Conversion Service

## Overview

The Voice-to-Task service provides intelligent conversion of voice transcriptions into structured tasks, reminders, and events. It uses the NLP service (powered by Claude AI) to parse natural language and automatically create the appropriate item type.

## Location

- Service: `/src/services/voiceToTask.service.js`
- Controller: `/src/controllers/task.controller.js` (functions: `processVoiceToItem`, `batchProcessVoiceMemos`)
- Routes: `/src/routes/task.route.js`

## API Endpoints

### 1. Process Voice to Item (Single)

**POST** `/api/tasks/voice-to-item`

Processes a single voice transcription and automatically creates a task, reminder, or event based on the content.

#### Request Body

```json
{
  "transcription": "Remind me to call the client tomorrow at 2pm",
  "caseId": "optional-case-id",
  "timezone": "Asia/Riyadh",
  "options": {
    "currentDateTime": "2025-12-10T10:00:00Z"
  }
}
```

#### Response

```json
{
  "success": true,
  "message": "Reminder created successfully from voice",
  "type": "reminder",
  "data": {
    "_id": "...",
    "reminderId": "RMD-...",
    "title": "Call the client",
    "reminderDateTime": "2025-12-11T14:00:00Z",
    "priority": "medium",
    "type": "call",
    "status": "pending",
    "tags": ["voice-created"],
    "notes": "Created from voice memo\n\nOriginal transcription: \"Remind me to call the client tomorrow at 2pm\""
  },
  "confidence": 0.85,
  "metadata": {
    "source": "voice",
    "originalTranscription": "Remind me to call the client tomorrow at 2pm",
    "cleanedTranscription": "Remind me to call the client tomorrow at 2pm",
    "processedAt": "2025-12-10T10:00:00Z",
    "validation": {
      "isValid": true,
      "warnings": [],
      "confidence": 1.0
    }
  }
}
```

### 2. Batch Process Voice Memos

**POST** `/api/tasks/voice-to-item/batch`

Processes multiple voice transcriptions in a single request.

#### Request Body

```json
{
  "memos": [
    {
      "memoId": "memo-1",
      "transcription": "Schedule a meeting with John tomorrow at 10am",
      "timezone": "Asia/Riyadh"
    },
    {
      "memoId": "memo-2",
      "transcription": "Create a task to review the contract by Friday",
      "caseId": "case-123",
      "timezone": "Asia/Riyadh"
    },
    {
      "memoId": "memo-3",
      "transcription": "Remind me to submit the report in 2 hours",
      "timezone": "Asia/Riyadh"
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "message": "Processed 3 of 3 voice memos successfully",
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "byType": {
      "task": 1,
      "reminder": 1,
      "event": 1
    }
  },
  "results": [
    {
      "memoId": "memo-1",
      "success": true,
      "type": "event",
      "createdItem": { ... },
      "confidence": 0.9,
      "metadata": { ... }
    },
    {
      "memoId": "memo-2",
      "success": true,
      "type": "task",
      "createdItem": { ... },
      "confidence": 0.85,
      "metadata": { ... }
    },
    {
      "memoId": "memo-3",
      "success": true,
      "type": "reminder",
      "createdItem": { ... },
      "confidence": 0.88,
      "metadata": { ... }
    }
  ]
}
```

## Service Functions

### 1. processVoiceTranscription

Processes a voice transcription and determines what type of item to create.

```javascript
const voiceToTaskService = require('./services/voiceToTask.service');

const result = await voiceToTaskService.processVoiceTranscription(
  "Schedule a meeting with the lawyer tomorrow at 3pm",
  userId,
  firmId,
  {
    timezone: 'Asia/Riyadh',
    currentDateTime: new Date(),
    caseId: 'optional-case-id'
  }
);

console.log(result);
// {
//   type: 'event',
//   extractedData: { title, startDateTime, ... },
//   confidence: 0.9,
//   metadata: { ... }
// }
```

### 2. createTaskFromVoice

Directly creates a task from voice transcription.

```javascript
const task = await voiceToTaskService.createTaskFromVoice(
  "Need to complete the legal brief by Friday",
  userId,
  firmId,
  caseId // optional
);
```

### 3. createReminderFromVoice

Directly creates a reminder from voice transcription.

```javascript
const reminder = await voiceToTaskService.createReminderFromVoice(
  "Remind me to call the client tomorrow at 2pm",
  userId,
  firmId
);
```

### 4. createEventFromVoice

Directly creates an event from voice transcription.

```javascript
const event = await voiceToTaskService.createEventFromVoice(
  "Schedule a meeting with John next Monday at 10am in conference room A",
  userId,
  firmId
);
```

### 5. processVoiceMemos

Batch processes multiple voice memos.

```javascript
const memos = [
  {
    memoId: 'memo-1',
    transcription: 'Schedule a meeting...',
    timezone: 'Asia/Riyadh'
  },
  {
    memoId: 'memo-2',
    transcription: 'Create a task...',
    caseId: 'case-123'
  }
];

const results = await voiceToTaskService.processVoiceMemos(
  memos,
  userId,
  firmId
);
```

## Intent Detection

The service automatically detects the intent type from the transcription:

### Task Indicators
- Keywords: `task`, `todo`, `do`, `complete`, `finish`, `work on`, `create`, `need to`, `have to`
- Example: "I need to complete the brief by Friday"
- Confidence: 0.8

### Reminder Indicators
- Keywords: `remind me`, `reminder`, `don't forget`, `remember to`
- Example: "Remind me to call the client tomorrow"
- Confidence: 0.9

### Event Indicators
- Keywords: `schedule`, `meeting`, `appointment`, `event`, `call with`, `conference`, `zoom`, `teams`
- Example: "Schedule a meeting with the lawyer at 3pm"
- Confidence: 0.85

## Data Extraction

The service extracts various elements from voice transcriptions:

### 1. Title Extraction
- Removes common prefixes: "remind me to", "task to", "need to", etc.
- Takes the first sentence
- Truncates to 100 characters if needed

### 2. Priority Inference
- **Critical**: `urgent`, `critical`, `asap`, `immediately`, `emergency`
- **High**: `important`, `high`, `soon`
- **Low**: `low priority`, `minor`, `low`, `whenever`
- **Medium**: default

### 3. Label Inference
- **bug**: `bug`, `fix`, `error`, `issue`, `problem`
- **feature**: `feature`, `new`, `add`, `create`
- **documentation**: `document`, `docs`, `documentation`, `write`
- **legal**: `legal`, `court`, `case`, `law`
- **urgent**: `urgent`, `emergency`, `critical`
- **administrative**: `admin`, `administrative`, `paperwork`

### 4. Date/Time Parsing
Powered by NLP service (Claude AI):
- "tomorrow" → next day
- "next Monday" → upcoming Monday
- "in 2 hours" → current time + 2 hours
- "at 3pm" → today at 15:00 (or tomorrow if past)

### 5. Duration Estimation
- Explicit: "30 minutes", "2 hours"
- Based on priority:
  - Critical: 120 minutes
  - High: 90 minutes
  - Medium: 60 minutes
  - Low: 30 minutes

### 6. Subtasks and Checklists
Automatically extracts numbered or bulleted lists:
```
1. Review the contract
2. Make revisions
3. Send to client
```

## Voice Transcription Validation

The service validates transcription quality:

```javascript
const validation = voiceToTaskService.validateTranscription(transcription);
// {
//   isValid: true,
//   warnings: [],
//   confidence: 1.0
// }
```

Validation checks:
- Minimum length (10 characters)
- Word repetition ratio (detects poor transcription)
- Meaningful content (at least 3 words with 3+ characters)

## Helper Functions

### 1. validateTranscription
Checks transcription quality and returns validation result.

### 2. extractIntent
Extracts the user's intent from voice command.

### 3. generateSuggestions
Provides suggestions for improving voice commands.

```javascript
const suggestions = voiceToTaskService.generateSuggestions(
  "Schedule a meeting"
);
// [
//   'Consider specifying a date and time (e.g., "tomorrow at 2pm")',
//   'Consider specifying duration (e.g., "for 1 hour")',
//   'Consider mentioning priority level (e.g., "high priority")',
//   'Consider mentioning who should handle this (e.g., "assign to John")'
// ]
```

### 4. formalizeEventData
Converts casual speech patterns to formal language.

```javascript
const formalized = voiceToTaskService.formalizeEventData({
  title: "I'm gonna call the client",
  description: "Yeah we need to discuss the contract okay"
});
// {
//   title: "I'm going to call the client",
//   description: "we need to discuss the contract"
// }
```

## Integration with Task Model

The service automatically:
1. Creates tasks with voice memo metadata
2. Links tasks to calendar events (if due date exists)
3. Adds history entries marking creation source as "voice-transcription"
4. Tags items with "voice-created" tag
5. Stores original transcription in notes field

## Integration with NLP Service

The voice-to-task service uses the NLP service for:
- Parsing reminders: `nlpService.parseReminderFromText()`
- Parsing events: `nlpService.parseEventFromText()`
- Multiple event detection: `nlpService.parseMultipleEvents()`

## Example Usage Scenarios

### Scenario 1: Quick Task Creation
```javascript
// Voice input: "I need to review the Johnson case files by tomorrow"
POST /api/tasks/voice-to-item
{
  "transcription": "I need to review the Johnson case files by tomorrow"
}

// Result: Creates a task with:
// - Title: "Review the Johnson case files"
// - Due date: Tomorrow at 9:00 AM
// - Priority: medium
// - Label: legal
```

### Scenario 2: Meeting Scheduling
```javascript
// Voice input: "Schedule a client meeting next Monday at 2pm for 1 hour"
POST /api/tasks/voice-to-item
{
  "transcription": "Schedule a client meeting next Monday at 2pm for 1 hour"
}

// Result: Creates an event with:
// - Title: "Client meeting"
// - Start: Next Monday at 14:00
// - End: Next Monday at 15:00
// - Type: client_meeting
```

### Scenario 3: Urgent Reminder
```javascript
// Voice input: "Urgent! Remind me to file the motion in 30 minutes"
POST /api/tasks/voice-to-item
{
  "transcription": "Urgent! Remind me to file the motion in 30 minutes"
}

// Result: Creates a reminder with:
// - Title: "File the motion"
// - Reminder time: 30 minutes from now
// - Priority: critical
// - Type: deadline
```

### Scenario 4: Batch Processing
```javascript
// Multiple voice memos from a meeting
POST /api/tasks/voice-to-item/batch
{
  "memos": [
    {
      "memoId": "1",
      "transcription": "Follow up with the witness tomorrow"
    },
    {
      "memoId": "2",
      "transcription": "Schedule a deposition for next week"
    },
    {
      "memoId": "3",
      "transcription": "Review the discovery documents by Friday"
    }
  ]
}

// Result: Creates 1 reminder, 1 event, and 1 task
```

## Error Handling

The service provides clear error messages:

```javascript
// Invalid transcription
{
  "success": false,
  "error": "Invalid transcription: Insufficient meaningful content"
}

// Missing required fields
{
  "success": false,
  "error": "Valid transcription text is required"
}

// Processing failure
{
  "success": false,
  "error": "Failed to process voice transcription: [specific error]"
}
```

## Best Practices

1. **Always provide context**: Include timezone and currentDateTime for accurate date/time parsing
2. **Link to cases**: Provide caseId when the voice memo is related to a specific case
3. **Batch similar operations**: Use batch endpoint for multiple related voice memos
4. **Check confidence scores**: Lower confidence (<0.6) may require manual review
5. **Review extracted data**: AI parsing is good but not perfect - allow users to review
6. **Provide feedback**: Use the metadata to show users how their voice was interpreted

## Performance Considerations

- Single item processing: ~1-2 seconds (includes NLP API call)
- Batch processing: ~1-2 seconds per item (sequential processing)
- Uses Claude API with caching for improved performance
- Token usage tracked in response metadata

## Future Enhancements

Potential improvements:
- User name recognition for automatic assignment
- Case number detection for auto-linking
- Speaker identification for multi-person meetings
- Emotion/sentiment analysis for priority detection
- Multi-language support
- Custom voice command training
