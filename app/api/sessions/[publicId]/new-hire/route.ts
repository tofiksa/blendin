import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDb } from "@/lib/db/client";
import { nhPatchBodySchema, nhSubmitBodySchema } from "@/lib/http/zodBodies";
import {
  finalizeNewHireAnswers,
  listNewHireAnswers,
  matchesNewHireToken,
  type NewHireAnswerInput,
  upsertNewHireDraft,
} from "@/lib/newHireAnswers";
import { fetchQuestionPack } from "@/lib/quizQuestions";
import { readQuizSessionByPublicId } from "@/lib/readQuizSessionByPublicId";

function nhFromUrl(req: NextRequest): string | null {
  return req.nextUrl.searchParams.get("nh");
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler" }, { status: 503 });
  const { publicId } = await ctx.params;
  const sess = await readQuizSessionByPublicId(db, publicId);
  if (!sess) return NextResponse.json({ error: "Fant ikke økt." }, { status: 404 });
  const nh = nhFromUrl(req);
  if (!nh?.trim() || !matchesNewHireToken(sess.nhTokenHash, nh)) {
    return NextResponse.json({ error: "Mangler eller ugyldig nh-token." }, { status: 401 });
  }
  const questions = await fetchQuestionPack(db, sess.quizTemplateVersionId);
  const savedAnswers = await listNewHireAnswers(db, sess.id);

  return NextResponse.json({
    publicId,
    locked: sess.nhLockedAt != null,
    sessionState: sess.state,
    questions,
    savedAnswers,
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler" }, { status: 503 });
  const { publicId } = await ctx.params;
  const nh = nhFromUrl(req);
  if (!nh?.trim()) return NextResponse.json({ error: "Legg nh=<token> i query." }, { status: 401 });
  try {
    const body = nhPatchBodySchema.parse(await req.json());
    const sess = await readQuizSessionByPublicId(db, publicId);
    if (!sess) return NextResponse.json({ error: "Fant ikke økt." }, { status: 404 });
    await upsertNewHireDraft(
      db,
      sess.id,
      sess.quizTemplateVersionId,
      sess.nhLockedAt,
      sess.state,
      nh,
      sess.nhTokenHash,
      body.answers as NewHireAnswerInput[],
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Ukjent feil" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler" }, { status: 503 });
  const { publicId } = await ctx.params;
  const nh = nhFromUrl(req);
  if (!nh?.trim()) return NextResponse.json({ error: "Legg nh=<token> i query." }, { status: 401 });
  try {
    const body = nhSubmitBodySchema.parse(await req.json());
    const sess = await readQuizSessionByPublicId(db, publicId);
    if (!sess) return NextResponse.json({ error: "Fant ikke økt." }, { status: 404 });
    await finalizeNewHireAnswers(db, sess, nh, body.answers as NewHireAnswerInput[]);
    return NextResponse.json({ ok: true, sessionState: "team_collecting" });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Ukjent feil" }, { status: 500 });
  }
}
