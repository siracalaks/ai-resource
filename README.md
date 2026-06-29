<!-- 🇹🇷 Türkçe: README.tr.md -->

# Vektra — a self‑harvesting, AI‑scored dev‑tool intelligence library

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Zero dependencies](https://img.shields.io/badge/dashboard-zero%20dependencies%20%C2%B7%20no%20build-success)
![Stack](https://img.shields.io/badge/stack-n8n%20%C2%B7%20Supabase%20%C2%B7%20Claude%20%C2%B7%20Gemini-6366f1)
![by VektraDev](https://img.shields.io/badge/by-VektraDev-6366f1)
[![Türkçe](https://img.shields.io/badge/lang-Türkçe-red.svg)](README.tr.md)

> 🏗️ **A [VektraDev](#-about-vektradev) open-source product** — built to be self-hosted, forked, and made your own.

**Vektra harvests the internet for useful dev/AI tools every morning, *reads* each one with
an LLM, scores it for your work, answers your questions over the whole thing — and grows its
own catalog while you sleep.** Two parts: a **zero‑install dashboard** you can open right now,
and an **auto‑engine** that runs itself on your own infra.

> ⚠️ The dashboard UI is currently **Turkish** — everything works the same, and i18n PRs are very welcome.

---

## ✨ What you get

- 📚 **A curated tool library** (~200 cards across 9 build stages: ideation → design → frontend →
  backend → AI agents → video/media → devops → marketing → learning) that **works offline**.
- 🛰️ **Daily auto‑harvested intelligence** — GitHub, Hacker News, YouTube, Product Hunt, Reddit &
  Instagram (via Apify) → deep‑read → scored 0–100 + a 💰 money‑radar.
- 💬 **Ask in natural language** — semantic search over your library + intel, synthesized into a
  **cited** answer (Gemini embeddings + Claude Haiku).
- 🤖 **A library that grows itself** — high‑value findings are auto‑promoted into permanent cards.
- 🔌 **An MCP server** — query the same brain from **any** Claude project with one tool call.
- 🔐 **Self‑hosted & cheap** — your keys, your data, ~**$3–8/month**.

## 🧭 How it works

```
 7 sources                     n8n engine            the brain                memory                 you
 GitHub · HN · YouTube   →   harvest + deep‑read  →  Claude Haiku        →   Supabase           →  📚 Library
 Product Hunt · Reddit       (README/Firecrawl)      summary · score 0‑100   intel_items +          🛰️ Intel feed
 Instagram (via Apify)                               · why · 💰 money       library_embeddings      💬 Ask (cited)
                                              →  Gemini embed (768‑dim)   + match_all (pgvector)  ──┐
                                                                                                    ├─ 📱 WhatsApp brief
                                                                                                    ├─ 🔄 GitHub sync
                                                                                                    └─ 🔌 Vektra MCP
```

Cards qualifying as high‑value (relevance ≥ 80 + a safe type + a valid stage) are **auto‑added**
to the library; everything is `status: watch` until you verify it. Cataloguing ≠ installing.

## 🚀 Quick start

### Tier 1 — just the dashboard (30 seconds, no accounts)
1. Download the repo and **double‑click `intel/dashboard.html`**.
2. Browse the offline **Library** tab immediately.
3. To light up the live tabs, open **Ayarlar (Settings)** and paste your Supabase URL + anon key
   (and your Sor webhook URL). That's it — **no code editing**; everything is configured in the UI.

### Tier 2 — the full auto‑engine
You'll need free/cheap accounts for **Supabase**, **n8n**, an **Anthropic** key (Claude Haiku) and a
**Gemini** key. Then: create the DB schema, import the n8n workflow, fill its `CONFIG`, and connect
the dashboard.

➡️ **Full step‑by‑step guide: [docs/INSTALL.md](docs/INSTALL.md)**

## 🔌 Use it in any project (MCP)

`00-meta/vektra-mcp.py` is a zero‑dependency, pure‑Python MCP server. Register it once and every
Claude project gets a `vektra_ask` tool that queries your central, always‑updating library — without
copying the library into each project.

```bash
claude mcp add vektra -s user \
  -e VEKTRA_ASK_URL=https://YOUR-n8n-domain/webhook/vektra-ask \
  -e VEKTRA_ASK_KEY=your-token \
  -- python /abs/path/to/00-meta/vektra-mcp.py
```

## 🧱 Tech stack

| Layer | Default | Notes |
|------|---------|-------|
| Orchestration | **n8n** | one Code node runs the whole pipeline |
| Database + vectors | **Supabase** (Postgres + pgvector) | `intel_items`, `library_embeddings`, `match_all` RPC |
| Brain | **Claude Haiku** (`claude-haiku-4-5`) | summarize · score · money‑radar |
| Embeddings | **Gemini** (`gemini-embedding-001`, 768‑dim) | semantic search |
| Dashboard | **single HTML file** | zero dependencies, no build, offline‑capable |
| Optional | Ollama/LiteLLM, Apify, Firecrawl, Evolution (WhatsApp) | all opt‑in |

## 📁 Repository layout

```
README.md / README.tr.md      front door (EN / TR)
SKILL.md                       router for Claude (how to query the registry)
registry.csv / registry.json   machine‑readable index (stage × type × domain)
vektra-engine.n8n.json         import‑ready n8n workflow (starter)
.env.example                   all keys, documented
intel/dashboard.html           the zero‑install dashboard
00-meta/                       schema, engine, ask node, MCP, prompts, setup
01-…09-                        ~200 tool cards by build stage
99-inbox/                      auto‑drafted cards awaiting human review
docs/INSTALL.md                full setup guide
```

## 🔐 Security & cost
- **No secrets in this repo.** Keys live in n8n or a local `.env` (gitignored) — see `.env.example`.
- Supabase RLS: the public reads only + can flag `saved`; the engine writes with the secret key.
- Put the dashboard behind Basic Auth if you host it publicly; the Sor webhook can require a token.
- Cost: free backbone + ~**$3–8/month** for Claude Haiku & Gemini.

## 🏗️ About VektraDev
**Vektra** is an open-source product by **VektraDev** — practical AI + automation tooling for
developers and small teams. The philosophy: self-host first, keep your data and keys, and make
the tools your own. Fork it, adapt the `CONFIG.profile` to your work, ship it.

## 🤝 Contributing & license
PRs welcome — add a tool card, fix a recipe, or translate the UI. See **[CONTRIBUTING.md](CONTRIBUTING.md)**.
Licensed under the **[MIT License](LICENSE)** · © VektraDev.
