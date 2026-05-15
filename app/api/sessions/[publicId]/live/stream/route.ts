import type { NextRequest } from "next/server";
import { createDb } from "@/lib/db/client";
import { buildSessionLiveSnapshot } from "@/lib/sessionLiveSnapshot";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const db = createDb();
  if (!db) return new Response("DATABASE_URL mangler på serveren", { status: 503 });

  const { publicId } = await ctx.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const tickMs = 2500;
      try {
        while (!req.signal.aborted) {
          const snapshot = await buildSessionLiveSnapshot(db, publicId);
          const payload = snapshot ?? { error: "Fant ikke økt." };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          if (!snapshot) break;
          await new Promise((resolve) => setTimeout(resolve, tickMs));
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* lukket */
        }
      }
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
