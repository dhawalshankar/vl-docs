# VartaLang Documentation — Complete Knowledge Base

> Comprehensive documentation of the VartaLang ecosystem, platform architecture, services, and developer guides for Sarvam Voice Agents / Knowledge Base.

---

## Document: architecture\learning-platform.md

# Learning platform

VartaLang Learn is a separate application for structured language study. Its
Next.js frontend communicates with an independently deployed FastAPI API. The
API uses PostgreSQL and owns its course, curriculum, enrollment, progress,
instructor, payment, and administration data.

Internal repo references: [learning web application](../development/repository-learning-web.md),
[learning API](../development/repository-learning-api.md), and
[LMS data model](../development/data-and-state.md).

## Learner experience

The learning application provides a language and course catalog, course
details and lessons, enrollment, lesson progress, learner dashboards, and
access to published learning content. The catalog includes Indian languages,
English, and additional languages when courses are available. The visible
catalog reflects published course data rather than a promise that every
language already has a course.

Course access can be free or paid. For paid courses, the API creates and
verifies Razorpay orders before enrollment is completed. Users can return to
their courses and track lesson completion and progress.

## Instructors and administrators

Instructors can create courses, organize modules and lessons, add learning
resources, and submit courses for review. Administrators can review and
publish submissions, manage courses and instructors, and use platform
reporting. The admin interface also supports importing public YouTube
playlists into draft courses; imported courses require review before
publication.

## API and identity

The learning API is mounted at `/api/v1` and provides route groups for auth,
users, instructors, courses, enrollments, payments, practice labs,
challenges, certifications, articles, careers, and administration. Interactive
API documentation is available from the running service at `/docs`.

The learning frontend uses VartaLang single sign-on. The main platform
verifies a short-lived, single-use code and returns the account identity and
role; the learning API then issues its own access token. This keeps identity
connected while the LMS remains the source of truth for learning records.

## AI practice status

Practice labs and evaluation routes exist in the LMS API, and the application
surfaces planned practice modules. Listening, pronunciation evaluation,
dictation, and mentor-review features shown with future availability labels
should be treated as planned experiences, not as currently available AI
capabilities. Sarvam AI translation and message pronunciation are currently
implemented in the main platform's chat service.

In particular, `/api/v1/practice/evaluate` currently returns a fixed
demonstration score/feedback and does not call a speech model. Challenge
routes can fall back to static sample challenge and leaderboard data. See the
[learning API guide](../development/repository-learning-api.md) before relying
on those responses.

---

## Document: architecture\main-platform.md

# Main platform

The main VartaLang application is the community and opportunity layer of the
ecosystem. It lets people describe the languages they know and want to learn,
connect with compatible partners, chat, browse language resources, and find
language-related jobs.

## Web application

The Next.js application provides:

- Account signup, sign-in, password recovery, and profile editing.
- Learner and teacher profile details, including known languages, fluency,
  learning goals, and location.
- Language matching, chat, notifications, and account controls.
- Published language guides, learning resources, and a link to the separate
  VartaLang Learn course platform.
- Jobs, role, and other language-linked opportunity views.
- A learning area that links to additional resources such as Gauraiyya Radio
  and language games.

## Main API

The Node.js/Express API provides authenticated endpoints for profiles,
matching, chat, notifications, and administration, as well as public and
authenticated job and language-guide routes. MongoDB stores the main
platform's user, chat, match, notification, job, and language-guide data.

Socket.IO is attached to the API server for chat and notification events,
including message delivery, read receipts, block/unblock state, and user
notifications. Do not assume typing or online-presence events are implemented
by the current Socket.IO server. The API also supports account hand-off to
Learn through single-use SSO codes.

## Matching and communication

Matching uses the languages each person knows and wants to learn to find
reciprocal language fits. A connection request can be accepted or declined;
accepted connections can continue in a one-to-one chat. Chat includes
blocking, reporting, and deletion controls.

Recipients can opt into translated messages. Sarvam AI is used for supported
Indian-language translation and on-demand text-to-speech pronunciation. The
original message remains the source message; a translation is an additional
reading aid.

## Related documentation

- [Language exchange](../platform/language-exchange.md)
- [Jobs](../platform/jobs.md)
- [Learning resources](../platform/learning-resources.md)
- [Safety and trust](../platform/safety-and-trust.md)
- [Main web application internals](../development/repository-main-web.md)
- [Main API internals](../development/repository-main-api.md)

---

## Document: architecture\overview.md

# Architecture overview

VartaLang is a set of independently deployed applications and APIs rather than
a single service. The main product connects learners with people and
opportunities; VartaLang Learn provides a separate course and enrollment
experience. Each API owns its own data and domain.

For engineering onboarding, start with the [internal developer onboarding
map](../development/onboarding.md), then use the
[repository guides](../development/repository-main-web.md) and
[data ownership map](../development/data-and-state.md).
The [system design guide](./system-design.md) distinguishes current design
decisions from recommended improvements and delivery practices.

## Services at a glance

| Component | Responsibility | Main technologies |
| --- | --- | --- |
| Main web application | Profiles, matching, chat, language guides, jobs, and learning entry points | Next.js, React, TypeScript |
| Main platform API | Identity, profiles, matches, chat, notifications, jobs, guides, and real-time events | Node.js, Express, MongoDB, Socket.IO |
| Learning web application | Course discovery, course lessons, learner/instructor/admin views, and checkout | Next.js, React, TypeScript |
| Learning API | Courses, enrollments, lesson progress, practice, certifications, payments, and administration | FastAPI, SQLAlchemy, PostgreSQL |
| Language games | A separate language-game experience linked from the main learning area | Separate web application |
| AI providers | Indian-language chat translation and message pronunciation | Sarvam AI; optional Google Translate fallback |

The frontends and APIs are deployed separately. The main platform uses MongoDB
for its community and opportunity data, while the learning API uses PostgreSQL
for courses, enrollments, progress, and related learning records.

```text
Main browser app (Next.js) --> Main Express API --> MongoDB
          |                       |     |
          |                       |     +--> Sarvam AI / Google Translate
          |                       +--------> Socket.IO
          |
          +--> one-time SSO --> LMS browser app (Next.js) --> LMS FastAPI --> PostgreSQL
                                                                     |--> Razorpay
                                                                     `--> YouTube Data API

Voice Challenge: main Next.js API route --> Main API identity check --> Google Drive
```

## Sign-in across the main platform and Learn

The main application owns the primary VartaLang account. When a signed-in user
opens Learn, the main API creates a short-lived, single-use authorization
code. The learning frontend sends that code to the learning API, which
verifies it server-to-server with the main API. The learning API then issues
its own token and maps the VartaLang account to a learner, instructor, or
admin role.

This exchange shares identity, not application data: the learning service
retains its own course and progress records. The LMS also supports Google
sign-in by first authenticating with the main platform and then using the same
SSO exchange.

## AI-assisted communication

For chat messages, a recipient can enable translation. The main API stores and
sends the original message immediately; when translation is enabled, it
translates asynchronously and updates the conversation when a result is
available. Sarvam AI is the preferred provider for supported Indian
languages. Google Translate can handle foreign-language targets or act as a
configured fallback. Message pronunciation is generated on demand through
Sarvam AI text-to-speech and cached with the message.

These are focused language-assistance features, not a claim that every
application feature is AI-generated. The learning platform's planned
pronunciation and listening practice modules are not the same as the live chat
translation and pronunciation tools.

## Deployment boundaries

The main and learning frontends are available at [vartalang.in](https://vartalang.in)
and [learn.vartalang.in](https://learn.vartalang.in). Their APIs are separately
configured services. The language-games surface is also linked as a separate
experience. Use the [local setup guide](../development/local-setup.md) for
service configuration and the [API reference](../development/api-reference.md)
for route groups.

---

## Document: architecture\services.md

# Supporting services

VartaLang keeps identity, community features, and structured learning in
separate services, and connects them through HTTP APIs and a controlled
single-sign-on exchange.

## Main platform API

The Express API serves the main VartaLang frontend. It handles account
authentication, profiles, language matching, chat, notifications, jobs,
language guides, and administrative moderation. MongoDB is its primary data
store, and Socket.IO provides authenticated real-time chat and notifications.

## Learning API

The FastAPI service powers VartaLang Learn. It uses PostgreSQL and provides
versioned routes under `/api/v1` for course management, enrollments,
progress, instructors, practice, challenges, certifications, payments,
careers, articles, and administration. Alembic migrations manage the database
schema.

## Sarvam AI language services

The main API integrates Sarvam AI for two chat capabilities:

1. **Translation:** a recipient can opt in to translation. The API prefers
   Sarvam AI for supported Indian languages. Google Translate is used for
   foreign-language targets or as a fallback when configured. Translation
   happens after the original message is sent, so a provider delay does not
   hold up message delivery.
2. **Text-to-speech:** a user can request spoken pronunciation for a chat
   message. Audio is generated on demand and cached to avoid repeated
   provider requests for the same message.

The Sarvam API key belongs only in the main backend's server-side environment.
It must not be added to a browser-exposed variable or committed to source
control. Provider availability and supported language coverage can change;
translation or audio may be unavailable when provider configuration or
upstream service is unavailable.

## Single sign-on

The main API creates an expiring one-time code for a signed-in user. The
learning API verifies the code with the main API using a server-side shared
secret, consumes it once, and creates a learning-platform session. Account
roles are mapped to LMS roles. The shared secret is server-only and must be
configured on both services.

The main web application also hosts the two server-side Voice Challenge
routes. They delegate identity/admin checks to the main API and use Google
Drive as their recording store. This is separate from the LMS's
`/api/v1/challenges` metadata and leaderboard API.

## Other integrations

- **Razorpay** handles paid course checkout through server-created orders and
  server-side payment verification.
- **YouTube Data API** lets LMS administrators import public playlist
  metadata into draft courses. The importer links to videos; it does not
  download them.
- **Google OAuth** is supported for account sign-in.
- **Language games** are a separately linked experience rather than part of
  the LMS API.

For code ownership, configuration, and known cross-service mismatches, see
[developer onboarding](../development/onboarding.md) and
[operations](../development/operations.md).

---

## Document: architecture\system-design.md

# System design and engineering practices

This guide separates **observed implementation** from **recommended
direction**. The recommendations are not claims about shipped behavior or a
mandate to rewrite the system. Prefer incremental changes that address a
measured user, reliability, security, or operating-cost problem.

## Design goals

The ecosystem has two distinct product domains:

1. **Language exchange and community:** identity, profiles, matching, chat,
   guides, notifications, and jobs.
2. **Structured learning:** courses, curriculum, enrollments, lesson progress,
   instructor workflows, and payments.

The main web/API pair and the Learn web/API pair are independently deployed.
Each domain owns its persistence and authorization. The current cross-domain
boundary is a server-verified, single-use SSO code, not shared database access.
See the [onboarding system map](../development/onboarding.md) and
[data ownership guide](../development/data-and-state.md) for implementation
details.

## Deliberate decisions visible in the code

| Decision | Current implementation | Benefit and trade-off |
| --- | --- | --- |
| Separate learning and community systems | Main API uses MongoDB; LMS API uses PostgreSQL. Their models and tokens are distinct. | Keeps learning transactions and community data independently owned; adds cross-service identity and operational complexity. |
| Server-side identity hand-off | Main API returns a hashed, expiring, single-use SSO code; the LMS verifies it server-to-server and issues its own JWT. | Avoids sharing passwords or treating one service's token as the other's; requires coordinated configuration and integration tests. |
| Domain-appropriate persistence | MongoDB documents model community records and embedded chat messages; relational LMS tables model course, enrollment, and progress relationships. | Fits the current access patterns; each approach has scaling constraints (document growth versus relational migrations and query design). |
| Provider calls stay behind services | Sarvam and optional Google Translate are called by the main API; Razorpay and YouTube credentials are used by the LMS API. | Keeps provider secrets out of browser code and lets APIs enforce provider-specific validation and limits. |
| Chat delivery is not held up by translation | The original chat message is persisted and delivered before the optional translation result. | Translation latency/failure does not block the core message; an in-process follow-up is less durable than a persistent job queue. |
| Payment is verified by the server | The LMS creates Razorpay orders and verifies the returned signature using a server-side secret. | The browser does not decide payment success; payment state and enrollment still need consistent, retry-safe transitions. |
| LMS schema changes have migration history | Alembic migrations are present for PostgreSQL. | Provides reviewable, ordered schema changes; startup `create_all()` should not become a substitute for migrations. |
| API role checks are server-side | FastAPI dependencies enforce LMS roles; the main API has admin middleware. | API boundaries, rather than UI visibility, decide access; main admin identification is currently a hard-coded email and needs centralization. |

These are design choices inferred from the checked-in repositories. Confirm
runtime configuration and deployment behavior before relying on them as
production guarantees.

## Practices to preserve

- **Keep data ownership explicit.** Do not directly read or write another
  service's database. Add a versioned API contract or a deliberate event
  integration when cross-domain data is needed.
- **Keep secrets server-side.** Browser environment variables are public by
  design. Payment, SSO, database, Sarvam, and Drive credentials must remain in
  the owning service's secret manager.
- **Validate authorization at the API.** Frontend route guards improve UX but
  do not replace authenticated, role-checked API operations.
- **Use short-lived, single-use credentials for hand-offs.** The current SSO
  design avoids passing a long-lived main token to the LMS.
- **Treat database migrations as reviewed code.** Create and inspect an
  Alembic migration for PostgreSQL schema changes; consider indexes, TTL
  behavior, backfills, and rollback plans for MongoDB changes.
- **Preserve graceful provider degradation.** Translation and audio are
  auxiliary to sending the original message. Keep provider timeouts bounded
  and return a clear product state when an optional provider is unavailable.
- **Keep demo behavior unmistakable.** Sample scores and fallback leaderboard
  rows must never be presented as real learner assessment or live competition
  results.
- **Document cross-service contracts.** SSO URLs, role mappings, token
  ownership, browser origins, payment states, and route versions need one
  named owner and automated compatibility checks.

## Gaps and practices to correct

Prioritize these based on data sensitivity and user impact. The list records
observed seams; severity and exposure should be confirmed with the service
owners before scheduling work.

| Gap observed | Why it matters | Recommended correction |
| --- | --- | --- |
| Main and LMS browser tokens are stored in `localStorage`. | Any successful script injection in the origin can read bearer tokens. | Assess an HTTP-only, Secure, SameSite cookie/BFF design. If tokens remain browser-accessible, reduce lifetime where practical, enforce strict output escaping and CSP, and avoid storing additional sensitive data there. Plan migration and CSRF protections rather than changing cookie behavior piecemeal. |
| Main admin access is tied to a hard-coded email; LMS roles are separate. | Access changes are coupled to code and role mapping can drift between services. | Use explicit, auditable admin grants with least privilege; centralize the policy per service, define provisioning/revocation, log privileged actions, and test SSO role mapping. |
| LMS startup attempts `create_all()` and suppresses exceptions. | A schema/startup failure can be hidden, and runtime schema creation competes with migration ownership. | Make migrations the deployment gate. Fail readiness clearly on required database errors; remove silent exception suppression after deployment behavior is verified. |
| LMS practice evaluation returns fixed sample results; challenge fallback data can look real. | Users and downstream systems may mistake demonstration data for model output or live rankings. | Keep these routes disabled or explicitly labeled as demo until backed by real evaluation and persisted challenge state. Add tests that reject sample fallbacks in production mode. |
| Main Voice Challenge submissions are Drive files without durable submission records or consent/script metadata. | Filename-based duplicate detection is fragile; audit, deletion, review, and retry workflows are difficult. | Add a submission record with owner, language/challenge, consent version and timestamp, script, Drive file ID, processing/review state, and retention/deletion policy. Enforce an appropriate unique key in the database. |
| Translation retry/deduplication state is partly process-local, and TTS audio is embedded in chat documents. | Process restarts can lose retry state; embedded base64 audio can increase document size and backup/transfer cost. | Move asynchronous translation to a durable queue/outbox with idempotent jobs. Measure document growth; if material, store audio in object storage and persist a reference with expiry. |
| The main frontend and backend have documented route and behavior mismatches; REST and Socket.IO origin lists differ. | A UI can silently lose a feature, and a deployment can work for HTTP but fail for sockets. | Add contract/integration tests for critical routes and a shared origin policy or deployment validation that checks both transports. |
| Backend automated test coverage is limited or absent in the inspected manifests. | Authorization, payment, SSO, migration, and provider regressions may escape frontend/build checks. | Establish service-level unit and integration test suites before making high-risk changes; run them in CI with disposable/test databases and stubbed providers. |
| Some state has two possible owners (for example LMS API streak records and frontend-local streak state). | Users can see inconsistent or device-specific results. | Name one system of record per feature. Move reads/writes through that owner and add a migration plan for client-held data if it must be retained. |

## Algorithm and data-access recommendations

There is no universally best algorithm. Choose the simplest algorithm that
matches the product semantics and data volume, then use measurements and
query plans to decide whether to optimize.

### Language-partner matching

The current match filter is a reasonable **exact eligibility rule**: a pair
must have reciprocal language fit, previously interacted users are excluded,
and results are capped. It does not currently rank candidates by location or
interests.

For the current scale, keep the eligibility rule explicit and explainable:

```text
eligible(candidate, learner) =
  candidate.known_languages intersects learner.target_languages
  AND learner.known_languages intersects candidate.target_languages
  AND candidate is not already excluded by interaction/block policy
```

Recommended evolution:

1. Normalize language identifiers and index the fields used for candidate
   filtering. Verify index use with representative query plans; avoid loading
   every profile into application memory.
2. Fetch a bounded candidate set using database predicates, then apply
   deterministic ranking only to eligible candidates.
3. If ranking is needed, start with a transparent weighted score over
   available, user-visible signals (for example reciprocal language coverage
   and explicitly selected preferences). Document weights, handle missing
   values, and provide deterministic tie-breaking.
4. Do not introduce collaborative filtering or a learned ranking model until
   there is consented interaction data, an offline evaluation set, bias
   checks, and a rollback path.

### Catalogs, jobs, and leaderboards

- Use database-side filtering, stable ordering, and bounded pagination for
  course/job lists. Prefer keyset pagination for large or frequently changing
  result sets; use composite indexes that match measured filters and sort
  order. Keep a maximum page size.
- Use explicit deterministic ordering for leaderboards, including a tie-break
  rule. Compute rankings from persisted real results; a static fallback must
  be identified as sample data, not merged into production results.
- Add indexes from observed query plans and workload metrics, not by indexing
  every field. Every index adds write and storage cost.
- Use a persistent queue or transactional outbox when a task must survive
  restarts (translation retries, email, media review). Make consumers
  idempotent, bound retries, and expose terminal failures for operations.

### Payments and state transitions

Model payment and enrollment as explicit state machines, not a series of
uncoordinated frontend calls:

```text
created -> verified/paid -> enrollment granted
   |             |
   +-> failed    +-> refund pending -> refunded (only when refund support exists)
```

The API should be the authority for each transition. Use unique provider
order/payment identifiers, idempotent verification, and reconciliation for
ambiguous outcomes. If provider webhooks are added, verify their signatures
and deduplicate event IDs. Do not expose a refund action until the provider
workflow, authorization, audit trail, and failure recovery are implemented.

## Recommended implementation and SDLC defaults

### Service structure

- Keep the existing Next.js, Express, and FastAPI stacks unless a concrete
  limitation justifies a migration. Framework churn is not a substitute for
  clearer boundaries or tests.
- Within each API, prefer a modular-monolith structure: route/controller for
  transport concerns, service for domain rules, repository/query layer where
  persistence logic is reused, and schema/model for validation and storage.
  Avoid both giant controllers and unnecessary layers for trivial operations.
- Treat OpenAPI and typed request/response schemas as contracts. Generate or
  share TypeScript types where feasible; add compatibility tests for
  high-value flows rather than duplicating unverified interfaces.
- Keep synchronous APIs for request/response work. Add asynchronous
  infrastructure only for work requiring durable retries, fan-out, or
  latency isolation; document ownership, idempotency, dead-letter handling,
  and operational alerts before launch.

### Delivery lifecycle

1. **Plan:** state the user outcome, service/data owner, API changes, privacy
   impact, failure modes, and measurable acceptance criteria. Record
   significant cross-service decisions as short Architecture Decision Records
   (ADRs), including alternatives and revisit conditions.
2. **Implement:** make a small vertical change with input validation,
   authorization, observable errors, migration(s), and backward-compatible
   contracts. Do not bundle unrelated cleanup.
3. **Test:** use fast unit tests for domain rules; integration tests for
   database, auth, and provider boundaries; contract tests for frontend/API
   and SSO; and a small end-to-end set for signup, course purchase/enrollment,
   and chat. Stub external providers in ordinary CI.
4. **Review:** require peer review and extra security/payment review for
   authentication, authorization, PII, payments, file uploads, migrations,
   and retention changes. Review generated migrations and API compatibility.
5. **Release:** deploy schema changes in an expand/contract sequence when
   old and new application versions may overlap. Use staging and a canary or
   phased rollout for risky changes; keep a rollback or forward-fix plan.
6. **Operate:** monitor latency, error rate, queue age, payment reconciliation,
   provider failures, and database health. Use request/correlation IDs without
   logging tokens, credentials, or unnecessary personal data. Feed incidents
   and support reports into follow-up work.

The docs site build and existing frontend CI are useful checks, but they do
not validate every backend contract. Add test gates incrementally, starting
with the highest-risk flows: SSO and role mapping, payment verification and
enrollment, chat authorization, admin actions, and database migrations.

## Prioritized path

1. **Reliability and truthfulness:** distinguish demos from real results;
   remove silent startup failures; resolve or explicitly track integration
   mismatches; add tests around SSO and payments.
2. **Security and auditability:** replace hard-coded admin identity with
   explicit grants; review browser token storage; audit privileged actions,
   consent, and retention.
3. **Data integrity:** make payment/enrollment transitions idempotent, give
   Voice Challenge submissions durable records, and select a single owner for
   streak state.
4. **Scale based on evidence:** add measured indexes and pagination; move
   durable asynchronous work to a queue/outbox if reliability or throughput
   requires it; externalize cached media if document growth justifies it.

Reassess these priorities with production telemetry and product requirements.
Do not treat this list as proof that a particular issue is currently causing
an incident.

---

## Document: development\api-reference.md

# API reference

The ecosystem has two REST APIs with different token formats, data stores,
and URL layouts. The main Express API is mounted at the service root; the
learning FastAPI API is mounted at `/api/v1`. Do not add `/api/v1` to main
API paths unless a deployment proxy explicitly provides that prefix.

Use the running service's generated OpenAPI document for request/response
schemas, enum values, optional parameters, and error models. The route
inventories below summarize the handlers found in the four codebases.

## Main platform API

Base URL comes from `NEXT_PUBLIC_API_URL` in the main frontend. Protected
routes require `Authorization: Bearer <main-JWT>`. Main JWTs cannot be used
with LMS APIs.

### Authentication: `/auth`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/signup` | Create local account |
| POST | `/auth/login` | Local email/password login |
| GET | `/auth/me` | Current authenticated account |
| PUT | `/auth/update-profile` | Update profile |
| POST | `/auth/forgot-password` | Request password recovery |
| POST | `/auth/reset-password` | Redeem recovery token |
| POST | `/auth/google-signup` | Verify Google token and create account |
| POST | `/auth/google-login` | Verify Google token and sign in |
| GET | `/auth/user/:userId` | Fetch profile by ID (authenticated) |

### Matching: `/matches`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/matches/potential` | Up to 20 reciprocal language matches |
| POST | `/matches/swipe` | Like/skip candidate |
| GET | `/matches/my-matches` | Current user's match records |
| POST | `/matches/:matchId/accept` | Accept incoming request |
| POST | `/matches/:matchId/reject` | Reject incoming request |

### Chat: `/chats`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/chats` | Current user's conversations |
| PUT | `/chats/translation-settings` | Toggle translation preference |
| GET | `/chats/:chatId` | Fetch conversation and messages |
| POST | `/chats/:chatId/message` | Send a message |
| POST | `/chats/:chatId/block` | Block participant |
| POST | `/chats/:chatId/unblock` | Unblock participant |
| DELETE | `/chats/:chatId` | Hide/delete conversation for caller |
| POST | `/chats/:chatId/report` | Report conversation participant |
| GET | `/chats/:chatId/message/:messageId/pronounce` | Generate/retrieve message audio |
| POST | `/chats/:chatId/read` | Mark incoming messages read |

### Notifications: `/notifications`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/notifications` | List notifications; `limit`, `skip`, and `type` filters |
| GET | `/notifications/unread-count` | Return notification count (currently not filtered by `read`) |
| DELETE | `/notifications/messages/all` | Clear all notifications; pending match requests are rejected |
| DELETE | `/notifications/clear-all-chat` | Clear all new-message notifications |
| DELETE | `/notifications/chat/:chatId` | Clear new-message notifications for one chat |
| DELETE | `/notifications/:notificationId` | Delete one notification |

### Jobs: `/jobs`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/jobs/stats` | Listing counts |
| GET | `/jobs/listings` | Browse/filter and paginate active listings |
| GET | `/jobs/languages` | Available listing languages |
| GET | `/jobs/my/jobs` | Current user's jobs (authenticated) |
| GET | `/jobs/:id` | Listing details |
| POST | `/jobs/:id/view` | Increment listing view count |
| POST | `/jobs/listings` | Create listing (authenticated) |
| DELETE | `/jobs/:id` | Delete own listing (authenticated) |
| POST | `/jobs/mark-expired` | Mark expired listings (cron/admin operation) |

The main web job board currently calls `/jobs/:id/views` (plural) for view
tracking; the API exposes singular `/jobs/:id/view`.

### Language guides: `/learn`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/learn` | List published guides |
| GET | `/learn/:slug` | One published guide |
| GET | `/learn/admin/all` | All guides, including drafts (admin) |
| POST | `/learn` | Create guide (admin) |
| PUT | `/learn/:id` | Update guide (admin) |
| DELETE | `/learn/:id` | Delete guide (admin) |
| POST | `/learn/:id/resources` | Add resource (admin) |
| PUT | `/learn/:id/resources/:resourceId` | Update resource (admin) |
| DELETE | `/learn/:id/resources/:resourceId` | Delete resource (admin) |

### SSO: `/sso`

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/sso/code` | Authenticated main user creates one-time LMS code |
| POST | `/sso/verify` | LMS service verifies code with shared-secret header |

### Main administration: `/admin`

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/admin/check` | Check whether authenticated account is admin |
| GET | `/admin/stats` | Platform statistics (admin) |
| GET | `/admin/jobs` | All jobs, including expired (admin) |
| GET | `/admin/users` | User list (admin) |
| GET | `/admin/reports` | Abuse reports (admin) |
| GET | `/admin/reports/:reportId` | Report plus chat context (admin) |
| DELETE | `/admin/reports/:reportId` | Delete/review one report (admin) |
| DELETE | `/admin/reports/bulk/all` | Permanently delete all reports (admin) |
| GET | `/admin/possible-matches` | Matching diagnostics (admin) |
| DELETE | `/admin/connections/:userId1/:userId2` | Remove pair's match/chat/notifications (admin) |
| PUT | `/admin/jobs/:jobId/extend` | Extend job expiry (admin) |
| DELETE | `/admin/jobs/:jobId` | Delete any job (admin) |
| GET | `/admin/matches` | List matches (admin) |

The main API also uses Socket.IO; its handshake and event contract are in the
[main API guide](./repository-main-api.md#socketio-contract).

## Learning API

Base URL comes from `NEXT_PUBLIC_LMS_API_URL`; the frontend appends
`/api/v1`. Protected routes require an LMS Bearer JWT. Role requirements are
enforced by FastAPI dependencies; this table labels common access scopes but
the generated OpenAPI schema is authoritative.

### Auth, users, instructors

| Method | Path | Purpose / access |
| --- | --- | --- |
| POST | `/api/v1/auth/sso/exchange` | Exchange one-time code (public route; backend verifies server-to-server) |
| POST | `/api/v1/auth/dev-login` | Development-only login; hidden unless explicitly enabled |
| GET | `/api/v1/auth/me` | Current LMS user (Bearer) |
| POST | `/api/v1/users/streak/heartbeat` | Record daily activity (optional user token) |
| GET | `/api/v1/users/streak` | Read streak (optional user token) |
| GET | `/api/v1/instructor/profile` | Instructor's own profile (instructor/admin) |
| POST | `/api/v1/instructor/profile` | Create/update own profile (instructor/admin) |
| GET | `/api/v1/instructor/sales` | Instructor sales summary (instructor/admin) |

### Courses and curriculum

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/courses/languages` | Languages and course counts |
| GET | `/api/v1/courses/instructors` | Public instructors; optional language filter |
| GET | `/api/v1/courses` | Published course catalog/filter |
| GET | `/api/v1/courses/{course_id}` | Course detail/curriculum |
| GET | `/api/v1/courses/{course_id}/resources` | Course resources |
| POST | `/api/v1/courses/{course_id}/resources` | Add course resource (instructor/admin) |
| DELETE | `/api/v1/courses/{course_id}/resources/{resource_id}` | Delete resource (instructor/admin) |
| POST | `/api/v1/courses` | Create draft course (instructor/admin) |
| GET | `/api/v1/courses/instructor/mine` | Instructor-owned courses |
| PUT | `/api/v1/courses/{course_id}` | Edit course (owner/admin; status restrictions apply) |
| POST | `/api/v1/courses/{course_id}/submit` | Submit course for review |
| PATCH | `/api/v1/courses/{course_id}/status` | Change allowed course status (instructor/admin rules apply) |
| DELETE | `/api/v1/courses/{course_id}` | Delete course (authorized owner/admin rules apply) |
| POST | `/api/v1/courses/{course_id}/modules` | Add module |
| PUT | `/api/v1/courses/modules/{module_id}` | Edit module |
| DELETE | `/api/v1/courses/modules/{module_id}` | Delete module |
| POST | `/api/v1/courses/modules/{module_id}/lessons` | Add lesson |
| PUT | `/api/v1/courses/lessons/{lesson_id}` | Edit lesson |
| DELETE | `/api/v1/courses/lessons/{lesson_id}` | Delete lesson |

### Enrollment and payment

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/enrollments/{course_id}/enroll` | Enroll; paid courses require recorded paid payment except dev bypass |
| GET | `/api/v1/enrollments/mine` | Current user's courses/progress |
| POST | `/api/v1/enrollments/{course_id}/lessons/{lesson_id}/toggle` | Toggle completion |
| GET | `/api/v1/enrollments/{course_id}/progress` | Course progress detail |
| POST | `/api/v1/payments/create-order` | Create Razorpay order for a paid course |
| POST | `/api/v1/payments/verify-payment` | Verify Razorpay signature and record paid status |

### Practice, challenges, content, and careers

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/practice/labs` | Active lab descriptors or static defaults |
| GET | `/api/v1/practice/progress` | Practice summary (optional auth) |
| POST | `/api/v1/practice/evaluate` | Evaluation route; currently fixed sample response, not model inference |
| GET | `/api/v1/challenges` | Challenge metadata or static defaults |
| GET | `/api/v1/challenges/leaderboard` | Leaderboard rows or static sample defaults |
| GET | `/api/v1/certifications` | Certification catalog |
| GET | `/api/v1/certifications/verify/{certificate_id}` | Verify certificate ID |
| POST | `/api/v1/certifications/verify` | Verify by submitted details |
| GET | `/api/v1/articles` | Article list/filter |
| GET | `/api/v1/articles/{slug_or_id}` | Article detail |
| POST | `/api/v1/articles` | Create article (admin) |
| GET | `/api/v1/careers/jobs` | Career openings |
| POST | `/api/v1/careers/jobs` | Create/manage career posting (authorized role) |
| POST | `/api/v1/careers/apply` | Submit career application |

### Administration

All `/api/v1/admin` routes require admin role.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/stats` | Platform statistics |
| GET | `/api/v1/admin/users` | User administration list |
| GET | `/api/v1/admin/instructors` | Instructor list |
| PATCH | `/api/v1/admin/users/{user_id}/status` | Activate/deactivate user |
| DELETE | `/api/v1/admin/users/{user_id}` | Soft-delete user |
| GET | `/api/v1/admin/courses` | Course review/management list |
| GET | `/api/v1/admin/instructor-enrollments` | Instructor/course enrollment summary |
| GET | `/api/v1/admin/enrollment-financials` | Enrollment/payment detail for reconciliation |
| POST | `/api/v1/admin/courses` | Create course on behalf of instructor |
| POST | `/api/v1/admin/courses/import-youtube-playlist` | Import public playlist into draft |
| POST | `/api/v1/admin/courses/{course_id}/approve` | Approve course |
| POST | `/api/v1/admin/courses/{course_id}/reject` | Reject course with reason |
| POST | `/api/v1/admin/courses/{course_id}/unpublish` | Unpublish course |
| DELETE | `/api/v1/admin/courses/{course_id}` | Delete/archive course per handler behavior |

## Separate Next.js voice-challenge routes

These are not part of either REST API:

| Method | Path | Runtime | Purpose |
| --- | --- | --- | --- |
| POST | `/api/challenge/submit` | Main Next.js server route | Verify main user through `/auth/me`, check Drive duplicate, upload consented audio |
| GET | `/api/admin/challenge` | Main Next.js server route | Check admin, list Drive submissions, map users through main API |

The LMS has no corresponding voice-upload route. Do not send these requests
to the LMS API.

## API contract rules for engineers

1. Change the route owner and its callers together; don't infer a route from
   a page path.
2. Keep main and LMS JWTs separate; verify API audience and issuer by using
   the owning service's auth dependency.
3. Keep provider keys server-side. Browser `NEXT_PUBLIC_*` values are public.
4. Treat the live OpenAPI document as authoritative where README or this
   inventory differs from the handler.
5. Add/adjust focused API tests when introducing a contract or state
   transition; document compatibility and deployment order.

For code navigation, see [main API](./repository-main-api.md),
[learning API](./repository-learning-api.md), and
[operations](./operations.md).

---

## Document: development\contributing.md

# Contributing

VartaLang is maintained across separate web, API, and documentation
codebases. Before making a change, identify which application owns the
behavior and read that repository's README and any local contribution
instructions. The project repositories may be private; access and review are
managed by their maintainers.

## Documentation changes

1. Keep product guidance aligned with the current application.
2. Separate available features from roadmap items and label future work as
   planned.
3. Avoid publishing secrets, internal environment values, private user data,
   or credentials in examples.
4. Prefer links to existing guides and public product pages over duplicated
   instructions.
5. Build the documentation site before submitting a change:

   ```bash
   npm run build
   ```

## Product and API changes

Follow the affected repository's established formatters, linters, tests, and
review process. For changes that cross a frontend/API boundary, update both
the implementation and its directly related documentation. Keep API
credentials and provider keys in server-side configuration; never expose
them through browser variables or source control.

## Reporting a problem

Include the affected product area, steps to reproduce, expected behavior,
and actual behavior. Remove account data, tokens, API keys, and other
sensitive information from screenshots and logs before sharing them.

---

## Document: development\data-and-state.md

# Data models and state ownership

There is no shared application database. The main platform stores community
and opportunity data in MongoDB; the LMS stores structured learning data in
PostgreSQL. The only cross-system identity connection is the main VartaLang
user ID/email returned during SSO.

## Cross-service identity

```text
Main MongoDB User                          LMS PostgreSQL User
-----------------                          -------------------
_id (Mongo ObjectId)  --SSO identity-----> vartalang_user_id (string)
email                 --matched/unique---> email (unique)
name                  --initial sync-----> full_name
primaryRole           --mapped------------> role (student/instructor/admin)
profilePhoto          --initial sync-----> avatar_url
```

The databases do not share foreign keys. SSO user records can be provisioned
in the LMS at first sign-in. Main user deletion/account handling and LMS
soft-deletion are separate workflows; verify both systems when implementing
account lifecycle changes.

## Main platform MongoDB

```text
User
 |-- Match(user1,user2,status,expiresAt)
 |-- Chat(participants, block/delete state)
 |     `-- embedded messages(sender,text,read,translation,TTS audio)
 |-- Notification(recipient,sender,matchId/chatId,type,read)
 |-- Report(reporter,reportedUser,chatId,reason)
 |-- Job(postedBy,language,jobType,expiry,status)
 |-- Language(status,slug,guide fields)
 |     `-- embedded Resource(title,url,type,level,free/featured)
 `-- SSOCode(userId, hashed code, expiry)
```

### Main entity notes

- **User:** email/password or Google identity; primary/secondary learning
  languages; known languages with fluency; learner/teacher role; location;
  translation preference; optional profile and learning counters.
- **Match:** ordered user pair, status, and seven-day expiry. A unique index
  applies to ordered `(user1,user2)`; the controller also checks both pair
  directions. The TTL index deletes pending/rejected records, not accepted
  ones.
- **Chat:** participants and an embedded message array. `blockedBy` controls
  blocking; `deletedBy` hides a chat per participant; `clearedAt` stores each
  user's message-history cutoff. A new message can restore a hidden chat
  while retaining the caller's prior cutoff.
- **Message:** original text, sender, timestamp, read flag, optional
  translated text/language, and cached base64 TTS audio. Audio is embedded in
  MongoDB; moving it to object storage would require an API/data migration.
- **Notification:** match/message notification types with recipient/sender
  and optional match/chat references. Current unread-count behavior counts
  all recipient notifications.
- **Report:** reporter, reported user, associated chat, reason, timestamp.
  Reports are intentionally preserved by connection reset; bulk deletion is
  a separate admin operation.
- **Job:** language/proficiency/type, compensation, company/location,
  responsibilities, requirements, contact email, poster, view count, status,
  expiry. A TTL index removes it 30 days after expiry.
- **Language:** published/draft guide, slug, native name, script, regions,
  roadmap and embedded typed resources.
- **SSOCode:** only a hash is stored; the raw code is returned to the browser,
  expires in 60 seconds, and is consumed once.

## Learning PostgreSQL

```text
User
 |--< Course (instructor_id)
 |      |--< Module
 |      |      `--< Lesson
 |      |             `--< LessonProgress >-- User
 |      |--< Enrollment >-- User
 |      |--< Payment >------ User
 |      `---- optional course Group
 |
 |-- InstructorProfile (one-to-one)
 |-- UserStreakRecord (one-to-one)
 |-- GroupMember >-- Group
 `-- Message >-- Group
```

### Learning entity notes

- **User:** UUID primary key, nullable unique `vartalang_user_id`, unique
  email, name, LMS role, active/deleted state, avatar, and SSO login
  timestamps/counter.
- **InstructorProfile:** one-to-one profile with teaching details, languages,
  social links, and payout-related fields. Public profile responses must not
  leak payout details.
- **Course:** instructor, language, curriculum metadata, price, publication
  state, tags/resources, and approval audit fields. `managed_by_admin`
  identifies admin-owned editing.
- **Module/Lesson:** ordered curriculum tree. Lessons can reference a
  YouTube video ID and notes URL; preview is a lesson flag.
- **Enrollment:** unique learner/course row with active/completed/cancelled
  status and timestamps.
- **LessonProgress:** unique learner/lesson row; `completed_at` is nullable
  so a toggled-off lesson can have no completion timestamp.
- **Payment:** user/course, amount/currency, Razorpay order/payment IDs,
  signature, and created/paid/failed status.
- **Group/GroupMember/Message:** course/community group records. Enrollment
  adds a learner to a course-linked group when one exists.
- **UserStreakRecord:** current/longest streak, total days, last local date,
  and date history.
- **PracticeLab/PracticeSession:** lab metadata and recorded score/feedback.
  The current evaluation route writes a fixed sample result.
- **Challenge/ChallengeLeaderboard:** challenge metadata and rank/XP rows.
  Default fallback leaderboard rows are static sample content.
- **Certification/UserCertification:** certification definitions and
  verification records.
- **Article:** editorial content.
- **JobPosting/JobApplication:** LMS careers content/application records;
  this is distinct from the main MongoDB jobs board.

All normal LMS entities inherit UUID and created/updated timestamps from
`TimeStampedModel`. PostgreSQL changes are represented in
`vl-lms-backend/alembic/versions/`. Do not modify the live schema by editing
models alone; create, review, and apply a migration.

## Voice Challenge storage is separate

Voice Challenge audio submitted from the main Next.js application is stored
in a configured Google Drive folder, not in either database. Current code
uses the file name to encode language, main user ID, and timestamp, and checks
Drive for an existing language/user prefix. Consent text, selected script,
recording duration, score, and review status are not persisted by the route.
Changes to retention, duplicate detection, consent audit, review, or
deletion need an explicit storage/data design.

## Data-change checklist

Before changing a field, index, or lifecycle:

1. Identify the owning database/service.
2. Search controller queries and API response schemas, not only the model.
3. Check frontend consumers and SSO serialization.
4. For MongoDB, consider indexes, embedded-array growth, and TTL behavior.
5. For PostgreSQL, add and review an Alembic migration.
6. Consider backfill, soft-delete, payment/report audit, and rollback behavior.
7. Update this page and the API contract if observable behavior changes.

---

## Document: development\local-setup.md

# Local development setup

The ecosystem is split across four codebases. The main frontend and API are
the community and opportunity product; the learning frontend and API power
structured courses. These repositories may require separate access and
service credentials.

Start with the [internal onboarding map](./onboarding.md) for service
boundaries and the [operations guide](./operations.md) for environment
ownership, service URLs, and known integration mismatches.

## Prerequisites

- Node.js compatible with the project's `engines` field (the documentation
  site requires Node.js 20 or newer).
- Python 3.10 or newer for the learning API.
- MongoDB for the main API and PostgreSQL for the learning API.
- Google OAuth credentials for Google sign-in.
- Optional provider credentials for features such as Sarvam AI, Google
  Translate, Razorpay, and YouTube playlist import.

## Start the main platform

1. Install dependencies in the main frontend and main API repositories with
   `npm install`.
2. Configure the main API's server-side environment, including its MongoDB
   connection, JWT secret, and frontend origins. Add the SSO settings if
   testing LMS hand-off.
3. Set the main frontend's API and Socket.IO URLs to the running API.
4. Start the API with `npm run dev`, then start the frontend with `npm run dev`.

The Express API defaults to port `4000`. It serves REST routes, Socket.IO, and
interactive API documentation from the same service.

## Start VartaLang Learn

1. Install dependencies in `vl-education` with `npm install`.
2. Copy `.env.example` to `.env.local` and set
   `NEXT_PUBLIC_MAIN_API_URL`, `NEXT_PUBLIC_LMS_API_URL`, and
   `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
3. Configure the LMS API's `.env` with a PostgreSQL `DATABASE_URL`, a
   `JWT_SECRET`, the main-platform SSO verification URL, and the shared SSO
   secret. Keep credentials server-side.
4. Install the learning API dependencies, apply Alembic migrations with
   `alembic upgrade head`, and start FastAPI on port `8000`.
5. Start the learning frontend with `npm run dev`.

## Optional integrations

- Set `SARVAM_API_KEY` on the **main API only** to enable Sarvam AI chat
  translation and text-to-speech. Translation defaults to Sarvam for
  supported Indian languages and can use Google Translate as a fallback when
  configured. `TRANSLATION_PROVIDER=google` selects Google Translate.
- `GOOGLE_TRANSLATE_API_KEY` configures that translation provider.
- Razorpay credentials and `YOUTUBE_API_KEY` belong on the learning API.
  They are needed for payment processing and admin playlist import,
  respectively.
- Practice labs may have future availability labels; local configuration
  alone does not make planned product features available.

Never commit `.env`, `.env.local`, API keys, shared secrets, database URLs, or
production credentials. Use the checked-in `.env.example` files as templates
and consult each service's README for its current variables and scripts.

## Documentation site

From the `vl-docs` repository, install dependencies with `npm install`, run
`npm start` for local preview, and use `npm run build` to validate the site.
See [contributing](./contributing.md) before submitting documentation edits.

---

## Document: development\onboarding.md

# Internal developer onboarding

This is the recommended starting point for engineers joining the VartaLang
team. It describes the implementation in the four supplied repositories,
not an idealized single application. Read the repo-specific pages before
changing a service. Product availability and deployment settings can change;
check each repository's current manifest, README, and environment template
before following a runbook.

> **Before sharing this guide:** This site is currently a public Docusaurus
> site. It contains no production credentials, but internal architecture
> documentation should be access-controlled before the team adds operational
> details that are not intended for public access.

The developer-pages sign-in is a **cosmetic client-side gate** for casual
browsing, not access control. Docusaurus embeds build-time values in the
browser bundle, and generated static pages are not confidential. Do not put
secrets or sensitive operational details in these pages on the strength of
this gate.

## System map

```text
                         +-----------------------------+
                         | User's browser              |
                         +---------------+-------------+
                                         |
                +------------------------+-----------------------+
                |                                                |
                v                                                v
  vartalang.in / main Next.js                         learn.vartalang.in
  vartalang                                           vl-education
  - profile, matching, chat, jobs                     - course catalog/player
  - guides, audio/radio, voice challenge              - learner/instructor/admin UI
                |                                                |
       REST + authenticated Socket.IO                    REST /api/v1
                |                                                |
                v                                                v
  Main Node.js/Express API                         LMS FastAPI API
  vl-backend                                       vl-lms-backend
  - auth, profile, matches, chat                    - auth/SSO, courses, enrollments
  - jobs, language guides, notifications            - progress, payments, practice
                |                                                |
          MongoDB Atlas                                  PostgreSQL
                |                                                |
                +---- single-use SSO code <--- server verify ----+

  Main API chat -> Sarvam AI (Indian translation / TTS)
                -> Google Translate (foreign targets / configured fallback)

  Main Next.js voice challenge -> main API identity check -> Google Drive
  learn.vartalang.in checkout -> LMS API -> Razorpay order/signature verification
  LMS admin playlist import -> LMS API -> YouTube Data API (metadata only)
  language games -> separate linked experience (not one of these four repos)
```

## The four repositories

| Repository | Owns | Runtime and data | Start with |
| --- | --- | --- | --- |
| `vartalang` | Main product frontend and two Next.js route handlers for voice-challenge submissions | Next.js 16, React 19, TypeScript, Tailwind 4; Vercel | `README.md`, `app/layout.tsx`, `lib/AuthContext.tsx`, `lib/lmsSso.ts` |
| `vl-backend` | Main product REST API, authentication, matching, chat, jobs, language guides, Socket.IO | Node.js ESM, Express 5, Mongoose/MongoDB, Socket.IO | `README.md`, `src/server.js`, `src/routes/`, `src/models/` |
| `vl-education` | Learning product frontend, course experience, instructor/admin UI, Razorpay checkout | Next.js 16, React 19, TypeScript, Tailwind 4; Vercel | `README.md`, `app/layout.tsx`, `app/lib/api.ts`, `app/lib/sso.ts` |
| `vl-lms-backend` | LMS API, authorization, course data, enrollments, progress, payments, reports | FastAPI, SQLAlchemy, PostgreSQL, Alembic; Render | `README.md`, `app/main.py`, `app/api/v1/api.py`, `app/models/` |

`vl-docs` is a fifth, documentation-only repository. The language-games
website is linked by the main frontend but its code was not part of the four
repositories examined here.

## Ownership boundaries

- **Main identity is canonical.** The Express API owns VartaLang account
  credentials and profile identity. The LMS keeps a linked user row and
  independently issues an LMS token.
- **Community data belongs to MongoDB.** Profiles, matches, chats, messages,
  reports, notifications, jobs, and language-guide content are not LMS
  records.
- **Learning data belongs to PostgreSQL.** Course curriculum, enrollments,
  lesson progress, LMS users, instructor profiles, and payment records are
  not stored in the main MongoDB.
- **The Next.js challenge route is not the LMS challenge API.** Voice
  recordings upload to Google Drive. The LMS `/api/v1/challenges` endpoints
  expose challenge metadata and a leaderboard, not those recordings.
- **Provider secrets are service-owned.** Sarvam and Google Translate keys
  belong on the main API. Razorpay and YouTube keys belong on the LMS API.
  Google Drive OAuth credentials belong on the main web deployment's
  server-side route environment.

## Important request flows

### Main sign-in

```text
Browser -> Main API /auth/signup or /auth/login
        -> Express verifies credentials and returns a main JWT
        -> Browser stores token in localStorage key "token"
        -> Browser sends Authorization: Bearer <token> to main API
```

Google sign-in verifies the Google access token with Google's user-info
endpoint before issuing a VartaLang token. Main-platform local passwords are
hashed with bcrypt. Password-reset tokens are hashed in MongoDB and expire
after 15 minutes.

### Open Learn using SSO

```text
Main frontend                  Main API                   LMS frontend/API
     | POST /sso/code (JWT)       |                              |
     |--------------------------->|                              |
     |<---- one-time code + URL --|                              |
     | redirect to /sso?code=...                                |
     |---------------------------------------------------------->|
     |                            LMS API POST /auth/sso/exchange |
     |                            |<-- POST /sso/verify + secret --|
     |                            |--- identity + mapped role ---->|
     |                            |                         issue LMS JWT
     |<----------------------------------------------------------|
```

The code is stored hashed, expires in 60 seconds, and is consumed once by the
main API. The LMS then provisions or updates its own user row. The main and
LMS JWTs are not interchangeable. The LMS frontend stores its token under
`lms_access_token` and its user snapshot under `lms_user`.

### Main chat message, translation, and pronunciation

```text
Browser -> POST /chats/:chatId/message
        -> persist original text in MongoDB
        -> emit receive_message / send notification
        -> return success without waiting for translation
        -> if recipient opted in: call Sarvam, then configured fallback
        -> persist translated text and emit message_translated

Browser -> GET /chats/:chatId/message/:messageId/pronounce
        -> use cached audio if present
        -> otherwise call Sarvam text-to-speech and cache base64 audio
```

The live TTS handler currently synthesizes the original message text and uses
the helper's default language when no language code is provided. Although the
main chat UI can send a `lang=translated` query parameter, the backend handler
does not currently use that parameter.

### Paid course purchase

```text
LMS frontend -> POST /api/v1/payments/create-order
             -> LMS API creates a server-side Razorpay order and payment row
             -> browser opens Razorpay Checkout with public key/order
             -> browser receives Razorpay payment identifiers/signature
             -> POST /api/v1/payments/verify-payment
             -> LMS API verifies HMAC using server-only secret and marks paid
             -> POST /api/v1/enrollments/:courseId/enroll
             -> enrollment is created and learner joins course group if present
```

Signature verification marks the payment paid; the frontend separately calls
the enrollment endpoint. The enrollment endpoint requires a matching paid
payment for non-free courses, except for the development-only bypass.

### Voice Challenge recording

The main frontend records up to 60 seconds of audio, asks for consent, then
posts multipart form data to its own `/api/challenge/submit` route. That
server-side route forwards the caller's main JWT to the Express API's
`/auth/me` endpoint to identify the user, checks for a prior file in the
configured Drive folder, and uploads a recording using Google Drive OAuth.
The filename contains normalized language, main user ID, and timestamp.

There is no database record for the voice submission in these repositories.
The route does not persist `scriptId`, `durationSec`, or `consentText`;
duplicate detection depends on filenames in Drive. The admin page lists
Drive files and resolves user details through the main API. The current code
does not score recordings or send results automatically.

## Roles and authorization

The main account role is `learner` or `teacher`; main admin access is
currently determined by a single hard-coded administrator email in the
Express API. SSO maps that identity to LMS `admin`, maps a main `teacher` to
LMS `instructor`, and maps other main users to LMS `student`.

The LMS applies role checks (`student`, `instructor`, `admin`) in FastAPI
dependencies. Do not treat frontend route guards as authorization: enforce
access on the API. Current role mapping and the main API's admin check are
separate implementation points; a role-system change must update and test
both.

## Current implementation versus planned/product copy

Treat executable code and API responses as current behavior; a marketing
page, PRD, or default response may describe something planned or illustrative.
Examples a new developer should know:

- The LMS frontend's practice page is a static "coming soon" page. The API
  has `/practice` routes, but `/practice/evaluate` currently writes a fixed
  sample score and feedback; it is not connected to a speech model.
- The LMS challenge endpoint returns configured challenge metadata when
  present, otherwise sample defaults. Its fallback leaderboard includes
  static example rows and is not a live competition engine.
- LMS streak persistence exists in the API, but the current frontend
  `app/lib/streak.ts` uses browser `localStorage` and still has a heartbeat
  integration TODO.
- The main voice challenge records and stores audio; the review/scoring and
  result-email promise in product copy is not implemented in the supplied
  route.
- The main `roles/[slug]` page fetches `/api/roles/:slug`, but the checked-in
  main frontend only has the voice-challenge and admin-challenge API route
  handlers. Confirm the role-detail data source before changing that page.
- `vl-education/app/community/page.tsx` contains a TODO for dynamic career
  openings; do not assume that UI is wired to the LMS careers API.

See each repo guide for more current known mismatches and implementation
details. The [system design guide](../architecture/system-design.md) records
design decisions, practices to preserve, and prioritized recommendations.

## First-day checklist

1. Get read access to all four application repositories and this docs repo.
2. Read this page, then the relevant repo guide and that repository's README.
3. Use only example environment files as templates; never copy live
   credentials into docs, tickets, shell history, or source control.
4. Confirm which backend a frontend is configured to call before debugging
   API behavior.
5. Run the smallest relevant test/lint/build command before making a change.
6. When changing a boundary, update both caller and owner: frontend/API,
   main/LMS SSO, or service/provider.
7. Check the [known integration mismatches](./operations.md#known-integration-mismatches)
   before debugging the corresponding feature.

---

## Document: development\operations.md

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

---

## Document: development\repository-learning-api.md

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

---

## Document: development\repository-learning-web.md

# Learning web application: `vl-education`

This is the browser application for VartaLang Learn at
`learn.vartalang.in`. It owns the learning UI, LMS token lifecycle, course
player, learner/instructor/admin dashboards, and Razorpay checkout UI. Course
and learner records are owned by `vl-lms-backend`.

## Stack and commands

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- `npm run dev`, `npm run build`, `npm run start`, `npm run lint`,
  `npm test` (Vitest).
- Existing tests include checkout behavior and instructor sales reporting.
- Vitest uses `vitest.config.ts` and `vitest.setup.ts`.

## Route map

| Path | Purpose |
| --- | --- |
| `/` and `/home` | Landing/home experiences |
| `/auth/login` | LMS login entry (Google sign-in and SSO code flow) |
| `/sso?code=...` | Redeem main-platform hand-off |
| `/learn` | Authenticated language/course catalog |
| `/learn/:language` | Courses/content for a language |
| `/learn/:language/:courseId` | Course detail/player |
| `/courses` | Redirects to `/learn` |
| `/dashboard` | Learner enrollments and progress |
| `/dashboard/instructor` | Instructor studio, course editor, and sales |
| `/dashboard/admin` | Course/instructor/user administration |
| `/instructors/:id` | Public instructor profile |
| `/practice`, `/challenges` | Practice/challenge UI (check availability caveats below) |
| `/certifications` | Certification information/verification |
| `/community`, `/sessions`, `/workshops`, `/jobs` | Supporting learning/opportunity pages |
| `/pricing`, `/payment-success` | Checkout information and confirmation |
| `/about`, `/faq`, `/contact`, policy routes | Product/support/legal information |

The `/learn` catalog builds its initial language groups from the frontend
catalog in `app/lib/languages.ts` and merges in actual course counts from the
API. It can show languages with no course as "Coming soon"; that is a
catalog/presentation entry, not proof of backend content.

## Application structure

```text
app/
  context/AuthContext.tsx       LMS auth state, Google, SSO, logout
  lib/api.ts                    shared API client, types, service wrappers
  lib/useApi.ts                 page-level loading/error integration
  lib/languages.ts              language catalog, aliases, presentation
  lib/sso.ts                    main API auth + LMS code exchange
  lib/streak.ts                current browser-only streak tracker
components/
  CourseExplorer.tsx            course discovery
  CoursePlayerModal.tsx         lesson viewing/progress UI
  CourseStudio.tsx              instructor curriculum editing
  RazorpayCheckout.tsx          browser checkout; calls LMS payments API
  RequireAuth.tsx               client-side route gate (not API authorization)
```

## API client and session

`app/lib/api.ts` builds the API base from
`NEXT_PUBLIC_LMS_API_URL` plus `/api/v1`, injects `lms_access_token` as a
Bearer token, and centralizes typed helpers for auth, courses, enrollment,
payments, articles, careers, challenges, certifications, instructors, and
admin operations.

Only GET requests are retried after a network failure (after four seconds);
write requests are not retried automatically because an operation such as a
lesson toggle is not safe to repeat. A 401 clears `lms_access_token` and
`lms_user` and redirects to the login page. Some older wrapper methods return
empty arrays/null on failure; newer `getJSON()` methods throw and preserve
error details. Prefer the throwing helper for new pages.

`AuthContext` persists an LMS-specific token and user snapshot in
`localStorage`. It restores the session with `/api/v1/auth/me`. The current
`login(email,password)` method intentionally throws "Email and password login
is no longer available"; do not trust older README text that lists LMS local
password login as active. Active flows are SSO code exchange and Google sign-in
via the main VartaLang account.

The SSO client reads `NEXT_PUBLIC_MAIN_API_URL` and
`NEXT_PUBLIC_LMS_API_URL`. Login with Google authenticates to the main API,
requests an SSO code, and exchanges it with the LMS API. `/sso?code=` exchanges
the code directly. The resulting LMS access token is independent of the main
site's `token`.

## Course authoring and payment

Instructor course operations in `instructorAPI` create drafts, add modules
and lessons, add course resources, edit/delete curriculum, submit a course
for review, and withdraw a course back to draft. The API locks published and
pending-review courses from instructor editing until they return to draft.
Admins can publish directly, approve, reject with a reason, unpublish, or
create a course on an instructor's behalf.

`RazorpayCheckout.tsx`:

1. Requires the user to agree to Terms, Privacy, and Refund policies.
2. Requests an order from `/payments/create-order`.
3. Loads Razorpay Checkout in the browser using the returned public key.
4. Posts the returned payment identifiers/signature to
   `/payments/verify-payment`.
5. Calls `/enrollments/:courseId/enroll` after successful verification.
6. Stores a short `paymentSuccess` notice in session storage for the
   confirmation experience.

Payment verification alone does not enroll the learner. Refund preparation
is shown in the admin enrollment UI, but the button is currently disabled
because a refund API is not implemented.

## Current gaps and non-obvious behavior

- `app/practice/page.tsx` is a static "Coming Soon" page; its code comments
  still describe a future API connection.
- Streaks in `app/lib/streak.ts` are currently per-browser/per-user
  `localStorage` data. A corresponding API exists, but this frontend module
  still contains a heartbeat TODO; streaks are not reliably cross-device.
- The LMS challenge API's fallback data and practice evaluation are
  demonstration behavior; see the [LMS API guide](./repository-learning-api.md).
- Instructor booking/session/workshop interactions include UI elements marked
  coming soon. Check the corresponding route and API before promising that a
  booking or live session can be completed.
- Admin financial reporting can prepare refund context; there is no refund
  execution endpoint in the reviewed API.
- `app/community/page.tsx` contains a TODO for database-backed career
  openings.
- `components/RequireAuth.tsx` only hides/redirects UI. The FastAPI route
  dependencies remain the security boundary.

## Environment variables

`vl-education/.env.example` currently declares:

| Variable | Used for |
| --- | --- |
| `NEXT_PUBLIC_MAIN_API_URL` | Main account API used in Google/SSO flow |
| `NEXT_PUBLIC_LMS_API_URL` | LMS API base used by `app/lib/api.ts` and SSO |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Browser Google OAuth provider |

The code includes defaults for service URLs. Do not ship with an unintended
fallback origin; set the environment explicitly for local, preview, and
production builds.

---

## Document: development\repository-main-api.md

# Main platform API: `vl-backend`

The main Node.js service is the identity and community API for
`vartalang`. It is independent of the LMS API and is not the
API mounted under `/api/v1`.

## Runtime and boot sequence

- Node.js ESM; Express 5; Mongoose 9; MongoDB; Socket.IO 4.
- `src/server.js` loads dotenv, creates the HTTP server, configures Express
  JSON and CORS, initializes Socket.IO, registers Swagger/OpenAPI, connects
  MongoDB, and mounts route groups.
- `initializeJobSchedulers()` runs after MongoDB connects. It schedules job
  expiry and cleanup and performs a catch-up run at startup.
- Default port is `4000`; `GET /` is a simple health response.
- API documentation is served at `/docs`; OpenAPI JSON is `/openapi.json`.
- `npm start` and `npm run dev` both run `node src/server.js`. There is no
  test/lint script in this package manifest.

```text
src/server.js
  +-- /auth          auth.routes.js
  +-- /matches       match.routes.js
  +-- /chats         chat.routes.js
  +-- /notifications notification.routes.js
  +-- /jobs          job.routes.js
  +-- /admin         admin.routes.js
  +-- /learn         learn.routes.js
  +-- /sso           sso.routes.js
  +-- /socket.io     socket.js (same HTTP server)
```

## Code map

| Path | Responsibility |
| --- | --- |
| `src/server.js` | Express/HTTP startup, Mongo connection, route mounts, Swagger, scheduler startup |
| `src/routes/` | Route contracts and middleware attachment |
| `src/controllers/` | Domain behavior and response shapes |
| `src/models/` | MongoDB/Mongoose documents, indexes, TTL policies |
| `src/middlewares/auth.middleware.js` | Bearer JWT verification and `req.user.userId` |
| `src/middlewares/admin.middleware.js` | Current single-admin email check |
| `src/socket.js` | Socket.IO CORS, JWT handshake, rooms, chat event broadcast |
| `src/utils/translate.js` | Sarvam/Google translation selection and fallback |
| `src/utils/tts.js` | Sarvam Bulbul text-to-speech |
| `src/utils/languageCodes.js` | Profile language names to provider language codes |
| `src/utils/jobScheduler.js` | Expiry and cleanup cron jobs |
| `src/swagger.js` | OpenAPI schema and shared components |

## REST route inventory

All paths below are relative to the main API origin.

### `/auth`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/signup` | Public | Create local account and issue JWT |
| POST | `/login` | Public | Verify email/password and issue JWT |
| GET | `/me` | Bearer | Return current user |
| PUT | `/update-profile` | Bearer | Update profile fields (sensitive auth fields are excluded) |
| POST | `/forgot-password` | Public | Create reset token and send email when account exists |
| POST | `/reset-password` | Public | Verify time-limited reset token and set new password |
| POST | `/google-signup` | Public | Verify Google access token and create account |
| POST | `/google-login` | Public | Verify Google token and issue JWT |
| GET | `/user/:userId` | Bearer | Get a user profile by Mongo ID |

Main JWTs are signed with `JWT_SECRET`. Local password accounts receive a
7-day token; Google login/signup currently issues a 30-day token. Signup
requires name, email, password (at least eight characters), a primary
language to learn, state, and at least one known language. Google sign-up
uses the same profile requirements. Password reset tokens are random,
stored as SHA-256 hashes, and expire after 15 minutes; email is sent through
Resend when configured.

### `/matches`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/potential` | Bearer | Up to 20 reciprocal language matches |
| POST | `/swipe` | Bearer | `like` or `skip` a candidate |
| GET | `/my-matches` | Bearer | List own pending/accepted/rejected interactions |
| POST | `/:matchId/accept` | Bearer | Accept incoming request and create/find chat |
| POST | `/:matchId/reject` | Bearer | Reject incoming request |

Matching is a reciprocal database filter: candidate knows one of the
requester's primary/secondary learning languages, and the requester knows
one of the candidate's primary/secondary learning languages. It excludes
already-interacted users and caps the result at 20. The checked implementation
does not score location or interests.

`Match` documents have a unique ordered `(user1,user2)` index and expire after
seven days only when pending or rejected; accepted matches are retained.
Acceptance creates or reuses a chat and emits notifications to both users.

### `/chats`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | Bearer | List active chats and unread counts |
| PUT | `/translation-settings` | Bearer | Turn recipient translation preference on/off |
| GET | `/:chatId` | Bearer | Fetch visible messages; may backfill recent translations |
| POST | `/:chatId/message` | Bearer | Persist/send a text message |
| POST | `/:chatId/block` | Bearer | Block the other participant |
| POST | `/:chatId/unblock` | Bearer | Remove block |
| DELETE | `/:chatId` | Bearer | Clear/hide chat for caller; permanent after both delete |
| POST | `/:chatId/report` | Bearer | Create user report attached to chat |
| GET | `/:chatId/message/:messageId/pronounce` | Bearer | Return/cache TTS audio |
| POST | `/:chatId/read` | Bearer | Mark incoming messages read and emit receipt |

The original message is stored and returned before optional translation
starts. Translation is preference-controlled by the recipient, uses the
recipient's most fluent known language as target, and is written back to the
message when successful. Failed/skipped translations are tracked in process
memory to avoid repeated attempts during that process lifetime. TTS base64
audio is embedded in the Mongo chat message and can increase document size.

### `/notifications`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | Bearer | Fetch notifications (supports `limit`, `skip`, `type`) |
| GET | `/unread-count` | Bearer | Return count response |
| DELETE | `/messages/all` | Bearer | Clear all notifications and reject pending match requests |
| DELETE | `/clear-all-chat` | Bearer | Clear only new-message notifications |
| DELETE | `/chat/:chatId` | Bearer | Clear new-message notifications for one chat |
| DELETE | `/:notificationId` | Bearer | Delete one notification owned by caller |

**Implementation note:** the current `/unread-count` controller counts all
notifications for the recipient and does not filter `read: false`, despite
the route name. Confirm/fix that behavior before relying on it for unread
badges.

### `/jobs`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/stats` | Public | Total/active listing counts |
| GET | `/listings` | Public | Active listings with language/job type/remote/search filters |
| GET | `/languages` | Public | Languages represented by active jobs |
| GET | `/my/jobs` | Bearer | Caller-owned jobs |
| GET | `/:id` | Public | Listing detail |
| POST | `/:id/view` | Public | Increment view count |
| POST | `/listings` | Bearer | Create listing |
| DELETE | `/:id` | Bearer | Delete caller's listing |
| POST | `/mark-expired` | Public/cron | Mark expired jobs |

One user may have one active listing at a time. New listings default to a
seven-day expiry. The schema has a Mongo TTL index to remove documents
30 days after `expiryDate`. The scheduler marks expired listings daily at
midnight IST and runs cleanup daily at 02:00 IST; both also run on service
startup. Admins can extend/delete listings through `/admin`.

### `/learn`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/` | Public | List published language guides |
| GET | `/:slug` | Public | Fetch published guide by slug |
| GET | `/admin/all` | Admin | List guides including drafts |
| POST | `/` | Admin | Create guide |
| PUT | `/:id` | Admin | Update guide |
| DELETE | `/:id` | Admin | Delete guide |
| POST | `/:id/resources` | Admin | Append resource |
| PUT | `/:id/resources/:resourceId` | Admin | Update embedded resource |
| DELETE | `/:id/resources/:resourceId` | Admin | Delete embedded resource |

Mount order matters: `/admin/all` is registered before `/:slug`.

### `/sso`

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/code` | Bearer | Create expiring one-time code and LMS URL |
| POST | `/verify` | Shared secret | Server-to-server code verification and identity return |

`/code` stores only the SHA-256 code hash and expires it after 60 seconds.
`/verify` checks the `x-sso-secret` header with constant-time equality,
consumes the code using `findOneAndDelete`, and returns main account identity.

### `/admin`

The route group includes `GET /check`, `GET /stats`, `GET /jobs`,
`GET /users`, `GET /reports`, `GET /reports/:reportId`,
`DELETE /reports/:reportId`, `DELETE /reports/bulk/all`,
`GET /possible-matches`, `DELETE /connections/:userId1/:userId2`,
`PUT /jobs/:jobId/extend`, `DELETE /jobs/:jobId`, and `GET /matches`.
Except for the authenticated admin check, routes require the admin middleware.

`DELETE /connections/...` is a multi-record destructive operation: it deletes
the chat/messages, matching records, and related notifications, adjusts
connection counters, and intentionally preserves reports. Bulk report
deletion permanently deletes every report. Confirm the intended user IDs and
incident-retention policy before using either.

## Socket.IO contract

Socket connections authenticate with the main JWT in
`handshake.auth.token` or an Authorization header. Each connection joins
`user_<userId>`. The server allows clients to join/leave named chat rooms
using `join_chat`/`leave_chat`; the application uses `chat_<chatId>` rooms.

| Event | Direction | Meaning |
| --- | --- | --- |
| `receive_message` | server -> chat room | Newly stored original message |
| `message_translated` | server -> chat room | Translation added to existing message |
| `messages_read` | server -> chat room | Read receipt |
| `user_blocked`, `user_unblocked` | server -> chat room | Block-state update |
| `chat_restored` | server -> user's room | A previously hidden chat has new activity |
| `new_message_notification` | server -> recipient's room | New chat notification |
| `join_chat`, `leave_chat` | client -> server | Join/leave supplied room name |

Do not assume arbitrary client-emitted events such as `mark_read` are handled:
read state is updated by the REST endpoint. The socket allow-list currently
does not include `learn.vartalang.in`, even though the Express REST CORS list
does; check the deployed browser origin before enabling LMS-to-main sockets.

## Data model quick map

```text
User 1---* Match (user1/user2, pending/accepted/rejected)
User 1---* Chat (participants; messages embedded in Chat)
Chat 1---* Message (sender, text, translation, TTS cache)
User 1---* Notification (sender/recipient; matchId or chatId)
User 1---* Report (reporter/reportedUser/chat)
User 1---* Job (postedBy)
Language 1---* Resource (embedded; published/draft guide)
User 1---* SSOCode (hashed one-time authorization code)
```

MongoDB models and their indexes are defined under `src/models`. Read the
model before changing a controller query: TTL indexes, unique match ordering,
embedded messages, and soft-delete arrays are behavior, not incidental
storage choices.

## Sarvam AI provider behavior

The chat translation utility defaults `TRANSLATION_PROVIDER` to `sarvam`.
For supported Indian-language targets it calls Sarvam first. It tries
`mayura:v1` with auto source detection when the target is supported there,
then `sarvam-translate:v1` with an inferred/known source when appropriate.
Foreign targets or a failed Sarvam attempt fall through to Google Translate
when its key is configured; `TRANSLATION_PROVIDER=google` forces Google.
Odia `or-IN` data is normalized to `od-IN`; Google uses `or`.

Translation calls cap input at 1,000 characters and time out after 10 seconds.
Sarvam speech uses `bulbul:v3`, caps at 2,500 characters, and times out after
10 seconds. Provider failures produce no translation/audio; the original
message send remains successful.

## Configuration ownership

Use the repository README and deployment secret manager for values. Key names
in the implementation include:

| Setting | Owner | Purpose |
| --- | --- | --- |
| `MONGODB_URI`, `JWT_SECRET`, `PORT` | Main API | Database, JWT signing, listener |
| `GOOGLE_CLIENT_ID` | Main API | Google identity verification |
| `RESEND_API_KEY`, `FRONTEND_URL` | Main API | Password recovery email |
| `LMS_URL`, `LMS_SSO_SECRET` | Main API | SSO redirect and shared verifier credential |
| `SARVAM_API_KEY` | Main API | Translation and TTS |
| `TRANSLATION_PROVIDER`, `GOOGLE_TRANSLATE_API_KEY` | Main API | Translation routing/fallback |
| `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL` | Main web | Browser API and Socket.IO origins |

The Express and Socket.IO origin allow-lists are currently hard-coded in
`src/server.js` and `src/socket.js`, respectively. Update both deliberately
for a new frontend domain; their lists are not identical.

---

## Document: development\repository-main-web.md

# Main web application: `vartalang`

This Next.js application is the main VartaLang product at `vartalang.in`.
It owns browser-facing flows for accounts, profiles, matching, chat, jobs,
language guides, and the Voice Challenge. It calls the separate Express API
for most product data.

## Stack and commands

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4.
- Node.js 20 is used by the checked-in GitHub Actions workflow.
- `npm run dev`, `npm run build`, `npm run start`, `npm run lint`,
  `npm run typecheck`.
- `.github/workflows/ci.yml` runs `npm ci`, lint, typecheck, and build on
  pushes to `main` and pull requests.

The package manifest also includes NextAuth, Mongoose, Pusher, and several
other libraries. The observed account flow is implemented in
`lib/AuthContext.tsx` against the Express API; do not assume that every
manifest dependency defines an active production integration.

## Route map

| App Router path | Responsibility | Data/integration |
| --- | --- | --- |
| `/` | Main landing page and product navigation | Client-rendered demonstrations/content |
| `/auth/signup`, `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` | Account lifecycle | Main Express `/auth` routes; Google OAuth |
| `/profile`, `/profile/[userId]` | Own and public user profiles | Main Express `/auth/me`, `/auth/update-profile`, `/auth/user/:userId` |
| `/matches` | Potential partner discovery and requests | Main Express `/matches` |
| `/chats` | Conversation list, messaging, translations, reports, pronunciation | Main Express `/chats`, `/notifications`, Socket.IO |
| `/jobs`, `/jobs/board` | Jobs overview, filters, posting, management | Main Express `/jobs` |
| `/learn`, `/learn/[slug]` | Published language guides and resources | Main Express `/learn` |
| `/radio` | Gauraiyya Radio content | Page-defined links/data |
| `/targets`, `/roles`, `/roles/[slug]` | Language-related career/role content | Some pages are local/static; role detail calls `/api/roles/:slug` |
| `/challenge`, `/challenge/start` | Voice Challenge instructions and audio capture | Main API auth + local Next.js upload route |
| `/admin`, `/admin/challenge` | Admin dashboard and Drive recording listing | Main API admin routes + local Next.js route |
| `/api/challenge/submit` | Server-side authenticated audio upload | Express `/auth/me`, Google Drive API |
| `/api/admin/challenge` | Admin-only Drive file listing | Express `/admin/check`, `/admin/users`, Google Drive API |

`/learn` on the main site is not the LMS course player. The `goToLms()` helper
uses the main API to create an SSO code and redirects to
`learn.vartalang.in`.

## Important frontend modules

```text
app/
  auth/                 signup, login, reset and recovery
  matches/              language-match actions
  chats/                REST + Socket.IO chat client
  jobs/                 job overview and board
  learn/                guide catalog/details
  challenge/            audio recording flow
  api/                  server routes for challenge upload/admin list
components/
  layout/               navigation and footer
  notifications/        notification UI
  modals/               safety, policy, and report modals
lib/
  AuthContext.tsx       main JWT presence and local auth state
  socketClient.ts       one Socket.IO client instance
  lmsSso.ts             main-to-LMS hand-off
  challenge/            scripts, consent copy, Google Drive adapter
models/
  user.ts               local Mongoose model (verify active consumers)
```

## Authentication and API access

`lib/AuthContext.tsx` checks `localStorage["token"]` on mount and listens for
cross-tab storage changes. Pages that need an authenticated user generally
read the same token and send `Authorization: Bearer <token>`. The context is
not the source of truth for token validity; the API verifies the JWT.

The main API base defaults to `http://localhost:4000` in several pages. The
chat socket uses `NEXT_PUBLIC_API_URL`. Configure the REST and Socket.IO URL
consistently for a local or deployed environment. The main frontend README
also documents Google OAuth and socket URL variables; check actual consumers
before renaming a variable.

The layout loads Google Analytics/Ads scripts and wraps pages with Google
OAuth, auth, dark-mode, and analytics providers. Keep tracking changes
centralized in `app/layout.tsx` and `components/Analytics.tsx`.

## Chat client behavior

`app/chats/page.tsx` fetches chat and notification data over REST, creates a
socket with the main JWT, and listens for message, read, block/unblock,
translation, and chat-restored events. The server persists messages before
translation. The client should always render the original text if a
translation is absent or delayed.

The UI can request pronunciation with an optional `lang` query parameter;
the current API implementation ignores that parameter and returns cached
audio generated from the original message. Update both sides if translated
audio is introduced.

## Voice Challenge implementation

`lib/challenge/scripts.ts` owns the offered language list, script variants,
consent text, and `pickScript()` logic. `/challenge/start` requests
microphone access through `getUserMedia`, records with `MediaRecorder` for up
to 60 seconds, allows review/re-record, then posts a multipart request.

The server route:

1. Forwards the bearer token to `BACKEND_API_URL` (or
   `NEXT_PUBLIC_API_URL`) plus `/auth/me`.
2. Requires an authenticated user, audio file, language, and explicit consent.
3. Rejects recordings over 100 MiB and a duplicate language/user submission
   found in Drive.
4. Uploads to the configured Drive folder with filename
   `<language>_<userId>_<timestamp>.<ext>`.

The API route does not store a database row, `scriptId`, `durationSec`, or
consent text. The admin route lists Drive files and obtains user information
from the main admin API. It does not evaluate audio or issue results. See
[operations](./operations.md#voice-challenge-google-drive) for credential and
troubleshooting details.

## Known frontend seams

- `app/roles/[slug]` calls `/api/roles/:slug`, but there is no corresponding
  route handler in the inspected repository.
- Job view tracking calls `POST /jobs/:id/views`; the Express API currently
  declares `POST /jobs/:id/view` (singular). The listing still loads; the
  counter request does not match the backend route.
- Main product marketing and FAQ text includes roadmap, launch, pricing,
  review, and delivery claims. Check implementation before treating those
  statements as service contracts.
- The API and Socket.IO CORS allow-lists are configured in the API code, not
  inferred from frontend environment variables. A new preview origin may
  require a backend change.

---

## Document: getting-started\account-and-profile.md

# Account and profile

Start at [vartalang.in](https://vartalang.in) to create or access your main
VartaLang account. The application supports email-and-password sign-in and
Google sign-in. If you have an account but cannot sign in, use the password
recovery flow on the login page.

## Set up your profile

Add the details that help other learners understand how to connect with you:

1. Choose whether you primarily want to learn, teach, or do both where the
   application offers that option.
2. Add the languages you know and your fluency in each.
3. Choose a primary language you want to learn and, if useful, a secondary
   one.
4. Add your location and any optional profile details.

Matching uses language information to find reciprocal learning fits. Keep
your language and learning-goal details current to improve the relevance of
potential partners.

## Open VartaLang Learn

Use the learning link in the main application to continue to
[VartaLang Learn](https://learn.vartalang.in). When you are signed in, the
platform uses a short-lived, single-use sign-in hand-off so you do not have
to create a separate VartaLang identity. The learning application issues its
own session for course and progress features.

If you open Learn directly, its sign-in page also supports Google sign-in
through the main VartaLang account service. If a sign-in hand-off expires,
return to VartaLang and start it again.

## Profile and account controls

You can review and edit your profile from the account area. Use chat controls
to block or report a participant when needed. For more information, see
[Safety and trust](../platform/safety-and-trust.md).

---

## Document: intro.md

# Welcome to VartaLang

VartaLang is an ecosystem for learning Indian languages and culture, powered by
Sarvam AI. It brings together real language exchange, practical language
guides, structured courses, and language-linked opportunities. The goal is to
make language useful in everyday life: to connect with people, understand
cultural context, and take part in work and communities across India.

## One ecosystem, several ways to learn

- **Learn with people.** Build a profile around the languages you know and
  want to learn, find reciprocal language partners, and continue learning in
  real-time chats.
- **Study at your pace.** Explore language guides and resources on the main
  platform, or use the separate learning platform for courses, lessons,
  enrollment, and progress.
- **Use language in context.** Browse language-related jobs and practical
  learning material intended to connect study with daily life and opportunity.
- **Get AI-assisted language support.** The main platform's chat backend uses
  Sarvam AI for Indian-language translation and on-demand speech
  pronunciation. Translation can fall back to Google Translate when configured;
  AI practice labs are a separate, developing part of the learning platform.

## Where to go

| Experience | What it offers |
| --- | --- |
| [VartaLang](https://vartalang.in) | Profiles, language matching, chat, learning guides, and jobs |
| [VartaLang Learn](https://learn.vartalang.in) | Course catalog, lessons, enrollments, and learning progress |
| [Platform architecture](./architecture/overview.md) | How the applications and services fit together |
| [Getting started](./getting-started/account-and-profile.md) | Account, profile, and learning-platform sign-in |
| [Developer onboarding](./development/onboarding.md) | Repositories, data ownership, service flows, APIs, and operations |

The platform is designed around the diversity of Indian languages and the
cultural knowledge carried through them. Language availability, course
catalogs, resources, and service capabilities can change over time; the
applications show the current published content.

---

## Document: platform\courses.md

# Courses

VartaLang Learn provides structured courses alongside the language-exchange
and resource experiences on the main VartaLang platform. Visit
[learn.vartalang.in](https://learn.vartalang.in) to browse the current
published catalog.

## Find and take a course

The catalog groups courses by language and shows course details such as level,
category, instructor, price, and curriculum where available. It includes
Indian languages, English, and additional languages when courses are
published. A language appearing in the catalog does not necessarily mean a
course is currently available for it.

Open a course to review its modules, lessons, resources, and access
requirements. Enroll in the course to access its learning content and track
lesson progress from your dashboard. Some courses are free; paid courses use
Razorpay checkout. Payment is confirmed by the learning service before paid
access is granted.

## Course creation and review

Instructors can create course drafts, build a curriculum, add resources, and
submit a course for administrator review. Published and pending-review courses
are subject to platform workflow controls. Administrators can manage course
publication and can import public YouTube playlists into free draft courses
for review. Imported courses link to YouTube videos; the platform does not
download the video media.

## Progress and related learning

Your learner dashboard summarizes enrollments and lesson progress. The
platform also includes practice, challenge, and certification areas; some
practice modules are currently marked as planned rather than available.
Explore [language exchange](./language-exchange.md) and
[learning resources](./learning-resources.md) for other ways to study.

---

## Document: platform\jobs.md

# Jobs and opportunities

The VartaLang jobs area connects language skills with practical work
opportunities. Job listings can describe the language needed, location,
employment type, work arrangement, compensation, and how to contact the
employer. The available filters and listing details depend on the published
jobs.

## Browse opportunities

Open the Jobs area on [VartaLang](https://vartalang.in) to browse current
listings. Use the available language, location, work-type, and search filters
to narrow the results. Review the listing details and contact information
carefully before you follow up with an employer.

## Post and manage a job

Sign in to create a listing and manage jobs associated with your account.
The platform API supports listing expiry and administrative moderation.
Current posting eligibility, duration, and any paid extensions are shown in
the application; they may change over time.

## Keep interactions safe

VartaLang does not guarantee employment, verify every listing, or act as an
employer or hiring agent. Do not send money or sensitive personal information
to a prospective employer unless you have independently verified the request.
Use the platform's available report or support controls to flag suspicious
content.

---

## Document: platform\language-exchange.md

# Language exchange

VartaLang is designed to help people learn with other people, not only from
lessons. Your profile describes languages you can teach and languages you
want to learn; the platform uses those details to find potential reciprocal
matches.

## Find a language partner

1. Complete your profile with the languages you know, your fluency, and the
   language or languages you want to learn.
2. Review the suggested potential matches.
3. Send a connection request when you find someone whose learning goals fit
   yours.
4. Accept or decline incoming requests from your matches or notifications.
5. Once accepted, use the one-to-one chat to continue the exchange.

Potential matches are based on complementary language preferences, rather
than a guarantee of geographic proximity or a particular learning outcome.
Keeping your profile accurate helps the matching experience.

## Chat and translation

Chats support text messages and real-time notifications. Recipients can
choose whether to enable translated messages. Translation is generated after
the original message is delivered; it is an aid for understanding, not a
replacement for the original text. For supported Indian-language translation,
the backend uses Sarvam AI and can use Google Translate as a configured
fallback.

The chat also provides an on-demand pronunciation option for messages using
Sarvam AI text-to-speech. Provider availability and supported languages may
vary.

## Manage a connection

Use the controls in a conversation to block or report a participant, or to
clear the conversation from your view. Blocking prevents further chat
interaction in that conversation. Reports are available for platform
moderation.

Learn more about [account and profile setup](../getting-started/account-and-profile.md)
and [safety and trust](./safety-and-trust.md).

---

## Document: platform\learning-resources.md

# Learning resources

VartaLang combines language learning with material that helps learners
connect vocabulary and communication to real contexts and cultures.
Availability varies by language and by what has been published.

## Language guides and resources

The main platform's Learn area provides published language guides with
information such as native names, scripts, regions, and linked resources.
Use its search and language pages to explore what's available. Resources can
include curated external material, so check the source and terms of any
third-party content.

## Courses and lessons

For structured lessons, use [VartaLang Learn](https://learn.vartalang.in).
Its course catalog and enrollment dashboard show published courses and
progress. Some course content is free and some may require payment.

## Audio, games, and practice

The main learning area links to Gauraiyya Radio and a separate language-game
experience. VartaLang Learn also surfaces practice and challenge areas.
Availability can vary: voice-evaluation and other advanced practice labs may
be labeled as coming soon. The live Sarvam AI chat translation and
pronunciation tools are described in [language exchange](./language-exchange.md).

## Learn through people

Resources work best alongside real communication. Complete your profile and
try [language exchange](./language-exchange.md) to practice with a partner.

---

## Document: platform\safety-and-trust.md

# Safety and trust

VartaLang brings learners into direct conversation and, in some cases, into
contact with employers. Use good judgment, protect your personal information,
and report behavior or listings that seem unsafe.

## In conversations

- Keep personal, financial, and account-security information private.
- Use the block control to stop interaction with a chat participant.
- Use the report control to send a concern for platform review.
- Remember that machine translation can be incomplete or inaccurate; check
  important details with the other person.

## Jobs and external resources

Review job details and independently verify an employer before sharing
sensitive information, paying a fee, or accepting an offer. VartaLang does not
guarantee listings, employment, or third-party resources. External links and
content are operated by their respective providers.

## Account and content controls

The platform includes chat blocking and reporting, administrative report
review, and controls for managing a conversation. Availability of a control
can differ between product areas. For account questions, use the contact or
support options shown in the relevant application.

For details on how accounts and data are handled, consult the privacy and
terms pages linked from the VartaLang applications. This guide is practical
product guidance and does not replace those policies.

---

