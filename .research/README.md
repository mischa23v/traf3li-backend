# Research Library

This folder contains competitive research and best practices analysis.

## Purpose

Before implementing new features, run `/research {topic}` to gather:
- Enterprise patterns (AWS, Google, Microsoft, Salesforce)
- Open source implementations (GitHub repos)
- Industry standards (RFCs, OWASP)
- Legal tech competitors (Clio, PracticePanther)
- ML/Data approaches (Kaggle)

## Structure

```
.research/
├── {topic}/
│   ├── README.md              # Summary & recommendations
│   ├── enterprise-apis.md     # AWS, Google, Microsoft patterns
│   ├── open-source.md         # GitHub repos analysis
│   ├── standards.md           # RFCs, OWASP, specs
│   ├── legal-tech.md          # Clio, PracticePanther, etc.
│   └── recommendations.md     # Actionable items for /plan
```

## Usage

1. Run `/research task management` before building task features
2. Research is stored here for future reference
3. `/plan` references findings from research

## Completed Research

| Topic | Date | Key Findings |
|-------|------|--------------|
| (none yet) | - | Run `/research {topic}` to populate |

## Enterprise Gold Standard Sources

| Company | Focus Areas |
|---------|-------------|
| AWS | IAM, Multi-tenancy, Retry patterns, S3 |
| Google | OAuth 2.0, Calendar API, Cloud patterns |
| Microsoft | Graph API, Azure AD, Teams integration |
| Apple | Privacy, ICS/Calendar, App Store patterns |
| Salesforce | Multi-tenant SaaS, CRM, Audit trails |
| SAP | Enterprise ERP, Compliance |
| Stripe | Payments, Webhooks, Idempotency |
| Twilio | Communications, Webhooks |

## Legal Tech Competitors

| Company | Strengths |
|---------|-----------|
| Clio | Market leader, comprehensive features |
| PracticePanther | All-in-one, good UX |
| MyCase | Client portal, mobile |
| Rocket Matter | Billing excellence |
| Smokeball | Automation, workflows |
| LawPay | Legal-specific payments |
