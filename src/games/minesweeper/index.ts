import * as vscode from "vscode";
import { Game } from "../../gameRegistry";

export const minesweeperGame: Game = {
  id: "minesweeper",
  label: "Minesweeper",
  description: "Clear the board without detonating a mine",

  getHtml(webview, extensionUri, nonce): string {
    const asset = (...parts: string[]) =>
      webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, "dist", "games", "minesweeper", ...parts)
      );

    const scriptUri = asset("game.js");
    const styleUri = asset("style.css");
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource}`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join("; ");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="${styleUri}" rel="stylesheet" />
  <title>Minesweeper</title>
</head>
<body>
  <div id="hud">
    <span>Mines: <strong id="mines">0</strong></span>
    <span>Time: <strong id="time">0</strong></span>
    <span>Best: <strong id="best">&mdash;</strong></span>
  </div>
  <div id="wrap">
    <div id="board" tabindex="0"></div>
    <div id="overlay" class="hidden">
      <div id="overlay-title"></div>
      <div id="overlay-sub"></div>
    </div>
  </div>
  <p id="hint">Left-click reveal &middot; Right-click flag &middot; R to restart</p>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  },
};
