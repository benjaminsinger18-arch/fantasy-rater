import type { Request, Response, NextFunction } from 'express';
import db from '../db.js';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function checkUsage(action: 'trade' | 'team' | 'startsit' | 'lineup' | 'chat' | 'matchup', limit: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.userTier === 'pro') return next();

    const userId = req.userId!;
    const d = today();

    try {
      const result = await db.execute({
        sql: 'SELECT count FROM usage_limits WHERE clerk_user_id = ? AND action = ? AND date = ?',
        args: [userId, action, d],
      });
      const current = result.rows[0] ? Number(result.rows[0].count) : 0;

      if (current >= limit) {
        return res.status(402).json({
          error: 'upgrade_required',
          message: `Free tier limit: ${limit} ${action} per day`,
        });
      }

      await db.execute({
        sql: `INSERT INTO usage_limits (clerk_user_id, action, count, date)
              VALUES (?, ?, 1, ?)
              ON CONFLICT (clerk_user_id, action, date)
              DO UPDATE SET count = count + 1`,
        args: [userId, action, d],
      });
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
