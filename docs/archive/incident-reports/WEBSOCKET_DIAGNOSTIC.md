# WebSocket Connection Diagnostic Guide

## Manual Testing Procedure

### Prerequisites
1. Server running (`npm run dev`)
2. Valid authentication (login required)
3. Browser DevTools open (Console tab)

### Test Steps

**Step 1: Trigger Autonomous Workspace Creation**
1. Navigate to Home page (/)
2. Enter prompt: "Simple counter app"
3. Click "Build" button
4. **Expected:** Redirect to `/ide/:projectId?bootstrap=TOKEN`

**Step 2: Verify Bootstrap Token**
Open browser console and run:
```javascript
const params = new URLSearchParams(window.location.search);
const bootstrapToken = params.get('bootstrap');
console.log('Bootstrap token:', bootstrapToken);
console.log('Token length:', bootstrapToken?.length);
```

**Expected output:** Token should be a JWT string (3 parts separated by dots)

**Step 3: Check AutonomousWorkspaceViewer Rendering**
In console, run:
```javascript
const viewer = document.querySelector('[data-testid="autonomous-workspace-viewer"]');
console.log('Viewer element:', viewer);
console.log('Is visible:', viewer ? 'YES' : 'NO');
```

**Expected output:** `Is visible: YES`

**Step 4: Check Console Logs for WebSocket Attempts**
Look for these log messages in order:

1. `[WebSocket] Interceptor installed (Development mode: true)` ✅
2. `[AutonomousWorkspace] Connecting to WebSocket: wss://...` ⚠️ CRITICAL
3. `[WebSocket] Connection attempt: ... isAgent: true isDev: true` ⚠️ CRITICAL
4. `[WebSocket] Allowing real connection: ...` ⚠️ CRITICAL

**Missing Logs Diagnosis:**
- **If #2 is missing:** Token decode failed OR useEffect not running
- **If #2 exists but #3 missing:** WebSocket interceptor not catching it
- **If #3 shows `isAgent: false`:** URL doesn't contain `/ws/agent`

**Step 5: Check Server Logs**
Look for:
```
[Agent WebSocket] New connection attempt from ... - URL: /ws/agent?projectId=...
[Agent WebSocket] Parsed params - projectId: X, sessionId: Y
[Agent WebSocket] ✅ Connection established: X-Y
```

**Missing Server Logs = Connection never reached server**

## Diagnostic Questions

### Q1: Does `[AutonomousWorkspace] Connecting to WebSocket:` appear?
- **NO:** Token decode failed or component didn't mount
  - Check: Does bootstrap token exist in URL?
  - Check: Does `[data-testid="autonomous-workspace-viewer"]` element exist?
  - Add debug: Insert `console.log` at line 118 in AutonomousWorkspaceViewer.tsx
  
- **YES:** Component is trying to connect → Check Q2

### Q2: Does `[WebSocket] Connection attempt:` appear after?
- **NO:** WebSocket constructor not being called
  - **CAUSE:** Browser cache or script error
  - **FIX:** Hard refresh (Ctrl+Shift+R)
  
- **YES:** Interceptor is working → Check Q3

### Q3: Does it show `isAgent: true`?
- **NO:** URL doesn't contain `/ws/agent`
  - **CAUSE:** Wrong URL format
  - **DEBUG:** Check actual wsUrl in line 131
  
- **YES:** URL is correct → Check Q4

### Q4: Does server show connection attempt?
- **NO:** Connection blocked somewhere (proxy, firewall, or browser)
  - **NUCLEAR FIX:** Disable interceptor temporarily
  
- **YES:** Connection successful → Check for WebSocket handshake errors

## Nuclear Fix (If All Else Fails)

Edit `client/index.html` line 114, change:
```javascript
if (isDevelopment && !url.includes('/@vite') && !url.includes('__vite') && !isAgentWebSocket) {
```

To:
```javascript
if (false) {  // Temporarily disable ALL interception
```

**WARNING:** This breaks Vite HMR, but proves WebSocket works.

## Quick Victory Check

Run this ONE command in browser console after navigating to IDE with bootstrap token:
```javascript
setTimeout(() => {
  console.log('=== DIAGNOSTIC REPORT ===');
  console.log('Bootstrap token exists:', !!new URLSearchParams(window.location.search).get('bootstrap'));
  console.log('Viewer element exists:', !!document.querySelector('[data-testid="autonomous-workspace-viewer"]'));
  console.log('WebSocket attempts:', performance.getEntriesByType('resource').filter(r => r.name.includes('/ws/agent')).length);
  console.log('========================');
}, 5000);
```

**Expected:** All three should be `true` or `> 0`
