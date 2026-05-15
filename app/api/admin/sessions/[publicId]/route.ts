import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { denyUnlessAdmin } from "@/lib/adminGate";
import { computeAndPersistSessionQuestionResultsIfNeeded } from "@/lib/computeSessionQuestionResults";
import { createDb } from "@/lib/db/client";
import { adminPatchSessionBodySchema } from "@/lib/http/zodBodies";
import { patchQuizSessionByPublicId } from "@/lib/patchQuizSessionByPublicId";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const denied = denyUnlessAdmin(req.headers);
  if (denied) return denied;

  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });

  const { publicId } = await ctx.params;
  try {
    const body = adminPatchSessionBodySchema.parse(await req.json());
    const row = await patchQuizSessionByPublicId(db, publicId, {
      state: body.state,
      currentQuestionIndex: body.currentQuestionIndex,
    });
    if (!row) return NextResponse.json({ error: "Fant ikke økt." }, { status: 404 });
    if (body.state !== undefined) {
      await computeAndPersistSessionQuestionResultsIfNeeded(db, publicId, row.state);
    }
    return NextResponse.json(
      { publicId, state: row.state, currentQuestionIndex: row.currentQuestionIndex },
      { status: 200 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    throw err;
  }
}
