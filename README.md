# VartaLang Documentation

The VartaLang documentation site is built with Docusaurus 3. It documents the VartaLang platform, its learning platform, and the services and APIs behind them.

Start with the [ecosystem introduction](docs/intro.md) or [architecture overview](docs/architecture/overview.md). The guides are organized under `docs/` by product area.

## Requirements

- Node.js 20 or newer
- npm

## Local development

```bash
npm install
npm start
```

The start command generates the documentation assistant and developer search indexes, then starts Docusaurus at `http://localhost:3000`.

Create and preview a production build with:

```bash
npm run build
npm run serve
```

## Site features

- **Samvaad voice assistant:** available throughout the site. Visitors can start and end a live voice call, view a transcript, and copy it. Calls stop after two minutes; they also stop after five assistant turns without a user response.
- **Documentation navigation:** the assistant searches the documentation index and can navigate to a matching passage and highlight it.
- **Local documentation search:** the navbar search indexes public documentation and pages. Developer documentation is excluded from this index.
- **Developer documentation prompt and search:** a separate prompt can unlock an index for `docs/development/`. The unlock is remembered for the current browser tab.
- **Insufficient-credit handling:** if Samvaad reports insufficient credits, the assistant displays “The agent is temporarily unavailable. Please try again later or contact the internal team.” Other connection failures display their error message.

## Configuration

Copy `.env.example` as a reference. For local development, create an ignored `.env` file. For deployments, configure environment variables in the hosting provider and rebuild the static site.

| Variable | Purpose |
| --- | --- |
| `SAMVAAD_API_KEY` | API key used by the browser voice assistant. Falls back to `SARVAM_API_KEY` if unset. |
| `SAMVAAD_ORG_ID` | Samvaad organization ID. |
| `SAMVAAD_WORKSPACE_ID` | Samvaad workspace ID. |
| `SAMVAAD_APP_ID` | Samvaad agent ID. |
| `DEVELOPER_GATE_USERNAME` | Username for the casual developer-doc prompt. |
| `DEVELOPER_GATE_PASSWORD` | Password for the casual developer-doc prompt. |
| `SARVAM_API_KEY`, `SARVAM_MODEL` | Optional standard Sarvam API settings; the current call flow uses Samvaad. |
| `SARVAM_VOICE_AGENT_SCRIPT` | Optional voice-agent embed script URL. |

The Begin Call settings menu has been removed. Visitors cannot change the API key or agent ID in the page. Samvaad values are supplied at build time and apply to all visitors of that deployment.

### Credential and access notes

The Samvaad browser SDK needs the API key in the client, so a key supplied through Docusaurus `customFields` is included in the public site bundle and can be inspected by visitors. Use a key with appropriate provider-side restrictions and usage limits. Do not treat this static frontend as a way to keep the key secret; a server-side credential or token flow is needed for that.

The developer-doc prompt is also a client-side browsing gate, not authentication or access control. Its values are compiled into the static bundle, and the developer documents and search index are served as static files. Do not put confidential information in these docs or rely on the prompt to protect them.

Never commit a real `.env`, API key, password, or other credential. `.env.example` contains placeholders and reference values only.

## Documentation map

- `docs/getting-started/` — account and profile setup
- `docs/platform/` — language exchange, jobs, courses, learning resources, and safety
- `docs/architecture/` — system design, services, and platform boundaries
- `docs/development/` — onboarding, repository guides, APIs, data, operations, and contribution guidance

## Index generation

The `npm start` and `npm run build` commands regenerate these indexes:

- `static/varta-docs-index.json` — searchable chunks from Markdown and MDX files under `docs/`, used by the assistant.
- `static/developer-search-index.json` — search index for `docs/development/`, loaded by developer-doc search.

Edit source documentation under `docs/`; these JSON files are generated outputs. See [contribution guidance](docs/development/contributing.md) before submitting changes.

## Deployment

The site is configured for `https://docs.vartalang.in` with `/` as its base URL. Set the required build-time environment variables in the deployment provider, then run `npm run build`. The generated `build/` directory is the static site output.
