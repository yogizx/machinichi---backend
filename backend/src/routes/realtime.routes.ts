import { Router, Request, Response } from 'express';
import { addRealtimeClient, removeRealtimeClient } from '../services/realtime.service';

const router = Router();

// Admin-authenticated SSE stream for product analytics
// Frontend Detailed View subscribes to this to get real-time card updates
router.get('/product-analytics/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // CORS headers are already set by global cors middleware; need to flush
  res.flushHeaders?.();

  const idsParam = req.query.ids as string | undefined;
  const ids = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;

  const client = addRealtimeClient(res, ids);

  // keep-alive ping
  const ping = setInterval(() => {
    try { res.write(`: ping\n\n`); } catch { clearInterval(ping); }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    removeRealtimeClient(client);
    res.end();
  });
});

export default router;
