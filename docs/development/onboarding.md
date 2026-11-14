---
title: Internal developer onboarding
description: A code-first onboarding map for the VartaLang applications, APIs, data stores, and integrations.
---

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
