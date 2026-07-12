// One-off importer: ./data/*.json → Postgres. Non-destructive (the JSON files
// are left untouched). Idempotent (ON CONFLICT DO NOTHING), so re-running is
// safe. Usage:
//   DATABASE_URL=... CHESS_USERNAME=you node scripts/import-json.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const CACHE_VERSION = 4;
const DATA_DIR = path.join(process.cwd(), "data");

const DATABASE_URL = process.env.DATABASE_URL;
const CHESS_USERNAME = process.env.CHESS_USERNAME;
if (!DATABASE_URL || !CHESS_USERNAME) {
  console.error("Set DATABASE_URL and CHESS_USERNAME");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
  } catch {
    return fallback;
  }
}

async function main() {
  const username = CHESS_USERNAME.toLowerCase();
  const [{ id: userId }] = await sql`
    INSERT INTO users (chesscom_username) VALUES (${username})
    ON CONFLICT (chesscom_username) DO UPDATE SET chesscom_username = EXCLUDED.chesscom_username
    RETURNING id`;
  console.log(`user ${username} → id ${userId}`);

  // Analysis cache: keys are `${url}@${depth}v${version}`.
  const cache = await readJson("coach-cache.json", {});
  let analyses = 0;
  for (const [key, analysis] of Object.entries(cache)) {
    const at = key.lastIndexOf("@");
    const m = key.slice(at + 1).match(/^(\d+)v(\d+)$/);
    if (at < 0 || !m) continue;
    const url = key.slice(0, at);
    const depth = Number(m[1]);
    const version = Number(m[2]);
    if (version !== CACHE_VERSION) continue;
    await sql`
      INSERT INTO game_analyses (url, depth, cache_version, analysis)
      VALUES (${url}, ${depth}, ${version}, ${sql.json(analysis)})
      ON CONFLICT (url, depth, cache_version) DO NOTHING`;
    analyses++;
  }
  console.log(`game_analyses: ${analyses}`);

  const drills = await readJson("drill-history.json", {});
  let drillCount = 0;
  for (const [drillId, r] of Object.entries(drills)) {
    await sql`
      INSERT INTO drill_history (user_id, drill_id, drill, passed, fails, updated_at)
      VALUES (${userId}, ${drillId}, ${sql.json(r.drill)}, ${r.passed}, ${r.fails ?? 0}, to_timestamp(${r.updatedAt ?? 0}))
      ON CONFLICT (user_id, drill_id) DO NOTHING`;
    drillCount++;
  }
  console.log(`drill_history: ${drillCount}`);

  const analyzed = await readJson("analyzed-games.json", {});
  let analyzedCount = 0;
  for (const [url, t] of Object.entries(analyzed)) {
    await sql`
      INSERT INTO analyzed_games (user_id, url, analyzed_at)
      VALUES (${userId}, ${url}, to_timestamp(${t}))
      ON CONFLICT (user_id, url) DO NOTHING`;
    analyzedCount++;
  }
  console.log(`analyzed_games: ${analyzedCount}`);

  const study = await readJson("study-log.json", []);
  for (const e of study) {
    await sql`
      INSERT INTO study_log (user_id, occurred_at, focus, minutes)
      VALUES (${userId}, to_timestamp(${e.t}), ${e.focus}, ${e.minutes})`;
  }
  console.log(`study_log: ${study.length}`);

  await sql.end();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
