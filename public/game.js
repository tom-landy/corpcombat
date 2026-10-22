// Corporate Kombat: pick a CEO, fight through 5 levels of the corporate jungle.
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
}
addEventListener("resize", fit); fit();

// ---------- input ----------
const keys = { left: false, right: false, up: false, down: false, jump: false, special: false };
const pressed = {}; // edge-triggered this frame
const KEYMAP = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
  Space: "jump", KeyZ: "jump", KeyK: "jump", KeyX: "special", KeyJ: "special", ShiftLeft: "special", Enter: "start" };
addEventListener("keydown", e => {
  const k = KEYMAP[e.code]; if (!k) { if (e.code === "KeyM") toggleMute(); return; }
  e.preventDefault(); if (!keys[k]) pressed[k] = true; keys[k] = true; audioInit();
});
addEventListener("keyup", e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
document.querySelectorAll("#pad button").forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); if (!keys[k]) pressed[k] = true; keys[k] = true; b.classList.add("on"); audioInit(); };
  const off = e => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
  b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("pointerleave", off);
});
let tap = null;
cv.addEventListener("pointerdown", e => {
  const r = cv.getBoundingClientRect();
  tap = { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  audioInit();
});
const anyStart = () => pressed.start || pressed.jump || tap;

// ---------- sound ----------
let ac = null, muted = false;
function audioInit() { if (!ac) try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {} if (ac && ac.state === "suspended") ac.resume(); }
function toggleMute() { muted = !muted; }
function beep(f1, f2, dur, type = "square", vol = 0.08) {
  if (!ac || muted) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur);
}
const SFX = {
  jump: () => beep(300, 600, 0.12), coin: () => { beep(988, 988, 0.06); setTimeout(() => beep(1319, 1319, 0.15), 60); },
  key: () => { beep(660, 1320, 0.2, "triangle", 0.12); }, stomp: () => beep(400, 80, 0.15), hurt: () => beep(200, 60, 0.3, "sawtooth"),
  special: () => beep(150, 900, 0.35, "sawtooth", 0.07), block: () => beep(200, 300, 0.08), power: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, f, 0.1), i * 70)); },
  die: () => beep(500, 50, 0.8, "triangle", 0.15), clear: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, f, 0.15, "square", 0.1), i * 120)); },
  select: () => beep(800, 800, 0.05), fight: () => beep(100, 40, 0.6, "sawtooth", 0.15),
};

// ---------- pixel helpers ----------
function mk(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
function P(w, h) {
  const c = mk(w, h), g = c.getContext("2d");
  return {
    c, g,
    r(x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); },
    e(cx, cy, rx, ry, col) { g.fillStyle = col; for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) g.fillRect(cx + x, cy + y, 1, 1); },
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
  if (c.leather) { s.r(6, 11, 1, 5, "#505058"); }
  if (frame === 3) { s.r(3, 7, 2, 5, top); s.r(3, 6, 2, 1, skin); s.r(13, 7, 2, 5, top); s.r(13, 6, 2, 1, skin); }
  else if (frame === 1) { s.r(3, 11, 2, 4, top); s.r(2, 15, 2, 1, skin); s.r(13, 11, 2, 4, top); s.r(14, 15, 2, 1, skin); }
  else { s.r(4, 11, 2, 5, top); s.r(4, 16, 2, 1, skin); s.r(12, 11, 2, 5, top); s.r(12, 16, 2, 1, skin); }
  s.r(8, 9, 3, 1, shade(skin, 0.85));
  s.r(6, 2, 7, 7, skin); s.r(12, 3, 1, 6, shade(skin, 0.85));
  s.r(9, 5, 1, 1, "#111"); s.r(11, 5, 1, 1, "#111"); s.r(10, 7, 2, 1, "#a05050");
  if (c.glasses) { s.r(8, 4, 5, 1, c.glasses); s.r(8, 5, 1, 1, c.glasses); s.r(12, 5, 1, 1, c.glasses); }
  drawHairSmall(s, c);
  return outline(s.c);
}

// 34x34 select-screen portrait, facing the viewer
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

// ---------- other sprites ----------
const SPR = {};
function build() {
  for (const c of CEOS) {
    c.frames = [0, 1, 2, 3].map(f => personSprite(c, f)); c.framesL = c.frames.map(flip); c.portrait = portrait(c);
  }
  const copyCat = { skin: "#d8b090", hair: "short", hc: "#202020", top: "#606070", inner: "#e0e0e0", bottom: "#404050", glasses: "#000" };
  SPR.copy = [1, 2].map(f => flip(personSprite(copyCat, f)));
  const lawyer = { skin: "#e8c0a0", hair: "short", hc: "#605040", top: "#141c38", inner: "#e0e0e0", bottom: "#141c38" };
  SPR.lawyer = flip(personSprite(lawyer, 0));
  // red tape roll
  SPR.tape = [0, 1].map(f => { const s = P(18, 16); s.e(9, 7, 7, 6, "#d01818"); s.e(9, 7, 4, 3, "#ff5050"); s.e(9, 7, 2, 1, "#300"); s.r(4, 4, 3, 1, "#000"); s.r(11, 4, 3, 1, "#000"); s.r(5, 5, 1, 1, "#fff"); s.r(12, 5, 1, 1, "#fff"); s.r(f ? 4 : 6, 13, 3, 2, "#601010"); s.r(f ? 11 : 9, 13, 3, 2, "#601010"); return outline(s.c); });
  // spam email
  SPR.spam = [0, 1].map(f => { const s = P(20, 16); s.r(4, 4, 12, 9, "#f0f0f0"); s.r(4, 4, 12, 1, "#c0c0c8"); for (let i = 0; i < 6; i++) { s.r(4 + i, 5 + i, 1, 1, "#a0a0b0"); s.r(15 - i, 5 + i, 1, 1, "#a0a0b0"); } s.r(9, 9, 2, 2, "#e02020"); if (f) { s.r(0, 2, 4, 3, "#ffe060"); s.r(16, 2, 4, 3, "#ffe060"); } else { s.r(0, 8, 4, 3, "#ffe060"); s.r(16, 8, 4, 3, "#ffe060"); } return outline(s.c); });
  // bear market
  SPR.bear = [0, 1].map(f => { const s = P(26, 22); s.e(13, 12, 10, 7, "#7a4a28"); s.e(19, 7, 5, 5, "#7a4a28"); s.r(16, 1, 3, 3, "#7a4a28"); s.r(21, 1, 3, 3, "#7a4a28"); s.r(21, 6, 1, 1, "#000"); s.r(23, 8, 3, 2, "#3a2010"); s.r(10, 10, 3, 5, "#e02020"); s.r(9, 13, 5, 1, "#e02020"); s.r(10, 14, 3, 1, "#e02020"); s.r(11, 15, 1, 1, "#e02020"); s.r(f ? 4 : 6, 17, 4, 4, "#5a3418"); s.r(f ? 17 : 15, 17, 4, 4, "#5a3418"); return outline(s.c); });
  SPR.brief = (() => { const s = P(10, 8); s.r(1, 2, 8, 5, "#6a3a18"); s.r(3, 0, 4, 2, "#3a2010"); s.r(4, 1, 2, 1, "#000"); s.r(4, 4, 2, 1, "#e0c040"); return outline(s.c); })();
  // boss: the market crash
  SPR.boss = [0, 1].map(f => { const s = P(54, 46); s.e(27, 27, 22, 15, "#5a3418"); s.e(37, 14, 11, 10, "#6a4020"); s.r(29, 3, 6, 6, "#6a4020"); s.r(42, 3, 6, 6, "#6a4020"); s.r(38, 11, 2, 2, "#ff2020"); s.r(43, 11, 2, 2, "#ff2020"); s.r(36, 9, 5, 1, "#000"); s.r(42, 9, 5, 1, "#000"); s.e(44, 19, 5, 3, "#3a2010"); s.r(40, 22, 8, 1, "#fff"); s.r(26, 18, 4, 3, "#e8e8f0"); s.r(27, 21, 2, 12, "#c01818"); s.r(26, 32, 4, 2, "#c01818");
    s.r(10, 22, 3, 8, "#e02020"); s.r(7, 28, 9, 2, "#e02020"); s.r(9, 30, 5, 2, "#e02020"); s.r(10, 32, 3, 2, "#e02020");
    s.r(f ? 8 : 12, 38, 8, 7, "#3a2010"); s.r(f ? 34 : 30, 38, 8, 7, "#3a2010"); return outline(s.c); });
  // items
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
  for (const c of CEOS) c.sigSpr = sigSprite(c);
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

// ---------- levels ----------
const LEVELS = [
  { name: "THE GARAGE", round: "SEED ROUND", key: "BIG IDEAS", time: 200, sky: ["#2a1a4a", "#a04060", "#f08040"], ground: "#6a4a2a", top: "#40a040", far: "#3a2040", near: "#5a2a4a", win: "SEED ROUND CLOSED!" },
  { name: "OFFICE PARK", round: "SERIES A", key: "NEW HIRES", time: 200, sky: ["#2060c0", "#50a0e0", "#a0d8f0"], ground: "#5a5a68", top: "#8a8a98", far: "#7090b8", near: "#4a6890", win: "SERIES A RAISED!" },
  { name: "THE FACTORY", round: "SCALE-UP", key: "PRODUCTS", time: 220, sky: ["#201828", "#503850", "#906070"], ground: "#4a4048", top: "#c0a030", far: "#3a2e3a", near: "#2a2028", win: "FACTORY AT FULL TILT!" },
  { name: "WALL STREET", round: "THE IPO", key: "INVESTORS", time: 220, sky: ["#050818", "#101838", "#202860"], ground: "#303040", top: "#9090a8", far: "#181c38", near: "#0c0e20", win: "IPO! THE BELL RINGS!" },
  { name: "GLOBAL HQ", round: "HOSTILE TAKEOVER", key: "CUSTOMERS", time: 260, sky: ["#200000", "#601010", "#c03020"], ground: "#2a1818", top: "#e04030", far: "#401010", near: "#200808", win: "THE MARKET CRASH IS BEATEN!" },
];

function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }

// Tile codes: 0 air, 1 ground, 2 brick, 3 deal block, 4 used block, 5 spikes
function genLevel(n) {
  const R = rng(7919 + n * 104729), ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const cols = 170 + n * 30, map = new Uint8Array(cols * ROWS);
  const set = (x, y, v) => { if (x >= 0 && x < cols && y >= 0 && y < ROWS) map[y * cols + x] = v; };
  const items = [], enemies = [], sigSpots = [];
  let x = 0, surf = 11;
  const ground = (x0, len, s) => { for (let i = x0; i < x0 + len; i++) for (let y = s; y < ROWS; y++) set(i, y, 1); };
  const coinRow = (x0, len, y) => { for (let i = 0; i < len; i++) items.push({ t: "coin", x: (x0 + i) * T + 2, y: y * T + 2 }); };
  const key = (tx, ty) => items.push({ t: "key", x: tx * T + 1, y: ty * T + 1 });
  const enemyFor = () => { const pool = ["tape"]; if (n >= 1) pool.push("spam", "tape"); if (n >= 2) pool.push("copy", "spam"); if (n >= 3) pool.push("bear", "copy"); if (n >= 4) pool.push("bear"); return pool[ri(0, pool.length - 1)]; };
  const addEnemy = (tx, s) => { const t = enemyFor(); enemies.push({ t, x: tx * T, y: t === "spam" ? (s - ri(2, 3)) * T : (s - 1) * T - 8 }); };

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
      const ns = Math.max(7, Math.min(11, surf + (R() < 0.5 ? -1 : 1) * ri(1, 2)));
      surf = ns; const len = ri(4, 7); ground(x, len, surf); coinRow(x + 1, len - 2, surf - 2); if (R() < 0.4 + n * 0.1) addEnemy(x + len - 2, surf); x += len;
    } else if (roll < 0.52) { // block row with deal blocks
      const len = ri(8, 11); ground(x, len, surf); const by = surf - 4;
      for (let i = 2; i < 7; i++) set(x + i, by, (i === 3 || i === 5) ? 3 : 2);
      coinRow(x + 2, 5, by - 1); if (R() < 0.6) key(x + 4, by - 2); else sigSpots.push([x + 4, by - 3]);
      if (R() < 0.5 + n * 0.12) addEnemy(x + len - 2, surf); x += len;
    } else if (roll < 0.66 && n >= 1) { // pit with floating platforms
      const pits = ri(2, 3), py = surf - ri(1, 3);
      for (let p = 0; p < pits; p++) {
        const g = ri(2, Math.min(3, maxGap)); x += g;
        for (let i = 0; i < 3; i++) set(x + i, py, 2);
        coinRow(x, 3, py - 1); if (p === 1) key(x + 1, py - 3);
        if (n >= 3 && R() < 0.4) enemies.push({ t: "spam", x: x * T, y: (py - 3) * T });
        x += 3;
      }
      x += 0; const g2 = ri(2, Math.min(3, maxGap)); x += g2; const len = ri(4, 6); ground(x, len, surf); x += len;
    } else if (roll < 0.78 && n >= 1) { // spikes: market crash arrows
      const len = ri(9, 12); ground(x, len, surf);
      let i = 2; while (i < len - 2) { const sw = ri(1, Math.min(3, 1 + n)); for (let k = 0; k < sw; k++) set(x + i + k, surf - 1, 5); items.push({ t: "coin", x: (x + i) * T + 2, y: (surf - 4) * T }); i += sw + ri(2, 3); }
      sigSpots.push([x + Math.floor(len / 2), surf - 6]); x += len;
    } else if (roll < 0.86 && n >= 3) { // lawyer on a ledge
      const len = ri(7, 9); ground(x, len, surf); for (let i = 0; i < 3; i++) set(x + len - 3 + i, surf - 3, 2);
      enemies.push({ t: "lawyer", x: (x + len - 2) * T, y: (surf - 3) * T - 24 }); key(x + 2, surf - 3); x += len;
    } else { // flat run with enemies
      const len = ri(6, 10); ground(x, len, surf); coinRow(x + 2, 3, surf - 3);
      const count = 1 + (R() < n * 0.2 ? 1 : 0); for (let e = 0; e < count; e++) addEnemy(x + 3 + e * 3, surf);
      if (R() < 0.35) key(x + len - 2, surf - 2); x += len;
    }
    if (x - sinceEnemy > 25 && enemies.length && enemies[enemies.length - 1].x < sinceEnemy * T) { addEnemy(x - 2, surf); }
    sinceEnemy = x;
  }
  // finale: back to a safe height, then arena/exit
  surf = 11; ground(x, cols - x, surf);
  for (let y = 0; y < ROWS; y++) set(cols - 1, y, 1);
  let boss = null;
  if (n === 4) { boss = { x: (cols - 12) * T, y: (surf * T) - 46, arena: (cols - 26) * T }; }
  else coinRow(x + 3, 6, surf - 3);
  const exit = { x: (cols - 5) * T, y: (surf - 3) * T };
  // signature items: 3 in the hardest spots
  for (let i = 0; i < 3; i++) {
    const s = sigSpots.length ? sigSpots.splice(Math.floor(R() * sigSpots.length), 1)[0] : [Math.floor(cols * (i + 1) / 4), 3];
    items.push({ t: "sig", x: s[0] * T + 1, y: s[1] * T });
  }
  // no enemies on top of the start
  const keyCount = items.filter(i => i.t === "key").length;
  const quota = Math.max(3, Math.floor(keyCount * (0.55 + n * 0.06)));
  return { n, cols, map, items, enemies: enemies.filter(e => e.x > 18 * T), exit, boss, quota, keyCount };
}

// ---------- game state ----------
let state = "title", st = 0; // st: frames in current state
let sel = 0, ceo = CEOS[0];
let L = null, lvl = 0, score = 0, lives = 3, levelStartScore = 0, best = 0;
let p, cam = 0, items, enemies, shots, eshots, parts, boss, timer, frame = 0, checkpoint, keysGot, sigGot, tally, flash = 0, shake = 0, continues = 0;
let tiles = {};
try { best = +localStorage.getItem("ck_best") || 0; } catch {}
const logo = new Image(); logo.src = "logo.webp";

function setState(s) { state = s; st = 0; }

function tileSet(th) {
  const g = (f) => { const s = P(T, T); f(s); return s.c; };
  return {
    1: g(s => { s.r(0, 0, T, T, th.ground); for (let i = 0; i < 6; i++) s.r((i * 7) % 14, 4 + (i * 5) % 11, 2, 1, shade(th.ground, 0.75)); }),
    top: g(s => { s.r(0, 0, T, T, th.ground); s.r(0, 0, T, 4, th.top); s.r(0, 4, T, 1, shade(th.top, 0.6)); for (let i = 0; i < 4; i++) s.r(i * 4 + 1, 1, 1, 1, shade(th.top, 1.3)); }),
    2: g(s => { s.r(0, 0, T, T, shade(th.top, 0.7)); s.r(0, 7, T, 1, shade(th.top, 0.4)); s.r(0, 15, T, 1, shade(th.top, 0.4)); s.r(7, 0, 1, 7, shade(th.top, 0.4)); s.r(3, 8, 1, 7, shade(th.top, 0.4)); s.r(11, 8, 1, 7, shade(th.top, 0.4)); s.r(0, 0, T, 1, shade(th.top, 1.1)); }),
    3: g(s => { s.r(0, 0, T, T, "#f0b020"); s.r(0, 0, T, 1, "#ffe080"); s.r(0, 15, T, 1, "#804000"); s.r(15, 0, 1, T, "#804000"); s.r(6, 3, 4, 10, "#fff"); s.r(5, 5, 6, 1, "#fff"); s.r(5, 9, 6, 1, "#fff"); s.r(7, 4, 2, 8, "#c07000"); }),
    4: g(s => { s.r(0, 0, T, T, "#806040"); s.r(0, 0, T, 1, "#a08060"); s.r(0, 15, T, 1, "#402010"); s.r(2, 2, 1, 1, "#402010"); s.r(13, 2, 1, 1, "#402010"); s.r(2, 13, 1, 1, "#402010"); s.r(13, 13, 1, 1, "#402010"); }),
    5: g(s => { for (let i = 0; i < 2; i++) { const x0 = i * 8; s.r(x0 + 1, 6, 6, 10, "#e02020"); s.r(x0 + 2, 6, 4, 2, "#ff8080"); s.r(x0 + 3, 2, 2, 4, "#e02020"); } s.r(0, 15, T, 1, "#600"); }),
  };
}

function startLevel(n, fromCheckpoint) {
  lvl = n; L = genLevel(n); tiles = tileSet(LEVELS[n]);
  items = L.items.map(i => ({ ...i, alive: true, bob: Math.random() * 6 }));
  enemies = L.enemies.map(e => newEnemy(e.t, e.x, e.y));
  shots = []; eshots = []; parts = [];
  boss = L.boss ? { x: L.boss.x, y: L.boss.y, w: 44, h: 40, vx: 0, vy: 0, hp: 6, inv: 0, t: 0, active: false, dead: false, arena: L.boss.arena } : null;
  keysGot = 0; sigGot = 0; timer = LEVELS[n].time * 60; checkpoint = { x: 3 * T, y: 9 * T };
  if (!fromCheckpoint) levelStartScore = score;
  spawnPlayer();
}
function newEnemy(t, x, y) {
  const base = { t, x, y, vx: 0, vy: 0, hp: 1, alive: true, t0: Math.random() * 100, w: 14, h: 14, by: y, cd: 60 + Math.random() * 60 };
  const sp = 1 + lvl * 0.15;
  if (t === "tape") Object.assign(base, { w: 14, h: 14, vx: -0.45 * sp });
  if (t === "spam") Object.assign(base, { w: 16, h: 12, vx: -0.6 * sp });
  if (t === "copy") Object.assign(base, { w: 10, h: 22, vx: -0.9 * sp });
  if (t === "bear") Object.assign(base, { w: 22, h: 18, vx: -0.6 * sp, hp: 2 });
  if (t === "lawyer") Object.assign(base, { w: 10, h: 22, vx: 0 });
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
  e.alive = false; SFX.stomp(); burst(e.x + e.w / 2, e.y + e.h / 2, e.t === "tape" ? "#ff4040" : "#e0e0e0", 10);
  addScore(stomp ? 25000 : 15000, e.x, e.y - 8);
}
function damageBoss() {
  if (!boss || boss.inv > 0 || boss.dead) return;
  boss.hp--; boss.inv = 70; shake = 10; SFX.stomp(); burst(boss.x + 22, boss.y + 10, "#ff2020", 16, 3);
  if (boss.hp <= 0) { boss.dead = true; addScore(1000000, boss.x, boss.y); SFX.clear(); burst(boss.x + 22, boss.y + 20, "#ffe060", 40, 4); }
}

function collect(it) {
  it.alive = false;
  if (it.t === "coin") { addScore(10000); SFX.coin(); score; }
  else if (it.t === "key") { keysGot++; addScore(50000, it.x, it.y - 6); SFX.key(); burst(it.x + 6, it.y + 6, "#ffe060", 8); }
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
  } else if (tileAt(tx, ty) === 2) { SFX.block(); }
  for (const e of enemies) if (e.alive && e.x < (tx + 1) * T && e.x + e.w > tx * T && Math.abs(e.y + e.h - ty * T) < 4) killEnemy(e);
}

// ---------- update ----------
function updatePlay() {
  frame++;
  if (p.dead) {
    p.dead++; p.vy += 0.3; p.y += p.vy;
    if (p.dead > 100) {
      lives--;
      if (lives <= 0) { setState("gameover"); return; }
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
  if (p.jbuf > 0 && p.coyote > 0) { p.vy = -6.3 * ceo.jump; p.jbuf = 0; p.coyote = 0; SFX.jump(); }
  if (!(keys.jump || keys.up) && p.vy < -2.5 && p.rocket <= 0) p.vy = -2.5;
  if (pressed.special) useSpecial();
  p.vy = Math.min(7, p.vy + (p.rocket > 0 ? 0.18 : 0.32));
  if (p.rocket > 0) { p.rocket--; parts.push({ x: p.x + 5, y: p.y + 22, vx: (Math.random() - 0.5), vy: 2, life: 15, col: Math.random() < 0.5 ? "#ff9020" : "#ffe060" }); }
  // keep inside the boss arena once the fight starts
  move(p, bumpBlock);
  if (boss && boss.active && !boss.dead && p.x < boss.arena) { p.x = boss.arena; p.vx = 0; }
  if (p.x < 0) p.x = 0;
  for (const k of ["ghost", "shield", "magnet", "coffee", "inv", "superCd"]) if (p[k] > 0) p[k]--;
  if (p.vx !== 0 && p.ground) p.anim += Math.abs(p.vx) * 0.08;
  if (p.y > ROWS * T + 10) { die(); return; }
  // spikes
  const sx0 = Math.floor((p.x + 2) / T), sx1 = Math.floor((p.x + p.w - 3) / T), sy = Math.floor((p.y + p.h - 2) / T);
  for (let x = sx0; x <= sx1; x++) if (tileAt(x, sy) === 5) { if (p.dash > 0 || p.rocket > 0) {} else { if (p.inv <= 0 && p.ghost <= 0 && p.shield <= 0) { p.hp = 0; p.inv = 0; } hurt(); if (p.hp > 0) p.vy = -5; } }

  // camera
  const target = boss && boss.active && !boss.dead ? boss.arena : p.x - 140;
  cam += (Math.max(0, Math.min(L.cols * T - W, target)) - cam) * 0.15;

  timer--; if (timer <= 0) { p.hp = 0; die(); }
  if (timer === 30 * 60) beep(880, 880, 0.3);

  // items
  for (const it of items) {
    if (!it.alive) continue;
    if (it.pop) { it.vy += 0.2; it.y += it.vy; if (it.vy > 0) { const ty = Math.floor((it.y + 12) / T); if (solid(tileAt(Math.floor((it.x + 6) / T), ty))) { it.y = ty * T - 12; it.vy = 0; } } }
    if (it.t === "check") { if (!it.hit && p.x > it.x) { it.hit = true; checkpoint = { x: it.x, y: it.y - 8 }; SFX.power(); popText(it.x - 10, it.y - 10, "CHECKPOINT", "#80ff80"); } continue; }
    const box = { x: it.x, y: it.y, w: 12, h: 12 };
    if (p.magnet > 0 && it.t !== "life") { const dx = p.x - it.x, dy = p.y + 8 - it.y, d = Math.hypot(dx, dy); if (d < 120) { it.x += dx / d * 4; it.y += dy / d * 4; } }
    if (hits(p, box)) collect(it);
  }

  // enemies
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.x > cam + W + 48 || e.x < cam - 64) continue;
    e.t0++; if (e.flash > 0) e.flash--;
    if (e.t === "spam") { e.x += e.vx; e.y = e.by + Math.sin(e.t0 * 0.06) * 14; }
    else if (e.t === "lawyer") {
      e.vy = Math.min(7, e.vy + 0.32); move(e);
      if (--e.cd <= 0 && Math.abs(e.x - p.x) < 260) { e.cd = 130 - lvl * 10; const dir = p.x < e.x ? -1 : 1; eshots.push({ x: e.x, y: e.y + 4, vx: dir * (1.4 + Math.abs(p.x - e.x) / 120), vy: -4, w: 8, h: 6, life: 200, grav: true }); }
    } else {
      e.vy = Math.min(7, e.vy + 0.32);
      if (e.t === "bear" && Math.abs(p.x - e.x) < 90 && Math.abs(p.y - e.y) < 30) e.vx = Math.sign(p.x - e.x) * 1.6 * (1 + lvl * 0.1);
      if (e.t === "copy" && e.ground && Math.random() < 0.01 + lvl * 0.004) e.vy = -5;
      const hit = move(e);
      if (hit) e.vx = -(e.vx || -0.5);
      // turn at ledges
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

  // boss
  if (boss && !boss.dead) {
    if (!boss.active && p.x > boss.arena + 40) { boss.active = true; SFX.fight(); shake = 20; }
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

  // shots
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

  // exit
  const open = keysGot >= L.quota && (!boss || boss.dead);
  if (open && hits(p, { x: L.exit.x, y: L.exit.y, w: 24, h: 48 })) {
    SFX.clear();
    const timeBonus = Math.floor(timer / 60) * 5000 * (1 + lvl);
    tally = { keys: keysGot, keyCount: L.keyCount, sig: sigGot, timeBonus };
    score += timeBonus; setState("clear");
  } else if (!open && hits(p, { x: L.exit.x - 4, y: L.exit.y, w: 28, h: 48 }) && frame % 60 === 0) {
    popText(L.exit.x - 30, L.exit.y - 12, boss && !boss.dead ? "BEAT THE BOSS!" : `NEED ${L.quota - keysGot} MORE ${LEVELS[lvl].key}`, "#ff6060");
  }
}

// ---------- drawing ----------
function drawBackground(th, camX) {
  const [a, b, c] = th.sky;
  const grd = ctx.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, a); grd.addColorStop(0.6, b); grd.addColorStop(1, c);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  if (lvl === 0) { ctx.fillStyle = "#ffd060"; ctx.beginPath(); ctx.arc(300, 150, 34, 0, 7); ctx.fill(); }
  if (lvl === 3) for (let i = 0; i < 40; i++) { ctx.fillStyle = "#fff"; ctx.fillRect((i * 97 + 13) % W, (i * 53) % 110, 1, 1); }
  // far layer
  for (let layer = 0; layer < 2; layer++) {
    const sp = layer ? 0.5 : 0.25, bw = layer ? 44 : 34, col = layer ? th.near : th.far;
    const off = (camX * sp) % bw, start = Math.floor(camX * sp / bw);
    for (let i = -1; i < W / bw + 2; i++) {
      const idx = start + i, h = 40 + ((idx * 2654435761) >>> 0) % (layer ? 70 : 90), x = i * bw - off;
      const y = H - 40 - h + (layer ? 20 : 0);
      ctx.fillStyle = col;
      if (lvl === 2 && idx % 3 === 0) { ctx.fillRect(x + 6, y - 30, 8, 30); if (layer) { ctx.fillStyle = "#6a5a6a55"; ctx.beginPath(); ctx.arc(x + 10 + Math.sin(frame / 30 + idx) * 3, y - 40 - (frame / 2 + idx * 20) % 30, 6, 0, 7); ctx.fill(); ctx.fillStyle = col; } }
      if (lvl === 0) { ctx.fillRect(x, y + 30, bw - 4, h); ctx.beginPath(); ctx.moveTo(x - 2, y + 30); ctx.lineTo(x + bw / 2 - 2, y + 14); ctx.lineTo(x + bw - 2, y + 30); ctx.fill(); }
      else ctx.fillRect(x, y, bw - 4, h + 40);
      if (layer && lvl !== 0) { ctx.fillStyle = lvl >= 3 ? "#ffe08066" : "#ffffff33"; for (let wy = y + 6; wy < H - 30; wy += 10) for (let wx = x + 4; wx < x + bw - 8; wx += 8) if (((wx * 7 + wy * 13 + idx) % 5) < 2) ctx.fillRect(wx, wy, 4, 5); }
    }
  }
  if (lvl === 3) { ctx.fillStyle = "#000a"; ctx.fillRect(0, 24, W, 10); ctx.font = `8px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "top"; const tick = "CK +12.4%  ▲  BEAR -3.1% ▼  BULL +8.8% ▲  IPO +44% ▲  "; const tw = ctx.measureText(tick).width; const ox = -((frame * 0.7) % tw); for (let k = 0; k < 3; k++) { ctx.fillStyle = "#40ff60"; ctx.fillText(tick, ox + k * tw, 25); } }
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

function drawWorld() {
  const th = LEVELS[lvl];
  const camX = Math.round(cam + (shake > 0 ? (Math.random() - 0.5) * shake : 0)); if (shake > 0) shake *= 0.85, shake < 0.5 && (shake = 0);
  drawBackground(th, camX);
  drawTiles(camX);
  // exit door
  const open = keysGot >= L.quota && (!boss || boss.dead), ex = L.exit.x - camX, ey = L.exit.y;
  ctx.fillStyle = "#202028"; ctx.fillRect(ex - 3, ey - 3, 30, 51);
  ctx.fillStyle = open ? (frame % 20 < 10 ? "#40ff80" : "#20c060") : "#c02020"; ctx.fillRect(ex, ey, 24, 48);
  ctx.fillStyle = "#ffe060"; ctx.fillRect(ex + 18, ey + 24, 3, 3);
  txt(lvl === 3 ? "IPO" : "EXIT", ex + 12, ey - 13, open ? "#80ff80" : "#ff8080", 8, "center");
  for (const it of items) {
    if (!it.alive) continue;
    const x = Math.round(it.x - camX), bob = Math.round(Math.sin(frame * 0.08 + it.bob) * 2), y = Math.round(it.y) + (it.pop ? 0 : bob);
    if (x < -20 || x > W + 20) continue;
    if (it.t === "coin") ctx.drawImage(SPR.coin[[0, 1, 2, 1][Math.floor(frame / 8 + it.bob) % 4]], x, y);
    else if (it.t === "key") ctx.drawImage(SPR.keys[lvl], x, y);
    else if (it.t === "sig") { ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.sin(frame * 0.15) * 0.15})`; ctx.beginPath(); ctx.arc(x + 7, y + 7, 10, 0, 7); ctx.fill(); ctx.drawImage(ceo.sigSpr, x, y); }
    else if (it.t === "check") { ctx.fillStyle = "#c0c0c0"; ctx.fillRect(x, y - 8, 2, 40); ctx.fillStyle = it.hit ? "#40ff60" : "#808080"; ctx.fillRect(x + 2, y - 8, 14, 9); }
    else ctx.drawImage(SPR.power[it.t], x, y);
  }
  for (const e of enemies) {
    if (!e.alive) continue;
    const x = Math.round(e.x - camX), y = Math.round(e.y), f = Math.floor(e.t0 / 10) % 2;
    if (x < -40 || x > W + 40) continue;
    if (e.flash && e.flash % 4 < 2) continue;
    const L2 = e.vx > 0;
    let img;
    if (e.t === "tape") img = SPR.tape[f]; else if (e.t === "spam") img = SPR.spam[f]; else if (e.t === "copy") img = SPR.copy[f];
    else if (e.t === "bear") img = SPR.bear[f]; else img = SPR.lawyer;
    if (L2 || (e.t === "lawyer" && p.x > e.x)) { ctx.save(); ctx.translate(x + img.width / 2, 0); ctx.scale(-1, 1); ctx.drawImage(img, -img.width / 2 + (e.w - img.width) / 2 * 0, y - (img.height - e.h) - 1 + 0); ctx.restore(); }
    else ctx.drawImage(img, x - (img.width - e.w) / 2, y - (img.height - e.h) - 1);
  }
  if (boss && !boss.dead) {
    const img = SPR.boss[Math.floor(boss.t / 12) % 2], bx = Math.round(boss.x - camX) - 5, by = Math.round(boss.y) - 6;
    if (!(boss.inv > 0 && boss.inv % 6 < 3)) {
      if (p.x > boss.x) ctx.drawImage(img, bx, by); else { ctx.save(); ctx.translate(bx + img.width, by); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
    }
  }
  for (const s of eshots) { const x = s.x - camX; if (s.arrow) { ctx.fillStyle = "#ff2020"; ctx.fillRect(x + 2, s.y, 4, 5); ctx.fillRect(x, s.y + 4, 8, 2); ctx.fillRect(x + 2, s.y + 6, 4, 2); } else ctx.drawImage(SPR.brief, x - 1, s.y - 1); }
  for (const s of shots) { ctx.fillStyle = s.col; ctx.fillRect(s.x - camX, s.y, s.w, s.h); ctx.fillStyle = "#fff"; ctx.fillRect(s.x - camX + 2, s.y + 2, s.w - 4, s.h - 4); }
  drawPlayer(camX);
  for (const q of parts) { if (q.s) txt(q.s, q.x - camX, q.y, q.col); else { ctx.fillStyle = q.col; ctx.fillRect(q.x - camX, q.y, 2, 2); } }
  if (flash > 0) { ctx.fillStyle = "#ffffff55"; ctx.fillRect(0, 0, W, H); flash--; }
  drawHUD();
}

function drawHUD() {
  ctx.fillStyle = "#0008"; ctx.fillRect(0, 0, W, 22);
  // health bar, fighting-game style
  ctx.fillStyle = "#000"; ctx.fillRect(4, 3, 102, 8); ctx.fillStyle = "#c01010"; ctx.fillRect(5, 4, 100, 6);
  ctx.fillStyle = "#ffe020"; ctx.fillRect(5, 4, Math.max(0, p.hp) / 3 * 100, 6);
  txt(ceo.name, 4, 13, "#fff");
  // super meter
  const sup = 1 - p.superCd / 420;
  ctx.fillStyle = "#000"; ctx.fillRect(278, 3, 102, 8); ctx.fillStyle = sup >= 1 ? (frame % 20 < 10 ? "#40c0ff" : "#ffffff") : "#2050a0"; ctx.fillRect(279, 4, 100 * sup, 6);
  txt(sup >= 1 ? "SUPER READY" : "SUPER", 380, 13, sup >= 1 ? "#80e0ff" : "#8090c0", 8, "right");
  // timer
  const secs = Math.max(0, Math.ceil(timer / 60));
  txt(String(secs), W / 2, 3, secs <= 30 && frame % 30 < 15 ? "#ff4040" : "#ffe060", 16, "center");
  // bottom strip
  ctx.fillStyle = "#0008"; ctx.fillRect(0, H - 13, W, 13);
  ctx.drawImage(SPR.keys[lvl], 3, H - 14);
  txt(`${keysGot}/${L.quota}`, 19, H - 10, keysGot >= L.quota ? "#80ff80" : "#fff");
  ctx.drawImage(ceo.sigSpr, 66, H - 14);
  txt(`${sigGot}/3`, 82, H - 10, "#fff");
  txt("x" + lives, 128, H - 10, "#ff8080");
  txt(money(score), W - 4, H - 10, "#ffe060", 8, "right");
  if (boss && boss.active && !boss.dead) {
    txt("THE MARKET CRASH", W / 2, 26, "#ff6060", 8, "center");
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
  if (anyStart() && st > 10) { SFX.select(); setState("select"); }
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
    if (tap.y > 150 && tap.x > 160) pressed.start = true;
  }
  for (let i = 0; i < 8; i++) {
    const c = CEOS[i], x = gx + (i % 4) * cw, y = gy + Math.floor(i / 4) * ch;
    ctx.fillStyle = i === sel ? "#802020" : "#202060"; ctx.fillRect(x + 2, y + 2, cw - 4, ch - 4);
    ctx.drawImage(c.portrait, x + 8, y + 8);
    if (i === sel) { ctx.strokeStyle = st % 20 < 10 ? "#ffe060" : "#ff3030"; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, cw - 4, ch - 4); txt("1P", x + 4, y + 4, "#ff4040"); }
  }
  const c = CEOS[sel];
  ctx.fillStyle = "#000a"; ctx.fillRect(6, 30, 156, 186);
  ctx.save(); ctx.drawImage(c.portrait, 30, 34, 108, 108); ctx.restore();
  txt(c.name, 84, 146, "#fff", 8, "center");
  txt(c.co, 84, 157, "#ff8080", 8, "center");
  txt(c.sp, 84, 171, "#80e0ff", 8, "center");
  txt(c.desc[0], 84, 182, "#c0c0d0", 8, "center"); txt(c.desc[1], 84, 191, "#c0c0d0", 8, "center");
  const bar = (label, v, y) => { txt(label, 12, y, "#ffe060"); ctx.fillStyle = "#000"; ctx.fillRect(66, y, 90, 7); ctx.fillStyle = "#40c060"; ctx.fillRect(67, y + 1, (v - 0.85) / 0.3 * 88, 5); };
  bar("SPD", c.speed, 203);
  txt("JMP", 12, 212 - 0, "#ffe060"); ctx.fillStyle = "#000"; ctx.fillRect(66, 211, 90, 7); ctx.fillStyle = "#40c0ff"; ctx.fillRect(67, 212, (c.jump - 0.85) / 0.3 * 88, 5);
  txt(st % 50 < 34 ? "PRESS START TO FIGHT" : "", 273, 150, "#fff", 8, "center");
  txt("ARROWS/WASD MOVE", 273, 166, "#a0a0c0", 8, "center");
  txt("Z/SPACE JUMP", 273, 177, "#a0a0c0", 8, "center");
  txt("X SUPER  M MUTE", 273, 188, "#a0a0c0", 8, "center");
  ctx.font = `8px ${FONT}`; txt("PARODY. NOT ENDORSED.", 273, 208, "#606090", 8, "center");
  if ((pressed.start || pressed.jump) && st > 8) { ceo = CEOS[sel]; score = 0; lives = 3; continues = 0; SFX.fight(); lvl = 0; setState("intro"); }
}

function introScreen() {
  const th = LEVELS[lvl];
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const slide = Math.min(1, st / 25);
  ctx.fillStyle = "#601010"; ctx.fillRect(0, 40, W * slide, 120);
  ctx.drawImage(ceo.portrait, 20 - (1 - slide) * 140, 54, 90, 90);
  txt(`STAGE ${lvl + 1}`, W / 2 + 30, 50, "#ffe060", 16, "center");
  txt(th.name, W / 2 + 30, 74, "#fff", 16, "center");
  txt(th.round, W / 2 + 30, 98, "#ff8080", 8, "center");
  txt(`COLLECT ${genQuota(lvl)} ${th.key}`, W / 2 + 30, 116, "#80ff80", 8, "center");
  txt(`FIND 3 ${ceo.sig} FOR BONUS`, W / 2 + 30, 128, "#80e0ff", 8, "center");
  if (lvl === 4) txt("BOSS: THE MARKET CRASH", W / 2 + 30, 142, "#ff4040", 8, "center");
  if (st > 70) txt(st < 120 ? "READY..." : "FIGHT!", W / 2, 176, st < 120 ? "#fff" : "#ff3030", 16, "center");
  if (st === 120) SFX.fight();
  if (st > 140 || (st > 30 && anyStart())) { startLevel(lvl); setState("play"); }
}
const quotaCache = {};
function genQuota(n) { return quotaCache[n] ?? (quotaCache[n] = genLevel(n).quota); }

function clearScreen() {
  drawWorld();
  ctx.fillStyle = "#000c"; ctx.fillRect(30, 36, W - 60, 150);
  txt(LEVELS[lvl].win, W / 2, 46, "#ffe060", 8, "center");
  const rows = [
    [`${LEVELS[lvl].key}`, `${tally.keys}/${tally.keyCount}`],
    [ceo.sig, `${tally.sig}/3`],
    ["TIME BONUS", money(tally.timeBonus)],
    ["COMPANY VALUE", money(score)],
  ];
  rows.forEach((r, i) => { if (st > 20 + i * 15) { txt(r[0], 50, 70 + i * 18, "#fff"); txt(r[1], W - 50, 70 + i * 18, i === 3 ? "#ffe060" : "#80ff80", 8, "right"); } });
  if (st > 90 && st % 50 < 34) txt(lvl < 4 ? "PRESS START: NEXT STAGE" : "PRESS START", W / 2, 166, "#fff", 8, "center");
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
  if (st > 120 && anyStart()) setState("title");
}

function gameOverScreen() {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const left = 9 - Math.floor(st / 60);
  ctx.globalAlpha = 0.5; ctx.drawImage(ceo.portrait, W / 2 - 40, 20, 80, 80); ctx.globalAlpha = 1;
  txt("YOU'RE FIRED!", W / 2, 106, "#ff3030", 16, "center");
  txt("CONTINUE?", W / 2, 134, "#fff", 8, "center");
  txt(String(Math.max(0, left)), W / 2, 150, "#ffe060", 16, "center");
  txt("PRESS START", W / 2, 180, "#a0a0a0", 8, "center");
  if (anyStart() && st > 20) { continues++; lives = 3; score = levelStartScore; setState("intro"); return; }
  if (left < 0) { saveBest(); setState("title"); }
}

// ---------- main loop ----------
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) {
    acc -= 1000 / 60;
    st++;
    if (state === "play") { updatePlay(); if (state === "play" && tap) {} }
    if (state !== "play" || !acc) {}
    // drawing for menu states happens in the same step so input is read once
    if (state === "title") titleScreen();
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
  if (params.has("level")) { ceo = CEOS[+params.get("ceo") || 0]; lvl = Math.max(0, Math.min(4, (+params.get("level") || 1) - 1)); setState("intro"); }
  requestAnimationFrame(loop);
});
