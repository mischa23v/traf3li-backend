# NLP Service Documentation

## Overview

The NLP (Natural Language Processing) Service at `/mnt/c/traf3li-backend/src/services/nlp.service.js` provides intelligent parsing of natural language text into structured data for tasks, events, reminders, and calendar entries. It combines:

- **chrono-node** for robust date/time parsing
- **Claude AI (Anthropic)** for intent classification and entity extraction
- **Bilingual support** for English and Arabic (Saudi Arabia market)

## Installation

Before using this service, install the required dependency:

```bash
npm install chrono-node
```

## Main Functions

### 1. `parseNaturalLanguage(text, options)`

The primary parsing function that extracts all relevant information from natural language input.

**Parameters:**
- `text` (string) - Natural language input to parse
- `options` (object) - Optional configuration
  - `referenceDate` (Date) - Reference date for relative dates (default: now)
  - `timezone` (string) - Timezone (default: 'Asia/Riyadh')
  - `userId` (string) - User ID for context

**Returns:** Object with:
```javascript
{
  title: "Call John",
  rawText: "Call John tomorrow at 3pm",
  language: "en",
  dateTime: Date,
  endDateTime: Date | null,
  allDay: false,
  priority: "medium",
  recurrence: {
    enabled: false,
    frequency: null,
    interval: 1,
    daysOfWeek: [],
    endDate: null,
    maxOccurrences: null
  },
  type: "call",
  confidence: 0.85,
  entities: {
    person: ["John"],
    organization: [],
    document: [],
    action: "call",
    subject: "John"
  },
  participants: ["John"],
  location: null,
  timezone: "Asia/Riyadh",
  parsedAt: Date,
  userId: "..."
}
```

**Example Usage:**
```javascript
const nlpService = require('./services/nlp.service');

// Parse a simple task
const result = await nlpService.parseNaturalLanguage(
  "Call John tomorrow at 3pm"
);

// Parse with specific timezone
const result2 = await nlpService.parseNaturalLanguage(
  "Review contract next Monday high priority",
  { timezone: 'Asia/Riyadh', userId: 'user123' }
);

// Parse Arabic text
const result3 = await nlpService.parseNaturalLanguage(
  "اجتماع مع العميل يوم الثلاثاء الساعة 2 مساءً"
);
```

---

### 2. `parseDateTime(text, referenceDate)`

Extracts date and time information using chrono-node.

**Parameters:**
- `text` (string) - Input text containing date/time references
- `referenceDate` (Date) - Reference date for relative parsing (optional)

**Returns:** Object with:
```javascript
{
  startDateTime: Date | null,
  endDateTime: Date | null,
  isRecurring: boolean,
  recurrencePattern: string | null,
  allDay: boolean,
  chronoResult: {
    text: "tomorrow at 3pm",
    index: 5,
    tags: {...}
  }
}
```

**Example Usage:**
```javascript
// Parse relative dates
const dateInfo = nlpService.parseDateTime("tomorrow at 3pm");
// Returns: { startDateTime: [tomorrow at 15:00], ... }

// Parse specific dates
const dateInfo2 = nlpService.parseDateTime("December 25th at 10am");

// Parse complex patterns
const dateInfo3 = nlpService.parseDateTime("next Monday at 2pm");

// Parse durations
const dateInfo4 = nlpService.parseDateTime("in 2 weeks");
```

**Supported Patterns:**
- Absolute: "December 25th", "2024-12-25", "25/12/2024"
- Relative: "tomorrow", "next Monday", "in 2 weeks", "in 3 hours"
- Times: "at 3pm", "at 15:00", "3:30pm"
- Ranges: "from 2pm to 4pm", "2-4pm"

---

### 3. `extractPriority(text)`

Extracts priority level from text using keyword matching.

**Parameters:**
- `text` (string) - Input text

**Returns:** string - One of: `'low'`, `'medium'`, `'high'`, `'critical'`

**Example Usage:**
```javascript
nlpService.extractPriority("Review contract ASAP");
// Returns: "critical"

nlpService.extractPriority("High priority: call client");
// Returns: "high"

nlpService.extractPriority("عاجل: مراجعة العقد");
// Returns: "critical" (Arabic: urgent)

nlpService.extractPriority("Normal task");
// Returns: "medium" (default)
```

**Priority Keywords:**
- **Critical**: urgent, critical, asap, emergency, عاجل, طارئ, فوري
- **High**: high priority, important, soon, مهم, عالي, قريباً
- **Medium**: medium, normal, متوسط, عادي
- **Low**: low priority, when possible, منخفض, عند الإمكان

---

### 4. `parseRecurrence(text)`

Parses recurrence patterns from natural language.

**Parameters:**
- `text` (string) - Input text containing recurrence information

**Returns:** Object with:
```javascript
{
  enabled: boolean,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | null,
  interval: number,
  daysOfWeek: number[], // 0=Sunday, 6=Saturday
  endDate: Date | null,
  maxOccurrences: number | null
}
```

**Example Usage:**
```javascript
// Daily recurrence
const rec1 = nlpService.parseRecurrence("Send report every day");
// Returns: { enabled: true, frequency: 'daily', ... }

// Weekly on specific days
const rec2 = nlpService.parseRecurrence("Meeting every Tuesday at 2pm");
// Returns: { enabled: true, frequency: 'weekly', daysOfWeek: [2], ... }

// With end date
const rec3 = nlpService.parseRecurrence("Weekly meeting for 3 months");
// Returns: { enabled: true, frequency: 'weekly', endDate: [3 months from now], ... }

// With occurrence limit
const rec4 = nlpService.parseRecurrence("Call client every week for 10 times");
// Returns: { enabled: true, frequency: 'weekly', maxOccurrences: 10, ... }

// Arabic
const rec5 = nlpService.parseRecurrence("اجتماع أسبوعي كل يوم الثلاثاء");
// Returns: { enabled: true, frequency: 'weekly', daysOfWeek: [2], ... }
```

**Supported Frequencies:**
- daily, every day, يومي, كل يوم
- weekly, every week, أسبوعي, كل أسبوع
- biweekly, every two weeks, كل أسبوعين
- monthly, every month, شهري, كل شهر
- quarterly, every quarter, ربع سنوي
- yearly, annually, سنوي, كل سنة

---

### 5. `classifyIntent(text, context)`

Uses Claude AI to classify the intent and extract entities.

**Parameters:**
- `text` (string) - Input text
- `context` (object) - Additional context
  - `language` (string) - 'en' or 'ar'
  - `hasDateTime` (boolean) - Whether date/time was found
  - `hasRecurrence` (boolean) - Whether recurrence pattern was found

**Returns:** Promise resolving to:
```javascript
{
  type: 'task' | 'event' | 'reminder' | 'deadline' | 'meeting' | 'call' | 'review',
  confidence: 0.0-1.0,
  entities: {
    person: ["names"],
    organization: ["companies"],
    document: ["files"],
    action: "verb",
    subject: "what",
    caseNumber: "case #",
    contractNumber: "contract #"
  },
  summary: "brief summary",
  suggestedCategory: "category",
  tokensUsed: 1234
}
```

**Example Usage:**
```javascript
// Classify a call
const intent = await nlpService.classifyIntent("Call John about the contract");
// Returns: { type: 'call', entities: { person: ['John'], document: ['contract'] }, ... }

// Classify a meeting
const intent2 = await nlpService.classifyIntent("Meeting with ABC Corp regarding case #2024/123");
// Returns: { type: 'meeting', entities: { organization: ['ABC Corp'], caseNumber: '2024/123' }, ... }

// Arabic
const intent3 = await nlpService.classifyIntent("مراجعة العقد", { language: 'ar' });
// Returns: { type: 'review', entities: { document: ['العقد'] }, ... }
```

---

## Additional Helper Functions

### 6. `batchParse(texts, options)`

Parse multiple natural language inputs at once.

```javascript
const results = await nlpService.batchParse([
  "Call John tomorrow at 3pm",
  "Review contract next Monday",
  "Meeting with client every Tuesday"
]);
// Returns array of parsed results
```

---

### 7. `extractCaseInfo(text)`

Extract legal case-specific information.

```javascript
const caseInfo = nlpService.extractCaseInfo("File motion in case #2024/456 at General Court");
// Returns: {
//   caseNumber: "2024/456",
//   courtName: "General Court",
//   parties: [],
//   references: []
// }
```

**Supported Saudi Courts:**
- المحكمة العامة (General Court)
- محكمة الاستئناف (Court of Appeal)
- المحكمة العليا (Supreme Court)
- محكمة التنفيذ (Execution Court)
- المحكمة التجارية (Commercial Court)
- المحكمة الإدارية (Administrative Court)

---

### 8. `suggestCompletions(partialText, context)`

Suggest auto-completions for partial input.

```javascript
const suggestions = await nlpService.suggestCompletions("Review con");
// Returns array of template suggestions
```

---

## Real-World Examples

### Example 1: Simple Task
```javascript
const result = await nlpService.parseNaturalLanguage("Call John tomorrow at 3pm");

// Result:
{
  title: "Call John",
  type: "call",
  dateTime: [tomorrow at 15:00],
  priority: "medium",
  participants: ["John"],
  confidence: 0.85
}
```

### Example 2: High Priority Deadline
```javascript
const result = await nlpService.parseNaturalLanguage(
  "Review contract next Monday high priority"
);

// Result:
{
  title: "Review contract",
  type: "review",
  dateTime: [next Monday at 09:00],
  priority: "high",
  entities: {
    action: "review",
    document: ["contract"]
  }
}
```

### Example 3: Recurring Meeting
```javascript
const result = await nlpService.parseNaturalLanguage(
  "Meeting with client every Tuesday at 2pm for 3 months"
);

// Result:
{
  title: "Meeting with client",
  type: "meeting",
  dateTime: [next Tuesday at 14:00],
  participants: ["client"],
  recurrence: {
    enabled: true,
    frequency: "weekly",
    daysOfWeek: [2],
    endDate: [3 months from now]
  }
}
```

### Example 4: Legal Deadline
```javascript
const result = await nlpService.parseNaturalLanguage(
  "Remind me to file motion in case #2024/123 in 2 weeks"
);

// Result:
{
  title: "File motion in case #2024/123",
  type: "reminder",
  dateTime: [2 weeks from now],
  entities: {
    action: "file",
    document: ["motion"],
    caseNumber: "2024/123"
  }
}
```

### Example 5: Arabic Input
```javascript
const result = await nlpService.parseNaturalLanguage(
  "اجتماع عاجل مع العميل غداً الساعة 10 صباحاً"
);

// Result:
{
  title: "اجتماع مع العميل",
  language: "ar",
  type: "meeting",
  dateTime: [tomorrow at 10:00],
  priority: "critical", // from "عاجل"
  participants: ["العميل"]
}
```

---

## Integration with Existing Code

The service maintains backward compatibility with existing methods:

### Legacy Methods (Deprecated)
- `parseReminderFromText()` - Still works, but use `parseNaturalLanguage()` instead
- `parseEventFromText()` - Still works, but use `parseNaturalLanguage()` instead

These methods remain functional for backward compatibility but are marked as deprecated.

---

## Error Handling

The service includes comprehensive error handling:

```javascript
try {
  const result = await nlpService.parseNaturalLanguage(text);
  // Use result
} catch (error) {
  console.error('Parsing failed:', error.message);
  // Fallback logic
}
```

If Claude AI classification fails, the service automatically falls back to rule-based classification to ensure robustness.

---

## Performance Considerations

- **Date/Time Parsing**: Fast (chrono-node is highly optimized)
- **Priority/Recurrence Extraction**: Very fast (keyword matching)
- **Intent Classification**: Slower (requires API call to Claude)
  - Uses caching where possible
  - Fallback to rule-based classification on failure

**Optimization Tips:**
1. Use `batchParse()` for multiple items instead of individual calls
2. Cache results for repeated queries
3. Consider pre-processing text to remove unnecessary content

---

## Dependencies

- `@anthropic-ai/sdk` - Already installed
- `chrono-node` - **NEEDS TO BE INSTALLED**: `npm install chrono-node`

---

## Environment Variables

Ensure your `.env` file contains:

```env
ANTHROPIC_API_KEY=your_api_key_here
```

---

## Testing

Example test cases:

```javascript
// Test date parsing
console.log(nlpService.parseDateTime("tomorrow at 3pm"));
console.log(nlpService.parseDateTime("next Monday"));
console.log(nlpService.parseDateTime("in 2 weeks"));

// Test priority extraction
console.log(nlpService.extractPriority("URGENT: call client"));
console.log(nlpService.extractPriority("low priority task"));

// Test recurrence
console.log(nlpService.parseRecurrence("every Tuesday at 2pm"));
console.log(nlpService.parseRecurrence("daily for 30 days"));

// Test full parsing
const result = await nlpService.parseNaturalLanguage(
  "Review contract with ABC Corp next Monday high priority"
);
console.log(JSON.stringify(result, null, 2));
```

---

## Support for Saudi Legal Context

The service includes specific features for Saudi law firms:

1. **Arabic Language Support**: Full RTL text support
2. **Saudi Court Names**: Recognizes all major Saudi courts
3. **Case Number Formats**: Detects Saudi case number patterns (e.g., 2024/456)
4. **Legal Document Types**: Understands مذكرة، عقد، قضية، etc.
5. **Saudi Date Formats**: Hijri calendar support (through chrono-node)

---

## Future Enhancements

Potential improvements:

1. Machine learning-based completions
2. Custom entity recognition for firm-specific terms
3. Multi-language support beyond English/Arabic
4. Integration with calendar systems (Google Calendar, Outlook)
5. Voice-to-text integration
6. Smart scheduling (avoiding conflicts)

---

## License & Credits

- Built for Traf3li Legal Management System
- Uses Anthropic Claude AI for NLP
- Uses chrono-node for date parsing
- Supports Saudi Arabia legal market

---

For questions or issues, contact the development team.
