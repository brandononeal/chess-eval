/**
 * Test-database URL resolution, shared by the Jest global setup (create +
 * migrate) and the per-file env override (jest.db-env.ts).
 *
 * The default mirrors the docker-compose.yml / .env.example conventions
 * (user "chess", password "chess", localhost:5432) but points at a dedicated
 * `chess_eval_test` database. Override with TEST_DATABASE_URL if your local
 * Postgres differs — the override still must name a `*_test` database.
 */
export function getTestDatabaseUrl(): string {
  const url =
    process.env.TEST_DATABASE_URL ??
    "postgres://chess:chess@localhost:5432/chess_eval_test";
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith("_test")) {
    // Hard fail rather than ever letting tests touch a non-test database
    // (truncation between tests would wipe it).
    throw new Error(
      `Refusing to run tests against database "${dbName}" — the test ` +
        `database name must end with "_test" (got ${url}). ` +
        `Set TEST_DATABASE_URL to a dedicated test database.`,
    );
  }
  return url;
}
