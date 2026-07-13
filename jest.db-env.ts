/**
 * Runs (via `setupFiles`) before each test file's modules load, so anything
 * importing lib/db/index.ts connects to the dedicated test database.
 *
 * DATABASE_URL is overwritten unconditionally: Jest tests must never fall
 * back to the dev database from the shell environment or .env.local, and
 * getTestDatabaseUrl() hard-fails unless the target is a `*_test` database.
 *
 * Decision: DB tests run as part of plain `npm test` (no separate gate),
 * because the README's dev setup already requires a running local Postgres
 * (docker compose up -d / Homebrew). `npm run test:db` runs just the DB
 * suite when iterating.
 */
import { getTestDatabaseUrl } from "./lib/db/test-url";

process.env.DATABASE_URL = getTestDatabaseUrl();
