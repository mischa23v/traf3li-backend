# Socket Handlers

This directory contains modular Socket.io handlers for real-time features in the Traf3li backend.

## Architecture

### Modular Handler Pattern

Instead of having all socket event handlers in one monolithic file, we use a modular handler pattern where each handler is responsible for a specific domain:

- **ticketCollision.socket.js** - Prevents multiple agents from working on the same ticket
- **timeline.socket.js** - Broadcasts real-time timeline updates to subscribers

### Handler Structure

Each handler follows this pattern:

```javascript
class Handler {
  constructor(io) {
    this.io = io;
    // Handler-specific state
  }

  initialize() {
    // Set up socket event listeners
    this.io.on('connection', (socket) => {
      socket.on('event:name', (data) => this.onEvent(socket, data));
    });
  }

  onEvent(socket, data) {
    // Handle event
  }

  // Public methods for services to use
  broadcastUpdate(data) {
    this.io.to('room').emit('update', data);
  }

  shutdown() {
    // Cleanup resources
  }
}
```

## Available Handlers

### 1. Ticket Collision Detection Handler

**File**: `ticketCollision.socket.js`

**Purpose**: Prevents multiple support agents from working on the same ticket simultaneously by tracking who is viewing/typing on each ticket.

**Features**:
- Track agents viewing tickets in real-time
- Typing indicators with collision warnings
- Automatic cleanup on disconnect
- Stale viewer removal (30-minute timeout)
- Detailed viewer status (viewing, typing)

**Events**:

**Client → Server:**
- `ticket:view` - Agent starts viewing a ticket
  ```javascript
  socket.emit('ticket:view', {
    ticketId: '123',
    agentId: 'agent_456',
    agentName: 'John Doe'
  });
  ```

- `ticket:typing` - Agent starts typing a response
  ```javascript
  socket.emit('ticket:typing', {
    ticketId: '123',
    agentId: 'agent_456',
    agentName: 'John Doe'
  });
  ```

- `ticket:stop_typing` - Agent stops typing
  ```javascript
  socket.emit('ticket:stop_typing', {
    ticketId: '123',
    agentId: 'agent_456'
  });
  ```

- `ticket:leave` - Agent leaves ticket view
  ```javascript
  socket.emit('ticket:leave', {
    ticketId: '123',
    agentId: 'agent_456'
  });
  ```

**Server → Client:**
- `collision:warning` - Warning when multiple agents viewing
  ```javascript
  {
    ticketId: '123',
    viewers: [{ agentId, agentName, status, since }],
    message: '2 agent(s) already viewing this ticket'
  }
  ```

- `viewers:updated` - Current viewers list
  ```javascript
  {
    ticketId: '123',
    viewers: [{ agentId, agentName, status, since }],
    count: 2
  }
  ```

- `agent:typing` - Someone is typing (CRITICAL WARNING)
  ```javascript
  {
    ticketId: '123',
    agentId: 'agent_789',
    agentName: 'Jane Smith',
    warning: 'COLLISION_RISK',
    message: 'Jane Smith is typing a response...'
  }
  ```

- `agent:stopped_typing` - Someone stopped typing
- `agent:joined` - New viewer joined
- `agent:left` - Viewer left

**Usage in Services**:
```javascript
const { getTicketCollisionHandler } = require('../configs/socket');

// Get current viewers for a ticket
const handler = getTicketCollisionHandler();
const viewers = handler.getViewers(ticketId);

// Check for collision risk
const hasCollision = viewers.length > 1 || viewers.some(v => v.status === 'typing');
```

### 2. Timeline Socket Handler

**File**: `timeline.socket.js`

**Purpose**: Provides real-time updates for entity timelines (360° customer view). Broadcasts when activities, cases, invoices, or other timeline items are created, updated, or deleted.

**Features**:
- Real-time timeline event broadcasting
- Entity-specific room subscriptions
- Multiple entity type support (client, contact, lead, case, etc.)
- Automatic room cleanup
- Timeline activity tracking

**Events**:

**Client → Server:**
- `timeline:subscribe` - Subscribe to entity timeline
  ```javascript
  socket.emit('timeline:subscribe', {
    entityType: 'client',
    entityId: '123',
    userId: 'user_456'
  });
  ```

- `timeline:unsubscribe` - Unsubscribe from timeline
  ```javascript
  socket.emit('timeline:unsubscribe', {
    entityType: 'client',
    entityId: '123'
  });
  ```

**Server → Client:**
- `timeline:subscribed` - Subscription confirmed
- `timeline:unsubscribed` - Unsubscription confirmed

- `timeline:new_item` - New timeline item added
  ```javascript
  {
    entityType: 'client',
    entityId: '123',
    item: {
      id: 'activity_789',
      type: 'activity',
      activityType: 'call',
      title: 'Follow-up call',
      timestamp: '2024-01-15T10:30:00Z'
    }
  }
  ```

- `timeline:item_updated` - Timeline item updated
  ```javascript
  {
    entityType: 'client',
    entityId: '123',
    itemId: 'activity_789',
    updates: { status: 'completed' }
  }
  ```

- `timeline:item_deleted` - Timeline item deleted
  ```javascript
  {
    entityType: 'client',
    entityId: '123',
    itemId: 'activity_789'
  }
  ```

- `timeline:refresh` - Full timeline refresh needed
  ```javascript
  {
    entityType: 'client',
    entityId: '123',
    reason: 'bulk_update'
  }
  ```

- `timeline:bulk_update` - Multiple items updated
  ```javascript
  {
    entityType: 'client',
    entityId: '123',
    items: [...],
    count: 5
  }
  ```

**Usage in Services**:
```javascript
const { getTimelineHandler } = require('../configs/socket');

// Broadcast new timeline item
const handler = getTimelineHandler();
handler.broadcastNewItem('client', clientId, {
  id: activity._id,
  type: 'activity',
  activityType: activity.type,
  title: activity.title,
  timestamp: activity.createdAt
});

// Broadcast update
handler.broadcastItemUpdate('client', clientId, activityId, {
  status: 'completed'
});

// Broadcast deletion
handler.broadcastItemDelete('client', clientId, activityId);

// Broadcast full refresh
handler.broadcastRefresh('client', clientId, 'major_update');
```

## Integration Guide

### 1. Initialization

Handlers are automatically initialized in `src/configs/socket.js`:

```javascript
const TicketCollisionHandler = require('../sockets/ticketCollision.socket');
const TimelineSocketHandler = require('../sockets/timeline.socket');

ticketCollisionHandler = new TicketCollisionHandler(io);
ticketCollisionHandler.initialize();

timelineHandler = new TimelineSocketHandler(io);
timelineHandler.initialize();
```

### 2. Using Handlers in Services

Import and use handler getter functions:

```javascript
const { getTicketCollisionHandler, getTimelineHandler } = require('../configs/socket');

// In your service
class MyService {
  async createActivity(data) {
    const activity = await Activity.create(data);

    // Broadcast to timeline
    const timelineHandler = getTimelineHandler();
    if (timelineHandler) {
      timelineHandler.broadcastNewItem(
        data.entityType,
        data.entityId,
        activity
      );
    }

    return activity;
  }
}
```

### 3. Frontend Integration

See `INTEGRATION_EXAMPLE.md` for complete frontend examples using React hooks.

## Room Patterns

Handlers use consistent room naming patterns:

- **Ticket Collision**: `ticket:{ticketId}` (e.g., `ticket:507f1f77bcf86cd799439011`)
- **Timeline**: `timeline:{entityType}:{entityId}` (e.g., `timeline:client:507f1f77bcf86cd799439011`)

## State Management

### Ticket Collision Handler

```javascript
// Internal state
this.activeViewers = new Map();
// Structure: ticketId -> Map of agentId -> {
//   agentId,
//   agentName,
//   status, // 'viewing' or 'typing'
//   since,
//   socketId
// }

this.socketToTickets = new Map();
// Structure: socketId -> Set of ticketIds
```

### Timeline Handler

```javascript
// Internal state
this.socketSubscriptions = new Map();
// Structure: socketId -> Set of entityKeys (e.g., "client:123")

this.entitySubscribers = new Map();
// Structure: entityKey -> subscriber count
```

## Performance Considerations

1. **Memory Management**:
   - Automatic cleanup of stale viewers (30-minute timeout)
   - Empty room cleanup on disconnect
   - Periodic cleanup intervals

2. **Scalability**:
   - Handlers work with Redis adapter for horizontal scaling
   - Room-based broadcasting (only send to subscribers)
   - Efficient Map-based lookups

3. **Network Efficiency**:
   - Only broadcast to rooms with active subscribers
   - Debounce typing events on client-side
   - Use connection state recovery for reliability

## Testing

### Manual Testing

Use browser console to test socket events:

```javascript
// Connect
const socket = io('http://localhost:8080');

// Test ticket collision
socket.emit('ticket:view', {
  ticketId: '123',
  agentId: 'test_agent',
  agentName: 'Test Agent'
});

socket.on('collision:warning', (data) => {
  console.log('Collision detected:', data);
});

// Test timeline
socket.emit('timeline:subscribe', {
  entityType: 'client',
  entityId: '123',
  userId: 'test_user'
});

socket.on('timeline:new_item', (data) => {
  console.log('New timeline item:', data);
});
```

### Unit Testing

Example test structure:

```javascript
const TicketCollisionHandler = require('./ticketCollision.socket');
const { Server } = require('socket.io');
const Client = require('socket.io-client');

describe('TicketCollisionHandler', () => {
  let io, handler, clientSocket;

  beforeEach((done) => {
    io = new Server(3000);
    handler = new TicketCollisionHandler(io);
    handler.initialize();

    clientSocket = Client('http://localhost:3000');
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    handler.shutdown();
    io.close();
    clientSocket.close();
  });

  it('should track viewers', (done) => {
    clientSocket.emit('ticket:view', {
      ticketId: '123',
      agentId: 'agent1',
      agentName: 'John'
    });

    setTimeout(() => {
      const viewers = handler.getViewers('123');
      expect(viewers).toHaveLength(1);
      expect(viewers[0].agentId).toBe('agent1');
      done();
    }, 100);
  });
});
```

## Troubleshooting

### Common Issues

1. **Handler not initialized**
   - Error: "Ticket collision handler not initialized"
   - Solution: Ensure handlers are initialized in `src/configs/socket.js` before use

2. **Events not received**
   - Check CORS settings in socket configuration
   - Verify socket is connected: `socket.connected`
   - Check room subscriptions: `socket.rooms`

3. **Stale viewers not cleaning up**
   - Default cleanup interval: 5 minutes
   - Default stale threshold: 30 minutes
   - Check cleanup logs in server console

4. **Memory leaks**
   - Ensure `ticket:leave` and `timeline:unsubscribe` are called
   - Check for proper disconnect handling
   - Monitor handler stats: `handler.getStats()`

## Monitoring

### Handler Statistics

Get real-time statistics:

```javascript
// Ticket collision stats
const collisionHandler = getTicketCollisionHandler();
const stats = collisionHandler.getStats();
// {
//   activeTickets: 10,
//   totalViewers: 15,
//   typingCount: 3,
//   tickets: [...]
// }

// Timeline stats
const timelineHandler = getTimelineHandler();
const stats = timelineHandler.getStats();
// {
//   totalSockets: 25,
//   totalEntities: 18,
//   entities: [...]
// }
```

### Logging

Handlers use structured logging:

```javascript
logger.info('Agent viewing ticket', {
  agentId: 'agent_123',
  ticketId: 'ticket_456',
  totalViewers: 2
});
```

## Future Enhancements

- [ ] Add Redis-based state persistence for handler state
- [ ] Add WebRTC support for real-time collaboration
- [ ] Add presence indicators (online/offline/away)
- [ ] Add collaborative cursor tracking for document editing
- [ ] Add rate limiting for socket events
- [ ] Add socket authentication middleware
- [ ] Add socket event analytics

## Contributing

When adding new socket handlers:

1. Create handler class in this directory
2. Follow the established handler pattern
3. Add initialization in `src/configs/socket.js`
4. Add shutdown cleanup in `shutdownSocket()`
5. Export getter function
6. Document in this README
7. Add integration examples in `INTEGRATION_EXAMPLE.md`
8. Add unit tests

## References

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Socket.io Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery/)
