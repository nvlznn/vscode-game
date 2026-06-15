# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A VS Code extension ("Game Hub") that plays small games inside a webview panel. The command `games.open` (keybind `Ctrl+Shift+G` / `Cmd+Shift+G`) shows a QuickPick menu of registered games; selecting one renders it in a shared webview panel.

## Commands

- `npm run build` — bundle the extension with esbuild into `dist/` (also copies webview assets; see below)
- `npm run watch` — rebuild + re-copy assets on change
- `npm run compile` — type-check only (`tsc --noEmit`), no emit. Run this to validate types since esbuild does not type-check.
- **F5** in VS Code — launches the Extension Development Host (runs `npm: build` first via `.vscode/launch.json`)

There is no test suite.

## Architecture

The extension splits into a Node-side host (TypeScript, bundled) and per-game webview assets (plain JS/CSS, copied not bundled).

**Game registry pattern** — the core abstraction. Adding a game requires no changes to the panel, picker, or build:
1. Create `src/games/<id>/` with `index.ts` (a `Game` implementation), plus `game.js` and `style.css`.
2. Add the game to the `games` array in [src/gameRegistry.ts](src/gameRegistry.ts).

The `Game` interface ([src/gameRegistry.ts](src/gameRegistry.ts)) is: `id`, `label`, optional `description`, and `getHtml(webview, extensionUri, nonce)` which returns the full webview HTML.

**Control flow:**
- [src/extension.ts](src/extension.ts) registers `games.open`, shows the QuickPick built from the registry, resolves the picked `Game`, and calls `GamePanel.show`.
- [src/gamePanel.ts](src/gamePanel.ts) owns a **singleton** `WebviewPanel` (`GamePanel.current`). Opening another game reuses the same panel via `load()` rather than creating a new one. It also bridges high-score persistence.

**High scores** are stored in `context.globalState` under a per-game key `highscore.<gameId>` (see `highScoreKey` in [src/gamePanel.ts](src/gamePanel.ts)). On load the host posts `{ type: "highScore", score }` to the webview; the webview posts `{ type: "saveHighScore", score }` back on game over. This message protocol is the only host↔webview contract — keep both sides in sync when changing it.

## Build mechanics (important gotchas)

- esbuild ([esbuild.js](esbuild.js)) bundles only `src/extension.ts` → `dist/extension.js`. It does **not** process `.js`/`.css`/`.html` files.
- Those webview assets are copied by `copyWebviewAssets()` in [esbuild.js](esbuild.js), preserving the `src/` layout under `dist/`. So `src/games/snake/game.js` → `dist/games/snake/game.js`.
- The webview's `localResourceRoots` is `dist/` only. A game's `getHtml` must build asset URIs pointing at `dist/games/<id>/...` via `webview.asWebviewUri` (not `src/`). Assets outside `dist/` will fail to load.

## Webview conventions

- Webview JS is plain browser JS (no bundling, no TypeScript). Use `acquireVsCodeApi()` for messaging.
- HTML sets a strict CSP with a per-load `nonce`; scripts must carry `nonce="${nonce}"` or they are blocked.
- Theme using VS Code CSS variables (e.g. `--vscode-editor-background`, `--vscode-textLink-foreground`) so games match the active theme.
