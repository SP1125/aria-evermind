'use client';
// src/context/AppContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Task {
  id: string;
  name: string;
  duration_mins: number;
  type: 'ANCHOR' | 'FLEXIBLE' | 'BUFFER';
  reasoning?: string;
}

interface ScheduleSection {
  label: string;
  tasks: Task[];
}

interface Schedule {
  date: string;
  sections: ScheduleSection[];
}

interface AppContextType {
  userId: string;
  setUserId: (id: string) => void;
  userProfile: Record<string, unknown>;
  setUserProfile: (p: Record<string, unknown>) => void;
  schedule: Schedule | null;
  setSchedule: (s: Schedule | null) => void;
  personality: 'warm' | 'energetic' | 'calm';
  setPersonality: (p: 'warm' | 'energetic' | 'calm') => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId,      setUserId]      = useState('aria-demo-persona1');
  const [userProfile, setUserProfile] = useState<Record<string, unknown>>({});
  const [schedule,    setSchedule]    = useState<Schedule | null>(null);
  const [personality, setPersonality] = useState<'warm' | 'energetic' | 'calm'>('warm');

  return (
    <AppContext.Provider value={{
      userId, setUserId,
      userProfile, setUserProfile,
      schedule, setSchedule,
      personality, setPersonality,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}