/* Shared by the browser and the deterministic simulation tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    const config = require('./game-config.js');
    const geometry = require('./core/geometry.js');
    module.exports = Matter => factory(Matter, config, geometry);
  } else root.DogeCore = factory(root.Matter, root.SaveTheDoge.config, root.SaveTheDoge.geometry);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Matter, config, geometry) {
  'use strict';
  const { Engine, Bodies, Body, Composite, Events, Query } = Matter;
  const { world, stroke: strokeConfig, simulation: simulationConfig, dog: dogConfig,
    bee: beeConfig, terrain: terrainConfig, navigation: navigationConfig } = config;
  const WIDTH = world.width, HEIGHT = world.height, LINE_WIDTH = strokeConfig.width, DOG_RADIUS = dogConfig.radius;
  const HIVE_RADIUS = beeConfig.hiveRadius, HIVE_SPAWN_RADIUS = beeConfig.hiveSpawnRadius;
  const STEP = 1000 / simulationConfig.stepsPerSecond, TOTAL_STEPS = simulationConfig.totalSteps;
  const HASH_OFFSET_BASIS = 2166136261, HASH_PRIME = 16777619, HASH_MIX_MULTIPLIER = 0x85ebca6b;
  const HASH_INITIAL_SHIFT = 16, HASH_FINAL_SHIFT = 13;
  const { clone, distance, length, inkUsed, viewTransform, viewPoint, worldPoint,
    pointSegmentDistance, simplify, appendPoint, normalizeStroke, trimStroke } = geometry;

  function impactHash(levelId, beeIndex, count) {
    let hash = HASH_OFFSET_BASIS;
    for (const char of `${levelId}:${beeIndex}:${count}`) hash = Math.imul(hash ^ char.charCodeAt(0), HASH_PRIME);
    hash ^= hash >>> HASH_INITIAL_SHIFT;
    hash = Math.imul(hash, HASH_MIX_MULTIPLIER);
    return (hash ^ (hash >>> HASH_FINAL_SHIFT)) >>> 0;
  }

  function strokeBody(stroke) {
    const parts = [];
    const options = {
      friction: strokeConfig.friction,
      frictionStatic: strokeConfig.staticFriction,
      restitution: strokeConfig.restitution,
      density: strokeConfig.density
    };
    for (let i = 1; i < stroke.points.length; i++) {
      const a = stroke.points[i - 1], b = stroke.points[i], span = distance(a, b);
      if (span < strokeConfig.segmentEpsilon) continue;
      parts.push(Bodies.rectangle((a.x + b.x) / 2, (a.y + b.y) / 2, span, LINE_WIDTH, { ...options, angle: Math.atan2(b.y - a.y, b.x - a.x) }));
    }
    // Round joins overlap adjacent segments, closing collision gaps without
    // filling a loop's interior (the compound parent's hull is not a collider).
    for (const p of stroke.points) parts.push(Bodies.circle(p.x, p.y, LINE_WIDTH / 2, options, strokeConfig.joinSides));
    const body = Body.create({ ...options, parts, label: 'stroke', frictionAir: strokeConfig.airFriction });
    body.plugin.strokeId = stroke.id;
    body.plugin.localPoints = stroke.points.map(p => ({ x: p.x - body.position.x, y: p.y - body.position.y }));
    return body;
  }

  function worldPoints(body) {
    const c = Math.cos(body.angle), s = Math.sin(body.angle);
    return body.plugin.localPoints.map(p => ({ x: body.position.x + p.x * c - p.y * s, y: body.position.y + p.x * s + p.y * c }));
  }

  function terrainBodies(level) {
    return level.platforms.map(p => Bodies.rectangle(p.x, p.y, p.w, p.h, {
      isStatic: true,
      label: 'terrain',
      friction: terrainConfig.friction,
      restitution: terrainConfig.restitution
    }));
  }

  function validateStroke(level, strokes, points) {
    if (points.length < 2 || length(points) < strokeConfig.minimumLength) return '请画一条稍长的线';
    if (points.some(p => p.x < world.safeMargin || p.x > WIDTH - world.safeMargin ||
      p.y < world.safeMargin || p.y > level.dangerY - world.safeMargin)) return '请画在安全区域内';
    const candidate = strokeBody({ id: 'preview', points });
    const overlaps = bodies => candidate.parts.slice(1).some(part => Query.collides(part, bodies).length);
    const dog = Bodies.circle(level.dog.x, level.dog.y, DOG_RADIUS);
    if (overlaps([dog])) return '这笔穿过了小狗，请留出一点空间';
    if (overlaps(terrainBodies(level))) return '这笔穿过了平台，请沿边缘留出空隙';
    const hives = level.hives.map(h => Bodies.circle(h.x, h.y, HIVE_RADIUS));
    if (overlaps(hives)) return '请避开蜂群的出发区域';
    if (overlaps(strokes.map(strokeBody))) return '这笔碰到了已有笔画，请留出一点空隙';
    return '';
  }

  function validatePlan(level, strokes) {
    if (!Array.isArray(strokes) || strokes.length > Math.ceil(level.inkLimit / strokeConfig.minimumLength)) return false;
    if (new Set(strokes.map(s => s && s.id)).size !== strokes.length) return false;
    const accepted = [];
    for (const stroke of strokes) {
      if (!stroke || typeof stroke.id !== 'string' || !Array.isArray(stroke.points) ||
        stroke.points.length > strokeConfig.maximumPoints ||
        stroke.points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) return false;
      if (validateStroke(level, accepted, stroke.points)) return false;
      accepted.push(stroke);
    }
    return inkUsed(strokes) <= level.inkLimit + strokeConfig.planBudgetEpsilon;
  }

  class Editor {
    constructor(strokes = []) { this.strokes = clone(strokes); this.serial = Date.now(); }
    commit(strokes) { this.strokes = clone(strokes); }
    add(points) {
      // Restored drafts may have IDs from the same or a later clock reading.
      // Uniqueness belongs to the document, not to the system clock.
      let id;
      do { id = `s${++this.serial}`; } while (this.strokes.some(stroke => stroke.id === id));
      this.commit(this.strokes.concat({ id, points }));
    }
    remove(id) { if (this.strokes.some(s => s.id === id)) this.commit(this.strokes.filter(s => s.id !== id)); }
  }

  // A shared clearance grid is rebuilt on simulation ticks, never wall time.
  // Rasterize convex collision parts, not the enclosing hull of a hollow stroke.
  class Navigation {
    constructor(blocks, goal) {
      this.blocks = blocks; this.goal = { ...goal };
      this.cell = navigationConfig.cellSize;
      this.cols = Math.ceil(WIDTH / this.cell);
      this.rows = Math.ceil(HEIGHT / this.cell);
      this.blocked = new Uint8Array(this.cols * this.rows);
      for (const body of blocks) for (const part of body.parts.length > 1 ? body.parts.slice(1) : [body]) {
        const minX = Math.max(0, Math.floor((part.bounds.min.x - navigationConfig.clearance) / this.cell));
        const maxX = Math.min(this.cols - 1, Math.floor((part.bounds.max.x + navigationConfig.clearance) / this.cell));
        const minY = Math.max(0, Math.floor((part.bounds.min.y - navigationConfig.clearance) / this.cell));
        const maxY = Math.min(this.rows - 1, Math.floor((part.bounds.max.y + navigationConfig.clearance) / this.cell));
        for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
          const id = y * this.cols + x, p = this.point(id);
          if (this.blocked[id]) continue;
          if (Matter.Vertices.contains(part.vertices, p) || part.vertices.some((v, i, vertices) =>
            pointSegmentDistance(p, v, vertices[(i + 1) % vertices.length]) <= navigationConfig.clearance)) this.blocked[id] = 1;
        }
      }
      // Reachable components give each bee a reachable fallback when the dog
      // is enclosed, avoiding a full failed A* search for every bee every tick.
      this.component = new Int16Array(this.blocked.length).fill(-1);
      this.targets = [];
      for (let id = 0; id < this.blocked.length; id++) {
        if (this.blocked[id] || this.component[id] !== -1) continue;
        const group = this.targets.length, queue = [id];
        let closest = id, best = Infinity;
        this.component[id] = group;
        for (let head = 0; head < queue.length; head++) {
          const current = queue[head], d = distance(this.point(current), goal);
          if (d < best) { best = d; closest = current; }
          for (const next of this.neighbors(current)) if (this.component[next] === -1) {
            this.component[next] = group; queue.push(next);
          }
        }
        this.targets.push(closest);
      }
    }
    point(id) { return { x: (id % this.cols + 0.5) * this.cell, y: (Math.floor(id / this.cols) + 0.5) * this.cell }; }
    neighbors(id) {
      const x = id % this.cols, y = Math.floor(id / this.cols), result = [];
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]]) {
        const nx = x + dx, ny = y + dy, next = ny * this.cols + nx;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows || this.blocked[next]) continue;
        if (dx && dy && (this.blocked[y * this.cols + nx] || this.blocked[ny * this.cols + x])) continue;
        result.push(next);
      }
      return result;
    }
    clear(a, b, width = navigationConfig.rayWidth) { return !Query.ray(this.blocks, a, b, width).length; }
    path(start) {
      if (this.clear(start, this.goal)) return [this.goal];
      let first = -1, nearest = Infinity;
      const cx = Math.floor(start.x / this.cell), cy = Math.floor(start.y / this.cell);
      for (let y = Math.max(0, cy - navigationConfig.startSearchRadiusCells); y <= Math.min(this.rows - 1, cy + navigationConfig.startSearchRadiusCells); y++) {
        for (let x = Math.max(0, cx - navigationConfig.startSearchRadiusCells); x <= Math.min(this.cols - 1, cx + navigationConfig.startSearchRadiusCells); x++) {
          const id = y * this.cols + x, p = this.point(id), d = distance(start, p);
          // A bee already touching a wall must be able to leave its surface.
          if (!this.blocked[id] && d < nearest && this.clear(start, p, navigationConfig.escapeRayWidth)) { first = id; nearest = d; }
        }
      }
      if (first === -1) return [];
      const target = this.targets[this.component[first]], goal = this.point(target);
      const costs = new Float64Array(this.blocked.length).fill(Infinity);
      const parents = new Int32Array(this.blocked.length).fill(-1), heap = [];
      const less = (a, b) => a.f < b.f || (a.f === b.f && a.id < b.id);
      const push = entry => {
        let i = heap.length; heap.push(entry);
        while (i) { const p = (i - 1) >> 1; if (!less(entry, heap[p])) break; heap[i] = heap[p]; i = p; }
        heap[i] = entry;
      };
      const pop = () => {
        const top = heap[0], end = heap.pop();
        if (heap.length) {
          let i = 0;
          while (i * 2 + 1 < heap.length) {
            let child = i * 2 + 1;
            if (child + 1 < heap.length && less(heap[child + 1], heap[child])) child++;
            if (!less(heap[child], end)) break;
            heap[i] = heap[child]; i = child;
          }
          heap[i] = end;
        }
        return top;
      };
      costs[first] = 0; push({ id: first, g: 0, f: distance(this.point(first), goal) });
      while (heap.length) {
        const current = pop();
        if (current.g !== costs[current.id]) continue;
        if (current.id === target) break;
        for (const next of this.neighbors(current.id)) {
          const g = current.g + distance(this.point(current.id), this.point(next));
          if (g >= costs[next]) continue;
          costs[next] = g; parents[next] = current.id;
          push({ id: next, g, f: g + distance(this.point(next), goal) });
        }
      }
      const path = [];
      for (let id = target; id !== -1; id = parents[id]) path.push(this.point(id));
      return path.reverse();
    }
  }

  class Simulation {
    constructor(level, strokes) {
      this.level = level; this.snapshot = clone(strokes); this.ticks = 0; this.result = null;
      this.engine = Engine.create({
        gravity: { x: 0, y: simulationConfig.gravityY },
        positionIterations: simulationConfig.positionIterations,
        velocityIterations: simulationConfig.velocityIterations
      });
      this.terrain = terrainBodies(level);
      this.dog = Bodies.circle(level.dog.x, level.dog.y, DOG_RADIUS, {
        label: 'dog',
        density: dogConfig.density,
        friction: dogConfig.friction,
        frictionAir: dogConfig.airFriction,
        restitution: dogConfig.restitution
      });
      this.lines = strokes.map(strokeBody);
      this.bees = [];
      this.contacts = new Map();
      level.hives.forEach(hive => {
        for (let i = 0; i < hive.count; i++) {
          const angle = i * Math.PI * 2 / hive.count;
          const bee = Bodies.circle(
            hive.x + Math.cos(angle) * HIVE_SPAWN_RADIUS,
            hive.y + Math.sin(angle) * HIVE_SPAWN_RADIUS,
            beeConfig.radius,
            {
              label: 'bee',
              density: beeConfig.density,
              frictionAir: beeConfig.airFriction,
              restitution: beeConfig.restitution,
              friction: beeConfig.friction,
              collisionFilter: { category: beeConfig.collisionCategory, mask: beeConfig.collisionMask }
            }
          );
          bee.plugin.index = this.bees.length;
          bee.plugin.path = [];
          bee.plugin.impact = {
            count: 0,
            remaining: 0,
            nextTick: impactHash(level.id, this.bees.length, 0) % beeConfig.impactTimingVariants,
            speed: beeConfig.normalSpeed,
            active: false,
            point: null
          };
          this.bees.push(bee);
        }
      });
      Composite.add(this.engine.world, [...this.terrain, this.dog, ...this.lines, ...this.bees]);
      Events.on(this.engine, 'collisionStart collisionActive', event => {
        for (const pair of event.pairs) {
          const a = pair.bodyA.parent, b = pair.bodyB.parent;
          const bee = a.label === 'bee' ? a : b.label === 'bee' ? b : null;
          const line = a.label === 'stroke' ? a : b.label === 'stroke' ? b : null;
          if (!bee || !line) continue;
          // One entry per bee/parent line, even when several child parts touch.
          if (!this.contacts.has(bee.plugin.index)) this.contacts.set(bee.plugin.index, new Map());
          const contacts = this.contacts.get(bee.plugin.index);
          if (!contacts.has(line)) {
            const point = pair.collision.supports[0] || bee.position;
            contacts.set(line, { x: point.x, y: point.y });
          }
        }
      });
      Events.on(this.engine, 'collisionStart', event => {
        for (const { bodyA, bodyB, collision } of event.pairs) {
          const a = bodyA.parent.label, b = bodyB.parent.label;
          if ((a === 'bee' && b === 'dog') || (a === 'dog' && b === 'bee')) this.fail('sting', { ...(collision.supports[0] || this.dog.position) });
        }
      });
    }
    fail(reason, point) { if (!this.result) this.result = { state: 'lost', reason, point: { x: point.x, y: point.y }, ticks: this.ticks }; }
    step() {
      if (this.result) return this.result;
      const blocks = [...this.terrain, ...this.lines];
      if (this.ticks % simulationConfig.navigationRefreshSteps === 0) {
        this.navigation = new Navigation(blocks, this.dog.position);
        for (const bee of this.bees) {
          bee.plugin.path = this.navigation.path(bee.position);
          if (bee.plugin.path.length > 1) bee.plugin.pushing = false;
        }
      }
      this.bees.forEach(bee => {
        const impact = bee.plugin.impact;
        const contact = this.contacts.get(bee.plugin.index)?.values().next().value;
        if (!contact) impact.remaining = 0;
        if (contact && !impact.remaining && this.ticks >= impact.nextTick) {
          const hash = impactHash(this.level.id, bee.plugin.index, ++impact.count);
          impact.remaining = beeConfig.impactDurationSteps;
          impact.speed = beeConfig.impactBaseSpeed + (hash % beeConfig.impactSpeedVariants) / beeConfig.impactSpeedDivisor;
          impact.nextTick = this.ticks + beeConfig.impactDurationSteps + beeConfig.impactCooldownSteps +
            ((hash >>> beeConfig.impactHashShift) % beeConfig.impactTimingVariants);
        }
        impact.active = !!contact && impact.remaining > 0;
        impact.point = impact.active ? contact : null;
        const targetSpeed = impact.active ? impact.speed : beeConfig.normalSpeed;
        const propulsion = beeConfig.propulsion * (impact.active ? beeConfig.impactPropulsionMultiplier : 1);
        const path = bee.plugin.path;
        while (path.length > 1 && distance(bee.position, path[0]) < beeConfig.waypointDistance) path.shift();
        // Smooth only collision-free shortcuts; Matter still resolves contact.
        for (let i = Math.min(path.length - 1, beeConfig.shortcutLookahead); i > 0; i--) {
          if (this.navigation.clear(bee.position, path[i])) { path.splice(0, i); break; }
        }
        const target = path[0] || this.dog.position;
        let dx = target.x - bee.position.x, dy = target.y - bee.position.y;
        const d = Math.hypot(dx, dy) || 1;
        // On reaching the nearest accessible cell, push toward the defence.
        // Keep advancing after arrival instead of bouncing back to the grid
        // endpoint before reaching the actual collider. A new route releases it.
        if (path.length <= 1 && d < beeConfig.pathArrivalDistance) bee.plugin.pushing = true;
        if (contact || bee.plugin.pushing) { dx = this.dog.position.x - bee.position.x; dy = this.dog.position.y - bee.position.y; }
        const span = Math.hypot(dx, dy) || 1;
        Body.applyForce(bee, bee.position, {
          x: (dx / span * targetSpeed - bee.velocity.x) * bee.mass * propulsion,
          y: (dy / span * targetSpeed - bee.velocity.y) * bee.mass * propulsion - bee.mass * this.engine.gravity.y * this.engine.gravity.scale
        });
        const speed = Math.hypot(bee.velocity.x, bee.velocity.y);
        if (speed > targetSpeed) Body.setVelocity(bee, { x: bee.velocity.x * targetSpeed / speed, y: bee.velocity.y * targetSpeed / speed });
        if (impact.remaining) impact.remaining--;
      });
      this.ticks++;
      this.contacts.clear();
      Engine.update(this.engine, STEP);
      if (this.dog.position.y + DOG_RADIUS > this.level.dangerY || this.dog.position.x < -DOG_RADIUS || this.dog.position.x > WIDTH + DOG_RADIUS) {
        this.fail('fall', {
          x: Math.max(DOG_RADIUS, Math.min(WIDTH - DOG_RADIUS, this.dog.position.x)),
          y: Math.min(this.level.dangerY, this.dog.position.y)
        });
      }
      if (!this.result && this.ticks >= TOTAL_STEPS) this.result = { state: 'won', ticks: this.ticks };
      return this.result;
    }
    dispose() { Events.off(this.engine); Composite.clear(this.engine.world, false); Engine.clear(this.engine); }
  }

  function simulate(level, strokes) {
    const sim = new Simulation(level, strokes);
    while (!sim.result) sim.step();
    const result = clone(sim.result); sim.dispose(); return result;
  }
  return {
    viewTransform, viewPoint, worldPoint,
    WIDTH, HEIGHT, LINE_WIDTH, DOG_RADIUS, STEP, TOTAL_STEPS,
    clone, length, inkUsed, pointSegmentDistance, simplify, normalizeStroke, trimStroke, appendPoint,
    strokeBody, worldPoints, validateStroke, validatePlan, Editor, Simulation, simulate
  };
});
