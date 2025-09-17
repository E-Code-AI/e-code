# Minimal secure container for code execution
# Based on Alpine Linux for small attack surface
FROM alpine:3.19

# Install tini for proper init process and basic runtime dependencies
RUN apk update && apk add --no-cache \
    tini \
    python3 \
    nodejs \
    npm \
    openjdk11-jre-headless \
    go \
    bash \
    && rm -rf /var/cache/apk/*

# Create non-root user for code execution
# IMPORTANT: Never run user code as root in production
RUN addgroup -g 1000 coderunner && \
    adduser -D -s /bin/bash -G coderunner -u 1000 coderunner

# Create workspace directory with proper permissions
RUN mkdir -p /workspace && \
    chown coderunner:coderunner /workspace && \
    chmod 755 /workspace

# Copy entrypoint script
COPY sandbox_entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Switch to non-root user
USER coderunner
WORKDIR /workspace

# Set resource limits via environment variables
# Production: Tune these based on your requirements
ENV MEMORY_LIMIT=512m
ENV CPU_LIMIT=1
ENV TIMEOUT_SEC=30

# Use tini as init process to handle signals properly
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]

# Default command - will be overridden by executor
CMD ["echo", "Sandbox ready - no command specified"]

# Security notes for production:
# 1. Consider using distroless images for even smaller attack surface
# 2. Add specific language runtime versions as needed
# 3. Consider using gVisor or Firecracker for additional isolation
# 4. Implement proper secret management for any required credentials
# 5. Use read-only filesystem where possible
# 6. Consider adding custom seccomp profiles per language