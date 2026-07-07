export interface Progress {
  phase: "idle" | "fetching" | "analyzing" | "done";
  current: number;
  total: number;
}

// Stored on globalThis so the report route and the progress route share one
// instance across Next.js dev-mode module reloads.
const g = globalThis as { __coachProgress?: Progress };

export function getProgress(): Progress {
  g.__coachProgress ??= { phase: "idle", current: 0, total: 0 };
  return g.__coachProgress;
}

export function setProgress(update: Partial<Progress>): void {
  Object.assign(getProgress(), update);
}
