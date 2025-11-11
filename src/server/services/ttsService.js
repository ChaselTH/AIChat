export async function synthesizeSpeech(text) {
  // TODO: Replace with integration to local TTS engine (e.g. CosyVoice, g2p + HiFiGAN, or Edge TTS).
  const base64 = PLACEHOLDER_TTS_BASE64;
  return {
    audio: `data:audio/wav;base64,${base64}`,
    // Mouth openness value (0-1). For a real engine, compute from phoneme durations.
    mouthCue: [
      { time: 0, value: 0 },
      { time: 0.1, value: 1 },
      { time: 0.2, value: 0.3 },
      { time: 0.3, value: 0.9 },
      { time: 0.4, value: 0.2 },
      { time: 0.6, value: 0.8 },
      { time: 0.8, value: 0.4 },
      { time: 1.0, value: 0 }
    ]
  };
}

// Inline sine beep WAV (0.1s @ 8kHz) to avoid bundling binary assets.
// eslint-disable-next-line max-len
const PLACEHOLDER_TTS_BASE64 = [
  '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'
].join('');
