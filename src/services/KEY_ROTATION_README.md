# JWT Key Rotation Implementation

## Overview

This implementation provides a robust JWT key rotation mechanism that enhances security by:
- Supporting multiple active signing keys simultaneously
- Adding key versioning (kid - Key ID) to JWT tokens
- Enabling automatic key rotation at configurable intervals
- Maintaining backward compatibility with existing tokens during rotation
- Zero-downtime key updates

## Security Benefits

1. **Reduced Impact of Key Compromise**: Keys are rotated regularly, limiting the time window for potential misuse
2. **Zero-Downtime Rotation**: Old keys remain valid during a grace period, preventing service disruption
3. **Key Versioning**: Each token includes a 'kid' (Key ID) for efficient key lookup
4. **Audit Trail**: All key operations are logged for security monitoring

## Architecture

### Components

1. **keyRotation.service.js** - Core key management service
   - Key generation and rotation
   - Multi-key storage and retrieval
   - Automatic cleanup of expired keys
   - Support for multiple storage backends (env, Redis)

2. **generateToken.js** - Updated token generation
   - Uses current active key for signing
   - Adds 'kid' header to tokens when rotation is enabled
   - Falls back to legacy mode when rotation is disabled

3. **jwt.js** - Updated verification middleware
   - Tries multiple keys during verification
   - Prioritizes key specified in token's 'kid' header
   - Falls back to all active keys if kid match fails

4. **keyRotation.controller.js** - Admin API endpoints
   - Status monitoring
   - Manual rotation triggers
   - Key cleanup operations

## Configuration

### Environment Variables

```bash
# Enable/disable key rotation
ENABLE_JWT_KEY_ROTATION=true

# Rotation interval (days between key rotations)
JWT_KEY_ROTATION_INTERVAL=30

# Grace period (days to keep old keys valid)
JWT_KEY_ROTATION_GRACE_PERIOD=7

# Storage method (env or redis)
JWT_KEYS_STORAGE=redis

# Signing keys (auto-managed, leave empty initially)
JWT_SIGNING_KEYS=
```

### Storage Methods

#### Redis (Recommended for Production)
```bash
JWT_KEYS_STORAGE=redis
```
- Automatic persistence
- High availability
- Fast key lookups
- No manual updates required

#### Environment Variables
```bash
JWT_KEYS_STORAGE=env
JWT_SIGNING_KEYS='[{"kid":"krot_123","secret":"...","status":"active"}]'
```
- Simple setup for development
- Requires manual .env updates after rotation
- Keys logged to console after generation

## Usage

### Initial Setup

1. **Enable key rotation in .env:**
   ```bash
   ENABLE_JWT_KEY_ROTATION=true
   JWT_KEYS_STORAGE=redis  # or 'env' for development
   JWT_KEY_ROTATION_INTERVAL=30
   JWT_KEY_ROTATION_GRACE_PERIOD=7
   ```

2. **Start the server** - Initial key will be generated automatically

3. **Verify status** (optional):
   ```bash
   curl -X GET http://localhost:5000/api/admin/tools/key-rotation/status \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

### Manual Key Rotation

#### Via API

```bash
# Check if rotation is needed
curl -X GET http://localhost:5000/api/admin/tools/key-rotation/check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Manually trigger rotation
curl -X POST http://localhost:5000/api/admin/tools/key-rotation/rotate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Get rotation status
curl -X GET http://localhost:5000/api/admin/tools/key-rotation/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Via Code

```javascript
const { keyRotationService } = require('./utils/generateToken');

// Manually rotate keys
const result = await keyRotationService.rotateKeys();
console.log('Rotation result:', result);

// Check if rotation is needed
const needsRotation = keyRotationService.needsRotation();
console.log('Needs rotation:', needsRotation);

// Auto-rotate if needed
const autoResult = await keyRotationService.autoRotate();
console.log('Auto-rotation result:', autoResult);
```

### Automatic Rotation

Set up a cron job or scheduled task to run automatic rotation:

```javascript
// In your cron job or scheduled task
const { keyRotationService } = require('./utils/generateToken');

// This will only rotate if the current key age exceeds JWT_KEY_ROTATION_INTERVAL
await keyRotationService.autoRotate();
```

Example cron (daily check):
```bash
0 2 * * * curl -X POST http://localhost:5000/api/admin/tools/key-rotation/auto-rotate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Admin API Endpoints

All endpoints require admin authentication.

### GET /api/admin/tools/key-rotation/status
Get current key rotation status including active keys, versions, and configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "initialized": true,
    "totalKeys": 2,
    "activeKeys": 2,
    "currentKey": {
      "kid": "krot_1234567890_abc123",
      "version": 2,
      "createdAt": "2025-12-25T00:00:00.000Z",
      "status": "active"
    },
    "storage": "redis",
    "rotationInterval": "30 days",
    "gracePeriod": "7 days",
    "keys": [...]
  }
}
```

### POST /api/admin/tools/key-rotation/rotate
Manually trigger key rotation.

**Response:**
```json
{
  "success": true,
  "data": {
    "newKey": {
      "kid": "krot_1234567890_xyz789",
      "version": 3,
      "createdAt": "2025-12-25T12:00:00.000Z"
    },
    "oldKey": {
      "kid": "krot_1234567890_abc123",
      "version": 2,
      "expiresAt": "2026-01-01T12:00:00.000Z"
    }
  }
}
```

### GET /api/admin/tools/key-rotation/check
Check if rotation is needed based on key age.

### POST /api/admin/tools/key-rotation/auto-rotate
Perform automatic rotation if needed.

### POST /api/admin/tools/key-rotation/cleanup
Remove expired keys from storage.

### POST /api/admin/tools/key-rotation/initialize
Manually initialize the key rotation service.

## How It Works

### Token Generation Flow

1. Check if key rotation is enabled
2. If enabled, get current active key from key rotation service
3. Add 'kid' (Key ID) to JWT header
4. Sign token with current key
5. If disabled, use legacy JWT_SECRET

### Token Verification Flow

1. Extract token from request (cookie or Authorization header)
2. Check if key rotation is enabled
3. If enabled:
   - Decode token header to get 'kid'
   - Try to verify with specified key first
   - If that fails, try all active keys
4. If disabled, verify with legacy JWT_SECRET
5. Check token revocation status
6. Validate device fingerprint (if enabled)

### Key Lifecycle

```
┌─────────────┐
│   Created   │ (status: active)
└──────┬──────┘
       │
       │ (rotation triggered)
       │
       ▼
┌─────────────┐
│ Deprecated  │ (status: deprecated, still valid)
└──────┬──────┘
       │
       │ (grace period expires)
       │
       ▼
┌─────────────┐
│   Expired   │ (removed from storage)
└─────────────┘
```

## Migration Guide

### From Single-Key to Key Rotation

1. **Ensure backward compatibility:**
   - Key rotation is opt-in via `ENABLE_JWT_KEY_ROTATION`
   - When disabled, system uses legacy `JWT_SECRET`
   - No code changes required in controllers/routes

2. **Enable key rotation:**
   ```bash
   # In .env
   ENABLE_JWT_KEY_ROTATION=true
   JWT_KEYS_STORAGE=redis
   ```

3. **Restart the server:**
   - Initial key generated automatically
   - Existing tokens (signed with JWT_SECRET) will fail
   - Users will need to re-authenticate

4. **Gradual rollout (recommended):**
   - Enable key rotation in development first
   - Test thoroughly with existing integrations
   - Enable in staging, then production
   - Monitor error logs for verification failures

### Rollback Plan

If issues occur, disable key rotation:
```bash
ENABLE_JWT_KEY_ROTATION=false
```

System will immediately revert to using `JWT_SECRET`.

## Security Considerations

1. **Key Storage:**
   - Keys stored in Redis are as secure as your Redis instance
   - Use Redis AUTH and TLS in production
   - For env storage, protect .env files (never commit to git)

2. **Grace Period:**
   - Should be longer than max token lifetime (15 minutes for access tokens)
   - Recommended: 7-14 days to account for refresh token lifetime (7 days)

3. **Rotation Interval:**
   - Balance security vs operational overhead
   - Recommended: 30-90 days for production
   - More frequent for high-security environments

4. **Monitoring:**
   - Monitor key rotation events in logs
   - Alert on rotation failures
   - Track verification failures per key

## Troubleshooting

### Issue: "No valid signing key found"
**Cause:** No active keys available
**Solution:**
```bash
curl -X POST http://localhost:5000/api/admin/tools/key-rotation/initialize \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Issue: All tokens invalid after enabling rotation
**Cause:** Existing tokens signed with JWT_SECRET
**Solution:** This is expected. Users must re-authenticate. Consider:
- Notifying users before enabling rotation
- Implementing gradual rollout
- Having a maintenance window

### Issue: Keys not persisting (env storage)
**Cause:** Environment variable storage requires manual updates
**Solution:**
- Check server logs for generated keys JSON
- Update JWT_SIGNING_KEYS in .env
- Or switch to Redis storage

### Issue: Rotation not happening automatically
**Cause:** No cron job configured
**Solution:** Set up scheduled task to call `/api/admin/tools/key-rotation/auto-rotate`

## Best Practices

1. **Use Redis in Production:**
   - Automatic persistence
   - High availability
   - No manual updates

2. **Monitor Key Age:**
   - Set up alerts when keys approach rotation interval
   - Regularly check `/api/admin/tools/key-rotation/check`

3. **Audit Logging:**
   - All key operations are logged
   - Review logs regularly for unauthorized rotation attempts

4. **Backup Keys:**
   - Keys are stored in Redis/env
   - Include in your backup strategy
   - Test recovery procedures

5. **Testing:**
   - Test token generation with rotation enabled
   - Test verification with multiple keys
   - Test grace period behavior
   - Test rollback procedure

## Example: Complete Setup

```bash
# 1. Configure environment
cat >> .env << EOF
ENABLE_JWT_KEY_ROTATION=true
JWT_KEYS_STORAGE=redis
JWT_KEY_ROTATION_INTERVAL=30
JWT_KEY_ROTATION_GRACE_PERIOD=7
EOF

# 2. Start server
npm start

# 3. Verify initialization
curl -X GET http://localhost:5000/api/admin/tools/key-rotation/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 4. Set up cron for automatic rotation (runs daily at 2 AM)
echo "0 2 * * * curl -X POST http://localhost:5000/api/admin/tools/key-rotation/auto-rotate -H 'Authorization: Bearer YOUR_ADMIN_TOKEN'" | crontab -

# 5. Monitor
tail -f logs/combined.log | grep "key rotation"
```

## Related Files

- `/home/user/traf3li-backend/src/services/keyRotation.service.js` - Core service
- `/home/user/traf3li-backend/src/utils/generateToken.js` - Token generation
- `/home/user/traf3li-backend/src/middlewares/jwt.js` - Token verification
- `/home/user/traf3li-backend/src/controllers/keyRotation.controller.js` - Admin API
- `/home/user/traf3li-backend/src/routes/adminTools.route.js` - API routes

## Support

For issues or questions:
1. Check server logs for detailed error messages
2. Review this documentation
3. Check the admin status endpoint
4. Contact the development team
