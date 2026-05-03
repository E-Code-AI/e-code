-- Add runOnStart to project_workflows
ALTER TABLE project_workflows
  ADD COLUMN IF NOT EXISTS run_on_start boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS project_workflows_run_on_start_idx
  ON project_workflows (run_on_start);

-- Add waitForPort to workflow_tasks
ALTER TABLE workflow_tasks
  ADD COLUMN IF NOT EXISTS wait_for_port integer;
