(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SaveTheDoge || (root.SaveTheDoge = {})).storage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function emptyRecord() {
    return { draft: [], won: false, best: null };
  }

  class ProgressStore {
    constructor({ storage, levels, core, config }) {
      this.storage = storage;
      this.levels = levels;
      this.core = core;
      this.config = config.storage;
      this.records = {};
      this.currentIndex = 0;
      this.available = true;
      this.upgradeNotice = false;
      this.load();
    }

    load() {
      try {
        const saved = JSON.parse(this.storage.getItem(this.config.key));
        if (!saved) this.loadLegacyIndex();
        if (!saved || saved.version !== this.config.version || !saved.levels || typeof saved.levels !== 'object') return;

        for (const level of this.levels) {
          const record = saved.levels[level.id];
          if (!record || typeof record !== 'object') continue;
          this.records[level.id] = {
            draft: this.core.validatePlan(level, record.draft) ? record.draft : [],
            won: record.won === true,
            best: this.core.validatePlan(level, record.best) && record.best.length ? record.best : null
          };
        }
        this.currentIndex = this.clampIndex(saved.lastLevel);
      } catch (_) {
        this.available = false;
      }
    }

    loadLegacyIndex() {
      let legacy = null;
      for (const key of this.config.legacyKeys) {
        legacy = this.storage.getItem(key);
        if (legacy !== null) break;
      }
      this.upgradeNotice = legacy !== null;
      if (!legacy) return;
      try {
        const previous = JSON.parse(legacy);
        this.currentIndex = this.clampIndex(previous?.lastLevel);
      } catch (_) {
        // An unreadable old save must not prevent starting over.
      }
    }

    clampIndex(index) {
      return Number.isInteger(index) ? Math.max(0, Math.min(this.levels.length - 1, index)) : this.currentIndex;
    }

    record(level) {
      return this.records[level.id] || (this.records[level.id] = emptyRecord());
    }

    persist(currentIndex) {
      try {
        this.storage.setItem(this.config.key, JSON.stringify({
          version: this.config.version,
          lastLevel: currentIndex,
          levels: this.records
        }));
        this.available = true;
      } catch (_) {
        this.available = false;
      }
      return this.available;
    }

    consumeUpgradeNotice() {
      const visible = this.upgradeNotice;
      this.upgradeNotice = false;
      return visible;
    }
  }

  return { ProgressStore };
});
