/**
 * Jest global setup: make sure the dedicated test database exists and is
 * migrated to the current schema before any test file runs.
 *
 * Runs once per `jest` invocation, in Node, outside the test environments.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import postgres from "postgres";
import { getTestDatabaseUrl } from "./lib/db/test-url";

export default async function globalSetup(): Promise<void> {
  const url = getTestDatabaseUrl();
  const dbName = new URL(url).pathname.replace(/^\//, "");

  // Create the test database if it doesn't exist yet (CREATE DATABASE can't
  // run inside a transaction or use parameters, hence unsafe + the identifier
  // quoting; the name is validated by getTestDatabaseUrl).
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1 });
  try {
    const exists =
      await admin`select 1 from pg_database where datname = ${dbName}`;
    if (exists.length === 0) {
      try {
        await admin.unsafe(`create database "${dbName.replace(/"/g, '""')}"`);
      } catch (e) {
        // e.g. Homebrew Postgres where the `chess` role lacks CREATEDB.
        throw new Error(
          `Could not create test database "${dbName}" as the app role — ` +
            `create it once yourself: createdb -O chess ${dbName}\n` +
            `(underlying error: ${e instanceof Error ? e.message : e})`,
        );
      }
    }
  } finally {
    await admin.end();
  }

  // Apply the drizzle migrations (same journal as `npm run db:migrate`).
  const client = postgres(url, { max: 1 });
  try {
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve(__dirname, "drizzle"),
    });
  } finally {
    await client.end();
  }
}
