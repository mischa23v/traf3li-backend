# Socket Handler Integration Examples

This document provides examples of how to integrate the ticket collision and timeline socket handlers into your services.

## Ticket Collision Detection Integration

### Example 1: Integrate into Conversation Service

Add collision detection to the omnichannelInbox service to prevent multiple agents from working on the same conversation:

```javascript
// In src/services/omnichannelInbox.service.js

const { getTicketCollisionHandler } = require('../configs/socket');

class OmnichannelInboxService {
  // ... existing methods ...

  /**
   * Check if other agents are currently viewing/working on this conversation
   * @param {String} conversationId - Conversation ID
   * @returns {Array} List of agents currently viewing
   */
  async getConversationViewers(conversationId) {
    const collisionHandler = getTicketCollisionHandler();
    if (!collisionHandler) {
      return [];
    }

    return collisionHandler.getViewers(conversationId);
  }

  /**
   * Check if there's a collision risk for this conversation
   * @param {String} conversationId - Conversation ID
   * @returns {Boolean} True if multiple agents are viewing
   */
  async hasCollisionRisk(conversationId) {
    const viewers = await this.getConversationViewers(conversationId);
    return viewers.length > 1 || viewers.some(v => v.status === 'typing');
  }
}
```

### Example 2: Add to Case Service

```javascript
// In src/services/case.service.js

const { getTicketCollisionHandler } = require('../configs/socket');

class CaseService {
  async getCaseWithCollisionInfo(caseId, userId) {
    const caseData = await Case.findById(caseId);

    // Get collision information
    const collisionHandler = getTicketCollisionHandler();
    const viewers = collisionHandler ? collisionHandler.getViewers(caseId) : [];

    return {
      ...caseData.toObject(),
      _collision: {
        hasOtherViewers: viewers.filter(v => v.agentId !== userId).length > 0,
        viewers: viewers
      }
    };
  }
}
```

## Timeline Socket Handler Integration

### Example 1: Broadcast Timeline Updates from CRM Activity Service

```javascript
// In src/services/crmActivity.service.js

const { getTimelineHandler } = require('../configs/socket');

class CrmActivityService {
  async createActivity(activityData) {
    // Create the activity
    const activity = await CrmActivity.create(activityData);

    // Broadcast to timeline subscribers
    const timelineHandler = getTimelineHandler();
    if (timelineHandler && activity.relatedTo) {
      const { entityType, entityId } = activity.relatedTo;

      timelineHandler.broadcastNewItem(entityType, entityId, {
        id: activity._id,
        type: 'activity',
        activityType: activity.type,
        title: activity.title,
        description: activity.description,
        timestamp: activity.createdAt,
        user: activity.createdBy
      });
    }

    return activity;
  }

  async updateActivity(activityId, updates) {
    const activity = await CrmActivity.findByIdAndUpdate(
      activityId,
      updates,
      { new: true }
    );

    // Broadcast update to timeline subscribers
    const timelineHandler = getTimelineHandler();
    if (timelineHandler && activity.relatedTo) {
      const { entityType, entityId } = activity.relatedTo;

      timelineHandler.broadcastItemUpdate(
        entityType,
        entityId,
        activityId,
        updates
      );
    }

    return activity;
  }

  async deleteActivity(activityId) {
    const activity = await CrmActivity.findById(activityId);

    if (!activity) {
      throw new Error('Activity not found');
    }

    await activity.remove();

    // Broadcast deletion to timeline subscribers
    const timelineHandler = getTimelineHandler();
    if (timelineHandler && activity.relatedTo) {
      const { entityType, entityId } = activity.relatedTo;

      timelineHandler.broadcastItemDelete(
        entityType,
        entityId,
        activityId
      );
    }
  }
}
```

### Example 2: Broadcast Timeline Updates from Case Service

```javascript
// In src/services/case.service.js

const { getTimelineHandler } = require('../configs/socket');

class CaseService {
  async createCase(caseData) {
    const newCase = await Case.create(caseData);

    // Broadcast to client timeline if case is linked to client
    const timelineHandler = getTimelineHandler();
    if (timelineHandler && newCase.clientId) {
      timelineHandler.broadcastNewItem('client', newCase.clientId.toString(), {
        id: newCase._id,
        type: 'case',
        title: newCase.title,
        caseNumber: newCase.caseNumber,
        status: newCase.status,
        timestamp: newCase.createdAt
      });
    }

    return newCase;
  }

  async updateCaseStatus(caseId, status, userId) {
    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      { status, updatedBy: userId },
      { new: true }
    );

    // Broadcast status change to timeline
    const timelineHandler = getTimelineHandler();
    if (timelineHandler && updatedCase.clientId) {
      timelineHandler.broadcastItemUpdate(
        'client',
        updatedCase.clientId.toString(),
        caseId,
        { status, updatedAt: new Date() }
      );
    }

    return updatedCase;
  }
}
```

### Example 3: Broadcast Timeline Updates from Invoice Service

```javascript
// In src/services/invoice.service.js

const { getTimelineHandler } = require('../configs/socket');

class InvoiceService {
  async createInvoice(invoiceData) {
    const invoice = await Invoice.create(invoiceData);

    // Broadcast to client timeline
    const timelineHandler = getTimelineHandler();
    if (timelineHandler && invoice.clientId) {
      timelineHandler.broadcastNewItem('client', invoice.clientId.toString(), {
        id: invoice._id,
        type: 'invoice',
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        status: invoice.status,
        dueDate: invoice.dueDate,
        timestamp: invoice.createdAt
      });
    }

    return invoice;
  }

  async updateInvoiceStatus(invoiceId, status) {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { status },
      { new: true }
    );

    // Broadcast status change
    const timelineHandler = getTimelineHandler();
    if (timelineHandler && invoice.clientId) {
      timelineHandler.broadcastItemUpdate(
        'client',
        invoice.clientId.toString(),
        invoiceId,
        { status, updatedAt: new Date() }
      );
    }

    return invoice;
  }
}
```

## Frontend Integration Examples

### Ticket Collision Detection (React)

```javascript
// Frontend: src/hooks/useTicketCollision.js

import { useEffect, useState } from 'react';
import { socket } from '../services/socket';

export const useTicketCollision = (ticketId, agentId, agentName) => {
  const [viewers, setViewers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingAgent, setTypingAgent] = useState(null);

  useEffect(() => {
    if (!ticketId || !socket) return;

    // Join ticket view
    socket.emit('ticket:view', { ticketId, agentId, agentName });

    // Listen for collision warning
    socket.on('collision:warning', ({ viewers: otherViewers }) => {
      console.warn('Other agents viewing this ticket:', otherViewers);
      setViewers(otherViewers);
    });

    // Listen for viewers update
    socket.on('viewers:updated', ({ viewers: currentViewers }) => {
      setViewers(currentViewers);
    });

    // Listen for typing indicators
    socket.on('agent:typing', ({ agentName: typingAgentName }) => {
      setIsTyping(true);
      setTypingAgent(typingAgentName);
    });

    socket.on('agent:stopped_typing', () => {
      setIsTyping(false);
      setTypingAgent(null);
    });

    // Cleanup on unmount
    return () => {
      socket.emit('ticket:leave', { ticketId, agentId });
      socket.off('collision:warning');
      socket.off('viewers:updated');
      socket.off('agent:typing');
      socket.off('agent:stopped_typing');
    };
  }, [ticketId, agentId, agentName]);

  const startTyping = () => {
    socket.emit('ticket:typing', { ticketId, agentId, agentName });
  };

  const stopTyping = () => {
    socket.emit('ticket:stop_typing', { ticketId, agentId });
  };

  return {
    viewers,
    isTyping,
    typingAgent,
    hasCollision: viewers.length > 1,
    startTyping,
    stopTyping
  };
};
```

### Timeline Updates (React)

```javascript
// Frontend: src/hooks/useTimeline.js

import { useEffect, useState } from 'react';
import { socket } from '../services/socket';

export const useTimeline = (entityType, entityId, userId) => {
  const [timeline, setTimeline] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!entityType || !entityId || !socket) return;

    // Subscribe to timeline updates
    socket.emit('timeline:subscribe', { entityType, entityId, userId });

    // Listen for new items
    socket.on('timeline:new_item', ({ item }) => {
      setTimeline(prev => [item, ...prev]);
    });

    // Listen for item updates
    socket.on('timeline:item_updated', ({ itemId, updates }) => {
      setTimeline(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    });

    // Listen for item deletions
    socket.on('timeline:item_deleted', ({ itemId }) => {
      setTimeline(prev => prev.filter(item => item.id !== itemId));
    });

    // Listen for refresh requests
    socket.on('timeline:refresh', () => {
      setRefreshTrigger(prev => prev + 1);
    });

    // Cleanup on unmount
    return () => {
      socket.emit('timeline:unsubscribe', { entityType, entityId });
      socket.off('timeline:new_item');
      socket.off('timeline:item_updated');
      socket.off('timeline:item_deleted');
      socket.off('timeline:refresh');
    };
  }, [entityType, entityId, userId]);

  return {
    timeline,
    refreshTrigger
  };
};
```

## Best Practices

1. **Always cleanup**: Make sure to call `ticket:leave` or `timeline:unsubscribe` when components unmount
2. **Throttle typing events**: Don't emit `ticket:typing` on every keystroke - use debouncing
3. **Error handling**: Always check if handlers are initialized before using them
4. **Performance**: Only subscribe to timelines/tickets that are actively being viewed
5. **Security**: Validate user permissions before allowing ticket/timeline access on the backend

## Testing

### Test Ticket Collision Detection

```bash
# In browser console (open two tabs)
# Tab 1
socket.emit('ticket:view', { ticketId: '123', agentId: 'agent1', agentName: 'John' });

# Tab 2 (should receive collision warning)
socket.emit('ticket:view', { ticketId: '123', agentId: 'agent2', agentName: 'Jane' });

# Tab 1 starts typing
socket.emit('ticket:typing', { ticketId: '123', agentId: 'agent1', agentName: 'John' });
```

### Test Timeline Updates

```bash
# Subscribe to client timeline
socket.emit('timeline:subscribe', { entityType: 'client', entityId: '123', userId: 'user1' });

# Create an activity via API - should see real-time update in timeline
```
