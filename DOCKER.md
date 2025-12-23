# Docker Development Guide

This guide covers running the Traf3li Backend using Docker for local development.

## Quick Start

### 1. Setup Environment

```bash
# Copy the Docker environment file
cp .env.docker.example .env

# Generate secure secrets (run this 3 times and paste into .env)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Edit `.env` and update `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY` with the generated values.

### 2. Start Development Environment

```bash
# Start all development services (app, MongoDB, Redis, MailHog)
npm run docker:up

# View application logs
npm run docker:logs

# Open a shell in the app container
npm run docker:shell
```

### 3. Access Services

- **Application**: http://localhost:3000
- **MailHog Web UI**: http://localhost:8025 (email testing)
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

### 4. Stop Services

```bash
# Stop all services
npm run docker:down

# Stop and remove volumes (clean slate)
npm run docker:down:clean
```

## Available Docker Commands

All Docker commands are available via npm scripts:

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start development environment |
| `npm run docker:up:prod` | Start production environment |
| `npm run docker:down` | Stop all services |
| `npm run docker:down:clean` | Stop services and remove volumes |
| `npm run docker:logs` | View application logs (dev) |
| `npm run docker:logs:prod` | View application logs (prod) |
| `npm run docker:build` | Build all containers |
| `npm run docker:build:dev` | Build development container |
| `npm run docker:build:prod` | Build production container |
| `npm run docker:restart` | Restart application container |
| `npm run docker:shell` | Open shell in app container |
| `npm run docker:mongo` | Open MongoDB shell |
| `npm run docker:redis` | Open Redis CLI |
| `npm run docker:mailhog` | Show MailHog UI URL |

## Services

### Development Mode (app-dev)

The development container includes:
- **Hot Reload**: Code changes automatically restart the server
- **Volume Mounting**: Source code is mounted from host
- **Dev Dependencies**: All development tools installed
- **MailHog**: Local email testing
- **Debug Logging**: Verbose logging enabled

**Port**: 3000
**Dockerfile**: `Dockerfile.dev`
**Command**: `npm run dev` (nodemon)

### Production Mode (app)

The production container includes:
- **Multi-stage Build**: Optimized image size
- **Security Hardened**: Non-root user, minimal dependencies
- **Production Dependencies**: Only runtime dependencies
- **Healthchecks**: Automatic health monitoring

**Port**: 8080
**Dockerfile**: `Dockerfile`
**Command**: `npm start`

### MongoDB

- **Image**: mongo:7.0
- **Port**: 27017
- **Database**: traf3li
- **Data Persistence**: `mongo-data` volume

Connect from container:
```bash
npm run docker:mongo
```

### Redis

- **Image**: redis:7-alpine
- **Port**: 6379
- **Data Persistence**: `redis-data` volume
- **Password**: Not set (development)

Connect from container:
```bash
npm run docker:redis
```

### MailHog (Development Only)

MailHog captures all outgoing emails for testing.

- **SMTP Port**: 1025
- **Web UI**: http://localhost:8025

All emails sent from the app will appear in the MailHog UI instead of being sent to real email addresses.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  app-dev (Development) or app (Production)      │
│  - Node.js 20 Alpine                            │
│  - Port: 3000 (dev) / 8080 (prod)              │
│  - Hot reload: ✓ (dev) / ✗ (prod)             │
│                                                 │
└─────────────────┬───────────────────────────────┘
                  │
         ┌────────┼────────┐
         │        │        │
         ▼        ▼        ▼
    ┌────────┬────────┬────────────┐
    │ MongoDB│ Redis  │  MailHog   │
    │ :27017 │ :6379  │  :1025     │
    │        │        │  :8025     │
    └────────┴────────┴────────────┘
```

## Volume Mounts

### Development Mode
- `./src:/app/src` - Source code (hot reload)
- `./logs:/app/logs` - Application logs
- `/app/node_modules` - Prevent overwriting node_modules

### Production Mode
- `./logs:/app/logs` - Application logs only

### Persistent Data
- `mongo-data:/data/db` - MongoDB data
- `redis-data:/data` - Redis data

## Environment Variables

### Required for Development

See `.env.docker.example` for all available variables. Key variables:

```bash
# Security (development defaults provided)
JWT_SECRET=dev_jwt_secret_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production
ENCRYPTION_KEY=0123...abcdef (64 hex chars)

# Database (automatic with Docker Compose)
MONGODB_URI=mongodb://mongo:27017/traf3li
REDIS_URL=redis://redis:6379

# Email (MailHog)
SMTP_HOST=mailhog
SMTP_PORT=1025
```

## Troubleshooting

### Container won't start

```bash
# Check logs
npm run docker:logs

# Rebuild from scratch
npm run docker:down:clean
npm run docker:build
npm run docker:up
```

### Port already in use

Edit `.env` and change the PORT variable:
```bash
PORT=3001
```

### MongoDB connection issues

```bash
# Check MongoDB is running and healthy
docker-compose ps mongo

# View MongoDB logs
docker-compose logs mongo

# Reset MongoDB data
npm run docker:down:clean
npm run docker:up
```

### Hot reload not working

Ensure volume mounts are correct:
```bash
# Check volumes
docker-compose exec app-dev ls -la /app

# Should show files from your local directory
```

### Permission issues

```bash
# Fix permissions on logs and uploads
sudo chown -R $USER:$USER logs uploads

# Or run with proper permissions
docker-compose down
npm run docker:up
```

## Production Deployment

For production deployment, use `docker-compose.prod.yml` or the production profile:

```bash
npm run docker:up:prod
```

Key differences:
- Uses `Dockerfile` (multi-stage, optimized)
- No volume mounts (code baked into image)
- Runs as non-root user
- Production dependencies only
- No MailHog

## Advanced Usage

### Custom Docker Compose Commands

```bash
# Start specific services
docker-compose up -d mongo redis

# Rebuild single service
docker-compose build app-dev

# View resource usage
docker stats

# Clean up unused images
docker system prune -a
```

### Debugging Inside Container

```bash
# Open shell
npm run docker:shell

# Inside container:
cd /app
npm run test
node src/scripts/seedAccounts.js
```

### Database Operations

```bash
# Backup MongoDB
docker-compose exec mongo mongodump --out /data/backup

# Restore MongoDB
docker-compose exec mongo mongorestore /data/backup

# Create indexes
npm run docker:shell
npm run db:indexes
```

## Best Practices

1. **Use .env.docker.example**: Always start from the example file
2. **Don't commit secrets**: Never commit `.env` to git
3. **Clean shutdown**: Use `docker:down` instead of Ctrl+C
4. **Regular cleanup**: Periodically run `docker:down:clean` to reset
5. **Monitor resources**: Use `docker stats` to check resource usage
6. **Check logs**: Always check logs if something isn't working

## Files Overview

- `docker-compose.yml` - Multi-environment Docker Compose configuration
- `Dockerfile` - Production-optimized multi-stage build
- `Dockerfile.dev` - Development build with hot reload
- `.dockerignore` - Files excluded from Docker builds
- `.env.docker.example` - Docker environment variables template
- `DOCKER.md` - This documentation file

## Support

For issues or questions:
1. Check the troubleshooting section above
2. View logs: `npm run docker:logs`
3. Check Docker Compose status: `docker-compose ps`
4. Review environment variables in `.env`
