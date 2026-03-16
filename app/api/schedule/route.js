// src/app/api/schedule/route.js

import { callClaudeJSON } from '../../../services/openai.js';

const SCHEDULE_PROMPT = `You are a scheduling assistant. Generate a single-day schedule in Morning, Afternoon, Evening sections.

CRITICAL ID RULES:
- Every task MUST have a globally unique id: descriptive-slug-NNNN (e.g. "assignment-draft-7432")
- NEVER reuse the same id.

Placement rules:
- ANCHOR tasks first in their window
- Respect focus_window.peak_times for demanding work
- FLEXIBLE fills gaps; BUFFER dropped if no space
- If prefers_short_bursts: split tasks >45 mins into two blocks with different ids

Reasoning rules:
- has_memory true: add reasoning referencing something specific from the profile — especially for enabling tasks (gym, social) explain WHY they are kept ("you focus better after moving")
- has_memory false: ALL reasoning fields MUST be empty string ""

Return ONLY valid JSON, no markdown:
{
  "date": "Today",
  "sections": [
    { "label": "Morning",   "tasks": [{ "id": "slug-NNNN", "name": "string", "duration_mins": number, "type": "ANCHOR|FLEXIBLE|BUFFER", "reasoning": "" }] },
    { "label": "Afternoon", "tasks": [] },
    { "label": "Evening",   "tasks": [] }
  ]
}

`;

const EMPTY_NO_MEMORY_SCHEDULE = {
  date: 'Today',
  sections: [
    { label: 'Morning',   tasks: [
      { id: 'morning-priority-0001', name: 'Main priority task',    duration_mins: 60, type: 'ANCHOR',   reasoning: '' },
      { id: 'morning-admin-0002',    name: 'Emails and messages',    duration_mins: 25, type: 'FLEXIBLE', reasoning: '' },
    ]},
    { label: 'Afternoon', tasks: [
      { id: 'afternoon-work-0003',   name: 'Secondary task block',   duration_mins: 60, type: 'FLEXIBLE', reasoning: '' },
      { id: 'afternoon-admin-0004',  name: 'Admin and calls',        duration_mins: 30, type: 'BUFFER',   reasoning: '' },
    ]},
    { label: 'Evening',   tasks: [
      { id: 'evening-review-0005',   name: "Review tomorrow's plan", duration_mins: 15, type: 'BUFFER',   reasoning: '' },
      { id: 'evening-personal-0006', name: 'Personal time',          duration_mins: 60, type: 'FLEXIBLE', reasoning: '' },
    ]},
  ],
};

const ZARA_SCHEDULE = {
  date: 'Today',
  sections: [
    { label: 'Morning',   tasks: [
      { id: 'gym-zara-0001',     name: 'Gym or run',                           duration_mins: 50,  type: 'FLEXIBLE', reasoning: "You always write better on days you've moved — so this goes first." },
      { id: 'seminar-zara-0002', name: 'Seminar reading (Thursday prep)',       duration_mins: 60,  type: 'ANCHOR',   reasoning: '' },
    ]},
    { label: 'Afternoon', tasks: [
      { id: 'ch1-rev-zara-0003', name: 'Chapter 1 revisions (supervisor)',      duration_mins: 90,  type: 'ANCHOR',   reasoning: "Afternoons are your recovery window — good for revision, not blank-page writing." },
      { id: 'priya-zara-0004',   name: 'Text or call Priya',                    duration_mins: 30,  type: 'FLEXIBLE', reasoning: "Connection keeps your motivation alive. This belongs in the day, not as an afterthought." },
    ]},
    { label: 'Evening',   tasks: [
      { id: 'diss-zara-0005',    name: 'Dissertation chapter 2 — 2hr session',  duration_mins: 120, type: 'ANCHOR',   reasoning: "7–9pm is your peak. Chapter 2 lives here every evening this week." },
      { id: 'washing-zara-0006', name: 'Laundry',                               duration_mins: 20,  type: 'BUFFER',   reasoning: '' },
    ]},
  ],
};

function deduplicateIds(schedule) {
  if (!schedule?.sections) return schedule;
  const seen = new Set();
  schedule.sections.forEach(section => {
    section.tasks = (section.tasks||[]).map(task => {
      let id = task.id || `task-${Math.random().toString(36).slice(2,7)}`;
      while (seen.has(id)) id = `${id}-${Math.floor(Math.random()*9000)+1000}`;
      seen.add(id);
      return {...task, id};
    });
  });
  return schedule;
}

// Scrub all reasoning fields — applied to no-memory responses regardless of what GPT returns
function scrubReasoning(schedule) {
  if (!schedule?.sections) return schedule;
  schedule.sections.forEach(section => {
    (section.tasks||[]).forEach(task => { task.reasoning = ''; });
  });
  return schedule;
}

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({error:'Invalid JSON'},{status:400}); }

  const { userId, userProfile, tasks, useZaraSchedule = false, noMemoryMode = false } = body;

  if (useZaraSchedule || userId === 'aria-demo-persona1') {
    return Response.json({ schedule: ZARA_SCHEDULE });
  }

  const allTasks = tasks || userProfile?.current_tasks || [];

  if (!allTasks.length && noMemoryMode) {
    return Response.json({ schedule: EMPTY_NO_MEMORY_SCHEDULE });
  }

  const profileForPrompt = noMemoryMode
    ? { focus_window: { peak_times: ['morning'], prefers_short_bursts: false } }
    : (userProfile || {});

  const prompt = SCHEDULE_PROMPT +
    `has_memory: ${!noMemoryMode}\n\n` +
    `USER PROFILE:\n${JSON.stringify(profileForPrompt, null, 2)}\n\n` +
    `TASKS:\n${JSON.stringify(allTasks, null, 2)}`;

  let schedule = null;
  try {
    schedule = await callClaudeJSON(prompt, 1500);
    schedule = deduplicateIds(schedule);
    // Hard scrub for no-memory — GPT sometimes adds reasoning despite instructions
    if (noMemoryMode) schedule = scrubReasoning(schedule);
  } catch (err) {
    console.error('[schedule]', err.message);
  }

  if (!schedule?.sections?.length) {
    return Response.json({ schedule: noMemoryMode ? EMPTY_NO_MEMORY_SCHEDULE : ZARA_SCHEDULE });
  }

  return Response.json({ schedule });
}