//dev test page delete before production

'use client';

// src/app/dev/mascot/page.tsx
// DEV ONLY — visual test page for the Mascot component.
// Visit: http://localhost:3000/dev/mascot
// Shows all 3 personalities × all 4 states + accessories.
// Delete this file before production deploy, or add to .gitignore.

import React, { useState } from 'react';
import Mascot from '@/components/Mascot/Mascot';
import { MASCOT_CONFIG } from '@/components/Mascot/mascot.config';
import type { MascotState, AccessoryKey, PersonalityId } from '@/components/Mascot';

const PERSONALITIES: PersonalityId[] = ['warm', 'energetic', 'calm'];
const STATES: MascotState[]           = ['idle', 'speaking', 'happy', 'thinking'];
const ACCESSORIES: AccessoryKey[]     = ['aura', 'star', 'badge'];

const EXAMPLE_MESSAGES: Record<PersonalityId, Record<MascotState, string | null>> = {
  warm: {
    idle:     null,
    speaking: "I've noticed you always feel better after the gym. Want to start there tonight?",
    happy:    "You wrote 400 words! I knew it was in you.",
    thinking: null,
  },
  energetic: {
    idle:     null,
    speaking: "Stop circling it. You have 35 minutes. Go.",
    happy:    "That's the one. Ship it.",
    thinking: null,
  },
  calm: {
    idle:     null,
    speaking: "I've been thinking about something you said last week. Is this connected?",
    happy:    "That took courage. Notice that.",
    thinking: null,
  },
};

export default function MascotDevPage() {
  const [activeAccessories, setActiveAccessories] = useState<AccessoryKey[]>([]);
  const [triggerHappy, setTriggerHappy]           = useState<PersonalityId | null>(null);

  function toggleAccessory(key: AccessoryKey) {
    setActiveAccessories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: 8 }}>Mascot component — dev test</h1>
      <p style={{ color: '#888', marginBottom: 32, fontSize: 14 }}>
        All 3 personalities × all 4 states. Names from <code>mascot.config.ts</code>.
      </p>

      {/* Accessory controls */}
      <div style={{ marginBottom: 32 }}>
        <strong style={{ fontSize: 13 }}>Accessories:</strong>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {ACCESSORIES.map(key => (
            <button
              key={key}
              onClick={() => toggleAccessory(key)}
              style={{
                padding: '4px 12px',
                borderRadius: 8,
                border: '1px solid #ccc',
                background: activeAccessories.includes(key) ? '#6366f1' : '#fff',
                color: activeAccessories.includes(key) ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: personality columns × state rows */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 24,
      }}>
        {PERSONALITIES.map(personality => (
          <div key={personality}>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>
              {MASCOT_CONFIG[personality].name}
              <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}> ({personality})</span>
            </h2>
            <p style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
              {MASCOT_CONFIG[personality].description}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {STATES.map(state => (
                <div key={state} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#aaa', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {state}
                  </div>

                  <Mascot
                    personality={personality}
                    state={triggerHappy === personality && state === 'happy' ? 'happy' : state}
                    message={EXAMPLE_MESSAGES[personality][state]}
                    accessories={activeAccessories}
                    size={140}
                  />

                  {state === 'happy' && (
                    <button
                      onClick={() => {
                        setTriggerHappy(personality);
                        setTimeout(() => setTriggerHappy(null), 1000);
                      }}
                      style={{ marginTop: 8, fontSize: 11, padding: '2px 8px', cursor: 'pointer', borderRadius: 6, border: '1px solid #ccc' }}
                    >
                      retrigger
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48, padding: 16, background: '#f5f5f5', borderRadius: 8, fontSize: 13 }}>
        <strong>To rename a mascot:</strong> open <code>src/components/Mascot/mascot.config.ts</code> and change the <code>name</code> field. No other file needs updating.
      </div>
    </div>
  );
}