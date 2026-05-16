import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { denyUnlessAdmin } from "@/lib/adminGate";
import {
  createQuizPackForExistingTenantSlug,
  QuizTemplateNameTakenError,
} from "@/lib/createQuizPackForExistingTenantSlug";
import { createDb } from "@/lib/db/client";
import { adminQuizPackOnlyBodySchema } from "@/lib/http/zodBodies";

export async function POST(req: NextRequest, ctx: { params: Promise<{ tenantSlug: string }> }) {
  const denied = denyUnlessAdmin(req.headers);
  if (denied) return denied;

  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });

  const { tenantSlug } = await ctx.params;

  try {
    const body = adminQuizPackOnlyBodySchema.parse(await req.json());
    const created = await createQuizPackForExistingTenantSlug(db, tenantSlug, body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    if (err instanceof QuizTemplateNameTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.startsWith("Fant ikke tenant")) {
        return NextResponse.json({ error: msg }, { status: 404 });
      }
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: "Ukjent feil" }, { status: 500 });
  }
}
