// services/evermemos.js
// EverMemOS Cloud API — confirmed against official docs March 2026
// Base URL:  https://api.evermind.ai
// Version:   v0
// Add:       POST /api/v0/memories          (JSON body)
// Search:    GET  /api/v0/memories/search   (query string params)

import { v4 as uuidv4 } from 'uuid';

const BASE_URL = process.env.EVERMEMOS_BASE_URL || 'https://api.evermind.ai';
const API_KEY  = process.env.EVERMEMOS_API_KEY;

function authHeader() {
  return { 'Authorization': `Bearer ${API_KEY}` };
}

// ── POST /api/v0/memories ─────────────────────────────────────────────────────
// Stores a message and triggers memory extraction.
// Returns { status, message, request_id } or null on failure.
export async function postMemory(userId, content, role = 'user') {
  try {
    // API requires timezone offset — convert trailing Z to +00:00
    const createTime = new Date().toISOString().replace('Z', '+00:00');

    const res = await fetch(`${BASE_URL}/api/v0/memories`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        message_id:  uuidv4(),
        create_time: createTime,
        sender:      userId,
        content,
        role,
      }),
    });

    if (!res.ok) {
      console.error(`[EverMemOS] postMemory HTTP ${res.status}:`, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('[EverMemOS] postMemory error:', err.message);
    return null;
  }
}

// ── GET /api/v0/memories/search ───────────────────────────────────────────────
// Hybrid retrieval. Params go in the query string.
// Returns array of memory objects (each has summary, memory_type, timestamp, user_id).
// Returns [] on failure — never throws.
export async function searchMemory(userId, query, memoryTypes = []) {
  try {
    const params = new URLSearchParams({ user_id: userId, query });
    if (memoryTypes.length > 0) {
      memoryTypes.forEach(t => params.append('memory_types', t));
    }

    const res = await fetch(
      `${BASE_URL}/api/v0/memories/search?${params.toString()}`,
      { method: 'GET', headers: authHeader() }
    );

    if (!res.ok) {
      console.error(`[EverMemOS] searchMemory HTTP ${res.status}:`, await res.text());
      return [];
    }

    const data = await res.json();
    // Response: { status, message, result: { memories: [...], profiles: [...], ... } }
    // Return both episodic memories and profile items for richer context
    const memories = data?.result?.memories ?? [];
    const profiles  = data?.result?.profiles  ?? [];
    return [...memories, ...profiles];
  } catch (err) {
    console.error('[EverMemOS] searchMemory error:', err.message);
    return [];
  }
}

// ── Agentic search — same endpoint, filtered to episodic_memory ───────────────
export async function searchMemoryAgentic(userId, query) {
  return searchMemory(userId, query, ['episodic_memory']);
}