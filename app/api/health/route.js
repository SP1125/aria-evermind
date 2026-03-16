// src/app/api/health/route.js
// B-01 equivalent — health check endpoint
// GET /api/health → { status: 'ok', timestamp }
// First thing to confirm is working after deployment.

export async function GET() {
  return Response.json({
    status:    'ok',
    timestamp: new Date().toISOString(),
    env_check: {
      evermemos: !!process.env.EVERMEMOS_API_KEY,
      claude:    !!process.env.CLAUDE_API_KEY,
      whisper:   !!process.env.WHISPER_API_KEY,
    },
  });
}