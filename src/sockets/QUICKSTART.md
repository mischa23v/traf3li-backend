# Socket Handlers Quick Start Guide

Get started with ticket collision detection and timeline updates in 5 minutes.

## 1. Ticket Collision Detection - Prevent Duplicate Work

### Backend (Already Set Up!)

The handlers are automatically initialized when the server starts. No additional setup required.

### Frontend Implementation

#### Step 1: Create a Hook

```javascript
// src/hooks/useTicketCollision.js
import { useEffect, useState } from 'react';
import { socket } from '../services/socket';

export const useTicketCollision = (ticketId, currentUser) => {
  const [otherViewers, setOtherViewers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!ticketId || !socket) return;

    // Join the ticket room
    socket.emit('ticket:view', {
      ticketId,
      agentId: currentUser.id,
      agentName: currentUser.name
    });

    // Listen for other viewers
    socket.on('collision:warning', ({ viewers }) => {
      setOtherViewers(viewers);
    });

    socket.on('viewers:updated', ({ viewers }) => {
      const others = viewers.filter(v => v.agentId !== currentUser.id);
      setOtherViewers(others);
    });

    // Listen for typing
    socket.on('agent:typing', ({ agentName }) => {
      setIsTyping(agentName);
    });

    socket.on('agent:stopped_typing', () => {
      setIsTyping(false);
    });

    // Cleanup
    return () => {
      socket.emit('ticket:leave', { ticketId, agentId: currentUser.id });
      socket.off('collision:warning');
      socket.off('viewers:updated');
      socket.off('agent:typing');
      socket.off('agent:stopped_typing');
    };
  }, [ticketId, currentUser.id, currentUser.name]);

  // Notify when user starts typing
  const notifyTyping = () => {
    socket.emit('ticket:typing', {
      ticketId,
      agentId: currentUser.id,
      agentName: currentUser.name
    });
  };

  // Notify when user stops typing
  const notifyStopTyping = () => {
    socket.emit('ticket:stop_typing', {
      ticketId,
      agentId: currentUser.id
    });
  };

  return {
    otherViewers,
    isTyping,
    hasCollision: otherViewers.length > 0,
    notifyTyping,
    notifyStopTyping
  };
};
```

#### Step 2: Use in Your Component

```javascript
// src/components/TicketView.jsx
import React, { useState } from 'react';
import { useTicketCollision } from '../hooks/useTicketCollision';
import { useAuth } from '../hooks/useAuth';

export const TicketView = ({ ticketId }) => {
  const { user } = useAuth();
  const { otherViewers, isTyping, hasCollision, notifyTyping, notifyStopTyping } =
    useTicketCollision(ticketId, user);
  const [response, setResponse] = useState('');

  // Debounced typing notification
  const handleTyping = (e) => {
    setResponse(e.target.value);

    // Notify others you're typing
    if (e.target.value && !isTyping) {
      notifyTyping();
    } else if (!e.target.value) {
      notifyStopTyping();
    }
  };

  return (
    <div className="ticket-view">
      {/* Collision Warning */}
      {hasCollision && (
        <div className="alert alert-warning">
          ⚠️ Other agents are viewing this ticket:
          <ul>
            {otherViewers.map(viewer => (
              <li key={viewer.agentId}>
                {viewer.agentName}
                {viewer.status === 'typing' && ' (typing...)'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Critical Warning - Someone is typing */}
      {isTyping && (
        <div className="alert alert-danger">
          🚨 {isTyping} is currently typing a response.
          Continuing may result in duplicate work!
        </div>
      )}

      {/* Your ticket UI */}
      <textarea
        value={response}
        onChange={handleTyping}
        onBlur={notifyStopTyping}
        placeholder="Type your response..."
      />
    </div>
  );
};
```

## 2. Timeline Updates - Real-time Activity Feed

### Backend Integration

Add timeline broadcasting to your services:

```javascript
// src/services/crmActivity.service.js
const { getTimelineHandler } = require('../configs/socket');

class CrmActivityService {
  async createActivity(data) {
    // Create the activity
    const activity = await CrmActivity.create(data);

    // Broadcast to timeline (ONE LINE!)
    const handler = getTimelineHandler();
    if (handler) {
      handler.broadcastNewItem(
        'client',           // entityType
        data.clientId,      // entityId
        {
          id: activity._id,
          type: 'activity',
          activityType: activity.type,
          title: activity.title,
          timestamp: activity.createdAt
        }
      );
    }

    return activity;
  }
}
```

### Frontend Implementation

#### Step 1: Create a Hook

```javascript
// src/hooks/useTimeline.js
import { useEffect, useState } from 'react';
import { socket } from '../services/socket';

export const useTimeline = (entityType, entityId) => {
  const [items, setItems] = useState([]);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    if (!entityType || !entityId || !socket) return;

    // Subscribe to timeline
    socket.emit('timeline:subscribe', { entityType, entityId });

    // New item added
    socket.on('timeline:new_item', ({ item }) => {
      setItems(prev => [item, ...prev]);
    });

    // Item updated
    socket.on('timeline:item_updated', ({ itemId, updates }) => {
      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );
    });

    // Item deleted
    socket.on('timeline:item_deleted', ({ itemId }) => {
      setItems(prev => prev.filter(item => item.id !== itemId));
    });

    // Refresh needed
    socket.on('timeline:refresh', () => {
      setNeedsRefresh(true);
    });

    // Cleanup
    return () => {
      socket.emit('timeline:unsubscribe', { entityType, entityId });
      socket.off('timeline:new_item');
      socket.off('timeline:item_updated');
      socket.off('timeline:item_deleted');
      socket.off('timeline:refresh');
    };
  }, [entityType, entityId]);

  return { items, needsRefresh };
};
```

#### Step 2: Use in Your Component

```javascript
// src/components/ClientTimeline.jsx
import React from 'react';
import { useTimeline } from '../hooks/useTimeline';

export const ClientTimeline = ({ clientId }) => {
  const { items, needsRefresh } = useTimeline('client', clientId);

  return (
    <div className="timeline">
      <h3>Activity Timeline</h3>

      {needsRefresh && (
        <div className="alert alert-info">
          New activities available. <button>Refresh</button>
        </div>
      )}

      {items.map(item => (
        <div key={item.id} className="timeline-item">
          <div className="timeline-marker" />
          <div className="timeline-content">
            <h4>{item.title}</h4>
            <p>{item.description}</p>
            <small>{new Date(item.timestamp).toLocaleString()}</small>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <p className="text-muted">No activities yet</p>
      )}
    </div>
  );
};
```

## 3. Testing Your Implementation

### Test Ticket Collision (Browser Console)

Open two browser tabs and run:

```javascript
// Tab 1
socket.emit('ticket:view', {
  ticketId: '123',
  agentId: 'agent1',
  agentName: 'John Doe'
});

// Tab 2 - should receive collision warning
socket.emit('ticket:view', {
  ticketId: '123',
  agentId: 'agent2',
  agentName: 'Jane Smith'
});
```

### Test Timeline Updates (Browser Console)

```javascript
// Subscribe to timeline
socket.emit('timeline:subscribe', {
  entityType: 'client',
  entityId: '123'
});

// Listen for updates
socket.on('timeline:new_item', (data) => {
  console.log('New item:', data);
});

// Create an activity via API - should see real-time update
```

## Common Patterns

### Pattern 1: Typing Indicator with Debounce

```javascript
import { useEffect, useRef } from 'react';

const useTypingIndicator = (ticketId, agentId, agentName) => {
  const typingTimeout = useRef(null);

  const startTyping = () => {
    socket.emit('ticket:typing', { ticketId, agentId, agentName });

    // Auto-stop typing after 3 seconds
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    typingTimeout.current = setTimeout(() => {
      socket.emit('ticket:stop_typing', { ticketId, agentId });
    }, 3000);
  };

  const stopTyping = () => {
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }
    socket.emit('ticket:stop_typing', { ticketId, agentId });
  };

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  return { startTyping, stopTyping };
};
```

### Pattern 2: Multiple Timeline Subscriptions

```javascript
const ClientProfile = ({ clientId }) => {
  // Subscribe to multiple timelines
  const activities = useTimeline('client', clientId);
  const cases = useTimeline('client', clientId);
  const invoices = useTimeline('client', clientId);

  // Merge and sort all timeline items
  const allItems = [
    ...activities.items,
    ...cases.items,
    ...invoices.items
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return <Timeline items={allItems} />;
};
```

## Troubleshooting

### Issue: Events not received

**Solution**: Check socket connection
```javascript
console.log('Connected:', socket.connected);
console.log('Socket ID:', socket.id);
```

### Issue: Collision warnings not showing

**Solution**: Make sure you're emitting `ticket:view` when component mounts
```javascript
useEffect(() => {
  socket.emit('ticket:view', { ticketId, agentId, agentName });
}, [ticketId]); // Re-emit when ticket changes
```

### Issue: Timeline not updating

**Solution**: Verify you're subscribed
```javascript
socket.on('timeline:subscribed', (data) => {
  console.log('Subscribed to:', data);
});
```

## Next Steps

1. ✅ Implement collision detection in your ticket/conversation views
2. ✅ Add timeline broadcasts to your create/update/delete services
3. ✅ Style the collision warnings to match your UI
4. ✅ Add unit tests for your socket interactions
5. 📖 Read `README.md` for advanced features
6. 📖 Check `INTEGRATION_EXAMPLE.md` for more examples

## Need Help?

- Check the logs: Server logs show all socket events
- Use browser DevTools: Network tab → WS (WebSocket) to see real-time events
- Monitor handler stats: See "Monitoring" section in README.md

Happy coding! 🚀
