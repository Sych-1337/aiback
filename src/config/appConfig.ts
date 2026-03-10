export type AppId = 'tarot' | 'plant' | 'default';

export interface AppConfig {
  id: AppId;
  name: string;
  openaiKeyEnv: string;
  fallbackOpenAiKeyEnv?: string;
}

const configs: Record<AppId, AppConfig> = {
  tarot: {
    id: 'tarot',
    name: 'Mystic Tarot AI',
    openaiKeyEnv: 'OPENAI_API_KEY_TAROT',
    fallbackOpenAiKeyEnv: 'OPENAI_API_KEY',
  },
  plant: {
    id: 'plant',
    name: 'Plant Doctor',
    openaiKeyEnv: 'OPENAI_API_KEY_PLANT',
    fallbackOpenAiKeyEnv: 'OPENAI_API_KEY',
  },
  default: {
    id: 'default',
    name: 'Default AI App',
    openaiKeyEnv: 'OPENAI_API_KEY',
  },
};

export function getAppConfig(appId?: string | null): AppConfig {
  const key = (appId ?? 'default') as AppId;
  return configs[key] ?? configs.default;
}

export function getOpenAiApiKey(appId?: string | null): string | undefined {
  const cfg = getAppConfig(appId);
  return process.env[cfg.openaiKeyEnv] || (cfg.fallbackOpenAiKeyEnv ? process.env[cfg.fallbackOpenAiKeyEnv] : undefined);
}

export function hasOpenAiApiKey(appId?: string | null): boolean {
  return Boolean(getOpenAiApiKey(appId));
}
