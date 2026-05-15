-- Team guesses: opaque join token (hash at rest) + exactly one submission per token.

CREATE TABLE join_token (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id UUID NOT NULL REFERENCES quiz_session(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_join_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_join_token_session ON join_token (quiz_session_id);

CREATE TABLE team_attempt (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id UUID NOT NULL REFERENCES quiz_session(id) ON DELETE CASCADE,
  join_token_id UUID NOT NULL REFERENCES join_token(id) ON DELETE CASCADE,
  display_name TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_team_attempt_join_token UNIQUE (join_token_id)
);

CREATE INDEX idx_team_attempt_session ON team_attempt (quiz_session_id);

CREATE TABLE team_attempt_answer (
  team_attempt_id UUID NOT NULL REFERENCES team_attempt(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  selected_option_id UUID NOT NULL REFERENCES question_option(id) ON DELETE CASCADE,
  PRIMARY KEY (team_attempt_id, question_id)
);

CREATE INDEX idx_team_attempt_answer_attempt ON team_attempt_answer (team_attempt_id);
