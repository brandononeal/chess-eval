import { loadDrillHistory, saveDrillHistory } from "@/lib/coach/storage";
import type { Drill } from "@/lib/coach/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Records a drill outcome so failed drills resurface on later visits.
export async function POST(req: NextRequest) {
  const { drill, passed } = (await req.json()) as {
    drill: Drill;
    passed: boolean;
  };
  if (!drill?.id || typeof passed !== "boolean") {
    return NextResponse.json(
      { error: "drill and passed required" },
      { status: 400 },
    );
  }

  const history = await loadDrillHistory();
  const existing = history[drill.id];
  history[drill.id] = {
    drill: { ...drill, isReview: undefined },
    passed,
    fails: (existing?.fails ?? 0) + (passed ? 0 : 1),
    updatedAt: Math.floor(Date.now() / 1000),
  };
  await saveDrillHistory(history);

  return NextResponse.json({ ok: true });
}
