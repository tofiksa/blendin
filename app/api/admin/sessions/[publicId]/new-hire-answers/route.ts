import { type NextRequest, NextResponse } from "next/server";
import { denyUnlessAdmin } from "@/lib/adminGate";
import { createDb } from "@/lib/db/client";
import { listNewHireAnswers } from "@/lib/newHireAnswers";
import { readQuizSessionByPublicId } from "@/lib/readQuizSessionByPublicId";

export async function GET(req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const denied = denyUnlessAdmin(req.headers);
  if (denied) return denied;

  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });

  const { publicId } = await ctx.params;
  const sess = await readQuizSessionByPublicId(db, publicId);
  if (!sess) return NextResponse.json({ error: "Fant ikke økt." }, { status: 404 });
  if (!sess.nhLockedAt) {
    return NextResponse.json({ error: "Nyansatt har ikke låst svarene ennå." }, { status: 400 });
  }

  const answers = await listNewHireAnswers(db, sess.id);
  return NextResponse.json({ answers }, { status: 200 });
}
