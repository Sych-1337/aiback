import { EnergyScores } from '../domain/energyScores';
import {
  TarotCardExplanation,
  TarotCombinationExplanation,
  TarotInterpretation,
} from '../domain/tarotInterpretation';
import { AppId } from '../config/appConfig';

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
    const { cards } = params;

    const energy = new EnergyScores(70, 50, 80, 30, 65);

    const cardExplanations = cards.map(
      (name, index) =>
        new TarotCardExplanation(
          index === 0 ? 'Прошлое' : index === 1 ? 'Настоящее' : 'Будущее',
          name,
          ['демо', 'карта'],
          'Заглушка значения карты. Здесь позже будет текст от AI.',
          'Заглушка теневого аспекта.',
        ),
    );

    const combinations: TarotCombinationExplanation[] = [];

    return new TarotInterpretation(
      'Демонстрационное чтение',
      'Это демо-ответ без реального AI. Позже здесь будет живая интерпретация по картам и вопросу.',
      cardExplanations,
      cards.slice(0, 2),
      combinations,
      energy,
      ['Сохраняй любопытство.', 'Замечай, как откликается текст.'],
      ['Не принимай это за прогноз будущего.'],
      'Я открыта мягким подсказкам и собственной интуиции.',
      [
        'Что сейчас мешает мне двигаться вперёд?',
        'Какой следующий шаг самый мягкий для меня?',
        'Что я пока не замечаю в этой ситуации?',
      ],
      0.3,
      ['Используется демо-режим без настоящего AI.'],
      'Это демонстрационное чтение. В продакшене ответы будет формировать AI и они не являются гарантией будущего.',
    );
  }
}
