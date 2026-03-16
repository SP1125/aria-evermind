// data/seeds/seed-extended.js
// Seeds persona1-extended.json (Zara weeks 3-4) as a SEPARATE user profile
// userId: aria-demo-persona1-v2  (different from persona1 so judges see the contrast)
//
// Run: node --env-file=.env.local data/seeds/seed-extended.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join }  from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.EVERMEMOS_BASE_URL || 'https://api.evermind.ai';
const API_KEY  = process.env.EVERMEMOS_API_KEY;

if (!API_KEY) {
  console.error('\n[ERROR] EVERMEMOS_API_KEY not set. Run with --env-file=.env.local\n');
  process.exit(1);
}

// Unique suffix so re-runs don't collide
const RUN_ID   = Date.now().toString().slice(-6);
const DELAY_MS = 400;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// EXACT same logic as seed-script.js postTurn — confirmed working
async function postTurn(turn, overrideUserId) {
  // seed-script converts Z → +00:00, which is what the API accepts
  const createTime = turn.create_time.endsWith('Z')
    ? turn.create_time.replace('Z', '+00:00')
    : turn.create_time;

  const res = await fetch(`${BASE_URL}/api/v0/memories`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      message_id:  `${turn.message_id}-${RUN_ID}`,
      create_time: createTime,
      sender:      overrideUserId || turn.sender,
      content:     turn.content,
      role:        turn.role,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`\n   ✗ ${turn.message_id} HTTP ${res.status}: ${text}`);
    return false;
  }
  return true;
}

async function main() {
  const filepath = join(__dirname, 'persona1-extended.json');
  const data     = JSON.parse(readFileSync(filepath, 'utf-8'));
  const turns    = data.conversation_history;

  // Use a distinct userId so this is a separate profile in EverMemOS
  // Judges can switch between aria-demo-persona1 (2 weeks) and aria-demo-persona1-v2 (4 weeks)
  const userId = 'aria-demo-persona1-v2';

  console.log('\n══════════════════════════════════════════════');
  console.log('  ARIA · Extended Seed (Zara — weeks 3 & 4)');
  console.log(`  userId:  ${userId}  (separate from persona1)`);
  console.log(`  turns:   ${turns.length}`);
  console.log(`  run_id:  ${RUN_ID}`);
  console.log('══════════════════════════════════════════════\n');

  let posted = 0;
  let errors = 0;

  for (const turn of turns) {
    const ok = await postTurn(turn, userId);
    process.stdout.write(ok ? '·' : '✗');
    ok ? posted++ : errors++;
    await delay(DELAY_MS);
  }

  console.log(`\n\n  ${posted} posted · ${errors} errors`);
  console.log('\n══════════════════════════════════════════════');

  if (errors === 0) {
    console.log('  ✓ Extended seed complete');
    console.log(`\n  To use in demo: change ZARA_USER_ID in zara-profile.ts`);
    console.log(`  from: 'aria-demo-persona1'`);
    console.log(`  to:   '${userId}'`);
    console.log('\n  Key patterns seeded:');
    console.log('    • Gym → writing (5+ instances)');
    console.log('    • Social isolation → motivation collapse (4 instances)');
    console.log('    • Priya → recovery');
    console.log('    • Chapter 2 deadline arc → submission');
    console.log('\n  Best demo prompt:');
    console.log('    "I don\'t feel like anything tonight, been alone all week"');
    console.log('    Expected: agent surfaces Priya without being told');
  }

  console.log('══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});