import { Router, Request, Response } from 'express';

import { GptTarotService } from '../services/gptTarotService';

const service = new GptTarotService();

export const tarotRouter = Router();

// Demo endpoint: structured AI interpretation for 3-card reading (no real GPT yet)
tarotRouter.post('/v1/readings/demo-interpret', async (req: Request, res: Response) => {
  try {
    const appIdHeader = (req.header('x-app-id') || 'tarot') as string;
    const { question, topic, spread, cards, tone } = req.body ?? {};

    if (!question || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        error: 'question and cards[] are required',
      });
    }

    const interpretation = await service.interpretThreeCard({
      appId: appIdHeader as any,
      question,
      topic: topic ?? 'general',
      spread: spread ?? 'ppf',
      cards,
      tone: tone ?? 'soft',
    });

    res.json({
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
    console.error(err);
    res.status(500).json({ error: 'internal_error' });
  }
});
