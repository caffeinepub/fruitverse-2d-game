# FruitVerse

## Current State
- Fruit merge game with 4 modes: Normal, Speed, Puzzle, Endless
- Boosters: Bomb, Next Fruit Swap, Alignment Line
- Next fruit shown as inline text + canvas ghost at cursor
- No pause mechanic
- No combo/chain system (score is purely per-merge)
- No how-to-play tutorial
- Boosters activate instantly with no visual feedback animation
- Daily reward streak exists but shows no reason when reset
- Backend health monitor exists but no aggressive auto-reconnect on errors
- i18n has 10 languages; `game.multiplier`, `game.personalRecord` keys exist but hardcoded inline

## Requested Changes (Diff)

### Add
- **Pause button** on game screen: toggles `isPaused` state, freezes animation loop, shows semi-transparent pause overlay with Resume button. Pause button visible only during active gameplay (not game over). Add i18n keys: `game.pause`, `game.resume`, `game.paused`.
- **Combo/chain system**: track consecutive merges within 1.5s window. Each chain merge adds +10% bonus (capped at 3x total). Show animated combo counter (e.g., "🔥 x3 COMBO!") that fades out. Add i18n keys: `game.combo`, `game.comboBonus`.
- **Next fruit preview panel**: dedicated small box (top-right of game area or above booster panel) showing the next fruit emoji + name prominently, distinct from the canvas ghost. Already has `game.nextFruit` key.
- **How to play dialog** (HowToPlayDialog component): triggered by a `?` icon button in header. Shows 5 steps with fruit emojis: drop fruits, merge same fruits, boosters explanation, modes, leaderboard. Show automatically on first-ever login (localStorage flag `howToPlayShown`). All text must use i18n keys: `howToPlay.title`, `howToPlay.step1`–`howToPlay.step5`, `howToPlay.close`.
- **Booster visual feedback**: when a booster is activated, show a brief CSS animation on the booster button (scale pulse + colored glow) and an on-canvas text flash (e.g., "💣 BOMBA AKTİF!") for 1.5s.
- **Streak reset reason toast**: when daily reward streak is reset (detected by comparing last login date), show a toast notification explaining the streak was reset due to a missed day. Add i18n key: `dailyReward.streakReset`.
- **Backend auto-reconnect**: in HealthMonitor, on error/disconnected status, retry every 15s (not just 60s). Show a small reconnecting spinner in the status indicator. Add i18n key: `health.reconnecting`.

### Modify
- Fix `game.personalRecord` hardcoded Turkish text in Endless mode to use `t('game.personalRecord')` i18n key.
- Fix `game.multiplier` hardcoded inline in Endless overlay to use `t('game.multiplier', { value })` i18n key.
- Pause logic must integrate with animation loop: when `isPaused`, `requestAnimationFrame` should not advance physics or call `checkGameOver`.
- Combo system integrates into `mergeFruits` function: tracks `lastMergeTime` ref and `comboCount` ref.

### Remove
- Nothing removed.

## Implementation Plan
1. Add all new i18n keys to all 10 languages in `i18n.ts`.
2. Create `HowToPlayDialog.tsx` component with 5 illustrated steps.
3. Add pause state + pause overlay + pause button to `FruitMergeGame.tsx`.
4. Add combo system (refs: `lastMergeTimeRef`, `comboCountRef`) to `mergeFruits` and animate combo counter in canvas or DOM overlay.
5. Add dedicated next fruit preview panel (small card UI) above booster panel.
6. Add booster activation animation (CSS keyframe + canvas flash) triggered by `activeBooster` change.
7. Add streak reset detection + toast in `GamePage.tsx` or daily reward hook.
8. Update `HealthMonitor.tsx` to retry every 15s and show reconnecting state.
9. Fix two i18n hardcoded strings in Endless mode.
