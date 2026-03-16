// src/lib/zara-profile.ts
// Zara's pre-built user profile — used for Mode 2 (As Zara demo)
// Derived from persona1.json (C-02 seed data)

export const ZARA_PROFILE = {
  personality_id: 'warm',
  nickname: 'Zara',
  motivation_type: 'social',
  communication_register: 'encouraging',
  anchor_goals: [
    'Submit dissertation (12,000 words) by April 18th',
    'Feel genuinely settled and less anxious — stop white-knuckling through every week',
  ],
  focus_window: {
    peak_times: ['evening', 'late-night'],
    max_duration_mins: 60,
    prefers_short_bursts: false,
  },
  disruption_vulnerability: [
    {
      trigger: 'poor sleep or staying up past 1am',
      pattern: 'Wakes up late, skips breakfast, feels behind, doom-scrolls, does not start work until afternoon',
      severity: 'high',
    },
    {
      trigger: 'social isolation — more than 2 days without meaningful contact',
      pattern: 'Mood flattens, everything feels pointless, sits at desk but cannot start anything',
      severity: 'high',
    },
    {
      trigger: 'opening a blank dissertation document',
      pattern: 'Immediate freeze response, opens other tabs, convinces herself she needs to do more reading first',
      severity: 'medium',
    },
  ],
  task_resistance_pattern: 'avoidance',
  emotional_state_map: {
    depleted_anxious:  { task_class: 'connection',            example_tasks: ['text someone you trust', 'voice note a friend'] },
    depleted_flat:     { task_class: 'social-light',          example_tasks: ['reply to a message', 'text Priya'] },
    wired_frustrated:  { task_class: 'venting-outlet',        example_tasks: ['call someone', 'write out what\'s frustrating you'] },
    wired_restless:    { task_class: 'social-energetic',      example_tasks: ['suggest a library session with a friend', 'go to a cafe'] },
    neutral_anxious:   { task_class: 'check-in-with-someone', example_tasks: ['message someone before you start working'] },
    neutral_flat:      { task_class: 'low-key-social',        example_tasks: ['co-work with someone on call', 'put on a familiar show'] },
  },
  current_tasks: [
    { id: 'dissertation-chapter2', name: 'Write dissertation chapter 2', type: 'ANCHOR', priority: 'high', deadline: '2026-03-28', estimated_mins: 240, tags: ['academic'], meaning_connection: 'Chapter 2 is the heart of your argument.' },
    { id: 'chapter1-revisions', name: 'Revise chapter 1 (supervisor feedback)', type: 'ANCHOR', priority: 'high', deadline: '2026-03-21', estimated_mins: 120, tags: ['academic'], meaning_connection: '' },
    { id: 'seminar-prep', name: 'Seminar reading for Thursday', type: 'ANCHOR', priority: 'medium', deadline: '2026-03-19', estimated_mins: 90, tags: ['academic'], meaning_connection: '' },
    { id: 'gym', name: 'Gym or run (3x this week)', type: 'FLEXIBLE', priority: 'medium', deadline: null, estimated_mins: 50, tags: ['health'], meaning_connection: 'You always say you feel less anxious the day after the gym.' },
    { id: 'catch-up-priya', name: 'Proper catch-up with Priya', type: 'FLEXIBLE', priority: 'medium', deadline: null, estimated_mins: 90, tags: ['social'], meaning_connection: 'Feeling connected is one of the two things that matters most to you right now.' },
    { id: 'washing', name: 'Do laundry', type: 'BUFFER', priority: 'low', deadline: null, estimated_mins: 20, tags: ['admin'], meaning_connection: '' },
  ],
};

export const ZARA_USER_ID    = 'aria-demo-persona1';
export const ZARA_V2_USER_ID = 'aria-demo-persona1-v2';