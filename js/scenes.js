/* Scene types. Each scene type is a function:
     render(root, scene, ctx, saved) -> { destroy() }
   ctx.goTo(sceneId, state?)   moves to another scene (with a fade)
   ctx.save(state)             stores this scene's progress
   `saved` is whatever this scene last saved (or null for a fresh start).
   To add a new kind of scene later, add a function to SceneTypes. */
(function () {
  const { Audio, Settings, createDialogue, createLetterWriter } = window.Game;
  const UI = () => window.GAME_CONTENT.ui;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* Shared backdrop: a quiet room at night — window, lamp glow, desk edge. */
  function roomBackdrop() {
    return el("div", "room", `
      <div class="room__wall"></div>
      <div class="room__window" aria-hidden="true">
        <div class="room__sky">${Array.from({ length: 14 }, (_, i) =>
          `<i style="--x:${(i * 37) % 100}%;--y:${(i * 53) % 90}%;--d:${(i % 5) * 0.9}s"></i>`).join("")}</div>
        <div class="room__moon"></div>
        <div class="room__pane"></div>
      </div>
      <div class="room__lamp" aria-hidden="true"></div>
      <div class="room__desk" aria-hidden="true">
        <div class="room__mug"></div>
        <div class="room__books"><span></span><span></span><span></span></div>
      </div>`);
  }

  const SceneTypes = {};

  /* ======================= CHOICE SCENE ======================= */
  SceneTypes.choice = function (root, scene, ctx) {
    const wrap = el("section", "scene scene--choice");
    wrap.setAttribute("aria-label", "Scene: " + scene.prompt);
    wrap.appendChild(roomBackdrop());

    const stage = el("div", "stage");
    if (scene.setting) stage.appendChild(el("p", "stage__caption", scene.setting));

    const choicesEl = el("div", "choices");
    choicesEl.setAttribute("role", "group");
    choicesEl.setAttribute("aria-label", "Choose an answer");
    const buttons = scene.choices.map((c, i) => {
      const b = el("button", "choice");
      b.type = "button";
      b.innerHTML = `<span class="choice__num" aria-hidden="true">${i + 1}</span><span class="choice__text"></span><span class="choice__mark" aria-hidden="true"></span>`;
      b.querySelector(".choice__text").textContent = c.text;
      b.addEventListener("click", () => pick(i));
      choicesEl.appendChild(b);
      return b;
    });
    stage.appendChild(choicesEl);

    const dlgHost = el("div", "stage__dialogue");
    stage.appendChild(dlgHost);
    wrap.appendChild(stage);
    root.appendChild(wrap);

    const dialogue = createDialogue(dlgHost);
    let locked = true, finished = false, alive = true;

    function setLocked(v) {
      locked = v;
      choicesEl.classList.toggle("is-locked", v);
      buttons.forEach(b => b.setAttribute("aria-disabled", v ? "true" : "false"));
    }

    async function pick(i) {
      if (locked || finished) return;
      const choice = scene.choices[i], btn = buttons[i];
      if (choice.correct) {
        finished = true;
        setLocked(true);
        btn.classList.add("is-right");
        btn.querySelector(".choice__mark").textContent = "✓";
        btn.setAttribute("aria-label", choice.text + " — that's it");
        Audio.right();
        await wait(Settings.reducedMotion() ? 400 : 1100);
        if (alive) ctx.goTo(scene.next);
        return;
      }
      // Wrong answer: Dino shrugs it off, then every option is available again.
      setLocked(true);
      Audio.wrong();
      btn.classList.remove("is-wrong"); void btn.offsetWidth; btn.classList.add("is-wrong");
      btn.querySelector(".choice__mark").textContent = "✕";
      await dialogue.say(scene.speaker, scene.wrongResponse);
      await wait(450);
      if (!alive || finished) return;
      btn.classList.remove("is-wrong");
      btn.querySelector(".choice__mark").textContent = "";
      setLocked(false);
      btn.focus({ preventScroll: true });
    }

    function onKey(e) {
      if (e.target.closest && e.target.closest("dialog")) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= buttons.length) { e.preventDefault(); if (!locked) buttons[n - 1].focus(); pick(n - 1); }
    }
    document.addEventListener("keydown", onKey);

    ctx.save({});
    setLocked(true);
    (async () => {
      await wait(Settings.reducedMotion() ? 100 : 700);
      if (!alive) return;
      await dialogue.say(scene.speaker, scene.prompt);
      await wait(250);
      if (!alive) return;
      choicesEl.classList.add("is-visible");
      setLocked(false);
      buttons[0].focus({ preventScroll: true });
    })();

    return { destroy() { alive = false; document.removeEventListener("keydown", onKey); dialogue.destroy(); } };
  };

  /* ======================= LETTER SCENE ======================= */
  SceneTypes.letter = function (root, scene, ctx, saved) {
    saved = saved || {};
    const wrap = el("section", "scene scene--letter");
    wrap.setAttribute("aria-label", "Scene: Dino writes a letter");
    wrap.appendChild(el("div", "desk", `<div class="desk__glow"></div><div class="desk__grain"></div>`));

    const sheet = el("div", "sheet");
    const paper = el("div", "paper");
    paper.tabIndex = 0;
    paper.setAttribute("role", "button");
    paper.setAttribute("aria-label", "The letter. Press Enter to write faster, again to finish.");
    sheet.appendChild(paper);
    wrap.appendChild(sheet);

    const footer = el("div", "letter-footer");
    const hint = el("p", "letter-hint");
    hint.setAttribute("aria-live", "polite");
    const cont = el("button", "btn btn--primary letter-continue");
    cont.type = "button";
    cont.textContent = UI().letterContinue;
    cont.hidden = true;
    footer.append(hint, cont);
    wrap.appendChild(footer);
    root.appendChild(wrap);

    let alive = true, lastStage = 0;
    const writer = createLetterWriter(paper, scene.text, {
      startAt: saved.complete ? Infinity : (saved.wordsShown || 0),
      onWord(shown, total) {
        if (shown < total) ctx.save({ wordsShown: shown });
      },
      async onDone() {
        ctx.save({ complete: true });
        hint.textContent = "";
        hint.classList.remove("is-visible");
        paper.setAttribute("aria-label", "The finished letter.");
        paper.removeAttribute("role");
        await wait(saved.complete ? 300 : (Settings.reducedMotion() ? 600 : 1600));
        if (!alive) return;
        cont.hidden = false;
        requestAnimationFrame(() => cont.classList.add("is-visible"));
        cont.focus({ preventScroll: true });
      }
    });

    function escalate() {
      const now = performance.now();
      if (now - lastStage < 350) return;   // swallow accidental double-taps
      if (writer.state !== "writing") return;
      lastStage = now;
      if (writer.speed < 4) {
        writer.hurry();
        hint.textContent = UI().letterHintFast;
      } else {
        writer.finishNow();
      }
    }

    paper.addEventListener("click", escalate);
    wrap.querySelector(".desk").addEventListener("click", escalate);
    paper.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); escalate(); }
    });
    cont.addEventListener("click", () => {
      if (writer.state !== "done") return;
      Audio.click();
      cont.disabled = true;
      ctx.goTo(scene.next);
    });

    if (!saved.complete) {
      hint.textContent = UI().letterHintWriting;
      setTimeout(() => alive && hint.classList.add("is-visible"), 1400);
    }
    writer.start();
    return { destroy() { alive = false; writer.destroy(); } };
  };

  /* ======================= END / PLACEHOLDER SCENE ======================= */
  SceneTypes.end = function (root, scene, ctx) {
    const wrap = el("section", "scene scene--end");
    wrap.appendChild(el("div", "desk", `<div class="desk__glow"></div><div class="desk__grain"></div>`));
    const card = el("div", "end-card");
    const h = el("h2", "end-card__title"); h.textContent = scene.heading;
    const p = el("p", "end-card__body"); p.textContent = scene.body;
    const actions = el("div", "end-card__actions");
    const again = el("button", "btn", "Read the letter again"); again.type = "button";
    const menu = el("button", "btn btn--ghost", "Main menu"); menu.type = "button";
    actions.append(again, menu);
    card.append(h, p, actions);
    wrap.appendChild(card);
    root.appendChild(wrap);

    const letterScene = window.GAME_CONTENT.scenes.find(s => s.type === "letter");
    if (!letterScene) again.hidden = true;
    again.addEventListener("click", () => { Audio.click(); ctx.goTo(letterScene.id, { complete: true }); });
    menu.addEventListener("click", () => { Audio.click(); ctx.toMenu(); });
    ctx.save({});
    setTimeout(() => again.focus({ preventScroll: true }), 50);
    return { destroy() {} };
  };

  window.Game.SceneTypes = SceneTypes;
})();
