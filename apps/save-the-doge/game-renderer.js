(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SaveTheDoge || (root.SaveTheDoge = {})).renderer = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  class GameRenderer {
    constructor({ canvas, core, config, dogImage, beeImage }) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.core = core;
      this.bee = config.bee;
      this.display = config.display;
      this.style = config.render;
      this.dogImage = dogImage;
      this.beeImage = beeImage;
    }

    paintPath(points, color, width = this.core.LINE_WIDTH) {
      if (!points.length) return;
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    drawSprite(image, point, size, angle = 0) {
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(angle);
      if (image.complete && image.naturalWidth) {
        // The source SVGs have transparent padding, so visible bodies—not the
        // image rectangles—must align with their collision centres.
        const centreY = image === this.dogImage ? this.display.dogSpriteCentreY : this.display.beeSpriteCentreY;
        ctx.drawImage(image, -size / 2, -size * centreY, size, size);
      } else {
        ctx.fillStyle = this.style.spriteFallbackColor;
        ctx.beginPath();
        ctx.arc(0, 0, size / 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawTerrain(level) {
      const ctx = this.ctx, style = this.style;
      ctx.fillStyle = style.gridColor;
      for (let x = style.gridSpacing; x < this.core.WIDTH; x += style.gridSpacing) {
        for (let y = style.gridSpacing; y < level.dangerY; y += style.gridSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, style.gridDotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.strokeStyle = style.dangerLineColor;
      ctx.lineWidth = style.dangerLineWidth;
      ctx.setLineDash(style.dangerDash);
      ctx.beginPath();
      ctx.moveTo(0, level.dangerY);
      ctx.lineTo(this.core.WIDTH, level.dangerY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = 'center';

      for (const platform of level.platforms) {
        const left = platform.x - platform.w / 2, top = platform.y - platform.h / 2;
        ctx.fillStyle = style.platformColor;
        ctx.fillRect(left, top, platform.w, platform.h);
        ctx.fillStyle = style.platformTopColor;
        ctx.fillRect(left, top, platform.w, style.platformEdgeWidth);
        ctx.fillStyle = style.platformBottomColor;
        ctx.fillRect(left, platform.y + platform.h / 2 - style.platformEdgeWidth, platform.w, style.platformEdgeWidth);
      }
      for (const hive of level.hives) {
        ctx.beginPath();
        ctx.arc(hive.x, hive.y, this.bee.hiveRadius, 0, Math.PI * 2);
        ctx.fillStyle = style.hiveColor;
        ctx.fill();
        ctx.strokeStyle = style.hiveBorderColor;
        ctx.lineWidth = 1;
        ctx.setLineDash(style.hiveDash);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    drawImpact(bee) {
      const impact = bee.plugin.impact;
      if (!impact.active || !impact.point) return;
      const ctx = this.ctx, point = impact.point;
      const angle = Math.atan2(point.y - bee.position.y, point.x - bee.position.x);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(angle);
      ctx.beginPath();
      for (const offset of [-1, 0, 1]) {
        ctx.moveTo(3, offset * 4);
        ctx.lineTo(7, offset * 7);
      }
      ctx.strokeStyle = this.style.impactColor;
      ctx.lineWidth = this.style.impactLineWidth;
      ctx.stroke();
      ctx.restore();
    }

    drawSimulation(simulation) {
      for (const body of simulation.lines) this.paintPath(this.core.worldPoints(body), this.style.strokeColor);
      for (const bee of simulation.bees) {
        const impact = bee.plugin.impact;
        const elapsed = this.bee.impactDurationSteps - impact.remaining;
        const tilt = impact.active ? Math.sin(elapsed * Math.PI / this.style.impactTiltDivisor) * this.style.impactTilt : 0;
        this.drawSprite(this.beeImage, bee.position, this.display.beeSpriteSize, tilt);
        this.drawImpact(bee);
      }
      this.drawSprite(this.dogImage, simulation.dog.position, this.display.dogSpriteSize, simulation.dog.angle);
    }

    drawEditor({ level, editor, selected, draft, draftError }) {
      for (const stroke of editor.strokes) {
        if (stroke.id === selected) this.paintPath(stroke.points, this.style.selectedColor, this.display.selectionWidth);
        this.paintPath(stroke.points, this.style.strokeColor);
      }
      for (const hive of level.hives) {
        for (let index = 0; index < hive.count; index++) {
          const angle = index * Math.PI * 2 / hive.count;
          const point = {
            x: hive.x + Math.cos(angle) * this.bee.hiveSpawnRadius,
            y: hive.y + Math.sin(angle) * this.bee.hiveSpawnRadius
          };
          this.drawSprite(this.beeImage, point, this.display.beeSpriteSize);
        }
      }
      this.drawSprite(this.dogImage, level.dog, this.display.dogSpriteSize);
      if (draft.length) this.paintPath(draft, draftError ? this.style.selectedColor : this.style.strokeColor);
    }

    render({ level, editor, selected, draft, draftError, simulation, phase, view, pixelRatio }) {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = this.style.boardColor;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const dangerTop = pixelRatio * (view.y + level.dangerY * view.scale);
      ctx.fillStyle = this.style.dangerAreaColor;
      ctx.fillRect(0, dangerTop, this.canvas.width, this.canvas.height - dangerTop);
      ctx.setTransform(pixelRatio * view.scale, 0, 0, pixelRatio * view.scale, pixelRatio * view.x, pixelRatio * view.y);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.core.WIDTH, this.core.HEIGHT);
      ctx.clip();
      this.drawTerrain(level);
      if (simulation) this.drawSimulation(simulation);
      else this.drawEditor({ level, editor, selected, draft, draftError });
      if (phase === 'lost' && simulation.result.point) {
        const point = simulation.result.point;
        ctx.beginPath();
        ctx.arc(point.x, point.y, this.display.failureRadius, 0, Math.PI * 2);
        ctx.strokeStyle = this.style.selectedColor;
        ctx.lineWidth = this.style.failureLineWidth;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  return { GameRenderer };
});
