-- Blend-In (Kaffekopp-indikatoren): core multi-tenant tables.
-- Apply with Flyway against the same PostgreSQL instance Sliplane provides.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT,
  accent_color TEXT,
  surface_color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tenant_slug ON tenant (slug);

-- More tables (sessions, templates, attempts, tokens) will follow in later migrations.
