'use client';

// src/components/Mascot/Mascot.tsx
// A-01 — Mascot component
//
// Usage:
//   import Mascot from '@/components/Mascot/Mascot';
//
//   <Mascot personality="warm" state="idle" />
//   <Mascot personality="calm" state="speaking" message="How are you feeling right now?" />
//   <Mascot personality="energetic" state="happy" size={300} />
//   <Mascot personality="warm" state="thinking" />
//   <Mascot personality="warm" state="idle" accessories={['aura', 'star']} />

import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import './Mascot.css';
import { MASCOT_CONFIG, PersonalityId } from './mascot.config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MascotState = 'idle' | 'speaking' | 'happy' | 'thinking';

export type AccessoryKey = 'aura' | 'star' | 'badge';

export interface MascotProps {
  /** Which mascot personality to render */
  personality: PersonalityId;

  /** Animation state */
  state?: MascotState;

  /**
   * Message to show in the speech bubble.
   * - string → show the message
   * - null / undefined → hide the bubble
   * When state is 'thinking' and no message is provided, shows animated dots.
   */
  message?: string | null;

  /**
   * Accessory keys to layer on top of the mascot.
   * Each key maps to /public/mascots/acc-{key}-{personality}.png
   * New accessories fade in when added to the array.
   */
  accessories?: AccessoryKey[];

  /**
   * Width and height of the mascot image in px.
   * Speech bubble width scales with this but caps at 260px.
   * @default 200
   */
  size?: number;

  /**
   * Additional className on the root element.
   * Use for positioning overrides on specific screens.
   */
  className?: string;

  /**
   * Alt text for the mascot image.
   * Defaults to the mascot's name from config.
   */
  alt?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Mascot({
  personality,
  state = 'idle',
  message,
  accessories = [],
  size = 200,
  className = '',
  alt,
}: MascotProps) {
  const config = MASCOT_CONFIG[personality];

  // ── Happy state: run animation once then return to idle ────────────────────
  // We track an internal animation key that resets when state changes to happy,
  // so re-triggering happy after it completes actually restarts the animation.
  const [happyKey, setHappyKey]         = useState(0);
  const [isHappyPlaying, setHappyPlaying] = useState(false);
  const happyTimerRef                    = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (state === 'happy') {
      setHappyKey(k => k + 1);
      setHappyPlaying(true);
      clearTimeout(happyTimerRef.current);
      // Match the keyframe duration (0.9s) then stop so we don't loop
      happyTimerRef.current = setTimeout(() => setHappyPlaying(false), 950);
    }
    return () => clearTimeout(happyTimerRef.current);
  }, [state]);

  // ── Bubble visibility: keep bubble mounted briefly after message clears ────
  // Prevents a jarring snap-disappear when the message prop goes null.
  const [visibleMessage, setVisibleMessage] = useState(message);
  const bubbleFadeRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (message) {
      setVisibleMessage(message);
      clearTimeout(bubbleFadeRef.current);
    } else {
      bubbleFadeRef.current = setTimeout(() => setVisibleMessage(null), 300);
    }
    return () => clearTimeout(bubbleFadeRef.current);
  }, [message]);

  // ── Derive animation class ─────────────────────────────────────────────────
  function getAnimationClass(): string {
    if (state === 'happy' && isHappyPlaying) return 'mascot-state-happy';
    if (state === 'happy' && !isHappyPlaying) {
      // Settle back to idle after happy completes
      return config.idleVariant === 'sway'
        ? 'mascot-state-idle-sway'
        : 'mascot-state-idle-float';
    }
    if (state === 'speaking')  return 'mascot-state-speaking';
    if (state === 'thinking')  return 'mascot-state-thinking';
    // idle
    return config.idleVariant === 'sway'
      ? 'mascot-state-idle-sway'
      : 'mascot-state-idle-float';
  }

  // ── Bubble content ─────────────────────────────────────────────────────────
  function renderBubbleContent() {
    // Show thinking dots if state is thinking and no explicit message provided
    if (state === 'thinking' && !visibleMessage) {
      return (
        <div className="mascot-thinking-dots" aria-label="Thinking…">
          <span />
          <span />
          <span />
        </div>
      );
    }
    return <span>{visibleMessage}</span>;
  }

  const showBubble = visibleMessage || state === 'thinking';

  // ── CSS custom property for size ───────────────────────────────────────────
  const rootStyle: CSSProperties = {
    ['--mascot-size' as string]: `${size}px`,
  };

  return (
    <div
      className={`mascot-root ${className}`.trim()}
      style={rootStyle}
      data-personality={personality}
      data-state={state}
    >
      {/* ── Mascot image wrapper (animations applied here) ── */}
      <div
        key={state === 'happy' ? happyKey : undefined}
        className={`mascot-wrapper ${getAnimationClass()}`}
      >
        {/* Base character PNG */}
        <img
          className="mascot-img"
          src={config.imagePath}
          alt={alt ?? config.name}
          draggable={false}
          width={size}
          height={size}
        />

        {/* Accessory layers — each fades in when added */}
        {accessories.map((key) => (
          <img
            key={key}
            className="mascot-acc"
            src={`/mascots/acc-${key}-${personality}.png`}
            alt=""
            aria-hidden="true"
            draggable={false}
            width={size}
            height={size}
          />
        ))}
      </div>

      {/* ── Speech bubble ── */}
      {showBubble && (
        <div
          className="mascot-bubble"
          role={state === 'thinking' ? 'status' : 'note'}
          aria-live={state === 'speaking' ? 'polite' : undefined}
        >
          {renderBubbleContent()}
        </div>
      )}
    </div>
  );
}