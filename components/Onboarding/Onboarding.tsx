'use client';
// src/components/Onboarding/Onboarding.tsx

import React, { useState, useRef, useEffect } from 'react';
import Mascot from '@/components/Mascot/Mascot';
import { ONBOARDING_QUESTIONS } from './onboarding.config';

const PERSONALITY_COLORS = {
  warm:      { accent: '#c084fc', glow: '#7c3aed' },
  energetic: { accent: '#fb923c', glow: '#ea580c' },
  calm:      { accent: '#86efac', glow: '#16a34a' },
};

// CSS-only accessory overlays — no PNG files needed
// Each is a small shape that appears on the mascot as answers accumulate
const CSS_ACCESSORIES = [
  // Q2 answer — soft glowing ring
  (color: string) => (
    <div key="ring" style={{
      position: 'absolute', inset: -6,
      borderRadius: '50%',
      border: `2px solid ${color}66`,
      boxShadow: `0 0 12px ${color}44`,
      pointerEvents: 'none',
      animation: 'accFadeIn 0.4s ease-out forwards',
    }} />
  ),
  // Q3 answer — small star top-right
  (color: string) => (
    <div key="star" style={{
      position: 'absolute', top: 0, right: 4,
      fontSize: 18, lineHeight: 1,
      animation: 'accFadeIn 0.4s ease-out forwards',
      filter: `drop-shadow(0 0 4px ${color})`,
    }}>✦</div>
  ),
  // Q4 answer — small badge bottom-left
  (color: string) => (
    <div key="badge" style={{
      position: 'absolute', bottom: 8, left: 0,
      width: 14, height: 14, borderRadius: '50%',
      background: color,
      boxShadow: `0 0 8px ${color}`,
      animation: 'accFadeIn 0.4s ease-out forwards',
    }} />
  ),
];

interface OnboardingProps {
  mode: 'as-you' | 'no-memory';
  onComplete: (data: {
    userId:      string;
    personality: 'warm' | 'energetic' | 'calm';
    answers:     Record<string, string>;
    brainDump:   string;
  }) => void;
  onCancel: () => void;
}

export default function Onboarding({ mode, onComplete, onCancel }: OnboardingProps) {
  // no-memory skips all questions — starts directly at brain dump (step = QUESTIONS.length)
  const startStep = mode === 'no-memory' ? ONBOARDING_QUESTIONS.length : 0;

  const [step,        setStep]        = useState(startStep);
  const [answers,     setAnswers]     = useState<Record<string,string>>({});
  const [personality, setPersonality] = useState<'warm'|'energetic'|'calm'>('warm');
  const [accCount,    setAccCount]    = useState(0); // how many CSS accessories to show
  const [brainDump,   setBrainDump]   = useState('');
  const [mascotMsg,   setMascotMsg]   = useState<string|null>(
    mode === 'no-memory'
      ? "What's on your plate today? List your tasks and I'll sort it out."
      : "First things first — who do you want me to be for you?"
  );
  const [mascotState, setMascotState] = useState<'idle'|'speaking'|'happy'|'thinking'>('speaking');
  const [loadingDot,  setLoadingDot]  = useState(0);
  const [isLoading,   setIsLoading]   = useState(false);

  const msgTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const dotTimer = useRef<ReturnType<typeof setInterval>|null>(null);

  const pColors = PERSONALITY_COLORS[personality];
  const q       = ONBOARDING_QUESTIONS[step] || null;
  const totalSteps = ONBOARDING_QUESTIONS.length + 1; // +1 for brain dump

  useEffect(() => {
    if (isLoading) {
      dotTimer.current = setInterval(() => setLoadingDot(d => (d + 1) % 4), 500);
    }
    return () => clearInterval(dotTimer.current!);
  }, [isLoading]);

  function speakThen(msg: string, then?: () => void) {
    clearTimeout(msgTimer.current!);
    setMascotState('speaking');
    setMascotMsg(msg);
    if (then) {
      msgTimer.current = setTimeout(() => {
        setMascotState('idle');
        setMascotMsg(null);
        then();
      }, 1800);
    }
  }

  function handleOption(value: string) {
    const currentQ = ONBOARDING_QUESTIONS[step];
    if (!currentQ) return;

    const newAnswers = { ...answers, [currentQ.profileKey]: value };
    setAnswers(newAnswers);

    if (currentQ.profileKey === 'personality_id') {
      setPersonality(value as 'warm'|'energetic'|'calm');
    }

    // Add CSS accessory for questions 1-3 (after personality pick)
    if (step >= 1 && step <= 3) {
      setAccCount(prev => Math.min(prev + 1, CSS_ACCESSORIES.length));
    }

    setMascotState('happy');
    speakThen(currentQ.mascotReaction, () => {
      const next = step + 1;
      setStep(next);
      if (next < ONBOARDING_QUESTIONS.length) {
        speakThen(ONBOARDING_QUESTIONS[next].question);
      } else {
        speakThen("Now tell me everything that's on your mind — goals, stress, tasks, how you're feeling. Don't hold back.");
      }
    });
  }

  function handleNickname(e: React.FormEvent) {
    e.preventDefault();
    const nick = (e.target as HTMLFormElement).nickname.value.trim();
    handleOption(nick || 'you');
  }

  function handleBrainDumpSubmit() {
    if (!brainDump.trim()) return;
    setIsLoading(true);
    setMascotState('thinking');
    setMascotMsg('Building your schedule...');
    const userId = `aria-${mode === 'no-memory' ? 'nomem' : 'live'}-${Date.now()}`;
    onComplete({ userId, personality, answers, brainDump: brainDump.trim() });
  }

  const loadingDots = '.'.repeat(loadingDot + 1).padEnd(4, ' ');
  const progressPct = mode === 'no-memory'
    ? 80  // brain dump step
    : ((step) / totalSteps) * 100;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: `radial-gradient(ellipse at 30% 20%, ${pColors.glow}22 0%, #0d0d1a 50%, #000510 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: 20, transition: 'background 0.6s ease',
    }}>
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes accFadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ maxWidth: 480, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>

        {/* Progress bar — hidden in no-memory mode */}
        {mode !== 'no-memory' && (
          <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }}>
            <div style={{
              height: '100%', borderRadius: 1,
              background: `linear-gradient(90deg, ${pColors.glow}, ${pColors.accent})`,
              width: `${progressPct}%`, transition: 'width 0.4s ease',
            }} />
          </div>
        )}

        {/* Mascot + CSS accessories */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {isLoading && (
            <div style={{
              position: 'absolute', inset: -10, borderRadius: '50%',
              border: `2px solid transparent`,
              borderTop: `2px solid ${pColors.accent}`,
              borderRight: `2px solid ${pColors.accent}44`,
              animation: 'spin 1s linear infinite', zIndex: 10,
            }} />
          )}
          {/* CSS accessory overlays */}
          {CSS_ACCESSORIES.slice(0, accCount).map((render, i) => render(pColors.accent))}
          <Mascot personality={personality} state={mascotState} message={mascotMsg} size={160} />
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: pColors.accent, marginBottom: 6 }}>
              Building your profile{loadingDots}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Extracting your patterns and generating your schedule
            </div>
          </div>
        )}

        {/* Multiple choice questions (as-you only) */}
        {!isLoading && step < ONBOARDING_QUESTIONS.length && mode !== 'no-memory' && (
          <div style={{ width: '100%' }}>
            {q && q.options.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q.options.map(opt => (
                  <button key={opt.value} onClick={() => handleOption(opt.value)} style={{
                    padding: '13px 18px', borderRadius: 12, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${pColors.accent}33`,
                    color: '#f0f0f8', fontSize: 14, textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 12,
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${pColors.glow}22`)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  >
                    <span style={{ fontSize: 20 }}>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Nickname free text */}
            {q && q.options.length === 0 && (
              <form onSubmit={handleNickname} style={{ display: 'flex', gap: 8 }}>
                <input name="nickname" autoFocus
                  placeholder="Your name or what you go by..."
                  style={{
                    flex: 1, background: 'rgba(255,255,255,0.07)',
                    border: `1px solid ${pColors.accent}33`, borderRadius: 10,
                    padding: '12px 14px', color: '#f0f0f8', fontSize: 14, outline: 'none',
                  }}
                />
                <button type="submit" style={{
                  padding: '12px 18px', borderRadius: 10, border: 'none',
                  background: pColors.glow, color: '#fff', cursor: 'pointer', fontSize: 14,
                }}>→</button>
              </form>
            )}
          </div>
        )}

        {/* Brain dump — shown when questions done OR in no-memory mode */}
        {!isLoading && step === ONBOARDING_QUESTIONS.length && (
          <div style={{ width: '100%' }}>
            <textarea value={brainDump} onChange={e => setBrainDump(e.target.value)}
              rows={6} autoFocus
              placeholder={mode === 'no-memory'
                ? "List your tasks and deadlines — I'll build a schedule..."
                : "Goals, tasks, what's stressing you, how you like to work..."}
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${pColors.accent}33`, borderRadius: 10,
                padding: '12px 14px', color: '#f0f0f8', fontSize: 13,
                lineHeight: 1.6, outline: 'none', resize: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
              <button onClick={onCancel} style={{
                padding: '10px 16px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', fontSize: 13,
              }}>Cancel</button>
              <button onClick={handleBrainDumpSubmit}
                disabled={!brainDump.trim()} style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: brainDump.trim() ? pColors.glow : 'rgba(255,255,255,0.1)',
                  color: '#fff', cursor: brainDump.trim() ? 'pointer' : 'default',
                  fontSize: 13, fontWeight: 600,
                  boxShadow: brainDump.trim() ? `0 0 16px ${pColors.glow}44` : 'none',
                  transition: 'all 0.2s',
                }}>Let's go →</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}