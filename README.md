# Corporate Kombat

Retro side-scroller. Pick one of 8 CEOs, then fight through 5 stages of the corporate jungle: The Garage, Office Park, The Factory, Wall Street and Global HQ (boss: The Market Crash). Each stage gets harder: more and nastier enemies, wider gaps, spikes, lawyers throwing briefcases, a higher quota and a boss.

Collect the stage's key item (Big Ideas, New Hires, Products, Investors, Customers) to open the exit. Grab £ coins, hit gold deal blocks for power-ups (coffee, cash flow, golden parachute) and find your CEO's 3 signature items for a big bonus. Score is your company value.

Controls: arrows/WASD move, Z/Space jump, X super move, M mute. On phones and tablets, on-screen buttons appear. Best score is saved on each device.

The CEOs are parody caricatures of public figures. Not endorsed by anyone named.

Plain HTML and JavaScript, everything drawn in code, plus a small Node server with no dependencies.

## Run locally

    node server.js

Then open http://localhost:3000. Jump straight to a stage for testing: `/?level=5&ceo=0`.

## Deploy on Render

New + → Blueprint, pick this repo. Render reads `render.yaml` and creates a free web service. Every push to `main` redeploys.
(Or New + → Web Service, Build Command `echo`, Start Command `node server.js`.)
