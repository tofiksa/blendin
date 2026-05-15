import { timingSafeStringEqual } from "@/lib/tokenHash";

/** Fastsatt Bearer mot `BLEND_ADMIN_SECRET` (sett i Sliplane / .env). */
export function isAuthorizedAdmin(authHeader: string | null): boolean {
  const secret = process.env.BLEND_ADMIN_SECRET?.trim();
  if (!secret) return false;
  const raw = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!raw) return false;
  return timingSafeStringEqual(secret, raw);
}
