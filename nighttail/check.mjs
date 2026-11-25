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

console.log(failed ? "\nStart check FAILED (" + failed + ")" : "\nStart check passed: title first, Start on click, tap and Enter, area 1 plays without errors.");
process.exit(failed ? 1 : 0);
