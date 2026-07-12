import { parseStudySession } from "@/lib/coach/validation";
import { addStudySession, getOrCreateUserId } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// One-tap logging for the study third of the one-third rule.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const session = parseStudySession(body);
  const username =
    typeof body?.username === "string" ? body.username : process.env.CHESS_USERNAME;
  if (!session || !username) {
    return NextResponse.json(
      { error: "focus and minutes (1-240) required" },
      { status: 400 },
    );
  }

  const userId = await getOrCreateUserId(username);
  await addStudySession(userId, session.focus, session.minutes);
  return NextResponse.json({ ok: true });
}
