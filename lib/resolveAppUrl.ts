export function resolveAppUrl(basePath: string): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  const base = raw.replace(/\/+$/, "");
  const path = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return `${base}${path}`;
}
