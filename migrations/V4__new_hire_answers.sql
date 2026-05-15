-- New hire responses: chosen option + confidence band per question (session pinned to template).

CREATE TYPE confidence_band AS ENUM (
  'pct_0_25',
  'pct_26_50',
  'pct_51_75',
  'pct_76_100'
);

CREATE TABLE new_hire_answer (
  quiz_session_id UUID NOT NULL REFERENCES quiz_session(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES question(id) ON DELETE CASCADE,
  selected_option_id UUID NOT NULL REFERENCES question_option(id) ON DELETE CASCADE,
  confidence_band confidence_band NOT NULL,
  PRIMARY KEY (quiz_session_id, question_id)
);

CREATE INDEX idx_new_hire_answer_session ON new_hire_answer (quiz_session_id);
