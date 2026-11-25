/* Nighttail start check — runs the real page scripts from nighttail/index.html in Node.
 *
 * WHY THIS FILE EXISTS (the diagnosis for slice 1):
 *   - The repository's checks photograph the folder root: "PHOTOGRAPHED: served from ."
 *     Root index.html is the Banana Signal game, and it is not to be changed.
 *   - So no repository check can reach nighttail/index.html. This harness boots the real
 *     nighttail/index.html + js/*.js in a minimal DOM stub and proves Start works on a
 *     click, a tap (pointerup with pointerType touch) and the Enter key.
 * Run it with:  node nighttail/check.mjs        (exit code 0 = every line PASS)
 */
import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname));
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const FILES = ["js/audio.js", "js/world.js", "js/entities.js", "js/player.js", "js/main.js"];

const noop = () => {};
const grad = { addColorStop: noop };
const ctx2d = new Proxy({}, {
  get: (t, k) => {
    if (k === "canvas") return { width: 960, height: 540 };
    if (k === "measureText") return () => ({ width: 10 });
    if (k === "createLinearGradient" || k === "createRadialGradient") return () => grad;
    if (k === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
    if (k === "createPattern") return () => null;
    return k in t ? t[k] : noop;
  },
  set: (t, k, v) => { t[k] = v; return true; }
});

class El {
  constructor(tag, id) {
    this.tagName = String(tag).toUpperCase();
    this.id = id || "";
    this.textContent = "";
    this.value = "";
    this.hidden = false;
    this.style = {};
    this.dataset = {};
    this.children = [];
    this.width = 960;
    this.height = 540;
    this._l = {};
    const set = new Set();
    this.classList = { add: (c) => set.add(c), remove: (c) => set.delete(c), toggle: noop, contains: (c) => set.has(c) };
  }
  addEventListener(t, fn) { (this._l[t] = this._l[t] || []).push(fn); }
  removeEventListener(t, fn) { if (this._l[t]) this._l[t] = this._l[t].filter((f) => f !== fn); }
  dispatch(t, props) {
    const ev = Object.assign({ type: t, target: this, currentTarget: this, preventDefault: noop, stopPropagation: noop }, props || {});
    for (const fn of (this._l[t] || []).slice()) fn(ev);
    return ev;
  }
  getContext() { return ctx2d; }
  getBoundingClientRect() { return { x: 0, y: 0, width: 960, height: 540, top: 0, left: 0, right: 960, bottom: 540 }; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute() {}
  getAttribute() { return null; }
  removeAttribute() {}
  setProperty() {}
  focus() {}
  closest() { return null; }
}

class Param { setValueAtTime() { return this; } linearRampToValueAtTime() { return this; } exponentialRampToValueAtTime() { return this; } setTargetAtTime() { return this; } cancelScheduledValues() { return this; } }
class Node0 { connect() { return this; } disconnect() {} start() {} stop() {} }
class FakeAC {
  constructor() { this.currentTime = 0; this.destination = new Node0(); this.state = "running"; this.sampleRate = 48000; }
  createGain() { const n = new Node0(); n.gain = new Param(); return n; }
  createOscillator() { const n = new Node0(); n.frequency = new Param(); n.detune = new Param(); n.type = "square"; return n; }
  createBiquadFilter() { const n = new Node0(); n.frequency = new Param(); n.Q = new Param(); return n; }
  createBufferSource() { const n = new Node0(); n.buffer = null; n.playbackRate = new Param(); return n; }
  createBuffer() { return { getChannelData: () => new Float32Array(64) }; }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}

function boot() {
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
  const map = {};
  for (const id of ids) map[id] = new El("div", id);
  const doc = new El("html", "document");
  doc.getElementById = (id) => map[id];
  doc.createElement = (tag) => new El(tag);
  doc.body = new El("body");
  doc.documentElement = new El("html");
  doc.visibilityState = "visible";
  doc.hasFocus = () => true;

  const frames = [];
  let clock = 0;
  const win = {};
  win.window = win;
  win.document = doc;
  win.console = console;
  win.navigator = { userAgent: "nighttail-check", maxTouchPoints: 0, platform: "linux" };
  win.location = { href: "http://127.0.0.1/nighttail/index.html" };
  const store = {};
  win.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  win.requestAnimationFrame = (cb) => frames.push(cb);
  win.cancelAnimationFrame = noop;
  win.setTimeout = () => 0;
  win.clearTimeout = noop;
  win.setInterval = () => 0;
  win.clearInterval = noop;
  win.performance = { now: () => clock };
  win.innerWidth = 960;
  win.innerHeight = 540;
  win.devicePixelRatio = 1;
  win.AudioContext = FakeAC;
  win.webkitAudioContext = FakeAC;
  win.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop });
  win.addEventListener = (t, fn) => doc.addEventListener(t, fn);
  win.removeEventListener = (t, fn) => doc.removeEventListener(t, fn);

  const errors = [];
  const ctx = vm.createContext(win);
  for (const f of FILES) {
    try { vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), ctx, { filename: f }); }
    catch (e) { errors.push(f + ": " + e.message); }
  }

  return {
    doc, map, win, errors,
    pump(seconds) {
      const step = 1 / 60;
      for (let i = 0; i < Math.round(seconds / step); i++) {
        clock += step * 1000;
        const q = frames.splice(0, frames.length);
        for (const cb of q) { try { cb(clock); } catch (e) { errors.push("frame: " + e.message); } }
      }
    }
  };
}

let failed = 0;
const check = (ok, msg) => { if (!ok) failed++; console.log((ok ? "PASS" : "FAIL") + ": " + msg); return ok; };
const key = (env, k, type) => env.doc.dispatch(type || "keydown", { key: k, code: k });
const st = (env) => (env.win.nighttail ? env.win.nighttail.state() : "(no API)");
const safe = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };

// -------- 1. click --------
let env = boot();
check(env.errors.length === 0, "page + scripts load with no error" + (env.errors[0] ? " — " + env.errors[0] : ""));
check(!!env.win.nighttail, "window.nighttail is exposed for the checks");
env.pump(0.4);
check(st(env) === "title", "first screen is the title (state=" + st(env) + ")");
env.map.startBtn.dispatch("click");
env.pump(0.2);
const afterClick = st(env);
check(afterClick !== "title", "click on Start leaves the title (state=" + afterClick + ")");
env.map.story.dispatch("click");
env.pump(0.6);
check(st(env) === "play", "click reaches play (state=" + st(env) + ")");
check(safe(() => env.win.nighttail.area(), -1) === 1, "area 1 is loaded");

// -------- 2. tap (pointerup, touch) --------
env = boot();
env.pump(0.3);
env.map.startBtn.dispatch("pointerup", { pointerType: "touch" });
env.map.startBtn.dispatch("click");
env.pump(0.3);
env.map.story.dispatch("pointerup", { pointerType: "touch" });
env.map.story.dispatch("click");
env.pump(0.6);
check(st(env) === "play", "tap reaches play (state=" + st(env) + ")");

// -------- 3. Enter key --------
env = boot();
env.pump(0.3);
key(env, "Enter");
env.pump(0.3);
const afterEnter = st(env);
check(afterEnter !== "title", "Enter leaves the title (state=" + afterEnter + ")");
key(env, "Enter");
env.pump(0.6);
check(st(env) === "play", "Enter reaches play (state=" + st(env) + ")");

// -------- 4. it keeps running while played, with no exception --------
const g = env.win.nighttail.game;
key(env, "ArrowRight");
key(env, " ");
env.pump(10);
const t = safe(() => g.time, -1);
check(t > 8, "the game clock advanced through 10 s of play (t=" + t + "s)");
check(st(env) === "play", "still in play after 10 s (state=" + st(env) + ")");
check(env.errors.length === 0, "no uncaught error while playing" + (env.errors[0] ? " — " + env.errors[0] : ""));
check(safe(() => g.player.hp, 0) > 0 && safe(() => g.areaN, 0) === 1, "the run state holds (area=" + safe(() => g.areaN, "?") + ", hp=" + safe(() => g.player.hp, "?") + ")");

// -------- 5. an autopilot plays each area: proof the levels are passable --------
// It presses the same keys a player does (ArrowRight held, ArrowUp, z, x) and is
// allowed to die: a respawn at the checkpoint is part of playing, not a soft-lock.
const tap = (env, k) => { key(env, k, "keydown"); key(env, k, "keyup"); };

function play(env, seconds) {
  const W = env.win.NT.world, G = env.win.nighttail.game;
  let t = 0, maxX = 0, deaths = 0, wasDead = false, usedDouble = false;
  const spots = [];   // where each death happened, so a failure names the real place
  const step = 1 / 60;
  env.doc.dispatch("keydown", { key: "ArrowRight", code: "ArrowRight" });
  while (t < seconds) {
    const s = env.win.nighttail.screen;
    if (s === "ending") break;
    if (s !== "play") { tap(env, "Enter"); env.pump(step); t += step; continue; }
    const p = G.player, lv = G.level;
    if (p.dead && !wasDead) { deaths++; spots.push("a" + G.areaN + "@" + Math.round(p.x) + "," + Math.round(p.y)); }
    wasDead = p.dead;
    if (p.x > maxX) maxX = p.x;
    const ahead = { x: p.x + p.w - 2, y: p.y + 2, w: 40, h: p.h - 4 };
    const gap = !W.hitsSolid(lv, { x: p.x + p.w, y: p.y + p.h + 2, w: 40, h: 10 });
    const spike = !!W.hitsSpike(lv, { x: ahead.x, y: p.y + p.h - 16, w: 44, h: 22 });
    const wall = !!W.hitsSolid(lv, ahead);
    const e = (lv.enemiesLive || []).find((x) => x && !x.dead && x.x - (p.x + p.w) < 78 && x.x > p.x - 46 && Math.abs(x.y - p.y) < 80);
    if (p.onGround) {
      usedDouble = false;
      if (gap || spike || wall) tap(env, "ArrowUp");
    } else if (!usedDouble && p.vy > 30 && (gap || spike)) {
      tap(env, "ArrowUp");                    // double jump for the wide gaps
      usedDouble = true;
    }
    if (gap && p.dashCool <= 0) tap(env, "x"); // dash across the widest gaps
    if (e && p.attackTimer <= 0) tap(env, "z"); // sword combo on the watchmen
    env.pump(step);
    t += step;
  }
  env.doc.dispatch("keyup", { key: "ArrowRight", code: "ArrowRight" });
  return { t, maxX, deaths, spots, area: G.areaN, state: env.win.nighttail.screen };
}

function startRun() {
  const env = boot();
  env.pump(0.3);
  tap(env, "Enter"); env.pump(0.25);            // title -> story
  tap(env, "Enter"); env.pump(0.25);            // story -> play
  return env;
}

env = startRun();
check(st(env) === "play", "autopilot starts in play (state=" + st(env) + ")");
const r1 = play(env, 120);
check(r1.area > 1 || r1.maxX > 3500,
  "area 1 is passable: autopilot reached the door (area " + r1.area + ", x=" + Math.round(r1.maxX) + ", deaths " + r1.deaths + ", died at " + r1.spots.slice(0, 6).join(" ") + ")");
check(env.errors.length === 0, "no uncaught error in area 1" + (env.errors[0] ? " — " + env.errors[0] : ""));
check(safe(() => env.win.nighttail.game.level.checkpoint.on, false) === true,
  "area 1 checkpoint can be reached (checkpoint on=" + safe(() => env.win.nighttail.game.level.checkpoint.on, "?") + ")");
const r2 = play(env, 150);
check(r2.area > 2 || r2.maxX > 4100,
  "area 2 is passable: autopilot reached the door (area " + r2.area + ", x=" + Math.round(r2.maxX) + ", deaths " + r2.deaths + ")");
const r3 = play(env, 150);
check(r3.area > 3 || r3.maxX > 3950,
  "area 3 is passable: autopilot reached the door (area " + r3.area + ", x=" + Math.round(r3.maxX) + ", deaths " + r3.deaths + ")");
const r4 = play(env, 300);
check(r4.state === "ending",
  "the Hollow Keeper can be beaten: ending reached (state=" + r4.state + ", area " + r4.area + ", deaths " + r4.deaths + ")");
check(safe(() => env.win.nighttail.game.best, 0) > 0, "the winning run was saved as the best time");
check(env.errors.length === 0, "no uncaught error across all four areas" + (env.errors[0] ? " — " + env.errors[0] : ""));

console.log(failed ? "\nStart check FAILED (" + failed + ")" : "\nCheck passed: title first, Start on click, tap and Enter, and an autopilot clears all four areas.");
process.exit(failed ? 1 : 0);
