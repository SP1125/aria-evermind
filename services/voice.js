// services/voice.js
// Whisper API wrapper for voice-to-text transcription.
// Called by POST /api/transcribe (B-05).
// Returns transcript string or null on failure.

const WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
const API_KEY     = process.env.WHISPER_API_KEY;

// audioBlob: a Blob or Buffer of audio data (webm, mp4, wav, m4a all supported)
// filename:  hint to Whisper about the format, e.g. 'recording.webm'

export async function transcribeAudio(audioBlob, filename = 'recording.webm') {
  try {
    const formData = new FormData();
    formData.append('file',  new Blob([audioBlob]), filename);
    formData.append('model', 'whisper-1');

    const res = await fetch(WHISPER_URL, {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      // Note: do NOT set Content-Type manually — fetch sets it automatically
      // with the correct multipart boundary when body is FormData
      body: formData,
    });

    if (!res.ok) {
      console.error(`[Whisper] transcription failed: ${res.status}`, await res.text());
      return null;
    }

    const data = await res.json();
    return data.text ?? null;

  } catch (err) {
    console.error('[Whisper] transcribeAudio error:', err.message);
    return null;
  }
}