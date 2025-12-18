# =============================================================================
# E-CODE MULTI-STAGE DOCKERFILE
# =============================================================================
# Stage 1: Builder - Install ALL dependencies and build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Use BuildKit cache mount for npm cache to speed up builds
# This caches the npm download cache between builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build

# Stage 2: Production - Install only production dependencies
FROM node:20-alpine AS production
WORKDIR /app

# Install PostgreSQL client for health checks, curl for healthcheck, and Docker CLI for code execution
RUN apk add --no-cache postgresql-client docker-cli curl

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files and install production-only dependencies
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/drizzle.config.ts ./
COPY --from=builder --chown=nodejs:nodejs /app/shared ./shared

# Copy and set entrypoint script
COPY --chown=nodejs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nodejs
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/monitoring/health || exit 1

# Run migrations then start app
ENTRYPOINT ["./docker-entrypoint.sh"]
