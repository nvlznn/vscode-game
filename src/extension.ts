import * as vscode from "vscode";
import { games, findGame } from "./gameRegistry";
import { GamePanel } from "./gamePanel";

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand("games.open", async () => {
    const picked = await vscode.window.showQuickPick(
      games.map((g) => ({ label: g.label, description: g.description, id: g.id })),
      {
        title: "Game Hub",
        placeHolder: "Select a game to play",
        matchOnDescription: true,
      }
    );

    if (!picked) {
      return; // user dismissed the menu
    }

    const game = findGame(picked.id);
    if (game) {
      GamePanel.show(context, game);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  /* nothing to clean up */
}
