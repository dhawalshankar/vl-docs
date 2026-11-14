---
title: Main web application
---

# Main web application: `study-projects/vartalang`

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
