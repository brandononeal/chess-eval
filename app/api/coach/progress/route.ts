import { getReportProgress, getUserId, type Progress } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const IDLE: Progress = { phase: "idle", current: 0, total: 0 };

export async function GET(req: NextRequest) {
  const username =
    req.nextUrl.searchParams.get("username") ?? process.env.CHESS_USERNAME;
  if (!username) return NextResponse.json(IDLE);
  const userId = await getUserId(username);
  if (userId === null) return NextResponse.json(IDLE);
  return NextResponse.json(await getReportProgress(userId));
}
