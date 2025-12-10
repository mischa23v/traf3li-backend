# Frontend Integration Guide: Todoist-Equivalent Features

This document provides comprehensive integration instructions for the new Todoist-equivalent features added to the backend. These features include Natural Language Processing (NLP), AI-Powered Smart Scheduling, Voice-to-Task Conversion, and Location-Based Reminders.

**IMPORTANT: User-Provided API Keys**

Each law firm provides their own API keys for AI services (OpenAI, Anthropic). This allows:
- Firms to control their own costs
- No centralized API key management needed
- Each firm's usage is tracked separately
- Features are automatically enabled when keys are configured

---

## Table of Contents

1. [AI Settings (API Keys Management)](#1-ai-settings-api-keys-management)
2. [Natural Language Processing (NLP)](#2-natural-language-processing-nlp)
3. [AI-Powered Smart Scheduling](#3-ai-powered-smart-scheduling)
4. [Voice-to-Task Conversion](#4-voice-to-task-conversion)
5. [Location-Based Reminders](#5-location-based-reminders)
6. [Environment Variables](#6-environment-variables)
7. [Dependencies](#7-dependencies)

---

## 1. AI Settings (API Keys Management)

### Overview

Before using NLP, Voice-to-Task, or AI features, law firms must configure their own API keys. This is done through the AI Settings page.

### Required API Keys

| Provider | Purpose | Required For |
|----------|---------|--------------|
| **Anthropic** | Claude AI for NLP parsing | NLP Task Creation, AI Assistant |
| **OpenAI** | Whisper for speech-to-text | Voice-to-Task |
| **Google Cloud** (Optional) | Alternative speech-to-text | Voice-to-Task (alternative) |

### Feature Availability

| Feature | Required Keys |
|---------|---------------|
| NLP Task Creation | Anthropic |
| Voice-to-Task | OpenAI + Anthropic |
| Smart Scheduling | None (works without API keys) |
| AI Assistant | Anthropic |

---

### API Endpoints

#### Get AI Settings

```http
GET /api/settings/ai
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "openai": {
      "isConfigured": true,
      "apiKeyMasked": "sk-...abcd",
      "lastValidated": "2025-12-10T10:30:00.000Z",
      "usageThisMonth": 15420
    },
    "anthropic": {
      "isConfigured": true,
      "apiKeyMasked": "sk-ant-...wxyz",
      "lastValidated": "2025-12-10T10:30:00.000Z",
      "usageThisMonth": 8750
    },
    "google": {
      "isConfigured": false,
      "apiKeyMasked": null,
      "lastValidated": null
    },
    "features": {
      "nlpTaskCreation": true,
      "voiceToTask": true,
      "smartScheduling": true,
      "aiAssistant": true
    },
    "preferences": {
      "defaultLanguage": "ar",
      "preferredSpeechProvider": "openai",
      "preferredNlpProvider": "anthropic"
    }
  }
}
```

#### Save API Key

```http
POST /api/settings/ai/keys
Content-Type: application/json
Authorization: Bearer <token>

{
  "provider": "anthropic",
  "apiKey": "sk-ant-api03-xxxxx..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "anthropic API key saved and validated successfully",
  "data": {
    "provider": "anthropic",
    "features": {
      "nlpTaskCreation": true,
      "voiceToTask": false,
      "smartScheduling": true,
      "aiAssistant": true
    }
  }
}
```

#### Remove API Key

```http
DELETE /api/settings/ai/keys/openai
Authorization: Bearer <token>
```

#### Validate API Key (Without Saving)

```http
POST /api/settings/ai/validate
Content-Type: application/json
Authorization: Bearer <token>

{
  "provider": "openai",
  "apiKey": "sk-xxxxx..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "provider": "openai",
    "valid": true,
    "message": "API key is valid"
  }
}
```

#### Get Feature Status

```http
GET /api/settings/ai/features
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "nlpTaskCreation": {
      "enabled": true,
      "requires": ["anthropic"],
      "configured": true
    },
    "voiceToTask": {
      "enabled": false,
      "requires": ["openai", "anthropic"],
      "configured": {
        "openai": false,
        "anthropic": true
      }
    },
    "smartScheduling": {
      "enabled": true,
      "requires": [],
      "configured": true
    }
  }
}
```

#### Update Preferences

```http
PATCH /api/settings/ai/preferences
Content-Type: application/json
Authorization: Bearer <token>

{
  "defaultLanguage": "ar",
  "preferredSpeechProvider": "openai"
}
```

---

### Frontend Implementation

#### AI Settings Page Component

```tsx
import React, { useState, useEffect } from 'react';

interface AISettings {
  openai: { isConfigured: boolean; apiKeyMasked: string | null; usageThisMonth: number };
  anthropic: { isConfigured: boolean; apiKeyMasked: string | null; usageThisMonth: number };
  google: { isConfigured: boolean; apiKeyMasked: string | null };
  features: {
    nlpTaskCreation: boolean;
    voiceToTask: boolean;
    smartScheduling: boolean;
    aiAssistant: boolean;
  };
}

export const AISettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState({ provider: '', apiKey: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings/ai', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setSettings(data.data);
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (provider: string, apiKey: string) => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings/ai/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ provider, apiKey })
      });

      const data = await response.json();

      if (data.success) {
        await fetchSettings(); // Refresh settings
        setNewKey({ provider: '', apiKey: '' });
        alert(`${provider} API key saved successfully!`);
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error saving API key:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to remove the ${provider} API key?`)) return;

    try {
      await fetch(`/api/settings/ai/keys/${provider}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      await fetchSettings();
    } catch (error) {
      console.error('Error removing API key:', error);
    }
  };

  if (loading) return <div>Loading AI settings...</div>;
  if (!settings) return <div>Error loading settings</div>;

  return (
    <div className="ai-settings-page">
      <h1>AI Services Settings</h1>
      <p className="description">
        Configure your API keys to enable AI-powered features like natural language
        task creation and voice-to-task conversion. Each firm manages their own API keys.
      </p>

      {/* Feature Status Overview */}
      <div className="feature-status">
        <h2>Feature Status</h2>
        <div className="features-grid">
          <FeatureCard
            name="Natural Language Task Creation"
            enabled={settings.features.nlpTaskCreation}
            description="Create tasks by typing naturally"
          />
          <FeatureCard
            name="Voice to Task"
            enabled={settings.features.voiceToTask}
            description="Convert voice memos to tasks"
          />
          <FeatureCard
            name="Smart Scheduling"
            enabled={settings.features.smartScheduling}
            description="AI-powered scheduling suggestions"
          />
          <FeatureCard
            name="AI Assistant"
            enabled={settings.features.aiAssistant}
            description="AI-powered task assistance"
          />
        </div>
      </div>

      {/* API Keys Configuration */}
      <div className="api-keys-section">
        <h2>API Keys</h2>

        {/* Anthropic */}
        <APIKeyCard
          provider="anthropic"
          displayName="Anthropic (Claude AI)"
          description="Required for NLP task creation and AI features"
          isConfigured={settings.anthropic.isConfigured}
          maskedKey={settings.anthropic.apiKeyMasked}
          usage={settings.anthropic.usageThisMonth}
          onSave={(key) => handleSaveKey('anthropic', key)}
          onRemove={() => handleRemoveKey('anthropic')}
          helpUrl="https://console.anthropic.com/settings/keys"
        />

        {/* OpenAI */}
        <APIKeyCard
          provider="openai"
          displayName="OpenAI (Whisper)"
          description="Required for voice-to-task transcription"
          isConfigured={settings.openai.isConfigured}
          maskedKey={settings.openai.apiKeyMasked}
          usage={settings.openai.usageThisMonth}
          onSave={(key) => handleSaveKey('openai', key)}
          onRemove={() => handleRemoveKey('openai')}
          helpUrl="https://platform.openai.com/api-keys"
        />

        {/* Google (Optional) */}
        <APIKeyCard
          provider="google"
          displayName="Google Cloud (Optional)"
          description="Alternative speech-to-text provider"
          isConfigured={settings.google.isConfigured}
          maskedKey={settings.google.apiKeyMasked}
          onSave={(key) => handleSaveKey('google', key)}
          onRemove={() => handleRemoveKey('google')}
          helpUrl="https://console.cloud.google.com/apis/credentials"
        />
      </div>
    </div>
  );
};

// Feature Card Component
const FeatureCard: React.FC<{
  name: string;
  enabled: boolean;
  description: string;
}> = ({ name, enabled, description }) => (
  <div className={`feature-card ${enabled ? 'enabled' : 'disabled'}`}>
    <div className="feature-status-icon">
      {enabled ? '✅' : '❌'}
    </div>
    <h3>{name}</h3>
    <p>{description}</p>
    {!enabled && <span className="setup-hint">Configure API keys to enable</span>}
  </div>
);

// API Key Card Component
const APIKeyCard: React.FC<{
  provider: string;
  displayName: string;
  description: string;
  isConfigured: boolean;
  maskedKey: string | null;
  usage?: number;
  onSave: (key: string) => void;
  onRemove: () => void;
  helpUrl: string;
}> = ({ provider, displayName, description, isConfigured, maskedKey, usage, onSave, onRemove, helpUrl }) => {
  const [showInput, setShowInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [validating, setValidating] = useState(false);

  const handleValidateAndSave = async () => {
    if (!apiKey.trim()) return;

    setValidating(true);
    try {
      // First validate
      const validateRes = await fetch('/api/settings/ai/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ provider, apiKey })
      });
      const validateData = await validateRes.json();

      if (validateData.data?.valid) {
        onSave(apiKey);
        setApiKey('');
        setShowInput(false);
      } else {
        alert(`Invalid API key: ${validateData.data?.message || 'Validation failed'}`);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className={`api-key-card ${isConfigured ? 'configured' : ''}`}>
      <div className="card-header">
        <h3>{displayName}</h3>
        <span className={`status-badge ${isConfigured ? 'active' : 'inactive'}`}>
          {isConfigured ? 'Configured' : 'Not Configured'}
        </span>
      </div>

      <p className="card-description">{description}</p>

      {isConfigured ? (
        <div className="configured-key">
          <code>{maskedKey}</code>
          {usage !== undefined && (
            <span className="usage">Tokens used this month: {usage.toLocaleString()}</span>
          )}
          <div className="actions">
            <button onClick={() => setShowInput(true)} className="btn-secondary">
              Update Key
            </button>
            <button onClick={onRemove} className="btn-danger">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="unconfigured">
          {!showInput ? (
            <button onClick={() => setShowInput(true)} className="btn-primary">
              Add API Key
            </button>
          ) : (
            <div className="key-input-form">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider} API key`}
                className="api-key-input"
              />
              <div className="input-actions">
                <button
                  onClick={handleValidateAndSave}
                  disabled={validating || !apiKey.trim()}
                  className="btn-primary"
                >
                  {validating ? 'Validating...' : 'Save Key'}
                </button>
                <button onClick={() => { setShowInput(false); setApiKey(''); }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="help-link">
        Get API key from {provider} →
      </a>
    </div>
  );
};
```

#### Check Feature Availability Hook

```tsx
import { useState, useEffect } from 'react';

export const useAIFeatures = () => {
  const [features, setFeatures] = useState({
    nlpTaskCreation: false,
    voiceToTask: false,
    smartScheduling: false,
    aiAssistant: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFeatures = async () => {
      try {
        const response = await fetch('/api/settings/ai/features', {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();

        if (data.success) {
          setFeatures({
            nlpTaskCreation: data.data.nlpTaskCreation.enabled,
            voiceToTask: data.data.voiceToTask.enabled,
            smartScheduling: data.data.smartScheduling.enabled,
            aiAssistant: data.data.aiAssistant?.enabled || false
          });
        }
      } catch (error) {
        console.error('Error checking AI features:', error);
      } finally {
        setLoading(false);
      }
    };

    checkFeatures();
  }, []);

  return { features, loading };
};

// Usage in components
export const TaskInput: React.FC = () => {
  const { features, loading } = useAIFeatures();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {features.nlpTaskCreation ? (
        <QuickAddInput placeholder="Type naturally... e.g., 'Call John tomorrow at 3pm'" />
      ) : (
        <div className="feature-disabled">
          <p>Natural language input is not available.</p>
          <a href="/settings/ai">Configure API keys to enable</a>
        </div>
      )}
    </div>
  );
};
```

---

---

## 1. Natural Language Processing (NLP)

### Overview

The NLP service allows users to create tasks, reminders, and events using natural language input. Type "Call John tomorrow at 3pm high priority" and the system automatically parses date/time, priority, and creates the item.

### Supported Input Types

- **Relative dates**: "tomorrow", "next week", "in 3 days"
- **Specific dates**: "August 29", "12/25/2025"
- **Times**: "at 3pm", "at 15:00"
- **Recurring patterns**: "every day", "every Monday", "every 3rd Tuesday"
- **Priority keywords**: "urgent", "important", "high priority", "low priority"
- **Arabic language support**: "غدا", "عاجل", "كل يوم"

---

### API Endpoints

#### Create Task from Natural Language

```http
POST /api/tasks/parse
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "Review contract for ABC Corp tomorrow at 3pm high priority",
  "caseId": "optional-case-id",
  "timezone": "Asia/Riyadh"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task created from natural language",
  "data": {
    "task": {
      "_id": "...",
      "title": "Review contract for ABC Corp",
      "dueDate": "2025-12-11T15:00:00.000Z",
      "priority": "high",
      "status": "todo"
    },
    "parsing": {
      "rawText": "Review contract for ABC Corp tomorrow at 3pm high priority",
      "confidence": 0.92,
      "type": "task",
      "entities": {
        "organization": ["ABC Corp"],
        "action": "review",
        "subject": "contract"
      }
    }
  }
}
```

#### Create Reminder from Natural Language

```http
POST /api/reminders/parse
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "Remind me to call John tomorrow at 9am",
  "timezone": "Asia/Riyadh"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Reminder created from natural language",
  "data": {
    "reminder": {
      "_id": "...",
      "title": "Call John",
      "reminderDateTime": "2025-12-11T09:00:00.000Z",
      "priority": "medium",
      "type": "call"
    },
    "confidence": 0.88
  }
}
```

#### Create Event from Natural Language

```http
POST /api/events/parse
Content-Type: application/json
Authorization: Bearer <token>

{
  "text": "Meeting with Sarah next Monday at 10am for 1 hour at downtown office",
  "timezone": "Asia/Riyadh"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Event created from natural language",
  "data": {
    "event": {
      "_id": "...",
      "title": "Meeting with Sarah",
      "startDateTime": "2025-12-15T10:00:00.000Z",
      "endDateTime": "2025-12-15T11:00:00.000Z",
      "type": "meeting",
      "location": {
        "type": "physical",
        "address": "downtown office"
      },
      "attendees": [{"name": "Sarah"}]
    },
    "confidence": 0.85
  }
}
```

---

### Frontend Implementation

#### Quick Add Input Component

```tsx
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface QuickAddProps {
  onSuccess?: (item: any) => void;
  placeholder?: string;
  itemType?: 'task' | 'reminder' | 'event' | 'auto';
}

export const QuickAddInput: React.FC<QuickAddProps> = ({
  onSuccess,
  placeholder = "Type naturally... e.g., 'Call John tomorrow at 3pm'",
  itemType = 'auto'
}) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const { token } = useAuth();

  // Debounced preview as user types
  const handleTextChange = async (value: string) => {
    setText(value);

    if (value.length > 10) {
      // Optional: Show live preview of parsing
      try {
        const response = await fetch('/api/nlp/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ text: value })
        });
        const data = await response.json();
        setPreview(data);
      } catch (error) {
        console.error('Preview error:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      // Determine endpoint based on itemType or let backend auto-detect
      let endpoint = '/api/tasks/parse';
      if (itemType === 'reminder') endpoint = '/api/reminders/parse';
      else if (itemType === 'event') endpoint = '/api/events/parse';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      });

      const data = await response.json();

      if (data.success) {
        setText('');
        setPreview(null);
        onSuccess?.(data.data);
      } else {
        console.error('NLP parsing failed:', data.message);
      }
    } catch (error) {
      console.error('Error creating item:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="quick-add-form">
      <input
        type="text"
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={placeholder}
        className="quick-add-input"
        disabled={loading}
      />

      {/* Live Preview */}
      {preview && (
        <div className="nlp-preview">
          <span className="preview-type">{preview.type}</span>
          {preview.dateTime && (
            <span className="preview-date">
              {new Date(preview.dateTime).toLocaleString()}
            </span>
          )}
          {preview.priority !== 'medium' && (
            <span className={`preview-priority ${preview.priority}`}>
              {preview.priority}
            </span>
          )}
          {preview.recurrence?.enabled && (
            <span className="preview-recurring">
              Repeats {preview.recurrence.frequency}
            </span>
          )}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Add'}
      </button>
    </form>
  );
};
```

#### Keyboard Shortcut Integration

```tsx
// Add global keyboard shortcut for quick add
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd/Ctrl + K to open quick add
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setQuickAddOpen(true);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 2. AI-Powered Smart Scheduling

### Overview

The Smart Scheduling service learns from user behavior to suggest optimal times for tasks, predict task durations, detect workload overload, and provide intelligent nudges.

---

### API Endpoints

#### Get User Productivity Patterns

```http
GET /api/smart-scheduling/patterns
Authorization: Bearer <token>
```

**Response:**
```json
{
  "error": false,
  "patterns": {
    "mostProductiveHours": [
      { "hour": 10, "hourFormatted": "10:00 AM", "productivityScore": 42.5, "tasksCompleted": 18 },
      { "hour": 9, "hourFormatted": "9:00 AM", "productivityScore": 38.2, "tasksCompleted": 15 }
    ],
    "preferredDays": [
      { "day": "Tuesday", "dayOfWeek": 2, "productivityScore": 38.2, "tasksCompleted": 25 },
      { "day": "Wednesday", "dayOfWeek": 3, "productivityScore": 35.1, "tasksCompleted": 22 }
    ],
    "avgTaskDuration": 87,
    "completionRates": {
      "overall": 0.78,
      "byPriority": { "high": 0.92, "medium": 0.75, "low": 0.65 },
      "byTaskType": { "document_review": 0.85, "client_meeting": 0.95 }
    },
    "workloadPatterns": {
      "peakDays": ["Tuesday", "Wednesday", "Monday"],
      "peakHours": ["10:00 AM", "9:00 AM", "2:00 PM", "11:00 AM"],
      "avgTasksPerDay": 6.2,
      "avgHoursPerDay": 5.8
    },
    "insights": [
      {
        "type": "peak_time",
        "message": "Your peak productivity is around 10:00 AM",
        "recommendation": "Schedule important tasks during this time"
      }
    ]
  }
}
```

#### Suggest Best Time for Task

```http
POST /api/smart-scheduling/suggest
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Review contract",
  "type": "document_review",
  "estimatedMinutes": 90,
  "priority": "high",
  "dueDate": "2025-12-20"
}
```

**Response:**
```json
{
  "error": false,
  "suggestion": {
    "suggestedDateTime": "2025-12-11T10:00:00.000Z",
    "confidence": 85,
    "reason": "10:00 AM is one of your most productive times; Tuesday is a highly productive day for you; Morning slot for better focus",
    "alternatives": [
      {
        "dateTime": "2025-12-12T09:00:00.000Z",
        "confidence": 78,
        "reason": "Wednesday morning - second most productive day"
      }
    ]
  }
}
```

#### Predict Task Duration

```http
POST /api/smart-scheduling/predict-duration
Content-Type: application/json
Authorization: Bearer <token>

{
  "taskType": "court_hearing",
  "complexity": "high"
}
```

**Response:**
```json
{
  "error": false,
  "prediction": {
    "estimatedMinutes": 180,
    "confidence": 78,
    "basedOn": {
      "sampleSize": 15,
      "average": 145,
      "median": 120,
      "range": { "min": 90, "max": 240 },
      "taskType": "court_hearing",
      "complexity": "high"
    },
    "recommendation": "High confidence estimate based on your history"
  }
}
```

#### Analyze Workload

```http
GET /api/smart-scheduling/workload?startDate=2025-12-10&endDate=2025-12-24
Authorization: Bearer <token>
```

**Response:**
```json
{
  "error": false,
  "workload": {
    "overloadedDays": [
      {
        "date": "2025-12-15",
        "totalHours": 10.5,
        "taskCount": 8,
        "eventCount": 3,
        "overloadBy": 2.5
      }
    ],
    "suggestedReschedules": [
      {
        "taskId": "...",
        "taskTitle": "Review contract",
        "currentDate": "2025-12-15",
        "suggestedDate": "2025-12-16",
        "reason": "Move from overloaded day (10.5h) to lighter day (4.0h)",
        "impact": { "fromDayNewHours": 9.0, "toDayNewHours": 5.5 }
      }
    ],
    "balanceScore": 68,
    "summary": {
      "totalTasks": 35,
      "totalEvents": 12,
      "avgHoursPerDay": 5.8,
      "maxHoursDay": "2025-12-15",
      "minHoursDay": "2025-12-21"
    }
  }
}
```

#### Get Daily Smart Nudges

```http
GET /api/smart-scheduling/nudges
Authorization: Bearer <token>
```

**Response:**
```json
{
  "error": false,
  "nudges": [
    {
      "type": "peak_productivity",
      "message": "You're in your peak productivity window!",
      "actionSuggestion": "Focus on your most important task now",
      "priority": "high"
    },
    {
      "type": "overdue_tasks",
      "message": "You have 3 overdue tasks",
      "actionSuggestion": "Review and reschedule or complete them today",
      "priority": "critical",
      "count": 3
    },
    {
      "type": "busy_day",
      "message": "Today looks busy with 5 events scheduled",
      "actionSuggestion": "Consider rescheduling non-urgent tasks",
      "priority": "medium"
    }
  ]
}
```

#### Auto-Schedule Tasks

```http
POST /api/smart-scheduling/auto-schedule
Content-Type: application/json
Authorization: Bearer <token>

{
  "taskIds": ["taskId1", "taskId2", "taskId3"]
}
```

**Response:**
```json
{
  "error": false,
  "message": "Tasks auto-scheduled successfully",
  "scheduled": [
    {
      "taskId": "taskId1",
      "taskTitle": "Draft legal brief",
      "suggestedDateTime": "2025-12-11T10:00:00.000Z",
      "confidence": 82,
      "reason": "Optimal time based on your productivity patterns"
    }
  ]
}
```

---

### Frontend Implementation

#### Productivity Dashboard Component

```tsx
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface ProductivityPattern {
  mostProductiveHours: Array<{
    hour: number;
    hourFormatted: string;
    productivityScore: number;
  }>;
  preferredDays: Array<{
    day: string;
    productivityScore: number;
  }>;
  insights: Array<{
    type: string;
    message: string;
    recommendation: string;
  }>;
}

export const ProductivityDashboard: React.FC = () => {
  const [patterns, setPatterns] = useState<ProductivityPattern | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      const response = await fetch('/api/smart-scheduling/patterns', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setPatterns(data.patterns);
    } catch (error) {
      console.error('Error fetching patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading productivity data...</div>;
  if (!patterns) return null;

  return (
    <div className="productivity-dashboard">
      <h2>Your Productivity Patterns</h2>

      {/* Peak Hours Chart */}
      <div className="chart-section">
        <h3>Most Productive Hours</h3>
        <BarChart width={400} height={200} data={patterns.mostProductiveHours}>
          <XAxis dataKey="hourFormatted" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="productivityScore" fill="#4CAF50" />
        </BarChart>
      </div>

      {/* Best Days */}
      <div className="chart-section">
        <h3>Best Days for Work</h3>
        <BarChart width={400} height={200} data={patterns.preferredDays}>
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="productivityScore" fill="#2196F3" />
        </BarChart>
      </div>

      {/* Insights */}
      <div className="insights-section">
        <h3>Insights</h3>
        {patterns.insights.map((insight, index) => (
          <div key={index} className={`insight-card ${insight.type}`}>
            <p className="insight-message">{insight.message}</p>
            <p className="insight-recommendation">{insight.recommendation}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### Smart Nudges Widget

```tsx
import React, { useEffect, useState } from 'react';

interface Nudge {
  type: string;
  message: string;
  actionSuggestion: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export const SmartNudgesWidget: React.FC = () => {
  const [nudges, setNudges] = useState<Nudge[]>([]);

  useEffect(() => {
    fetchNudges();
    // Refresh nudges every 30 minutes
    const interval = setInterval(fetchNudges, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchNudges = async () => {
    try {
      const response = await fetch('/api/smart-scheduling/nudges', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setNudges(data.nudges || []);
    } catch (error) {
      console.error('Error fetching nudges:', error);
    }
  };

  if (nudges.length === 0) return null;

  return (
    <div className="smart-nudges">
      <h3>Smart Suggestions</h3>
      {nudges.map((nudge, index) => (
        <div key={index} className={`nudge-card priority-${nudge.priority}`}>
          <div className="nudge-icon">
            {nudge.type === 'peak_productivity' && '🚀'}
            {nudge.type === 'overdue_tasks' && '⚠️'}
            {nudge.type === 'busy_day' && '📅'}
            {nudge.type === 'stale_task' && '⏰'}
          </div>
          <div className="nudge-content">
            <p className="nudge-message">{nudge.message}</p>
            <p className="nudge-action">{nudge.actionSuggestion}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### Auto-Schedule Button Component

```tsx
import React, { useState } from 'react';

interface AutoScheduleButtonProps {
  selectedTaskIds: string[];
  onScheduled?: (scheduled: any[]) => void;
}

export const AutoScheduleButton: React.FC<AutoScheduleButtonProps> = ({
  selectedTaskIds,
  onScheduled
}) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);

  const handleAutoSchedule = async () => {
    if (selectedTaskIds.length === 0) {
      alert('Please select tasks to auto-schedule');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/smart-scheduling/auto-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ taskIds: selectedTaskIds })
      });

      const data = await response.json();

      if (!data.error) {
        setResults(data.scheduled);
        onScheduled?.(data.scheduled);
      }
    } catch (error) {
      console.error('Error auto-scheduling:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auto-schedule-container">
      <button
        onClick={handleAutoSchedule}
        disabled={loading || selectedTaskIds.length === 0}
        className="auto-schedule-btn"
      >
        {loading ? 'Scheduling...' : `Auto-Schedule ${selectedTaskIds.length} Tasks`}
      </button>

      {results && (
        <div className="auto-schedule-results">
          <h4>Scheduled Tasks</h4>
          {results.map((result, index) => (
            <div key={index} className="schedule-result">
              <span className="task-title">{result.taskTitle}</span>
              <span className="suggested-time">
                {new Date(result.suggestedDateTime).toLocaleString()}
              </span>
              <span className="confidence">
                {result.confidence}% confidence
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 3. Voice-to-Task Conversion

### Overview

Users can record voice memos that are automatically transcribed and converted into tasks, reminders, or events using speech-to-text (OpenAI Whisper) + NLP processing.

---

### API Endpoints

#### Transcribe Audio Only

```http
POST /api/voice-to-task/transcribe
Content-Type: multipart/form-data
Authorization: Bearer <token>

audio: <audio file>
language: ar (or en)
```

**Response:**
```json
{
  "success": true,
  "message": "Audio transcribed successfully",
  "data": {
    "transcription": "راجع العقد مع شركة ABC غدا الساعة 3 العصر",
    "language": "ar",
    "duration": 5.2,
    "confidence": 0.92,
    "metadata": {
      "model": "whisper-1",
      "fileSize": 125000
    }
  }
}
```

#### Upload Audio and Create Task/Reminder/Event

```http
POST /api/voice-to-task/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

audio: <audio file>
language: ar
autoCreate: true
caseId: optional-case-id
```

**Response:**
```json
{
  "success": true,
  "message": "Task created successfully from voice",
  "data": {
    "transcription": "Call John tomorrow at 3pm about the contract",
    "language": "en",
    "duration": 4.1,
    "transcriptionConfidence": 0.95,
    "type": "task",
    "extractedData": {
      "title": "Call John about the contract",
      "dateTime": "2025-12-11T15:00:00.000Z",
      "priority": "medium",
      "type": "call"
    },
    "confidence": 0.88,
    "createdItem": {
      "_id": "...",
      "title": "Call John about the contract",
      "dueDate": "2025-12-11T15:00:00.000Z"
    }
  }
}
```

#### Batch Upload Multiple Voice Memos

```http
POST /api/voice-to-task/batch-upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

audio: <file1.m4a>
audio: <file2.mp3>
audio: <file3.wav>
language: ar
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 3 of 3 voice memos successfully",
  "summary": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "byType": {
      "task": 2,
      "reminder": 1,
      "event": 0
    }
  },
  "results": [...]
}
```

#### Get Speech-to-Text Service Status

```http
GET /api/voice-to-task/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "model": "whisper-1",
    "supportedFormats": ["mp3", "mp4", "m4a", "wav", "webm", "ogg", "flac"],
    "supportedLanguages": ["ar", "en", "fr", "es", "de"],
    "maxFileSize": "25MB",
    "provider": "OpenAI Whisper"
  }
}
```

---

### Frontend Implementation

#### Voice Recorder Component

```tsx
import React, { useState, useRef } from 'react';

interface VoiceRecorderProps {
  onTaskCreated?: (task: any) => void;
  language?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTaskCreated,
  language = 'ar'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Microphone access denied. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceMemo = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-memo.webm');
      formData.append('language', language);
      formData.append('autoCreate', 'true');

      const response = await fetch('/api/voice-to-task/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        onTaskCreated?.(data.data.createdItem);
        setAudioBlob(null);
      } else {
        console.error('Voice processing failed:', data.message);
      }
    } catch (error) {
      console.error('Error processing voice memo:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="voice-recorder">
      <div className="recorder-controls">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="record-btn"
            disabled={isProcessing}
          >
            🎤 Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="stop-btn recording"
          >
            ⏹️ Stop Recording
          </button>
        )}
      </div>

      {audioBlob && !isProcessing && (
        <div className="audio-preview">
          <audio src={URL.createObjectURL(audioBlob)} controls />
          <button onClick={processVoiceMemo} className="process-btn">
            Create Task from Voice
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="processing-indicator">
          <span className="spinner">⏳</span>
          Processing voice memo...
        </div>
      )}

      {result && (
        <div className="voice-result">
          <h4>Created: {result.type}</h4>
          <p><strong>Transcription:</strong> {result.transcription}</p>
          <p><strong>Title:</strong> {result.createdItem?.title}</p>
          {result.createdItem?.dueDate && (
            <p>
              <strong>Due:</strong>
              {new Date(result.createdItem.dueDate).toLocaleString()}
            </p>
          )}
          <p><strong>Confidence:</strong> {(result.confidence * 100).toFixed(0)}%</p>
        </div>
      )}
    </div>
  );
};
```

#### Mobile Voice Button (Floating Action Button)

```tsx
import React, { useState } from 'react';

export const VoiceFAB: React.FC = () => {
  const [showRecorder, setShowRecorder] = useState(false);

  return (
    <>
      <button
        className="voice-fab"
        onClick={() => setShowRecorder(true)}
        aria-label="Add task with voice"
      >
        🎤
      </button>

      {showRecorder && (
        <div className="voice-modal">
          <div className="voice-modal-content">
            <button
              className="close-btn"
              onClick={() => setShowRecorder(false)}
            >
              ×
            </button>
            <VoiceRecorder
              onTaskCreated={() => setShowRecorder(false)}
              language="ar"
            />
          </div>
        </div>
      )}
    </>
  );
};
```

---

## 4. Location-Based Reminders

### Overview

Create reminders that trigger when users arrive at or leave specific locations. Useful for reminders like "Buy milk when I arrive at the grocery store".

---

### API Endpoints

#### Save a Location

```http
POST /api/reminders/location/save
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Office",
  "type": "office",
  "address": "123 Business St, Riyadh",
  "latitude": 24.7136,
  "longitude": 46.6753,
  "radius": 100,
  "isDefault": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location saved successfully",
  "data": {
    "location": {
      "_id": "...",
      "name": "Office",
      "type": "office",
      "latitude": 24.7136,
      "longitude": 46.6753,
      "radius": 100,
      "isDefault": true
    }
  }
}
```

#### Get User's Saved Locations

```http
GET /api/reminders/location/locations
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "_id": "...",
        "name": "Office",
        "type": "office",
        "latitude": 24.7136,
        "longitude": 46.6753,
        "radius": 100,
        "visitCount": 45
      },
      {
        "_id": "...",
        "name": "Home",
        "type": "home",
        "latitude": 24.7500,
        "longitude": 46.7000,
        "radius": 50
      }
    ]
  }
}
```

#### Create Location-Based Reminder

```http
POST /api/reminders/location
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Buy groceries",
  "description": "Milk, eggs, bread",
  "priority": "medium",
  "locationTrigger": {
    "type": "arrive",
    "location": {
      "name": "Grocery Store",
      "latitude": 24.7200,
      "longitude": 46.6800
    },
    "radius": 100,
    "repeatTrigger": true,
    "cooldownMinutes": 60
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Location-based reminder created successfully",
  "data": {
    "reminder": {
      "_id": "...",
      "title": "Buy groceries",
      "locationTrigger": {
        "enabled": true,
        "type": "arrive",
        "location": {
          "name": "Grocery Store",
          "latitude": 24.7200,
          "longitude": 46.6800
        },
        "radius": 100,
        "triggered": false
      }
    }
  }
}
```

#### Check Location (Mobile App Polling)

```http
POST /api/reminders/location/check
Content-Type: application/json
Authorization: Bearer <token>

{
  "latitude": 24.7201,
  "longitude": 46.6799,
  "accuracy": 20
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "triggeredReminders": [
      {
        "_id": "...",
        "title": "Buy groceries",
        "description": "Milk, eggs, bread",
        "triggerType": "arrive",
        "locationName": "Grocery Store",
        "distanceMeters": 15
      }
    ],
    "nearbyLocations": [
      {
        "name": "Grocery Store",
        "distanceMeters": 15
      }
    ]
  }
}
```

#### Get Nearby Reminders

```http
POST /api/reminders/location/nearby
Content-Type: application/json
Authorization: Bearer <token>

{
  "latitude": 24.7136,
  "longitude": 46.6753,
  "radiusKm": 5
}
```

#### Get Location Reminder Summary

```http
GET /api/reminders/location/summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalLocationReminders": 12,
      "activeReminders": 8,
      "triggeredToday": 3,
      "savedLocations": 5,
      "byTriggerType": {
        "arrive": 6,
        "leave": 2
      }
    }
  }
}
```

---

### Frontend Implementation

#### Location Picker Component

```tsx
import React, { useState, useEffect } from 'react';

interface Location {
  _id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  radius: number;
}

interface LocationPickerProps {
  onLocationSelect: (location: Location | { latitude: number; longitude: number; name: string }) => void;
  allowCustom?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  allowCustom = true
}) => {
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [customLocation, setCustomLocation] = useState({
    name: '',
    latitude: 0,
    longitude: 0
  });

  useEffect(() => {
    fetchSavedLocations();
  }, []);

  const fetchSavedLocations = async () => {
    try {
      const response = await fetch('/api/reminders/location/locations', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      setSavedLocations(data.data?.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustomLocation({
            ...customLocation,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get current location');
        }
      );
    }
  };

  return (
    <div className="location-picker">
      <h4>Select Location</h4>

      {/* Saved Locations */}
      <div className="saved-locations">
        <h5>Saved Locations</h5>
        {savedLocations.map((location) => (
          <button
            key={location._id}
            className="location-btn"
            onClick={() => onLocationSelect(location)}
          >
            {location.type === 'home' && '🏠'}
            {location.type === 'office' && '🏢'}
            {location.type === 'custom' && '📍'}
            {location.name}
          </button>
        ))}
      </div>

      {/* Custom Location */}
      {allowCustom && (
        <div className="custom-location">
          <h5>Custom Location</h5>
          <input
            type="text"
            placeholder="Location name"
            value={customLocation.name}
            onChange={(e) => setCustomLocation({
              ...customLocation,
              name: e.target.value
            })}
          />
          <button onClick={getCurrentLocation}>
            📍 Use Current Location
          </button>
          {customLocation.latitude !== 0 && (
            <div className="coords">
              <small>
                {customLocation.latitude.toFixed(4)}, {customLocation.longitude.toFixed(4)}
              </small>
              <button
                onClick={() => onLocationSelect(customLocation)}
                disabled={!customLocation.name}
              >
                Select This Location
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### Location Reminder Form

```tsx
import React, { useState } from 'react';

interface LocationReminderFormProps {
  onCreated?: (reminder: any) => void;
}

export const LocationReminderForm: React.FC<LocationReminderFormProps> = ({
  onCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<'arrive' | 'leave'>('arrive');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [radius, setRadius] = useState(100);
  const [repeatTrigger, setRepeatTrigger] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedLocation) return;

    setLoading(true);
    try {
      const response = await fetch('/api/reminders/location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          title,
          description,
          priority: 'medium',
          locationTrigger: {
            type: triggerType,
            location: {
              name: selectedLocation.name,
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              savedLocationId: selectedLocation._id
            },
            radius,
            repeatTrigger,
            cooldownMinutes: 60
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        onCreated?.(data.data.reminder);
        // Reset form
        setTitle('');
        setDescription('');
        setSelectedLocation(null);
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="location-reminder-form">
      <h3>Create Location-Based Reminder</h3>

      <div className="form-group">
        <label>What should we remind you?</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Buy groceries"
          required
        />
      </div>

      <div className="form-group">
        <label>Details (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Milk, eggs, bread"
        />
      </div>

      <div className="form-group">
        <label>When to remind?</label>
        <div className="trigger-type-selector">
          <button
            type="button"
            className={triggerType === 'arrive' ? 'active' : ''}
            onClick={() => setTriggerType('arrive')}
          >
            📍 When I Arrive
          </button>
          <button
            type="button"
            className={triggerType === 'leave' ? 'active' : ''}
            onClick={() => setTriggerType('leave')}
          >
            🚶 When I Leave
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Location</label>
        <LocationPicker onLocationSelect={setSelectedLocation} />
        {selectedLocation && (
          <div className="selected-location">
            Selected: {selectedLocation.name}
          </div>
        )}
      </div>

      <div className="form-group">
        <label>Trigger Radius: {radius}m</label>
        <input
          type="range"
          min="50"
          max="500"
          step="50"
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value))}
        />
      </div>

      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={repeatTrigger}
            onChange={(e) => setRepeatTrigger(e.target.checked)}
          />
          Repeat this reminder (trigger every time I visit)
        </label>
      </div>

      <button type="submit" disabled={loading || !title || !selectedLocation}>
        {loading ? 'Creating...' : 'Create Reminder'}
      </button>
    </form>
  );
};
```

#### Background Location Tracking (React Native)

```typescript
// For React Native mobile app
import BackgroundGeolocation from 'react-native-background-geolocation';

export const setupLocationTracking = async (token: string) => {
  // Configure background location
  await BackgroundGeolocation.ready({
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 50, // Minimum distance (meters) before update
    stopOnTerminate: false,
    startOnBoot: true,
    debug: false,
    logLevel: BackgroundGeolocation.LOG_LEVEL_OFF,
  });

  // Listen for location updates
  BackgroundGeolocation.onLocation(async (location) => {
    try {
      const response = await fetch('https://api.yourapp.com/api/reminders/location/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy
        })
      });

      const data = await response.json();

      if (data.data?.triggeredReminders?.length > 0) {
        // Show local notification for each triggered reminder
        for (const reminder of data.data.triggeredReminders) {
          showLocalNotification({
            title: '📍 Location Reminder',
            body: reminder.title,
            data: { reminderId: reminder._id }
          });
        }
      }
    } catch (error) {
      console.error('Error checking location:', error);
    }
  });

  // Start tracking
  await BackgroundGeolocation.start();
};
```

---

## 6. Environment Variables

### Server-Side Environment Variables

Add the following to your backend `.env` file:

```env
# Encryption key for storing API keys securely (REQUIRED - must be exactly 32 characters)
AI_KEYS_ENCRYPTION_SECRET=your-32-character-encryption-key!

# Optional: Fallback API keys (for development/testing only)
# In production, each firm provides their own API keys through the Settings UI
# ANTHROPIC_API_KEY=sk-ant-your-key-here
# OPENAI_API_KEY=sk-your-openai-key-here
```

### How API Keys Work

**User-Provided Keys (Production):**
- Each law firm configures their own API keys in Settings > AI Services
- API keys are encrypted at rest using AES-256-GCM
- Each firm's usage is tracked separately
- Features are automatically enabled when required keys are configured

**Fallback Keys (Development Only):**
- If no firm-specific key is configured, the system falls back to environment variables
- This is useful for development and testing
- In production, firms should always use their own keys

### Getting API Keys

| Provider | URL | What You Need |
|----------|-----|---------------|
| **Anthropic** | https://console.anthropic.com/settings/keys | Claude API key (starts with `sk-ant-`) |
| **OpenAI** | https://platform.openai.com/api-keys | OpenAI API key (starts with `sk-`) |
| **Google Cloud** | https://console.cloud.google.com/apis/credentials | API key with Speech-to-Text API enabled |

---

## 7. Dependencies

Ensure the following npm packages are installed:

```bash
npm install chrono-node @anthropic-ai/sdk form-data
```

**Package versions in use:**
- `chrono-node@2.9.0` - Natural language date/time parsing
- `@anthropic-ai/sdk@0.71.2` - Claude AI integration for NLP
- `form-data` - Multipart form data for audio uploads

---

## Summary of Features

| Feature | Endpoint Prefix | Key Capabilities | Required API Keys |
|---------|-----------------|------------------|-------------------|
| **AI Settings** | `/api/settings/ai/` | API key management, feature toggles, usage tracking | None |
| **NLP** | `/api/tasks/parse`, `/api/reminders/parse`, `/api/events/parse` | Natural language to structured data, date/time parsing, priority extraction, recurring patterns | Anthropic |
| **Smart Scheduling** | `/api/smart-scheduling/` | Productivity patterns, best time suggestions, duration prediction, workload analysis, smart nudges, auto-scheduling | None |
| **Voice-to-Task** | `/api/voice-to-task/` | Audio transcription (Whisper), multi-language support, batch processing, auto task creation | OpenAI + Anthropic |
| **Location Reminders** | `/api/reminders/location/` | Saved locations, geofencing, arrive/leave triggers, mobile polling | None |

---

## Best Practices

1. **Error Handling**: Always handle API errors gracefully and show user-friendly messages
2. **Loading States**: Show loading indicators for all async operations
3. **Feature Gating**: Check feature availability before showing AI-powered UI elements
4. **API Key Setup**: Guide users to the AI Settings page when features aren't available
5. **Offline Support**: Cache NLP results locally for offline task creation
6. **Permission Requests**: Request microphone/location permissions with clear explanations
7. **Confidence Scores**: Display confidence scores to users so they can verify parsed data
8. **Localization**: Support RTL layout for Arabic content
9. **Accessibility**: Ensure voice features have text alternatives
10. **Usage Monitoring**: Show users their API usage to help them manage costs

---

## 8. AI Chat Popup (Claude & GPT)

### Overview

A chat popup feature that allows users to chat with Claude (Anthropic) or GPT (OpenAI). Users can ask questions, get help with legal tasks, and have conversations that are saved for future reference.

### Features

- **Multi-Provider Support**: Choose between Claude and GPT
- **Conversation History**: All chats are saved and can be retrieved
- **Streaming Responses**: Real-time response streaming via SSE
- **Auto-Titles**: Conversations automatically get descriptive titles
- **Context-Aware**: AI understands legal/law firm context

### API Endpoints

#### Get Available Providers

Check which AI providers are configured for the firm.

```http
GET /api/chat/providers
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "anthropic": true,
    "openai": false,
    "count": 1
  }
}
```

#### Send Message

Send a message and get a response.

```http
POST /api/chat
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "What are the key elements of a valid contract?",
  "conversationId": "optional-uuid-for-existing-conversation",
  "provider": "anthropic",
  "model": "claude-3-5-sonnet-20241022"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "A valid contract typically requires these key elements...",
    "conversationId": "550e8400-e29b-41d4-a716-446655440000",
    "tokens": {
      "input": 25,
      "output": 150,
      "total": 175
    },
    "model": "claude-3-5-sonnet-20241022"
  }
}
```

#### Stream Message (SSE)

Send a message with streaming response.

```http
POST /api/chat/stream
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "Explain the discovery process in civil litigation",
  "conversationId": "optional-uuid",
  "provider": "anthropic"
}
```

**SSE Response Events:**
```
event: chunk
data: {"content": "The discovery process"}

event: chunk
data: {"content": " is a pre-trial procedure..."}

event: complete
data: {"conversationId": "uuid", "tokens": {"total": 200}}
```

#### Get Conversations List

```http
GET /api/chat/conversations?page=1&limit=20&status=active
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "_id": "...",
        "conversationId": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Contract law elements discussion",
        "provider": "anthropic",
        "lastMessage": "A valid contract typically requires...",
        "lastMessageAt": "2025-12-10T10:30:00.000Z",
        "messageCount": 5,
        "totalTokens": 850
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "pages": 1
    }
  }
}
```

#### Get Single Conversation

```http
GET /api/chat/conversations/:conversationId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Contract law elements discussion",
    "provider": "anthropic",
    "messages": [
      {
        "role": "user",
        "content": "What are the key elements of a valid contract?",
        "timestamp": "2025-12-10T10:25:00.000Z"
      },
      {
        "role": "assistant",
        "content": "A valid contract typically requires...",
        "timestamp": "2025-12-10T10:25:05.000Z",
        "tokens": 150
      }
    ],
    "totalTokens": 175,
    "createdAt": "2025-12-10T10:25:00.000Z"
  }
}
```

#### Update Conversation Title

```http
PATCH /api/chat/conversations/:conversationId
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Contract Law Discussion"
}
```

#### Delete Conversation

```http
DELETE /api/chat/conversations/:conversationId
Authorization: Bearer <token>
```

---

### Frontend Implementation

#### Chat Popup Component

```tsx
import React, { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatPopup: React.FC<ChatPopupProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [provider, setProvider] = useState<'anthropic' | 'openai'>('anthropic');
  const [providers, setProviders] = useState({ anthropic: false, openai: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check available providers on mount
    fetchProviders();
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/chat/providers', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setProviders(data.data);
        // Set default provider to first available
        if (data.data.anthropic) setProvider('anthropic');
        else if (data.data.openai) setProvider('openai');
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          provider
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.data.response
        }]);
        setConversationId(data.data.conversationId);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.message}`
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, an error occurred. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessageWithStreaming = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Add empty assistant message that will be filled
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          provider
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.content) {
                // Append content to last message
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === 'assistant') {
                    lastMsg.content += data.content;
                  }
                  return updated;
                });
              }

              if (data.conversationId) {
                setConversationId(data.conversationId);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg.role === 'assistant' && !lastMsg.content) {
          lastMsg.content = 'Sorry, an error occurred. Please try again.';
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  if (!isOpen) return null;

  const hasProviders = providers.anthropic || providers.openai;

  return (
    <div className="chat-popup-overlay">
      <div className="chat-popup">
        <div className="chat-header">
          <h3>AI Assistant</h3>
          <div className="chat-controls">
            {hasProviders && (
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'anthropic' | 'openai')}
                disabled={loading}
              >
                {providers.anthropic && <option value="anthropic">Claude</option>}
                {providers.openai && <option value="openai">GPT-4</option>}
              </select>
            )}
            <button onClick={startNewConversation} title="New conversation">
              +
            </button>
            <button onClick={onClose} title="Close">
              ×
            </button>
          </div>
        </div>

        {!hasProviders ? (
          <div className="chat-no-providers">
            <p>AI Chat is not configured.</p>
            <a href="/settings/ai">Configure API keys to enable</a>
          </div>
        ) : (
          <>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <p>Hello! I'm your AI assistant. How can I help you today?</p>
                  <p className="chat-hint">
                    Ask me about legal tasks, case management, scheduling, or anything else.
                  </p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                </div>
              ))}
              {loading && (
                <div className="chat-message assistant">
                  <div className="message-content typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessageWithStreaming()}
                placeholder="Type your message..."
                disabled={loading}
              />
              <button
                onClick={sendMessageWithStreaming}
                disabled={loading || !input.trim()}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

#### Chat Popup Styles (CSS)

```css
.chat-popup-overlay {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.chat-popup {
  width: 380px;
  height: 550px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

.chat-header h3 {
  margin: 0;
  font-size: 16px;
}

.chat-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.chat-controls select {
  padding: 4px 8px;
  border-radius: 4px;
  border: none;
  font-size: 12px;
}

.chat-controls button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  font-size: 16px;
}

.chat-controls button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-welcome {
  text-align: center;
  color: #666;
  padding: 20px;
}

.chat-hint {
  font-size: 13px;
  color: #999;
  margin-top: 8px;
}

.chat-message {
  max-width: 85%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.chat-message.user {
  align-self: flex-end;
  background: #6366f1;
  color: white;
  border-bottom-right-radius: 4px;
}

.chat-message.assistant {
  align-self: flex-start;
  background: #f1f3f4;
  color: #333;
  border-bottom-left-radius: 4px;
}

.typing span {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin: 0 2px;
  background: #999;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing span:nth-child(2) { animation-delay: 0.2s; }
.typing span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.6; }
  40% { transform: scale(1); opacity: 1; }
}

.chat-input-area {
  display: flex;
  padding: 12px;
  border-top: 1px solid #eee;
  gap: 8px;
}

.chat-input-area input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.chat-input-area input:focus {
  border-color: #6366f1;
}

.chat-input-area button {
  padding: 10px 20px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 500;
}

.chat-input-area button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-no-providers {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  color: #666;
}

.chat-no-providers a {
  color: #6366f1;
  margin-top: 8px;
}

/* RTL Support for Arabic */
[dir="rtl"] .chat-message.user {
  align-self: flex-start;
  border-bottom-right-radius: 12px;
  border-bottom-left-radius: 4px;
}

[dir="rtl"] .chat-message.assistant {
  align-self: flex-end;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 4px;
}
```

#### Chat Button (Floating Action Button)

```tsx
import React, { useState } from 'react';
import { ChatPopup } from './ChatPopup';

export const ChatButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className="chat-fab"
        onClick={() => setIsOpen(true)}
        title="Chat with AI Assistant"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM8 14H16V16H8V14ZM8 11H16V13H8V11ZM8 8H16V10H8V8Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <ChatPopup isOpen={isOpen} onClose={() => setIsOpen(false)} />

      <style>{`
        .chat-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          z-index: 999;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .chat-fab:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }
      `}</style>
    </>
  );
};
```

#### Conversation History Hook

```tsx
import { useState, useEffect } from 'react';

interface Conversation {
  conversationId: string;
  title: string;
  provider: 'anthropic' | 'openai';
  lastMessage: string;
  lastMessageAt: string;
  messageCount: number;
}

export const useChatHistory = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchConversations = async (pageNum: number = 1) => {
    try {
      const response = await fetch(
        `/api/chat/conversations?page=${pageNum}&limit=20`,
        { headers: { 'Authorization': `Bearer ${getToken()}` } }
      );
      const data = await response.json();

      if (data.success) {
        if (pageNum === 1) {
          setConversations(data.data.conversations);
        } else {
          setConversations(prev => [...prev, ...data.data.conversations]);
        }
        setHasMore(pageNum < data.data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      setPage(p => p + 1);
      fetchConversations(page + 1);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      setConversations(prev =>
        prev.filter(c => c.conversationId !== conversationId)
      );
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  return {
    conversations,
    loading,
    hasMore,
    loadMore,
    deleteConversation,
    refresh: () => fetchConversations(1)
  };
};
```

---

### Models

| Model | Provider | Best For |
|-------|----------|----------|
| `claude-3-5-sonnet-20241022` | Anthropic | General chat, complex reasoning |
| `claude-3-haiku-20240307` | Anthropic | Fast responses, simple tasks |
| `gpt-4o` | OpenAI | General chat, coding |
| `gpt-4o-mini` | OpenAI | Fast responses, cost-effective |

---

### Error Handling

| Error Code | Description | User Message |
|------------|-------------|--------------|
| 400 | Missing message | "Please enter a message" |
| 401 | Not authenticated | "Please log in to use chat" |
| 403 | Provider not configured | "AI chat is not configured. Ask your admin to set up API keys." |
| 429 | Rate limited | "Too many requests. Please wait a moment." |
| 500 | Server error | "Something went wrong. Please try again." |
