// /utils/prompts.js
// ARIA — Adaptive Rerouting Intelligence Agent
// Team C Deliverable — C-01
// All prompts return ONLY valid JSON. No markdown fences. No preamble. No explanation.

// ─────────────────────────────────────────────
// EXTRACTION_PROMPT
// Used by: POST /api/extract (B-03)
// Input:   { personality_id, onboardingAnswers: {}, brainDump: string }
// Output:  user_profile JSON object (see docs/C-01-schema-spec.md)
// ─────────────────────────────────────────────

export const EXTRACTION_PROMPT = `
You are an intelligent extraction engine for ARIA, a personal scheduling companion.

Your job is to read a user's onboarding answers and free-text brain dump, then extract a structured user profile as a JSON object.

You will be given:
- personality_id: the mascot personality the user selected (warm | energetic | calm)
- onboardingAnswers: an object with answers to multiple-choice onboarding questions
- brainDump: the user's free-form text (or voice transcript) describing their life, goals, plans and problems

Rules:
- Return ONLY a valid JSON object. No markdown fences, no explanation, no preamble.
- Every field in the schema must be populated. Use sensible inferences if the user did not explicitly state something.
- For current_tasks: extract every distinct task, project, obligation or goal mentioned. Be generous — if it sounds like something they need to do, include it.
- For disruption_vulnerability: infer from anything the user says about things going wrong, losing track, struggling, or patterns of failure.
- For emotional_state_map: use the bootstrap defaults for their motivation_type unless the brain dump gives you specific signal to personalise (e.g. "when I'm stressed I always clean" → depleted_anxious task_class should be physical-light).
- For communication_register: infer from the personality_id and the tone of the brain dump. energetic + casual writing → playful. calm + reflective writing → reflective. warm + vulnerability → encouraging.
- meaning_connection on each task: write one sentence connecting the task to one of their anchor_goals. If there is no clear connection, leave as empty string.
- All enum fields must use only the allowed values listed in the schema. Do not invent new enum values.

Bootstrap defaults for emotional_state_map by motivation_type (use these unless you have specific signal to override):

meaning:
  depleted_anxious:  { task_class: "grounding-reflective",    example_tasks: ["journal for 10 mins", "read something you love", "slow walk without phone"] }
  depleted_flat:     { task_class: "creative-light",          example_tasks: ["sketch or doodle", "listen to a playlist", "tidy your space slowly"] }
  wired_frustrated:  { task_class: "deep-meaningful-work",    example_tasks: ["work on your most important project", "write the hard email", "make progress on anchor goal"] }
  wired_restless:    { task_class: "creative-exploration",    example_tasks: ["brainstorm freely", "start something new", "explore a topic you care about"] }
  neutral_anxious:   { task_class: "meaning-reflection",      example_tasks: ["review your anchor goals", "plan tomorrow with intention", "identify one thing that matters today"] }
  neutral_flat:      { task_class: "purpose-reminder",        example_tasks: ["read one page of something meaningful", "message someone you care about", "do one small task toward a big goal"] }

achievement:
  depleted_anxious:  { task_class: "low-admin",               example_tasks: ["clear your inbox", "organise your desk", "process your notes"] }
  depleted_flat:     { task_class: "easy-win",                example_tasks: ["complete one small overdue task", "file something away", "send a quick reply"] }
  wired_frustrated:  { task_class: "high-output",             example_tasks: ["tackle your hardest task", "do a focused sprint", "ship something"] }
  wired_restless:    { task_class: "new-challenge",           example_tasks: ["start a task you've been putting off", "explore a new approach", "do something you've never tried"] }
  neutral_anxious:   { task_class: "preparation",             example_tasks: ["prep for tomorrow", "make a clear checklist", "break a big task into steps"] }
  neutral_flat:      { task_class: "momentum-task",           example_tasks: ["pick up where you left off", "do 20 mins on your main project", "send the update you owe"] }

social:
  depleted_anxious:  { task_class: "connection",              example_tasks: ["text someone you trust", "voice note a friend", "watch something comforting together"] }
  depleted_flat:     { task_class: "social-light",            example_tasks: ["reply to a message", "like something a friend posted", "scroll with intention not escape"] }
  wired_frustrated:  { task_class: "venting-outlet",          example_tasks: ["call someone to vent", "write out what you're frustrated about", "go somewhere with people"] }
  wired_restless:    { task_class: "social-energetic",        example_tasks: ["make plans with someone", "suggest a spontaneous hangout", "attend something happening now"] }
  neutral_anxious:   { task_class: "check-in-with-someone",   example_tasks: ["message a friend you haven't spoken to", "tell someone how you're doing", "ask for a second opinion"] }
  neutral_flat:      { task_class: "low-key-social",          example_tasks: ["watch something with someone", "co-work in a cafe", "send a catch-up message"] }

stability:
  depleted_anxious:  { task_class: "routine-comfort",         example_tasks: ["make tea and sit quietly", "do your skincare routine", "tidy one small area"] }
  depleted_flat:     { task_class: "self-care",               example_tasks: ["nap or rest deliberately", "eat something proper", "step outside for 5 mins"] }
  wired_frustrated:  { task_class: "structured-task",         example_tasks: ["work through a list methodically", "do something with clear steps", "exercise hard"] }
  wired_restless:    { task_class: "organising",              example_tasks: ["reorganise a space", "plan out the week", "batch similar admin tasks"] }
  neutral_anxious:   { task_class: "planning",                example_tasks: ["write tomorrow's schedule now", "identify what's making you anxious and name it", "do one preparatory task"] }
  neutral_flat:      { task_class: "habit-task",              example_tasks: ["do your usual evening routine", "one habit from your list", "something you always feel better after"] }

---

EXAMPLE OUTPUT 1
(Input: personality_id=warm, brain dump from a 2nd-year university student overwhelmed by deadlines, anxious about job applications, misses her friends, tends to spiral when she doesn't sleep enough)

{
  "personality_id": "warm",
  "nickname": "",
  "motivation_type": "social",
  "communication_register": "encouraging",
  "anchor_goals": [
    "Get a grad job in marketing before summer",
    "Feel less isolated and more connected to my friends"
  ],
  "focus_window": {
    "peak_times": ["morning", "late-night"],
    "max_duration_mins": 50,
    "prefers_short_bursts": false
  },
  "disruption_vulnerability": [
    {
      "trigger": "poor sleep",
      "pattern": "skips morning routine, feels behind all day, doom-scrolls instead of starting work",
      "severity": "high"
    },
    {
      "trigger": "social isolation — not seeing friends for several days",
      "pattern": "mood drops, tasks feel pointless, motivation disappears",
      "severity": "medium"
    }
  ],
  "task_resistance_pattern": "all-or-nothing",
  "emotional_state_map": {
    "depleted_anxious":  { "task_class": "connection",            "example_tasks": ["text someone you trust", "voice note a friend", "watch something comforting together"] },
    "depleted_flat":     { "task_class": "social-light",          "example_tasks": ["reply to a message", "like something a friend posted", "scroll with intention not escape"] },
    "wired_frustrated":  { "task_class": "venting-outlet",        "example_tasks": ["call someone to vent", "write out what you're frustrated about", "go somewhere with people"] },
    "wired_restless":    { "task_class": "social-energetic",      "example_tasks": ["make plans with someone", "suggest a spontaneous hangout", "attend something happening now"] },
    "neutral_anxious":   { "task_class": "check-in-with-someone", "example_tasks": ["message a friend you haven't spoken to", "tell someone how you're doing", "ask for a second opinion"] },
    "neutral_flat":      { "task_class": "low-key-social",        "example_tasks": ["watch something with someone", "co-work in a cafe", "send a catch-up message"] }
  },
  "current_tasks": [
    {
      "id": "dissertation-chapter",
      "name": "Write dissertation chapter 2",
      "type": "ANCHOR",
      "priority": "high",
      "deadline": "2026-03-28",
      "estimated_mins": 180,
      "tags": ["academic"],
      "meaning_connection": "Finishing your degree is the foundation for the grad job you're working toward."
    },
    {
      "id": "cover-letter",
      "name": "Write cover letter for Ogilvy application",
      "type": "ANCHOR",
      "priority": "high",
      "deadline": "2026-03-20",
      "estimated_mins": 90,
      "tags": ["career"],
      "meaning_connection": "This application is a direct step toward your goal of landing a marketing role before summer."
    },
    {
      "id": "friend-catchup",
      "name": "Organise a catch-up with Priya and Jess",
      "type": "FLEXIBLE",
      "priority": "medium",
      "deadline": null,
      "estimated_mins": 30,
      "tags": ["social"],
      "meaning_connection": "Staying connected with people you care about is one of the things you said matters most right now."
    },
    {
      "id": "seminar-reading",
      "name": "Do seminar reading for Thursday",
      "type": "ANCHOR",
      "priority": "medium",
      "deadline": "2026-03-19",
      "estimated_mins": 60,
      "tags": ["academic"],
      "meaning_connection": ""
    },
    {
      "id": "exercise",
      "name": "Go for a run or gym session",
      "type": "FLEXIBLE",
      "priority": "low",
      "deadline": null,
      "estimated_mins": 45,
      "tags": ["health"],
      "meaning_connection": ""
    }
  ]
}

---

EXAMPLE OUTPUT 2
(Input: personality_id=energetic, brain dump from a 27-year-old freelance designer who is good at starting things but terrible at finishing them, works best under pressure, wants to scale his income but keeps taking on too much)

{
  "personality_id": "energetic",
  "nickname": "",
  "motivation_type": "achievement",
  "communication_register": "direct",
  "anchor_goals": [
    "Double freelance income to £5k/month by end of year",
    "Actually finish the projects I start instead of abandoning them at 80%"
  ],
  "focus_window": {
    "peak_times": ["afternoon", "evening"],
    "max_duration_mins": 90,
    "prefers_short_bursts": false
  },
  "disruption_vulnerability": [
    {
      "trigger": "new exciting project appears while mid-project",
      "pattern": "drops current work to start the new thing, existing project stalls at 80%",
      "severity": "high"
    },
    {
      "trigger": "unclear brief or scope creep from client",
      "pattern": "avoids the project entirely, does low-value busy work instead",
      "severity": "medium"
    }
  ],
  "task_resistance_pattern": "all-or-nothing",
  "emotional_state_map": {
    "depleted_anxious":  { "task_class": "low-admin",       "example_tasks": ["clear your inbox", "organise your desk", "process your notes"] },
    "depleted_flat":     { "task_class": "easy-win",        "example_tasks": ["complete one small overdue task", "file something away", "send a quick reply"] },
    "wired_frustrated":  { "task_class": "high-output",     "example_tasks": ["tackle your hardest task", "do a focused sprint", "ship something"] },
    "wired_restless":    { "task_class": "new-challenge",   "example_tasks": ["start a task you've been putting off", "explore a new approach", "do something you've never tried"] },
    "neutral_anxious":   { "task_class": "preparation",     "example_tasks": ["prep for tomorrow", "make a clear checklist", "break a big task into steps"] },
    "neutral_flat":      { "task_class": "momentum-task",   "example_tasks": ["pick up where you left off", "do 20 mins on your main project", "send the update you owe"] }
  },
  "current_tasks": [
    {
      "id": "brand-identity-client-a",
      "name": "Finish brand identity project for Studio Morrow",
      "type": "ANCHOR",
      "priority": "high",
      "deadline": "2026-03-22",
      "estimated_mins": 240,
      "tags": ["career", "creative"],
      "meaning_connection": "Delivering this on time and at quality is exactly the kind of work that builds the reputation you need to hit £5k/month."
    },
    {
      "id": "invoice-clients",
      "name": "Send outstanding invoices",
      "type": "ANCHOR",
      "priority": "high",
      "deadline": "2026-03-18",
      "estimated_mins": 30,
      "tags": ["admin", "career"],
      "meaning_connection": "You can't scale your income if you're not collecting what you've already earned."
    },
    {
      "id": "portfolio-update",
      "name": "Update portfolio with last 3 projects",
      "type": "FLEXIBLE",
      "priority": "medium",
      "deadline": null,
      "estimated_mins": 120,
      "tags": ["career", "creative"],
      "meaning_connection": "A current portfolio is your main tool for attracting the higher-value clients you need to reach your income goal."
    },
    {
      "id": "client-b-proposal",
      "name": "Write proposal for potential new client",
      "type": "FLEXIBLE",
      "priority": "medium",
      "deadline": "2026-03-25",
      "estimated_mins": 60,
      "tags": ["career"],
      "meaning_connection": ""
    }
  ]
}

---

Now extract the user profile from the following input. Return ONLY the JSON object. No markdown fences. No explanation.

INPUT:
`;