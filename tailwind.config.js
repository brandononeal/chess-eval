/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        raised: "var(--surface-raised)",
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        ink: "var(--text-primary)",
        "ink-soft": "var(--text-secondary)",
        "ink-faint": "var(--text-faint)",
        brass: "var(--accent)",
        "brass-subtle": "var(--accent-subtle)",
        "brass-contrast": "var(--accent-contrast)",
        win: "var(--result-win)",
        loss: "var(--result-loss)",
        draw: "var(--result-draw)",
        blunder: "var(--severity-blunder)",
        mistake: "var(--severity-mistake)",
        inaccuracy: "var(--severity-inaccuracy)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
