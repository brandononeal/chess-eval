/**
 * Same-origin guard for state-changing requests. A cross-site POST (CSRF)
 * carries the attacker's Origin; a legitimate same-origin fetch carries our
 * own. Non-browser clients (curl, server-to-server) send no Origin and can't
 * be driven by CSRF, so they're allowed through.
 */
export function isCrossOriginWrite(
  method: string,
  origin: string | null,
  host: string | null,
): boolean {
  const m = method.toUpperCase();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return false;
  if (!origin) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true; // malformed Origin — treat as hostile
  }
}
