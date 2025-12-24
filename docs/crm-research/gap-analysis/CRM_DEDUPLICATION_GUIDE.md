# CRM Deduplication: Comprehensive Guide

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Fuzzy Matching Algorithms](#fuzzy-matching-algorithms)
3. [Blocking Strategies](#blocking-strategies)
4. [Merge Rules](#merge-rules)
5. [Golden Record Creation](#golden-record-creation)
6. [Implementation Architecture](#implementation-architecture)
7. [Best Practices](#best-practices)
8. [Performance Considerations](#performance-considerations)

---

## Executive Summary

CRM deduplication is a critical process for maintaining data quality. A typical CRM contains 10-30% duplicate records (Gartner). Effective deduplication requires:

- **Fuzzy matching**: Identify records that are similar but not identical
- **Blocking strategies**: Reduce computational complexity by pre-filtering candidates
- **Merge rules**: Define how duplicate records are combined
- **Golden records**: Create a single source of truth from multiple records

---

## Fuzzy Matching Algorithms

### 1. Levenshtein Distance

**Definition**: Measures the minimum number of single-character edits (insertions, deletions, substitutions) required to transform one string into another.

**Formula**:
```
lev(a, b) = max(|a|, |b|)  if min(|a|, |b|) = 0
lev(a, b) = lev(a[1:], b[1:])  if a[0] = b[0]
lev(a, b) = 1 + min(
    lev(a[1:], b),      # deletion
    lev(a, b[1:]),      # insertion
    lev(a[1:], b[1:])   # substitution
)
```

**Example**:
```
"John Smith" → "Jon Smith"  = 1 edit (delete 'h')
"Alice Johnson" → "Alicia Johnson" = 2 edits (insert 'c', insert 'a')
```

**Advantages**:
- Simple to understand and implement
- Language-independent
- Handles typos well
- Deterministic results

**Disadvantages**:
- Order-sensitive (treats "Smith John" vs "John Smith" as very different)
- No context awareness
- Computationally expensive for large strings O(m*n)
- Gives equal weight to all character positions

**Use Cases**:
- Individual name matching
- Email validation (fuzzy)
- Company name comparison
- Address component matching

**Similarity Score**:
```
similarity = 1 - (levenshtein_distance / max_length)
Threshold: 0.85-0.95 (85-95% similarity)
```

**Implementation Example**:
```javascript
function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function levenshteinSimilarity(a, b) {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  return 1 - (distance / maxLength);
}

// Usage
const similarity = levenshteinSimilarity("John Smith", "Jon Smith");
console.log(similarity); // 0.909
```

---

### 2. Jaro-Winkler Similarity

**Definition**: A variant of the Jaro metric that gives more weight to matching characters at the beginning of strings. Widely used in record linkage and duplicate detection.

**Jaro Formula**:
```
jaro = (1/3) * (matches/|a| + matches/|b| + (matches - transpositions)/matches)

Where:
- matches = characters that match within a maximum distance of floor(max(|a|, |b|)/2) - 1
- transpositions = matched characters in different order / 2
```

**Jaro-Winkler Formula**:
```
jaro_winkler = jaro + (prefix_length * 0.1 * (1 - jaro))

Where:
- prefix_length = length of common prefix up to 4 characters
- 0.1 = scaling factor (can be tuned, typically 0.1)
```

**Example**:
```
"John Smith" vs "Jon Smith"
- Match distance = max(10,9)/2 - 1 = 4
- Matching characters: 'o','h','n',' ','S','m','i','t','h' = 9 matches
- No transpositions
- Jaro = (1/3) * (9/10 + 9/9 + 9/9) = 0.9667
- Common prefix "Jon" = 3 chars
- Jaro-Winkler = 0.9667 + (3 * 0.1 * 0.0333) = 0.9727
```

**Advantages**:
- More accurate than Levenshtein for phonetic similarities
- Prefix weighting helps catch naming errors
- Better for names and addresses
- More forgiving of transpositions (swapped characters)
- Computationally more efficient than Levenshtein

**Disadvantages**:
- More complex to implement and understand
- Fixed prefix weighting (4 characters max)
- Not ideal for very long strings
- Scaling factor (0.1) may need tuning

**Use Cases**:
- Name matching (primary choice)
- Address matching
- Company name matching
- Email fuzzy matching

**Similarity Score**:
```
Threshold: 0.88-0.95 (88-95% similarity)
Typical thresholds:
- > 0.95: Definitely a match
- 0.88-0.95: Likely a match (review recommended)
- < 0.88: Different records
```

**Implementation Example**:
```javascript
function jaroWinklerSimilarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();

  if (a === b) return 1.0;

  const aLen = a.length;
  const bLen = b.length;

  if (aLen === 0 || bLen === 0) return 0;

  // Maximum allowed distance
  const matchDistance = Math.floor(Math.max(aLen, bLen) / 2) - 1;
  if (matchDistance < 0) return 0;

  const aMatches = new Array(aLen).fill(false);
  const bMatches = new Array(bLen).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < aLen; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, bLen);

    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < aLen; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  // Jaro similarity
  const jaro = (matches / aLen + matches / bLen + (matches - transpositions / 2) / matches) / 3;

  // Jaro-Winkler similarity
  let prefixLen = 0;
  for (let i = 0; i < Math.min(aLen, bLen, 4); i++) {
    if (a[i] === b[i]) prefixLen++;
    else break;
  }

  return jaro + (prefixLen * 0.1 * (1 - jaro));
}

// Usage
const similarity = jaroWinklerSimilarity("John Smith", "Jon Smith");
console.log(similarity); // ~0.97
```

---

### 3. Algorithm Comparison Matrix

| Aspect | Levenshtein | Jaro-Winkler |
|--------|-------------|--------------|
| **Complexity** | O(m*n) | O(m*n) but faster in practice |
| **Name Matching** | Moderate | Excellent |
| **Typo Detection** | Good | Excellent |
| **Transposition Handling** | Poor | Excellent |
| **Phonetic Sensitivity** | Low | Medium |
| **Threshold** | 0.85-0.95 | 0.88-0.95 |
| **Industry Standard** | Record linkage | Names, addresses |
| **Learning Curve** | Easy | Medium |

### 4. Additional Matching Strategies

**Phonetic Matching (Soundex, Metaphone)**:
```
Soundex for "Smith": S530
Soundex for "Smyth": S530
- Same phonetic code = potential match
```

**Token-based Matching**:
```
"John Smith" → tokens: ["John", "Smith"]
"Smith John" → tokens: ["Smith", "John"]
- Same tokens, different order = match
```

**Cosine Similarity** (for longer text):
```
Convert strings to TF-IDF vectors and calculate cosine similarity
- Good for multi-word comparisons
- Computationally expensive
```

---

## Blocking Strategies

Blocking is essential to reduce computational complexity. Without blocking, comparing N records requires N² comparisons. With millions of records, this becomes infeasible.

### 1. Standard Blocking

**Concept**: Partition records into blocks where only records within the same block are compared.

**Blocking Key**: A subset of fields used to group records

**Example: Email Domain Blocking**
```javascript
// Rule: Group by email domain
function emailBlockingKey(contact) {
  const email = contact.email;
  const domain = email.split('@')[1];
  return domain; // gmail.com, company.com, etc.
}

// Only compare records with the same domain
const blocks = {
  'gmail.com': [contact1, contact2, contact3],
  'company.com': [contact4, contact5],
  'yahoo.com': [contact6]
};
```

**Advantages**:
- Simple to implement
- Fast execution
- Predictable performance

**Disadvantages**:
- May miss matches across blocks
- Requires careful key selection
- Fixed partition strategy

---

### 2. Multi-Field Blocking

**Concept**: Use multiple fields to create more granular blocks

**Example: Email + Phone Blocking**
```javascript
function multiFieldBlockingKey(contact) {
  const emailDomain = contact.email?.split('@')[1] || '';
  const phonePrefix = contact.phone?.substring(0, 3) || '';
  return `${emailDomain}:${phonePrefix}`;
}

// Blocks like: gmail.com:555, company.com:212, etc.
```

---

### 3. Sorted Neighborhood Method (SNM)

**Concept**: Sort records by a blocking key, then compare only adjacent records within a window.

**Algorithm**:
```
1. Sort all records by blocking key
2. For each record, compare with next W records (window size)
3. Incrementally slide window through sorted list
```

**Example**:
```javascript
function sortedNeighborhoodBlocking(contacts, blockingKey, windowSize = 10) {
  // Step 1: Sort by blocking key
  const sorted = contacts.sort((a, b) =>
    blockingKey(a).localeCompare(blockingKey(b))
  );

  // Step 2: Compare neighbors
  const candidates = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < Math.min(i + windowSize, sorted.length); j++) {
      candidates.push([sorted[i], sorted[j]]);
    }
  }

  return candidates;
}

// Usage
const blockingKey = (contact) => contact.lastName + contact.firstName;
const candidatePairs = sortedNeighborhoodBlocking(contacts, blockingKey, 15);
```

**Advantages**:
- Catches matches near the sort key
- Configurable window size
- Better than simple blocking

**Disadvantages**:
- May miss matches far from sort key
- Sort time adds overhead
- Window size tuning critical

---

### 4. Canopy Clustering

**Concept**: Use a fast approximate metric to create canopies (loose clusters), then apply expensive matching within canopies.

**Algorithm**:
```
1. Use fast, cheap metric (e.g., token overlap, substring match)
2. Group records into overlapping "canopies"
3. Apply expensive fuzzy matching only within canopies
```

**Example**:
```javascript
function canopyBlocking(contacts) {
  const canopies = [];
  const processed = new Set();

  // Use token-based loose matching as metric
  function tokenOverlap(a, b) {
    const tokensA = new Set((a.name + ' ' + a.email).toLowerCase().split(/\s+/));
    const tokensB = new Set((b.name + ' ' + b.email).toLowerCase().split(/\s+/));

    const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
    return intersection / Math.max(tokensA.size, tokensB.size);
  }

  for (const contact of contacts) {
    if (processed.has(contact.id)) continue;

    // Create new canopy
    const canopy = [contact];
    processed.add(contact.id);

    // Add loosely matching records
    for (const other of contacts) {
      if (!processed.has(other.id) && tokenOverlap(contact, other) > 0.4) {
        canopy.push(other);
      }
    }

    canopies.push(canopy);
  }

  return canopies;
}
```

**Advantages**:
- Handles complex matching requirements
- Reduces expensive comparisons
- Overlapping canopies catch edge cases
- Scalable approach

**Disadvantages**:
- More complex to implement
- Requires two-stage process
- Parameter tuning needed

---

### 5. Blocking Strategy Selection Matrix

| Strategy | Speed | Accuracy | Complexity | Best For |
|----------|-------|----------|-----------|----------|
| **Standard Blocking** | Very Fast | Low-Medium | Low | Simple fields (domain, prefix) |
| **Multi-Field** | Fast | Medium | Low-Medium | Multiple filtering dimensions |
| **SNM** | Medium | Medium-High | Medium | Name-based matching |
| **Canopy** | Medium | High | High | Complex matching scenarios |

---

## Merge Rules

Merge rules define how duplicate records are combined into a single record.

### 1. Field-Level Merge Strategies

#### Strategy 1: First Valid Value
```javascript
function mergeFirstValid(records) {
  const merged = {};

  for (const field of getAllFields(records)) {
    for (const record of records) {
      if (record[field] && record[field].toString().trim()) {
        merged[field] = record[field];
        break;
      }
    }
  }

  return merged;
}

// Example
const records = [
  { name: 'John Smith', email: null, phone: '555-1234' },
  { name: null, email: 'john@example.com', phone: '555-5678' },
  { name: 'J Smith', email: null, phone: null }
];

const result = mergeFirstValid(records);
// Result: { name: 'John Smith', email: 'john@example.com', phone: '555-1234' }
```

**Pros**: Simple, fast, predictable
**Cons**: Loses information, doesn't handle conflicts

---

#### Strategy 2: Most Complete Record (Golden Record Base)
```javascript
function mergeUsingMostComplete(records) {
  // Find record with most non-null values
  const mostComplete = records.reduce((prev, curr) => {
    const prevCount = Object.values(prev).filter(v => v !== null && v !== '').length;
    const currCount = Object.values(curr).filter(v => v !== null && v !== '').length;
    return currCount > prevCount ? curr : prev;
  });

  // Use as base
  const merged = { ...mostComplete };

  // Fill in missing values from other records
  for (const record of records) {
    for (const [field, value] of Object.entries(record)) {
      if (!merged[field] || merged[field] === null) {
        merged[field] = value;
      }
    }
  }

  return merged;
}
```

**Pros**: Preserves most data, good for sparse records
**Cons**: Doesn't handle conflicting values well

---

#### Strategy 3: Weighted Field Priority
```javascript
const fieldPriority = {
  'email': { priority: 10, weight: 'verified' },
  'phone': { priority: 8, weight: 'verified' },
  'name': { priority: 6, weight: 'formal_name' },
  'address': { priority: 5, weight: 'recent' },
  'company': { priority: 4, weight: 'current' }
};

function mergeWithPriority(records, fieldPriority) {
  const merged = {};

  for (const [field, config] of Object.entries(fieldPriority)) {
    const candidates = records
      .filter(r => r[field])
      .sort((a, b) => {
        // Sort by priority (descending)
        const aScore = (a[`${field}_verified`] ? 100 : 0);
        const bScore = (b[`${field}_verified`] ? 100 : 0);
        return bScore - aScore;
      });

    if (candidates.length > 0) {
      merged[field] = candidates[0][field];
      merged[`${field}_source`] = candidates[0].id;
    }
  }

  return merged;
}

// Example
const records = [
  { id: 1, email: 'john@example.com', email_verified: true, name: 'John Smith' },
  { id: 2, email: 'j.smith@company.com', email_verified: false, name: 'J. Smith' }
];

const merged = mergeWithPriority(records, fieldPriority);
// Result: Uses verified email from record 1
```

**Pros**: Handles conflicts well, configurable
**Cons**: Requires priority configuration, complex logic

---

#### Strategy 4: Most Recent Value
```javascript
function mergeUsingMostRecent(records) {
  const merged = {};

  for (const field of getAllFields(records)) {
    let mostRecent = null;
    let mostRecentTimestamp = null;

    for (const record of records) {
      const value = record[field];
      const timestamp = record[`${field}_updated_at`] || record.updated_at;

      if (value && timestamp && (!mostRecentTimestamp || timestamp > mostRecentTimestamp)) {
        mostRecent = value;
        mostRecentTimestamp = timestamp;
      }
    }

    if (mostRecent) {
      merged[field] = mostRecent;
    }
  }

  return merged;
}
```

**Pros**: Always uses freshest data
**Cons**: Assumes timestamps are reliable

---

#### Strategy 5: Mode (Most Frequent Value)
```javascript
function mergeUsingMode(records) {
  const merged = {};

  for (const field of getAllFields(records)) {
    const valueFreq = {};

    for (const record of records) {
      const value = record[field];
      if (value && value.toString().trim()) {
        valueFreq[value] = (valueFreq[value] || 0) + 1;
      }
    }

    // Get most frequent
    const mode = Object.entries(valueFreq)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    if (mode) {
      merged[field] = mode;
    }
  }

  return merged;
}

// Example: 3 records have email 'john@example.com', 1 has 'john@company.com'
// Result: 'john@example.com' is selected
```

**Pros**: Consensus-based, good for survey data
**Cons**: Loses minority information

---

#### Strategy 6: Data Quality Score
```javascript
function calculateDataQuality(value) {
  let score = 0;

  if (!value || value.toString().trim() === '') return 0;

  const str = value.toString();

  // Length bonus
  if (str.length > 5) score += 20;

  // Verification bonus
  if (str.includes('@') && str.includes('.')) score += 30; // Looks like email

  // Format bonus
  if (/^\d{3}-\d{3}-\d{4}$/.test(str)) score += 25; // Formatted phone

  // Completeness bonus
  if (str.split(' ').length > 1) score += 20; // Multiple words

  return Math.min(score, 100);
}

function mergeUsingQualityScore(records) {
  const merged = {};

  for (const field of getAllFields(records)) {
    let bestValue = null;
    let bestScore = 0;

    for (const record of records) {
      const value = record[field];
      const score = calculateDataQuality(value);

      if (score > bestScore) {
        bestScore = score;
        bestValue = value;
      }
    }

    if (bestValue) {
      merged[field] = bestValue;
    }
  }

  return merged;
}
```

**Pros**: Objective quality assessment, extensible
**Cons**: Requires quality metrics definition

---

### 2. Record-Level Merge Strategies

#### Master Record Selection
```javascript
// Select one record as master, others as contributors
const master = selectMasterRecord(duplicates, {
  preference: 'most_recent', // or 'most_complete', 'highest_quality'
  tieBreaker: 'earliest_id' // alphabetical order if tied
});

function selectMasterRecord(records, options) {
  const scored = records.map(record => {
    let score = 0;

    // Recency score
    const daysOld = (Date.now() - new Date(record.created_at)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 100 - daysOld);

    // Completeness score
    const fieldCount = Object.values(record).filter(v => v !== null && v !== '').length;
    score += fieldCount * 5;

    // Verification score
    score += record.verified ? 50 : 0;

    return { record, score };
  });

  return scored.sort((a, b) => b.score - a.score)[0].record;
}
```

---

#### Hierarchical Merge
```javascript
function hierarchicalMerge(records) {
  // Determine hierarchy based on data source
  const sourceHierarchy = {
    'verified_database': 1,
    'direct_input': 2,
    'import': 3,
    'inference': 4
  };

  // Sort by hierarchy
  const sorted = records.sort((a, b) =>
    (sourceHierarchy[a.source] || 99) - (sourceHierarchy[b.source] || 99)
  );

  // Use highest hierarchy source as master
  const master = sorted[0];
  const contributors = sorted.slice(1);

  return {
    master_record_id: master.id,
    master_source: master.source,
    contributor_ids: contributors.map(c => c.id),
    merged_record: master
  };
}
```

---

### 3. Merge Conflict Resolution

```javascript
function resolveMergeConflict(field, values, strategy = 'priority') {
  switch (strategy) {
    case 'priority':
      return values[0]; // First wins

    case 'longest':
      return values.reduce((a, b) =>
        a && a.toString().length > b.toString().length ? a : b
      );

    case 'most_different':
      // Keep most descriptive value (more words, more info)
      return values.reduce((a, b) =>
        (a?.split(' ').length || 0) > (b?.split(' ').length || 0) ? a : b
      );

    case 'similarity_based':
      // Keep value most similar to others
      const scores = values.map(v => {
        return values.reduce((sum, other) => {
          return sum + jaroWinklerSimilarity(v, other);
        }, 0);
      });
      return values[scores.indexOf(Math.max(...scores))];

    case 'concatenate':
      return values.filter(v => v).join(' | ');

    case 'flag_for_review':
      return {
        value: values[0],
        conflict: true,
        alternatives: values.slice(1)
      };
  }
}
```

---

## Golden Record Creation

A golden record is the unified, authoritative representation of a single entity created by merging duplicates.

### 1. Golden Record Structure

```javascript
const goldenRecordSchema = {
  // Core identifiers
  golden_id: 'UUID', // Unique identifier for golden record
  source_record_ids: ['id1', 'id2', 'id3'], // Original record IDs

  // Data fields
  name: 'string',
  email: 'string',
  phone: 'string',
  address: 'object',
  company: 'string',

  // Metadata
  created_at: 'timestamp', // When golden record created
  updated_at: 'timestamp', // When last updated
  confidence_score: 0.95, // 0-1, confidence in merge

  // Source tracking
  field_sources: {
    name: { source_record_id: 'id1', verified: true },
    email: { source_record_id: 'id2', verified: false },
    phone: { source_record_id: 'id1', verified: true }
  },

  // Audit trail
  merge_history: [
    { merged_at: 'timestamp', source_ids: ['id1', 'id2'], action: 'merge' },
    { merged_at: 'timestamp', source_ids: ['id3'], action: 'add', reason: 'new_info' }
  ],

  // Quality metrics
  completeness_score: 0.87, // Percentage of non-null fields
  verification_score: 0.92, // Percentage of verified fields
  data_quality_score: 0.89, // Overall quality metric

  // Dispute tracking
  conflicts: [
    { field: 'phone', values: ['555-1234', '555-5678'], resolution: 'first_value' }
  ],

  // Relationships
  relationships: [
    { type: 'parent', golden_id: 'company_golden_id' },
    { type: 'contact_person', golden_id: 'contact_golden_id' }
  ]
};
```

---

### 2. Golden Record Creation Process

```javascript
class GoldenRecordCreator {
  constructor(db, config = {}) {
    this.db = db;
    this.config = {
      matchingThreshold: 0.90,
      mergeStrategy: 'quality_score',
      requireManualReview: config.requireManualReview || [],
      ...config
    };
  }

  async createGoldenRecords(duplicateGroups) {
    const goldenRecords = [];

    for (const group of duplicateGroups) {
      const goldenRecord = await this.createGoldenRecord(group);
      goldenRecords.push(goldenRecord);
    }

    return goldenRecords;
  }

  async createGoldenRecord(sourceRecordIds) {
    // Step 1: Fetch all source records
    const sourceRecords = await this.db.query(
      'SELECT * FROM contacts WHERE id IN (?)',
      [sourceRecordIds]
    );

    // Step 2: Validate records exist
    if (sourceRecords.length === 0) {
      throw new Error('No valid source records found');
    }

    // Step 3: Select master record
    const masterRecord = this.selectMasterRecord(sourceRecords);

    // Step 4: Merge data
    const mergedData = this.mergeRecords(sourceRecords, masterRecord);

    // Step 5: Calculate confidence and quality scores
    const scores = this.calculateScores(sourceRecords, mergedData);

    // Step 6: Track field sources
    const fieldSources = this.trackFieldSources(sourceRecords, mergedData);

    // Step 7: Create golden record
    const goldenRecord = {
      golden_id: this.generateGoldenId(),
      source_record_ids: sourceRecordIds,
      ...mergedData,
      created_at: new Date(),
      updated_at: new Date(),
      confidence_score: scores.confidence,
      field_sources: fieldSources,
      completeness_score: scores.completeness,
      verification_score: scores.verification,
      data_quality_score: scores.quality,
      merge_history: [{
        merged_at: new Date(),
        source_ids: sourceRecordIds,
        action: 'initial_merge',
        master_record: masterRecord.id
      }],
      conflicts: this.identifyConflicts(sourceRecords, mergedData)
    };

    // Step 8: Check if manual review required
    if (this.requiresManualReview(goldenRecord)) {
      goldenRecord.status = 'pending_review';
      goldenRecord.review_reason = this.getReviewReason(goldenRecord);
    } else {
      goldenRecord.status = 'active';
    }

    return goldenRecord;
  }

  selectMasterRecord(records) {
    // Score each record
    const scored = records.map(record => ({
      record,
      score: this.calculateRecordScore(record)
    }));

    // Return highest scored
    return scored.sort((a, b) => b.score - a.score)[0].record;
  }

  calculateRecordScore(record) {
    let score = 0;

    // Recency (0-30 points)
    const daysOld = (Date.now() - new Date(record.created_at)) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 30 - (daysOld / 365 * 30));

    // Completeness (0-30 points)
    const fields = Object.values(record).filter(v => v !== null && v !== '');
    score += (fields.length / Object.keys(record).length) * 30;

    // Verification (0-40 points)
    if (record.verified) score += 40;

    return score;
  }

  mergeRecords(sourceRecords, masterRecord) {
    const merged = { ...masterRecord };

    for (const record of sourceRecords) {
      for (const [field, value] of Object.entries(record)) {
        if (!merged[field] && value) {
          merged[field] = value;
        } else if (field.endsWith('_verified') && value) {
          // Prefer verified values
          merged[field.replace('_verified', '')] = record[field.replace('_verified', '')];
        }
      }
    }

    return merged;
  }

  calculateScores(sourceRecords, mergedData) {
    // Confidence: How sure are we this is a real duplicate?
    const avgSimilarity = this.calculateGroupSimilarity(sourceRecords);
    const confidence = Math.min(avgSimilarity, 1.0);

    // Completeness: What percentage of fields are filled?
    const filledFields = Object.values(mergedData)
      .filter(v => v !== null && v !== '').length;
    const completeness = filledFields / Object.keys(mergedData).length;

    // Verification: What percentage of fields are verified?
    const verifiedCount = Object.keys(mergedData)
      .filter(k => mergedData[`${k}_verified`]).length;
    const verification = verifiedCount / Object.keys(mergedData).length;

    // Quality: Composite score
    const quality = (confidence + completeness + verification) / 3;

    return { confidence, completeness, verification, quality };
  }

  calculateGroupSimilarity(records) {
    // Compare all pairs and average
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        totalSimilarity += this.compareRecords(records[i], records[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  compareRecords(record1, record2) {
    // Compare key fields
    const nameMatch = jaroWinklerSimilarity(
      record1.name || '',
      record2.name || ''
    );
    const emailMatch = this.emailSimilarity(record1.email, record2.email);
    const phoneMatch = this.phoneSimilarity(record1.phone, record2.phone);

    // Weighted average
    return (nameMatch * 0.5 + emailMatch * 0.3 + phoneMatch * 0.2);
  }

  trackFieldSources(sourceRecords, mergedData) {
    const fieldSources = {};

    for (const [field, value] of Object.entries(mergedData)) {
      if (!value || field.endsWith('_verified')) continue;

      // Find which source record this came from
      const source = sourceRecords.find(r => r[field] === value);

      if (source) {
        fieldSources[field] = {
          source_record_id: source.id,
          verified: source[`${field}_verified`] || false,
          from_master: source.id === mergedData._master_id
        };
      }
    }

    return fieldSources;
  }

  identifyConflicts(sourceRecords, mergedData) {
    const conflicts = [];

    // Check each field for conflicting values
    for (const field of Object.keys(mergedData)) {
      if (field.endsWith('_verified') || field.startsWith('_')) continue;

      const values = sourceRecords
        .map(r => r[field])
        .filter(v => v !== null && v !== '');

      // If multiple different values, it's a conflict
      const uniqueValues = [...new Set(values)];
      if (uniqueValues.length > 1) {
        conflicts.push({
          field,
          values: uniqueValues,
          resolution: 'used_first_value',
          selected_value: mergedData[field]
        });
      }
    }

    return conflicts;
  }

  requiresManualReview(goldenRecord) {
    // Review if confidence is low
    if (goldenRecord.confidence_score < 0.88) return true;

    // Review if many conflicts
    if (goldenRecord.conflicts.length > 3) return true;

    // Review for specific fields configured
    for (const field of this.config.requireManualReview) {
      if (goldenRecord.field_sources[field]?.verified === false) {
        return true;
      }
    }

    return false;
  }

  getReviewReason(goldenRecord) {
    const reasons = [];

    if (goldenRecord.confidence_score < 0.88) {
      reasons.push(`Low confidence score: ${goldenRecord.confidence_score.toFixed(2)}`);
    }

    if (goldenRecord.conflicts.length > 3) {
      reasons.push(`Multiple conflicting values: ${goldenRecord.conflicts.length}`);
    }

    return reasons.join(', ');
  }

  generateGoldenId() {
    return `golden_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  emailSimilarity(email1, email2) {
    if (!email1 || !email2) return email1 === email2 ? 1 : 0;
    return email1.toLowerCase() === email2.toLowerCase() ? 1 :
           jaroWinklerSimilarity(email1, email2);
  }

  phoneSimilarity(phone1, phone2) {
    if (!phone1 || !phone2) return phone1 === phone2 ? 1 : 0;

    // Normalize: remove non-digits
    const norm1 = phone1.replace(/\D/g, '');
    const norm2 = phone2.replace(/\D/g, '');

    return norm1 === norm2 ? 1 : jaroWinklerSimilarity(norm1, norm2);
  }
}
```

---

### 3. Golden Record Maintenance

```javascript
class GoldenRecordMaintenance {
  // Add new duplicate to existing golden record
  async addToDuplicateGroup(goldenId, newRecordId) {
    const goldenRecord = await this.db.query(
      'SELECT * FROM golden_records WHERE golden_id = ?',
      [goldenId]
    );

    const newRecord = await this.db.query(
      'SELECT * FROM contacts WHERE id = ?',
      [newRecordId]
    );

    // Re-merge with new record
    const updatedMerge = this.mergeRecords(
      [...goldenRecord.source_records, newRecord],
      goldenRecord
    );

    // Update golden record
    await this.db.query(
      `UPDATE golden_records
       SET source_record_ids = ?,
           updated_at = ?,
           merge_history = ?
       WHERE golden_id = ?`,
      [
        [...goldenRecord.source_record_ids, newRecordId],
        new Date(),
        [
          ...goldenRecord.merge_history,
          {
            merged_at: new Date(),
            source_ids: [newRecordId],
            action: 'add',
            reason: 'new_duplicate_found'
          }
        ],
        goldenId
      ]
    );
  }

  // Update golden record when source record changes
  async syncFromSourceRecord(sourceRecordId) {
    const goldenRecord = await this.db.query(
      `SELECT * FROM golden_records
       WHERE ? = ANY(source_record_ids)`,
      [sourceRecordId]
    );

    if (!goldenRecord) return;

    // Refresh merge
    const sourceRecords = await this.db.query(
      'SELECT * FROM contacts WHERE id = ANY(?)',
      [goldenRecord.source_record_ids]
    );

    const updatedMerge = this.mergeRecords(sourceRecords, goldenRecord);

    await this.db.query(
      `UPDATE golden_records SET ? WHERE golden_id = ?`,
      [updatedMerge, goldenRecord.golden_id]
    );
  }

  // Split golden record (incorrect merge)
  async splitGoldenRecord(goldenId, sourceIdToRemove) {
    const goldenRecord = await this.db.query(
      'SELECT * FROM golden_records WHERE golden_id = ?',
      [goldenId]
    );

    // Remove from current golden record
    const remainingIds = goldenRecord.source_record_ids
      .filter(id => id !== sourceIdToRemove);

    if (remainingIds.length > 0) {
      // Update existing golden record
      const updatedMerge = await this.mergeRecords(
        remainingIds.map(id => this.db.query(
          'SELECT * FROM contacts WHERE id = ?', [id]
        ))
      );

      await this.db.query(
        `UPDATE golden_records
         SET source_record_ids = ?, merged_data = ?
         WHERE golden_id = ?`,
        [remainingIds, updatedMerge, goldenId]
      );
    } else {
      // Delete golden record if no sources left
      await this.db.query(
        'DELETE FROM golden_records WHERE golden_id = ?',
        [goldenId]
      );
    }

    // Removed record becomes its own golden record
    await this.db.query(
      `INSERT INTO golden_records (source_record_ids, merged_data)
       VALUES (?, ?)`,
      [[sourceIdToRemove], { id: sourceIdToRemove }]
    );
  }
}
```

---

## Implementation Architecture

### 1. Complete Deduplication Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│ INPUT: New Contact Record                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 1. PRE-PROCESSING                                            │
│    - Normalize name, email, phone                            │
│    - Remove whitespace                                       │
│    - Standardize formatting                                  │
│    - Phonetic encoding (optional)                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. BLOCKING (Fast Filtering)                                │
│    - Email domain blocking                                   │
│    - Phone prefix blocking                                   │
│    - Name prefix blocking                                    │
│    - Result: Candidate pairs (N < 1000)                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SIMILARITY SCORING (Expensive Matching)                   │
│    - Jaro-Winkler on names                                   │
│    - Exact match on emails                                   │
│    - Phone normalization comparison                          │
│    - Address component matching                              │
│    - Composite score calculation                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DUPLICATE DETECTION                                       │
│    - If score >= 0.90: Definite match                        │
│    - If 0.80 <= score < 0.90: Flag for review                │
│    - If score < 0.80: Not a match                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. MANUAL REVIEW (if needed)                                 │
│    - Human verification of flagged matches                   │
│    - Approve or reject merge                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. MERGE & GOLDEN RECORD CREATION                            │
│    - Apply merge rules                                       │
│    - Create/update golden record                             │
│    - Track field sources                                     │
│    - Record merge history                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. REDIRECT OLD RECORDS                                      │
│    - Mark old records as inactive                            │
│    - Link to golden record                                   │
│    - Maintain referential integrity                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ OUTPUT: Golden Record ID                                     │
└─────────────────────────────────────────────────────────────┘
```

---

### 2. Database Schema for Golden Records

```sql
-- Main golden records table
CREATE TABLE golden_records (
  golden_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_record_ids UUID[] NOT NULL,

  -- Merged data
  name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  company_id UUID,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Quality metrics
  confidence_score DECIMAL(3,2),
  completeness_score DECIMAL(3,2),
  verification_score DECIMAL(3,2),
  data_quality_score DECIMAL(3,2),

  -- Tracking
  field_sources JSONB, -- {field: {source_record_id, verified}}
  conflicts JSONB, -- Array of conflicts
  merge_history JSONB[], -- Array of merge events

  -- Relationships
  relationships JSONB, -- Array of related golden records

  INDEX idx_email (email),
  INDEX idx_source_ids (source_record_ids),
  INDEX idx_status (status)
);

-- Maintain mapping between old records and golden records
CREATE TABLE record_golden_mapping (
  record_id UUID PRIMARY KEY REFERENCES contacts(id),
  golden_id UUID NOT NULL REFERENCES golden_records(golden_id),
  is_master_record BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_golden_id (golden_id)
);

-- Track merge history
CREATE TABLE merge_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golden_id UUID NOT NULL REFERENCES golden_records(golden_id),
  merged_at TIMESTAMP NOT NULL,
  action VARCHAR(50), -- 'initial_merge', 'add_duplicate', 'split'
  source_record_ids UUID[],
  master_record_id UUID,
  reason TEXT,
  performed_by UUID, -- User who approved

  INDEX idx_golden_id (golden_id),
  INDEX idx_merged_at (merged_at)
);

-- Flag records for manual review
CREATE TABLE merge_review_queue (
  review_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  golden_id UUID NOT NULL,
  source_record_ids UUID[] NOT NULL,
  reason TEXT,
  confidence_score DECIMAL(3,2),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID,

  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

---

## Best Practices

### 1. Configuration Best Practices

```javascript
const deduplicationConfig = {
  // Matching thresholds
  thresholds: {
    definite_match: 0.95, // Auto-merge
    likely_match: 0.88,   // Flag for review
    possible_match: 0.80  // Alert user
  },

  // Field weights for composite scoring
  field_weights: {
    email: 0.40,      // Email is strongest indicator
    phone: 0.30,
    name: 0.20,
    address: 0.10
  },

  // Field-specific thresholds
  field_thresholds: {
    email: 0.98,      // Email should be nearly exact
    phone: 0.95,      // Phone numbers should match closely
    name: 0.85,       // Names can be fuzzy
    address: 0.80
  },

  // Blocking strategies to use (in order)
  blocking_strategies: [
    'email_domain',
    'phone_prefix',
    'name_initials'
  ],

  // Merge rules
  merge_rules: {
    strategy: 'quality_score',
    preference_order: ['email', 'phone', 'name'],
    use_master_record: true
  },

  // Manual review triggers
  review_triggers: [
    'low_confidence',
    'conflicting_values',
    'unverified_data',
    'high_risk_fields' // e.g., financial info
  ],

  // Performance settings
  performance: {
    batch_size: 1000,
    max_candidates_per_record: 100,
    blocking_window_size: 15
  }
};
```

---

### 2. Data Quality Checks

```javascript
class DataQualityValidator {
  validateBeforeMerge(goldenRecord) {
    const issues = [];

    // Check 1: All critical fields present
    const criticalFields = ['email', 'name'];
    for (const field of criticalFields) {
      if (!goldenRecord[field]) {
        issues.push(`Missing critical field: ${field}`);
      }
    }

    // Check 2: No suspicious patterns
    if (this.hasRedFlags(goldenRecord)) {
      issues.push('Record contains suspicious patterns');
    }

    // Check 3: Reasonable field values
    if (this.hasInvalidValues(goldenRecord)) {
      issues.push('Record contains invalid values');
    }

    // Check 4: Verified data percentage
    const verifiedRatio = this.calculateVerificationRatio(goldenRecord);
    if (verifiedRatio < 0.5) {
      issues.push(`Low verification ratio: ${verifiedRatio.toFixed(2)}`);
    }

    return {
      is_valid: issues.length === 0,
      issues,
      recommendation: issues.length === 0 ? 'approve' : 'review'
    };
  }

  hasRedFlags(record) {
    // Test emails
    if (record.email && /test|dummy|sample|fake/i.test(record.email)) {
      return true;
    }

    // Suspicious names
    if (record.name && /\d{3,}|@|#|\$/.test(record.name)) {
      return true;
    }

    return false;
  }

  hasInvalidValues(record) {
    // Check email format
    if (record.email && !/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(record.email)) {
      return true;
    }

    // Check phone format
    if (record.phone && !/\d{10,}/.test(record.phone.replace(/\D/g, ''))) {
      return true;
    }

    return false;
  }

  calculateVerificationRatio(record) {
    const verifiedCount = Object.keys(record)
      .filter(k => record[`${k}_verified`]).length;
    const totalCount = Object.keys(record).length;
    return totalCount > 0 ? verifiedCount / totalCount : 0;
  }
}
```

---

### 3. Performance Optimization

```javascript
class DeduplicationOptimizer {
  // Use database indexes
  static createOptimalIndexes() {
    return [
      'CREATE INDEX idx_email_normalized ON contacts(LOWER(email))',
      'CREATE INDEX idx_name_trgm ON contacts USING GIN(name gin_trgm_ops)', // PostgreSQL
      'CREATE INDEX idx_phone_normalized ON contacts(REGEXP_REPLACE(phone, \'\\D\', \'\'))',
      'CREATE INDEX idx_composite_email_phone ON contacts(LOWER(email), REGEXP_REPLACE(phone, \'\\D\', \'\'))',
      'CREATE INDEX idx_golden_records_status ON golden_records(status)',
      'CREATE INDEX idx_record_mapping_golden ON record_golden_mapping(golden_id)'
    ];
  }

  // Cache frequently compared records
  static createCachingStrategy() {
    return {
      cache_type: 'redis',
      ttl: 3600, // 1 hour
      keys: [
        'duplicate_groups:{contact_id}',
        'golden_record:{golden_id}',
        'blocking_candidates:{blocking_key}'
      ]
    };
  }

  // Batch processing for large datasets
  async deduplargeDataset(contacts, batchSize = 1000) {
    const batches = [];

    for (let i = 0; i < contacts.length; i += batchSize) {
      batches.push(contacts.slice(i, i + batchSize));
    }

    const goldenRecords = [];
    for (const batch of batches) {
      const results = await Promise.all(
        batch.map(contact => this.processContact(contact))
      );
      goldenRecords.push(...results);
    }

    return goldenRecords;
  }

  // Incremental deduplication (new records against existing)
  async incrementalDedup(newContact) {
    // 1. Quick blocking check
    const candidates = await this.getBlockingCandidates(newContact);

    // 2. Parallel similarity scoring
    const scores = await Promise.all(
      candidates.map(candidate =>
        this.scoreMatch(newContact, candidate)
      )
    );

    // 3. Find duplicates above threshold
    const duplicates = scores
      .filter(score => score.similarity >= this.config.thresholds.likely_match)
      .sort((a, b) => b.similarity - a.similarity);

    // 4. Group and create golden record
    if (duplicates.length > 0) {
      return await this.createGoldenRecord([
        newContact.id,
        ...duplicates.map(d => d.candidate.id)
      ]);
    }

    return newContact;
  }
}
```

---

### 4. Error Handling and Recovery

```javascript
class DeduplicationErrorHandler {
  async handleMergeFailure(error, goldenRecord, sourceRecords) {
    console.error('Merge failed:', error);

    // Rollback any changes
    await this.rollbackMerge(goldenRecord);

    // Log detailed error
    await this.logError({
      error: error.message,
      stack: error.stack,
      golden_id: goldenRecord.golden_id,
      source_ids: sourceRecords.map(r => r.id),
      timestamp: new Date()
    });

    // Move to manual review queue
    await this.moveToManualReview(goldenRecord, {
      reason: `Automatic merge failed: ${error.message}`,
      severity: 'high'
    });

    // Notify administrators
    await this.notifyAdmins({
      type: 'merge_failure',
      golden_id: goldenRecord.golden_id,
      error: error.message
    });
  }

  async rollbackMerge(goldenRecord) {
    // Delete golden record if just created
    await this.db.query(
      'DELETE FROM golden_records WHERE golden_id = ?',
      [goldenRecord.golden_id]
    );

    // Remove mappings
    await this.db.query(
      'DELETE FROM record_golden_mapping WHERE golden_id = ?',
      [goldenRecord.golden_id]
    );

    // Clear merge history
    await this.db.query(
      'DELETE FROM merge_events WHERE golden_id = ?',
      [goldenRecord.golden_id]
    );
  }

  // Retry with exponential backoff
  async retryMergeWithBackoff(goldenRecord, maxAttempts = 3) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await this.createGoldenRecord(goldenRecord);
        return;
      } catch (error) {
        if (attempt === maxAttempts - 1) throw error;

        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
```

---

## Performance Considerations

### 1. Scalability Analysis

| Dataset Size | Approach | Time | Complexity |
|--------------|----------|------|-----------|
| 1K contacts | Exhaustive | <1s | O(n²) |
| 10K contacts | Blocking only | ~10s | O(n*k) |
| 100K contacts | Blocking + Canopy | ~1min | O(n*log(n)) |
| 1M contacts | Blocking + Sampling | ~10min | O(n*k) |

### 2. Algorithm Performance Benchmarks

```
Jaro-Winkler: ~10,000 comparisons/second
Levenshtein: ~5,000 comparisons/second
Email exact match: ~100,000 comparisons/second
Blocking: ~500,000 records filtered/second
```

### 3. Typical Implementation Benchmarks

```javascript
// Time to dedup 100K new contacts
const benchmarks = {
  preprocessing: '2-5 seconds',
  blocking: '5-10 seconds',
  similarity_scoring: '30-60 seconds',
  duplicate_detection: '5-10 seconds',
  merge_and_golden_records: '10-20 seconds',
  total: '50-100 seconds'
};
```

---

## Conclusion

Effective CRM deduplication requires:

1. **Proper Blocking**: Reduce candidate pairs from N² to manageable size
2. **Accurate Matching**: Use appropriate algorithms (Jaro-Winkler for names)
3. **Smart Merging**: Apply context-aware merge rules
4. **Golden Records**: Create authoritative unified records
5. **Verification**: Include manual review for edge cases
6. **Monitoring**: Track quality metrics and merge history

The key to success is balancing **precision** (avoiding false positives) with **recall** (catching all duplicates), while maintaining **data quality** through the entire process.

---

## References

- ISO/IEC 8601: Data and time format standard
- Christen, P. (2012). Data matching: Concepts and techniques for record linkage, entity resolution, and duplicate detection
- Soria-Comas, J., & Domingo-Ferrer, J. (2018). Big data privacy: Challenges to privacy principles and models for data minimization and abstraction
- Elmagarmid, A.K., Ipeirotis, P.G., & Verykios, V.S. (2007). Duplicate record detection: A survey
- Winkler, W.E. (1990). String comparator metrics and enhanced decision rules in the Fellegi-Sunter model of record linkage
