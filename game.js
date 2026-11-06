(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d", { alpha: false });
  const ui = {
    loading: document.querySelector("#loading"),
    startPanel: document.querySelector("#start-panel"),
    resultPanel: document.querySelector("#result-panel"),
    start: document.querySelector("#start-button"),
    restart: document.querySelector("#restart-button"),
    sound: document.querySelector("#sound-button"),
    fullscreen: document.querySelector("#fullscreen-button"),
    lives: document.querySelector("#lives-value"),
    score: document.querySelector("#score-value"),
    wave: document.querySelector("#wave-label"),
    bossHud: document.querySelector("#boss-hud"),
    bossHealth: document.querySelector("#boss-health"),
    resultEyebrow: document.querySelector("#result-eyebrow"),
    resultTitle: document.querySelector("#result-title"),
    resultCopy: document.querySelector("#result-copy"),
    resultScore: document.querySelector("#result-score"),
  };

  const ASSET_PATHS = {
    background: "assets/shrine-path.webp",
    players: ["assets/player-1.webp", "assets/player-2.webp", "assets/player-3.webp", "assets/player-4.webp"],
    enemies: ["assets/enemy-1.webp", "assets/enemy-2.webp", "assets/enemy-3.webp"],
    boss: "assets/boss.webp",
    playerShot: "assets/player-shot.webp",
    enemyShots: ["assets/enemy-shot-red.webp", "assets/enemy-shot-purple.webp", "assets/enemy-shot-blue.webp"],
    spell: "assets/spell-flower.webp",
  };

  const TAU = Math.PI * 2;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const assets = {};
  const pointer = { active: false, x: 0, y: 0 };
  const keys = new Set();
  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastTime = performance.now();

  const state = {
    mode: "loading",
    elapsed: 0,
    backgroundY: 0,
    score: 0,
    lives: 5,
    wave: 0,
    waveDelay: 0,
    shake: 0,
    flash: 0,
    sound: true,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    snow: [],
    boss: null,
    player: null,
  };

  class SoundEngine {
    constructor() {
      this.context = null;
      this.master = null;
      this.lastShot = 0;
      this.musicStep = 0;
      this.musicClock = 0;
    }

    unlock() {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.17;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") this.context.resume();
    }

    tone(frequency, duration, type = "sine", volume = 0.18, slide = 0) {
      if (!state.sound || !this.context || !this.master) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    shot() {
      const now = performance.now();
      if (now - this.lastShot < 115) return;
      this.lastShot = now;
      this.tone(620, 0.045, "triangle", 0.035, 180);
    }

    hit() { this.tone(150, 0.1, "sawtooth", 0.08, -70); }
    enemyDown() { this.tone(280, 0.13, "square", 0.07, 180); }
    playerDown() { this.tone(190, 0.55, "sawtooth", 0.16, -150); }
    win() {
      [392, 494, 587, 784].forEach((note, index) => {
        setTimeout(() => this.tone(note, 0.38, "triangle", 0.13, 20), index * 130);
      });
    }

    update(dt) {
      if (!state.sound || !this.context || state.mode === "ready" || state.mode === "gameover") return;
      this.musicClock -= dt;
      if (this.musicClock > 0) return;
      this.musicClock = 0.42;
      const notes = [110, 130.81, 146.83, 164.81, 146.83, 130.81, 98, 110];
      this.tone(notes[this.musicStep % notes.length], 0.34, "triangle", 0.025, 1);
      this.musicStep += 1;
    }
  }

  const sound = new SoundEngine();

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  async function loadAssets() {
    const [background, players, enemies, boss, playerShot, enemyShots, spell] = await Promise.all([
      loadImage(ASSET_PATHS.background),
      Promise.all(ASSET_PATHS.players.map(loadImage)),
      Promise.all(ASSET_PATHS.enemies.map(loadImage)),
      loadImage(ASSET_PATHS.boss),
      loadImage(ASSET_PATHS.playerShot),
      Promise.all(ASSET_PATHS.enemyShots.map(loadImage)),
      loadImage(ASSET_PATHS.spell),
    ]);
    Object.assign(assets, { background, players, enemies, boss, playerShot, enemyShots, spell });
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedSnow();
    if (state.player) {
      state.player.x = clamp(state.player.x, 30, width - 30);
      state.player.y = clamp(state.player.y, height * 0.42, height - 40);
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function seedSnow() {
    const count = reducedMotion ? 25 : Math.round((width * height) / 8500);
    state.snow = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: random(0.5, 1.8),
      speed: random(8, 25),
      drift: random(-6, 6),
      alpha: random(0.18, 0.72),
    }));
  }

  function resetGame() {
    state.mode = "ready";
    state.elapsed = 0;
    state.score = 0;
    state.lives = 5;
    state.wave = 0;
    state.waveDelay = 0;
    state.shake = 0;
    state.flash = 0;
    state.bullets.length = 0;
    state.enemyBullets.length = 0;
    state.enemies.length = 0;
    state.particles.length = 0;
    state.boss = null;
    state.player = {
      x: width / 2,
      y: height * 0.82,
      radius: 11,
      fireClock: 0,
      invulnerable: 0,
      frame: 0,
      frameClock: 0,
      power: 1,
    };
    spawnIntroRing();
    ui.startPanel.hidden = false;
    ui.resultPanel.hidden = true;
    ui.bossHud.classList.remove("is-visible");
    ui.bossHud.setAttribute("aria-hidden", "true");
    syncHud();
  }

  function beginGame() {
    if (state.mode !== "ready") return;
    sound.unlock();
    state.mode = "playing";
    state.wave = 1;
    ui.startPanel.hidden = true;
    ui.wave.textContent = "ĐỢT 1 · VÒNG VÂY";
    canvas.focus({ preventScroll: true });
  }

  function spawnIntroRing() {
    const count = width < 600 ? 11 : 14;
    const radiusX = Math.min(width * 0.34, 320);
    const radiusY = Math.min(height * 0.22, 185);
    const centerY = height * 0.31;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * TAU - Math.PI / 2;
      state.enemies.push(makeEnemy(
        width / 2 + Math.cos(angle) * radiusX,
        centerY + Math.sin(angle) * radiusY,
        index % assets.enemies.length,
        3,
        "orbit",
        angle,
      ));
    }
  }

  function makeEnemy(x, y, frame, hp = 3, behavior = "drift", angle = 0) {
    return {
      x, y, homeX: x, homeY: y, frame, hp, maxHp: hp, behavior, angle,
      radius: width < 560 ? 19 : 23,
      phase: random(0, TAU),
      fireClock: random(2.5, 4.5),
      alive: true,
    };
  }

  function spawnWave(number) {
    state.enemies.length = 0;
    const cols = width < 560 ? 4 : 7;
    const rows = number === 2 ? 3 : 2;
    const spacingX = Math.min(92, width / (cols + 0.6));
    const startX = width / 2 - ((cols - 1) * spacingX) / 2;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        if ((row + col + number) % 5 === 0) continue;
        const y = 128 + row * 72;
        const enemy = makeEnemy(startX + col * spacingX, y, (row + col) % 3, 3 + number, number === 2 ? "sine" : "dive");
        enemy.phase = col * 0.7 + row;
        state.enemies.push(enemy);
      }
    }
    ui.wave.textContent = `ĐỢT ${number} · ${number === 2 ? "HỢP KÍCH" : "TRUY KÍCH"}`;
  }

  function spawnBoss() {
    state.mode = "boss";
    state.enemies.length = 0;
    state.enemyBullets.length = 0;
    state.boss = {
      x: width / 2,
      y: -130,
      targetY: Math.max(155, height * 0.2),
      radius: 46,
      hp: 360,
      maxHp: 360,
      clock: 0,
      fireClock: 1.2,
      aimedClock: 2,
      spin: 0,
      phase: 1,
    };
    ui.wave.textContent = "BOSS · TAMA";
    ui.bossHud.classList.add("is-visible");
    ui.bossHud.setAttribute("aria-hidden", "false");
    state.flash = 0.45;
    state.shake = 0.35;
  }

  function playerShoot() {
    const player = state.player;
    const spread = player.power > 1 ? [-0.12, 0, 0.12] : [-0.055, 0.055];
    for (const angle of spread) {
      state.bullets.push({
        x: player.x + angle * 70,
        y: player.y - 34,
        vx: angle * 260,
        vy: -660,
        radius: 5,
        damage: 1,
      });
    }
    sound.shot();
  }

  function enemyShoot(enemy, count = 1, speed = 150) {
    const target = state.player;
    const aim = Math.atan2(target.y - enemy.y, target.x - enemy.x);
    for (let index = 0; index < count; index += 1) {
      const offset = (index - (count - 1) / 2) * 0.16;
      addEnemyBullet(enemy.x, enemy.y, aim + offset, speed, 0);
    }
  }

  function addEnemyBullet(x, y, angle, speed, type = 0, wobble = 0) {
    state.enemyBullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: type === 2 ? 7 : 6,
      type,
      wobble,
      age: 0,
    });
  }

  function bossPattern(boss) {
    const phaseRatio = boss.hp / boss.maxHp;
    if (phaseRatio < 0.67 && boss.phase === 1) {
      boss.phase = 2;
      boss.fireClock = 0;
      state.enemyBullets.length = 0;
      state.flash = 0.38;
      ui.wave.textContent = "PHÁP THUẬT · HOA TUYẾT";
    }
    if (phaseRatio < 0.33 && boss.phase === 2) {
      boss.phase = 3;
      boss.fireClock = 0;
      state.enemyBullets.length = 0;
      state.flash = 0.5;
      ui.wave.textContent = "PHÁP THUẬT · CỬU VĨ";
    }

    if (boss.phase === 1) {
      const count = 15;
      for (let i = 0; i < count; i += 1) {
        addEnemyBullet(boss.x, boss.y + 20, (i / count) * TAU + boss.spin, 125, i % 3);
      }
      boss.spin += 0.17;
      boss.fireClock = 1.05;
    } else if (boss.phase === 2) {
      const petals = 18;
      for (let i = 0; i < petals; i += 1) {
        const angle = (i / petals) * TAU + boss.spin;
        addEnemyBullet(boss.x, boss.y + 16, angle, 112 + (i % 3) * 25, 1, 0.9);
      }
      boss.spin -= 0.24;
      boss.fireClock = 0.72;
    } else {
      const aim = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
      for (let ring = 0; ring < 2; ring += 1) {
        for (let i = 0; i < 12; i += 1) {
          addEnemyBullet(boss.x, boss.y + 10, (i / 12) * TAU + boss.spin + ring * 0.08, 145 + ring * 48, ring + 1);
        }
      }
      for (let i = -2; i <= 2; i += 1) addEnemyBullet(boss.x, boss.y + 18, aim + i * 0.12, 235, 0);
      boss.spin += 0.31;
      boss.fireClock = 0.64;
    }
  }

  function update(dt) {
    state.elapsed += dt;
    state.backgroundY = (state.backgroundY + dt * (state.mode === "boss" ? 12 : 24)) % Math.max(1, backgroundTileHeight());
    state.flash = Math.max(0, state.flash - dt);
    state.shake = Math.max(0, state.shake - dt);
    sound.update(dt);

    updateSnow(dt);
    updateParticles(dt);

    if (!state.player || !["playing", "boss"].includes(state.mode)) return;

    updatePlayer(dt);
    updatePlayerBullets(dt);
    updateEnemies(dt);
    updateEnemyBullets(dt);
    if (state.mode === "boss" && state.boss) updateBoss(dt);

    if (state.mode === "playing" && state.enemies.every((enemy) => !enemy.alive)) {
      state.waveDelay += dt;
      if (state.waveDelay > 1.15) {
        state.waveDelay = 0;
        state.wave += 1;
        if (state.wave <= 3) spawnWave(state.wave);
        else spawnBoss();
      }
    }
  }

  function updatePlayer(dt) {
    const player = state.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.frameClock += dt;
    if (player.frameClock > 0.11) {
      player.frameClock = 0;
      player.frame = (player.frame + 1) % assets.players.length;
    }

    const speed = 330;
    let dx = 0;
    let dy = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
    if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
    if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
    if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
    if (dx || dy) {
      const length = Math.hypot(dx, dy) || 1;
      player.x += (dx / length) * speed * dt;
      player.y += (dy / length) * speed * dt;
    }

    if (pointer.active) {
      player.x += (pointer.x - player.x) * Math.min(1, dt * 18);
      player.y += (pointer.y - player.y) * Math.min(1, dt * 18);
    }

    player.x = clamp(player.x, 28, width - 28);
    player.y = clamp(player.y, Math.max(118, height * 0.28), height - 42);
    player.fireClock -= dt;
    if (player.fireClock <= 0) {
      player.fireClock = 0.115;
      playerShoot();
    }
  }

  function updateEnemies(dt) {
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      enemy.phase += dt;
      enemy.fireClock -= dt;
      if (enemy.behavior === "orbit") {
        enemy.angle += dt * 0.12;
        const radiusX = Math.min(width * 0.34, 320);
        const radiusY = Math.min(height * 0.22, 185);
        enemy.x = width / 2 + Math.cos(enemy.angle) * radiusX;
        enemy.y = height * 0.31 + Math.sin(enemy.angle) * radiusY;
      } else if (enemy.behavior === "sine") {
        enemy.x = enemy.homeX + Math.sin(enemy.phase * 1.7) * 34;
        enemy.y = enemy.homeY + Math.sin(enemy.phase * 0.8) * 16;
      } else {
        enemy.x = enemy.homeX + Math.sin(enemy.phase + enemy.homeX) * 22;
        enemy.y = enemy.homeY + Math.sin(enemy.phase * 0.55) * 18;
      }
      if (state.mode === "playing" && enemy.fireClock <= 0) {
        enemy.fireClock = random(3.2, 5);
        enemyShoot(enemy, state.wave >= 3 ? 3 : 1, 85 + state.wave * 6);
      }
    }
  }

  function updatePlayerBullets(dt) {
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.y < -30) bullet.dead = true;

      for (const enemy of state.enemies) {
        if (!enemy.alive || bullet.dead) continue;
        if (distanceSq(bullet, enemy) < (bullet.radius + enemy.radius) ** 2) {
          bullet.dead = true;
          enemy.hp -= bullet.damage;
          burst(bullet.x, bullet.y, "#62eee7", 4);
          if (enemy.hp <= 0) destroyEnemy(enemy);
        }
      }

      const boss = state.boss;
      if (boss && bullet.y > boss.y - 90 && distanceSq(bullet, boss) < (bullet.radius + boss.radius) ** 2) {
        bullet.dead = true;
        boss.hp -= bullet.damage;
        state.score += 8;
        burst(bullet.x, bullet.y, "#f8d68e", 3);
        ui.bossHealth.style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
        if (boss.hp <= 0) defeatBoss();
      }
    }
    state.bullets = state.bullets.filter((bullet) => !bullet.dead);
  }

  function updateEnemyBullets(dt) {
    const player = state.player;
    for (const bullet of state.enemyBullets) {
      bullet.age += dt;
      if (bullet.wobble) {
        const angle = Math.atan2(bullet.vy, bullet.vx) + Math.sin(bullet.age * 5) * bullet.wobble * dt;
        const speed = Math.hypot(bullet.vx, bullet.vy);
        bullet.vx = Math.cos(angle) * speed;
        bullet.vy = Math.sin(angle) * speed;
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x < -50 || bullet.x > width + 50 || bullet.y < -70 || bullet.y > height + 70) bullet.dead = true;
      if (!bullet.dead && player.invulnerable <= 0 && distanceSq(bullet, player) < (bullet.radius + player.radius) ** 2) {
        bullet.dead = true;
        damagePlayer();
      }
    }
    state.enemyBullets = state.enemyBullets.filter((bullet) => !bullet.dead);
  }

  function updateBoss(dt) {
    const boss = state.boss;
    boss.clock += dt;
    if (boss.y < boss.targetY) boss.y += (boss.targetY - boss.y) * Math.min(1, dt * 2.8);
    boss.x = width / 2 + Math.sin(boss.clock * 0.7) * Math.min(180, width * 0.24);
    boss.fireClock -= dt;
    boss.aimedClock -= dt;
    if (boss.y > 0 && boss.fireClock <= 0) bossPattern(boss);
    if (boss.phase < 3 && boss.aimedClock <= 0) {
      boss.aimedClock = boss.phase === 1 ? 2.1 : 1.45;
      enemyShoot(boss, boss.phase === 1 ? 3 : 5, 200);
    }
  }

  function updateSnow(dt) {
    for (const flake of state.snow) {
      flake.y += flake.speed * dt;
      flake.x += flake.drift * dt;
      if (flake.y > height + 4) {
        flake.y = -4;
        flake.x = Math.random() * width;
      }
      if (flake.x < -4) flake.x = width + 4;
      if (flake.x > width + 4) flake.x = -4;
    }
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function destroyEnemy(enemy) {
    enemy.alive = false;
    state.score += 500;
    burst(enemy.x, enemy.y, "#8cffbd", 14);
    sound.enemyDown();
    syncHud();
  }

  function damagePlayer() {
    const player = state.player;
    player.invulnerable = 3.2;
    state.lives -= 1;
    state.shake = 0.45;
    state.flash = 0.22;
    state.enemyBullets = state.enemyBullets.filter((bullet) => distanceSq(bullet, player) > 140 ** 2);
    burst(player.x, player.y, "#ffb052", 24);
    sound.playerDown();
    syncHud();
    if (state.lives <= 0) endGame(false);
  }

  function defeatBoss() {
    if (!state.boss) return;
    state.mode = "ending";
    state.score += 15000;
    burst(state.boss.x, state.boss.y, "#f3a7ff", 80);
    state.boss = null;
    state.enemyBullets.length = 0;
    state.shake = 0.9;
    state.flash = 0.8;
    syncHud();
    setTimeout(() => endGame(true), 900);
  }

  function endGame(won) {
    state.mode = "gameover";
    pointer.active = false;
    ui.bossHud.classList.remove("is-visible");
    ui.bossHud.setAttribute("aria-hidden", "true");
    ui.resultEyebrow.textContent = won ? "NGÔI ĐỀN ĐÃ ĐƯỢC GIẢI PHÓNG" : "LỜI NGUYỀN VẪN CÒN";
    ui.resultTitle.textContent = won ? "BÌNH MINH ĐÃ ĐẾN" : "KAGA GỤC NGÃ";
    ui.resultCopy.textContent = won
      ? "Bạn đã phá tan vòng đạn và giải cứu Tama."
      : "Luồn qua khe đạn, giữ khoảng cách và thử lại.";
    ui.resultScore.textContent = formatScore(state.score);
    ui.resultPanel.hidden = false;
    ui.wave.textContent = won ? "HOÀN THÀNH" : "THẤT BẠI";
    if (won) sound.win();
    setTimeout(() => ui.restart.focus(), 100);
  }

  function burst(x, y, color, count) {
    if (reducedMotion) count = Math.min(count, 5);
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * TAU;
      const speed = random(35, 190);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: random(1.5, 4.5),
        life: random(0.25, 0.8),
        maxLife: 0.8,
        color,
      });
    }
  }

  function distanceSq(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }

  function formatScore(score) {
    return Math.max(0, Math.round(score)).toString().padStart(6, "0");
  }

  function syncHud() {
    ui.lives.textContent = state.lives;
    ui.score.textContent = formatScore(state.score);
  }

  function backgroundTileHeight() {
    if (!assets.background) return height;
    return width * (assets.background.height / assets.background.width);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (state.shake > 0 && !reducedMotion) {
      const strength = state.shake * 12;
      ctx.translate(random(-strength, strength), random(-strength, strength));
    }
    drawBackground();
    drawEnemies();
    if (state.boss) drawBoss();
    drawBullets();
    drawPlayer();
    drawParticles();
    drawSnow();
    ctx.restore();

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 235, 210, ${Math.min(0.7, state.flash)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawBackground() {
    const tileHeight = backgroundTileHeight();
    const offset = state.backgroundY - tileHeight;
    for (let y = offset; y < height + tileHeight; y += tileHeight) {
      ctx.drawImage(assets.background, 0, y, width, tileHeight + 1);
    }
    const vignette = ctx.createRadialGradient(width / 2, height * 0.48, Math.min(width, height) * 0.12, width / 2, height * 0.48, Math.max(width, height) * 0.68);
    vignette.addColorStop(0, "rgba(3, 9, 16, 0.03)");
    vignette.addColorStop(0.68, "rgba(2, 7, 13, 0.18)");
    vignette.addColorStop(1, "rgba(1, 4, 9, 0.68)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const size = enemy.radius * 2.8;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.sin(enemy.phase * 2) * 0.04);
      ctx.shadowBlur = 15;
      ctx.shadowColor = "rgba(78, 255, 159, 0.38)";
      ctx.drawImage(assets.enemies[enemy.frame], -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  function drawBoss() {
    const boss = state.boss;
    const size = width < 560 ? 150 : 190;
    const aura = 1 + Math.sin(state.elapsed * 3) * 0.04;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.globalAlpha = 0.28;
    ctx.drawImage(assets.spell, -size * 0.74 * aura, -size * 0.74 * aura, size * 1.48 * aura, size * 1.48 * aura);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 28;
    ctx.shadowColor = "rgba(192, 72, 255, 0.8)";
    ctx.drawImage(assets.boss, -size / 2, -size / 2, size, size * (assets.boss.height / assets.boss.width));
    ctx.restore();
  }

  function drawBullets() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const bullet of state.bullets) {
      const size = 19;
      ctx.shadowBlur = 12;
      ctx.shadowColor = "#4ffff4";
      ctx.drawImage(assets.playerShot, bullet.x - size / 2, bullet.y - size / 2, size, size);
    }
    for (const bullet of state.enemyBullets) {
      const size = bullet.radius * 3.2;
      ctx.shadowBlur = 13;
      ctx.shadowColor = bullet.type === 0 ? "#ff4267" : bullet.type === 1 ? "#c055ff" : "#4d9fff";
      ctx.drawImage(assets.enemyShots[bullet.type], bullet.x - size / 2, bullet.y - size / 2, size, size);
    }
    ctx.restore();
  }

  function drawPlayer() {
    const player = state.player;
    if (!player) return;
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) return;
    const size = width < 560 ? 78 : 92;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowBlur = 18;
    ctx.shadowColor = "rgba(255, 121, 67, 0.6)";
    ctx.drawImage(assets.players[player.frame], -size / 2, -size / 2, size, size);
    ctx.fillStyle = "rgba(88, 231, 225, 0.95)";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#58e7e1";
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.min(1, particle.life / 0.3);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSnow() {
    ctx.save();
    for (const flake of state.snow) {
      ctx.globalAlpha = flake.alpha;
      ctx.fillStyle = "#d8edff";
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    const point = pointerPosition(event);
    pointer.active = true;
    pointer.x = point.x;
    pointer.y = point.y;
    canvas.setPointerCapture?.(event.pointerId);
    if (state.mode === "ready") beginGame();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointer.active) return;
    const point = pointerPosition(event);
    pointer.x = point.x;
    pointer.y = point.y;
  });

  const releasePointer = () => { pointer.active = false; };
  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);

  window.addEventListener("keydown", (event) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if ((event.code === "Space" || event.code === "Enter") && state.mode === "ready") beginGame();
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("resize", resize);

  ui.start.addEventListener("click", beginGame);
  ui.restart.addEventListener("click", () => {
    sound.unlock();
    resetGame();
    beginGame();
  });
  ui.sound.addEventListener("click", () => {
    state.sound = !state.sound;
    ui.sound.setAttribute("aria-pressed", String(state.sound));
    ui.sound.setAttribute("aria-label", state.sound ? "Tắt âm thanh" : "Bật âm thanh");
    if (state.sound) sound.unlock();
  });
  ui.fullscreen.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.querySelector("#game-shell").requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      console.warn("Trình duyệt không cho phép toàn màn hình.", error);
    }
  });

  function loop(now) {
    const dt = Math.min(0.034, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  async function boot() {
    resize();
    try {
      await loadAssets();
      resetGame();
      ui.loading.classList.add("is-hidden");
      requestAnimationFrame(loop);
    } catch (error) {
      ui.loading.querySelector("p").textContent = "KHÔNG THỂ TẢI TÀI NGUYÊN";
      console.error(error);
    }
  }

  window.__GAME__ = {
    state,
    begin: beginGame,
    spawnBoss,
    win: () => state.boss && defeatBoss(),
  };

  boot();
})();
