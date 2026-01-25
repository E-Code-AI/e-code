# WebSocket Authentication Security Audit
**Date:** January 25, 2026  
**Purpose:** Verify WebSocket handlers enforce authentication BEFORE processing messages

---

## Executive Summary

This audit examined three WebSocket implementations in the codebase to verify that authentication is enforced at the connection level before allowing any message processing. 

**Findings:**
- **1 file is PROPERLY SECURED** ✅
- **2 files have CRITICAL SECURITY GAPS** ⚠️

---

## 1. server/websocket/mobile-websocket.ts

### Status: ✅ **PROPERLY SECURED**

#### Authentication Flow
- **Type:** Socket.IO with JWT middleware
- **Location:** Connection-level middleware via `.use()`

#### Implementation Details

```typescript
// Lines 67-102: JWT Auth Middleware
const jwtAuthMiddleware = async (socket: any, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      logger.warn('Connection attempt without token');
      return next(new Error('Authentication token required'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as { userId: number };
    const user = await storage.getUser(String(decoded.userId));
    if (!user) {
      logger.warn(`User ${decoded.userId} not found`);
      return next(new Error('User not found'));
    }
    
    // Connection limit check
    const userId = String(user.id);
    const currentCount = userConnectionCounts.get(userId) || 0;
    if (currentCount >= MAX_CONNECTIONS_PER_USER) {
      logger.warn(`User ${userId} exceeded max connections (${MAX_CONNECTIONS_PER_USER})`);
      return next(new Error('Maximum connections exceeded'));
    }
    
    userConnectionCounts.set(userId, currentCount + 1);
    socket.userId = user.id;
    socket.username = user.username;
    logger.info(`User ${user.id} authenticated, connections: ${currentCount + 1}/${MAX_CONNECTIONS_PER_USER}`);
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    next(new Error('Invalid or expired token'));
  }
};

// Lines 117-118: Middleware applied BEFORE connection handler
const terminalNs = this.io.of('/terminal');
terminalNs.use(jwtAuthMiddleware);  // ✅ Runs before connection
terminalNs.on('connection', (socket) => {
```

#### Security Strengths
- ✅ **Connection-level auth:** Middleware runs BEFORE connection handler
- ✅ **Early token validation:** JWT is verified before socket enters connection state
- ✅ **User database lookup:** Validates user exists in storage
- ✅ **Connection limits:** Enforces max connections per user (prevents resource exhaustion)
- ✅ **Applied to all namespaces:** 
  - `/terminal` (line 118)
  - `/ai` (line 161)
  - `/collaboration` (line 211)
- ✅ **Error logging:** Invalid attempts are logged with warnings
- ✅ **Message validation:** Additional validation in message handlers (lines 121-139)

#### Security Validations in Message Handlers
Even after auth middleware, handlers validate messages:
```typescript
// Lines 121-125: Terminal command validation
if (!data || typeof data !== 'object') {
  socket.emit('error', { message: 'Invalid message format' });
  return;
}

const { command, projectId } = data;
if (typeof command !== 'string' || typeof projectId !== 'string') {
  socket.emit('error', { message: 'Missing required fields' });
  return;
}

// Lines 135-139: Path traversal blocking
if (projectId.includes('..')) {
  socket.emit('error', { message: 'Invalid projectId' });
  return;
}
```

#### Verdict
**Status:** SECURE ✅  
**Risk Level:** LOW  
**No action required.**

---

## 2. server/terminal.ts

### Status: ⚠️ **CRITICAL SECURITY GAP**

#### Authentication Flow
- **Type:** Raw WebSocket (ws library)
- **Location:** NONE - No authentication enforcement

#### Current Implementation (Lines 46-55)

```typescript
wss.on('connection', async (ws, req) => {
    try {
      // Get the project ID from query params
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const projectId = url.searchParams.get('projectId') || '';

      if (!projectId) {
        ws.close(1008, 'Missing or invalid projectId');
        return;
      }

      logger.info(`Terminal connection established for project ${projectId}`);
      // ... connection proceeds immediately without auth
```

#### Security Gaps

| Issue | Severity | Details |
|-------|----------|---------|
| **No JWT verification** | CRITICAL | Connection requires only `projectId` parameter, which is sent in plaintext URL |
| **No user validation** | CRITICAL | No check that the connecting user owns/has access to the project |
| **No authentication token** | CRITICAL | No token exchange, no session validation |
| **Anyone can connect** | CRITICAL | Any client knowing a projectId can execute terminal commands |
| **No message auth** | HIGH | Messages are processed immediately without additional auth validation |

#### Attack Scenario
```
1. Attacker discovers projectId (e.g., from public repo, URL, logs)
2. Attacker connects: ws://app.com/api/terminal/ws?projectId=12345
3. Connection accepted - NO AUTH REQUIRED
4. Attacker sends: { "type": "input", "data": "rm -rf /" }
5. Command executes with user's privileges
```

#### Risk Assessment
- **Severity:** CRITICAL
- **Exploitability:** VERY HIGH (trivial to exploit)
- **Impact:** Remote Code Execution (RCE) - full control over user's project

#### Recommendations
1. **Add JWT verification at connection time**
2. **Validate user has access to projectId**
3. **Move auth check to connection handler (before accepting connection)**
4. **Add token extraction from query parameters**
5. **Validate token with centralized auth utils**

---

## 3. server/websocket/collaborative-editing-ws.ts

### Status: ⚠️ **SECURITY GAP - Message-Level Auth**

#### Authentication Flow
- **Type:** Raw WebSocket (ws library)
- **Location:** Message handler, NOT connection level

#### Current Implementation (Lines 106-152)

```typescript
private async handleConnection(ws: AuthenticatedWebSocket, request: any) {
    ws.lastActivity = new Date();
    wsMetrics.recordConnection('collaborative-editing');
    
    const clientId = getClientId(ws);
    
    // ⚠️ NO AUTH CHECK - connection accepted immediately
    
    ws.pingInterval = setInterval(() => {
      // ... ping/pong setup
    });

    ws.on('message', async (message: Buffer) => {
      try {
        ws.lastActivity = new Date();
        wsMetrics.recordMessageReceived('collaborative-editing', message.length);
        const msg = JSON.parse(message.toString());
        // ⚠️ Message passed to handler without auth check
        if (!validateMessage(msg)) {
          // ... only validates message schema, NOT auth
          return;
        }
        await this.handleMessage(ws, msg);  // ⚠️ No auth guard
```

#### Message Handler Routing (Lines 179-204)

```typescript
private async handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message.data);  // ⚠️ Auth in message handler
        break;
      case 'join-session':
        await this.handleJoinSession(ws, message.data);  // ⚠️ Can be called before auth
        break;
      case 'document-update':
        await this.handleDocumentUpdate(ws, message.data);  // ⚠️ Can be called before auth
        break;
      case 'cursor-update':
        await this.handleCursorUpdate(ws, message.data);  // ⚠️ Can be called before auth
        break;
      case 'selection-update':
        await this.handleSelectionUpdate(ws, message.data);  // ⚠️ Can be called before auth
        break;
      case 'request-state':
        await this.handleRequestState(ws);  // ⚠️ Can be called before auth
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
```

#### Auth Handler (Lines 207-284)

```typescript
private async handleAuth(ws: AuthenticatedWebSocket, data: { token: string }) {
    try {
      if (!data.token) {
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'Authentication token required' },
        }));
        ws.close(4001, 'Authentication token required');
        return;
      }

      let decoded: { userId: number };
      try {
        decoded = jwt.verify(data.token, process.env.JWT_SECRET || 'dev-secret') as { userId: number };
      } catch (jwtError) {
        logger.error('JWT verification failed:', jwtError);
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'Invalid or expired token' },
        }));
        ws.close(4002, 'Invalid or expired token');
        return;
      }

      const user = await storage.getUser(decoded.userId);
      if (!user) {
        ws.send(JSON.stringify({
          type: 'auth-failed',
          data: { message: 'User not found' },
        }));
        ws.close(4003, 'User not found');
        return;
      }

      // ... auth success - sets ws.userId
      ws.userId = userId;
      ws.username = user.username || 'Anonymous';
```

#### Secondary Auth Checks (Lines 290-296)

```typescript
private async handleJoinSession(
    ws: AuthenticatedWebSocket,
    data: { projectId: string; fileId: number }
  ) {
    if (!ws.userId || !ws.username) {  // ⚠️ Only checks if userId is set
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Not authenticated' },
      }));
      return;
    }
    // ... proceeds with session join
```

#### Security Gaps

| Issue | Severity | Details |
|-------|----------|---------|
| **No connection-level auth** | HIGH | WebSocket accepts connection without any authentication |
| **Auth in message handler** | HIGH | Client must send 'auth' message first, but protocol doesn't enforce this |
| **Client-driven protocol** | MEDIUM | Relies on client to send 'auth' message before others |
| **No early rejection** | HIGH | Unauthenticated clients can connect and receive heartbeat messages |
| **Message reordering possible** | MEDIUM | Malformed clients could send non-auth messages before auth |
| **Implicit trust after userId set** | MEDIUM | Once userId is set, handlers trust it's been properly authenticated |

#### Attack Scenarios

**Scenario 1: Send messages before auth**
```
1. Client connects (accepted - no auth required)
2. Client sends: { "type": "join-session", "data": { "projectId": "123", "fileId": 456 } }
3. Handler checks `if (!ws.userId)` and rejects... but this is defensive
4. Better to ENFORCE auth at connection level
```

**Scenario 2: Socket.IO can be bypassed**
```
1. Raw WebSocket connection establishes
2. Only relies on first message being 'auth' type
3. No guarantee of message ordering/delivery
4. Network conditions could lose/reorder messages
```

#### Risk Assessment
- **Severity:** HIGH
- **Exploitability:** MEDIUM (requires protocol knowledge, but defensive checks are in place)
- **Impact:** Medium - secondary checks prevent some attacks, but not best practice

#### Current Protections
The code HAS some defensive measures:
- ✅ handleJoinSession checks `if (!ws.userId)` (line 290)
- ✅ handleDocumentUpdate checks `if (!ws.sessionId || !ws.userId)` (line 363)
- ✅ handleCursorUpdate checks `if (!ws.sessionId || !ws.userId)` (line 391)
- ✅ handleSelectionUpdate checks `if (!ws.sessionId || !ws.userId)` (line 422)
- ✅ handleRequestState checks `if (!ws.sessionId)` (line 438)

However, these are **reactive checks**, not **proactive authentication**.

#### Recommendations
1. **Add JWT verification before accepting connection** (preferred approach)
2. **Or: Add auth middleware at connection level** (using Socket.IO-like pattern)
3. **Or: Enforce auth message MUST be first and ONLY first auth message allowed**
4. **Add timeout** - if no auth within N seconds, close connection
5. **Add auth state machine** - track auth state, reject non-auth messages before auth

---

## Summary Table

| File | Handler Type | Auth Location | Auth Timing | Risk Level | Action |
|------|--------------|---------------|-------------|-----------|--------|
| **mobile-websocket.ts** | Socket.IO + Middleware | Connection level | Before connection | LOW ✅ | None |
| **terminal.ts** | Raw WebSocket | NONE | MISSING | CRITICAL ⚠️ | Add JWT at connection |
| **collaborative-editing-ws.ts** | Raw WebSocket | Message handler | After connection | HIGH ⚠️ | Add connection-level auth |

---

## Implementation Priority

**Priority 1 (CRITICAL):** server/terminal.ts
- No authentication at all
- Remote code execution vulnerability
- Requires immediate fix

**Priority 2 (HIGH):** server/websocket/collaborative-editing-ws.ts
- Authentication exists but at wrong layer
- Defensive checks present but not guaranteed
- Should be refactored to connection-level auth

**Priority 3 (NONE):** server/websocket/mobile-websocket.ts
- Already properly secured
- Best practice implementation
- Can serve as reference for fixing other files

---

## Recommended Fix Pattern

For WebSocket libraries without built-in middleware support, use connection-level verification:

```typescript
wss.on('connection', async (ws, req) => {
  try {
    // STEP 1: Extract token from query params or headers
    const token = new URL(req.url!, `http://${req.headers.host}`).searchParams.get('token');
    
    // STEP 2: Verify token BEFORE any other processing
    if (!token) {
      ws.close(4001, 'Authentication token required');
      return;
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    } catch (error) {
      ws.close(4002, 'Invalid or expired token');
      return;
    }
    
    // STEP 3: Validate user exists
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      ws.close(4003, 'User not found');
      return;
    }
    
    // STEP 4: Attach authenticated user to socket
    (ws as any).userId = user.id;
    (ws as any).username = user.username;
    
    // STEP 5: NOW accept the connection and attach handlers
    ws.on('message', async (message) => {
      // All messages from here are guaranteed to be from authenticated user
    });
    
  } catch (error) {
    ws.close(1011, 'Internal error');
  }
});
```

---

## References

- [OWASP WebSocket Security](https://owasp.org/www-community/attacks/WebSocket)
- [Socket.IO Authentication](https://socket.io/docs/v4/socket-io-protocol/#authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Audit Complete**  
Next Steps: Implement fixes for Priority 1 and 2 files.
