// Secret mode: one-on-one CEO Kombat, opened from the faint logo in the corner of the CEO select screen.
// Best of 3 rounds against the computer, up a ladder of 3 rivals, with a (bloodless, corporate) finisher.
// Uses the helpers and globals from game.js.
"use strict";
(() => {
  const FLOOR = 206, SC = 3, LEFT = 26, RIGHT = W - 26;
  const MOVES = { musk: "uppercut", zuck: "teleport", bezos: "dash", cook: "shield", huang: "beam", su: "spread", dyson: "pull", barra: "wave" };
  const ATK = {
    punch: { dur: 16, a: 4, b: 8, range: 40, dmg: 7, push: 2.5, stun: 14 },
    kick: { dur: 22, a: 8, b: 13, range: 48, dmg: 10, push: 3.5, stun: 18 },
    jkick: { dur: 60, a: 3, b: 22, range: 42, dmg: 10, push: 3, stun: 16 },
  };
  let K = null;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const surname = c => c.name.split(" ").pop();

  // ---------- fighter sprites: personSprite's look, with fighting poses ----------
  function fighterSprite(c, pose) {
    const s = P(34, 30), top = c.top, skin = c.skin, legs = c.bottom, shoe = "#151515";
    const lean = pose === "hit" ? -2 : pose === "punch" || pose === "special" ? 1 : 0;
    const q = { r: (x, y, w, h, col) => s.r(x + 7, y + 3, w, h, col) }; // legs
    const b = { r: (x, y, w, h, col) => s.r(x + 7 + lean, y + 3, w, h, col) }; // upper body
    if (pose === "kick") { q.r(5, 17, 2, 6, legs); q.r(4, 23, 3, 1, shoe); q.r(10, 13, 11, 3, legs); q.r(21, 12, 2, 5, shoe); }
    else if (pose === "jump") { q.r(5, 17, 3, 3, legs); q.r(4, 20, 3, 2, legs); q.r(3, 22, 3, 1, shoe); q.r(10, 17, 3, 3, legs); q.r(12, 19, 3, 2, legs); q.r(14, 20, 2, 2, shoe); }
    else if (pose === "walk1") { q.r(6, 17, 2, 3, legs); q.r(4, 19, 2, 4, legs); q.r(3, 23, 3, 1, shoe); q.r(10, 17, 2, 3, legs); q.r(12, 19, 2, 4, legs); q.r(12, 23, 3, 1, shoe); }
    else if (pose === "walk2") { q.r(6, 17, 2, 6, legs); q.r(9, 17, 2, 6, legs); q.r(5, 23, 3, 1, shoe); q.r(9, 23, 3, 1, shoe); }
    else { q.r(4, 17, 2, 6, legs); q.r(11, 17, 2, 6, legs); q.r(3, 23, 3, 1, shoe); q.r(11, 23, 3, 1, shoe); }
    b.r(5, 10, 8, 8, top); b.r(11, 10, 2, 8, shade(top, 0.75)); b.r(8, 10, 2, 3, c.inner);
    if (c.leather) b.r(6, 11, 1, 5, "#505058");
    if (pose === "punch") { b.r(4, 11, 2, 4, top); b.r(4, 15, 2, 1, skin); b.r(12, 11, 9, 2, top); b.r(21, 10, 3, 4, skin); }
    else if (pose === "kick") { b.r(2, 10, 4, 2, top); b.r(1, 10, 1, 2, skin); b.r(12, 11, 2, 3, top); b.r(13, 9, 2, 2, skin); }
    else if (pose === "block") { b.r(11, 4, 3, 8, top); b.r(12, 3, 3, 2, skin); b.r(9, 6, 3, 6, shade(top, 0.8)); b.r(9, 5, 3, 2, skin); }
    else if (pose === "hit") { b.r(1, 8, 4, 2, top); b.r(0, 7, 2, 2, skin); b.r(13, 8, 4, 2, top); b.r(17, 7, 2, 2, skin); }
    else if (pose === "special") { b.r(12, 10, 7, 2, top); b.r(12, 13, 7, 2, top); b.r(19, 9, 3, 7, skin); }
    else if (pose === "jump") { b.r(3, 6, 2, 5, top); b.r(3, 5, 2, 1, skin); b.r(13, 6, 2, 5, top); b.r(13, 5, 2, 1, skin); }
    else if (pose === "win") { b.r(4, 11, 2, 5, top); b.r(4, 16, 2, 1, skin); b.r(12, 1, 2, 10, top); b.r(12, -1, 3, 3, skin); }
    else { b.r(4, 11, 2, 4, top); b.r(5, 10, 2, 2, skin); b.r(12, 11, 3, 2, top); b.r(14, 8, 2, 3, top); b.r(14, 7, 3, 2, skin); } // guard
    b.r(8, 9, 3, 1, shade(skin, 0.85));
    b.r(6, 2, 7, 7, skin); b.r(12, 3, 1, 6, shade(skin, 0.85));
    if (pose === "hit") { b.r(9, 5, 1, 1, "#111"); b.r(11, 5, 1, 1, "#111"); b.r(10, 7, 2, 2, "#401010"); }
    else { b.r(9, 5, 1, 1, "#111"); b.r(11, 5, 1, 1, "#111"); b.r(9, 4, 2, 1, "#00000060"); b.r(10, 7, 2, 1, "#a05050"); }
    if (c.glasses) { b.r(8, 4, 5, 1, c.glasses); b.r(8, 5, 1, 1, c.glasses); b.r(12, 5, 1, 1, c.glasses); }
    drawHairSmall(b, c);
    return outline(s.c);
  }
  function rotate(c) { const o = mk(c.height, c.width), g = o.getContext("2d"); g.translate(0, c.width); g.rotate(-Math.PI / 2); g.drawImage(c, 0, 0); return o; }
  const cache = {};
  function sprites(c) {
    if (cache[c.id]) return cache[c.id];
    const r = {}, l = {};
    for (const p of ["idle", "walk1", "walk2", "jump", "punch", "kick", "block", "hit", "special", "win"]) { r[p] = fighterSprite(c, p); l[p] = flip(r[p]); }
    r.ko = rotate(r.hit); l.ko = flip(r.ko);
    return (cache[c.id] = { r, l });
  }

  // ---------- sounds ----------
  const KS = {
    punch: () => sfx(t => { noise(t, 0.09, 0.5, 700, sfxBus, "lowpass"); tone("square", 160, t, 0.08, 0.08, sfxBus, 60); }),
    kick: () => sfx(t => { noise(t, 0.14, 0.6, 450, sfxBus, "lowpass"); tone("sawtooth", 110, t, 0.12, 0.08, sfxBus, 40); }),
    whiff: () => sfx(t => noise(t, 0.08, 0.08, 2500, sfxBus, "bandpass")),
    block: () => sfx(t => { tone("square", 1400, t, 0.05, 0.05, sfxBus); noise(t, 0.05, 0.2, 5000, sfxBus); }),
    boom: () => sfx(t => { tone("sawtooth", 70, t, 1.2, 0.2, sfxBus, 30); noise(t, 0.8, 0.3, 200, sfxBus, "lowpass"); }),
    stamp: () => sfx(t => { noise(t, 0.3, 0.8, 300, sfxBus, "lowpass"); tone("square", 60, t, 0.3, 0.15, sfxBus, 30); }),
  };

  // ---------- setup ----------
  function fighter(c, x, face, cpu) {
    return { c, x, y: 0, vx: 0, vy: 0, face, hp: 100, st: "idle", t: 0, cd: 0, cpu, done: false, stun: 0, wins: 0, inv: 0, shield: 0, hurt: 0, ai: { hold: 0, mode: "" }, blocking: false, scale: 1, alpha: 1 };
  }
  window.enterKombat = function () {
    K = { sel: CEOS.indexOf(ceo) >= 0 ? CEOS.indexOf(ceo) : 0 };
    document.body.classList.add("kombat");
    SFX.fight(); Music.play("tense", -2, 118);
    setState("kselect");
  };
  function leave() { document.body.classList.remove("kombat"); K = null; Music.play("title", 0, 128); setState("title"); }
  addEventListener("keydown", e => { if (e.code === "Escape" && state.startsWith("k")) leave(); });

  function startMatch() {
    const me = CEOS[K.sel], foe = CEOS.find(c => c.id === K.tower[K.idx]);
    K.p1 = fighter(me, 110, 1, false); K.p2 = fighter(foe, W - 110, -1, true);
    K.round = 1; K.shots = []; K.parts = []; K.shake = 0; K.f = 0;
    startRound();
  }
  function startRound() {
    for (const [f, x, face] of [[K.p1, 110, 1], [K.p2, W - 110, -1]]) Object.assign(f, { x, y: 0, vx: 0, vy: 0, face, hp: 100, st: "idle", t: 0, cd: 60, stun: 0, inv: 0, shield: 0, hurt: 0, scale: 1, alpha: 1, gone: false });
    K.shots = []; K.timer = 60 * 60; K.phase = "intro"; K.pt = 0; K.msg = ""; K.fatal = null;
    Music.play("fight2", -2, 156);
  }

  // ---------- fight logic ----------
  function inputFor(f) {
    if (f.cpu) return ai(f, f === K.p1 ? K.p2 : K.p1);
    return { left: keys.left, right: keys.right, up: pressed.up, down: keys.down, punch: pressed.jump || pressed.start, kick: pressed.special, sp: pressed.super };
  }
  function ai(f, o) {
    const a = f.ai, dx = o.x - f.x, dist = Math.abs(dx), toward = Math.sign(dx) || 1, lvl = K.idx;
    const inp = { left: false, right: false, up: false, down: false, punch: false, kick: false, sp: false };
    const go = d => { if (d > 0) inp.right = true; else inp.left = true; };
    if (K.phase === "finish") { if (dist > 70) go(toward); else inp.sp = true; return inp; }
    if (a.hold > 0) { a.hold--; go(-toward); if (a.mode === "block") inp.down = true; return inp; }
    const threat = ["punch", "kick", "jkick", "special"].includes(o.st) && dist < 100;
    const incoming = K.shots.some(s => s.owner !== f && Math.sign(f.x - s.x) === Math.sign(s.vx) && Math.abs(f.x - s.x) < 120);
    if ((threat || incoming) && Math.random() < 0.1 + lvl * 0.05) {
      if (incoming && Math.random() < 0.5) { inp.up = true; go(toward); } else { a.mode = "block"; a.hold = 16; }
      return inp;
    }
    const ranged = ["beam", "spread", "wave", "teleport", "dash", "pull", "uppercut"].includes(MOVES[f.c.id]);
    if (dist > 62) {
      go(toward);
      if (f.cd <= 0 && ranged && Math.random() < 0.01 + lvl * 0.006) inp.sp = true;
      if (Math.random() < 0.005) inp.up = true;
    } else {
      const r = Math.random();
      if (r < 0.04 + lvl * 0.02) inp.punch = true;
      else if (r < 0.07 + lvl * 0.03) inp.kick = true;
      else if (r < 0.08 + lvl * 0.035 && f.cd <= 0) inp.sp = true;
      else if (r < 0.1 + lvl * 0.035) { a.mode = "back"; a.hold = 18; }
    }
    return inp;
  }

  function startAtk(f, kind) { f.st = kind; f.t = 0; f.done = false; KS.whiff(); }
  function startSpecial(f) {
    f.st = "special"; f.t = 0; f.done = false; f.cd = 150; f.move = MOVES[f.c.id];
    SFX.special(); spark(f.x, FLOOR - 60, "#80e0ff", 10); K.parts.push({ x: f.x, y: FLOOR - 110, vx: 0, vy: -0.4, life: 50, s: f.c.sp, col: "#80e0ff" });
  }
  function spark(x, y, col, n = 8) { for (let i = 0; i < n; i++) K.parts.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.9) * 4, life: 25 + Math.random() * 15, col }); }
  function cash(x, y, n) { for (let i = 0; i < n; i++) K.parts.push({ x, y, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 4, life: 50, coin: true, g: 0.25 }); }

  // range check: is o inside f's attack box this frame?
  function reaches(f, o, range, high = 60) {
    const front = (o.x - f.x) * f.face;
    return front > -6 && front < range + 12 && Math.abs(f.y - o.y) < high;
  }
  function hit(o, dmg, push, stun, from, launch) {
    if (o.st === "ko" || o.gone || K.phase !== "fight" && K.phase !== "finish") return;
    if (K.phase === "finish") { if (o === K.loser) { o.st = "ko"; KS.kick(); cash(o.x, FLOOR - 50, 12); K.phase = "won"; K.pt = 0; K.msg = `${surname(from.c)} WINS`; } return; }
    if (o.shield > 0) { o.shield = 0; spark(o.x, FLOOR - 50, "#80d0ff", 14); KS.block(); hit(from, 8, -push, 16, o); return; }
    if (o.inv > 0) return;
    const facing = Math.sign(from.x - o.x) === o.face;
    if (o.blocking && facing && o.y <= 0) {
      o.hp = Math.max(1, o.hp - 1); o.st = "block"; o.stun = 10; o.vx = push * 0.6; KS.block(); spark(o.x + o.face * 12, FLOOR - 55, "#c0c0c0", 5); return;
    }
    o.hp -= dmg; o.hurt += dmg; o.st = "hit"; o.stun = stun; o.vx = push; if (launch) o.vy = 6;
    from.cd = Math.max(0, from.cd - 10);
    (dmg >= 10 ? KS.kick : KS.punch)(); K.shake = dmg >= 12 ? 10 : 5;
    spark(o.x, FLOOR - 55 - o.y, "#ffe060", 6); cash(o.x, FLOOR - 55 - o.y, dmg >= 10 ? 5 : 3);
    if (o.hp <= 0) { o.hp = 0; roundOver(from, o); }
  }
  function roundOver(w, l) {
    w.wins++;
    K.flawless = w.hurt === 0;
    KS.boom();
    if (w.wins >= 2) { l.st = "dizzy"; l.vx = 0; K.phase = "finish"; K.pt = 0; K.winner = w; K.loser = l; K.shots = []; Music.stop(); }
    else { l.st = "ko"; K.phase = "roundend"; K.pt = 0; K.winner = w; }
  }

  function updateFighter(f, o, inp) {
    f.t++; if (f.cd > 0) f.cd--; if (f.inv > 0) f.inv--; if (f.shield > 0) f.shield--;
    const ground = f.y <= 0, A = ATK[f.st];
    f.blocking = false;
    if (f.st === "hit" || f.st === "block") { f.vx *= 0.85; if (--f.stun <= 0) f.st = "idle"; }
    else if (f.st === "ko" || f.st === "dizzy" || f.st === "win" || f.gone) { f.vx *= 0.8; }
    else if (A) {
      if (ground && f.st !== "jkick") f.vx *= 0.7;
      if (!f.done && f.t >= A.a && f.t <= A.b && reaches(f, o, A.range)) { f.done = true; hit(o, A.dmg, A.push * f.face, A.stun, f); }
      if (f.t >= A.dur || (f.st === "jkick" && ground && f.t > 4)) f.st = "idle";
    } else if (f.st === "special") special(f, o, ground);
    else {
      if (ground) f.face = Math.sign(o.x - f.x) || f.face;
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (ground) { f.vx = dir * (dir === f.face ? 1.8 : 1.4); f.st = dir ? "walk" : "idle"; f.blocking = dir === -f.face || inp.down; }
      if (inp.up && ground) { f.vy = 7.6; f.vx = dir * 2.4; f.st = "jump"; }
      if (inp.punch) startAtk(f, ground ? "punch" : "jkick");
      else if (inp.kick) startAtk(f, ground ? "kick" : "jkick");
      else if (inp.sp && f.cd <= 0 && ground) startSpecial(f);
    }
    // physics
    f.x += f.vx;
    if (f.y > 0 || f.vy > 0) { f.y += f.vy; f.vy -= 0.42; if (f.y <= 0) { f.y = 0; f.vy = 0; if (f.st === "jump") f.st = "idle"; } }
    f.x = Math.max(LEFT, Math.min(RIGHT, f.x));
  }
  function special(f, o, ground) {
    const t = f.t, m = f.move;
    if (m === "uppercut") {
      if (t === 3) { f.vy = 8.5; f.vx = f.face * 1.6; }
      for (let i = 0; i < 2; i++) K.parts.push({ x: f.x - f.face * 4, y: FLOOR - f.y, vx: Math.random() - 0.5, vy: 2, life: 14, col: i ? "#ff9020" : "#ffe060" });
      if (!f.done && t >= 3 && t <= 20 && reaches(f, o, 34, 90)) { f.done = true; hit(o, 14, f.face * 3, 24, f, true); }
      if (t > 8 && ground) f.st = "idle";
    } else if (m === "teleport") {
      f.alpha = t < 12 ? 1 - t / 12 : Math.min(1, (t - 12) / 4); f.inv = t < 14 ? 2 : 0;
      if (t === 12) { f.x = Math.max(LEFT, Math.min(RIGHT, o.x - o.face * 34)); f.face = Math.sign(o.x - f.x) || 1; }
      if (!f.done && t >= 15 && t <= 20 && reaches(f, o, 42)) { f.done = true; hit(o, 12, f.face * 3, 20, f); }
      if (t >= 30) { f.st = "idle"; f.alpha = 1; }
    } else if (m === "dash") {
      if (t >= 4 && t <= 26 && !f.done) { f.vx = f.face * 6.5; if (t % 2) K.parts.push({ x: f.x - f.face * 20, y: FLOOR - 40, vx: -f.face, vy: 0, life: 12, col: "#c89050" }); }
      else f.vx *= 0.7;
      if (!f.done && t >= 4 && reaches(f, o, 30)) { f.done = true; f.vx = 0; hit(o, 12, f.face * 5, 22, f); }
      if (t >= 36) f.st = "idle";
    } else if (m === "shield") {
      if (t === 2) f.shield = 110;
      if (t >= 18) f.st = "idle";
    } else if (m === "beam" || m === "spread" || m === "wave") {
      if (t === 9) {
        if (m === "beam") K.shots.push({ x: f.x + f.face * 30, y: 46, vx: f.face * 5, vy: 0, w: 28, h: 12, dmg: 13, col: "#76b900", owner: f });
        if (m === "spread") for (const vy of [1.2, 0, -0.6]) K.shots.push({ x: f.x + f.face * 30, y: 50, vx: f.face * 5, vy, w: 9, h: 9, dmg: 6, col: "#ff3030", owner: f });
        if (m === "wave") { K.shots.push({ x: f.x + f.face * 30, y: 0, vx: f.face * 4.2, vy: 0, w: 22, h: 14, dmg: 12, col: "#40ff80", owner: f, ground: true }); K.shake = 8; }
      }
      if (t >= 26) f.st = "idle";
    } else if (m === "pull") {
      if (t >= 6 && t < 42) {
        if (Math.abs(o.x - f.x) < 220 && o.st !== "ko") o.x += Math.sign(f.x - o.x) * (o.blocking ? 1 : 2.6);
        if (t % 2) K.parts.push({ x: f.x + f.face * 30 + Math.cos(t) * 20, y: FLOOR - 50 + Math.sin(t) * 20, vx: -f.face * 2, vy: 0, life: 12, col: "#c060ff" });
      }
      if (t === 42 && reaches(f, o, 50)) hit(o, 13, f.face * 4, 22, f, true);
      if (t >= 50) f.st = "idle";
    }
  }
  function updateShots() {
    for (const s of K.shots) {
      s.x += s.vx; s.y += s.vy;
      const o = s.owner === K.p1 ? K.p2 : K.p1;
      const top = FLOOR - o.y - 78, bottom = FLOOR - o.y, sy = FLOOR - s.y;
      if (!s.dead && Math.abs(s.x - o.x) < 14 + s.w / 2 && sy > top && sy - s.h < bottom && o.inv <= 0 && !o.gone) {
        if (o.shield > 0) { s.vx = -s.vx; s.owner = o; spark(s.x, sy, "#80d0ff", 8); KS.block(); continue; }
        s.dead = true; hit(o, s.dmg, Math.sign(s.vx) * 2.5, 18, s.owner);
      }
      if (s.x < -40 || s.x > W + 40) s.dead = true;
    }
    K.shots = K.shots.filter(s => !s.dead);
  }
  function separate() {
    const a = K.p1, b = K.p2, d = b.x - a.x;
    if (Math.abs(d) < 26 && Math.abs(a.y - b.y) < 50 && !a.gone && !b.gone && a.st !== "special" && b.st !== "special") {
      const push = (26 - Math.abs(d)) / 2 * (Math.sign(d) || 1); a.x -= push; b.x += push;
      a.x = Math.max(LEFT, Math.min(RIGHT, a.x)); b.x = Math.max(LEFT, Math.min(RIGHT, b.x));
    }
  }

  // ---------- finishers ----------
  function startFatal(w, l) {
    K.phase = "fatal"; K.pt = 0; K.fatal = pick(["acquired", "fired"]); w.st = "special"; w.move = "none"; w.t = 0; KS.boom();
    K.fx = { stampY: -80, caseX: l.x, caseY: FLOOR - 20 };
  }
  function updateFatal() {
    const w = K.winner, l = K.loser, t = K.pt, fx = K.fx;
    if (K.fatal === "acquired") {
      if (t >= 20 && t < 46) fx.stampY = -80 + (t - 20) / 26 * (FLOOR - 150);
      if (t === 46) { KS.stamp(); K.shake = 18; cash(l.x, FLOOR - 60, 20); }
      if (t > 60 && t < 100) l.scale = Math.max(0, 1 - (t - 60) / 40);
      if (t === 100) { l.gone = true; SFX.coin(); }
      if (t > 110 && t < 150) { const k = (t - 110) / 40; fx.caseX = l.x + (w.x - l.x) * k; fx.caseY = FLOOR - 20 - Math.sin(k * Math.PI) * 60 - k * 40; }
      if (t === 150) { w.st = "win"; SFX.power(); }
    } else {
      if (t < 120 && t % 3 === 0) K.parts.push({ x: Math.random() * W, y: 20, vx: (Math.random() - 0.5), vy: 1 + Math.random() * 1.5, life: 140, slip: true, g: 0 });
      if (t === 60) { KS.stamp(); K.shake = 10; }
      if (t > 64 && t < 120) { l.y -= (t - 64) * 0.25; }
      if (t === 120) { l.gone = true; w.st = "win"; SFX.power(); }
    }
    if (t === 160) KS.boom();
  }

  // ---------- drawing ----------
  function drawArena() {
    const f = K.f;
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1a0004"); g.addColorStop(0.6, "#5a0a10"); g.addColorStop(1, "#200004"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // the logo hangs in the sky like a moon
    ctx.globalAlpha = 0.22; drawLogo(W / 2, 74, 120); ctx.globalAlpha = 1;
    for (let i = 0; i < 26; i++) { const h = 30 + hash(i * 7) * 70, x = i * 16 - 6; ctx.fillStyle = "#12020a"; ctx.fillRect(x, FLOOR - 40 - h, 15, h + 40); ctx.fillStyle = "#ff606030"; for (let y = FLOOR - 36 - h; y < FLOOR - 44; y += 7) if (hash(i * 31 + y) > 0.6) ctx.fillRect(x + 4, y, 3, 3); }
    if (f % 400 < 6) { ctx.fillStyle = "#ffffff30"; ctx.fillRect(0, 0, W, H); }
    // rooftop: stone pillars and fire-bowl braziers
    for (const x of [14, W - 34]) {
      ctx.fillStyle = "#3a2a2a"; ctx.fillRect(x, FLOOR - 120, 20, 120); ctx.fillStyle = "#4a3838"; ctx.fillRect(x + 2, FLOOR - 120, 4, 120); ctx.fillStyle = "#2a1a1a"; ctx.fillRect(x - 4, FLOOR - 126, 28, 8);
      ctx.fillStyle = "#606068"; ctx.fillRect(x - 2, FLOOR - 136, 24, 10);
      for (let i = 0; i < 6; i++) { const fh = 8 + Math.abs(Math.sin(f * 0.3 + i * 1.7)) * 14; ctx.fillStyle = i % 2 ? "#ffb020" : "#ff4010"; ctx.fillRect(x + i * 4, FLOOR - 136 - fh, 4, fh); }
    }
    // banners
    for (const [x, c] of [[70, K.p1.c], [W - 100, K.p2.c]]) { ctx.fillStyle = c.top === "#141414" || c.top === "#18181c" || c.top === "#202028" ? "#601020" : c.top; ctx.fillRect(x, 20, 30, 70); ctx.fillStyle = "#e0c060"; ctx.fillRect(x, 20, 30, 3); ctx.drawImage(c.sigSpr, x + 8, 40); }
    // stone floor
    ctx.fillStyle = "#2a2024"; ctx.fillRect(0, FLOOR, W, H - FLOOR); ctx.fillStyle = "#3a2e32"; for (let x = 0; x < W; x += 32) ctx.fillRect(x, FLOOR, 30, 2);
    ctx.fillStyle = "#1a1014"; for (let x = 16; x < W; x += 32) ctx.fillRect(x, FLOOR + 8, 1, 10);
  }
  function drawFighter(f) {
    if (f.gone && !(K.fatal === "fired" && f.y > -90)) return;
    const S = sprites(f.c), set = f.face > 0 ? S.r : S.l;
    let pose = "idle";
    if (f.st === "walk") pose = Math.floor(K.f / 8) % 2 ? "walk1" : "walk2";
    else if (f.st === "jump") pose = "jump";
    else if (f.st === "punch") pose = f.t >= 3 && f.t <= 11 ? "punch" : "idle";
    else if (f.st === "kick" || f.st === "jkick") pose = f.t >= 5 ? "kick" : "jump";
    else if (f.st === "special") pose = f.move === "uppercut" ? "punch" : "special";
    else if (f.st === "block" || f.blocking) pose = "block";
    else if (f.st === "hit" || f.st === "dizzy") pose = "hit";
    else if (f.st === "win") pose = "win";
    else if (f.st === "ko") pose = "ko";
    const img = set[pose], sc = SC * f.scale;
    // anchor: body centre is x 16 of the 34px sprite (18 when flipped), feet at row 27
    let x = f.x - (f.face > 0 ? 16 : 18) * sc, y = FLOOR - f.y - 27 * sc;
    if (pose === "ko") { x = f.x - 45; y = FLOOR - 75; }
    if (f.st === "dizzy") x += Math.sin(K.f * 0.15) * 4;
    if (f.inv > 0 && f.st !== "special" && Math.floor(f.inv / 3) % 2) return;
    ctx.save();
    if (K.fatal === "fired" && f === K.loser && K.pt > 64) { ctx.beginPath(); ctx.rect(0, 0, W, FLOOR); ctx.clip(); }
    ctx.globalAlpha = f.alpha;
    ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(img.width * sc), Math.round(img.height * sc));
    ctx.restore();
    if (f.shield > 0) { ctx.strokeStyle = `rgba(120,200,255,${0.5 + Math.sin(K.f * 0.3) * 0.3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, FLOOR - f.y - 42, 34, 46, 0, 0, 7); ctx.stroke(); }
    if (f.st === "dizzy") for (let i = 0; i < 3; i++) { const a = K.f * 0.1 + i * 2.1; ctx.fillStyle = "#ffe060"; ctx.fillRect(f.x + Math.cos(a) * 16 - 2, FLOOR - 96 + Math.sin(a) * 4, 4, 4); }
  }
  function drawHUD() {
    const bar = (x, f, right) => {
      ctx.fillStyle = "#000"; ctx.fillRect(x - 1, 7, 162, 12); ctx.fillStyle = "#a01010"; ctx.fillRect(x, 8, 160, 10);
      const w = Math.max(0, f.hp) / 100 * 160; ctx.fillStyle = f.hp > 30 ? "#30c040" : "#e0c020"; ctx.fillRect(right ? x + 160 - w : x, 8, w, 10);
      txt(surname(f.c), right ? x + 160 : x, 21, "#fff", 8, right ? "right" : "left");
      for (let i = 0; i < f.wins; i++) ctx.drawImage(SPR.coin[0], right ? x + 148 - i * 14 : x + i * 14, 31);
    };
    bar(10, K.p1, false); bar(W - 170, K.p2, true);
    txt(String(Math.max(0, Math.ceil(K.timer / 60))), W / 2, 6, "#ffe060", 16, "center");
    if (K.p1.cd <= 0) txt("SUPER", 10, 46, K.f % 20 < 10 ? "#80e0ff" : "#fff");
  }
  function big(s, y, col, size = 24) { txt(s, W / 2, y, col, size, "center"); }

  // ---------- screens ----------
  function kselect() {
    ctx.fillStyle = "#1a0004"; ctx.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { ctx.fillStyle = y % 8 ? "#260008" : "#140004"; ctx.fillRect(0, y, W, 2); }
    ctx.globalAlpha = 0.18; drawLogo(W / 2, H / 2, 210); ctx.globalAlpha = 1;
    txt("CEO KOMBAT", W / 2, 6, st % 20 < 10 ? "#ff3030" : "#ffe060", 16, "center");
    txt("CHOOSE YOUR FIGHTER", W / 2, 26, "#fff", 8, "center");
    if (pressed.left) { K.sel = (K.sel + 7) % 8; SFX.select(); }
    if (pressed.right) { K.sel = (K.sel + 1) % 8; SFX.select(); }
    if (pressed.up || pressed.down) { K.sel = (K.sel + 4) % 8; SFX.select(); }
    const gx = W / 2 - 104, gy = 40;
    let go = (pressed.start || pressed.jump) && st > 10;
    if (tap) for (let i = 0; i < 8; i++) { const x = gx + (i % 4) * 52, y = gy + Math.floor(i / 4) * 52; if (tap.x >= x && tap.x < x + 52 && tap.y >= y && tap.y < y + 52) { if (K.sel === i) go = true; else { K.sel = i; SFX.select(); } } }
    if (tap && tap.y > 150) go = true;
    for (let i = 0; i < 8; i++) {
      const x = gx + (i % 4) * 52, y = gy + Math.floor(i / 4) * 52;
      ctx.fillStyle = i === K.sel ? "#a01010" : "#300810"; ctx.fillRect(x + 2, y + 2, 48, 48); ctx.drawImage(CEOS[i].portrait, x + 8, y + 8);
      if (i === K.sel) { ctx.strokeStyle = st % 16 < 8 ? "#ffe060" : "#ff3030"; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, 48, 48); }
    }
    const c = CEOS[K.sel];
    txt(c.name, W / 2, 150, "#fff", 8, "center");
    txt(`SPECIAL: ${c.sp}`, W / 2, 162, "#80e0ff", 8, "center");
    txt("ARROWS MOVE  UP JUMP  BACK BLOCKS", W / 2, 180, "#c08080", 8, "center");
    txt("Z PUNCH  X KICK  C SPECIAL", W / 2, 191, "#c08080", 8, "center");
    txt(st % 40 < 26 ? "PRESS START" : "", W / 2, 206, "#ffe060", 8, "center");
    txt("ESC: QUIT", W - 4, 214, "#704050", 8, "right");
    if (go) {
      const others = CEOS.filter((_, i) => i !== K.sel).map(c => c.id).sort(() => Math.random() - 0.5);
      K.tower = others.slice(0, 3); K.idx = 0; SFX.fight(); setState("ktower");
    }
  }
  function ktower() {
    ctx.fillStyle = "#0a0004"; ctx.fillRect(0, 0, W, H);
    txt("CHOOSE YOUR DESTINY", W / 2, 8, "#ffe060", 16, "center");
    // the ladder: last fight at the top
    for (let i = 2; i >= 0; i--) {
      const y = 34 + (2 - i) * 54, c = CEOS.find(c => c.id === K.tower[i]), cur = i === K.idx, x = W / 2 - 24;
      ctx.fillStyle = cur ? (st % 20 < 10 ? "#c02020" : "#801010") : i < K.idx ? "#202020" : "#3a1010"; ctx.fillRect(x - 4, y - 4, 56, 52);
      ctx.drawImage(c.portrait, x + 6, y + 4, 36, 36); if (i < K.idx) { ctx.fillStyle = "#000a"; ctx.fillRect(x - 4, y - 4, 56, 52); txt("X", x + 24, y + 14, "#ff3030", 16, "center"); }
      txt(surname(c), x + 64, y + 18, cur ? "#fff" : "#a08080");
      txt(["ROUND ONE", "SEMI-FINAL", "FINAL"][i], x - 12, y + 18, "#806060", 8, "right");
    }
    txt(st % 40 < 26 ? "PRESS START" : "", W / 2, 206, "#fff", 8, "center");
    if (anyStart() && st > 30) { setState("kvs"); }
  }
  function kvs() {
    const me = CEOS[K.sel], foe = CEOS.find(c => c.id === K.tower[K.idx]), s = Math.min(1, st / 20);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#601010"; ctx.fillRect(0, 50, W / 2 * s, 110); ctx.fillStyle = "#103060"; ctx.fillRect(W - W / 2 * s, 50, W / 2 * s, 110);
    ctx.drawImage(me.portrait, 20 - (1 - s) * 160, 40, 120, 120);
    ctx.save(); ctx.translate(W - 20 + (1 - s) * 160, 40); ctx.scale(-1, 1); ctx.drawImage(foe.portrait, 0, 0, 120, 120); ctx.restore();
    txt(me.name, 80, 168, "#fff", 8, "center"); txt(foe.name, W - 80, 168, "#fff", 8, "center");
    if (st > 20) big("VS", 86, st % 8 < 4 ? "#ffe060" : "#ff3030", 24);
    if (st === 21) KS.boom();
    if (st > 120 || (st > 40 && anyStart())) { startMatch(); setState("kfight"); }
  }
  function kfight() {
    K.f++; K.pt++;
    const p1 = K.p1, p2 = K.p2;
    if (K.phase === "intro") {
      if (K.pt === 1) SFX.fight();
      if (K.pt === 70) KS.boom();
      if (K.pt > 100) K.phase = "fight";
    }
    if (K.phase === "fight" || K.phase === "finish") {
      const i1 = inputFor(p1), i2 = inputFor(p2);
      if (K.phase === "finish") {
        const w = K.winner, l = K.loser, inp = w === p1 ? i1 : i2;
        if (inp.sp && Math.abs(w.x - l.x) < 110) startFatal(w, l);
        else updateFighter(w, l, { ...inp, sp: false });
        if (K.phase === "finish" && K.pt > 330) { l.st = "ko"; K.phase = "won"; K.pt = 0; K.msg = `${surname(w.c)} WINS`; }
      } else {
        updateFighter(p1, p2, i1); updateFighter(p2, p1, i2); separate(); updateShots();
        if (--K.timer <= 0 && K.phase === "fight") { const w = p1.hp >= p2.hp ? p1 : p2; roundOver(w, w === p1 ? p2 : p1); }
      }
    } else if (K.phase === "fatal") { updateFatal(); if (K.pt > 200 && anyStart()) { K.phase = "won"; K.pt = 999; } if (K.pt > 420) { K.phase = "won"; K.pt = 999; } }
    else { p1.vx *= 0.8; p2.vx *= 0.8; p1.x += p1.vx; p2.x += p2.vx; for (const f of [p1, p2]) if (f.y > 0 || f.vy > 0) { f.y += f.vy; f.vy -= 0.42; if (f.y <= 0) { f.y = 0; f.vy = 0; } } }
    if (K.phase === "roundend" && K.pt === 40) K.winner.st = "win";
    if (K.phase === "roundend" && K.pt > 170) { K.round++; startRound(); }
    for (const q of K.parts) { q.x += q.vx; q.y += q.vy; q.vy += q.g ?? 0.15; q.life--; }
    K.parts = K.parts.filter(q => q.life > 0);

    // draw
    ctx.save();
    if (K.shake > 0) { ctx.translate((Math.random() - 0.5) * K.shake, (Math.random() - 0.5) * K.shake); K.shake *= 0.85; if (K.shake < 0.5) K.shake = 0; }
    drawArena();
    if (K.fatal === "fired" && K.pt > 60) { ctx.fillStyle = "#000"; ctx.fillRect(K.loser.x - 30, FLOOR, 60, 18); }
    if (K.phase === "fatal") { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.6, K.pt / 50)})`; ctx.fillRect(0, 0, W, H); }
    const order = K.phase === "fatal" ? [K.loser, K.winner] : [p2, p1];
    for (const f of order) drawFighter(f);
    for (const s of K.shots) { const y = FLOOR - s.y - s.h; ctx.fillStyle = s.col; ctx.fillRect(s.x - s.w / 2, y, s.w, s.h); ctx.fillStyle = "#fff"; ctx.fillRect(s.x - s.w / 2 + 2, y + 2, s.w - 4, s.h - 4); }
    for (const q of K.parts) {
      if (q.s) txt(q.s, q.x, q.y, q.col, 8, "center");
      else if (q.coin) ctx.drawImage(SPR.coin[Math.floor(q.life / 4) % 3], q.x - 6, q.y - 6);
      else if (q.slip) { ctx.fillStyle = "#ffb0c8"; ctx.fillRect(q.x, q.y, 10, 7); ctx.fillStyle = "#c06080"; ctx.fillRect(q.x + 2, q.y + 2, 6, 1); }
      else { ctx.fillStyle = q.col; ctx.fillRect(q.x, q.y, 3, 3); }
    }
    if (K.phase === "fatal" && K.fatal === "acquired") {
      const fx = K.fx;
      if (K.pt >= 20 && K.pt < 140) { ctx.save(); ctx.translate(K.loser.x, fx.stampY + 40); ctx.rotate(-0.15); ctx.strokeStyle = "#e01818"; ctx.lineWidth = 4; ctx.strokeRect(-70, -18, 140, 36); txt("ACQUIRED", 0, -8, "#e01818", 16, "center"); ctx.restore(); }
      if (K.loser.gone && K.pt < 150) { ctx.drawImage(SPR.brief, Math.round(fx.caseX - 5), Math.round(fx.caseY)); }
    }
    ctx.restore();
    drawHUD();

    // announcer
    if (K.phase === "intro") { if (K.pt < 70) big(`ROUND ${K.round}`, 80, "#ffe060"); else big("FIGHT!", 80, "#ff3030"); }
    if (K.phase === "roundend" && K.pt > 20) { big(`${surname(K.winner.c)} WINS`, 70, "#ffe060", 16); if (K.flawless) big("FLAWLESS VICTORY", 96, "#ff3030", 16); }
    if (K.phase === "finish") {
      big("FINISH THEM!", 70, K.pt % 20 < 10 ? "#ff3030" : "#ffe060");
      if (!K.winner.cpu) txt("GET CLOSE, PRESS SPECIAL", W / 2, 104, "#fff", 8, "center");
    }
    if (K.phase === "fatal" && K.pt > 160) {
      const w = surname(K.winner.c), l = surname(K.loser.c), co = K.winner.c.co.split(" / ")[0];
      big(K.fatal === "acquired" ? "BUYOUTALITY!" : "FIREDALITY!", 64, "#ff2020", 24);
      txt(K.fatal === "acquired" ? `${co} ACQUIRES ${l} FOR £1` : `${l} HAS BEEN LET GO`, W / 2, 98, "#fff", 8, "center");
      txt(`${w} WINS`, W / 2, 112, "#ffe060", 8, "center");
    }
    if (K.phase === "won") { if (K.pt < 999) { big(K.msg, 70, "#ffe060", 16); if (K.flawless) big("FLAWLESS VICTORY", 96, "#ff3030", 16); } }
    if (K.phase === "won" && (K.pt > 150 || K.pt >= 999)) {
      if (K.pt >= 999 || anyStart()) {
        if (K.winner === p1) { K.idx++; setState(K.idx >= 3 ? "kchamp" : "ktower"); }
        else setState("klose");
      }
      if (st % 40 < 26) txt("PRESS START", W / 2, 140, "#fff", 8, "center");
    }
  }
  function kchamp() {
    if (st === 1) { Music.play("title", 0, 144); SFX.clear(); }
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 30; i++) { ctx.drawImage(SPR.coin[i % 3], (i * 53 + st * (1 + i % 3)) % W, (i * 37 + st * 2) % H); }
    const c = CEOS[K.sel], S = sprites(c);
    ctx.drawImage(S.r.win, W / 2 - 51, 30, 102, 90);
    big("KOMBAT CHAMPION", 130, "#ffe060", 16);
    txt(`${c.name} HAS ACQUIRED EVERYONE`, W / 2, 156, "#fff", 8, "center");
    if (st > 90 && st % 40 < 26) txt("PRESS START", W / 2, 190, "#fff", 8, "center");
    if (st > 90 && anyStart()) { K.sel = CEOS.indexOf(c); Music.play("tense", -2, 118); setState("kselect"); }
  }
  function klose() {
    if (st === 1) { Music.stop(); SFX.gameover(); }
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.5; ctx.drawImage(CEOS[K.sel].portrait, W / 2 - 40, 20, 80, 80); ctx.globalAlpha = 1;
    big("YOU'VE BEEN", 110, "#ff3030", 16); big("ACQUIRED", 132, "#ff3030", 16);
    if (st > 60 && st % 40 < 26) txt("START: TRY AGAIN   ESC: QUIT", W / 2, 180, "#fff", 8, "center");
    if (st > 60 && anyStart()) { Music.play("tense", -2, 118); setState("kselect"); }
  }
  window.KOMBAT = { kselect, ktower, kvs, kfight, kchamp, klose, debug: () => K };
})();
