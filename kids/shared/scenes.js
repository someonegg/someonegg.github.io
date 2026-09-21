(function (root) {
  const M = root.KidsMath,
    { progress: P, ease: E, fmt } = M;
  const blue = "#246b91",
    pale = "#deedf5",
    orange = "#be652e",
    light = "#f7dfc9",
    ink = "#233747",
    gray = "#cbd9e2";
  const line = (x1, y1, x2, y2, color = gray, width = 2, extra = "") =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${extra}/>`;
  const text = (x, y, s, cls = "", extra = "") =>
    `<text x="${x}" y="${y}" text-anchor="middle" class="${cls}" ${extra}>${s}</text>`;
  const rect = (x, y, w, h, fill = pale, extra = "") =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${extra}/>`;
  const poly = (points, fill, extra = "") =>
    `<polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="${fill}" ${extra}/>`;
  const svg = (body, w = 640, h = 390, label = "教学演示") =>
    `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  const step = (title, body) => ({ title, body });
  const input = (id, label, value, min, max) =>
    `<label>${label}<input id="${id}" type="number" value="${value}" min="${min}" max="${max}" step="1" required></label>`;
  const presets = (items) =>
    `<div class="presets">${items.map(([value, label]) => `<button type="button" data-preset="${value}">${label}</button>`).join("")}</div>`;
  const fractionPieces = {
    diamond: {
      cols: 2,
      rows: 4,
      answer: 1 / 4,
      label: "1/4",
      pieces: [
        {
          points: [
            [60, 60],
            [60, 120],
            [0, 120],
          ],
        },
        {
          points: [
            [0, 120],
            [60, 120],
            [60, 180],
          ],
        },
        {
          points: [
            [60, 60],
            [120, 120],
            [60, 120],
          ],
          pivot: [60, 120],
          angle: 90,
          move: [-60, -60],
        },
        {
          points: [
            [60, 120],
            [120, 120],
            [60, 180],
          ],
          pivot: [60, 120],
          angle: -90,
          move: [-60, 60],
        },
      ],
    },
    corners: {
      cols: 4,
      rows: 3,
      answer: 1 / 6,
      label: "1/6",
      pieces: [
        {
          points: [
            [0, 120],
            [60, 180],
            [0, 180],
          ],
        },
        {
          points: [
            [240, 120],
            [240, 180],
            [180, 180],
          ],
        },
        {
          points: [
            [0, 0],
            [60, 0],
            [0, 60],
          ],
          pivot: [30, 30],
          angle: 90,
          move: [0, 120],
        },
        {
          points: [
            [180, 0],
            [240, 0],
            [240, 60],
          ],
          pivot: [210, 30],
          angle: -90,
          move: [0, 120],
        },
      ],
    },
  };
  function transformPiece(piece, p) {
    if (!piece.move) return piece.points;
    const a = (piece.angle * p * Math.PI) / 180,
      [cx, cy] = piece.pivot;
    return piece.points.map(([x, y]) => [
      cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a) + piece.move[0] * p,
      cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a) + piece.move[1] * p,
    ]);
  }
  const lessons = {
    chicken: {
      title: "鸡兔同笼",
      intro: "每补上两只脚，就找到一只兔子。一起把“假设”变成看得见的过程。",
      controls:
        input("heads", "头数", 10, 1, 50) +
        input("legs", "脚数", 32, 2, 200),
      read: () =>
        M.animals(
          Number(document.querySelector("#heads").value),
          Number(document.querySelector("#legs").value),
        ),
      steps: (s) => [
        step(
          "先看题目",
          `笼子里有 ${s.heads} 个头、${s.legs} 只脚。先想一想：如果它们都是鸡呢？`,
        ),
        step(
          "先都当成鸡",
          `每个头配两只脚，一共有 ${s.heads} × 2 = ${s.heads * 2} 只脚。这里的鸡只是我们的假设。`,
        ),
        step(
          "还缺多少只脚",
          `实际有 ${s.legs} 只脚，还需要补 ${s.legs} − ${s.heads * 2} = ${s.rabbits * 2} 只。把它们两只一组摆好。`,
        ),
        step(
          "一组脚，换一只兔",
          `每补两只脚，一只“鸡”就变成四只脚的兔子。${s.rabbits * 2} ÷ 2 = ${s.rabbits}，所以有 ${s.rabbits} 只兔子。`,
        ),
        step(
          "数一数，再验算",
          `兔子 ${s.rabbits} 只，鸡 ${s.chickens} 只。头数：${s.rabbits} + ${s.chickens} = ${s.heads}；脚数：${s.rabbits} × 4 + ${s.chickens} × 2 = ${s.legs}。`,
        ),
      ],
      render(s, t) {
        const cols = Math.min(
            s.heads,
            (root.innerWidth || 1280) < 600 ? 5 : 10,
          ),
          rows = Math.ceil(s.heads / cols),
          width = Math.max(360, cols * 62 + 32),
          height = rows * 88 + 130;
        let body = "";
        const assigned = Math.min(
          s.rabbits,
          Math.floor(P(t, 2) * s.rabbits + 1e-8),
        );
        for (let i = 0; i < s.heads; i++) {
          const x = width / 2 - (cols - 1) * 31 + (i % cols) * 62,
            y = 47 + Math.floor(i / cols) * 88;
          const q = E(M.clamp(P(t, 2) * s.rabbits - i)),
            rabbit = q >= 1,
            base = E(M.clamp(t * cols - (i % cols)));
          body += `<g transform="translate(${x} ${y})">`;
          body += `<ellipse cx="0" cy="0" rx="19" ry="20" fill="${rabbit ? light : pale}" stroke="${rabbit ? orange : blue}" stroke-width="2"/>`;
          if (rabbit)
            body += `<ellipse cx="-7" cy="-25" rx="4" ry="12" fill="${light}" stroke="${orange}"/><ellipse cx="7" cy="-25" rx="4" ry="12" fill="${light}" stroke="${orange}"/>`;
          else
            body += poly(
              [
                [18, -4],
                [27, 0],
                [18, 4],
              ],
              blue,
            );
          body += `<circle cx="7" cy="-5" r="2" fill="${ink}"/>`;
          body +=
            line(-8, 18, -8, 18 + 16 * base, blue, 4) +
            line(7, 18, 7, 18 + 16 * base, blue, 4);
          body += text(0, 56, i + 1, "small");
          if (i < s.rabbits) {
            const visible = P(t, 1),
              dy = (1 - q) * 22;
            body += `<g opacity="${visible}" transform="translate(0 ${dy})">${line(-17, 15, -17, 32, orange, 4)}${line(16, 15, 16, 32, orange, 4)}</g>`;
          }
          body += "</g>";
        }
        body += text(
          width / 2,
          height - 36,
          t < 1
            ? "先给每个头配两只脚"
            : t < 2
              ? "蓝色：假设每只都是鸡"
              : t < 3
                ? "橙色：每组补上的两只脚"
                : "头数不变，脚数补齐",
          "",
        );
        return {
          svg: svg(
            body,
            width,
            height,
            "鸡兔同笼：按每组两只脚补成兔子",
          ).replace("<svg ", '<svg style="max-height:none" '),
          minWidth: 0,
          readout:
            t < 1
              ? `${s.heads} 个头 · ${s.legs} 只脚`
              : t < 2
                ? `先配 ${s.heads * 2} 只脚，还缺 ${s.rabbits * 2} 只`
                : t < 3
                  ? `已找到 ${assigned} 只兔子 · 已补 ${assigned * 2} 只脚`
                  : `${s.chickens} 只鸡 ＋ ${s.rabbits} 只兔 ＝ ${s.heads} 个头`,
        };
      },
      legend:
        "蓝色脚表示最初的两只脚；橙色脚表示后来补上的一对。动物下方是编号。",
    },
    fraction: {
      title: "分数：把碎片拼完整",
      intro: "只移动，不增减。看清涂色面积为什么始终不变。",
      controls:
        '<label>例题<select id="shape"><option value="circle">同心圆</option><option value="diamond">中间的菱形</option><option value="corners">分散的角落</option></select></label>',
      read: () => ({ shape: document.querySelector("#shape").value }),
      steps: (s) => [
        step(
          "先认清整个图形",
          "外边框内的整个图形是“1”。我们要找的是涂色部分占整个图形的几分之几。",
        ),
        step(
          "找到可以搬动的碎片",
          s.shape === "circle"
            ? "圆被分成 8 个相同扇形。橙色外环碎片可以绕圆心转动。内外片本身不必一样大。"
            : "每个格子大小相同。三角形是半个格子；橙色碎片将移动，蓝色碎片留在原处。",
        ),
        step(
          "搬过去，拼完整",
          "跟着橙色碎片看：只做平移或旋转，既没有拉伸，也没有丢掉任何一块。虚线保留原来的位置。",
        ),
        step(
          "数等份，写分数",
          s.shape === "circle"
            ? "拼成 2 个完整扇形，整个圆共有 8 个相同扇形：2/8 = 1/4。"
            : s.shape === "diamond"
              ? "拼成 2 个完整格子，整个长方形有 8 格：2/8 = 1/4。"
              : "拼成 2 个完整格子，整个长方形有 12 格：2/12 = 1/6。",
        ),
      ],
      render(s, t) {
        let body = "";
        const p = E(P(t, 1));
        if (s.shape === "circle") {
          const cx = 320,
            cy = 180,
            r = 138,
            inner = r * 0.7;
          const sector = (idx, isInner, offset = 0) => {
            const a = ((idx + offset) * Math.PI) / 4 - Math.PI / 2,
              b = a + Math.PI / 4,
              ri = isInner ? 0 : inner,
              ro = isInner ? inner : r;
            return `M ${cx + ro * Math.cos(a)} ${cy + ro * Math.sin(a)} A ${ro} ${ro} 0 0 1 ${cx + ro * Math.cos(b)} ${cy + ro * Math.sin(b)} L ${cx + ri * Math.cos(b)} ${cy + ri * Math.sin(b)} ${ri ? `A ${ri} ${ri} 0 0 0 ${cx + ri * Math.cos(a)} ${cy + ri * Math.sin(a)}` : ""} Z`;
          };
          body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${blue}" stroke-width="2"/>`;
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4;
            body += line(
              cx,
              cy,
              cx + r * Math.cos(a),
              cy + r * Math.sin(a),
              gray,
              1,
            );
          }
          body += `<circle cx="${cx}" cy="${cy}" r="${inner}" fill="none" stroke="${gray}" stroke-dasharray="4 4"/>`;
          for (const i of [0, 4])
            body += `<path d="${sector(i, true)}" fill="${blue}" stroke="white" stroke-width="2"/>`;
          for (const i of [1, 5])
            body += `<path d="${sector(i, false)}" fill="none" stroke="${orange}" stroke-dasharray="4 4"/><path d="${sector(i, false, -p)}" fill="${orange}" stroke="white" stroke-width="2"/>`;
          body += text(
            320,
            360,
            t >= 3 ? "2 个完整扇形 / 8 个相同扇形" : "绕圆心旋转，碎片大小不变",
          );
        } else {
          const f = fractionPieces[s.shape],
            w = f.cols * 60,
            h = f.rows * 60,
            scale = 1.15,
            ox = (640 - w * scale) / 2,
            oy = 36;
          body +=
            `<g transform="translate(${ox} ${oy}) scale(${scale})">` +
            rect(0, 0, w, h, "white", `stroke="${blue}" stroke-width="2"`);
          for (let i = 1; i < f.cols; i++)
            body += line(i * 60, 0, i * 60, h, gray, 1);
          for (let i = 1; i < f.rows; i++)
            body += line(0, i * 60, w, i * 60, gray, 1);
          for (const piece of f.pieces) {
            if (piece.move)
              body += poly(
                piece.points,
                "none",
                `stroke="${orange}" stroke-dasharray="3 3"`,
              );
            body += poly(
              transformPiece(piece, p),
              piece.move ? orange : blue,
              'stroke="white" stroke-width="1.5"',
            );
          }
          body +=
            "</g>" +
            text(
              320,
              355,
              t >= 3
                ? `涂色 2 格 / 整体 ${f.cols * f.rows} 格`
                : "虚线是起点，外边框始终不变",
            );
        }
        return {
          svg: svg(body).replace(
            'viewBox="0 0 640 390"',
            'viewBox="120 0 400 390"',
          ),
          readout:
            t >= 3
              ? s.shape === "corners"
                ? "2/12 = 1/6"
                : "2/8 = 1/4"
              : "搬动前的涂色面积 ＝ 搬动后的涂色面积",
        };
      },
      legend: "蓝色碎片留在原处，橙色碎片搬动。颜色深浅不表示面积大小。",
    },
    lines: {
      title: "连线：多一个点，多几条线？",
      intro: "从新点出发，一条一条连接，发现总数背后的规律。",
      controls:
        input("points", "目标点数", 5, 2, 35) +
        presets([
          ["3", "3 个点"],
          ["5", "5 个点"],
          ["8", "8 个点"],
        ]),
      read: () => {
        const n = Number(document.querySelector("#points").value);
        M.edges(n);
        return { n };
      },
      steps: (s) => [
        step(
          "两个点，一条线",
          "每两个点只连一条线。交叉的位置不是新加的点，也不把线段分开计数。",
        ),
        ...Array.from({ length: s.n - 2 }, (_, i) =>
          step(
            `加入第 ${i + 3} 个点`,
            `它要分别连到已有的 ${i + 2} 个点，所以新增 ${i + 2} 条线。每完成一条，计数才加一。`,
          ),
        ),
        step(
          "把新增的线累加",
          `从 2 个点到 ${s.n} 个点，总数为 ${Array.from({ length: s.n - 1 }, (_, i) => i + 1).join(" + ")} = ${(s.n * (s.n - 1)) / 2}。也可以用 ${s.n} × ${s.n - 1} ÷ 2 计算。`,
        ),
      ],
      render(s, t) {
        const phase = Math.max(0, Math.min(Math.ceil(t) - 1, s.n - 3)),
          anim = P(t, phase),
          count = Math.min(s.n, phase + 3),
          old = count - 1;
        const visible = t === 0 ? 2 : count,
          points = Array.from({ length: s.n }, (_, i) => {
            const a = (i * 2 * Math.PI) / s.n - Math.PI / 2;
            return [320 + 145 * Math.cos(a), 180 + 145 * Math.sin(a)];
          });
        const building = s.n > 2 && t > 0 && t <= s.n - 2,
          added = building ? Math.floor(anim * old) : s.n - 1;
        let body = "";
        for (const [a, b] of M.edges(visible)) {
          let p = 1,
            color = gray,
            width = 1.5;
          if (building && b === count - 1) {
            p = M.clamp(anim * old - a);
            color = orange;
            width = 3;
          } else if (!building && b === s.n - 1) {
            color = orange;
            width = 2.5;
          }
          if (p <= 0) continue;
          const [x, y] = points[a],
            [xx, yy] = points[b];
          body += line(
            xx,
            yy,
            xx + (x - xx) * p,
            yy + (y - yy) * p,
            color,
            width,
          );
        }
        for (let i = 0; i < visible; i++) {
          const [x, y] = points[i],
            active = i === visible - 1;
          body +=
            `<circle cx="${x}" cy="${y}" r="${s.n > 15 ? 9 : 14}" fill="${active ? orange : blue}"/>` +
            text(
              x,
              y + (s.n > 15 ? 4 : 5),
              i + 1,
              "small",
              `style="fill:white;font-size:${s.n > 15 ? 10 : 13}px"`,
            );
        }
        body += text(
          320,
          375,
          s.n > 10
            ? "点较多，先看橙色新增线；可换成 5 个点慢慢观察"
            : "橙色从新点出发；灰色是已经连好的线",
          "small",
        );
        const total =
          t === 0
            ? 1
            : building
              ? (old * (old - 1)) / 2 + added
              : (s.n * (s.n - 1)) / 2;
        return {
          svg: svg(body, 640, 400),
          readout:
            t === 0
              ? "2 个点，1 条线"
              : building
                ? `新点连接：${added} / ${old} 条 · 总共 ${total} 条`
                : `${s.n} 个点，共 ${total} 条线`,
        };
      },
      legend: "点上的数字是编号。每对点只连接一次，不把交叉处算成新的点。",
    },
    perimeter: {
      title: "拼图：周长的秘密",
      intro: "小方块一个也没少，围在外面的一圈却变了。",
      controls:
        input("blocks", "方块总数", 12, 4, 144) +
        '<label>比较拼法<select id="layout"></select></label>',
      read: () => {
        const n = Number(document.querySelector("#blocks").value),
          layouts = M.layouts(n);
        return {
          n,
          layouts,
          selection:
            document.querySelector("#layout").value === ""
              ? layouts.length - 1
              : Math.min(
                  Number(document.querySelector("#layout").value),
                  layouts.length - 1,
                ),
        };
      },
      edit(target, applied) {
        if (target.id !== "blocks") return;
        const el = document.querySelector("#layout");
        try {
          const n = Number(target.value), layouts = M.layouts(n);
          this.prepare({
            layouts,
            selection: n === applied.n ? applied.selection : layouts.length - 1,
          });
          el.disabled = false;
        } catch {
          el.innerHTML = '<option value="">请先填写有效方块数</option>';
          el.disabled = true;
        }
      },
      prepare(s) {
        const el = document.querySelector("#layout");
        el.innerHTML = s.layouts
          .map(
            (l, i) =>
              `<option value="${i}">${l.rows} × ${l.cols}，周长 ${l.perimeter}${i === s.layouts.length - 1 ? "（最小）" : ""}</option>`,
          )
          .join("");
        el.value = s.selection;
      },
      steps: (s) => {
        const l = s.layouts[s.selection];
        return [
          step(
            "同样多的小方块",
            `这里始终有 ${s.n} 个边长为 1 的小正方形。先把它们排成一行，观察围在外面的边。`,
          ),
          step(
            "搬动，换一种拼法",
            `把这些方块排成 ${l.rows} 行、每行 ${l.cols} 块。每个方块都有自己的编号，面积仍然是 ${s.n}。`,
          ),
          step(
            "里面的边不算周长",
            `两块相接时，公共边藏在里面。共有 ${l.shared} 条公共边，每条让外露边减少 2。`,
          ),
          step(
            "沿着外面走一圈",
            `只数外边界：长 ${l.cols}，宽 ${l.rows}，周长是 2 ×（${l.cols} + ${l.rows}）= ${l.perimeter}。`,
          ),
          step(
            "比较全部整齐拼法",
            s.layouts.length === 1
              ? "这个数量只有一种整齐的长方形拼法。旋转后的长方形不重复计算。"
              : `在这些整齐拼法中，长宽最接近时周长最小：${s.layouts.at(-1).rows} × ${s.layouts.at(-1).cols}，周长 ${s.layouts.at(-1).perimeter}。切换上方拼法继续比较。`,
          ),
        ];
      },
      render(s, t) {
        const l = s.layouts[s.selection],
          cell = 30,
          w = Math.max(380, s.n * cell + 60),
          h = Math.max(340, l.rows * cell + 120),
          p = E(P(t, 0)),
          targetX = w > 640 ? 30 : (w - l.cols * cell) / 2,
          startX = (w - s.n * cell) / 2,
          y = 65;
        let body = "";
        for (let i = 0; i < s.n; i++) {
          const x =
              startX +
              i * cell +
              (targetX + (i % l.cols) * cell - startX - i * cell) * p,
            yy = y + Math.floor(i / l.cols) * cell * p;
          body +=
            rect(x, yy, cell, cell, pale, `stroke="white" stroke-width="2"`) +
            text(x + 15, yy + 20, i + 1, "small");
        }
        if (t >= 1) {
          const opacity = P(t, 1);
          for (let r = 1; r < l.rows; r++)
            body += line(
              targetX,
              y + r * cell,
              targetX + l.cols * cell,
              y + r * cell,
              orange,
              2,
              `opacity="${opacity}" stroke-dasharray="4 3"`,
            );
          for (let c = 1; c < l.cols; c++)
            body += line(
              targetX + c * cell,
              y,
              targetX + c * cell,
              y + l.rows * cell,
              orange,
              2,
              `opacity="${opacity}" stroke-dasharray="4 3"`,
            );
        }
        const trace = P(t, 2),
          perimeter = l.perimeter * cell;
        if (t >= 2)
          body += `<path d="M ${targetX} ${y} h ${l.cols * cell} v ${l.rows * cell} h ${-l.cols * cell} Z" fill="none" stroke="${blue}" stroke-width="5" stroke-dasharray="${perimeter}" stroke-dashoffset="${perimeter * (1 - trace)}"/>`;
        body += text(
          Math.min(w / 2, 320),
          h - 48,
          t < 1
            ? `${s.n} 个方块，面积不变`
            : t < 2
              ? `${l.shared} 条内部公共边`
              : t < 3
                ? `沿外边界数：${Math.floor(l.perimeter * trace)} 个单位长度`
                : `${l.rows} × ${l.cols}：周长 ${l.perimeter}`,
        );
        return {
          svg: svg(body, w, h),
          minWidth: w > 640 ? w : 0,
          readout:
            t >= 3
              ? `面积 ${s.n} 不变 · 周长 ${l.perimeter} · 最小周长 ${s.layouts.at(-1).perimeter}`
              : t >= 2
                ? `4 × ${s.n} − 2 × ${l.shared} = ${l.perimeter}`
                : `${s.n} 个小方块，从一行搬成 ${l.rows} 行`,
        };
      },
      legend:
        "每块边长为 1。橙色虚线是内部公共边，蓝色实线描出外边界。长条图可左右滚动。",
    },
    units: {
      title: "单位换算：铺一面，叠一层",
      intro: "面积数两个方向，体积数三个方向。先看组成，再做换算。",
      controls:
        '<label>学习内容<select id="dimension"><option value="2">面积</option><option value="3">体积</option></select></label><label>数值<input id="value" type="number" min="0" max="1000000" step="any" value="1" required></label><label>从<select id="from"></select></label><label>到<select id="to"></select></label>',
      setup() {
        const fill = () => {
          const d = Number(document.querySelector("#dimension").value);
          for (const [id, defaultValue] of [
            ["from", 0],
            ["to", 1],
          ]) {
            const el = document.querySelector("#" + id),
              value = el.value || defaultValue;
            el.innerHTML = ["m", "dm", "cm"]
              .map(
                (u, i) =>
                  `<option value="${i}">${u}${d === 2 ? "²" : "³"}</option>`,
              )
              .join("");
            el.value = value;
          }
        };
        fill();
        document.querySelector("#dimension").addEventListener("change", fill);
      },
      read: () => {
        const value = Number(document.querySelector("#value").value),
          dimension = Number(document.querySelector("#dimension").value),
          from = Number(document.querySelector("#from").value),
          to = Number(document.querySelector("#to").value);
        return {
          value,
          dimension,
          from,
          to,
          result: M.convert(value, dimension, from, to),
        };
      },
      steps(s) {
        const volume = s.dimension === 3,
          unit = (i) => ["m", "dm", "cm"][i] + (volume ? "³" : "²"),
          reverse = s.to < s.from,
          factor = 10 ** s.dimension;
        return [
          step(
            "先看一个大单位",
            `模型只解释一个大单位的组成，不代表输入的 ${fmt(s.value)} 个单位。相邻长度单位之间是 10 倍。`,
          ),
          step(
            "一个方向排 10 份",
            "先沿一个方向排出 10 份。只数这个方向，还不能得到面积或体积的换算倍数。",
          ),
          step(
            "铺满一面：10 × 10",
            "每行 10 份，一共 10 行，一面有 100 份。面积数到这里就够了。",
          ),
          ...(volume
            ? [
                step(
                  "叠成一体：100 × 10",
                  "每层有 100 个小正方体，再叠 10 层，总共 1000 个。宽、深、高三个方向都要计算。",
                ),
              ]
            : []),
          step(
            reverse ? "反过来，合成大单位" : "看清换算方向",
            s.from === s.to
              ? "起点和终点单位相同，数值不变。"
              : reverse
                ? `${factor} 个小单位合成 1 个大单位，每跨一级就除以 ${factor}。`
                : `1 个大单位分成 ${factor} 个小单位，每跨一级就乘 ${factor}。`,
          ),
          step(
            "把倍数用于这道题",
            s.from === s.to
              ? `${fmt(s.value)} ${unit(s.from)} = ${fmt(s.result)} ${unit(s.to)}`
              : Array.from({ length: Math.abs(s.to - s.from) }, (_, i) => {
                  const from = s.from + Math.sign(s.to - s.from) * i,
                    to = from + Math.sign(s.to - s.from);
                  return `${fmt(M.convert(s.value, s.dimension, s.from, from))} ${unit(from)} ${reverse ? "÷" : "×"} ${factor} = ${fmt(M.convert(s.value, s.dimension, s.from, to))} ${unit(to)}`;
                }).join("；"),
          ),
        ];
      },
      render(s, t) {
        const volume = s.dimension === 3,
          reverse = s.to < s.from,
          modelEnd = volume ? 3 : 2,
          direction = P(t, modelEnd),
          construction = Math.min(t, modelEnd);
        let body = "";
        if (!volume) {
          const x = 195,
            y = 36,
            size = 25;
          body += rect(
            x,
            y,
            250,
            250,
            "#f4f7fa",
            `stroke="${blue}" stroke-width="2"`,
          );
          for (let r = 0; r < 10; r++)
            for (let c = 0; c < 10; c++) {
              const q =
                r === 0
                  ? M.clamp(construction * 10 - c)
                  : M.clamp(P(construction, 1) * 9 - (r - 1));
              body += rect(
                x + c * size,
                y + r * size,
                size,
                size,
                r === 0 ? orange : blue,
                `opacity="${q * 0.82}" stroke="white" stroke-width="1"`,
              );
            }
          if (reverse && direction > 0)
            body += rect(
              x,
              y,
              250,
              250,
              pale,
              `opacity="${direction}" stroke="${blue}" stroke-width="2"`,
            );
          body +=
            text(
              320,
              318,
              reverse && direction === 1
                ? "100 个小单位合成 1 个大单位"
                : "横向 10 份",
            ) + text(320, 350, "纵向 10 行 → 10 × 10 = 100", "small");
        } else {
          const origin = [300, 290],
            vx = [16, 5],
            vy = [-11, 8],
            z = 14;
          const pt = (x, y, h) => [
            origin[0] + vx[0] * x + vy[0] * y,
            origin[1] + vx[1] * x + vy[1] * y - z * h,
          ];
          const layer = (h, opacity) => {
            let out = poly(
              [pt(0, 0, h), pt(10, 0, h), pt(10, 10, h), pt(0, 10, h)],
              pale,
              `stroke="${blue}" stroke-width="1.5"`,
            );
            for (let i = 1; i < 10; i++) {
              out +=
                line(...pt(i, 0, h), ...pt(i, 10, h), blue, 0.7) +
                line(...pt(0, i, h), ...pt(10, i, h), blue, 0.7);
            }
            out +=
              poly(
                [
                  pt(0, 10, h),
                  pt(10, 10, h),
                  pt(10, 10, h - 1),
                  pt(0, 10, h - 1),
                ],
                "#a8ccdf",
                `stroke="${blue}"`,
              ) +
              poly(
                [
                  pt(10, 0, h),
                  pt(10, 10, h),
                  pt(10, 10, h - 1),
                  pt(10, 0, h - 1),
                ],
                "#75a8c4",
                `stroke="${blue}"`,
              );
            for (let i = 1; i < 10; i++)
              out +=
                line(...pt(i, 10, h), ...pt(i, 10, h - 1), blue, 0.7) +
                line(...pt(10, i, h), ...pt(10, i, h - 1), blue, 0.7);
            return `<g opacity="${opacity}">${out}</g>`;
          };
          body += poly(
            [pt(0, 0, 0), pt(10, 0, 0), pt(10, 10, 0), pt(0, 10, 0)],
            "#f4f7fa",
            `stroke="${gray}"`,
          );
          for (const [a, b] of [
            [
              [0, 0, 10],
              [10, 0, 10],
            ],
            [
              [10, 0, 10],
              [10, 10, 10],
            ],
            [
              [10, 10, 10],
              [0, 10, 10],
            ],
            [
              [0, 10, 10],
              [0, 0, 10],
            ],
            [
              [0, 0, 0],
              [0, 0, 10],
            ],
            [
              [10, 0, 0],
              [10, 0, 10],
            ],
            [
              [10, 10, 0],
              [10, 10, 10],
            ],
            [
              [0, 10, 0],
              [0, 10, 10],
            ],
          ])
            body += line(
              ...pt(...a),
              ...pt(...b),
              gray,
              1,
              'stroke-dasharray="4 4"',
            );
          if (construction < 2) {
            for (let r = 0; r < 10; r++)
              for (let c = 0; c < 10; c++) {
                const q =
                  r === 0
                    ? M.clamp(construction * 10 - c)
                    : M.clamp(P(construction, 1) * 9 - r + 1);
                body += poly(
                  [
                    pt(c, r, 1),
                    pt(c + 1, r, 1),
                    pt(c + 1, r + 1, 1),
                    pt(c, r + 1, 1),
                  ],
                  r === 0 ? orange : blue,
                  `opacity="${q}" stroke="white" stroke-width=".6"`,
                );
              }
          } else {
            body += layer(1, 1);
            for (let h = 2; h <= 10; h++) {
              const q = M.clamp(P(construction, 2) * 9 - (h - 2));
              if (q > 0) body += layer(h + (1 - E(q)) * 1.5, q);
            }
          }
          if (reverse && direction > 0)
            body += `<g opacity="${direction}">${poly([pt(0, 0, 10), pt(10, 0, 10), pt(10, 10, 10), pt(0, 10, 10)], pale, `stroke="${blue}"`)}${poly([pt(0, 10, 10), pt(10, 10, 10), pt(10, 10, 0), pt(0, 10, 0)], "#a8ccdf", `stroke="${blue}"`)}${poly([pt(10, 0, 10), pt(10, 10, 10), pt(10, 10, 0), pt(10, 0, 0)], "#75a8c4", `stroke="${blue}"`)}</g>`;
          body +=
            text(388, 429, "宽 10 份", "small") +
            text(150, 390, "深 10 份", "small") +
            line(492, 200, 492, 340, orange, 2) +
            text(542, 255, "高 10 层", "small") +
            text(320, 35, "每层 100 个 × 10 层 = 1000 个");
        }
        const unit = (i) => ["m", "dm", "cm"][i] + (volume ? "³" : "²"),
          done = t >= modelEnd + 2;
        return {
          svg: svg(body, 640, volume ? 455 : 390).replace(
            volume ? 'viewBox="0 0 640 455"' : 'viewBox="0 0 640 390"',
            volume ? 'viewBox="110 0 500 455"' : 'viewBox="110 0 420 390"',
          ),
          readout: done
            ? `${fmt(s.value)} ${unit(s.from)} = ${fmt(s.result)} ${unit(s.to)}`
            : reverse && direction > 0
              ? `${10 ** s.dimension} 个小单位 → 1 个大单位`
              : construction < 1
                ? "先数一个方向：10 份"
                : construction < 2
                  ? "两个方向：10 × 10 = 100"
                  : volume
                    ? "三个方向：10 × 10 × 10 = 1000"
                    : "相邻面积单位之间：100 倍",
        };
      },
      legend:
        "模型展示一个大单位的组成。体积用网格和分层表示数量，不逐个画出全部 1000 个小正方体。",
    },
  };
  root.KidsScenes = { lessons, fractionPieces, transformPiece };
})(globalThis);
