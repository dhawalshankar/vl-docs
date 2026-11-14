---
title: Operations and debugging
---

# Operations and debugging

This page documents operational boundaries visible in the reviewed source.
Use the deployment provider's current dashboards and secret manager for
actual production values; do not put credentials in the docs.

## Deployment topology

| Component | Current deployment described by its repository | Data/provider boundary |
| --- | --- | --- |
| Main web app | Vercel at `vartalang.in` | Next.js pages and voice-challenge server routes |
| Main API | Render | MongoDB Atlas; Socket.IO on the Express HTTP server |
| LMS web app | Vercel at `learn.vartalang.in` | LMS-specific browser session and checkout |
| LMS API | Render | PostgreSQL; Razorpay; YouTube Data API |
| Voice Challenge storage | Google Drive | OAuth client/refresh token and one configured folder |
| Language games | Separate linked site | Not represented by the four repositories examined here |
| Docs site | Docusaurus deployment configured for `docs.vartalang.in` | `vl-docs` static build |

Deployment mechanisms may have changed since README authoring. Confirm live
provider projects, environment groups, domain aliases, and branch mappings
before releasing.

## Environment ownership

| Name | Service | Secret? | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Main web | No (public origin) | Main Express REST API and Socket.IO in frontend helpers |
| `NEXT_PUBLIC_SOCKET_URL` | Main web | No (public origin) | Documented socket URL; check consumers in current build |
| `BACKEND_API_URL` | Main web server route | No (server URL) | Voice challenge forwards auth/admin checks here; fallback is `NEXT_PUBLIC_API_URL` |
| `GOOGLE_OAUTH_CLIENT_ID` | Main web server route | Sensitive configuration | Drive OAuth client |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Main web server route | Yes | Drive OAuth secret |
| `GOOGLE_REFRESH_TOKEN` | Main web server route | Yes | Drive OAuth refresh token |
| `GOOGLE_DRIVE_FOLDER_ID` | Main web server route | Treat as private config | Voice submissions folder |
| `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID` | Main API | Yes | Mongo connection, JWT, Google auth |
| `RESEND_API_KEY`, `FRONTEND_URL` | Main API | API key / URL | Password recovery email |
| `LMS_URL`, `LMS_SSO_SECRET` | Main API | Secret key is yes | Main-to-LMS redirect and shared SSO secret |
| `SARVAM_API_KEY` | Main API | Yes | Sarvam translation/TTS |
| `TRANSLATION_PROVIDER`, `GOOGLE_TRANSLATE_API_KEY` | Main API | Provider key is yes | Translation route/fallback |
| `NEXT_PUBLIC_MAIN_API_URL` | LMS web | No (public origin) | Main account auth and SSO-code creation |
| `NEXT_PUBLIC_LMS_API_URL` | LMS web | No (public origin) | LMS API; client appends `/api/v1` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | LMS web | Public client identifier | Browser Google OAuth |
| `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS` | LMS API | Yes except origins | PostgreSQL, LMS JWT, frontend allow-list |
| `VARTALANG_MAIN_AUTH_URL`, `SSO_SHARED_SECRET` | LMS API | Secret is yes | Main API SSO verification endpoint |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | LMS API | Secret is yes | Payment order/signature processing |
| `YOUTUBE_API_KEY` | LMS API | Yes | Admin playlist importer only |

`NEXT_PUBLIC_*` values are shipped to browsers. Never place passwords,
service credentials, signing keys, OAuth client secrets, or shared SSO
secrets in them.

## Local service startup

Run each app in its own terminal from its own repository:

```text
Main MongoDB:        local MongoDB or approved dev cluster
Main API:            node src/server.js                    (default :4000)
Main web:            npm run dev                            (default :3000)
LMS PostgreSQL:      local PostgreSQL or approved dev DB
LMS API:             uvicorn app.main:app --reload --port 8000
LMS web:             npm run dev                            (default :3000)
Docs:                npm start                              (Docusaurus dev server)
```

The two Next.js apps both commonly use port 3000. Use a second explicit port
when running them at the same time and update CORS origins accordingly. Use
the correct environment file for each repository; never copy production
values into local development.

## CI and test coverage

| Repository | Available checks seen in source |
| --- | --- |
| Main web (`vartalang`) | GitHub Actions: `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build` |
| Main API (`vl-backend`) | `npm start` / `npm run dev`; no test/lint scripts in package manifest |
| LMS web (`vl-education`) | `npm run lint`, `npm test` (Vitest), `npm run build`; focused checkout/sales tests exist |
| LMS API (`vl-lms-backend`) | README documents venv, requirements install, Alembic and Uvicorn; no test runner is declared |
| Docs (`vl-docs`) | `npm run build` |

Do not report a service as covered by automated tests just because another
repository has a CI workflow. Add focused tests in the owning repo when
behavior changes.

## Database and release operations

### Main MongoDB

- Check `MONGODB_URI`, network access, and service logs before debugging API
  route failures.
- Mongoose model indexes include match TTL, job TTL/text search, and unique
  fields. On startup, the main server also checks an older match TTL index
  and ensures current indexes.
- Job expiry/cleanup catch up on every API start as well as running on cron.
- Reports and chats may contain moderation context and user messages; respect
  the team's retention and access policy during troubleshooting.

### LMS PostgreSQL

- Schema history is in `alembic/versions/`; use `alembic upgrade head`.
- Review autogeneration output before applying it. `Base.metadata.create_all`
  during app startup is not a substitute for reviewed migrations.
- Payment rows are financial records; do not delete/recreate them to debug
  checkout without an approved reconciliation plan.
- There is no refund execution endpoint in the reviewed API; the admin UI's
  refund preparation action is disabled.

### Voice Challenge Google Drive

- Server route credentials: `GOOGLE_OAUTH_CLIENT_ID`,
  `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`,
  `GOOGLE_DRIVE_FOLDER_ID`.
- OAuth refresh token must remain valid; the helper recognizes
  `invalid_grant`/`invalid_client` errors.
- The folder is the persistence layer. The admin UI lists matching filenames
  and links directly to the Drive file. There is no database lifecycle,
  retention policy, automated scoring, or delete route in the inspected
  implementation.
- `app/api/challenge/submit/route.ts` limits payloads to 100 MiB; the browser
  recorder stops at 60 seconds.
- The Drive helper currently contains temporary diagnostic logging that
  prints fragments/lengths of OAuth credential material. Keep production
  logs restricted and remove that debug logging in the owning code change.

## Known integration mismatches

These are useful first checks when a feature appears disconnected:

1. **LMS SSO verify path:** `vl-lms-backend/.env.example` points to
   `/api/v1/sso/verify`; the inspected main Express router mounts
   `/sso/verify` with no `/api/v1` prefix. Validate deployment rewrites and
   align the configured URL with the real mounted route.
2. **Job view counter:** the main frontend posts to
   `/jobs/:id/views`; the main API route is `POST /jobs/:id/view`.
3. **Roles details:** main frontend `/roles/:slug` fetches `/api/roles/:slug`,
   but no matching handler exists in the inspected `app/api` route tree.
4. **Chat pronunciation:** the frontend can pass `lang=translated`, but the
   API synthesizes the original text and does not use the query parameter.
5. **Socket CORS:** the Express REST origin list includes the LMS website;
   the Socket.IO origin list does not. Main chat should use the main web
   origin.
6. **Notification unread count:** `/notifications/unread-count` counts all
   recipient notifications, not only records with `read: false`.
7. **Streak source of truth:** an LMS API record exists, but the LMS frontend
   streak helper currently uses browser localStorage.
8. **Challenge/practice demo behavior:** LMS practice evaluation returns
   fixed sample scores; challenge and leaderboard endpoints can return
   hard-coded fallback content. Confirm database rows and route code before
   treating those values as real activity.
9. **Main API error surface:** the final Express error handler returns a
   generic 500; inspect service logs with a request timestamp/correlation
   context rather than expecting client error details.

## Debugging sequence

For a user-reported issue:

1. Record the browser route, timestamp/time zone, account role, and exact
   request path/status without copying a token or sensitive payload.
2. Identify which frontend owns that route and which base URL it resolved.
3. Use browser network logs to distinguish CORS, auth, transport, and API
   errors.
4. Check the owning backend's health route and provider/database connectivity.
5. Check role dependencies and token type: main JWT is not an LMS JWT.
6. Inspect logs in the owning deployment; redact identifiers or message
   content before sharing.
7. Verify the feature is not currently a static page, fallback response, or
   roadmap item.

## Analytics and tracking

The main web application loads Google Analytics and Google Ads scripts from
its Next.js root layout. The LMS frontend loads its own Google Tag Manager
container. The documentation site has a separate GTM container in
`docusaurus.config.mjs`. These are three different web properties; validate
the correct container and consent/privacy behavior when changing tracking.
