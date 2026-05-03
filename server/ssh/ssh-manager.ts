/**
 * SSH Manager - DEPRECATED
 *
 * This file previously contained an unsafe shell-over-TCP prototype and
 * in-memory key storage. It has been superseded by:
 *
 *   - server/routes/ssh-keys.router.ts  — REST API for SSH key management
 *   - shared/schema.ts (sshKeys table)  — persistent database-backed key store
 *   - server/storage.ts (listSshKeys, createSshKey, deleteSshKey, …) — storage layer
 *
 * SSH gateway configuration is driven by the following environment variables:
 *   SSH_GATEWAY_ENABLED=true
 *   SSH_GATEWAY_HOST=<public hostname>
 *   SSH_GATEWAY_PORT=2222
 *   SSH_GATEWAY_USER=runner
 *   SSH_GATEWAY_PROJECT_PATH=/home/runner
 *
 * Do NOT add new code to this file.
 */

export {};
