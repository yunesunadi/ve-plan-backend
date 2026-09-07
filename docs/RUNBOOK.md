# VE-Plan Backend — Operations Runbook

Operational reference for running, deploying, monitoring, and recovering the
VE-Plan API (`ve-plan-backend`). Companion to `README.md` (feature overview) and
the root `PROJECT_SPEC.md` / `CLAUDE.md` (architecture).

---

## 1. Architecture at a glance

- **Single Node process** managed by pm2 (`ecosystem.config.js`, `fork` mode,
  1 instance, `max_memory_restart: 500M`). No clustering — Socket.IO uses the
  in-memory adapter, so a second instance would break room delivery.
- **MongoDB** — self-hosted on the same host/VPS. Connection string in
  `backend/.env` as `DB_URL`.
- **Nginx** terminates TLS and reverse-proxies `/backend/*` → the Node process
  and `/backend/socket.io` → the Socket.IO endpoint (`socketPath` in the
  frontend environment).
- **Uploads** (event covers, profile photos) are written to `dist/photos/` on
  local disk and served at `/api/v1/static`. **These are not in git and not in
  the DB backup** — see §4.4.
- **Email** goes out through Gmail SMTP directly (`EmailService`), backed by the
  durable `EmailLog` queue + a 5-minute retry sweep.
- **Background workers** (all in-process, `setInterval`, `.unref()`ed): participant
  sweep (10 min), orphan reconcile (30 min), email retry sweep (5 min), metrics
  gauge refresh (30 s).

---

## 2. Deploy

Zero-downtime deploy path:

```bash
cd /path/to/ve-plan-backend
git pull
npm ci
npm run migrate        # applies pending DB migrations (idempotent)
npm run pm2:reload      # builds, then `pm2 reload` — drains connections gracefully
```

- **`npm run pm2:reload`** (new in Phase 7) replaces `pm2:restart` for routine
  deploys. `reload` starts the new process, waits for it to listen, then sends
  the old one `SIGTERM`; the process drains HTTP + Socket.IO + Mongo over up to
  10 s (`kill_timeout: 12000` gives pm2 headroom). Use `pm2:restart` only for a
  hard bounce.
- **Migrations that must run on deploy** (each is idempotent; `_migrations`
  collection records applied ones):
  - `001` — de-dupe join tables + build unique indexes (**must precede** the
    unique-index cutover).
  - `003` — backfill `timezone` / `starts_at` / `ends_at` on pre-existing events.
  - `005` — backfill `tokenVersion: 0`; **invalidates every pre-cutover session**
    (web + mobile) — users log in again.
  - `007` — Notification 90-day TTL index.
  - `008` — AuditLog lookup + 400-day TTL indexes (**Phase 7**).
  In production `autoIndex` is off, so new indexes are only created by a
  migration — `npm run migrate` is mandatory whenever a schema's indexes change.
- **Env vars** — see `CLAUDE.md` "Environment configuration" for the full list.
  Phase 7 adds **`METRICS_TOKEN`** (required in production; guards
  `GET /api/v1/metrics`). `assertEnv()` exits the process on boot if a
  production-required var is missing or `CORS_ORIGIN` is `*`.

---

## 3. Rollback

```bash
git checkout <previous-tag-or-sha>
npm ci
npm run pm2:reload
```

- Migrations are **forward-only** — there is no `down`. A rolled-back code
  version must tolerate any schema change already applied. Every migration to
  date is additive (new fields / indexes / de-dup) and safe to run older code
  against; check the diff before rolling back across a migration that drops or
  rewrites data (`004` drops the legacy `event.date` index — harmless to older
  code).
- If a deploy is bad and the cause is unknown, roll the **code** back first
  (fast, safe); only restore the **database** (§4) if data was corrupted.

---

## 4. Backup & restore

### 4.1 What is backed up

`scripts/mongo-backup.sh` runs `mongodump --gzip --archive` over the whole
database named in `DB_URL`. It does **not** capture `dist/photos/` uploads —
back those up separately (`rsync`/`tar` of `dist/photos/` to the same offsite
target).

### 4.2 Scheduling (cron)

```cron
# nightly at 03:00 host time
0 3 * * * /path/to/ve-plan-backend/scripts/mongo-backup.sh >> /path/to/ve-plan-backend/backups/cron.log 2>&1
```

Config via env (or cron-line prefix):

| Var | Default | Meaning |
| --- | --- | --- |
| `DB_URL` | from `backend/.env` | source database |
| `BACKUP_DIR` | `<repo>/backups` | where archives land (git-ignored) |
| `BACKUP_RETENTION_DAYS` | `14` | prune archives older than this |

Each run appends to `${BACKUP_DIR}/backup.log`. **Copy archives offsite** — a
backup on the same host does not survive host loss. Recommended: a second cron
line `rsync`ing `${BACKUP_DIR}` to object storage or another machine.

### 4.3 Restore

```bash
# rehearsal — restore into a scratch DB, never the live one:
RESTORE_DB_URL="mongodb://localhost:27017/veplan_restore_test" \
  scripts/mongo-restore.sh backups/veplan-<stamp>.archive.gz

# real recovery (DESTRUCTIVE — --drop replaces live collections):
scripts/mongo-restore.sh backups/veplan-<stamp>.archive.gz
# type RESTORE at the prompt (or pass --yes for non-interactive)
```

After a real restore: `npm run migrate` (in case the archive predates a
migration), then `npm run pm2:reload`, then check §6.

### 4.4 Uploads

`dist/photos/` is a **build-output directory**. A `rm -rf dist` clean step or a
fresh-checkout deploy destroys every uploaded cover/profile photo, and it is not
in the DB dump. Mitigations, in order of preference: (a) move uploads to
`../uploads/` outside `dist` (code change, tracked as tech debt); (b) include
`dist/photos/` in the offsite backup; (c) never run a clean deploy without
first copying `dist/photos/` aside.

### 4.5 RPO / RTO

`[PROVISIONAL]` RPO 24 h (nightly backup), RTO 4 h. Tighten the backup cadence
to shrink RPO.

### 4.6 Restore rehearsal log

> A restore is not "tested" until it has been run end-to-end against a scratch
> database and the row counts verified. Record each rehearsal here.

| Date | By | Archive | Result / notes |
| --- | --- | --- | --- |
| ______ | ______ | ______ | ______ |

---

## 5. Incident response

### 5.1 Where the signals are

| Signal | How to read it |
| --- | --- |
| App logs | `pm2 logs ve-plan-backend`, or `backend/logs/out.log` / `logs/error.log`. Structured JSON (pino) in production, pretty in dev. |
| Request correlation | Every request/response carries `x-request-id` (inbound honoured, else a UUID). It is in the log line, echoed on the response header, and in every `500` body as `data.requestId`. A user reporting an error can quote the "ref" from the toast. |
| Unhandled API errors | Log lines tagged `event: "unhandled_error"` (with `stack`). |
| SPA errors | `POST /api/v1/client_errors` → log lines tagged `event: "client_error"` (message, stack, url, userAgent, and `user` id when the reporter was signed in). |
| Metrics | `curl -H "Authorization: Bearer $METRICS_TOKEN" https://<host>/backend/api/v1/metrics` — see §6. |
| Audit trail | `AuditLog` collection — see §5.3. |
| Health | `GET /api/v1/health` — `200` + `{ uptime, db }` when Mongo is connected, `503` otherwise. |

### 5.2 Fast triage

1. `GET /api/v1/health` — is the process up and is Mongo connected?
2. `pm2 status` — restart count climbing? memory near 500M (→ `max_memory_restart`)?
3. `/metrics` — `mongo_up`, `http_requests_total` by `status_code`, event-loop lag,
   `email_queue_depth`.
4. Grep logs for the reported `x-request-id` or for `event: "unhandled_error"` /
   `"uncaughtException"`.

### 5.3 Audit log queries

```js
// recent security-sensitive actions
db.auditlogs.find().sort({ createdAt: -1 }).limit(50)

// everything a given actor did
db.auditlogs.find({ "actor.id": ObjectId("<userId>") }).sort({ createdAt: -1 })

// history for one event (deletes, approvals, invites, meeting create/end)
db.auditlogs.find({ "target.type": "event", "target.id": "<eventId>" }).sort({ createdAt: -1 })

// tie a row back to the request logs
db.auditlogs.find({ requestId: "<x-request-id>" })
```

Actions recorded: `role.set`, `register.approve`, `invite.send`,
`meeting.create`, `meeting.end`, `event.delete`, `account.delete`,
`password.change`, `password.reset`. Rows auto-expire after 400 days (TTL index).

---

## 6. Health & monitoring

### 6.1 `/api/v1/health`

Point an external uptime check (UptimeRobot, a cron `curl`, etc.) at it every
1–2 min. `503` means the process is up but Mongo is unreachable — page on a
sustained `503` or on no response at all.

### 6.2 `/api/v1/metrics` (Prometheus text, token-guarded)

Not yet scraped by a collector — read it by hand during an incident, or point a
Prometheus/Grafana Agent at it later (the format is scrape-ready).

| Series | "Normal" | Investigate when |
| --- | --- | --- |
| `mongo_up` | `1` | `0` for more than a scrape or two |
| `http_requests_total{status_code=~"5.."}` | flat | rising |
| `http_request_duration_seconds` (p95) | < 0.3 s reads / < 0.8 s writes | sustained above |
| `socket_connections` | ≈ active users, ≤ ~500 | pinned at a cap, or 0 while users are online |
| `email_queue_depth` | near 0, drains within a sweep | climbing → Gmail daily send cap hit (see §7) |
| `nodejs_eventloop_lag_seconds` | < 0.05 | spikes → a sync hot path |
| `process_resident_memory_bytes` | < 500 MB | near 500 MB → `max_memory_restart` churn |

---

## 7. Common failures

| Symptom | Likely cause | Action |
| --- | --- | --- |
| `/health` `503`, `mongo_up 0` | Mongo down / network | Restart `mongod`; check disk (§ below); the API self-recovers when Mongo returns. |
| `email_queue_depth` climbing, verification mails not arriving | Gmail daily send cap (500–2000) exhausted — often by one large approve-all | Wait for the 24 h window to reset; long-term move to a transactional provider (SendGrid/Resend keys exist in old `.env` but are **not** read by current code). |
| Disk full | `dist/photos/` uploads + `backups/` + `logs/` growth | Prune old backups (retention), rotate `logs/`, check upload volume. |
| All sessions logged out after a deploy | Migration `005` ran (first `tokenVersion` deploy) — expected once | None — communicate to users. |
| Meeting won't start / "invalid token" | 8x8 `PRIVATE_KEY_PATH` / `JITSI_API_KEY` wrong or key rotated | Verify the `.pem` path and key id; restart. |
| Every request `401` right after config change | `JWT_SECRET` changed — invalidates all tokens | Intentional only for a secret rotation; otherwise restore the old secret. |
| Process restart-looping | `assertEnv()` failing (missing prod env), or `uncaughtException` → graceful exit(1) → pm2 restart | `pm2 logs` shows the reason on the first lines; fix env or the crashing path. |

---

## 8. Graceful shutdown & signals

- **`SIGTERM` / `SIGINT`** → ordered drain: stop accepting HTTP → close
  Socket.IO → close Mongo → `exit(0)`. Hard `exit(1)` after 10 s if the drain
  stalls. This is what `pm2 reload` and a clean `pm2 stop` trigger.
- **`unhandledRejection`** → logged (`event: "unhandledRejection"`), process
  stays up.
- **`uncaughtException`** → logged `fatal` (`event: "uncaughtException"`), then
  the same graceful drain with `exit(1)` so pm2 restarts a clean process.

---

## 9. Key rotation

| Secret | Effect of rotating | Steps |
| --- | --- | --- |
| `JWT_SECRET` | Every existing web + mobile session is invalidated immediately | Set new value → `pm2:reload` → announce re-login. |
| `METRICS_TOKEN` | `/metrics` scrapes need the new token | Set new value → `pm2:reload` → update the scraper/cron. |
| `COOKIE_SECRET` | In-flight OAuth `state` cookies invalid (brief) | Set new value → `pm2:reload`. |
| 8x8 `JITSI_API_KEY` / private key | New meeting tokens only; live meetings unaffected until rejoin | Rotate in the 8x8 console → update `.env` → `pm2:reload`. Do this after any suspected key exposure. |
