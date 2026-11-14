---
title: Learning web application
---

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
