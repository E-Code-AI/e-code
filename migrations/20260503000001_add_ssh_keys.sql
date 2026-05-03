-- Migration: Add ssh_keys table for persistent, DB-backed SSH public key storage
-- Keys are associated with users and used by the SSH gateway for authentication.

CREATE TABLE IF NOT EXISTS ssh_keys (
  id          VARCHAR PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label       VARCHAR(100) NOT NULL,
  public_key  TEXT NOT NULL,
  fingerprint VARCHAR(100) NOT NULL,
  key_type    VARCHAR(30) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ssh_keys_user_id_idx ON ssh_keys (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ssh_keys_user_fingerprint_unique ON ssh_keys (user_id, fingerprint);
