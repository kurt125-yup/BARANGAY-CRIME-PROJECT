# BARANGAY-CRIME-PROJECT

Crime record management and analytics prototype for **Barangay 179, Amparo, Caloocan City**.

- `index.html`, `script.js`, `style.css` — login page
- `menu-pages/` — dashboard, incidents, map, CART, patrol, reports, users, settings modules
- `server/` — Express API backed by MySQL (added in this branch)

## Requirements

- Node.js 18+ (developed on 24.11)
- MySQL 8.0 listening on **port 3307**

## Quick start (Windows)

**Double-click `start.bat`.** It installs dependencies, creates `.env` from
`.env.example`, sets up and seeds the database if needed, starts the server, and
opens <http://localhost:4000> in your browser. Closing the console window stops
the server.

On a brand-new clone it will stop once to tell you to put your MySQL password in
`.env` — do that and run it again.

## Manual setup

```bash
npm install
cp .env.example .env      # then edit the DB_* values for your machine
npm run db:setup          # creates barangay_crime_db and applies the schema
npm run db:seed           # loads the dummy dataset
npm start                 # http://localhost:4000
```

Open <http://localhost:4000> — the server hosts both the API and the existing
static pages, so everything runs from one origin.

| Script | What it does |
| --- | --- |
| `npm start` | Runs the API + static front-end on `PORT` (default 4000) |
| `npm run dev` | Same, with `--watch` restart on file changes |
| `npm run db:setup` | Creates the database and applies `server/sql/schema.sql`. Add `-- --force` to drop it first |
| `npm run db:seed` | Truncates and regenerates the dummy dataset |
| `npm run db:reset` | `db:setup --force` then `db:seed` |
| `npm run db:check` | Prints row counts, month coverage, type/status spread, hotspots, integrity checks |
| `npm run db:ready` | Exit-code health probe used by `start.bat` (0 ready, 2 needs setup, 3 needs seed, 4 MySQL unreachable) |

`.env` is git-ignored. Each teammate copies `.env.example` and fills in their own
MySQL credentials.

## Database

`barangay_crime_db`, six tables plus one convenience view:

| Table | Purpose |
| --- | --- |
| `puroks` | The 12 puroks with centre coordinates, landmark, household count, risk note |
| `users` | System users; `role` is `admin` / `captain` / `tanod`, passwords are bcrypt hashes |
| `incidents` | Core fact table — type, date/time, purok, status, `danger_level` 1–3, coordinates |
| `patrols` | Patrol schedules and assignments per purok and shift |
| `audit_log` | CREATE / UPDATE / DELETE / LOGIN / LOGOUT / EXPORT trail with JSON details |
| `settings` | Key/value config (map centre, thresholds, patrol window, curfew) |
| `vw_incident_details` | Incidents joined to their purok, aliased to the JSON shape the front-end uses |

### Dummy dataset

`npm run db:seed` uses a fixed PRNG seed, so every machine that runs it against a
fresh schema gets the **same** data. Current draw:

- **999 incidents** across **24 months** (Aug 2024 → 26 Jul 2026, never dated in the future)
- 12 incident types with realistic weights; `danger_level` constrained per type
  (Physical Injury / Illegal Drugs / Robbery are always level 3, Noise Complaint always level 1)
- Time-of-day biased toward the 18:00–03:00 window per type
- Seasonal volume curve (December and the May fiesta season spike, Aug–Sep dips) plus a mild upward trend
- Status skews by age — older records mostly `Resolved`, the last three months mostly `Under Review`
- Incident volume is deliberately uneven across puroks so Purok 3, 1, 6 and 8 read as genuine hotspots
- **213 patrol records** over the last 6 months, priority derived from each purok's incident pressure
- **120 audit entries** over the last 90 days
- 8 users, 10 settings, 12 puroks

Change the volume with `SEED_INCIDENT_COUNT`, `SEED_MONTHS`, `SEED_END_MONTH` in
`.env`, or the `SEED` constant in `server/scripts/seed.js` for a different draw.

### Demo logins

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | admin |
| `analyst` | `analyst123` | captain |
| `tanod1` | `tanod123` | tanod |

Also seeded: `tanod2`–`tanod4` (`tanod123`), `secretary` (`secretary123`),
`kagawad` (`kagawad123`).

## API

Base path `/api`. Writes accept optional `X-User-Id` / `X-Username` headers,
which is what lands in `audit_log`.

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/health` | Connection check plus row counts per table |
| POST | `/api/auth/login` | `{ username, password }` → profile + `landingPage`; 401 on bad credentials |
| POST | `/api/auth/logout` | Writes a LOGOUT audit entry |
| GET | `/api/incidents` | Filters: `month`, `from`, `to`, `type`, `status`, `danger`, `purokId`, `search`, `limit`, `offset` |
| GET | `/api/incidents/months` | Month values + counts for the reporting-month dropdown |
| GET | `/api/incidents/stats` | Totals, `byType`, `byStatus`, `byDanger`, `byDay`, `byHour`, `hotspots` — accepts the same filters |
| GET | `/api/incidents/:id` | Single record |
| POST | `/api/incidents` | Requires `type`, `date`, `time`, `location`, `danger` |
| PUT | `/api/incidents/:id` | Partial update |
| DELETE | `/api/incidents/:id` | |
| GET | `/api/users` | Optional `?role=`; never returns password hashes |
| POST/PUT/DELETE | `/api/users[/:id]` | Passwords are bcrypt-hashed; refuses to delete the last active admin |
| GET | `/api/settings` | Flat object, values cast to their declared type |
| PUT | `/api/settings` | Only accepts existing keys |
| GET | `/api/puroks` | Optional `?month=` for per-purok incident counts and average danger |
| GET | `/api/patrols` | Filters: `month`, `date`, `status`, `priority`, `purokId`, `upcoming=1`, `limit` |
| GET | `/api/patrols/recommendations` | Puroks ranked by incident pressure with a 0–100 priority score |
| POST/PUT/DELETE | `/api/patrols[/:id]` | |
| GET | `/api/audit-log` | Filters: `action`, `entityType`, `userId`, `from`, `limit`, `offset` |

Example:

```bash
curl "http://localhost:4000/api/incidents/stats?month=2026-07"
curl "http://localhost:4000/api/incidents?search=motorcycle&danger=3&limit=5"
```

## Known gap

The front-end pages still read and write **browser `localStorage`** (the
`b179_*` keys seeded in `menu-pages/menu-page.js`). They do not call this API
yet — rewiring them to `fetch()` is the next step. `/api/auth/login` and
`/api/incidents` already return the same field names the pages expect
(`type`, `date`, `time`, `location`, `reportedBy`, `status`, `danger`, `lat`,
`lng`, `action`) so the swap should be mostly mechanical.

There is also no session/token layer — the login endpoint verifies the password
and returns a profile, nothing more. Do not treat this as production auth.
