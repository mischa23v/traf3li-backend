# Health Check Quick Start Guide

## Testing the New Health Check Endpoints

### 1. Basic Health Check (Public)
```bash
curl http://localhost:8080/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "uptime": 3600
}
```

---

### 2. Liveness Probe (Public)
```bash
curl http://localhost:8080/health/live
```

**Expected Response:**
```json
{
  "status": "alive",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "uptime": 3600
}
```

---

### 3. Readiness Probe (Public)
```bash
curl http://localhost:8080/health/ready
```

**Expected Response:**
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

**If Services Are Down:**
```json
{
  "status": "not_ready",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "checks": {
    "database": "down",
    "redis": "up"
  },
  "reason": "Critical dependencies not available"
}
```

---

### 4. Deep Health Check (Requires Auth)

First, get an auth token:
```bash
# Login
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  | jq -r '.data.token')

# Use token for deep health check
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/health/deep | jq
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-24T10:30:00.000Z",
  "uptime": 3600,
  "services": {
    "mongodb": {
      "status": "healthy",
      "responseTime": 15,
      "database": "traf3li",
      "collections": 45
    },
    "redis": {
      "status": "healthy",
      "responseTime": 5,
      "version": "7.0.5",
      "memoryUsed": "50M"
    },
    "stripe": {
      "status": "not_configured"
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

---

## Testing with Different Scenarios

### When MongoDB is Down
```json
{
  "status": "degraded",
  "services": {
    "mongodb": {
      "status": "unhealthy",
      "error": "Database not connected"
    }
  }
}
```

### When Redis is Down
```json
{
  "status": "degraded",
  "services": {
    "redis": {
      "status": "unhealthy",
      "error": "Redis not connected"
    }
  }
}
```

### When Disk Space is Low
```json
{
  "status": "degraded",
  "services": {
    "disk": {
      "status": "warning",
      "usedPercent": "95%"
    }
  }
}
```

### When Memory is High
```json
{
  "status": "degraded",
  "services": {
    "memory": {
      "status": "warning",
      "heapUsedPercent": "92.50%"
    }
  }
}
```

---

## Monitoring Script Example

Create a simple monitoring script:

```bash
#!/bin/bash
# health-monitor.sh

ENDPOINT="http://localhost:8080/health/deep"
TOKEN="your-auth-token-here"

while true; do
  echo "=== Health Check: $(date) ==="

  RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$ENDPOINT")
  STATUS=$(echo "$RESPONSE" | jq -r '.status')

  echo "Overall Status: $STATUS"
  echo "MongoDB: $(echo "$RESPONSE" | jq -r '.services.mongodb.status')"
  echo "Redis: $(echo "$RESPONSE" | jq -r '.services.redis.status')"
  echo "Disk: $(echo "$RESPONSE" | jq -r '.services.disk.status')"
  echo "Memory: $(echo "$RESPONSE" | jq -r '.services.memory.status')"
  echo ""

  sleep 60  # Check every minute
done
```

Make it executable and run:
```bash
chmod +x health-monitor.sh
./health-monitor.sh
```

---

## Integration with Monitoring Tools

### Uptime Robot
1. Create new HTTP(S) monitor
2. URL: `https://api.traf3li.com/health`
3. Keyword to check: `healthy`
4. Interval: 5 minutes

### Prometheus
Add to `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'traf3li-health'
    metrics_path: '/health/deep'
    scheme: https
    bearer_token: 'YOUR_MONITORING_TOKEN'
    static_configs:
      - targets: ['api.traf3li.com']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'traf3li-backend'
```

### Grafana Dashboard Query
```promql
# MongoDB response time
traf3li_health_mongodb_response_time_ms

# Redis response time
traf3li_health_redis_response_time_ms

# Disk usage
traf3li_health_disk_used_percent

# Memory usage
traf3li_health_memory_heap_used_percent
```

---

## Docker Health Check

Add to `docker-compose.yml`:
```yaml
services:
  api:
    image: traf3li-backend:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

## Kubernetes Health Checks

Add to your deployment:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traf3li-backend
spec:
  template:
    spec:
      containers:
      - name: api
        image: traf3li-backend:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

---

## Troubleshooting

### "MongoDB status: unhealthy"
1. Check MongoDB connection string in `.env`
2. Verify MongoDB is running: `systemctl status mongod`
3. Check network connectivity to MongoDB host

### "Redis status: unhealthy"
1. Check Redis connection string in `.env`
2. Verify Redis is running: `systemctl status redis`
3. Test Redis manually: `redis-cli ping`

### "Stripe status: down"
1. Check `STRIPE_SECRET_KEY` in `.env`
2. Verify API key is valid in Stripe dashboard
3. Check network connectivity to Stripe API

### "Disk status: warning"
1. Check disk usage: `df -h`
2. Clean up old logs: `find /var/log -name "*.log" -mtime +30 -delete`
3. Remove old Docker images: `docker system prune -a`

### "Memory status: warning"
1. Check memory usage: `free -h`
2. Identify memory hogs: `ps aux --sort=-%mem | head`
3. Restart application: `pm2 restart all`
4. Consider scaling horizontally

---

## Status Codes Reference

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Healthy or degraded | OK - System operational |
| 503 | Unhealthy | CRITICAL - Investigate immediately |

---

## Response Time Targets

| Service | Target | Warning | Critical |
|---------|--------|---------|----------|
| MongoDB | < 100ms | 100-500ms | > 1000ms |
| Redis | < 50ms | 50-200ms | > 500ms |
| Stripe | < 500ms | 500-1000ms | > 2000ms |

---

## Quick Test Commands

```bash
# Test all endpoints
curl http://localhost:8080/health
curl http://localhost:8080/health/live
curl http://localhost:8080/health/ready
curl http://localhost:8080/health/ping

# Test with auth (replace TOKEN)
TOKEN="your-token-here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/health/deep
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/health/detailed
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/health/circuits
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/health/cache
```

---

## What Changed?

### New Endpoints
- ✅ `GET /health/deep` - Comprehensive health check with all services

### Enhanced Services
- ✅ MongoDB check now includes response time measurement
- ✅ Redis check now includes response time measurement
- ✅ Stripe check now makes actual API calls (balance retrieve)
- ✅ Disk space monitoring added
- ✅ Memory monitoring enhanced with heap usage percentage

### New Functions in health.service.js
- ✅ `measureDbLatency()` - Measure database latency
- ✅ `checkStripe()` - Check Stripe API connectivity

### Files Modified
1. `/home/user/traf3li-backend/src/services/health.service.js` - Enhanced service checks
2. `/home/user/traf3li-backend/src/routes/health.route.js` - Added /health/deep endpoint
3. `/home/user/traf3li-backend/tests/integration/health.test.js` - Updated tests

### Files Created
1. `/home/user/traf3li-backend/docs/HEALTH_CHECK.md` - Comprehensive documentation
2. `/home/user/traf3li-backend/docs/HEALTH_CHECK_QUICK_START.md` - This quick start guide
