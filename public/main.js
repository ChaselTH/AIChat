const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const conversationEl = document.getElementById('conversation');
const assistantAudioEl = document.getElementById('assistantAudio');
const LIVE2D_MODEL_PATH =
  '/assets/models/hiyori_free_en/runtime/hiyori_free_t08.model3.json';
const LIVE2D_CUBISM_CORE_URL =
  'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js';
const PIXI_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js';
const PIXI_LIVE2D_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.2/dist/pixi-live2d-display.min.js';

const scriptPromises = new Map();

function loadExternalScript(src) {
  if (scriptPromises.has(src)) {
    return scriptPromises.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const absoluteSrc = new URL(src, window.location.href).href;
    const existing = Array.from(document.getElementsByTagName('script')).find(
      (script) => script.src === absoluteSrc
    );

    if (existing) {
      const readyStates = ['complete', 'loaded'];
      if (
        existing.dataset.loaded === 'true' ||
        readyStates.includes(existing.readyState)
      ) {
        existing.dataset.loaded = 'true';
        resolve();
        return;
      }

      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }

      existing.addEventListener('load', () => {
        existing.dataset.loaded = 'true';
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => {
        scriptPromises.delete(src);
        reject(new Error(`无法加载脚本：${src}`));
      }, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = absoluteSrc;
    script.async = true;
    script.dataset.loaded = 'false';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => {
      scriptPromises.delete(src);
      reject(new Error(`无法加载脚本：${src}`));
    };
    document.head.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
}

async function ensurePixiLive2D() {
  if (!window.PIXI) {
    await loadExternalScript(PIXI_SCRIPT_URL);
  }

  if (!window.Live2DCubismCore) {
    await loadExternalScript(LIVE2D_CUBISM_CORE_URL);
  }

  if (!window.PIXI?.live2d?.Live2DModel) {
    await loadExternalScript(PIXI_LIVE2D_SCRIPT_URL);
  }

  if (!window.PIXI?.live2d?.Live2DModel) {
    throw new Error('未能初始化 Live2D 渲染库，请检查网络或脚本引入。');
  }
}

let mediaRecorder;
let audioChunks = [];
let conversation = [];
let pixiApp;
let live2dModel;
let analyser;
let animationFrameId;

startBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.onstart = () => {
      audioChunks = [];
      statusEl.textContent = '录音中…';
      startBtn.disabled = true;
      stopBtn.disabled = false;
    };

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      statusEl.textContent = '识别中…';
      stopBtn.disabled = true;
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await handleVoiceInput(audioBlob);
      startBtn.disabled = false;
      statusEl.textContent = '等待中…';
    };

    mediaRecorder.start();
  } catch (err) {
    console.error(err);
    statusEl.textContent = '无法访问麦克风：' + err.message;
  }
});

stopBtn.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});

async function handleVoiceInput(audioBlob) {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const asrRes = await fetch('/api/asr', {
    method: 'POST',
    body: formData
  });

  if (!asrRes.ok) {
    const error = await asrRes.json();
    throw new Error(error.error || '语音识别失败');
  }

  const asrData = await asrRes.json();
  appendMessage('user', asrData.text);

  const chatMessages = conversation.map(({ role, content }) => ({
    role,
    content
  }));
  chatMessages.push({ role: 'user', content: asrData.text });

  const chatRes = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: chatMessages })
  });

  if (!chatRes.ok) {
    const error = await chatRes.json();
    throw new Error(error.error || '聊天接口失败');
  }

  const chatData = await chatRes.json();
  appendMessage('assistant', chatData.text);

  const ttsRes = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: chatData.text })
  });

  if (!ttsRes.ok) {
    const error = await ttsRes.json();
    throw new Error(error.error || '语音合成失败');
  }

  const ttsData = await ttsRes.json();
  await playAssistantAudio(ttsData);
}

function appendMessage(role, text) {
  conversation.push({ role, content: text });
  const item = document.createElement('div');
  item.className = `message message-${role}`;
  item.innerHTML = `<strong>${role === 'assistant' ? '🤖 助手' : '🧑 用户'}：</strong> ${text}`;
  conversationEl.appendChild(item);
  conversationEl.scrollTop = conversationEl.scrollHeight;
}

async function playAssistantAudio({ audio, mouthCue = [] }) {
  if (!audio) return;
  assistantAudioEl.src = audio;
  await assistantAudioEl.play();
  driveLive2DMouth(mouthCue, assistantAudioEl.duration * 1000);
}

function driveLive2DMouth(mouthCue, durationMs) {
  if (!live2dModel) return;
  cancelAnimationFrame(animationFrameId);

  const keyframes = mouthCue.map((cue) => ({
    time: cue.time * 1000,
    value: cue.value
  }));

  let startTime = null;
  const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const ratio = Math.min(elapsed / durationMs, 1);
    const value = interpolateMouthCue(keyframes, elapsed);
    live2dModel.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', value);
    live2dModel.internalModel.coreModel.setParameterValueById('ParamMouthForm', value);
    if (ratio < 1) {
      animationFrameId = requestAnimationFrame(animate);
    }
  };

  animationFrameId = requestAnimationFrame(animate);
}

function interpolateMouthCue(keyframes, timeMs) {
  if (!keyframes.length) return 0;
  if (timeMs <= keyframes[0].time) return keyframes[0].value;
  if (timeMs >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }
  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const current = keyframes[i];
    const next = keyframes[i + 1];
    if (timeMs >= current.time && timeMs <= next.time) {
      const t = (timeMs - current.time) / (next.time - current.time);
      return current.value + t * (next.value - current.value);
    }
  }
  return 0;
}

async function initLive2D() {
  const canvas = document.getElementById('live2dCanvas');
  try {
    await ensurePixiLive2D();
    if (!pixiApp) {
      pixiApp = new PIXI.Application({
        view: canvas,
        autoStart: true,
        resizeTo: canvas,
        transparent: true
      });
    }

    await ensureLive2DAssets();
    live2dModel = await PIXI.live2d.Live2DModel.from(LIVE2D_MODEL_PATH);
    live2dModel.scale.set(0.5);
    live2dModel.position.set(canvas.width / 2, canvas.height);
    live2dModel.anchor.set(0.5, 1);
    pixiApp.stage.addChild(live2dModel);
  } catch (err) {
    console.warn('无法加载 Live2D 模型：', err);
    statusEl.textContent = `Live2D 模型加载失败：${err.message}`;
  }
}

async function ensureLive2DAssets() {
  const modelUrl = new URL(LIVE2D_MODEL_PATH, window.location.href);
  const response = await fetch(modelUrl);
  if (!response.ok) {
    throw new Error(`模型文件不存在 (HTTP ${response.status})`);
  }

  const settings = await response.json();
  const baseUrl = modelUrl.href.substring(0, modelUrl.href.lastIndexOf('/'));

  const requiredFiles = new Set();
  if (settings?.FileReferences?.Moc) {
    requiredFiles.add(settings.FileReferences.Moc);
  }
  if (Array.isArray(settings?.FileReferences?.Textures)) {
    settings.FileReferences.Textures.forEach((texture) => {
      if (texture) {
        requiredFiles.add(texture);
      }
    });
  }
  if (settings?.FileReferences?.Physics) {
    requiredFiles.add(settings.FileReferences.Physics);
  }
  if (settings?.FileReferences?.DisplayInfo) {
    requiredFiles.add(settings.FileReferences.DisplayInfo);
  }

  const motions = settings?.FileReferences?.Motions || {};
  Object.values(motions).forEach((motionGroup) => {
    motionGroup.forEach((motion) => {
      if (motion?.File) {
        requiredFiles.add(motion.File);
      }
    });
  });

  await Promise.all(
    Array.from(requiredFiles).map(async (filePath) => {
      const assetUrl = `${baseUrl}/${filePath}`;
      let headResponse;
      try {
        headResponse = await fetch(assetUrl, { method: 'HEAD' });
      } catch (err) {
        throw new Error(`无法请求模型依赖文件：${filePath}`);
      }

      if (!headResponse.ok) {
        if (headResponse.status === 405 || headResponse.status === 501) {
          const getResponse = await fetch(assetUrl, { method: 'GET' });
          if (!getResponse.ok) {
            throw new Error(`缺少模型依赖文件：${filePath}`);
          }
        } else {
          throw new Error(`缺少模型依赖文件：${filePath}`);
        }
      }
    })
  );
}

function initAudioAnalyser() {
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaElementSource(assistantAudioEl);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
}

document.addEventListener('DOMContentLoaded', async () => {
  await initLive2D();
  initAudioAnalyser();
});
