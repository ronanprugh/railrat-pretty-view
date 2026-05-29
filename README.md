# RailRat Pretty View

A mobile-first PWA that renders [railrat.net](https://railrat.net)'s Amtrak train data
in a friendlier UI. Two pieces:

- `worker/` — a Cloudflare Worker that scrapes railrat.net's HTML and serves JSON.
- `web/` — a Vite + React + TypeScript + Tailwind PWA (mobile-first).

## Live

- **App:** https://railrat-pretty-view.pages.dev
- **API:** https://railrat-pretty-view.rprugh4.workers.dev

On iOS/Android, open the app URL and use Share → Add to Home Screen to install it as a PWA.

## Dev

In one terminal:

```sh
cd worker && npm run dev      # Worker on http://127.0.0.1:8787
```

In another:

```sh
cd web && npm run dev         # Vite on http://127.0.0.1:5173, proxies /api → worker
```

Then open `http://localhost:5173` on your phone (same network) or desktop. iOS:
Share → Add to Home Screen for the PWA install.

## Deploy

- Worker: `cd worker && npx wrangler deploy` (set up a CF account first).
- Web: `cd web && npm run build`, then host `dist/` anywhere static (Pages, Netlify, etc.).
  Set `VITE_API_BASE` at build time to the Worker URL.

## Endpoints

- `GET /api/routes` — list of routes with active/pending/complete counts.
- `GET /api/routes/:slug` — per-train stop schedule for one route.
- `GET /api/trains` — all trains grouped by route.
- `GET /api/trains/:num` — train status, progress timeline, and recent positions.
- `GET /api/stations` — list of all stations.
- `GET /api/stations/:code` — arriving and departed trains for a station.
