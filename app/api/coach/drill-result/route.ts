import { isChessComUsername, sanitizeDrill } from "@/lib/coach/validation";
import { getOrCreateUserId, upsertDrillRecord } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Records a drill outcome so failed drills resurface on later visits.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const drill = sanitizeDrill(body?.drill);
  const passed = body?.passed;
  const rawUsername = body?.username;
  const username = isChessComUsername(rawUsername)
    ? rawUsername
    : process.env.CHESS_USERNAME;
  if (!drill || typeof passed !== "boolean" || !username) {
    return NextResponse.json(
      { error: "valid drill and passed required" },
      { status: 400 },
    );
  }

  try {
    const userId = await getOrCreateUserId(username);
    // The fail counter increments atomically in SQL (see upsertDrillRecord),
    // so concurrent submissions can't lose an update.
    await upsertDrillRecord(userId, drill, passed, Math.floor(Date.now() / 1000));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("drill-result route failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
