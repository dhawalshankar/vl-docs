# VartaLang Documentation

Documentation for the VartaLang ecosystem: a platform for learning Indian
languages and culture, powered by Sarvam AI. VartaLang combines human
language exchange, practical resources, structured courses, and language-
linked opportunities.

The ecosystem includes the main VartaLang web application and API, a separate
VartaLang Learn web application and API, and a separately linked language
games experience. Sarvam AI is integrated into the main platform's chat
translation and on-demand message pronunciation; it does not power every
product feature. See the [ecosystem introduction](docs/intro.md) and
[architecture overview](docs/architecture/overview.md).

## Development

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

## Developer-docs gate

The developer routes have a cosmetic sign-in prompt. Set
`DEVELOPER_GATE_USERNAME` and `DEVELOPER_GATE_PASSWORD` in the Vercel build
environment to enable it. These build-time values are included in the static
client bundle, so this only discourages casual browsing; it does not secure
confidential content. See [`.env.example`](.env.example) for the variable names
and placeholder format; set the actual password directly in Vercel, not in Git.
After sign-in, a separate developer-doc search index is loaded; developer pages
remain excluded from the public navbar search index.

## Documentation structure

- `docs/getting-started/` — getting started and account guides
- `docs/platform/` — language exchange, jobs, courses, resources, and safety
- `docs/architecture/` — applications, APIs, integrations, and SSO
- `docs/development/` — team onboarding, repository internals, data models,
  API inventory, local setup, operations, and contribution guidance

## Varta Docs Agent (Powered by Sarvam AI)

The documentation features a **Docs Assistant** widget (styled identically to Sarvam AI's Docs Assistant) that answers questions from the documentation and pinpoints exact locations.

### Key Capabilities:
- **Exact Line Location & Highlighting**: When you ask *"where is it located in my docs?"* or click any citation card in the chat, it navigates directly to that document, smoothly scrolls to the exact section/sentence, and highlights the target line with an animated beacon glow (`?highlight=...&line=...`).
- **Voice & Call Mode**: Supports `"Begin Call"` with live audio wave animations, speech recognition, and Indian English/Hindi voice synthesis (`window.speechSynthesis`), or typing via text input.
- **Sarvam AI Integration**: Powered by Sarvam AI Chat Completion API (`sarvam-105b`, `sarvam-105b-conversations`, or `sarvam-2b`).
- **Zero-Config Fallback**: Works immediately with offline line extraction even before an API key is provided.

### Configuration:
1. In the browser: Click the ⚙️ settings icon in the Docs Assistant header and paste your `SARVAM_API_KEY`.
2. Via environment variables: Add `SARVAM_API_KEY=your_key` in `.env` or Vercel environment variables.

### Terminal CLI:
You can also ask questions from the terminal:

```bash
npm run agent "Where is Sarvam AI integrated?"
npm run agent "Where are the API endpoints documented?"
```

