// data/seeds/seed-script.js
// C-02 — EverMemOS seed script
// Posts all 3 persona conversation histories to EverMemOS.
// Run once before the demo to give the agent mature memory depth.
//
// Usage:
//   node --env-file=.env.local data/seeds/seed-script.js
//   node --env-file=.env.local data/seeds/seed-script.js --persona 1   (seed one persona only)
//   node --env-file=.env.local data/seeds/seed-script.js --dry-run     (validate without posting)
//
// What this does:
//   Reads persona1.json, persona2.json, persona3.json
//   POSTs each conversation turn to POST /api/v1/memories
//   Adds a 300ms delay between posts to avoid rate limiting
//   Logs progress and a final summary
//
// After running, verify with:
//   node --env-file=.env.local data/seeds/verify-seed.js

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.EVERMEMOS_BASE_URL || 'https://api.evermind.ai';
const API_KEY  = process.env.EVERMEMOS_API_KEY;

if (!API_KEY) {
  console.error('\n[ERROR] EVERMEMOS_API_KEY not set. Run with --env-file=.env.local\n');
  process.exit(1);
}

// ── CLI args ──────────────────────────────────────────────────────────────────
const args         = process.argv.slice(2);
const isDryRun     = args.includes('--dry-run');
const personaFlag  = args.indexOf('--persona');
const singlePersona = personaFlag !== -1 ? parseInt(args[personaFlag + 1]) : null;

const PERSONA_FILES = [
  { file: 'persona1.json', label: 'Persona 1 — Zara (student)' },
  { file: 'persona2.json', label: 'Persona 2 — Marcus (professional)' },
  { file: 'persona3.json', label: 'Persona 3 — Ines (freelancer)' },
];

const DELAY_MS = 300;

// ── Post a single memory turn ─────────────────────────────────────────────────
async function postTurn(turn) {
  if (isDryRun) return { ok: true, dry: true };

  // API requires ISO 8601 WITH timezone offset — convert trailing Z to +00:00
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
      message_id:  turn.message_id,
      create_time: createTime,
      sender:      turn.sender,
      content:     turn.content,
      role:        turn.role,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`\n   [HTTP ${res.status}] ${text.slice(0, 120)}`);
  }

  return { ok: res.ok, status: res.status };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Seed one persona ──────────────────────────────────────────────────────────
async function seedPersona(filename, label) {
  const filepath = join(__dirname, filename);
  const data     = JSON.parse(readFileSync(filepath, 'utf-8'));
  const turns    = data.conversation_history;
  const userId   = data.meta.user_id;

  console.log(`\n── ${label}`);
  console.log(`   user_id: ${userId}`);
  console.log(`   turns:   ${turns.length}`);

  if (isDryRun) {
    console.log('   [DRY RUN] Validating turns...');
  }

  let posted  = 0;
  let errors  = 0;

  for (const turn of turns) {
    // Validate required fields before posting
    const missing = ['message_id','create_time','sender','content','role']
      .filter(f => !turn[f]);

    if (missing.length > 0) {
      console.log(`   ✗ Turn ${turn.message_id} missing: ${missing.join(', ')}`);
      errors++;
      continue;
    }

    try {
      const result = await postTurn(turn);

      if (result.dry) {
        process.stdout.write('·');
        posted++;
      } else if (result.ok) {
        process.stdout.write('·');
        posted++;
        await delay(DELAY_MS);
      } else {
        process.stdout.write('✗');
        console.log(`\n   [ERROR] Turn ${turn.message_id} → HTTP ${result.status}`);
        errors++;
      }
    } catch (err) {
      process.stdout.write('✗');
      console.log(`\n   [ERROR] Turn ${turn.message_id} → ${err.message}`);
      errors++;
    }
  }

  console.log();
  console.log(`   ${posted} posted · ${errors} errors`);

  // Also post the user_profile as a dedicated MemCell so it can be retrieved
  // by the rearranging engine using profile_memory type filter
  const profileContent = `[PROFILE] ${JSON.stringify(data.user_profile)}`;

  try {
    const profileResult = await postTurn({
      message_id:  `${userId}-profile-seed`,
      create_time: turns[0]?.create_time || new Date().toISOString(),
      sender:      userId,
      content:     profileContent,
      role:        'user',
    });

    if (isDryRun || profileResult.ok) {
      console.log(`   ✓ user_profile MemCell posted`);
    } else {
      console.log(`   ✗ user_profile MemCell failed: HTTP ${profileResult.status}`);
    }
  } catch (err) {
    console.log(`   ✗ user_profile MemCell error: ${err.message}`);
  }

  return { posted, errors };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  ARIA · EverMemOS Seed Script (C-02)');
  if (isDryRun)      console.log('  MODE: DRY RUN — no data will be posted');
  if (singlePersona) console.log(`  MODE: Single persona ${singlePersona} only`);
  console.log('══════════════════════════════════════════════');

  const personasToSeed = singlePersona
    ? PERSONA_FILES.filter((_, i) => i + 1 === singlePersona)
    : PERSONA_FILES;

  if (personasToSeed.length === 0) {
    console.error(`\n[ERROR] No persona found for --persona ${singlePersona}. Use 1, 2, or 3.\n`);
    process.exit(1);
  }

  let totalPosted = 0;
  let totalErrors = 0;

  for (const { file, label } of personasToSeed) {
    const { posted, errors } = await seedPersona(file, label);
    totalPosted += posted;
    totalErrors += errors;
  }

  console.log('\n══════════════════════════════════════════════');
  console.log(`  Total: ${totalPosted} turns posted · ${totalErrors} errors`);

  if (totalErrors === 0) {
    console.log('  ✓ Seed complete — personas have memory depth');
    console.log('  Run verify-seed.js to confirm retrieval is working');
  } else {
    console.log('  ✗ Some turns failed — check errors above');
    console.log('  Safe to re-run: EverMemOS deduplicates by message_id');
  }

  console.log('══════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});