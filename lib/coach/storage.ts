import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { DrillRecord, GameAnalysis, StudyLogEntry } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

// Bump when the shape of cached GameAnalysis changes.
export const CACHE_VERSION = 4;

export type AnalysisCache = Record<string, GameAnalysis>;
export type DrillHistory = Record<string, DrillRecord>;

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(path.join(DATA_DIR, file), JSON.stringify(value));
}

export const loadAnalysisCache = () =>
  readJson<AnalysisCache>("coach-cache.json", {});

export const saveAnalysisCache = (cache: AnalysisCache) => {
  // Entries from superseded CACHE_VERSIONs can never be read again —
  // prune them so the file doesn't grow forever.
  const pruned: AnalysisCache = {};
  const suffix = `v${CACHE_VERSION}`;
  for (const [key, value] of Object.entries(cache)) {
    if (key.endsWith(suffix)) pruned[key] = value;
  }
  return writeJson("coach-cache.json", pruned);
};

export const loadDrillHistory = () =>
  readJson<DrillHistory>("drill-history.json", {});
export const saveDrillHistory = (history: DrillHistory) =>
  writeJson("drill-history.json", history);

/** Game URL → epoch seconds when the user replayed through it. */
export type AnalyzedGames = Record<string, number>;

export const loadAnalyzedGames = () =>
  readJson<AnalyzedGames>("analyzed-games.json", {});
export const saveAnalyzedGames = (games: AnalyzedGames) =>
  writeJson("analyzed-games.json", games);

export const loadStudyLog = () =>
  readJson<StudyLogEntry[]>("study-log.json", []);
export const saveStudyLog = (log: StudyLogEntry[]) =>
  writeJson("study-log.json", log);

export const cacheKey = (url: string, depth: number) =>
  `${url}@${depth}v${CACHE_VERSION}`;
