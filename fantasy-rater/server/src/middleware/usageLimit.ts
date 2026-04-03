import type { Request, Response, NextFunction } from 'express';

interface DailyUsage {
  trade: number;
  team: number;
  startsit: number;
  lineup: number;
  chat: number;
  date: string;
}

const usage = new Map<string, DailyUsage>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function checkUsage(action: 'trade' | 'team' | 'startsit' | 'lineup' | 'chat', limit: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.userTier === 'pro') return next();

    const userId = req.userId!;
    const d = today();
    const u = usage.get(userId);

    if (!u || u.date !== d) {
      usage.set(userId, { trade: 0, team: 0, startsit: 0, lineup: 0, chat: 0, date: d });
    }

    const current = usage.get(userId)!;
    if (current[action] >= limit) {
      return res.status(402).json({
        error: 'upgrade_required',
        message: `Free tier limit: ${limit} ${action} per day`,
      });
    }

    current[action]++;
    return next();
  };
}
