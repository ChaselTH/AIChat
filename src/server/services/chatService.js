import OpenAI from 'openai';
import { config } from '../config.js';

let openAiClient;
if (config.openAiApiKey) {
  openAiClient = new OpenAI({ apiKey: config.openAiApiKey });
}

export async function generateAssistantReply(messages) {
  if (!messages?.length) {
    throw new Error('messages required');
  }

  if (!openAiClient) {
    return {
      text: '（GPT 待接入）这是一个示例回答。',
      model: 'stub'
    };
  }

  const completion = await openAiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.6
  });

  const choice = completion.choices?.[0];
  return {
    text: choice?.message?.content ?? '',
    model: completion.model
  };
}
