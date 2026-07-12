import { sanitizeDrill } from "@/lib/coach/validation";
import { getDrillFails, getOrCreateUserId, upsertDrillRecord } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Records a drill outcome so failed drills resurface on later visits.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const drill = sanitizeDrill(body?.drill);
  const passed = body?.passed;
  const username =
    typeof body?.username === "string" ? body.username : process.env.CHESS_USERNAME;
  if (!drill || typeof passed !== "boolean" || !username) {
    return NextResponse.json(
      { error: "valid drill and passed required" },
      { status: 400 },
    );
  }

  const userId = await getOrCreateUserId(username);
  const fails = (await getDrillFails(userId, drill.id)) + (passed ? 0 : 1);
  await upsertDrillRecord(userId, {
    drill,
    passed,
    fails,
    updatedAt: Math.floor(Date.now() / 1000),
  });

  return NextResponse.json({ ok: true });
}
