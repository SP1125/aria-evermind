'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Mascot from '@/components/Mascot/Mascot';
import Onboarding from '@/components/Onboarding/Onboarding';
import { ZARA_PROFILE, ZARA_USER_ID, ZARA_V2_USER_ID } from '@/lib/zara-profile';

type Mode = 'no-memory' | 'as-zara' | 'as-zara-v2' | 'as-you';
type MascotAnimState = 'idle' | 'speaking' | 'happy' | 'thinking';

interface Message {
  role: 'user' | 'aria';
  content: string;
  usedMemory?: boolean;
}

interface Task {
  id: string;
  name: string;
  duration_mins: number;
  type: 'ANCHOR' | 'FLEXIBLE' | 'BUFFER';
  reasoning?: string;
}

interface ScheduleSection { label: string; tasks: Task[]; }

const TYPE_COLORS: Record<string, string> = {
  ANCHOR: '#ef4444', FLEXIBLE: '#3b82f6', BUFFER: '#6b7280',
};

// Personality accent colours — drive all gradients
const PERSONALITY_COLORS = {
  warm:      { accent: '#c084fc', glow: '#7c3aed', bg: 'rgba(124,58,237,0.15)' },
  energetic: { accent: '#fb923c', glow: '#ea580c', bg: 'rgba(234,88,12,0.12)'  },
  calm:      { accent: '#86efac', glow: '#16a34a', bg: 'rgba(22,163,74,0.1)'   },
};

const MODE_META = {
  'no-memory':   { label: 'No Memory',   color: '#6b7280', desc: 'Same input, no personal memory — see the difference' },
  'as-zara':     { label: 'Zara (2wk)',  color: '#a855f7', desc: '2 weeks of memory — patterns beginning to emerge'    },
  'as-zara-v2':  { label: 'Zara (4wk)',  color: '#f472b6', desc: '4 weeks of memory — deep patterns, confident voice'  },
  'as-you':      { label: 'As You',      color: '#22c55e', desc: 'Your own brain dump — live extraction'               },
};

const SECTIONS = ['Morning', 'Afternoon', 'Evening'];

function getCurrentSection(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

export default function HomePage() {
  const [mode, setMode] = useState<Mode>('as-zara');

  // Per-mode messages — NEVER cleared
  const [zaraMessages,   setZaraMessages]   = useState<Message[]>([]);
  const [zaraV2Messages, setZaraV2Messages] = useState<Message[]>([]);
  const [noMemMessages,  setNoMemMessages]  = useState<Message[]>([]);
  const [liveMessages,   setLiveMessages]   = useState<Message[]>([]);

  // Per-mode schedules
  const [zaraSchedule,   setZaraSchedule]   = useState<ScheduleSection[]>([]);
  const [zaraV2Schedule, setZaraV2Schedule] = useState<ScheduleSection[]>([]);
  const [noMemSchedule,  setNoMemSchedule]  = useState<ScheduleSection[]>([]);
  const [liveSchedule,   setLiveSchedule]   = useState<ScheduleSection[]>([]);

  // Glow animation
  const [glowIds, setGlowIds] = useState<Set<string>>(new Set());

  // As You / No Memory state
  const [liveUserId,  setLiveUserId]  = useState('');
  const [liveProfile, setLiveProfile] = useState<Record<string,unknown>|null>(null);
  const [liveReady,   setLiveReady]   = useState(false);
  const [noMemUserId,  setNoMemUserId]  = useState('');
  const [noMemProfile, setNoMemProfile] = useState<Record<string,unknown>|null>(null);
  const [noMemReady,   setNoMemReady]   = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);

  // UI
  const [input,         setInput]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [mascotState,   setMascotState]   = useState<MascotAnimState>('idle');
  const [mascotMessage, setMascotMessage] = useState<string|null>(null);
  const [currentSection] = useState(getCurrentSection());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mascotTimer    = useRef<ReturnType<typeof setTimeout>|null>(null);
  const glowTimer      = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Derived
  const messages = mode === 'as-zara' ? zaraMessages
    : mode === 'as-zara-v2' ? zaraV2Messages
    : mode === 'as-you' ? liveMessages : noMemMessages;

  const schedule = mode === 'as-zara' ? zaraSchedule
    : mode === 'as-zara-v2' ? zaraV2Schedule
    : mode === 'as-you' ? liveSchedule : noMemSchedule;

  const activeUserId = mode === 'as-zara' ? ZARA_USER_ID
    : mode === 'as-zara-v2' ? ZARA_V2_USER_ID
    : mode === 'as-you' ? liveUserId : noMemUserId;

  const activeProfile = (mode === 'as-zara' || mode === 'as-zara-v2') ? ZARA_PROFILE
    : mode === 'as-you' && liveProfile ? liveProfile
    : mode === 'no-memory' && noMemProfile ? noMemProfile
    : {};

  const memEnabled = mode !== 'no-memory';

  const activePersonality: 'warm'|'energetic'|'calm' =
    (mode === 'as-zara' || mode === 'as-zara-v2') ? 'warm' :
    mode === 'as-you' && liveProfile ? ((liveProfile.personality_id as any) || 'warm') :
    'calm';

  const pColors = PERSONALITY_COLORS[activePersonality];

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [zaraMessages, zaraV2Messages, liveMessages, noMemMessages]);

  // Mode switch — preserve history, reset transient UI only
  useEffect(() => {
    clearTimeout(mascotTimer.current!);
    setInput(''); setLoading(false); setMascotState('idle'); setMascotMessage(null);

    if (mode === 'as-zara') {
      setMascotMessage("Hey Zara — how's the week going? Be honest with me.");
      if (zaraSchedule.length === 0) fetchSchedule(ZARA_USER_ID, ZARA_PROFILE, true, false, setZaraSchedule);
    } else if (mode === 'as-zara-v2') {
      setMascotMessage("Hey Zara — good to see you again. What's on your mind?");
      if (zaraV2Schedule.length === 0) fetchSchedule(ZARA_V2_USER_ID, ZARA_PROFILE, true, false, setZaraV2Schedule);
    } else if (mode === 'no-memory') {
      setMascotMessage(noMemReady ? "What's changed? Tell me." : "Tell me what's on your plate — I'll sort it out.");
      if (!noMemReady) setShowOnboarding(true);
    } else {
      setMascotMessage(liveReady
        ? `What's going on${liveProfile?.nickname ? ', ' + liveProfile.nickname : ''}?`
        : "Tell me about your week and I'll build your schedule around you.");
      if (!liveReady) setShowOnboarding(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function fetchSchedule(userId: string, profile: Record<string,unknown>, useZara: boolean, noMemory: boolean, setter: (s:ScheduleSection[])=>void) {
    try {
      const res  = await fetch('/api/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userProfile: profile, useZaraSchedule: useZara, noMemoryMode: noMemory }),
      });
      const data = await res.json();
      setter(data.schedule?.sections ?? []);
    } catch (e) { console.error('[schedule]', e); }
  }

  function applyGlow(newSections: ScheduleSection[], oldSections: ScheduleSection[]) {
    const oldIds = new Set(oldSections.flatMap(s => s.tasks.map(t => t.id)));
    const changed = newSections.flatMap(s => s.tasks).filter(t => !oldIds.has(t.id)).map(t => t.id);
    if (changed.length) {
      setGlowIds(new Set(changed));
      clearTimeout(glowTimer.current!);
      glowTimer.current = setTimeout(() => setGlowIds(new Set()), 1400);
    }
  }

  function speakAndFade(text: string, ms = 5500) {
    clearTimeout(mascotTimer.current!);
    setMascotState('speaking'); setMascotMessage(text);
    mascotTimer.current = setTimeout(() => { setMascotState('idle'); setMascotMessage(null); }, ms);
  }

  function appendMessage(msg: Message) {
    if (mode === 'as-zara')      setZaraMessages(p   => [...p, msg]);
    else if (mode === 'as-zara-v2') setZaraV2Messages(p => [...p, msg]);
    else if (mode === 'as-you')  setLiveMessages(p   => [...p, msg]);
    else                         setNoMemMessages(p  => [...p, msg]);
  }

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    if ((mode === 'as-you' && !liveReady) || (mode === 'no-memory' && !noMemReady)) {
      setShowOnboarding(true); return;
    }

    setInput(''); setLoading(true); setMascotState('thinking'); setMascotMessage(null);
    appendMessage({ role: 'user', content: text });

    try {
      const currentMsgs = mode === 'as-zara' ? zaraMessages
        : mode === 'as-zara-v2' ? zaraV2Messages
        : mode === 'as-you' ? liveMessages : noMemMessages;

      const res  = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:              activeUserId,
          message:             text,
          userProfile:         activeProfile,
          memoryEnabled:       memEnabled,
          currentSchedule:     schedule,
          currentSection,
          conversationHistory: currentMsgs.slice(-8).map(m => ({
            role: m.role === 'aria' ? 'assistant' : 'user', content: m.content,
          })),
        }),
      });

      const data = await res.json();
      const usedMem = memEnabled && data.retrievedMemories?.length > 0;
      appendMessage({ role: 'aria', content: data.reply, usedMemory: usedMem });
      speakAndFade(data.reply, 6000);

      if (data.newSchedule) {
        if (mode === 'as-zara') {
          applyGlow(data.newSchedule, zaraSchedule); setZaraSchedule(data.newSchedule);
        } else if (mode === 'as-zara-v2') {
          applyGlow(data.newSchedule, zaraV2Schedule); setZaraV2Schedule(data.newSchedule);
        } else if (mode === 'as-you') {
          applyGlow(data.newSchedule, liveSchedule); setLiveSchedule(data.newSchedule);
        } else {
          applyGlow(data.newSchedule, noMemSchedule); setNoMemSchedule(data.newSchedule);
        }
      }

      const positive = ['done','finished','wrote','went','completed','managed','got it','submitted'];
      if (positive.some(w => text.toLowerCase().includes(w))) setTimeout(() => setMascotState('happy'), 300);

    } catch (err) {
      console.error('[send]', err);
      appendMessage({ role: 'aria', content: 'Something went wrong — try again.' });
      setMascotState('idle');
    } finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, mode, activeUserId, activeProfile, memEnabled, schedule,
      liveReady, noMemReady, zaraMessages, zaraV2Messages, liveMessages, noMemMessages,
      liveUserId, noMemProfile, zaraSchedule, zaraV2Schedule, liveSchedule, noMemSchedule, currentSection]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // Onboarding completion — handles both As You and No Memory
  async function handleOnboardingComplete(data: {
    userId: string; personality: 'warm'|'energetic'|'calm';
    answers: Record<string, string>; brainDump: string;
  }) {
    const { userId, personality, answers, brainDump } = data;
    try {
      const res  = await fetch('/api/extract', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, personalityId: personality,
          onboardingAnswers: answers, brainDump,
        }),
      });
      const extracted = await res.json();
      const profile = { ...(extracted.user_profile || {}), personality_id: personality };

      if (mode === 'no-memory') {
        setNoMemUserId(userId); setNoMemProfile(profile); setNoMemReady(true);
        await fetchSchedule(userId, profile, false, true, setNoMemSchedule);
        speakAndFade("Got it. Here's your schedule — no frills, just organised.", 5000);
      } else {
        setLiveUserId(userId); setLiveProfile(profile); setLiveReady(true);
        await fetchSchedule(userId, profile, false, false, setLiveSchedule);
        const nick = profile.nickname as string || '';
        speakAndFade(`Got it${nick ? ', ' + nick : ''}. I've built your schedule around what you told me. What's weighing on you most?`, 7000);
      }
      setShowOnboarding(false);
    } catch (err) {
      console.error('[onboard]', err);
      setShowOnboarding(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at 25% 15%, ${pColors.bg} 0%, #0d0d1a 45%, #000510 100%)`,
      display: 'flex', flexDirection: 'column',
      color: '#f0f0f8', fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'background 0.8s ease',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${pColors.accent}22`,
        background: `linear-gradient(135deg, ${pColors.accent}08 0%, transparent 60%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: pColors.accent }}>ARIA</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Adaptive Rerouting Intelligence Agent</span>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['no-memory','as-zara','as-zara-v2','as-you'] as Mode[]).map(m => {
            const active = mode === m;
            const color  = active ? pColors.accent : MODE_META[m].color;
            return (
              <button key={m} onClick={() => setMode(m)} title={MODE_META[m].desc} style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                border:     `2px solid ${active ? color : 'transparent'}`,
                background: active ? `${color}22` : 'rgba(255,255,255,0.06)',
                color:      active ? color : 'rgba(255,255,255,0.5)',
                fontWeight: active ? 600 : 400, transition: 'all 0.25s',
              }}>{MODE_META[m].label}</button>
            );
          })}
        </div>

        <span style={{ fontSize: 11, color: `${pColors.accent}88`, flexBasis: '100%' }}>
          {MODE_META[mode].desc}
        </span>
      </div>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,0.7fr)',
        overflow: 'hidden',
      }}>

        {/* LEFT */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${pColors.accent}15`, overflow: 'hidden',
          background: `linear-gradient(180deg, ${pColors.accent}06 0%, transparent 30%)`,
        }}>

          {/* Mascot */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '18px 16px 4px', minHeight: 210,
            background: `radial-gradient(circle at 50% 60%, ${pColors.accent}10 0%, transparent 70%)`,
          }}>
            <Mascot personality={activePersonality} state={mascotState}
              message={mascotMessage} size={160} />
          </div>

          {/* Memory badge */}
          <div style={{
            textAlign: 'center', fontSize: 10, padding: '0 0 6px',
            color: memEnabled ? pColors.accent : 'rgba(255,255,255,0.2)',
          }}>
            {memEnabled
              ? <span>◉ EverMemOS memory active</span>
              : <span>○ No memory — generic scheduling only</span>}
          </div>

          {/* Chat thread */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '8px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            {messages.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 1.7 }}>
                {(mode === 'as-you' && !liveReady) || (mode === 'no-memory' && !noMemReady)
                  ? 'Brain dump loading...'
                  : 'Start the conversation...'}
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '82%', padding: '9px 13px', fontSize: 13, lineHeight: 1.55,
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user'
                    ? `${pColors.accent}18`
                    : msg.usedMemory ? `${pColors.glow}25` : 'rgba(255,255,255,0.06)',
                  border: msg.usedMemory
                    ? `1px solid ${pColors.accent}55`
                    : msg.role === 'user'
                    ? `1px solid ${pColors.accent}30`
                    : '1px solid rgba(255,255,255,0.05)',
                  color: '#f0f0f8',
                }}>
                  {msg.usedMemory && (
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 1,
                      color: pColors.accent, marginBottom: 6,
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', background: pColors.accent,
                        display: 'inline-block', boxShadow: `0 0 6px ${pColors.accent}`,
                      }} />
                      MEMORY SURFACED
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 14px', borderTop: `1px solid ${pColors.accent}15`,
            display: 'flex', gap: 8,
          }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown} disabled={loading}
              placeholder="What's going on? Be honest..."
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${pColors.accent}25`, borderRadius: 10,
                padding: '9px 13px', color: '#f0f0f8', fontSize: 13, outline: 'none',
              }}
            />
            <button onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? 'rgba(255,255,255,0.08)' : pColors.glow,
                border: 'none', borderRadius: 10, padding: '9px 16px',
                color: '#fff', fontSize: 13, cursor: 'pointer', transition: 'background 0.2s',
                boxShadow: (!loading && input.trim()) ? `0 0 12px ${pColors.glow}55` : 'none',
              }}
            >{loading ? '···' : 'Send'}</button>
          </div>
        </div>

        {/* RIGHT: schedule */}
        <div style={{ overflowY: 'auto', padding: '16px 14px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, color: `${pColors.accent}88` }}>
              TODAY'S SCHEDULE
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {schedule.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', marginTop: 24, lineHeight: 1.7 }}>
              {(mode === 'as-you' && !liveReady) || (mode === 'no-memory' && !noMemReady)
                ? 'Complete your brain dump to generate a schedule'
                : 'Loading...'}
            </div>
          ) : (
            schedule.map((section) => {
              const sIdx    = SECTIONS.indexOf(section.label);
              const curIdx  = SECTIONS.indexOf(currentSection);
              const isPast  = sIdx < curIdx;
              const isNow   = section.label === currentSection;

              return (
                <div key={section.label} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: 0.8,
                      color: isNow ? pColors.accent : isPast ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)',
                    }}>{section.label.toUpperCase()}</div>
                    {isNow && (
                      <div style={{
                        fontSize: 9, fontWeight: 700, color: pColors.accent,
                        background: `${pColors.accent}18`, border: `1px solid ${pColors.accent}44`,
                        borderRadius: 10, padding: '1px 7px',
                      }}>NOW</div>
                    )}
                    {isPast && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>done</div>}
                  </div>

                  {/* NOW line */}
                  {isNow && (
                    <div style={{
                      height: 2, marginBottom: 10, borderRadius: 1,
                      background: `linear-gradient(90deg, transparent, ${pColors.accent}, transparent)`,
                      boxShadow: `0 0 8px ${pColors.accent}77`,
                    }} />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {section.tasks.map(task => {
                      const isGlowing = glowIds.has(task.id);
                      return (
                        <div key={task.id} style={{
                          background: isGlowing ? `${pColors.glow}18` : isPast ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                          border: isGlowing ? `1px solid ${pColors.accent}` : '1px solid rgba(255,255,255,0.07)',
                          borderRadius: 8, padding: '8px 10px',
                          opacity: isPast ? 0.4 : 1,
                          transition: 'border 0.4s, background 0.4s, box-shadow 0.4s',
                          boxShadow: isGlowing ? `0 0 14px ${pColors.accent}44` : 'none',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 500, color: isPast ? 'rgba(255,255,255,0.35)' : '#f0f0f8' }}>
                              {task.name}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: isPast ? 'rgba(255,255,255,0.2)' : TYPE_COLORS[task.type], whiteSpace: 'nowrap', marginTop: 1 }}>
                              {task.type}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                            {task.duration_mins} mins
                          </div>
                          {task.reasoning && !isPast && (
                            <div style={{
                              fontSize: 10, color: `${pColors.accent}99`,
                              marginTop: 5, fontStyle: 'italic', lineHeight: 1.4,
                            }}>"{task.reasoning}"</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {showOnboarding && (
        <Onboarding
          mode={mode as 'as-you' | 'no-memory'}
          onComplete={handleOnboardingComplete}
          onCancel={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}