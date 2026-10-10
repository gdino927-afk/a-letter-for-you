/* Word-by-word handwriting animation.

   const writer = Game.createLetterWriter(paperEl, text, { startAt, onWord, onDone });
   writer.start();       // begins (or resumes) writing
   writer.hurry();       // stage 1: writes faster
   writer.finishNow();   // stage 2: reveals everything immediately

   The whole letter is laid out invisibly first, so words never jump or
   re-wrap as they appear — each one simply gets "inked" in place. */
(function () {
  const { Settings, Audio } = window.Game;

  /** Split letter text into paragraphs → lines → words, keeping punctuation. */
  function parse(text) {
    const normalized = String(text).replace(/\r\n?/g, "\n").trim();
    return normalized.split(/\n[ \t]*\n+/).map(par =>
      par.split("\n").map(line => line.trim().split(/[ \t]+/).filter(Boolean)));
  }

  /** How long to wait after a word, to feel like a hand, not a metronome. */
  function pauseAfter(word, endsLine, endsParagraph) {
    const len = Array.from(word).length;
    let ms = 140 + len * 38;                       // longer words take longer
    ms *= 0.8 + Math.random() * 0.45;              // human unevenness
    if (/[,;:]$/.test(word)) ms += 220;
    if (/[.!?…]["'”’)\]]*$/.test(word)) ms += 480;
    if (/[—–-]$/.test(word)) ms += 200;
    if (endsLine) ms += 380;
    if (endsParagraph) ms += 650;
    if (Math.random() < 0.06) ms += 450;           // the occasional pause to think
    return ms;
  }

  function createLetterWriter(paper, text, opts) {
    opts = opts || {};
    const body = document.createElement("div");
    body.className = "letter__body";
    const words = [];

    parse(text).forEach((lines, p, pars) => {
      const pEl = document.createElement("p");
      pEl.className = "letter__para";
      lines.forEach((lineWords, l) => {
        if (l > 0) pEl.appendChild(document.createElement("br"));
        lineWords.forEach((w, i) => {
          const span = document.createElement("span");
          span.className = "word";
          span.textContent = w;
          pEl.appendChild(span);
          if (i < lineWords.length - 1) pEl.appendChild(document.createTextNode(" "));
          words.push({
            el: span, text: w,
            delay: pauseAfter(w, i === lineWords.length - 1, i === lineWords.length - 1 && l === lines.length - 1 && p < pars.length - 1)
          });
        });
      });
      body.appendChild(pEl);
    });
    paper.appendChild(body);

    // Screen readers get the full letter once; the animated spans are hidden from them.
    const live = document.createElement("div");
    live.className = "sr-only";
    live.textContent = String(text);
    body.setAttribute("aria-hidden", "true");
    paper.appendChild(live);

    const pen = document.createElement("div");
    pen.className = "pen";
    pen.setAttribute("aria-hidden", "true");
    pen.innerHTML = `<svg viewBox="0 0 24 120" width="18" height="90"><path d="M12 118 L8 92 L8 14 Q12 4 16 14 L16 92 Z" fill="var(--pen-body)"/><path d="M12 118 L9.4 100 L14.6 100 Z" fill="var(--pen-nib)"/><rect x="8" y="30" width="8" height="5" fill="var(--pen-band)"/></svg>`;
    // The pen lives OUTSIDE the scrolling paper (in its parent), so its position
    // can never stretch the paper's scrollable area.
    (paper.parentElement || paper).appendChild(pen);

    let index = 0, timer = null, speed = 1, state = "idle"; // idle | writing | done
    let scrollTarget = null, scrollTimer = null;           // where an in-flight smooth scroll will land

    function currentScroll() { return scrollTarget == null ? paper.scrollTop : scrollTarget; }

    function placePen(wordEl) {
      if (Settings.reducedMotion()) { pen.classList.remove("is-visible"); return; }
      const pr = paper.getBoundingClientRect(), wr = wordEl.getBoundingClientRect();
      // word position inside the paper's content, then shifted by where the paper will be scrolled
      const x = paper.offsetLeft + (wr.right - pr.left);
      const y = paper.offsetTop + (wr.bottom - pr.top + paper.scrollTop) - currentScroll();
      if (y < 0 || y > paper.offsetTop + paper.clientHeight) { pen.classList.remove("is-visible"); return; }
      pen.style.transform = `translate(${x - 2}px, ${y - 90}px) rotate(18deg)`;
      pen.classList.add("is-visible");
    }

    function keepInView(wordEl) {
      const pr = paper.getBoundingClientRect(), wr = wordEl.getBoundingClientRect();
      const margin = 48;
      const wordBottom = wr.bottom - pr.top + paper.scrollTop;          // in content coordinates
      const visibleBottom = currentScroll() + paper.clientHeight - margin;
      if (wordBottom <= visibleBottom) return;
      const maxScroll = Math.max(0, paper.scrollHeight - paper.clientHeight);
      const target = Math.min(maxScroll, Math.round(wordBottom - paper.clientHeight + margin * 2));
      if (target <= currentScroll()) return;
      const smooth = !Settings.reducedMotion();
      scrollTarget = target;
      paper.scrollTo({ top: target, behavior: smooth ? "smooth" : "auto" });
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        // If the smooth scroll didn't land (some browsers pause it), jump there directly.
        if (Math.abs(paper.scrollTop - target) > 2) paper.scrollTop = target;
        scrollTarget = null;
      }, smooth ? 700 : 0);
    }

    function reveal(i, instant) {
      const w = words[i];
      w.el.classList.add(instant ? "is-shown" : "is-writing");
      if (!instant) {
        w.el.style.setProperty("--ink-ms", Math.max(140, Math.min(520, Array.from(w.text).length * 55)) / speed + "ms");
      }
    }

    function tick() {
      timer = null;
      if (state !== "writing") return;
      if (index >= words.length) { complete(); return; }
      const i = index++;
      reveal(i, false);
      keepInView(words[i].el);
      placePen(words[i].el);
      if (speed < 3) Audio.pen(Array.from(words[i].text).length);
      if (opts.onWord) opts.onWord(index, words.length);
      if (index >= words.length) { timer = setTimeout(complete, 350); return; }
      timer = setTimeout(tick, (words[i].delay * Settings.speedFactor()) / speed);
    }

    function complete() {
      if (state === "done") return;
      clearTimeout(timer); timer = null;
      for (let i = 0; i < words.length; i++) {
        if (!words[i].el.classList.contains("is-writing")) words[i].el.classList.add("is-shown");
      }
      index = words.length;
      state = "done";
      if (words.length) keepInView(words[words.length - 1].el);   // bring the sign-off into view
      pen.classList.remove("is-visible");
      paper.classList.add("is-complete");
      if (opts.onWord) opts.onWord(index, words.length);
      if (opts.onDone) opts.onDone();
    }

    return {
      get state() { return state; },
      get speed() { return speed; },
      total: words.length,
      start() {
        if (state !== "idle") return;
        // Restore earlier progress instantly (from a save).
        const startAt = Math.max(0, Math.min(opts.startAt || 0, words.length));
        for (let i = 0; i < startAt; i++) reveal(i, true);
        index = startAt;
        if (Settings.reducedMotion()) speed = 1.5; // still word by word, just calmer: no pen, no ink sweep
        state = "writing";
        if (index >= words.length) { complete(); return; }
        if (startAt > 0) keepInView(words[startAt - 1].el);
        timer = setTimeout(tick, startAt > 0 ? 500 : 900);
      },
      hurry() {
        if (state !== "writing" || speed >= 4) return;
        speed = 4;
        if (timer) { clearTimeout(timer); timer = setTimeout(tick, 60); }
      },
      finishNow() { if (state === "writing") complete(); },
      destroy() { clearTimeout(timer); state = "done"; }
    };
  }

  window.Game.createLetterWriter = createLetterWriter;
  window.Game.parseLetter = parse;
})();
