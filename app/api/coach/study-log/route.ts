import { isChessComUsername, parseStudySession } from "@/lib/coach/validation";
import { addStudySession, getOrCreateUserId } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// One-tap logging for the study third of the one-third rule.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const session = parseStudySession(body);
  const rawUsername = body?.username;
  const username = isChessComUsername(rawUsername)
    ? rawUsername
    : process.env.CHESS_USERNAME;
  if (!session || !username) {
    return NextResponse.json(
      { error: "focus and minutes (1-240) required" },
      { status: 400 },
    );
  }

  try {
    const userId = await getOrCreateUserId(username);
    await addStudySession(userId, session.focus, session.minutes);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("study-log route failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
