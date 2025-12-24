# Forecasting & Pipeline Hygiene Patterns

## 1. Forecast Categories

### Standard Categories
| Category | Description | Confidence |
|----------|-------------|------------|
| Pipeline | Early stage, developing | 10-25% |
| Best Case | Good momentum | 50-75% |
| Commit | High confidence | 75-95% |
| Closed Won | Deal completed | 100% |
| Omitted | Excluded from forecast | N/A |

### Implementation
```javascript
// Deal schema addition
forecastCategory: {
  type: String,
  enum: ['pipeline', 'best_case', 'commit', 'closed_won', 'omitted'],
  default: 'pipeline'
}

// Auto-calculation based on stage
preSave: function() {
  if (this.stage.probability < 25) this.forecastCategory = 'pipeline';
  else if (this.stage.probability < 75) this.forecastCategory = 'best_case';
  else if (this.stage.probability < 100) this.forecastCategory = 'commit';
  else this.forecastCategory = 'closed_won';
}
```

## 2. Deal Health Scoring

### Multi-Dimension Model
```javascript
healthScore = {
  demographic: 0.25,  // Case fit, value, location
  bant: 0.30,         // Budget, Authority, Need, Timeline
  behavioral: 0.30,   // Engagement, responsiveness
  engagement: 0.15    // Recency, frequency, depth
}
```

### Health Grades
- A (90-100): Excellent
- B (75-89): Good
- C (60-74): Fair
- D (40-59): At-risk
- F (0-39): Critical

### Sales Priority Tiers
| Tier | Score | SLA |
|------|-------|-----|
| P1_HOT | 90+ | 4 hours |
| P2_WARM | 70-89 | 24 hours |
| P3_COOL | 50-69 | 48 hours |
| P4_NURTURE | <50 | 7 days |

## 3. Stuck Deal Detection

### Signals
1. Days in current stage exceeding threshold
2. No activity in last N days
3. Declining engagement velocity
4. Incomplete stage requirements
5. Close date pushed repeatedly

### Detection Logic
```javascript
isStuck: function() {
  const daysInStage = daysSince(this.stageChangedAt);
  const threshold = this.stage.maxDays || 30;
  return daysInStage > threshold && !this.recentActivity;
}
```

### Nudge System
- Automated reminders to rep
- Manager escalation after N days
- Suggested next actions
- Meeting scheduling prompts

## 4. AI Predictions

### Current Implementation (Traf3li)
- Neural network: [32, 16, 8] hidden layers
- 15 input features
- Synaptic.js framework
- Isotonic regression calibration

### Prediction Types
1. Win probability
2. Expected close date
3. Deal amount adjustment
4. Churn risk (for customers)

### Feature Engineering
- Behavioral signals
- BANT interaction scores
- Temporal patterns
- Source quality metrics

---

## Traf3li Current State

### ✅ Implemented
- ML Lead Scoring (synaptic)
- Pipeline stages with probability
- Customer health scoring
- Churn prediction
- BANT scoring

### ⚠️ Partial
- Forecast categories (not explicit)
- Deal health (lead-focused)
- Stuck detection (basic)

### ❌ Missing
- Explicit forecastCategory field
- Deal health score (vs lead score)
- Stuck deal automation
- Next-step nudges
- Forecast rollup dashboard
- Win/loss analysis automation

---

## Recommendations

### Priority 1: Forecast Categories
Add explicit forecastCategory to deals:
```javascript
// Add to opportunity/deal model
forecastCategory: {
  type: String,
  enum: ['pipeline', 'best_case', 'commit', 'closed_won', 'omitted'],
  autoCalculated: Boolean,
  overriddenBy: ObjectId,
  overriddenAt: Date
}
```

### Priority 2: Deal Health Score
Extend lead scoring to deals:
```javascript
dealHealthService.calculateScore(deal) {
  // Activity recency (30%)
  // Engagement velocity (25%)
  // Stage progression (20%)
  // Stakeholder coverage (15%)
  // Next steps defined (10%)
}
```

### Priority 3: Stuck Deal Automation
```javascript
// Cron job: Check for stuck deals
async function detectStuckDeals() {
  const stuckDeals = await Deal.find({
    status: 'open',
    stageChangedAt: { $lt: thresholdDate },
    'lastActivity.date': { $lt: activityThreshold }
  });

  for (const deal of stuckDeals) {
    await createNudge(deal);
    await notifyRep(deal);
  }
}
```

### Priority 4: Forecast Dashboard
- Weighted pipeline by category
- Commit vs Best Case vs Pipeline
- Week-over-week changes
- Rep and team rollups
- AI prediction confidence
