-- Proposals table for transient AI-generated proposals (quotes/invoices)
-- Proposals stay here until approved (then events are created) or rejected.
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  project_id uuid NOT NULL REFERENCES nodes(id),
  type text NOT NULL CHECK (type IN ('quote', 'invoice')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  data jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_tenant_project
  ON proposals(tenant_id, project_id);

CREATE INDEX IF NOT EXISTS idx_proposals_status
  ON proposals(tenant_id, status)
  WHERE status = 'draft';

-- RLS: standard tenant isolation
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY proposals_tenant_isolation ON proposals
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY proposals_tenant_insert ON proposals
  FOR INSERT
  WITH CHECK (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
