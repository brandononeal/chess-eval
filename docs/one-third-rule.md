# The One-Third Rule

Source: [The One-Third Rule — Next Level Chess (GM Noël Studer)](https://nextlevelchess.com/the-one-third-rule/)

The training framework this app is built around. Studer credits Nate Solon with popularizing the idea.

## The rule

Split chess training time into three equal parts (~33% each):

1. **Tactics** — train motifs, then solve puzzles. Write down the full solution before checking the answer; consistency beats entertainment.
2. **Play & analyze** — play at appropriate time controls (beginners: nothing faster than 5+3), then review the critical moments — where you left theory and where the engine shows a decisive swing.
3. **Specialized study** — openings, endgames, or positional chess. Pick your biggest weakness first, and finish one resource before starting another. Don't skip endgames and positional play entirely.

The point of the fixed split is to kill decision fatigue: without structure, "everything new will look enticing," and you end up shallow across many topics instead of deep in a few.

## Implementation advice from the article

- Schedule specific training slots with a defined resource ("Tuesday 7pm: 30 min of book X"), not vague time blocks.
- Review games at the critical moments only — theory deviations and large eval swings — not move by move.

## How the app maps to it

| Third | App feature |
| --- | --- |
| Tactics | Drills generated from your own worst moves, with engine-verified alternatives and failed-drill resurfacing |
| Play & analyze | W-L-D record, rating trend, ACPL/blunder stats, replay-based game analysis |
| Specialized study | Opening win rates vs. repertoire, weakest-phase recommendation, study-session logging |
