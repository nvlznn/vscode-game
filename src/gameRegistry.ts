import * as vscode from "vscode";
import { snakeGame } from "./games/snake";

/**
 * A playable game. Each game lives in its own folder under `src/games/`
 * and exposes one of these. To add a game: implement this interface and
 * add it to the `games` array below — the picker and panel pick it up
 * automatically, with no other changes required.
 */
export interface Game {
  /** Stable identifier. Used for the high-score storage key. */
  readonly id: string;
  /** Label shown in the QuickPick menu. */
  readonly label: string;
  /** Secondary text shown in the QuickPick menu. */
  readonly description?: string;
  /**
   * Build the full webview HTML for this game.
   *
   * @param webview      The target webview (for `asWebviewUri` / `cspSource`).
   * @param extensionUri The extension root URI.
   * @param nonce        A per-load nonce to whitelist inline/script content.
   */
  getHtml(webview: vscode.Webview, extensionUri: vscode.Uri, nonce: string): string;
}

/** All registered games, in menu order. */
export const games: readonly Game[] = [snakeGame];

export function findGame(id: string): Game | undefined {
  return games.find((g) => g.id === id);
}
