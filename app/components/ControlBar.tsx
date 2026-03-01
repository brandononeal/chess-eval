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
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        onClick={onReset}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
      >
        Reset
      </button>
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-sm"
      >
        ← Back
      </button>
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white rounded text-sm"
      >
        Forward →
      </button>
      <button
        onClick={onFlip}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
      >
        Flip
      </button>
      <button
        onClick={onToggleEval}
        className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm"
      >
        {showEval ? "Hide Eval" : "Show Eval"}
      </button>
      <div className="px-4 py-2 bg-zinc-800 text-white rounded text-sm font-semibold">
        {materialDisplay}
      </div>
    </div>
  );
}
