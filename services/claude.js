// services/claude.js
// Shared Claude API wrapper — used by all API routes.
// Every call is wrapped in try/catch. Returns null on failure.
// Callers must handle null and return a safe fallback — never let a null
// propagate to the front-end as a 500 with no body.

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const API_KEY        = process.env.CLAUDE_API_KEY;
const MODEL          = 'claude-sonnet-4-6';

// ─── Core call ───────────────────────────────────────────────────────────────
// prompt:     string — the full prompt (system instructions + user input combined)
// maxTokens:  number — default 1000, increase for schedule generation (2000)
// Returns the raw text response from Claude, or null on failure.

export async function callClaude(prompt, maxTokens = 1000) {
  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            API_KEY,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error(`[Claude] API error: ${res.status}`, await res.text());
      return null;
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? null;

  } catch (err) {
    console.error('[Claude] callClaude error:', err.message);
    return null;
  }
}

// ─── Parse JSON response safely ──────────────────────────────────────────────
// Use this whenever you expect Claude to return a JSON object.
// Strips accidental markdown fences before parsing.
// Returns parsed object, or null if parsing fails.

export function parseJSON(raw) {
  if (!raw) return null;
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[Claude] JSON parse failed:', err.message);
    console.error('[Claude] Raw output was:', raw?.slice(0, 300));
    return null;
  }
}

// ─── Convenience: call Claude and parse JSON in one step ────────────────────
// Returns parsed object or null.

export async function callClaudeJSON(prompt, maxTokens = 1000) {
  const raw = await callClaude(prompt, maxTokens);
  return parseJSON(raw);
}