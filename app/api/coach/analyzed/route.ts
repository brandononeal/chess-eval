import { isChessComGameUrl, isChessComUsername } from "@/lib/coach/validation";
import { getOrCreateUserId, markAnalyzed } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Records that the user genuinely stepped through a game in the replay —
// the one-third rule's "playing counts only if you really analyze".
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const url = body?.url;
  const rawUsername = body?.username;
  const username = isChessComUsername(rawUsername)
    ? rawUsername
    : process.env.CHESS_USERNAME;
  if (!isChessComGameUrl(url) || !username) {
    return NextResponse.json({ error: "game url required" }, { status: 400 });
  }

  try {
    const userId = await getOrCreateUserId(username);
    await markAnalyzed(userId, url);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("analyzed route failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
