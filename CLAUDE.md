# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

There is no build, install, lint, or test step — no `package.json`, no bundler, no test suite.

```bash
xdg-open index.html          # open directly
python3 -m http.server 8000  # or serve statically, then http://localhost:8000
```

Verification is manual: play the game in a browser. Any behavior change has to be exercised by playing it, since there are no tests to extend.

## Architecture

Everything is in `game.js` (~300 lines, single non-module script, `'use strict'`), loaded at the end of `<body>` without `defer`.

- **State** lives in module-level `let` globals (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `dropAccum`, `animId`) and is reset by `init()` (`game.js:259`), which doubles as the restart handler. New state must be reset there or it leaks across games.
- **DOM refs** are captured at top level (`game.js:31-41`), so every id used there must exist in `index.html`.
- **Board model**: `ROWS × COLS` ints where the cell value is *simultaneously* the piece type and the index into `COLORS` and `PIECES` (1–7, `0` = empty). Adding a piece means adding entries at the same index in both arrays and widening the range in `randomPiece()` (`game.js:49`).
- **Game loop**: `loop()` (`game.js:243`) is a `requestAnimationFrame` loop accumulating `dt` into `dropAccum`, dropping one row when it exceeds `dropInterval`. `draw()` repaints everything each frame: grid → locked board → ghost (alpha 0.2) → current piece. `drawBlock()` (`game.js:159`) is shared by the main board and the NEXT preview, parameterized by cell size.
- **Pause/resume** (`togglePause`, `game.js:229`) cancels the rAF and must reset `lastTime` before restarting the loop; otherwise the first frame after resume sees a huge `dt`.
- **Piece lifecycle**: `lockPiece()` → `merge()` → `clearLines()` → `spawn()`. Game over is detected inside `spawn()` when the newly promoted piece already collides.
- **Rotation** is transpose+reverse (`rotateCW`) with a simple kick list `[0,-1,1,-2,2]` in `tryRotate()` — not SRS.
- **Scoring/level**: `LINE_SCORES × level`; level rises every 10 lines; `dropInterval = max(100, 1000 - (level-1)*90)`.

## Conventions

- Canvas pixel sizes are hardcoded in `index.html`. `#board` (`300 × 600`) must equal `COLS*BLOCK × ROWS*BLOCK`, and `#next-canvas` (`120 × 120`) equals `4 × NB` from `drawNext()`. Changing `COLS`/`ROWS`/`BLOCK` means updating the HTML too.
- User-facing strings and code comments are Spanish (`<html lang="es">`); identifiers are English. Keep both.
- `README.md` documents the mechanics, controls, and tunable constants in Spanish — update it alongside gameplay changes.

## CI / issue automation

Three workflows in `.github/workflows/`, all authenticated with the `CLAUDE_CODE_OAUTH_TOKEN` secret:

- `claude-issue-triage.yml` — on `issues: [opened, edited]`. Labels the issue and posts a single sticky diagnosis comment (marker `<!-- claude-triage -->`) in Spanish. Read-only on the repo; it never writes code or opens PRs. Skips issues from bots and issues mentioning `@claude` (those go to `claude.yml`).
- `claude.yml` — responds to `@claude` mentions; this is the one that writes the fix and opens the PR.
- `claude-code-review.yml` — reviews PRs.

Intended flow: issue → triage diagnosis → `@claude` comment → PR → review.

The label catalog is a **closed list** in `.github/labels.yml`, applied by `.github/scripts/sync-labels.sh` (run via the `sync-labels.yml` workflow). Adding or renaming a label means editing three places: `labels.yml`, the `LABELS` array in the script, and the allowed-label list inside the triage prompt.
