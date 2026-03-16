// services/openai.js
// OpenAI GPT wrapper — same interface as claude.js so routes need no changes.
// Uses gpt-4o-mini by default (fast + cheap). Change MODEL to gpt-4o for better quality.

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const API_KEY        = process.env.OPENAI_API_KEY;
const MODEL          = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// ── Core call ──────────────────────────────────────────────────────────────────
// prompt:    string — the full prompt (system + user content combined)
// maxTokens: number — max response tokens
// Returns raw text string or null on failure.
export async function callClaude(prompt, maxTokens = 1000) {
  try {
    if (!API_KEY) {
      console.error('[OpenAI] OPENAI_API_KEY not set in .env.local');
      return null;
    }

    const res = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[OpenAI] API error ${res.status}:`, text.slice(0, 200));
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? null;

  } catch (err) {
    console.error('[OpenAI] callClaude error:', err.message);
    return null;
  }
}

// ── Parse JSON response safely ─────────────────────────────────────────────────
export function parseJSON(raw) {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[OpenAI] JSON parse failed:', err.message);
    console.error('[OpenAI] Raw was:', raw?.slice(0, 300));
    return null;
  }
}

// ── Call + parse JSON in one step ──────────────────────────────────────────────
export async function callClaudeJSON(prompt, maxTokens = 1000) {
  const raw = await callClaude(prompt, maxTokens);
  return parseJSON(raw);
}