import { NextResponse, type NextRequest } from "next/server";
import { isCrossOriginWrite } from "@/lib/http";

// CSRF guard: reject cross-origin writes to the coach API. Keeps a malicious
// page you happen to have open from forging POSTs to your local dashboard.
export function middleware(req: NextRequest) {
  if (
    isCrossOriginWrite(
      req.method,
      req.headers.get("origin"),
      req.headers.get("host"),
    )
  ) {
    return NextResponse.json(
      { error: "cross-origin request blocked" },
      { status: 403 },
    );
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/coach/:path*" };
