import { createClerkClient, verifyToken } from '@clerk/backend';
import type { Request, Response, NextFunction } from 'express';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

// Cache user tier for 5 minutes to avoid hitting Clerk API on every request
const metaCache = new Map<string, { tier: string; exp: number }>();

export async function getUserTier(userId: string): Promise<string> {
  const cached = metaCache.get(userId);
  if (cached && Date.now() < cached.exp) return cached.tier;

  try {
    const user = await clerk.users.getUser(userId);
    const tier = (user.publicMetadata?.tier as string) ?? 'free';
    metaCache.set(userId, { tier, exp: Date.now() + 5 * 60 * 1000 });
    return tier;
  } catch {
    return 'free';
  }
}

export function invalidateTierCache(userId: string) {
  metaCache.delete(userId);
}

export { clerk };

export function requireAuth(minTier: 'free' | 'pro' = 'free') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'login_required' });
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY!,
      });
      req.userId = payload.sub;
      req.userTier = await getUserTier(payload.sub);

      if (minTier === 'pro' && req.userTier !== 'pro') {
        return res.status(402).json({ error: 'upgrade_required' });
      }

      return next();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Auth error:', msg);
      return res.status(401).json({ error: 'invalid_token' });
    }
  };
}
