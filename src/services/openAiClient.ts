import { AppId, getOpenAiApiKey } from '../config/appConfig';

export class OpenAiClient {
  constructor(private readonly appId: AppId | undefined) {}

  private get apiKey(): string {
    const key = getOpenAiApiKey(this.appId);
    if (!key) {
      throw new Error(`OPENAI_API_KEY for app "${this.appId ?? 'default'}" is not configured`);
    }
    return key;
  }

  // TODO: подключить реальный вызов OpenAI Responses API.
  // Оставляем заглушку, чтобы сейчас не ломать окружение.
  // Пример сигнатуры:
  // async responses(payload: { model: string; input: unknown }): Promise<unknown> { ... }
}
