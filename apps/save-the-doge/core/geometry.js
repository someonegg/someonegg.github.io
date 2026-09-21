(function (root, factory) {
  const config = typeof module === 'object' && module.exports
    ? require('../game-config.js')
    : root.SaveTheDoge.config;
  const api = factory(config);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SaveTheDoge || (root.SaveTheDoge = {})).geometry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (config) {
  'use strict';
  const { world, stroke } = config;

  const clone = value => JSON.parse(JSON.stringify(value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const length = points => points.slice(1).reduce((sum, point, index) => sum + distance(points[index], point), 0);
  const inkUsed = strokes => strokes.reduce((sum, item) => sum + length(item.points), 0);

  function viewTransform(width, height) {
    const scale = Math.min(width / world.width, height / world.height);
    return { scale, x: (width - world.width * scale) / 2, y: height - world.height * scale };
  }

  function viewPoint(view, point) {
    return { x: point.x * view.scale + view.x, y: point.y * view.scale + view.y };
  }

  function worldPoint(view, point) {
    return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
  }

  function pointSegmentDistance(point, start, end) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const denominator = dx * dx + dy * dy || 1;
    const ratio = ((point.x - start.x) * dx + (point.y - start.y) * dy) / denominator;
    const t = Math.max(0, Math.min(1, ratio));
    return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
  }

  function simplify(points, tolerance = stroke.simplifyTolerance) {
    if (points.length <= 2) return clone(points);
    let maximumDistance = 0, splitIndex = 0;
    for (let index = 1; index < points.length - 1; index++) {
      const candidateDistance = pointSegmentDistance(points[index], points[0], points.at(-1));
      if (candidateDistance > maximumDistance) {
        maximumDistance = candidateDistance;
        splitIndex = index;
      }
    }
    if (maximumDistance <= tolerance) return [clone(points[0]), clone(points.at(-1))];
    return simplify(points.slice(0, splitIndex + 1), tolerance).slice(0, -1)
      .concat(simplify(points.slice(splitIndex), tolerance));
  }

  function appendPoint(points, point, budget) {
    const previous = points.at(-1);
    if (!previous) return { points: [point], exhausted: false };
    const available = Math.max(0, budget - length(points));
    const span = distance(previous, point);
    if (span < stroke.segmentEpsilon) return { points, exhausted: available < stroke.segmentEpsilon };
    const fraction = Math.min(1, available / span);
    const end = {
      x: previous.x + (point.x - previous.x) * fraction,
      y: previous.y + (point.y - previous.y) * fraction
    };
    return { points: fraction > 0 ? points.concat(end) : points, exhausted: span >= available };
  }

  // Resample between protected corners, then smooth once from the raw gesture.
  // Splitting simplification at corners keeps small hooks and support vertices.
  function normalizeStroke(points) {
    const raw = points.filter((point, index) => !index || distance(point, points[index - 1]) > stroke.comparisonEpsilon);
    if (raw.length < 3) return clone(raw);
    const corners = [0];
    for (let index = 1; index < raw.length - 1; index++) {
      const previous = raw[index - 1], point = raw[index], next = raw[index + 1];
      const cosine = ((point.x - previous.x) * (next.x - point.x) + (point.y - previous.y) * (next.y - point.y)) /
        (distance(previous, point) * distance(point, next));
      if (cosine <= stroke.cornerCosine + stroke.comparisonEpsilon) corners.push(index);
    }
    corners.push(raw.length - 1);

    const result = [];
    for (let corner = 1; corner < corners.length; corner++) {
      const start = corners[corner - 1], end = corners[corner];
      const samples = [clone(raw[start])];
      let remaining = stroke.sampleSpacing;
      for (let index = start + 1; index <= end; index++) {
        const point = raw[index], previous = raw[index - 1], span = distance(point, previous);
        for (let along = remaining; along < span - stroke.comparisonEpsilon; along += stroke.sampleSpacing) {
          samples.push({
            x: previous.x + (point.x - previous.x) * along / span,
            y: previous.y + (point.y - previous.y) * along / span
          });
        }
        remaining = ((remaining - span) % stroke.sampleSpacing + stroke.sampleSpacing) % stroke.sampleSpacing;
        if (remaining < stroke.comparisonEpsilon) {
          samples.push(clone(point));
          remaining = stroke.sampleSpacing;
        }
      }
      if (distance(samples.at(-1), raw[end]) > stroke.comparisonEpsilon) samples.push(clone(raw[end]));
      const smoothed = samples.map((point, index) => {
        if (!index || index === samples.length - 1) return point;
        const dx = (samples[index - 1].x - 2 * point.x + samples[index + 1].x) / stroke.smoothingDivisor;
        const dy = (samples[index - 1].y - 2 * point.y + samples[index + 1].y) / stroke.smoothingDivisor;
        const factor = Math.min(1, stroke.simplifyTolerance / (Math.hypot(dx, dy) || 1));
        return { x: point.x + dx * factor, y: point.y + dy * factor };
      });
      result.push(...simplify(smoothed).slice(corner === 1 ? 0 : 1));
    }
    return result;
  }

  function trimStroke(points, budget) {
    if (!points.length) return { points: [], exhausted: false };
    const trimmed = [clone(points[0])];
    let remaining = Math.max(0, budget);
    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1], end = points[index], span = distance(start, end);
      if (span <= stroke.comparisonEpsilon) continue;
      if (span >= remaining) {
        if (remaining > stroke.comparisonEpsilon) {
          trimmed.push({
            x: start.x + (end.x - start.x) * remaining / span,
            y: start.y + (end.y - start.y) * remaining / span
          });
        }
        return { points: trimmed, exhausted: true };
      }
      trimmed.push(clone(end));
      remaining -= span;
    }
    return { points: trimmed, exhausted: false };
  }

  return {
    clone, distance, length, inkUsed,
    viewTransform, viewPoint, worldPoint, pointSegmentDistance,
    simplify, appendPoint, normalizeStroke, trimStroke
  };
});
