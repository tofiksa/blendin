-- Live / async facilitation session; pins a template version.

CREATE TYPE session_mode AS ENUM ('async', 'live');

CREATE TYPE session_state AS ENUM (
  'draft',
  'nh_collecting',
  'team_collecting',
  'ready_to_reveal',
  'revealing',
  'completed'
);

CREATE TABLE quiz_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  quiz_template_version_id UUID NOT NULL REFERENCES quiz_template_version(id),
  public_id TEXT NOT NULL,
  mode session_mode NOT NULL DEFAULT 'async',
  state session_state NOT NULL DEFAULT 'draft',
  current_question_index INTEGER NOT NULL DEFAULT 0,
  tie_break_seed TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  nh_locked_at TIMESTAMPTZ,
  nh_token_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_quiz_session_public UNIQUE (public_id)
);

CREATE INDEX idx_quiz_session_tenant ON quiz_session (tenant_id);

CREATE INDEX idx_quiz_session_template_version ON quiz_session (quiz_template_version_id);

CREATE OR REPLACE FUNCTION set_quiz_session_updated_at () RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_quiz_session_updated_at
  BEFORE UPDATE ON quiz_session FOR EACH ROW
  EXECUTE PROCEDURE set_quiz_session_updated_at();
