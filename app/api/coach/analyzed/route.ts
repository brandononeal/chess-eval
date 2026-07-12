import { loadAnalyzedGames, saveAnalyzedGames } from "@/lib/coach/storage";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Records that the user genuinely stepped through a game in the replay —
// the one-third rule's "playing counts only if you really analyze".
export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (typeof url !== "string" || !url.startsWith("https://www.chess.com/")) {
    return NextResponse.json({ error: "game url required" }, { status: 400 });
  }

  const analyzed = await loadAnalyzedGames();
  if (!analyzed[url]) {
    analyzed[url] = Math.floor(Date.now() / 1000);
    await saveAnalyzedGames(analyzed);
  }
  return NextResponse.json({ ok: true });
}
