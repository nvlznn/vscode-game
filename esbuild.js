const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const watch = process.argv.includes("--watch");

/**
 * Copy webview static assets (.js / .css / .html) from src/ into dist/,
 * preserving the directory layout so each game's assets are addressable
 * at runtime via webview.asWebviewUri.
 */
function copyWebviewAssets() {
  const srcRoot = path.join(__dirname, "src");
  const distRoot = path.join(__dirname, "dist");
  const exts = new Set([".js", ".css", ".html"]);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (exts.has(path.extname(entry.name))) {
        const rel = path.relative(srcRoot, full);
        const dest = path.join(distRoot, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(full, dest);
      }
    }
  }
  walk(srcRoot);
}

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node18",
    outfile: "dist/extension.js",
    external: ["vscode"],
    sourcemap: true,
    logLevel: "info",
  });

  copyWebviewAssets();

  if (watch) {
    await ctx.watch();
    // Re-copy assets on each rebuild trigger.
    fs.watch(path.join(__dirname, "src"), { recursive: true }, () => {
      try {
        copyWebviewAssets();
      } catch {
        /* ignore transient fs errors during edits */
      }
    });
    console.log("[esbuild] watching...");
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
