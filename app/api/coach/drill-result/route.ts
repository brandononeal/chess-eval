import { loadDrillHistory, saveDrillHistory } from "@/lib/coach/storage";
import { sanitizeDrill } from "@/lib/coach/validation";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Records a drill outcome so failed drills resurface on later visits.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const drill = sanitizeDrill(body?.drill);
  const passed = body?.passed;
  if (!drill || typeof passed !== "boolean") {
    return NextResponse.json(
      { error: "valid drill and passed required" },
      { status: 400 },
    );
  }

  const history = await loadDrillHistory();
  const existing = history[drill.id];
  history[drill.id] = {
    drill,
    passed,
    fails: (existing?.fails ?? 0) + (passed ? 0 : 1),
    updatedAt: Math.floor(Date.now() / 1000),
  };
  await saveDrillHistory(history);

  return NextResponse.json({ ok: true });
}
