# Data Quality Features Analysis

## 1. Deduplication

### Algorithms

#### Levenshtein Distance
- Edit distance calculation
- O(m*n) complexity
- Best for: General string comparison
- Threshold: 0.85-0.95

#### Jaro-Winkler
- Prefix weighting
- Match distance and transpositions
- Best for: Names, addresses
- Threshold: 0.88-0.95

### Blocking Strategies
1. **Standard Blocking**: Email domain, phone prefix
2. **Multi-Field Blocking**: Composite keys
3. **Sorted Neighborhood**: Window-based
4. **Canopy Clustering**: Two-stage matching

### Merge Rules
1. First Valid Value
2. Most Complete Record
3. Weighted Priority
4. Most Recent
5. Consensus/Mode
6. Quality Score-based

### Golden Record Creation
```javascript
goldenRecord: {
  masterRecordId: UUID,
  sourceRecords: [ObjectId],
  mergedAt: Date,
  mergedBy: ObjectId,
  fieldSources: {
    email: { value: String, source: ObjectId, confidence: Number },
    phone: { value: String, source: ObjectId, confidence: Number }
    // ... for each field
  },
  mergeHistory: [{
    action: String,
    timestamp: Date,
    user: ObjectId,
    details: Object
  }]
}
```

## 2. Enrichment Connectors

### Clearbit
- Company data by domain
- Person data by email
- 100+ attributes
- Real-time and batch APIs

#### Data Points
- Company: Domain, industry, size, tech stack, social
- Person: Name, title, seniority, social profiles

### ZoomInfo
- 500M+ contacts
- 100M+ companies
- Intent signals
- Company hierarchy

#### Data Points
- Contact: Email, phone, title, department
- Company: Revenue, employees, tech stack, hierarchy

### Implementation Pattern
```javascript
enrichmentService: {
  async enrichContact(contact) {
    // Try Clearbit first
    let data = await clearbit.enrich(contact.email);
    if (!data || data.confidence < 0.7) {
      // Fallback to ZoomInfo
      data = await zoominfo.enrich(contact.email);
    }
    // Merge with existing data
    return this.mergeEnrichment(contact, data);
  }
}
```

## 3. Validation on Ingest

### Pipeline
```
Input → Schema Validation → Format Validation →
Business Rules → Duplicate Check → Quality Score → Accept/Reject
```

### Validation Types
1. **Schema**: Required fields, types
2. **Format**: Email, phone, national ID
3. **Business**: Duplicate check, firm rules
4. **Quality**: Completeness scoring

### Quality Score
```javascript
qualityScore = {
  completeness: (filledFields / totalFields),
  validity: (validFields / totalFields),
  uniqueness: (isUnique ? 1 : 0),
  enrichment: (enrichedFields / enrichableFields)
}
```

## 4. Audit Trails

### Components
```javascript
auditLog: {
  operation: String, // create, update, delete, merge, enrich
  model: String,
  recordId: ObjectId,
  user: ObjectId,
  timestamp: Date,
  changes: {
    before: Object,
    after: Object,
    diff: Object
  },
  metadata: {
    ip: String,
    userAgent: String,
    source: String
  },
  compliance: {
    gdpr: Boolean,
    ccpa: Boolean,
    retention: Date
  }
}
```

### Retention
- TTL indexes for auto-cleanup
- Archive to cold storage
- Compliance tagging

---

## Traf3li Current State

### ✅ Implemented
- Audit log service (comprehensive)
- Case-specific audit logging
- Email/phone validation
- National ID validation (Saudi)
- TTL indexes for retention

### ⚠️ Partial
- Basic duplicate detection
- Validation rules (schema-level)
- Quality scoring (implicit)

### ❌ Missing
- Fuzzy matching deduplication
- Clearbit/ZoomInfo integration
- Data enrichment service
- Golden record management
- Merge UI workflow
- Data quality dashboard
- Enrichment cost tracking

---

## Recommendations

### Priority 1: Fuzzy Matching Service
```javascript
class DeduplicationService {
  // Jaro-Winkler implementation
  jaroWinkler(s1, s2) {
    const jaro = this.jaroSimilarity(s1, s2);
    const prefix = this.commonPrefix(s1, s2, 4);
    return jaro + (prefix * 0.1 * (1 - jaro));
  }

  async findDuplicates(contact, threshold = 0.88) {
    // Blocking: Same email domain or phone prefix
    const candidates = await this.getCandidates(contact);

    // Score each candidate
    const scored = candidates.map(c => ({
      ...c,
      score: this.calculateMatchScore(contact, c)
    }));

    return scored.filter(c => c.score >= threshold);
  }
}
```

### Priority 2: Enrichment Service
```javascript
class EnrichmentService {
  constructor() {
    this.clearbit = new ClearbitClient(config.clearbit);
    this.zoominfo = new ZoomInfoClient(config.zoominfo);
  }

  async enrich(entity, type) {
    const sources = this.getSourcesForType(type);
    let enrichedData = {};

    for (const source of sources) {
      try {
        const data = await source.enrich(entity);
        enrichedData = this.mergeWithPriority(enrichedData, data);
      } catch (err) {
        this.logEnrichmentError(source, entity, err);
      }
    }

    await this.auditEnrichment(entity, enrichedData);
    return enrichedData;
  }
}
```

### Priority 3: Data Quality Dashboard
```javascript
// Metrics to track
const dataQualityMetrics = {
  completeness: {
    query: 'Average field fill rate',
    threshold: 0.8
  },
  duplicateRate: {
    query: 'Potential duplicates / total records',
    threshold: 0.05
  },
  enrichmentCoverage: {
    query: 'Enriched records / total records',
    threshold: 0.7
  },
  validationErrors: {
    query: 'Failed validations this period',
    trend: 'decreasing'
  }
};
```

### Priority 4: Merge Workflow
```javascript
// Merge approval workflow
const mergeWorkflow = {
  trigger: 'duplicate_detected',
  steps: [
    { action: 'create_merge_request', auto: true },
    { action: 'assign_reviewer', rule: 'data_steward' },
    { action: 'review_merge', manual: true },
    { action: 'execute_merge', requires: 'approval' },
    { action: 'update_references', auto: true },
    { action: 'archive_duplicates', auto: true },
    { action: 'notify_stakeholders', auto: true }
  ]
};
```
