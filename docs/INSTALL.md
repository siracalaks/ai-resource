# Vektra — Install Guide

Two ways to run Vektra. **Tier 1** needs nothing but a browser. **Tier 2** stands up the full
self‑hosted auto‑engine. Nothing here requires editing code — the dashboard is configured in its
UI, and the engine is configured by pasting keys into n8n.

---

## Prerequisites (Tier 2)

| Service | Why | Get it | Required? |
|--------|-----|--------|-----------|
| **Supabase** | Postgres + pgvector store | https://supabase.com (free tier) | ✅ |
| **n8n** | runs the engine + the Ask webhook | https://n8n.io (cloud) or self‑host | ✅ |
| **Anthropic** | Claude Haiku — the brain | https://console.anthropic.com | ✅ |
| **Gemini** | embeddings (semantic search) | https://aistudio.google.com/apikey | ✅ |
| GitHub token | higher API limit + README deep‑read | github.com → Settings → Tokens | optional |
| Firecrawl | deep‑read non‑GitHub pages | https://firecrawl.dev | optional |
| YouTube Data API v3 | video tutorials as intel | Google Cloud Console | optional |
| Apify | Reddit + Instagram harvest | https://apify.com (paid/opt‑in) | optional |
| Product Hunt | top launches | https://api.producthunt.com | optional |
| Evolution API | WhatsApp morning brief | self‑host | optional |

Copy [`.env.example`](../.env.example) to `.env` if you want the local Python scripts to read keys —
otherwise you'll paste keys straight into n8n.

---

## Tier 1 — Dashboard only (no accounts)

1. Download the repo, **double‑click `intel/dashboard.html`** (or host it anywhere static).
2. The **Library** tab works offline immediately.
3. Live tabs (Intel / Ask) light up once you complete Tier 2 and enter your keys in **Settings**.

---

## Tier 2 — Full auto‑engine

### 1) Create the Supabase schema
- Create a Supabase project.
- Open **SQL Editor → New query**, paste the schema, and **Run**. The schema is in
  [`00-meta/intel-schema.sql`](../00-meta/intel-schema.sql) — or click **📋 Copy SQL** in the
  dashboard's **Kurulum (Setup)** tab (same SQL).
- It creates: the `vector` extension, tables `intel_items` + `library_embeddings`, the
  `match_all` semantic‑search function, and the RLS policies (anon reads + can flag `saved`;
  the engine writes with the service key).

### 2) Get your keys
- **Anthropic** API key (Claude Haiku) and **Gemini** API key.
- In Supabase → **Settings → API**, copy the **Project URL**, the **anon** key (browser‑safe),
  and the **service_role** key (server‑side only — never ship to the browser).

### 3) Set up the engine in n8n
Two options — both are fine:

**A. Recommended (Claude Haiku, matches the live system):** create a workflow with a
**Schedule Trigger → Code node**, paste [`00-meta/engine-node.js`](../00-meta/engine-node.js)
into the Code node, fill the `CONFIG` block at the top (`anthropic`, `gemini`, `supabaseUrl`,
`supabaseKey` = service_role, plus the optional sources and your one‑line `profile`), schedule it
(e.g. daily 08:00), and **Activate**.

**B. Quick import:** import [`vektra-engine.n8n.json`](../vektra-engine.n8n.json), open the Code
node, fill `CONFIG`, Activate. *(This bundled starter defaults to a local **Ollama** brain; swap in
the Claude‑Haiku engine from option A if you don't run Ollama.)*

### 4) Set up the Ask ("Sor") webhook in n8n
Create a second workflow: **Webhook (GET, path `vektra-ask`) → Code node → Respond to Webhook**.
Paste [`00-meta/ask-node.js`](../00-meta/ask-node.js) into the Code node, fill its `CFG`
(`gemini`, `anthropic`, `supabaseUrl`, `supabaseKey`, and an optional `askToken`), and **Activate**.
Your webhook URL will look like `https://YOUR-n8n-domain/webhook/vektra-ask`.

### 5) Connect the dashboard
Open `intel/dashboard.html` → **Ayarlar (Settings)** and enter:
- **Supabase URL** + **anon key** → lights up the **İstihbarat (Intel)** tab.
- **Sor webhook URL** (from step 4) + **Sor token** (if you set `askToken`) → lights up **Sor (Ask)**.

Everything is stored in your browser's `localStorage`. Done — Intel shows scored findings, Ask
answers with citations, and the Library auto‑grows.

### 6) Optional — ⚡ Harvest now (on-demand trigger)
The Intel tab has a **⚡ Harvest now** button to run the engine on demand (not just the daily
schedule). To wire it: in n8n put a **Webhook trigger (GET, path `vektra-harvest`)** in front of a
Code node holding [`00-meta/harvest-node.js`](../00-meta/harvest-node.js), and end with **Respond to
Webhook** — set the header `Access-Control-Allow-Origin: *` and "respond when the last node finishes"
so it returns after the run. Optionally guard it with a `?key=` token (same pattern as the Ask node).
Paste that URL into **Settings → Harvest webhook URL**.
Clicking the button runs a fresh harvest (~1–2 min) and auto-refreshes the feed.

**Search-driven harvest:** when you type a term in the Intel search box and hit ⚡, the dashboard
passes it as `?q=<term>` — `harvest-node.js` then researches *that* term live (GitHub + Hacker News),
instead of the default keyword sweep. Empty box = general sweep.

> **Why a button, not live-on-load:** harvesting on every page open would be slow (minutes), costly
> (every visit burns API credits) and insecure (the service/LLM keys can't live in the browser). The
> dashboard reads the pre-harvested store **instantly**; the daily schedule + this button keep it
> fresh. That's the correct architecture for an intelligence feed.

---

## Use Vektra from any project (MCP)

```bash
claude mcp add vektra -s user \
  -e VEKTRA_ASK_URL=https://YOUR-n8n-domain/webhook/vektra-ask \
  -e VEKTRA_ASK_KEY=your-token \
  -- python /abs/path/to/00-meta/vektra-mcp.py
```
Now any Claude project has a `vektra_ask` tool that proxies your Ask webhook (no keys stored locally).

---

## Optional: the self‑growing loop
The engine auto‑promotes high‑value findings into the library. For lower‑relevance candidates you
want to review by hand, run:
```bash
python 00-meta/inbox-sync.py     # drafts candidate cards into 99-inbox/ for review
```
Review each draft, verify its connection recipe with a **real** command, move it to its stage
folder, and add a `registry.csv` row. Never auto‑promote from `99-inbox/` — a card is catalogued,
not installed.

---

## Hosting the dashboard
It's a single static file — host it anywhere (Netlify, Vercel, Cloudflare Pages, nginx, Coolify…).
If it's public, put it behind **Basic Auth** and set an `askToken` on the Sor webhook so only you
can call it.

---

## Troubleshooting
- **Intel tab: "Bağlanılamadı"** → check the Supabase URL/anon key, and that RLS allows anon SELECT
  (the schema does this).
- **Ask returns "Önce Ayarlar'dan Sor webhook URL'ini gir"** → set the Sor webhook URL in Settings.
- **Ask says the AI service hit a limit** → your Anthropic usage/spend limit is reached
  (Console → Settings → Limits), not a code bug. The daily engine brain uses the same key.
- **Gemini 429** → it's rate‑limited; the engine backs off and retries.
- **`library_embeddings` count looks off** → that table has no `id` column; count via any existing
  column (the dashboard already does).

---

## Security checklist
- ✅ Keys live in n8n / a gitignored `.env` — never in the repo.
- ✅ Browser uses the **anon** key only; the **service_role** key stays server‑side in n8n.
- ✅ Sources are treated as untrusted data — the Ask node never executes embedded commands.
- ✅ Put a token on the Sor webhook and Basic Auth on a public dashboard.
