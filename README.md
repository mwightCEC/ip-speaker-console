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
| M3        | SQLite storage, activity log, WebSocket real-time updates   | Done        |
| M4        | Audio engine (mock and `aplay`) and Dashboard               | Done        |
| M5        | Sounds library and WAV uploads                              | In progress |
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
| `DATA_DIR`           | `server/data` | Folder for the database and uploaded sounds (in `sounds/`)               |
| `ACTIVITY_RETENTION` | `5000`        | Activity log entries to keep (at least 100); older ones are deleted      |
| `ALSA_MIXER_CONTROL` | `Master`      | ALSA mixer control the volume slider changes when `AUDIO_DRIVER=aplay`   |

An invalid value stops the server at startup with a message naming the variable.

## Project layout

```text
shared/   Types and constants used by both sides: API shapes, WebSocket messages, activity events
server/   Fastify API and WebSocket server
  assets/sounds/  Built-in sounds shipped with the console
  src/activity/   Activity log: storage, service and GET /api/activity
  src/audio/      Audio drivers (mock and aplay), mixers (mock and amixer), WAV header reader
  src/events/     In-process event bus connecting services to the WebSocket hub
  src/http/       API error handling
  src/playback/   Playback service and /api/playback routes
  src/realtime/   WebSocket hub: snapshot on connect, then live updates
  src/settings/   Settings store (one JSON value per key)
  src/sounds/     Sounds library: built-in sounds, uploads, file storage and /api/sounds routes
  src/testing/    Test helpers: a test app with a temporary data folder, generated WAV files
  src/storage/    SQLite connection and schema migrations
  src/volume/     Volume service and /api/volume routes
client/   React app (Vite, Mantine)
  src/api/        REST calls and API error handling
  src/components/ Components shared by several pages
  src/format/     Time and duration formatting
  src/pages/      One component per page; larger pages have a folder of their own parts
  src/playback/   Play and stop requests shared by the Dashboard and Sounds pages
  src/shell/      Titlebar, sidebar and page layout
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

### Playback

The speaker plays one sound at a time. Playing a sound while another is playing stops the current
one first, so an urgent announcement never waits. Each start and ending (finished, stopped,
replaced or failed, with the reason) is recorded as activity.

- `GET /api/playback` returns what's playing and how the last sound ended.
- `POST /api/playback` with `{ "soundId": "chime" }` plays a sound.
- `POST /api/playback/stop` stops it.

The audio driver does the playing. `mock` waits for as long as the sound lasts without making a
noise, so everything works on a development machine; `aplay` runs ALSA's `aplay` on the device.
Sounds must be uncompressed (PCM) WAV files; their length comes from the WAV header.

### Sounds library

The library holds the built-in sounds (a 1 kHz test tone, a chime and an alert, generated for the
console) and the WAV files people upload. Built-in sounds live in `server/assets/sounds`, so a
production install needs that folder next to `server/dist`. They can be played, downloaded and
pinned, but not renamed or deleted. They start out pinned.

Uploads are checked on the server as they arrive: at most 10 MB, a real RIFF/WAVE file, and
uncompressed audio. A refused file gets a reason written for people, such as "This is an MP3
file, not a WAV file", and is recorded as activity. Accepted files are stored as
`<DATA_DIR>/sounds/<id>.wav` under a generated ID; names, pins and file details live in the
database. A name typed by a person is never used as a file path, so renaming never touches the
file. At startup the server drops sounds whose file has gone and deletes files left behind by an
interrupted upload.

Pinned sounds appear in the Dashboard's Quick play list. Deleting a sound that's playing stops it
first, and deleting a pinned sound removes it from Quick play.

- `GET /api/sounds` lists every sound: built-in ones first, then uploads by name.
- `POST /api/sounds` uploads a WAV file sent as a form upload in the `file` field.
- `PATCH /api/sounds/:id` with `{ "name": "Front door" }`, `{ "pinned": true }` or both.
- `DELETE /api/sounds/:id` deletes an uploaded sound and its file.
- `GET /api/sounds/:id/file` sends the WAV file, honouring `Range` requests so browsers can
  stream and seek it; add `?download=true` to save it under the sound's name.

The Sounds page shows the library in one card, as tiles or as a list; the button in the card's
header switches between them, and each browser remembers the choice. It accepts files dragged
onto it as well as the Upload button. Preview buttons, on the Sounds page and next to Play on the
Dashboard, play a sound in the browser without touching the speaker.

### Volume

The volume (0 to 100 %, starting at 80 %) is saved in the database and applied again when the
server starts, so it survives restarts and reboots. With `AUDIO_DRIVER=aplay` it's set with
`amixer` on the ALSA control named by `ALSA_MIXER_CONTROL`; the mock driver only remembers it.
Muting sets the mixer to 0 % but keeps the volume, so unmuting brings it back; the mute is saved
too. Every change is recorded as activity and pushed to every browser as a `volume.changed`
message.

- `GET /api/volume` returns `{ "percent": 80, "muted": false }`.
- `PUT /api/volume` with `{ "percent": 60 }`, `{ "muted": true }` or both changes them.

The Dashboard's slider sends a change once it has been still for a moment, so dragging it or
holding an arrow key makes one change rather than dozens. The speaker icon next to it mutes and
unmutes (red while muted), and moving the slider while muted unmutes.

### Real-time updates

Browsers keep a WebSocket open to `/ws`. On every connection, including reconnects, the server
first sends a `snapshot` message with the current state, then a message for each change:
`activity.created` for a new event, `playback.changed` when playback starts or ends,
`volume.changed` when the volume changes, and `sounds.changed` with the whole list when a sound is
added, renamed, pinned, unpinned or deleted. Because each connection starts from a full snapshot,
a browser that was disconnected during a reboot or network outage is up to date as soon as it
reconnects.

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
