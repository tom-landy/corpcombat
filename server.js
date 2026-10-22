// Serves the game and keeps a shared top-10 high score board. No dependencies: node server.js
//
// Scores are kept in memory and copied to scores.json so a restart doesn't lose them.
// On Render's free plan the disk is wiped when the service sleeps or redeploys, so the
// board resets then. Each entry is 3 initials, a score, a CEO id, the floor reached (6 = won) and a time.
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, "public");
const SCORES_FILE = path.join(__dirname, "scores.json");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml" };
const CEO_IDS = ["musk", "zuck", "bezos", "cook", "huang", "su", "dyson", "barra"];
const MAX_SCORE = 5e9; // well above the best possible run
// three-letter combinations that shouldn't go on a big screen
const BLOCKED = new Set(["ASS", "FUK", "FUC", "FCK", "FUQ", "CUM", "CNT", "KNT", "TIT", "SEX", "DIK", "DIC", "COK", "KOK", "KKK", "NIG", "NGR", "FAG", "GAY", "JEW", "PIS", "POO", "WTF", "STD", "VAG", "XXX", "NAZ", "HTL", "RAP", "SHT", "SHI", "BUM", "PRK", "WNK", "WNG", "TWT", "SUK", "SUC", "GOD", "DIE", "KYS"]);

let scores = [];
try { scores = JSON.parse(fs.readFileSync(SCORES_FILE, "utf8")).filter(valid).slice(0, 10); } catch {}
let posts = [];

function valid(e) {
  return e && /^[A-Z]{3}$/.test(e.name) && !BLOCKED.has(e.name) && Number.isInteger(e.score) && e.score > 0 && e.score <= MAX_SCORE &&
    CEO_IDS.includes(e.ceo) && Number.isInteger(e.floor) && e.floor >= 1 && e.floor <= 6; // 6 means they beat the game
}

function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}

function serveFile(req, res) {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(404); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");

  if (url.pathname === "/api/scores" && req.method === "GET") return send(res, 200, { top: scores });

  if (url.pathname === "/api/scores" && req.method === "POST") {
    const now = Date.now();
    posts = posts.filter(t => now - t < 60000);
    if (posts.length >= 60) return send(res, 429, { error: "slow down" });
    posts.push(now);
    let body = "";
    req.on("data", c => { body += c; if (body.length > 1000) req.destroy(); });
    req.on("end", () => {
      let b; try { b = JSON.parse(body); } catch { return send(res, 400, { error: "bad json" }); }
      const entry = { name: String(b.name || "").toUpperCase(), score: Math.round(Number(b.score)), ceo: b.ceo, floor: Number(b.floor), t: now };
      if (!valid(entry)) return send(res, 400, { error: "bad score" });
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score || a.t - b.t);
      scores = scores.slice(0, 10);
      fs.writeFile(SCORES_FILE, JSON.stringify(scores), () => {});
      send(res, 200, { rank: scores.indexOf(entry) + 1, top: scores });
    });
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") return serveFile(req, res);
  res.writeHead(405); res.end();
}).listen(PORT, () => console.log(`Corporate Kombat on port ${PORT}`));
