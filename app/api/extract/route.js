// src/app/api/extract/route.js
// B-03 — Extraction pass endpoint
// POST /api/extract
//
// Receives raw onboarding data, runs the C-01 extraction prompt through Claude,
// seeds the first EverMemOS MemCell with the brain dump, and returns
// a structured user_profile JSON.
//
// Request body:
//   { userId: string, personalityId: string, onboardingAnswers: {}, brainDump: string }
//
// Response (always 200 — never a 500 reaching the front-end):
//   { success: true,  user_profile: {...}, fallback: false }   — extraction succeeded
//   { success: true,  user_profile: {...}, fallback: true  }   — extraction failed, safe defaults returned
//   { success: false, error: string }                          — body validation failed only

import { EXTRACTION_PROMPT } from '../../../utils/prompt.js';
import { callClaudeJSON }    from '../../../services/openai.js';
import { postMemory }        from '../../../services/evermemos.js';
import { buildFallbackProfile } from '../../../utils/fallback-profile.js';

// ── Validate incoming request body ────────────────────────────────────────────
function validateBody(body) {
  const errors = [];

  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }
  if (!body.brainDump || typeof body.brainDump !== 'string' || body.brainDump.trim().length < 10) {
    errors.push('brainDump is required and must be at least 10 characters');
  }
  if (body.onboardingAnswers && typeof body.onboardingAnswers !== 'object') {
    errors.push('onboardingAnswers must be an object if provided');
  }

  return errors;
}

// ── Validate that extracted profile matches the C-01 schema ──────────────────
// Returns true if the shape is usable, false if we should fall back.
function isValidProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;

  const REQUIRED = [
    'personality_id', 'motivation_type', 'communication_register',
    'anchor_goals', 'focus_window', 'disruption_vulnerability',
    'task_resistance_pattern', 'emotional_state_map', 'current_tasks',
  ];

  for (const field of REQUIRED) {
    if (profile[field] === undefined || profile[field] === null) return false;
  }

  const MOTIVATION_TYPES  = ['meaning', 'achievement', 'social', 'stability'];
  const REGISTERS         = ['encouraging', 'direct', 'playful', 'reflective'];
  const RESISTANCE_TYPES  = ['all-or-nothing', 'perfectionism', 'overwhelm', 'boredom', 'avoidance', 'low-energy'];
  const EM_KEYS           = ['depleted_anxious', 'depleted_flat', 'wired_frustrated', 'wired_restless', 'neutral_anxious', 'neutral_flat'];

  if (!MOTIVATION_TYPES.includes(profile.motivation_type))   return false;
  if (!REGISTERS.includes(profile.communication_register))   return false;
  if (!RESISTANCE_TYPES.includes(profile.task_resistance_pattern)) return false;
  if (!Array.isArray(profile.anchor_goals))                  return false;
  if (!Array.isArray(profile.current_tasks))                 return false;
  if (!profile.focus_window?.peak_times)                     return false;

  for (const key of EM_KEYS) {
    if (!profile.emotional_state_map[key]?.task_class) return false;
  }

  return true;
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(request) {
  let body;

  // Parse request body
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'Invalid JSON in request body' },
      { status: 400 }
    );
  }

  // Validate required fields
  const validationErrors = validateBody(body);
  if (validationErrors.length > 0) {
    return Response.json(
      { success: false, error: validationErrors.join('. ') },
      { status: 400 }
    );
  }

  const {
    userId,
    personalityId   = 'warm',
    onboardingAnswers = {},
    brainDump,
  } = body;

  const trimmedDump = brainDump.trim();

  // ── Step 1: Run Claude extraction pass ───────────────────────────────────
  let user_profile = null;
  let usedFallback = false;

  try {
    const extractionInput = {
      personality_id:    personalityId,
      onboardingAnswers,
      brainDump:         trimmedDump,
    };

    // EXTRACTION_PROMPT ends with "INPUT:\n" — we append the JSON directly
    const fullPrompt = EXTRACTION_PROMPT + JSON.stringify(extractionInput, null, 2);

    user_profile = await callClaudeJSON(fullPrompt, 1500);

    if (!isValidProfile(user_profile)) {
      console.warn(`[B-03] Extraction produced invalid profile for ${userId} — using fallback`);
      console.warn('[B-03] Invalid profile was:', JSON.stringify(user_profile)?.slice(0, 200));
      user_profile = buildFallbackProfile(userId, personalityId, trimmedDump);
      usedFallback = true;
    } else {
      // Ensure personality_id matches what user selected at onboarding
      // Claude may infer differently — the onboarding choice takes precedence
      user_profile.personality_id = personalityId;
    }

  } catch (err) {
    console.error(`[B-03] Claude extraction threw for ${userId}:`, err.message);
    user_profile = buildFallbackProfile(userId, personalityId, trimmedDump);
    usedFallback = true;
  }

  // Strip internal flag before storing or returning
  const { _fallback, ...cleanProfile } = user_profile;

  // ── Step 2: Seed first EverMemOS MemCell with the brain dump ─────────────
  // Fire-and-forget — don't block the response on this.
  // If it fails, the user still gets their profile. The memory will be
  // retried or re-seeded when the onboarding pipeline (B-04) runs.
  postMemory(userId, trimmedDump, 'user').then(result => {
    if (!result) {
      console.warn(`[B-03] EverMemOS brain dump seed failed for ${userId} — will retry in B-04`);
    }
  }).catch(err => {
    console.error(`[B-03] EverMemOS postMemory threw for ${userId}:`, err.message);
  });

  // ── Step 3: Return ────────────────────────────────────────────────────────
  return Response.json({
    success:      true,
    user_profile: cleanProfile,
    fallback:     usedFallback,
    // If fallback was used, the front-end should show a soft message:
    // "I couldn't catch everything — you can tell me more as we go."
  });
}