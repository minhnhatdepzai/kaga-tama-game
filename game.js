(() => {
  "use strict";

  const canvas = document.querySelector("#game-canvas");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
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
    bossName: document.querySelector("#boss-phase-name"),
    bossTimer: document.querySelector("#boss-timer"),
    bossPips: document.querySelector("#boss-phase-pips"),
    phaseBanner: document.querySelector("#phase-banner"),
    phaseKicker: document.querySelector("#phase-kicker"),
    phaseTitle: document.querySelector("#phase-title"),
    phaseSubtitle: document.querySelector("#phase-subtitle"),
    story: document.querySelector("#story-panel"),
    storyPortrait: document.querySelector("#story-portrait"),
    storySpeaker: document.querySelector("#story-speaker"),
    storyText: document.querySelector("#story-text"),
    storyNext: document.querySelector("#story-next"),
    resultEyebrow: document.querySelector("#result-eyebrow"),
    resultTitle: document.querySelector("#result-title"),
    resultCopy: document.querySelector("#result-copy"),
    resultScore: document.querySelector("#result-score"),
    endingArt: document.querySelector("#ending-art"),
  };

  const PATHS = {
    background: "assets/shrine-path.webp",
    players: [1, 2, 3, 4].map((n) => `assets/player-${n}.webp`),
    enemies: [1, 2, 3].map((n) => `assets/enemy-${n}.webp`),
    human: [1, 2, 3, 4].map((n) => `assets/tama-human-${n}.webp`),
    morph: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `assets/tama-morph-${n}.webp`),
    fox: [1, 2, 3, 4].map((n) => `assets/tama-fox-${n}.webp`),
    bossLegacy: "assets/boss.webp",
    playerShot: "assets/player-shot.webp",
    enemyShots: ["assets/enemy-shot-red.webp", "assets/enemy-shot-purple.webp", "assets/enemy-shot-blue.webp"],
    spell: "assets/spell-flower.webp",
    kagaFull: "assets/kaga-full.webp",
  };

  const HEART = [
    [0, 549], [-143, 725], [-290, 725], [-432, 549], [-432, 400], [-287, 227],
    [-149, 78], [0, -86], [149, 78], [287, 227], [432, 400], [432, 549],
    [290, 725], [143, 725],
  ];
  const PHASES = [
    { name: "DARK WATER", hp: 200, duration: 12, kicker: "DỊ THỦY", title: "DARK WATER", subtitle: "Bóng tối đã nuốt lấy Tama" },
    { name: "FROZEN FLOWER", hp: 280, duration: 14, kicker: "PHÁP THUẬT BĂNG", title: "FROZEN FLOWER", subtitle: "Frost Art · Sleet Curtain" },
    { name: "ICE FOX", hp: 320, duration: 12, kicker: "YÊU HỒ THỨC TỈNH", title: "ICE FOX", subtitle: "Frost Art · Glacial Lotus" },
    { name: "NINE TAILS", hp: 588, duration: 24, kicker: "CẤM THUẬT", title: "NINE TAILS", subtitle: "Forbidden Art · Sakura Weeping in Silent Frost" },
  ];
  const INTRO_DIALOGUE = [
    { speaker: "KAGA", portrait: "assets/kaga-determined.webp", text: "Tama! Cuối cùng mình cũng tìm thấy cậu!" },
    { speaker: "TAMA", portrait: "assets/tama-pain.webp", text: "Kaga… đừng lại gần. Thứ này đang chiếm lấy mình." },
    { speaker: "KAGA", portrait: "assets/kaga-shocked.webp", text: "Luồng khí đen này… Tama, chuyện gì đã xảy ra?" },
    { speaker: "TAMA", portrait: "assets/tama-pleading.webp", text: "Xin cậu… hãy phá lời nguyền trước khi quá muộn." },
    { speaker: "TAMA?", portrait: "assets/tama-pain.webp", text: "Muộn rồi. Kẻ nào bước vào đây cũng sẽ đóng băng." },
  ];
  const TRANSFORM_DIALOGUE = [
    { speaker: "TAMA", portrait: "assets/tama-pain.webp", text: "Sức mạnh này… mình không thể giữ nó lại nữa!" },
    { speaker: "KAGA", portrait: "assets/kaga-determined.webp", text: "Vậy mình sẽ thiêu rụi lời nguyền, nhưng nhất định không làm tổn thương cậu." },
  ];
  const END_DIALOGUE = [
    { speaker: "TAMA", portrait: "assets/tama-lucid.webp", text: "Kaga… là cậu sao? Mình đã nghe thấy tiếng cậu." },
    { speaker: "KAGA", portrait: "assets/kaga-determined.webp", text: "Đúng rồi. Đưa tay cho mình, chúng ta sẽ cùng về nhà." },
    { speaker: "TAMA", portrait: "assets/tama-pleading.webp", text: "Không… lời nguyền vẫn còn ở đây. Nó đang kéo mình trở lại!" },
  ];

  const TAU = Math.PI * 2;
  const LIMITS = { playerBullets: 54, enemyBullets: 220, particles: 100 };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const assets = {};
  const keys = new Set();
  const pointer = { active: false, x: 0, y: 0 };
  let width = 1;
  let height = 1;
  let dpr = 1;
  let lastTime = performance.now();
  let backgroundCache = null;
  let formationSlots = [];

  const state = {
    mode: "loading",
    modeClock: 0,
    elapsed: 0,
    score: 0,
    lives: 5,
    kills: 0,
    sound: true,
    flash: 0,
    shake: 0,
    formationClock: 0,
    clearClock: 0,
    phaseIndex: -1,
    phaseTimer: 0,
    dialogue: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    powerups: [],
    snow: [],
    boss: null,
    player: null,
    frameSamples: [],
  };

  class SoundEngine {
    constructor() {
      this.context = null;
      this.master = null;
      this.lastShot = 0;
      this.musicClock = 0;
      this.musicStep = 0;
    }

    unlock() {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.14;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") this.context.resume();
    }

    tone(frequency, duration, type = "sine", volume = 0.12, slide = 0) {
      if (!state.sound || !this.context || !this.master) return;
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, frequency + slide), now + duration);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    shot() {
      const now = performance.now();
      if (now - this.lastShot < 120) return;
      this.lastShot = now;
      this.tone(620, 0.045, "triangle", 0.025, 160);
    }

    hit() { this.tone(160, 0.1, "sawtooth", 0.065, -70); }
    down() { this.tone(285, 0.13, "square", 0.06, 180); }
    hurt() { this.tone(190, 0.45, "sawtooth", 0.13, -145); }

    win() {
      [392, 494, 587, 784].forEach((note, index) => {
        setTimeout(() => this.tone(note, 0.34, "triangle", 0.1, 20), index * 120);
      });
    }

    update(dt) {
      if (!state.sound || !this.context || ["ready", "endCard", "gameover"].includes(state.mode)) return;
      this.musicClock -= dt;
      if (this.musicClock > 0) return;
      this.musicClock = 0.46;
      const notes = [110, 130.81, 146.83, 164.81, 146.83, 130.81, 98, 110];
      this.tone(notes[this.musicStep % notes.length], 0.32, "triangle", 0.018, 1);
      this.musicStep += 1;
    }
  }

  const sound = new SoundEngine();

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Không tải được ${src}`));
      image.src = src;
    });
  }

  async function loadAssets() {
    const [background, players, enemies, human, morph, fox, bossLegacy, playerShot, enemyShots, spell, kagaFull] = await Promise.all([
      loadImage(PATHS.background),
      Promise.all(PATHS.players.map(loadImage)),
      Promise.all(PATHS.enemies.map(loadImage)),
      Promise.all(PATHS.human.map(loadImage)),
      Promise.all(PATHS.morph.map(loadImage)),
      Promise.all(PATHS.fox.map(loadImage)),
      loadImage(PATHS.bossLegacy),
      loadImage(PATHS.playerShot),
      Promise.all(PATHS.enemyShots.map(loadImage)),
      loadImage(PATHS.spell),
      loadImage(PATHS.kagaFull),
    ]);
    Object.assign(assets, { background, players, enemies, human, morph, fox, bossLegacy, playerShot, enemyShots, spell, kagaFull });
    rebuildBackground();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function distanceSq(a, b) {
    return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  }

  function smoothstep(value) {
    const x = clamp(value, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function removeSwap(list, index) {
    list[index] = list[list.length - 1];
    list.pop();
  }

  function resize() {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(1.5, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    calculateFormationSlots();
    seedSnow();
    rebuildBackground();
    if (state.player) {
      state.player.x = clamp(state.player.x, 28, width - 28);
      state.player.y = clamp(state.player.y, Math.max(118, height * 0.3), height - 42);
    }
  }

  function calculateFormationSlots() {
    const scale = Math.min((width - 74) / 864, (height * 0.48) / 811, 0.68);
    const top = Math.max(116, height * 0.14);
    formationSlots = HEART.map(([x, y]) => ({
      x: width / 2 + x * scale,
      y: top + (725 - y) * scale,
    }));
  }

  function seedSnow() {
    const count = reducedMotion ? 24 : Math.min(88, Math.round((width * height) / 11000));
    state.snow = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: random(0.5, 1.7),
      speed: random(8, 25),
      drift: random(-7, 7),
      alpha: random(0.18, 0.65),
    }));
  }

  function rebuildBackground() {
    if (!assets.background || width < 2 || height < 2) return;
    const cache = document.createElement("canvas");
    cache.width = Math.ceil(width);
    cache.height = Math.ceil(height);
    const cacheCtx = cache.getContext("2d", { alpha: false });
    const image = assets.background;
    const scale = Math.max(width / image.width, height / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    cacheCtx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    const gradient = cacheCtx.createRadialGradient(width / 2, height * 0.48, Math.min(width, height) * 0.1, width / 2, height * 0.48, Math.max(width, height) * 0.72);
    gradient.addColorStop(0, "rgba(3, 9, 16, 0.02)");
    gradient.addColorStop(0.66, "rgba(2, 7, 13, 0.2)");
    gradient.addColorStop(1, "rgba(1, 4, 9, 0.72)");
    cacheCtx.fillStyle = gradient;
    cacheCtx.fillRect(0, 0, width, height);
    backgroundCache = cache;
  }

  function resetGame() {
    Object.assign(state, {
      mode: "ready",
      modeClock: 0,
      elapsed: 0,
      score: 0,
      lives: 5,
      kills: 0,
      flash: 0,
      shake: 0,
      formationClock: 0,
      clearClock: 0,
      phaseIndex: -1,
      phaseTimer: 0,
      dialogue: null,
      boss: null,
    });
    state.bullets.length = 0;
    state.enemyBullets.length = 0;
    state.enemies.length = 0;
    state.particles.length = 0;
    state.powerups.length = 0;
    state.frameSamples.length = 0;
    state.player = {
      x: width / 2,
      y: height * 0.82,
      radius: 10,
      fireClock: 0,
      invulnerable: 0,
      frame: 0,
      frameClock: 0,
      power: 1,
    };
    spawnHeart();
    pointer.active = false;
    ui.startPanel.hidden = false;
    ui.resultPanel.hidden = true;
    ui.phaseBanner.hidden = true;
    ui.story.hidden = true;
    ui.storyNext.hidden = false;
    setBossHud(false);
    ui.wave.textContent = "SẴN SÀNG";
    syncHud();
  }

  function spawnHeart() {
    state.enemies.length = 0;
    formationSlots.forEach((slot, index) => {
      state.enemies.push({
        x: slot.x,
        y: slot.y,
        slot: index,
        frame: index % assets.enemies.length,
        hp: 3,
        radius: width < 560 ? 18 : 22,
        alive: true,
        bob: random(0, TAU),
      });
    });
  }

  function beginGame() {
    if (state.mode !== "ready") return;
    sound.unlock();
    state.mode = "wave";
    state.modeClock = 0;
    state.formationClock = 0;
    ui.startPanel.hidden = true;
    ui.wave.textContent = "ĐỢT 1 · TRÁI TIM BĂNG";
    canvas.focus({ preventScroll: true });
  }

  function startDialogue(lines, after) {
    state.mode = "dialogue";
    state.modeClock = 0;
    state.dialogue = { lines, index: 0, after };
    ui.storyNext.hidden = false;
    ui.story.hidden = false;
    showDialogueLine();
  }

  function showDialogueLine() {
    if (!state.dialogue) return;
    const line = state.dialogue.lines[state.dialogue.index];
    ui.storySpeaker.textContent = line.speaker;
    ui.storyText.textContent = line.text;
    ui.storyPortrait.src = line.portrait;
    ui.storyPortrait.alt = line.speaker;
    ui.storyNext.focus({ preventScroll: true });
  }

  function advanceDialogue() {
    if (state.mode !== "dialogue" || !state.dialogue) return;
    state.dialogue.index += 1;
    if (state.dialogue.index < state.dialogue.lines.length) {
      showDialogueLine();
      return;
    }
    const after = state.dialogue.after;
    state.dialogue = null;
    ui.story.hidden = true;
    if (after === "phase0") startPhase(0);
    else if (after === "transform") startTransform();
    else if (after === "ending") startEnding();
  }

  function setBossHud(visible) {
    ui.bossHud.classList.toggle("is-visible", visible);
    ui.bossHud.setAttribute("aria-hidden", String(!visible));
  }

  function syncPhaseHud() {
    const config = PHASES[state.phaseIndex];
    if (!config) return;
    ui.bossName.textContent = config.name;
    ui.bossTimer.textContent = Math.max(0, state.phaseTimer).toFixed(1);
    ui.bossHealth.style.width = `${Math.max(0, (state.boss.hp / state.boss.maxHp) * 100)}%`;
    ui.bossPips.replaceChildren(...PHASES.map((_, index) => {
      const pip = document.createElement("span");
      if (index < state.phaseIndex) pip.className = "is-past";
      if (index === state.phaseIndex) pip.className = "is-active";
      return pip;
    }));
  }

  function startPhase(index) {
    const config = PHASES[index];
    state.enemies.length = 0;
    state.phaseIndex = index;
    state.phaseTimer = config.duration;
    state.mode = "phaseIntro";
    state.modeClock = 0;
    state.enemyBullets.length = 0;
    state.bullets.length = 0;
    if (!state.boss) {
      state.boss = {
        x: width / 2,
        y: -140,
        targetY: Math.max(165, height * 0.23),
        radius: width < 560 ? 35 : 44,
        hp: config.hp,
        maxHp: config.hp,
        attackClock: 0.45,
        aimedClock: 1.4,
        spin: 0,
        frameClock: 0,
        frame: 0,
        form: index < 2 ? "human" : "fox",
        alpha: 1,
      };
    } else {
      Object.assign(state.boss, {
        hp: config.hp,
        maxHp: config.hp,
        attackClock: 0.45,
        aimedClock: 1.4,
        frameClock: 0,
        frame: 0,
        form: index < 2 ? "human" : "fox",
        alpha: 1,
      });
    }
    ui.phaseKicker.textContent = config.kicker;
    ui.phaseTitle.textContent = config.title;
    ui.phaseSubtitle.textContent = config.subtitle;
    ui.phaseBanner.hidden = false;
    ui.wave.textContent = `PHASE ${index + 1} / 4`;
    setBossHud(true);
    syncPhaseHud();
    state.flash = 0.35;
    state.shake = 0.22;
  }

  function startTransform() {
    state.mode = "transform";
    state.modeClock = 0;
    state.enemyBullets.length = 0;
    if (state.boss) {
      state.boss.form = "morph";
      state.boss.frame = 0;
    }
    ui.wave.textContent = "TAMA · BIẾN HÌNH";
    setBossHud(false);
  }

  function finishPhase() {
    if (state.mode !== "boss" || !state.boss) return;
    state.score += 2500 * (state.phaseIndex + 1);
    state.enemyBullets.length = 0;
    state.bullets.length = 0;
    state.mode = "phaseClear";
    state.modeClock = 0;
    state.flash = 0.5;
    state.shake = 0.45;
    burst(state.boss.x, state.boss.y, "#f3b6ff", 34);
    syncHud();
  }

  function continueAfterPhase() {
    if (state.phaseIndex >= PHASES.length - 1) {
      state.boss.form = "human";
      state.boss.frame = 0;
      setBossHud(false);
      startDialogue(END_DIALOGUE, "ending");
      return;
    }
    const next = state.phaseIndex + 1;
    if (next === 2) startDialogue(TRANSFORM_DIALOGUE, "transform");
    else startPhase(next);
  }

  function startEnding() {
    state.mode = "ending";
    state.modeClock = 0;
    state.enemyBullets.length = 0;
    state.bullets.length = 0;
    if (state.boss) {
      state.boss.form = "human";
      state.boss.alpha = 1;
      state.boss.targetY = Math.max(165, height * 0.24);
    }
    ui.wave.textContent = "LỜI NGUYỀN THỨC GIẤC";
  }

  function showEndCard(won = true) {
    state.mode = won ? "endCard" : "gameover";
    pointer.active = false;
    setBossHud(false);
    ui.story.hidden = true;
    ui.phaseBanner.hidden = true;
    ui.resultEyebrow.textContent = won ? "LỜI NGUYỀN CHƯA KẾT THÚC" : "LỜI NGUYỀN VẪN CÒN";
    ui.resultTitle.textContent = won ? "RESCUE HER!" : "KAGA GỤC NGÃ";
    ui.resultCopy.textContent = won
      ? "Tama đã tỉnh lại, nhưng bị bóng tối kéo đi ngay trước mắt Kaga."
      : "Luồn qua khe đạn, giữ khoảng cách và thử lại.";
    ui.endingArt.src = won ? "assets/tama-end-card.webp" : "assets/kaga-shocked.webp";
    ui.endingArt.alt = won ? "Tama bị lời nguyền kéo đi" : "Kaga bị đánh bại";
    ui.resultScore.textContent = formatScore(state.score);
    ui.resultPanel.hidden = false;
    ui.wave.textContent = won ? "RESCUE HER!" : "THẤT BẠI";
    if (won) sound.win();
    setTimeout(() => ui.restart.focus(), 80);
  }

  function playerShoot() {
    if (state.bullets.length >= LIMITS.playerBullets) return;
    const player = state.player;
    const spreads = player.power === 1 ? [-0.045, 0.045] : player.power === 2 ? [-0.12, 0, 0.12] : [-0.18, -0.06, 0.06, 0.18];
    for (const angle of spreads) {
      if (state.bullets.length >= LIMITS.playerBullets) break;
      state.bullets.push({
        x: player.x + angle * 70,
        y: player.y - 32,
        vx: angle * 230,
        vy: -650,
        radius: 5,
        damage: 1,
      });
    }
    sound.shot();
  }

  function addEnemyBullet(x, y, angle, speed, type = 0, wobble = 0) {
    if (state.enemyBullets.length >= LIMITS.enemyBullets) return false;
    state.enemyBullets.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: type === 2 ? 6.5 : 5.5,
      type,
      wobble,
      age: 0,
    });
    return true;
  }

  function aimedBurst(source, count, speed, spread = 0.14, type = 0) {
    const aim = Math.atan2(state.player.y - source.y, state.player.x - source.x);
    for (let index = 0; index < count; index += 1) {
      addEnemyBullet(source.x, source.y + 18, aim + (index - (count - 1) / 2) * spread, speed, type);
    }
  }

  function runBossPattern() {
    const boss = state.boss;
    const phase = state.phaseIndex;
    if (phase === 0) {
      for (let i = 0; i < 16; i += 1) addEnemyBullet(boss.x, boss.y + 18, (i / 16) * TAU + boss.spin, 118, i % 3);
      boss.spin += 0.18;
      boss.attackClock = 0.92;
    } else if (phase === 1) {
      const gap = Math.floor(random(2, 8));
      const columns = 10;
      for (let i = 0; i < columns; i += 1) {
        if (i === gap || i === gap + 1) continue;
        const x = ((i + 0.5) / columns) * width;
        addEnemyBullet(x, -18, Math.PI / 2 + Math.sin(state.elapsed + i) * 0.05, 155, 2, 0.22);
      }
      for (let i = 0; i < 10; i += 1) addEnemyBullet(boss.x, boss.y, (i / 10) * TAU + boss.spin, 105 + (i % 2) * 38, 1, 0.3);
      boss.spin -= 0.2;
      boss.attackClock = 0.72;
    } else if (phase === 2) {
      for (let petal = 0; petal < 20; petal += 1) {
        const angle = (petal / 20) * TAU + boss.spin + Math.sin(petal * 2.4) * 0.08;
        addEnemyBullet(boss.x, boss.y + 12, angle, 124 + (petal % 4) * 14, petal % 2 ? 2 : 1, 0.22);
      }
      boss.spin += 0.29;
      boss.attackClock = 0.66;
    } else {
      for (let ring = 0; ring < 2; ring += 1) {
        for (let i = 0; i < 15; i += 1) {
          addEnemyBullet(boss.x, boss.y + 12, (i / 15) * TAU + boss.spin + ring * 0.11, 132 + ring * 46, ring ? 1 : 0, 0.12);
        }
      }
      aimedBurst(boss, 5, 220, 0.11, 2);
      boss.spin += 0.33;
      boss.attackClock = 0.68;
    }
  }

  function update(dt) {
    state.elapsed += dt;
    state.modeClock += dt;
    state.flash = Math.max(0, state.flash - dt * 1.8);
    state.shake = Math.max(0, state.shake - dt);
    sound.update(dt);
    updateSnow(dt);
    updateParticles(dt);

    if (state.mode === "phaseIntro") {
      updateBossAnimation(dt);
      moveBoss(dt);
      if (state.modeClock >= (reducedMotion ? 0.25 : 1.45)) {
        state.mode = "boss";
        state.modeClock = 0;
        ui.phaseBanner.hidden = true;
      }
      return;
    }
    if (state.mode === "transform") {
      updateTransform();
      return;
    }
    if (state.mode === "phaseClear") {
      updateBossAnimation(dt);
      if (state.modeClock >= 0.65) continueAfterPhase();
      return;
    }
    if (state.mode === "ending") {
      updateEnding(dt);
      return;
    }
    if (!["wave", "boss"].includes(state.mode)) return;

    updatePlayer(dt);
    updatePlayerBullets(dt);
    updateEnemyBullets(dt);
    updatePowerups(dt);
    if (state.mode === "wave") updateWave(dt);
    else updateBoss(dt);
  }

  function updatePlayer(dt) {
    const player = state.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.frameClock += dt;
    if (player.frameClock >= 0.11) {
      player.frameClock %= 0.11;
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
      const length = Math.hypot(dx, dy);
      player.x += (dx / length) * speed * dt;
      player.y += (dy / length) * speed * dt;
    }
    if (pointer.active) {
      player.x += (pointer.x - player.x) * Math.min(1, dt * 18);
      player.y += (pointer.y - player.y) * Math.min(1, dt * 18);
    }
    player.x = clamp(player.x, 28, width - 28);
    player.y = clamp(player.y, Math.max(118, height * 0.3), height - 42);
    player.fireClock -= dt;
    if (player.fireClock <= 0) {
      player.fireClock = player.power >= 3 ? 0.105 : 0.12;
      playerShoot();
    }
  }

  function updateWave(dt) {
    state.formationClock += dt;
    const cycle = Math.floor(state.formationClock / 2);
    const cycleTime = state.formationClock % 2;
    const shift = smoothstep((cycleTime - 1.4) / 0.6);
    let living = 0;
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      living += 1;
      const from = formationSlots[(enemy.slot + cycle) % formationSlots.length];
      const to = formationSlots[(enemy.slot + cycle + 1) % formationSlots.length];
      enemy.bob += dt * 2.4;
      enemy.x = from.x + (to.x - from.x) * shift;
      enemy.y = from.y + (to.y - from.y) * shift + Math.sin(enemy.bob) * 2.5;
      if (state.player.invulnerable <= 0 && distanceSq(enemy, state.player) < (enemy.radius + state.player.radius) ** 2) damagePlayer();
    }
    if (living === 0) {
      state.clearClock += dt;
      if (state.clearClock >= 0.5) {
        state.clearClock = -999;
        startDialogue(INTRO_DIALOGUE, "phase0");
      }
    }
  }

  function updateBoss(dt) {
    const boss = state.boss;
    state.phaseTimer -= dt;
    moveBoss(dt);
    updateBossAnimation(dt);
    boss.attackClock -= dt;
    boss.aimedClock -= dt;
    if (boss.attackClock <= 0) runBossPattern();
    if (boss.aimedClock <= 0 && state.phaseIndex < 3) {
      aimedBurst(boss, state.phaseIndex + 3, 185 + state.phaseIndex * 12, 0.13, state.phaseIndex % 3);
      boss.aimedClock = 1.9 - state.phaseIndex * 0.18;
    }
    ui.bossTimer.textContent = Math.max(0, state.phaseTimer).toFixed(1);
    if (state.phaseTimer <= 0) finishPhase();
  }

  function moveBoss(dt) {
    const boss = state.boss;
    if (!boss) return;
    boss.y += (boss.targetY - boss.y) * Math.min(1, dt * 3.2);
    if (boss.y > 0 && ["boss", "phaseIntro"].includes(state.mode)) {
      boss.x = width / 2 + Math.sin(state.elapsed * (0.55 + state.phaseIndex * 0.08)) * Math.min(170, width * 0.22);
    }
  }

  function updateBossAnimation(dt) {
    const boss = state.boss;
    if (!boss || boss.form === "morph") return;
    const frames = boss.form === "fox" ? assets.fox : assets.human;
    boss.frameClock += dt;
    if (boss.frameClock >= 0.13) {
      boss.frameClock %= 0.13;
      boss.frame = (boss.frame + 1) % frames.length;
    }
  }

  function updateTransform() {
    const duration = reducedMotion ? 0.35 : 1.45;
    const progress = clamp(state.modeClock / duration, 0, 0.999);
    state.boss.frame = Math.floor(progress * assets.morph.length);
    if (state.modeClock >= duration) startPhase(2);
  }

  function updateEnding(dt) {
    const boss = state.boss;
    if (boss) {
      updateBossAnimation(dt);
      if (state.modeClock > 0.65) {
        boss.y -= dt * (70 + state.modeClock * 22);
        boss.alpha = 1 - clamp((state.modeClock - 0.85) / 1.75, 0, 1);
      }
    }
    if (state.modeClock >= 0.9 && state.modeClock < 2.25 && ui.story.hidden) {
      ui.storySpeaker.textContent = "KAGA";
      ui.storyText.textContent = "TAMA!!";
      ui.storyPortrait.src = "assets/kaga-shocked.webp";
      ui.storyPortrait.alt = "Kaga";
      ui.storyNext.hidden = true;
      ui.story.hidden = false;
    }
    if (state.modeClock >= 2.25) ui.story.hidden = true;
    if (state.modeClock >= 3.05) showEndCard(true);
  }

  function updatePlayerBullets(dt) {
    for (let index = state.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = state.bullets[index];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      let dead = bullet.y < -32 || bullet.x < -24 || bullet.x > width + 24;
      if (!dead && state.mode === "wave") {
        for (const enemy of state.enemies) {
          if (!enemy.alive) continue;
          if (distanceSq(bullet, enemy) < (bullet.radius + enemy.radius) ** 2) {
            enemy.hp -= bullet.damage;
            dead = true;
            burst(bullet.x, bullet.y, "#62eee7", 3);
            if (enemy.hp <= 0) destroyEnemy(enemy);
            break;
          }
        }
      }
      if (!dead && state.mode === "boss" && state.boss && distanceSq(bullet, state.boss) < (bullet.radius + state.boss.radius) ** 2) {
        state.boss.hp -= bullet.damage;
        state.score += 8;
        dead = true;
        burst(bullet.x, bullet.y, "#f8d68e", 2);
        ui.bossHealth.style.width = `${Math.max(0, (state.boss.hp / state.boss.maxHp) * 100)}%`;
        if (state.boss.hp <= 0) finishPhase();
      }
      if (dead) removeSwap(state.bullets, index);
    }
  }

  function updateEnemyBullets(dt) {
    const player = state.player;
    for (let index = state.enemyBullets.length - 1; index >= 0; index -= 1) {
      const bullet = state.enemyBullets[index];
      bullet.age += dt;
      if (bullet.wobble) {
        const speed = Math.hypot(bullet.vx, bullet.vy);
        const angle = Math.atan2(bullet.vy, bullet.vx) + Math.sin(bullet.age * 5) * bullet.wobble * dt;
        bullet.vx = Math.cos(angle) * speed;
        bullet.vy = Math.sin(angle) * speed;
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      let dead = bullet.x < -55 || bullet.x > width + 55 || bullet.y < -75 || bullet.y > height + 75;
      if (!dead && player.invulnerable <= 0 && distanceSq(bullet, player) < (bullet.radius + player.radius) ** 2) {
        dead = true;
        damagePlayer();
      }
      if (dead) removeSwap(state.enemyBullets, index);
    }
  }

  function updatePowerups(dt) {
    for (let index = state.powerups.length - 1; index >= 0; index -= 1) {
      const item = state.powerups[index];
      item.y += 78 * dt;
      item.angle += dt * 3;
      if (distanceSq(item, state.player) < (item.radius + state.player.radius) ** 2) {
        state.player.power = Math.min(3, state.player.power + 1);
        state.score += 1000;
        burst(item.x, item.y, "#f6d58a", 18);
        removeSwap(state.powerups, index);
        syncHud();
      } else if (item.y > height + 30) {
        removeSwap(state.powerups, index);
      }
    }
  }

  function updateParticles(dt) {
    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const particle = state.particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        removeSwap(state.particles, index);
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.975;
      particle.vy *= 0.975;
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

  function destroyEnemy(enemy) {
    enemy.alive = false;
    state.kills += 1;
    state.score += 500;
    if (state.kills === 1 || state.kills === 7) {
      state.powerups.push({ x: enemy.x, y: enemy.y, radius: 13, angle: 0 });
    }
    burst(enemy.x, enemy.y, "#8cffbd", 12);
    sound.down();
    syncHud();
  }

  function damagePlayer() {
    const player = state.player;
    if (!player || player.invulnerable > 0) return;
    player.invulnerable = 2.4;
    state.lives -= 1;
    state.shake = 0.4;
    state.flash = 0.2;
    for (let index = state.enemyBullets.length - 1; index >= 0; index -= 1) {
      if (distanceSq(state.enemyBullets[index], player) < 130 ** 2) removeSwap(state.enemyBullets, index);
    }
    burst(player.x, player.y, "#ffb052", 20);
    sound.hurt();
    syncHud();
    if (state.lives <= 0) showEndCard(false);
  }

  function burst(x, y, color, count) {
    count = reducedMotion ? Math.min(count, 5) : count;
    const available = LIMITS.particles - state.particles.length;
    for (let index = 0; index < Math.min(count, available); index += 1) {
      const angle = Math.random() * TAU;
      const speed = random(35, 180);
      const life = random(0.25, 0.72);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: random(1.5, 4),
        life,
        maxLife: life,
        color,
      });
    }
  }

  function formatScore(score) {
    return Math.max(0, Math.round(score)).toString().padStart(6, "0");
  }

  function syncHud() {
    ui.lives.textContent = state.lives;
    ui.score.textContent = formatScore(state.score);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (state.shake > 0 && !reducedMotion) {
      const strength = state.shake * 10;
      ctx.translate(random(-strength, strength), random(-strength, strength));
    }
    if (backgroundCache) ctx.drawImage(backgroundCache, 0, 0, width, height);
    else {
      ctx.fillStyle = "#07111d";
      ctx.fillRect(0, 0, width, height);
    }
    drawEnemies();
    if (state.boss) drawBoss();
    drawPowerups();
    drawBullets();
    if (state.player && !["endCard", "gameover"].includes(state.mode)) drawPlayer();
    if (state.mode === "ending") drawEndingKaga();
    drawParticles();
    drawSnow();
    ctx.restore();
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 235, 210, ${Math.min(0.58, state.flash)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const size = enemy.radius * 2.75;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.sin(enemy.bob * 1.7) * 0.035);
      ctx.drawImage(assets.enemies[enemy.frame], -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  function bossImage() {
    if (!state.boss) return null;
    if (state.boss.form === "morph") return assets.morph[state.boss.frame] || assets.morph[0];
    if (state.boss.form === "fox") return assets.fox[state.boss.frame % assets.fox.length];
    return assets.human[state.boss.frame % assets.human.length];
  }

  function drawBoss() {
    const boss = state.boss;
    const image = bossImage();
    if (!image || boss.alpha <= 0) return;
    const desiredHeight = boss.form === "fox"
      ? (width < 560 ? 165 : 220)
      : (width < 560 ? 145 : 190);
    const ratio = image.width / image.height;
    const drawWidth = desiredHeight * ratio;
    const auraSize = desiredHeight * 1.45;
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.globalAlpha = boss.alpha * 0.24;
    ctx.drawImage(assets.spell, -auraSize / 2, -auraSize / 2, auraSize, auraSize);
    ctx.globalAlpha = boss.alpha;
    ctx.drawImage(image, -drawWidth / 2, -desiredHeight / 2, drawWidth, desiredHeight);
    ctx.restore();
  }

  function drawPlayer() {
    const player = state.player;
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) return;
    const size = width < 560 ? 76 : 90;
    ctx.drawImage(assets.players[player.frame], player.x - size / 2, player.y - size / 2, size, size);
    ctx.fillStyle = "#8ff8f2";
    ctx.beginPath();
    ctx.arc(player.x, player.y, 2.8, 0, TAU);
    ctx.fill();
  }

  function drawBullets() {
    for (const bullet of state.bullets) {
      const size = 18;
      ctx.drawImage(assets.playerShot, bullet.x - size / 2, bullet.y - size / 2, size, size);
    }
    for (const bullet of state.enemyBullets) {
      const size = bullet.radius * 3.05;
      ctx.drawImage(assets.enemyShots[bullet.type], bullet.x - size / 2, bullet.y - size / 2, size, size);
    }
  }

  function drawPowerups() {
    for (const item of state.powerups) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.angle);
      ctx.fillStyle = "rgba(246, 213, 138, 0.22)";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#f6d58a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 8);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEndingKaga() {
    const image = assets.kagaFull;
    const drawHeight = Math.min(height * 0.48, width < 560 ? 330 : 450);
    const drawWidth = drawHeight * (image.width / image.height);
    ctx.globalAlpha = clamp(state.modeClock / 0.5, 0, 0.82);
    ctx.drawImage(image, width * 0.06, height - drawHeight, drawWidth, drawHeight);
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (const particle of state.particles) {
      ctx.globalAlpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSnow() {
    ctx.fillStyle = "#d8edff";
    for (const flake of state.snow) {
      ctx.globalAlpha = flake.alpha;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (state.mode === "ready") {
      beginGame();
      return;
    }
    if (!["wave", "boss"].includes(state.mode)) return;
    const point = pointerPosition(event);
    pointer.active = true;
    pointer.x = point.x;
    pointer.y = point.y;
    canvas.setPointerCapture?.(event.pointerId);
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
    else if ((event.code === "Space" || event.code === "Enter") && state.mode === "dialogue") advanceDialogue();
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));
  window.addEventListener("resize", resize);

  ui.start.addEventListener("click", beginGame);
  ui.storyNext.addEventListener("click", advanceDialogue);
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

  function recordFrame(milliseconds) {
    state.frameSamples.push(milliseconds);
    if (state.frameSamples.length > 600) state.frameSamples.shift();
  }

  function metrics() {
    const samples = state.frameSamples.slice().sort((a, b) => a - b);
    const average = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
    return {
      mode: state.mode,
      phase: state.phaseIndex + 1,
      frames: samples.length,
      avgMs: Number(average.toFixed(2)),
      p95Ms: Number((samples[Math.floor(samples.length * 0.95)] || 0).toFixed(2)),
      maxMs: Number((samples[samples.length - 1] || 0).toFixed(2)),
      approxFps: average ? Number((1000 / average).toFixed(1)) : 0,
      playerBullets: state.bullets.length,
      enemyBullets: state.enemyBullets.length,
      particles: state.particles.length,
      enemies: state.enemies.filter((enemy) => enemy.alive).length,
    };
  }

  function loop(now) {
    const rawMilliseconds = now - lastTime || 16.67;
    const dt = Math.min(0.034, rawMilliseconds / 1000);
    lastTime = now;
    recordFrame(rawMilliseconds);
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
      lastTime = performance.now();
      requestAnimationFrame(loop);
    } catch (error) {
      ui.loading.querySelector("p").textContent = "KHÔNG THỂ TẢI TÀI NGUYÊN";
      console.error(error);
    }
  }

  window.__GAME__ = {
    state,
    begin: beginGame,
    metrics,
    skipWave() {
      state.enemies.forEach((enemy) => { enemy.alive = false; });
      state.clearClock = 0.51;
    },
    skipDialogue() {
      if (!state.dialogue) return;
      state.dialogue.index = state.dialogue.lines.length - 1;
      advanceDialogue();
    },
    setPhase(index) {
      const normalized = clamp(Number(index), 0, PHASES.length - 1);
      if (!state.player) return;
      ui.startPanel.hidden = true;
      ui.resultPanel.hidden = true;
      ui.story.hidden = true;
      startPhase(normalized);
    },
    finishPhase,
  };

  boot();
})();
