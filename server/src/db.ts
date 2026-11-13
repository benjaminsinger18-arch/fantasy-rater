import { createClient, type Client } from '@libsql/client/web';

// Lazily create the client so module load never throws (web client rejects file: URLs)
let _client: Client | undefined;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    _client = createClient({
      url,
      ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
    });
  }
  return _client;
}

// Proxy so all existing `db.execute(...)` calls still work without changes
const db = new Proxy({} as Client, {
  get(_target, prop: string | symbol) {
    const client = getClient();
    const val = (client as any)[prop as string];
    return typeof val === 'function' ? (val as Function).bind(client) : val;
  },
});

let initPromise: Promise<void> | null = null;

export async function initDb(): Promise<void> {
  if (!initPromise) initPromise = _doInit();
  return initPromise;
}

async function _doInit(): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS user_prefs (
      clerk_user_id TEXT PRIMARY KEY,
      email_weekly_digest INTEGER DEFAULT 1,
      email_injury_alerts INTEGER DEFAULT 1,
      push_injury_alerts INTEGER DEFAULT 1,
      push_waiver_reminders INTEGER DEFAULT 1,
      email TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS saved_leagues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      sport TEXT NOT NULL,
      platform TEXT NOT NULL,
      league_id TEXT NOT NULL,
      roster_id TEXT,
      team_name TEXT,
      scoring_format TEXT DEFAULT 'PPR',
      league_size INTEGER DEFAULT 12,
      espn_s2 TEXT,
      swid TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(clerk_user_id, platform, league_id)
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS saved_rosters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      league_id TEXT NOT NULL,
      roster_id TEXT,
      sport TEXT NOT NULL,
      player_ids TEXT NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(clerk_user_id, platform, league_id)
    );

    CREATE TABLE IF NOT EXISTS injury_alerts_sent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      injury_status TEXT NOT NULL,
      sent_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(clerk_user_id, player_id, injury_status)
    );

    CREATE TABLE IF NOT EXISTS trade_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clerk_user_id TEXT NOT NULL,
      sport TEXT NOT NULL,
      side_a TEXT NOT NULL,
      side_b TEXT NOT NULL,
      side_a_score REAL NOT NULL,
      side_b_score REAL NOT NULL,
      verdict TEXT NOT NULL,
      scoring_format TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trade_history_user ON trade_history(clerk_user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS usage_limits (
      clerk_user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      PRIMARY KEY (clerk_user_id, action, date)
    );
  `);

  for (const sql of [
    'ALTER TABLE trade_history ADD COLUMN analysis_hash TEXT',
    'ALTER TABLE trade_history ADD COLUMN ai_analysis TEXT',
  ]) {
    try { await db.execute(sql); } catch {}
  }
}

export default db;
