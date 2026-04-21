(function () {
  const {
    Engine,
    Render,
    Runner,
    World,
    Bodies,
    Body,
    Constraint,
    Vector,
    Events,
    Query
  } = Matter;

  const LEVELS = window.SAVE_THE_DOGE_LEVELS || [];
  if (!LEVELS.length) {
    throw new Error("SAVE_THE_DOGE_LEVELS 未加载");
  }
  const BACKGROUNDS = window.SAVE_THE_DOGE_BACKGROUNDS || {};

  const DOG_TEXTURE = "./assets/dog-cartoon.svg";
  const BEE_TEXTURE = "./assets/bee-cartoon.svg";
  const BG_POOLS = {
    themes: Array.isArray(BACKGROUNDS.themes) ? BACKGROUNDS.themes : [],
    skyDecors: Array.isArray(BACKGROUNDS.skyDecors) ? BACKGROUNDS.skyDecors : [],
    groundDecors: Array.isArray(BACKGROUNDS.groundDecors) ? BACKGROUNDS.groundDecors : []
  };
  const BEE_ROLES = ["attacker", "flanker", "breaker"];
  const RESIZE_DEBOUNCE_MS = 180;
  const PORTRAIT_TOP_BUDGET = 36;
  const PORTRAIT_GAP_BUDGET = 8;
  const PORTRAIT_BOTTOM_ACTION_BUDGET = 84;
  const MIN_BUDGET_REFERENCE_WIDTH = 760;
  const GROUND_SPOT_FALLBACKS = [
    { pos: "14% 88%", size: "11.2% 5.1%", alpha: 0.42 },
    { pos: "36% 86%", size: "13.4% 5.9%", alpha: 0.4 },
    { pos: "64% 88%", size: "12.1% 5.6%", alpha: 0.4 },
    { pos: "86% 90%", size: "10.4% 4.8%", alpha: 0.36 }
  ];
  const BEE_TUNING = {
    orbitRadiusMin: 36,
    orbitRadiusScale: 3.4,
    orbitSpeed: 1.3,
    orbitOffsetStep: 0.85,
    orbitYFrequency: 1.08,
    orbitYScale: 0.7,
    targetPaddingX: 10,
    targetPaddingTop: 10,
    targetBottomOffset: 60,
    minChaseDistance: 0.001,
    wobbleFreqStep: 0.9,
    wobbleScale: 0.42,
    roleSpeedScale: { attacker: 1.08, flanker: 0.94, breaker: 1.3 },
    forceScale: 1.28,
    separationDistanceSq: 2300,
    separationForceScale: 0.18,
    wobbleYRatio: 0.35,
    maxSpeedByRole: { attacker: 7, flanker: 7, breaker: 7.8 },
    roleSwitchCheckMs: 760,
    roleSwitchCheckJitterMs: 280,
    roleSwitchBaseChance: 0.2,
    roleSwitchNearDogBonus: 0.14,
    roleSwitchLockMs: 2000,
    breakerWeightBase: 0.74,
    flankerNearDogWeightBonus: 0.45,
    respawnTopMin: 8,
    respawnTopMax: 42,
    respawnOffscreenGraceMs: 500,
    respawnOffscreenChance: 0.08,
    collabIntervalMinMs: 7000,
    collabIntervalMaxMs: 9000,
    collabDurationMinMs: 2000,
    collabDurationMaxMs: 3000,
    collabForceScale: 0.65,
    spatialCellSize: 48,
    avoidLookaheadBase: 44,
    avoidLookaheadSpeedScale: 9.5,
    avoidSideProbeAngle: 0.68,
    avoidForceScale: 1.65,
    avoidAwayScale: 0.9,
    stuckSpeedThreshold: 0.42,
    stuckDetectMs: 420,
    stuckBoostScale: 0.85,
    exitMinSpeed: 2.4,
    exitCruiseSpeed: 5.4,
    exitAccel: 0.16,
    exitOffscreenMargin: 80
  };
  const HIT_EFFECT = {
    durationMs: 720,
    auraScale: 2.3
  };
  const _spatialGrid = new Map();

  function gridKey(gx, gy) { return gx * 1000 + gy; }

  const OBSTACLE_THEMES = [
    { base: "#8ea989", stroke: "#6f8f6b", cap: "#afd28f", capStroke: "rgba(71,125,65,.55)", shade: "rgba(56,95,53,.2)" },
    { base: "#959da6", stroke: "#707984", cap: "#bbc4ce", capStroke: "rgba(96,108,122,.55)", shade: "rgba(61,73,86,.2)" },
    { base: "#b48763", stroke: "#8f6648", cap: "#d0a07b", capStroke: "rgba(125,86,60,.58)", shade: "rgba(84,55,36,.2)" },
    { base: "#b78bc8", stroke: "#8f6a9f", cap: "#dfb7ee", capStroke: "rgba(125,96,142,.56)", shade: "rgba(84,52,97,.2)" }
  ];

  const state = {
    viewport: {
      width: 900,
      height: 560
    },
    background: {
      themeIndex: -1,
      skyIndex: -1,
      groundIndex: -1
    },
    level: {
      currentIndex: 0,
      phase: "idle",
      startTs: 0,
      remainingMs: 0,
      beeDelayMs: 0,
      endRemainingMs: 0,
      floorY: 9999,
      collabActive: false,
      collabDir: 0,
      collabEndTs: 0,
      collabNextStartTs: 0,
      beeRetreatActive: false
    },
    ink: {
      remaining: 0,
      total: 0,
      strokesUsed: 0,
      currentStrokeLen: 0,
      strokeBudgetHit: false
    },
    combat: {
      drawBodies: [],
      pathBlocks: [],
      bees: [],
      beesReleased: false,
      dog: null
    },
    input: {
      isPointerDown: false,
      pointerPath: [],
      pointerId: null
    },
    fx: {
      dogHitFlashUntil: 0,
      dogHitPersistent: false
    }
  };
  const viewport = state.viewport;
  const backgroundState = state.background;
  const levelState = state.level;
  const inkState = state.ink;
  const combatState = state.combat;
  const inputState = state.input;
  const fxState = state.fx;

  // Cached per-stroke to avoid getBoundingClientRect on every pointermove.
  let canvasRect = null;

  const ui = {
    canvasWrap: document.getElementById("canvasWrap"),
    bgDecor: document.querySelector("#canvasWrap .bg-decor"),
    canvas: document.getElementById("gameCanvas"),
    levelText: document.getElementById("levelText"),
    timeText: document.getElementById("timeText"),
    inkBarWrap: document.getElementById("inkBarWrap"),
    inkFill: document.getElementById("inkFill"),
    statusText: document.getElementById("statusText"),
    restartBtn: document.getElementById("restartBtn"),
    nextBtn: document.getElementById("nextBtn")
  };

  const engine = Engine.create({ gravity: { x: 0, y: 0.28 } });
  const render = Render.create({
    canvas: ui.canvas,
    engine,
    options: {
      width: viewport.width,
      height: viewport.height,
      wireframes: false,
      background: "transparent",
      pixelRatio: 1
    }
  });
  const runner = Runner.create();

  function computeGameSize() {
    const wrapWidth = Math.max(320, Math.min(960, ui.canvasWrap.clientWidth));
    const width = Math.round(wrapWidth);
    const landscapeHeight = Math.round(Math.max(480, Math.min(780, wrapWidth * 0.72)));
    const viewHeight = window.visualViewport?.height || window.innerHeight || 0;
    const viewWidth = window.visualViewport?.width || window.innerWidth || width;
    const isPortrait = viewHeight > viewWidth;
    if (!isPortrait) {
      return { width, height: landscapeHeight };
    }

    const budget = PORTRAIT_TOP_BUDGET + PORTRAIT_GAP_BUDGET + PORTRAIT_BOTTOM_ACTION_BUDGET;
    const portraitHeight = Math.round(viewHeight - budget);
    const height = Math.max(360, Math.min(860, portraitHeight));
    return { width, height };
  }

  function setStatus(text, kind) {
    ui.statusText.textContent = text;
    ui.statusText.classList.remove("status-ok", "status-danger");
    if (kind === "ok") ui.statusText.classList.add("status-ok");
    if (kind === "danger") ui.statusText.classList.add("status-danger");
  }

  function asX(rate) { return rate * viewport.width; }
  function asY(rate) { return rate * viewport.height; }

  function computeMobileScale(width) {
    const minW = 360;
    const maxW = 720;
    const t = Math.max(0, Math.min(1, (maxW - width) / (maxW - minW)));
    return {
      dogScale: 1 - 0.14 * t,
      obstacleWidthScale: 1 + 0.15 * t
    };
  }

  function resetPointerState() {
    inputState.isPointerDown = false;
    inputState.pointerPath = [];
    inputState.pointerId = null;
    inkState.currentStrokeLen = 0;
    inkState.strokeBudgetHit = false;
  }

  function clearWorld() {
    World.clear(engine.world, false);
    combatState.drawBodies = [];
    combatState.pathBlocks = [];
    combatState.bees = [];
    combatState.beesReleased = false;
    combatState.dog = null;
  }

  function createBounds() {
    const t = 40;
    const wallStyle = { fillStyle: "#cfd8cc" };
    const top = Bodies.rectangle(viewport.width / 2, -t / 2, viewport.width + t * 2, t, {
      isStatic: true, render: wallStyle, label: "bound"
    });
    const left = Bodies.rectangle(-t / 2, viewport.height / 2, t, viewport.height + t * 2, {
      isStatic: true, render: wallStyle, label: "bound"
    });
    const right = Bodies.rectangle(viewport.width + t / 2, viewport.height / 2, t, viewport.height + t * 2, {
      isStatic: true, render: wallStyle, label: "bound"
    });
    const bounds = [top, left, right];
    World.add(engine.world, bounds);
    return bounds;
  }

  function createObstacle(ob) {
    if (ob.type !== "rect") return null;
    const mobileScale = computeMobileScale(viewport.width);
    const width = asX(ob.w) * mobileScale.obstacleWidthScale;
    const height = asY(ob.h);
    const x = asX(ob.x);
    const y = asY(ob.y);
    const tone = OBSTACLE_THEMES[Math.floor(Math.random() * OBSTACLE_THEMES.length)];
    const chamferRadius = Math.max(4, Math.min(14, Math.min(width, height) * 0.14));
    const capHeight = Math.max(6, Math.min(14, height * 0.18));
    const shadeHeight = Math.max(5, Math.min(12, height * 0.22));

    const base = Bodies.rectangle(x, y, width, height, {
      isStatic: true,
      label: "obstacle",
      friction: 0.6,
      restitution: 0.05,
      chamfer: { radius: chamferRadius },
      render: {
        fillStyle: tone.base,
        strokeStyle: tone.stroke,
        lineWidth: 2
      }
    });

    const cap = Bodies.rectangle(x, y - height / 2 + capHeight / 2, Math.max(8, width - 6), capHeight, {
      isStatic: true,
      isSensor: true,
      label: "obstacle-decor",
      collisionFilter: { mask: 0 },
      chamfer: { radius: Math.max(3, capHeight * 0.45) },
      render: {
        fillStyle: tone.cap,
        strokeStyle: tone.capStroke,
        lineWidth: 1
      }
    });

    const shade = Bodies.rectangle(x, y + height * 0.22, Math.max(8, width - 10), shadeHeight, {
      isStatic: true,
      isSensor: true,
      label: "obstacle-decor",
      collisionFilter: { mask: 0 },
      chamfer: { radius: Math.max(2, shadeHeight * 0.4) },
      render: {
        fillStyle: tone.shade
      }
    });

    return [base, cap, shade];
  }

  function createDog(config) {
    const mobileScale = computeMobileScale(viewport.width);
    const dogRadius = config.r * mobileScale.dogScale;
    const dog = Bodies.circle(asX(config.x), asY(config.y), dogRadius, {
      label: "dog",
      restitution: 0.05,
      friction: 0.8,
      frictionAir: 0.02,
      density: 0.002,
      render: {
        fillStyle: "transparent",
        sprite: {
          texture: DOG_TEXTURE,
          xScale: (dogRadius * 2.5) / 96,
          yScale: (dogRadius * 2.5) / 96
        }
      }
    });
    Body.setStatic(dog, true);
    return dog;
  }

  function createBee(x, y, speed, role) {
    const bee = Bodies.circle(asX(x), asY(y), 10, {
      label: "bee",
      friction: 0.01,
      frictionAir: 0.012,
      restitution: 0.9,
      density: 0.0015,
      render: {
        fillStyle: "transparent",
        sprite: {
          texture: BEE_TEXTURE,
          xScale: 0.42,
          yScale: 0.42
        }
      }
    });
    bee.plugin.chaseSpeed = speed;
    bee.plugin.wobbleSeed = Math.random() * Math.PI * 2;
    bee.plugin.role = role;
    bee.plugin.nextRoleCheckTs = 0;
    bee.plugin.roleLockUntilTs = 0;
    bee.plugin.offscreenSinceTs = 0;
    bee.plugin.stuckSinceTs = 0;
    bee.plugin.detourDir = Math.random() < 0.5 ? -1 : 1;
    bee.plugin.exitDir = null;
    bee.plugin.exitSpeed = 0;
    Body.setStatic(bee, true);
    return bee;
  }

  function createBees(level) {
    const allHives = [level.hive].concat(level.extraHives || []);
    const bees = [];
    let idx = 0;

    allHives.forEach((hive) => {
      for (let i = 0; i < hive.beeCount; i += 1) {
        const role = BEE_ROLES[idx % BEE_ROLES.length];
        const bee = createBee(
          hive.x + (Math.random() - 0.5) * 0.02,
          hive.y + (Math.random() - 0.5) * 0.02,
          hive.beeSpeed,
          role
        );
        bees.push(bee);
        idx += 1;
      }
    });

    return bees;
  }

  function resetInk(level) {
    // Use a stable baseline so narrow viewports are still playable.
    const referenceWidth = Math.max(viewport.width, MIN_BUDGET_REFERENCE_WIDTH);
    inkState.total = level.inkBudget * referenceWidth;
    inkState.remaining = inkState.total;
    inkState.strokesUsed = 0;
    inkState.currentStrokeLen = 0;
    inkState.strokeBudgetHit = false;
  }

  function pickIndexNoRepeat(pool, lastIndex) {
    if (!pool.length) return -1;
    let nextIndex = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && nextIndex === lastIndex) {
      nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    }
    return nextIndex;
  }

  function pickBackgroundCombo() {
    backgroundState.themeIndex  = pickIndexNoRepeat(BG_POOLS.themes,        backgroundState.themeIndex);
    backgroundState.skyIndex    = pickIndexNoRepeat(BG_POOLS.skyDecors,     backgroundState.skyIndex);
    backgroundState.groundIndex = pickIndexNoRepeat(BG_POOLS.groundDecors,  backgroundState.groundIndex);

    return {
      theme:  BG_POOLS.themes[backgroundState.themeIndex]        || null,
      sky:    BG_POOLS.skyDecors[backgroundState.skyIndex]       || null,
      ground: BG_POOLS.groundDecors[backgroundState.groundIndex] || null
    };
  }

  function setWrapVar(name, value) {
    if (!ui.canvasWrap || typeof value !== "string" || !value.trim()) return;
    ui.canvasWrap.style.setProperty(name, value);
  }

  function asPercent(value, fallback) {
    if (typeof value === "number" && Number.isFinite(value)) return `${value.toFixed(2)}%`;
    if (typeof value === "string" && value.trim()) return value;
    return fallback;
  }

  function asNumber(value, fallback) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    return fallback;
  }

  function applyTheme(theme) {
    if (!theme) return;

    const bgLayers = Array.isArray(theme.bgLayers) ? theme.bgLayers : [];
    const sunLayers = Array.isArray(theme.sunLayers) ? theme.sunLayers : [];
    bgLayers.slice(0, 4).forEach((layer, idx) => setWrapVar(`--bg-layer-${idx + 1}`, layer));
    sunLayers.slice(0, 6).forEach((layer, idx) => setWrapVar(`--sun-layer-${idx + 1}`, layer));
  }

  function syncDecorElements(className, count) {
    if (!ui.bgDecor) return [];
    const safeCount = Math.max(0, Number.isFinite(count) ? Math.floor(count) : 0);
    const selector = `.${className}`;
    const current = Array.from(ui.bgDecor.querySelectorAll(selector));

    if (current.length > safeCount) {
      current.slice(safeCount).forEach((el) => el.remove());
    } else if (current.length < safeCount) {
      for (let i = current.length; i < safeCount; i += 1) {
        const node = document.createElement("span");
        node.className = className;
        ui.bgDecor.appendChild(node);
      }
    }

    return Array.from(ui.bgDecor.querySelectorAll(selector));
  }

  function applyDecorElements(className, configList, verticalKey) {
    const isTopAxis = verticalKey === "top";
    const source = Array.isArray(configList) ? configList : [];
    const elements = syncDecorElements(className, source.length);
    if (!elements.length) return;
    const fallbackVertical = isTopAxis ? "16%" : "10%";

    elements.forEach((el, idx) => {
      const cfg = source[idx];

      const left = asPercent(cfg.left, "50%");
      const verticalPos = asPercent(cfg[verticalKey], fallbackVertical);
      const scale = asNumber(cfg.scale, 1);
      const rotate = asNumber(cfg.rotate, 0);
      const opacity = asNumber(cfg.opacity, 0.88);

      el.style.left = left;
      el.style.right = "auto";
      el.style[verticalKey] = verticalPos;
      el.style[isTopAxis ? "bottom" : "top"] = "auto";
      el.style.transform = `scale(${scale.toFixed(2)}) rotate(${rotate.toFixed(1)}deg)`;
      el.style.opacity = `${opacity.toFixed(2)}`;
    });
  }

  function applyGroundSpots(spots) {
    const source = Array.isArray(spots) && spots.length ? spots : GROUND_SPOT_FALLBACKS;

    for (let i = 0; i < 4; i += 1) {
      const fb = GROUND_SPOT_FALLBACKS[i];
      const cfg = source[i] || fb;
      setWrapVar(`--ground-spot-${i + 1}-pos`, (typeof cfg.pos === "string" && cfg.pos.trim()) ? cfg.pos : fb.pos);
      setWrapVar(`--ground-spot-${i + 1}-size`, (typeof cfg.size === "string" && cfg.size.trim()) ? cfg.size : fb.size);
      setWrapVar(`--ground-spot-${i + 1}-alpha`, `${asNumber(cfg.alpha, fb.alpha)}`);
    }
  }

  function applyBackgroundCombo(combo) {
    if (!ui.canvasWrap || !ui.bgDecor) return;

    applyTheme(combo.theme);
    applyDecorElements("cloud", combo.sky && combo.sky.clouds, "top");
    applyDecorElements("bird", combo.sky && combo.sky.birds, "top");
    applyDecorElements("flower", combo.ground && combo.ground.flowers, "bottom");
    applyDecorElements("sprout", combo.ground && combo.ground.sprouts, "bottom");
    applyDecorElements("pebble", combo.ground && combo.ground.pebbles, "bottom");
    applyGroundSpots(combo.ground && combo.ground.spots);
  }

  function loadLevel(index) {
    const safeIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    const level = LEVELS[safeIndex];

    levelState.currentIndex = safeIndex;
    clearWorld();
    const bounds = createBounds();

    const obstacles = (level.obstacles || []).flatMap((ob) => createObstacle(ob) || []);
    if (obstacles.length) World.add(engine.world, obstacles);
    combatState.pathBlocks = bounds.concat(obstacles.filter((body) => body.label === "obstacle"));

    combatState.dog = createDog(level.dog);
    combatState.bees = createBees(level);
    World.add(engine.world, [combatState.dog].concat(combatState.bees));

    levelState.floorY = asY((level.bounds && level.bounds.floorY) || 1.08);
    levelState.beeDelayMs = (typeof level.beeDelaySec === "number" ? level.beeDelaySec : 1.2) * 1000;
    levelState.startTs = performance.now();
    levelState.remainingMs = level.timeLimitSec * 1000;
    levelState.phase = "running";
    cancelCollab();
    levelState.collabNextStartTs = 0;
    levelState.beeRetreatActive = false;
    fxState.dogHitFlashUntil = 0;
    fxState.dogHitPersistent = false;
    resetInk(level);
    applyBackgroundCombo(pickBackgroundCombo());
    resetPointerState();
    ui.levelText.textContent = `${safeIndex + 1} / ${LEVELS.length}`;

    updateHud();
    setStatus("进行中", "");
  }

  function restartLevel() { loadLevel(levelState.currentIndex); }

  function nextLevel() {
    loadLevel(levelState.currentIndex >= LEVELS.length - 1 ? 0 : levelState.currentIndex + 1);
  }


  function isDrawPhaseActive() {
    if (levelState.phase !== "running") return false;
    return performance.now() - levelState.startTs < levelState.beeDelayMs;
  }

  function toCanvasPoint(ev) {
    const rect = canvasRect;
    const x = ((ev.clientX - rect.left) / rect.width) * viewport.width;
    const y = ((ev.clientY - rect.top) / rect.height) * viewport.height;
    return {
      x: Math.max(0, Math.min(viewport.width, x)),
      y: Math.max(0, Math.min(viewport.height, y))
    };
  }

  function buildLineBodies(path) {
    const particleRadius = 6;
    const sampleGap = 16;
    const points = [path[0]];
    let carry = 0;

    for (let i = 1; i < path.length; i += 1) {
      const a = path[i - 1];
      const b = path[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen < 0.001) continue;
      const ux = dx / segLen;
      const uy = dy / segLen;
      let dist = sampleGap - carry;

      while (dist <= segLen) {
        points.push({ x: a.x + ux * dist, y: a.y + uy * dist });
        dist += sampleGap;
      }
      carry = Math.max(0, segLen - (dist - sampleGap));
    }

    points.push(path[path.length - 1]);

    const bodies = points.map((p) =>
      Bodies.circle(p.x, p.y, particleRadius, {
        isStatic: false,
        label: "drawn",
        density: 0.016,
        friction: 0.85,
        frictionAir: 0.018,
        restitution: 0.05,
        render: { fillStyle: "#435a49" }
      })
    );

    const constraints = [];
    for (let i = 1; i < bodies.length; i += 1) {
      const a = bodies[i - 1];
      const b = bodies[i];
      constraints.push(
        Constraint.create({
          bodyA: a,
          bodyB: b,
          length: Vector.magnitude(Vector.sub(a.position, b.position)),
          stiffness: 0.9,
          damping: 0.12,
          render: { visible: false }
        })
      );
    }

    // Bend constraints (i -> i+2) reduce folding and preserve local curvature.
    for (let i = 2; i < bodies.length; i += 1) {
      const a = bodies[i - 2];
      const b = bodies[i];
      constraints.push(
        Constraint.create({
          bodyA: a,
          bodyB: b,
          length: Vector.magnitude(Vector.sub(a.position, b.position)),
          stiffness: 0.45,
          damping: 0.1,
          render: { visible: false }
        })
      );
    }

    return { bodies, constraints };
  }

  function finalizePath() {
    if (!inputState.isPointerDown || levelState.phase !== "running") {
      resetPointerState();
      return;
    }

    const level = LEVELS[levelState.currentIndex];
    if (inkState.strokesUsed >= level.strokeLimit) {
      setStatus("画线次数已用完", "danger");
      resetPointerState();
      return;
    }

    const path = inputState.pointerPath;
    if (path.length > 1 && inkState.currentStrokeLen > 2) {
      const line = buildLineBodies(path);
      if (line.bodies.length) {
        if (isDrawPhaseActive()) {
          line.bodies.forEach((b) => Body.setStatic(b, true));
        }
        World.add(engine.world, line.bodies.concat(line.constraints));
        combatState.drawBodies.push(...line.bodies);
        combatState.pathBlocks.push(...line.bodies);
        inkState.remaining = Math.max(0, inkState.remaining - inkState.currentStrokeLen);
        inkState.strokesUsed += 1;
      }
    }

    resetPointerState();
    updateHud();
  }

  function onPointerDown(ev) {
    if (levelState.phase !== "running") return;
    if (!isDrawPhaseActive()) {
      setStatus("防线已锁定，无法继续画线", "danger");
      return;
    }
    if (inputState.isPointerDown) return;

    const level = LEVELS[levelState.currentIndex];
    if (inkState.strokesUsed >= level.strokeLimit || inkState.remaining <= 0) {
      setStatus("无法继续画线", "danger");
      return;
    }

    canvasRect = ui.canvas.getBoundingClientRect();
    if (ui.inkBarWrap) {
      const chips = ui.inkBarWrap.previousElementSibling;
      if (chips) ui.inkBarWrap.style.width = chips.offsetWidth + "px";
    }
    inputState.isPointerDown = true;
    inputState.pointerId = ev.pointerId;
    inputState.pointerPath = [toCanvasPoint(ev)];

    try { ui.canvas.setPointerCapture(ev.pointerId); } catch (_) {}

    ev.preventDefault();
  }

  function onPointerMove(ev) {
    if (!inputState.isPointerDown || ev.pointerId !== inputState.pointerId) return;
    if (!isDrawPhaseActive()) {
      finalizePath();
      return;
    }

    const p = toCanvasPoint(ev);
    const last = inputState.pointerPath[inputState.pointerPath.length - 1];
    if (!last) { ev.preventDefault(); return; }
    const segLen = Math.hypot(p.x - last.x, p.y - last.y);
    if (segLen < 5) { ev.preventDefault(); return; }

    if (inkState.currentStrokeLen + segLen > inkState.remaining) {
      inkState.strokeBudgetHit = true;
    } else {
      inputState.pointerPath.push(p);
      inkState.currentStrokeLen += segLen;
    }

    ev.preventDefault();
  }

  function onPointerUp(ev) {
    if (inputState.pointerId !== ev.pointerId) return;
    finalizePath();
    ev.preventDefault();
  }

  function onPointerCancel(ev) {
    if (inputState.pointerId === ev.pointerId) resetPointerState();
    ev.preventDefault();
  }

  function endLevel(result) {
    if (levelState.phase !== "running") return;
    levelState.endRemainingMs = levelState.remainingMs;
    levelState.phase = result;
    if (result === "lose") startBeeRetreat();
    setStatus(result === "win" ? "恭喜过关" : "再来一次", result === "win" ? "ok" : "");
  }

  function triggerDogHitEffect() {
    fxState.dogHitFlashUntil = performance.now() + HIT_EFFECT.durationMs;
    fxState.dogHitPersistent = true;
  }

  function holdBeesBeforeRelease() {
    combatState.bees.forEach((bee) => {
      if (!bee.isStatic) Body.setStatic(bee, true);
      if (Math.hypot(bee.velocity.x, bee.velocity.y) > 0.001) {
        Body.setVelocity(bee, { x: 0, y: 0 });
      }
    });
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function cancelCollab() {
    levelState.collabActive = false;
    levelState.collabDir = 0;
    levelState.collabEndTs = 0;
  }

  function scheduleNextCollab(nowTs) {
    levelState.collabNextStartTs = nowTs + randomRange(
      BEE_TUNING.collabIntervalMinMs,
      BEE_TUNING.collabIntervalMaxMs
    );
  }

  function startCollab(nowTs) {
    levelState.collabActive = true;
    levelState.collabDir = Math.random() < 0.5 ? -1 : 1;
    levelState.collabEndTs = nowTs + randomRange(
      BEE_TUNING.collabDurationMinMs,
      BEE_TUNING.collabDurationMaxMs
    );
  }

  function updateCollabState(nowTs) {
    if (!combatState.beesReleased) return;

    if (levelState.collabActive) {
      if (nowTs >= levelState.collabEndTs) {
        cancelCollab();
        scheduleNextCollab(nowTs);
      }
      return;
    }

    if (!levelState.collabNextStartTs) {
      scheduleNextCollab(nowTs);
      return;
    }

    if (nowTs >= levelState.collabNextStartTs) {
      startCollab(nowTs);
      levelState.collabNextStartTs = 0;
    }
  }

  function releaseAfterBuildPhase(nowTs) {
    if (combatState.beesReleased) return;
    Body.setStatic(combatState.dog, false);
    combatState.bees.forEach((bee) => Body.setStatic(bee, false));
    combatState.drawBodies.forEach((b) => { if (b.isStatic) Body.setStatic(b, false); });
    combatState.beesReleased = true;
    cancelCollab();
    scheduleNextCollab(typeof nowTs === "number" ? nowTs : performance.now());
  }

  function findNearestDrawTarget(bee, drawTargets) {
    let minDist = Infinity;
    let nearest = null;
    for (let i = 0; i < drawTargets.length; i += 1) {
      const d2 = Vector.magnitudeSquared(Vector.sub(drawTargets[i].position, bee.position));
      if (d2 < minDist) {
        minDist = d2;
        nearest = drawTargets[i];
      }
    }
    return nearest ? nearest.position : null;
  }

  function chooseBeeTarget(bee, role, idx, now, dogPos, drawTargets) {
    if (role === "flanker") {
      const orbitR = Math.max(BEE_TUNING.orbitRadiusMin, combatState.dog.circleRadius * BEE_TUNING.orbitRadiusScale);
      const orbitA = now * BEE_TUNING.orbitSpeed + idx * BEE_TUNING.orbitOffsetStep;
      return {
        x: dogPos.x + Math.cos(orbitA) * orbitR,
        y: dogPos.y + Math.sin(orbitA * BEE_TUNING.orbitYFrequency) * orbitR * BEE_TUNING.orbitYScale
      };
    }
    if (role === "breaker" && drawTargets.length > 0) {
      const nearest = findNearestDrawTarget(bee, drawTargets);
      if (nearest) return nearest;
    }
    return dogPos;
  }

  function clampBeeTarget(target) {
    return {
      x: Math.max(BEE_TUNING.targetPaddingX, Math.min(viewport.width - BEE_TUNING.targetPaddingX, target.x)),
      y: Math.max(BEE_TUNING.targetPaddingTop, Math.min(levelState.floorY - BEE_TUNING.targetBottomOffset, target.y))
    };
  }

  function buildBeeSpatialIndex() {
    const cellSize = BEE_TUNING.spatialCellSize;
    _spatialGrid.clear();
    for (let i = 0; i < combatState.bees.length; i += 1) {
      const bee = combatState.bees[i];
      const gx = Math.floor(bee.position.x / cellSize);
      const gy = Math.floor(bee.position.y / cellSize);
      const key = gridKey(gx, gy);
      const bucket = _spatialGrid.get(key);
      if (bucket) {
        bucket.push(bee);
      } else {
        _spatialGrid.set(key, [bee]);
      }
    }
    return _spatialGrid;
  }

  function calcBeeSeparationWithGrid(bee, spatialGrid) {
    let sepX = 0;
    let sepY = 0;
    const cellSize = BEE_TUNING.spatialCellSize;
    const gx = Math.floor(bee.position.x / cellSize);
    const gy = Math.floor(bee.position.y / cellSize);

    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oy = -1; oy <= 1; oy += 1) {
        const bucket = spatialGrid.get(gridKey(gx + ox, gy + oy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i += 1) {
          const other = bucket[i];
          if (other === bee) continue;
          const diff = Vector.sub(bee.position, other.position);
          const d2 = Vector.magnitudeSquared(diff);
          if (d2 > 0 && d2 < BEE_TUNING.separationDistanceSq) {
            const inv = 1 / Math.sqrt(d2);
            sepX += diff.x * inv;
            sepY += diff.y * inv;
          }
        }
      }
    }
    return { x: sepX, y: sepY };
  }

  function rotateVector(v, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  }

  function measureRayClearance(origin, dir, length) {
    const end = {
      x: origin.x + dir.x * length,
      y: origin.y + dir.y * length
    };
    const hits = Query.ray(combatState.pathBlocks, origin, end, 2);
    if (!hits.length) return length;
    let minDist = length;
    for (let i = 0; i < hits.length; i += 1) {
      const hit = hits[i];
      const point = (hit.supports && hit.supports[0]) || hit.bodyA.position;
      const d = Math.hypot(point.x - origin.x, point.y - origin.y);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  function calcAvoidanceForce(bee, base, chaseNormal) {
    if (!combatState.pathBlocks.length) return { x: 0, y: 0, blocked: false };

    const speed = Math.hypot(bee.velocity.x, bee.velocity.y);
    const lookahead = BEE_TUNING.avoidLookaheadBase + speed * BEE_TUNING.avoidLookaheadSpeedScale;
    const forward = speed > 0.12
      ? { x: bee.velocity.x / speed, y: bee.velocity.y / speed }
      : chaseNormal;

    const frontClear = measureRayClearance(bee.position, forward, lookahead);
    if (frontClear >= lookahead) return { x: 0, y: 0, blocked: false };

    const leftDir = rotateVector(forward, BEE_TUNING.avoidSideProbeAngle);
    const rightDir = rotateVector(forward, -BEE_TUNING.avoidSideProbeAngle);
    const leftClear = measureRayClearance(bee.position, leftDir, lookahead);
    const rightClear = measureRayClearance(bee.position, rightDir, lookahead);
    bee.plugin.detourDir = leftClear >= rightClear ? 1 : -1;

    const sideDir = bee.plugin.detourDir > 0 ? leftDir : rightDir;
    const blockedRatio = 1 - Math.max(0, Math.min(1, frontClear / lookahead));
    const avoidScale = base * blockedRatio * blockedRatio;
    const away = { x: -forward.x, y: -forward.y };
    const x = (sideDir.x * BEE_TUNING.avoidForceScale + away.x * BEE_TUNING.avoidAwayScale) * avoidScale;
    const y = (sideDir.y * BEE_TUNING.avoidForceScale + away.y * BEE_TUNING.avoidAwayScale) * avoidScale;
    return { x, y, blocked: blockedRatio > 0.05 };
  }

  function calcBeeForce(bee, role, idx, now, nowTs, target, separation) {
    const chaseDir = Vector.sub(target, bee.position);
    const distance = Vector.magnitude(chaseDir);
    if (distance <= BEE_TUNING.minChaseDistance) return null;

    const base = bee.plugin.chaseSpeed;
    const normal = Vector.normalise(chaseDir);
    const wobble = Math.sin(now + idx * BEE_TUNING.wobbleFreqStep + bee.plugin.wobbleSeed) * base * BEE_TUNING.wobbleScale;
    const roleScale = BEE_TUNING.roleSpeedScale[role] || BEE_TUNING.roleSpeedScale.attacker;
    const forceScale = BEE_TUNING.forceScale;
    const gravityComp = engine.gravity.y * engine.gravity.scale * bee.mass;
    const avoidance = calcAvoidanceForce(bee, base, normal);

    const speed = Math.hypot(bee.velocity.x, bee.velocity.y);
    if (avoidance.blocked && speed < BEE_TUNING.stuckSpeedThreshold) {
      if (!bee.plugin.stuckSinceTs) bee.plugin.stuckSinceTs = nowTs;
    } else {
      bee.plugin.stuckSinceTs = 0;
    }

    const stuckBoostOn = bee.plugin.stuckSinceTs
      && nowTs - bee.plugin.stuckSinceTs > BEE_TUNING.stuckDetectMs;
    const tangentBoost = stuckBoostOn
      ? base * BEE_TUNING.stuckBoostScale * bee.plugin.detourDir
      : 0;

    return {
      x: (normal.x * base * roleScale
        + wobble
        + separation.x * base * BEE_TUNING.separationForceScale
        + avoidance.x
        + -normal.y * tangentBoost) * forceScale,
      y: (normal.y * base * roleScale
        - wobble * BEE_TUNING.wobbleYRatio
        + separation.y * base * BEE_TUNING.separationForceScale
        + avoidance.y
        + normal.x * tangentBoost) * forceScale - gravityComp
    };
  }

  function pickRoleWithWeight(weights) {
    const entries = Object.entries(weights).filter((entry) => entry[1] > 0);
    if (!entries.length) return "attacker";
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    let r = Math.random() * total;
    for (let i = 0; i < entries.length; i += 1) {
      r -= entries[i][1];
      if (r <= 0) return entries[i][0];
    }
    return entries[entries.length - 1][0];
  }

  function maybeSwitchBeeRole(bee, nowTs, dogPos) {
    // Role switching is only allowed after attack phase starts.
    if (!combatState.beesReleased) return;
    if (nowTs < (bee.plugin.roleLockUntilTs || 0)) return;
    if (nowTs < (bee.plugin.nextRoleCheckTs || 0)) return;

    const jitter = (Math.random() - 0.5) * 2 * BEE_TUNING.roleSwitchCheckJitterMs;
    bee.plugin.nextRoleCheckTs = nowTs + BEE_TUNING.roleSwitchCheckMs + jitter;

    const currentRole = bee.plugin.role || "attacker";
    const dogDist = Vector.magnitude(Vector.sub(dogPos, bee.position));
    const nearDogThreshold = Math.max(84, (combatState.dog.circleRadius || 22) * 5.2);
    const nearDog = dogDist < nearDogThreshold;

    let chance = BEE_TUNING.roleSwitchBaseChance;
    if (nearDog) chance += BEE_TUNING.roleSwitchNearDogBonus;
    chance = Math.min(0.78, chance);
    if (Math.random() > chance) return;

    const weights = {
      attacker: currentRole === "attacker" ? 0 : 1,
      flanker: currentRole === "flanker" ? 0 : 1 + (nearDog ? BEE_TUNING.flankerNearDogWeightBonus : 0),
      breaker: currentRole === "breaker" ? 0 : BEE_TUNING.breakerWeightBase
    };

    bee.plugin.role = pickRoleWithWeight(weights);
    bee.plugin.roleLockUntilTs = nowTs + BEE_TUNING.roleSwitchLockMs;
  }

  function clampBeeSpeed(bee, role) {
    const v = bee.velocity;
    const speed = Math.hypot(v.x, v.y);
    const maxSpeed = BEE_TUNING.maxSpeedByRole[role] || BEE_TUNING.maxSpeedByRole.attacker;
    if (speed > maxSpeed) {
      Body.setVelocity(bee, { x: (v.x / speed) * maxSpeed, y: (v.y / speed) * maxSpeed });
    }
  }

  function respawnBeeFromTop(bee) {
    const minX = 8;
    const maxX = Math.max(9, viewport.width - 8);
    const x = minX + Math.random() * (maxX - minX);
    const y = BEE_TUNING.respawnTopMin + Math.random() * (BEE_TUNING.respawnTopMax - BEE_TUNING.respawnTopMin);
    Body.setPosition(bee, { x, y });
    Body.setVelocity(bee, { x: 0, y: 0 });
    Body.setAngularVelocity(bee, 0);
    bee.plugin.offscreenSinceTs = 0;
    bee.plugin.stuckSinceTs = 0;
  }

  function shouldRespawnBee(bee, nowTs) {
    const x = bee.position.x;
    const y = bee.position.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return true;

    const offscreen = x < 0 || x > viewport.width || y < 0 || y > viewport.height;
    if (!offscreen) {
      bee.plugin.offscreenSinceTs = 0;
      return false;
    }

    if (!bee.plugin.offscreenSinceTs) {
      bee.plugin.offscreenSinceTs = nowTs;
      return false;
    }
    if (nowTs - bee.plugin.offscreenSinceTs < BEE_TUNING.respawnOffscreenGraceMs) return false;

    // Off-screen bees respawn with chance, not certainty.
    bee.plugin.offscreenSinceTs = nowTs;
    return Math.random() < BEE_TUNING.respawnOffscreenChance;
  }

  function normalizeOrNull(v) {
    const m = Math.hypot(v.x, v.y);
    if (m <= 0.0001) return null;
    return { x: v.x / m, y: v.y / m };
  }

  function pickBeeExitDir(bee) {
    const byVelocity = normalizeOrNull(bee.velocity);
    if (byVelocity) return byVelocity;

    if (combatState.dog) {
      const away = normalizeOrNull(Vector.sub(bee.position, combatState.dog.position));
      if (away) return away;
    }

    const biasX = Math.random() < 0.5 ? -1 : 1;
    return normalizeOrNull({ x: biasX, y: -0.25 }) || { x: biasX, y: 0 };
  }

  function startBeeRetreat() {
    if (levelState.beeRetreatActive) return;
    levelState.beeRetreatActive = true;
    cancelCollab();
    levelState.collabNextStartTs = 0;

    combatState.bees.forEach((bee) => {
      if (bee.isStatic) Body.setStatic(bee, false);
      bee.plugin.exitDir = pickBeeExitDir(bee);
      const speed = Math.hypot(bee.velocity.x, bee.velocity.y);
      bee.plugin.exitSpeed = Math.max(BEE_TUNING.exitMinSpeed, speed);
      // During retreat bees should phase through walls/lines and leave the stage.
      bee.collisionFilter.mask = 0;
    });
  }

  function isFarOffscreen(bee, margin) {
    const x = bee.position.x;
    const y = bee.position.y;
    return (
      x < -margin
      || x > viewport.width + margin
      || y < -margin
      || y > viewport.height + margin
    );
  }

  function updateBeeRetreat() {
    if (!levelState.beeRetreatActive) return;
    if (!combatState.bees.length) {
      levelState.beeRetreatActive = false;
      return;
    }

    const remain = [];
    for (let i = 0; i < combatState.bees.length; i += 1) {
      const bee = combatState.bees[i];
      const dir = bee.plugin.exitDir || pickBeeExitDir(bee);
      bee.plugin.exitDir = dir;

      const baseTarget = Math.max(BEE_TUNING.exitCruiseSpeed, bee.plugin.exitSpeed || 0);
      const currentSpeed = Math.hypot(bee.velocity.x, bee.velocity.y);
      const nextSpeed = Math.min(baseTarget, currentSpeed + BEE_TUNING.exitAccel);
      Body.setVelocity(bee, { x: dir.x * nextSpeed, y: dir.y * nextSpeed });

      if (isFarOffscreen(bee, BEE_TUNING.exitOffscreenMargin)) {
        World.remove(engine.world, bee);
      } else {
        remain.push(bee);
      }
    }
    combatState.bees = remain;
    if (!combatState.bees.length) levelState.beeRetreatActive = false;
  }

  function updateBees() {
    if (!combatState.dog) return;

    if (levelState.phase === "lose") {
      updateBeeRetreat();
      return;
    }
    if (levelState.phase !== "running") return;

    const nowTs = performance.now();
    const elapsed = nowTs - levelState.startTs;

    if (elapsed < levelState.beeDelayMs) {
      holdBeesBeforeRelease();
      return;
    }

    if (!combatState.beesReleased) releaseAfterBuildPhase(nowTs);
    updateCollabState(nowTs);

    const dogPos = combatState.dog.position;
    const now = nowTs * 0.002;
    const drawTargets = combatState.drawBodies;
    const spatialGrid = buildBeeSpatialIndex();

    combatState.bees.forEach((bee, idx) => {
      if (shouldRespawnBee(bee, nowTs)) {
        respawnBeeFromTop(bee);
      }
      maybeSwitchBeeRole(bee, nowTs, dogPos);
      const role = bee.plugin.role || "attacker";
      const target = clampBeeTarget(chooseBeeTarget(bee, role, idx, now, dogPos, drawTargets));
      const separation = calcBeeSeparationWithGrid(bee, spatialGrid);
      const force = calcBeeForce(bee, role, idx, now, nowTs, target, separation);
      if (!force) return;
      if (levelState.collabActive && levelState.collabDir !== 0) {
        force.x += levelState.collabDir * bee.plugin.chaseSpeed * BEE_TUNING.collabForceScale;
      }

      Body.applyForce(bee, bee.position, force);
      clampBeeSpeed(bee, role);
    });
  }

  function updateClock() {
    if (levelState.phase !== "running") return;

    const level = LEVELS[levelState.currentIndex];
    const elapsed = performance.now() - levelState.startTs;
    levelState.remainingMs = Math.max(0, level.timeLimitSec * 1000 - elapsed);

    if (combatState.dog && combatState.dog.position.y > levelState.floorY) {
      endLevel("lose");
      return;
    }

    if (levelState.remainingMs <= 0) endLevel("win");
  }

  function updateHud() {
    const level = LEVELS[levelState.currentIndex];
    const elapsed = performance.now() - levelState.startTs;
    const beeRemainMs = Math.max(0, levelState.beeDelayMs - elapsed);
    const runningRemainMs = Math.max(0, levelState.remainingMs);
    const uiPhase = levelState.phase === "running"
      ? (beeRemainMs > 0 ? "build" : "attack")
      : levelState.phase;

    const inkPct = inkState.total > 0
      ? Math.max(0, (inkState.remaining - inkState.currentStrokeLen) / inkState.total) * 100
      : 0;

    if (ui.inkBarWrap) ui.inkBarWrap.classList.toggle("hidden", uiPhase !== "build");
    if (ui.inkFill) {
      ui.inkFill.style.width = inkPct + "%";
      ui.inkFill.classList.toggle("depleted", inkState.strokeBudgetHit);
    }

    ui.timeText.classList.toggle("time-build", uiPhase === "build");
    ui.timeText.classList.toggle("time-attack", uiPhase === "attack" || uiPhase === "lose");
    ui.timeText.classList.toggle("time-hidden", uiPhase === "win");

    if (uiPhase === "build") {
      ui.timeText.textContent = `布防 ${(beeRemainMs / 1000).toFixed(1)}s`;
      setStatus(`${inkState.strokesUsed}/${level.strokeLimit} 笔`, "");
    } else if (uiPhase === "attack") {
      ui.timeText.textContent = `进攻 ${(runningRemainMs / 1000).toFixed(1)}s`;
      setStatus("蜂群来袭", "danger");
    } else if (uiPhase === "win") {
      ui.timeText.textContent = "";
    } else if (uiPhase === "lose") {
      ui.timeText.textContent = `${(levelState.endRemainingMs / 1000).toFixed(1)}s`;
    } else {
      ui.timeText.textContent = `${(levelState.remainingMs / 1000).toFixed(1)}s`;
    }
  }

  function createPointerLikeEvent(sourceEvent, pointerId, point) {
    return {
      pointerId,
      clientX: point ? point.clientX : 0,
      clientY: point ? point.clientY : 0,
      preventDefault: () => sourceEvent.preventDefault()
    };
  }

  function findTouchById(touchList, id) {
    if (!touchList) return null;
    for (let i = 0; i < touchList.length; i += 1) {
      if (touchList[i].identifier === id) return touchList[i];
    }
    return null;
  }

  function drawPointerOverlay(ctx) {
    if (!inputState.isPointerDown || inputState.pointerPath.length < 2) return;

    ctx.save();
    ctx.strokeStyle = inkState.strokeBudgetHit ? "#b33b2e" : "#2f4f3d";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(inputState.pointerPath[0].x, inputState.pointerPath[0].y);
    for (let i = 1; i < inputState.pointerPath.length; i += 1) {
      ctx.lineTo(inputState.pointerPath[i].x, inputState.pointerPath[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawDogHitOverlay(ctx) {
    if (!combatState.dog) return;

    const now = performance.now();
    const remain = fxState.dogHitFlashUntil - now;
    const hasFlash = remain > 0;
    if (!hasFlash && !fxState.dogHitPersistent) return;

    const t = hasFlash
      ? Math.max(0, Math.min(1, remain / HIT_EFFECT.durationMs))
      : 0.7 + Math.sin(now * 0.012) * 0.25;
    const pulse = hasFlash
      ? 0.82 + (1 - t) * 0.38
      : 1.02 + Math.sin(now * 0.015) * 0.12;
    const pos = combatState.dog.position;
    const radius = (combatState.dog.circleRadius || 22) * HIT_EFFECT.auraScale * pulse;

    ctx.save();
    const g = ctx.createRadialGradient(pos.x, pos.y, radius * 0.25, pos.x, pos.y, radius);
    g.addColorStop(0, `rgba(232,72,61,${(0.3 * t).toFixed(3)})`);
    g.addColorStop(0.55, `rgba(215,44,34,${(0.2 * t).toFixed(3)})`);
    g.addColorStop(1, "rgba(215,44,34,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(190,34,28,${(0.5 * t).toFixed(3)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 0.52, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function uiLoop() {
    updateClock();
    updateHud();
    drawPointerOverlay(render.context);
    drawDogHitOverlay(render.context);
    requestAnimationFrame(uiLoop);
  }

  function resizeGame() {
    const size = computeGameSize();
    const changed = size.width !== viewport.width || size.height !== viewport.height;
    if (!changed) return;

    viewport.width = size.width;
    viewport.height = size.height;
    canvasRect = null;
    Render.setSize(render, size.width, size.height);
    loadLevel(levelState.currentIndex);
  }

  function bindUiEvents() {
    ui.restartBtn.addEventListener("click", restartLevel);
    ui.nextBtn.addEventListener("click", nextLevel);
  }

  function bindPointerEvents() {
    ui.canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    ui.canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    ui.canvas.addEventListener("pointerup", onPointerUp, { passive: false });
    ui.canvas.addEventListener("pointercancel", onPointerCancel, { passive: false });
  }

  function bindLegacyPointerFallback() {
    if (window.PointerEvent) return;

    ui.canvas.addEventListener("mousedown", (ev) => {
      onPointerDown(createPointerLikeEvent(ev, 1, ev));
    });
    ui.canvas.addEventListener("mousemove", (ev) => {
      if (!inputState.isPointerDown) return;
      onPointerMove(createPointerLikeEvent(ev, 1, ev));
    });
    ui.canvas.addEventListener("mouseup", (ev) => {
      onPointerUp(createPointerLikeEvent(ev, 1));
    });

    ui.canvas.addEventListener("touchstart", (ev) => {
      const t = ev.changedTouches && ev.changedTouches[0];
      if (!t) return;
      onPointerDown(createPointerLikeEvent(ev, t.identifier, t));
    }, { passive: false });

    ui.canvas.addEventListener("touchmove", (ev) => {
      const t = findTouchById(ev.changedTouches, inputState.pointerId);
      if (!t || !inputState.isPointerDown) return;
      onPointerMove(createPointerLikeEvent(ev, inputState.pointerId, t));
    }, { passive: false });

    ui.canvas.addEventListener("touchend", (ev) => {
      const t = findTouchById(ev.changedTouches, inputState.pointerId);
      if (!t) return;
      onPointerUp(createPointerLikeEvent(ev, inputState.pointerId, t));
    }, { passive: false });

    ui.canvas.addEventListener("touchcancel", (ev) => {
      const t = findTouchById(ev.changedTouches, inputState.pointerId);
      if (!t) return;
      onPointerCancel(createPointerLikeEvent(ev, inputState.pointerId, t));
    }, { passive: false });
  }

  function bindResizeEvent() {
    let resizeTimer = 0;
    const scheduleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeGame, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener("resize", scheduleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleResize);
    }
  }

  function onCollisionStart(ev) {
    if (levelState.phase !== "running") return;
    for (const pair of ev.pairs) {
      const a = pair.bodyA.label;
      const b = pair.bodyB.label;
      if ((a === "dog" && b === "bee") || (a === "bee" && b === "dog")) {
        triggerDogHitEffect();
        endLevel("lose");
        break;
      }
    }
  }

  function bindEngineEvents() {
    Events.on(engine, "beforeUpdate", updateBees);
    Events.on(engine, "collisionStart", onCollisionStart);
  }

  function bindEvents() {
    bindUiEvents();
    bindPointerEvents();
    bindLegacyPointerFallback();
    bindResizeEvent();
    bindEngineEvents();
  }

  function init() {
    const size = computeGameSize();
    viewport.width = size.width;
    viewport.height = size.height;
    Render.setSize(render, size.width, size.height);
    bindEvents();
    Render.run(render);
    Runner.run(runner, engine);
    loadLevel(0);
    requestAnimationFrame(uiLoop);
  }

  init();
})();
