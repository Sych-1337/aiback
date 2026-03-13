import { AppId, getOpenAiApiKey } from '../config/appConfig';

export interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface TarologistDto {
  name: string;
  voiceStyle: string;
}

export interface LastReadingDto {
  question: string;
}

export interface ChatRequest {
  messages: ChatMessageDto[];
  tarologist: TarologistDto;
  lastReading?: LastReadingDto | null;
}

const VOICE_STYLE_PROMPTS: Record<string, string> = {
  wise: 'You are wise, vivid, and slightly ironic. Answer in an elaborate but clear way, with a touch of wit.',
  clear: 'You are clear and to the point, no extra mystique. Give direct, structured advice.',
  tarot: 'You are a tarot mentor: structure your answers around cards and spreads when relevant.',
  warm: 'You are warm and supportive. Use a gentle, encouraging tone.',
  soft: 'You are soft and intuitive. Guide through images and gentle suggestions.',
};

const SAFETY_SYSTEM =
  'Do not promise guaranteed future outcomes. Do not give medical, legal, or financial advice. ' +
  'If the question suggests crisis, self-harm, or danger, gently suggest real-world support instead of divination. ' +
  'Respond in English only.';

export async function getChatReply(params: {
  appId?: AppId;
  request: ChatRequest;
}): Promise<string> {
  const apiKey = getOpenAiApiKey(params.appId);
  if (!apiKey) {
    throw new Error('OpenAI API key not configured for this app.');
  }

  const { messages, tarologist, lastReading } = params.request;
  const voicePrompt =
    VOICE_STYLE_PROMPTS[tarologist.voiceStyle] ??
    VOICE_STYLE_PROMPTS.soft;

  let systemContent = `You are ${tarologist.name}, a tarot and divination guide in the Mystic Tarot app. ${voicePrompt} ${SAFETY_SYSTEM}`;
  if (lastReading?.question) {
    systemContent += `\n\nThe user has a recent reading in their journal with the question: "${lastReading.question}". You may refer to it when relevant.`;
  }

  const openAiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const model = process.env.OPENAI_MODEL_CHAT || process.env.OPENAI_MODEL_TAROT || 'gpt-4o-mini';
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || '25000') || 25000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        max_tokens: 800,
        messages: openAiMessages,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err?.name === 'AbortError') {
      throw new Error(`Chat timeout after ${timeoutMs}ms`);
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data: any = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('No content in OpenAI chat response');
  }
  return text;
}
