// Corporate Kombat: pick a CEO, fight through 5 floors of the corporate jungle.
// Everything is drawn in code at 384x224 and scaled up with hard pixels.
"use strict";

const W = 384, H = 224, T = 16, ROWS = 14;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
ctx.imageSmoothingEnabled = false;
const FONT = '"Press Start 2P", monospace';

// ---------- screen fit ----------
function fit() {
  const s = Math.max(1, Math.min(innerWidth / W, innerHeight / H));
  cv.style.width = Math.floor(W * s) + "px";
  cv.style.height = Math.floor(H * s) + "px";
  // the mute button sits in the empty gap of the bottom HUD strip
  const m = document.getElementById("mute"), r = cv.getBoundingClientRect();
  Object.assign(m.style, { left: r.left + 236 * s + "px", top: r.top + (H - 13) * s + "px", width: 30 * s + "px", height: 12 * s + "px", fontSize: 6 * s + "px" });
}
addEventListener("resize", fit);

// ---------- input ----------
const keys = { left: false, right: false, up: false, down: false, jump: false, special: false };
const pressed = {}; // edge-triggered this frame
const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  Space: "jump", KeyZ: "jump", KeyK: "jump", KeyX: "special", KeyJ: "special", ShiftLeft: "special", Enter: "start" };
addEventListener("keydown", e => {
  audioInit();
  if (e.code === "KeyM") return toggleMute();
  const k = KEYMAP[e.code]; if (!k) return;
  e.preventDefault(); if (!keys[k]) pressed[k] = true; keys[k] = true;
});
addEventListener("keyup", e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
document.querySelectorAll("#pad button").forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); audioInit(); if (!keys[k]) pressed[k] = true; keys[k] = true; b.classList.add("on"); };
  const off = e => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("pointerleave", off);
});
const muteBtn = document.getElementById("mute");
fit();
muteBtn.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); audioInit(); toggleMute(); });
let tap = null;
cv.addEventListener("pointerdown", e => {
  const r = cv.getBoundingClientRect();
  tap = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  audioInit();
});
const anyStart = () => pressed.start || pressed.jump || tap;

// ---------- sound ----------
let ac = null, master, musicBus, sfxBus, noiseBuf, muted = false;
try { muted = localStorage.getItem("ck_mute") === "1"; } catch {}
function audioInit() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === "suspended") ac.resume();
}
function toggleMute() {
  muted = !muted; if (master) master.gain.value = muted ? 0 : 1;
  muteBtn.textContent = muted ? "♪✕" : "♪";
  try { localStorage.setItem("ck_mute", muted ? "1" : "0"); } catch {}
}
muteBtn.textContent = muted ? "♪✕" : "♪";
const NOTE = m => 440 * Math.pow(2, (m - 69) / 12);
function tone(type, f1, t, dur, vol, bus, f2) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t, dur, vol, freq, bus, type = "highpass") {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function sfx(fn) { if (ac && ac.state === "running") fn(ac.currentTime); }
const beep = (f1, f2, dur, type = "square", vol = 0.08) => sfx(t => tone(type, f1, t, dur, vol, sfxBus, f2));
const SFX = {
  jump: () => beep(300, 620, 0.12, "square", 0.06),
  coin: () => sfx(t => { tone("square", 988, t, 0.06, 0.05, sfxBus); tone("square", 1319, t + 0.06, 0.14, 0.05, sfxBus); }),
  key: () => sfx(t => { noise(t, 0.08, 0.15, 3000, sfxBus); tone("square", 1568, t + 0.04, 0.1, 0.05, sfxBus); tone("triangle", 2093, t + 0.1, 0.35, 0.09, sfxBus); }), // ka-ching
  stomp: () => sfx(t => { noise(t, 0.12, 0.25, 900, sfxBus, "lowpass"); tone("square", 400, t, 0.12, 0.05, sfxBus, 90); }), // paper crunch
  hurt: () => beep(220, 60, 0.3, "sawtooth", 0.08),
  special: () => sfx(t => { tone("sawtooth", 150, t, 0.35, 0.07, sfxBus, 900); noise(t, 0.3, 0.08, 1500, sfxBus); }),
  block: () => sfx(t => { noise(t, 0.04, 0.2, 4000, sfxBus); tone("square", 220, t, 0.08, 0.06, sfxBus, 330); }),
  power: () => sfx(t => [523, 659, 784, 1047].forEach((f, i) => tone("square", f, t + i * 0.07, 0.1, 0.05, sfxBus))),
  die: () => beep(500, 50, 0.8, "triangle", 0.15),
  ding: () => sfx(t => { tone("sine", 1319, t, 0.6, 0.18, sfxBus); tone("sine", 1047, t + 0.35, 0.9, 0.18, sfxBus); }),
  clear: () => sfx(t => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone("square", f, t + i * 0.12, 0.15, 0.07, sfxBus))),
  select: () => beep(800, 800, 0.05, "square", 0.05),
  fight: () => sfx(t => { tone("sawtooth", 110, t, 0.6, 0.12, sfxBus, 40); noise(t, 0.4, 0.15, 400, sfxBus, "lowpass"); }),
  phone: () => sfx(t => { for (let i = 0; i < 6; i++) tone("square", i % 2 ? 1400 : 1800, t + i * 0.05, 0.05, 0.03, sfxBus); }),
  gameover: () => sfx(t => [392, 370, 349, 330].forEach((f, i) => tone("triangle", f, t + i * 0.35, 0.4 + (i === 3) * 0.8, 0.12, sfxBus))),
};

// ---------- music: original 8-bit lift-lounge bossa, and a boss track ----------
// A bar is [bassRoot, chord] or [root, chord, root2, chord2] for a change halfway.
const CH = { M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], d7: [0, 4, 7, 10], m6: [0, 3, 7, 9], m: [0, 3, 7], M: [0, 4, 7], hd: [0, 3, 6, 10] };
const _ = -1; // hold
const SONGS = {
  lift: {
    bpm: 104, style: "bossa",
    prog: [[41, "M7"], [43, "m7", 48, "d7"], [41, "M7"], [46, "M7", 46, "m6"], [45, "m7", 50, "d7"], [43, "m7", 48, "d7"], [41, "M7", 50, "d7"], [43, "m7", 48, "d7"]],
    mel: [69, _, _, 67, 69, _, 72, _, 70, _, 69, _, 67, _, 64, _, 65, _, _, _, 69, _, 72, _, 74, _, _, 72, 70, _, _, 0,
      72, _, 69, 72, _, 74, _, 72, 70, _, _, 67, _, 64, _, 62, 65, _, 69, _, 72, _, 66, _, 67, _, _, _, 0, 0, 0, 0],
  },
  muzak: { // second lift tune for the middle floors
    bpm: 112, style: "bossa",
    prog: [[48, "M7"], [45, "m7"], [50, "m7"], [43, "d7"], [52, "m7"], [45, "d7"], [50, "m7"], [43, "d7"]],
    mel: [76, _, 74, 72, _, 67, _, _, 69, _, 72, _, 76, _, _, 0, 77, _, 76, 74, _, 72, _, 69, 71, _, _, _, 67, _, _, 0,
      76, _, 79, _, 77, 76, _, 74, 73, _, _, 76, _, _, 69, _, 74, _, 72, _, 69, _, 65, _, 67, _, _, _, 71, _, 74, _],
  },
  tense: {
    bpm: 124, style: "drive",
    prog: [[50, "m"], [46, "M"], [48, "M"], [45, "d7"]],
    mel: [74, _, 77, _, 81, _, 79, 77, 77, _, 74, _, 70, _, 0, 0, 76, _, 72, _, 79, _, 76, 72, 73, _, 76, _, 79, _, 81, _],
  },
  boss: {
    bpm: 152, style: "drive",
    prog: [[45, "m"], [45, "m"], [41, "M"], [43, "M", 40, "d7"]],
    mel: [81, 0, 81, 0, 84, _, 81, 0, 79, _, 77, _, 76, _, 72, _, 77, 0, 77, 0, 81, _, 77, 0, 79, _, 76, _, 80, _, 83, _],
  },
};
const Music = {
  song: null, name: "", step: 0, t: 0, transpose: 0, bpm: 100, rate: 1,
  play(name, transpose = 0, bpm) {
    const key = name + transpose + (bpm || "");
    if (this.name === key) return;
    this.name = key; this.song = SONGS[name]; this.transpose = transpose; this.bpm = bpm || this.song.bpm; this.step = 0; this.t = 0;
  },
  stop() { this.song = null; this.name = ""; },
  tick() {
    if (!ac || !this.song || ac.state !== "running") return;
    if (this.t < ac.currentTime) this.t = ac.currentTime + 0.05;
    const eighth = 60 / (this.bpm * this.rate) / 2;
    while (this.t < ac.currentTime + 0.2) { this.at(this.step, this.t, eighth); this.t += eighth; this.step++; }
  },
  at(step, t, e) {
    const s = this.song, pos = step % 8, bar = s.prog[Math.floor(step / 8) % s.prog.length], tr = this.transpose;
    const half = pos >= 4 && bar.length > 2 ? 2 : 0, root = bar[half] + tr, chord = CH[bar[half + 1]];
    const B = musicBus;
    if (s.style === "bossa") {
      // bossa bass: root, fifth on the and-of-2, root, fifth on the and-of-4
      if (pos === 0 || pos === 4) tone("triangle", NOTE(root), t, e * 2.6, 0.22, B);
      if (pos === 3 || pos === 7) tone("triangle", NOTE(root + 7), t, e * 0.9, 0.18, B);
      // soft electric-piano comp on the off-beats
      if ([2, 5, 7].includes(pos) && !(pos === 7 && step % 16 < 8)) for (const n of chord) tone("triangle", NOTE(root + 12 + n), t, e * 1.4, 0.035, B);
      // brush and rim click
      noise(t, 0.03, pos % 2 ? 0.05 : 0.025, 7000, B);
      if (pos === 3 || pos === 6) tone("square", 1800, t, 0.015, 0.02, B);
    } else {
      tone("square", NOTE(root + (pos % 2 ? 12 : 0)), t, e * 0.8, 0.045, B);
      tone("triangle", NOTE(root), t, e * 0.9, 0.12, B);
      if (pos % 2 === 0) noise(t, 0.04, 0.06, 6000, B);
      if (pos === 0 || pos === 4) noise(t, 0.12, 0.25, 180, B, "lowpass");
      if (pos === 2 || pos === 6) noise(t, 0.08, 0.12, 2000, B, "bandpass");
      if (pos % 4 === 1) for (const n of chord) tone("square", NOTE(root + 24 + n), t, e * 0.5, 0.012, B);
    }
    const mel = s.mel, i = step % mel.length, m = mel[i];
    if (m > 0) {
      let len = 1; while (mel[(i + len) % mel.length] === _ && len < 8) len++;
      const lead = s.style === "bossa" ? "square" : "sawtooth";
      tone(lead, NOTE(m + tr), t, e * len * 0.92, s.style === "bossa" ? 0.035 : 0.03, B);
      if (s.style === "bossa") tone("sine", NOTE(m + tr + 12), t, e * len * 0.7, 0.012, B); // vibraphone shimmer
    }
  },
};
setInterval(() => Music.tick(), 40);

// ---------- pixel helpers ----------
function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function P(w, h, k = 1) {
  const c = mk(w * k, h * k), g = c.getContext("2d");
  return {
    c, g,
    r(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x * k, y * k, w * k, h * k); },
    e(cx, cy, rx, ry, col) { g.fillStyle = col; cx *= k; cy *= k; rx *= k; ry *= k; for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) g.fillRect(cx + x, cy + y, 1, 1); },
  };
}
function outline(c, col = "#0a0a14") {
  const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height), a = d.data, w = c.width, h = c.height, out = [];
  const A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && a[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!A(x, y) && (A(x - 1, y) || A(x + 1, y) || A(x, y - 1) || A(x, y + 1))) out.push([x, y]);
  g.fillStyle = col; for (const [x, y] of out) g.fillRect(x, y, 1, 1);
  return c;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.max(0, Math.round(r * f))); g = Math.min(255, Math.max(0, Math.round(g * f))); b = Math.min(255, Math.max(0, Math.round(b * f)));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function flip(c) { const o = mk(c.width, c.height), g = o.getContext("2d"); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return o; }
const hash = i => (((i * 2654435761) >>> 0) % 1000) / 1000;

function txt(s, x, y, col = "#fff", size = 8, align = "left") {
  ctx.font = `${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = "top";
  ctx.fillStyle = "#000"; ctx.fillText(s, x + 1, y + 1); ctx.fillText(s, x + 1, y); ctx.fillText(s, x, y + 1);
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
function money(v) {
  if (v >= 1e9) return "£" + (v / 1e9).toFixed(2) + "B";
  if (v >= 1e6) return "£" + (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return "£" + Math.round(v / 1e3) + "K";
  return "£" + v;
}

// ---------- the CEOs ----------
// Parody caricatures of public figures. Not endorsed by anyone named.
const CEOS = [
  { id: "musk", name: "ELON MUSK", co: "TESLA / SPACEX", skin: "#f0c8a0", hair: "short", hc: "#4a3020", top: "#202028", inner: "#202028", bottom: "#2a2a34",
    sp: "ROCKET BOOST", desc: ["Blast skyward,", "untouchable."], speed: 1.0, jump: 1.08, sig: "ROCKETS", sigc: "#e0e0f0" },
  { id: "zuck", name: "M. ZUCKERBERG", co: "META", skin: "#f2cfb0", hair: "curly", hc: "#6a4a30", top: "#8a8a92", inner: "#8a8a92", bottom: "#30384a",
    sp: "PHASE SHIFT", desc: ["Go virtual,", "walk through foes."], speed: 1.06, jump: 1.0, sig: "HEADSETS", sigc: "#404050" },
  { id: "bezos", name: "JEFF BEZOS", co: "AMAZON", skin: "#ecc09a", hair: "bald", hc: "#8a7060", top: "#20304a", inner: "#9cc0e8", bottom: "#3a3a40",
    sp: "NEXT-DAY DASH", desc: ["Charge forward,", "flatten rivals."], speed: 1.1, jump: 0.96, sig: "PARCELS", sigc: "#c89050" },
  { id: "cook", name: "TIM COOK", co: "APPLE", skin: "#eec4a0", hair: "short", hc: "#c8c8cc", glasses: "#9a9aa8", top: "#18181c", inner: "#18181c", bottom: "#30303a",
    sp: "PRIVACY SHIELD", desc: ["Block every hit", "for a while."], speed: 1.0, jump: 1.0, sig: "PHONES", sigc: "#c8d0d8" },
  { id: "huang", name: "JENSEN HUANG", co: "NVIDIA", skin: "#e4b890", hair: "swept", hc: "#1a1a1a", top: "#141414", inner: "#141414", bottom: "#202020", leather: true,
    sp: "GPU BLAST", desc: ["Fire a beam that", "cuts through all."], speed: 0.97, jump: 1.0, sig: "GPUS", sigc: "#76b900" },
  { id: "su", name: "LISA SU", co: "AMD", skin: "#e8bc96", hair: "bob", hc: "#141010", top: "#c01818", inner: "#1a1a1a", bottom: "#202028",
    sp: "CHIP SHOT", desc: ["Throw three chips", "in a spread."], speed: 1.02, jump: 1.03, sig: "CHIPS", sigc: "#d02020" },
  { id: "dyson", name: "JAMES DYSON", co: "DYSON", skin: "#f0c8a8", hair: "swept", hc: "#f0f0f0", glasses: "#303040", top: "#283a6a", inner: "#e8e8f0", bottom: "#30304a",
    sp: "CYCLONE", desc: ["Suck in loot,", "spin foes away."], speed: 0.97, jump: 1.0, sig: "CYCLONES", sigc: "#a040c0" },
  { id: "barra", name: "MARY BARRA", co: "GENERAL MOTORS", skin: "#f2cdb0", hair: "bob", hc: "#c8a060", top: "#1c2a50", inner: "#e8e8f0", bottom: "#1c2a50",
    sp: "EV SHOCKWAVE", desc: ["Shock every foe", "on the screen."], speed: 1.0, jump: 1.02, sig: "BATTERIES", sigc: "#30c060" },
];

// Each CEO's own rivals. Slots: walker (floor 1+), flyer (2+), hopper (3+), tank and thrower (4+), boss (floor 5).
// [name, look, colour, accent]
const RIVALS = {
  musk:  { walker: ["RECALL NOTICE", "paper", "#f4f0e0", "#d02020"], flyer: ["ROGUE POST", "bubble", "#3a8ee8", "#fff"], hopper: ["SHORT SELLER", "suit", "#505060", "#d02020"],
           tank: ["BEAR MARKET", "bear", "#7a4a28"], thrower: ["REGULATOR", "suit", "#1c2a50", "#e0e0e0"], boss: ["THE BIG SHORT", "bear", "#5a3418"] },
  zuck:  { walker: ["DATA BREACH", "paper", "#20242c", "#40ff60"], flyer: ["FAKE NEWS", "bubble", "#d0d0d8", "#d02020"], hopper: ["COPYCAT FOUNDER", "suit", "#3a7a4a", "#fff"],
           tank: ["ANTITRUST BOT", "bot", "#8a8a98"], thrower: ["SUBPOENA SERVER", "suit", "#2a2a30", "#e0e0e0"], boss: ["ANTITRUST MEGABOT", "bot", "#6a6a80"] },
  bezos: { walker: ["RETURNED PARCEL", "box", "#b88048", "#3060c0"], flyer: ["ROGUE DRONE", "drone", "#e0e0e8", "#ff3030"], hopper: ["PRICE CUTTER", "suit", "#a03030", "#ffe060"],
           tank: ["WAREHOUSE BOT", "bot", "#e08020"], thrower: ["TAX INSPECTOR", "suit", "#3a3a3a", "#c0c0c0"], boss: ["PEAK SEASON MEGABOT", "bot", "#d06010"] },
  cook:  { walker: ["SUPPLY DELAY", "paper", "#f0e0a0", "#e08000"], flyer: ["SPAM CALL", "bubble", "#30b050", "#fff"], hopper: ["KNOCKOFF DEALER", "suit", "#c0a060", "#202020"],
           tank: ["PATENT TROLL", "troll", "#4a8a40"], thrower: ["REGULATOR", "suit", "#1c2a50", "#ffd040"], boss: ["THE TROLL KING", "troll", "#3a7030"] },
  huang: { walker: ["CHIP SHORTAGE", "paper", "#e8e8e0", "#76b900"], flyer: ["OVERHEAT", "flame", "#ff7020", "#ffe060"], hopper: ["CRYPTO BRO", "suit", "#e0b020", "#202020"],
           tank: ["RIVAL AI BOT", "bot", "#4060c0"], thrower: ["EXPORT OFFICER", "suit", "#3a4a3a", "#d02020"], boss: ["THE AI WINTER", "bot", "#80c0f0"] },
  su:    { walker: ["BUG REPORT", "paper", "#f0f0f0", "#20a040"], flyer: ["POWER SPIKE", "flame", "#ffe040", "#fff"], hopper: ["HEADHUNTER", "suit", "#304060", "#c0c0c0"],
           tank: ["BENCHMARK BULL", "bull", "#8a3020"], thrower: ["DOOM ANALYST", "suit", "#4a4a50", "#d02020"], boss: ["SILICON GOLIATH", "bot", "#4a5a7a"] },
  dyson: { walker: ["DUST BUNNY", "fluff", "#a0a0a8", "#606068"], flyer: ["DUST CLOUD", "bubble", "#8a8070", "#4a4030"], hopper: ["KNOCKOFF MAKER", "suit", "#a06030", "#fff"],
           tank: ["BLOCKED FILTER", "bot", "#7a6a5a"], thrower: ["PATENT LAWYER", "suit", "#202838", "#e0e0e0"], boss: ["MEGA DUST BUNNY", "bunny", "#9a9aa4"] },
  barra: { walker: ["RECALL NOTICE", "paper", "#f4f0e0", "#d02020"], flyer: ["RANGE ANXIETY", "bubble", "#e04040", "#fff"], hopper: ["CAR SALESMAN", "suit", "#8a6a2a", "#d02020"],
           tank: ["GAS GUZZLER", "bot", "#303034"], thrower: ["EMISSIONS INSPECTOR", "suit", "#2a4a2a", "#e0e0e0"], boss: ["KING GAS GUZZLER", "bull", "#2a2a2e"] },
};

function drawHairSmall(s, c) {
  const h = c.hc;
  if (c.hair === "short") { s.r(6, 2, 7, 2, h); s.r(6, 4, 1, 2, h); }
  else if (c.hair === "curly") { s.r(5, 1, 8, 3, h); s.r(5, 4, 2, 2, h); s.r(6, 1, 1, 1, shade(h, 1.4)); s.r(9, 2, 1, 1, shade(h, 1.4)); }
  else if (c.hair === "bald") { s.r(7, 3, 2, 1, shade(c.skin, 1.15)); s.r(6, 5, 1, 2, h); }
  else if (c.hair === "swept") { s.r(6, 1, 7, 3, h); s.r(5, 2, 2, 4, h); s.r(11, 1, 3, 2, h); }
  else if (c.hair === "bob") { s.r(5, 1, 8, 3, h); s.r(5, 4, 2, 6, h); s.r(4, 5, 1, 4, h); }
}

// 18x26 body sprite, facing right. frame 0 stand, 1/2 run, 3 jump
function personSprite(c, frame) {
  const s = P(18, 26), skin = c.skin, top = c.top, legs = c.bottom, shoe = "#151515";
  if (frame === 0) { s.r(6, 17, 2, 6, legs); s.r(10, 17, 2, 6, legs); s.r(5, 23, 3, 1, shoe); s.r(10, 23, 3, 1, shoe); }
  if (frame === 1) { s.r(6, 17, 2, 3, legs); s.r(4, 19, 2, 4, legs); s.r(3, 23, 3, 1, shoe); s.r(10, 17, 2, 3, legs); s.r(12, 19, 2, 3, legs); s.r(12, 22, 3, 1, shoe); }
  if (frame === 2) { s.r(7, 17, 2, 6, legs); s.r(9, 17, 2, 6, legs); s.r(7, 23, 4, 1, shoe); }
  if (frame === 3) { s.r(5, 17, 3, 3, legs); s.r(4, 20, 3, 2, legs); s.r(3, 22, 3, 1, shoe); s.r(10, 17, 3, 4, legs); s.r(11, 21, 3, 1, shoe); }
  s.r(5, 10, 8, 8, top); s.r(11, 10, 2, 8, shade(top, 0.75)); s.r(8, 10, 2, 3, c.inner);
  if (c.tie) s.r(8, 11, 2, 5, c.tie);
  if (c.leather) s.r(6, 11, 1, 5, "#505058");
  if (frame === 3) { s.r(3, 7, 2, 5, top); s.r(3, 6, 2, 1, skin); s.r(13, 7, 2, 5, top); s.r(13, 6, 2, 1, skin); }
  else if (frame === 1) { s.r(3, 11, 2, 4, top); s.r(2, 15, 2, 1, skin); s.r(13, 11, 2, 4, top); s.r(14, 15, 2, 1, skin); }
  else { s.r(4, 11, 2, 5, top); s.r(4, 16, 2, 1, skin); s.r(12, 11, 2, 5, top); s.r(12, 16, 2, 1, skin); }
  if (c.case) { s.r(12, 15, 5, 4, "#4a2a10"); s.r(13, 14, 3, 1, "#2a1808"); }
  s.r(8, 9, 3, 1, shade(skin, 0.85));
  s.r(6, 2, 7, 7, skin); s.r(12, 3, 1, 6, shade(skin, 0.85));
  s.r(9, 5, 1, 1, "#111"); s.r(11, 5, 1, 1, "#111"); s.r(10, 7, 2, 1, "#a05050");
  if (c.glasses) { s.r(8, 4, 5, 1, c.glasses); s.r(8, 5, 1, 1, c.glasses); s.r(12, 5, 1, 1, c.glasses); }
  if (c.shades) s.r(8, 4, 5, 2, "#000");
  drawHairSmall(s, c);
  return outline(s.c);
}

// 36x36 select-screen portrait, facing the viewer
function portrait(c) {
  const s = P(36, 36), skin = c.skin, sd = shade(skin, 0.82), h = c.hc;
  s.e(18, 34, 16, 7, c.top); s.r(2, 29, 32, 7, c.top);
  s.r(15, 27, 6, 7, c.inner); if (c.leather) { s.r(9, 29, 2, 6, "#55555e"); s.r(25, 29, 2, 6, "#55555e"); }
  if (c.id === "bezos") { s.r(6, 29, 6, 7, "#20304a"); s.r(24, 29, 6, 7, "#20304a"); s.r(12, 28, 12, 8, c.inner); }
  if (c.id === "barra" || c.id === "dyson") { s.r(16, 27, 4, 7, c.inner); s.r(17, 28, 2, 7, c.id === "barra" ? "#c0c0c8" : "#3050a0"); }
  s.r(14, 22, 8, 7, sd);
  s.e(18, 15, 8, 10, skin);
  for (let y = 6; y <= 25; y++) for (let x = 22; x <= 26; x++) { const dx = x - 18, dy = y - 15; if (dx * dx / 64.5 + dy * dy / 100.5 <= 1) s.r(x, y, 1, 1, sd); }
  s.r(9, 14, 2, 4, skin); s.r(26, 14, 2, 4, sd);
  s.r(13, 14, 3, 2, "#fff"); s.r(20, 14, 3, 2, "#fff"); s.r(14, 14, 1, 2, "#221"); s.r(21, 14, 1, 2, "#221");
  const brow = c.hair === "bald" ? "#7a6050" : shade(h, h === "#f0f0f0" || h === "#c8c8cc" ? 0.8 : 1);
  s.r(12, 12, 4, 1, brow); s.r(20, 12, 4, 1, brow);
  s.r(17, 16, 2, 3, sd); s.r(17, 19, 3, 1, shade(skin, 0.7));
  if (c.id === "bezos" || c.id === "musk") { s.r(15, 22, 7, 1, "#8b3a3a"); s.r(16, 23, 5, 1, "#fff"); }
  else s.r(15, 22, 6, 1, "#8b3a3a");
  if (c.glasses) { const g = c.glasses; for (const x0 of [12, 19]) { s.r(x0, 13, 5, 1, g); s.r(x0, 16, 5, 1, g); s.r(x0, 13, 1, 4, g); s.r(x0 + 4, 13, 1, 4, g); } s.r(17, 14, 2, 1, g); }
  if (c.hair === "short") { s.e(18, 7, 9, 4, h); s.r(9, 7, 3, 6, h); s.r(24, 7, 3, 5, h); s.r(12, 5, 6, 1, shade(h, 1.3)); }
  if (c.hair === "curly") { s.e(18, 7, 10, 5, h); s.r(8, 7, 3, 6, h); s.r(25, 7, 3, 6, h); for (const [x, y] of [[11, 4], [15, 3], [20, 4], [24, 6], [13, 8], [18, 7], [22, 8]]) s.r(x, y, 2, 1, shade(h, 1.4)); }
  if (c.hair === "bald") { s.r(9, 11, 2, 5, h); s.r(26, 11, 2, 5, h); s.r(13, 6, 4, 1, shade(skin, 1.15)); s.r(12, 7, 2, 1, shade(skin, 1.15)); }
  if (c.hair === "swept") { s.e(18, 6, 10, 5, h); s.r(8, 6, 4, 9, h); s.r(24, 5, 4, 7, h); s.r(10, 4, 14, 2, shade(h, h === "#f0f0f0" ? 0.85 : 1.6)); }
  if (c.hair === "bob") { s.e(18, 7, 11, 6, h); s.r(6, 7, 5, 18, h); s.r(25, 7, 5, 18, h); s.r(10, 7, 9, 4, h); s.r(8, 5, 6, 1, shade(h, 1.3)); }
  return outline(s.c);
}

// ---------- rival sprites ----------
function walkerSprite(look, col, acc, f) {
  const s = P(18, 18);
  if (look === "box") {
    s.r(2, 3, 14, 11, col); s.r(2, 3, 14, 2, shade(col, 0.8)); s.r(8, 3, 2, 11, acc); s.r(11, 9, 4, 3, "#fff");
    s.r(4, 6, 2, 2, "#000"); s.r(11, 6, 2, 2, "#000"); s.r(3, 5, 3, 1, "#000"); s.r(11, 5, 3, 1, "#000");
  } else if (look === "fluff") {
    s.e(9, 9, 7, 5, col); for (const [x, y] of [[3, 5], [7, 3], [12, 4], [15, 8], [2, 10]]) s.r(x, y, 2, 2, shade(col, 1.2));
    s.r(5, 7, 2, 2, "#fff"); s.r(11, 7, 2, 2, "#fff"); s.r(6, 8, 1, 1, "#000"); s.r(12, 8, 1, 1, "#000"); s.r(6, 1, 2, 4, col); s.r(11, 1, 2, 4, col);
  } else {
    const dark = col === "#20242c", eye = dark ? "#40ff60" : "#000";
    s.r(3, 1, 12, 14, col); s.r(12, 1, 3, 3, shade(col, 0.75));
    for (let y = 9; y < 14; y += 2) s.r(5, y, 8, 1, shade(col, dark ? 1.8 : 0.7));
    s.r(5, 4, 2, 2, eye); s.r(10, 4, 2, 2, eye); s.r(4, 3, 3, 1, "#000"); s.r(10, 3, 3, 1, "#000");
    s.r(5, 10, 8, 3, acc); s.r(6, 11, 6, 1, shade(acc, 1.4));
  }
  s.r(f ? 3 : 5, 15, 3, 2, "#202020"); s.r(f ? 12 : 10, 15, 3, 2, "#202020");
  return outline(s.c);
}
function flyerSprite(look, col, acc, f) {
  const s = P(20, 16);
  if (look === "drone") {
    s.r(6, 7, 8, 5, col); s.r(8, 9, 4, 2, "#202020"); s.r(9, 9, 2, 1, acc); s.r(2, 5, 16, 1, "#606068");
    s.r(f ? 0 : 2, 3, f ? 6 : 2, 1, "#a0a0a8"); s.r(f ? 14 : 16, 3, f ? 6 : 2, 1, "#a0a0a8"); s.r(3, 4, 1, 1, "#404048"); s.r(16, 4, 1, 1, "#404048");
    s.r(7, 12, 1, 2, "#404048"); s.r(12, 12, 1, 2, "#404048");
  } else if (look === "flame") {
    const y0 = f ? 1 : 2; s.e(10, 9, 6, 6, col); s.r(8, y0, 4, 4, col); s.r(5, y0 + 2, 2, 3, col); s.r(13, y0 + 1, 2, 3, col); s.e(10, 10, 3, 3, acc);
    s.r(7, 8, 2, 2, "#000"); s.r(12, 8, 2, 2, "#000");
  } else {
    s.r(3, 2, 14, 9, col); s.r(2, 3, 16, 7, col); s.r(4, 11, 3, 2, col); s.r(3, 13, 2, 1, col);
    s.r(9, 3, 2, 5, acc); s.r(9, 9, 2, 1, acc); s.r(5, 5, 2, 2, "#000"); s.r(13, 5, 2, 2, "#000");
    if (f) { s.r(0, 0, 3, 2, "#fff"); s.r(17, 0, 3, 2, "#fff"); } else { s.r(0, 6, 2, 3, "#fff"); s.r(18, 6, 2, 3, "#fff"); }
  }
  return outline(s.c);
}
// faces right; k=2 for the boss
function beastSprite(look, col, f, k, angry) {
  const s = P(28, 24, k), d = shade(col, 0.7), eye = angry ? "#ff2020" : "#000";
  if (look === "bot") {
    s.r(4, 7, 18, 11, col); s.r(4, 7, 18, 2, shade(col, 1.25)); s.r(14, 1, 11, 8, col); s.r(16, 3, 7, 3, "#101018"); s.r(f ? 17 : 20, 4, 2, 1, angry ? "#ff2020" : "#40ff60");
    s.r(19, 0, 1, 1, "#ff3030"); s.r(7, 10, 6, 5, d); s.r(8, 11, 1, 1, "#ffe060"); s.r(10, 13, 2, 1, "#40c0ff");
    s.r(5, 18, 6, 4, "#202020"); s.r(15, 18, 6, 4, "#202020"); s.r(6 + f, 19, 1, 1, "#808080"); s.r(17 - f, 19, 1, 1, "#808080");
    if (angry) { s.r(1, 9, 3, 2, d); s.r(22, 10, 5, 2, d); }
  } else {
    s.e(13, 13, 10, 7, col); s.e(20, 8, 5, 5, col);
    if (look === "bear") { s.r(16, 2, 3, 3, col); s.r(22, 2, 3, 3, col); s.r(23, 9, 4, 2, d); }
    if (look === "bull") { s.r(13, 2, 4, 1, "#e8e0c0"); s.r(13, 0, 1, 2, "#e8e0c0"); s.r(23, 2, 4, 1, "#e8e0c0"); s.r(26, 0, 1, 2, "#e8e0c0"); s.r(23, 9, 4, 3, shade(col, 1.3)); s.r(24, 10, 1, 1, "#000"); }
    if (look === "troll") { s.r(17, 2, 2, 2, "#c0b080"); s.r(22, 2, 2, 2, "#c0b080"); s.e(25, 9, 2, 2, shade(col, 1.2)); s.r(19, 12, 5, 1, "#fff"); }
    if (look === "bunny") { s.r(16, 0, 2, 5, col); s.r(21, 0, 2, 5, col); s.r(16, 1, 1, 3, "#e0a0b0"); s.r(21, 1, 1, 3, "#e0a0b0"); s.r(24, 9, 2, 2, "#e08090"); for (const [x, y] of [[6, 8], [10, 7], [4, 13], [8, 17]]) s.r(x, y, 2, 2, shade(col, 1.2)); }
    s.r(21, 6, 1, 1, eye); s.r(23, 6, 1, 1, eye);
    if (angry) { s.r(20, 5, 2, 1, "#000"); s.r(23, 5, 2, 1, "#000"); s.r(12, 9, 2, 7, "#c01818"); s.r(11, 8, 4, 1, "#e8e8f0"); }
    else { s.r(10, 10, 3, 5, "#e02020"); s.r(9, 13, 5, 1, "#e02020"); s.r(10, 14, 3, 1, "#e02020"); s.r(11, 15, 1, 1, "#e02020"); }
    s.r(f ? 4 : 6, 18, 4, 4, d); s.r(f ? 17 : 15, 18, 4, 4, d);
  }
  return outline(s.c);
}
function suitFor(col, acc, thrower) {
  return { skin: thrower ? "#e8c0a0" : "#d8b090", hair: "short", hc: thrower ? "#605040" : "#202020", top: col, inner: "#e0e0e0", tie: acc, bottom: shade(col, 0.7), shades: !thrower, case: thrower };
}

const SPR = {};
let RIV = null;
function buildRivals(c) {
  const R = RIVALS[c.id]; RIV = R;
  const [, wl, wc, wa] = R.walker, [, fl, fc, fa] = R.flyer;
  SPR.walker = [0, 1].map(f => walkerSprite(wl, wc, wa, f));
  SPR.flyer = [0, 1].map(f => flyerSprite(fl, fc, fa, f));
  SPR.hopper = [1, 2].map(f => flip(personSprite(suitFor(R.hopper[2], R.hopper[3]), f)));
  SPR.tank = [0, 1].map(f => beastSprite(R.tank[1], R.tank[2], f, 1, false));
  SPR.thrower = [flip(personSprite(suitFor(R.thrower[2], R.thrower[3], true), 0))];
  SPR.boss = [0, 1].map(f => beastSprite(R.boss[1], R.boss[2], f, 2, true));
}

function build() {
  for (const c of CEOS) {
    c.frames = [0, 1, 2, 3].map(f => personSprite(c, f)); c.framesL = c.frames.map(flip); c.portrait = portrait(c); c.sigSpr = sigSprite(c);
  }
  SPR.paper = (() => { const s = P(10, 10); s.r(1, 1, 8, 8, "#f4f4ec"); s.r(2, 3, 6, 1, "#a0a0a0"); s.r(2, 5, 6, 1, "#a0a0a0"); s.r(5, 6, 3, 2, "#d02020"); return outline(s.c); })();
  SPR.coin = [0, 1, 2].map(f => { const s = P(12, 12); const w = [5, 3, 1][f]; s.e(6, 6, w, 5, "#f0c020"); if (w > 2) { s.e(6, 6, w - 2, 3, "#ffe060"); s.r(5, 4, 2, 5, "#c08010"); s.r(4, 6, 4, 1, "#c08010"); s.r(4, 8, 4, 1, "#c08010"); } return outline(s.c); });
  SPR.keys = [
    (() => { const s = P(12, 14); s.e(6, 5, 4, 4, "#fff060"); s.r(5, 3, 1, 1, "#fff"); s.r(4, 9, 4, 3, "#a0a0a8"); s.r(4, 10, 4, 1, "#707078"); return outline(s.c); })(),
    (() => { const s = P(12, 14); s.e(6, 3, 2, 2, "#f0c8a0"); s.r(3, 6, 6, 6, "#30a050"); s.r(5, 6, 2, 3, "#fff"); return outline(s.c); })(),
    (() => { const s = P(14, 14); s.r(1, 2, 12, 10, "#c08848"); s.r(1, 2, 12, 2, "#a06830"); s.r(6, 2, 2, 10, "#e0d080"); return outline(s.c); })(),
    (() => { const s = P(14, 14); s.r(1, 4, 12, 8, "#e0b020"); s.r(5, 1, 4, 3, "#a07010"); s.r(6, 2, 2, 1, "#000"); s.r(1, 7, 12, 1, "#a07010"); s.r(6, 6, 2, 3, "#fff"); return outline(s.c); })(),
    (() => { const s = P(14, 14); s.e(7, 7, 5, 5, "#2878e0"); s.r(4, 4, 3, 3, "#30c050"); s.r(8, 8, 3, 3, "#30c050"); s.r(8, 3, 2, 1, "#30c050"); s.r(5, 4, 1, 1, "#fff"); return outline(s.c); })(),
  ];
  SPR.power = {
    coffee: (() => { const s = P(12, 14); s.r(2, 3, 8, 9, "#f0f0f0"); s.r(2, 6, 8, 3, "#6a3a18"); s.r(1, 1, 10, 2, "#202020"); return outline(s.c); })(),
    heart: (() => { const s = P(12, 12); s.e(4, 4, 3, 3, "#ff3050"); s.e(8, 4, 3, 3, "#ff3050"); for (let i = 0; i < 5; i++) s.r(1 + i, 5 + i, 10 - 2 * i, 1, "#ff3050"); s.r(3, 3, 1, 1, "#fff"); return outline(s.c); })(),
    life: (() => { const s = P(14, 14); s.e(7, 5, 6, 4, "#f0c020"); s.r(1, 5, 12, 1, "#c08010"); for (const x of [2, 7, 11]) s.r(x, 6, 1, 4, "#c0c0c0"); s.r(5, 10, 4, 3, "#40a0e0"); return outline(s.c); })(),
  };
}
function sigSprite(c) {
  const s = P(14, 14), k = c.sigc;
  if (c.id === "musk") { s.r(5, 1, 4, 9, k); s.r(6, 0, 2, 1, k); s.r(3, 7, 2, 4, "#d02020"); s.r(9, 7, 2, 4, "#d02020"); s.r(6, 3, 2, 2, "#40a0ff"); s.r(5, 11, 4, 2, "#ff9020"); }
  else if (c.id === "zuck") { s.r(1, 4, 12, 6, k); s.r(2, 5, 10, 3, "#3080ff"); s.r(0, 5, 1, 3, "#202028"); s.r(13, 5, 1, 3, "#202028"); }
  else if (c.id === "bezos") { s.r(1, 3, 12, 9, k); s.r(1, 3, 12, 2, shade(k, 0.8)); s.r(3, 8, 8, 1, "#202020"); s.r(9, 7, 2, 1, "#202020"); }
  else if (c.id === "cook") { s.r(3, 0, 8, 14, "#1a1a1e"); s.r(4, 2, 6, 9, "#80c0ff"); s.r(6, 12, 2, 1, "#606068"); }
  else if (c.id === "huang") { s.r(0, 3, 14, 8, "#202020"); s.r(1, 4, 12, 6, k); s.e(4, 7, 2, 2, "#303030"); s.e(10, 7, 2, 2, "#303030"); s.r(2, 11, 6, 2, "#e0c040"); }
  else if (c.id === "su") { s.r(3, 3, 8, 8, "#303030"); s.r(4, 4, 6, 6, k); for (let i = 0; i < 4; i++) { s.r(4 + i * 2, 1, 1, 2, "#c0c0c0"); s.r(4 + i * 2, 11, 1, 2, "#c0c0c0"); s.r(1, 4 + i * 2, 2, 1, "#c0c0c0"); s.r(11, 4 + i * 2, 2, 1, "#c0c0c0"); } }
  else if (c.id === "dyson") { s.e(7, 7, 6, 6, k); s.e(7, 7, 4, 4, "#e0a0f0"); s.e(7, 7, 2, 2, k); s.r(7, 1, 4, 2, "#fff"); }
  else { s.r(2, 3, 10, 9, k); s.r(5, 1, 4, 2, "#a0a0a0"); s.r(6, 5, 2, 5, "#fff"); s.r(5, 6, 4, 1, "#fff"); }
  return outline(s.c);
}

// ---------- floors of the corporate jungle ----------
const LEVELS = [
  { name: "START-UP LOFT", round: "SEED ROUND", key: "BIG IDEAS", time: 200, win: "SEED ROUND CLOSED!",
    wall: "#7a4034", wall2: "#62302a", pattern: "brick", sky: ["#f08848", "#ffc080"], night: false, carpet: "#a87040", ground: "#3e2e28", plat: "desk",
    furn: ["whiteboard", "beanbag", "plant", "desk", "plant", "arcade"], furnCol: "#4a2420", ceil: "#2a2422", vine: "#3a9a40", song: ["lift", 0, 100] },
  { name: "OPEN-PLAN OFFICE", round: "SERIES A", key: "NEW HIRES", time: 200, win: "SERIES A RAISED!",
    wall: "#cfc6ac", wall2: "#bab296", pattern: "panel", sky: ["#4a90d8", "#a8d8f0"], night: false, carpet: "#4a5a7a", ground: "#2e2e38", plat: "cabinet",
    furn: ["cubicle", "plant", "cooler", "cubicle", "printer", "clock"], furnCol: "#a29a80", ceil: "#e8e6dc", vine: "#40a048", song: ["muzak", 0, 108] },
  { name: "THE WAREHOUSE", round: "SCALE-UP", key: "PRODUCTS", time: 220, win: "WAREHOUSE AT FULL TILT!",
    wall: "#5a6068", wall2: "#4c525a", pattern: "corrugated", sky: ["#8a8478", "#c0b0a0"], night: false, carpet: "#c8a028", ground: "#38383c", plat: "crate",
    furn: ["rack", "boxes", "rack", "forklift", "conveyor"], furnCol: "#3a4048", ceil: "#2a2e32", vine: "#4a8a3a", song: ["muzak", -2, 116] },
  { name: "THE TRADING FLOOR", round: "THE IPO", key: "INVESTORS", time: 220, win: "IPO! THE BELL RINGS!",
    wall: "#161c34", wall2: "#1c2442", pattern: "grid", sky: ["#050818", "#1a2050"], night: true, carpet: "#5a1a2a", ground: "#1a1a22", plat: "desk",
    furn: ["screens", "desk", "screens", "cooler", "plant"], furnCol: "#0c1020", ceil: "#0a0c18", vine: "#2a7a3a", song: ["lift", 3, 122] },
  { name: "THE BOARDROOM", round: "HOSTILE TAKEOVER", key: "CUSTOMERS", time: 260, win: "TAKEOVER DEFEATED!",
    wall: "#4a2418", wall2: "#3c1c12", pattern: "wood", sky: ["#200810", "#802020"], night: true, carpet: "#8a1a1a", ground: "#22140e", plat: "desk",
    furn: ["painting", "chair", "plant", "globe", "chair", "clock"], furnCol: "#2a120a", ceil: "#1a0c08", vine: "#2a6a30", song: ["tense", 0, 124] },
];

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

// Tile codes: 0 air, 1 floor, 2 furniture platform, 3 deal block, 4 used block, 5 drawing pins
function genLevel(n) {
  const R = rng(7919 + n * 104729), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const cols = 170 + n * 30, map = new Uint8Array(cols * ROWS);
  const set = (x, y, v) => { if (x >= 0 && x < cols && y >= 0 && y < ROWS) map[y * cols + x] = v; };
  const items = [], enemies = [], sigSpots = [];
  let x = 0, surf = 11;
  const ground = (x0, len, s) => { for (let i = x0; i < x0 + len; i++) for (let y = s; y < ROWS; y++) set(i, y, 1); };
  const coinRow = (x0, len, y) => { for (let i = 0; i < len; i++) items.push({ t: "coin", x: (x0 + i) * T + 2, y: y * T + 2 }); };
  const key = (tx, ty) => items.push({ t: "key", x: tx * T + 1, y: ty * T + 1 });
  const enemyFor = () => { const pool = ["walker"]; if (n >= 1) pool.push("flyer", "walker"); if (n >= 2) pool.push("hopper", "flyer"); if (n >= 3) pool.push("tank", "hopper"); if (n >= 4) pool.push("tank"); return pool[ri(0, pool.length - 1)]; };
  const addEnemy = (tx, s) => { const t = enemyFor(); enemies.push({ t, x: tx * T, y: t === "flyer" ? (s - ri(2, 3)) * T : (s - 1) * T - 8 }); };

  ground(0, 14, surf); x = 14;
  coinRow(6, 4, surf - 3);
  const endAt = cols - (n === 4 ? 40 : 22);
  let checkpointPlaced = false, sinceEnemy = 0;
  while (x < endAt) {
    const roll = R();
    const maxGap = Math.min(4, 2 + Math.floor(n / 2) + (R() < 0.3 ? 1 : 0));
    if (!checkpointPlaced && x > endAt / 2) {
      ground(x, 6, surf); items.push({ t: "check", x: (x + 2) * T, y: (surf - 2) * T }); x += 6; checkpointPlaced = true; continue;
    }
    if (roll < 0.22) { // gap with a coin arc and a key above it
      const g = ri(2, maxGap);
      for (let i = 0; i < g; i++) items.push({ t: "coin", x: (x + i) * T + 2, y: (surf - 3 - (i > 0 && i < g - 1 ? 1 : 0)) * T });
      key(x + Math.floor(g / 2), surf - 5);
      x += g; const len = ri(3, 6); ground(x, len, surf); x += len;
    } else if (roll < 0.36) { // step up or down
      surf = Math.max(7, Math.min(11, surf + (R() < 0.5 ? -1 : 1) * ri(1, 2)));
      const len = ri(4, 7); ground(x, len, surf); coinRow(x + 1, len - 2, surf - 2); if (R() < 0.4 + n * 0.1) addEnemy(x + len - 2, surf); x += len;
    } else if (roll < 0.52) { // row of furniture with deal blocks
      const len = ri(8, 11); ground(x, len, surf); const by = surf - 3;
      for (let i = 2; i < 7; i++) set(x + i, by, (i === 3 || i === 5) ? 3 : 2);
      coinRow(x + 2, 5, by - 1); if (R() < 0.6) key(x + 4, by - 2); else sigSpots.push([x + 4, by - 3]);
      if (R() < 0.5 + n * 0.12) addEnemy(x + len - 2, surf); x += len;
    } else if (roll < 0.66 && n >= 1) { // open lift shaft with floating furniture
      const pits = ri(2, 3), py = surf - ri(1, 3);
      for (let p = 0; p < pits; p++) {
        const g = ri(2, Math.min(3, maxGap)); x += g;
        for (let i = 0; i < 3; i++) set(x + i, py, 2);
        coinRow(x, 3, py - 1); if (p === 1) key(x + 1, py - 3);
        if (n >= 3 && R() < 0.4) enemies.push({ t: "flyer", x: x * T, y: (py - 3) * T });
        x += 3;
      }
      x += ri(2, Math.min(3, maxGap)); const len = ri(4, 6); ground(x, len, surf); x += len;
    } else if (roll < 0.78 && n >= 1) { // spilled drawing pins
      const len = ri(9, 12); ground(x, len, surf);
      let i = 2; while (i < len - 2) { const sw = ri(1, Math.min(3, 1 + n)); for (let k = 0; k < sw; k++) set(x + i + k, surf - 1, 5); items.push({ t: "coin", x: (x + i) * T + 2, y: (surf - 4) * T }); i += sw + ri(2, 3); }
      sigSpots.push([x + Math.floor(len / 2), surf - 3]); x += len;
    } else if (roll < 0.86 && n >= 3) { // thrower on a ledge
      const len = ri(7, 9); ground(x, len, surf); for (let i = 0; i < 3; i++) set(x + len - 3 + i, surf - 3, 2);
      enemies.push({ t: "thrower", x: (x + len - 2) * T, y: (surf - 3) * T - 24 }); key(x + 2, surf - 3); x += len;
    } else { // flat run with rivals
      const len = ri(6, 10); ground(x, len, surf); coinRow(x + 2, 3, surf - 3);
      const count = 1 + (R() < n * 0.2 ? 1 : 0); for (let e = 0; e < count; e++) addEnemy(x + 3 + e * 3, surf);
      if (R() < 0.35) key(x + len - 2, surf - 2); x += len;
    }
    if (x - sinceEnemy > 25 && enemies.length && enemies[enemies.length - 1].x < sinceEnemy * T) addEnemy(x - 2, surf);
    sinceEnemy = x;
  }
  surf = 11; ground(x, cols - x, surf);
  for (let y = 0; y < ROWS; y++) set(cols - 1, y, 1);
  let boss = null;
  if (n === 4) boss = { x: (cols - 12) * T, y: surf * T - 46, arena: (cols - 26) * T };
  else coinRow(x + 3, 6, surf - 3);
  const exit = { x: (cols - 5) * T, y: (surf - 3) * T };
  for (let i = 0; i < 3; i++) {
    let s = sigSpots.length ? sigSpots.splice(Math.floor(R() * sigSpots.length), 1)[0] : null;
    if (!s) { const cx = Math.floor(cols * (i + 1) / 4); let top = 0; while (top < ROWS && !map[top * cols + cx]) top++; s = [cx, Math.min(top, 11) - 3]; }
    items.push({ t: "sig", x: s[0] * T + 1, y: s[1] * T });
  }
  const keyCount = items.filter(i => i.t === "key").length;
  const quota = Math.max(3, Math.floor(keyCount * (0.55 + n * 0.05)));
  return { n, cols, map, items, enemies: enemies.filter(e => e.x > 18 * T), exit, boss, quota, keyCount };
}

// ---------- game state ----------
let state = "title", st = 0;
let sel = 0, ceo = CEOS[0];
let L = null, lvl = 0, score = 0, lives = 3, levelStartScore = 0, best = 0;
let p, cam = 0, items, enemies, shots, eshots, parts, boss, timer, frame = 0, checkpoint, keysGot, sigGot, tally, flash = 0, shake = 0, continues = 0, exitT = 0;
let tiles = {};
try { best = +localStorage.getItem("ck_best") || 0; } catch {}
const logo = new Image(); logo.src = "logo.webp";

function setState(s) { state = s; st = 0; }

function tileSet(th) {
  const g = (f) => { const s = P(T, T); f(s); return s.c; };
  const plat = {
    desk: s => { s.r(0, 0, T, 4, "#b07840"); s.r(0, 0, T, 1, "#d09858"); s.r(0, 4, T, 12, "#6a4426"); s.r(1, 6, 14, 4, "#7a5230"); s.r(6, 7, 4, 1, "#c0a060"); s.r(1, 11, 14, 4, "#7a5230"); s.r(6, 12, 4, 1, "#c0a060"); },
    cabinet: s => { s.r(0, 0, T, T, "#8a8e98"); s.r(0, 0, T, 1, "#b0b4c0"); s.r(1, 2, 14, 6, "#9a9ea8"); s.r(1, 9, 14, 6, "#9a9ea8"); s.r(5, 4, 6, 1, "#404048"); s.r(5, 11, 6, 1, "#404048"); s.r(6, 2, 4, 1, "#f0f0f0"); s.r(6, 9, 4, 1, "#f0f0f0"); s.r(15, 0, 1, T, "#5a5e68"); },
    crate: s => { s.r(0, 0, T, T, "#b08040"); s.r(0, 0, T, 2, "#c89858"); s.r(0, 7, T, 2, "#8a6030"); s.r(0, 14, T, 2, "#8a6030"); s.r(2, 2, 2, 12, "#8a6030"); s.r(12, 2, 2, 12, "#8a6030"); s.r(5, 10, 6, 3, "#202020"); s.r(6, 11, 4, 1, "#e0e0e0"); },
  }[th.plat];
  return {
    1: g(s => { s.r(0, 0, T, T, th.ground); s.r(0, 0, T, 1, shade(th.ground, 1.3)); s.r(0, 8, T, 1, shade(th.ground, 0.8)); s.r(8, 0, 1, 8, shade(th.ground, 0.8)); s.r(0, 8, 1, 8, shade(th.ground, 0.8)); }),
    top: g(s => {
      s.r(0, 0, T, T, th.ground);
      s.r(0, 0, T, 5, th.carpet); s.r(0, 5, T, 2, shade(th.carpet, 0.55));
      if (th.pattern === "corrugated") for (let i = 0; i < 4; i++) s.r(i * 4, 5, 2, 2, "#101010"); // hazard stripes on the warehouse floor
      for (let i = 0; i < 6; i++) s.r((i * 5 + 1) % 15, 1 + (i % 3), 1, 1, shade(th.carpet, 1.25));
      s.r(0, 8, T, 1, shade(th.ground, 0.8));
    }),
    2: g(plat),
    3: g(s => { s.r(0, 0, T, T, "#e8a818"); s.r(0, 0, T, 1, "#ffe080"); s.r(0, 15, T, 1, "#7a4000"); s.r(15, 0, 1, T, "#7a4000"); s.r(2, 3, 12, 9, "#5a3410"); s.r(5, 1, 6, 2, "#5a3410"); s.r(6, 2, 4, 1, "#e8a818"); s.r(2, 6, 12, 1, "#e8c040");
      s.r(7, 8, 3, 1, "#ffe080"); s.r(6, 9, 1, 2, "#ffe080"); s.r(5, 10, 4, 1, "#ffe080"); s.r(5, 11, 6, 1, "#ffe080"); }),
    4: g(s => { s.r(0, 0, T, T, "#6a5a4a"); s.r(0, 0, T, 1, "#8a7a6a"); s.r(0, 15, T, 1, "#3a2a1a"); s.r(2, 3, 12, 9, "#4a3a2a"); }),
    5: g(s => { for (const x0 of [1, 9]) { s.r(x0 + 2, 5, 1, 8, "#d0d0d8"); s.r(x0 + 2, 4, 1, 1, "#ffffff"); s.r(x0, 12, 5, 2, "#e02020"); s.r(x0 + 1, 11, 3, 1, "#ff6060"); } }),
  };
}

function startLevel(n, fromCheckpoint) {
  lvl = n; L = genLevel(n); tiles = tileSet(LEVELS[n]);
  items = L.items.map(i => ({ ...i, alive: true, bob: Math.random() * 6 }));
  enemies = L.enemies.map(e => newEnemy(e.t, e.x, e.y));
  shots = []; eshots = []; parts = []; exitT = 0;
  boss = L.boss ? { x: L.boss.x, y: L.boss.y, w: 44, h: 40, vx: 0, vy: 0, hp: 6, inv: 0, t: 0, active: false, dead: false, arena: L.boss.arena } : null;
  keysGot = 0; sigGot = 0; timer = LEVELS[n].time * 60; checkpoint = { x: 3 * T, y: 9 * T };
  if (!fromCheckpoint) levelStartScore = score;
  const [song, tr, bpm] = LEVELS[n].song; Music.rate = 1; Music.play(song, tr, bpm);
  spawnPlayer();
}
function newEnemy(t, x, y) {
  const base = { t, x, y, vx: 0, vy: 0, hp: 1, alive: true, t0: Math.random() * 100, w: 14, h: 14, by: y, cd: 60 + Math.random() * 60 };
  const sp = 1 + lvl * 0.15;
  if (t === "walker") Object.assign(base, { w: 14, h: 14, vx: -0.45 * sp });
  if (t === "flyer") Object.assign(base, { w: 16, h: 12, vx: -0.6 * sp });
  if (t === "hopper") Object.assign(base, { w: 10, h: 22, vx: -0.9 * sp });
  if (t === "tank") Object.assign(base, { w: 22, h: 18, vx: -0.6 * sp, hp: 2 });
  if (t === "thrower") Object.assign(base, { w: 10, h: 22, vx: 0 });
  return base;
}
function spawnPlayer() {
  p = { x: checkpoint.x, y: checkpoint.y, w: 10, h: 22, vx: 0, vy: 0, ground: false, face: 1, coyote: 0, jbuf: 0, hp: 3, inv: 90, superCd: 0,
    ghost: 0, dash: 0, shield: 0, magnet: 0, rocket: 0, coffee: 0, anim: 0, dead: 0 };
  cam = Math.max(0, p.x - 140);
}

// ---------- physics ----------
const tileAt = (tx, ty) => (tx < 0 ? 1 : tx >= L.cols || ty < 0 || ty >= ROWS ? 0 : L.map[ty * L.cols + tx]);
const solid = v => v >= 1 && v <= 4;
function collideX(o) {
  const y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 1) / T);
  if (o.vx > 0) { const tx = Math.floor((o.x + o.w) / T); for (let y = y0; y <= y1; y++) if (solid(tileAt(tx, y))) { o.x = tx * T - o.w; o.vx = 0; return true; } }
  if (o.vx < 0) { const tx = Math.floor(o.x / T); for (let y = y0; y <= y1; y++) if (solid(tileAt(tx, y))) { o.x = (tx + 1) * T; o.vx = 0; return true; } }
  return false;
}
function collideY(o, onHead) {
  const x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - 1) / T);
  o.ground = false;
  if (o.vy > 0) { const ty = Math.floor((o.y + o.h) / T); for (let x = x0; x <= x1; x++) if (solid(tileAt(x, ty))) { o.y = ty * T - o.h; o.vy = 0; o.ground = true; return; } }
  if (o.vy < 0) { const ty = Math.floor(o.y / T); for (let x = x0; x <= x1; x++) if (solid(tileAt(x, ty))) { o.y = (ty + 1) * T; o.vy = 0; if (onHead) onHead(x, ty); return; } }
}
function move(o, onHead) { o.x += o.vx; const hit = collideX(o); o.y += o.vy; collideY(o, onHead); return hit; }
const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function burst(x, y, col, n = 8, sp = 2) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * sp * 2, vy: (Math.random() - 0.8) * sp * 2, life: 30 + Math.random() * 20, col }); }
function popText(x, y, s, col = "#fff") { parts.push({ x, y, vx: 0, vy: -0.5, life: 50, s, col }); }
function addScore(v, x, y) { const amt = v * (1 + lvl); score += amt; if (x !== undefined) popText(x, y, money(amt), "#ffe060"); }

function hurt() {
  if (p.inv > 0 || p.ghost > 0 || p.dash > 0 || p.rocket > 0 || p.dead) return;
  if (p.shield > 0) { p.shield = 0; p.inv = 60; SFX.block(); burst(p.x + 5, p.y + 10, "#80d0ff", 12); return; }
  p.hp--; p.inv = 90; SFX.hurt(); shake = 8; flash = 4;
  p.vy = -3.5; p.vx = -p.face * 2.5;
  if (p.hp <= 0) die();
}
function die() { if (p.dead) return; p.dead = 1; p.vy = -6; SFX.die(); }

function useSpecial() {
  if (p.superCd > 0 || p.dead) return;
  p.superCd = 420; SFX.special(); flash = 3;
  const cx = p.x + p.w / 2, cy = p.y + 10;
  switch (ceo.id) {
    case "musk": p.vy = -9.5; p.rocket = 60; break;
    case "zuck": p.ghost = 240; break;
    case "bezos": p.dash = 40; break;
    case "cook": p.shield = 600; break;
    case "huang": shots.push({ x: cx, y: cy - 4, vx: 6 * p.face, vy: 0, w: 22, h: 10, life: 70, pierce: true, col: "#76b900" }); break;
    case "su": for (const a of [-0.35, 0, 0.35]) shots.push({ x: cx, y: cy - 2, vx: 5 * p.face * Math.cos(a), vy: 5 * Math.sin(a), w: 8, h: 8, life: 60, pierce: false, col: "#ff4040" }); break;
    case "dyson": p.magnet = 300; for (const e of enemies) if (e.alive && Math.abs(e.x - cx) < 110 && Math.abs(e.y - cy) < 80) killEnemy(e); break;
    case "barra": shake = 16; for (const e of enemies) if (e.alive && e.x > cam - 20 && e.x < cam + W + 20) killEnemy(e); if (boss && boss.active) damageBoss(); break;
  }
}

function killEnemy(e, stomp) {
  if (!e.alive) return;
  e.hp--; if (e.hp > 0) { e.flash = 20; SFX.stomp(); return; }
  e.alive = false; SFX.stomp(); burst(e.x + e.w / 2, e.y + e.h / 2, "#f0f0f0", 10);
  addScore(stomp ? 25000 : 15000, e.x, e.y - 8);
}
function damageBoss() {
  if (!boss || boss.inv > 0 || boss.dead) return;
  boss.hp--; boss.inv = 70; shake = 10; SFX.stomp(); burst(boss.x + 22, boss.y + 10, "#ff2020", 16, 3);
  if (boss.hp <= 0) { boss.dead = true; addScore(1000000, boss.x, boss.y); SFX.clear(); burst(boss.x + 22, boss.y + 20, "#ffe060", 40, 4); Music.play("lift", 5, 120); }
}

function collect(it) {
  it.alive = false;
  if (it.t === "coin") { addScore(10000); SFX.coin(); }
  else if (it.t === "key") { keysGot++; addScore(50000, it.x, it.y - 6); SFX.key(); burst(it.x + 6, it.y + 6, "#ffe060", 8); if (keysGot === L.quota) { popText(p.x - 30, p.y - 20, "LIFT UNLOCKED!", "#80ff80"); SFX.ding(); } }
  else if (it.t === "sig") { sigGot++; addScore(250000, it.x, it.y - 6); SFX.power(); burst(it.x + 6, it.y + 6, ceo.sigc, 16, 3); }
  else if (it.t === "coffee") { p.coffee = 600; SFX.power(); popText(it.x, it.y, "COFFEE!", "#ffe060"); }
  else if (it.t === "heart") { p.hp = Math.min(3, p.hp + 1); SFX.power(); popText(it.x, it.y, "CASH FLOW+", "#ff6080"); }
  else if (it.t === "life") { lives++; SFX.power(); popText(it.x, it.y, "GOLDEN PARACHUTE!", "#ffe060"); }
}

function bumpBlock(tx, ty) {
  if (tileAt(tx, ty) === 3) {
    L.map[ty * L.cols + tx] = 4; SFX.block();
    const r = Math.random(), t = r < 0.45 ? "coin" : r < 0.75 ? "coffee" : r < 0.93 ? "heart" : "life";
    if (t === "coin") { addScore(10000, tx * T, ty * T - 10); SFX.coin(); burst(tx * T + 8, ty * T, "#ffe060", 6); }
    else items.push({ t, x: tx * T + 2, y: (ty - 1) * T, alive: true, bob: 0, vy: -2, pop: true });
  } else if (tileAt(tx, ty) === 2) SFX.block();
  for (const e of enemies) if (e.alive && e.x < (tx + 1) * T && e.x + e.w > tx * T && Math.abs(e.y + e.h - ty * T) < 4) killEnemy(e);
}

// ---------- update ----------
function updatePlay() {
  frame++;
  if (exitT) { // riding the lift up
    exitT++; if (exitT === 70) { SFX.clear(); setState("clear"); }
    return;
  }
  if (p.dead) {
    p.dead++; p.vy += 0.3; p.y += p.vy;
    if (p.dead > 100) {
      lives--;
      if (lives <= 0) { Music.stop(); SFX.gameover(); setState("gameover"); return; }
      timer = Math.max(timer, 90 * 60); spawnPlayer();
    }
    return;
  }
  const spd = 2.1 * ceo.speed * (p.coffee > 0 ? 1.3 : 1);
  if (p.dash > 0) { p.dash--; p.vx = p.face * 5.5; p.vy = Math.min(p.vy, 0.5); }
  else {
    if (keys.left && !keys.right) { p.vx = Math.max(-spd, p.vx - 0.35); p.face = -1; }
    else if (keys.right && !keys.left) { p.vx = Math.min(spd, p.vx + 0.35); p.face = 1; }
    else { p.vx *= p.ground ? 0.72 : 0.92; if (Math.abs(p.vx) < 0.05) p.vx = 0; }
  }
  if (pressed.jump || pressed.up) p.jbuf = 7; else if (p.jbuf > 0) p.jbuf--;
  if (p.ground) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
  if (p.jbuf > 0 && p.coyote > 0) { p.vy = -6.6 * ceo.jump; p.jbuf = 0; p.coyote = 0; SFX.jump(); }
  if (!(keys.jump || keys.up) && p.vy < -2.5 && p.rocket <= 0) p.vy = -2.5;
  if (pressed.special) useSpecial();
  p.vy = Math.min(7, p.vy + (p.rocket > 0 ? 0.18 : 0.32));
  if (p.rocket > 0) { p.rocket--; parts.push({ x: p.x + 5, y: p.y + 22, vx: (Math.random() - 0.5), vy: 2, life: 15, col: Math.random() < 0.5 ? "#ff9020" : "#ffe060" }); }
  move(p, bumpBlock);
  if (boss && boss.active && !boss.dead && p.x < boss.arena) { p.x = boss.arena; p.vx = 0; }
  if (p.x < 0) p.x = 0;
  for (const k of ["ghost", "shield", "magnet", "coffee", "inv", "superCd"]) if (p[k] > 0) p[k]--;
  if (p.vx !== 0 && p.ground) p.anim += Math.abs(p.vx) * 0.08;
  if (p.y > ROWS * T + 10) { die(); return; }
  // drawing pins
  const sx0 = Math.floor((p.x + 2) / T), sx1 = Math.floor((p.x + p.w - 3) / T), sy = Math.floor((p.y + p.h - 2) / T);
  for (let x = sx0; x <= sx1; x++) if (tileAt(x, sy) === 5 && !(p.dash > 0 || p.rocket > 0)) { hurt(); if (p.hp > 0 && !p.dead) p.vy = -5; }

  const target = boss && boss.active && !boss.dead ? boss.arena : p.x - 140;
  cam += (Math.max(0, Math.min(L.cols * T - W, target)) - cam) * 0.15;

  timer--; if (timer <= 0) { p.hp = 0; p.inv = 0; die(); }
  if (timer === 30 * 60) { SFX.phone(); Music.rate = 1.25; popText(p.x - 40, p.y - 30, "QUARTER ENDING!", "#ff6060"); }

  for (const it of items) {
    if (!it.alive) continue;
    if (it.pop) { it.vy += 0.2; it.y += it.vy; if (it.vy > 0) { const ty = Math.floor((it.y + 12) / T); if (solid(tileAt(Math.floor((it.x + 6) / T), ty))) { it.y = ty * T - 12; it.vy = 0; } } }
    if (it.t === "check") { if (!it.hit && p.x > it.x) { it.hit = true; checkpoint = { x: it.x, y: it.y - 8 }; SFX.power(); popText(it.x - 20, it.y - 10, "CHECKPOINT", "#80ff80"); } continue; }
    const box = { x: it.x, y: it.y, w: 12, h: 12 };
    if (p.magnet > 0 && it.t !== "life") { const dx = p.x - it.x, dy = p.y + 8 - it.y, d = Math.hypot(dx, dy); if (d < 120 && d > 1) { it.x += dx / d * 4; it.y += dy / d * 4; } }
    if (hits(p, box)) collect(it);
  }

  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.x > cam + W + 48 || e.x < cam - 64) continue;
    e.t0++; if (e.flash > 0) e.flash--;
    if (e.t === "flyer") { e.x += e.vx; e.y = e.by + Math.sin(e.t0 * 0.06) * 14; }
    else if (e.t === "thrower") {
      e.vy = Math.min(7, e.vy + 0.32); move(e);
      if (--e.cd <= 0 && Math.abs(e.x - p.x) < 260) { e.cd = 130 - lvl * 10; const dir = p.x < e.x ? -1 : 1; eshots.push({ x: e.x, y: e.y + 4, vx: dir * (1.4 + Math.abs(p.x - e.x) / 120), vy: -4, w: 8, h: 8, life: 200, grav: true }); }
    } else {
      e.vy = Math.min(7, e.vy + 0.32);
      if (e.t === "tank" && Math.abs(p.x - e.x) < 90 && Math.abs(p.y - e.y) < 30) e.vx = Math.sign(p.x - e.x) * 1.6 * (1 + lvl * 0.1);
      if (e.t === "hopper" && e.ground && Math.random() < 0.01 + lvl * 0.004) e.vy = -5;
      if (move(e)) e.vx = -(e.vx || -0.5);
      if (e.ground) { const ahead = Math.floor((e.vx > 0 ? e.x + e.w + 1 : e.x - 1) / T), below = Math.floor((e.y + e.h + 2) / T); if (!solid(tileAt(ahead, below))) e.vx = -e.vx; }
      if (e.vx === 0) e.vx = -0.5;
      if (e.y > ROWS * T) e.alive = false;
    }
    if (!e.alive || p.dead) continue;
    if (hits(p, e)) {
      if (p.ghost > 0) continue;
      if (p.dash > 0 || p.rocket > 0) { killEnemy(e); continue; }
      if (p.vy > 0.5 && p.y + p.h - e.y < 10) { killEnemy(e, true); p.vy = (keys.jump || keys.up) ? -6.5 : -4.5; }
      else hurt();
    }
  }

  if (boss && !boss.dead) {
    if (!boss.active && p.x > boss.arena + 40) { boss.active = true; SFX.fight(); shake = 20; Music.play("boss", 0); }
    if (boss.active) {
      boss.t++; if (boss.inv > 0) boss.inv--;
      const rage = boss.hp <= 3 ? 1.5 : 1;
      if (boss.ground && boss.t % 140 === 0) { boss.vy = -7; boss.vx = Math.sign(p.x - boss.x) * 2 * rage; }
      else if (boss.ground) boss.vx = Math.sign(p.x + 5 - (boss.x + boss.w / 2)) * 0.9 * rage;
      if (boss.t % 200 === 100) for (let i = 0; i < 3 + (rage > 1 ? 2 : 0); i++) eshots.push({ x: boss.x + 20, y: boss.y + 10, vx: (i - 2) * 1.2, vy: -5 - Math.random() * 2, w: 8, h: 8, life: 240, grav: true, arrow: true });
      boss.vy = Math.min(8, boss.vy + 0.32);
      const was = boss.ground; move(boss); if (!was && boss.ground) shake = 6;
      if (boss.x < boss.arena) boss.x = boss.arena;
      if (!p.dead && hits(p, boss)) {
        if (p.vy > 0.5 && p.y + p.h - boss.y < 14) { damageBoss(); p.vy = -7; }
        else if (p.dash > 0 || p.rocket > 0) { damageBoss(); p.vx = -p.face * 4; p.dash = 0; }
        else hurt();
      }
    }
  }

  for (const s of shots) {
    s.x += s.vx; s.y += s.vy; s.life--;
    if (solid(tileAt(Math.floor((s.x + s.w / 2) / T), Math.floor((s.y + s.h / 2) / T))) && !s.pierce) s.life = 0;
    for (const e of enemies) if (e.alive && hits(s, e)) { killEnemy(e); if (!s.pierce) s.life = 0; }
    if (boss && boss.active && !boss.dead && hits(s, boss)) { damageBoss(); if (!s.pierce) s.life = 0; }
    if (s.life % 3 === 0) parts.push({ x: s.x + s.w / 2, y: s.y + s.h / 2, vx: 0, vy: 0, life: 10, col: s.col });
  }
  shots = shots.filter(s => s.life > 0);
  for (const s of eshots) {
    s.x += s.vx; if (s.grav) s.vy += 0.2; s.y += s.vy; s.life--;
    if (!p.dead && hits(p, s) && p.ghost <= 0) { hurt(); s.life = 0; }
    if (s.y > ROWS * T) s.life = 0;
  }
  eshots = eshots.filter(s => s.life > 0);
  for (const q of parts) { q.x += q.vx; q.y += q.vy; if (!q.s) q.vy += 0.1; q.life--; }
  parts = parts.filter(q => q.life > 0);

  const open = keysGot >= L.quota && (!boss || boss.dead);
  if (open && p.ground && hits(p, { x: L.exit.x + 4, y: L.exit.y, w: 16, h: 48 })) {
    SFX.ding(); Music.stop(); exitT = 1; p.vx = 0; p.x = L.exit.x + 7;
    const timeBonus = Math.floor(timer / 60) * 5000 * (1 + lvl);
    tally = { keys: keysGot, keyCount: L.keyCount, sig: sigGot, timeBonus };
    score += timeBonus;
  } else if (!open && hits(p, { x: L.exit.x - 4, y: L.exit.y, w: 32, h: 48 }) && frame % 60 === 0) {
    popText(L.exit.x - 40, L.exit.y - 12, boss && !boss.dead ? "BEAT THE BOSS!" : `NEED ${L.quota - keysGot} MORE ${LEVELS[lvl].key}`, "#ff6060");
  }
}

// ---------- drawing the office ----------
const FLOOR_Y = 11 * T;
function drawFurniture(kind, x, th, idx) {
  const c = th.furnCol, hi = shade(c, 1.35), lo = shade(c, 0.7), y = FLOOR_Y;
  const R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x + a), y - b, w, h); };
  const glow = th.night ? "#40d0ff" : "#9ad0e8";
  switch (kind) {
    case "desk": R(0, 22, 40, 4, hi); R(2, 18, 3, 18, c); R(35, 18, 3, 18, c); R(12, 36, 16, 12, lo); R(14, 34, 12, 8, glow); R(18, 24, 4, 2, lo); R(8, 30, 6, 8, c); break;
    case "cubicle": R(0, 44, 56, 44, c); R(0, 44, 56, 3, hi); R(27, 44, 2, 44, lo); R(8, 30, 14, 10, lo); R(10, 28, 10, 6, glow); R(34, 30, 14, 10, lo); R(36, 28, 10, 6, glow); R(6, 18, 44, 3, hi); break;
    case "plant": R(6, 14, 12, 14, "#8a5030"); R(5, 14, 14, 2, "#a06040"); R(10, 40, 4, 26, shade(th.vine, 0.7)); ctx.fillStyle = th.vine; for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.5; ctx.fillRect(Math.round(x + 12 + Math.cos(a - 1.57) * 4) - 3, y - 30 - Math.round(Math.abs(Math.sin(a)) * 10), 6, 12); } break;
    case "cooler": R(4, 28, 14, 28, "#e0e0e8"); R(5, 44, 12, 16, "#80c0f0"); R(7, 42, 3, 6, "#c0e8ff"); R(8, 22, 6, 2, "#4060a0"); break;
    case "printer": R(0, 30, 30, 30, "#c8c8d0"); R(2, 30, 26, 4, "#e8e8f0"); R(4, 22, 22, 2, "#202020"); R(22, 26, 4, 2, "#40ff60"); R(6, 36, 18, 6, "#ffffff"); break;
    case "clock": R(10, 120, 20, 20, "#f0f0f0"); R(19, 117, 2, 8, "#000"); R(19, 110, 7, 2, "#000"); break;
    case "whiteboard": R(0, 90, 56, 36, "#e8e8f0"); R(0, 90, 56, 2, "#a0a0a8"); R(6, 82, 20, 2, "#2050c0"); R(6, 76, 14, 2, "#d02020"); R(30, 82, 2, 14, "#202020"); R(30, 70, 16, 2, "#202020"); R(32, 76, 4, 4, "#30a050"); R(38, 76, 4, 8, "#30a050"); R(44, 76, 4, 12, "#30a050"); R(4, 54, 48, 2, lo); break;
    case "beanbag": ctx.fillStyle = idx % 2 ? "#c04040" : "#4060c0"; ctx.beginPath(); ctx.ellipse(x + 14, y - 8, 15, 10, 0, 0, 7); ctx.fill(); break;
    case "arcade": R(0, 50, 22, 50, "#202040"); R(3, 44, 16, 12, "#40ff80"); R(4, 26, 14, 4, "#d02020"); R(0, 50, 22, 4, "#d02020"); break;
    case "rack": R(0, 120, 4, 120, "#d06020"); R(56, 120, 4, 120, "#d06020"); for (let s = 0; s < 4; s++) { R(0, 30 + s * 28, 60, 3, "#3060c0"); for (let b = 0; b < 3; b++) if (hash(idx * 7 + s * 3 + b) > 0.3) R(6 + b * 17, 30 + s * 28 + 16, 14, 13, "#b08040"); } break;
    case "boxes": R(0, 16, 16, 16, "#b08040"); R(18, 16, 14, 16, "#a07038"); R(6, 30, 16, 14, "#c09050"); R(7, 16, 2, 16, "#e0d080"); break;
    case "forklift": R(0, 26, 30, 18, "#e0b020"); R(6, 44, 16, 18, "#303030"); R(30, 50, 3, 50, "#606060"); R(30, 4, 14, 3, "#606060"); R(2, 8, 8, 8, "#202020"); R(20, 8, 8, 8, "#202020"); break;
    case "conveyor": R(0, 18, 70, 6, "#404048"); for (let i = 0; i < 7; i++) R(i * 10 + ((frame / 2) % 10), 18, 2, 6, "#808088"); R(4, 12, 3, 12, "#303030"); R(62, 12, 3, 12, "#303030"); R(20, 30, 12, 12, "#b08040"); break;
    case "screens": for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { const sx = k * 20, sy = 70 - r * 16; R(sx, sy, 18, 13, "#101018"); R(sx + 1, sy - 1, 16, 11, "#04060c"); ctx.fillStyle = (k + r + idx) % 2 ? "#40ff60" : "#ff4040"; for (let j = 0; j < 7; j++) ctx.fillRect(Math.round(x + sx + 2 + j * 2), y - sy + 2 + Math.round((Math.sin(frame / 20 + j + k * 3 + idx) + 1) * 3), 2, 2); } R(0, 22, 60, 4, hi); R(4, 18, 3, 18, c); R(53, 18, 3, 18, c); break;
    case "bell": R(8, 70, 30, 4, "#c09020"); R(12, 66, 22, 18, "#e0b030"); R(20, 48, 6, 4, "#e0b030"); R(22, 44, 2, 30, "#806020"); break;
    case "painting": R(0, 110, 40, 32, "#c09030"); R(3, 107, 34, 26, "#3a5a3a"); R(14, 100, 12, 14, "#e0c0a0"); R(12, 86, 16, 8, "#202020"); break;
    case "chair": R(4, 46, 16, 26, "#1a0a06"); R(2, 22, 20, 4, "#2a1410"); R(10, 18, 4, 12, "#101010"); R(4, 6, 16, 2, "#101010"); break;
    case "globe": R(10, 6, 12, 6, "#806020"); R(15, 20, 2, 14, "#806020"); ctx.fillStyle = "#3070c0"; ctx.beginPath(); ctx.arc(x + 16, y - 30, 10, 0, 7); ctx.fill(); R(10, 34, 6, 5, "#40a040"); R(18, 28, 5, 4, "#40a040"); break;
  }
}

function drawBackground(th, camX) {
  ctx.fillStyle = th.wall; ctx.fillRect(0, 0, W, H);
  // wall texture
  const wx = (camX * 0.5) % 32;
  ctx.fillStyle = th.wall2;
  if (th.pattern === "brick") for (let y = 32; y < H; y += 8) { ctx.fillRect(0, y, W, 1); for (let x = -((camX * 0.5) % 16) - 16 + ((y / 8) % 2) * 8; x < W; x += 16) ctx.fillRect(Math.round(x), y, 1, 8); }
  if (th.pattern === "panel") for (let x = -wx; x < W; x += 32) ctx.fillRect(Math.round(x), 32, 2, H);
  if (th.pattern === "corrugated") for (let x = -((camX * 0.5) % 6); x < W; x += 6) ctx.fillRect(Math.round(x), 32, 2, H);
  if (th.pattern === "grid") { for (let x = -wx; x < W; x += 32) ctx.fillRect(Math.round(x), 32, 1, H); for (let y = 32; y < H; y += 32) ctx.fillRect(0, y, W, 1); }
  if (th.pattern === "wood") for (let x = -((camX * 0.5) % 16); x < W; x += 16) { ctx.fillRect(Math.round(x), 32, 1, H); ctx.fillRect(Math.round(x) + 6, 32, 1, H); }
  // windows looking out over the city
  const ww = 92, wsp = 140, off = (camX * 0.3) % wsp, start = Math.floor(camX * 0.3 / wsp);
  for (let i = -1; i < W / wsp + 2; i++) {
    const idx = start + i, x = Math.round(i * wsp - off + 20), y = 44, h = 84;
    if (th.pattern === "brick" && idx % 3 === 2) continue;
    ctx.fillStyle = shade(th.wall, 0.6); ctx.fillRect(x - 4, y - 4, ww + 8, h + 8);
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; ctx.fillRect(x, y, ww, h);
    if (th.night) for (let k = 0; k < 8; k++) { ctx.fillStyle = "#fff"; ctx.fillRect(x + Math.floor(hash(idx * 31 + k) * ww), y + Math.floor(hash(idx * 17 + k) * 30), 1, 1); }
    for (let b = 0; b < 6; b++) {
      const bh = 20 + Math.floor(hash(idx * 13 + b) * 50), bx = Math.max(x, x + b * 16 - 2), bw = Math.min(15, x + ww - bx);
      ctx.fillStyle = th.night ? "#0a0c1c" : shade(th.sky[0], 0.6); ctx.fillRect(bx, y + h - bh, bw, bh);
      if (th.night) { ctx.fillStyle = "#ffe08099"; for (let wy = y + h - bh + 3; wy < y + h - 2; wy += 5) for (let wxx = bx + 2; wxx < bx + bw - 2; wxx += 4) if (hash(wy * 7 + wxx + idx) > 0.55) ctx.fillRect(wxx, wy, 2, 2); }
    }
    ctx.fillStyle = shade(th.wall, 0.45); ctx.fillRect(x + ww / 2 - 1, y, 3, h); ctx.fillRect(x, y + h / 2 - 1, ww, 2);
    ctx.fillStyle = "#ffffff22"; ctx.fillRect(x + 6, y + 4, 4, 30); ctx.fillRect(x + 12, y + 4, 2, 20);
  }
  // furniture
  const fsp = 96, foff = (camX * 0.6) % fsp, fstart = Math.floor(camX * 0.6 / fsp);
  for (let i = -1; i < W / fsp + 2; i++) { const idx = fstart + i; drawFurniture(th.furn[Math.floor(hash(idx) * th.furn.length)], i * fsp - foff + 8, th, idx); }
  // ceiling with strip lights, and the jungle hanging off it
  ctx.fillStyle = th.ceil; ctx.fillRect(0, 22, W, 10);
  ctx.fillStyle = shade(th.ceil, 0.8); for (let x = -((camX * 0.8) % 24); x < W; x += 24) ctx.fillRect(Math.round(x), 22, 1, 10);
  for (let x = -((camX * 0.8) % 120); x < W; x += 120) { ctx.fillStyle = "#fffbe0"; ctx.fillRect(Math.round(x) + 30, 30, 40, 3); ctx.fillStyle = "#fffbe018"; ctx.fillRect(Math.round(x) + 22, 33, 56, 24); }
  const vsp = 72, voff = (camX * 0.8) % vsp, vstart = Math.floor(camX * 0.8 / vsp);
  for (let i = -1; i < W / vsp + 2; i++) {
    const idx = vstart + i, vx = Math.round(i * vsp - voff + hash(idx) * 40), len = 14 + Math.floor(hash(idx + 99) * 40);
    if (hash(idx * 3) < 0.35) { ctx.fillStyle = "#202020"; ctx.fillRect(vx, 32, 1, Math.round(len * 0.7)); continue; } // loose cable
    for (let k = 0; k < len; k += 2) {
      const sway = Math.round(Math.sin(frame / 40 + idx + k / 8) * (k / 14));
      ctx.fillStyle = shade(th.vine, 0.7); ctx.fillRect(vx + sway, 32 + k, 1, 2);
      if (k % 6 === 0) { ctx.fillStyle = th.vine; ctx.fillRect(vx + sway + ((k / 6) % 2 ? 1 : -3), 32 + k, 3, 2); }
    }
  }
  if (lvl === 3) { // stock ticker
    ctx.fillStyle = "#000"; ctx.fillRect(0, 32, W, 11); ctx.font = `8px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "top";
    const tick = `${ceo.co.split(" ")[0]} +12.4%   RIVALS -3.1%   FTSE +0.8%   BONDS -0.2%   IPO +44%   `; const tw = ctx.measureText(tick).width; const ox = -((frame * 0.7) % tw);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = "#40ff60"; ctx.fillText(tick, ox + k * tw, 34); }
  }
}

function drawTiles(camX) {
  const x0 = Math.floor(camX / T), x1 = Math.min(L.cols - 1, x0 + W / T + 1);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = x0; tx <= x1; tx++) {
    const v = L.map[ty * L.cols + tx]; if (!v) continue;
    const img = v === 1 && !solid(tileAt(tx, ty - 1)) ? tiles.top : tiles[v];
    ctx.drawImage(img, Math.round(tx * T - camX), ty * T);
  }
}

function drawPlayer(camX) {
  if (exitT > 30) return;
  if (p.inv > 0 && !p.dead && Math.floor(p.inv / 4) % 2) return;
  const f = p.dead ? 3 : !p.ground ? 3 : Math.abs(p.vx) > 0.3 ? 1 + (Math.floor(p.anim) % 2) : 0;
  const img = (p.face > 0 ? ceo.frames : ceo.framesL)[f];
  const x = Math.round(p.x - 4 - camX), y = Math.round(p.y - 2);
  if (p.ghost > 0) ctx.globalAlpha = 0.45 + Math.sin(frame * 0.3) * 0.15;
  if (p.dash > 0) { ctx.globalAlpha = 0.3; ctx.drawImage(img, x - p.face * 10, y); ctx.drawImage(img, x - p.face * 20, y); ctx.globalAlpha = 1; }
  ctx.drawImage(img, x, y);
  ctx.globalAlpha = 1;
  if (p.shield > 0) { ctx.strokeStyle = `rgba(120,200,255,${0.5 + Math.sin(frame * 0.2) * 0.3})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 9, y + 13, 16, 0, 7); ctx.stroke(); }
  if (p.magnet > 0) { ctx.strokeStyle = "#c060ff88"; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x + 9, y + 13, 10 + ((frame * 2 + i * 15) % 45), 0, 7); ctx.stroke(); } }
  if (p.coffee > 0 && frame % 6 === 0) parts.push({ x: p.x + 5, y: p.y, vx: 0, vy: -0.6, life: 20, col: "#ffffff88" });
}

function drawLift(camX) {
  const open = keysGot >= L.quota && (!boss || boss.dead), ex = Math.round(L.exit.x - camX), ey = L.exit.y;
  ctx.fillStyle = "#0a0a14"; ctx.fillRect(ex - 7, ey - 17, 38, 65);
  ctx.fillStyle = "#5a5e68"; ctx.fillRect(ex - 6, ey - 16, 36, 64);
  ctx.fillStyle = "#202024"; ctx.fillRect(ex - 2, ey, 28, 48);
  // doors slide open as you step in, then close behind you
  const gap = exitT ? (exitT < 30 ? Math.min(12, exitT) : Math.max(0, 12 - (exitT - 30))) : 0;
  ctx.fillStyle = "#c0c4cc"; ctx.fillRect(ex, ey, 12 - gap, 48); ctx.fillRect(ex + 12 + gap, ey, 12 - gap, 48);
  ctx.fillStyle = "#8a8e98"; ctx.fillRect(ex + 11 - gap, ey, 1, 48); ctx.fillRect(ex + 12 + gap, ey, 1, 48);
  ctx.fillStyle = "#101010"; ctx.fillRect(ex + 4, ey - 13, 16, 9);
  ctx.fillStyle = open ? (frame % 30 < 20 ? "#40ff80" : "#20a050") : "#ff3030";
  ctx.fillRect(ex + 9, ey - 12, 6, 2); ctx.fillRect(ex + 10, ey - 10, 4, 2); ctx.fillRect(ex + 11, ey - 8, 2, 3);
  ctx.fillStyle = "#808490"; ctx.fillRect(ex + 26, ey + 20, 3, 7); ctx.fillStyle = open ? "#40ff80" : "#ff3030"; ctx.fillRect(ex + 27, ey + 21, 1, 2);
  txt(open ? "LIFT" : `${keysGot}/${L.quota}`, ex + 12, ey - 28, open ? "#80ff80" : "#ff8080", 8, "center");
}

function drawWorld() {
  const th = LEVELS[lvl];
  const camX = Math.round(cam + (shake > 0 ? (Math.random() - 0.5) * shake : 0)); if (shake > 0) { shake *= 0.85; if (shake < 0.5) shake = 0; }
  drawBackground(th, camX);
  // the drop: open lift shafts below floor level
  ctx.fillStyle = "#08080c"; ctx.fillRect(0, FLOOR_Y + 24, W, H);
  drawTiles(camX);
  drawLift(camX);
  for (const it of items) {
    if (!it.alive) continue;
    const x = Math.round(it.x - camX), bob = Math.round(Math.sin(frame * 0.08 + it.bob) * 2), y = Math.round(it.y) + (it.pop ? 0 : bob);
    if (x < -20 || x > W + 20) continue;
    if (it.t === "coin") ctx.drawImage(SPR.coin[[0, 1, 2, 1][Math.floor(frame / 8 + it.bob) % 4]], x, y);
    else if (it.t === "key") ctx.drawImage(SPR.keys[lvl], x, y);
    else if (it.t === "sig") { ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(frame * 0.15) * 0.15})`; ctx.beginPath(); ctx.arc(x + 7, y + 7, 10, 0, 7); ctx.fill(); ctx.drawImage(ceo.sigSpr, x, y); }
    else if (it.t === "check") { // water cooler checkpoint
      const cy = Math.round(it.y) + 4; ctx.fillStyle = "#0a0a14"; ctx.fillRect(x - 1, cy - 1, 16, 30); ctx.fillStyle = "#e0e0e8"; ctx.fillRect(x, cy + 12, 14, 16);
      ctx.fillStyle = it.hit ? "#60c0ff" : "#80a0b0"; ctx.fillRect(x + 2, cy, 10, 12); ctx.fillStyle = "#c0e8ff"; ctx.fillRect(x + 4, cy + 2, 2, 6);
      if (it.hit && frame % 20 < 10) { ctx.fillStyle = "#fff"; ctx.fillRect(x + 7, cy + 4 - (frame % 10) / 2, 2, 2); }
      ctx.fillStyle = "#4060a0"; ctx.fillRect(x + 5, cy + 16, 4, 2);
    }
    else ctx.drawImage(SPR.power[it.t], x, y);
  }
  for (const e of enemies) {
    if (!e.alive) continue;
    const x = Math.round(e.x - camX), y = Math.round(e.y), f = Math.floor(e.t0 / 10) % 2;
    if (x < -40 || x > W + 40) continue;
    if (e.flash && e.flash % 4 < 2) continue;
    const img = SPR[e.t][e.t === "thrower" ? 0 : f];
    const dx = Math.round(x - (img.width - e.w) / 2), dy = y - (img.height - e.h) - 1;
    // people sprites are drawn facing left, beasts facing right; walkers and flyers don't turn
    let flipIt = false;
    if (e.t === "hopper") flipIt = e.vx > 0;
    if (e.t === "thrower") flipIt = p.x > e.x;
    if (e.t === "tank") flipIt = e.vx < 0;
    if (flipIt) { ctx.save(); ctx.translate(dx + img.width, dy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
    else ctx.drawImage(img, dx, dy);
  }
  if (boss && !boss.dead) {
    const img = SPR.boss[Math.floor(boss.t / 12) % 2], bx = Math.round(boss.x - camX) - 6, by = Math.round(boss.y + boss.h - img.height + 2);
    if (!(boss.inv > 0 && boss.inv % 6 < 3)) {
      if (p.x > boss.x) ctx.drawImage(img, bx, by); else { ctx.save(); ctx.translate(bx + img.width, by); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
    }
  }
  for (const s of eshots) { const x = Math.round(s.x - camX); if (s.arrow) { ctx.fillStyle = "#ff2020"; ctx.fillRect(x + 2, s.y, 4, 5); ctx.fillRect(x, s.y + 4, 8, 2); ctx.fillRect(x + 2, s.y + 6, 4, 2); } else ctx.drawImage(SPR.paper, x - 1, Math.round(s.y) - 1); }
  for (const s of shots) { ctx.fillStyle = s.col; ctx.fillRect(s.x - camX, s.y, s.w, s.h); ctx.fillStyle = "#fff"; ctx.fillRect(s.x - camX + 2, s.y + 2, s.w - 4, s.h - 4); }
  drawPlayer(camX);
  for (const q of parts) { if (q.s) txt(q.s, q.x - camX, q.y, q.col); else { ctx.fillStyle = q.col; ctx.fillRect(q.x - camX, q.y, 2, 2); } }
  if (flash > 0) { ctx.fillStyle = "#ffffff55"; ctx.fillRect(0, 0, W, H); flash--; }
  drawHUD();
}

function drawHUD() {
  ctx.fillStyle = "#000c"; ctx.fillRect(0, 0, W, 22);
  ctx.fillStyle = "#000"; ctx.fillRect(4, 3, 102, 8); ctx.fillStyle = "#c01010"; ctx.fillRect(5, 4, 100, 6);
  ctx.fillStyle = "#ffe020"; ctx.fillRect(5, 4, Math.max(0, p.hp) / 3 * 100, 6);
  txt(ceo.name, 4, 13, "#fff");
  const sup = 1 - p.superCd / 420;
  ctx.fillStyle = "#000"; ctx.fillRect(278, 3, 102, 8); ctx.fillStyle = sup >= 1 ? (frame % 20 < 10 ? "#40c0ff" : "#ffffff") : "#2050a0"; ctx.fillRect(279, 4, 100 * sup, 6);
  txt(sup >= 1 ? ceo.sp : "SUPER", 380, 13, sup >= 1 ? "#80e0ff" : "#8090c0", 8, "right");
  const secs = Math.max(0, Math.ceil(timer / 60));
  txt(String(secs), W / 2, 3, secs <= 30 && frame % 30 < 15 ? "#ff4040" : "#ffe060", 16, "center");
  ctx.fillStyle = "#000c"; ctx.fillRect(0, H - 13, W, 13);
  ctx.drawImage(SPR.keys[lvl], 3, H - 14);
  txt(`${keysGot}/${L.quota}`, 19, H - 10, keysGot >= L.quota ? "#80ff80" : "#fff");
  ctx.drawImage(ceo.sigSpr, 66, H - 14);
  txt(`${sigGot}/3`, 82, H - 10, "#fff");
  txt("x" + lives, 128, H - 10, "#ff8080");
  txt(`FLOOR ${lvl + 1}`, 168, H - 10, "#a0a0c0");
  txt(money(score), W - 4, H - 10, "#ffe060", 8, "right");
  if (boss && boss.active && !boss.dead) {
    txt(RIV.boss[0], W / 2, 26, "#ff6060", 8, "center");
    ctx.fillStyle = "#000"; ctx.fillRect(W / 2 - 51, 36, 102, 6); ctx.fillStyle = "#ff2020"; ctx.fillRect(W / 2 - 50, 37, boss.hp / 6 * 100, 4);
  }
}

// ---------- screens ----------
function drawLogo(cx, cy, size) { if (logo.complete && logo.naturalWidth) { ctx.imageSmoothingEnabled = true; ctx.drawImage(logo, cx - size / 2, cy - size / 2, size, size); ctx.imageSmoothingEnabled = false; } }

function titleScreen() {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { ctx.fillStyle = i % 2 ? "#300" : "#180000"; ctx.fillRect(0, i * 6 + ((st / 2) % 6), W, 3); }
  drawLogo(W / 2, 92, 172);
  if (st % 60 < 40) txt("PRESS START", W / 2, 186, "#fff", 8, "center");
  txt("ENTER / SPACE / TAP", W / 2, 198, "#a08080", 8, "center");
  if (best) txt("BEST " + money(best), W / 2, 212, "#ffe060", 8, "center");
  if (anyStart() && st > 10) { SFX.select(); Music.play("lift", 0, 100); setState("select"); }
}

function selectScreen() {
  ctx.fillStyle = "#101040"; ctx.fillRect(0, 0, W, H);
  for (let y = 0; y < H; y += 4) { ctx.fillStyle = y % 8 ? "#141450" : "#0c0c38"; ctx.fillRect(0, y, W, 2); }
  txt("SELECT YOUR CEO", W / 2, 8, "#ffe060", 16, "center");
  if (pressed.left) { sel = (sel + 7) % 8; SFX.select(); }
  if (pressed.right) { sel = (sel + 1) % 8; SFX.select(); }
  if (pressed.up || pressed.down) { sel = (sel + 4) % 8; SFX.select(); }
  const gx = 170, gy = 34, cw = 52, ch = 52;
  if (tap) {
    for (let i = 0; i < 8; i++) { const x = gx + (i % 4) * cw, y = gy + Math.floor(i / 4) * ch; if (tap.x >= x && tap.x < x + cw && tap.y >= y && tap.y < y + ch) { if (sel === i) pressed.start = true; else { sel = i; SFX.select(); } } }
    if (tap.y > 140 && tap.x > 160) pressed.start = true;
  }
  for (let i = 0; i < 8; i++) {
    const c = CEOS[i], x = gx + (i % 4) * cw, y = gy + Math.floor(i / 4) * ch;
    ctx.fillStyle = i === sel ? "#802020" : "#202060"; ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    ctx.drawImage(c.portrait, x + 8, y + 8);
    if (i === sel) { ctx.strokeStyle = st % 20 < 10 ? "#ffe060" : "#ff3030"; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4); txt("1P", x + 4, y + 4, "#ff4040"); }
  }
  const c = CEOS[sel];
  ctx.fillStyle = "#000a"; ctx.fillRect(6, 30, 156, 186);
  ctx.drawImage(c.portrait, 30, 34, 108, 108);
  txt(c.name, 84, 146, "#fff", 8, "center");
  txt(c.co, 84, 157, "#ff8080", 8, "center");
  txt(c.sp, 84, 171, "#80e0ff", 8, "center");
  txt(c.desc[0], 84, 182, "#c0c0d0", 8, "center"); txt(c.desc[1], 84, 191, "#c0c0d0", 8, "center");
  const bar = (label, v, y, col) => { txt(label, 12, y, "#ffe060"); ctx.fillStyle = "#000"; ctx.fillRect(66, y, 90, 7); ctx.fillStyle = col; ctx.fillRect(67, y + 1, (v - 0.85) / 0.3 * 88, 5); };
  bar("SPD", c.speed, 203, "#40c060"); bar("JMP", c.jump, 212, "#40c0ff");
  txt("ARCH-RIVAL:", 273, 144, "#ff8080", 8, "center");
  txt(RIVALS[c.id].boss[0], 273, 155, "#fff", 8, "center");
  if (st % 50 < 34) txt("PRESS START TO FIGHT", 273, 171, "#ffe060", 8, "center");
  txt("Z JUMP  X SUPER", 273, 185, "#a0a0c0", 8, "center");
  txt("M MUTE", 273, 195, "#a0a0c0", 8, "center");
  txt("PARODY. NOT ENDORSED.", 273, 209, "#606090", 8, "center");
  if ((pressed.start || pressed.jump) && st > 8) { ceo = CEOS[sel]; buildRivals(ceo); score = 0; lives = 3; continues = 0; SFX.fight(); lvl = 0; setState("intro"); }
}

const NEW_RIVAL = ["walker", "flyer", "hopper", "tank", "boss"];
function introScreen() {
  const th = LEVELS[lvl];
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const slide = Math.min(1, st / 25);
  ctx.fillStyle = "#601010"; ctx.fillRect(0, 22, W * slide, 136);
  ctx.fillStyle = "#401010"; ctx.fillRect(W - W * slide, 22, W * slide, 2);
  txt(`FLOOR ${lvl + 1}: ${th.name}`, W / 2, 6, "#ffe060", 8, "center");
  ctx.drawImage(ceo.portrait, 14 - (1 - slide) * 140, 34, 96, 96);
  txt(ceo.name, 62, 136, "#fff", 8, "center");
  const slot = NEW_RIVAL[lvl], rv = RIV[slot], fr = Math.floor(st / 12) % 2;
  const img = slot === "boss" ? SPR.boss[fr] : SPR[slot][fr];
  const sc = slot === "boss" ? 1.6 : 3, iw = img.width * sc, ih = img.height * sc;
  ctx.drawImage(img, Math.round(W - 66 - iw / 2 + (1 - slide) * 160), Math.round(128 - ih), Math.round(iw), Math.round(ih));
  txt(slot === "boss" ? "FINAL BOSS" : "NEW RIVAL", W - 66, 30, "#ff8080", 8, "center");
  txt(rv[0], W - 66, 136, "#fff", 8, "center");
  if (st > 20) txt("VS", W / 2, 62, st % 10 < 5 ? "#ffe060" : "#ff3030", 16, "center");
  txt(th.round, W / 2, 88, "#ff8080", 8, "center");
  txt(`COLLECT ${genQuota(lvl)} ${th.key}`, W / 2, 166, "#80ff80", 8, "center");
  txt(`FIND 3 ${ceo.sig} FOR A BONUS`, W / 2, 178, "#80e0ff", 8, "center");
  if (st > 70) txt(st < 120 ? "READY..." : "FIGHT!", W / 2, 196, st < 120 ? "#fff" : "#ff3030", 16, "center");
  if (st === 120) SFX.fight();
  if (st > 140 || (st > 30 && anyStart())) { startLevel(lvl); setState("play"); }
}
const quotaCache = {};
function genQuota(n) { return quotaCache[n] ?? (quotaCache[n] = genLevel(n).quota); }

function clearScreen() {
  if (st === 1) Music.play("lift", 0, 96);
  drawWorld();
  ctx.fillStyle = "#000c"; ctx.fillRect(30, 36, W - 60, 150);
  txt(LEVELS[lvl].win, W / 2, 46, "#ffe060", 8, "center");
  const rows = [
    [`${LEVELS[lvl].key}`, `${tally.keys}/${tally.keyCount}`],
    [ceo.sig, `${tally.sig}/3`],
    ["TIME BONUS", money(tally.timeBonus)],
    ["COMPANY VALUE", money(score)],
  ];
  rows.forEach((r, i) => { if (st > 20 + i * 15) { if (st === 21 + i * 15) SFX.coin(); txt(r[0], 50, 70 + i * 18, "#fff"); txt(r[1], W - 50, 70 + i * 18, i === 3 ? "#ffe060" : "#80ff80", 8, "right"); } });
  if (st > 90 && st % 50 < 34) txt(lvl < 4 ? "PRESS START: GOING UP" : "PRESS START", W / 2, 166, "#fff", 8, "center");
  if (st > 90 && anyStart()) { if (lvl < 4) { lvl++; setState("intro"); } else { saveBest(); setState("win"); } }
}

function saveBest() { if (score > best) { best = score; try { localStorage.setItem("ck_best", best); } catch {} } }

function rankFor(v) {
  if (v >= 1e9) return ["TRILLION CLUB LEGEND", "#ffe060"];
  if (v >= 4e8) return ["DECACORN", "#ff80ff"];
  if (v >= 1.5e8) return ["UNICORN", "#80e0ff"];
  return ["SOLID SCALE-UP", "#80ff80"];
}
function winScreen() {
  if (st === 1) Music.play("muzak", 5, 128);
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = ["#ffe060", "#ff4040", "#40c0ff", "#40ff80"][i % 4]; ctx.fillRect((i * 53 + st * (1 + i % 3)) % W, (i * 37 + st * 2) % H, 3, 3); }
  ctx.drawImage(ceo.portrait, W / 2 - 36, 14, 72, 72);
  txt(`${ceo.name} WINS!`, W / 2, 94, "#ffe060", 16, "center");
  txt(`${ceo.co} RULES THE CORPORATE JUNGLE`, W / 2, 116, "#fff", 8, "center");
  txt("FINAL COMPANY VALUE", W / 2, 136, "#c0c0d0", 8, "center");
  txt(money(score), W / 2, 148, "#ffe060", 16, "center");
  const [r, col] = rankFor(score); txt(r, W / 2, 172, col, 8, "center");
  if (continues) txt(`CONTINUES USED: ${continues}`, W / 2, 186, "#a0a0a0", 8, "center");
  if (st > 120 && st % 50 < 34) txt("PRESS START", W / 2, 204, "#fff", 8, "center");
  if (st > 120 && anyStart()) { Music.play("lift", 0, 100); setState("title"); }
}

function gameOverScreen() {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const left = 9 - Math.floor(st / 60);
  if (st % 60 === 1 && st > 60 && left >= 0) beep(600, 600, 0.08, "square", 0.05);
  ctx.globalAlpha = 0.5; ctx.drawImage(ceo.portrait, W / 2 - 40, 20, 80, 80); ctx.globalAlpha = 1;
  txt("YOU'RE FIRED!", W / 2, 106, "#ff3030", 16, "center");
  txt("CONTINUE?", W / 2, 134, "#fff", 8, "center");
  txt(String(Math.max(0, left)), W / 2, 150, "#ffe060", 16, "center");
  txt("PRESS START", W / 2, 180, "#a0a0a0", 8, "center");
  if (anyStart() && st > 20) { continues++; lives = 3; score = levelStartScore; setState("intro"); return; }
  if (left < 0) { saveBest(); Music.play("lift", 0, 100); setState("title"); }
}

// ---------- main loop ----------
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) {
    acc -= 1000 / 60;
    st++;
    if (state === "play") updatePlay();
    else if (state === "title") titleScreen();
    else if (state === "select") selectScreen();
    else if (state === "intro") introScreen();
    else if (state === "clear") clearScreen();
    else if (state === "win") winScreen();
    else if (state === "gameover") gameOverScreen();
    for (const k in pressed) delete pressed[k];
    tap = null;
  }
  if (state === "play") drawWorld();
  requestAnimationFrame(loop);
}

const params = new URLSearchParams(location.search);
(document.fonts ? document.fonts.load(`8px ${FONT}`).catch(() => {}) : Promise.resolve()).then(() => {
  build();
  if (params.has("level")) { ceo = CEOS[+params.get("ceo") || 0]; buildRivals(ceo); lvl = Math.max(0, Math.min(4, (+params.get("level") || 1) - 1)); setState("intro"); }
  requestAnimationFrame(loop);
});
