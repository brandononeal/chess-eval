interface ControlBarProps {
  onReset: () => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onFlip: () => void;
  showEval: boolean;
  onToggleEval: () => void;
  materialDisplay: string;
}

const BUTTON =
  "rounded-lg border border-line px-4 py-2 text-sm transition-colors hover:bg-raised disabled:opacity-50 disabled:hover:bg-transparent";

export function ControlBar({
  onReset,
  onBack,
  onForward,
  canGoBack,
  canGoForward,
  onFlip,
  showEval,
  onToggleEval,
  materialDisplay,
}: ControlBarProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <button onClick={onReset} className={BUTTON}>
        Reset
      </button>
      <button onClick={onBack} disabled={!canGoBack} className={BUTTON}>
        ← Back
      </button>
      <button onClick={onForward} disabled={!canGoForward} className={BUTTON}>
        Forward →
      </button>
      <button onClick={onFlip} className={BUTTON}>
        Flip
      </button>
      <button onClick={onToggleEval} className={BUTTON}>
        {showEval ? "Hide Eval" : "Show Eval"}
      </button>
      <div className="rounded-lg bg-surface px-4 py-2 font-mono text-sm font-semibold">
        {materialDisplay}
      </div>
    </div>
  );
}
