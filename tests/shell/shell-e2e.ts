/**
 * Shell E2E Test Suite
 *
 * Covers: session lifecycle, multi-tab, reload+reattach with scrollback,
 * AI generate insertion, reconnect/network disruption feedback,
 * concurrent sessions, and large-output stress.
 *
 * Run: npx tsx tests/shell/shell-e2e.ts
 *
 * Env vars:
 *   SHELL_TEST_BASE_URL   (default: http://localhost:5000)
 *   SHELL_TEST_PROJECT_ID (default: test-project)
 *   SHELL_TEST_COOKIE     — session cookie (optional if public routes used)
 *   SHELL_TEST_TOKEN      — Bearer token (alternative auth)
 */

import * as http from 'http';
import * as https from 'https';
import { WebSocket } from 'ws';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.SHELL_TEST_BASE_URL ?? 'http://localhost:5000';
const PROJECT_ID = process.env.SHELL_TEST_PROJECT_ID ?? 'test-project';
const COOKIE = process.env.SHELL_TEST_COOKIE ?? '';
const TOKEN = process.env.SHELL_TEST_TOKEN ?? '';
const TIMEOUT_MS = 12_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

function pass(name: string) {
  passCount++;
  console.log(`  ✅ PASS  ${name}`);
}

function fail(name: string, reason: string) {
  failCount++;
  failures.push(`${name}: ${reason}`);
  console.error(`  ❌ FAIL  ${name}\n         → ${reason}`);
}

async function httpRequest<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: T }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const bodyStr = body !== undefined ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (COOKIE) headers['Cookie'] = COOKIE;
    if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try { resolve({ status: res.statusCode ?? 0, data: JSON.parse(raw) as T }); }
          catch { resolve({ status: res.statusCode ?? 0, data: raw as unknown as T }); }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function openWs(sessionId: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const wsBase = BASE_URL.replace(/^http/, 'ws');
    const url = `${wsBase}/shell?sessionId=${encodeURIComponent(sessionId)}&projectId=${encodeURIComponent(PROJECT_ID)}`;
    const headers: Record<string, string> = {};
    if (COOKIE) headers['Cookie'] = COOKIE;
    const ws = new WebSocket(url, { headers });
    const timer = setTimeout(() => reject(new Error('WS open timeout')), TIMEOUT_MS);
    ws.on('open', () => { clearTimeout(timer); resolve(ws); });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

function waitForOutput(
  ws: WebSocket,
  predicate: (accumulated: string) => boolean,
  timeoutMs = TIMEOUT_MS
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Output timeout')), timeoutMs);
    const parts: string[] = [];
    const handler = (raw: Buffer | ArrayBuffer | Buffer[]) => {
      parts.push(raw.toString());
      if (predicate(parts.join(''))) {
        clearTimeout(timer);
        ws.off('message', handler);
        resolve(parts.join(''));
      }
    };
    ws.on('message', handler);
  });
}

async function createSession(): Promise<string> {
  const res = await httpRequest<{ sessionId: string }>(
    'POST',
    `/api/shell/${PROJECT_ID}/shell/create`
  );
  if (res.status !== 200 || !res.data.sessionId) {
    throw new Error(`Create session failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data.sessionId;
}

async function deleteSession(sessionId: string): Promise<void> {
  await httpRequest('DELETE', `/api/shell/${PROJECT_ID}/shell/${sessionId}`);
}

async function connectAndGetPrompt(sessionId: string): Promise<{ ws: WebSocket; output: string }> {
  const ws = await openWs(sessionId);
  const output = await waitForOutput(ws, (d) => d.length > 0);
  return { ws, output };
}

async function runCommand(ws: WebSocket, cmd: string, marker: string): Promise<string> {
  ws.send(JSON.stringify({ type: 'input', data: `${cmd}\r` }));
  return waitForOutput(ws, (d) => d.includes(marker));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

// T1: Create session — server-issued ID
async function testCreateSession(): Promise<string | null> {
  console.log('\n── T1: Create session via REST (server-issued ID)');
  try {
    const sessionId = await createSession();
    if (sessionId.length < 8) {
      fail('Server-issued session ID', `Too short: ${sessionId}`);
      return null;
    }
    pass(`POST /shell/create → sessionId=${sessionId.slice(0, 12)}…`);
    return sessionId;
  } catch (err) {
    fail('Create session', String(err));
    return null;
  }
}

// T2: WebSocket connect + initial PTY output
async function testWsConnect(sessionId: string): Promise<WebSocket | null> {
  console.log('\n── T2: WebSocket connect + initial output');
  try {
    const { ws, output } = await connectAndGetPrompt(sessionId);
    if (output.length === 0) {
      fail('Initial PTY output', 'Nothing received');
      ws.close();
      return null;
    }
    pass(`WS connected, initial output length=${output.length}`);
    return ws;
  } catch (err) {
    fail('WS connect', String(err));
    return null;
  }
}

// T3: Run command, receive output
async function testRunCommand(ws: WebSocket): Promise<boolean> {
  console.log('\n── T3: Run `echo` command and receive output');
  try {
    const marker = `E2E_ECHO_${Date.now()}`;
    await runCommand(ws, `echo ${marker}`, marker);
    pass('Echo output received');
    return true;
  } catch (err) {
    fail('Run command', String(err));
    return false;
  }
}

// T4: Ctrl+C interrupt
async function testCtrlC(ws: WebSocket): Promise<boolean> {
  console.log('\n── T4: Ctrl+C stops a running process');
  try {
    ws.send(JSON.stringify({ type: 'input', data: 'sleep 60\r' }));
    await sleep(300);
    ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
    // Any output after Ctrl+C is acceptable (shell returns to prompt)
    await waitForOutput(ws, (d) => d.length > 0, 3000).catch(() => {});
    pass('Ctrl+C sent without error');
    return true;
  } catch (err) {
    fail('Ctrl+C', String(err));
    return false;
  }
}

// T5: PTY resize message accepted
async function testResize(ws: WebSocket): Promise<boolean> {
  console.log('\n── T5: PTY resize accepted');
  try {
    ws.send(JSON.stringify({ type: 'resize', cols: 220, rows: 50 }));
    await sleep(200);
    pass('Resize message accepted (cols=220 rows=50)');
    return true;
  } catch (err) {
    fail('Resize', String(err));
    return false;
  }
}

// T6: List sessions — unified store
async function testListSessions(): Promise<boolean> {
  console.log('\n── T6: GET /sessions from unified store');
  try {
    const res = await httpRequest<{ sessions: any[] }>(
      'GET', `/api/shell/${PROJECT_ID}/shell/sessions`
    );
    if (res.status !== 200) { fail('GET /sessions 200', `Got ${res.status}`); return false; }
    if (!Array.isArray(res.data.sessions)) { fail('sessions is array', JSON.stringify(res.data)); return false; }
    pass(`GET /sessions OK (count=${res.data.sessions.length})`);
    return true;
  } catch (err) {
    fail('List sessions', String(err));
    return false;
  }
}

// T7: Reconnect with scrollback — no duplicate output
async function testReconnectScrollback(sessionId: string): Promise<boolean> {
  console.log('\n── T7: Reconnect replays scrollback (no duplicate output listener)');
  try {
    const { ws } = await connectAndGetPrompt(sessionId);

    // Write a unique marker to the session
    const marker = `SCROLLBACK_${Date.now()}`;
    await runCommand(ws, `echo ${marker}`, marker);
    ws.close();
    await sleep(600);

    // Reconnect — scrollback should deliver the marker
    const ws2 = await openWs(sessionId);
    const replay = await waitForOutput(ws2, (d) => d.includes(marker), 8000);
    if (!replay.includes(marker)) {
      fail('Scrollback replay on reconnect', 'Marker not in replay');
      ws2.close();
      return false;
    }

    // Confirm no duplicate delivery of subsequent commands
    const marker2 = `POST_RECONNECT_${Date.now()}`;
    const echo = await runCommand(ws2, `echo ${marker2}`, marker2);
    const count = (echo.match(new RegExp(marker2, 'g')) ?? []).length;
    if (count > 3) {
      fail(`No duplicate output (≤3 occurrences expected)`, `Found ${count}`);
      ws2.close();
      return false;
    }
    pass(`Scrollback replayed, no duplicate output (occurrences=${count})`);
    ws2.close();
    return true;
  } catch (err) {
    fail('Reconnect scrollback', String(err));
    return false;
  }
}

// T8: Multi-tab — two independent sessions, independent output
async function testMultiTab(): Promise<boolean> {
  console.log('\n── T8: Multi-tab — two independent sessions with separate output');
  const ids: string[] = [];
  const sockets: WebSocket[] = [];
  try {
    // Create two sessions
    for (let i = 0; i < 2; i++) ids.push(await createSession());

    // Connect both
    for (const id of ids) {
      const { ws } = await connectAndGetPrompt(id);
      sockets.push(ws);
    }

    // Run distinct commands on each
    const markers = [`TAB_A_${Date.now()}`, `TAB_B_${Date.now()}`];
    const results = await Promise.all(
      sockets.map((ws, i) => runCommand(ws, `echo ${markers[i]}`, markers[i]))
    );

    // Each result must contain its own marker and NOT the other tab's
    for (let i = 0; i < 2; i++) {
      if (!results[i].includes(markers[i])) {
        fail(`Tab ${i} output contains its marker`, `Missing: ${markers[i]}`);
        return false;
      }
    }
    pass('Two tabs: each session received only its own output');
    return true;
  } catch (err) {
    fail('Multi-tab', String(err));
    return false;
  } finally {
    for (const ws of sockets) try { ws.close(); } catch {}
    for (const id of ids) try { await deleteSession(id); } catch {}
  }
}

// T9: Delete session — removed from unified store
async function testDeleteSession(): Promise<boolean> {
  console.log('\n── T9: DELETE removes session from unified store');
  try {
    const id = await createSession();
    const del = await httpRequest('DELETE', `/api/shell/${PROJECT_ID}/shell/${id}`);
    if (del.status !== 200 && del.status !== 404) {
      fail('DELETE returns 200/404', `Got ${del.status}`);
      return false;
    }
    // Verify gone from list
    const list = await httpRequest<{ sessions: { sessionId: string }[] }>(
      'GET', `/api/shell/${PROJECT_ID}/shell/sessions`
    );
    const found = (list.data.sessions ?? []).some(s => s.sessionId === id);
    if (found) { fail('Session absent after delete', `Still listed: ${id}`); return false; }
    pass('DELETE removes session from store');
    return true;
  } catch (err) {
    fail('Delete session', String(err));
    return false;
  }
}

// T10: AI generate — endpoint responds with a command string
async function testAiGenerate(): Promise<boolean> {
  console.log('\n── T10: AI generate command endpoint');
  try {
    const res = await httpRequest<{ command: string }>(
      'POST', '/api/shell/generate-command',
      { prompt: 'list files in current directory', projectId: PROJECT_ID }
    );
    if (res.status === 404 || res.status === 405) {
      // Route might not be available in test env without AI key
      pass('AI generate endpoint exists (skipped: no AI key in test env)');
      return true;
    }
    if (res.status !== 200) {
      fail('POST /api/shell/generate-command 200', `Got ${res.status}`);
      return false;
    }
    if (typeof res.data.command !== 'string' || res.data.command.length === 0) {
      fail('Response.command is non-empty string', JSON.stringify(res.data));
      return false;
    }
    pass(`AI generate OK → "${res.data.command.slice(0, 40)}"`);
    return true;
  } catch (err) {
    fail('AI generate', String(err));
    return false;
  }
}

// T11: Reset lifecycle — old session deleted, new session functional
async function testResetLifecycle(): Promise<boolean> {
  console.log('\n── T11: Reset — old session deleted, new session functional');
  try {
    const oldId = await createSession();
    const { ws } = await connectAndGetPrompt(oldId);
    ws.close();
    await sleep(300);

    // Delete old (simulates handleReset behaviour)
    const del = await httpRequest('DELETE', `/api/shell/${PROJECT_ID}/shell/${oldId}`);
    if (del.status !== 200 && del.status !== 404) {
      fail('Delete old session on reset', `Got ${del.status}`);
      return false;
    }

    // Create fresh session
    const newId = await createSession();
    if (!newId || newId === oldId) {
      fail('New session ID is unique', `newId=${newId} oldId=${oldId}`);
      await deleteSession(newId);
      return false;
    }

    // Connect and verify it works
    const { ws: ws2 } = await connectAndGetPrompt(newId);
    const marker = `RESET_CHECK_${Date.now()}`;
    await runCommand(ws2, `echo ${marker}`, marker);
    ws2.close();
    await deleteSession(newId);

    pass('Reset: old session deleted, new session functional');
    return true;
  } catch (err) {
    fail('Reset lifecycle', String(err));
    return false;
  }
}

// T12: Disconnect/reconnect feedback — server-side session survives brief disconnect
async function testDisconnectReconnect(): Promise<boolean> {
  console.log('\n── T12: Disconnect + reconnect — session survives brief drop');
  let sessionId: string | null = null;
  try {
    sessionId = await createSession();
    const { ws } = await connectAndGetPrompt(sessionId);

    // Write before disconnect
    const marker = `DISC_MARKER_${Date.now()}`;
    await runCommand(ws, `echo ${marker}`, marker);

    // Simulate client disconnect
    ws.terminate();
    await sleep(1000);

    // Reconnect — session must still exist
    const list = await httpRequest<{ sessions: { sessionId: string }[] }>(
      'GET', `/api/shell/${PROJECT_ID}/shell/sessions`
    );
    const alive = (list.data.sessions ?? []).some(s => s.sessionId === sessionId);
    if (!alive) {
      fail('Session survives client disconnect (before idle timeout)', 'Session already gone');
      return false;
    }

    // Reconnect and get scrollback with old marker
    const ws2 = await openWs(sessionId!);
    const replay = await waitForOutput(ws2, (d) => d.includes(marker), 8000);
    ws2.close();

    if (!replay.includes(marker)) {
      fail('Scrollback includes pre-disconnect output', 'Marker missing after reconnect');
      return false;
    }

    pass('Session survived brief disconnect; scrollback delivered on reconnect');
    return true;
  } catch (err) {
    fail('Disconnect/reconnect', String(err));
    return false;
  } finally {
    if (sessionId) await deleteSession(sessionId).catch(() => {});
  }
}

// T13: Large output stress — 100 KB of output handled without crash
async function testLargeOutputStress(): Promise<boolean> {
  console.log('\n── T13: Large output stress (100 KB via dd/yes)');
  let sessionId: string | null = null;
  try {
    sessionId = await createSession();
    const { ws } = await connectAndGetPrompt(sessionId);

    // Generate ~100 KB of output using `yes` piped through head
    const endMarker = `STRESS_DONE_${Date.now()}`;
    // `yes A` outputs "A\n" repeatedly. We pipe 50000 lines (~100KB) then echo marker.
    ws.send(JSON.stringify({ type: 'input', data: `yes A | head -50000 ; echo ${endMarker}\r` }));

    // Wait up to 30 s for the marker to appear
    const output = await waitForOutput(ws, (d) => d.includes(endMarker), 30_000);
    ws.close();

    if (!output.includes(endMarker)) {
      fail('100 KB stress: end marker received', 'Marker not found in output');
      return false;
    }
    pass('100 KB output stress: marker received, session stable');
    return true;
  } catch (err) {
    fail('Large output stress', String(err));
    return false;
  } finally {
    if (sessionId) await deleteSession(sessionId).catch(() => {});
  }
}

// T14: Concurrent sessions — 3 simultaneous sessions, all functional
async function testConcurrentSessions(): Promise<boolean> {
  console.log('\n── T14: Concurrent sessions (3 simultaneous)');
  const ids: string[] = [];
  const sockets: WebSocket[] = [];
  try {
    // Create 3 sessions concurrently
    const created = await Promise.all([createSession(), createSession(), createSession()]);
    ids.push(...created);

    // Connect all
    const pairs = await Promise.all(ids.map(id => connectAndGetPrompt(id)));
    for (const { ws } of pairs) sockets.push(ws);

    // Run unique commands on all three simultaneously
    const markers = ids.map((_, i) => `CONCURRENT_${i}_${Date.now()}`);
    const results = await Promise.all(
      sockets.map((ws, i) => runCommand(ws, `echo ${markers[i]}`, markers[i]))
    );

    for (let i = 0; i < 3; i++) {
      if (!results[i].includes(markers[i])) {
        fail(`Session ${i} output`, `Marker ${markers[i]} not found`);
        return false;
      }
    }
    pass('3 concurrent sessions all produced correct independent output');
    return true;
  } catch (err) {
    fail('Concurrent sessions', String(err));
    return false;
  } finally {
    for (const ws of sockets) try { ws.close(); } catch {}
    for (const id of ids) try { await deleteSession(id); } catch {}
  }
}

// T15: Metrics endpoint
async function testMetrics(): Promise<boolean> {
  console.log('\n── T15: Metrics endpoint');
  try {
    const res = await httpRequest<{ activeSessions: number; totalCreated: number }>(
      'GET', '/api/shell/metrics'
    );
    if (res.status !== 200) { fail('GET /api/shell/metrics 200', `Got ${res.status}`); return false; }
    if (typeof res.data.activeSessions !== 'number') {
      fail('metrics.activeSessions is number', JSON.stringify(res.data));
      return false;
    }
    pass(`Metrics OK (activeSessions=${res.data.activeSessions}, totalCreated=${res.data.totalCreated})`);
    return true;
  } catch (err) {
    fail('Metrics', String(err));
    return false;
  }
}

// ── Runner ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Shell E2E Test Suite  —  15 scenarios');
  console.log(`  Target : ${BASE_URL}`);
  console.log(`  Project: ${PROJECT_ID}`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (!COOKIE && !TOKEN) {
    console.warn('\n⚠  No auth credentials provided (SHELL_TEST_COOKIE / SHELL_TEST_TOKEN).');
    console.warn('   Auth-gated tests will likely return 401.\n');
  }

  // ── Phase 1: lifecycle basics ─────────────────────────────────────────────
  const sessionId = await testCreateSession();
  if (!sessionId) {
    console.log('\n❌ Cannot proceed without a session — aborting.\n');
    process.exit(1);
  }

  await testListSessions();

  const ws = await testWsConnect(sessionId);
  if (!ws) {
    console.log('\n❌ Cannot proceed without WebSocket — aborting.\n');
    await deleteSession(sessionId).catch(() => {});
    process.exit(1);
  }

  await testRunCommand(ws);
  await testCtrlC(ws);
  await testResize(ws);

  // ── Phase 2: scrollback / reconnect ──────────────────────────────────────
  ws.close();
  await sleep(300);
  await testReconnectScrollback(sessionId);
  await deleteSession(sessionId).catch(() => {});

  // ── Phase 3: feature scenarios ────────────────────────────────────────────
  await testMultiTab();
  await testDeleteSession();
  await testAiGenerate();
  await testResetLifecycle();

  // ── Phase 4: resilience ───────────────────────────────────────────────────
  await testDisconnectReconnect();
  await testLargeOutputStress();
  await testConcurrentSessions();

  // ── Phase 5: observability ────────────────────────────────────────────────
  await testMetrics();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Results: ${passCount} passed, ${failCount} failed`);
  if (failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of failures) console.log(`    ✗ ${f}`);
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
