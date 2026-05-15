import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const sessionModeEnum = pgEnum("session_mode", ["async", "live"]);

export const sessionStateEnum = pgEnum("session_state", [
  "draft",
  "nh_collecting",
  "team_collecting",
  "ready_to_reveal",
  "revealing",
  "completed",
]);

export const confidenceBandEnum = pgEnum("confidence_band", [
  "pct_0_25",
  "pct_26_50",
  "pct_51_75",
  "pct_76_100",
]);

export const tenantTable = pgTable("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  surfaceColor: text("surface_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizTemplateTable = pgTable("quiz_template", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quizTemplateVersionTable = pgTable(
  "quiz_template_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizTemplateId: uuid("quiz_template_id")
      .notNull()
      .references(() => quizTemplateTable.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.quizTemplateId, t.versionNumber)],
);

export const questionTable = pgTable(
  "question",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizTemplateVersionId: uuid("quiz_template_version_id")
      .notNull()
      .references(() => quizTemplateVersionTable.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    stem: text("stem").notNull(),
  },
  (t) => [unique().on(t.quizTemplateVersionId, t.sortOrder)],
);

export const questionOptionTable = pgTable(
  "question_option",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionTable.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
    label: text("label").notNull(),
  },
  (t) => [unique().on(t.questionId, t.sortOrder)],
);

export const quizSessionTable = pgTable("quiz_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenantTable.id, { onDelete: "cascade" }),
  quizTemplateVersionId: uuid("quiz_template_version_id")
    .notNull()
    .references(() => quizTemplateVersionTable.id),
  publicId: text("public_id").notNull().unique(),
  mode: sessionModeEnum("mode").notNull().default("async"),
  state: sessionStateEnum("state").notNull().default("draft"),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  tieBreakSeed: text("tie_break_seed").notNull(),
  nhLockedAt: timestamp("nh_locked_at", { withTimezone: true }),
  nhTokenHash: text("nh_token_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newHireAnswerTable = pgTable(
  "new_hire_answer",
  {
    quizSessionId: uuid("quiz_session_id")
      .notNull()
      .references(() => quizSessionTable.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionTable.id, { onDelete: "cascade" }),
    selectedOptionId: uuid("selected_option_id")
      .notNull()
      .references(() => questionOptionTable.id, { onDelete: "cascade" }),
    confidenceBand: confidenceBandEnum("confidence_band").notNull(),
  },
  (t) => [primaryKey({ columns: [t.quizSessionId, t.questionId] })],
);

export const joinTokenTable = pgTable("join_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizSessionId: uuid("quiz_session_id")
    .notNull()
    .references(() => quizSessionTable.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamAttemptTable = pgTable("team_attempt", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizSessionId: uuid("quiz_session_id")
    .notNull()
    .references(() => quizSessionTable.id, { onDelete: "cascade" }),
  joinTokenId: uuid("join_token_id")
    .notNull()
    .unique()
    .references(() => joinTokenTable.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamAttemptAnswerTable = pgTable(
  "team_attempt_answer",
  {
    teamAttemptId: uuid("team_attempt_id")
      .notNull()
      .references(() => teamAttemptTable.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionTable.id, { onDelete: "cascade" }),
    selectedOptionId: uuid("selected_option_id")
      .notNull()
      .references(() => questionOptionTable.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.teamAttemptId, t.questionId] })],
);

export const sessionQuestionResultTable = pgTable(
  "session_question_result",
  {
    quizSessionId: uuid("quiz_session_id")
      .notNull()
      .references(() => quizSessionTable.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionTable.id, { onDelete: "cascade" }),
    voteCountsJson: jsonb("vote_counts_json").notNull().default(sql`'{}'::jsonb`),
    tiedOptionIds: uuid("tied_option_ids").array().notNull().default(sql`'{}'::uuid[]`),
    chosenOptionId: uuid("chosen_option_id").references(() => questionOptionTable.id, {
      onDelete: "set null",
    }),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.quizSessionId, t.questionId] })],
);
