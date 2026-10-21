# FiveM Tactical Map

Public collaborative tactical planning website for FiveM groups. Node.js 20+, Express, SQLite and Socket.IO.

## Start locally

```bash
npm install
npm start
```

Open http://localhost:3000. Create an operation and start placing markers and drawing. All visitors can edit the same plans.

## GTA V map included by reference

The website now displays the standard GTA V **Atlas** map automatically using community-hosted tiles from https://github.com/VIRUXE/gtav-map-tiles . No separate map download is required. An internet connection is required to load these third-party tiles; availability is outside our control. GTA V map artwork belongs to Rockstar Games; the tile host is unofficial. To use an image you have permission to host yourself, edit `MAP_IMAGE_URL` in `public/app.js` to `'/map.jpg'` and place the image in `public/map.jpg`.

## Deploy online

1. Push this folder to a private or public GitHub repository.
2. Create a **Node.js Web Service** on a hosting provider that supports persistent processes and WebSockets (e.g. Render or Railway). Set build command `npm install` and start command `npm start`.
3. **Important:** SQLite requires a persistent disk. Attach a persistent volume and set `DB_PATH=/data/plans.db` (adjust path to your provider's mounted volume). On hosts without persistent disks, saved plans may disappear on redeploy or restart.
4. Add your map image before deployment or set a permitted image URL.
5. Open your generated HTTPS URL and share it with your group.

## Security / collaboration notes

This is a **public** site: any visitor can create, edit, or delete every plan. Do not store secrets or real-world sensitive information. Real-time drawing updates are best-effort; SQLite stores the latest autosaved plan. Simultaneous edits to the same plan use last-write-wins and can overwrite one another. There is no login, edit history, or conflict resolution. For internet-facing production use, add rate limiting, abuse controls, backups and authentication if desired.

## Main files

- `server.js` — API, SQLite persistence, Socket.IO sync
- `public/index.html` — application layout
- `public/style.css` — dark tactical theme
- `public/app.js` — drawing, markers, zoom/pan, autosave and live updates
