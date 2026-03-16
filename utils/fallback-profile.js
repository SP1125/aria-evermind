// utils/fallback-profile.js
// Safe default user_profile returned when Claude extraction fails.
// Matches the C-01 schema exactly — every downstream consumer gets
// a valid shape even if parsing broke. Values are intentionally
// generic/balanced so the scheduler can still function on day one.
//
// The front-end should display a soft message: "I couldn't quite
// catch everything — you can tell me more as we go."

export function buildFallbackProfile(userId, personalityId = 'warm', brainDump = '') {
  // Try to extract at least a name hint from the brain dump
  const nicknameMatch = brainDump.match(/(?:i'?m|my name is|call me)\s+([A-Z][a-z]+)/i);
  const nickname = nicknameMatch ? nicknameMatch[1] : '';

  return {
    personality_id: personalityId,
    nickname,
    motivation_type: 'meaning',
    communication_register: 'encouraging',
    anchor_goals: [
      'Figure out what matters most to me right now',
    ],
    focus_window: {
      peak_times: ['morning'],
      max_duration_mins: 60,
      prefers_short_bursts: false,
    },
    disruption_vulnerability: [
      {
        trigger: 'unknown — not enough information yet',
        pattern: 'To be learned over the first few sessions',
        severity: 'medium',
      },
    ],
    task_resistance_pattern: 'overwhelm',
    emotional_state_map: {
      depleted_anxious:  { task_class: 'grounding-reflective', example_tasks: ['10 mins journalling', 'slow walk', 'read something you love'] },
      depleted_flat:     { task_class: 'creative-light',       example_tasks: ['sketch freely', 'listen to music', 'tidy your space'] },
      wired_frustrated:  { task_class: 'deep-meaningful-work', example_tasks: ['work on your main goal', 'write the hard thing', 'make one decision'] },
      wired_restless:    { task_class: 'creative-exploration', example_tasks: ['brainstorm freely', 'start something new', 'go somewhere different'] },
      neutral_anxious:   { task_class: 'meaning-reflection',   example_tasks: ['review your goals', 'plan tomorrow', 'name what matters today'] },
      neutral_flat:      { task_class: 'purpose-reminder',     example_tasks: ['read one meaningful page', 'do one small step', 'write one sentence'] },
    },
    current_tasks: [],
    _fallback: true, // internal flag — strip before sending to EverMemOS
  };
}