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
