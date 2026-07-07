import { getProgress } from "@/lib/coach/progress";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getProgress());
}
