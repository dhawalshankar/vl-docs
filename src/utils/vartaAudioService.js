/**
 * Varta Audio Service
 * Natural Speech Synthesis powered by Sarvam AI Bulbul TTS API
 * with high-quality natural fallback for zero-latency local experience.
 */

let currentAudio = null;

function base64ToBlob(base64Data, contentType = 'audio/wav') {
  const byteCharacters = atob(base64Data);
  const byteArrays = [];
  const sliceSize = 512;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, {type: contentType});
}

/**
 * Clean markdown and technical markup into natural speakable text
 */
export function prepareTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/\[\[.*?\]\]/g, '') // remove citation tags
    .replace(/https?:\/\/\S+/g, 'link') // replace URLs
    .replace(/[`*_#~>|]/g, '') // strip markdown symbols
    .replace(/\(.*?\)/g, '') // remove parenthesized links/notes
    .replace(/docs\/[a-zA-Z0-9\-_./]+/g, 'documentation')
    .replace(/Lines?\s+\d+[-–]\d+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 450); // Sarvam Bulbul accepts up to 500-2500 chars
}

/**
 * Stop any ongoing audio playback
 */
export function stopAudioPlayback() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
  }
}

/**
 * Synthesizes natural human Indian voice using Sarvam Bulbul TTS
 */
export async function speakWithSarvamTTS({
  text,
  apiKey,
  speaker = 'meera',
  model = 'bulbul:v3',
  onStart,
  onEnd,
  onError,
}) {
  stopAudioPlayback();
  const speakableText = prepareTextForSpeech(text);
  if (!speakableText) return;

  if (apiKey && apiKey.trim()) {
    try {
      if (onStart) onStart();

      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey.trim(),
        },
        body: JSON.stringify({
          text: speakableText,
          target_language_code: 'en-IN',
          speaker: speaker || 'meera',
          model: model || 'bulbul:v3',
          pace: 1.04,
          speech_sample_rate: 24000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Sarvam TTS error ${response.status}`);
      }

      const json = await response.json();
      const base64Audio = json.audios?.[0];
      if (base64Audio) {
        const audioBlob = base64ToBlob(base64Audio, 'audio/wav');
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudio = audio;

        audio.onended = () => {
          currentAudio = null;
          URL.revokeObjectURL(audioUrl);
          if (onEnd) onEnd();
        };

        audio.onerror = (e) => {
          currentAudio = null;
          if (onError) onError(e);
          if (onEnd) onEnd();
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn('[VartaTTS] Sarvam TTS failed, falling back to natural browser speech:', err);
    }
  }

  // Fallback: Natural browser speech with humanized Indian English voice selection
  speakWithNaturalBrowserVoice({
    text: speakableText,
    onStart,
    onEnd,
  });
}

/**
 * Natural browser speech fallback that prioritizes warm, expressive voices
 * instead of robotic default system voices.
 */
export function speakWithNaturalBrowserVoice({text, onStart, onEnd}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }

  stopAudioPlayback();
  const speakableText = prepareTextForSpeech(text);
  if (!speakableText) return;

  const utterance = new SpeechSynthesisUtterance(speakableText);

  // Load available voices and find the warmest natural voice
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice =
    voices.find((v) => v.lang === 'en-IN' && !v.name.includes('David')) ||
    voices.find((v) => v.name.includes('India') || v.name.includes('Heera')) ||
    voices.find((v) => v.name.includes('Natural') || v.name.includes('Google UK English Female')) ||
    voices.find((v) => v.name.includes('Google हिन्दी') || v.name.includes('Zira')) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.pitch = 1.05;
  utterance.rate = 1.0;
  utterance.volume = 1.0;

  utterance.onstart = () => {
    if (onStart) onStart();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}
