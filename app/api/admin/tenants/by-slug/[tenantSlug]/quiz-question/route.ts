import { type NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminGate";
import { createDb } from "@/lib/db/client";
import { fetchQuizQuestionPreviewForAdmin } from "@/lib/fetchQuizQuestionPreviewForAdmin";

export async function GET(req: NextRequest, ctx: { params: Promise<{ tenantSlug: string }> }) {
  const denied = denyUnlessAdmin(req.headers);
  if (denied) return denied;

  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });

  const { tenantSlug } = await ctx.params;
  const url = new URL(req.url);
  const qt = url.searchParams.get("quizTemplateName");
  const quizTemplateName = qt === null || qt.trim() === "" ? undefined : qt.trim();
  const indexRaw = url.searchParams.get("index") ?? "0";
  const questionIndex = Number.parseInt(indexRaw, 10);
  if (!Number.isFinite(questionIndex) || questionIndex < 0) {
    return NextResponse.json({ error: "Ugyldig index (forventet heltall ≥ 0)." }, { status: 400 });
  }

  const result = await fetchQuizQuestionPreviewForAdmin(
    db,
    tenantSlug,
    quizTemplateName,
    questionIndex,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    question: result.question,
    totalQuestions: result.totalQuestions,
    templateName: result.templateName,
  });
}
