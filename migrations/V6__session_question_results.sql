-- Cached aggregation per question after team phase (tie list + deterministic tie-break outcome).

CREATE TABLE session_question_result (
  quiz_session_id UUID NOT NULL REFERENCES quiz_session(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  vote_counts_json JSONB NOT NULL DEFAULT '{}',
  tied_option_ids UUID[] NOT NULL DEFAULT '{}',
  chosen_option_id UUID REFERENCES question_option(id) ON DELETE SET NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (quiz_session_id, question_id)
);
