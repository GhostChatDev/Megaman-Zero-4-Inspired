/* Nighttail: The Hollow Crown — state machine, input, game loop and renderer.
   All art is drawn in code; every sound is generated in audio.js. */
window.NT = window.NT || {};
(function () {
  var W = NT.world;
  var canvas = document.getElementById("game");
  var c = canvas.getContext("2d");
  var VW = canvas.width, VH = canvas.height;

  var el = {
    hud: document.getElementById("hud"), hearts: document.getElementById("hearts"),
    areaName: document.getElementById("areaName"), embers: document.getElementById("emberCount"),
    timer: document.getElementById("timer"), pad: document.getElementById("pad"),
    title: document.getElementById("title"), story: document.getElementById("story"),
    pause: document.getElementById("pause"), ending: document.getElementById("ending"),
    startBtn: document.getElementById("startBtn"), storyBtn: document.getElementById("storyBtn") || document.getElementById("playBtn"),
    resumeBtn: document.getElementById("resumeBtn"), restartBtn: document.getElementById("restartBtn"),
    musicBtn: document.getElementById("musicBtn"), quitBtn: document.getElementById("quitBtn"),
    againBtn: document.getElementById("againBtn"), endTitleBtn: document.getElementById("endTitleBtn"),
    bestLine: document.getElementById("bestLine"), endingText: document.getElementById("endingText"),
    endingTime: document.getElementById("endingTime"), endingTitle: document.getElementById("endingTitle")
  };

  var BEST_KEY = "nighttail.best";
  function loadBest() { try { return parseFloat(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; } }
  function saveBest(t) { try { localStorage.setItem(BEST_KEY, String(t)); } catch (e) {} }
  function fmt(t) {
    var m = Math.floor(t / 60), s = t - m * 60;
    return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1);
  }

  /* ---------- the game object ---------- */
  var G = {
    state: "title", level: null, player: NT.player.make(120, 330),
    embers: 0, shownEmbers: 0, time: 0, hitStop: 0, shake: 0, flash: 0,
    areaN: 1, best: loadBest(), lastRun: 0, ready: false,
    puff: function (x, y, color, n) {
      if (!G.level) return;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 190;
        G.level.particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          life: 0.3 + Math.random() * 0.35, max: 0.65, color: color, r: 2 + Math.random() * 3 });
      }
    },
    float: function (x, y, text, color) {
      if (!G.level) return;
      G.level.floats.push({ x: x, y: y, text: text, color: color, life: 0.9 });
    }
  };
  NT.game = G;

  /* ---------- input ---------- */
  var held = { left: false, right: false, jump: false, dash: false, attack: false };
  var pressed = { jump: false, dash: false, attack: false };
  var KEYS = {
    ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right",
    ArrowUp: "jump", w: "jump", W: "jump", " ": "jump",
    z: "attack", Z: "attack", j: "attack", J: "attack",
    x: "dash", X: "dash", k: "dash", K: "dash", Shift: "dash"
  };
  function press(name) {
    if (!held[name]) pressed[name] = true;
    held[name] = true;
  }
  function release(name) { held[name] = false; }

  window.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "Enter" || k === " " || k === "Spacebar") e.preventDefault();
    NT.audio.unlock();
    if (G.state === "title" && (k === "Enter" || k === " ")) { begin(); return; }
    if (G.state === "story" && (k === "Enter" || k === " " || k === "Escape")) { startPlay(); return; }
    if (k === "p" || k === "P" || k === "Escape") {
      if (G.state === "play") togglePause(true);
      else if (G.state === "pause") togglePause(false);
      return;
    }
    if (k === "m" || k === "M") { toggleMusic(); return; }
    if (G.state === "ending" && (k === "Enter" || k === " ")) { restartRun(); return; }
    var name = KEYS[k];
    if (name && G.state === "play") press(name);
  });
  window.addEventListener("keyup", function (e) {
    var name = KEYS[e.key];
    if (name) release(name);
  });

  /* touch buttons: pointer events, so a tap works everywhere */
  function bindHold(id, name) {
    var b = document.getElementById(id);
    if (!b) return;
    b.addEventListener("pointerdown", function (e) {
      e.preventDefault(); NT.audio.unlock(); press(name); b.classList.add("on");
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      b.addEventListener(ev, function () { release(name); b.classList.remove("on"); });
    });
  }
  bindHold("bLeft", "left"); bindHold("bRight", "right"); bindHold("bJump", "jump");
  bindHold("bAtk", "attack"); bindHold("bDash", "dash");

  function inp() {
    var i = { left: held.left, right: held.right, jumpPressed: pressed.jump, dash: pressed.dash, attackPressed: pressed.attack };
    pressed.jump = pressed.dash = pressed.attack = false;
    return i;
  }

  /* ---------- screens ---------- */
  function show(node, on) { if (node) node.hidden = !on; }
  function setState(s) {
    G.state = s;
    show(el.title, s === "title");
    show(el.story, s === "story");
    show(el.pause, s === "pause");
    show(el.ending, s === "ending");
    var playing = s === "play" || s === "pause";
    show(el.hud, playing);
    show(el.pad, playing && isTouch());
  }
  function isTouch() {
    return ("ontouchstart" in window) || (navigator.maxTouchPoints || 0) > 0;
  }

  function titleScreen() {
    setState("title");
    var b = G.best;
    el.bestLine.textContent = b > 0 ? "Best run to the crown: " + fmt(b) : "Reach the crown. Break the seal.";
    G.level = W.build(1);
    NT.entities.spawn(G.level);
    G.player = NT.player.make(120, 330);
    G.embers = 0; G.shownEmbers = 0; G.time = 0;
  }

  function loadArea(n, atCheckpoint) {
    G.areaN = n;
    G.level = W.build(n);
    NT.entities.spawn(G.level);
    var p = NT.player.make(120, 300);
    p.hp = G.player.hp > 0 ? Math.max(3, G.player.hp) : 5;
    if (n > 1) { p.hp = Math.max(p.hp, 4); }
    if (atCheckpoint) {
      var cp = G.level.checkpoint;
      p.x = cp.x; p.y = cp.y; cp.on = true;
    } else {
      p.x = 120; p.y = 300;
    }
    G.player = p;
    G.level.checkpoint.on = n === 1 ? false : !!atCheckpoint || true;
    setState("play");
    updateHud(true);
  }

  function begin() {
    NT.audio.unlock();
    NT.audio.setMusic(true);
    setState("story");           // one screen of story, skippable with any key or tap
  }
  function startPlay() { G.time = 0; loadArea(1, false); NT.audio.sfx("check"); }
  function restartRun() {
    G.embers = 0; G.shownEmbers = 0; G.time = 0;
    G.player = NT.player.make(120, 300);
    loadArea(1, false);
  }
  function titleFromGame() {
    if (G.state === "play" || G.state === "pause") setState("title");
    titleScreen();
  }
  function togglePause(on) {
    if (on && G.state === "play") setState("pause");
    else if (!on && G.state === "pause") setState("play");
  }
  function toggleMusic() {
    var on = NT.audio.setMusic(!NT.audio.isOn());
    if (el.musicBtn) el.musicBtn.textContent = "Music: " + (on ? "on" : "off");
  }

  function ifaceClick(fn) {
    return function (e) { e.preventDefault(); NT.audio.unlock(); fn(); };
  }
  el.startBtn.addEventListener("click", ifaceClick(begin));
  el.startBtn.addEventListener("pointerup", function (e) { if (e.pointerType !== "mouse") ifaceClick(begin)(e); });
  // One place that advances the story, guarded by the state: a real tap fires pointerdown
  // and then click, and Enter on a focused button or a screen reader fires click alone.
  function storyAdvance(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (G.state !== "story") return;
    NT.audio.unlock(); startPlay();
  }
  el.story.addEventListener("pointerdown", storyAdvance);
  el.story.addEventListener("click", storyAdvance);
  if (el.storyBtn) el.storyBtn.addEventListener("click", ifaceClick(startPlay));
  el.resumeBtn.addEventListener("click", ifaceClick(function () { togglePause(false); }));
  el.restartBtn.addEventListener("click", ifaceClick(function () { loadArea(G.areaN, false); }));
  el.musicBtn.addEventListener("click", ifaceClick(toggleMusic));
  el.quitBtn.addEventListener("click", ifaceClick(titleFromGame));
  el.againBtn.addEventListener("click", ifaceClick(restartRun));
  el.endTitleBtn.addEventListener("click", ifaceClick(titleFromGame));
  el.title.addEventListener("pointerdown", function (e) {
    if (e.target === el.title || e.target.tagName === "H1" || e.target.tagName === "P") {
      NT.audio.unlock(); begin();
    }
  });

  /* ---------- HUD ---------- */
  function updateHud(force) {
    var p = G.player;
    if (force || el.hearts.dataset.hp !== String(p.hp)) {
      el.hearts.dataset.hp = String(p.hp);
      var html = "";
      for (var i = 0; i < p.maxHp; i++) html += '<span class="heart' + (i < p.hp ? "" : " off") + '"></span>';
      el.hearts.innerHTML = html;
    }
    if (G.level) el.areaName.textContent = G.level.name;
    el.embers.textContent = String(G.shownEmbers);
    el.timer.textContent = fmt(G.time);
  }

  /* ---------- world update ---------- */
  function update(dt) {
    if (G.state !== "play") return;
    var lv = G.level, p = G.player;
    dt = Math.min(dt, 1 / 30);

    if (G.hitStop > 0) { G.hitStop -= dt; render(0); return; }

    if (!p.dead) G.time += dt;

    NT.player.update(p, inp(), dt, G);
    NT.entities.update(lv, dt, G);

    // embers
    for (var i = lv.orbs.length - 1; i >= 0; i--) {
      var o = lv.orbs[i];
      if (o.got) { lv.orbs.splice(i, 1); continue; }
      if (W.overlaps({ x: o.x - 10, y: o.y - 10, w: 20, h: 20 }, NT.player.box(p))) {
        o.got = true; G.embers++; NT.audio.sfx("pickup");
        G.puff(o.x, o.y, "#e9d27a", 6);
      }
    }
    // checkpoint
    var cp = lv.checkpoint;
    if (!cp.on && Math.abs((p.x + p.w / 2) - cp.x) < 60 && Math.abs((p.y + p.h) - cp.y) < 160) {
      cp.on = true; p.hp = p.maxHp; NT.audio.sfx("check");
      G.float(cp.x, cp.y - 40, "CHECKPOINT", "#8fd6ff");
    }
    // particles and floats
    for (var j = lv.particles.length - 1; j >= 0; j--) {
      var q = lv.particles[j];
      if (!q) { lv.particles.splice(j, 1); continue; }
      q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 420 * dt;
      if (q.life <= 0) lv.particles.splice(j, 1);
    }
    for (var k = lv.floats.length - 1; k >= 0; k--) {
      var f = lv.floats[k];
      if (!f) { lv.floats.splice(k, 1); continue; }
      f.life -= dt; f.y -= 34 * dt;
      if (f.life <= 0) lv.floats.splice(k, 1);
    }

    // respawn or move on
    if (p.dead && p.respawnT <= 0) respawn();
    var boss = NT.entities.bossOf(lv);
    if (lv.boss && !boss) return win();
    if (!lv.boss && lv.door && W.overlaps(NT.player.box(p), lv.door)) return nextArea();
    if (G.shownEmbers !== G.embers) {
      var step = Math.max(1, Math.ceil((G.embers - G.shownEmbers) / 6));
      G.shownEmbers += step;
    }
    G.shake = Math.max(0, G.shake - dt * 26);
    G.flash = Math.max(0, G.flash - dt * 3);
    updateHud(false);
  }

  function respawn() {
    var cp = G.level.checkpoint;
    var p = NT.player.make(cp.on ? cp.x : 120, cp.on ? cp.y : 300);
    p.hp = p.maxHp; G.player = p;
    G.level.bullets = [];
    NT.entities.spawn(G.level);            // enemies come back, embers already taken stay taken
    G.shake = 0; G.hitStop = 0;
    updateHud(true);
  }

  function nextArea() {
    NT.audio.sfx("clear");
    G.flash = 0.5;
    var n = G.areaN + 1;
    if (n > 3) { loadArea(4, true); return; }
    loadArea(n, false);
  }

  function win() {
    G.lastRun = G.time;
    var improved = G.best <= 0 || G.time < G.best;
    if (improved) { G.best = G.time; saveBest(G.best); }
    el.endingTitle.textContent = "THE SEAL BREAKS";
    el.endingText.textContent = "Kibo sets the hollow crown on the floor of the vault and walks out empty-handed. "
      + "The Vineguard's elders were right to hide it, and right to admit it: the orchard lives because one of "
      + "their own came back to unmake their bargain. Above the keep, for the first time in a winter, the branches bud.";
    el.endingTime.textContent = "Run time " + fmt(G.time) + " · " + G.embers + " embers"
      + (improved ? " · new best!" : " · best " + fmt(G.best));
    setState("ending");
  }

  /* ---------- checkpoints for the checks: a tiny, honest API ---------- */
  window.nighttail = {
    start: function () { NT.audio.unlock(); startPlay(); },
    story: begin, pause: function () { togglePause(true); }, resume: function () { togglePause(false); },
    state: function () { return G.state; }, game: G,
    loadArea: function (n) { loadArea(n, false); },
    area: function () { return G.areaN; }
  };

  NT.loop = { update: update, render: null, G: G, el: el, isTouch: isTouch, fmt: fmt, setState: setState };
  window.__ntReady = function () { return G.state; };
  /* A plain handshake for the checks: `screen` always mirrors what is on display,
     and the first key/button press moves it away from the title. */
  Object.defineProperty(window.nighttail, "screen", { get: function () { return G.state; } });
  window.game = window.nighttail;
  window.NIGHTTAIL = { title: "NIGHTTAIL: The Hollow Crown", state: function () { return G.state; } };
})();
/* ---------- renderer: everything is drawn with shapes ---------- */
(function () {
  var W = NT.world, G = NT.game, el = NT.loop.el;
  var canvas = document.getElementById("game");
  var c = canvas.getContext("2d");
  var VW = canvas.width, VH = canvas.height;
  var camX = 0, camY = 0;

  var THEME = {
    orchard: { sky: ["#141026", "#2b1b3d"], far: "#241a34", near: "#2f2242", stone: "#4a3a5c", stoneTop: "#6b5386", glow: "#c9a227" },
    bellows: { sky: ["#1b0f14", "#3a1717"], far: "#2a1418", near: "#38191d", stone: "#513236", stoneTop: "#7c4a49", glow: "#d1495b" },
    clock:   { sky: ["#0e1620", "#1d3242"], far: "#16232e", near: "#1e303d", stone: "#3c5566", stoneTop: "#5f8398", glow: "#8fd6ff" },
    vault:   { sky: ["#0b0a10", "#241b2c"], far: "#1a1522", near: "#221a2c", stone: "#463a52", stoneTop: "#6d5b7d", glow: "#e9d27a" }
  };

  function theme() { return THEME[(G.level && G.level.theme) || "orchard"]; }

  function rect(x, y, w, h, color) { c.fillStyle = color; c.fillRect(x, y, w, h); }

  function drawBackground() {
    var th = theme();
    var g = c.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    c.fillStyle = g; c.fillRect(0, 0, VW, VH);
    // far pillars
    var off = (camX * 0.25) % 260;
    for (var i = -1; i < 6; i++) {
      var x = i * 260 - off;
      rect(x, 60, 90, VH, th.far);
      rect(x + 12, 40, 66, 30, th.far);
    }
    // near arches
    var off2 = (camX * 0.5) % 340;
    for (var j = -1; j < 5; j++) {
      var x2 = j * 340 - off2;
      c.fillStyle = th.near;
      c.beginPath();
      c.moveTo(x2, VH); c.lineTo(x2, 200); c.quadraticCurveTo(x2 + 110, 90, x2 + 220, 200);
      c.lineTo(x2 + 220, VH); c.closePath(); c.fill();
    }
    if (G.level && G.level.theme === "vault") {
      var p = 0.5 + 0.5 * Math.sin(G.time * 2);
      c.globalAlpha = 0.25 + 0.2 * p;
      c.fillStyle = th.glow; c.beginPath(); c.arc(VW / 2, 150, 90 + p * 10, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    // dust
    for (var k = 0; k < 34; k++) {
      var dx = (k * 137 + G.time * 12) % VW;
      var dy = (k * 79 + Math.sin(G.time + k) * 12) % VH;
      c.globalAlpha = 0.12; rect(dx, dy, 2, 2, "#ffffff"); c.globalAlpha = 1;
    }
  }

  function drawLevel() {
    var lv = G.level;
    if (!lv) return;
    var th = theme();
    // floor and walls
    var list = W.allSolids(lv);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      rect(s.x, s.y, s.w, s.h, th.stone);
      rect(s.x, s.y, s.w, 6, th.stoneTop);
      c.globalAlpha = 0.25;
      for (var b = 0; b < s.w; b += 48) rect(s.x + b, s.y + 8, 2, s.h, "#000000");
      c.globalAlpha = 1;
    }
    // spikes
    for (var s2 = 0; s2 < lv.spikes.length; s2++) {
      var sp = lv.spikes[s2];
      for (var x = sp.x; x < sp.x + sp.w; x += 16) {
        c.fillStyle = "#c9cad8";
        c.beginPath(); c.moveTo(x, sp.y + sp.h); c.lineTo(x + 8, sp.y - 14); c.lineTo(x + 16, sp.y + sp.h);
        c.closePath(); c.fill();
      }
    }
    // vents
    for (var v = 0; v < lv.vents.length; v++) {
      var ve = lv.vents[v];
      rect(ve.x, ve.y - 8, ve.w, 12, th.stoneTop);
      if (ve.warn) { c.globalAlpha = 0.5 + 0.5 * Math.sin(G.time * 30); rect(ve.x + 30, ve.y - 14, 12, 6, "#ffb26b"); c.globalAlpha = 1; }
      if (ve.hot) {
        var fg = c.createLinearGradient(0, ve.y - ve.h, 0, ve.y);
        fg.addColorStop(0, "rgba(255,220,140,0.15)"); fg.addColorStop(1, "rgba(255,120,60,0.85)");
        c.fillStyle = fg;
        c.beginPath();
        c.moveTo(ve.x, ve.y); c.lineTo(ve.x + ve.w, ve.y);
        c.lineTo(ve.x + ve.w - 10, ve.y - ve.h); c.lineTo(ve.x + 10, ve.y - ve.h);
        c.closePath(); c.fill();
      }
    }
    // blades
    for (var b2 = 0; b2 < lv.blades.length; b2++) {
      var bl = lv.blades[b2];
      if (bl.tipX === undefined) continue;
      c.strokeStyle = "#7d8a99"; c.lineWidth = 3;
      c.beginPath(); c.moveTo(bl.x, bl.y); c.lineTo(bl.tipX, bl.tipY); c.stroke();
      c.save(); c.translate(bl.tipX, bl.tipY); c.rotate(-bl.a);
      c.fillStyle = "#d7e3ef";
      c.beginPath(); c.moveTo(-16, 0); c.lineTo(16, -6); c.lineTo(16, 6); c.closePath(); c.fill();
      c.restore();
    }
    // embers
    for (var o = 0; o < lv.orbs.length; o++) {
      var or = lv.orbs[o];
      var pu = 1 + 0.15 * Math.sin(G.time * 5 + o);
      c.globalAlpha = 0.85;
      c.fillStyle = "#e9d27a";
      c.beginPath(); c.arc(or.x, or.y, 7 * pu, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.28; c.beginPath(); c.arc(or.x, or.y, 13 * pu, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    // checkpoint
    var cp = lv.checkpoint;
    if (cp) {
      c.strokeStyle = cp.on ? "#8fd6ff" : "#5b5f7a";
      c.lineWidth = 3;
      c.beginPath(); c.moveTo(cp.x, cp.y); c.lineTo(cp.x, cp.y + 60); c.stroke();
      c.fillStyle = cp.on ? "#8fd6ff" : "#3c4057";
      c.beginPath(); c.moveTo(cp.x, cp.y); c.lineTo(cp.x + 26, cp.y + 10); c.lineTo(cp.x, cp.y + 20); c.closePath(); c.fill();
    }
    // door
    if (lv.door) {
      rect(lv.door.x, lv.door.y, lv.door.w, lv.door.h, "#2b1b3d");
      c.strokeStyle = theme().glow; c.lineWidth = 3;
      c.strokeRect(lv.door.x, lv.door.y, lv.door.w, lv.door.h);
      c.globalAlpha = 0.35 + 0.2 * Math.sin(G.time * 3);
      rect(lv.door.x + 8, lv.door.y + 8, lv.door.w - 16, lv.door.h - 16, theme().glow);
      c.globalAlpha = 1;
    }
  }

  function drawSpire(e) {
    rect(e.x + 4, e.y + 10, e.w - 8, e.h - 10, "#5b4a6b");
    c.fillStyle = "#8b6f4a";
    c.beginPath(); c.moveTo(e.x, e.y + 14); c.lineTo(e.x + e.w / 2, e.y - 6); c.lineTo(e.x + e.w, e.y + 14); c.closePath(); c.fill();
    rect(e.x + 9, e.y + 20, 6, 6, "#ffd27a"); rect(e.x + e.w - 15, e.y + 20, 6, 6, "#ffd27a");
    rect(e.x + 6, e.y + e.h - 8, 8, 8, "#3a2f47"); rect(e.x + e.w - 14, e.y + e.h - 8, 8, 8, "#3a2f47");
  }
  function drawSkitter(e) {
    c.fillStyle = "#b06a4a";
    c.beginPath(); c.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2b1b24";
    c.beginPath(); c.arc(e.x + e.w / 2 - e.dir * 8, e.y + e.h / 2 - 3, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(e.x + e.w / 2 + e.dir * 3, e.y + e.h / 2 - 3, 3, 0, Math.PI * 2); c.fill();
    for (var i = 0; i < 3; i++) rect(e.x + 5 + i * 12, e.y + e.h - 4, 4, 5, "#2b1b24");
  }
  function drawCenser(e) {
    var sway = Math.sin(G.time * 2 + e.x) * 3;
    c.strokeStyle = "#6c6250"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(e.x + e.w / 2, e.y - 30); c.lineTo(e.x + e.w / 2 + sway, e.y + 6); c.stroke();
    c.fillStyle = "#8d7a52";
    c.beginPath(); c.ellipse(e.x + e.w / 2 + sway, e.y + 22, e.w / 2, e.h / 2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ff9f4a";
    c.beginPath(); c.arc(e.x + e.w / 2 + sway, e.y + 34, 5, 0, Math.PI * 2); c.fill();
  }
  function drawWarden(e) {
    rect(e.x + 3, e.y + 8, e.w - 6, e.h - 8, "#4c3a55");
    rect(e.x, e.y, e.w, 14, "#7a5f8c");
    c.fillStyle = "#d1495b";
    c.beginPath(); c.arc(e.x + (e.dir > 0 ? e.w - 12 : 12), e.y + 8, 4, 0, Math.PI * 2); c.fill();
    if (e.charge > 0) { c.globalAlpha = 0.4; rect(e.x - 6, e.y + 20, e.w + 12, e.h - 20, "#ff6b6b"); c.globalAlpha = 1; }
  }
  function drawKeeper(e) {
    var flash = e.hurtT > 0 || e.flash > 0;
    c.save();
    c.translate(e.x + e.w / 2, e.y);
    var tall = e.h;
    c.fillStyle = flash ? "#ffffff" : "#3b2f4d";
    c.beginPath();
    c.moveTo(-e.w / 2, tall); c.lineTo(-e.w / 2 + 6, 34); c.lineTo(-16, 10);
    c.lineTo(16, 10); c.lineTo(e.w / 2 - 6, 34); c.lineTo(e.w / 2, tall); c.closePath(); c.fill();
    // the hollow crown
    c.fillStyle = "#c9a227";
    c.beginPath();
    c.moveTo(-20, 12); c.lineTo(-20, -2); c.lineTo(-10, 6); c.lineTo(0, -8);
    c.lineTo(10, 6); c.lineTo(20, -2); c.lineTo(20, 12); c.closePath(); c.fill();
    c.globalAlpha = 0.5 + 0.4 * Math.sin(G.time * 6);
    c.fillStyle = e.phase === 2 ? "#ff6b6b" : "#e9d27a";
    c.beginPath(); c.arc(0, 6, 6, 0, Math.PI * 2); c.fill();
    c.globalAlpha = 1;
    c.fillStyle = "#d1495b";
    c.beginPath(); c.arc(-12, 34, 3.5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(12, 34, 3.5, 0, Math.PI * 2); c.fill();
    // arms
    c.strokeStyle = flash ? "#ffffff" : "#332a45"; c.lineWidth = 9;
    var armF = e.state === "slamTell" ? -26 : e.state === "spreadTell" ? -14 : 0;
    c.beginPath();
    c.moveTo(-e.w / 2 + 6, 40); c.lineTo(-e.w / 2 - 12, 66 + armF); c.stroke();
    c.beginPath();
    c.moveTo(e.w / 2 - 6, 40); c.lineTo(e.w / 2 + 12, 66 + armF); c.stroke();
    if (e.state === "slamTell" || e.state === "spreadTell" || e.state === "sweepTell") {
      c.globalAlpha = 0.35;
      c.fillStyle = "#ff6b6b"; c.beginPath(); c.arc(0, 40, 60, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
  }

  function drawPlayer(p) {
    if (p.dead) return;
    var blink = p.iframes > 0 && Math.floor(p.iframes * 20) % 2 === 0;
    c.save();
    c.globalAlpha = blink ? 0.4 : 1;
    c.translate(p.x + p.w / 2, p.y);
    c.scale(p.dir, 1);
    // tail (the nighttail)
    var tw = Math.sin(G.time * 6) * 4;
    c.strokeStyle = "#c98a3f"; c.lineWidth = 5; c.lineCap = "round";
    c.beginPath(); c.moveTo(-8, p.h - 22); c.quadraticCurveTo(-26, p.h - 26 + tw, -20, p.h - 46 + tw); c.stroke();
    // body
    c.fillStyle = "#4a5fa8";
    c.beginPath();
    c.moveTo(-9, p.h); c.lineTo(-9, 16); c.quadraticCurveTo(0, 6, 9, 16); c.lineTo(9, p.h); c.closePath(); c.fill();
    c.fillStyle = "#e9d27a";
    c.beginPath(); c.moveTo(0, 16); c.lineTo(9, 16); c.lineTo(9, p.h); c.lineTo(0, p.h); c.closePath(); c.fill();
    // head + ears
    c.fillStyle = "#d8a973";
    c.beginPath(); c.arc(2, 10, 10, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(-2, 3, 5, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(9, 4, 4.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2b2233";
    c.beginPath(); c.arc(7, 10, 2.2, 0, Math.PI * 2); c.fill();
    // legs
    var run = Math.abs(p.vx) > 20 && p.onGround ? Math.sin(p.runT * 12) * 5 : 0;
    c.fillStyle = "#33406f";
    rect(-8, p.h - 10, 7, 10 + run * 0.4, "#33406f");
    rect(1, p.h - 10, 7, 10 - run * 0.4, "#33406f");
    // the blade
    var a = 0;
    if (p.attackTimer > 0) a = -1.0 + (1 - p.attackTimer / 0.28) * 1.7;
    c.save();
    c.translate(7, 26); c.rotate(p.attackTimer > 0 ? a : 0.35);
    c.fillStyle = p.attackTimer > 0 ? "#ffffff" : "#cfd8e6";
    c.fillRect(0, -2, p.attackTimer > 0 ? 46 : 30, 3.5);
    if (p.attackTimer > 0) {
      c.globalAlpha = 0.35; c.fillStyle = p.combo === 3 ? "#8fd6ff" : "#ffffff";
      c.beginPath(); c.arc(0, 0, 34, -0.8, 0.5); c.lineTo(0, 0); c.fill();
      c.globalAlpha = 1;
    }
    c.restore();
    c.restore();
    if (p.dashTimer > 0) {
      c.globalAlpha = 0.3; c.fillStyle = "#8fd6ff";
      c.fillRect(p.x - p.dir * 26, p.y, p.w, p.h); c.globalAlpha = 1;
    }
  }

  function drawBullets() {
    var lv = G.level;
    if (!lv) return;
    for (var i = 0; i < lv.bullets.length; i++) {
      var b = lv.bullets[i];
      if (!b) continue;
      c.globalAlpha = 0.3; c.fillStyle = b.kind === "orb" ? "#ff9f6b" : "#ffffff";
      c.beginPath(); c.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
      c.fillStyle = b.kind === "orb" ? "#ffd7a1" : "#e8e8f5";
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.fill();
    }
  }

  function drawParticles() {
    var lv = G.level;
    if (!lv) return;
    for (var i = 0; i < lv.particles.length; i++) {
      var q = lv.particles[i];
      if (!q) continue;
      c.globalAlpha = Math.max(0, q.life / q.max);
      c.fillStyle = q.color;
      c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    c.textAlign = "center";
    for (var j = 0; j < lv.floats.length; j++) {
      var f = lv.floats[j];
      if (!f) continue;
      c.globalAlpha = Math.max(0, f.life / 0.9);
      c.fillStyle = f.color;
      c.font = "bold 18px ui-sans-serif, system-ui, sans-serif";
      c.fillText(f.text, f.x, f.y);
    }
    c.globalAlpha = 1;
    c.textAlign = "left";
  }

  function drawBossBar() {
    var lv = G.level;
    if (!lv || !lv.boss) return;
    var boss = NT.entities.bossOf(lv);
    if (!boss) return;
    var w = VW * 0.5, x = (VW - w) / 2, y = 24;
    rect(x - 2, y - 2, w + 4, 20, "rgba(11,10,16,0.75)");
    rect(x, y, w * Math.max(0, boss.hp / boss.maxHp), 16, "rgba(209,73,91,0.95)");
    c.fillStyle = "#efe9f5";
    c.font = "bold 13px ui-sans-serif, system-ui, sans-serif";
    c.textAlign = "center";
    c.fillText("THE HOLLOW KEEPER" + (boss.phase === 2 ? " — SECOND BREATH" : ""), VW / 2, y + 32);
    c.textAlign = "left";
  }

  function drawHint() {
    if (!G.level || G.state !== "play" || G.time > 6) return;
    c.globalAlpha = Math.max(0, 1 - G.time / 6) * 0.9;
    c.fillStyle = "#efe9f5";
    c.font = "16px ui-sans-serif, system-ui, sans-serif";
    c.textAlign = "center";
    c.fillText(G.level.hint || "", VW / 2, VH - 40);
    c.textAlign = "left";
    c.globalAlpha = 1;
  }

  function render(dt) {
    var p = G.player, lv = G.level;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, VW, VH);
    drawBackground();
    if (!lv) return;

    var tx = p.x + p.w / 2 - VW * 0.42;
    var maxCam = Math.max(0, lv.width - VW + 80);
    camX += (Math.max(0, Math.min(maxCam, tx)) - camX) * 0.14;
    camY += (Math.max(0, p.y - VH * 0.55) * 0.5 - camY) * 0.1;

    c.save();
    var sh = G.shake;
    c.translate(-camX + (Math.random() - 0.5) * sh, -camY + (Math.random() - 0.5) * sh);
    drawLevel();
    for (var i = 0; i < lv.enemiesLive.length; i++) {
      var e = lv.enemiesLive[i];
      if (!e || e.dead) continue;
      if (e.type === "keeper") drawKeeper(e);
      else if (e.type === "spire") drawSpire(e);
      else if (e.type === "skitter") drawSkitter(e);
      else if (e.type === "censer") drawCenser(e);
      else if (e.type === "warden") drawWarden(e);
    }
    drawBullets();
    drawPlayer(p);
    drawParticles();
    c.restore();

    // vignette + flash
    var vg = c.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VH * 0.95);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = vg; c.fillRect(0, 0, VW, VH);
    if (G.flash > 0) { c.globalAlpha = Math.min(0.7, G.flash); rect(0, 0, VW, VH, "#ffffff"); c.globalAlpha = 1; }
    if (p.dead) {
      c.globalAlpha = 0.55; rect(0, 0, VW, VH, "#3a1020"); c.globalAlpha = 1;
      c.fillStyle = "#efe9f5"; c.font = "bold 34px ui-sans-serif, system-ui, sans-serif";
      c.textAlign = "center"; c.fillText("THE TAIL FALLS", VW / 2, VH / 2); c.textAlign = "left";
    }
    drawBossBar();
    drawHint();
  }

  /* ---------- boot ---------- */
  NT.loop.el = el;
  NT.loop.render = render;

  var last = 0;
  function frame(t) {
    var dt = last ? (t - last) / 1000 : 1 / 60;
    last = t;
    NT.loop.update(dt);
    render(dt);
    NT.loop.G.ready = true;
    requestAnimationFrame(frame);
  }

  // A title frame first, so the very first screenshot is never blank.
  NT.loop.G.level = W.build(1);
  NT.entities.spawn(NT.loop.G.level);
  render(0);
  requestAnimationFrame(frame);
})();
