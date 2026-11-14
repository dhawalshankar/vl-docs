---
title: Local development setup
---

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
