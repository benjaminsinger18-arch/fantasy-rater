import type { Request, Response, NextFunction } from 'express';
import db from '../db.js';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const increment = db.prepare(`
  INSERT INTO usage_limits (clerk_user_id, action, count, date)
  VALUES (?, ?, 1, ?)
  ON CONFLICT (clerk_user_id, action, date)
  DO UPDATE SET count = count + 1
`);

const getCount = db.prepare(`
  SELECT count FROM usage_limits WHERE clerk_user_id = ? AND action = ? AND date = ?
`);

export function checkUsage(action: 'trade' | 'team' | 'startsit' | 'lineup' | 'chat' | 'matchup', limit: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.userTier === 'pro') return next();

    const userId = req.userId!;
    const d = today();

    // Read current count
    const row = getCount.get(userId, action, d) as { count: number } | undefined;
    const current = row?.count ?? 0;

    if (current >= limit) {
      return res.status(402).json({
        error: 'upgrade_required',
        message: `Free tier limit: ${limit} ${action} per day`,
      });
    }

    // Increment (insert-or-update)
    increment.run(userId, action, d);
    return next();
  };
}
