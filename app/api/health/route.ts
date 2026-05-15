import { NextResponse } from "next/server";
import { getDatabaseStatus } from "@/lib/getDatabaseStatus";

export async function GET(): Promise<Response> {
  const database = await getDatabaseStatus();
  return NextResponse.json({ ok: true, service: "blendIn", database });
}
