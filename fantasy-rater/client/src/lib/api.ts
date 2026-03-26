import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

// Token getter — set by AuthSync component in App.tsx
let _getToken: (() => Promise<string | null>) | null = null;
export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
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

// Attach auth token to every request
api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 / 402 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if (status === 401) _onLoginRequired?.();
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
export async function compareStartSit(payload: object) {
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
