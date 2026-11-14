---
title: API reference
---

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
