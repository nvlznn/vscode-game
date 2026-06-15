# Game Hub

A VS Code extension for playing small games without leaving your editor. Trigger a command, pick a game from the menu, and play it in a panel.

## Features

- 🎮 **Game picker** — a QuickPick menu lists every available game
- 🐍 **Snake** — classic grid snake with arrow-key / WASD controls
- 🏆 **High scores** — per-game best scores persist across sessions
- 🎨 **Theme-aware** — games adopt your active VS Code color theme
- 🧩 **Extensible** — games are self-contained modules; adding one is a two-step change

## Usage

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run **Open Game**, or press the keybind below.
2. Pick a game from the menu.
3. Play it in the panel that opens.

| Action | Keybinding |
| --- | --- |
| Open Game | `Ctrl+Shift+G` (Windows/Linux) · `Cmd+Shift+G` (macOS) |

### Snake controls

| Key | Action |
| --- | --- |
| Arrow keys / `WASD` | Move |
| `R` | Restart |

## Development

Requires [Node.js](https://nodejs.org/) and VS Code.

```bash
npm install        # install dependencies
npm run build      # bundle into dist/
npm run watch      # rebuild on change
npm run compile    # type-check only (no emit)
```

Press **F5** in VS Code to launch the Extension Development Host with the extension loaded, then run **Open Game**.

## Adding a game

Games are registered modules — no changes to the panel, picker, or build are needed.

1. Create `src/games/<id>/` containing:
   - `index.ts` — implements the [`Game`](src/gameRegistry.ts) interface (`id`, `label`, optional `description`, and `getHtml`)
   - `game.js` — the game logic (plain browser JavaScript on a `<canvas>`)
   - `style.css` — styling (use VS Code CSS variables to stay theme-aware)
2. Add the game to the `games` array in [`src/gameRegistry.ts`](src/gameRegistry.ts).

The menu, panel, and per-game high-score storage pick it up automatically.

## Project structure

```
src/
├── extension.ts        # entry point — registers the games.open command
├── gamePanel.ts        # singleton webview panel + high-score persistence
├── gameRegistry.ts     # Game interface + registered games
└── games/
    └── snake/          # one self-contained game (index.ts, game.js, style.css)
```

See [CLAUDE.md](CLAUDE.md) for deeper architecture notes.
