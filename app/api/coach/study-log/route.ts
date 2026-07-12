import { loadStudyLog, saveStudyLog } from "@/lib/coach/storage";
import { STUDY_FOCI, type StudyFocus } from "@/lib/coach/types";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// One-tap logging for the study third of the one-third rule.
export async function POST(req: NextRequest) {
  const { focus, minutes } = (await req.json()) as {
    focus: StudyFocus;
    minutes: number;
  };
  if (
    !STUDY_FOCI.includes(focus) ||
    typeof minutes !== "number" ||
    minutes <= 0 ||
    minutes > 240
  ) {
    return NextResponse.json(
      { error: "focus and minutes (1-240) required" },
      { status: 400 },
    );
  }

  const log = await loadStudyLog();
  log.push({ t: Math.floor(Date.now() / 1000), focus, minutes });
  await saveStudyLog(log);
  return NextResponse.json({ ok: true });
}
