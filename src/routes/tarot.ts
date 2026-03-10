import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

import { GptTarotService } from '../services/gptTarotService';

const service = new GptTarotService();

export const tarotRouter = Router();

async function handleInterpret(req: Request, res: Response) {
  try {
    const requestId = randomUUID();
    const appIdHeader = String(req.header('x-app-id') || 'tarot');
    const { question, topic, spread, cards, tone } = req.body ?? {};

    const normalizedQuestion = typeof question === 'string' ? question.trim() : '';
    const normalizedCards = Array.isArray(cards)
      ? cards.map((card) => String(card).trim()).filter(Boolean).slice(0, 3)
      : [];
    const normalizedTopic =
      typeof topic === 'string' && topic.trim().length > 0 ? topic.trim() : 'general';
    const normalizedSpread =
      typeof spread === 'string' && spread.trim().length > 0 ? spread.trim() : 'ppf';
    const normalizedTone =
      typeof tone === 'string' && tone.trim().length > 0 ? tone.trim() : 'soft';

    if (!normalizedQuestion || normalizedQuestion.length < 10) {
      return res.status(400).json({
        error: 'question must be at least 10 characters',
        requestId,
      });
    }

    if (normalizedCards.length === 0) {
      return res.status(400).json({
        error: 'cards[] are required',
        requestId,
      });
    }

    const interpretation = await service.interpretThreeCard({
      appId: appIdHeader as any,
      question: normalizedQuestion,
      topic: normalizedTopic,
      spread: normalizedSpread,
      cards: normalizedCards,
      tone: normalizedTone,
    });

    res.json({
      requestId,
      overall: {
        title: interpretation.overallTitle,
        text: interpretation.overallText,
      },
      cards: interpretation.cards.map((c) => ({
        position: c.position,
        name: c.name,
        keywords: c.keywords,
        meaning: c.meaning,
        shadow: c.shadow,
      })),
      keyCards: interpretation.keyCards,
      combinations: interpretation.combinations.map((c) => ({
        pair: c.pair,
        meaning: c.meaning,
      })),
      energy: {
        love: interpretation.energy.love,
        career: interpretation.energy.career,
        growth: interpretation.energy.growth,
        conflict: interpretation.energy.conflict,
        clarity: interpretation.energy.clarity,
      },
      advice: {
        do: interpretation.adviceDo,
        avoid: interpretation.adviceAvoid,
        affirmation: interpretation.affirmation,
      },
      followups: interpretation.followups,
      confidence: {
        score: interpretation.confidenceScore,
        reasons: interpretation.confidenceReasons,
      },
      safety: {
        disclaimer: interpretation.disclaimer,
      },
    });
  } catch (err) {
    const requestId = randomUUID();
    console.error('tarot interpret failed', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'internal_error', requestId });
  }
}

tarotRouter.post('/v1/readings/interpret', handleInterpret);
tarotRouter.post('/v1/readings/demo-interpret', handleInterpret);
