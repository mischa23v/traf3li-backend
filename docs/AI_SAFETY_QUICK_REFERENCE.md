# AI Safety Quick Reference

## 🚀 Quick Start

```javascript
const AIChatService = require('./services/aiChat.service');

// Make a safe AI request
const response = await AIChatService.chat(
    [{ role: 'user', content: 'Your message here' }],
    {
        provider: 'anthropic',
        firmId: req.firmId,
        userId: req.userID,
        context: 'legal',  // or 'general', 'case_management', 'scheduling'
        metadata: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        }
    }
);

// Response includes safety info
console.log(response.content);  // Filtered, safe response
console.log(response.safetyInfo);  // Safety check results
```

## 🛡️ Safety Features At-a-Glance

| Feature | What It Does | Auto-Applied |
|---------|-------------|--------------|
| **Input Sanitization** | Blocks prompt injection, jailbreaks | ✅ Yes |
| **PII Detection** | Detects IDs, IBANs, emails, phones | ✅ Yes |
| **Output Filtering** | Removes PII from responses | ✅ Yes |
| **Rate Limiting** | Enforces usage quotas | ✅ Yes |
| **Legal Disclaimers** | Adds disclaimers to legal content | ✅ Yes (when context='legal') |
| **Confidence Scoring** | Flags uncertain responses | ✅ Yes |
| **Audit Logging** | Logs all interactions | ✅ Yes |

## 📊 Rate Limits by Plan

| Plan | Per Hour | Per Day |
|------|----------|---------|
| Free | 10 | 50 |
| Starter | 50 | 300 |
| Professional | 200 | 1,500 |
| Enterprise | 1,000 | 10,000 |

## 🚨 Blocked Patterns

### Prompt Injection
- "ignore previous instructions"
- "forget your directives"
- "system prompt"
- "jailbreak"
- "DAN mode"

### PII (Detected & Redacted)
- Saudi National IDs: `1234567890`
- IBANs: `SA1234567890123456789012`
- Credit Cards: `1234-5678-9012-3456`
- Emails: `user@example.com`
- Phone Numbers: `+966501234567`

## 🔍 Response Structure

```javascript
{
    content: "Filtered AI response with legal disclaimer if needed",
    tokens: {
        input: 123,
        output: 456,
        total: 579
    },
    model: "claude-3-5-sonnet-20241022",
    safetyInfo: {
        inputSanitized: false,
        outputFiltered: false,
        inputViolations: [],
        outputViolations: [],
        confidenceScore: 0.85,
        flaggedAsUncertain: false,
        legalDisclaimerAdded: true,
        rateLimitInfo: {
            remainingToday: 45,
            remainingThisHour: 8
        }
    }
}
```

## 🎯 Context Types

| Context | Behavior |
|---------|----------|
| `'legal'` | Adds legal disclaimer, strict validation |
| `'case_management'` | Standard filtering |
| `'scheduling'` | Standard filtering |
| `'general'` | Standard filtering |

## ⚠️ Error Handling

```javascript
try {
    const response = await AIChatService.chat(messages, options);
} catch (error) {
    if (error.code === 'rate_limit_exceeded') {
        // Handle rate limit
        return res.status(429).json({
            error: 'Too many requests',
            resetTime: error.details.rateLimitCheck.resetTime
        });
    }

    if (error.code === 'safety_violation') {
        // Handle blocked content
        return res.status(400).json({
            error: 'Message contains prohibited content',
            violations: error.details.violations
        });
    }

    // Other errors
    throw error;
}
```

## 📝 Manual Safety Checks

```javascript
const AISafetyService = require('./services/aiSafety.service');

// Check rate limit
const rateCheck = await AISafetyService.checkRateLimit(userId, firmId);
console.log(rateCheck.allowed);  // true/false

// Sanitize input
const sanitized = AISafetyService.sanitizeInput(message);
console.log(sanitized.safe);  // true/false
console.log(sanitized.sanitized);  // cleaned message

// Filter output
const filtered = AISafetyService.filterOutput(response, 'legal');
console.log(filtered.filtered);  // filtered response

// Validate response
const validation = AISafetyService.validateResponse(response, 'legal');
console.log(validation.confidenceScore);  // 0.0 - 1.0
```

## 📈 Monitoring

```javascript
// Get safety statistics
const stats = await AISafetyService.getSafetyStatistics(firmId, 30);
console.log({
    totalInteractions: stats.totalInteractions,
    blocked: stats.blockedInteractions,
    avgSafetyScore: stats.avgSafetyScore
});

// Get flagged interactions
const AIInteraction = require('./models/aiInteraction.model');
const flagged = await AIInteraction.getFlaggedInteractions(100);
```

## 🔒 Security Best Practices

1. **Always pass userId** - Required for rate limiting and audit
2. **Set context** - Use 'legal' for legal questions
3. **Include metadata** - Pass IP, user agent for audit trail
4. **Check safetyInfo** - Review violations and confidence
5. **Handle errors** - Catch rate limit and safety violations
6. **Monitor logs** - Review flagged interactions regularly

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Rate limit not working | Check firm subscription plan |
| PII not detected | Verify pattern matches format |
| Logs not saving | Check database connection |
| Missing safety info | Ensure using new chat() method |

## 📚 Files Reference

- **Service**: `/src/services/aiSafety.service.js`
- **Model**: `/src/models/aiInteraction.model.js`
- **Chat Service**: `/src/services/aiChat.service.js`
- **Full Guide**: `/docs/AI_SAFETY_GUIDE.md`

## 💡 Pro Tips

- Use `context: 'legal'` for all legal-related queries
- Check `confidenceScore` before showing critical information
- Review flagged interactions weekly for quality assurance
- Set up alerts for critical violations
- Monitor rate limit usage to optimize plans

## 🆘 Need Help?

1. Check `/docs/AI_SAFETY_GUIDE.md` for detailed documentation
2. Review error logs in `logs/error.log`
3. Check audit logs in database `aiinteractions` collection
4. Contact development team for support
