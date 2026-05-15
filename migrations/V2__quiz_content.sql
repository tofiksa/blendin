-- Quiz templates and versioned question sets (stem may contain `{name}` placeholder).

CREATE TABLE quiz_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quiz_template_tenant ON quiz_template (tenant_id);

CREATE TABLE quiz_template_version (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_template_id UUID NOT NULL REFERENCES quiz_template(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_quiz_template_version UNIQUE (quiz_template_id, version_number)
);

CREATE TABLE question (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_template_version_id UUID NOT NULL REFERENCES quiz_template_version(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  stem TEXT NOT NULL,
  CONSTRAINT uq_question_order UNIQUE (quiz_template_version_id, sort_order)
);

CREATE INDEX idx_question_version ON question (quiz_template_version_id);

CREATE TABLE question_option (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  label TEXT NOT NULL,
  CONSTRAINT uq_question_option_order UNIQUE (question_id, sort_order)
);

CREATE INDEX idx_question_option_question ON question_option (question_id);
