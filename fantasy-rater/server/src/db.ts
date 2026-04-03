import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '..', 'data', 'fantasy-rater.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
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
`);

export default db;
