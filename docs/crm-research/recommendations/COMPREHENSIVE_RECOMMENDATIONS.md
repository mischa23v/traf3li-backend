# Traf3li CRM Comprehensive Enhancement Recommendations

## Executive Summary

Complete analysis of **12 research batches** covering 12 leading platforms and 6 CRM capability areas. This document includes ALL recommendations from every batch.

### Research Coverage

| Batch | Platforms/Areas | Key Patterns |
|-------|-----------------|--------------|
| 1 | HubSpot | Pipeline views, playbooks, sequences |
| 2 | Salesforce | Flow Builder, forecasting, approvals |
| 3 | Notion/Coda | Block architecture, real-time collab |
| 4 | Linear/Jira | Keyboard UX, sync engine, cycles |
| 5 | Intercom/Zendesk | SLAs, collision detection, omnichannel |
| 6 | Rippling/Gusto | HR workflows, compliance approvals |
| 7 | Monday.com/Airtable | Flexible views, formulas, automations |
| 8 | Data Model | Custom objects, validation, dependencies |
| 9 | 360° Timeline | Unified streams, event sourcing |
| 10 | Forecasting | Deal health, stuck detection |
| 11 | Collaboration | Deal rooms, stakeholders, mentions |
| 12 | Reporting & Data Quality | Report builder, deduplication |

---

## PART 1: SUPPORT & SERVICE PATTERNS (Intercom/Zendesk)

### 1.1 SLA Tracking System

**Gap**: Current system lacks explicit SLA metrics and visual indicators.

```javascript
// New model: src/models/sla.model.js
const SLASchema = new Schema({
  name: { type: String, required: true },
  priority: { type: String, enum: ['urgent', 'high', 'normal', 'low'] },
  metrics: {
    firstResponseTime: {
      target: Number, // minutes
      warning: Number,
      breach: Number
    },
    nextResponseTime: {
      target: Number,
      warning: Number,
      breach: Number
    },
    timeToClose: {
      target: Number,
      warning: Number,
      breach: Number
    },
    timeToResolve: {
      target: Number,
      warning: Number,
      breach: Number
    }
  },
  businessHours: {
    enabled: Boolean,
    schedule: [{
      day: Number, // 0-6
      start: String, // "09:00"
      end: String // "17:00"
    }],
    timezone: String,
    holidays: [Date]
  },
  pauseConditions: [String], // 'waiting_on_customer', 'snoozed'
  appliesTo: {
    channels: [String],
    customerTiers: [String],
    issueTypes: [String]
  }
});

// SLA Instance for tracking
const SLAInstanceSchema = new Schema({
  ticketId: { type: ObjectId, ref: 'Case', required: true },
  slaId: { type: ObjectId, ref: 'SLA', required: true },
  startedAt: Date,
  pausedAt: Date,
  totalPausedTime: { type: Number, default: 0 },
  metrics: {
    firstResponse: {
      targetTime: Date,
      actualTime: Date,
      status: { type: String, enum: ['pending', 'met', 'breached'] }
    },
    nextResponse: {
      targetTime: Date,
      actualTime: Date,
      status: String
    },
    resolution: {
      targetTime: Date,
      actualTime: Date,
      status: String
    }
  },
  breachNotificationsSent: [Date]
});
```

```javascript
// New service: src/services/sla.service.js
class SLAService {
  async calculateTargetTime(sla, metric, startTime) {
    if (!sla.businessHours.enabled) {
      return dayjs(startTime).add(sla.metrics[metric].target, 'minutes').toDate();
    }

    // Calculate with business hours
    let remainingMinutes = sla.metrics[metric].target;
    let current = dayjs(startTime);

    while (remainingMinutes > 0) {
      const schedule = this.getScheduleForDay(sla, current.day());
      if (schedule && !this.isHoliday(sla, current)) {
        const workStart = current.hour(parseInt(schedule.start.split(':')[0]))
                                 .minute(parseInt(schedule.start.split(':')[1]));
        const workEnd = current.hour(parseInt(schedule.end.split(':')[0]))
                               .minute(parseInt(schedule.end.split(':')[1]));

        if (current.isBefore(workEnd) && current.isAfter(workStart)) {
          const availableMinutes = workEnd.diff(current, 'minute');
          if (availableMinutes >= remainingMinutes) {
            return current.add(remainingMinutes, 'minute').toDate();
          }
          remainingMinutes -= availableMinutes;
        }
      }
      current = current.add(1, 'day').startOf('day');
    }
    return current.toDate();
  }

  async checkBreaches() {
    const activeInstances = await SLAInstance.find({
      'metrics.firstResponse.status': 'pending'
    });

    for (const instance of activeInstances) {
      const now = new Date();
      for (const [metric, data] of Object.entries(instance.metrics)) {
        if (data.status === 'pending' && data.targetTime < now) {
          data.status = 'breached';
          await this.sendBreachNotification(instance, metric);
        }
      }
      await instance.save();
    }
  }

  getStatusIndicator(instance, metric) {
    const data = instance.metrics[metric];
    if (data.status === 'breached') return { color: 'red', icon: '🔴' };

    const remaining = dayjs(data.targetTime).diff(dayjs(), 'minute');
    const warning = instance.sla.metrics[metric].warning;

    if (remaining <= warning) return { color: 'orange', icon: '🟠' };
    return { color: 'grey', icon: '⚪' };
  }
}
```

### 1.2 Collision Detection

**Gap**: No system to prevent multiple agents working same ticket.

```javascript
// Add to socket handlers: src/sockets/ticketCollision.socket.js
class TicketCollisionHandler {
  constructor(io) {
    this.io = io;
    this.activeViewers = new Map(); // ticketId -> Set of {agentId, status, since}
  }

  onAgentViewTicket(socket, { ticketId, agentId }) {
    if (!this.activeViewers.has(ticketId)) {
      this.activeViewers.set(ticketId, new Set());
    }

    const viewers = this.activeViewers.get(ticketId);
    const existingViewers = Array.from(viewers);

    // Notify existing viewers
    if (existingViewers.length > 0) {
      socket.emit('collision_warning', {
        ticketId,
        message: `${existingViewers.length} other agent(s) viewing this ticket`,
        agents: existingViewers.map(v => v.agentId)
      });

      // Notify others about new viewer
      this.io.to(`ticket:${ticketId}`).emit('agent_joined', {
        agentId,
        ticketId,
        timestamp: new Date()
      });
    }

    viewers.add({ agentId, status: 'viewing', since: new Date() });
    socket.join(`ticket:${ticketId}`);
  }

  onAgentTyping(socket, { ticketId, agentId }) {
    const viewers = this.activeViewers.get(ticketId);
    if (viewers) {
      for (const viewer of viewers) {
        if (viewer.agentId === agentId) {
          viewer.status = 'typing';
        }
      }
    }

    // Alert others - someone is composing a response!
    socket.to(`ticket:${ticketId}`).emit('agent_typing', {
      agentId,
      ticketId,
      message: 'Another agent is composing a response'
    });
  }

  onAgentLeave(socket, { ticketId, agentId }) {
    const viewers = this.activeViewers.get(ticketId);
    if (viewers) {
      for (const viewer of viewers) {
        if (viewer.agentId === agentId) {
          viewers.delete(viewer);
          break;
        }
      }
    }
    socket.leave(`ticket:${ticketId}`);
    this.io.to(`ticket:${ticketId}`).emit('agent_left', { agentId, ticketId });
  }
}
```

### 1.3 Omnichannel Inbox

**Gap**: Channels exist but no unified inbox view.

```javascript
// New model: src/models/conversation.model.js
const ConversationSchema = new Schema({
  contactId: { type: ObjectId, ref: 'Contact', required: true },
  channel: {
    type: String,
    enum: ['email', 'whatsapp', 'sms', 'live_chat', 'instagram', 'facebook', 'twitter'],
    required: true
  },
  channelIdentifier: String, // email address, phone number, etc.
  status: {
    type: String,
    enum: ['open', 'snoozed', 'closed'],
    default: 'open'
  },
  assignedTo: { type: ObjectId, ref: 'User' },
  team: { type: ObjectId, ref: 'Team' },
  priority: { type: String, enum: ['urgent', 'high', 'normal', 'low'] },
  slaInstance: { type: ObjectId, ref: 'SLAInstance' },
  messages: [{
    direction: { type: String, enum: ['inbound', 'outbound'] },
    content: String,
    contentType: { type: String, enum: ['text', 'html', 'attachment'] },
    attachments: [{
      name: String,
      url: String,
      type: String,
      size: Number
    }],
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    sentBy: ObjectId, // User or system
    metadata: Object
  }],
  tags: [String],
  customFields: Map,
  lastMessageAt: Date,
  firstResponseAt: Date,
  snoozeUntil: Date
});

// Unified inbox service
class OmnichannelInboxService {
  async getUnifiedInbox(agentId, filters = {}) {
    const query = { status: 'open' };

    if (filters.assignedTo === 'me') {
      query.assignedTo = agentId;
    } else if (filters.assignedTo === 'unassigned') {
      query.assignedTo = null;
    }

    if (filters.channels?.length) {
      query.channel = { $in: filters.channels };
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    return Conversation.find(query)
      .populate('contactId', 'name email avatar')
      .populate('assignedTo', 'name avatar')
      .sort({ lastMessageAt: -1 })
      .limit(50);
  }

  async routeConversation(conversationId, rules) {
    const conversation = await Conversation.findById(conversationId)
      .populate('contactId');

    for (const rule of rules) {
      if (this.matchesConditions(conversation, rule.conditions)) {
        await this.applyAction(conversation, rule.action);
        break;
      }
    }
  }

  matchesConditions(conversation, conditions) {
    for (const condition of conditions) {
      switch (condition.type) {
        case 'channel':
          if (conversation.channel !== condition.value) return false;
          break;
        case 'customer_tier':
          if (conversation.contactId.tier !== condition.value) return false;
          break;
        case 'language':
          if (conversation.contactId.language !== condition.value) return false;
          break;
        case 'keyword':
          const lastMessage = conversation.messages[conversation.messages.length - 1];
          if (!lastMessage?.content?.includes(condition.value)) return false;
          break;
      }
    }
    return true;
  }
}
```

### 1.4 Macros & Canned Responses

**Gap**: No saved response templates with actions.

```javascript
// New model: src/models/macro.model.js
const MacroSchema = new Schema({
  name: { type: String, required: true },
  category: String, // Use :: for nesting, e.g., "Billing::Refund"
  description: String,
  scope: { type: String, enum: ['personal', 'team', 'global'], default: 'personal' },
  ownerId: ObjectId,
  teamId: ObjectId,

  // Content
  responseTemplate: {
    subject: String, // for emails
    body: String,
    bodyType: { type: String, enum: ['text', 'html'], default: 'text' },
    variables: [String] // {{customer_name}}, {{ticket_id}}, etc.
  },

  // Actions to perform
  actions: [{
    type: {
      type: String,
      enum: ['set_status', 'set_priority', 'assign_to', 'add_tag', 'remove_tag',
             'set_field', 'apply_sla', 'send_notification', 'close']
    },
    value: Schema.Types.Mixed
  }],

  // Metadata
  usageCount: { type: Number, default: 0 },
  lastUsedAt: Date,
  shortcuts: [String], // keyboard shortcuts
  suggestFor: [String] // keywords to trigger suggestion
});

class MacroService {
  async applyMacro(macroId, conversationId, variables = {}) {
    const macro = await Macro.findById(macroId);
    const conversation = await Conversation.findById(conversationId);

    // Apply response template
    if (macro.responseTemplate?.body) {
      const content = this.interpolateVariables(macro.responseTemplate.body, variables);
      conversation.messages.push({
        direction: 'outbound',
        content,
        contentType: macro.responseTemplate.bodyType,
        sentAt: new Date(),
        sentBy: variables.agentId
      });
    }

    // Apply actions
    for (const action of macro.actions) {
      await this.applyAction(conversation, action);
    }

    // Update usage stats
    macro.usageCount++;
    macro.lastUsedAt = new Date();
    await macro.save();

    await conversation.save();
    return conversation;
  }

  async applyAction(conversation, action) {
    switch (action.type) {
      case 'set_status':
        conversation.status = action.value;
        break;
      case 'set_priority':
        conversation.priority = action.value;
        break;
      case 'assign_to':
        conversation.assignedTo = action.value;
        break;
      case 'add_tag':
        if (!conversation.tags.includes(action.value)) {
          conversation.tags.push(action.value);
        }
        break;
      case 'apply_sla':
        await this.applySLA(conversation, action.value);
        break;
      case 'close':
        conversation.status = 'closed';
        break;
    }
  }

  async suggestMacros(conversationId) {
    const conversation = await Conversation.findById(conversationId);
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    if (!lastMessage || lastMessage.direction !== 'inbound') return [];

    const keywords = this.extractKeywords(lastMessage.content);

    return Macro.find({
      suggestFor: { $in: keywords }
    }).sort({ usageCount: -1 }).limit(5);
  }
}
```

---

## PART 2: HR & WORKFLOW PATTERNS (Rippling/Gusto)

### 2.1 Multi-Level Approval Chains

**Gap**: Basic approval exists but no multi-level chains or conditional routing.

```javascript
// Enhanced model: src/models/approvalWorkflow.model.js
const ApprovalWorkflowSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  entityType: String, // 'deal', 'quote', 'expense', 'leave_request'
  triggerConditions: [{
    field: String,
    operator: String,
    value: Schema.Types.Mixed
  }],

  levels: [{
    order: Number,
    name: String,
    approvers: {
      type: { type: String, enum: ['specific', 'role', 'manager', 'dynamic'] },
      userIds: [ObjectId],
      roleId: ObjectId,
      dynamicField: String // e.g., 'department_head'
    },
    approvalType: {
      type: String,
      enum: ['any', 'all', 'majority'],
      default: 'any'
    },
    escalation: {
      enabled: Boolean,
      afterHours: Number,
      escalateTo: ObjectId
    },
    delegation: {
      enabled: Boolean,
      delegateTo: ObjectId,
      validFrom: Date,
      validTo: Date
    },
    skipConditions: [{
      field: String,
      operator: String,
      value: Schema.Types.Mixed
    }]
  }],

  onApproval: [{
    action: String,
    params: Object
  }],
  onRejection: [{
    action: String,
    params: Object
  }],

  slaHours: Number,
  notifyOnPending: Boolean,
  auditRequired: { type: Boolean, default: true }
});

// Approval instance tracking
const ApprovalInstanceSchema = new Schema({
  workflowId: { type: ObjectId, ref: 'ApprovalWorkflow' },
  entityType: String,
  entityId: ObjectId,
  requestedBy: { type: ObjectId, ref: 'User' },
  requestedAt: Date,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  currentLevel: { type: Number, default: 0 },

  levelHistory: [{
    level: Number,
    approvers: [{
      userId: ObjectId,
      decision: { type: String, enum: ['pending', 'approved', 'rejected'] },
      decidedAt: Date,
      comments: String,
      delegatedFrom: ObjectId
    }],
    startedAt: Date,
    completedAt: Date,
    skipped: Boolean,
    skipReason: String
  }],

  completedAt: Date,
  completedBy: ObjectId,
  finalComments: String,

  auditLog: [{
    action: String,
    userId: ObjectId,
    timestamp: Date,
    details: Object,
    ipAddress: String
  }]
});

class ApprovalService {
  async initiateApproval(workflowId, entityType, entityId, requesterId) {
    const workflow = await ApprovalWorkflow.findById(workflowId);

    const instance = await ApprovalInstance.create({
      workflowId,
      entityType,
      entityId,
      requestedBy: requesterId,
      requestedAt: new Date(),
      currentLevel: 0,
      levelHistory: []
    });

    await this.processNextLevel(instance);
    return instance;
  }

  async processNextLevel(instance) {
    const workflow = await ApprovalWorkflow.findById(instance.workflowId);
    const level = workflow.levels[instance.currentLevel];

    if (!level) {
      // All levels complete
      instance.status = 'approved';
      instance.completedAt = new Date();
      await this.executeActions(workflow.onApproval, instance);
      await instance.save();
      return;
    }

    // Check skip conditions
    const entity = await this.getEntity(instance.entityType, instance.entityId);
    if (this.shouldSkipLevel(level, entity)) {
      instance.levelHistory.push({
        level: instance.currentLevel,
        skipped: true,
        skipReason: 'Conditions not met',
        startedAt: new Date(),
        completedAt: new Date()
      });
      instance.currentLevel++;
      await instance.save();
      return this.processNextLevel(instance);
    }

    // Get approvers for this level
    const approvers = await this.resolveApprovers(level, entity);

    instance.levelHistory.push({
      level: instance.currentLevel,
      approvers: approvers.map(id => ({ userId: id, decision: 'pending' })),
      startedAt: new Date()
    });

    await instance.save();

    // Notify approvers
    for (const approverId of approvers) {
      await this.notifyApprover(approverId, instance);
    }

    // Set up escalation if configured
    if (level.escalation?.enabled) {
      await this.scheduleEscalation(instance, level);
    }
  }

  async recordDecision(instanceId, approverId, decision, comments) {
    const instance = await ApprovalInstance.findById(instanceId);
    const workflow = await ApprovalWorkflow.findById(instance.workflowId);
    const level = workflow.levels[instance.currentLevel];
    const currentHistory = instance.levelHistory[instance.levelHistory.length - 1];

    // Record decision
    const approver = currentHistory.approvers.find(a =>
      a.userId.toString() === approverId.toString()
    );
    if (approver) {
      approver.decision = decision;
      approver.decidedAt = new Date();
      approver.comments = comments;
    }

    // Log audit trail
    instance.auditLog.push({
      action: `level_${instance.currentLevel}_${decision}`,
      userId: approverId,
      timestamp: new Date(),
      details: { comments }
    });

    // Check if level is complete
    const decisions = currentHistory.approvers.filter(a => a.decision !== 'pending');
    const approved = decisions.filter(a => a.decision === 'approved').length;
    const rejected = decisions.filter(a => a.decision === 'rejected').length;

    let levelComplete = false;
    let levelApproved = false;

    switch (level.approvalType) {
      case 'any':
        if (approved >= 1) { levelComplete = true; levelApproved = true; }
        if (rejected >= 1) { levelComplete = true; levelApproved = false; }
        break;
      case 'all':
        if (rejected >= 1) { levelComplete = true; levelApproved = false; }
        if (approved === currentHistory.approvers.length) {
          levelComplete = true; levelApproved = true;
        }
        break;
      case 'majority':
        const majority = Math.ceil(currentHistory.approvers.length / 2);
        if (approved >= majority) { levelComplete = true; levelApproved = true; }
        if (rejected >= majority) { levelComplete = true; levelApproved = false; }
        break;
    }

    if (levelComplete) {
      currentHistory.completedAt = new Date();

      if (!levelApproved) {
        instance.status = 'rejected';
        instance.completedAt = new Date();
        await this.executeActions(workflow.onRejection, instance);
      } else {
        instance.currentLevel++;
        await this.processNextLevel(instance);
      }
    }

    await instance.save();
    return instance;
  }
}
```

### 2.2 Employee Lifecycle Workflows

**Gap**: No structured lifecycle management for HR use cases.

```javascript
// New model for HR-style lifecycle
const LifecycleWorkflowSchema = new Schema({
  name: String,
  entityType: String, // 'employee', 'customer', 'deal'
  lifecycleType: {
    type: String,
    enum: ['onboarding', 'active', 'offboarding', 'lifecycle_event']
  },

  stages: [{
    name: String,
    order: Number,
    tasks: [{
      name: String,
      description: String,
      assigneeType: { type: String, enum: ['owner', 'role', 'specific', 'auto'] },
      assigneeId: ObjectId,
      dueOffset: Number, // days from stage start
      required: Boolean,
      automations: [{
        trigger: String,
        action: String,
        params: Object
      }],
      dependencies: [String], // task names that must complete first
      documents: [{
        name: String,
        templateId: ObjectId,
        requiresSignature: Boolean
      }]
    }],
    autoAdvance: Boolean,
    advanceConditions: [{
      field: String,
      operator: String,
      value: Schema.Types.Mixed
    }]
  }],

  notifications: [{
    event: String,
    recipients: [String],
    template: String,
    channels: [String]
  }]
});

class LifecycleService {
  async initiateOnboarding(entityType, entityId, workflowId) {
    const workflow = await LifecycleWorkflow.findById(workflowId);

    const instance = await LifecycleInstance.create({
      workflowId,
      entityType,
      entityId,
      currentStage: 0,
      startedAt: new Date(),
      status: 'in_progress',
      stageHistory: [],
      taskCompletions: []
    });

    await this.activateStage(instance, 0);
    return instance;
  }

  async activateStage(instance, stageIndex) {
    const workflow = await LifecycleWorkflow.findById(instance.workflowId);
    const stage = workflow.stages[stageIndex];

    // Create tasks
    for (const taskDef of stage.tasks) {
      const assignee = await this.resolveAssignee(taskDef, instance);
      const dueDate = dayjs().add(taskDef.dueOffset, 'days').toDate();

      await Task.create({
        name: taskDef.name,
        description: taskDef.description,
        assignedTo: assignee,
        dueDate,
        relatedTo: {
          model: instance.entityType,
          id: instance.entityId
        },
        lifecycleInstanceId: instance._id,
        lifecycleTaskRef: taskDef.name,
        required: taskDef.required
      });

      // Generate documents if needed
      for (const doc of taskDef.documents || []) {
        await this.generateDocument(doc, instance);
      }
    }

    instance.stageHistory.push({
      stage: stageIndex,
      activatedAt: new Date()
    });

    await instance.save();
  }

  async onTaskComplete(taskId) {
    const task = await Task.findById(taskId);
    if (!task.lifecycleInstanceId) return;

    const instance = await LifecycleInstance.findById(task.lifecycleInstanceId);
    const workflow = await LifecycleWorkflow.findById(instance.workflowId);
    const stage = workflow.stages[instance.currentStage];

    // Record completion
    instance.taskCompletions.push({
      taskRef: task.lifecycleTaskRef,
      completedAt: new Date(),
      completedBy: task.completedBy
    });

    // Check if all required tasks complete
    const requiredTasks = stage.tasks.filter(t => t.required).map(t => t.name);
    const completedTasks = instance.taskCompletions.map(t => t.taskRef);
    const allComplete = requiredTasks.every(t => completedTasks.includes(t));

    if (allComplete && stage.autoAdvance) {
      instance.currentStage++;
      if (instance.currentStage < workflow.stages.length) {
        await this.activateStage(instance, instance.currentStage);
      } else {
        instance.status = 'completed';
        instance.completedAt = new Date();
      }
    }

    await instance.save();
  }
}
```

### 2.3 Compliance-Grade Audit Logging

**Gap**: Basic audit exists but needs compliance features.

```javascript
// Enhanced audit for compliance
const ComplianceAuditSchema = new Schema({
  // Core fields
  action: { type: String, required: true },
  entityType: String,
  entityId: ObjectId,
  userId: { type: ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },

  // Compliance fields
  sessionId: String,
  ipAddress: String,
  userAgent: String,
  geoLocation: {
    country: String,
    city: String,
    coordinates: [Number]
  },

  // Change tracking
  previousState: Object,
  newState: Object,
  changedFields: [String],

  // Classification
  sensitivityLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  regulatoryTags: [String], // 'GDPR', 'HIPAA', 'SOC2', 'ZATCA'

  // Integrity
  checksum: String,
  previousLogHash: String,

  // Retention
  retentionCategory: String,
  expiresAt: Date
}, {
  // Make immutable
  strict: true,
  validateBeforeSave: true
});

// Prevent modifications
ComplianceAuditSchema.pre('save', function(next) {
  if (!this.isNew) {
    return next(new Error('Audit logs cannot be modified'));
  }

  // Generate checksum
  const data = JSON.stringify({
    action: this.action,
    entityType: this.entityType,
    entityId: this.entityId,
    userId: this.userId,
    timestamp: this.timestamp,
    previousState: this.previousState,
    newState: this.newState
  });
  this.checksum = crypto.createHash('sha256').update(data).digest('hex');

  next();
});

// Prevent deletions
ComplianceAuditSchema.pre('remove', function(next) {
  return next(new Error('Audit logs cannot be deleted'));
});

class ComplianceAuditService {
  async log(params) {
    const { action, entityType, entityId, userId, previousState, newState, req } = params;

    // Get changed fields
    const changedFields = this.getChangedFields(previousState, newState);

    // Determine sensitivity
    const sensitivityLevel = this.calculateSensitivity(entityType, changedFields);

    // Get previous log hash for chain integrity
    const lastLog = await ComplianceAudit.findOne().sort({ timestamp: -1 });
    const previousLogHash = lastLog?.checksum || 'genesis';

    return ComplianceAudit.create({
      action,
      entityType,
      entityId,
      userId,
      sessionId: req?.session?.id,
      ipAddress: req?.ip,
      userAgent: req?.headers?.['user-agent'],
      geoLocation: await this.getGeoLocation(req?.ip),
      previousState,
      newState,
      changedFields,
      sensitivityLevel,
      regulatoryTags: this.getRegulatoryTags(entityType),
      previousLogHash,
      retentionCategory: this.getRetentionCategory(sensitivityLevel),
      expiresAt: this.calculateExpiration(sensitivityLevel)
    });
  }

  calculateSensitivity(entityType, changedFields) {
    const sensitiveEntities = ['payment', 'invoice', 'salary', 'personal_info'];
    const sensitiveFields = ['salary', 'ssn', 'bank_account', 'password', 'credit_card'];

    if (sensitiveEntities.includes(entityType)) return 'critical';
    if (changedFields.some(f => sensitiveFields.includes(f))) return 'high';
    return 'low';
  }

  getRegulatoryTags(entityType) {
    const tags = [];
    if (['contact', 'lead'].includes(entityType)) tags.push('GDPR');
    if (['invoice', 'payment'].includes(entityType)) tags.push('ZATCA');
    if (['employee', 'salary'].includes(entityType)) tags.push('LABOR_LAW');
    return tags;
  }
}
```

---

## PART 3: FLEXIBLE VIEWS & AUTOMATIONS (Monday.com/Airtable)

### 3.1 Multiple View Types

**Gap**: Limited view options for data visualization.

```javascript
// New model: src/models/view.model.js
const ViewSchema = new Schema({
  name: { type: String, required: true },
  entityType: String, // 'deal', 'contact', 'task', 'project'
  type: {
    type: String,
    enum: ['list', 'kanban', 'calendar', 'timeline', 'gantt', 'gallery',
           'chart', 'map', 'workload', 'pivot'],
    required: true
  },
  scope: { type: String, enum: ['personal', 'team', 'global'] },
  ownerId: ObjectId,
  teamId: ObjectId,

  // Common settings
  columns: [{
    field: String,
    label: String,
    visible: { type: Boolean, default: true },
    width: Number,
    order: Number,
    format: Object
  }],

  filters: [{
    field: String,
    operator: String,
    value: Schema.Types.Mixed,
    isUserInput: Boolean
  }],

  sorting: [{
    field: String,
    direction: { type: String, enum: ['asc', 'desc'] }
  }],

  grouping: [{
    field: String,
    collapsed: Boolean
  }],

  // Type-specific settings
  kanbanSettings: {
    columnField: String,
    cardFields: [String],
    swimlaneField: String,
    colorField: String
  },

  calendarSettings: {
    startDateField: String,
    endDateField: String,
    titleField: String,
    colorField: String,
    defaultView: { type: String, enum: ['day', 'week', 'month'] }
  },

  timelineSettings: {
    startField: String,
    endField: String,
    groupByField: String,
    milestoneField: String
  },

  ganttSettings: {
    startField: String,
    endField: String,
    dependencyField: String,
    progressField: String,
    criticalPathEnabled: Boolean
  },

  gallerySettings: {
    imageField: String,
    titleField: String,
    subtitleField: String,
    cardSize: { type: String, enum: ['small', 'medium', 'large'] }
  },

  chartSettings: {
    chartType: { type: String, enum: ['bar', 'line', 'pie', 'area', 'scatter'] },
    xAxis: String,
    yAxis: String,
    aggregation: String,
    colorScheme: [String]
  }
});

class ViewService {
  async renderView(viewId, params = {}) {
    const view = await View.findById(viewId);
    const Model = mongoose.model(view.entityType);

    let query = this.buildQuery(view, params);
    let data = await Model.find(query);

    switch (view.type) {
      case 'kanban':
        return this.renderKanban(data, view.kanbanSettings);
      case 'calendar':
        return this.renderCalendar(data, view.calendarSettings, params);
      case 'timeline':
        return this.renderTimeline(data, view.timelineSettings);
      case 'gantt':
        return this.renderGantt(data, view.ganttSettings);
      case 'chart':
        return this.renderChart(data, view.chartSettings);
      default:
        return this.renderList(data, view);
    }
  }

  renderKanban(data, settings) {
    const columns = {};

    for (const item of data) {
      const columnValue = item[settings.columnField] || 'Uncategorized';
      if (!columns[columnValue]) {
        columns[columnValue] = [];
      }

      columns[columnValue].push({
        id: item._id,
        title: item[settings.cardFields[0]],
        fields: settings.cardFields.slice(1).map(f => ({
          name: f,
          value: item[f]
        })),
        color: item[settings.colorField],
        swimlane: item[settings.swimlaneField]
      });
    }

    return { type: 'kanban', columns };
  }

  renderGantt(data, settings) {
    const tasks = data.map(item => ({
      id: item._id,
      name: item.name,
      start: item[settings.startField],
      end: item[settings.endField],
      progress: item[settings.progressField] || 0,
      dependencies: item[settings.dependencyField] || []
    }));

    // Calculate critical path if enabled
    let criticalPath = [];
    if (settings.criticalPathEnabled) {
      criticalPath = this.calculateCriticalPath(tasks);
    }

    return { type: 'gantt', tasks, criticalPath };
  }

  calculateCriticalPath(tasks) {
    // Topological sort + longest path algorithm
    const graph = new Map();
    const inDegree = new Map();

    for (const task of tasks) {
      graph.set(task.id, []);
      inDegree.set(task.id, 0);
    }

    for (const task of tasks) {
      for (const dep of task.dependencies) {
        graph.get(dep)?.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
      }
    }

    // Find longest path
    const earliestStart = new Map();
    const queue = [];

    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
        earliestStart.set(id, 0);
      }
    }

    while (queue.length) {
      const current = queue.shift();
      const currentTask = tasks.find(t => t.id === current);
      const currentEnd = earliestStart.get(current) + this.getDuration(currentTask);

      for (const next of graph.get(current) || []) {
        earliestStart.set(next, Math.max(earliestStart.get(next) || 0, currentEnd));
        inDegree.set(next, inDegree.get(next) - 1);
        if (inDegree.get(next) === 0) {
          queue.push(next);
        }
      }
    }

    // Tasks on critical path have no float
    const maxEnd = Math.max(...Array.from(earliestStart.values()));
    return tasks.filter(t => {
      const start = earliestStart.get(t.id);
      const duration = this.getDuration(t);
      return start + duration === maxEnd;
    }).map(t => t.id);
  }
}
```

### 3.2 Formula Columns

**Gap**: No calculated/formula fields.

```javascript
// New schema addition for formula fields
const FormulaFieldSchema = new Schema({
  name: { type: String, required: true },
  entityType: String,
  formula: { type: String, required: true },
  returnType: { type: String, enum: ['number', 'text', 'date', 'boolean'] },
  dependencies: [String], // field names this formula depends on

  // Caching
  cacheEnabled: { type: Boolean, default: true },
  cacheInvalidateOn: [String], // events that invalidate cache

  // Display
  format: {
    decimals: Number,
    prefix: String,
    suffix: String,
    dateFormat: String
  }
});

class FormulaService {
  constructor() {
    this.functions = {
      // Math
      SUM: (...args) => args.reduce((a, b) => a + b, 0),
      AVG: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
      MIN: (...args) => Math.min(...args),
      MAX: (...args) => Math.max(...args),
      ROUND: (n, d = 0) => Math.round(n * 10**d) / 10**d,
      ABS: Math.abs,

      // Text
      CONCAT: (...args) => args.join(''),
      LEFT: (str, n) => str?.substring(0, n),
      RIGHT: (str, n) => str?.substring(str.length - n),
      UPPER: (str) => str?.toUpperCase(),
      LOWER: (str) => str?.toLowerCase(),
      TRIM: (str) => str?.trim(),
      LEN: (str) => str?.length || 0,

      // Date
      TODAY: () => new Date(),
      NOW: () => new Date(),
      DATEDIFF: (d1, d2, unit = 'days') => {
        const diff = dayjs(d2).diff(dayjs(d1), unit);
        return diff;
      },
      DATEADD: (date, amount, unit) => dayjs(date).add(amount, unit).toDate(),
      YEAR: (date) => dayjs(date).year(),
      MONTH: (date) => dayjs(date).month() + 1,
      DAY: (date) => dayjs(date).date(),

      // Logical
      IF: (condition, trueVal, falseVal) => condition ? trueVal : falseVal,
      AND: (...args) => args.every(Boolean),
      OR: (...args) => args.some(Boolean),
      NOT: (val) => !val,
      ISBLANK: (val) => val === null || val === undefined || val === '',

      // Lookup (for linked records)
      LOOKUP: async (linkedField, targetField) => {
        // Implemented in context
      }
    };
  }

  async evaluate(formula, record, entityType) {
    // Parse formula and replace field references
    let expression = formula;

    // Replace field references {fieldName} with actual values
    const fieldPattern = /\{(\w+)\}/g;
    let match;
    while ((match = fieldPattern.exec(formula))) {
      const fieldName = match[1];
      const value = record[fieldName];
      expression = expression.replace(match[0], JSON.stringify(value));
    }

    // Create safe evaluation context
    const context = {
      ...this.functions,
      record
    };

    try {
      // Use safe-eval or similar
      const result = this.safeEval(expression, context);
      return result;
    } catch (err) {
      logger.error('Formula evaluation error', { formula, error: err.message });
      return null;
    }
  }

  async calculateAndCache(formulaField, record) {
    const cacheKey = `formula:${formulaField._id}:${record._id}`;

    if (formulaField.cacheEnabled) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const result = await this.evaluate(formulaField.formula, record, formulaField.entityType);

    if (formulaField.cacheEnabled) {
      await redis.set(cacheKey, JSON.stringify(result), 'EX', 3600);
    }

    return result;
  }

  async invalidateCache(entityType, recordId, changedFields) {
    // Find formulas that depend on changed fields
    const affectedFormulas = await FormulaField.find({
      entityType,
      dependencies: { $in: changedFields }
    });

    for (const formula of affectedFormulas) {
      const cacheKey = `formula:${formula._id}:${recordId}`;
      await redis.del(cacheKey);
    }
  }
}
```

### 3.3 Automation Rules Engine

**Gap**: Workflows exist but need more flexible automation rules.

```javascript
// Enhanced automation: src/models/automation.model.js
const AutomationSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  entityType: String,
  enabled: { type: Boolean, default: true },

  // Trigger
  trigger: {
    type: {
      type: String,
      enum: ['record_created', 'record_updated', 'field_changed', 'time_based',
             'webhook', 'form_submitted', 'status_changed', 'date_arrived']
    },
    conditions: [{
      field: String,
      operator: String,
      value: Schema.Types.Mixed
    }],
    // For time-based
    schedule: {
      type: { type: String, enum: ['interval', 'cron', 'relative'] },
      value: String, // "every 1 hour", "0 9 * * *", "3 days before {due_date}"
      timezone: String
    },
    // For field_changed
    watchFields: [String]
  },

  // Actions (can chain multiple)
  actions: [{
    order: Number,
    type: {
      type: String,
      enum: ['update_record', 'create_record', 'send_email', 'send_notification',
             'create_task', 'update_field', 'call_webhook', 'send_slack',
             'assign_to', 'add_to_campaign', 'create_activity', 'delay']
    },
    config: Object,
    continueOnError: { type: Boolean, default: false }
  }],

  // Rate limiting
  rateLimit: {
    enabled: Boolean,
    maxPerHour: Number,
    maxPerDay: Number
  },

  // Stats
  stats: {
    totalRuns: { type: Number, default: 0 },
    successfulRuns: { type: Number, default: 0 },
    failedRuns: { type: Number, default: 0 },
    lastRun: Date,
    lastError: String
  }
});

class AutomationEngine {
  async processEvent(eventType, entityType, record, changes) {
    const automations = await Automation.find({
      entityType,
      enabled: true,
      'trigger.type': eventType
    });

    for (const automation of automations) {
      if (this.matchesTrigger(automation.trigger, record, changes)) {
        await this.queueAutomation(automation, record);
      }
    }
  }

  matchesTrigger(trigger, record, changes) {
    // Check watch fields for field_changed
    if (trigger.type === 'field_changed') {
      const changedFields = Object.keys(changes || {});
      if (!trigger.watchFields.some(f => changedFields.includes(f))) {
        return false;
      }
    }

    // Check conditions
    for (const condition of trigger.conditions || []) {
      if (!this.evaluateCondition(condition, record)) {
        return false;
      }
    }

    return true;
  }

  async executeAutomation(automation, record) {
    const context = { record, results: [] };

    try {
      for (const action of automation.actions.sort((a, b) => a.order - b.order)) {
        if (action.type === 'delay') {
          await this.scheduleDelayed(automation, action, context);
          return; // Rest will be scheduled
        }

        try {
          const result = await this.executeAction(action, context);
          context.results.push({ action: action.type, success: true, result });
        } catch (err) {
          context.results.push({ action: action.type, success: false, error: err.message });
          if (!action.continueOnError) throw err;
        }
      }

      automation.stats.totalRuns++;
      automation.stats.successfulRuns++;
      automation.stats.lastRun = new Date();
    } catch (err) {
      automation.stats.totalRuns++;
      automation.stats.failedRuns++;
      automation.stats.lastError = err.message;
      logger.error('Automation failed', { automationId: automation._id, error: err });
    }

    await automation.save();
  }

  async executeAction(action, context) {
    switch (action.type) {
      case 'update_record':
        return this.actionUpdateRecord(action.config, context);
      case 'create_record':
        return this.actionCreateRecord(action.config, context);
      case 'send_email':
        return this.actionSendEmail(action.config, context);
      case 'send_notification':
        return this.actionSendNotification(action.config, context);
      case 'create_task':
        return this.actionCreateTask(action.config, context);
      case 'call_webhook':
        return this.actionCallWebhook(action.config, context);
      case 'send_slack':
        return this.actionSendSlack(action.config, context);
      case 'add_to_campaign':
        return this.actionAddToCampaign(action.config, context);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  async actionSendEmail(config, context) {
    const { templateId, to, variables } = config;
    const template = await EmailTemplate.findById(templateId);

    const recipient = this.interpolate(to, context);
    const subject = this.interpolate(template.subject, context);
    const body = this.interpolate(template.body, context);

    return emailService.send({
      to: recipient,
      subject,
      html: body
    });
  }

  async actionCreateTask(config, context) {
    const { name, assignee, dueOffset, priority } = config;

    return Task.create({
      name: this.interpolate(name, context),
      assignedTo: this.resolveAssignee(assignee, context),
      dueDate: dayjs().add(dueOffset, 'days').toDate(),
      priority,
      relatedTo: {
        model: context.record.constructor.modelName,
        id: context.record._id
      },
      createdByAutomation: true
    });
  }

  interpolate(template, context) {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], context);
      return value ?? match;
    });
  }
}
```

---

## PART 4: KEYBOARD-FIRST UX & SYNC (Linear/Jira)

### 4.1 Command Palette (Cmd+K)

**Gap**: No keyboard-first navigation.

```javascript
// Frontend pattern: src/components/CommandPalette.js
const CommandPaletteConfig = {
  // Global shortcuts (work anywhere)
  globalShortcuts: [
    { keys: ['mod+k'], action: 'openCommandPalette', label: 'Open Command Palette' },
    { keys: ['?'], action: 'showShortcuts', label: 'Show Keyboard Shortcuts' },
    { keys: ['mod+/'], action: 'toggleHelp', label: 'Toggle Help' }
  ],

  // Navigation shortcuts (g + key pattern like Gmail/Linear)
  navigationShortcuts: [
    { keys: ['g', 'i'], action: 'goToInbox', label: 'Go to Inbox', icon: 'inbox' },
    { keys: ['g', 'd'], action: 'goToDashboard', label: 'Go to Dashboard', icon: 'dashboard' },
    { keys: ['g', 'l'], action: 'goToLeads', label: 'Go to Leads', icon: 'users' },
    { keys: ['g', 'c'], action: 'goToContacts', label: 'Go to Contacts', icon: 'address-book' },
    { keys: ['g', 'o'], action: 'goToDeals', label: 'Go to Deals', icon: 'handshake' },
    { keys: ['g', 't'], action: 'goToTasks', label: 'Go to Tasks', icon: 'tasks' },
    { keys: ['g', 'r'], action: 'goToReports', label: 'Go to Reports', icon: 'chart' },
    { keys: ['g', 's'], action: 'goToSettings', label: 'Go to Settings', icon: 'cog' }
  ],

  // Action shortcuts
  actionShortcuts: [
    { keys: ['c'], action: 'createNew', label: 'Create New...', icon: 'plus' },
    { keys: ['n', 'l'], action: 'newLead', label: 'New Lead', icon: 'user-plus' },
    { keys: ['n', 'c'], action: 'newContact', label: 'New Contact', icon: 'user-plus' },
    { keys: ['n', 'd'], action: 'newDeal', label: 'New Deal', icon: 'plus-circle' },
    { keys: ['n', 't'], action: 'newTask', label: 'New Task', icon: 'plus-square' },
    { keys: ['/'], action: 'focusSearch', label: 'Search', icon: 'search' },
    { keys: ['mod+s'], action: 'save', label: 'Save', icon: 'save' },
    { keys: ['escape'], action: 'close', label: 'Close / Cancel', icon: 'times' }
  ],

  // Record-level shortcuts (when viewing a record)
  recordShortcuts: [
    { keys: ['e'], action: 'edit', label: 'Edit Record', icon: 'edit' },
    { keys: ['a'], action: 'addActivity', label: 'Log Activity', icon: 'plus' },
    { keys: ['m'], action: 'addNote', label: 'Add Note', icon: 'sticky-note' },
    { keys: ['t'], action: 'addTask', label: 'Create Task', icon: 'tasks' },
    { keys: ['@'], action: 'mention', label: 'Mention Someone', icon: 'at' },
    { keys: ['mod+enter'], action: 'saveAndClose', label: 'Save & Close' },
    { keys: ['j'], action: 'nextRecord', label: 'Next Record', icon: 'arrow-down' },
    { keys: ['k'], action: 'prevRecord', label: 'Previous Record', icon: 'arrow-up' }
  ],

  // Command categories for palette
  commandCategories: [
    { name: 'Navigation', icon: 'compass' },
    { name: 'Create', icon: 'plus' },
    { name: 'Actions', icon: 'bolt' },
    { name: 'Recent', icon: 'clock' },
    { name: 'Saved Searches', icon: 'bookmark' }
  ]
};

// Backend: Store user's recent actions for "Recent" category
const UserActivitySchema = new Schema({
  userId: { type: ObjectId, ref: 'User' },
  recentSearches: [{
    query: String,
    timestamp: Date,
    resultCount: Number
  }],
  recentRecords: [{
    entityType: String,
    entityId: ObjectId,
    entityName: String,
    timestamp: Date
  }],
  recentCommands: [{
    command: String,
    timestamp: Date
  }],
  savedSearches: [{
    name: String,
    query: Object,
    entityType: String
  }]
});

class CommandPaletteService {
  async search(userId, query) {
    const results = {
      commands: [],
      records: [],
      recent: []
    };

    // Search commands
    const allCommands = [
      ...CommandPaletteConfig.navigationShortcuts,
      ...CommandPaletteConfig.actionShortcuts
    ];
    results.commands = allCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);

    // Search records (global search)
    const recordResults = await this.globalSearch(query);
    results.records = recordResults.slice(0, 10);

    // Get recent items
    const userActivity = await UserActivity.findOne({ userId });
    results.recent = userActivity?.recentRecords?.slice(0, 5) || [];

    return results;
  }

  async globalSearch(query) {
    const searchModels = ['Lead', 'Contact', 'Deal', 'Account', 'Task'];
    const results = [];

    for (const modelName of searchModels) {
      const Model = mongoose.model(modelName);
      const items = await Model.find({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { phone: { $regex: query, $options: 'i' } }
        ]
      }).limit(5).lean();

      results.push(...items.map(item => ({
        type: modelName.toLowerCase(),
        id: item._id,
        name: item.name,
        subtitle: item.email || item.phone || item.status
      })));
    }

    return results;
  }

  async trackRecordView(userId, entityType, entityId, entityName) {
    await UserActivity.updateOne(
      { userId },
      {
        $push: {
          recentRecords: {
            $each: [{ entityType, entityId, entityName, timestamp: new Date() }],
            $position: 0,
            $slice: 20
          }
        }
      },
      { upsert: true }
    );
  }
}
```

### 4.2 Offline Support & Background Sync

**Gap**: No offline capability.

```javascript
// Sync Engine: src/services/sync.service.js
class SyncEngine {
  constructor() {
    this.pendingChanges = new Map();
    this.syncStatus = 'synced'; // 'synced', 'syncing', 'offline', 'error'
    this.retryQueue = [];
  }

  // Queue a change for sync
  async queueChange(change) {
    const id = nanoid();
    const entry = {
      id,
      ...change,
      timestamp: new Date(),
      attempts: 0,
      status: 'pending'
    };

    this.pendingChanges.set(id, entry);
    this.emit('change_queued', entry);

    // Try to sync immediately if online
    if (navigator.onLine) {
      await this.syncChange(entry);
    }

    return id;
  }

  // Sync a single change
  async syncChange(entry) {
    try {
      entry.status = 'syncing';
      entry.attempts++;
      this.emit('sync_start', entry);

      const response = await this.sendToServer(entry);

      entry.status = 'synced';
      this.pendingChanges.delete(entry.id);
      this.emit('sync_complete', { entry, response });

      return response;
    } catch (err) {
      entry.status = 'error';
      entry.lastError = err.message;

      if (entry.attempts < 3) {
        this.retryQueue.push(entry);
        this.scheduleRetry(entry);
      } else {
        this.emit('sync_failed', entry);
        this.flagForManualResolution(entry);
      }

      throw err;
    }
  }

  async sendToServer(entry) {
    const { entityType, entityId, operation, data } = entry;

    switch (operation) {
      case 'create':
        return api.post(`/${entityType}`, data);
      case 'update':
        return api.patch(`/${entityType}/${entityId}`, data);
      case 'delete':
        return api.delete(`/${entityType}/${entityId}`);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  scheduleRetry(entry) {
    const delay = Math.pow(2, entry.attempts) * 1000; // Exponential backoff
    setTimeout(() => this.processRetryQueue(), delay);
  }

  async processRetryQueue() {
    for (const entry of [...this.retryQueue]) {
      if (entry.attempts >= 3) {
        this.retryQueue = this.retryQueue.filter(e => e.id !== entry.id);
        continue;
      }

      try {
        await this.syncChange(entry);
        this.retryQueue = this.retryQueue.filter(e => e.id !== entry.id);
      } catch (err) {
        // Will be retried again
      }
    }
  }

  // Get sync status for UI
  getStatus() {
    const pending = this.pendingChanges.size;
    const retrying = this.retryQueue.length;

    return {
      status: this.syncStatus,
      pendingCount: pending,
      retryingCount: retrying,
      message: pending > 0 ? `Syncing ${pending} change(s)...` : 'All changes synced'
    };
  }

  // Handle coming back online
  onOnline() {
    this.syncStatus = 'syncing';
    this.syncAll();
  }

  async syncAll() {
    for (const [id, entry] of this.pendingChanges) {
      if (entry.status === 'pending' || entry.status === 'error') {
        await this.syncChange(entry);
      }
    }
    this.syncStatus = 'synced';
  }
}

// Optimistic Update Service
class OptimisticUpdateService {
  constructor(syncEngine) {
    this.syncEngine = syncEngine;
    this.localCache = new Map();
    this.rollbackStack = [];
  }

  async update(entityType, entityId, changes) {
    const Model = mongoose.model(entityType);
    const original = await Model.findById(entityId).lean();

    // 1. Update local cache immediately
    const updated = { ...original, ...changes };
    this.localCache.set(`${entityType}:${entityId}`, updated);

    // 2. Store rollback info
    this.rollbackStack.push({
      entityType,
      entityId,
      original,
      changes
    });

    // 3. Emit update event (UI updates immediately)
    this.emit('optimistic_update', { entityType, entityId, data: updated });

    // 4. Queue for server sync
    try {
      await this.syncEngine.queueChange({
        entityType,
        entityId,
        operation: 'update',
        data: changes
      });
    } catch (err) {
      // 5. Rollback on failure
      await this.rollback(entityType, entityId);
      throw err;
    }

    return updated;
  }

  async rollback(entityType, entityId) {
    const rollbackInfo = this.rollbackStack.find(
      r => r.entityType === entityType && r.entityId === entityId
    );

    if (rollbackInfo) {
      this.localCache.set(`${entityType}:${entityId}`, rollbackInfo.original);
      this.emit('rollback', { entityType, entityId, data: rollbackInfo.original });
      this.rollbackStack = this.rollbackStack.filter(r => r !== rollbackInfo);
    }
  }

  get(entityType, entityId) {
    return this.localCache.get(`${entityType}:${entityId}`);
  }
}
```

### 4.3 Cycles & Sprint Management

**Gap**: No time-boxed iteration management.

```javascript
// New model: src/models/cycle.model.js
const CycleSchema = new Schema({
  name: String, // "Sprint 23" or auto-generated
  teamId: { type: ObjectId, ref: 'Team' },

  // Timing
  duration: { type: Number, default: 14 }, // days
  startDate: Date,
  endDate: Date,
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming'
  },

  // Configuration
  autoStart: { type: Boolean, default: true },
  autoRollover: { type: Boolean, default: true },
  cooldownDays: { type: Number, default: 0 },

  // Goals
  goals: [{
    description: String,
    completed: Boolean
  }],

  // Metrics (calculated)
  metrics: {
    plannedItems: Number,
    completedItems: Number,
    addedMidCycle: Number,
    rolledOver: Number,
    velocity: Number
  }
});

class CycleService {
  async createCycle(teamId, config = {}) {
    const team = await Team.findById(teamId);
    const lastCycle = await Cycle.findOne({ teamId }).sort({ endDate: -1 });

    let startDate;
    if (lastCycle) {
      startDate = dayjs(lastCycle.endDate).add(config.cooldownDays || 0, 'days').toDate();
    } else {
      startDate = new Date();
    }

    const duration = config.duration || team.defaultCycleDuration || 14;
    const endDate = dayjs(startDate).add(duration, 'days').toDate();

    // Generate name
    const cycleCount = await Cycle.countDocuments({ teamId }) + 1;
    const name = config.name || `Sprint ${cycleCount}`;

    return Cycle.create({
      name,
      teamId,
      duration,
      startDate,
      endDate,
      autoStart: config.autoStart ?? true,
      autoRollover: config.autoRollover ?? true,
      cooldownDays: config.cooldownDays || 0
    });
  }

  async startCycle(cycleId) {
    const cycle = await Cycle.findById(cycleId);

    // Count planned items
    const plannedItems = await Task.countDocuments({
      cycleId,
      createdAt: { $lte: cycle.startDate }
    });

    cycle.status = 'active';
    cycle.metrics.plannedItems = plannedItems;
    await cycle.save();

    return cycle;
  }

  async completeCycle(cycleId) {
    const cycle = await Cycle.findById(cycleId);

    // Calculate metrics
    const tasks = await Task.find({ cycleId });
    const completed = tasks.filter(t => t.status === 'completed').length;
    const addedMidCycle = tasks.filter(t =>
      t.createdAt > cycle.startDate
    ).length;

    cycle.status = 'completed';
    cycle.metrics.completedItems = completed;
    cycle.metrics.addedMidCycle = addedMidCycle;
    cycle.metrics.velocity = completed;

    // Handle rollover
    if (cycle.autoRollover) {
      const incompleteTasks = tasks.filter(t => t.status !== 'completed');
      const nextCycle = await this.getOrCreateNextCycle(cycle);

      for (const task of incompleteTasks) {
        task.cycleId = nextCycle._id;
        task.rolledOverFrom = cycleId;
        await task.save();
      }

      cycle.metrics.rolledOver = incompleteTasks.length;
      nextCycle.metrics.plannedItems = incompleteTasks.length;
      await nextCycle.save();
    }

    await cycle.save();

    // Auto-create next cycle if configured
    if (cycle.autoStart) {
      await this.createCycle(cycle.teamId, {
        cooldownDays: cycle.cooldownDays
      });
    }

    return cycle;
  }

  async getCycleProgress(cycleId) {
    const cycle = await Cycle.findById(cycleId);
    const tasks = await Task.find({ cycleId });

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;

    const daysTotal = cycle.duration;
    const daysElapsed = dayjs().diff(dayjs(cycle.startDate), 'days');
    const daysRemaining = Math.max(0, daysTotal - daysElapsed);

    // Burndown data
    const burndown = await this.calculateBurndown(cycleId, cycle.startDate, cycle.endDate);

    return {
      cycle,
      tasks: { total, completed, inProgress, remaining: total - completed },
      time: { daysTotal, daysElapsed, daysRemaining },
      burndown,
      onTrack: (completed / total) >= (daysElapsed / daysTotal)
    };
  }

  async calculateBurndown(cycleId, startDate, endDate) {
    const points = [];
    const tasks = await Task.find({ cycleId });
    const total = tasks.length;

    let current = dayjs(startDate);
    const end = dayjs(endDate);

    while (current.isBefore(end) || current.isSame(end, 'day')) {
      const completedByDate = tasks.filter(t =>
        t.completedAt && dayjs(t.completedAt).isBefore(current.endOf('day'))
      ).length;

      points.push({
        date: current.format('YYYY-MM-DD'),
        remaining: total - completedByDate,
        ideal: total * (1 - current.diff(startDate, 'days') / end.diff(startDate, 'days'))
      });

      current = current.add(1, 'day');
    }

    return points;
  }
}
```

---

## PART 5: ENHANCED DATA MODEL (Custom Objects/Fields)

### 5.1 Formula Fields

**Gap**: No calculated/formula field support.

```javascript
// Add to base schema mixin
const FormulaFieldMixin = {
  formulaFields: [{
    name: { type: String, required: true },
    formula: { type: String, required: true },
    returnType: {
      type: String,
      enum: ['number', 'text', 'date', 'boolean', 'currency'],
      required: true
    },
    dependencies: [String],
    precision: Number,
    currencyCode: String,
    dateFormat: String,

    // Caching
    cacheEnabled: { type: Boolean, default: true },
    cachedValue: Schema.Types.Mixed,
    cachedAt: Date,
    cacheTTL: { type: Number, default: 3600 } // seconds
  }]
};

// Virtual getter for formula fields
function applyFormulaVirtuals(schema) {
  schema.virtual('computedFields').get(async function() {
    const results = {};
    for (const field of this.formulaFields || []) {
      results[field.name] = await formulaService.evaluate(field.formula, this);
    }
    return results;
  });
}
```

### 5.2 Field Dependency Tracking

**Gap**: No visibility into field dependencies.

```javascript
// Field dependency tracker
const FieldDependencySchema = new Schema({
  entityType: { type: String, required: true },
  fieldName: { type: String, required: true },

  // What this field depends on
  dependsOn: [{
    fieldName: String,
    entityType: String, // for cross-object dependencies
    relationshipPath: String // e.g., "contact.account.industry"
  }],

  // What depends on this field
  usedBy: [{
    type: { type: String, enum: ['formula', 'validation', 'workflow', 'report'] },
    referenceId: ObjectId,
    referenceName: String
  }],

  // Deletion protection
  canDelete: { type: Boolean, default: true },
  deleteBlockedBy: [String]
});

class FieldDependencyService {
  async analyzeFormula(formula, entityType) {
    const dependencies = [];
    const fieldPattern = /\{(\w+(?:\.\w+)*)\}/g;
    let match;

    while ((match = fieldPattern.exec(formula))) {
      const path = match[1];
      const parts = path.split('.');

      if (parts.length === 1) {
        dependencies.push({ fieldName: parts[0], entityType });
      } else {
        dependencies.push({
          fieldName: parts[parts.length - 1],
          entityType: await this.resolveEntityType(entityType, parts.slice(0, -1)),
          relationshipPath: path
        });
      }
    }

    return dependencies;
  }

  async updateDependencies(entityType, fieldName, formula) {
    const dependencies = await this.analyzeFormula(formula, entityType);

    await FieldDependency.findOneAndUpdate(
      { entityType, fieldName },
      {
        $set: { dependsOn: dependencies },
        $setOnInsert: { usedBy: [] }
      },
      { upsert: true }
    );

    // Update reverse dependencies
    for (const dep of dependencies) {
      await FieldDependency.findOneAndUpdate(
        { entityType: dep.entityType, fieldName: dep.fieldName },
        {
          $addToSet: {
            usedBy: {
              type: 'formula',
              referenceId: null,
              referenceName: `${entityType}.${fieldName}`
            }
          }
        },
        { upsert: true }
      );
    }
  }

  async canDeleteField(entityType, fieldName) {
    const dep = await FieldDependency.findOne({ entityType, fieldName });

    if (!dep || dep.usedBy.length === 0) {
      return { canDelete: true, blockedBy: [] };
    }

    return {
      canDelete: false,
      blockedBy: dep.usedBy.map(u => `${u.type}: ${u.referenceName}`)
    };
  }

  async getImpactAnalysis(entityType, fieldName) {
    const dep = await FieldDependency.findOne({ entityType, fieldName });
    const impact = {
      directDependents: dep?.usedBy || [],
      indirectDependents: [],
      totalAffected: 0
    };

    // Find indirect dependencies recursively
    const visited = new Set();
    const queue = [...(dep?.usedBy || [])];

    while (queue.length) {
      const current = queue.shift();
      const key = `${current.entityType}:${current.referenceName}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const childDep = await FieldDependency.findOne({
        entityType: current.entityType,
        fieldName: current.referenceName?.split('.').pop()
      });

      if (childDep?.usedBy?.length) {
        impact.indirectDependents.push(...childDep.usedBy);
        queue.push(...childDep.usedBy);
      }
    }

    impact.totalAffected = impact.directDependents.length + impact.indirectDependents.length;
    return impact;
  }
}
```

---

## PART 6: 360° CUSTOMER TIMELINE

### 6.1 Unified Timeline API

**Gap**: Activities scattered across collections.

```javascript
// New service: src/services/unifiedTimeline.service.js
class UnifiedTimelineService {
  constructor() {
    this.sources = [
      { model: 'Activity', mapper: this.mapActivity },
      { model: 'CRMActivity', mapper: this.mapCRMActivity },
      { model: 'EmailEvent', mapper: this.mapEmail },
      { model: 'WhatsAppMessage', mapper: this.mapWhatsApp },
      { model: 'Case', mapper: this.mapCase },
      { model: 'Invoice', mapper: this.mapInvoice },
      { model: 'Note', mapper: this.mapNote },
      { model: 'Task', mapper: this.mapTask }
    ];
  }

  async getTimeline(entityType, entityId, options = {}) {
    const {
      limit = 50,
      cursor = null,
      filters = {},
      includeTypes = null,
      excludeTypes = null
    } = options;

    const results = [];
    const cursorDate = cursor ? new Date(cursor) : new Date();

    for (const source of this.sources) {
      if (includeTypes && !includeTypes.includes(source.model)) continue;
      if (excludeTypes?.includes(source.model)) continue;

      const Model = mongoose.model(source.model);
      const query = this.buildQuery(source.model, entityType, entityId, cursorDate, filters);

      const items = await Model.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      results.push(...items.map(item => source.mapper.call(this, item)));
    }

    // Sort all results by timestamp
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply limit
    const limited = results.slice(0, limit);
    const nextCursor = limited.length === limit
      ? limited[limited.length - 1].timestamp
      : null;

    return {
      items: limited,
      nextCursor,
      hasMore: results.length > limit
    };
  }

  buildQuery(model, entityType, entityId, cursorDate, filters) {
    const query = { createdAt: { $lt: cursorDate } };

    // Handle polymorphic references
    switch (model) {
      case 'Activity':
        query.res_model = entityType;
        query.res_id = entityId;
        break;
      case 'CRMActivity':
        query[`${entityType}Id`] = entityId;
        break;
      case 'EmailEvent':
      case 'WhatsAppMessage':
        query.contactId = entityId;
        break;
      case 'Case':
        query.$or = [
          { contactId: entityId },
          { accountId: entityId }
        ];
        break;
      case 'Invoice':
        query.customerId = entityId;
        break;
    }

    // Apply additional filters
    if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    if (filters.userId) query.userId = filters.userId;

    return query;
  }

  mapActivity(item) {
    return {
      id: item._id,
      type: 'activity',
      subtype: item.activity_type,
      timestamp: item.createdAt,
      title: item.summary,
      description: item.note,
      user: item.user,
      icon: this.getActivityIcon(item.activity_type),
      metadata: {
        dueDate: item.date_deadline,
        completed: item.done
      }
    };
  }

  mapEmail(item) {
    return {
      id: item._id,
      type: 'email',
      subtype: item.direction,
      timestamp: item.timestamp,
      title: item.subject,
      description: item.preview,
      user: item.userId,
      icon: 'envelope',
      metadata: {
        opened: item.openedAt,
        clicked: item.clickedAt,
        replied: item.repliedAt
      }
    };
  }

  mapCase(item) {
    return {
      id: item._id,
      type: 'ticket',
      subtype: item.type,
      timestamp: item.createdAt,
      title: item.subject,
      description: item.description,
      user: item.assignedTo,
      icon: 'ticket',
      metadata: {
        status: item.status,
        priority: item.priority,
        resolvedAt: item.resolvedAt
      }
    };
  }

  mapInvoice(item) {
    return {
      id: item._id,
      type: 'invoice',
      subtype: item.status,
      timestamp: item.createdAt,
      title: `Invoice #${item.invoiceNumber}`,
      description: `${item.currency} ${item.total}`,
      user: item.createdBy,
      icon: 'file-invoice',
      metadata: {
        amount: item.total,
        dueDate: item.dueDate,
        paidAt: item.paidAt
      }
    };
  }

  getActivityIcon(type) {
    const icons = {
      call: 'phone',
      meeting: 'calendar',
      email: 'envelope',
      task: 'check-square',
      note: 'sticky-note',
      demo: 'presentation'
    };
    return icons[type] || 'circle';
  }
}
```

### 6.2 Real-Time Timeline Updates

**Gap**: No live updates to timeline.

```javascript
// WebSocket handler for timeline
class TimelineSocketHandler {
  constructor(io) {
    this.io = io;
  }

  // Subscribe to timeline updates
  subscribeToTimeline(socket, { entityType, entityId }) {
    const room = `timeline:${entityType}:${entityId}`;
    socket.join(room);
  }

  // Broadcast new activity
  async broadcastActivity(entityType, entityId, activity) {
    const room = `timeline:${entityType}:${entityId}`;
    const timelineItem = await this.formatForTimeline(activity);

    this.io.to(room).emit('timeline_update', {
      action: 'add',
      item: timelineItem
    });
  }

  // Broadcast activity update
  async broadcastActivityUpdate(entityType, entityId, activity) {
    const room = `timeline:${entityType}:${entityId}`;
    const timelineItem = await this.formatForTimeline(activity);

    this.io.to(room).emit('timeline_update', {
      action: 'update',
      item: timelineItem
    });
  }

  // Broadcast activity deletion
  broadcastActivityDelete(entityType, entityId, activityId) {
    const room = `timeline:${entityType}:${entityId}`;

    this.io.to(room).emit('timeline_update', {
      action: 'delete',
      itemId: activityId
    });
  }
}

// Hook into activity creation
activitySchema.post('save', async function(doc) {
  if (doc.isNew) {
    await timelineSocketHandler.broadcastActivity(
      doc.res_model,
      doc.res_id,
      doc
    );
  } else {
    await timelineSocketHandler.broadcastActivityUpdate(
      doc.res_model,
      doc.res_id,
      doc
    );
  }
});
```

---

## PART 7: REVENUE FORECASTING & PIPELINE

### 7.1 Forecast Categories

```javascript
// Add to Deal model
forecastCategory: {
  type: String,
  enum: ['pipeline', 'best_case', 'commit', 'closed_won', 'omitted'],
  default: 'pipeline'
},
forecastCategoryAuto: { type: Boolean, default: true },
forecastOverrideReason: String,
forecastOverrideBy: ObjectId,
forecastOverrideAt: Date
```

### 7.2 Deal Health Scoring

```javascript
class DealHealthService {
  async calculateScore(deal) {
    const weights = {
      activityRecency: 0.25,
      engagementVelocity: 0.20,
      stageProgression: 0.20,
      stakeholderCoverage: 0.15,
      nextStepClarity: 0.10,
      competitorRisk: 0.10
    };

    const scores = {
      activityRecency: await this.scoreActivityRecency(deal),
      engagementVelocity: await this.scoreEngagementVelocity(deal),
      stageProgression: this.scoreStageProgression(deal),
      stakeholderCoverage: this.scoreStakeholderCoverage(deal),
      nextStepClarity: this.scoreNextSteps(deal),
      competitorRisk: this.scoreCompetitorRisk(deal)
    };

    const totalScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (scores[key] * weight * 100);
    }, 0);

    return {
      score: Math.round(totalScore),
      grade: this.getGrade(totalScore),
      factors: scores,
      recommendations: this.getRecommendations(scores)
    };
  }

  async scoreActivityRecency(deal) {
    const lastActivity = await Activity.findOne({
      res_model: 'deal',
      res_id: deal._id
    }).sort({ createdAt: -1 });

    if (!lastActivity) return 0;

    const daysSince = dayjs().diff(dayjs(lastActivity.createdAt), 'days');
    if (daysSince <= 3) return 1.0;
    if (daysSince <= 7) return 0.8;
    if (daysSince <= 14) return 0.6;
    if (daysSince <= 30) return 0.3;
    return 0.1;
  }

  scoreStakeholderCoverage(deal) {
    const stakeholders = deal.stakeholders || [];
    const roles = stakeholders.map(s => s.role);

    let score = 0;
    if (roles.includes('champion')) score += 0.3;
    if (roles.includes('decision_maker')) score += 0.3;
    if (roles.includes('economic_buyer')) score += 0.25;
    if (roles.includes('influencer')) score += 0.15;

    return Math.min(1, score);
  }

  getRecommendations(scores) {
    const recommendations = [];

    if (scores.activityRecency < 0.5) {
      recommendations.push({
        priority: 'high',
        message: 'No recent activity - schedule a follow-up call or email'
      });
    }

    if (scores.stakeholderCoverage < 0.5) {
      recommendations.push({
        priority: 'medium',
        message: 'Identify and engage decision maker and economic buyer'
      });
    }

    if (scores.nextStepClarity < 0.5) {
      recommendations.push({
        priority: 'high',
        message: 'Define clear next steps with specific dates'
      });
    }

    return recommendations;
  }
}
```

### 7.3 Stuck Deal Detection

```javascript
// Cron job: src/jobs/stuckDealDetection.job.js
class StuckDealDetectionJob {
  async run() {
    const stuckDeals = await Deal.aggregate([
      {
        $match: {
          status: 'open',
          stageChangedAt: { $lt: dayjs().subtract(30, 'days').toDate() }
        }
      },
      {
        $lookup: {
          from: 'activities',
          let: { dealId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$res_model', 'deal'] },
                    { $eq: ['$res_id', '$$dealId'] }
                  ]
                }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'lastActivity'
        }
      },
      {
        $match: {
          $or: [
            { lastActivity: { $size: 0 } },
            {
              'lastActivity.0.createdAt': {
                $lt: dayjs().subtract(14, 'days').toDate()
              }
            }
          ]
        }
      }
    ]);

    for (const deal of stuckDeals) {
      await this.createStuckAlert(deal);
      await this.updateDealHealth(deal._id, 'stuck');
    }

    return { processed: stuckDeals.length };
  }

  async createStuckAlert(deal) {
    await Notification.create({
      userId: deal.assignedTo,
      type: 'stuck_deal_alert',
      priority: 'high',
      title: 'Deal Needs Attention',
      message: `"${deal.name}" has been stuck in ${deal.stageName} for 30+ days with no recent activity`,
      link: `/deals/${deal._id}`,
      metadata: {
        dealId: deal._id,
        daysSinceStageChange: dayjs().diff(deal.stageChangedAt, 'days'),
        dealValue: deal.value
      }
    });
  }
}
```

---

## PART 8: COLLABORATION & DEAL ROOMS

### 8.1 Deal Room Model

```javascript
const DealRoomSchema = new Schema({
  dealId: { type: ObjectId, ref: 'Deal', required: true },
  name: String,

  pages: [{
    id: { type: String, default: () => nanoid() },
    title: String,
    content: Object, // Block-based content
    createdBy: ObjectId,
    updatedAt: Date,
    version: Number
  }],

  documents: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedBy: ObjectId,
    uploadedAt: Date,
    viewedBy: [{ userId: ObjectId, viewedAt: Date }]
  }],

  externalAccess: [{
    email: String,
    name: String,
    company: String,
    accessToken: String,
    permissions: [String],
    expiresAt: Date,
    lastAccessedAt: Date
  }],

  activity: [{
    type: String,
    userId: ObjectId,
    timestamp: Date,
    details: Object
  }]
});
```

### 8.2 Stakeholder Mapping

```javascript
// Add to Deal model
stakeholders: [{
  contactId: { type: ObjectId, ref: 'Contact' },
  role: {
    type: String,
    enum: ['champion', 'decision_maker', 'influencer', 'user',
           'blocker', 'economic_buyer', 'technical_buyer', 'coach']
  },
  influence: { type: Number, min: 1, max: 10 },
  sentiment: {
    type: String,
    enum: ['strongly_positive', 'positive', 'neutral', 'negative', 'strongly_negative', 'unknown']
  },
  engagementScore: Number,
  lastEngagement: Date,
  notes: String,
  addedAt: Date,
  addedBy: ObjectId
}]
```

---

## PART 9: REPORTING & BI

### 9.1 Self-Serve Report Builder

```javascript
const ReportDefinitionSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['table', 'chart', 'pivot', 'funnel', 'cohort', 'dashboard']
  },

  dataSources: [{
    model: String,
    alias: String,
    joins: [{
      targetModel: String,
      sourceField: String,
      targetField: String,
      type: { type: String, enum: ['inner', 'left', 'right'] }
    }]
  }],

  columns: [{
    field: String,
    label: String,
    aggregate: { type: String, enum: ['sum', 'avg', 'count', 'min', 'max', 'none'] },
    format: {
      type: String,
      decimals: Number,
      prefix: String,
      suffix: String
    }
  }],

  filters: [{
    field: String,
    operator: String,
    value: Schema.Types.Mixed,
    userInput: { type: Boolean, default: false }
  }],

  groupBy: [String],

  visualization: {
    chartType: String,
    xAxis: String,
    yAxis: String,
    colors: [String]
  },

  schedule: {
    enabled: Boolean,
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    recipients: [String],
    format: { type: String, enum: ['pdf', 'excel', 'csv'] }
  }
});
```

---

## PART 10: DATA QUALITY

### 10.1 Deduplication Service

```javascript
class DeduplicationService {
  jaroWinkler(s1, s2) {
    if (!s1 || !s2) return 0;
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    let m = 0, t = 0;
    const s1Matched = new Array(s1.length).fill(false);
    const s2Matched = new Array(s2.length).fill(false);

    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);

      for (let j = start; j < end; j++) {
        if (s2Matched[j] || s1[i] !== s2[j]) continue;
        s1Matched[i] = s2Matched[j] = true;
        m++;
        break;
      }
    }

    if (m === 0) return 0;

    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matched[i]) continue;
      while (!s2Matched[k]) k++;
      if (s1[i] !== s2[k]) t++;
      k++;
    }

    const jaro = (m/s1.length + m/s2.length + (m - t/2)/m) / 3;
    let prefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + (prefix * 0.1 * (1 - jaro));
  }

  async findDuplicates(contact, threshold = 0.88) {
    const domain = contact.email?.split('@')[1];
    const candidates = await Contact.find({
      $or: [
        { email: { $regex: domain, $options: 'i' } },
        { phone: contact.phone }
      ],
      _id: { $ne: contact._id }
    });

    return candidates
      .map(c => ({
        ...c.toObject(),
        matchScore: this.calculateMatchScore(contact, c)
      }))
      .filter(c => c.matchScore >= threshold)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  calculateMatchScore(c1, c2) {
    const weights = { name: 0.35, email: 0.30, phone: 0.20, company: 0.15 };
    let score = 0;

    if (c1.name && c2.name) {
      score += this.jaroWinkler(c1.name, c2.name) * weights.name;
    }
    if (c1.email && c2.email) {
      score += (c1.email.toLowerCase() === c2.email.toLowerCase() ? 1 : 0) * weights.email;
    }
    if (c1.phone && c2.phone) {
      const p1 = c1.phone.replace(/\D/g, '');
      const p2 = c2.phone.replace(/\D/g, '');
      score += (p1 === p2 ? 1 : 0) * weights.phone;
    }
    if (c1.company && c2.company) {
      score += this.jaroWinkler(c1.company, c2.company) * weights.company;
    }

    return score;
  }
}
```

### 10.2 Enrichment Service

```javascript
class EnrichmentService {
  constructor() {
    this.providers = {
      clearbit: new ClearbitProvider(config.clearbit),
      zoominfo: new ZoomInfoProvider(config.zoominfo)
    };
  }

  async enrichContact(contact) {
    const enriched = {};

    for (const [name, provider] of Object.entries(this.providers)) {
      try {
        const data = await provider.enrich(contact.email);
        if (data && data.confidence > 0.7) {
          enriched[name] = data;
        }
      } catch (err) {
        logger.warn(`Enrichment failed for ${name}`, err);
      }
    }

    return this.mergeEnrichmentData(contact, enriched);
  }
}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
| Task | Priority | Source Batch |
|------|----------|--------------|
| Forecast categories | High | Salesforce/HubSpot |
| Deal health scoring | High | Salesforce |
| SLA tracking system | High | Intercom/Zendesk |
| Deduplication service | High | Data Quality |

### Phase 2: Intelligence (Weeks 5-8)
| Task | Priority | Source Batch |
|------|----------|--------------|
| Report builder schema | High | Monday.com/Airtable |
| Formula columns | High | Airtable |
| Automation rules engine | High | Monday.com |
| Unified timeline API | High | 360° Timeline |

### Phase 3: Collaboration (Weeks 9-12)
| Task | Priority | Source Batch |
|------|----------|--------------|
| Deal rooms | Medium | Notion/Coda |
| Stakeholder mapping | Medium | HubSpot/Salesforce |
| Collision detection | Medium | Intercom/Zendesk |
| Multi-level approvals | Medium | Rippling/Gusto |

### Phase 4: UX Excellence (Weeks 13-16)
| Task | Priority | Source Batch |
|------|----------|--------------|
| Command palette | Medium | Linear |
| Flexible views | Medium | Monday.com/Airtable |
| Offline sync | Medium | Linear |
| Macros/canned responses | Medium | Intercom/Zendesk |

### Phase 5: Advanced (Weeks 17-20)
| Task | Priority | Source Batch |
|------|----------|--------------|
| Lifecycle workflows | Low | Rippling/Gusto |
| Compliance audit | Low | Rippling/Gusto |
| Gantt/Timeline views | Low | Monday.com |
| Cycle/Sprint management | Low | Linear/Jira |

---

## Summary: All 12 Batches Covered

| # | Batch | Key Recommendations |
|---|-------|---------------------|
| 1 | HubSpot | Playbooks, sequences, forecast categories |
| 2 | Salesforce | Flow builder, Einstein patterns, deal inspection |
| 3 | Notion/Coda | Block architecture, real-time collaboration |
| 4 | Linear | Command palette, offline sync, optimistic updates |
| 5 | Jira | Team-managed boards, simplified workflows |
| 6 | Intercom | SLAs, macros, conversation routing |
| 7 | Zendesk | Collision detection, triggers, automations |
| 8 | Rippling | Multi-level approvals, compliance audit |
| 9 | Gusto | Lifecycle workflows, HR automation |
| 10 | Monday.com | 27+ views, formula columns, automations |
| 11 | Airtable | Linked records, interfaces, AI cobuilder |
| 12 | Gap Analysis | Timeline, forecasting, collaboration, data quality |

---

*Generated: December 2024*
*Research: 30+ parallel agents across 12 batches*
*Total recommendations: 50+ feature additions*
*Lines of code samples: 2,000+*
