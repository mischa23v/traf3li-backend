# ============================================
# TRAF3LI BACKEND - PRODUCTION DOCKERFILE
# ============================================
# Multi-stage build for optimized image size
# Security-hardened with non-root user

# Stage 1: Build dependencies
FROM node:20-alpine AS builder

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Prune dev dependencies for production
RUN npm prune --production

# ============================================
# Stage 2: Production image
# ============================================
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Install runtime dependencies only
RUN apk add --no-cache \
    # For healthchecks
    curl \
    # For puppeteer (PDF generation)
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Copy built node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create logs and uploads directories
RUN mkdir -p logs uploads/messages && chown -R nodejs:nodejs logs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health/ready || exit 1

# Set production environment
ENV NODE_ENV=production

# Start the application
CMD ["node", "src/server.js"]
