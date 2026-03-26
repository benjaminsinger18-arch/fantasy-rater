interface CacheEntry<T> {
  data: T;
  expires: number;
}

class MemCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expires: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires) this.store.delete(key);
    }
  }
}

export const cache = new MemCache();

// Clean up expired entries every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

export const TTL = {
  SLEEPER_PLAYERS: 60 * 60 * 1000,       // 1 hour
  SLEEPER_PROJECTIONS: 30 * 60 * 1000,   // 30 min
  SLEEPER_TRENDING: 15 * 60 * 1000,      // 15 min
  FPL_BOOTSTRAP: 60 * 60 * 1000,         // 1 hour
  FPL_LIVE: 5 * 60 * 1000,              // 5 min
  ESPN_ROSTER: 20 * 60 * 1000,           // 20 min
  YAHOO_ROSTER: 20 * 60 * 1000,          // 20 min
  CLAUDE_ANALYSIS: 10 * 60 * 1000,       // 10 min
};
