# E-Code Platform Production Dockerfile
# Optimized multi-stage build for <2GiB image size

# ============================================
# Stage 1: Builder - Build the application
# ============================================
FROM node:20-alpine AS builder

ARG NODE_OPTIONS=--max-old-space-size=4096
ENV NODE_OPTIONS=$NODE_OPTIONS

RUN apk add --no-cache python3 make g++ git

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY vite.config.ts ./

RUN npm ci --include=dev --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/*

COPY client ./client
COPY server ./server
COPY shared ./shared
COPY types ./types
COPY theme.json ./

RUN npm run build && \
    rm -rf node_modules

# ============================================
# Stage 2: Dependencies - Production deps only
# ============================================
FROM node:20-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./

# Install production dependencies only (correct npm syntax)
RUN npm ci --omit=dev --omit=optional && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/* && \
    # Remove unnecessary files to reduce size
    find node_modules -name "*.md" -type f -delete 2>/dev/null || true && \
    find node_modules -name "*.ts" -not -name "*.d.ts" -type f -delete 2>/dev/null || true && \
    find node_modules -name "*.map" -type f -delete 2>/dev/null || true && \
    find node_modules -name "LICENSE*" -type f -delete 2>/dev/null || true && \
    find node_modules -name "CHANGELOG*" -type f -delete 2>/dev/null || true && \
    find node_modules -name "README*" -type f -delete 2>/dev/null || true && \
    find node_modules -name "*.txt" -type f -delete 2>/dev/null || true && \
    find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "doc" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "example" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name ".github" -exec rm -rf {} + 2>/dev/null || true && \
    # Remove Monaco editor unused languages and dev files
    rm -rf node_modules/monaco-editor/dev node_modules/monaco-editor/min node_modules/monaco-editor/min-maps 2>/dev/null || true && \
    for lang in abap apex azcli bat bicep cameligo clojure coffee cypher dart dockerfile ecl elixir flow9 freemarker2 fsharp graphql handlebars hcl ini julia kotlin lexon liquid lua m3 mdx mips msdax mysql objective-c pascal pascaligo perl pgsql pla postiats powerquery powershell protobuf pug qsharp r razor redis redshift restructuredtext scala scheme solidity sophia sparql st swift systemverilog tcl twig vb wgsl; do \
      rm -rf node_modules/monaco-editor/esm/vs/basic-languages/$lang 2>/dev/null || true; \
    done

# ============================================
# Stage 3: Runtime - Minimal production image
# ============================================
FROM node:20-alpine

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Minimal runtime dependencies
RUN apk add --no-cache git tini && \
    rm -rf /var/cache/apk/* /tmp/*

WORKDIR /app

# Copy only what's needed for production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY theme.json ./

# Create non-root user and set permissions
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p logs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health/liveness', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Use tini as init for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]