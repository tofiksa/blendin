import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/lib/db/client";
import { teamSubmitBodySchema } from "@/lib/http/zodBodies";
import { fetchQuestionPack } from "@/lib/quizQuestions";
import {
  hasTeamSubmittedForJoinToken,
  lookupJoinSessionByPlainToken,
  submitTeamAnswers,
} from "@/lib/teamGuessSubmit";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ plainToken: string }> }) {
  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler" }, { status: 503 });
  const { plainToken } = await ctx.params;
  const token = decodeURIComponent(plainToken);
  const ctxRow = await lookupJoinSessionByPlainToken(db, token);
  if (!ctxRow) return NextResponse.json({ error: "Ugyldig lenke." }, { status: 404 });

  const { joinTokenRow, sessionRow } = ctxRow;
  const submitted = await hasTeamSubmittedForJoinToken(db, joinTokenRow.id);
  const questions = await fetchQuestionPack(db, sessionRow.quizTemplateVersionId);

  return NextResponse.json({
    sessionPublicId: sessionRow.publicId,
    sessionState: sessionRow.state,
    alreadySubmitted: submitted,
    questions,
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ plainToken: string }> }) {
  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler" }, { status: 503 });
  const { plainToken } = await ctx.params;
  const token = decodeURIComponent(plainToken);

  try {
    const body = teamSubmitBodySchema.parse(await req.json());
    const res = await submitTeamAnswers(db, token, body.guesses, body.displayName ?? null);
    switch (res) {
      case "ok":
        return NextResponse.json({ ok: true }, { status: 200 });
      case "duplicate":
        return NextResponse.json(
          { error: "Svaret er allerede levert fra denne lenken." },
          { status: 409 },
        );
      case "unknown_token":
        return NextResponse.json({ error: "Ugyldig lenke." }, { status: 404 });
      case "nh_not_locked":
        return NextResponse.json(
          { error: "Nyansatt må fullføre og låse svarene før teamet gjetter." },
          { status: 400 },
        );
      case "bad_phase":
        return NextResponse.json(
          { error: "Økta er ikke åpen for team-gjetting akkurat nå." },
          { status: 400 },
        );
      case "bad_guess_shape":
        return NextResponse.json(
          { error: "Ugyldig antall eller innhold på gjetting." },
          { status: 400 },
        );
      default:
        return NextResponse.json({ error: "Ukjent tilstand." }, { status: 500 });
    }
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    throw err;
  }
}
