# IP Speaker Console

Web console for the Clinton Electronics IP speaker prototype. It runs on the speaker itself (a
Radxa ROCK Pi S) and lets you play sounds, manage recordings, follow device activity and change
device settings from a browser on the same network.

## Status

Development follows numbered milestones. Pages that aren't built yet show what's coming.

| Milestone | Scope                                                       | Status      |
| --------- | ----------------------------------------------------------- | ----------- |
| M1        | Workspaces, Fastify server, Vite client, tooling            | Done        |
| M2        | App shell: titlebar, sidebar, routes, light and dark themes | Done        |
| M3        | SQLite storage, activity log, WebSocket real-time updates   | In progress |
| M4        | Audio engine (mock and `aplay`) and Dashboard               | Planned     |
| M5        | Sounds library and WAV uploads                              | Planned     |
| M6        | Activity page, Settings and reboot                          | Planned     |
| M7        | Hardware integration on the ROCK Pi S                       | Planned     |
| M8        | Hardening, deployment and systemd service                   | Planned     |

## Requirements

- Node.js 22.13 or newer (the database uses Node's built-in `node:sqlite`)
- npm 10 or newer

Everything runs on Windows, macOS or Linux during development. Audio and system features use
mock drivers until hardware integration (M7), so no speaker is needed.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server reloads the page as you edit, and forwards `/api`
and `/ws` to the Fastify server on port 3000, which restarts on its own when server code changes.

If `npm install` is interrupted, `node_modules` can be left half-written and `npm run dev` fails
with "Cannot find module" errors. Stop any running dev servers and reinstall exactly from the
lockfile with `npm ci`.

### Production build

```bash
npm run build
npm start
```

This builds everything and runs a single server on http://localhost:3000 that serves both the app
and the API, the way it runs on the device.

## Scripts

Run these from the repository root.

| Command                           | What it does                                              |
| --------------------------------- | --------------------------------------------------------- |
| `npm run dev`                     | Server and client in watch mode                           |
| `npm run build`                   | Build shared, server and client into their `dist` folders |
| `npm start`                       | Run the built server (serves the built client too)        |
| `npm run check`                   | Everything below, as CI would run it                      |
| `npm run format` / `format:check` | Format with Oxfmt, or only check                          |
| `npm run lint`                    | Lint with Oxlint                                          |
| `npm run typecheck`               | Type-check every workspace                                |
| `npm test`                        | Run the Vitest suites in every workspace                  |

## Configuration

The server reads environment variables. To change them during development, copy
`server/.env.example` to `server/.env` and edit it. Every value is optional.

| Variable             | Default       | Meaning                                                                  |
| -------------------- | ------------- | ------------------------------------------------------------------------ |
| `HOST`               | `127.0.0.1`   | Address to listen on. The device uses `0.0.0.0` so the LAN can reach it. |
| `PORT`               | `3000`        | Port to listen on                                                        |
| `LOG_LEVEL`          | `info`        | `fatal`, `error`, `warn`, `info`, `debug` or `trace`                     |
| `AUDIO_DRIVER`       | `mock`        | `mock` simulates playback; `aplay` plays through ALSA on the device      |
| `SYSTEM_DRIVER`      | `mock`        | `mock` simulates network and reboot; `linux` uses the real device        |
| `DATA_DIR`           | `server/data` | Folder for the database (and, from M5, uploaded sounds)                  |
| `ACTIVITY_RETENTION` | `5000`        | Activity log entries to keep (at least 100); older ones are deleted      |

An invalid value stops the server at startup with a message naming the variable.

## Project layout

```text
shared/   Types and constants used by both sides: API shapes, WebSocket messages, activity events
server/   Fastify API and WebSocket server
  src/activity/   Activity log: storage, service and GET /api/activity
  src/events/     In-process event bus connecting services to the WebSocket hub
  src/http/       API error handling
  src/realtime/   WebSocket hub: snapshot on connect, then live updates
  src/storage/    SQLite connection and schema migrations
client/   React app (Vite, Mantine)
  src/shell/      Titlebar, sidebar and page layout
  src/pages/      One component per page
  src/realtime/   WebSocket connection, reconnection and live state
  src/theme/      Palette, role color tokens and Mantine theme
```

## How it works

### Data

Device data lives in a SQLite database at `<DATA_DIR>/console.db`, opened in WAL mode so a power
cut can lose the last few writes but never corrupts the file. The schema is created and upgraded
by numbered migrations in `server/src/storage/migrations.ts` when the server starts. A database
from a newer release is refused rather than modified.

Node prints an "SQLite is an experimental feature" warning on Node 22. The npm scripts silence
it; it's expected and harmless.

### Activity log

Everything worth showing users (playback requests and results, uploads, settings changes,
device events and errors) is recorded through the server's `ActivityService`. Each event is
stored, written to the server log, and pushed to connected browsers. Only the newest
`ACTIVITY_RETENTION` events are kept.

`GET /api/activity` returns events newest first. Optional query parameters: `limit` (1 to 200,
default 50), `before` (an event ID, for the next page), `category` (`playback`, `files`,
`settings` or `device`) and `outcome` (`success`, `warning`, `failure` or `info`). The response
includes `nextBefore` when there are older events.

### Real-time updates

Browsers keep a WebSocket open to `/ws`. On every connection, including reconnects, the server
first sends a `snapshot` message with the current state, then an `activity.created` message for
each new event. Because each connection starts from a full snapshot, a browser that was
disconnected during a reboot or network outage is up to date as soon as it reconnects.

The browser reconnects automatically with increasing delays (1 s, 2 s, 4 s … up to 30 s) and
straight away when the network comes back. Connection changes are logged to the browser console
with a `[realtime]` prefix; there's no on-screen indicator. The server pings each browser every
30 seconds and drops connections that stop answering.

### Errors

API failures always answer with the same JSON shape:

```json
{ "error": { "code": "validation_failed", "message": "…", "detail": "…" } }
```

`message` is written for people and can be shown in the UI as-is. Unexpected server errors are
logged in full but return only a generic message.
