import { fetchDailyActivity } from "@/lib/coach/chesscom";
import { clampInt, normalizeTimeClass } from "@/lib/coach/validation";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 365;

// Games-per-day counts for the contribution heatmap. Cheap by design:
// month archives are cached in-memory and nothing gets PGN-parsed.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const username = params.get("username") ?? process.env.CHESS_USERNAME;
  if (!username) {
    return NextResponse.json(
      { error: "Set CHESS_USERNAME in .env.local (see .env.example)" },
      { status: 400 },
    );
  }
  const days = clampInt(params.get("days"), 30, 366, DEFAULT_DAYS);
  const timeClass = normalizeTimeClass(params.get("tc"));
  const fromTime = Math.floor(Date.now() / 1000) - days * 86_400;

  try {
    const daysOut = await fetchDailyActivity(username, fromTime, timeClass);
    return NextResponse.json({ fromTime, days: daysOut });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
