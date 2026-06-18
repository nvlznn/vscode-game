(function () {
  "use strict";

  const vscode = acquireVsCodeApi();

  const COLS = 9;
  const ROWS = 9;
  const MINES = 10;

  // The host persists a single "high score" per game and keeps the *highest*
  // value (see gamePanel.ts). Minesweeper's best metric is the *fastest* win,
  // so we encode time as (BEST_BASE - seconds): a faster win => a higher
  // stored value, which fits the host's max-wins contract without changing it.
  const BEST_BASE = 9999;

  const boardEl = document.getElementById("board");
  const minesEl = document.getElementById("mines");
  const timeEl = document.getElementById("time");
  const bestEl = document.getElementById("best");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlaySub = document.getElementById("overlay-sub");

  // Classic per-number colors, distinct enough on light and dark themes.
  const NUM_COLORS = [
    "",        // 0 (unused)
    "#4fc1ff", // 1
    "#4ec9b0", // 2
    "#f14c4c", // 3
    "#c586c0", // 4
    "#ce9178", // 5
    "#569cd6", // 6
    "#d7ba7d", // 7
    "#d4d4d4", // 8
  ];

  let grid; // grid[y][x] = { mine, revealed, flagged, count, el }
  let started; // first reveal has happened (mines placed, timer running)
  let over; // game finished (win or loss)
  let flags; // number of flags currently placed
  let revealedCount; // non-mine cells revealed so far
  let seconds;
  let timer;
  let bestSeconds; // best winning time, or null if none recorded

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS;
  }

  function neighborCoords(x, y) {
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (inBounds(nx, ny)) out.push({ x: nx, y: ny });
      }
    }
    return out;
  }

  function reset() {
    grid = [];
    for (let y = 0; y < ROWS; y++) {
      const row = [];
      for (let x = 0; x < COLS; x++) {
        row.push({ mine: false, revealed: false, flagged: false, count: 0, el: null });
      }
      grid.push(row);
    }
    started = false;
    over = false;
    flags = 0;
    revealedCount = 0;
    seconds = 0;
    clearInterval(timer);
    timer = null;
    overlay.classList.add("hidden");
    render();
    updateHud();
  }

  function render() {
    boardEl.innerHTML = "";
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, var(--cell))`;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = grid[y][x];
        const btn = document.createElement("button");
        btn.className = "cell";
        btn.type = "button";
        cell.el = btn;
        btn.addEventListener("click", () => onReveal(x, y));
        btn.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          onFlag(x, y);
        });
        boardEl.appendChild(btn);
        paint(cell);
      }
    }
  }

  // Place mines after the first click so the opening move is always safe.
  // The clicked cell and its neighbors are kept mine-free for a nicer start.
  function placeMines(safeX, safeY) {
    const forbidden = new Set([safeY * COLS + safeX]);
    for (const n of neighborCoords(safeX, safeY)) {
      forbidden.add(n.y * COLS + n.x);
    }

    let placed = 0;
    while (placed < MINES) {
      const i = Math.floor(Math.random() * ROWS * COLS);
      if (forbidden.has(i)) continue;
      const x = i % COLS;
      const y = Math.floor(i / COLS);
      if (grid[y][x].mine) continue;
      grid[y][x].mine = true;
      placed++;
    }

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x].mine) continue;
        let count = 0;
        for (const n of neighborCoords(x, y)) {
          if (grid[n.y][n.x].mine) count++;
        }
        grid[y][x].count = count;
      }
    }
  }

  function onReveal(x, y) {
    if (over) return;
    const cell = grid[y][x];
    if (cell.flagged || cell.revealed) return;

    if (!started) {
      placeMines(x, y);
      started = true;
      startTimer();
    }

    if (cell.mine) {
      cell.revealed = true;
      loseGame();
      return;
    }

    flood(x, y);
    paintAll();
    updateHud();
    checkWin();
  }

  // Iterative flood-fill: reveal the clicked cell and, for any cell with no
  // neighboring mines, cascade outward to its neighbors.
  function flood(x, y) {
    const stack = [{ x, y }];
    while (stack.length) {
      const { x: cx, y: cy } = stack.pop();
      const cell = grid[cy][cx];
      if (cell.revealed || cell.flagged || cell.mine) continue;
      cell.revealed = true;
      revealedCount++;
      if (cell.count === 0) {
        for (const n of neighborCoords(cx, cy)) {
          const nc = grid[n.y][n.x];
          if (!nc.revealed && !nc.mine) stack.push(n);
        }
      }
    }
  }

  function onFlag(x, y) {
    if (over) return;
    const cell = grid[y][x];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    flags += cell.flagged ? 1 : -1;
    paint(cell);
    updateHud();
  }

  function checkWin() {
    if (revealedCount === ROWS * COLS - MINES) {
      winGame();
    }
  }

  function winGame() {
    over = true;
    stopTimer();
    // Auto-flag the remaining mines for a tidy finished board.
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = grid[y][x];
        if (c.mine && !c.flagged) {
          c.flagged = true;
          flags++;
        }
      }
    }
    paintAll();
    updateHud();

    if (bestSeconds === null || seconds < bestSeconds) {
      bestSeconds = seconds;
      bestEl.textContent = String(bestSeconds);
      vscode.postMessage({ type: "saveHighScore", score: BEST_BASE - bestSeconds });
    }
    showBanner("You win! \u{1F389}", "Press R to play again");
  }

  function loseGame() {
    over = true;
    stopTimer();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (grid[y][x].mine) grid[y][x].revealed = true;
      }
    }
    paintAll();
    showBanner("Boom! \u{1F4A5}", "Press R to restart");
  }

  function paint(cell) {
    const el = cell.el;
    if (!el) return;
    el.className = "cell";
    el.textContent = "";
    el.style.color = "";

    if (cell.flagged && !cell.revealed) {
      el.classList.add("flag");
      el.textContent = "⚑"; // ⚑
      return;
    }
    if (!cell.revealed) return;

    el.classList.add("revealed");
    if (cell.mine) {
      el.classList.add("mine");
      el.textContent = "✷"; // ✷
      return;
    }
    if (cell.count > 0) {
      el.textContent = String(cell.count);
      el.style.color = NUM_COLORS[cell.count];
    }
  }

  function paintAll() {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        paint(grid[y][x]);
      }
    }
  }

  function startTimer() {
    timer = setInterval(() => {
      seconds = Math.min(seconds + 1, 999);
      timeEl.textContent = String(seconds);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function updateHud() {
    minesEl.textContent = String(MINES - flags);
    timeEl.textContent = String(seconds);
    bestEl.textContent = bestSeconds === null ? "—" : String(bestSeconds);
  }

  function showBanner(title, sub) {
    overlayTitle.textContent = title;
    overlaySub.textContent = sub;
    overlay.classList.remove("hidden");
  }

  // Suppress the default context menu on the board gaps too.
  boardEl.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("keydown", (e) => {
    if (e.key === "r" || e.key === "R") {
      reset();
    }
  });

  // Receive the persisted best time from the extension host (encoded value).
  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (msg && msg.type === "highScore") {
      const stored = msg.score || 0;
      bestSeconds = stored > 0 ? BEST_BASE - stored : null;
      updateHud();
    }
  });

  bestSeconds = null;
  reset();
})();
