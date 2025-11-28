# E-Code Platform Production Dockerfile
# Optimized multi-stage build for <2GiB image size

# ============================================
# Stage 1: Builder - Build the application
# ============================================
FROM node:18-alpine AS builder

ARG NODE_OPTIONS=--max-old-space-size=4096
ENV NODE_OPTIONS=$NODE_OPTIONS

RUN apk add --no-cache python3 make g++ git

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./
COPY vite.config.ts ./

RUN npm install --omit=optional --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/*

COPY client ./client
COPY server ./server
COPY shared ./shared
COPY types ./types
COPY theme.json ./

RUN npm run build

# ============================================
# Stage 2: Dependencies - Production deps only
# ============================================
FROM node:18-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=optional --omit=dev --ignore-scripts && \
    npm cache clean --force && \
    rm -rf ~/.npm /tmp/* && \
    find node_modules -name "*.md" -delete && \
    find node_modules -name "*.ts" -not -name "*.d.ts" -delete && \
    find node_modules -name "*.map" -delete && \
    find node_modules -name "LICENSE*" -delete && \
    find node_modules -name "CHANGELOG*" -delete && \
    find node_modules -name "README*" -delete && \
    find node_modules -type d -name "test" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "tests" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "docs" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "example" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "examples" -exec rm -rf {} + 2>/dev/null || true && \
    rm -rf node_modules/monaco-editor/dev && \
    rm -rf node_modules/monaco-editor/min && \
    rm -rf node_modules/monaco-editor/min-maps && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/abap && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/apex && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/azcli && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/bat && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/bicep && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/cameligo && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/clojure && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/coffee && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/cypher && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/dart && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/dockerfile && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/ecl && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/elixir && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/flow9 && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/freemarker2 && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/fsharp && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/graphql && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/handlebars && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/hcl && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/ini && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/julia && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/kotlin && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/lexon && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/liquid && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/lua && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/m3 && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/mdx && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/mips && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/msdax && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/mysql && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/objective-c && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/pascal && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/pascaligo && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/perl && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/pgsql && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/pla && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/postiats && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/powerquery && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/powershell && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/protobuf && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/pug && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/qsharp && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/r && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/razor && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/redis && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/redshift && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/restructuredtext && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/scala && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/scheme && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/solidity && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/sophia && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/sparql && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/st && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/swift && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/systemverilog && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/tcl && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/twig && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/vb && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/wgsl && \
    rm -rf node_modules/monaco-editor/esm/vs/basic-languages/test

# ============================================
# Stage 3: Runtime - Minimal production image
# ============================================
FROM node:18-alpine

ARG NODE_OPTIONS=--max-old-space-size=2048
ENV NODE_OPTIONS=$NODE_OPTIONS
ENV NODE_ENV=production

RUN apk add --no-cache git && \
    rm -rf /var/cache/apk/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY theme.json ./

RUN mkdir -p logs && \
    addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health/liveness', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["node", "--max-old-space-size=2048", "dist/index.js"]