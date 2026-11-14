---
title: Learning platform
---

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
[learning API guide](../development/repository-learning-api.md#practice-and-challenges)
before relying on those responses.
