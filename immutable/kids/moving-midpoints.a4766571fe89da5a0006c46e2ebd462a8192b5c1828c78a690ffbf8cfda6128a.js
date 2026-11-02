const $ = (id) => document.getElementById(id),
  slider = $("time");
let playing = false,
  last = null,
  frame = null;
const fmt = (n) => Number(n.toFixed(2)).toString().replace("-", "−");
const line = (x1, y1, x2, y2, c, w = 2, extra = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${extra}/>`;
const txt = (x, y, s, size = 18, anchor = "middle") =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}">${s}</text>`;
function render() {
  const t = +slider.value,
    m = -2 - 7 * t,
    e = t,
    n = 8 + 10 * t,
    p = -1 - 3 * t,
    q = 4 + 5 * t,
    mn = n - m,
    oe = t,
    pq = q - p,
    d = mn - oe;
  $("timeValue").value = t.toFixed(2);
  $("difference").textContent = fmt(d);
  $("pq").textContent = fmt(pq);
  $("ratio").textContent = "2";
  const fixed = $("fixed").checked,
    lo = fixed ? -80 : m - 8,
    hi = fixed ? 120 : n + 8;
  const X = (v) => 70 + ((v - lo) / (hi - lo)) * 860;
  let a = line(45, 185, 960, 185, "#657161");
  a += '<path d="M950 179 L962 185 L950 191" fill="none" stroke="#657161"/>';
  const step = fixed ? 20 : Math.max(1, Math.ceil((hi - lo) / 10 / 5) * 5);
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step)
    a += line(X(v), 181, X(v), 191, "#657161") + txt(X(v), 212, v, 15);
  for (const [name, v, dy] of [
    ["A", -2, 244],
    ["O", 0, 273],
    ["B", 8, 302],
  ])
    a +=
      line(X(v), 185, X(v), dy - 18, "#a1af99", 1, 'stroke-dasharray="3 4"') +
      `<circle cx="${X(v)}" cy="185" r="5" fill="#fffefb" stroke="#657161"/>` +
      txt(X(v), dy, `${name} ${v}`, 16);
  a +=
    line(X(m), 75, X(e), 75, "#3e7563", 5) +
    line(X(0), 135, X(n), 135, "#a96232", 5);
  for (const [name, v, y, c, ty] of [
    ["M", m, 75, "#3e7563", 42],
    ["P", p, 75, "#3e7563", 20],
    ["E", e, 75, "#3e7563", 42],
    ["Q", q, 135, "#a96232", 165],
    ["N", n, 135, "#a96232", 109],
  ])
    a +=
      line(X(v), y, X(v), 185, c, 1, 'stroke-dasharray="3 4"') +
      `<circle cx="${X(v)}" cy="${y}" r="7" fill="${c}"/>` +
      txt(
        X(v) + (name === "M" ? -10 : name === "E" ? 10 : 0),
        ty,
        `${name} ${fmt(v)}`,
        18,
        name === "M" ? "end" : name === "E" ? "start" : "middle",
      );
  $("axis").innerHTML = a;
  $("axis").setAttribute(
    "aria-label",
    `t=${fmt(t)}秒，M=${fmt(m)}，P=${fmt(p)}，E=${fmt(e)}，Q=${fmt(q)}，N=${fmt(n)}`,
  );
  const scale = 770 / ($("fixed").checked ? 180 : mn),
    start = 175,
    rect = (x, y, w, c, stroke = "none") =>
      `<rect x="${x}" y="${y}" width="${Math.max(0, w)}" height="32" rx="3" fill="${c}" stroke="${stroke}"/>`;
  let b =
    txt(155, 49, "MN", 19, "end") +
    rect(start, 26, mn * scale, "#e4ecdf") +
    rect(start + d * scale, 26, oe * scale, "url(#hatch)", "#a96232") +
    txt(start, 83, `总长 ${fmt(mn)}；扣掉右端 OE = ${fmt(oe)}`, 17, "start");
  b +=
    '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" stroke="#a96232" stroke-width="2"/></pattern></defs>';
  for (const [y, label] of [
    [117, "MN − OE"],
    [213, "PQ + PQ"],
  ]) {
    b +=
      txt(155, y + 24, label, 19, "end") +
      rect(start, y, pq * scale, "#3e7563") +
      rect(start + pq * scale, y, pq * scale, "#3e7563") +
      line(start + pq * scale, y - 5, start + pq * scale, y + 37, "#fffefb", 3);
  }
  b +=
    txt(start, 175, `剩余 ${fmt(d)}，平分后每段 ${fmt(pq)}`, 17, "start") +
    txt(start, 273, `${fmt(pq)} + ${fmt(pq)} = ${fmt(d)}`, 17, "start");
  $("bars").innerHTML = b;
}
function pause() {
  playing = false;
  last = null;
  cancelAnimationFrame(frame);
  $("play").textContent = "播放";
  $("play").setAttribute("aria-pressed", "false");
}
function tick(now) {
  if (!playing) return;
  if (last !== null)
    slider.value = Math.min(10, +slider.value + ((now - last) / 1000) * 0.6);
  last = now;
  render();
  if (+slider.value >= 10) {
    pause();
    return;
  }
  frame = requestAnimationFrame(tick);
}
$("play").onclick = () => {
  if (playing) {
    pause();
    return;
  }
  if (+slider.value >= 10) slider.value = 0;
  playing = true;
  last = null;
  $("play").textContent = "暂停";
  $("play").setAttribute("aria-pressed", "true");
  frame = requestAnimationFrame(tick);
};
$("fixed").onchange = render;
$("reset").onclick = () => {
  pause();
  slider.value = 0;
  render();
};
slider.oninput = () => {
  pause();
  render();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
render();
