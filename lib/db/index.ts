import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set — copy .env.example to .env.local and set it, " +
      "then run `npm run db:migrate` (see README).",
  );
}

// One connection pool per process, cached on globalThis to survive Next.js
// dev-mode module reloads (same pattern as the old in-memory caches).
const g = globalThis as { __pg?: ReturnType<typeof postgres> };
const client = (g.__pg ??= postgres(url, {
  // Next dev reloads modules constantly; keep the pool small.
  max: 10,
}));

export const db = drizzle(client, { schema });
export { schema };
