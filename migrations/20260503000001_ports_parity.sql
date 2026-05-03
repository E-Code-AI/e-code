-- Ports Panel Parity: add source, detectedAt, lastSeenAt columns
ALTER TABLE "networking_ports"
  ADD COLUMN IF NOT EXISTS "source" varchar(50) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "detected_at" timestamp,
  ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;

-- Ensure networking_ports and networking_domains exist (no-op if already present)
CREATE TABLE IF NOT EXISTS "networking_ports" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id"),
  "port" integer NOT NULL,
  "internal_port" integer NOT NULL,
  "external_port" integer NOT NULL,
  "label" varchar(255) DEFAULT '',
  "protocol" varchar(50) NOT NULL DEFAULT 'http',
  "is_public" boolean NOT NULL DEFAULT false,
  "expose_localhost" boolean NOT NULL DEFAULT false,
  "listening" boolean NOT NULL DEFAULT false,
  "localhost_only" boolean NOT NULL DEFAULT false,
  "proxy_url" text,
  "external_url" text,
  "source" varchar(50) NOT NULL DEFAULT 'manual',
  "detected_at" timestamp,
  "last_seen_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "networking_domains" (
  "id" serial PRIMARY KEY,
  "project_id" integer NOT NULL REFERENCES "projects"("id"),
  "domain" varchar(255) NOT NULL,
  "verified" boolean NOT NULL DEFAULT false,
  "verification_token" varchar(255) NOT NULL,
  "ssl_status" varchar(50) NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "verified_at" timestamp
);
