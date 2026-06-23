import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const startTime = Date.now();

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: Date.now() - startTime, mode: 'serverless' });
});

app.get('/api/debug', (_req, res) => {
  res.json({ ok: true, url: _req.url, path: _req.path, method: _req.method });
});

export default app;
