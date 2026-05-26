# bitacola-backend

**AI-powered police operations assistant** — field officers dictate or type incident descriptions in plain Catalan or Spanish; the system returns AI-formatted official police reports, live entity matching against a records database, and criminal code classification, all in a single pipeline.

Currently in **beta deployment** across multiple Catalan municipal police forces.

> ⚠️ This repository is **private**. It handles operational law enforcement data. This description is public for portfolio purposes.

---

## What it does

A patrol officer picks up their phone mid-shift. They type or dictate what happened in plain colloquial language. In seconds they receive:

1. **Formatted official text** — colloquial input converted to legally-formatted Catalan police prose (Parte Diari or DRAG standard informe tipificat)
2. **Live entity annotations** — persons, vehicles, and locations in the text are highlighted and cross-referenced against a records database in real time (exact/partial match, confidence score, prior incidents count)
3. **Criminal code classification** — automatic routing through the `penal_backend` pipeline: binary criminal/non-criminal gate, domain routing, and top-3 offence matches with similarity scores
4. **Immediate dispatch** — officer reviews, edits, and sends via WhatsApp, Telegram, clipboard, or email — directly from the same interface

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (GitHub Pages — static)                   │
│  index.html · Web Speech API (ca-ES) · IndexedDB   │
└──────────────────┬──────────────────────────────────┘
                   │ HTTPS (session token)
                   ▼
┌─────────────────────────────────────────────────────┐
│  bitacola-backend  (Node.js · Express)              │
│  • Token-based session auth (no passwords)          │
│  • Request proxy + retry logic (3× with backoff)    │
│  • Keepalive ping to Sherlock every 10 min          │
└──────────┬──────────────────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────┐
│ sherlock-backend │   │ penal-backend                │
│ (FastAPI/Python) │   │ (FastAPI/Python)             │
│                  │   │                              │
│ • AI text        │   │ Gate → Router → Engine       │
│   generation     │   │ behaviour vectors            │
│ • Entity NER     │   │ cosine similarity            │
│ • DB lookup      │   │ 8 legal domains              │
│ • Annotation     │   │ 35+ offence types            │
│   markup         │   └──────────────────────────────┘
└──────────────────┘
```

**Data storage:** Records are stored exclusively in the officer's browser (IndexedDB). The server never stores what the officer writes. Zero server-side operational data.

---

## Key design decisions

**Voice-first, mobile-first.** The interface was designed for a patrol officer holding a phone with one hand. Patrol mode activates a large press-and-hold voice button using the Web Speech API (Catalan locale). Office mode switches to standard text input.

**Session tokens, no passwords.** Officers authenticate with a simple username. The backend issues a random session token stored in `localStorage`. No passwords, no OAuth complexity — appropriate for the deployment context.

**Zero knowledge architecture.** The backend is a stateless proxy. All shift records are stored locally in IndexedDB. When an officer closes the browser, the data stays on their device. The server logs usage metadata only (user, mode, response time).

**Retry logic on the proxy.** Sherlock runs on a free-tier service with cold starts. The proxy implements 3-attempt retry with 8-second backoff and 90-second timeout per attempt, handling the 429/timeout cases transparently.

**Annotated text output.** The Sherlock response includes character-level span annotations for detected entities. The frontend renders these as inline highlights (blue = exact match, amber = partial match) with rich tooltips showing prior incident count, vehicle data, and flags from the records database.

---

## Frontend interface

Three-tab layout served from GitHub Pages:

| Tab | Content |
|-----|---------|
| **✏ Redactor** | Input area (voice or text) + AI-generated output + edit/header tools |
| **🗄 BD** | Entity match cards — persons, vehicles, locations detected in the text with DB lookup results and risk indicators |
| **⚖ Penal** | Criminal analysis panel — module confidence, offence ranking with colour-coded similarity scores |

Output modes:
- **Parte Diari** — shift log entry, structured prose
- **Informe Tipificat DRAG** — formal DRAG-standard police report (official Catalan police documentation format)

Export channels: clipboard · WhatsApp · Telegram · email

---

## Stack

```
Node.js + Express    Backend server and proxy
CORS + session auth  Multi-origin support, token sessions
node-fetch           Proxy requests to Sherlock
GitHub Pages         Static frontend hosting
Web Speech API       Voice dictation, Catalan locale (ca-ES)
IndexedDB            Local-only shift record storage
```

**Deployment:** `bitacola-backend` runs on Render.com (free tier). The frontend is hosted on GitHub Pages. The full system is also accessible via DuckDNS and through the private Tailscale mesh (`figaro-server`).

---

## Beta deployment

The system is currently in active beta with officers across several Catalan municipalities. Each officer has a named session credential. Session state is in-memory on the server — restarting the server invalidates all sessions (by design for the current beta phase).

---

## Related

- [`sherlock-backend`](https://github.com/gienini2/sherlock-backend) — AI report generation engine and entity matching (1,200+ person/vehicle records)
- [`penal_backend`](https://github.com/gienini2/penal_backend) — Criminal code classification pipeline
- `central-partes` — Unified command panel aggregating reports across municipalities (separate private repo)
