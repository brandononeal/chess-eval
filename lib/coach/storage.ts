import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { DrillRecord, GameAnalysis } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

// Bump when the shape of cached GameAnalysis changes.
export const CACHE_VERSION = 3;

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
export const saveAnalysisCache = (cache: AnalysisCache) =>
  writeJson("coach-cache.json", cache);

export const loadDrillHistory = () =>
  readJson<DrillHistory>("drill-history.json", {});
export const saveDrillHistory = (history: DrillHistory) =>
  writeJson("drill-history.json", history);

export const cacheKey = (url: string, depth: number) =>
  `${url}@${depth}v${CACHE_VERSION}`;
