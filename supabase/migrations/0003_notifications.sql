-- Notifications table for in-app notifications (Phase 2)
-- This is an auxiliary table outside the 7 core tables, justified by spec Phase 2 section 7.

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  user_id     UUID NOT NULL,
  project_id  UUID,
  type        TEXT NOT NULL,
  summary     TEXT NOT NULL,
  event_id    UUID,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_tenant_user ON notifications (tenant_id, user_id, read);
CREATE INDEX idx_notifications_created ON notifications (created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_user_notifications_select" ON notifications
  FOR SELECT
  USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

CREATE POLICY "tenant_notifications_insert" ON notifications
  FOR INSERT
  WITH CHECK (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );

CREATE POLICY "tenant_notifications_update" ON notifications
  FOR UPDATE
  USING (
    tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
  );
