// ------------------------------
// Swiper（スライドショー）
// ------------------------------
const swiper = new Swiper(".swiper", {
  loop: true,
  speed: 700,
  autoplay: {
    delay: 2500,
    disableOnInteraction: false,
  },
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
});

// ------------------------------
// ビヨーン回避ゲーム
// ------------------------------
const area = document.getElementById("gameArea");
const playerEl = document.getElementById("player");
const enemyEl = document.getElementById("enemy");
const overlay = document.getElementById("gameOverlay");
const resetBtn = document.getElementById("resetBtn");
const overlayResetBtn = document.getElementById("overlayResetBtn");
const timeLabel = document.getElementById("timeLabel");
const statusLabel = document.getElementById("statusLabel");

const pads = document.querySelectorAll(".pad");

const state = {
  running: true,
  startTime: performance.now(),
  lastTime: performance.now(),
  // positions in px (top-left of elements)
  player: { x: 0, y: 0, w: 46, h: 46 },
  enemy:  { x: 0, y: 0, w: 72, h: 72, vx: 220, vy: 170 }, // px/sec
  speed: 240, // player speed px/sec
  held: { up: false, down: false, left: false, right: false },
};

// element size sync (in case CSS changes)
function syncSizes() {
  const pr = playerEl.getBoundingClientRect();
  const er = enemyEl.getBoundingClientRect();
  state.player.w = pr.width;
  state.player.h = pr.height;
  state.enemy.w = er.width;
  state.enemy.h = er.height;
}

function areaSize() {
  const r = area.getBoundingClientRect();
  return { w: r.width, h: r.height };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rectsHit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function applyPositions() {
  playerEl.style.left = `${state.player.x}px`;
  playerEl.style.top = `${state.player.y}px`;
  enemyEl.style.left = `${state.enemy.x}px`;
  enemyEl.style.top = `${state.enemy.y}px`;
}

function showGameOver() {
  state.running = false;
  overlay.classList.add("is-show");
  overlay.setAttribute("aria-hidden", "false");

  statusLabel.textContent = "GAME OVER";
  statusLabel.classList.remove("hud__value--ok");
  statusLabel.classList.add("hud__value--ng");
}

function hideGameOver() {
  overlay.classList.remove("is-show");
  overlay.setAttribute("aria-hidden", "true");

  statusLabel.textContent = "PLAYING";
  statusLabel.classList.remove("hud__value--ng");
  statusLabel.classList.add("hud__value--ok");
}

function resetGame() {
  syncSizes();
  const { w, h } = areaSize();

  // Player starts near bottom-center
  state.player.x = (w - state.player.w) * 0.5;
  state.player.y = (h - state.player.h) * 0.72;

  // Enemy starts near top-left
  state.enemy.x = (w - state.enemy.w) * 0.20;
  state.enemy.y = (h - state.enemy.h) * 0.18;

  // Random-ish direction but stable speed
  const base = 220;
  const sx = Math.random() > 0.5 ? 1 : -1;
  const sy = Math.random() > 0.5 ? 1 : -1;
  state.enemy.vx = base * sx;
  state.enemy.vy = (base * 0.78) * sy;

  state.running = true;
  state.startTime = performance.now();
  state.lastTime = performance.now();
  hideGameOver();
  applyPositions();
}

function update(dt) {
  if (!state.running) return;

  const { w, h } = areaSize();

  // Player move
  let dx = 0;
  let dy = 0;
  if (state.held.left) dx -= 1;
  if (state.held.right) dx += 1;
  if (state.held.up) dy -= 1;
  if (state.held.down) dy += 1;

  // Normalize diagonal
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.sqrt(2);
    dx *= inv;
    dy *= inv;
  }

  state.player.x += dx * state.speed * dt;
  state.player.y += dy * state.speed * dt;

  state.player.x = clamp(state.player.x, 0, w - state.player.w);
  state.player.y = clamp(state.player.y, 0, h - state.player.h);

  // Enemy move (bounce)
  state.enemy.x += state.enemy.vx * dt;
  state.enemy.y += state.enemy.vy * dt;

  if (state.enemy.x <= 0) {
    state.enemy.x = 0;
    state.enemy.vx *= -1;
  }
  if (state.enemy.x >= w - state.enemy.w) {
    state.enemy.x = w - state.enemy.w;
    state.enemy.vx *= -1;
  }
  if (state.enemy.y <= 0) {
    state.enemy.y = 0;
    state.enemy.vy *= -1;
  }
  if (state.enemy.y >= h - state.enemy.h) {
    state.enemy.y = h - state.enemy.h;
    state.enemy.vy *= -1;
  }

  applyPositions();

  // Collision
  if (rectsHit(state.player, state.enemy)) {
    showGameOver();
  }

  // Timer
  const elapsed = (performance.now() - state.startTime) / 1000;
  timeLabel.textContent = `${elapsed.toFixed(1)}s`;
}

function loop(now) {
  const dt = Math.min(0.033, (now - state.lastTime) / 1000); // cap for stability
  state.lastTime = now;
  update(dt);
  requestAnimationFrame(loop);
}

// Controls: buttons (touch)
function setHeld(dir, val) {
  state.held[dir] = val;
}

pads.forEach((btn) => {
  const dir = btn.dataset.dir;

  // iPad / touch
  btn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    setHeld(dir, true);
  }, { passive: false });

  btn.addEventListener("touchend", (e) => {
    e.preventDefault();
    setHeld(dir, false);
  }, { passive: false });

  btn.addEventListener("touchcancel", () => setHeld(dir, false));

  // mouse
  btn.addEventListener("mousedown", () => setHeld(dir, true));
  btn.addEventListener("mouseup", () => setHeld(dir, false));
  btn.addEventListener("mouseleave", () => setHeld(dir, false));
});

// Controls: keyboard
const keyMap = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

window.addEventListener("keydown", (e) => {
  const k = e.key;
  if (keyMap[k]) {
    setHeld(keyMap[k], true);
    // prevent page scroll on arrow keys
    if (k.startsWith("Arrow")) e.preventDefault();
  }
});

window.addEventListener("keyup", (e) => {
  const k = e.key;
  if (keyMap[k]) {
    setHeld(keyMap[k], false);
    if (k.startsWith("Arrow")) e.preventDefault();
  }
});

// Reset buttons
resetBtn.addEventListener("click", resetGame);
overlayResetBtn.addEventListener("click", resetGame);

// Resize re-clamp
window.addEventListener("resize", () => {
  syncSizes();
  const { w, h } = areaSize();
  state.player.x = clamp(state.player.x, 0, w - state.player.w);
  state.player.y = clamp(state.player.y, 0, h - state.player.h);
  state.enemy.x = clamp(state.enemy.x, 0, w - state.enemy.w);
  state.enemy.y = clamp(state.enemy.y, 0, h - state.enemy.h);
  applyPositions();
});

// Start
// Wait a tick so layout settles
setTimeout(() => {
  resetGame();
  requestAnimationFrame(loop);
}, 0);
