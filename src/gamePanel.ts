import * as vscode from "vscode";
import { Game } from "./gameRegistry";

/** Storage key for a game's persisted high score. */
function highScoreKey(gameId: string): string {
  return `highscore.${gameId}`;
}

/**
 * Manages the single shared webview panel used to play games.
 * Opening another game reuses the same panel rather than stacking panels.
 */
export class GamePanel {
  private static current: GamePanel | undefined;

  private readonly panel: vscode.WebviewPanel;
  private readonly context: vscode.ExtensionContext;
  private readonly disposables: vscode.Disposable[] = [];
  private currentGame!: Game;

  static show(context: vscode.ExtensionContext, game: Game): void {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (GamePanel.current) {
      GamePanel.current.panel.reveal(column);
      GamePanel.current.load(game);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "gameHub",
      game.label,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, "dist")],
      }
    );

    GamePanel.current = new GamePanel(panel, context, game);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    game: Game
  ) {
    this.panel = panel;
    this.context = context;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      (msg) => this.handleMessage(msg),
      null,
      this.disposables
    );

    this.load(game);
  }

  /** Load (or switch to) a game into the panel. */
  private load(game: Game): void {
    this.currentGame = game;
    this.panel.title = game.label;

    const nonce = getNonce();
    this.panel.webview.html = game.getHtml(
      this.panel.webview,
      this.context.extensionUri,
      nonce
    );

    // Push the stored high score once the webview has rendered.
    const score = this.context.globalState.get<number>(highScoreKey(game.id), 0);
    void this.panel.webview.postMessage({ type: "highScore", score });
  }

  private async handleMessage(msg: unknown): Promise<void> {
    if (!msg || typeof msg !== "object") {
      return;
    }
    const m = msg as { type?: string; score?: number };

    if (m.type === "saveHighScore" && typeof m.score === "number") {
      const key = highScoreKey(this.currentGame.id);
      const prev = this.context.globalState.get<number>(key, 0);
      if (m.score > prev) {
        await this.context.globalState.update(key, m.score);
      }
    }
  }

  private dispose(): void {
    GamePanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}
