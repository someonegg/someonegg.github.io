(() => {
  const lesson = KidsScenes.lessons[document.body.dataset.lesson];
  const $ = (id) => document.getElementById(id);
  $("title").textContent = lesson.title;
  $("intro").textContent = lesson.intro;
  $("settings").innerHTML = lesson.controls +
    '<button id="update-question" class="primary" type="submit" disabled>更新题目</button>';
  $("settings").setAttribute("aria-describedby", "settings-status error");
  $("legend").textContent = lesson.legend;
  lesson.setup?.();
  let state,
    steps,
    appliedValues,
    lastStep = -1,
    lastBoundary = -1;
  const player = new LessonPlayer({
    render(time) {
      if (!state) return;
      const view = lesson.render(state, time);
      $("stage").innerHTML = view.svg;
      $("stage").style.minWidth = view.minWidth ? view.minWidth + "px" : "";
      $("readout").textContent = view.readout;
      const index = Math.min(Math.ceil(time - 1e-8), steps.length - 1);
      if (index !== lastStep) {
        lastStep = index;
        $("step-count").textContent = `第 ${index + 1} / ${steps.length} 步`;
        $("step-title").textContent = steps[index].title;
        $("step-body").textContent = steps[index].body;
        $("steps").innerHTML = steps
          .map(
            (s, i) =>
              `<li class="${i === index ? "current" : ""}" ${i === index ? 'aria-current="step"' : ""}><span>${i + 1}</span>${s.title}</li>`,
          )
          .join("");
        const active = $("steps").querySelector(".current");
        if (active)
          $("steps").scrollTop = Math.max(
            0,
            active.offsetTop - $("steps").offsetTop - 80,
          );
      }
      const boundary = Math.floor(time);
      if (boundary !== lastBoundary) {
        lastBoundary = boundary;
        $("announcement").textContent =
          `${steps[boundary].title}。${lesson.render(state, boundary).readout}`;
      }
    },
    onState(p) {
      $("play").textContent = p.playing
        ? "暂停"
        : p.time >= p.end
          ? "重播"
          : p.time > 0 ? "继续" : "播放";
      $("previous").disabled = p.time === 0;
      $("next").disabled = p.time >= p.end;
      $("play").setAttribute(
        "aria-label",
        $("play").textContent + "动画",
      );
    },
  });
  function values() {
    return JSON.stringify([...$("settings").querySelectorAll("input, select")]
      .map((el) => [el.id, el.value]));
  }
  function updateSettings() {
    const dirty = values() !== appliedValues;
    $("update-question").disabled = !dirty;
    $("settings-status").textContent = dirty
      ? "参数已修改，点击更新题目后生效" : "";
    $("settings").querySelectorAll("[data-preset]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.preset === $("points").value));
    });
  }
  function editSettings(target) {
    const wasDirty = values() !== appliedValues;
    lesson.edit?.(target, state);
    if (wasDirty) player.pause();
    $("error").textContent = "";
    updateSettings();
  }
  function rebuild() {
    player.pause();
    try {
      const next = lesson.read();
      const nextSteps = lesson.steps(next);
      lesson.prepare?.(next);
      state = next;
      steps = nextSteps;
      lastStep = -1;
      lastBoundary = -1;
      $("error").textContent = "";
      $("stage-scroll").scrollLeft = 0;
      $("stage-scroll").scrollTop = 0;
      player.reset(steps.length - 1);
      appliedValues = values();
      updateSettings();
    } catch (error) {
      $("error").textContent = error.message;
    }
  }
  $("settings").addEventListener("submit", (e) => {
    e.preventDefault();
    if (values() !== appliedValues) rebuild();
  });
  $("settings").addEventListener("change", (e) => {
    if (e.target.tagName === "SELECT") editSettings(e.target);
  });
  $("settings").addEventListener("input", (e) => {
    if (e.target.tagName === "INPUT") editSettings(e.target);
  });
  $("settings").addEventListener("click", (e) => {
    const preset = e.target.closest("[data-preset]");
    if (preset) {
      $("points").value = preset.dataset.preset;
      editSettings($("points"));
    }
  });
  $("previous").addEventListener("click", () => player.previous());
  $("next").addEventListener("click", () => player.next());
  $("play").addEventListener("click", () =>
    player.playing ? player.pause() : player.play(),
  );
  $("speed").addEventListener("change", () => {
    player.speed = Number($("speed").value);
  });
  window.addEventListener("resize", () => player.update());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) player.pause();
  });
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
    "change",
    () => player.pause(),
  );
  rebuild();
})();
