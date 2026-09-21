(function (root) {
  class LessonPlayer {
    constructor({
      render,
      onState = () => {},
      request = (cb) => requestAnimationFrame(cb),
      cancel = (id) => cancelAnimationFrame(id),
      reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    }) {
      Object.assign(this, { render, onState, request, cancel, reduced });
      this.time = 0;
      this.end = 0;
      this.speed = 1;
      this.playing = false;
      this.frame = null;
      this.last = null;
    }
    reset(end) {
      this.pause();
      this.end = end;
      this.time = 0;
      this.update();
    }
    update() {
      this.render(this.time);
      this.onState(this);
    }
    pause() {
      if (this.frame !== null) this.cancel(this.frame);
      this.frame = null;
      this.playing = false;
      this.last = null;
      this.onState(this);
    }
    seek(time) {
      this.pause();
      this.time = Math.max(0, Math.min(this.end, time));
      this.update();
    }
    previous() {
      this.seek(Math.max(0, Math.ceil(this.time - 1e-8) - 1));
    }
    next() {
      this.start(Math.min(this.end, Math.floor(this.time + 1e-8) + 1));
    }
    play() {
      if (this.time >= this.end) this.seek(0);
      this.start(this.end);
    }
    replay() {
      this.seek(0);
      this.play();
    }
    start(target) {
      this.pause();
      this.target = target;
      if (target <= this.time) return;
      if (this.reduced()) {
        this.seek(target);
        return;
      }
      this.playing = true;
      this.onState(this);
      const tick = (stamp) => {
        if (!this.playing) return;
        if (this.last !== null)
          this.time = Math.min(
            this.target,
            this.time + (Math.min(stamp - this.last, 100) / 1800) * this.speed,
          );
        this.last = stamp;
        if (this.time >= this.target) {
          this.playing = false;
          this.frame = null;
          this.last = null;
          this.update();
        } else {
          this.update();
          this.frame = this.request(tick);
        }
      };
      this.frame = this.request(tick);
    }
  }
  if (typeof module !== "undefined") module.exports = LessonPlayer;
  else root.LessonPlayer = LessonPlayer;
})(globalThis);
