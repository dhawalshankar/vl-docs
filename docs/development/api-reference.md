---
title: API reference
---

# API reference

VartaLang uses two independently deployed APIs. Their interactive Swagger or
OpenAPI documentation is generated from the running service and is the
authoritative source for request and response schemas.

## Main platform API

The Node.js/Express API serves the main web application. Its route groups
include:

| Route group | Purpose |
| --- | --- |
| `/auth` | Signup, sign-in, password recovery, and profiles |
| `/matches` | Potential matches, requests, acceptance, and rejection |
| `/chats` | Conversations, messages, translation settings, and pronunciation |
| `/notifications` | In-app notifications |
| `/jobs` | Job listings and management |
| `/learn` | Published language guides and resources |
| `/sso` | Single-use authorization-code creation and server verification |
| `/admin` | Administrative moderation and reporting |

Most account and chat routes require `Authorization: Bearer <token>`. Chat
also uses an authenticated Socket.IO connection for real-time events. The
running service exposes Swagger UI at `/docs` and its OpenAPI document at
`/openapi.json`.

## Learning API

The FastAPI service uses the `/api/v1` prefix:

| Route group | Purpose |
| --- | --- |
| `/auth` and `/users` | SSO exchange, user profile, and learning streaks |
| `/courses` and `/enrollments` | Course catalog, curriculum, enrollment, and progress |
| `/instructor` | Instructor studio and public instructor details |
| `/payments` | Razorpay order creation and verification |
| `/practice` and `/challenges` | Practice labs, evaluation, challenges, and leaderboards |
| `/certifications` | Certification listing and verification |
| `/articles` and `/careers` | Editorial content and career listings |
| `/admin` | Course, enrollment, and platform administration |

Bearer tokens are issued by the learning API after the main-platform SSO
exchange. The service exposes Swagger UI at `/docs`, ReDoc at `/redoc`, and
OpenAPI JSON at `/openapi.json`.

## Cross-platform sign-in

The main API's authenticated `POST /sso/code` endpoint creates the short-lived
handoff used by Learn. The learning API's `POST /api/v1/auth/sso/exchange`
exchanges that code for an LMS access token. The code is single-use; do not
reuse it or pass the shared SSO secret to a browser.

## Sarvam AI integrations

Sarvam AI translation and text-to-speech are backend integrations used by
main-platform chat endpoints. The API key must stay in the main backend's
server environment. Translation is opt-in for the recipient and is processed
asynchronously; pronunciation is generated on demand. See the live main API
OpenAPI document for exact schemas and error responses.
