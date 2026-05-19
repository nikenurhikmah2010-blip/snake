/* ═══════════════════════════════════════════════
   GALAXY SNAKE — game.js
   ═══════════════════════════════════════════════ */

'use strict';

// ─── STARFIELD ────────────────────────────────
const sfCanvas = document.getElementById('starfield');
const sfCtx    = sfCanvas.getContext('2d');
let stars = [];

function buildStars() {
  sfCanvas.width  = window.innerWidth;
  sfCanvas.height = window.innerHeight;
  stars = [];
  for (let i = 0; i < 260; i++) {
    stars.push({
      x:  Math.random() * sfCanvas.width,
      y:  Math.random() * sfCanvas.height,
      r:  Math.random() * 1.7 + 0.2,
      sp: Math.random() * 0.35 + 0.04,
      tw: Math.random() * Math.PI * 2,
      col: ['#ffffff','#cce8ff','#ffd0ff','#b8ffff','#ffe8a0'][Math.floor(Math.random()*5)]
    });
  }
}
buildStars();
window.addEventListener('resize', buildStars);

(function tickStars() {
  sfCtx.clearRect(0, 0, sfCanvas.width, sfCanvas.height);
  const t = Date.now() / 1000;
  for (const s of stars) {
    s.y += s.sp;
    if (s.y > sfCanvas.height) { s.y = 0; s.x = Math.random() * sfCanvas.width; }
    sfCtx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.4 + s.tw));
    sfCtx.fillStyle   = s.col;
    sfCtx.beginPath();
    sfCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    sfCtx.fill();
  }
  sfCtx.globalAlpha = 1;
  requestAnimationFrame(tickStars);
})();

// ─── GAME CANVAS ──────────────────────────────
const canvas    = document.getElementById('game');
const ctx       = canvas.getContext('2d');

// ─── UI REFS ──────────────────────────────────
const scoreValEl = document.getElementById('scoreVal');
const lvlValEl   = document.getElementById('lvlVal');
const livesValEl = document.getElementById('livesVal');
const xpBar      = document.getElementById('xpBar');
const xpLabel    = document.getElementById('xpLabel');
const overlay    = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayEmoji = document.getElementById('overlayEmoji');
const overlayStats = document.getElementById('overlayStats');
const pauseLabel   = document.getElementById('pauseLabel');
const lvlFlash     = document.getElementById('lvlFlash');

// ─── CONSTANTS ────────────────────────────────
const BOX  = 25;
const COLS = 20;
const ROWS = 20;
const PTS_PER_LEVEL = 5;
const SPEED_BASE    = 165;
const SPEED_MIN     = 58;
const SPEED_STEP    = 13;

// Snake skin color per level
const SKIN_COLORS = [
  '#00f0ff','#bf50ff','#ff2d9f','#ffd060',
  '#00ff99','#ff6820','#50ffcc','#ff5555',
  '#8888ff','#ffff44'
];

// ─── STATE ────────────────────────────────────
let snake, dir, nextDir, food, obstacles, shooters;
let score, lives, level, speed;
let loop    = null;
let running = false;
let paused  = false;
let eating  = false;
let eatTimer = 0;

// ─── INIT ─────────────────────────────────────
function init() {
  snake     = [{ x:10, y:10 }];
  dir       = 'RIGHT';
  nextDir   = 'RIGHT';
  score     = 0;
  lives     = 3;
  level     = 1;
  speed     = SPEED_BASE;
  eating    = false;
  eatTimer  = 0;
  obstacles = [];
  shooters  = [];

  spawnFood();
  addObstacles(3);
  updateHUD();

  overlay.classList.remove('visible');
  overlay.classList.add('hidden');
  pauseLabel.style.display = 'none';
  paused = false;
}

// ─── FOOD ─────────────────────────────────────
function spawnFood() {
  let pos;
  do {
    pos = { x: rnd(COLS), y: rnd(ROWS) };
  } while (
    cellOccupied(pos, snake) ||
    cellOccupied(pos, obstacles)
  );
  food = pos;
}

// ─── OBSTACLES ────────────────────────────────
function addObstacles(n) {
  for (let i = 0; i < n; i++) {
    let pos;
    do {
      pos = { x: rnd(COLS), y: rnd(ROWS) };
    } while (
      cellOccupied(pos, snake) ||
      cellOccupied(pos, obstacles) ||
      (food && pos.x === food.x && pos.y === food.y) ||
      (pos.x === 10 && pos.y === 10)
    );
    obstacles.push({ ...pos, phase: Math.random() * Math.PI * 2, rot: 0 });
  }
}

// ─── SHOOTING STARS (canvas-space) ───────────
function spawnShooter() {
  shooters.push({
    x:  Math.random() * 500,
    y:  0,
    vx: (Math.random() - 0.5) * 4.5,
    vy: Math.random() * 5 + 3,
    len: Math.random() * 32 + 14,
    a:  1
  });
}

// ─── MAIN LOOP ────────────────────────────────
function tick() {
  if (paused) return;
  const t = Date.now();
  ctx.clearRect(0, 0, 500, 500);
  drawGrid();
  drawShooters(t);
  drawObstacles(t);
  drawFood(t);
  drawSnake(t);
  move();
}

// ─── GRID DOTS ────────────────────────────────
function drawGrid() {
  ctx.fillStyle = 'rgba(255,255,255,0.022)';
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      ctx.beginPath();
      ctx.arc(c * BOX + 12, r * BOX + 12, 1, 0, Math.PI * 2);
      ctx.fill();
    }
}

// ─── SHOOTING STARS ───────────────────────────
function drawShooters(t) {
  if (Math.random() < 0.045) spawnShooter();
  shooters = shooters.filter(s => s.a > 0);
  for (const s of shooters) {
    s.x += s.vx; s.y += s.vy; s.a -= 0.024;
    const tx = s.x - s.vx * (s.len / s.vy);
    const ty = s.y - s.len;
    const g  = ctx.createLinearGradient(s.x, s.y, tx, ty);
    g.addColorStop(0, `rgba(255,255,255,${s.a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth   = 1.6;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }
}

// ─── OBSTACLES ────────────────────────────────
function drawObstacles(t) {
  for (const o of obstacles) {
    o.phase += 0.042;
    o.rot   += 0.018;
    const glow = Math.abs(Math.sin(o.phase)) * 22 + 8;
    const cx   = o.x * BOX + BOX / 2;
    const cy   = o.y * BOX + BOX / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(o.rot);
    ctx.shadowBlur  = glow;
    ctx.shadowColor = '#ff6820';

    // Asteroid body (hexagonal blob)
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r = BOX / 2 - 1 + (i % 2 === 0 ? -3.5 : 3.5);
      i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
              : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();

    const og = ctx.createRadialGradient(-3,-3,1,0,0,BOX/2);
    og.addColorStop(0, '#ff9944');
    og.addColorStop(0.5, '#c03a10');
    og.addColorStop(1, '#6a1500');
    ctx.fillStyle   = og;
    ctx.fill();
    ctx.strokeStyle = '#ff6820';
    ctx.lineWidth   = 1.4;
    ctx.stroke();

    // Crater dots
    ctx.shadowBlur = 0;
    ctx.fillStyle  = 'rgba(0,0,0,.35)';
    for (const [dx,dy,dr] of [[-5,-4,2],[4,3,1.5],[1,-7,1.2]]) {
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ─── FOOD (meteor) ────────────────────────────
function drawFood(t) {
  const pulse = Math.sin(t / 210) * 0.3 + 0.7;
  const px    = food.x * BOX + BOX / 2;
  const py    = food.y * BOX + BOX / 2;

  ctx.save();

  // Outer rings
  for (let i = 3; i >= 1; i--) {
    ctx.beginPath();
    ctx.arc(px, py, BOX / 2 + i * 5.5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,104,32,${0.09 * i * pulse})`;
    ctx.lineWidth   = 2;
    ctx.stroke();
  }

  ctx.shadowBlur  = 32 * pulse;
  ctx.shadowColor = '#ff6820';

  // Body gradient
  const mg = ctx.createRadialGradient(px-3, py-3, 2, px, py, BOX/2);
  mg.addColorStop(0,   '#fff0a0');
  mg.addColorStop(0.3, '#ff8c00');
  mg.addColorStop(0.7, '#cc2200');
  mg.addColorStop(1,   '#550000');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(px, py, BOX / 2 - 1, 0, Math.PI * 2);
  ctx.fill();

  // Surface texture lines
  ctx.strokeStyle = 'rgba(255,220,80,.35)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.arc(px-3, py-3, 4, 0.4, 2.0);
  ctx.stroke();

  // Tail
  const tg = ctx.createLinearGradient(px, py, px-32, py-22);
  tg.addColorStop(0, `rgba(255,160,30,.75)`);
  tg.addColorStop(1, 'rgba(255,80,0,0)');
  ctx.strokeStyle = tg;
  ctx.lineWidth   = 4.5;
  ctx.lineCap     = 'round';
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px-30, py-20); ctx.stroke();
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(px-2, py+4); ctx.lineTo(px-24, py-11); ctx.stroke();

  ctx.restore();
}

// ─── SNAKE ────────────────────────────────────
function drawSnake(t) {
  if (eatTimer > 0) eatTimer--;
  else eating = false;

  const skin = SKIN_COLORS[(level - 1) % SKIN_COLORS.length];

  // Draw tail → head
  for (let i = snake.length - 1; i >= 0; i--) {
    const s    = snake[i];
    const px   = s.x * BOX;
    const py   = s.y * BOX;
    const glow = Math.sin(t / 175 + i * 0.28) * 13 + 20;

    ctx.save();
    ctx.shadowBlur  = glow;
    ctx.shadowColor = skin;

    if (i === 0) {
      drawHead(px, py, skin, t);
    } else {
      drawBody(px, py, skin, i);
    }

    ctx.restore();
  }
}

function drawHead(px, py, skin, t) {
  // Head rounded rect with radial gradient
  const hg = ctx.createRadialGradient(px+7, py+7, 2, px+BOX/2, py+BOX/2, BOX/2+2);
  hg.addColorStop(0, lighten(skin, 0.55));
  hg.addColorStop(1, skin);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.roundRect(px, py, BOX, BOX, 9);
  ctx.fill();

  // ── EYES
  const blink = Math.sin(t / 580) > 0.90;
  const eyeY  = py + (eating ? 7 : 8);
  const eyeR  = eating ? 3.5 : 4.2;

  ctx.shadowBlur = 0;
  if (!blink) {
    // Sclera
    ctx.fillStyle = '#f0f8ff';
    ctx.beginPath(); ctx.arc(px+7,  eyeY, eyeR, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+18, eyeY, eyeR, 0, Math.PI*2); ctx.fill();

    // Iris (colored ring)
    ctx.strokeStyle = skin;
    ctx.lineWidth   = 1.2;
    ctx.beginPath(); ctx.arc(px+7,  eyeY, eyeR-1.2, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(px+18, eyeY, eyeR-1.2, 0, Math.PI*2); ctx.stroke();

    // Pupils
    ctx.fillStyle = '#0a0018';
    ctx.beginPath(); ctx.arc(px+7.4,  eyeY+0.5, eating?1.8:2.1, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+18.4, eyeY+0.5, eating?1.8:2.1, 0, Math.PI*2); ctx.fill();

    // Highlight spec
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.beginPath(); ctx.arc(px+6.2, eyeY-1.2, 0.9, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(px+17.2, eyeY-1.2, 0.9, 0, Math.PI*2); ctx.fill();

    // Eating: glowing pupils
    if (eating) {
      ctx.fillStyle   = skin;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = skin;
      ctx.beginPath(); ctx.arc(px+7.4,  eyeY+0.5, 1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(px+18.4, eyeY+0.5, 1, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
  } else {
    // Blink — horizontal line
    ctx.strokeStyle = '#c8e8ff';
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = 'round';
    ctx.beginPath(); ctx.moveTo(px+4,  eyeY); ctx.lineTo(px+11, eyeY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px+15, eyeY); ctx.lineTo(px+22, eyeY); ctx.stroke();
  }

  // ── MOUTH
  if (eating) {
    // Open oval mouth
    ctx.shadowBlur  = 14;
    ctx.shadowColor = '#ffe080';
    ctx.fillStyle   = '#cc2200';
    ctx.beginPath();
    ctx.ellipse(px+BOX/2, py+19, 5.5, 4.5, 0, 0, Math.PI*2);
    ctx.fill();
    // Teeth
    ctx.fillStyle = '#fff0c0';
    ctx.fillRect(px+BOX/2-4, py+16, 3, 3);
    ctx.fillRect(px+BOX/2+1, py+16, 3, 3);
    ctx.shadowBlur = 0;
  } else {
    ctx.strokeStyle = '#ff9fd4';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(px+BOX/2, py+18, 5, 0, Math.PI);
    ctx.stroke();
  }
}

function drawBody(px, py, skin, i) {
  const ratio = i / snake.length;
  const bc    = lerpColor(skin, '#1a0540', ratio);

  const bg = ctx.createRadialGradient(px+5, py+5, 1, px+BOX/2, py+BOX/2, BOX/2);
  bg.addColorStop(0, lighten(bc, 0.28));
  bg.addColorStop(1, bc);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(px, py, BOX, BOX, 7);
  ctx.fill();

  // Scale shimmer
  if (i % 2 === 0) {
    ctx.strokeStyle = 'rgba(255,255,255,.07)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(px+BOX/2, py+BOX/2, 7, 0, Math.PI*2);
    ctx.stroke();
  }
}

// ─── MOVEMENT & COLLISIONS ────────────────────
function move() {
  dir = nextDir;
  const head = { ...snake[0] };

  if (dir === 'UP')    head.y--;
  if (dir === 'DOWN')  head.y++;
  if (dir === 'LEFT')  head.x--;
  if (dir === 'RIGHT') head.x++;

  // Wall
  if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
    loseLife(); return;
  }
  // Obstacle
  if (cellOccupied(head, obstacles)) { loseLife(); return; }
  // Self (skip head at index 0)
  if (snake.slice(1).some(s => s.x===head.x && s.y===head.y)) {
    loseLife(); return;
  }

  // Eat meteor
  if (head.x === food.x && head.y === food.y) {
    score++;
    snake.push({ ...snake[snake.length-1] });
    eatEffect();

    const newLvl = Math.floor(score / PTS_PER_LEVEL) + 1;
    if (newLvl > level) { level = newLvl; doLevelUp(); }

    updateHUD();
    spawnFood();
  }

  snake.unshift(head);
  snake.pop();
}

// ─── LOSE LIFE ────────────────────────────────
function loseLife() {
  lives--;
  updateHUD();
  canvas.classList.add('shake');
  setTimeout(() => canvas.classList.remove('shake'), 420);

  if (lives <= 0) { doGameOver(); return; }

  snake   = [{ x:10, y:10 }];
  dir     = 'RIGHT';
  nextDir = 'RIGHT';
}

// ─── EAT EFFECT ───────────────────────────────
function eatEffect() {
  eating   = true;
  eatTimer = 14;

  const rect   = canvas.getBoundingClientRect();
  const ox     = food.x * BOX + rect.left + window.scrollX;
  const oy     = food.y * BOX + rect.top  + window.scrollY;
  const emojis = ['⭐','🌟','✨','💥','🌠','🔥','💫','🎆'];

  for (let i = 0; i < 7; i++) {
    const p = document.createElement('div');
    p.className   = 'particle';
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left  = (ox + Math.random()*55 - 8) + 'px';
    p.style.top   = (oy + Math.random()*35) + 'px';
    p.style.fontSize = (13 + Math.random()*15) + 'px';
    p.style.animationDuration = (0.75 + Math.random()*0.65) + 's';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1500);
  }
}

// ─── LEVEL UP ─────────────────────────────────
function doLevelUp() {
  speed = Math.max(SPEED_MIN, SPEED_BASE - (level - 1) * SPEED_STEP);
  clearInterval(loop);
  loop = setInterval(tick, speed);

  addObstacles(2);

  // Screen flash
  lvlFlash.classList.remove('flash');
  void lvlFlash.offsetWidth;
  lvlFlash.classList.add('flash');

  // Floating label
  const p = document.createElement('div');
  p.className   = 'particle';
  p.textContent = `🚀 LEVEL ${level}!`;
  p.style.cssText = `
    left:50%; top:38%;
    transform:translateX(-50%);
    font-size:22px;
    font-family:'Orbitron',monospace;
    color:#00f0ff;
    text-shadow:0 0 20px #00f0ff;
    white-space:nowrap;
  `;
  p.style.animationDuration = '1.5s';
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 1500);
}

// ─── GAME OVER ────────────────────────────────
function doGameOver() {
  clearInterval(loop);
  loop    = null;
  running = false;

  overlayEmoji.textContent = score >= 20 ? '🏆' : score >= 10 ? '🌟' : '💀';
  overlayTitle.textContent = score >= 20 ? 'LEGENDARY!' : score >= 10 ? 'GREAT RUN!' : 'GAME OVER';
  overlayStats.innerHTML   =
    `Score: <b style="color:#00f0ff">${score}</b><br>` +
    `Level reached: <b style="color:#c050ff">${level}</b>`;

  overlay.classList.remove('hidden');
  overlay.classList.add('visible');
}

// ─── HUD UPDATE ───────────────────────────────
function updateHUD() {
  scoreValEl.textContent = score;
  lvlValEl.textContent   = level;
  livesValEl.textContent = '❤️'.repeat(Math.max(lives, 0));

  const pct = ((score % PTS_PER_LEVEL) / PTS_PER_LEVEL) * 100;
  xpBar.style.width   = pct + '%';
  xpLabel.textContent = `NEXT LVL: ${score % PTS_PER_LEVEL} / ${PTS_PER_LEVEL}`;
}

// ─── BUTTON HANDLERS ─────────────────────────
document.getElementById('startBtn').onclick  = startGame;
document.getElementById('pauseBtn').onclick  = pauseGame;
document.getElementById('resetBtn').onclick  = resetGame;
document.getElementById('overlayBtn').onclick = resetGame;

function startGame() {
  if (running && !paused) return;
  if (!running) { init(); }
  paused = false;
  pauseLabel.style.display = 'none';
  clearInterval(loop);
  loop    = setInterval(tick, speed);
  running = true;
}

function pauseGame() {
  if (!running) return;
  paused = !paused;
  pauseLabel.style.display = paused ? 'block' : 'none';
  if (!paused) {
    clearInterval(loop);
    loop = setInterval(tick, speed);
  }
}

function resetGame() {
  clearInterval(loop);
  loop    = null;
  running = false;
  init();
}

// ─── KEYBOARD ────────────────────────────────
const DIR_MAP = {
  ArrowUp:'UP', ArrowDown:'DOWN', ArrowLeft:'LEFT', ArrowRight:'RIGHT',
  w:'UP', s:'DOWN', a:'LEFT', d:'RIGHT',
  W:'UP', S:'DOWN', A:'LEFT', D:'RIGHT'
};

document.addEventListener('keydown', e => {
  const d = DIR_MAP[e.key];
  if (d) {
    e.preventDefault();
    if (d==='UP'    && dir!=='DOWN')  nextDir = 'UP';
    if (d==='DOWN'  && dir!=='UP')    nextDir = 'DOWN';
    if (d==='LEFT'  && dir!=='RIGHT') nextDir = 'LEFT';
    if (d==='RIGHT' && dir!=='LEFT')  nextDir = 'RIGHT';
  }
  if (e.key === ' ') { e.preventDefault(); pauseGame(); }
});

// ─── HELPERS ─────────────────────────────────
function rnd(n) { return Math.floor(Math.random() * n); }

function cellOccupied(pos, arr) {
  return arr.some(c => c.x === pos.x && c.y === pos.y);
}

/** Lighten a CSS hex color by amt (0–1) */
function lighten(hex, amt) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, ((n>>16)&0xff) + (amt*255)|0);
  const g = Math.min(255, ((n>>8) &0xff) + (amt*255)|0);
  const b = Math.min(255, ( n     &0xff) + (amt*255)|0);
  return `rgb(${r},${g},${b})`;
}

/** Linear interpolate between two hex colors */
function lerpColor(a, b, t) {
  const ah = parseInt(a.replace('#',''),16);
  const bh = parseInt(b.replace('#',''),16);
  const ar=(ah>>16)&0xff, ag=(ah>>8)&0xff, ab=ah&0xff;
  const br=(bh>>16)&0xff, bg=(bh>>8)&0xff, bb=bh&0xff;
  return `rgb(${(ar+(br-ar)*t)|0},${(ag+(bg-ag)*t)|0},${(ab+(bb-ab)*t)|0})`;
}

// ─── BOOT ─────────────────────────────────────
init();
tick(); // draw idle frame before first start