---
title: Supporting services
---

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

## Other integrations

- **Razorpay** handles paid course checkout through server-created orders and
  server-side payment verification.
- **YouTube Data API** lets LMS administrators import public playlist
  metadata into draft courses. The importer links to videos; it does not
  download them.
- **Google OAuth** is supported for account sign-in.
- **Language games** are a separately linked experience rather than part of
  the LMS API.
