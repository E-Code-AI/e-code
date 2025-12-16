# Active Context

## Current Focus
- Fortune 500-grade performance optimization for web preview
- Aggressive caching headers and preload hints implemented
- Loading skeleton with E-Code branded spinner for instant perceived load

## Recent Changes (December 2025)
- Added performance-headers.ts middleware with intelligent cache control
- Implemented critical CSS inline in index.html for instant loading skeleton
- Added preconnect/dns-prefetch hints for Google Fonts and AI APIs
- Font loading optimized with preload + non-blocking fallback pattern
- Domain migration complete: all references now use @e-code.ai
- Deleted 152 obsolete git branches (9 Claude + 143 Codex)
- Integrated Kubernetes-style health probes (/health/liveness, /health/readiness)

## Active Decisions
- Vite config is fragile and cannot be modified - using middleware approach instead
- Cache strategy: HTML (no-cache), hashed assets (1 year immutable), static (1 day + stale-while-revalidate)
- Loading spinner uses E-Code orange (#F26207) brand color
- WebSocket heartbeat: DISABLED for terminal (raw PTY), ENABLED for agent (JSON protocol)

## Next Steps
- Monitor cold-start performance in production
- Consider service worker caching for offline support
- Evaluate bundle splitting for further optimization

---
*Updated automatically as work progresses*
