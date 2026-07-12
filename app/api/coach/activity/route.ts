import { fetchDailyActivity } from "@/lib/coach/chesscom";
import { TIME_CLASSES } from "@/lib/coach/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 365;
const TIME_CLASS_SET = new Set<string>(TIME_CLASSES);

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
  const days = Math.min(
    366,
    Math.max(30, Number(params.get("days")) || DEFAULT_DAYS),
  );
  const tcParam = params.get("tc") ?? "all";
  const timeClass = TIME_CLASS_SET.has(tcParam) ? tcParam : "all";
  const fromTime = Math.floor(Date.now() / 1000) - days * 86_400;

  try {
    const daysOut = await fetchDailyActivity(username, fromTime, timeClass);
    return NextResponse.json({ fromTime, days: daysOut });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
