# ARIA — Adaptive Rerouting Intelligence Agent

> EverMind Memory Genesis Competition 2026 — Track 1: Agent + Memory

---

## 1. Source Code

This repository contains the full source code for ARIA, including:

- `src/app/` — Next.js App Router pages and API routes (`/api/chat`, `/api/schedule`, `/api/extract`)
- `src/components/` — React components including the animated Mascot and Onboarding flow
- `services/` — EverMemOS Cloud API integration (`evermemos.js`) and OpenAI GPT wrapper (`openai.js`)
- `utils/` — Extraction prompt (`prompts.js`) and fallback profile builder
- `data/seeds/` — Persona seed data and scripts to populate EverMemOS with demo conversation history

**To run locally:**

```bash
npm install
```

Create `.env.local` in the project root:

```
EVERMEMOS_API_KEY=your_key
EVERMEMOS_BASE_URL=https://api.evermind.ai
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Seed the demo personas into EverMemOS:

```bash
node --env-file=.env.local data/seeds/seed-script.js --persona 1
node --env-file=.env.local data/seeds/seed-extended.js
```

Then:

```bash
npm run dev
```

---

## 2. Demo Video

The video covers:

**(a) Features**
ARIA is a disruption-intelligent scheduling companion with three modes demonstrating the power of long-term memory:
- **No Memory** — intelligent scheduling from a single brain dump, no cross-session context
- **Zara (2 weeks)** — pre-seeded persona with 2 weeks of EverMemOS history, patterns beginning to emerge
- **Zara (4 weeks)** — same persona with 4 weeks of history, deep pattern recognition, confident responses
- **As You** — live onboarding and extraction, your own profile built in real time

**(b) How we use memory**
ARIA uses EverMemOS Cloud to store every conversation turn as a MemCell. On each interaction, the `/api/chat` route queries EverMemOS using hybrid retrieval (BM25 + vector search) with the user's current message. Retrieved memories are injected into the system prompt as cross-session context — patterns the agent has observed over weeks, not just the current conversation. When a memory is used in a response, the UI surfaces a **MEMORY SURFACED** badge so users can see exactly when long-term memory is shaping the agent's understanding.

**(c) How memory helps users**
Without memory, ARIA responds to disruptions like any capable AI scheduler — competently, but generically. With 4 weeks of EverMemOS memory, ARIA knows that Zara always writes better after the gym, that social isolation precedes her motivation collapses, and that Priya is the person who pulls her back. When Zara says "I don't feel like anything tonight, been alone all week" — ARIA doesn't suggest more work. It asks about Priya. That response is only possible because EverMemOS preserved that pattern across sessions. The demo shows this contrast directly: same message, three modes, three completely different quality responses.

---

## 3. Deployed URL

(https://aria-evermind.vercel.app)

**Demo instructions:**
1. Open the deployed URL
2. Select **Zara (4wk)** mode — no setup needed, memory is pre-seeded
3. Type: *"I don't feel like anything tonight, been alone all week"*
4. Watch the MEMORY SURFACED badge — the agent references Priya without being told
5. Switch to **No Memory** — type the same message — see the contrast
6. Select **As You** — complete the onboarding and brain dump to generate your own live schedule

---

## Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Memory:** EverMemOS Cloud API — long-term memory across sessions
- **LLM:** OpenAI GPT-4o-mini
- **Deployment:** Vercel
