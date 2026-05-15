import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/requireAdminBearer";

/** Manglende eller feil Bearer mot `BLEND_ADMIN_SECRET`. */
export function denyUnlessAdmin(headers: Headers): NextResponse | null {
  const secret = process.env.BLEND_ADMIN_SECRET?.trim();
  if (!secret)
    return NextResponse.json(
      { error: "Administrasjon er ikke konfigurert (BLEND_ADMIN_SECRET)." },
      { status: 503 },
    );
  if (!isAuthorizedAdmin(headers.get("authorization"))) {
    return NextResponse.json({ error: "Ikke tilgang" }, { status: 401 });
  }
  return null;
}
