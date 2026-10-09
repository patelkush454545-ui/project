const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');

const config = {
  gravity: 0.5,
  flapForce: -9,
  pipeWidth: 72,
  pipeGap: 170,
  pipeSpeed: 2.6,
  spawnInterval: 1500,
  groundHeight: 84,
};

const state = {
  running: false,
  gameOver: false,
  score: 0,
  best: Number(localStorage.getItem('flappy-best') || 0),
  lastTime: 0,
  lastPipeSpawn: 0,
  bird: null,
  pipes: [],
};

function resetBird() {
  state.bird = {
    x: 110,
    y: canvas.height / 2,
    radius: 20,
    velocity: 0,
    rotation: 0,
  };
}

function resetGame() {
  state.running = false;
  state.gameOver = false;
  state.score = 0;
  state.lastPipeSpawn = 0;
  state.pipes = [];
  resetBird();
  scoreEl.textContent = '0';
}

function updateBest() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem('flappy-best', String(state.best));
  }
  bestEl.textContent = String(state.best);
}

function flap() {
  if (!state.running && !state.gameOver) {
    state.running = true;
    state.lastTime = 0;
  }

  if (state.gameOver) {
    resetGame();
    state.running = true;
  }

  state.bird.velocity = config.flapForce;
}

function addPipe() {
  const minTop = 80;
  const maxTop = canvas.height - config.groundHeight - config.pipeGap - 80;
  const topHeight = minTop + Math.random() * (maxTop - minTop);

  state.pipes.push({
    x: canvas.width + 20,
    width: config.pipeWidth,
    topHeight,
    gap: config.pipeGap,
    passed: false,
  });
}

function collisionCheck() {
  const bird = state.bird;
  const birdTop = bird.y - bird.radius;
  const birdBottom = bird.y + bird.radius;
  const birdLeft = bird.x - bird.radius;
  const birdRight = bird.x + bird.radius;

  if (birdTop <= 0 || birdBottom >= canvas.height - config.groundHeight) {
    endGame();
    return;
  }

  for (const pipe of state.pipes) {
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipe.width;
    const pipeTopEnd = pipe.topHeight;
    const pipeBottomStart = pipe.topHeight + pipe.gap;

    const overlapsHorizontally = birdRight > pipeLeft && birdLeft < pipeRight;
    if (!overlapsHorizontally) continue;

    const hitsTop = birdTop < pipeTopEnd;
    const hitsBottom = birdBottom > pipeBottomStart;
    if (hitsTop || hitsBottom) {
      endGame();
      return;
    }
  }
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  updateBest();
}

function update(delta) {
  if (!state.running) return;

  const bird = state.bird;
  bird.velocity += config.gravity;
  bird.y += bird.velocity;
  bird.rotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 2, bird.velocity / 12));

  state.pipes.forEach((pipe) => {
    pipe.x -= config.pipeSpeed * (delta / 16.67);
    if (!pipe.passed && pipe.x + pipe.width < bird.x) {
      pipe.passed = true;
      state.score += 1;
      scoreEl.textContent = String(state.score);
      updateBest();
    }
  });

  state.pipes = state.pipes.filter((pipe) => pipe.x + pipe.width > -10);

  if (performance.now() - state.lastPipeSpawn > config.spawnInterval) {
    addPipe();
    state.lastPipeSpawn = performance.now();
  }

  collisionCheck();
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#7ad6ff');
  sky.addColorStop(1, '#dff8ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Sun
  ctx.fillStyle = '#ffd85a';
  ctx.beginPath();
  ctx.arc(330, 100, 40, 0, Math.PI * 2);
  ctx.fill();

  // Clouds
  for (let i = 0; i < 5; i++) {
    const x = (i * 110 + (performance.now() * 0.02) % 500) - 50;
    const y = 70 + (i % 3) * 40;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.arc(x + 18, y - 10, 24, 0, Math.PI * 2);
    ctx.arc(x + 38, y, 22, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPipes() {
  for (const pipe of state.pipes) {
    const topHeight = pipe.topHeight;
    const bottomY = topHeight + pipe.gap;

    ctx.fillStyle = '#2dbb4c';
    ctx.fillRect(pipe.x, 0, pipe.width, topHeight);
    ctx.fillRect(pipe.x, bottomY, pipe.width, canvas.height - config.groundHeight - bottomY);

    ctx.fillStyle = '#1d8b35';
    ctx.fillRect(pipe.x - 6, topHeight - 18, pipe.width + 12, 18);
    ctx.fillRect(pipe.x - 6, bottomY, pipe.width + 12, 18);

    ctx.fillStyle = '#3cd66d';
    ctx.fillRect(pipe.x + 8, 0, pipe.width - 16, topHeight - 4);
    ctx.fillRect(pipe.x + 8, bottomY + 4, pipe.width - 16, canvas.height - config.groundHeight - bottomY - 4);
  }
}

function drawGround() {
  ctx.fillStyle = '#c88a2a';
  ctx.fillRect(0, canvas.height - config.groundHeight, canvas.width, config.groundHeight);

  ctx.fillStyle = '#7ccf52';
  ctx.fillRect(0, canvas.height - config.groundHeight, canvas.width, 18);

  for (let i = 0; i < canvas.width; i += 24) {
    ctx.fillStyle = '#7ccf52';
    ctx.fillRect(i + ((performance.now() * 0.08) % 24), canvas.height - config.groundHeight + 18, 16, 12);
    ctx.fillStyle = '#f6d76a';
    ctx.fillRect(i + 6 + ((performance.now() * 0.08) % 24), canvas.height - config.groundHeight + 18, 4, 12);
  }
}

function drawBird() {
  const bird = state.bird;

  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  ctx.fillStyle = '#ffd54a';
  ctx.beginPath();
  ctx.ellipse(0, 0, bird.radius, bird.radius * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(7, -6, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(10, -6, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff7b54';
  ctx.beginPath();
  ctx.moveTo(18, 2);
  ctx.lineTo(28, 5);
  ctx.lineTo(18, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff8f70';
  ctx.beginPath();
  ctx.arc(-5, 10, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawInstructions() {
  if (state.running || state.gameOver) return;

  ctx.fillStyle = 'rgba(16, 25, 47, 0.42)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px Arial';
  ctx.fillText(state.gameOver ? 'Game Over' : 'Flappy Bird', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '24px Arial';
  ctx.fillText('Press Space or Click', canvas.width / 2, canvas.height / 2 + 28);
  ctx.fillText('to start', canvas.width / 2, canvas.height / 2 + 62);
}

function drawScore() {
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 34px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(String(state.score), canvas.width / 2, 70);
}

function render() {
  drawBackground();
  drawPipes();
  drawGround();
  drawBird();
  drawScore();
  drawInstructions();
}

function gameLoop(timestamp) {
  const delta = timestamp - state.lastTime || 16.67;
  state.lastTime = timestamp;

  if (state.running) {
    update(delta);
    if (performance.now() - state.lastPipeSpawn > config.spawnInterval && state.running) {
      addPipe();
      state.lastPipeSpawn = performance.now();
    }
  }

  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    flap();
  }
});

canvas.addEventListener('pointerdown', flap);

resetGame();
bestEl.textContent = String(state.best);
requestAnimationFrame(gameLoop);
