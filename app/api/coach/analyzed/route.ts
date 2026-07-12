import { isChessComGameUrl } from "@/lib/coach/validation";
import { getOrCreateUserId, markAnalyzed } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Records that the user genuinely stepped through a game in the replay —
// the one-third rule's "playing counts only if you really analyze".
export async function POST(req: NextRequest) {
  const body = await req.json();
  const username =
    typeof body?.username === "string" ? body.username : process.env.CHESS_USERNAME;
  if (!isChessComGameUrl(body?.url) || !username) {
    return NextResponse.json({ error: "game url required" }, { status: 400 });
  }

  const userId = await getOrCreateUserId(username);
  await markAnalyzed(userId, body.url);
  return NextResponse.json({ ok: true });
}
