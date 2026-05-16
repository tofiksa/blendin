import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { denyUnlessAdmin } from "@/lib/adminGate";
import { createTenantQuizPack, TenantSlugTakenError } from "@/lib/createTenantQuizPack";
import { createDb } from "@/lib/db/client";
import { adminTenantQuizPackBodySchema } from "@/lib/http/zodBodies";

export async function POST(req: NextRequest) {
  const denied = denyUnlessAdmin(req.headers);
  if (denied) return denied;

  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });

  try {
    const raw = adminTenantQuizPackBodySchema.parse(await req.json());
    const tenant = {
      ...raw.tenant,
      logoUrl: raw.tenant.logoUrl === "" ? null : raw.tenant.logoUrl,
    };
    const created = await createTenantQuizPack(db, {
      tenant,
      quizTemplateName: raw.quizTemplateName,
      questions: raw.questions,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    if (err instanceof TenantSlugTakenError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Ukjent feil" }, { status: 500 });
  }
}
