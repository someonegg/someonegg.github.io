(function () {
  'use strict';
  const C = window.DogeCore, levels = window.SAVE_THE_DOGE_LEVELS, modules = window.SaveTheDoge;
  const config = modules.config;
  const $ = id => document.getElementById(id);
  const elements = {
    canvas: $('gameCanvas'),
    levelCount: $('levelCount'),
    phaseLabel: $('phaseLabel'),
    clock: $('clock'),
    inkText: $('inkText'),
    statusMessage: $('statusMessage'),
    primaryAction: $('primaryAction'),
    spoolCursor: $('spoolCursor'),
    levelsDialog: $('levelsDialog'),
    levelsButton: $('levelsBtn'),
    closeLevelsButton: $('closeLevelsBtn'),
    progressText: $('progressText'),
    levelList: $('levelList'),
    bestButton: $('bestBtn'),
    inkMeter: document.querySelector('.ink-status'),
    spools: document.querySelectorAll('.thread-spool')
  };
  const canvas = elements.canvas;
  let storage = null;
  try { storage = window.localStorage; } catch (_) {
    // Accessing the storage property itself can fail in restricted contexts.
  }
  const store = new modules.storage.ProgressStore({ storage, levels, core: C, config });
  let currentIndex = store.currentIndex;

  let editor, simulation = null, phase = 'editing', selected = null;
  let pointer = null, rawDraft = [], draft = [], draftError = '', exhausted = false;
  let gesture = null;
  let accumulator = 0, previousTime = null, dirty = true;
  let message = '', isError = false, noticeVisible = false, noticeTimer = null;
  let view = C.viewTransform(C.WIDTH, C.HEIGHT), pixelRatio = 1, viewWidth = 0, viewHeight = 0;
  const dogImage = new Image(), beeImage = new Image();
  dogImage.onload = beeImage.onload = () => { dirty = true; };
  dogImage.src = './assets/dog-cartoon.svg'; beeImage.src = './assets/bee-cartoon.svg';
  const renderer = new modules.renderer.GameRenderer({ canvas, core: C, config, dogImage, beeImage });
  const level = () => levels[currentIndex];
  const record = () => store.record(level());

  function persist() {
    record().draft = C.clone(editor.strokes);
    store.persist(currentIndex);
  }
  function say(text, error = false, show = error) {
    message = text; isError = error; noticeVisible = show; dirty = true;
    clearTimeout(noticeTimer);
    if (show) noticeTimer = setTimeout(() => { noticeVisible = false; updateUI(); }, config.timing.noticeMilliseconds);
    updateUI();
  }
  function cancelPointer() {
    const captured = pointer;
    pointer = null; gesture = null; rawDraft = []; draft = []; draftError = ''; exhausted = false; dirty = true;
    if (captured !== null) { try { canvas.releasePointerCapture(captured); } catch (_) {} }
  }
  function loadLevel(index) {
    cancelPointer();
    if (simulation) simulation.dispose();
    simulation = null; currentIndex = index; editor = new C.Editor(record().draft);
    phase = 'editing'; selected = null; accumulator = 0; previousTime = null;
    elements.levelsDialog.close();
    persist();
    const upgradeNotice = store.consumeUpgradeNotice();
    say(store.available ? (upgradeNotice ? '关卡已更新，挑战记录已重置。' : '') : '当前浏览器无法保存进度，本次仍可正常游玩。',
      !store.available, !store.available || upgradeNotice);
  }
  function editingChange(text) {
    selected = null; persist(); say(text);
  }
  function returnToEdit() {
    if (simulation) simulation.dispose();
    simulation = null; phase = 'editing'; accumulator = 0; previousTime = null;
    selected = null;
    say('防线已保留，调整后再挑战。');
  }
  function start() {
    if (phase !== 'editing' || pointer !== null) return;
    if (!C.validatePlan(level(), editor.strokes)) { say('防线中有无效笔画，请删除后再试。', true); return; }
    persist(); selected = null; simulation = new C.Simulation(level(), editor.strokes);
    phase = 'simulating'; accumulator = 0; previousTime = null;
    say('挑战开始。');
  }
  function finish(result) {
    phase = result.state; accumulator = 0;
    if (phase === 'won') {
      const entry = record(), used = C.inkUsed(editor.strokes);
      entry.won = true;
      if (!entry.best || used < C.inkUsed(entry.best)) entry.best = C.clone(editor.strokes);
      persist();
      const saved = used <= level().inkTarget ? ' · 达成省线目标' : '';
      say(`挑战成功 · 使用 ${Math.ceil(used - config.display.inkRoundingEpsilon)} 线长${saved}`, false, true);
    } else {
      say(result.reason === 'sting' ? '蜜蜂碰到小狗，请调整防线。' : '小狗掉出安全区，请调整防线。', true, true);
    }
  }
  function togglePause() {
    if (phase === 'simulating') { phase = 'paused'; say('挑战已暂停。'); }
    else if (phase === 'paused') { phase = 'simulating'; previousTime = null; say('继续挑战。'); }
  }
  function updateUI() {
    const l = level(), used = C.inkUsed(editor.strokes) + C.length(draft), left = Math.max(0, l.inkLimit - used);
    elements.levelCount.textContent = `${currentIndex + 1} / ${levels.length}`;
    elements.phaseLabel.textContent = { editing: '准备', simulating: '挑战中', paused: '挑战已暂停', won: '挑战成功', lost: '挑战失败' }[phase];
    elements.clock.hidden = phase === 'editing';
    elements.clock.textContent = `${Math.max(0, (C.TOTAL_STEPS - (simulation?.ticks || 0)) / config.simulation.stepsPerSecond).toFixed(config.display.clockDecimals)} 秒`;
    elements.inkText.textContent = `剩余线长 ${Math.floor(left + config.display.inkRoundingEpsilon)}`;
    const ratio = Math.max(0, Math.min(1, left / l.inkLimit));
    elements.spools.forEach(spool => {
      spool.style.setProperty('--thread-ratio', String(ratio));
    });
    elements.inkMeter.setAttribute('aria-valuenow', String(Math.round(left / l.inkLimit * config.display.percentScale)));
    elements.inkMeter.setAttribute('aria-valuetext', `剩余 ${Math.floor(left + config.display.inkRoundingEpsilon)}，总计 ${l.inkLimit}`);
    // Do not rewrite live-region text on animation frames.
    const status = elements.statusMessage;
    if (status.textContent !== message) status.textContent = message;
    status.classList.toggle('error', isError);
    status.classList.toggle('shown', noticeVisible);
    const action = elements.primaryAction;
    action.hidden = phase === 'simulating';
    action.disabled = phase === 'editing' && pointer !== null;
    action.textContent = phase === 'editing' ? '开始' : phase === 'paused' ? '继续' : phase === 'lost' ? '重新开始' : currentIndex === levels.length - 1 ? '查看关卡' : '下一关';
    canvas.dataset.editing = String(phase === 'editing');
    updateCursor();
  }

  let mousePosition = null;
  function updateCursor() {
    const bounds = canvas.getBoundingClientRect();
    const visible = mousePosition !== null && phase === 'editing' && !elements.levelsDialog.open && !document.hidden &&
      mousePosition.x >= bounds.left && mousePosition.x < bounds.right && mousePosition.y >= bounds.top && mousePosition.y < bounds.bottom;
    elements.spoolCursor.hidden = !visible;
    canvas.dataset.spoolCursor = String(visible);
    if (visible) elements.spoolCursor.style.transform = `translate(${mousePosition.x - config.display.cursorHotspotX}px, ${mousePosition.y - config.display.cursorHotspotY}px)`;
  }
  function trackCursor(event) {
    mousePosition = event.pointerType === 'mouse' ? { x: event.clientX, y: event.clientY } : null;
    updateCursor();
  }
  canvas.addEventListener('pointerenter', trackCursor);
  canvas.addEventListener('pointermove', trackCursor);
  canvas.addEventListener('pointerdown', trackCursor);
  canvas.addEventListener('pointerleave', () => { mousePosition = null; updateCursor(); });
  window.addEventListener('blur', () => { mousePosition = null; updateCursor(); });
  elements.levelsDialog.addEventListener('close', updateCursor);

  function pointFromEvent(event) {
    const bounds = canvas.getBoundingClientRect();
    return C.worldPoint(view, { x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  }
  function strokeAt(p) {
    let closest = null, best = config.input.hitDistance;
    for (const stroke of editor.strokes) {
      for (let i = 1; i < stroke.points.length; i++) {
        const d = C.pointSegmentDistance(p, stroke.points[i - 1], stroke.points[i]);
        if (d < best) { best = d; closest = stroke.id; }
      }
    }
    return closest;
  }
  function extendDraft(event, final = false) {
    if (exhausted) return;
    if (!gesture.dragging) {
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <= config.input.dragThresholdPixels) return;
      gesture.dragging = true; selected = null;
    }
    const point = pointFromEvent(event);
    const gap = Math.hypot(point.x - rawDraft.at(-1).x, point.y - rawDraft.at(-1).y);
    if (gap < (final ? config.stroke.comparisonEpsilon : config.input.sampleDistance)) return;
    rawDraft.push(point);
    const extension = C.trimStroke(C.normalizeStroke(rawDraft), level().inkLimit - C.inkUsed(editor.strokes));
    draft = extension.points; exhausted = extension.exhausted;
    draftError = draft.length > 1 ? C.validateStroke(level(), editor.strokes, draft) : '';
    say(draftError || (exhausted ? '线长用完了。' : ''), !!draftError, !!draftError || exhausted);
  }
  canvas.addEventListener('pointerdown', event => {
    if (phase !== 'editing' || pointer !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    const point = pointFromEvent(event);
    if (point.x < config.world.safeMargin || point.x > C.WIDTH - config.world.safeMargin ||
      point.y < config.world.safeMargin || point.y > level().dangerY - config.world.safeMargin) return;
    const hit = strokeAt(point);
    if (!hit && C.inkUsed(editor.strokes) >= level().inkLimit - config.input.budgetTolerance) {
      const hadSelection = selected !== null;
      selected = null;
      say(hadSelection ? '' : '线长已用完。删除一条线后可以继续画。', !hadSelection, !hadSelection);
      return;
    }
    gesture = { x: event.clientX, y: event.clientY, hit, dragging: false };
    pointer = event.pointerId; rawDraft = [point]; draft = [point]; draftError = ''; exhausted = false;
    canvas.setPointerCapture(pointer); dirty = true; updateUI();
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointer) return;
    event.preventDefault(); extendDraft(event);
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerId !== pointer) return;
    extendDraft(event, true);
    if (!gesture.dragging) {
      const hit = gesture.hit;
      cancelPointer();
      if (hit && hit === selected) { editor.remove(hit); editingChange('已删除这条线，线长已返还。'); }
      else { selected = hit; say(hit ? '再点一次删除这条线。' : '', false, !!hit); }
      return;
    }
    const points = draft;
    if (C.length(points) < config.stroke.minimumLength) {
      cancelPointer(); say(''); return;
    }
    const error = C.validateStroke(level(), editor.strokes, points);
    cancelPointer();
    if (error) { say(`${error}。这笔未消耗线长。`, true); return; }
    editor.add(points); editingChange('');
  });
  canvas.addEventListener('pointercancel', event => {
    if (event.pointerId === pointer) { cancelPointer(); say('这笔已取消，未扣除线长。'); }
  });
  canvas.addEventListener('lostpointercapture', event => {
    if (event.pointerId === pointer) { cancelPointer(); say('这笔已取消，未扣除线长。'); }
  });

  function render() {
    renderer.render({ level: level(), editor, selected, draft, draftError, simulation, phase, view, pixelRatio });
    dirty = false;
  }

  function resizeCanvas() {
    // A resize affects pixels only, never the simulation or the saved plan.
    pixelRatio = Math.min(config.display.maximumPixelRatio, window.devicePixelRatio || 1);
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    if (pointer !== null && (bounds.width !== viewWidth || bounds.height !== viewHeight)) {
      cancelPointer(); say('画面尺寸已变化，这笔已取消，未扣除线长。', false, true);
    }
    viewWidth = bounds.width; viewHeight = bounds.height;
    view = C.viewTransform(viewWidth, viewHeight);
    canvas.width = Math.max(1, Math.round(viewWidth * pixelRatio));
    canvas.height = Math.max(1, Math.round(viewHeight * pixelRatio));
    dirty = true;
    updateCursor();
  }
  function frame(now) {
    const delta = previousTime === null ? 0 : Math.min(config.timing.maximumFrameDelta, now - previousTime); previousTime = now;
    if (phase === 'simulating') {
      accumulator += delta;
      while (accumulator + config.timing.accumulatorEpsilon >= C.STEP && phase === 'simulating') {
        accumulator -= C.STEP;
        const result = simulation.step(); if (result) finish(result);
      }
      dirty = true; updateUI();
    }
    if (dirty) render();
    requestAnimationFrame(frame);
  }
  function openLevels() {
    const interrupted = pointer !== null;
    cancelPointer(); persist();
    if (phase === 'simulating') togglePause();
    else if (interrupted) say('未完成的线条已取消，防线已保存。');
    else updateUI();
    const completed = levels.filter(l => store.records[l.id]?.won).length;
    const economical = levels.filter(l => store.records[l.id]?.best && C.inkUsed(store.records[l.id].best) <= l.inkTarget).length;
    elements.progressText.textContent = `${completed} / ${levels.length} 关已完成，${economical} 关达成省线目标。${completed === levels.length ? '所有关卡都已通过。' : '可以自由选关，未完成的防线也会保留。'}`;
    elements.levelList.replaceChildren();
    levels.forEach((l, index) => {
      const item = document.createElement('button'); item.className = 'level-choice';
      const title = document.createElement('span'); title.textContent = `${index + 1}. ${l.name}`;
      const sub = document.createElement('small'); sub.textContent = `${l.concept}：${l.hint}`; title.append(sub);
      const badge = document.createElement('span'); badge.className = 'badge';
      const entry = store.records[l.id];
      badge.textContent = entry?.best && C.inkUsed(entry.best) <= l.inkTarget ? '已省线' : entry?.won ? '已通关' : '未完成';
      if (index === currentIndex) { item.classList.add('active'); item.setAttribute('aria-current', 'true'); }
      item.append(title, badge); item.addEventListener('click', () => { if (index === currentIndex && phase === 'editing') elements.levelsDialog.close(); else loadLevel(index); });
      elements.levelList.append(item);
    });
    elements.bestButton.hidden = !record().best;
    elements.levelsDialog.showModal();
    updateCursor();
  }
  elements.primaryAction.onclick = () => {
    if (phase === 'editing') start();
    else if (phase === 'paused') togglePause();
    else if (phase === 'lost') returnToEdit();
    else if (phase === 'won') { if (currentIndex < levels.length - 1) loadLevel(currentIndex + 1); else openLevels(); }
  };
  elements.levelsButton.onclick = openLevels;
  elements.closeLevelsButton.onclick = () => elements.levelsDialog.close();
  elements.bestButton.onclick = () => {
    returnToEdit(); editor.commit(record().best); elements.levelsDialog.close();
    editingChange('已载入本关最佳防线。');
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      const interrupted = pointer !== null;
      cancelPointer();
      if (phase === 'simulating') { phase = 'paused'; say('挑战已自动暂停，返回后可继续。'); }
      persist();
      if (interrupted) say('未完成的线条已取消，防线已保存。');
      else updateUI();
    }
    previousTime = null;
  });
  window.addEventListener('pagehide', persist);
  window.addEventListener('resize', resizeCanvas);
  new ResizeObserver(resizeCanvas).observe(canvas);
  loadLevel(currentIndex); resizeCanvas(); requestAnimationFrame(frame);
})();
