import type { IncomingMessage, ServerResponse } from 'http';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

let cached: Handler | null = null;

async function load(): Promise<Handler> {
  if (cached) return cached;
  const mod = await import('../server/src/index.js');
  cached = mod.default as Handler;
  return cached;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await load();
    app(req, res);
  } catch (err: unknown) {
    const e = err as Error;
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        _debug: 'init_failed',
        message: e?.message ?? String(e),
        name: e?.name,
        stack: (e?.stack ?? '').split('\n').slice(0, 10).join(' | '),
      }));
    }
  }
}
