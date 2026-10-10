/* Settings + save data, persisted in localStorage.
   Every access is wrapped: private windows or blocked storage just mean
   nothing is remembered — the game still plays normally. */
(function () {
  const SETTINGS_KEY = "yana-game:settings:v1";
  const SAVE_KEY = "yana-game:save:v1";

  function read(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }
  function remove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* ---------------- Settings ---------------- */
  const DEFAULT_SETTINGS = {
    sound: true,          // sound effects (only ever play after a click/tap)
    textSpeed: "normal",  // "slow" | "normal" | "fast"
    motion: "system"      // "system" | "reduced" | "full"
  };

  const listeners = [];
  let settings = Object.assign({}, DEFAULT_SETTINGS, read(SETTINGS_KEY) || {});

  const Settings = {
    get(name) { return settings[name]; },
    set(name, value) {
      settings[name] = value;
      write(SETTINGS_KEY, settings);
      listeners.forEach(fn => fn(name, value));
    },
    onChange(fn) { listeners.push(fn); },
    /** Multiplier applied to all text timings (higher = slower). */
    speedFactor() {
      return { slow: 1.6, normal: 1, fast: 0.5 }[settings.textSpeed] || 1;
    },
    reducedMotion() {
      if (settings.motion === "reduced") return true;
      if (settings.motion === "full") return false;
      return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  };

  /* ---------------- Save data ----------------
     { version, sceneId, scene: { ...scene-specific progress }, savedAt } */
  const Save = {
    load() {
      const data = read(SAVE_KEY);
      if (!data || data.version !== 1 || typeof data.sceneId !== "string") return null;
      return data;
    },
    exists() { return !!Save.load(); },
    store(sceneId, sceneState) {
      write(SAVE_KEY, { version: 1, sceneId, scene: sceneState || {}, savedAt: Date.now() });
    },
    clear() { remove(SAVE_KEY); }
  };

  window.Game = window.Game || {};
  window.Game.Settings = Settings;
  window.Game.Save = Save;
})();
