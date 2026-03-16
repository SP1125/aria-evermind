// src/components/Mascot/mascot.config.ts
// ─────────────────────────────────────────────────────────────────────────────
// MASCOT CONFIGURATION
// Change names, descriptions, and image paths here.
// Nothing else in the codebase needs to change when you rename a mascot.
// ─────────────────────────────────────────────────────────────────────────────

export type PersonalityId = 'warm' | 'energetic' | 'calm';

export interface MascotConfig {
  /** Display name shown in onboarding selection */
  name: string;
  /** Short personality description shown during selection */
  description: string;
  /** Path to the base PNG in /public/mascots/ */
  imagePath: string;
  /** CSS filter applied to accessories to tint them to match the mascot */
  accentColor: string;
  /** Idle animation variant — diamond shape benefits from slight sway */
  idleVariant: 'float' | 'sway';
}

export const MASCOT_CONFIG: Record<PersonalityId, MascotConfig> = {
  warm: {
    name:        'Mochi',
    description: 'Gentle, encouraging, always in your corner',
    imagePath:   '/mascots/Warm Mascot.png',
    accentColor: '#c084fc',
    idleVariant: 'float',
  },
  energetic: {
    name:        'Blaze',
    description: 'Direct, motivating, calls you out (kindly)',
    imagePath:   '/mascots/Energetic Mascot.png',
    accentColor: '#fb923c',
    idleVariant: 'float',
  },
  calm: {
    name:        'Sage',
    description: 'Measured, reflective, asks the right questions',
    imagePath:   '/mascots/Calm Mascot.png',
    accentColor: '#86efac',
    idleVariant: 'sway',
  },
};