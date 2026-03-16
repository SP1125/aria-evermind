// data/seeds/verify-seed.js
// node --env-file=.env.local data/seeds/verify-seed.js

const BASE_URL = process.env.EVERMEMOS_BASE_URL || 'https://api.evermind.ai';
const API_KEY  = process.env.EVERMEMOS_API_KEY;

const PERSONAS = [
  { id: 'aria-demo-persona1', name: 'Zara',   query: 'dissertation procrastination evening focus' },
  { id: 'aria-demo-persona2', name: 'Marcus', query: 'overcommitment sprint work promotion' },
  { id: 'aria-demo-persona3', name: 'Ines',   query: 'essay freelance meaning emotional disruption' },
];

async function verifyPersona({ id, name, query }) {
  const params = new URLSearchParams({ user_id: id, query });

  const res = await fetch(
    `${BASE_URL}/api/v0/memories/search?${params.toString()}`,
    { method: 'GET', headers: { 'Authorization': `Bearer ${API_KEY}` } }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.log(`  ✗ ${name} — HTTP ${res.status} ${text.slice(0, 100)}`);
    return false;
  }

  const data     = await res.json();
  const memories = data?.result?.memories ?? [];
  const profiles = data?.result?.profiles  ?? [];
  const total    = memories.length + profiles.length;
  const found    = total > 0;

  console.log(`  ${found ? '✓' : '✗'} ${name} — ${memories.length} memories, ${profiles.length} profiles`);
  if (memories[0]?.summary) {
    console.log(`    sample: "${memories[0].summary.slice(0, 80)}"`);
  }
  return found;
}

async function main() {
  console.log('\n── Verify Seed Results ──');
  let allOk = true;
  for (const p of PERSONAS) {
    const ok = await verifyPersona(p);
    if (!ok) allOk = false;
  }
  console.log(allOk
    ? '\n  ✓ All personas verified — demo ready\n'
    : '\n  ✗ Some personas empty — EverMemOS may still be processing. Wait 15s and re-run.\n'
  );
}

main().catch(console.error);