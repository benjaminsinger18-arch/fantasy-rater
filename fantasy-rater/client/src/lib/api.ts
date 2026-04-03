import axios from 'axios';

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' });

// Token getter — set by AuthSync component in App.tsx
let _getToken: (() => Promise<string | null>) | null = null;
export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}
export async function getAuthToken(): Promise<string | null> {
  return _getToken ? _getToken() : null;
}

// Clerk ready gate — resolves when Clerk finishes loading
let _clerkReady: Promise<void> | null = null;
export function setClerkReadyGate(promise: Promise<void>) {
  _clerkReady = promise;
}

// Upgrade modal trigger — set by UpgradeModal context
let _onUpgradeRequired: (() => void) | null = null;
export function setUpgradeHandler(fn: () => void) {
  _onUpgradeRequired = fn;
}

let _onLoginRequired: (() => void) | null = null;
export function setLoginRequiredHandler(fn: () => void) {
  _onLoginRequired = fn;
}

// Attach auth token to every request — non-blocking so public endpoints
// (e.g. player search) never hang waiting for Clerk to initialize.
api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 / 402 globally.
// On 401: if the request was sent WITHOUT an auth token, wait for Clerk then
// retry once with the real token. This covers the race where getToken() returns
// null the instant after Clerk loads before the session is fully cached.
// If the request already had a token and still got 401, it's a real auth failure.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;
    if (status === 401) {
      const sentWithoutAuth = !err.config.headers?.Authorization;
      if (sentWithoutAuth && !err.config._clerkRetried) {
        if (_clerkReady) await _clerkReady;
        err.config._clerkRetried = true;
        if (_getToken) {
          const token = await _getToken();
          if (token) {
            err.config.headers = { ...err.config.headers, Authorization: `Bearer ${token}` };
            return api.request(err.config);
          }
        }
        // Clerk loaded but no token — user is not signed in or session is broken.
        // Silent fail; don't spam the login modal for background requests.
        return Promise.reject(err);
      }
      _onLoginRequired?.();
    }
    if (status === 402) _onUpgradeRequired?.();
    return Promise.reject(err);
  }
);

export async function searchPlayers(q: string, sport: string, position?: string, leagueId?: string, espnS2?: string, swid?: string, week?: number) {
  const platform = sport === 'fpl' ? 'fpl' : sport === 'mlb' ? 'espn' : sport === 'ipl' ? 'ipl' : 'sleeper';
  const res = await api.get('/players/search', {
    params: { q, sport, position, platform, leagueId, espnS2, swid, week },
  });
  return res.data;
}

export async function rateTrade(payload: object) {
  const res = await api.post('/trade/rate', payload);
  return res.data;
}

export async function rateTeam(payload: object) {
  const res = await api.post('/team/rate', payload);
  return res.data;
}

export async function importSleeperRoster(leagueId: string, rosterId?: number) {
  const res = await api.get('/team/import/sleeper', { params: { leagueId, rosterId } });
  return res.data;
}

export async function importFplRoster(managerId: string, gameweek?: number) {
  const res = await api.get('/team/import/fpl', { params: { managerId, gameweek } });
  return res.data;
}

export async function importEspnRoster(leagueId: string, rosterId?: string, sport?: string, espnS2?: string, swid?: string, week?: number) {
  const res = await api.get('/team/import/espn', { params: { leagueId, rosterId, sport, espnS2, swid, week } });
  return res.data;
}

export async function fetchRankings(sport: string, position?: string, week?: number, leagueId?: string, espnS2?: string, swid?: string) {
  const res = await api.get('/players/rankings', { params: { sport, position, week, leagueId, espnS2, swid } });
  return res.data;
}

export async function fetchPlayerHistory(id: string, sport: string) {
  const res = await api.get(`/players/${id}/history`, { params: { sport } });
  return res.data;
}

export async function analyzePlayer(player: object, sport: string, scoringFormat: string) {
  const res = await api.post('/analyze/player', { player, sport, scoringFormat });
  return res.data;
}

export async function predictLeague(params: {
  leagueId: string;
  sport: string;
  scoringFormat: string;
  currentWeek: number;
  myRosterId?: string;
  espnS2?: string;
  swid?: string;
}) {
  const res = await api.get('/league/predict', { params });
  return res.data;
}

export async function startCheckout(): Promise<void> {
  const res = await api.post('/billing/checkout');
  if (res.data.url) window.location.href = res.data.url;
}

export async function openBillingPortal(): Promise<void> {
  const res = await api.get('/billing/portal');
  if (res.data.url) window.location.href = res.data.url;
}

export async function getBillingStatus(): Promise<{ tier: string }> {
  const res = await api.get('/billing/status');
  return res.data;
}

// Start/Sit
export async function compareStartSit(payload: {
  players: { name: string; position?: string; team?: string; id?: string; injuryStatus?: string; avgPoints?: number }[];
  sport: string;
  scoringFormat: string;
  week?: number;
}) {
  const res = await api.post('/startsit/compare', payload);
  return res.data;
}

// Waiver Wire
export async function getWaiverRecommendations(params: object) {
  const res = await api.get('/waiver/recommendations', { params });
  return res.data;
}

// Draft
export async function getDraftRecommendation(payload: object) {
  const res = await api.post('/draft/recommend', payload);
  return res.data;
}

// Leagues (multi-league)
export async function getSavedLeagues() {
  const res = await api.get('/leagues');
  return res.data;
}
export async function saveLeague(payload: object) {
  const res = await api.post('/leagues', payload);
  return res.data;
}
export async function updateLeague(id: number, payload: object) {
  const res = await api.put(`/leagues/${id}`, payload);
  return res.data;
}
export async function deleteLeague(id: number) {
  const res = await api.delete(`/leagues/${id}`);
  return res.data;
}

// Notifications
export async function getNotificationPrefs() {
  const res = await api.get('/notifications/preferences');
  return res.data;
}
export async function updateNotificationPrefs(payload: object) {
  const res = await api.put('/notifications/preferences', payload);
  return res.data;
}
export async function subscribePush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  const res = await api.post('/notifications/push/subscribe', subscription);
  return res.data;
}
export async function unsubscribePush(endpoint: string) {
  const res = await api.delete('/notifications/push/subscribe', { data: { endpoint } });
  return res.data;
}
export async function saveRosterForAlerts(payload: object) {
  const res = await api.post('/notifications/roster/save', payload);
  return res.data;
}

export async function getLiveMatchup(leagueId: string, week: number, rosterId: number) {
  const res = await api.get('/live/matchup', { params: { leagueId, week, rosterId } });
  return res.data;
}

export async function optimizeLineup(payload: { players: object[]; sport: string; scoringFormat: string; week?: number }) {
  const res = await api.post('/lineup/optimize', payload);
  return res.data;
}

export async function streamChatMessage(
  payload: { messages: Array<{ role: 'user' | 'assistant'; content: string }>; context: object },
  onText: (t: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): Promise<void> {
  const token = await getAuthToken();
  const base = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
  const res = await fetch(`${base}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 402) throw Object.assign(new Error('upgrade_required'), { response: { status: 402, data } });
    throw new Error(data.error ?? 'Chat failed');
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6);
      if (raw === '[DONE]') { onDone(); return; }
      try {
        const parsed = JSON.parse(raw);
        if (parsed.error) { onError(parsed.error); return; }
        if (parsed.text) onText(parsed.text);
      } catch { /* ignore */ }
    }
  }
  onDone();
}
