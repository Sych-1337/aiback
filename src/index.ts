import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';

import { hasOpenAiApiKey } from './config/appConfig';
import { tarotRouter } from './routes/tarot';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'ai-backend',
    version: 'v1',
    transport: 'openai-gateway',
    apps: {
      tarot: {
        aiReady: hasOpenAiApiKey('tarot'),
      },
      default: {
        aiReady: hasOpenAiApiKey('default'),
      },
    },
  });
});

app.use('/tarot', tarotRouter);
app.use('/', tarotRouter);

app.listen(port, () => {
  console.log(`ai-backend listening on port ${port}`);
});
