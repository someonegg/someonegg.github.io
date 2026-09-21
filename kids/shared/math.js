/* Shared pure models; also loaded by the Node regression tests. */
(function (root) {
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const progress = (time, start, duration = 1) =>
    clamp((time - start) / duration);
  const ease = (t) => t * t * (3 - 2 * t);
  const fmt = (n) =>
    Number(n.toPrecision(12)).toLocaleString("zh-CN", {
      maximumFractionDigits: 12,
      useGrouping: false,
    });
  function animals(heads, legs) {
    if (
      !Number.isInteger(heads) ||
      heads < 1 ||
      heads > 50 ||
      !Number.isInteger(legs) ||
      legs % 2 ||
      legs < heads * 2 ||
      legs > heads * 4
    )
      throw Error(
        "头数须为 1–50 的整数；脚数须为偶数，并在头数的 2 倍到 4 倍之间。",
      );
    return {
      heads,
      legs,
      rabbits: (legs - heads * 2) / 2,
      chickens: (heads * 4 - legs) / 2,
    };
  }
  function layouts(n) {
    if (!Number.isInteger(n) || n < 4 || n > 144)
      throw Error("请输入 4–144 的整数。");
    return Array.from({ length: Math.floor(Math.sqrt(n)) }, (_, i) => i + 1)
      .filter((a) => n % a === 0)
      .map((a) => ({
        rows: a,
        cols: n / a,
        perimeter: 2 * (a + n / a),
        shared: a * (n / a - 1) + ((a - 1) * n) / a,
      }));
  }
  function edges(n) {
    if (!Number.isInteger(n) || n < 2 || n > 35)
      throw Error("点数须为 2–35 的整数。");
    return Array.from({ length: n }, (_, b) =>
      Array.from({ length: b }, (_, a) => [a, b]),
    ).flat();
  }
  function convert(value, dimension, from, to) {
    if (!Number.isFinite(value) || value <= 0 || value > 1000000)
      throw Error("请输入大于 0、不超过 1000000 的数。");
    if (
      ![2, 3].includes(dimension) ||
      ![0, 1, 2].includes(from) ||
      ![0, 1, 2].includes(to)
    )
      throw Error("请选择有效单位。");
    return value * 10 ** ((to - from) * dimension);
  }
  const polygonArea = (points) =>
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0),
    ) / 2;
  const api = {
    clamp,
    progress,
    ease,
    fmt,
    animals,
    layouts,
    edges,
    convert,
    polygonArea,
  };
  if (typeof module !== "undefined") module.exports = api;
  else root.KidsMath = api;
})(globalThis);
