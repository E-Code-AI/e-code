import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';

// ── Mocks (must be before module imports) ────────────────────────────────────

const mockStorage = {
  listSshKeys: vi.fn(),
  getSshKeyByFingerprint: vi.fn(),
  getSshKeyByFingerprintGlobal: vi.fn(),
  createSshKey: vi.fn(),
  deleteSshKey: vi.fn(),
  touchSshKey: vi.fn(),
  countSshKeys: vi.fn(),
};

vi.mock('../server/storage', () => ({
  getStorage: () => mockStorage,
  storage: mockStorage,
}));

vi.mock('../server/websocket/central-upgrade-dispatcher', () => ({
  centralUpgradeDispatcher: { register: vi.fn() },
}));

// Bypass CSRF in unit tests — we test the business logic, not session handling
vi.mock('../server/middleware/csrf', () => ({
  csrfProtection: (_req: any, _res: any, next: any) => next(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function encodeUint32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function encodeBytes(data: Buffer): Buffer {
  return Buffer.concat([encodeUint32(data.length), data]);
}

function encodeString(s: string): Buffer {
  return encodeBytes(Buffer.from(s));
}

function buildEd25519Blob(): { raw: Buffer; text: string; fingerprint: string } {
  const typeStr = 'ssh-ed25519';
  const keyBytes = crypto.randomBytes(32);
  const raw = Buffer.concat([encodeString(typeStr), encodeBytes(keyBytes)]);
  const text = `${typeStr} ${raw.toString('base64')} test@host`;
  const fingerprint = `SHA256:${crypto.createHash('sha256').update(raw).digest('base64')}`;
  return { raw, text, fingerprint };
}

function buildRsaBlob(modulusBits = 2048): { raw: Buffer; text: string; fingerprint: string } {
  const typeStr = 'ssh-rsa';
  // exponent e = 65537
  const eBuf = Buffer.from([0x01, 0x00, 0x01]);
  // Modulus: leading 0x00 byte (positive sign) + modulusBits/8 bytes of 0xff
  const nBuf = Buffer.concat([Buffer.from([0x00]), Buffer.alloc(Math.ceil(modulusBits / 8), 0xff)]);
  const raw = Buffer.concat([encodeString(typeStr), encodeBytes(eBuf), encodeBytes(nBuf)]);
  const text = `${typeStr} ${raw.toString('base64')} test@host`;
  const fingerprint = `SHA256:${crypto.createHash('sha256').update(raw).digest('base64')}`;
  return { raw, text, fingerprint };
}

// ── App factory ───────────────────────────────────────────────────────────────

const { default: sshKeysRouter } = await import('../server/routes/ssh-keys.router');
import express from 'express';
import request from 'supertest';

function buildApp(userId = 1) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res: any, next: any) => {
    req.user = { id: userId };
    req.isAuthenticated = () => true;
    next();
  });
  app.use('/api/ssh-keys', sshKeysRouter);
  return app;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SSH Keys Router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── GET / ─────────────────────────────────────────────────────────────────

  describe('GET /api/ssh-keys', () => {
    it('returns the key list (without publicKey field)', async () => {
      const now = new Date().toISOString();
      mockStorage.listSshKeys.mockResolvedValue([
        { id: 'k1', label: 'Work laptop', fingerprint: 'SHA256:abc', keyType: 'ed25519', createdAt: now, lastUsedAt: null },
      ]);

      const res = await request(buildApp()).get('/api/ssh-keys');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('k1');
      expect(res.body[0].publicKey).toBeUndefined();
    });
  });

  // ── GET /config ───────────────────────────────────────────────────────────

  describe('GET /api/ssh-keys/config', () => {
    it('returns enabled=false when SSH_GATEWAY_ENABLED is unset', async () => {
      delete process.env.SSH_GATEWAY_ENABLED;
      const res = await request(buildApp()).get('/api/ssh-keys/config');
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });

    it('returns gateway details when SSH_GATEWAY_ENABLED=true', async () => {
      process.env.SSH_GATEWAY_ENABLED = 'true';
      process.env.SSH_GATEWAY_HOST = 'ssh.example.com';
      process.env.SSH_GATEWAY_PORT = '2222';
      const res = await request(buildApp()).get('/api/ssh-keys/config');
      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(true);
      expect(res.body.host).toBe('ssh.example.com');
      expect(res.body.port).toBe(2222);
      delete process.env.SSH_GATEWAY_ENABLED;
      delete process.env.SSH_GATEWAY_HOST;
      delete process.env.SSH_GATEWAY_PORT;
    });
  });

  // ── POST / ───────────────────────────────────────────────────────────────

  describe('POST /api/ssh-keys', () => {
    it('rejects empty label', async () => {
      const { text } = buildEd25519Blob();
      const res = await request(buildApp())
        .post('/api/ssh-keys')
        .send({ label: '', publicKey: text });
      expect(res.status).toBe(400);
    });

    it('rejects invalid base64 in key blob', async () => {
      mockStorage.countSshKeys.mockResolvedValue(0);
      const res = await request(buildApp())
        .post('/api/ssh-keys')
        .send({ label: 'My key', publicKey: 'ssh-ed25519 NOT!!VALID_BASE64 comment' });
      expect(res.status).toBe(422);
    });

    it('rejects unsupported key type (ssh-dss)', async () => {
      mockStorage.countSshKeys.mockResolvedValue(0);
      const fakeBlob = Buffer.alloc(20);
      const text = `ssh-dss ${fakeBlob.toString('base64')} comment`;
      const res = await request(buildApp())
        .post('/api/ssh-keys')
        .send({ label: 'DSA key', publicKey: text });
      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/Unsupported/i);
    });

    it('rejects RSA keys shorter than 2048 bits', async () => {
      mockStorage.countSshKeys.mockResolvedValue(0);
      const { text } = buildRsaBlob(1024);
      const res = await request(buildApp())
        .post('/api/ssh-keys')
        .send({ label: 'Weak RSA', publicKey: text });
      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/2048/);
    });

    it('accepts a valid ed25519 key', async () => {
      const { text, fingerprint } = buildEd25519Blob();
      mockStorage.countSshKeys.mockResolvedValue(0);
      mockStorage.getSshKeyByFingerprint.mockResolvedValue(undefined);
      const created = {
        id: 'new-id', label: 'Laptop', fingerprint, keyType: 'ed25519',
        createdAt: new Date(), lastUsedAt: null,
      };
      mockStorage.createSshKey.mockResolvedValue(created);

      const res = await request(buildApp())
        .post('/api/ssh-keys')
        .send({ label: 'Laptop', publicKey: text });
      expect(res.status).toBe(201);
      expect(res.body.fingerprint).toBe(fingerprint);
      expect(mockStorage.createSshKey).toHaveBeenCalledOnce();
    });

    it('rejects duplicate fingerprint (409)', async () => {
      const { text, fingerprint } = buildEd25519Blob();
      mockStorage.countSshKeys.mockResolvedValue(1);
      mockStorage.getSshKeyByFingerprint.mockResolvedValue({ id: 'existing', fingerprint });

      const res = await request(buildApp())
        .post('/api/ssh-keys')
        .send({ label: 'Dup', publicKey: text });
      expect(res.status).toBe(409);
    });

    it('enforces per-user cap of 20 keys (422)', async () => {
      const { text } = buildEd25519Blob();
      mockStorage.countSshKeys.mockResolvedValue(20);

      const res = await request(buildApp())
        .post('/api/ssh-keys')
        .send({ label: 'Too many', publicKey: text });
      expect(res.status).toBe(422);
      expect(res.body.error).toMatch(/limit/i);
    });
  });

  // ── DELETE /:id ───────────────────────────────────────────────────────────

  describe('DELETE /api/ssh-keys/:id', () => {
    it('returns 404 when key does not belong to the user', async () => {
      mockStorage.deleteSshKey.mockResolvedValue(false);
      const res = await request(buildApp()).delete('/api/ssh-keys/nonexistent');
      expect(res.status).toBe(404);
    });

    it('returns 200 with success=true on deletion', async () => {
      mockStorage.deleteSshKey.mockResolvedValue(true);
      const res = await request(buildApp()).delete('/api/ssh-keys/key-1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});

// ── Gateway helper tests ──────────────────────────────────────────────────────

describe('SSH Gateway helpers', () => {
  it('blobFingerprint matches the canonical SHA256 format', async () => {
    const { blobFingerprint } = await import('../server/ssh/gateway');
    const { raw, fingerprint } = buildEd25519Blob();
    expect(blobFingerprint(raw)).toBe(fingerprint);
  });

  it('isBanned returns false for an unseen IP', async () => {
    const { isBanned } = await import('../server/ssh/gateway');
    expect(isBanned('203.0.113.1')).toBe(false);
  });

  it('isBanned returns true after 5 consecutive failures', async () => {
    const { isBanned, recordFailure } = await import('../server/ssh/gateway');
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
    for (let i = 0; i < 5; i++) recordFailure(ip);
    expect(isBanned(ip)).toBe(true);
  });
});
