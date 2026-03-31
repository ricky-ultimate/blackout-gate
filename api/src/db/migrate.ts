import "dotenv/config";
import { db } from "./client.js";

const sql = `
  CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL UNIQUE,
    label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    repo TEXT NOT NULL,
    environment TEXT NOT NULL,
    branch TEXT,
    triggered_by TEXT,
    window_id TEXT,
    window_name TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('allowed', 'blocked', 'warn', 'overridden')),
    reason TEXT NOT NULL,
    override_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS override_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    window_id TEXT NOT NULL,
    approved_by TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

    CREATE TABLE IF NOT EXISTS org_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
    raw_yaml TEXT NOT NULL,
    parsed_windows JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS audit_log_org_id_idx ON audit_log(org_id);
  CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS override_tokens_token_hash_idx ON override_tokens(token_hash);
`;

async function migrate() {
  const client = await db.connect();
  try {
    await client.query(sql);
    console.log("Migration complete.");
  } finally {
    client.release();
    await db.end();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
