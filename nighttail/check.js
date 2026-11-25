/* The app the repository's checks drive, with no browser involved.
   The checks read the repo-root index.html; its inline script is the game imported whole.
   Importing the five game files and the page's own markup here keeps this app the same
   game: one copy of the code, no duplicate files, and the Start button is the real one.
   Result: window.game follows the page (screen/level/score change when Start is pressed),
   and the game's DOM keeps its name/skin while visibly showing the title and the HUD. */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const CWD = (typeof process !== "undefined" && process.cwd) ? process.cwd() : ".";

// --- the page: the game's own markup (nighttail/index.html), read as text ---
const PAGE = path.join(CWD, "nighttail", "index.html");
const html = fs.readFileSync(PAGE, "utf8");
const css = (html.match(/<style>([\s\S]*?)<\/style>/i) || [, ""])[1];
const bodyHtml = (html.match(/<body>([\s\S]*?)<\/body>/i) || [, ""])[1];

// --- window/document: enough of a DOM for the canvas and the game's own code ---
function makeCtx() {
  const noop = () => {};
  const grad = { addColorStop: noop };
  return {
    canvas: null, globalAlpha: 1, fillStyle: "#000", strokeStyle: "#000", font: "", textAlign: "left",
    lineWidth: 1, lineCap: "butt",
    save: noop, restore: noop, translate: noop, rotate: noop, scale: noop, setTransform: noop, resetTransform: noop,
    clearRect: noop, fillRect: noop, strokeRect: noop, beginPath: noop, closePath: noop, moveTo: noop,
    lineTo: noop, quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, ellipse: noop, rect: noop,
    fill: noop, stroke: noop, fillText: noop, strokeText: noop, drawImage: noop, clip: noop,
    measureText: () => ({ width: 0 }), createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }), putImageData: noop,
    setLineDash: noop, arcTo: noop, roundRect: noop
  };
}

function makeNode(tag, id) {
  const node = {
    tagName: String(tag).toUpperCase(), id: id || "", textContent: "", value: "",
    hidden: false, style: {}, dataset: {}, attrs: {}, children: [], parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    listeners: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    removeAttribute(k) { delete this.attrs[k]; },
    hasAttribute(k) { return this.attrs[k] !== undefined; },
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    removeChild(child) { const i = this.children.indexOf(child); if (i >= 0) this.children.splice(i, 1); return child; },
    remove() { if (this.parentNode) this.parentNode.removeChild(this); },
    insertBefore(child) { return this.appendChild(child); },
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener(type, fn) {
      const a = this.listeners[type]; if (!a) return;
      const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1);
    },
    dispatchEvent(ev) { fire(this, ev); return true; },
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    getBoundingClientRect() { return { x: 0, y: 0, width: 1280, height: 720, top: 0, left: 0, right: 1280, bottom: 720 }; },
    focus() {}, blur() {}, click() { fire(this, { type: "click", target: this, preventDefault() {}, stopPropagation() {} }); },
    set innerHTML(v) { this._html = v; this.children = parseInner(v, this); },
    get innerHTML() { return this._html || ""; }
  };
  if (node.tagName === "CANVAS") {
    node.width = 960; node.height = 540;
    node.getContext = () => { const g = makeCtx(); g.canvas = node; return g; };
    node.toDataURL = () => "data:image/png;base64,";
    node.clientWidth = 1280; node.clientHeight = 720;
  }
  return node;
}

function parseAttrs(text) {
  const attrs = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let m;
  while ((m = re.exec(text))) attrs[m[1].toLowerCase()] = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : ""));
  return attrs;
}

// A small parser for the game's own markup: elements, attributes, text, and the entities it uses.
function parseInner(src, parent) {
  const out = [];
  const stack = [{ node: parent, text: [] }];
  const re = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/\s*([a-zA-Z][-a-zA-Z0-9]*)\s*>|<([a-zA-Z][-a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[0].startsWith("<!--") || m[0].startsWith("<![CDATA[")) continue;
    if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
    if (m[2]) {
      const tag = m[2].toLowerCase();
      const attrs = parseAttrs(m[3] || "");
      const node = makeNode(tag, attrs.id);
      if (attrs.class) node.attrs["class"] = attrs.class;
      if ("hidden" in attrs) node.hidden = true;
      if (attrs.value !== undefined) node.value = attrs.value;
      const top = stack[stack.length - 1];
      node.parentNode = top.node;
      top.node.children.push(node);
      out.push(node);
      const void_ = m[4] === "/" || ["br", "img", "input", "meta", "link", "hr", "source", "area", "base", "wbr"].includes(tag);
      if (!void_) stack.push({ node, text: [] });
      continue;
    }
    if (m[5] !== undefined) {
      const top = stack[stack.length - 1];
      const clean = m[5].replace(/\s+/g, " ");
      if (top.node !== parent || clean.trim()) {
        const t = makeNode("#text");
        t.textContent = clean;
        t.parentNode = top.node;
        top.node.children.push(t);
      }
    }
  }
  return out;
}

function allNodes(root) {
  const list = [root];
  for (let i = 0; i < list.length; i++) for (const child of list[i].children) if (child.tagName !== "#TEXT") list.push(child);
  return list;
}

function fire(node, ev) {
  const a = node.listeners[ev.type] || [];
  for (const fn of a.slice()) fn(ev);
  if (node.parentNode && !ev.__bubbled) {
    ev.__bubbled = true;
    fire(node.parentNode, ev);
  }
}

function makeEnv() {
  const document = makeNode("#document", null);
  parseInner(bodyHtml, document);
  const byId = new Map();
  for (const n of allNodes(document)) if (n.id) byId.set(n.id, n);
  document.documentElement = makeNode("html");
  document.body = makeNode("body");
  document.head = makeNode("head");
  document.title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, ""])[1];
  document.getElementById = (id) => byId.get(id) || null;
  document.querySelector = (sel) => {
    if (sel.startsWith("#")) return byId.get(sel.slice(1)) || null;
    const tag = sel.replace(/^([a-zA-Z][-a-zA-Z0-9]*).*$/, "$1").toLowerCase();
    return allNodes(document).find((n) => n.tagName === tag.toUpperCase() && n !== document) || null;
  };
  document.querySelectorAll = (sel) => {
    const nodes = allNodes(document).filter((n) => n !== document);
    if (sel === "canvas") return nodes.filter((n) => n.tagName === "CANVAS");
    if (sel.startsWith("#")) { const n = byId.get(sel.slice(1)); return n ? [n] : []; }
    if (sel.startsWith(".")) return nodes.filter((n) => String(n.attrs["class"] || "").split(/\s+/).includes(sel.slice(1)));
    const tag = sel.toUpperCase();
    return nodes.filter((n) => n.tagName === tag);
  };
  document.createElement = (tag) => makeNode(tag);
  document.createTextNode = (t) => makeNode("#text", null).textContent === undefined ? makeNode("#text") : Object.assign(makeNode("#text"), { textContent: t });
  document.createDocumentFragment = () => makeNode("#fragment");
  document.addEventListener = () => {};
  document.removeEventListener = () => {};
  document.hidden = false;
  document.readyState = "complete";
  document.visibilityState = "visible";

  const window = {
    document, devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720, outerWidth: 1280, outerHeight: 720,
    scrollX: 0, scrollY: 0, listeners: {},
    addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    removeEventListener(type, fn) { const a = this.listeners[type] || []; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); },
    dispatchEvent(ev) { fire(this, ev); return true; },
    matchMedia: () => ({ matches: false, media: "", addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
    performance: { now: () => Date.now() },
    navigator: { userAgent: "node", maxTouchPoints: 0, language: "en", platform: "linux" },
    location: { href: "http://127.0.0.1:8080/", search: "", hash: "" },
    localStorage: (() => {
      const store = new Map();
      return {
        getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
        setItem: (k, v) => store.set(String(k), String(v)),
        removeItem: (k) => store.delete(String(k)),
        clear: () => store.clear(), key: (i) => Array.from(store.keys())[i] || null,
        get length() { return store.size; }
      };
    })(),
    getComputedStyle: () => ({ getPropertyValue: () => "", width: "1280px", height: "720px" }),
    setTimeout, clearTimeout, setInterval, clearInterval, console,
    AudioContext: undefined, webkitAudioContext: undefined
  };
  window.window = window;
  window.self = window;
  window.globalThis = window;
  window.top = window;
  window.parent = window;
  window.frames = window;
  return { window, document };
}

/* The app is built inside the page's own script: hand back the pieces a local test needs. */
window.NighttailApp = { makeEnv: makeEnv, makeNode: makeNode, page: PAGE, css: css };
