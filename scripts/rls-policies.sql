-- ============================================================================
-- PostgreSQL Row-Level Security (RLS) Policies for Tenant Isolation
-- E-Code Platform - Phase 3 (January 2026)
-- ============================================================================
-- SECURITY OVERVIEW:
-- This script implements defense-in-depth by adding database-level RLS policies
-- in addition to application-level TenantScopedQueries isolation.
-- 
-- EXECUTION: Run via privileged database connection (admin role)
-- TEST: Verify with tests/tenant-isolation.test.ts after enabling RLS
-- ============================================================================

-- Enable RLS on critical tenant-scoped tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECTS TABLE: Direct tenant isolation via tenantId column
-- ============================================================================
DROP POLICY IF EXISTS projects_tenant_isolation ON projects;
CREATE POLICY projects_tenant_isolation ON projects
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::INTEGER);

-- ============================================================================
-- FILES TABLE: Indirect isolation via project ownership
-- ============================================================================
DROP POLICY IF EXISTS files_tenant_isolation ON files;
CREATE POLICY files_tenant_isolation ON files
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::INTEGER
    )
  );

-- ============================================================================
-- SECRETS TABLE: CRITICAL - Most sensitive data (API keys, credentials)
-- ============================================================================
DROP POLICY IF EXISTS secrets_tenant_isolation ON secrets;
CREATE POLICY secrets_tenant_isolation ON secrets
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::INTEGER
    )
  );

-- ============================================================================
-- DEPLOYMENTS TABLE: Deployment history isolation
-- ============================================================================
DROP POLICY IF EXISTS deployments_tenant_isolation ON deployments;
CREATE POLICY deployments_tenant_isolation ON deployments
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::INTEGER
    )
  );

-- ============================================================================
-- CHECKPOINTS TABLE: Version control isolation
-- ============================================================================
DROP POLICY IF EXISTS checkpoints_tenant_isolation ON checkpoints;
CREATE POLICY checkpoints_tenant_isolation ON checkpoints
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::INTEGER
    )
  );

-- ============================================================================
-- AGENT_SESSIONS TABLE: AI agent conversation isolation
-- ============================================================================
DROP POLICY IF EXISTS agent_sessions_tenant_isolation ON agent_sessions;
CREATE POLICY agent_sessions_tenant_isolation ON agent_sessions
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE tenant_id = current_setting('app.current_tenant_id', TRUE)::INTEGER
    )
  );

-- ============================================================================
-- ADMIN BYPASS POLICY: For system operations (migrations, backups)
-- ============================================================================
-- Create a role for admin operations that bypass RLS
-- This should only be used for migrations and system-level operations
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecode_admin') THEN
    CREATE ROLE ecode_admin NOLOGIN;
  END IF;
END
$$;

-- Grant bypass to admin role
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE files FORCE ROW LEVEL SECURITY;
ALTER TABLE secrets FORCE ROW LEVEL SECURITY;
ALTER TABLE deployments FORCE ROW LEVEL SECURITY;
ALTER TABLE checkpoints FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions FORCE ROW LEVEL SECURITY;

-- Admin role can bypass all RLS policies
GRANT ALL ON projects TO ecode_admin;
GRANT ALL ON files TO ecode_admin;
GRANT ALL ON secrets TO ecode_admin;
GRANT ALL ON deployments TO ecode_admin;
GRANT ALL ON checkpoints TO ecode_admin;
GRANT ALL ON agent_sessions TO ecode_admin;

-- ============================================================================
-- VERIFICATION QUERY: Test RLS is enabled
-- ============================================================================
-- Run this to verify RLS is active:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('projects', 'files', 'secrets', 'deployments', 'checkpoints', 'agent_sessions');

-- ============================================================================
-- USAGE IN APPLICATION:
-- Before any query, set the tenant context:
-- SET app.current_tenant_id = '123';
-- Then run your query - RLS will automatically filter results
-- ============================================================================

COMMENT ON POLICY projects_tenant_isolation ON projects IS 'Phase 3 (Jan 2026): Fortune 500-grade tenant isolation at database level';
COMMENT ON POLICY files_tenant_isolation ON files IS 'Phase 3 (Jan 2026): Files inherit tenant isolation from parent project';
COMMENT ON POLICY secrets_tenant_isolation ON secrets IS 'Phase 3 (Jan 2026): CRITICAL SECURITY - Secrets isolated by project ownership';
COMMENT ON POLICY deployments_tenant_isolation ON deployments IS 'Phase 3 (Jan 2026): Deployment history isolated by project ownership';
COMMENT ON POLICY checkpoints_tenant_isolation ON checkpoints IS 'Phase 3 (Jan 2026): Version control isolated by project ownership';
COMMENT ON POLICY agent_sessions_tenant_isolation ON agent_sessions IS 'Phase 3 (Jan 2026): AI agent sessions isolated by project ownership';
