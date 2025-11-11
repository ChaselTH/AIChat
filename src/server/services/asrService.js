import fs from 'fs/promises';

/**
 * Placeholder speech recognition service.
 * Replace with integration to a real-time ASR engine (e.g. Whisper, Vosk, FunASR).
 */
export async function transcribeAudio(filePath) {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.size) {
      throw new Error('Empty audio file');
    }
  } catch (err) {
    console.warn('[asrService] Unable to inspect audio file', err);
  }

  // TODO: Integrate with actual speech-to-text service
  return {
    text: '（ASR 待接入）你好，我已经收到你的语音啦！',
    confidence: 0.5
  };
}
