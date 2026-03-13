import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

import { GptTarotService } from '../services/gptTarotService';
import { getChatReply } from '../services/chatService';

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

async function handleChat(req: Request, res: Response) {
  const requestId = randomUUID();
  const appIdHeader = String(req.header('x-app-id') || 'tarot');
  try {
    const body = req.body ?? {};
    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content).trim() }))
      : [];
    const tarologist = body.tarologist && typeof body.tarologist.name === 'string'
      ? {
          name: String(body.tarologist.name).trim(),
          voiceStyle: typeof body.tarologist.voiceStyle === 'string' ? String(body.tarologist.voiceStyle).trim() : 'soft',
        }
      : { name: 'Guide', voiceStyle: 'soft' };
    const lastReading =
      body.lastReading && typeof body.lastReading.question === 'string'
        ? { question: String(body.lastReading.question).trim() }
        : undefined;

    if (messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required with at least one message', requestId });
    }

    const text = await getChatReply({
      appId: appIdHeader as any,
      request: { messages, tarologist, lastReading: lastReading || null },
    });

    res.json({ requestId, text });
  } catch (err) {
    console.error('chat failed', {
      requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    const status = err instanceof Error && err.message.includes('timeout') ? 504 : 500;
    res.status(status).json({
      error: err instanceof Error ? err.message : 'internal_error',
      requestId,
    });
  }
}

tarotRouter.post('/v1/chat', handleChat);
