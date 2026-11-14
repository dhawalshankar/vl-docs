---
title: Main platform API
---

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
