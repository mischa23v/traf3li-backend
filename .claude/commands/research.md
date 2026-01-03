# Comprehensive Research Command

Research best practices across enterprise companies, open source, academic sources, and competitions.

---

## 🎯 PURPOSE

Before building any feature, research how the best in the industry implement it:
- **Enterprise Companies**: AWS, Google, Microsoft, Apple, SAP, Salesforce, etc.
- **Open Source**: GitHub repos, libraries, frameworks
- **Data/ML**: Kaggle competitions, research papers
- **Legal Tech**: Clio, PracticePanther, MyCase, Rocket Matter
- **Standards**: RFCs, OWASP, ISO, industry specs

---

## 🔄 WORKFLOW

```
/research [topic]
    ↓
1. Scan codebase to understand current implementation
2. Identify relevant research sources
3. Run parallel agents to research each source
4. Compile findings in .research/{topic}/
5. Generate recommendations for /plan
```

---

## 📋 STEP 1: SCAN CODEBASE

First, understand what already exists in this project:

```bash
# Find all models (data structures)
ls src/models/

# Find all controllers (features)
ls src/controllers/

# Find all services (business logic)
ls src/services/

# Find existing patterns
grep -r "pattern-name" src/
```

### Feature Domain Mapping

| Domain | Controllers | Models | Competitors to Research |
|--------|-------------|--------|------------------------|
| Tasks | task*.controller.js | Task.js | Asana, Monday, ClickUp, Notion, Todoist |
| Cases | case.controller.js | Case.js | Clio, PracticePanther, MyCase, Rocket Matter |
| Clients | client.controller.js | Client.js | Salesforce, HubSpot, Pipedrive |
| Billing | billing*.controller.js | Invoice.js | Stripe, QuickBooks, FreshBooks, LegalBilling |
| Calendar | appointment.controller.js | Appointment.js | Calendly, Cal.com, Google Calendar, Outlook |
| Documents | document.controller.js | Document.js | DocuSign, PandaDoc, Clio Grow |
| Auth | auth.controller.js | User.js | Auth0, Okta, Firebase Auth, AWS Cognito |
| Multi-tenancy | - | Firm.js | Salesforce, SAP, AWS Organizations |

---

## 📋 STEP 2: RESEARCH SOURCES

### Enterprise Companies (API Patterns & Architecture)

| Company | Research Focus | API Docs |
|---------|---------------|----------|
| **AWS** | IAM, Multi-tenancy, Retry patterns | docs.aws.amazon.com |
| **Google** | OAuth, Calendar API, Cloud patterns | developers.google.com |
| **Microsoft** | Graph API, Azure AD, Teams | docs.microsoft.com |
| **Apple** | Privacy patterns, ICS/Calendar | developer.apple.com |
| **Salesforce** | Multi-tenant SaaS, CRM patterns | developer.salesforce.com |
| **SAP** | Enterprise patterns, Audit trails | developers.sap.com |
| **Stripe** | Payment APIs, Webhooks, Idempotency | stripe.com/docs |
| **Twilio** | Communication APIs, Webhooks | twilio.com/docs |

### GitHub Open Source

| Category | Search Terms | Top Repos to Check |
|----------|--------------|-------------------|
| Task Management | "task management api nodejs" | taskwarrior, plane, focalboard |
| Legal Tech | "legal practice management" | openlaw, docassemble |
| Multi-tenancy | "multi-tenant nodejs mongodb" | saas-starter, multi-tenant-node |
| Calendar | "calendar api nodejs" | cal.com, calendso |
| Document Gen | "document generation nodejs" | docxtemplater, carbone |
| Auth/Permissions | "rbac nodejs" | casl, accesscontrol |
| Billing | "subscription billing nodejs" | lago, killbill |

### Kaggle & ML/Data

| Topic | Search Focus |
|-------|--------------|
| Document Classification | Legal document categorization models |
| NLP | Contract analysis, entity extraction |
| Time Series | Billing predictions, workload forecasting |
| Anomaly Detection | Fraud detection, unusual activity |

### Standards & Specifications

| Standard | Applies To | Source |
|----------|-----------|--------|
| RFC 5545 | Calendar/ICS | ietf.org |
| RFC 6749 | OAuth 2.0 | ietf.org |
| OWASP Top 10 | Security | owasp.org |
| OpenAPI 3.0 | API Design | openapis.org |
| JSON:API | REST conventions | jsonapi.org |

### Legal Tech Specific

| Company | Focus | Why Research |
|---------|-------|--------------|
| Clio | Full practice management | Market leader patterns |
| PracticePanther | All-in-one legal | UX patterns |
| MyCase | Client portal | Client-facing features |
| Rocket Matter | Billing focus | Legal billing patterns |
| Smokeball | Automation | Workflow automation |
| LawPay | Payments | Legal payment compliance |

---

## 📋 STEP 3: RUN PARALLEL RESEARCH AGENTS

For the given topic, spawn multiple agents:

### Agent Types

1. **Enterprise API Agent**
   - Search: "{topic} API documentation {company}"
   - Extract: Endpoints, request/response shapes, error handling
   - Output: `.research/{topic}/enterprise-apis.md`

2. **GitHub Agent**
   - Search: GitHub for "{topic} nodejs" or "{topic} api"
   - Analyze: Top 5 starred repos
   - Extract: Data models, API patterns, architecture
   - Output: `.research/{topic}/open-source.md`

3. **Standards Agent**
   - Search: RFCs, OWASP, industry specs for {topic}
   - Extract: Required compliance, best practices
   - Output: `.research/{topic}/standards.md`

4. **Legal Tech Agent** (if applicable)
   - Research: How Clio, PracticePanther implement {topic}
   - Extract: Features, UX patterns, API design
   - Output: `.research/{topic}/legal-tech.md`

5. **Competition/Kaggle Agent** (if ML applicable)
   - Search: Kaggle competitions related to {topic}
   - Extract: Winning approaches, datasets, models
   - Output: `.research/{topic}/ml-approaches.md`

---

## 📋 STEP 4: OUTPUT STRUCTURE

Create research folder:

```
.research/
├── {topic}/
│   ├── README.md              # Summary & recommendations
│   ├── enterprise-apis.md     # AWS, Google, Microsoft patterns
│   ├── open-source.md         # GitHub repos analysis
│   ├── standards.md           # RFCs, OWASP, specs
│   ├── legal-tech.md          # Clio, PracticePanther, etc.
│   ├── ml-approaches.md       # Kaggle, ML patterns (if applicable)
│   └── recommendations.md     # Actionable items for /plan
```

### README.md Template

```markdown
# Research: {Topic}

**Date:** YYYY-MM-DD
**Researcher:** Claude

## Executive Summary

{2-3 sentence summary of findings}

## Key Patterns Discovered

| Pattern | Source | Recommendation |
|---------|--------|----------------|
| Pattern 1 | AWS/Google | Adopt for X |
| Pattern 2 | Clio | Consider for Y |

## Best Implementations Found

1. **{Company/Repo}**: {Why it's good}
2. **{Company/Repo}**: {Why it's good}

## Gaps in Current Implementation

| Gap | Impact | Priority |
|-----|--------|----------|
| Missing X | High | P1 |
| Missing Y | Medium | P2 |

## Recommendations for /plan

1. {Specific recommendation}
2. {Specific recommendation}

## Sources

- [Link 1](url)
- [Link 2](url)
```

---

## 📋 STEP 5: INTEGRATE WITH /PLAN

After research completes:

1. Reference findings in `/plan` requirements
2. Include "Research Sources" section
3. Justify decisions with competitor analysis

```markdown
## Research Sources

This plan is informed by research in `.research/{topic}/`:

| Decision | Based On | Source |
|----------|----------|--------|
| Use HMAC-signed state | AWS/Google OAuth | enterprise-apis.md |
| Multi-tenant isolation | Salesforce patterns | legal-tech.md |
| RFC 5545 compliance | Apple ICS spec | standards.md |
```

---

## 🚀 USAGE EXAMPLES

### Example 1: Research Task Management

```
/research task management

→ Scans: src/controllers/task*.js, src/models/Task.js
→ Researches: Asana, Monday, ClickUp APIs
→ Checks: GitHub repos (plane, focalboard)
→ Outputs: .research/task-management/
```

### Example 2: Research Calendar Integration

```
/research calendar integration

→ Scans: src/services/googleCalendar.service.js
→ Researches: Google Calendar, Outlook, Apple Calendar APIs
→ Checks: RFC 5545, cal.com repo
→ Outputs: .research/calendar-integration/
```

### Example 3: Research Multi-tenancy

```
/research multi-tenancy

→ Scans: src/plugins/globalFirmIsolation.js
→ Researches: Salesforce, AWS Organizations, SAP
→ Checks: GitHub multi-tenant patterns
→ Outputs: .research/multi-tenancy/
```

---

## 🔧 EXECUTION INSTRUCTIONS

When user runs `/research {topic}`:

1. **Scan codebase** for existing {topic} implementation
2. **Identify gaps** and areas to research
3. **Spawn parallel agents** for each research source type
4. **Compile findings** in `.research/{topic}/`
5. **Generate recommendations** for `/plan`
6. **Present summary** to user with key findings

### Parallel Agent Prompts

**Enterprise Agent:**
```
Research how AWS, Google, Microsoft, Salesforce implement "{topic}".
Focus on: API design, security patterns, scalability.
Search their official documentation and developer guides.
Output: Markdown with patterns, code examples, recommendations.
```

**GitHub Agent:**
```
Search GitHub for top repositories implementing "{topic}" in Node.js.
Analyze: Stars, recent activity, code quality.
Extract: Data models, API endpoints, architecture decisions.
Output: Markdown comparing top 5 repos with recommendations.
```

**Standards Agent:**
```
Find relevant RFCs, OWASP guidelines, and industry standards for "{topic}".
Focus on: Compliance requirements, security, interoperability.
Output: Markdown with must-implement requirements.
```

**Legal Tech Agent:**
```
Research how Clio, PracticePanther, MyCase implement "{topic}".
Focus on: Features, UX patterns, API design.
Note: May require checking their help docs, API docs, or demos.
Output: Markdown with legal-industry-specific patterns.
```

---

## 🔗 NEXT STEPS

After `/research` completes:
1. Review `.research/{topic}/recommendations.md`
2. Run `/plan` to create requirements informed by research
3. Reference research in plan's "Research Sources" section
