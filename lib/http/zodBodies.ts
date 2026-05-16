import { z } from "zod";

export const nhAnswerLineSchema = z.object({
  questionId: z.string().uuid(),
  optionId: z.string().uuid(),
  confidenceBand: z.enum(["pct_0_25", "pct_26_50", "pct_51_75", "pct_76_100"]),
});

export const nhPatchBodySchema = z.object({
  answers: z.array(nhAnswerLineSchema).min(1),
});

export const nhSubmitBodySchema = z.object({
  answers: z.array(nhAnswerLineSchema).min(1),
});

export const adminCreateSessionBodySchema = z.object({
  mode: z.enum(["async", "live"]),
  quizTemplateName: z.string().min(1).optional(),
  teamLinkCount: z.number().int().min(1).max(100).optional(),
});

/** Fire svaralternativ per spørsmål (samme modell som nyansatt-/lag-UI). */
const fourOptionLabelsSchema = z.tuple([
  z.string().trim().min(1).max(800),
  z.string().trim().min(1).max(800),
  z.string().trim().min(1).max(800),
  z.string().trim().min(1).max(800),
]);

export const adminTenantQuizPackBodySchema = z.object({
  tenant: z.object({
    slug: z
      .string()
      .trim()
      .transform((s) => s.toLowerCase())
      .pipe(
        z
          .string()
          .min(2)
          .max(64)
          .regex(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            "Slug: kun små bokstaver, tall og bindestrek (uten mellomrom).",
          ),
      ),
    name: z.string().trim().min(1).max(160),
    logoUrl: z.union([z.string().trim().url().max(2000), z.literal("")]).optional(),
    primaryColor: z.string().trim().max(32).optional(),
    accentColor: z.string().trim().max(32).optional(),
    surfaceColor: z.string().trim().max(32).optional(),
  }),
  quizTemplateName: z.string().trim().min(1).max(160),
  questions: z
    .array(
      z.object({
        stem: z.string().trim().min(1).max(4000),
        options: fourOptionLabelsSchema,
      }),
    )
    .min(1)
    .max(40),
});

/** Kun mal + spørsmål — tenant må finnes (`POST .../tenants/by-slug/[slug]/quiz-pack`). */
export const adminQuizPackOnlyBodySchema = z.object({
  quizTemplateName: z.string().trim().min(1).max(160),
  questions: z
    .array(
      z.object({
        stem: z.string().trim().min(1).max(4000),
        options: fourOptionLabelsSchema,
      }),
    )
    .min(1)
    .max(40),
});

export const adminPatchSessionBodySchema = z
  .object({
    state: z
      .enum([
        "draft",
        "nh_collecting",
        "team_collecting",
        "ready_to_reveal",
        "revealing",
        "completed",
      ])
      .optional(),
    currentQuestionIndex: z.number().int().min(0).optional(),
  })
  .refine((d) => d.state !== undefined || d.currentQuestionIndex !== undefined, {
    message: "Oppgi minst én av: state, currentQuestionIndex.",
  });

export const teamSubmitBodySchema = z.object({
  displayName: z.string().trim().max(80).nullable().optional(),
  guesses: z.array(
    z.object({
      questionId: z.string().uuid(),
      optionId: z.string().uuid(),
    }),
  ),
});
