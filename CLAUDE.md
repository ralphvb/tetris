# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running

There is no build, install, lint, or test step — no `package.json`, no bundler, no test suite.

```bash
python3 -m http.server 8000  # then http://localhost:8000
```

**A server is required**: `index.html` loads `src/main.js` as an ES module, and browsers block modules over `file://`. Opening the file directly no longer works.

Verification is manual: play the game in a browser. Any behavior change has to be exercised by playing it, since there are no tests to extend.

## Architecture

The engine is split into ES modules under `src/`, loaded from `index.html` as `<script type="module" src="src/main.js">`. Every file is `'use strict'`. The split exists so the six roadmap upgrades (`docs/upgrades/`) can be developed in parallel branches without fighting over one file — read `docs/upgrades/ARQUITECTURA.md` before changing structure.

- `config.js` constants · `state.js` state + `resetState()` · `events.js` event bus · `board.js` matrix ops · `pieces.js` creation/rotation · `scoring.js` points/level/speed · `render.js` canvas · `hud.js` panel + overlay · `theme.js` light/dark · `actions.js` player actions + piece lifecycle · `input.js` key table · `main.js` rAF loop + wiring · `features/` one module per upgrade.
- **State** is a single exported mutable object `state` (`src/state.js`), not `let` globals — exported `let` bindings are read-only for importers. New state must be declared there **and** reset in `resetState()`, or it leaks across games. Features with their own state subscribe to `EVENTS.RESET`.
- **DOM refs** are captured at module top level in `render.js`, `hud.js` and `theme.js`, so every id used there must exist in `index.html`.
- **Board model**: `ROWS × COLS` ints where the cell value is *simultaneously* the piece type and the index into `COLORS` and `PIECES` (`0` = empty). Adding a piece means adding entries at the same index in both arrays; `PIECE_COUNT` is derived from `PIECES.length`, so `randomPiece()` needs no change.
- **Game loop**: `loop()` (`src/main.js`) accumulates `dt` into `state.dropAccum` and drops one row when it exceeds `state.dropInterval`. `main.js` is the only module that calls `requestAnimationFrame`/`cancelAnimationFrame`. `draw()` repaints everything each frame: grid → locked board → ghost (alpha 0.2) → current piece → registered painters.
- **Piece lifecycle**: `lockPiece()` → `merge()` → `emit(LOCK)` → `clearLines()` → `addLineClearScore()` → `emit(LINES_CLEAR)` → `spawn()` → `emit(SPAWN)`. Game over is detected inside `spawn()` when the newly promoted piece already collides; `endGame()` emits `GAME_OVER` and `main.js` stops the loop, paints the final state and shows the overlay.
- **Pause/resume** goes through `togglePause()` (`actions.js`), which only emits `PAUSE`/`RESUME`; `main.js` stops the loop and resets `state.lastTime` before restarting, otherwise the first frame after resume sees a huge `dt`.
- **Rotation** is transpose+reverse (`rotateCW`) with a simple kick list `KICKS = [0,-1,1,-2,2]` in `tryRotate()` — not SRS.
- **Scoring/level**: `LINE_SCORES × level`; level rises every 10 lines; `dropInterval = max(100, 1000 - (level-1)*90)`.

### Extension points

New behavior hooks into the engine instead of editing it: `on(EVENTS.…)` (`events.js`), `bindKey()` (`input.js`), `registerPainter()` (`render.js`), `registerHudUpdater()` (`hud.js`), `addScoreModifier()` (`scoring.js`), `setPieceSelector()` (`pieces.js`). A feature lives in `src/features/<name>.js` exporting a `register()` and is activated with two lines in `src/features/index.js`. If a change requires editing `main.js`, `actions.js` or the loop, the missing hook should be added as its own PR so every branch gets it.

## Conventions

- Canvas pixel sizes are hardcoded in `index.html`. `#board` (`300 × 600`) must equal `COLS*BLOCK × ROWS*BLOCK`, and `#next-canvas` (`120 × 120`) equals `NEXT_CELLS × NEXT_BLOCK` from `config.js`. Changing `COLS`/`ROWS`/`BLOCK` means updating the HTML too.
- User-facing strings and code comments are Spanish (`<html lang="es">`); identifiers are English. Keep both.
- `README.md` documents the mechanics, controls, and tunable constants in Spanish — update it alongside gameplay changes.

## CI / issue automation

Three workflows in `.github/workflows/`, all authenticated with the `CLAUDE_CODE_OAUTH_TOKEN` secret:

- `claude-issue-triage.yml` — on `issues: [opened, edited]`. Labels the issue and posts a single sticky diagnosis comment (marker `<!-- claude-triage -->`) in Spanish. Read-only on the repo; it never writes code or opens PRs. Skips issues from bots and issues mentioning `@claude` (those go to `claude.yml`).
- `claude.yml` — responds to `@claude` mentions; this is the one that writes the fix and opens the PR.
- `claude-code-review.yml` — reviews PRs.

Intended flow: issue → triage diagnosis → `@claude` comment → PR → review.

The label catalog is a **closed list** in `.github/labels.yml`, applied by `.github/scripts/sync-labels.sh` (run via the `sync-labels.yml` workflow). Adding or renaming a label means editing three places: `labels.yml`, the `LABELS` array in the script, and the allowed-label list inside the triage prompt.

## Branching (roadmap)

`feature/upgrades` is the parent branch for the six upgrades in `docs/upgrades/`. Each one is developed in `upgrade/NN-<name>`, branched from `feature/upgrades` and merged back into it by PR — **never into `main`**. `feature/upgrades` merges to `main` only when the whole roadmap is done. Merge order and per-upgrade specs are in `docs/upgrades/README.md`.
