# E-Code Platform Production Dockerfile
# Optimized to reduce image size from >8GiB to <2GiB

FROM node:18-alpine AS builder

# Set Node.js memory limit to prevent heap overflow during build
ARG NODE_OPTIONS=--max-old-space-size=4096
ENV NODE_OPTIONS=$NODE_OPTIONS

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Install ALL dependencies (build + runtime)
# Using npm install with --ignore-scripts to skip native rebuilds
RUN npm install --omit=optional --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/*

# Copy ONLY source code (not test/, mobile/, dokploy/, etc. - see .dockerignore)
COPY client ./client
COPY server ./server
COPY shared ./shared
COPY types ./types

# Build the application
RUN npm run build

# Production stage - Minimal runtime image
FROM node:18-alpine

# Set Node.js memory limit for runtime
ARG NODE_OPTIONS=--max-old-space-size=4096
ENV NODE_OPTIONS=$NODE_OPTIONS
ENV NODE_ENV=production

# Install production dependencies
RUN apk add --no-cache git && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files from builder
COPY --from=builder /app/package*.json ./

# Install ONLY production dependencies (this is the key size optimization)
RUN npm install --omit=optional --omit=dev --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/* /root/.npm

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy runtime essentials
COPY theme.json ./

# Create logs directory
RUN mkdir -p logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health/liveness', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "--max-old-space-size=4096", "dist/index.js"]