// src/app/api/extract/test-extract.js
// B-03 unit tests — run against the live endpoint once deployed.
// node --env-file=.env.local src/app/api/extract/test-extract.js [base-url]
//
// Default base URL: http://localhost:3000
// Override: node ... src/app/api/extract/test-extract.js https://your-app.vercel.app

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/extract`;

let passed = 0;
let failed = 0;

function pass(label) { console.log(`  ✓ ${label}`); passed++; }
function fail(label, detail = '') { console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); failed++; }

async function post(body) {
  const res = await fetch(ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// ── Test 1: Valid request returns a user_profile ──────────────────────────────
async function testValidExtraction() {
  console.log('\nTest 1 — Valid brain dump returns user_profile');
  const { status, body } = await post({
    userId:           'test-extract-001',
    personalityId:    'warm',
    onboardingAnswers: { q2: 'social', q3: 'I need variety', q4: 'evenings' },
    brainDump: `I'm a final year student trying to finish my dissertation. 
      I work best in the evenings and I completely fall apart when I haven't 
      spoken to friends in a few days. I keep avoiding my dissertation by doing 
      other tasks. My main goal is to graduate and get a job in marketing.`,
  });

  pass(`HTTP ${status}`);

  if (!body.success)            return fail('success: true', body.error);
  pass('success: true');

  const p = body.user_profile;
  if (!p)                       return fail('user_profile present');
  pass('user_profile present');

  const REQUIRED = ['personality_id','motivation_type','communication_register',
                    'anchor_goals','focus_window','disruption_vulnerability',
                    'task_resistance_pattern','emotional_state_map','current_tasks'];
  const missing = REQUIRED.filter(k => p[k] === undefined);
  missing.length === 0
    ? pass('all required fields present')
    : fail('missing fields', missing.join(', '));

  p.personality_id === 'warm'
    ? pass('personality_id matches onboarding selection')
    : fail('personality_id override', `expected warm, got ${p.personality_id}`);

  const EM_KEYS = ['depleted_anxious','depleted_flat','wired_frustrated','wired_restless','neutral_anxious','neutral_flat'];
  const missingEM = EM_KEYS.filter(k => !p.emotional_state_map?.[k]?.task_class);
  missingEM.length === 0
    ? pass('emotional_state_map has all 6 keys with task_class')
    : fail('emotional_state_map incomplete', missingEM.join(', '));

  Array.isArray(p.current_tasks) && p.current_tasks.length > 0
    ? pass(`current_tasks extracted (${p.current_tasks.length} tasks)`)
    : fail('current_tasks empty — Claude did not extract tasks from brain dump');

  const TASK_TYPES = ['ANCHOR', 'FLEXIBLE', 'BUFFER'];
  const badTypes = (p.current_tasks || []).filter(t => !TASK_TYPES.includes(t.type));
  badTypes.length === 0
    ? pass('all task types are valid enum values')
    : fail('invalid task types', badTypes.map(t => t.type).join(', '));

  console.log(`  fallback used: ${body.fallback}`);
  if (body.fallback) console.log('  NOTE: fallback was triggered — check Claude response logs');
}

// ── Test 2: Malformed body returns 400, not 500 ───────────────────────────────
async function testMissingUserId() {
  console.log('\nTest 2 — Missing userId returns 400');
  const { status, body } = await post({
    brainDump: 'I have lots of things to do.',
  });
  status === 400 ? pass('HTTP 400') : fail(`HTTP ${status}`, 'expected 400');
  body.success === false ? pass('success: false') : fail('success should be false');
  body.error ? pass(`error message: "${body.error}"`) : fail('error message missing');
}

// ── Test 3: Short brain dump returns 400 ─────────────────────────────────────
async function testBrainDumpTooShort() {
  console.log('\nTest 3 — Brain dump too short returns 400');
  const { status, body } = await post({
    userId:    'test-extract-003',
    brainDump: 'hi',
  });
  status === 400 ? pass('HTTP 400') : fail(`HTTP ${status}`, 'expected 400');
}

// ── Test 4: Invalid JSON body returns 400 ────────────────────────────────────
async function testInvalidJSON() {
  console.log('\nTest 4 — Invalid JSON body returns 400 (not 500)');
  const res = await fetch(ENDPOINT, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    'this is not json {{{',
  });
  const status = res.status;
  status === 400 ? pass('HTTP 400') : fail(`HTTP ${status}`, 'expected 400');
}

// ── Test 5: Missing brainDump returns 400, not a crash ───────────────────────
async function testMissingBrainDump() {
  console.log('\nTest 5 — Missing brainDump returns 400');
  const { status } = await post({ userId: 'test-extract-005' });
  status === 400 ? pass('HTTP 400') : fail(`HTTP ${status}`, 'expected 400');
}

// ── Test 6: Response always includes user_profile shape even on Claude failure ─
// This tests the fallback path — we can't force Claude to fail in prod,
// but the fallback profile shape can be validated if the flag appears.
async function testFallbackShape() {
  console.log('\nTest 6 — Fallback profile (if triggered) matches C-01 schema');
  const { body } = await post({
    userId:        'test-extract-006',
    personalityId: 'calm',
    brainDump:     'I am not sure what I want to do. Everything feels overwhelming and I need help organising my life.',
  });

  const p = body.user_profile;
  if (!p) return fail('user_profile missing even in fallback scenario');

  const REQUIRED = ['personality_id','motivation_type','communication_register',
                    'anchor_goals','focus_window','disruption_vulnerability',
                    'task_resistance_pattern','emotional_state_map','current_tasks'];
  const missing = REQUIRED.filter(k => p[k] === undefined);
  missing.length === 0
    ? pass('fallback/extracted profile has all required fields')
    : fail('fallback missing fields', missing.join(', '));

  console.log(`  fallback used: ${body.fallback}`);
}

// ── Run all tests ─────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  B-03 · POST /api/extract — Test Suite');
  console.log(`  Endpoint: ${ENDPOINT}`);
  console.log('══════════════════════════════════════════════');

  try {
    await testValidExtraction();
    await testMissingUserId();
    await testBrainDumpTooShort();
    await testInvalidJSON();
    await testMissingBrainDump();
    await testFallbackShape();
  } catch (err) {
    console.error('\n[FATAL] Test runner crashed:', err.message);
    console.error('Is the dev server running at', BASE_URL, '?');
    process.exit(1);
  }

  console.log('\n══════════════════════════════════════════════');
  console.log(`  ${passed} passed · ${failed} failed`);
  if (failed === 0) {
    console.log('  ✓ B-03 COMPLETE — /api/extract ready for B-04');
  } else {
    console.log('  ✗ Fix failures before proceeding to B-04');
  }
  console.log('══════════════════════════════════════════════\n');
}

main();