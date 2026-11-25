/* Nighttail — the three areas, the boss vault, and the collision helpers.
   Everything is rectangles, so a level is just data. */
window.NT = window.NT || {};
NT.world = (function () {
  var GROUND = 448, TILE = 32;

  function wall(x, y, w, h) { return { x: x, y: y, w: w, h: h }; }

  /* A run of tiles: the play floor with gaps the player must jump. */
  function floorRun(x, w, y) { return wall(x, (y || GROUND), w, 400); }

  /* Area 1 — The Orchard Stair: teach run, jump, wall-slide, dash and the sword. */
  function area1() {
    var s = [], p = [], sp = [], en = [], vents = [], blades = [], orbs = [];
    s.push(wall(-40, 0, 40, 900));                 // left wall
    s.push(floorRun(0, 700));
    s.push(wall(700, GROUND, 90, 400));            // small step down to a gap
    s.push(floorRun(950, 620));
    s.push(wall(1570, GROUND, 70, 400));
    s.push(floorRun(1780, 520));
    // a staircase of ledges
    s.push(wall(1150, 350, 150, 24));
    s.push(wall(1360, 280, 150, 24));
    s.push(wall(2000, 360, 170, 24));
    s.push(wall(2200, 280, 170, 24));
    // wall-slide chimney: two tall pillars close together
    /* Hanging column over the pit: it reads as the same chimney, but its foot stops
       at y=200 so the ground route under it is open (before, it ran to the floor at
       x=2420-2454 and walled the pit off completely — nobody could reach the
       checkpoint, which made area 1 unwinnable). */
    s.push(wall(2420, 0, 34, 200));
    s.push(wall(2620, 40, 34, 410));
    p.push(wall(2680, 250, 140, 24));
    s.push(floorRun(2520, 260, 520));
    s.push(floorRun(2820, 900, 448));
    s.push(wall(3720, 448, 40, 400));
    sp.push(wall(700, GROUND - 10, 90, 10));
    sp.push(wall(1570, GROUND - 10, 70, 10));
    // embers to collect (these are the score)
    [300, 380, 1000, 1180, 1390, 2050, 2250, 2560, 2900, 3200, 3450].forEach(function (x, i) {
      orbs.push({ x: x, y: 360 - (i % 3) * 40, got: false });
    });
    en.push({ type: "spire", x: 500, y: GROUND - 46, dir: -1 });
    en.push({ type: "skitter", x: 1050, y: GROUND - 34 });
    en.push({ type: "spire", x: 1850, y: GROUND - 46, dir: 1 });
    en.push({ type: "skitter", x: 2950, y: GROUND - 34 });
    return {
      name: "1 · The Orchard Stair", theme: "orchard", width: 3760, ground: GROUND,
      solids: s, plats: p, spikes: sp, vents: vents, blades: blades, orbs: orbs, enemies: en,
      checkpoint: { x: 2520, y: GROUND - 60, on: false },
      door: { x: 3620, y: GROUND - 120, w: 60, h: 120 },
      hint: "Run, jump, slide the pillars, cut the watchmen."
    };
  }

  /* Area 2 — Bellows Hall: timed flame vents and censers that drop bombs. */
  function area2() {
    var s = [], p = [], sp = [], en = [], vents = [], blades = [], orbs = [];
    s.push(wall(-40, 0, 40, 900));
    s.push(floorRun(0, 620));
    s.push(wall(620, GROUND, 120, 400));
    s.push(floorRun(900, 420));
    p.push(wall(760, 320, 140, 24));
    s.push(floorRun(1500, 380));
    s.push(floorRun(2040, 500));
    p.push(wall(1560, 300, 130, 24));
    p.push(wall(1750, 220, 130, 24));
    s.push(floorRun(2700, 700));
    p.push(wall(2820, 330, 150, 24));
    s.push(wall(3460, GROUND, 60, 400));
    s.push(floorRun(3600, 620));
    s.push(wall(4260, GROUND, 40, 400));
    // vents: three flame jets on a cycle, with a warning light before each
    [430, 1180, 2260, 3060, 3900].forEach(function (x, i) {
      vents.push({ x: x, y: GROUND - 6, w: 76, h: 120, phase: i * 1.15, period: 2.6, warn: 0.6, firing: 0, hot: false });
    });
    orbs.push({ x: 320, y: 340, got: false });
    orbs.push({ x: 800, y: 260, got: false });
    orbs.push({ x: 1600, y: 250, got: false });
    orbs.push({ x: 1810, y: 170, got: false });
    orbs.push({ x: 2400, y: 320, got: false });
    orbs.push({ x: 2880, y: 280, got: false });
    orbs.push({ x: 3300, y: 340, got: false });
    orbs.push({ x: 3800, y: 300, got: false });
    en.push({ type: "censer", x: 900, y: 240, home: 240 });
    en.push({ type: "spire", x: 1560, y: GROUND - 46, dir: -1 });
    en.push({ type: "censer", x: 2500, y: 210, home: 210 });
    en.push({ type: "skitter", x: 2900, y: GROUND - 34 });
    en.push({ type: "censer", x: 3700, y: 230, home: 230 });
    return {
      name: "2 · Bellows Hall", theme: "bellows", width: 4300, ground: GROUND,
      solids: s, plats: p, spikes: sp, vents: vents, blades: blades, orbs: orbs, enemies: en,
      checkpoint: { x: 2760, y: GROUND - 60, on: false },
      door: { x: 4140, y: GROUND - 120, w: 60, h: 120 },
      hint: "Vents breathe fire. Wait for the light to go cold."
    };
  }

  /* Area 3 — The Clockheart: swinging blades and warden enemies that charge. */
  function area3() {
    var s = [], p = [], sp = [], en = [], vents = [], blades = [], orbs = [];
    s.push(wall(-40, 0, 40, 900));
    s.push(floorRun(0, 540));
    s.push(floorRun(820, 400));
    s.push(floorRun(1520, 460));
    p.push(wall(1260, 330, 150, 24));
    s.push(floorRun(2280, 320));
    s.push(floorRun(2860, 420));
    p.push(wall(3300, 300, 170, 24));
    s.push(floorRun(3540, 520));
    s.push(wall(4120, GROUND, 40, 400));
    // swinging blades: pendulums from the ceiling
    [640, 1080, 1500, 2050, 2650, 3200, 3800].forEach(function (x, i) {
      blades.push({ x: x, y: 60, len: 230, amp: 1.15, phase: i * 0.7, speed: 1.5 });
    });
    orbs.push({ x: 260, y: 350, got: false });
    orbs.push({ x: 900, y: 330, got: false });
    orbs.push({ x: 1320, y: 260, got: false });
    orbs.push({ x: 1700, y: 350, got: false });
    orbs.push({ x: 2400, y: 350, got: false });
    orbs.push({ x: 3000, y: 330, got: false });
    orbs.push({ x: 3380, y: 240, got: false });
    orbs.push({ x: 3700, y: 340, got: false });
    en.push({ type: "warden", x: 860, y: GROUND - 52 });
    en.push({ type: "censer", x: 1600, y: 220, home: 220 });
    en.push({ type: "warden", x: 2320, y: GROUND - 52 });
    en.push({ type: "skitter", x: 2900, y: GROUND - 34 });
    en.push({ type: "censer", x: 3600, y: 240, home: 240 });
    return {
      name: "3 · The Clockheart", theme: "clock", width: 4160, ground: GROUND,
      solids: s, plats: p, spikes: sp, vents: vents, blades: blades, orbs: orbs, enemies: en,
      checkpoint: { x: 2880, y: GROUND - 60, on: false },
      door: { x: 4000, y: GROUND - 120, w: 60, h: 120 },
      hint: "The blades sweep. Dash through the beat."
    };
  }

  /* The vault: one arena, one boss. */
  function bossArea() {
    var s = [wall(-40, 0, 40, 900), wall(0, GROUND, 1000, 400), wall(1000, 0, 40, 900),
             wall(1000, GROUND, 300, 400)];
    return {
      name: "4 · The Crown Vault", theme: "vault", width: 1300, ground: GROUND,
      solids: s, plats: [], spikes: [], vents: [], blades: [], orbs: [],
      enemies: [], checkpoint: { x: 120, y: GROUND - 60, on: true },
      door: null, arena: 1000, hint: "Break the seal.", boss: true
    };
  }

  var AREAS = { 1: area1, 2: area2, 3: area3, 4: bossArea };

  /* A fresh copy of area n, so a restart really restarts. */
  function build(n) {
    var mk = AREAS[n] || AREAS[1];
    var base = mk();
    var level = {
      n: n, name: base.name, theme: base.theme, width: base.width, ground: base.ground,
      hint: base.hint, boss: !!base.boss, arena: base.arena || 0,
      solids: base.solids.slice(), plats: base.plats.slice(), spikes: base.spikes.slice(),
      orbs: base.orbs.map(function (o) { return { x: o.x, y: o.y, got: false }; }),
      enemies: base.enemies.map(function (e) { return Object.assign({}, e, { hp: 0 }); }),
      vents: base.vents.map(function (v) { return Object.assign({}, v); }),
      blades: base.blades.map(function (b) { return Object.assign({}, b); }),
      checkpoint: Object.assign({}, base.checkpoint),
      door: base.door ? Object.assign({}, base.door) : null,
      bullets: [], enemiesLive: [], particles: [], floats: []
    };
    return level;
  }

  function allSolids(level) {
    return level.plats.length ? level.solids.concat(level.plats) : level.solids;
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function hitsSolid(level, box) {
    var list = allSolids(level);
    for (var i = 0; i < list.length; i++) if (overlaps(box, list[i])) return list[i];
    return null;
  }
  function hitsSpike(level, box) {
    for (var i = 0; i < level.spikes.length; i++) if (overlaps(box, level.spikes[i])) return level.spikes[i];
    return null;
  }

  return { build: build, overlaps: overlaps, hitsSolid: hitsSolid, hitsSpike: hitsSpike,
           allSolids: allSolids, GROUND: GROUND, TILE: TILE };
})();
