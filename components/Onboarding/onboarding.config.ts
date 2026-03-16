// src/components/Onboarding/onboarding.config.ts

export interface OnboardingOption {
  label: string;
  value: string;
  emoji: string;
}

export interface OnboardingQuestion {
  id:             string;
  question:       string;
  options:        OnboardingOption[];  // empty = free text
  profileKey:     string;
  mascotReaction: string;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id:         'q1_personality',
    question:   "First things first — who do you want me to be for you?",
    profileKey: 'personality_id',
    mascotReaction: "Love it. I'll be exactly that for you.",
    options: [
      { label: 'Warm & encouraging',   value: 'warm',      emoji: '🫂' },
      { label: 'Direct & no-nonsense', value: 'energetic', emoji: '⚡' },
      { label: 'Calm & reflective',    value: 'calm',      emoji: '🌿' },
    ],
  },
  {
    id:         'q2_motivation',
    question:   "What actually gets you moving when things get hard?",
    profileKey: 'motivation_type',
    mascotReaction: "That tells me a lot. I'll keep that close.",
    options: [
      { label: 'Knowing it matters',      value: 'meaning',     emoji: '💡' },
      { label: 'Hitting the goal',         value: 'achievement', emoji: '🎯' },
      { label: 'People around me',         value: 'social',      emoji: '👥' },
      { label: 'Having a clear routine',   value: 'stability',   emoji: '🔄' },
    ],
  },
  {
    id:         'q3_focus',
    question:   "When do you actually do your best thinking?",
    profileKey: 'peak_times',
    mascotReaction: "Got it. I'll protect that time for the hard stuff.",
    options: [
      { label: 'Morning person',  value: 'morning',    emoji: '🌅' },
      { label: 'Afternoon flow',  value: 'afternoon',  emoji: '☀️' },
      { label: 'Evening energy',  value: 'evening',    emoji: '🌆' },
      { label: 'Night owl',       value: 'late-night', emoji: '🌙' },
    ],
  },
  {
    id:         'q4_resistance',
    question:   "Be honest — how do you usually go off track?",
    profileKey: 'task_resistance_pattern',
    mascotReaction: "Noted. I'll watch for that and catch you before it spirals.",
    options: [
      { label: 'All or nothing',           value: 'all-or-nothing', emoji: '🎲' },
      { label: 'Perfectionism',            value: 'perfectionism',  emoji: '🔍' },
      { label: 'Overwhelm — too much',     value: 'overwhelm',      emoji: '🌊' },
      { label: 'Boredom — need novelty',   value: 'boredom',        emoji: '😴' },
    ],
  },
  {
    id:         'q5_nickname',
    question:   "Last one — what should I call you?",
    profileKey: 'nickname',
    mascotReaction: "Perfect. Now tell me what's going on this week.",
    options: [],  // free text
  },
];