---
title: Architecture overview
---

# Architecture overview

VartaLang is a set of independently deployed applications and APIs rather than
a single service. The main product connects learners with people and
opportunities; VartaLang Learn provides a separate course and enrollment
experience. Each API owns its own data and domain.

For engineering onboarding, start with the [internal developer onboarding
map](../development/onboarding.md), then use the
[repository guides](../development/repository-main-web.md) and
[data ownership map](../development/data-and-state.md).
The [system design guide](./system-design.md) distinguishes current design
decisions from recommended improvements and delivery practices.

## Services at a glance

| Component | Responsibility | Main technologies |
| --- | --- | --- |
| Main web application | Profiles, matching, chat, language guides, jobs, and learning entry points | Next.js, React, TypeScript |
| Main platform API | Identity, profiles, matches, chat, notifications, jobs, guides, and real-time events | Node.js, Express, MongoDB, Socket.IO |
| Learning web application | Course discovery, course lessons, learner/instructor/admin views, and checkout | Next.js, React, TypeScript |
| Learning API | Courses, enrollments, lesson progress, practice, certifications, payments, and administration | FastAPI, SQLAlchemy, PostgreSQL |
| Language games | A separate language-game experience linked from the main learning area | Separate web application |
| AI providers | Indian-language chat translation and message pronunciation | Sarvam AI; optional Google Translate fallback |

The frontends and APIs are deployed separately. The main platform uses MongoDB
for its community and opportunity data, while the learning API uses PostgreSQL
for courses, enrollments, progress, and related learning records.

```text
Main browser app (Next.js) --> Main Express API --> MongoDB
          |                       |     |
          |                       |     +--> Sarvam AI / Google Translate
          |                       +--------> Socket.IO
          |
          +--> one-time SSO --> LMS browser app (Next.js) --> LMS FastAPI --> PostgreSQL
                                                                     |--> Razorpay
                                                                     `--> YouTube Data API

Voice Challenge: main Next.js API route --> Main API identity check --> Google Drive
```

## Sign-in across the main platform and Learn

The main application owns the primary VartaLang account. When a signed-in user
opens Learn, the main API creates a short-lived, single-use authorization
code. The learning frontend sends that code to the learning API, which
verifies it server-to-server with the main API. The learning API then issues
its own token and maps the VartaLang account to a learner, instructor, or
admin role.

This exchange shares identity, not application data: the learning service
retains its own course and progress records. The LMS also supports Google
sign-in by first authenticating with the main platform and then using the same
SSO exchange.

## AI-assisted communication

For chat messages, a recipient can enable translation. The main API stores and
sends the original message immediately; when translation is enabled, it
translates asynchronously and updates the conversation when a result is
available. Sarvam AI is the preferred provider for supported Indian
languages. Google Translate can handle foreign-language targets or act as a
configured fallback. Message pronunciation is generated on demand through
Sarvam AI text-to-speech and cached with the message.

These are focused language-assistance features, not a claim that every
application feature is AI-generated. The learning platform's planned
pronunciation and listening practice modules are not the same as the live chat
translation and pronunciation tools.

## Deployment boundaries

The main and learning frontends are available at [vartalang.in](https://vartalang.in)
and [learn.vartalang.in](https://learn.vartalang.in). Their APIs are separately
configured services. The language-games surface is also linked as a separate
experience. Use the [local setup guide](../development/local-setup.md) for
service configuration and the [API reference](../development/api-reference.md)
for route groups.
