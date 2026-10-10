/* Game shell: title screen, scene navigation, fades, settings and pause menu. */
(function () {
  const C = window.GAME_CONTENT;
  const { Settings, Save, Audio, SceneTypes } = window.Game;
  const $ = sel => document.querySelector(sel);

  const app = $("#app");
  const menuScreen = $("#menu");
  const gameScreen = $("#game");
  const sceneRoot = $("#scene-root");
  const veil = $("#veil");

  let current = null;     // { id, instance }
  let busy = false;       // true while a fade is running

  /* ---------------- motion preference → <html> class ---------------- */
  function applyMotion() { document.documentElement.classList.toggle("reduce-motion", Settings.reducedMotion()); }
  applyMotion();
  Settings.onChange(n => { if (n === "motion") applyMotion(); });
  if (window.matchMedia) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    (mq.addEventListener ? mq.addEventListener("change", applyMotion) : mq.addListener(applyMotion));
  }

  /* ---------------- fades ---------------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function fade(swap) {
    busy = true;
    const ms = Settings.reducedMotion() ? 120 : 650;
    veil.style.setProperty("--fade-ms", ms + "ms");
    veil.classList.add("is-on");
    await sleep(ms);
    swap();
    await sleep(60);
    veil.classList.remove("is-on");
    await sleep(ms);
    busy = false;
  }

  /* ---------------- scenes ---------------- */
  function findScene(id) { return C.scenes.find(s => s.id === id); }

  function mountScene(id, state) {
    if (current && current.instance) current.instance.destroy();
    sceneRoot.innerHTML = "";
    const scene = findScene(id);
    if (!scene || !SceneTypes[scene.type]) {
      console.warn("Unknown scene:", id);
      current = null;
      return showMenu();
    }
    const ctx = {
      goTo(nextId, nextState) {
        if (busy) return;
        if (!nextId || !findScene(nextId)) { console.warn("No next scene set for", id); return; }
        Save.store(nextId, nextState || {});
        fade(() => mountScene(nextId, nextState || null));
      },
      save(s) { Save.store(id, s); },
      toMenu() { goToMenu(); }
    };
    current = { id, instance: SceneTypes[scene.type](sceneRoot, scene, ctx, state) };
  }

  function startNew() {
    Save.clear();
    fade(() => { showGame(); mountScene(C.scenes[0].id, null); });
  }

  function continueGame() {
    const s = Save.load();
    if (!s || !findScene(s.sceneId)) { Save.clear(); refreshMenu(); return; }
    fade(() => { showGame(); mountScene(s.sceneId, s.scene); });
  }

  function goToMenu() {
    // The scene saves as it goes, so leaving never loses progress.
    fade(() => {
      if (current && current.instance) current.instance.destroy();
      current = null;
      sceneRoot.innerHTML = "";
      showMenu();
    });
  }

  /* ---------------- screens ---------------- */
  function showGame() { menuScreen.hidden = true; gameScreen.hidden = false; app.dataset.screen = "game"; }
  function showMenu() {
    gameScreen.hidden = true; menuScreen.hidden = false; app.dataset.screen = "menu";
    refreshMenu();
    const first = menuScreen.querySelector(".menu__actions button:not([hidden])");
    if (first) first.focus({ preventScroll: true });
  }
  function refreshMenu() { $("#btn-continue").hidden = !Save.exists(); }

  /* ---------------- title screen setup ---------------- */
  document.title = C.title;
  $("#title").textContent = C.title;
  $("#subtitle").textContent = C.subtitle || "";
  $("#credits-list").innerHTML = "";
  (C.credits || []).forEach(line => {
    const li = document.createElement("li"); li.textContent = line; $("#credits-list").appendChild(li);
  });

  // drifting dust in the lamplight
  const motes = $("#motes");
  for (let i = 0; i < 26; i++) {
    const m = document.createElement("i");
    m.style.cssText = `--x:${Math.random() * 100}%;--y:${Math.random() * 100}%;--s:${2 + Math.random() * 4}px;--t:${14 + Math.random() * 18}s;--d:${-Math.random() * 30}s;--o:${0.25 + Math.random() * 0.5}`;
    motes.appendChild(m);
  }

  /* ---------------- dialogs ---------------- */
  function openDialog(d) {
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); }
    else d.setAttribute("open", "");
  }
  function closeDialog(d) {
    if (typeof d.close === "function" && d.open) d.close(); else d.removeAttribute("open");
  }
  document.querySelectorAll("dialog").forEach(d => {
    // click on the dimmed backdrop closes it
    d.addEventListener("click", e => { if (e.target === d) closeDialog(d); });
  });
  document.querySelectorAll("[data-close]").forEach(b =>
    b.addEventListener("click", () => { Audio.click(); closeDialog(b.closest("dialog")); }));

  const confirmDlg = $("#dlg-confirm"), settingsDlg = $("#dlg-settings"),
        creditsDlg = $("#dlg-credits"), pauseDlg = $("#dlg-pause");
  $("#confirm-text").textContent = C.ui.newGameConfirm;

  /* ---------------- buttons ---------------- */
  $("#btn-start").addEventListener("click", () => {
    if (busy) return;
    Audio.click();
    if (Save.exists()) openDialog(confirmDlg); else startNew();
  });
  $("#confirm-yes").addEventListener("click", () => { Audio.click(); closeDialog(confirmDlg); startNew(); });
  $("#btn-continue").addEventListener("click", () => { if (busy) return; Audio.click(); continueGame(); });
  $("#btn-settings").addEventListener("click", () => { Audio.click(); syncSettingsForm(); openDialog(settingsDlg); });
  $("#btn-credits").addEventListener("click", () => { Audio.click(); openDialog(creditsDlg); });

  $("#btn-pause").addEventListener("click", () => { if (busy) return; Audio.click(); openDialog(pauseDlg); });
  $("#pause-settings").addEventListener("click", () => { Audio.click(); closeDialog(pauseDlg); syncSettingsForm(); openDialog(settingsDlg); });
  $("#pause-restart").addEventListener("click", () => { Audio.click(); closeDialog(pauseDlg); startNew(); });
  $("#pause-menu").addEventListener("click", () => { Audio.click(); closeDialog(pauseDlg); goToMenu(); });

  /* ---------------- settings form ---------------- */
  const form = $("#settings-form");
  function syncSettingsForm() {
    form.elements.sound.checked = Settings.get("sound");
    form.elements.textSpeed.value = Settings.get("textSpeed");
    form.elements.motion.value = Settings.get("motion");
  }
  form.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "sound") { Settings.set("sound", t.checked); if (t.checked) Audio.click(); }
    else if (t.name === "textSpeed" || t.name === "motion") Settings.set(t.name, t.value);
  });
  form.addEventListener("submit", e => e.preventDefault());

  /* ---------------- go ---------------- */
  showMenu();
  requestAnimationFrame(() => document.body.classList.add("is-ready"));

  // small hook for automated testing / debugging
  window.Game.debug = { get scene() { return current && current.id; } };
})();
