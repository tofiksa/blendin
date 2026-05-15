import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { denyUnlessAdmin } from "@/lib/adminGate";
import { createQuizSessionForTenant } from "@/lib/createQuizSessionForTenant";
import { createDb } from "@/lib/db/client";
import { adminCreateSessionBodySchema } from "@/lib/http/zodBodies";
import { readTenantBySlug } from "@/lib/readTenantBySlug";
import { resolveAppUrl } from "@/lib/resolveAppUrl";

export async function POST(req: NextRequest, ctx: { params: Promise<{ tenantSlug: string }> }) {
  const denied = denyUnlessAdmin(req.headers);
  if (denied) return denied;

  const db = createDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL mangler på serveren" }, { status: 503 });

  const { tenantSlug } = await ctx.params;

  try {
    const body = adminCreateSessionBodySchema.parse(await req.json());
    const tenant = await readTenantBySlug(db, tenantSlug);
    if (!tenant)
      return NextResponse.json({ error: `Fant ikke tenant «${tenantSlug}».` }, { status: 404 });

    const created = await createQuizSessionForTenant(db, {
      tenantId: tenant.id,
      mode: body.mode,
      quizTemplateName: body.quizTemplateName,
      teamLinkCount: body.teamLinkCount ?? 14,
    });

    const nhQ = encodeURIComponent(created.newHirePlainToken);
    const newHireUiPath = `/nyansatt/${created.publicId}?nh=${nhQ}`;
    const newHireApiPath = `/api/sessions/${created.publicId}/new-hire?nh=${nhQ}`;
    const presenterPath = `/presenter/${created.publicId}`;
    const mobilPath = `/mobil/${created.publicId}`;
    const teamUiPaths = created.teamJoinPlainTokens.map((t) => `/lag/${encodeURIComponent(t)}`);
    const teamApiPaths = created.teamJoinPlainTokens.map(
      (t) => `/api/join/${encodeURIComponent(t)}`,
    );
    const payload = {
      publicId: created.publicId,
      sessionId: created.sessionId,
      newHirePlainToken: created.newHirePlainToken,
      teamJoinPlainTokens: created.teamJoinPlainTokens,
      paths: {
        newHire: newHireUiPath,
        newHireApi: newHireApiPath,
        presenter: presenterPath,
        mobil: mobilPath,
        teamJoin: teamUiPaths,
        teamJoinApi: teamApiPaths,
      },
      urls: {
        newHire: resolveAppUrl(newHireUiPath),
        newHireApi: resolveAppUrl(newHireApiPath),
        presenter: resolveAppUrl(presenterPath),
        mobil: resolveAppUrl(mobilPath),
        teamJoin: teamUiPaths.map((p) => resolveAppUrl(p)),
        teamJoinApi: teamApiPaths.map((p) => resolveAppUrl(p)),
      },
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: "Ukjent feil" }, { status: 500 });
  }
}
