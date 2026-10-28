'use strict';
(() => {
  const routes = {
    latent: {
      title: '先想象状态，再改善行动', example: '以 DreamerV3 为例',
      nodes: [['观测历史', '图像 / 环境反馈'], ['潜在状态预测', '以动作作为条件'], ['想象轨迹', '训练行动策略']],
      owners: ['学习到的内部表示', '学习式动力学', '可重建观测，非主要目标'],
      takeaway: '关键看模型中的想象是否有助于实际行动。这里的流程是概念简图，省略了奖励预测、编码与循环状态等模块。'
    },
    video: {
      title: '用行动条件生成可探索的观察序列', example: '以 Genie 3 的交互目标为例',
      nodes: [['历史观察 + 控制', '过去画面 / 用户行动'], ['生成模型', '预测后续观察'], ['新的世界画面', '用户继续探索']],
      owners: ['模型内部表示与历史信息', '通过条件生成体现', '生成模型'],
      takeaway: '视觉上的连续探索，不等于已经获得精确、可查询的物理状态。本图描述外部行为，不推定 Genie 3 未公开的内部架构。'
    },
    engine: {
      title: '引擎决定世界，模型生成视觉', example: '以 Matrix-Game 4.0 为例',
      nodes: [['游戏引擎', '输入 / 规则 / 物理'], ['低模 RGB 画面', '场景结构条件'], ['因果视频模型', '流式生成视觉']],
      owners: ['可执行游戏引擎', '引擎规则与物理', '因果视频生成模型'],
      takeaway: '世界逻辑的权威来源是引擎。模型聚焦视觉呈现；判断物理正确性时，应区分引擎状态与生成画面。'
    }
  };
  const tabs = [...document.querySelectorAll('[data-route]')];
  function selectRoute(key, focus = false) {
    const route = routes[key];
    tabs.forEach(tab => {
      const selected = tab.dataset.route === key;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (selected && focus) tab.focus();
    });
    document.getElementById('architecture-panel').setAttribute('aria-labelledby', `tab-${key}`);
    document.getElementById('arch-title').textContent = route.title;
    document.getElementById('arch-example').textContent = route.example;
    document.getElementById('pipeline').innerHTML = route.nodes.map(([title, sub]) => `<div class="pipe-node"><strong>${title}</strong><small>${sub}</small></div>`).join('<span class="pipe-arrow" aria-hidden="true">→</span>');
    document.getElementById('responsibilities').innerHTML = ['状态由谁维护', '变化由谁计算', '视觉由谁产生'].map((title, i) => `<div><span>${title}</span><strong>${route.owners[i]}</strong></div>`).join('');
    document.getElementById('arch-takeaway').textContent = route.takeaway;
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectRoute(tab.dataset.route));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectRoute(tabs[next].dataset.route, true); }
    });
  });
  selectRoute('latent');

  // A deterministic, procedural 3D character. This is a teaching illustration,
  // not a reconstruction or a physically complete Gaussian rasterizer.
  const canvas = document.getElementById('splat-canvas');
  const ctx = canvas.getContext('2d');
  const poseInput = document.getElementById('pose');
  const cameraInput = document.getElementById('camera');
  let view = 'splats';
  let seed = 7247;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  const samples = [];
  function ellipsoid(center, radii, count, color, moving = false) {
    for (let i = 0; i < count; i++) {
      const y = random() * 2 - 1;
      const angle = random() * Math.PI * 2;
      const r = Math.sqrt(1 - y * y);
      const volume = .85 + random() * .15;
      samples.push({ x: center[0] + radii[0] * Math.cos(angle) * r * volume, y: center[1] + radii[1] * y * volume, z: center[2] + radii[2] * Math.sin(angle) * r * volume, color, moving, radius: 2.2 + random() * 1.2 });
    }
  }
  ellipsoid([0, .45, 0], [.32, .57, .21], 390, [74, 113, 91]);
  ellipsoid([0, 1.24, 0], [.235, .27, .215], 240, [173, 144, 107]);
  ellipsoid([-.19, -.43, 0], [.115, .48, .13], 150, [94, 113, 96]);
  ellipsoid([.19, -.43, 0], [.115, .48, .13], 150, [94, 113, 96]);
  ellipsoid([-.43, .38, 0], [.1, .41, .115], 160, [74, 113, 91]);
  ellipsoid([.53, .63, 0], [.28, .1, .11], 170, [74, 113, 91], true);
  ellipsoid([.86, .63, 0], [.11, .11, .085], 65, [173, 144, 107], true);
  ellipsoid([-.19, -.94, .07], [.14, .08, .22], 55, [63, 82, 70]);
  ellipsoid([.19, -.94, .07], [.14, .08, .22], 55, [63, 82, 70]);
  document.getElementById('primitive-count').textContent = samples.length.toLocaleString('zh-CN');

  function render() {
    const w = 920, h = 420;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== w * pixelRatio || canvas.height !== h * pixelRatio) {
      canvas.width = w * pixelRatio; canvas.height = h * pixelRatio;
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#edf1e8'; ctx.fillRect(0, 0, w, h);
    const yaw = Number(cameraInput.value) * Math.PI / 180;
    const pose = Number(poseInput.value) / 100;
    const tilt = .12;
    function project(x, y, z) {
      const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
      const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
      const py = y * Math.cos(tilt) - rz * Math.sin(tilt);
      const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
      const scale = 138 * (5 / (5 - depth));
      return { x: w / 2 + rx * scale, y: h * .59 - py * scale, scale, depth };
    }
    ctx.strokeStyle = '#d9e1d2'; ctx.lineWidth = 1;
    for (let n = -6; n <= 6; n++) {
      const p = project(n * .45, -1.03, -2.7), q = project(n * .45, -1.03, 2.7);
      const a = project(-2.7, -1.03, n * .45), b = project(2.7, -1.03, n * .45);
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.font = '11px -apple-system, sans-serif'; ctx.fillStyle = '#81907b';
    ctx.fillText('动作更新 → 基元参数 → 当前相机投影', 30, 33);
    ctx.fillText(view === 'splats' ? '颜色与透明度叠加' : '仅显示基元中心位置', 30, 53);
    ctx.fillText('同一份三维资产', 780, 387);
    const transformed = samples.map(sample => {
      let x = sample.x, y = sample.y;
      if (sample.moving) {
        const angle = pose * 1.75 - .65;
        const dx = x - .29, dy = y - .7;
        x = .29 + dx * Math.cos(angle) - dy * Math.sin(angle);
        y = .7 + dx * Math.sin(angle) + dy * Math.cos(angle);
      }
      return { ...sample, ...project(x, y, sample.z) };
    }).sort((a, b) => a.depth - b.depth);
    transformed.forEach(sample => {
      const [r, g, b] = sample.color;
      if (view === 'points') {
        ctx.beginPath(); ctx.arc(sample.x, sample.y, 1.2, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(${r},${g},${b},.75)`; ctx.fill();
      } else {
        const radius = sample.radius * sample.scale / 138 * 2;
        const gradient = ctx.createRadialGradient(sample.x, sample.y, 0, sample.x, sample.y, radius);
        gradient.addColorStop(0, `rgba(${r},${g},${b},.55)`);
        gradient.addColorStop(.4, `rgba(${r},${g},${b},.3)`);
        gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.ellipse(sample.x, sample.y, radius, radius * .82, -.25, 0, Math.PI * 2); ctx.fill();
      }
    });
    document.getElementById('pose-value').textContent = `${poseInput.value}%`;
    document.getElementById('camera-value').textContent = `${cameraInput.value}°`;
    canvas.setAttribute('aria-label', `由 ${samples.length} 个三维基元组成的简化人物；抬手进度 ${poseInput.value}%，相机方位 ${cameraInput.value} 度，当前显示${view === 'splats' ? '高斯叠加' : '基元中心'}。`);
  }
  let framePending = false;
  function scheduleRender() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => { framePending = false; render(); });
  }
  [poseInput, cameraInput].forEach(input => input.addEventListener('input', scheduleRender));
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    scheduleRender();
  }));
  document.getElementById('reset-demo').addEventListener('click', () => {
    poseInput.value = 25; cameraInput.value = -15; scheduleRender();
  });
  render();
  const navLinks = [...document.querySelectorAll('.sidebar nav a')];
  function updateNav() {
    let current = navLinks[0];
    navLinks.forEach(link => { if (document.querySelector(link.hash).getBoundingClientRect().top <= 150) current = link; });
    navLinks.forEach(link => {
      const active = link === current;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  }
  let scrollPending = false;
  window.addEventListener('scroll', () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => { updateNav(); scrollPending = false; });
  }, { passive: true });
  updateNav();
})();
