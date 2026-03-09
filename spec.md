# FruitVerse

## Current State
FruitVerse is a fruit-merging casual game with 4 modes (Normal, Speed, Puzzle, Endless), 3 boosters (Bomb, NextFruitChange, Alignment Line), leaderboard, daily rewards, and multi-language support. Score is submitted to backend on game over via `useSubmitScore`. The alignment line booster shows a vertical guide for 10 seconds with no explanation tooltip. Speed mode only increases gravity multiplier with no visual differentiation. Puzzle mode shows a small target bar above the canvas. When backend is down (canister stopped), score submission silently fails.

## Requested Changes (Diff)

### Add
- **Offline score queue**: On score submission failure, save `{username, score, timestamp}` to localStorage queue (`pendingScores`). On app load / canister reconnect, drain the queue and resubmit.
- **Speed mode visual identity**: Add an urgent red-orange pulsing border/overlay on the canvas, a speed indicator badge ("⚡ SPEED" animated), and a screen-edge glow effect when in speed mode.
- **Alignment line booster tooltip**: Add a small info tooltip (hover/tap) on the alignment booster button explaining: "Shows a vertical drop guide line for 10 seconds".
- **Booster end signal**: When alignment line's 10-second timer ends, flash a brief "⏰ Süre doldu!" toast and animate the canvas border briefly.
- **Puzzle target prominence**: Make the puzzle target bar bigger, more colorful, with a progress bar fill and fruit emoji animation pulse on each successful merge toward the target.

### Modify
- `FruitMergeGame.tsx`: Add speed mode visual effects (canvas border glow), improve puzzle target display (larger, progress bar), add booster-end animation for alignment, add `window.AndroidAudio.playSound()` calls for all sound events.
- Score submission logic: Wrap in try/catch, on failure push to localStorage queue.
- On app initialization: Check for pending scores queue, attempt resubmission.

### Remove
- Nothing removed.

## Implementation Plan
1. In `FruitMergeGame.tsx`: add speed mode CSS overlay (pulsing border + glow), improve puzzle target display with progress bar
2. In `FruitMergeGame.tsx`: add alignment booster end notification (toast + brief canvas flash), add tooltip to alignment booster button
3. In score submission logic (GamePage or FruitMergeGame): wrap `submitScoreMutation` in try/catch, on error save to `pendingScores` localStorage array
4. In `App.tsx` or `GamePage.tsx` on mount: drain `pendingScores` queue by attempting resubmission
5. Validate and build
