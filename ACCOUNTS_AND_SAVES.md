# Accounts and cloud saves

Players now see a **Log In / Create Account** screen before the boot screen. Saves go to the player's account (and are kept on the device too), so a tester can continue on another computer.

## How it fits together

- `backend/` is an Express server. It stores accounts (bcrypt-hashed passwords) and saves in MongoDB, and also serves the game files, so **one Render web service hosts everything** and there is nothing to configure between a separate frontend and backend.
- `frontend/src/auth/` is the login screen, the session handling and the save store that talks to the server.
- `shared/systems/saveManager.js` creates and applies save snapshots. Slots are `autosave` and `previous` (the old autosave is kept when a New Game starts). Saving only happens on the overworld, never inside interiors.
- Autosave runs when you enter the overworld, about once a minute, and when the tab is hidden or closed.
- On the title screen: **Load Game** is greyed out until a save exists; **Log Out** (or **Log In** when playing offline) is the last menu item.

## Before the first deploy

1. Run `node tools/checkPaths.mjs --fix` once and commit the result. Windows and macOS ignore upper/lower case in file paths; Render (Linux) does not. About 95 paths in the project have the wrong case (for example `HouseGenerator.js` imported as `houseGenerator.js`, `mapobjects/` for `mapObjects/`), and without the fix those textures and sounds do not load. The script also lists 5 files that are referenced but do not exist in the repo (`quick_stab.png`, `fireball_impact.wav`, and the `bleed`, `frozen`, `burn` sounds): add the files or remove the references.
2. Run `npm install` in the repo root (not inside `backend/`) so the workspaces link up, and commit the updated `package-lock.json`.

## Deploy on Render

1. Create a free MongoDB Atlas cluster. Create a database user, then under *Network Access* allow `0.0.0.0/0` (Render's addresses change). Copy the connection string (Database > Connect > Drivers) and put a database name in it, e.g. `.../shackle-breaker?retryWrites=true&w=majority`.
2. Render dashboard > **New > Blueprint**, pick the repo. Render reads `render.yaml`. It generates `JWT_SECRET` for you and asks for `MONGODB_URI` and `INVITE_CODE`.
   - Or create a Web Service by hand: build command `npm install`, start command `npm start`, health check path `/api/health`, and add the environment variables listed in `backend/.env.example`.
3. Open the service URL. Testers only need that one link.
4. Check the database connection once with `npm run check:db` (set `MONGODB_URI` in `backend/.env` locally first, or run it from the Render shell).

### Settings (environment variables)

| Name | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string (required) |
| `JWT_SECRET` | signs login tokens (required in production; changing it logs everyone out) |
| `INVITE_CODE` | if set, creating an account requires it (give it to testers) |
| `CORS_ORIGIN` | only if the game page is hosted on a different address than the server |
| `SERVE_FRONTEND` | `false` if the server should only be the API |
| `STORAGE` | `memory` to try things without a database (everything is lost on restart) |
| `MAX_SAVES_PER_USER`, `MAX_SAVE_BYTES` | limits (defaults 10 saves, 3 MB each) |

If you host the game files somewhere else (Render static site, GitHub Pages), set `SERVE_FRONTEND=false`, set `CORS_ORIGIN` to the page's address, and add `<meta name="api-base" content="https://your-api.onrender.com">` to `frontend/src/index.html`.

## Trying it locally

```
npm install
npm run dev:memory     # no database needed; open http://localhost:3000
npm test               # 12 API tests
```

With a database: copy `backend/.env.example` to `backend/.env`, fill it in, then `npm run dev`.

## Things to know

- **Free tier sleeps.** Render's free web service sleeps after ~15 minutes idle and takes about 30-60 seconds to wake up. The login screen says so while it waits, and the game itself saves locally in the meantime.
- **Offline play.** The login screen has a "Play offline" link; saves then stay on that device only. Set `ALLOW_OFFLINE_PLAY = false` at the top of `frontend/src/auth/authScreen.js` to require an account.
- **Login token** is kept in the browser's `localStorage` for 30 days. There are no password resets or email yet (a forgotten password means a new account), which is usual for a closed test.
- **Sign-up limits.** Login and sign-up are rate limited per address.
- The MongoDB code could not be run against a real database where it was written (only the in-memory version has automated tests), so `npm run check:db` after the first deploy is worth the minute.
