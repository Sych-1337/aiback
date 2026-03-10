import { EnergyScores } from '../domain/energyScores';
import {
  TarotCardExplanation,
  TarotCombinationExplanation,
  TarotInterpretation,
} from '../domain/tarotInterpretation';
import { AppId, getOpenAiApiKey } from '../config/appConfig';

enum GptTransport {
  direct = 'direct',
  backend = 'backend',
}

export class GptTarotService {
  constructor(public readonly transport: GptTransport = GptTransport.direct) {}

  async interpretThreeCard(params: {
    appId?: AppId;
    question: string;
    topic: string;
    spread: string;
    cards: string[];
    tone: string;
  }): Promise<TarotInterpretation> {
    if (this.looksLikeSensitiveCrisisQuestion(params.question)) {
      return this.safeSupportInterpretation(params);
    }

    try {
      const ai = await this.callOpenAi(params);
      if (ai) {
        return this.fromAiJson(ai, params);
      }
    } catch (err) {
      console.error('AI tarot interpretation failed, falling back safely:', this.describeError(err));
    }

    return this.demoInterpretation(params);
  }

  private async callOpenAi(params: {
    appId?: AppId;
    question: string;
    topic: string;
    spread: string;
    cards: string[];
    tone: string;
  }): Promise<any | undefined> {
    const apiKey = getOpenAiApiKey(params.appId);
    if (!apiKey) {
      console.warn('No OpenAI API key configured for app, using demo interpretation.');
      return undefined;
    }

    const fetchFn: any = (globalThis as any).fetch;
    if (!fetchFn) {
      console.warn('Global fetch is not available, using demo interpretation.');
      return undefined;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const prompt = `
Ты — продвинутый таролог-ассистент на русском языке. Проанализируй расклад из трёх карт для пользователя.

Правила безопасности:
- не обещай гарантированного будущего;
- не выдавай медицинские, юридические или финансовые указания;
- если вопрос звучит как кризис, самоповреждение, безысходность или опасность для жизни, не делай таро-интерпретацию и вместо этого мягко посоветуй обратиться к живой поддержке;
- текст должен быть поддерживающим, ясным и не драматизирующим.

Верни СТРОГО JSON-объект без комментариев и лишнего текста, в следующем формате (ключи на английском):
{
  "overallTitle": "краткий заголовок",
  "overallText": "объёмный связный текст-интерпретация",
  "cards": [
    {
      "position": "Прошлое | Настоящее | Будущее",
      "name": "Название карты",
      "keywords": ["слово1", "слово2"],
      "meaning": "основной смысл карты в контексте вопроса",
      "shadow": "теневой аспект / риски"
    }
  ],
  "keyCards": ["названия ключевых карт"],
  "combinations": [
    {
      "pair": ["Карта 1", "Карта 2"],
      "meaning": "краткое описание сочетания"
    }
  ],
  "energy": {
    "love": 0-100,
    "career": 0-100,
    "growth": 0-100,
    "conflict": 0-100,
    "clarity": 0-100
  },
  "adviceDo": ["список конкретных мягких шагов"],
  "adviceAvoid": ["чего лучше избегать"],
  "affirmation": "одна короткая аффирмация",
  "followups": ["дополнительные вопросы для саморефлексии"],
  "confidenceScore": число от 0 до 1,
  "confidenceReasons": ["что усиливает или снижает уверенность"],
  "disclaimer": "мягкий дисклеймер об ответственности и том, что это не прогноз будущего"
}

Входные данные:
- Вопрос: "${this.escapeForPrompt(params.question)}"
- Тема: "${params.topic}"
- Расклад: "${params.spread}" (3 карты: прошлое / настоящее / будущее)
- Карты (подставь реальные значения, если знаешь, иначе используй имена как есть): ${JSON.stringify(params.cards)}
- Тон ответа: "${params.tone}" (soft / clear / mystic, но текст всегда бережный и поддерживающий).
`;

    let response: any;
    try {
      response = await fetchFn('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL_TAROT || 'gpt-4.1-mini',
          temperature: 0.7,
          messages: [
            {
              role: 'system',
              content:
                'You are a careful tarot assistant that returns strict JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();
      console.error('OpenAI error response:', text.slice(0, 500));
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      return this.normalizeAiJson(JSON.parse(content));
    } catch (e) {
      console.error('Failed to parse OpenAI JSON content:', this.describeError(e));
      throw e;
    }
  }

  private fromAiJson(ai: any, params: {
    appId?: AppId;
    question: string;
    topic: string;
    spread: string;
    cards: string[];
    tone: string;
  }): TarotInterpretation {
    const cardsJson: any[] = Array.isArray(ai.cards) ? ai.cards : [];
    const combinationsJson: any[] = Array.isArray(ai.combinations) ? ai.combinations : [];
    const energyJson: any = ai.energy ?? {};

    const cards = cardsJson.map(
      (c, index) =>
        new TarotCardExplanation(
          c.position ?? (index === 0 ? 'Прошлое' : index === 1 ? 'Настоящее' : 'Будущее'),
          c.name ?? params.cards[index] ?? `Карта ${index + 1}`,
          Array.isArray(c.keywords) ? c.keywords.map((k: any) => String(k)) : [],
          c.meaning ?? '',
          c.shadow ?? '',
        ),
    );

    const combinations: TarotCombinationExplanation[] = combinationsJson.map(
      (c) =>
        new TarotCombinationExplanation(
          Array.isArray(c.pair) ? c.pair.map((p: any) => String(p)) : [],
          c.meaning ?? '',
        ),
    );

    const energy = new EnergyScores(
      Number(energyJson.love ?? 0),
      Number(energyJson.career ?? 0),
      Number(energyJson.growth ?? 0),
      Number(energyJson.conflict ?? 0),
      Number(energyJson.clarity ?? 0),
    );

    const adviceDo: string[] = Array.isArray(ai.adviceDo)
      ? ai.adviceDo.map((a: any) => String(a))
      : [];
    const adviceAvoid: string[] = Array.isArray(ai.adviceAvoid)
      ? ai.adviceAvoid.map((a: any) => String(a))
      : [];
    const followups: string[] = Array.isArray(ai.followups)
      ? ai.followups.map((f: any) => String(f))
      : [];
    const confidenceReasons: string[] = Array.isArray(ai.confidenceReasons)
      ? ai.confidenceReasons.map((r: any) => String(r))
      : [];

    return new TarotInterpretation(
      ai.overallTitle ?? 'Расклад от AI',
      ai.overallText ?? '',
      cards,
      Array.isArray(ai.keyCards) ? ai.keyCards.map((k: any) => String(k)) : [],
      combinations,
      energy,
      adviceDo,
      adviceAvoid,
      ai.affirmation ?? '',
      followups,
      typeof ai.confidenceScore === 'number' ? ai.confidenceScore : 0.7,
      confidenceReasons,
      ai.disclaimer ??
        'Этот расклад — приглашение к саморефлексии, а не прогноз будущего. Принимай решения, опираясь на себя и реальность.',
    );
  }

  private normalizeAiJson(ai: any): any {
    const clampScore = (value: any, min: number, max: number, fallback: number) => {
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num)) return fallback;
      return Math.max(min, Math.min(max, num));
    };

    const safeList = (value: any, maxItems = 5): string[] =>
      Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, maxItems) : [];

    const safeCards = Array.isArray(ai.cards)
      ? ai.cards.slice(0, 3).map((card: any) => ({
          position: String(card?.position ?? '').trim(),
          name: String(card?.name ?? '').trim(),
          keywords: safeList(card?.keywords, 4),
          meaning: String(card?.meaning ?? '').trim(),
          shadow: String(card?.shadow ?? '').trim(),
        }))
      : [];

    const safeCombinations = Array.isArray(ai.combinations)
      ? ai.combinations.slice(0, 3).map((item: any) => ({
          pair: safeList(item?.pair, 3),
          meaning: String(item?.meaning ?? '').trim(),
        }))
      : [];

    return {
      overallTitle: String(ai?.overallTitle ?? '').trim(),
      overallText: String(ai?.overallText ?? '').trim(),
      cards: safeCards,
      keyCards: safeList(ai?.keyCards, 3),
      combinations: safeCombinations,
      energy: {
        love: clampScore(ai?.energy?.love, 0, 100, 50),
        career: clampScore(ai?.energy?.career, 0, 100, 50),
        growth: clampScore(ai?.energy?.growth, 0, 100, 50),
        conflict: clampScore(ai?.energy?.conflict, 0, 100, 50),
        clarity: clampScore(ai?.energy?.clarity, 0, 100, 50),
      },
      adviceDo: safeList(ai?.adviceDo, 4),
      adviceAvoid: safeList(ai?.adviceAvoid, 4),
      affirmation: String(ai?.affirmation ?? '').trim(),
      followups: safeList(ai?.followups, 3),
      confidenceScore: clampScore(ai?.confidenceScore, 0, 1, 0.7),
      confidenceReasons: safeList(ai?.confidenceReasons, 4),
      disclaimer: String(ai?.disclaimer ?? '').trim(),
    };
  }

  private looksLikeSensitiveCrisisQuestion(question: string): boolean {
    const normalized = question.toLowerCase();
    const markers = [
      'хочу умереть',
      'не хочу жить',
      'покончить с собой',
      'самоуб',
      'самоповреж',
      'вены',
      'таблетк',
      'убить себя',
      'не вижу смысла жить',
    ];
    return markers.some((marker) => normalized.includes(marker));
  }

  private safeSupportInterpretation(params: {
    appId?: AppId;
    question: string;
    topic: string;
    spread: string;
    cards: string[];
    tone: string;
  }): TarotInterpretation {
    const energy = new EnergyScores(40, 30, 20, 70, 35);
    const cards = params.cards.slice(0, 3).map(
      (name, index) =>
        new TarotCardExplanation(
          index === 0 ? 'Прошлое' : index === 1 ? 'Настоящее' : 'Будущее',
          name,
          ['поддержка', 'бережность'],
          'Сейчас важнее не символический разбор карты, а живая поддержка и безопасность.',
          'Если внутри много боли или опасных импульсов, не оставайся с этим в одиночку.',
        ),
    );

    return new TarotInterpretation(
      'Сейчас важнее поддержка, чем расклад',
      'Я не буду делать обычную таро-интерпретацию для такого запроса. Если тебе небезопасно или есть риск причинить себе вред, пожалуйста, сразу обратись к близкому человеку, местной кризисной линии или экстренной помощи.',
      cards,
      [],
      [],
      energy,
      [
        'Свяжись с живым человеком, которому доверяешь, прямо сейчас.',
        'Если есть риск немедленного вреда, обратись в экстренную службу или кризисную помощь.',
      ],
      [
        'Не оставайся в одиночку с опасными мыслями.',
        'Не используй расклад как замену живой поддержке.',
      ],
      'Я заслуживаю живой помощи и поддержки прямо сейчас.',
      [
        'Кому я могу написать или позвонить прямо сейчас?',
        'Как сделать ближайший час безопаснее для себя?',
        'Какая живая поддержка доступна мне сегодня?',
      ],
      0.95,
      ['Запрос содержит признаки кризисной темы, поэтому ответ переключён в режим поддержки.'],
      'Если есть риск немедленного вреда себе или другим, обратись в местную экстренную помощь прямо сейчас.',
    );
  }

  private escapeForPrompt(text: string): string {
    return text.split('"').join('\\"').trim();
  }

  private describeError(err: unknown): string {
    if (err instanceof Error) return `${err.name}: ${err.message}`;
    return String(err);
  }

  private demoInterpretation(params: {
    appId?: AppId;
    question: string;
    topic: string;
    spread: string;
    cards: string[];
    tone: string;
  }): TarotInterpretation {
    const { cards } = params;

    const energy = new EnergyScores(70, 50, 80, 30, 65);

    const cardExplanations = cards.map(
      (name, index) =>
        new TarotCardExplanation(
          index === 0 ? 'Прошлое' : index === 1 ? 'Настоящее' : 'Будущее',
          name,
          ['карта', 'пример'],
          'Интерпретация в демо-режиме. Подключи ключ OpenAI, чтобы получать живые ответы.',
          'Теневой аспект будет раскрыт полнее в режиме реального AI.',
        ),
    );

    const combinations: TarotCombinationExplanation[] = [];

    return new TarotInterpretation(
      'Чтение в демо-режиме',
      'Сейчас используется демонстрационный режим без запроса к AI. Как только появится ключ OpenAI, здесь будут живые тексты, собранные под твой вопрос.',
      cardExplanations,
      cards.slice(0, 2),
      combinations,
      energy,
      ['Отслеживай свои ощущения от текста.', 'Замечай, какие фразы особенно откликаются.'],
      ['Не воспринимай это как точный прогноз.', 'Не принимай решения, опираясь только на карты.'],
      'Я доверяю себе и бережно отношусь к своим решениям.',
      [
        'Что сейчас мешает мне двигаться вперёд?',
        'Какой следующий шаг самый мягкий для меня?',
        'Что я пока не замечаю в этой ситуации?',
      ],
      0.3,
      ['Используется демо-режим без настоящего AI.'],
      'Карты и интерпретации — инструмент саморефлексии, а не предсказания будущего. В сложных ситуациях обращайся за помощью к живым специалистам.',
    );
  }
}
