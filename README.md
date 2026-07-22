# Multilingual MT Demo — 建創 KENSŌ

Demo for the inquiry: **WEBサイトの多言語翻訳（機械翻訳）実装** (6 locales, machine translation, language switcher). The real client stack is unknown, so this repo shows four content patterns and one **OpenAI** MT pipeline.

## What it demonstrates

| Mode | When the real project looks like this | Where strings live |
| --- | --- | --- |
| `json` | React / SPA frontend | `content/json/{lang}.json` |
| `yaml` | Backend-driven i18n | `content/yaml/{lang}.yaml` |
| `hardcoded` | Legacy templates / inline strings | `server/hardcoded.ts` (+ MT cache) |
| `wordpress` | WordPress site | Plugin stub + `/api/wp/v2/pages?lang=` |

Locales: `ja` (source), `en`, `ru`, `zh`, `fr`, `es`.

Machine translation uses **OpenAI Chat Completions** (`AI_API_ENDPOINT` / `AI_API_KEY` / `AI_API_MODEL`).

## Setup

1. Node.js 18+ (fetch is built-in).
2. Configure env:

```bash
copy .env.example .env
# set AI_API_KEY=sk-...
```

3. Install & run:

```bash
npm install
npm run dev
```

- Site: http://localhost:5173  
- API: http://localhost:8787  

## UI controls

- **Mode** — switch JSON / YAML / hard-coded / WordPress content loading.
- **Lang** — switch among 6 languages (full-page copy updates).
- **MT this lang** — translate Japanese source → selected locale via OpenAI and write files.
- **MT all missing** — batch-fill locales that are not on disk yet.

## CLI batch translate

```bash
npm run translate -- json
npm run translate -- yaml en
npm run translate -- hardcoded
```

## WordPress path

See `wordpress-plugin/kenso-multilingual-mt/`. It proxies locale requests to this demo API. On a real WP project you would:

1. Keep Japanese (or master) content in WP.
2. Call the MT API once per locale / post.
3. Store results in WPML / Polylang / custom post meta or static JSON export.
4. Serve `?lang=` (or subdirectory `/en/`) site-wide.

## Project layout

```
content/source/ja.json   # master copy (Japanese)
content/json/            # React-style locale files
content/yaml/            # backend YAML locales
content/cache/           # MT output for hardcoded / wordpress modes
server/                  # Express API + OpenAI translator
client/                  # React demo site + language switcher
wordpress-plugin/        # WP bridge plugin stub
```

## Deploy (Vercel)

1. Push this repo to GitHub and import it in [Vercel](https://vercel.com).
2. Set Environment Variables (Production): `AI_API_KEY`, `AI_API_ENDPOINT`, `AI_API_MODEL`, `AI_API_TIMEOUT`.
3. Deploy. Static UI = Vite `dist/`; API = serverless `api/index.ts` (Express).

Note: Vercel’s filesystem is read-only, so MT write/cache won’t persist — use pre-seeded `content/` files for the demo.

## Notes for the real proposal

- Design work is out of scope (matches the inquiry); this UI is only a demo shell.
- For 500–1000 pages: run MT offline/batch, cache aggressively, human-review critical pages, then ship static locale files or CMS entries — do not call OpenAI on every page view.
- Accuracy: strong for general corporate copy (inquiry notes: not heavy jargon). Add a review pass for legal/disclaimer pages.
- If OpenAI returns `403 Country, region, or territory not supported`, the egress IP is geo-blocked — use a supported network / proxy, or an Azure OpenAI endpoint in a supported region.
