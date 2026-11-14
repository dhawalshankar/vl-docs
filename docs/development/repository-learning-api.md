---
title: Learning API
---

# Learning API: `vl-lms-backend`

This FastAPI service owns LMS identity records and learning-domain data. It
does not store main-platform passwords. The main VartaLang API is the identity
provider for normal LMS sign-in; the LMS verifies a one-time code and issues
its own JWT.

## Runtime, startup, and migrations

- Python 3.10+; FastAPI; Uvicorn; SQLAlchemy 2; PostgreSQL; Pydantic 2;
  Alembic.
- `app/main.py` mounts the versioned router at `/api/v1`, applies configured
  CORS, exposes `/health`, and exposes Swagger/ReDoc/OpenAPI at
  `/docs`, `/redoc`, `/openapi.json`.
- The lifespan attempts `Base.metadata.create_all()` if the database is
  reachable and suppresses startup exceptions. This does not replace schema
  review or Alembic migrations; use Alembic as the migration history and
  deployment procedure.
- `alembic upgrade head` applies migrations. `alembic revision
  --autogenerate -m "..."` creates a candidate migration; inspect and edit
  generated operations before applying.
- Run locally with `uvicorn app.main:app --reload --port 8000` or `python
  main.py`.

## Package map

| Path | Responsibility |
| --- | --- |
| `app/main.py` | FastAPI app, lifespan, CORS, health/root routes |
| `app/api/v1/api.py` | Prefix router aggregation |
| `app/api/v1/endpoints/` | Domain endpoints and service workflows |
| `app/api/deps.py` | Bearer token parsing, current user, role checks |
| `app/core/config.py` | Environment-backed settings and PostgreSQL URL normalization |
| `app/core/database.py` | Engine, session, DB dependency |
| `app/core/security.py` | Password hash utilities and LMS JWT issuance/verification |
| `app/models/` | SQLAlchemy entities and relationships |
| `app/schemas/` | Pydantic API contracts |
| `app/services/sso.py` | Server-to-server main identity verification |
| `alembic/versions/` | Ordered schema history |

`api.py` registers these route groups: `auth`, `users`, `instructor`,
`courses`, `enrollments`, `payments`, `practice`, `challenges`,
`certifications`, `articles`, `careers`, and `admin`.

## Authentication and role checks

Normal flow is `POST /api/v1/auth/sso/exchange` with a one-time code. The LMS
calls the configured main-platform verifier with `X-SSO-Secret`, provisions
or updates the `users` row, records first/last login and login count, then
issues an LMS JWT. Token subject is the LMS UUID; the token includes the LMS
role and expires according to `ACCESS_TOKEN_EXPIRE_MINUTES` (default 1,440
minutes).

`get_current_user` decodes the LMS JWT, loads the LMS user, and rejects
inactive users. `require_role([...])` enforces roles on API operations.
`get_optional_current_user` allows guest behavior on selected routes.

`POST /api/v1/auth/dev-login` is hidden as 404 unless
`ENABLE_DEV_LOGIN=true`; it is a local testing shortcut, not a production
authentication path. Keep it disabled in production.

When an SSO user already has an LMS instructor profile, the SSO sync preserves
the instructor-managed name/photo. Disabled or soft-deleted LMS rows are not
reactivated/recreated by a later login.

## Domain behavior

### Courses and approvals

`Course` owns ordered `Module` rows; each module owns ordered `Lesson` rows.
Course status values include `draft`, `pending_review`, `published`,
`rejected`, and `archived`. Instructors create/edit drafts and submit for
review. Published and pending-review courses are locked for instructor edits.
Admins approve, reject, unpublish, or publish directly. Admin-created courses
can be marked `managed_by_admin`.

Course list routes can return only published courses for public/student
catalog requests; admin/instructor endpoints have broader scopes. The catalog
language counts come from course data, not from a fixed promise that every
catalog language has content.

### Enrollment and progress

An enrollment is unique per `(user_id, course_id)`. Enrollment status is
`active`, `completed`, or `cancelled`. Lesson progress is unique per
`(user_id, lesson_id)` and has an `is_completed` boolean plus nullable
`completed_at`. The API toggles lesson completion and derives course progress
from the lesson set.

Enrollment in a paid course requires a paid LMS `Payment` unless the
development-only `demo_bypass=true` query parameter is enabled. Enrollment
creates membership in a course-linked `Group` if one exists.

### Payments

`POST /payments/create-order` checks course publication, duplicate paid
purchase/enrollment, paid price, and server credentials. It converts the
course price to paise, creates an order with Razorpay, and stores a `created`
payment row. `POST /payments/verify-payment` finds the order for the caller,
verifies `HMAC-SHA256(order_id|payment_id)` with the server secret using
constant-time comparison, and marks the row `paid`.

The API does not expose a refund endpoint in the reviewed route set. Admin
financial reports support reconciliation/investigation, not a refund action.

### Practice and challenges

The API has `/practice/labs`, `/practice/progress`, and `/practice/evaluate`.
When no active practice-lab rows are available, the list endpoint returns
hard-coded default lab descriptors. `evaluate` currently stores a
`PracticeSession` with fixed sample score/feedback and returns fixed
phoneme-details; it does not call Sarvam or another speech model. Do not use
the response as a real learner evaluation.

The challenge API lists active database challenge metadata and a leaderboard.
If the database query errors or returns no entries, it returns hard-coded
challenge/leaderboard defaults. The default leaderboard names and scores are
sample data. This API is separate from the main site's Google Drive Voice
Challenge submission route.

### Streaks

`POST /users/streak/heartbeat` and `GET /users/streak` use
`UserStreakRecord` for an authenticated LMS user. The heartbeat accepts a
local calendar date and maintains current/longest streak, total active days,
and up to 30 history dates. Without an authenticated user, the endpoint
returns a guest-shaped default rather than persisting a guest row. The
current LMS frontend's streak helper still stores its own local state.

### Admin workflows

Admin endpoints manage courses/users, course approvals, instructor
enrollment summaries, and detailed enrollment/payment financial reports.
Playlist import uses YouTube Data API server-side, validates admin and
instructor identity, skips private/deleted videos, and creates a free draft
course with one module and lesson per imported video (capped at 500). It
stores video identifiers/metadata and embeds YouTube; it does not download
media.

## Environment settings

All settings are read from server `.env` via Pydantic Settings. Names include:

| Setting | Purpose |
| --- | --- |
| `PROJECT_NAME`, `ENVIRONMENT`, `PORT`, `DEBUG` | Service identity/runtime |
| `ENABLE_DEV_LOGIN` | Explicitly gates development-only login |
| `CORS_ORIGINS` | Allowed browser origins |
| `DATABASE_URL` | PostgreSQL connection |
| `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | LMS JWT |
| `VARTALANG_MAIN_AUTH_URL`, `SSO_SHARED_SECRET` | Main API SSO verify |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payment processing |
| `YOUTUBE_API_KEY` | Admin playlist import |

The example `.env` currently sets `VARTALANG_MAIN_AUTH_URL` to a path ending
in `/api/v1/sso/verify`, while the inspected main Express server mounts its
route at `/sso/verify`. Confirm the deployed URL/rewrite before using that
sample value; the codebases do not show a shared `/api/v1` prefix for the
main Express service.
