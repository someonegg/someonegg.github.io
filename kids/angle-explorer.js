(function (root) {
  const DEG = Math.PI / 180;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const angleBetween = (vertex, a, b) => {
    const ux = a.x - vertex.x, uy = a.y - vertex.y;
    const vx = b.x - vertex.x, vy = b.y - vertex.y;
    return Math.acos(clamp((ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy)), -1, 1)) / DEG;
  };
  const triangleAngles = (a, b, c) => [
    angleBetween(a, b, c), angleBetween(b, a, c), angleBetween(c, a, b),
  ];
  const reflectAcrossLine = (p, a, b) => {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    return { x: 2 * (a.x + t * dx) - p.x, y: 2 * (a.y + t * dy) - p.y };
  };
  const math = { angleBetween, triangleAngles, reflectAcrossLine };
  if (typeof module !== "undefined" && module.exports) module.exports = math;
  if (typeof document === "undefined") return;

  const BLUE = "#246b91", ORANGE = "#b86935", INK = "#233747", GRAY = "#9db2bf";
  const bluePale = "#deedf5", orangePale = "#fae8d7";
  const $ = (id) => document.getElementById(id);
  const pt = (x, y) => ({ x, y });
  const ray = (p, degrees, length) => pt(p.x + Math.cos(degrees * DEG) * length, p.y - Math.sin(degrees * DEG) * length);
  const pathPoint = (p, degrees, radius) => ray(p, degrees, radius);
  const line = (a, b, color = INK, width = 3, dash = "") =>
    `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
  const circle = (p, r, fill, stroke = "none", width = 1, extra = "") =>
    `<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}" ${extra}/>`;
  const label = (p, value, className = "") =>
    `<text x="${p.x}" y="${p.y}" text-anchor="middle" dominant-baseline="middle" class="${className}">${value}</text>`;
  const sector = (p, start, end, radius, fill, opacity = 1) => {
    const a = pathPoint(p, start, radius), b = pathPoint(p, end, radius);
    const largeArc = end - start > 180 ? 1 : 0;
    return `<path d="M ${p.x} ${p.y} L ${a.x} ${a.y} A ${radius} ${radius} 0 ${largeArc} 0 ${b.x} ${b.y} Z" fill="${fill}" opacity="${opacity}"/>`;
  };
  const cornerSector = (p, a, b, radius, fill) => {
    let first = (Math.atan2(p.y - a.y, a.x - p.x) / DEG + 360) % 360;
    let second = (Math.atan2(p.y - b.y, b.x - p.x) / DEG + 360) % 360;
    let span = (second - first + 360) % 360;
    if (span > 180) { [first, second] = [second, first]; span = 360 - span; }
    return sector(p, first, first + span, radius, fill);
  };
  const handle = (p, kind) =>
    `${circle(p, 11, "white", BLUE, 4, `class="handle" data-handle="${kind}"`)}${circle(p, 25, "transparent", "none", 0, `class="handle-hit" data-handle="${kind}"`)}`;
  const rule = (text) => `<strong>${text}</strong>`;

  const scenes = [
    {
      tab: "直角与平角", title: "转动一条边", intro: "角张开的大小，会随着射线转动而变化。",
      prompt: "转到像书角一样方正时，是多少度？转到一条直线时呢？",
      rule: "直角是 90°；平角是 180°。两个直角正好拼成一个平角。",
      question: "两个直角拼在一起，是多少度？", answers: ["90°", "180°", "360°"], correct: 1,
      hint: "拖动蓝色圆点，或移动滑块。",
      default: () => ({ degrees: 65 }),
      controls: (s) => `<label for="angle-range">转动射线<input id="angle-range" type="range" min="0" max="180" step="1" value="${s.degrees}" aria-label="角的大小"><span class="value" id="range-value">${s.degrees}°</span></label>`,
      draw(s) {
        const o = pt(290, 280), moving = ray(o, s.degrees, 190);
        return sector(o, 0, s.degrees, 96, bluePale) +
          line(o, ray(o, 0, 225), INK, 4) + line(o, ray(o, 90, 210), GRAY, 2, "6 7") +
          line(o, ray(o, 180, 210), GRAY, 2, "6 7") + line(o, moving, BLUE, 5) +
          circle(o, 5, INK) + handle(moving, "angle") +
          label(pt(440, 314), "0°", "small") + label(pt(270, 56), "90° 直角", "small") +
          label(pt(75, 314), "180° 平角", "small") +
          label(pt(320, 378), `${s.degrees}°`, "large blue-text");
      },
      description: (s) => `一条固定的水平射线和一条可转动射线组成 ${s.degrees} 度的角。虚线标出 90 度和 180 度方向。`,
    },
    {
      tab: "邻补角与对顶角", title: "两条直线相交", intro: "观察相邻的角与面对面的角，看看谁会一起变化。",
      prompt: "转动蓝色圆点：面对面的两个角会一样大吗？挨着的两个角加起来是多少？",
      rule: "面对面的对顶角相等；挨着且合成一条直线的邻补角，和是 180°。",
      question: "一个角是 55°，它的对顶角是多少度？", answers: ["55°", "90°", "125°"], correct: 0,
      hint: "拖动蓝色圆点，或移动滑块。",
      default: () => ({ degrees: 62 }),
      controls: (s) => `<label for="cross-range">转动直线<input id="cross-range" type="range" min="30" max="150" step="1" value="${s.degrees}" aria-label="相交直线的角度"><span class="value" id="range-value">${s.degrees}°</span></label>`,
      draw(s) {
        const o = pt(320, 225), d = s.degrees, moving = ray(o, d, 200);
        return sector(o, 0, d, 73, bluePale) + sector(o, d, 180, 73, orangePale) +
          sector(o, 180, 180 + d, 73, bluePale) + sector(o, 180 + d, 360, 73, orangePale) +
          line(ray(o, 0, 240), ray(o, 180, 240), INK, 4) +
          line(ray(o, d, 215), ray(o, d + 180, 215), BLUE, 4) + circle(o, 5, INK) +
          handle(moving, "cross") +
          label(ray(o, d / 2, 111), `${d}°`, "blue-text") +
          label(ray(o, 180 + d / 2, 111), `${d}°`, "blue-text") +
          label(ray(o, (d + 180) / 2, 120), `${180 - d}°`, "orange-text") +
          label(ray(o, (d + 540) / 2, 120), `${180 - d}°`, "orange-text") +
          label(pt(320, 416), `${d}° + ${180 - d}° = 180°`, "large");
      },
      description: (s) => `两条直线相交。相对的蓝色角都是 ${s.degrees} 度；相邻的橙色角是 ${180 - s.degrees} 度。`,
    },
    {
      tab: "三角形内角和", title: "三角形的三个角", intro: "改变形状，再把三个角拼成一条直线。",
      prompt: "拖动上面的顶点。三角形变瘦或变宽时，三个角的总和会变吗？",
      rule: "三个内角可以拼成一个平角，所以三角形内角和是 180°。显示的单个角度是近似测量值。",
      question: "三角形有两个角是 50° 和 60°，第三个角是多少度？", answers: ["60°", "70°", "80°"], correct: 1,
      hint: "拖动蓝色顶点，或分别移动左右滑块。点击“拼起三个角”看理由。",
      default: () => ({ x: 320, y: 105, assembled: false }),
      controls: (s) => `<label for="triangle-x">顶点左右<input id="triangle-x" type="range" min="170" max="470" step="1" value="${s.x}" aria-label="三角形顶点左右位置"><span class="value" id="triangle-x-value">${Math.round(s.x)}</span></label><label for="triangle-y">顶点高低<input id="triangle-y" type="range" min="70" max="245" step="1" value="${s.y}" aria-label="三角形顶点高低位置"><span class="value" id="triangle-y-value">${Math.round(s.y)}</span></label><button type="button" data-action="assemble">${s.assembled ? "收起拼角" : "拼起三个角"}</button>`,
      draw(s) {
        const a = pt(110, 285), b = pt(530, 285), c = pt(s.x, s.y), angles = triangleAngles(a, b, c);
        let body = `<polygon points="${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}" fill="#f8fbfd" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
          cornerSector(a, b, c, 45, bluePale) + cornerSector(b, a, c, 45, orangePale) + cornerSector(c, a, b, 42, "#e8e3f3") +
          circle(a, 5, INK) + circle(b, 5, INK) + handle(c, "triangle") +
          label(pt(a.x + 61, a.y - 28), `${angles[0].toFixed(1)}°`, "small blue-text") +
          label(pt(b.x - 63, b.y - 28), `${angles[1].toFixed(1)}°`, "small orange-text") +
          label(pt(c.x, c.y + 66), `${angles[2].toFixed(1)}°`, "small");
        if (s.assembled) {
          const o = pt(320, 408), [aa, bb] = angles;
          body += line(pt(164, 408), pt(476, 408), INK, 3) +
            sector(o, 0, aa, 41, bluePale) + sector(o, aa, aa + bb, 41, orangePale) +
            sector(o, aa + bb, 180, 41, "#e8e3f3") +
            label(pt(320, 350), "三个角拼成 180°", "small");
        } else body += label(pt(320, 387), "先猜：三个角能拼成什么？", "small");
        return body;
      },
      description: (s) => {
        const angles = triangleAngles(pt(110, 285), pt(530, 285), pt(s.x, s.y));
        return `三角形三个内角约为 ${angles.map((n) => n.toFixed(1)).join("、")} 度；精确的内角和为 180 度。${s.assembled ? "下方已将三个角拼成平角。" : "可以点击拼起三个角。"}`;
      },
    },
    {
      tab: "矩形折角", title: "折起矩形的一个角", intro: "看折痕起点：两个角翻折时会重合，还剩下一个角。",
      prompt: "把右上角折下来。折痕两边的两个小角有什么关系？剩下的角怎么求？",
      rule: "折前的①翻到折后的①上，两个小角重合，所以相等。两个①与剩下的②拼成平角，①＋①＋②＝180°。",
      question: "两个重合的角各是 30°，剩下的角是多少度？", answers: ["30°", "120°", "150°"], correct: 1,
      hint: "移动滑块改变折痕起点；点击按钮折起或展开右上角。",
      default: () => ({ creaseX: 270, folded: false }),
      controls: (s) => `<label for="crease-range">折痕起点<input id="crease-range" type="range" min="240" max="330" step="1" value="${s.creaseX}" aria-label="折痕在矩形上边的起点"><span class="value" id="crease-value">${s.creaseX}</span></label><button type="button" data-action="flip">${s.folded ? "展开角" : "折起角"}</button>`,
      draw(s) {
        const leftTop = pt(95, 100), corner = pt(540, 100), rightBottom = pt(540, 390), leftBottom = pt(95, 390);
        const creaseStart = pt(s.creaseX, 100), creaseEnd = pt(540, 260);
        const foldedCorner = reflectAcrossLine(corner, creaseStart, creaseEnd);
        const small = angleBetween(creaseStart, corner, creaseEnd);
        const shownSmall = Number(small.toFixed(1));
        const shownRemaining = (180 - 2 * shownSmall).toFixed(1);
        const poly = (points, fill, stroke, dash = "") => `<polygon points="${points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
        let body = s.folded
          ? poly([leftTop, creaseStart, creaseEnd, rightBottom, leftBottom], "#f5f9fc", INK) +
            poly([creaseStart, foldedCorner, creaseEnd], orangePale, ORANGE) +
            line(creaseStart, corner, GRAY, 2, "6 6") + line(corner, creaseEnd, GRAY, 2, "6 6")
          : poly([leftTop, corner, rightBottom, leftBottom], "#f5f9fc", INK) +
            poly([creaseStart, corner, creaseEnd], orangePale, ORANGE);
        body += line(creaseStart, creaseEnd, BLUE, 3, "8 6") + circle(creaseStart, 5, INK) +
          label(pt(160, 72), "矩形纸片", "small") +
          label(pt(creaseStart.x + 115, 72), "折痕起点", "small") +
          label(pt(445, 285), s.folded ? "折下来的角" : "右上角", "small");
        if (s.folded) {
          body += `<g class="folded-shape">` +
            sector(creaseStart, 180, 360 - 2 * small, 62, "#e8e3f3") +
            sector(creaseStart, 360 - 2 * small, 360 - small, 62, bluePale) +
            sector(creaseStart, 360 - small, 360, 62, orangePale) +
            line(creaseStart, foldedCorner, ORANGE, 3) +
            label(ray(creaseStart, 270 - small, 100), "②", "small") +
            label(ray(creaseStart, 360 - 1.5 * small, 102), "①", "small blue-text") +
            label(ray(creaseStart, 360 - 0.5 * small, 110), "①", "small orange-text") +
            label(pt(320, 426), `两个①重合；①≈${shownSmall}°，②≈${shownRemaining}°`, "small") +
            `</g>`;
        } else body += label(pt(320, 426), "先猜：折起后会出现哪三个角？", "small");
        return body;
      },
      description: (s) => {
        const start = pt(s.creaseX, 100), end = pt(540, 260), small = angleBetween(start, pt(540, 100), end);
        return s.folded
          ? `矩形右上角已经折下。折前的①翻到折后的①上，两个小角重合。①约 ${small.toFixed(1)} 度；②是剩下的角，三个角合成 180 度。`
          : "矩形右上角可以沿蓝色折痕折下来。折痕起点在矩形上边。";
      },
    },
  ];

  const states = scenes.map((scene) => scene.default());
  const revealed = scenes.map(() => false);
  const chosen = scenes.map(() => null);
  let active = 0, dragging = null;
  const svg = $("stage");
  function renderDrawing() {
    const scene = scenes[active], s = states[active];
    $("drawing").innerHTML = scene.draw(s);
    $("stage-description").textContent = scene.description(s);
    const value = $("range-value");
    if (value) value.textContent = `${s.degrees}°`;
    if ($("triangle-x-value")) $("triangle-x-value").textContent = Math.round(s.x);
    if ($("triangle-y-value")) $("triangle-y-value").textContent = Math.round(s.y);
    if ($("crease-value")) $("crease-value").textContent = s.creaseX;
    const action = $("controls").querySelector("[data-action]");
    if (action?.dataset.action === "assemble") action.textContent = s.assembled ? "收起拼角" : "拼起三个角";
    if (action?.dataset.action === "flip") action.textContent = s.folded ? "展开角" : "折起角";
  }
  function renderScene() {
    const scene = scenes[active], s = states[active];
    $("scene-tabs").innerHTML = scenes.map((item, i) =>
      `<button type="button" data-scene="${i}" ${i === active ? 'aria-current="step"' : ""}>${item.tab}</button>`).join("");
    $("scene-count").textContent = `第 ${active + 1} / ${scenes.length} 站`;
    $("scene-title").textContent = scene.title;
    $("scene-intro").textContent = scene.intro;
    $("prompt").textContent = scene.prompt;
    $("rule").innerHTML = revealed[active] ? rule(scene.rule) : "动手观察后，再点“看规律”。";
    $("reveal").disabled = revealed[active];
    $("question").textContent = scene.question;
    $("answers").innerHTML = scene.answers.map((answer, i) =>
      `<button type="button" data-answer="${i}" aria-pressed="${chosen[active] === i}">${answer}</button>`).join("");
    updateFeedback();
    $("controls").innerHTML = scene.controls(s) + '<button type="button" data-action="reset">重置图形</button>';
    $("control-hint").textContent = scene.hint;
    $("previous").disabled = active === 0;
    $("next").disabled = active === scenes.length - 1;
    renderDrawing();
  }
  function updateFeedback() {
    const feedback = $("feedback"), answer = chosen[active];
    feedback.className = "feedback";
    if (answer === null) { feedback.textContent = "先自己想一想，再选答案。"; return; }
    if (answer === scenes[active].correct) {
      feedback.classList.add("correct");
      feedback.textContent = "答对了！再看看图形里的理由。";
    } else {
      feedback.classList.add("try-again");
      feedback.textContent = "再试一次。想想角是怎样拼成或重合的。";
    }
  }
  function switchTo(index) { active = clamp(index, 0, scenes.length - 1); dragging = null; renderScene(); }
  $("scene-tabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-scene]");
    if (button) switchTo(Number(button.dataset.scene));
  });
  $("previous").addEventListener("click", () => switchTo(active - 1));
  $("next").addEventListener("click", () => switchTo(active + 1));
  $("reveal").addEventListener("click", () => { revealed[active] = true; renderScene(); });
  $("answers").addEventListener("click", (event) => {
    const button = event.target.closest("[data-answer]");
    if (!button) return;
    chosen[active] = Number(button.dataset.answer);
    $("answers").querySelectorAll("button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    updateFeedback();
  });
  $("controls").addEventListener("input", (event) => {
    const s = states[active], n = Number(event.target.value);
    if (event.target.id === "angle-range" || event.target.id === "cross-range") s.degrees = n;
    if (event.target.id === "triangle-x") s.x = n;
    if (event.target.id === "triangle-y") s.y = n;
    if (event.target.id === "crease-range") s.creaseX = n;
    renderDrawing();
  });
  $("controls").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const s = states[active];
    if (button.dataset.action === "reset") {
      states[active] = scenes[active].default();
      renderScene();
    } else if (button.dataset.action === "assemble") s.assembled = !s.assembled;
    else if (button.dataset.action === "flip") s.folded = !s.folded;
    renderDrawing();
  });
  function localPoint(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  }
  svg.addEventListener("pointerdown", (event) => {
    const handleTarget = event.target.closest("[data-handle]");
    if (!handleTarget) return;
    dragging = handleTarget.dataset.handle;
    svg.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  svg.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const p = localPoint(event);
    if (!p) return;
    const s = states[active];
    if (dragging === "triangle") {
      s.x = Math.round(clamp(p.x, 170, 470));
      s.y = Math.round(clamp(p.y, 70, 245));
      $("triangle-x").value = s.x;
      $("triangle-y").value = s.y;
    } else {
      const center = dragging === "cross" ? pt(320, 225) : pt(290, 280);
      const signed = Math.atan2(center.y - p.y, p.x - center.x) / DEG;
      const degrees = signed < 0 ? (p.x < center.x ? 180 : 0) : signed;
      s.degrees = Math.round(clamp(degrees, dragging === "cross" ? 30 : 0, dragging === "cross" ? 150 : 180));
      $(dragging === "cross" ? "cross-range" : "angle-range").value = s.degrees;
    }
    renderDrawing();
  });
  const stopDrag = () => { dragging = null; };
  svg.addEventListener("pointerup", stopDrag);
  svg.addEventListener("pointercancel", stopDrag);
  svg.addEventListener("lostpointercapture", stopDrag);
  renderScene();
})(globalThis);
