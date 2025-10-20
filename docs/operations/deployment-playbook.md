# Deployment Playbook

This playbook standardizes how we promote the E‑Code platform across environments—from developer laptops to production clusters. Adapt the steps to your cloud provider while keeping the controls and validation gates intact.

## Environment Matrix

| Environment | Purpose | Key Differences |
|-------------|---------|-----------------|
| **Development** | Individual contributor sandboxes | Runs via `npm run dev`, auto-seeds database, relaxed CORS. |
| **Staging** | Pre-production verification | Mirrors production infrastructure, uses sanitized datasets, feature flags enabled. |
| **Production** | Customer-facing workspace | Hardened security, observability integrations, blue/green deployments. |

## Promotion Workflow

1. **Cut Release Candidate**
   - Merge changes into `main` and tag with semantic version (e.g., `v1.4.0-rc1`).
   - Trigger CI pipeline to run `npm test`, `npm run typecheck`, and `npm run build`.
2. **Staging Deploy**
   - Provision infrastructure with `Replit Reserved VM deployment` or equivalent Terraform module.
   - Apply database migrations using `npm run db:push` against the staging connection string.
   - Smoke test core flows: login, project creation, AI assistant prompt, deployment preview.
3. **Operational Review**
   - Validate dashboards in the monitoring tool for error spikes.
   - Confirm audit logs are ingested and access policies remain intact.
   - Capture release notes for customer enablement.
4. **Production Launch**
   - Execute `./deploy-production.sh` with updated image tags and secrets.
   - Perform gradual traffic cutover using load balancer weights or Replit deployment revisions.
   - Announce availability via the in-app banner and status page update.
5. **Post-Deployment**
   - Monitor key metrics for 1–2 hours (error rate, latency, AI request success).
   - Schedule a retro if any incidents occurred.
   - Archive release artifacts in the change management system.

## Secrets & Configuration Management

- Use environment-specific `.env` files only for local testing. For shared environments rely on managed secret stores.
- Rotate `SESSION_SECRET` and provider API keys quarterly or upon incident response.
- Maintain Terraform or Helm values in a private configuration repository with RBAC.

## Observability Checklist

- Ensure `server/services/cdn-optimization.ts` metrics are exported to your monitoring platform.
- Configure alerting for:
  - HTTP 5xx rate > 1% over 5 minutes.
  - Database connection pool saturation.
  - AI provider error rate spikes.
- Ship structured logs (`json`) to centralized storage with 30-day retention.

## Rollback Strategy

1. **Application Rollback**
   - Redeploy the previous known-good container image tag.
   - Re-run `npm run db:push` only if a reversible migration was applied; otherwise execute the paired `down` migration script.
2. **Infrastructure Rollback**
   - Restore from Terraform state snapshots or Helm revision history.
   - Validate DNS and TLS certificates are still valid post-revert.
3. **Communication**
   - Update the status page immediately when rolling back.
   - Notify stakeholders and document the root cause in the incident tracker.

## Appendix

- **Reference Scripts:**
  - `deploy-production.sh` – Default single-port deployment workflow.
  - `deploy-real-app.sh` – Example application deployment with monitoring hooks.
- **Further Reading:**

Keep this playbook synchronized with infrastructure-as-code repositories and quarterly business continuity drills.
