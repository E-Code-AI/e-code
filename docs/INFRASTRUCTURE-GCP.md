# E-code GCP Infrastructure Contract

Date: 2026-04-27
Status: target production infrastructure, non-negotiable.

## Platform

E-code production runs on Google Cloud Platform.

| Layer | Production target |
| --- | --- |
| Object storage | Google Cloud Storage via `@google-cloud/storage` only. No S3, no MinIO, no S3-compatible mode. |
| Web/API compute | Cloud Run stateless services. |
| Workers | Cloud Run Jobs. |
| User code execution | Cloud Run services with gVisor sandbox, custom image per stack, project files mounted from GCS with `gcsfuse`. |
| Database | Cloud SQL Postgres. Dev connects through Cloud SQL Auth Proxy; production Cloud Run connects through `/cloudsql/<instance>` socket. |
| Secrets | Google Secret Manager injected with Cloud Run `--set-secrets`. |
| Terminal/PTY WebSocket | Cloud Run WebSocket sessions, with the 60 minute Cloud Run session limit. Sessions beyond that require the premium Cloud Workstations path. |
| LSP | Runs inside the same Cloud Run runtime container as the user code. |
| Git | `isomorphic-git` on the server or shellout to `git` inside the runtime container. |
| Deployment | Terraform under `infra/terraform/` plus Cloud Build. No manual production deploy path. |

## Architectural Decisions

- Runtime state must be externalized to Cloud SQL, GCS, Redis-compatible managed service if retained, or other managed GCP services. Cloud Run services remain stateless.
- Project files and binary artifacts are stored in GCS. Local filesystem storage is development-only and must not be represented as production-ready.
- Any existing S3, MinIO, Replit Object Storage, or S3-compatible abstraction is a migration gap until replaced or hard-disabled for production.
- Cloud Run user runtimes are isolated by gVisor. The product should not depend on a Docker daemon in production request handlers.
- Long-lived terminal sessions must explicitly document the 60 minute Cloud Run WebSocket boundary and route premium long-running work to Cloud Workstations.

## Required Code Alignment

- Replace `server/services/storage.service.ts` S3 backend with a GCS implementation based on `@google-cloud/storage`.
- Replace production validation that accepts `STORAGE_BACKEND=s3` or Replit storage with GCS-only validation.
- Replace handoff/deployment docs that mention S3/MinIO/Replit storage as production options.
- Add Terraform modules under `infra/terraform/` for Cloud Run services, Cloud Run Jobs, Cloud SQL, GCS buckets, Secret Manager bindings, IAM, and Cloud Build triggers.
- Add Cloud Build pipeline definitions for build, migration, test gates, and deploy.
