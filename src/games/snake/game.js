(function () {
  "use strict";

  const vscode = acquireVsCodeApi();

  const GRID = 20; // 20 x 20 cells
  const TICK_MS = 110; // movement interval

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const cell = canvas.width / GRID;

  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");

  // Resolve theme colors from CSS variables once.
  const css = getComputedStyle(document.documentElement);
  const colors = {
    snake: css.getPropertyValue("--vscode-textLink-foreground").trim() || "#4ec9b0",
    head: css.getPropertyValue("--vscode-editor-foreground").trim() || "#ffffff",
    food: css.getPropertyValue("--vscode-errorForeground").trim() || "#f14c4c",
    text: css.getPropertyValue("--vscode-editor-foreground").trim() || "#ffffff",
  };

  let snake, dir, nextDir, food, score, best, timer, dead;

  function reset() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    dead = false;
    placeFood();
    updateScore();
    clearInterval(timer);
    timer = setInterval(tick, TICK_MS);
    draw();
  }

  function placeFood() {
    const free = [];
    for (let x = 0; x < GRID; x++) {
      for (let y = 0; y < GRID; y++) {
        if (!snake.some((s) => s.x === x && s.y === y)) {
          free.push({ x, y });
        }
      }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function tick() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
    const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);
    if (hitWall || hitSelf) {
      gameOver();
      return;
    }

    snake.unshift(head);

    if (food && head.x === food.x && head.y === food.y) {
      score += 1;
      updateScore();
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function gameOver() {
    clearInterval(timer);
    dead = true;
    if (score > best) {
      best = score;
      bestEl.textContent = String(best);
      vscode.postMessage({ type: "saveHighScore", score: best });
    }
    drawGameOver();
  }

  function updateScore() {
    scoreEl.textContent = String(score);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (food) {
      ctx.fillStyle = colors.food;
      ctx.fillRect(food.x * cell, food.y * cell, cell, cell);
    }

    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? colors.head : colors.snake;
      ctx.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
    });
  }

  function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.text;
    ctx.textAlign = "center";
    ctx.font = "bold 28px var(--vscode-font-family, sans-serif)";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "14px var(--vscode-font-family, sans-serif)";
    ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 20);
  }

  const KEYS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
  };

  window.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

    if (key === "r") {
      reset();
      e.preventDefault();
      return;
    }

    const move = KEYS[key];
    if (!move || dead) {
      return;
    }
    e.preventDefault();
    // Disallow reversing directly into the neck.
    if (move.x === -dir.x && move.y === -dir.y) {
      return;
    }
    nextDir = move;
  });

  // Receive the persisted high score from the extension host.
  window.addEventListener("message", (e) => {
    const msg = e.data;
    if (msg && msg.type === "highScore") {
      best = msg.score || 0;
      bestEl.textContent = String(best);
    }
  });

  best = 0;
  canvas.focus();
  reset();
})();
