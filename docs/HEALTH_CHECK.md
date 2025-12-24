# Health Check System

Comprehensive health monitoring system for the Traf3li backend application.

## Endpoints

### GET /health
**Purpose**: Basic health check for load balancers
**Authentication**: None
**Response**: Minimal status information

```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "uptime": 3600
}
```

---

### GET /health/live
**Purpose**: Kubernetes liveness probe
**Authentication**: None
**Response**: Check if application is alive

```json
{
  "status": "alive",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "uptime": 3600
}
```

---

### GET /health/ready
**Purpose**: Kubernetes readiness probe
**Authentication**: None
**Response**: Check if application is ready to serve traffic

Verifies critical dependencies:
- MongoDB database connection
- Redis cache connection

```json
{
  "status": "ready",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "checks": {
    "database": "up",
    "redis": "up"
  }
}
```

**Status Codes**:
- `200` - Ready to serve traffic
- `503` - Not ready (dependencies unavailable)

---

### GET /health/deep
**Purpose**: Deep health check with detailed service monitoring
**Authentication**: Required (JWT token)
**Response**: Comprehensive service health status

Checks all dependencies:
- **MongoDB** - Database connectivity and latency
- **Redis** - Cache connectivity and latency
- **Stripe** - Payment service connectivity (optional)
- **Disk** - Disk space usage
- **Memory** - Memory usage (process and system)

```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "mongodb": {
      "status": "healthy",
      "responseTime": 15,
      "database": "traf3li_production",
      "collections": 45
    },
    "redis": {
      "status": "healthy",
      "responseTime": 5,
      "version": "7.0.5",
      "memoryUsed": "50M"
    },
    "stripe": {
      "status": "healthy",
      "responseTime": 250
    },
    "disk": {
      "status": "healthy",
      "total": "100 GB",
      "free": "55 GB",
      "used": "45 GB",
      "usedPercent": "45%"
    },
    "memory": {
      "status": "healthy",
      "heapUsed": "150MB",
      "heapTotal": "300MB",
      "heapUsedPercent": "50.00%",
      "systemTotal": "16 GB",
      "systemFree": "8 GB",
      "systemUsed": "8 GB",
      "systemUsedPercent": "50%"
    }
  }
}
```

**Status Values**:
- `healthy` - All services operational
- `degraded` - Some non-critical services down
- `unhealthy` - Critical services down

**Status Codes**:
- `200` - Healthy or degraded (still operational)
- `503` - Unhealthy (critical failure)

---

### GET /health/detailed
**Purpose**: Legacy comprehensive health check
**Authentication**: Required (JWT token)
**Response**: Extended health information including system metrics

Similar to `/health/deep` but includes additional system information:
- Node.js version
- Platform information
- CPU cores
- Load average

---

### GET /health/ping
**Purpose**: Simple connectivity test
**Authentication**: None
**Response**: Simple pong response

```json
{
  "message": "pong",
  "timestamp": "2025-12-24T10:30:00.000Z"
}
```

---

### GET /health/circuits
**Purpose**: Circuit breaker status for external services
**Authentication**: Required (JWT token)
**Response**: Circuit breaker states

Shows which external services are:
- `closed` - Healthy and accepting requests
- `open` - Failing and rejecting requests
- `halfOpen` - Testing recovery

---

### GET /health/cache
**Purpose**: Cache performance statistics
**Authentication**: Required (JWT token)
**Response**: Cache hit rate and performance metrics

---

## Service Checks

### MongoDB
- Checks connection state
- Measures response latency via ping
- Retrieves database statistics
- **Warning threshold**: > 1000ms latency

### Redis
- Checks connection state
- Measures response latency via ping
- Retrieves version and memory usage
- **Warning threshold**: > 500ms latency

### Stripe
- Validates API key configuration
- Tests connectivity via balance retrieval
- **Warning threshold**: > 2000ms latency
- **Note**: Non-critical - won't mark as degraded if down

### Disk Space
- Checks root partition usage
- Monitors available space
- **Warning threshold**: > 90% used

### Memory
- Monitors process heap usage
- Monitors system memory usage
- **Warning threshold**: > 90% heap used

## Health Status Logic

```javascript
// Overall health determination
if (mongodb.down || redis.down) {
  return 'unhealthy';  // Critical services down
}

if (disk.warning || memory.warning) {
  return 'degraded';   // Resources constrained
}

return 'healthy';       // All systems operational
```

## Usage Examples

### Load Balancer Health Check
```bash
curl http://api.traf3li.com/health
```

### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Kubernetes Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 5
```

### Monitoring System (with authentication)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://api.traf3li.com/health/deep
```

## Response Time Thresholds

| Service | Target | Warning | Critical |
|---------|--------|---------|----------|
| MongoDB | < 100ms | > 500ms | > 1000ms |
| Redis   | < 50ms  | > 200ms | > 500ms  |
| Stripe  | < 500ms | > 1000ms | > 2000ms |
| S3      | < 500ms | > 1000ms | > 2000ms |

## Monitoring Integration

### Prometheus
The health check endpoints can be scraped by Prometheus for monitoring:

```yaml
scrape_configs:
  - job_name: 'traf3li-health'
    metrics_path: '/health/deep'
    scheme: https
    bearer_token: 'YOUR_MONITORING_TOKEN'
    static_configs:
      - targets: ['api.traf3li.com']
```

### Uptime Robot / Pingdom
Configure HTTP(S) monitoring:
- **URL**: `https://api.traf3li.com/health`
- **Interval**: 5 minutes
- **Expected status**: 200
- **Expected keyword**: "healthy"

### Datadog
```javascript
// Custom check
const checkHealth = async () => {
  const response = await fetch('http://api.traf3li.com/health/deep', {
    headers: {
      'Authorization': `Bearer ${process.env.MONITORING_TOKEN}`
    }
  });
  const data = await response.json();

  // Report metrics
  dogstatsd.gauge('traf3li.health.mongodb.latency', data.services.mongodb.responseTime);
  dogstatsd.gauge('traf3li.health.redis.latency', data.services.redis.responseTime);
  dogstatsd.gauge('traf3li.health.disk.used_percent', parseFloat(data.services.disk.usedPercent));
};
```

## Error Handling

All health check endpoints follow consistent error response format:

```json
{
  "status": "unhealthy",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "error": "Database connection failed",
  "services": {
    "mongodb": {
      "status": "unhealthy",
      "error": "Connection timeout after 5000ms"
    }
  }
}
```

## Security Considerations

1. **Public endpoints** (`/health`, `/health/live`, `/health/ready`, `/health/ping`):
   - No authentication required
   - Minimal information exposure
   - Safe for load balancers and orchestrators

2. **Protected endpoints** (`/health/deep`, `/health/detailed`, `/health/circuits`, `/health/cache`):
   - Require JWT authentication
   - Expose detailed system information
   - Should only be accessible to monitoring systems

3. **Rate Limiting**: Health checks are exempt from rate limiting to ensure monitoring reliability

4. **CSRF Protection**: Health checks are exempt from CSRF validation

## Implementation Files

- **Service**: `/home/user/traf3li-backend/src/services/health.service.js`
- **Routes**: `/home/user/traf3li-backend/src/routes/health.route.js`
- **Tests**: `/home/user/traf3li-backend/tests/integration/health.test.js`

## Testing

Run health check tests:
```bash
npm test tests/integration/health.test.js
```

Manual testing:
```bash
# Basic health
curl http://localhost:8080/health

# Deep health (requires auth)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8080/health/deep

# Readiness
curl http://localhost:8080/health/ready
```

## Future Enhancements

Planned improvements:
- [ ] Add database query performance metrics
- [ ] Monitor background job queue health
- [ ] Add WebSocket connection count
- [ ] Track active user sessions
- [ ] Monitor external API rate limits
- [ ] Add custom business metric checks
