# AI 语音对话机器人（基础框架）

这是一个面向网页端的 AI 语音对话机器人基础工程，包含以下环节的骨架代码：

- 浏览器端录音并上传
- 语音实时识别（ASR）接口占位
- 对接 GPT 语言模型的对话接口
- 文字转语音（TTS）接口占位，并返回嘴型关键帧数据
- Live2D 角色，根据音频嘴型关键帧联动表情

> **注意**：目前 ASR 与 TTS 均为占位实现，需要接入真实的语音识别与语音合成引擎。

## 快速开始

```bash
npm install
npm run dev
```

服务默认运行在 `http://localhost:3000`。

## 目录结构

```
.
├── package.json
├── public
│   ├── index.html          # 前端页面，包含 Live2D、录音 UI
│   ├── main.js             # 录音、接口调用、Live2D 嘴型驱动逻辑
│   ├── styles.css          # 页面样式
│   └── assets/models       # 放置 Live2D 模型（model3.json）
└── src
    └── server
        ├── index.js        # Express 服务器入口，暴露 /api/* 接口
        ├── config.js       # 环境变量读取
        └── services        # ASR/GPT/TTS 服务占位实现
```

## 接入指引

### 1. 语音识别（ASR）

`src/server/services/asrService.js` 中的 `transcribeAudio` 函数目前直接返回示例文本。可以在此处接入本地或云端语音识别，例如：

- OpenAI Whisper 本地部署
- Vosk / FunASR / 讯飞实时语音识别
- 科大讯飞、阿里、百度等流式识别 API

建议在此函数中根据返回结果构造 `{ text, confidence }`。

### 2. GPT 对话

`src/server/services/chatService.js` 使用 `OPENAI_API_KEY` 环境变量，默认调用 `gpt-4o-mini`。如果没有配置 key，则会返回占位文本。你可以：

- 设置 `OPENAI_API_KEY` 即可直接使用 OpenAI 官方接口
- 替换为其他模型提供商（DeepSeek、智谱等）时，保持 `generateAssistantReply` 的返回格式即可

前端会维护一份消息历史作为 `messages` 发给后端。

### 3. 文字转语音（TTS）

`src/server/services/ttsService.js` 当前内置了一个 **Base64 字符串形式** 的占位哔声，同时给出一个示例的嘴型关键帧（`mouthCue` 数组）。
之所以改为 Base64，是为了避免项目中引入真实的二进制音频文件，方便在不支持二进制附件的环境下直接运行。
你可以将其替换为：

- 本地 CosyVoice、GPT-SoVITS 等 TTS
- Edge TTS、火山语音、Azure Speech 等

为了驱动 Live2D 嘴型，建议返回形如：

```json
{
  "audio": "data:audio/wav;base64,...",
  "mouthCue": [
    { "time": 0.0, "value": 0.0 },
    { "time": 0.15, "value": 0.8 },
    { "time": 0.30, "value": 0.1 }
  ]
}
```

其中 `time` 为秒，`value` 为 0~1 的嘴型开合程度，可按音素持续时间转换。
如果你的 TTS 接口直接返回二进制流，可在服务端将 `Buffer` 调用 `toString('base64')` 后拼成 `data:audio/wav;base64,...` 再返回给前端，
即可兼容当前占位逻辑。

### 4. Live2D 模型

- 将 `.model3.json` 及其依赖资源拷贝到 `public/assets/models/<your-model>/`
- 修改 `public/main.js` 中的 `LIVE2D_MODEL_PATH`
- 如果需要表情、动作等高级控制，可在 Live2D 模型加载后访问 `live2dModel.internalModel` 进行扩展

### 5. 前端扩展

- `main.js` 中使用 `MediaRecorder` 录音，如需更低延迟可改为 `WebRTC` + 流式接口
- 当前为串行流程：识别 → GPT → TTS，你可以结合 `Promise.all` 或 WebSocket 进行并行优化
- 可以在 `playAssistantAudio` 中接入能量值分析，让嘴型更自然

## 下一步建议

1. 替换 ASR/TTS 占位逻辑，接入真实的语音能力
2. 增加 WebSocket 通道，实现实时语音转写 & 文本流式回复
3. 根据 Live2D 模型支持更多参数（眨眼、表情、动作）
4. 做好异常处理与错误提示，比如网络中断、接口超时等

欢迎基于该框架继续迭代，打造属于你的 AI 语音 Live2D 助手！
