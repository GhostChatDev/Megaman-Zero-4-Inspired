/* Nighttail — synthesised sound. No audio files, everything is generated. */
window.NT = window.NT || {};
NT.audio = (function () {
  var ctx = null, master = null, musicGain = null;
  var musicOn = true, musicTimer = null, step = 0;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    return ctx;
  }

  function tone(freq, dur, type, when, gain, target) {
    if (!ensure()) return;
    var t0 = ctx.currentTime + (when || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.22, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(target || master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise(dur, when, gain, hz) {
    if (!ensure()) return;
    var t0 = ctx.currentTime + (when || 0);
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = hz || 900;
    var g = ctx.createGain();
    g.gain.value = gain || 0.25;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  var SFX = {
    jump:    function () { tone(420, 0.16, "square", 0, 0.16); tone(720, 0.12, "square", 0.04, 0.1); },
    dash:    function () { noise(0.22, 0, 0.3, 1500); tone(280, 0.2, "sawtooth", 0, 0.12); },
    cut:     function () { noise(0.14, 0, 0.28, 2400); tone(660, 0.1, "square", 0, 0.1); },
    cut2:    function () { noise(0.14, 0, 0.3, 1900); tone(520, 0.12, "square", 0, 0.12); },
    hit:     function () { noise(0.1, 0, 0.34, 1100); tone(180, 0.1, "square", 0, 0.14); },
    parry:   function () { tone(1180, 0.18, "triangle", 0, 0.2); tone(1580, 0.16, "triangle", 0.05, 0.14); },
    pickup:  function () { tone(880, 0.1, "triangle", 0, 0.14); tone(1320, 0.14, "triangle", 0.07, 0.12); },
    check:   function () { tone(520, 0.14, "triangle", 0, 0.16); tone(780, 0.14, "triangle", 0.1, 0.14); tone(1040, 0.22, "triangle", 0.2, 0.12); },
    hurt:    function () { tone(220, 0.3, "sawtooth", 0, 0.2); noise(0.2, 0, 0.2, 500); },
    die:     function () { tone(300, 0.5, "sawtooth", 0, 0.18); tone(180, 0.7, "sawtooth", 0.16, 0.16); },
    clear:   function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.3, "triangle", i * 0.11, 0.16); }); },
    bossHit: function () { noise(0.15, 0, 0.36, 800); tone(140, 0.16, "square", 0, 0.16); },
    roar:    function () { tone(120, 0.7, "sawtooth", 0, 0.2); tone(180, 0.6, "sawtooth", 0.1, 0.14); noise(0.5, 0, 0.18, 300); }
  };

  function sfx(name) {
    if (!ensure()) return;
    if (ctx.state === "suspended") ctx.resume();
    var fn = SFX[name];
    if (fn) fn();
  }

  // A slow minor arpeggio, one note every 300 ms.
  var ROOT = [110.00, 116.54, 87.31, 98.00];
  var PATTERN = [0, 3, 7, 10, 12, 10, 7, 3];
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = setInterval(function () {
      if (!musicOn || ctx.state === "suspended") return;
      var bar = ROOT[(step >> 3) % ROOT.length];
      var semi = PATTERN[step % PATTERN.length];
      var f = bar * Math.pow(2, semi / 12);
      tone(f, 0.34, "triangle", 0, 0.5, musicGain);
      if (step % 4 === 0) tone(bar / 2, 0.5, "sine", 0, 0.5, musicGain);
      step++;
    }, 300);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }
  function setMusic(on) {
    musicOn = !!on;
    if (musicOn) startMusic(); else stopMusic();
    return musicOn;
  }
  function unlock() { if (ensure() && ctx.state === "suspended") ctx.resume(); }
  return { sfx: sfx, setMusic: setMusic, unlock: unlock, isOn: function () { return musicOn; } };
})();
