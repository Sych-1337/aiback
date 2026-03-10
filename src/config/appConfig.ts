export type AppId = 'tarot' | 'plant' | 'default';

export interface AppConfig {
  id: AppId;
  name: string;
  openaiKeyEnv: string;
}

const configs: Record<AppId, AppConfig> = {
  tarot: {
    id: 'tarot',
    name: 'Mystic Tarot AI',
    openaiKeyEnv: 'OPENAI_API_KEY_TAROT',
  },
  plant: {
    id: 'plant',
    name: 'Plant Doctor',
    openaiKeyEnv: 'OPENAI_API_KEY_PLANT',
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
  return process.env[cfg.openaiKeyEnv];
}
