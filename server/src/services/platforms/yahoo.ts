import axios from 'axios';
import { cache, TTL } from '../../cache/memcache.js';

const YAHOO_AUTH_URL = 'https://api.login.yahoo.com/oauth2/request_auth';
const YAHOO_TOKEN_URL = 'https://api.login.yahoo.com/oauth2/get_token';
const YAHOO_API_BASE = 'https://fantasysports.yahooapis.com/fantasy/v2';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

// In-memory session store — lost on server restart (acceptable for dev)
const sessions = new Map<string, TokenData>();

export function getAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.YAHOO_CLIENT_ID ?? '',
    redirect_uri: process.env.YAHOO_REDIRECT_URI ?? '',
    response_type: 'code',
    scope: 'fspt-r',
    state,
  });
  return `${YAHOO_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string): Promise<{ sessionId: string }> {
  const creds = Buffer.from(
    `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
  ).toString('base64');

  const res = await axios.post(
    YAHOO_TOKEN_URL,
    new URLSearchParams({
      code,
      redirect_uri: process.env.YAHOO_REDIRECT_URI ?? '',
      grant_type: 'authorization_code',
    }),
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    access_token: res.data.access_token,
    refresh_token: res.data.refresh_token,
    expires_at: Date.now() + res.data.expires_in * 1000,
  });

  return { sessionId };
}

async function refreshSession(sessionId: string): Promise<TokenData> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('Session not found — please re-authenticate with Yahoo');

  const creds = Buffer.from(
    `${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
  ).toString('base64');

  const res = await axios.post(
    YAHOO_TOKEN_URL,
    new URLSearchParams({
      refresh_token: session.refresh_token,
      grant_type: 'refresh_token',
      redirect_uri: process.env.YAHOO_REDIRECT_URI ?? '',
    }),
    { headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const updated: TokenData = {
    access_token: res.data.access_token,
    refresh_token: res.data.refresh_token || session.refresh_token,
    expires_at: Date.now() + res.data.expires_in * 1000,
  };

  sessions.set(sessionId, updated);
  return updated;
}

async function getToken(sessionId: string): Promise<string> {
  let session = sessions.get(sessionId);
  if (!session) throw new Error('Yahoo session not found — please re-authenticate');

  // Refresh if expiring within 5 minutes
  if (session.expires_at - Date.now() < 5 * 60 * 1000) {
    session = await refreshSession(sessionId);
  }

  return session.access_token;
}

async function yahooGet(sessionId: string, path: string) {
  const token = await getToken(sessionId);
  const res = await axios.get(`${YAHOO_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { format: 'json' },
  });
  return res.data;
}

export async function getRoster(sessionId: string, teamKey: string) {
  const key = `yahoo:roster:${teamKey}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = await yahooGet(sessionId, `/team/${teamKey}/roster/players`);
  cache.set(key, data, TTL.YAHOO_ROSTER);
  return data;
}

export async function getLeague(sessionId: string, leagueKey: string) {
  const key = `yahoo:league:${leagueKey}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const data = await yahooGet(sessionId, `/league/${leagueKey}`);
  cache.set(key, data, TTL.YAHOO_ROSTER);
  return data;
}

export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId);
}
