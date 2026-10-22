# Corporate Kombat

Retro side-scroller. Pick one of 8 CEOs, then fight up 5 floors of the corporate jungle: Start-up Loft, Open-Plan Office, The Warehouse, The Trading Floor and The Boardroom. Each floor gets harder: new rivals, wider lift shafts, spilled drawing pins, people throwing paperwork, a higher quota and a final boss.

Every CEO has their own rivals and arch-rival boss (Musk faces Recall Notices, Short Sellers and The Big Short; Bezos faces Rogue Drones and the Peak Season Megabot; Dyson faces Dust Bunnies and the Mega Dust Bunny, and so on). They live in `RIVALS` in `public/game.js`.

Collect the floor's key item (Big Ideas, New Hires, Products, Investors, Customers) to unlock the lift. Grab £ coins, hit gold deal blocks for power-ups (coffee, cash flow, golden parachute) and find your CEO's 3 signature items for a big bonus. Score is your company value.

Original 8-bit fighting-game music plays throughout (a different minor-key track per floor, faster as you climb), switching to a boss track for the arch-rival. Each arch-rival boss has its own signature attack: The Big Short rains sell orders, The AI Winter drops snowflakes, the Troll King sends patent quakes along the floor, the Mega Dust Bunny spawns more dust bunnies, King Gas Guzzler charges, and so on (`BOSS_MOVES` in `public/game.js`). Between floors, The Daily Grind prints a made-up headline about your run.

Controls: arrows/WASD move, Z/Space jump, X super move, M or the ♪ button to mute. On phones and tablets, on-screen buttons appear. There's a shared top-10 board with 3-letter arcade initials, shown on the title screen between logo loops. Rude three-letter combos are blocked in the game and on the server.

The CEOs are parody caricatures of public figures. Not endorsed by anyone named.

Plain HTML and JavaScript, everything drawn in code, plus a small Node server with no dependencies.

## Secret: CEO Kombat

On the CEO select screen, click or tap the faint logo in the top-right corner. That opens a one-on-one fighting mode: pick a fighter, then fight up a ladder of 3 rival CEOs, best of 3 rounds each. Win the final round and you get "FINISH THEM!": get close and press special for a (bloodless, corporate) finisher, either a Buyoutality or a Firedality. Hits spray cash, not blood.

Controls: arrows move, Up jumps, holding away from your opponent blocks, Z punch, X kick, C special move. Touch screens get extra ▲ and C buttons. Esc quits. The code is in `public/kombat.js`.

## High score board

Scores live in the server's memory and in `scores.json`. On Render's free plan the disk is wiped whenever the service sleeps (15 minutes with no visitors) or redeploys, so the board resets then. Keep a tab open on the game to stop it sleeping, or use a paid instance with a disk if you want it to last.

Scores come from the browser and aren't verified, so a determined player could post a fake one. It's capped at a sensible maximum.

## Run locally

    node server.js

Then open http://localhost:3000. Jump straight to a stage for testing: `/?level=5&ceo=0`.

## Deploy on Render

New + → Blueprint, pick this repo. Render reads `render.yaml` and creates a free web service. Every push to `main` redeploys.
(Or New + → Web Service, Build Command `echo`, Start Command `node server.js`.)
