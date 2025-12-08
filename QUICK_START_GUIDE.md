# Quick Start Guide - AI Lead Scoring & WhatsApp Integration

## 🚀 Quick Setup (5 Minutes)

### 1. Environment Variables
Add to your `.env` file:

```bash
# WhatsApp - Meta Cloud API
META_WHATSAPP_TOKEN=your_meta_access_token_here
META_PHONE_NUMBER_ID=your_phone_number_id_here
META_BUSINESS_ACCOUNT_ID=your_business_account_id_here
META_WEBHOOK_VERIFY_TOKEN=traf3li_whatsapp_2024
WHATSAPP_PROVIDER=meta
```

### 2. Install Dependencies (if needed)
```bash
npm install axios
```

### 3. Start Server
```bash
npm start
```

### 4. Test Installation
```bash
# Health check
curl http://localhost:5000/api/lead-scoring/config

# Get your firm's scoring config
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/lead-scoring/config
```

---

## 📝 Common Use Cases

### Calculate Lead Score
```bash
POST /api/lead-scoring/calculate/:leadId
Authorization: Bearer YOUR_TOKEN
```

### Send WhatsApp Template
```bash
POST /api/whatsapp/send/template
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "phoneNumber": "+966501234567",
  "templateName": "welcome_message",
  "variables": {
    "name": "أحمد"
  }
}
```

### Get Top Leads
```bash
GET /api/lead-scoring/top-leads?limit=20
Authorization: Bearer YOUR_TOKEN
```

### Get Lead Insights
```bash
GET /api/lead-scoring/insights/:leadId
Authorization: Bearer YOUR_TOKEN
```

### List WhatsApp Conversations
```bash
GET /api/whatsapp/conversations
Authorization: Bearer YOUR_TOKEN
```

---

## 🎯 Key Endpoints

### Lead Scoring
- `GET /api/lead-scoring/config` - Get configuration
- `POST /api/lead-scoring/calculate/:leadId` - Calculate score
- `GET /api/lead-scoring/top-leads` - Get top leads
- `GET /api/lead-scoring/distribution` - Score distribution

### WhatsApp
- `POST /api/whatsapp/send/template` - Send template
- `POST /api/whatsapp/send/text` - Send text
- `GET /api/whatsapp/conversations` - List conversations
- `GET /api/whatsapp/templates` - List templates

### Tracking (Webhooks)
- `POST /api/lead-scoring/track/email-open`
- `POST /api/lead-scoring/track/email-click`
- `POST /api/lead-scoring/track/meeting`
- `POST /api/lead-scoring/track/call`

---

## 🔧 Configuration

### Update Scoring Weights
```bash
PUT /api/lead-scoring/config
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "weights": {
    "demographic": 20,
    "bant": 35,
    "behavioral": 30,
    "engagement": 15
  }
}
```

### Create WhatsApp Template
```bash
POST /api/whatsapp/templates
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "name": "appointment_reminder",
  "language": "ar",
  "category": "utility",
  "body": {
    "text": "مرحباً {{1}}، تذكير بموعدك في {{2}}",
    "variables": [
      { "position": 1, "name": "client_name", "example": "أحمد" },
      { "position": 2, "name": "date", "example": "٢٠٢٤/٠١/١٥" }
    ]
  }
}
```

---

## 🔗 WhatsApp Webhook Setup

### Meta Cloud API Configuration:
1. Go to Meta for Developers
2. Navigate to your app → WhatsApp → Configuration
3. Set webhook URL: `https://your-domain.com/api/whatsapp/webhooks/whatsapp`
4. Set verify token: `traf3li_whatsapp_2024`
5. Subscribe to: `messages`, `message_status`

---

## 📊 Scoring System

### Score Breakdown (Default Weights)
- **Demographic (25%)**: Case type, value, location
- **BANT (30%)**: Budget, Authority, Need, Timeline
- **Behavioral (30%)**: Email, calls, meetings, documents
- **Engagement (15%)**: Recency, frequency, depth

### Grades
- **A (80-100)**: Hot Lead 🔥
- **B (60-79)**: Warm Lead ⭐
- **C (40-59)**: Cool Lead 💫
- **D (20-39)**: Cold Lead ❄️
- **F (0-19)**: Unqualified ⛔

---

## 🔄 Automatic Processing

### Daily Cron Jobs (Recommended)

```javascript
// In your cron job file
const cron = require('node-cron');
const LeadScoringService = require('./src/services/leadScoring.service');
const Firm = require('./src/models/firm.model');

// Recalculate scores daily at 3 AM
cron.schedule('0 3 * * *', async () => {
  console.log('Running daily lead score calculation...');
  const firms = await Firm.find({ isActive: true });

  for (const firm of firms) {
    try {
      await LeadScoringService.recalculateAllScores(firm._id);
      console.log(`✅ Scores calculated for firm: ${firm.name}`);
    } catch (error) {
      console.error(`❌ Error for firm ${firm.name}:`, error);
    }
  }
});

// Process decay daily at 4 AM
cron.schedule('0 4 * * *', async () => {
  console.log('Running daily decay processing...');
  const firms = await Firm.find({ isActive: true });

  for (const firm of firms) {
    try {
      await LeadScoringService.processAllDecay(firm._id);
      console.log(`✅ Decay processed for firm: ${firm.name}`);
    } catch (error) {
      console.error(`❌ Error for firm ${firm.name}:`, error);
    }
  }
});
```

---

## 🧪 Testing

### Test Lead Scoring

```javascript
// In your test file or Postman
const axios = require('axios');

// 1. Calculate score for a lead
const scoreResponse = await axios.post(
  'http://localhost:5000/api/lead-scoring/calculate/LEAD_ID_HERE',
  {},
  { headers: { Authorization: 'Bearer YOUR_TOKEN' } }
);

console.log('Score:', scoreResponse.data.data.totalScore);
console.log('Grade:', scoreResponse.data.data.grade);

// 2. Get top leads
const topLeads = await axios.get(
  'http://localhost:5000/api/lead-scoring/top-leads?limit=5',
  { headers: { Authorization: 'Bearer YOUR_TOKEN' } }
);

console.log('Top 5 Leads:', topLeads.data.data);
```

### Test WhatsApp

```javascript
// Send a test message
const whatsappResponse = await axios.post(
  'http://localhost:5000/api/whatsapp/send/text',
  {
    phoneNumber: '+966501234567',
    text: 'مرحباً! هذه رسالة اختبار من نظام TRAF3LI'
  },
  { headers: { Authorization: 'Bearer YOUR_TOKEN' } }
);

console.log('Message sent:', whatsappResponse.data);
```

---

## 📱 Phone Number Format

### Accepted Formats (Auto-converted to 966XXXXXXXXX)
- `+966501234567` ✅
- `966501234567` ✅
- `0501234567` ✅
- `501234567` ✅

All are converted to: `966501234567`

---

## 🎨 Frontend Integration Examples

### Display Lead Score

```javascript
// Fetch lead with score
const lead = await api.get(`/api/leads/${leadId}`);
const score = await api.get(`/api/lead-scoring/insights/${leadId}`);

// Display
<div className="lead-score">
  <div className={`score-badge grade-${score.grade}`}>
    {score.totalScore}/100
  </div>
  <div className="grade">{score.grade}</div>
  <div className="category">{score.category}</div>

  {/* Breakdown */}
  <div className="breakdown">
    <div>BANT: {score.breakdown.bant.score}%</div>
    <div>Behavioral: {score.breakdown.behavioral.score}%</div>
    <div>Engagement: {score.breakdown.engagement.score}%</div>
  </div>

  {/* Insights */}
  <div className="insights">
    <h4>Strengths</h4>
    {score.insights.strengths.map(s => <li>{s}</li>)}

    <h4>Recommended Actions</h4>
    {score.recommendedActions.map(a => (
      <button onClick={() => handleAction(a.action)}>
        {a.title}
      </button>
    ))}
  </div>
</div>
```

### WhatsApp Chat Widget

```javascript
// Fetch conversation
const conversation = await api.get(`/api/whatsapp/conversations/${conversationId}`);
const messages = await api.get(`/api/whatsapp/conversations/${conversationId}/messages`);

// Send message
const sendMessage = async (text) => {
  await api.post('/api/whatsapp/send/text', {
    phoneNumber: conversation.phoneNumber,
    text,
    leadId: conversation.leadId
  });
};

// Display
<div className="whatsapp-chat">
  <div className="messages">
    {messages.map(msg => (
      <div className={`message ${msg.direction}`}>
        <div className="content">{msg.content.text}</div>
        <div className="status">{msg.status}</div>
        <div className="time">{msg.timestamp}</div>
      </div>
    ))}
  </div>

  <div className="input">
    <input
      value={text}
      onChange={e => setText(e.target.value)}
      onKeyPress={e => e.key === 'Enter' && sendMessage(text)}
    />
    <button onClick={() => sendMessage(text)}>Send</button>
  </div>
</div>
```

---

## 🐛 Troubleshooting

### Lead scores not calculating
1. Check if config exists: `GET /api/lead-scoring/config`
2. Verify lead has qualification data
3. Check CRM activities exist for behavioral scoring
4. Review logs for errors

### WhatsApp messages not sending
1. Verify Meta token is valid
2. Check phone number format (+966...)
3. Verify template is approved (for template messages)
4. Check 24-hour window status
5. Review provider logs

### Webhook not receiving messages
1. Verify webhook URL is publicly accessible (use ngrok for local testing)
2. Check verify token matches: `traf3li_whatsapp_2024`
3. Verify Meta webhook subscription is active
4. Check server logs for incoming requests

---

## 📚 Additional Resources

- Full Documentation: `LEAD_SCORING_WHATSAPP_IMPLEMENTATION.md`
- Model Schemas: Check `/src/models/` directory
- Service Code: `/src/services/` directory
- API Routes: `/src/routes/` directory

---

## ✅ Success Checklist

- [ ] Environment variables configured
- [ ] Server started successfully
- [ ] Can access `/api/lead-scoring/config`
- [ ] Can access `/api/whatsapp/templates`
- [ ] Webhook URL registered with Meta (if using Meta)
- [ ] Test lead score calculation works
- [ ] Test WhatsApp message sending works
- [ ] Cron jobs scheduled (optional but recommended)

---

**Ready to achieve 10/10! 🎯**

For detailed information, see `LEAD_SCORING_WHATSAPP_IMPLEMENTATION.md`
