# Dockerfile for Go-based executor service
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY docker-runner.go .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o docker-runner docker-runner.go

# Production image
FROM alpine:3.19

# Install Docker CLI and other dependencies
RUN apk add --no-cache docker-cli ca-certificates

# Create non-root user
RUN addgroup -g 1000 executor && \
    adduser -D -s /bin/sh -G executor -u 1000 executor

# Copy binary
COPY --from=builder /app/docker-runner /usr/local/bin/docker-runner
RUN chmod +x /usr/local/bin/docker-runner

# Copy seccomp profile
COPY seccomp.json /etc/seccomp.json

# Switch to non-root user
USER executor

# Expose port
EXPOSE 8080

# Set environment defaults
ENV PORT=8080
ENV SANDBOX_IMAGE=ecode-sandbox:latest
ENV SECCOMP_PROFILE=/etc/seccomp.json

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["docker-runner"]