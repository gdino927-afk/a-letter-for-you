/* Tiny synthesized sound effects (Web Audio) — no audio files needed.
   The AudioContext is only created after the player's first click/tap,
   so browsers never block it and nothing autoplays. If Web Audio is
   unavailable, every call silently does nothing. */
(function () {
  let ctx = null;
  let noiseBuffer = null;

  function enabled() { return window.Game.Settings.get("sound"); }

  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume().catch(() => {}); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch (e) { return null; }
    // half a second of soft noise, reused for pen scratches
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  // Unlock on first interaction.
  ["pointerdown", "keydown"].forEach(evt =>
    window.addEventListener(evt, () => { if (enabled()) ensure(); }, { once: true, capture: true }));

  function tone(freq, start, dur, vol, type) {
    const c = ensure(); if (!c) return;
    const t = c.currentTime + start;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }

  const Audio = {
    /** soft wooden tick for buttons */
    click() { if (enabled()) tone(660, 0, 0.08, 0.04, "triangle"); },
    /** small, deflated two-note shrug for wrong answers */
    wrong() { if (!enabled()) return; tone(330, 0, 0.16, 0.05, "triangle"); tone(262, 0.12, 0.22, 0.05, "triangle"); },
    /** warm rising chime for the right answer */
    right() {
      if (!enabled()) return;
      [523.25, 659.25, 783.99].forEach((f, i) => tone(f, i * 0.09, 0.6, 0.045, "sine"));
    },
    /** quiet pen scratch; length scales with the word */
    pen(chars) {
      if (!enabled()) return;
      const c = ensure(); if (!c || !noiseBuffer) return;
      const dur = Math.min(0.08 + chars * 0.025, 0.4);
      const src = c.createBufferSource(); src.buffer = noiseBuffer;
      const bp = c.createBiquadFilter(); bp.type = "bandpass";
      bp.frequency.value = 2400 + Math.random() * 1400; bp.Q.value = 0.9;
      const g = c.createGain(); const t = c.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.022, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t, Math.random() * 0.2, dur + 0.02);
    }
  };

  window.Game.Audio = Audio;
})();
