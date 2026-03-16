// src/app/api/chat/route.js

import { callClaude }               from '../../../services/openai.js';
import { searchMemory, postMemory } from '../../../services/evermemos.js';

// ── Compute hard scheduling rules from the user profile ───────────────────────
// These become explicit IF/THEN rules in the prompt — not suggestions, not context.
// GPT cannot ignore a rule written as a rule.
function computeSchedulingRules(userProfile) {
  const rules = [];
  const peak        = userProfile?.focus_window?.peak_times || [];
  const resistance  = userProfile?.task_resistance_pattern || '';
  const vulns       = userProfile?.disruption_vulnerability || [];
  const motivation  = userProfile?.motivation_type || '';
  const tasks       = userProfile?.current_tasks || [];
  const emotMap     = userProfile?.emotional_state_map || {};

  // ── Time-of-day rules from focus_window ────────────────────────────────────
  const allPeriods  = ['morning', 'afternoon', 'evening', 'late-night'];
  const offPeak     = allPeriods.filter(p => !peak.includes(p));

  if (peak.length) {
    rules.push(`RULE [Peak focus]: Schedule all cognitively demanding work (writing, deep analysis, complex tasks) ONLY in: ${peak.join(', ')}. These are this person's actual productive hours.`);
  }
  if (offPeak.length) {
    rules.push(`RULE [Off-peak]: During ${offPeak.join(', ')} — NO deep cognitive work. Use these periods for: admin, calls, gentle tasks, recovery, social connection, physical activity.`);
  }

  // ── Current time rules ─────────────────────────────────────────────────────
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) {
    rules.push(`RULE [Late night]: It is currently ${hour}:${String(new Date().getMinutes()).padStart(2,'0')}am. If there is a deadline today, the correct sequence is: (1) sleep first — minimum 5-6 hours, (2) any enabling physical task if time allows, (3) work session. Do NOT schedule work starting now if there is time to sleep first.`);
  }

  // ── Disruption pattern rules ───────────────────────────────────────────────
  vulns.forEach(v => {
    const t = v.trigger.toLowerCase();
    const p = v.pattern.toLowerCase();

    // Gym/exercise → writing productivity
    if (t.includes('gym') || t.includes('exercise') || t.includes('sport') ||
        p.includes('gym') || p.includes('exercise') || p.includes('wrote') || p.includes('writing')) {
      rules.push(`RULE [Enabling task — gym/exercise]: This person's output quality is directly linked to physical activity. ALWAYS schedule gym/run/walk BEFORE any writing or deep work session. If time is short, shorten gym to 20-30 min rather than removing it. Never place gym after deep work.`);
    }

    // Social isolation → motivation collapse
    if (t.includes('social') || t.includes('isolation') || t.includes('alone') || t.includes('nobody') ||
        p.includes('pointless') || p.includes('motivation') || p.includes('flat')) {
      rules.push(`RULE [Enabling task — social connection]: When this person mentions feeling lonely, disconnected, flat, or unmotivated — the first intervention is social connection (call a friend, text someone, meet up), NOT more work. Schedule a connection task before any work task in that emotional state.`);
    }

    // Afternoon depletion
    if (t.includes('afternoon') || t.includes('2pm') || t.includes('fumes') || t.includes('tired') ||
        p.includes('afternoon') || p.includes('tired') || p.includes('crash')) {
      rules.push(`RULE [Afternoon recovery]: This person is depleted in the afternoon. Do NOT schedule demanding work then. Afternoon slot = intentional recovery: break, walk, coffee, social lunch, gentle admin. This IS productive — it enables the evening session.`);
    }

    // Perfectionism
    if (t.includes('perfect') || p.includes('perfect') || resistance === 'perfectionism') {
      rules.push(`RULE [Perfectionism]: This person spends too long on single tasks. Cap any single work block at 45-60 minutes max. Build in a hard stop. "Good enough to move forward" is the goal, not perfect.`);
    }

    // All-or-nothing
    if (resistance === 'all-or-nothing' || t.includes('all or nothing') || p.includes('all or nothing')) {
      rules.push(`RULE [All-or-nothing]: When this person says they can't do the full task, suggest a shortened version (20-min version, one paragraph, one email) rather than removing it entirely. Partial progress counts.`);
    }

    // Overwhelm / freeze
    if (resistance === 'overwhelm' || t.includes('overwhelm') || t.includes('blank document') ||
        p.includes('freeze') || p.includes('overwhelm') || p.includes('too much')) {
      rules.push(`RULE [Overwhelm/freeze]: When this person is overwhelmed, do NOT list everything that needs doing. Give them ONE next action only. Make it small and specific. e.g. "Open the document and write the date" not "work on chapter 2".`);
    }
  });

  // ── Motivation type rules ──────────────────────────────────────────────────
  if (motivation === 'social') {
    rules.push(`RULE [Social motivation]: This person is motivated by connection, not isolation. Include at least one social or connection task in any rerouted schedule. If cutting tasks, cut solo admin before social tasks.`);
  }
  if (motivation === 'meaning') {
    rules.push(`RULE [Meaning motivation]: When suggesting tasks, always connect them to the person's anchor goals. Remind them WHY a task matters, not just that it needs doing.`);
  }

  // ── Microwin rules from meaningful FLEXIBLE tasks ──────────────────────────
  const meaningful = tasks.filter(t => t.meaning_connection && t.type === 'FLEXIBLE');
  if (meaningful.length) {
    const names = meaningful.map(t => t.name).join(', ');
    rules.push(`RULE [Microwins — never cancel]: These tasks directly connect to this person's anchor goals: ${names}. When rerouting, shorten them (20-30 min) rather than removing them. 20 minutes of progress is better than zero. Always include a reasoning note explaining the goal connection.`);
  }

  return rules.length
    ? `\n\nHARD SCHEDULING RULES (derived from this person's profile — these override your defaults):\n${rules.map((r,i) => `${i+1}. ${r}`).join('\n\n')}`
    : '';
}

function urgencyLabel(deadline) {
  if (!deadline) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(deadline); due.setHours(0,0,0,0);
  const days  = Math.round((due - today) / 86400000);
  if (days < 0)   return ' [OVERDUE]';
  if (days === 0) return ' [DUE TODAY]';
  if (days === 1) return ' [due tomorrow]';
  if (days <= 3)  return ` [due in ${days} days]`;
  return ` [due ${deadline}]`;
}

function languageTier(depth) {
  if (depth <= 3) return 'tentative';
  if (depth <= 8) return 'observing';
  return 'confident';
}

function languageGuide(tier) {
  if (tier === 'tentative') return `LANGUAGE: Still getting to know this person. Say "I'm getting a sense that...", "it seems like...", "would you say...?". Ask one question per response. Do NOT say "I've noticed" yet.`;
  if (tier === 'observing')  return `LANGUAGE: Starting to see patterns. Say "I'm noticing...", "you seem to work better when...", "would you agree that...?". Frame as questions.`;
  return `LANGUAGE: Know this person well. Say "I've noticed you tend to...", "every time X, Y happens for you". Reference patterns directly and naturally.`;
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function scheduleForPrompt(schedule, currentSection) {
  if (!schedule?.length) return '';
  const ORDER = ['Morning','Afternoon','Evening'];
  return `\nToday's schedule (currently ${currentSection}):\n${schedule.map(s => {
    const si = ORDER.indexOf(s.label);
    const ci = ORDER.indexOf(currentSection);
    const st = si < ci ? '(done)' : si === ci ? '← NOW' : '(ahead)';
    return `  ${s.label} ${st}: ${(s.tasks||[]).map(t=>`${t.name}${t.duration_mins?` (${t.duration_mins}m)`:''}`).join(', ')||'(empty)'}`;
  }).join('\n')}\nOnly ${currentSection} onwards can be changed.`;
}

function buildSystemPrompt(userProfile, retrievedMemories, memoryEnabled, currentSchedule, currentSection, sessionDepth) {
  const schedCtx = scheduleForPrompt(currentSchedule, currentSection);
  const today    = todayLabel();

  // ── NO MEMORY MODE ─────────────────────────────────────────────────────────
  if (!memoryEnabled) {
    const nmName     = userProfile?.nickname || '';
    const nmTasks    = (userProfile?.current_tasks || [])
      .map(t => `  - ${t.name} [${t.type}]${urgencyLabel(t.deadline)}`)
      .join('\n');
    const nmPeak     = userProfile?.focus_window?.peak_times?.join(', ') || '';
    const nmBursts   = userProfile?.focus_window?.prefers_short_bursts;
    const nmResist   = userProfile?.task_resistance_pattern || '';

    return `You are a helpful scheduling assistant. Today is ${today}.
${nmName ? `The user's name is ${nmName}.` : ''}
${nmTasks ? `Their tasks:\n${nmTasks}` : ''}
${nmPeak ? `They mentioned they work best in: ${nmPeak}.` : ''}
${nmBursts ? 'They prefer short focused sprints — keep work blocks under 45 mins.' : ''}
${nmResist === 'perfectionism' ? 'They tend toward perfectionism — suggest time-boxing tasks.' : ''}
${schedCtx}

You have no memory of this person beyond what they told you in the brain dump above and this conversation.
Make intelligent scheduling decisions based on what they've shared.
Do NOT reference any patterns or observations — you don't know them well enough yet.
Keep responses 2-3 sentences. Be practical and direct.

If schedule changes needed:
<schedule_update>
{"reasoning":"one sentence why","new_sections":[{"label":"Morning","tasks":[]},{"label":"Afternoon","tasks":[]},{"label":"Evening","tasks":[{"id":"task-NNNN","name":"specific task name","duration_mins":60,"type":"ANCHOR","reasoning":""}]}]}
</schedule_update>
Include ALL remaining tasks rearranged. Only ${currentSection} onwards. All reasoning fields = "".`;
  }

  // ── MEMORY MODE ────────────────────────────────────────────────────────────
  const name       = userProfile?.nickname || 'you';
  const register   = userProfile?.communication_register || 'encouraging';
  const goals      = (userProfile?.anchor_goals || []).join('; ');
  const resistance = userProfile?.task_resistance_pattern || '';
  const focusPeak  = userProfile?.focus_window?.peak_times?.join(', ') || 'evening';
  const tier       = languageTier(sessionDepth);
  const rules      = computeSchedulingRules(userProfile);

  const toneGuide = {
    encouraging: 'Warm, supportive, celebrate small wins.',
    direct:      'Direct, no-nonsense, push back kindly.',
    playful:     'Upbeat, a little playful.',
    reflective:  'Measured, thoughtful, ask good questions.',
  }[register] || 'Warm and supportive.';

  const tasks = (userProfile?.current_tasks || [])
    .map(t => `  - ${t.name} [${t.type}]${urgencyLabel(t.deadline)}${t.meaning_connection ? ` — "${t.meaning_connection}"` : ''}`)
    .join('\n');

  const memSection = retrievedMemories?.length > 0
    ? `\nWHAT YOU REMEMBER from past sessions (use naturally — current message still takes priority):\n${retrievedMemories.slice(0,5).map(m=>`  • ${m.summary||m.description||''}`).filter(l=>l.length>4).join('\n')}`
    : '';

  return `You are ARIA, a disruption-intelligent personal scheduling companion. ${toneGuide}
Today is ${today}.

Name: ${name}
Goals: ${goals}
Resistance pattern: ${resistance}
Best focus times: ${focusPeak}
${tasks ? `Tasks:\n${tasks}` : ''}
${schedCtx}
${memSection}
${rules}

${languageGuide(tier)}

REROUTING PRINCIPLE: You are a rerouter, not a canceller. When disruption hits:
- Protect enabling tasks (gym, social, breaks) — shorten them, never remove them first
- Keep meaningful tasks as microwins — 20 mins is better than zero
- Cut BUFFER tasks first, then non-meaningful FLEXIBLE tasks
- Every kept task gets a reasoning line explaining why FOR THIS PERSON

RESPONSE FORMAT: 3-5 sentences max. Reference the specific person — never generic advice.

If ANY task/deadline/blocker mentioned, include:
<schedule_update>
{"reasoning":"one sentence referencing their specific pattern or urgency","new_sections":[{"label":"Morning","tasks":[]},{"label":"Afternoon","tasks":[]},{"label":"Evening","tasks":[{"id":"task-NNNN","name":"task name","duration_mins":90,"type":"ANCHOR","reasoning":"why kept/placed here for this specific person"}]}]}
</schedule_update>
Rules: ALL tasks rearranged (not just new one), no duplicates, unique ids, only ${currentSection} onwards.
Omit block entirely if nothing changed.`;
}

function applyScheduleUpdate(currentSchedule, scheduleUpdate, currentSection) {
  if (!scheduleUpdate || !currentSchedule?.length) return null;
  const ORDER   = ['Morning','Afternoon','Evening'];
  const curIdx  = ORDER.indexOf(currentSection);
  const newSecs = scheduleUpdate.new_sections;

  if (!newSecs?.length) {
    if (!scheduleUpdate.priority_now) return null;
    const sections = currentSchedule.map(s=>({...s,tasks:(s.tasks||[]).map(t=>({...t}))}));
    const tIdx = sections.findIndex(s=>s.label===currentSection);
    if (tIdx>=0) sections[tIdx].tasks.unshift({
      id:`urgent-${Date.now()}`, name:scheduleUpdate.priority_now,
      duration_mins:90, type:'ANCHOR', reasoning:scheduleUpdate.reasoning||'',
    });
    return sections;
  }

  const seen = new Set();
  newSecs.forEach(s => {
    s.tasks = (s.tasks||[]).map(t => {
      let id = t.id || `task-${Math.random().toString(36).slice(2,8)}`;
      while (seen.has(id)) id = `${id}-${Math.floor(Math.random()*9000)+1000}`;
      seen.add(id);
      return {...t, id};
    });
  });

  return ORDER.map((label, idx) => {
    const original = currentSchedule.find(s=>s.label===label)||{label,tasks:[]};
    if (idx < curIdx) return original;
    const fromGPT = newSecs.find(s=>s.label===label);
    return (fromGPT && fromGPT.tasks?.length > 0) ? fromGPT : original;
  });
}

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({error:'Invalid JSON'},{status:400}); }

  const {
    userId, message,
    userProfile         = {},
    memoryEnabled       = true,
    conversationHistory = [],
    currentSchedule     = [],
    currentSection      = 'Morning',
  } = body;

  if (!userId || !message) {
    return Response.json({error:'userId and message are required'},{status:400});
  }

  const sessionDepth = conversationHistory.length;

  let retrievedMemories = [];
  if (memoryEnabled) {
    retrievedMemories = await searchMemory(userId, message, []);
  }

  const systemPrompt = buildSystemPrompt(
    userProfile, retrievedMemories, memoryEnabled,
    currentSchedule, currentSection, sessionDepth
  );

  const historyText = conversationHistory.slice(-6)
    .map(t=>`${t.role==='user'?'User':'ARIA'}: ${t.content}`)
    .join('\n');

  const fullPrompt = `${systemPrompt}

${historyText ? `Recent conversation:\n${historyText}\n` : ''}User: ${message}

ARIA:`;

  let rawReply = null;
  try { rawReply = await callClaude(fullPrompt, 600); }
  catch (err) { console.error('[chat]', err.message); }

  if (!rawReply) {
    return Response.json({
      reply:"I'm having trouble connecting — check OPENAI_API_KEY in .env.local",
      retrievedMemories:[], memoryEnabled, scheduleUpdate:null, newSchedule:null,
    });
  }

  let scheduleUpdate = null;
  let reply          = rawReply;

  const match = rawReply.match(/<schedule_update>([\s\S]*?)<\/schedule_update>/);
  if (match) {
    try { scheduleUpdate = JSON.parse(match[1].trim()); } catch { /* malformed */ }
    reply = rawReply.replace(/<schedule_update>[\s\S]*?<\/schedule_update>/, '').trim();
  }

  let newSchedule = null;
  if (scheduleUpdate && currentSchedule?.length) {
    newSchedule = applyScheduleUpdate(currentSchedule, scheduleUpdate, currentSection);
  }

  postMemory(userId, `User: "${message}" | ARIA: "${reply.slice(0,200)}"`, 'user').catch(()=>{});

  return Response.json({ reply, retrievedMemories:retrievedMemories.slice(0,3), memoryEnabled, scheduleUpdate, newSchedule });
}