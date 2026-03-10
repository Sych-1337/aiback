import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';

import { tarotRouter } from './routes/tarot';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'ai-backend' });
});

app.use('/tarot', tarotRouter);

app.listen(port, () => {
  console.log(`ai-backend listening on port ${port}`);
});
