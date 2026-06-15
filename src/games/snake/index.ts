import * as vscode from "vscode";
import { Game } from "../../gameRegistry";

export const snakeGame: Game = {
  id: "snake",
  label: "Snake",
  description: "Classic grid snake — eat, grow, don't crash",

  getHtml(webview, extensionUri, nonce): string {
    const asset = (...parts: string[]) =>
      webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "dist", "games", "snake", ...parts));

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
  <title>Snake</title>
</head>
<body>
  <div id="hud">
    <span>Score: <strong id="score">0</strong></span>
    <span>Best: <strong id="best">0</strong></span>
  </div>
  <canvas id="board" width="400" height="400" tabindex="0"></canvas>
  <p id="hint">Arrow keys / WASD to move &middot; R to restart</p>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  },
};
