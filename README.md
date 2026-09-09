# VE-Plan Backend

The REST API and real-time layer for VE-Plan, a virtual event planning platform where
**organizers** create events, publish session agendas, approve or invite attendees, and host
video meetings, and **attendees** discover events, register or accept invitations, and join those
meetings. Video is provided by 8x8.vc (Jitsi as a Service).

Built with Node.js 22, Express 5, TypeScript, and Mongoose (MongoDB), with Socket.IO for live
notifications.

> This is one of two independently deployed apps in the VE-Plan web project. See the umbrella
> repo [`yunesunadi/ve-plan`](https://github.com/yunesunadi/ve-plan) for the overall picture,
> [`PROJECT_SPEC.md`](https://github.com/yunesunadi/ve-plan/blob/main/PROJECT_SPEC.md) for the full
> behavior and API reference, and
> [`CLAUDE.md`](https://github.com/yunesunadi/ve-plan/blob/main/CLAUDE.md) for code-level
> conventions.

## Features

- **Two roles, one API.** Organizer and attendee accounts. Role is enforced on every endpoint
  (`organizerAuth` / `attendeeAuth`), and event mutations additionally require ownership
  (`eventOwnerAuth`).
- **Auth.** Email/password with email verification, Google and Facebook OAuth
  (`passport-google-oauth20` / `passport-facebook`, plus a redirect-free
  `POST /auth/facebook/token` path), password reset, and rate limiting. Auth JWTs are slim and
  PII-free (`{ _id, role, tokenVersion }`), last 7 days, and are minted in one place
  (`helpers/authToken.ts`). `tokenVersion` is bumped on password change/reset to revoke every
  prior session on both REST and sockets.
- **Events & sessions.** Public or private events with cover images, timezone-aware
  `starts_at` / `ends_at`, and a session agenda. Cascading deletes are handled with Mongoose
  `pre` hooks (deleting an event cascades to its sessions, registrations, invitations, meetings,
  and participants).
- **Registration & invitations.** Attendees register (with organizer approval) or accept direct
  invitations; a merged "My Events" view tracks participation state.
- **Video meetings.** Organizers host 8x8.vc meetings signed with an RS256 JaaS key; attendees
  join as participants, with attendance tracking and a meeting analytics dashboard.
- **Real-time notifications.** Socket.IO authenticates the handshake with the auth JWT (re-checking
  the account and `tokenVersion` on every connection and reconnect), joins each user to a private
  `user_<id>` room, caps a user at 5 concurrent sockets, and exposes `sendToUser` /
  `disconnectUser` to services. Notifications are also persisted to a durable per-user store with a
  90-day TTL so nothing is missed across reconnects.
- **Transactional email.** HTML-templated mail (verification, password reset, approvals,
  invitations, meeting notices) resolved by action name from `src/email_templates/<action>.html`
  and sent through Gmail SMTP (OAuth2) with a durable queue and retry sweep.
- **Operability (Phase 7).** Structured `pino` / `pino-http` logging with a per-request correlation
  id (`x-request-id`), a graceful-shutdown path (`pm2 reload` = zero-downtime), a Prometheus
  metrics endpoint (`GET /api/v1/metrics`, bearer-guarded), a security audit log
  (`models/AuditLog.ts`, nine security-sensitive actions, 400-day TTL), log-based client error
  tracking (`POST /api/v1/client_errors`), and a hand-rolled, idempotent DB migration runner.

## Architecture

Layered, `route → controller → service → model`. Each domain (Event, Session, User, EventRegister,
EventInvite, Meeting, Participant, Notification, Email, Auth) follows the same four-file pattern
under `src/{routes,controllers,services,models}`:

- **Routes** wire `express-validator` chains and middleware inline (multer upload →
  `uploadErrorHandler` → validation → `jwtAuth` → role middleware → handler). There is no separate
  `validators/` directory.
- **Controllers** call `isRequestInvalid(req, res)` first, then delegate all business/DB logic to
  the matching service, wrap the body in try/catch, and return a consistent JSON envelope:
  `{ status: "success" | "error", message, data? }`.
- **Services** hold the Mongoose queries and business logic, imported as
  `import * as XService from "../services/XService"`.
- **Models** are exported CommonJS-style (`module.exports = mongoose.model(...)`) and implement
  cascading deletes via `pre` hooks.

All routes are mounted under `/api/v1/<resource>` in `index.ts`. Uploaded files are stored under
`dist/photos/` by multer and served at `/api/v1/static` (5 MB cap — a reverse proxy in front of
Node must allow at least `client_max_body_size 6m`).

### Layout

```
src/
├── index.ts          # app bootstrap, middleware, route mounting, graceful shutdown
├── routes/            # express-validator chains + middleware wiring
├── controllers/       # request/response, validation short-circuit, JSON envelope
├── services/          # Mongoose queries + business logic
├── models/            # Mongoose schemas, cascading pre-hooks
├── middlewares/       # jwtAuth, role guards, metrics, softAuth, upload error handler
├── helpers/           # authToken, logger, metrics, uploads, utils
├── libs/              # socket.io setup
├── migrations/        # hand-rolled NNN-*.ts runner (see below)
└── email_templates/   # HTML mail templates, resolved by action name
```

## Prerequisites

- **Node.js 22** (`engines` requires `^22.x`)
- **MongoDB** — a local instance or a connection string (e.g. MongoDB Atlas)
- Google & Facebook OAuth app credentials
- A Gmail account with SMTP OAuth2 credentials (for outbound email)
- 8x8.vc (JaaS) app id, API key, and RS256 private key `.pem` (for meetings)

## Getting started

```bash
npm install
# create backend/.env and fill it in (see "Environment" below)
npm run migrate     # build + apply pending DB migrations
npm run dev         # tsc --watch + nodemon on dist/index.js
```

The API listens on `PORT` under the `/api/v1` prefix. In development, Mongoose `autoIndex` is on,
so schema indexes are created automatically; in production they come only from migrations.

## Environment

There is no committed `.env` template — create `backend/.env` with the keys below. In production
the server refuses to boot without `DB_URL`, `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGIN`,
`PRIVATE_KEY_PATH`, and `METRICS_TOKEN` (and `CORS_ORIGIN` must not be `*`).

| Variable | Notes |
| -------- | ----- |
| `DB_URL` | MongoDB connection string |
| `JWT_SECRET` | Signs auth JWTs |
| `COOKIE_SECRET` | Optional — signs the OAuth-state cookie; falls back to `JWT_SECRET` |
| `PORT` | HTTP port the API listens on |
| `FRONTEND_URL` | Base URL the SPA is served from (used in emails and OAuth redirects) |
| `CORS_ORIGIN` | Allowed origin(s) for REST and Socket.IO, comma-separated; never `*` in production |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` / `FACEBOOK_CALLBACK_URL` | Facebook OAuth (`FACEBOOK_GRAPH_VERSION` optional) |
| `SENDER` / `SMTP_USER` / `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` / `OAUTH_REFRESH_TOKEN` / `OAUTH_ACCESS_TOKEN` | Gmail SMTP OAuth2 for outbound email |
| `UNSUBSCRIBE_EMAIL` | Optional — `List-Unsubscribe` address on notification mail; falls back to `SENDER` |
| `JITSI_APP_ID` / `JITSI_API_KEY` / `PRIVATE_KEY_PATH` | 8x8.vc meeting credentials; `PRIVATE_KEY_PATH` points at the RS256 `.pem` |
| `METRICS_TOKEN` | Bearer token guarding `GET /api/v1/metrics` (required in production) |
| `LOG_LEVEL` | Optional — overrides the default (`info` in production, `debug` otherwise) |
| `NODE_ENV` | `production` disables Mongoose `autoIndex` (indexes then come only from migrations) |

> The `SENDGRID_API_KEY`, `RESEND_API_KEY`, `SMTP_SERVICE`, and `*_TEMPLATE` keys still present in
> older `.env` files are not read by the current code.

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | `tsc --watch` + `nodemon` on `dist/index.js` (typical dev loop) |
| `npm start` | One-shot `tsc` build then `nodemon` |
| `npm run build` | `tsc` build + copy email templates into `dist/` |
| `npm run lint` / `lint:fix` | ESLint (flat config) over `src/` — expected to exit 0 with a few warnings |
| `npm run migrate` / `migrate:status` | Build, then apply / list DB migrations |
| `npm run pm2:start` / `pm2:reload` / `pm2:restart` / `pm2:stop` / `pm2:logs` | Production process management via `ecosystem.config.js` (`pm2:reload` = zero-downtime graceful drain) |

There is no backend test suite (out of scope).

## Migrations

`src/migrations/` is a hand-rolled runner: each `NNN-*.ts` exports a `Migration`
(`{ id, description, up }`), registered in `migrations/index.ts`. `npm run migrate` runs pending
migrations in order and is idempotent, recording applied ones in the `_migrations` collection.

Several migrations must run on their first deploy:

- **001** de-duplicates the join-table collections and builds the unique/lookup indexes — must run
  before the new unique indexes can take effect.
- **003** backfills `timezone` / `starts_at` / `ends_at` onto every pre-existing event.
- **005** backfills `tokenVersion: 0` onto every pre-existing user; the slim-JWT cutover rejects
  every token issued before it, so all existing sessions are invalidated (users log in again).
- **007** creates the 90-day TTL index on `Notification.createdAt`.
- **008** creates the `AuditLog` lookup indexes and its 400-day retention TTL.

## Deployment

The backend runs under **PM2** (`ecosystem.config.js`). A deploy is:

```bash
git pull
npm ci
npm run migrate       # apply any pending migrations
npm run pm2:reload    # zero-downtime restart (graceful drain)
```

[`docs/RUNBOOK.md`](docs/RUNBOOK.md) covers backup/restore (`scripts/mongo-backup.sh` /
`mongo-restore.sh`), deploy, incident response, and key rotation in detail.

## Technology stack

Node.js 22 · Express 5 · TypeScript · Mongoose 8 (MongoDB) · Passport (JWT + Google/Facebook OAuth)
· Socket.IO 4 · Nodemailer (Gmail SMTP OAuth2) · Multer 2 · Luxon · Helmet ·
express-rate-limit · express-validator · pino / pino-http · prom-client · PM2
