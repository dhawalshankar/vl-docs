---
title: System design and engineering practices
description: Current design decisions, strengths to preserve, gaps to address, and recommended algorithms and delivery practices.
---

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
