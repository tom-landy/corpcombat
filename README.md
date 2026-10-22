# Corporate Kombat

Retro side-scroller. Pick one of 8 CEOs, then fight up 5 floors of the corporate jungle: Start-up Loft, Open-Plan Office, The Warehouse, The Trading Floor and The Boardroom. Each floor gets harder: new rivals, wider lift shafts, spilled drawing pins, people throwing paperwork, a higher quota and a final boss.

Every CEO has their own rivals and arch-rival boss (Musk faces Recall Notices, Short Sellers and The Big Short; Bezos faces Rogue Drones and the Peak Season Megabot; Dyson faces Dust Bunnies and the Mega Dust Bunny, and so on). They live in `RIVALS` in `public/game.js`.

Collect the floor's key item (Big Ideas, New Hires, Products, Investors, Customers) to unlock the lift. Grab £ coins, hit gold deal blocks for power-ups (coffee, cash flow, golden parachute) and find your CEO's 3 signature items for a big bonus. Score is your company value.

Original 8-bit lift-music bossa plays throughout, switching to a driving track for the boss. Controls: arrows/WASD move, Z/Space jump, X super move, M or the ♪ button to mute. On phones and tablets, on-screen buttons appear. Best score is saved on each device.

The CEOs are parody caricatures of public figures. Not endorsed by anyone named.

Plain HTML and JavaScript, everything drawn in code, plus a small Node server with no dependencies.

## Run locally

    node server.js

Then open http://localhost:3000. Jump straight to a stage for testing: `/?level=5&ceo=0`.

## Deploy on Render

New + → Blueprint, pick this repo. Render reads `render.yaml` and creates a free web service. Every push to `main` redeploys.
(Or New + → Web Service, Build Command `echo`, Start Command `node server.js`.)
