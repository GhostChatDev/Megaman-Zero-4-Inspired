/* Nighttail — Kibo: run, jump, double jump, wall-slide, wall-jump, dash and a 3-hit sword combo. */
window.NT = window.NT || {};
NT.player = (function () {
  var W = NT.world;

  var RUN = 250, ACCEL = 2100, AIR_ACCEL = 1500, FRICTION = 2500;
  var GRAV = 1900, MAXFALL = 780, JUMP = 560, WALL_JUMP = 520, DOUBLE = 500;
  var DASH_SPEED = 620, DASH_TIME = 0.18, DASH_COOL = 0.5;
  var SWING = 0.28, SWING_HIT = 0.17, REACH = 48;

  function make(x, y) {
    return {
      x: x, y: y, w: 26, h: 42, vx: 0, vy: 0, dir: 1,
      onGround: false, wall: 0, wallLock: 0, jumps: 0, coyote: 0,
      hp: 5, maxHp: 5, iframes: 0, dead: false, respawnT: 0,
      dashTimer: 0, dashCool: 0, attackTimer: 0, combo: 0, comboTimer: 0,
      swingId: 0, hitIds: [], runT: 0, anim: 0
    };
  }

  function box(p) { return { x: p.x, y: p.y, w: p.w, h: p.h }; }

  function pushOut(p, dx, dy) {
    p.x += dx; p.y += dy;
    var list = W.allSolids(NT.game.level);
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      if (!W.overlaps(box(p), s)) continue;
      if (dx > 0) { p.x = s.x - p.w; p.vx = 0; p.wall = 1; }
      else if (dx < 0) { p.x = s.x + s.w; p.vx = 0; p.wall = -1; }
      if (dy > 0) { p.y = s.y - p.h; p.vy = 0; p.onGround = true; }
      else if (dy < 0) { p.y = s.y + s.h; p.vy = 0; }
    }
  }

  function hurt(p, dmg, fromX) {
    if (p.iframes > 0 || p.dead) return false;
    p.hp -= dmg;
    p.iframes = 1.15;
    p.vx = (p.x + p.w / 2 < fromX) ? -270 : 270;
    p.vy = -240;
    if (p.hp <= 0) { p.hp = 0; p.dead = true; p.respawnT = 1.2; NT.audio.sfx("die"); }
    else NT.audio.sfx("hurt");
    return true;
  }

  /* The sword hitbox, only live in the first part of a swing. */
  function bladeBox(p) {
    if (p.attackTimer <= 0 || p.attackTimer < SWING - SWING_HIT) return null;
    var wide = p.combo === 3 ? 60 : REACH;
    return { x: p.dir > 0 ? p.x + p.w - 6 : p.x - wide + 6, y: p.y + 2, w: wide, h: 38 };
  }

  function update(p, inp, dt, g) {
    var lv = g.level;
    if (p.dead) { p.respawnT -= dt; return; }

    p.iframes = Math.max(0, p.iframes - dt);
    p.dashCool = Math.max(0, p.dashCool - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.comboTimer = Math.max(0, p.comboTimer - dt);
    p.wallLock = Math.max(0, p.wallLock - dt);
    p.coyote = Math.max(0, p.coyote - dt);
    if (p.comboTimer === 0) p.combo = 0;

    var busy = p.attackTimer > 0;

    // --- dash start (works in the air too) ---
    if (p.dashTimer <= 0 && inp.dash && p.dashCool <= 0 && !busy) {
      p.dashTimer = DASH_TIME; p.dashCool = DASH_COOL;
      NT.audio.sfx("dash"); g.puff(p.x + p.w / 2, p.y + p.h / 2, "#8fd6ff", 8);
    }

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vx = p.dir * DASH_SPEED; p.vy = 0;
    } else {
      var accel = p.onGround ? ACCEL : AIR_ACCEL;
      if (inp.left && !inp.right) { p.dir = -1; p.vx -= accel * dt; }
      else if (inp.right && !inp.left) { p.dir = 1; p.vx += accel * dt; }
      else if (p.onGround) {
        var f = FRICTION * dt;
        p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
      }
      var top = busy ? 95 : RUN;
      p.vx = Math.max(-top, Math.min(top, p.vx));
      p.vy = Math.min(MAXFALL, p.vy + GRAV * dt);
    }

    // --- jumps: ground, wall, double ---
    if (inp.jumpPressed) {
      if (p.onGround || p.coyote > 0) {
        p.vy = -JUMP; p.jumps = 1; p.coyote = 0; p.onGround = false; NT.audio.sfx("jump");
      } else if (p.wall !== 0 && p.wallLock <= 0) {
        p.vy = -WALL_JUMP; p.vx = -p.wall * 340; p.dir = -p.wall;
        p.wallLock = 0.16; p.jumps = 1; NT.audio.sfx("jump");
      } else if (p.jumps < 2) {
        p.vy = -DOUBLE; p.jumps = 2; NT.audio.sfx("jump");
        g.puff(p.x + p.w / 2, p.y + p.h, "#cbb7ff", 6);
      }
    }

    // --- sword combo ---
    if (inp.attackPressed && p.attackTimer <= 0) {
      p.combo = p.combo >= 3 ? 1 : p.combo + 1;
      p.attackTimer = SWING; p.comboTimer = 0.55; p.swingId++;
      NT.audio.sfx(p.combo === 1 ? "cut" : "cut2");
    }

    // --- move and collide ---
    p.wall = 0;
    p.onGround = false;
    pushOut(p, p.vx * dt, 0);
    var sideWall = p.wall;
    pushOut(p, 0, p.vy * dt);
    p.wall = sideWall;

    // wall contact probe (mid-body) while falling
    if (!p.onGround && p.vy > 0) {
      var probeL = { x: p.x - 4, y: p.y + 8, w: 6, h: p.h - 16 };
      var probeR = { x: p.x + p.w - 2, y: p.y + 8, w: 6, h: p.h - 16 };
      if (W.hitsSolid(lv, probeR)) p.wall = 1;
      else if (W.hitsSolid(lv, probeL)) p.wall = -1;
    }
    if (p.onGround) {
      p.jumps = 0; p.coyote = 0.1;
      if (p.dashTimer > 0 && p.vy === 0) p.vy = 30;
    }
    if (p.wall !== 0 && !p.onGround && p.vy > 0 && ((p.wall > 0 && inp.right) || (p.wall < 0 && inp.left))) {
      p.vy = Math.min(p.vy, 95); // slow slide down the wall
    }
    if (p.y > 900) { p.hp = 0; p.dead = true; p.respawnT = 1.2; NT.audio.sfx("die"); }

    if (Math.abs(p.vx) > 20 && p.onGround) p.runT += dt * Math.abs(p.vx) / 120; else p.runT = 0;
    p.anim += dt;

    // --- hazards ---
    if (W.hitsSpike(lv, box(p))) hurt(p, 1, p.x + p.w / 2);
  }

  function swingIdOf(p) { return p.swingId; }

  return { make: make, update: update, hurt: hurt, box: box, bladeBox: bladeBox, swingIdOf: swingIdOf };
})();
