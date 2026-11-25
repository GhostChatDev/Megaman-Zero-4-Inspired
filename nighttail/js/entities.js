/* Nighttail — enemies, hazards, shots and the Hollow Keeper.
   Every list is walked backwards when something is removed. */
window.NT = window.NT || {};
NT.entities = (function () {
  var W = NT.world;

  var DEF = {
    spire:   { w: 34, h: 46, hp: 3, score: 5 },
    skitter: { w: 40, h: 30, hp: 2, score: 4 },
    censer:  { w: 38, h: 44, hp: 4, score: 7 },
    warden:  { w: 44, h: 52, hp: 6, score: 12 }
  };

  function ebox(e) { return { x: e.x, y: e.y, w: e.w, h: e.h }; }

  function groundAhead(e, lv) {
    var probe = { x: e.dir > 0 ? e.x + e.w : e.x - 12, y: e.y + e.h + 2, w: 12, h: 10 };
    return !!W.hitsSolid(lv, probe);
  }

  function makeKeeper() {
    return {
      type: "keeper", boss: true, x: 700, y: 300, w: 70, h: 96, hp: 40, maxHp: 40, score: 0,
      vx: 0, vy: 0, dir: -1, t: 0, hurtT: 0, dead: false, phase: 1,
      state: "rest", timer: 1.4, lastSwing: -1, shootT: 0, onGround: false, flash: 0
    };
  }

  function spawn(level) {
    level.enemiesLive = level.enemies.map(function (e) {
      var d = DEF[e.type] || DEF.spire;
      return {
        type: e.type, x: e.x, y: e.y, w: d.w, h: d.h, hp: d.hp, maxHp: d.hp, score: d.score,
        vx: 0, vy: 0, dir: e.dir || -1, t: 0, hurtT: 0, dead: false,
        home: typeof e.home === "number" ? e.home : e.y, lastSwing: -1,
        shootT: 1.2 + Math.random() * 1.2, charge: 0, chargeCool: 0
      };
    });
    if (level.boss) level.enemiesLive.push(makeKeeper());
    level.bullets = [];
  }

  /* --- shots --- */
  function shot(lv, x, y, vx, vy, dmg, kind) {
    lv.bullets.push({ x: x, y: y, vx: vx, vy: vy, r: kind === "orb" ? 9 : 6, dmg: dmg || 1, kind: kind || "bolt", t: 0 });
  }

  function updateBullets(lv, dt, g) {
    var p = g.player;
    for (var i = lv.bullets.length - 1; i >= 0; i--) {
      var b = lv.bullets[i];
      if (!b || b.dead) { lv.bullets.splice(i, 1); continue; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.t += dt;
      if (b.kind === "orb") b.vy += 260 * dt;
      if (W.hitsSolid(lv, { x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 })) {
        lv.bullets.splice(i, 1); continue;
      }
      if (W.overlaps({ x: b.x - b.r, y: b.y - b.r, w: b.r * 2, h: b.r * 2 }, NT.player.box(p))) {
        if (NT.player.hurt(p, b.dmg, b.x)) { lv.bullets.splice(i, 1); continue; }
      }
      if (b.t > 6 || b.x < -100 || b.x > lv.width + 100) lv.bullets.splice(i, 1);
    }
  }

  /* --- hazards --- */
  function updateHazards(lv, dt, g) {
    var p = g.player;
    for (var i = 0; i < lv.vents.length; i++) {
      var v = lv.vents[i];
      var t = (v.t = (v.t || 0) + dt);
      var cyc = (v.phase + t) % v.period;
      v.hot = false; v.warn = false;
      if (cyc < 0.6) v.warn = true;
      else if (cyc < 1.5) v.hot = true;
      if (v.hot && W.overlaps({ x: v.x, y: v.y - v.h, w: v.w, h: v.h }, NT.player.box(p)))
        NT.player.hurt(p, 1, v.x + v.w / 2);
    }
    for (var j = 0; j < lv.blades.length; j++) {
      var bl = lv.blades[j];
      bl.t = (bl.t || 0) + dt;
      var a = Math.sin((bl.t + bl.phase) * bl.speed) * bl.amp;
      bl.tipX = bl.x + Math.sin(a) * bl.len;
      bl.tipY = bl.y + Math.cos(a) * bl.len;
      bl.a = a;
      var hb = { x: bl.tipX - 14, y: bl.tipY - 14, w: 28, h: 28 };
      if (W.overlaps(hb, NT.player.box(p))) NT.player.hurt(p, 1, bl.tipX);
    }
  }

  /* --- damage to an enemy --- */
  function damage(e, amount, g) {
    if (e.dead) return false;
    e.hp -= amount; e.hurtT = 0.14;
    g.hitStop = Math.max(g.hitStop, e.boss ? 0.09 : 0.05);
    g.shake = Math.max(g.shake, e.boss ? 7 : 3);
    g.puff(e.x + e.w / 2, e.y + e.h / 2, "#ffd7a1", e.boss ? 10 : 5);
    NT.audio.sfx(e.boss ? "bossHit" : "hit");
    if (e.hp <= 0) {
      e.dead = true;
      g.embers += e.score;
      g.float(e.x + e.w / 2, e.y, "+" + e.score, "#e9d27a");
      g.puff(e.x + e.w / 2, e.y + e.h / 2, "#ff9f6b", 12);
      return true;
    }
    if (e.type === "keeper" && e.phase === 1 && e.hp <= e.maxHp / 2) {
      e.phase = 2; e.flash = 0.5; NT.audio.sfx("roar");
    }
    return false;
  }

  /* --- per-type behaviour --- */
  function updateEnemy(e, lv, dt, g) {
    var p = g.player;
    e.t += dt;
    e.hurtT = Math.max(0, e.hurtT - dt);
    e.flash = Math.max(0, (e.flash || 0) - dt);
    var dx = (p.x + p.w / 2) - (e.x + e.w / 2);

    if (e.type === "keeper") { updateKeeper(e, lv, dt, g, dx); return; }

    if (e.type === "censer") {
      e.y = e.home + Math.sin(e.t * 1.6) * 22;
      e.x += Math.sign(dx) * 26 * dt;
      e.shootT -= dt;
      if (e.shootT <= 0 && Math.abs(dx) < 420) {
        e.shootT = 2.0;
        shot(lv, e.x + e.w / 2, e.y + e.h, -60 + Math.random() * 20, 130, 1, "orb");
      }
      return;
    }

    if (e.type === "warden") {
      e.chargeCool = Math.max(0, (e.chargeCool || 0) - dt);
      if (e.charge > 0) {
        e.charge -= dt;
        e.vx = e.dir * 330;
      } else if (e.chargeCool <= 0 && Math.abs(dx) < 210) {
        e.charge = 0.85; e.chargeCool = 2.4; e.dir = Math.sign(dx) || 1; NT.audio.sfx("roar");
      } else {
        e.vx = 0;
      }
      e.vy = Math.min(780, (e.vy || 0) + 1900 * dt);
      e.x += e.vx * dt;
      if (W.hitsSolid(lv, ebox(e))) { e.x -= e.vx * dt; e.vx = 0; e.charge = 0; }
      e.y += e.vy * dt;
      e.onGround = false;
      if (W.hitsSolid(lv, ebox(e))) {
        while (W.hitsSolid(lv, ebox(e)) && e.y > 0) e.y -= 2;
        e.vy = 0; e.onGround = true;
      }
      return;
    }

    // spire and skitter: ground walkers
    var speed = e.type === "skitter" ? 120 : 62;
    e.vy = Math.min(780, (e.vy || 0) + 1900 * dt);
    if (e.type === "skitter" && Math.abs(dx) > 12) e.dir = Math.sign(dx);
    e.vx = e.dir * speed;
    e.x += e.vx * dt;
    if (W.hitsSolid(lv, ebox(e)) || !groundAhead(e, lv) && e.onGround) {
      e.x -= e.vx * dt; e.dir *= -1;
    }
    e.y += e.vy * dt;
    e.onGround = false;
    if (W.hitsSolid(lv, ebox(e))) {
      while (W.hitsSolid(lv, ebox(e)) && e.y > 0) e.y -= 2;
      e.vy = 0; e.onGround = true;
    }
    if (e.y > 900) e.dead = true;
  }

  /* The Hollow Keeper: telegraphed slam, sweep and orb spread. */
  function updateKeeper(e, lv, dt, g, dx) {
    var p = g.player;
    var fast = e.phase === 2 ? 0.62 : 1;
    e.timer -= dt;
    e.vy = Math.min(780, (e.vy || 0) + 1900 * dt);

    if (e.state === "rest") {
      e.vx = (Math.abs(dx) > 150 ? Math.sign(dx) * 70 * fast : 0);
      if (e.timer <= 0) {
        var roll = Math.random();
        e.state = roll < 0.38 ? "slamTell" : roll < 0.72 ? "sweepTell" : "spreadTell";
        e.timer = 0.55 * fast;
        e.dir = Math.sign(dx) || -1;
        if (e.state === "spreadTell") e.timer = 0.5 * fast;
      }
    } else if (e.state === "slamTell" || e.state === "sweepTell" || e.state === "spreadTell") {
      e.vx = 0;
      if (e.timer <= 0) {
        if (e.state === "slamTell") {
          e.state = "slam"; e.timer = 1.1;
          e.vy = -640; e.vx = Math.sign(dx) * 200;
          NT.audio.sfx("roar");
        } else if (e.state === "sweepTell") {
          e.state = "sweep"; e.timer = 0.7 * fast;
          e.vx = e.dir * 430 * fast;
          NT.audio.sfx("dash");
        } else {
          e.state = "spread"; e.timer = 0.35;
          var n = e.phase === 2 ? 7 : 5;
          for (var k = 0; k < n; k++) {
            var ang = -0.9 + (1.8 * k) / (n - 1);
            shot(lv, e.x + e.w / 2, e.y + 30, Math.cos(ang) * 260 * e.dir, Math.sin(ang) * 220 - 60, 1, "orb");
          }
          NT.audio.sfx("cut2");
        }
      }
    } else if (e.state === "slam") {
      if (e.onGround && e.vy >= 0 && e.timer < 0.9) {
        e.state = "rest"; e.timer = 0.9 * fast; e.vx = 0;
        g.shake = 12; g.hitStop = 0.07; NT.audio.sfx("bossHit");
        shot(lv, e.x - 20, lv.ground - 30, -300, -40, 1, "orb");
        shot(lv, e.x + e.w + 20, lv.ground - 30, 300, -40, 1, "orb");
      }
      if (e.timer <= 0) { e.state = "rest"; e.timer = 0.6 * fast; }
    } else if (e.state === "sweep") {
      if (e.timer <= 0) { e.state = "rest"; e.timer = 0.7 * fast; e.vx = 0; }
    } else if (e.state === "spread") {
      e.vx = 0;
      if (e.timer <= 0) { e.state = "rest"; e.timer = 0.8 * fast; }
    }

    e.x += e.vx * dt;
    if (W.hitsSolid(lv, ebox(e))) { e.x -= e.vx * dt; e.vx = 0; if (e.state === "sweep") e.state = "rest"; }
    // Keep the whole body inside the arena. The old bound let the Keeper sink into the right wall,
    // and the vertical un-stick loop then shoved it to the ceiling, where no sword can reach it.
    e.x = Math.max(20, Math.min(lv.arena - e.w, e.x));
    var prevY = e.y;
    e.y += e.vy * dt;
    e.onGround = false;
    if (W.hitsSolid(lv, ebox(e))) {
      // Falling into something: rise out of it. Rising into something: never stay inside it.
      if (e.vy > 0) while (W.hitsSolid(lv, ebox(e)) && e.y > prevY - 64) e.y -= 2;
      if (W.hitsSolid(lv, ebox(e))) e.y = prevY;
      e.vy = 0; e.onGround = true;
    }
  }

  function update(lv, dt, g) {
    var p = g.player;
    for (var i = lv.enemiesLive.length - 1; i >= 0; i--) {
      var e = lv.enemiesLive[i];
      if (!e || e.dead) { lv.enemiesLive.splice(i, 1); continue; }
      updateEnemy(e, lv, dt, g);

      // did a sword swing touch it?
      var bb = NT.player.bladeBox(p);
      if (bb && e.lastSwing !== p.swingId && W.overlaps(bb, ebox(e))) {
        e.lastSwing = p.swingId;
        damage(e, p.combo === 3 ? 2 : 1, g);
        if (e.dead) continue;
        e.x += p.dir * 8;
      }
      // touching it hurts
      if (W.overlaps(ebox(e), NT.player.box(p))) {
        var dmg = e.type === "warden" ? 2 : 1;
        if (e.type === "keeper" && e.state === "sweep") dmg = 2;
        NT.player.hurt(p, dmg, e.x + e.w / 2);
      }
    }
    updateBullets(lv, dt, g);
    updateHazards(lv, dt, g);
  }

  function bossOf(lv) {
    for (var i = 0; i < lv.enemiesLive.length; i++) if (lv.enemiesLive[i] && lv.enemiesLive[i].boss) return lv.enemiesLive[i];
    return null;
  }

  return { spawn: spawn, update: update, damage: damage, bossOf: bossOf, makeKeeper: makeKeeper,
           shot: shot, DEF: DEF };
})();
