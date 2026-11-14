---
title: Main platform
---

# Main platform

The main VartaLang application is the community and opportunity layer of the
ecosystem. It lets people describe the languages they know and want to learn,
connect with compatible partners, chat, browse language resources, and find
language-related jobs.

## Web application

The Next.js application provides:

- Account signup, sign-in, password recovery, and profile editing.
- Learner and teacher profile details, including known languages, fluency,
  learning goals, and location.
- Language matching, chat, notifications, and account controls.
- Published language guides, learning resources, and a link to the separate
  VartaLang Learn course platform.
- Jobs, role, and other language-linked opportunity views.
- A learning area that links to additional resources such as Gauraiyya Radio
  and language games.

## Main API

The Node.js/Express API provides authenticated endpoints for profiles,
matching, chat, notifications, and administration, as well as public and
authenticated job and language-guide routes. MongoDB stores the main
platform's user, chat, match, notification, job, and language-guide data.

Socket.IO is attached to the API server for chat and notification events,
including message delivery, read state, typing/online state, and user
notifications. The API also supports account hand-off to Learn through
single-use SSO codes.

## Matching and communication

Matching uses the languages each person knows and wants to learn to find
reciprocal language fits. A connection request can be accepted or declined;
accepted connections can continue in a one-to-one chat. Chat includes
blocking, reporting, and deletion controls.

Recipients can opt into translated messages. Sarvam AI is used for supported
Indian-language translation and on-demand text-to-speech pronunciation. The
original message remains the source message; a translation is an additional
reading aid.

## Related documentation

- [Language exchange](../platform/language-exchange.md)
- [Jobs](../platform/jobs.md)
- [Learning resources](../platform/learning-resources.md)
- [Safety and trust](../platform/safety-and-trust.md)
