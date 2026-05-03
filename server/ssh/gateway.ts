// @ts-nocheck
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { Server: SshServer, utils: sshUtils } = _require('ssh2');

import * as crypto from 'crypto';
import { createLogger } from '../utils/logger';
import { getStorage } from '../storage';

const logger = createLogger('ssh-gateway');

// ── Auth failure tracking (fail2ban-style) ──────────────────────────────────
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 60_000;    // 5 failures within 60 s triggers ban
const BAN_DURATION_MS = 15 * 60_000; // 15-minute ban

interface FailureRecord {
  count: number;
  windowStart: number;
  bannedUntil: number;
}

const failureMap = new Map<string, FailureRecord>();

function isBanned(ip: string): boolean {
  const rec = failureMap.get(ip);
  return !!rec && rec.bannedUntil > Date.now();
}

function recordFailure(ip: string): void {
  const now = Date.now();
  let rec = failureMap.get(ip) ?? { count: 0, windowStart: now, bannedUntil: 0 };

  if (now - rec.windowStart > FAILURE_WINDOW_MS) {
    rec = { count: 0, windowStart: now, bannedUntil: 0 };
  }

  rec.count += 1;
  if (rec.count >= MAX_FAILURES) {
    rec.bannedUntil = now + BAN_DURATION_MS;
    logger.warn({ action: 'ssh.ip.banned', ip, failureCount: rec.count });
  }

  failureMap.set(ip, rec);
}

// Sweep expired records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of failureMap) {
    if (rec.bannedUntil < now && now - rec.windowStart > BAN_DURATION_MS) {
      failureMap.delete(ip);
    }
  }
}, 5 * 60_000).unref();

// ── Host key ─────────────────────────────────────────────────────────────────
function getHostKey(): Buffer {
  if (process.env.SSH_GATEWAY_HOST_KEY) {
    return Buffer.from(process.env.SSH_GATEWAY_HOST_KEY, 'base64');
  }
  // Ephemeral ed25519 key for development — not stable across restarts
  const { privateKey } = crypto.generateKeyPairSync('ed25519');
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  logger.warn(
    '[SSH Gateway] Using ephemeral host key — set SSH_GATEWAY_HOST_KEY env var for a stable fingerprint'
  );
  return Buffer.from(pem);
}

// ── Fingerprint helper (mirrors ssh-keys.router.ts) ──────────────────────────
function blobFingerprint(blob: Buffer): string {
  return `SHA256:${crypto.createHash('sha256').update(blob).digest('base64')}`;
}

// ── Shell spawner ────────────────────────────────────────────────────────────
async function spawnShell(stream: any, ptyInfo: any): Promise<void> {
  const cwd = process.env.SSH_GATEWAY_PROJECT_PATH || process.env.HOME || '/home/runner';

  try {
    const { default: pty } = await import('node-pty');
    const term = pty.spawn(process.env.SHELL || '/bin/bash', [], {
      name: ptyInfo?.term || 'xterm-256color',
      cols: ptyInfo?.cols || 80,
      rows: ptyInfo?.rows || 24,
      cwd,
      env: { ...process.env, TERM: ptyInfo?.term || 'xterm-256color' } as any,
    });

    stream.pipe(term as any);
    (term as any).on('data', (d: Buffer | string) => stream.write(d));
    (term as any).on('exit', (code: number) => {
      stream.exit(code ?? 0);
      stream.end();
    });
    stream.on('close', () => (term as any).kill());
  } catch {
    // Fallback: plain subprocess if node-pty is unavailable
    const { spawn } = await import('child_process');
    const proc = spawn(process.env.SHELL || '/bin/bash', [], { cwd });
    proc.stdout.pipe(stream);
    proc.stderr.pipe(stream.stderr);
    stream.stdin.pipe(proc.stdin);
    proc.on('close', (code: number) => {
      stream.exit(code ?? 0);
      stream.end();
    });
    stream.on('close', () => proc.kill());
  }
}

// ── Gateway lifecycle ────────────────────────────────────────────────────────
let _server: InstanceType<typeof SshServer> | null = null;

export async function startSshGateway(): Promise<void> {
  const enabled = process.env.SSH_GATEWAY_ENABLED === 'true';
  if (!enabled) {
    logger.info('[SSH Gateway] Disabled — set SSH_GATEWAY_ENABLED=true to activate');
    return;
  }

  const port = parseInt(process.env.SSH_GATEWAY_PORT || '2222', 10);
  const hostKey = getHostKey();

  _server = new SshServer({ hostKeys: [hostKey] }, (client) => {
    const ip: string = (client as any)._sock?.remoteAddress ?? 'unknown';

    if (isBanned(ip)) {
      logger.warn({ action: 'ssh.connection.rejected', reason: 'banned', ip });
      client.end();
      return;
    }

    let ptyInfo: any = null;

    client.on('authentication', async (ctx) => {
      if (ctx.method !== 'publickey') {
        return ctx.reject(['publickey']);
      }

      const keyBlob: Buffer = ctx.key.data;
      const fingerprint = blobFingerprint(keyBlob);

      try {
        const storage = getStorage();
        const sshKeyRecord = await storage.getSshKeyByFingerprintGlobal(fingerprint);

        if (!sshKeyRecord) {
          recordFailure(ip);
          logger.info({ action: 'ssh.auth.failure', reason: 'unknown_key', fingerprint, ip });
          return ctx.reject();
        }

        // Parse the stored public key text to verify the blob & signature
        const parsed = sshUtils.parseKey(sshKeyRecord.publicKey);
        if (!parsed || parsed instanceof Error) {
          recordFailure(ip);
          logger.error({ action: 'ssh.auth.failure', reason: 'parse_error', fingerprint, ip });
          return ctx.reject();
        }

        // Constant-time blob comparison
        const storedBlob = parsed.getPublicSSH?.() ?? Buffer.alloc(0);
        if (
          keyBlob.length !== storedBlob.length ||
          !crypto.timingSafeEqual(keyBlob, storedBlob)
        ) {
          recordFailure(ip);
          logger.info({ action: 'ssh.auth.failure', reason: 'blob_mismatch', fingerprint, ip });
          return ctx.reject();
        }

        if (!ctx.signature) {
          // Key probe — confirm key is acceptable without consuming an auth attempt
          return ctx.accept();
        }

        // Verify the signature
        const sigValid = parsed.verify(ctx.blob, ctx.signature, ctx.key.algo);
        if (sigValid === false) {
          recordFailure(ip);
          logger.info({
            action: 'ssh.auth.failure',
            reason: 'bad_signature',
            fingerprint,
            ip,
            userId: sshKeyRecord.userId,
          });
          return ctx.reject();
        }

        // ✅ Auth success
        await storage.touchSshKey(sshKeyRecord.id);
        logger.info({
          action: 'ssh.auth.success',
          userId: sshKeyRecord.userId,
          keyId: sshKeyRecord.id,
          fingerprint,
          ip,
        });

        // Store context for session handler
        (client as any)._sshKeyRecord = sshKeyRecord;
        ctx.accept();
      } catch (err: any) {
        logger.error({ action: 'ssh.auth.error', error: err.message, fingerprint, ip });
        ctx.reject();
      }
    });

    client.on('ready', () => {
      client.on('session', (accept) => {
        const session = accept();

        session.on('pty', (accept, _reject, info) => {
          ptyInfo = info;
          accept();
        });

        session.on('shell', (accept) => {
          const stream = accept();
          spawnShell(stream, ptyInfo).catch((err) => {
            stream.write(`\r\nShell error: ${err.message}\r\n`);
            stream.end();
          });
        });

        session.on('exec', (accept, _reject, info) => {
          const stream = accept();
          import('child_process').then(({ spawn }) => {
            const cwd = process.env.SSH_GATEWAY_PROJECT_PATH || '/home/runner';
            const proc = spawn('/bin/sh', ['-c', info.command], { cwd });
            proc.stdout.pipe(stream);
            proc.stderr.pipe(stream.stderr);
            stream.stdin.pipe(proc.stdin);
            proc.on('close', (code: number) => {
              stream.exit(code ?? 0);
              stream.end();
            });
            stream.on('close', () => proc.kill());
          });
        });
      });
    });

    client.on('error', (err) => {
      logger.debug(`[SSH Gateway] Client ${ip} error: ${err.message}`);
    });

    client.on('end', () => {
      logger.debug(`[SSH Gateway] Client ${ip} disconnected`);
    });
  });

  _server.on('error', (err) => {
    logger.error(`[SSH Gateway] Server error: ${err.message}`);
  });

  await new Promise<void>((resolve, reject) => {
    _server!.listen(port, '0.0.0.0', () => {
      logger.info(`[SSH Gateway] ✅ Listening on port ${port}`);
      resolve();
    });
    _server!.once('error', reject);
  });
}

export function stopSshGateway(): void {
  if (_server) {
    (_server as any).close();
    _server = null;
    logger.info('[SSH Gateway] Stopped');
  }
}

export { isBanned, recordFailure, blobFingerprint };
