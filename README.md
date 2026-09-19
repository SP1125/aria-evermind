# ARIA — Adaptive Rerouting Intelligence Agent

> A long-term-memory AI scheduling agent that learns a user's behavioural patterns and uses them to intelligently reroute plans when life gets in the way.

**Built for:** EverMind Memory Genesis Competition 2026 — Agent + Memory Track

[**Live Demo**](https://aria-evermind.vercel.app) · [**Demo Video**](./ARIA-demo.mp4)

---

## Overview

Traditional AI schedulers can optimise a plan given the information in front of them, but they generally lack the longitudinal context needed to understand *why* a particular plan might work for a particular person.

**ARIA** explores what happens when an AI scheduling agent has access to persistent, cross-session memory.

Instead of treating every disruption independently, ARIA retrieves relevant memories about the user — including habits, relationships, preferences and recurring behavioural patterns — and uses them to decide how a schedule should be adapted.

For example, if a user repeatedly works better after exercising, tends to lose motivation after prolonged social isolation, or relies on a particular friend to get them back on track, ARIA can use those patterns when responding to a future disruption.

---

## The Problem

A disruption doesn't necessarily mean the original plan was wrong.

The challenge is deciding **how to adapt the plan for this particular person**.

A generic scheduler might respond to:

> "I don't feel like doing anything tonight. I've been alone all week."

by suggesting that the user simply move their tasks to another time.

ARIA can instead use accumulated memory to recognise that social isolation has previously been associated with the user's motivation dropping, and that spending time with a particular friend has helped them recover.

The goal is therefore not just **schedule optimisation**, but **personalised schedule rerouting based on longitudinal context**.

---

## How ARIA Works

ARIA combines:

* **Long-term memory** through EverMemOS
* **LLM reasoning** through OpenAI GPT-4o-mini
* **A Next.js/React interface**
* **Schedule generation and rerouting**
* **Live user onboarding and profile extraction**

### Architecture

```text
flowchart TD
    A[User] --> B[ARIA Web App]

    B --> C{User Interaction}

    C -->|Brain dump / schedule request| D[/api/schedule]
    C -->|Chat / disruption| E[/api/chat]
    C -->|Onboarding / profile extraction| F[/api/extract]

    D --> G[OpenAI GPT-4o-mini]
    F --> G

    E --> H[EverMemOS Cloud]
    H -->|Hybrid retrieval<br/>BM25 + vector search| I[Relevant Long-Term Memories]

    I --> G

    G --> J[Personalised Response / Rerouted Schedule]

    J --> B

    E --> K[Store Conversation]
    K --> H

    B --> L[MEMORY SURFACED Badge]
```

### Memory pipeline

Each conversation turn is stored in EverMemOS as a memory unit.

When the user interacts with ARIA:

1. The current message is sent to the chat API.
2. ARIA queries EverMemOS using the current message as the retrieval query.
3. EverMemOS performs hybrid retrieval using **BM25 + vector search**.
4. Relevant memories from previous sessions are returned.
5. Retrieved memories are added to the LLM's context.
6. GPT-4o-mini uses the current situation *and* the retrieved history to generate a response.
7. When long-term memory influences the response, ARIA surfaces a **MEMORY SURFACED** indicator in the UI.

This allows the agent to reason using patterns that may have emerged over weeks rather than only the current conversation.

---

## Demonstration

The demo compares ARIA's behaviour as progressively more information about the same user becomes available.

### 1. No Memory

ARIA receives only the user's current brain dump and conversation.

There is no cross-session behavioural context.

### 2. Zara — 2 Weeks

A pre-seeded persona with two weeks of conversation history.

Some recurring preferences and behavioural patterns are beginning to emerge.

### 3. Zara — 4 Weeks

The same persona with four weeks of accumulated memory.

ARIA can now retrieve deeper patterns across previous interactions and use them when responding to disruptions.

### 4. As You

A live onboarding flow where a new user can provide their own information and generate a personalised profile and schedule.

---

## Example

The same disruption can produce different responses depending on the available memory.

**User:**

> "I don't feel like anything tonight, been alone all week."

With no long-term memory, an AI scheduler has little context beyond the message itself.

With Zara's accumulated memory, ARIA can retrieve the pattern that social isolation has previously preceded motivation drops, alongside the user's relationship with Priya.

The agent can therefore consider **the user's established behavioural patterns**, rather than treating the disruption as an isolated scheduling problem.

---

## Technical Implementation

### Frontend

* Next.js App Router
* React
* Tailwind CSS

### AI / Memory

* OpenAI GPT-4o-mini
* EverMemOS Cloud API
* Hybrid memory retrieval: BM25 + vector search

### Backend

Next.js API routes handle:

* `/api/chat` — conversational interaction and memory retrieval
* `/api/schedule` — schedule generation
* `/api/extract` — user information/profile extraction

### Data

The `data/seeds/` directory contains:

* Demo persona data
* Conversation histories
* Scripts for populating EverMemOS with demo memories

### Deployment

* Vercel

---

## Repository Structure

```text
aria-evermind/
│
├── app/
│   ├── api/
│   │   ├── chat/
│   │   ├── schedule/
│   │   └── extract/
│   └── ...
│
├── components/
│   ├── ...
│
├── context/
│   └── ...
│
├── data/
│   └── seeds/
│       ├── seed-script.js
│       └── seed-extended.js
│
├── lib/
│   └── ...
│
├── services/
│   ├── evermemos.js
│   └── openai.js
│
├── utils/
│   ├── prompts.js
│   └── ...
│
├── public/
│
├── ARIA-demo.mp4
├── package.json
└── README.md
```

---

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/SP1125/aria-evermind.git
cd aria-evermind
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env.local` in the project root:

```env
EVERMEMOS_API_KEY=your_key
EVERMEMOS_BASE_URL=https://api.evermind.ai
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Seed demo memory

```bash
node --env-file=.env.local data/seeds/seed-script.js --persona 1
node --env-file=.env.local data/seeds/seed-extended.js
```

### 5. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Demo

The deployed version can be accessed here:

**https://aria-evermind.vercel.app**

### Quick test

1. Select **Zara (4wk)**.

2. Enter:

   > "I don't feel like anything tonight, been alone all week"

3. Observe the **MEMORY SURFACED** indicator.

4. Switch to **No Memory**.

5. Submit the same message again.

6. Compare the responses.

---

## Design Decisions

### Why long-term memory?

[TODO: 2–4 sentences explaining why persistent memory was central to the project rather than simply using the current conversation/context window.]

### Why compare different memory depths?

[TODO: Explain why you chose No Memory vs 2-week vs 4-week Zara as the demonstration structure.]

### Why make memory visible to the user?

[TODO: Explain the reasoning behind the MEMORY SURFACED badge — e.g. transparency, user understanding, trust, debugging.]

---

## What I Learned

[TODO: 3–5 bullets about what you personally learned building ARIA.]

Possible areas:

* Working with an external long-term memory API
* Designing retrieval-augmented LLM interactions
* Building an end-to-end AI application
* Structuring API routes and frontend/backend interaction
* Designing experiments/demos to demonstrate the effect of memory

---

## Limitations & Future Work

Current limitations:

* [TODO]
* [TODO]
* [TODO]

Potential future directions:

* [TODO]
* [TODO]
* [TODO]

---

## Hackathon

Built for the **EverMind Memory Genesis Competition 2026**.

**Track:** Agent + Memory

The project explored how persistent memory could change the behaviour of an AI agent when solving problems that depend on understanding a user over time.

---

## Author

**Shivapriya Peram**

[LinkedIn](TODO) · [GitHub](https://github.com/SP1125)

---
