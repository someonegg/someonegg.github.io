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

  function closestOnSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return { x: a.x + t * dx, y: a.y + t * dy };
  }

  function snapStroke(points, strokes) {
    if (!points.length || !strokes.length) return clone(points);
    const result = clone(points);
    for (const index of new Set([0, result.length - 1])) {
      let nearest = strokeConfig.snapDistance, target = null;
      for (const stroke of strokes) for (let i = 1; i < stroke.points.length; i++) {
        const p = closestOnSegment(result[index], stroke.points[i - 1], stroke.points[i]);
        const d = distance(result[index], p);
        if (d <= nearest) { nearest = d; target = p; }
      }
      if (target) result[index] = target;
    }
    return result;
  }

  // Geometry of the centre lines distinguishes a permitted endpoint joint
  // from a crossing or a segment laid over an existing segment.
  function strokeIntersectionInvalid(points, strokes) {
    const epsilon = strokeConfig.segmentEpsilon;
    for (let i = 1; i < points.length; i++) for (const stroke of strokes) for (let j = 1; j < stroke.points.length; j++) {
      const a = points[i - 1], b = points[i], c = stroke.points[j - 1], d = stroke.points[j];
      const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
      const cross = rx * sy - ry * sx, qx = c.x - a.x, qy = c.y - a.y;
      if (Math.abs(cross) < epsilon) {
        if (Math.abs(qx * ry - qy * rx) > epsilon) continue;
        const span = rx * rx + ry * ry || 1;
        const t0 = (qx * rx + qy * ry) / span, t1 = ((d.x - a.x) * rx + (d.y - a.y) * ry) / span;
        if (Math.min(1, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)) > epsilon / Math.sqrt(span)) return true;
        continue;
      }
      const t = (qx * sy - qy * sx) / cross, u = (qx * ry - qy * rx) / cross;
      if (t < -1e-7 || t > 1 + 1e-7 || u < -1e-7 || u > 1 + 1e-7) continue;
      const atStart = i === 1 && Math.abs(t) < 1e-7;
      const atEnd = i === points.length - 1 && Math.abs(t - 1) < 1e-7;
      if (!atStart && !atEnd) return true;
    }
    return false;
  }

  function connectedBodies(strokes) {
    const parent = strokes.map((_, i) => i);
    const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
    for (let i = 0; i < strokes.length; i++) for (let j = 0; j < i; j++) {
      const joined = [strokes[i], strokes[j]].some((source, side) => {
        const other = side ? strokes[i] : strokes[j];
        return [source.points[0], source.points.at(-1)].some(p => other.points.slice(1).some((q, k) =>
          pointSegmentDistance(p, other.points[k], q) <= strokeConfig.segmentEpsilon));
      });
      if (joined) parent[find(i)] = find(j);
    }
    const groups = new Map();
    strokes.forEach((stroke, i) => {
      const key = find(i);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(stroke);
    });
    return [...groups.values()].map(group => {
      if (group.length === 1) return strokeBody(group[0]);
      const members = group.map(strokeBody);
      const parts = members.flatMap(body => body.parts.slice(1));
      const body = Body.create({ parts, label: 'stroke', frictionAir: strokeConfig.airFriction,
        friction: strokeConfig.friction, frictionStatic: strokeConfig.staticFriction,
        restitution: strokeConfig.restitution });
      body.plugin.localStrokes = group.map(stroke => ({ id: stroke.id,
        points: stroke.points.map(p => ({ x: p.x - body.position.x, y: p.y - body.position.y })) }));
      return body;
    });
  }

  function worldPoints(body) {
    const c = Math.cos(body.angle), s = Math.sin(body.angle);
    const points = body.plugin.localPoints || body.plugin.localStrokes[0].points;
    return points.map(p => ({ x: body.position.x + p.x * c - p.y * s, y: body.position.y + p.x * s + p.y * c }));
  }

  function worldStrokePoints(body) {
    if (!body.plugin.localStrokes) return [worldPoints(body)];
    const c = Math.cos(body.angle), s = Math.sin(body.angle);
    return body.plugin.localStrokes.map(stroke => stroke.points.map(p =>
      ({ x: body.position.x + p.x * c - p.y * s, y: body.position.y + p.x * s + p.y * c })));
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
    if (strokeIntersectionInvalid(points, strokes)) return '这笔碰到了已有笔画，请留出一点空隙';
    // Keep the existing capsule clearance away from allowed joints.
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      for (const stroke of strokes) for (let j = 1; j < stroke.points.length; j++) {
        const c = stroke.points[j - 1], d = stroke.points[j];
        const startJoint = i === 1 && pointSegmentDistance(a, c, d) < strokeConfig.segmentEpsilon;
        const endJoint = i === points.length - 1 && pointSegmentDistance(b, c, d) < strokeConfig.segmentEpsilon;
        if (startJoint || endJoint) {
          const span = distance(a, b);
          const fraction = Math.min(1, LINE_WIDTH * 2 / (span || 1));
          const near = startJoint ? { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction }
            : { x: b.x + (a.x - b.x) * fraction, y: b.y + (a.y - b.y) * fraction };
          if (pointSegmentDistance(near, c, d) < LINE_WIDTH - strokeConfig.segmentEpsilon)
            return '这笔碰到了已有笔画，请留出一点空隙';
          continue;
        }
        if (Math.min(pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d),
          pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b)) < LINE_WIDTH) return '这笔碰到了已有笔画，请留出一点空隙';
      }
    }
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
    constructor(blocks, goal, attackBodies = [], terrain = []) {
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
      this.fields = new Map();
      this.fieldBuilds = 0;
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
      const goalX = Math.floor(goal.x / this.cell), goalY = Math.floor(goal.y / this.cell);
      const goalId = goalY * this.cols + goalX;
      this.goalGroup = goalX >= 0 && goalX < this.cols && goalY >= 0 && goalY < this.rows
        ? this.component[goalId] : -1;
      this.attacks = this.attackCandidates(attackBodies, terrain);
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
    attackCandidates(bodies, terrain) {
      const groups = this.targets.map(() => []);
      if (this.targets.length === 1 && this.goalGroup === 0) return groups;
      for (const body of bodies) {
        const supports = Query.collides(body, terrain).flatMap(collision => collision.supports || []).filter(Boolean);
        worldStrokePoints(body).forEach((points, strokeIndex) => {
          const add = (point, key, fallback) => {
            const nearest = new Map(), cx = Math.floor(point.x / this.cell), cy = Math.floor(point.y / this.cell);
            const radius = navigationConfig.attackSearchRadiusCells;
            for (let y = Math.max(0, cy - radius); y <= Math.min(this.rows - 1, cy + radius); y++) {
              for (let x = Math.max(0, cx - radius); x <= Math.min(this.cols - 1, cx + radius); x++) {
                const id = y * this.cols + x, group = this.component[id];
                if (group < 0) continue;
                const cellPoint = this.point(id), d = distance(cellPoint, point);
                if (d > radius * this.cell || d >= (nearest.get(group)?.distance ?? Infinity)) continue;
                if (Query.ray(terrain, cellPoint, point, navigationConfig.escapeRayWidth).length) continue;
                nearest.set(group, { id, distance: d });
              }
            }
            const supported = supports.some(support => distance(support, point) < navigationConfig.supportDistance);
            for (const [group, cell] of nearest) {
              if (group === this.goalGroup) continue;
              groups[group].push({
                id: cell.id, key, body, point, fallback,
                penalty: (fallback ? navigationConfig.fallbackAttackPenalty : 0) +
                  (supported ? navigationConfig.supportedAttackPenalty : 0)
              });
            }
          };
          points.forEach((point, i) => {
            const before = points[i - 1], after = points[i + 1];
            let corner = !before || !after;
            if (before && after) {
              const ax = point.x - before.x, ay = point.y - before.y;
              const bx = after.x - point.x, by = after.y - point.y;
              corner = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by) || 1) < navigationConfig.sharpCornerCosine;
            }
            if (corner) add(point, `${body.id}:${strokeIndex}:v${i}`, false);
          });
          for (let i = 1; i < points.length; i++) {
            const a = points[i - 1], b = points[i];
            for (const [numerator, denominator] of [[1, 3], [5, 7]]) {
              const fraction = numerator / denominator;
              add({ x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction },
                `${body.id}:${strokeIndex}:f${i}:${numerator}_${denominator}`, true);
            }
          }
        });
      }
      return groups;
    }
    chooseAttack(group, start, feedback, tick) {
      const candidates = this.attacks[group];
      const available = candidates.filter(candidate => (feedback?.get(candidate.key) ?? 0) <= tick);
      const pool = available.length ? available : candidates;
      const corners = pool.filter(candidate => !candidate.fallback);
      const choices = corners.length ? corners : pool;
      let best = null, dogDistance = Infinity, beeDistance = Infinity;
      for (const candidate of choices) {
        const toDog = distance(candidate.point, this.goal);
        const toBee = distance(candidate.point, start);
        if (toDog < dogDistance || (toDog === dogDistance && toBee < beeDistance)) {
          best = candidate; dogDistance = toDog; beeDistance = toBee;
        }
      }
      return best;
    }
    field(group, preferred = null, feedback = null, tick = 0) {
      const candidates = this.attacks[group];
      const isAvoided = candidate => (feedback?.get(candidate.key) ?? 0) > tick;
      const avoided = candidates.filter(isAvoided);
      const available = candidates.filter(candidate => !isAvoided(candidate));
      let sources = available.length ? available : candidates;
      if (preferred) sources = [preferred];
      const cacheKey = preferred ? `${group}:target:${preferred.key}` :
        `${group}:choice:${avoided.map(candidate => candidate.key).join(',')}`;
      if (this.fields.has(cacheKey)) return this.fields.get(cacheKey);
      const costs = new Float64Array(this.blocked.length).fill(Infinity);
      const nextStep = new Int32Array(this.blocked.length).fill(-1);
      const owner = new Int32Array(this.blocked.length).fill(-1);
      const heap = [];
      const less = (a, b) => a.cost < b.cost || (a.cost === b.cost && a.id < b.id);
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
      if (sources.length) {
        sources.forEach(candidate => {
          const index = candidates.indexOf(candidate);
          const cost = candidate.penalty + (isAvoided(candidate) ? navigationConfig.ineffectiveAttackPenalty : 0);
          if (cost >= costs[candidate.id]) return;
          costs[candidate.id] = cost; owner[candidate.id] = index;
          push({ id: candidate.id, cost });
        });
      } else {
        const target = this.targets[group];
        costs[target] = 0; push({ id: target, cost: 0 });
      }
      while (heap.length) {
        const current = pop();
        if (current.cost !== costs[current.id]) continue;
        for (const neighbor of this.neighbors(current.id)) {
          const cost = current.cost + distance(this.point(current.id), this.point(neighbor));
          if (cost >= costs[neighbor]) continue;
          costs[neighbor] = cost; nextStep[neighbor] = current.id; owner[neighbor] = owner[current.id];
          push({ id: neighbor, cost });
        }
      }
      this.fieldBuilds++;
      const field = { nextStep, owner };
      this.fields.set(cacheKey, field);
      return field;
    }
    path(start) {
      return this.route(start).path;
    }
    route(start, preferred = null, feedback = null, tick = 0) {
      if (this.clear(start, this.goal)) return { path: [this.goal], attack: null, reachable: true };
      let first = -1, nearest = Infinity;
      const cx = Math.floor(start.x / this.cell), cy = Math.floor(start.y / this.cell);
      for (let y = Math.max(0, cy - navigationConfig.startSearchRadiusCells); y <= Math.min(this.rows - 1, cy + navigationConfig.startSearchRadiusCells); y++) {
        for (let x = Math.max(0, cx - navigationConfig.startSearchRadiusCells); x <= Math.min(this.cols - 1, cx + navigationConfig.startSearchRadiusCells); x++) {
          const id = y * this.cols + x, p = this.point(id), d = distance(start, p);
          // A bee already touching a wall must be able to leave its surface.
          if (!this.blocked[id] && d < nearest && this.clear(start, p, navigationConfig.escapeRayWidth)) { first = id; nearest = d; }
        }
      }
      if (first === -1) return { path: [], attack: null, reachable: false };
      const group = this.component[first];
      const retained = this.attacks[group].find(candidate => candidate.key === preferred?.key &&
        candidate.body === preferred.body && (feedback?.get(candidate.key) ?? 0) <= tick);
      const selected = retained || this.chooseAttack(group, start, feedback, tick);
      const { nextStep, owner } = this.field(group, selected, feedback, tick);
      const attack = this.attacks[group][owner[first]] || null;
      const target = attack?.id ?? this.targets[group];
      const path = [];
      for (let id = first, count = 0; id !== -1 && count < this.blocked.length; id = nextStep[id], count++) {
        path.push(this.point(id));
        if (id === target) break;
      }
      return { path, attack, reachable: group === this.goalGroup };
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
      this.lines = connectedBodies(strokes);
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
          bee.plugin.attack = null;
          bee.plugin.attackFeedback = new Map();
          bee.plugin.impact = {
            count: 0,
            remaining: 0,
            nextTick: impactHash(level.id, this.bees.length, 0) % beeConfig.impactTimingVariants,
            speed: beeConfig.normalSpeed,
            active: false,
            point: null,
            ineffectiveKey: null,
            ineffectiveCount: 0
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
            contacts.set(line, { x: point.x, y: point.y, line });
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
      for (const bee of this.bees) {
        const observation = bee.plugin.impact.observation;
        if (!observation || this.ticks < observation.until) continue;
        const body = observation.body, angle = body.angle - observation.angle;
        const cosine = Math.cos(angle), sine = Math.sin(angle);
        const rx = observation.point.x - observation.position.x;
        const ry = observation.point.y - observation.position.y;
        const moved = {
          x: body.position.x + rx * cosine - ry * sine,
          y: body.position.y + rx * sine + ry * cosine
        };
        const impact = bee.plugin.impact;
        if (bee.plugin.attack?.key === observation.key) {
          if (distance(moved, observation.point) < beeConfig.ineffectiveImpactDistance) {
            impact.ineffectiveCount = impact.ineffectiveKey === observation.key ? impact.ineffectiveCount + 1 : 1;
            impact.ineffectiveKey = observation.key;
            if (impact.ineffectiveCount >= 2) {
              bee.plugin.attackFeedback.set(observation.key, this.ticks + beeConfig.ineffectiveTargetSteps);
              impact.ineffectiveCount = 0;
            }
          } else {
            impact.ineffectiveCount = 0;
            impact.ineffectiveKey = null;
            bee.plugin.attackFeedback.delete(observation.key);
          }
        }
        bee.plugin.impact.observation = null;
      }
      const blocks = [...this.terrain, ...this.lines];
      if (this.ticks % simulationConfig.navigationRefreshSteps === 0) {
        this.navigation = new Navigation(blocks, this.dog.position, this.lines, this.terrain);
        for (const bee of this.bees) {
          const previous = bee.plugin.attack;
          const route = this.navigation.route(bee.position, previous, bee.plugin.attackFeedback, this.ticks);
          const continuingAttack = bee.plugin.pushing && previous && route.attack &&
            route.attack.key === previous.key && route.attack.body === previous.body &&
            distance(route.attack.point, previous.point) < beeConfig.pathArrivalDistance &&
            distance(bee.position, route.attack.point) < beeConfig.retreatDistance + 2 * navigationConfig.cellSize;
          bee.plugin.path = route.path;
          bee.plugin.attack = route.attack;
          bee.plugin.reachable = route.reachable;
          if (route.attack?.key !== previous?.key) {
            bee.plugin.impact.ineffectiveKey = null;
            bee.plugin.impact.ineffectiveCount = 0;
            bee.plugin.pushing = false;
          }
          if (!route.attack && !route.reachable) bee.plugin.pushing = false;
          if (!continuingAttack && (bee.plugin.path.length > 1 || (bee.plugin.path.length === 1 &&
            distance(bee.position, bee.plugin.path[0]) >= beeConfig.pathArrivalDistance))) bee.plugin.pushing = false;
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
          if (bee.plugin.attack?.body === contact.line) impact.observation = {
            body: contact.line, key: bee.plugin.attack.key,
            position: { ...contact.line.position }, angle: contact.line.angle,
            point: { x: contact.x, y: contact.y },
            until: this.ticks + beeConfig.impactObservationSteps
          };
          impact.lastContact = { x: contact.x, y: contact.y };
          let dx = contact.x - bee.position.x, dy = contact.y - bee.position.y;
          let span = Math.hypot(dx, dy);
          if (span < strokeConfig.comparisonEpsilon) {
            dx = bee.velocity.x; dy = bee.velocity.y;
            span = Math.hypot(dx, dy);
          }
          if (span >= strokeConfig.comparisonEpsilon) Body.applyForce(contact.line, impact.lastContact, {
            x: dx / span * beeConfig.impactStrokeForce,
            y: dy / span * beeConfig.impactStrokeForce
          });
        }
        impact.active = !!contact && impact.remaining > 0;
        impact.point = impact.active ? { x: contact.x, y: contact.y } : null;
        const targetSpeed = impact.active ? impact.speed : beeConfig.normalSpeed;
        const propulsion = beeConfig.propulsion * (impact.active ? beeConfig.impactPropulsionMultiplier : 1);
        const path = bee.plugin.path;
        while (path.length > 1 && distance(bee.position, path[0]) < beeConfig.waypointDistance) path.shift();
        // Smooth only collision-free shortcuts; Matter still resolves contact.
        for (let i = Math.min(path.length - 1, beeConfig.shortcutLookahead); i > 0; i--) {
          if (this.navigation.clear(bee.position, path[i])) { path.splice(0, i); break; }
        }
        const target = path[0] || bee.position;
        let dx = target.x - bee.position.x, dy = target.y - bee.position.y;
        const d = Math.hypot(dx, dy) || 1;
        // An unreachable dog is never the steering target. Approach the chosen
        // stroke surface, strike, then pull back before another attempt.
        if (path.length <= 1 && d < beeConfig.pathArrivalDistance &&
          (bee.plugin.attack || bee.plugin.reachable)) bee.plugin.pushing = true;
        if (bee.plugin.pushing) {
          const destination = bee.plugin.attack?.point || this.dog.position;
          dx = destination.x - bee.position.x; dy = destination.y - bee.position.y;
        }
        if (bee.plugin.retreat && this.ticks < bee.plugin.retreat.until) {
          dx = bee.plugin.retreat.point.x - bee.position.x;
          dy = bee.plugin.retreat.point.y - bee.position.y;
        } else bee.plugin.retreat = null;
        const span = Math.hypot(dx, dy) || 1;
        Body.applyForce(bee, bee.position, {
          x: (dx / span * targetSpeed - bee.velocity.x) * bee.mass * propulsion,
          y: (dy / span * targetSpeed - bee.velocity.y) * bee.mass * propulsion - bee.mass * this.engine.gravity.y * this.engine.gravity.scale
        });
        const speed = Math.hypot(bee.velocity.x, bee.velocity.y);
        if (speed > targetSpeed) Body.setVelocity(bee, { x: bee.velocity.x * targetSpeed / speed, y: bee.velocity.y * targetSpeed / speed });
        if (impact.remaining && --impact.remaining === 0 && bee.plugin.attack && impact.lastContact) {
          const awayX = bee.position.x - impact.lastContact.x;
          const awayY = bee.position.y - impact.lastContact.y;
          const away = Math.hypot(awayX, awayY) || 1;
          bee.plugin.retreat = {
            point: { x: bee.position.x + awayX / away * beeConfig.retreatDistance,
              y: bee.position.y + awayY / away * beeConfig.retreatDistance },
            until: this.ticks + beeConfig.retreatSteps
          };
        }
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
    strokeBody, worldPoints, worldStrokePoints, snapStroke, connectedBodies, validateStroke, validatePlan, Editor, Simulation, simulate
  };
});
