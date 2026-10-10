/* Dialogue box with a typewriter effect.
   const box = Game.createDialogue(containerEl);
   await box.say("dino", "What would Yana want?");
   Clicking/tapping the box (or Enter/Space while it's focused) finishes the
   current line instantly. Screen readers get the whole line at once. */
(function () {
  const { Settings } = window.Game;

  function createDialogue(container) {
    const el = document.createElement("div");
    el.className = "dialogue";
    el.innerHTML = `
      <div class="dialogue__name" aria-hidden="true"></div>
      <p class="dialogue__text" aria-hidden="true"></p>
      <span class="dialogue__more" aria-hidden="true"></span>
      <p class="sr-only" aria-live="polite"></p>`;
    container.appendChild(el);

    const nameEl = el.querySelector(".dialogue__name");
    const textEl = el.querySelector(".dialogue__text");
    const liveEl = el.querySelector(".sr-only");

    let timer = null, finish = null, token = 0;

    function stop() { if (timer) { clearTimeout(timer); timer = null; } }

    function say(speakerId, line) {
      stop();
      if (finish) finish();             // resolve any line still typing
      const my = ++token;
      const chars = Array.from(line);   // Unicode-safe
      const speaker = (window.GAME_CONTENT.characters[speakerId] || {}).name || "";
      nameEl.textContent = speaker;
      nameEl.hidden = !speaker;
      liveEl.textContent = (speaker ? speaker + ": " : "") + line;
      el.classList.remove("is-done");
      el.classList.add("is-typing");
      // replay the soft "new line" animation
      el.classList.remove("is-new"); void el.offsetWidth; el.classList.add("is-new");

      return new Promise(resolve => {
        let i = 0;
        finish = () => {
          if (my !== token && finish === null) return;
          stop();
          textEl.textContent = line;
          el.classList.remove("is-typing");
          el.classList.add("is-done");
          finish = null;
          resolve();
        };
        if (Settings.reducedMotion()) { finish(); return; }
        textEl.textContent = "";
        const base = 34 * Settings.speedFactor();
        (function step() {
          if (my !== token) return;
          if (i >= chars.length) { finish && finish(); return; }
          const ch = chars[i++];
          textEl.textContent += ch;
          let delay = base;
          if (/[,;]/.test(ch)) delay = base * 5;
          else if (/[.!?…]/.test(ch)) delay = base * 8;
          timer = setTimeout(step, delay);
        })();
      });
    }

    function skip() { if (finish) finish(); }
    el.addEventListener("click", skip);

    return { el, say, skip, isTyping: () => !!finish, destroy() { stop(); token++; el.remove(); } };
  }

  window.Game.createDialogue = createDialogue;
})();
