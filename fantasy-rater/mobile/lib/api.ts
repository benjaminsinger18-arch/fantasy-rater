const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://fantasy-rater-production.up.railway.app/api';

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = _getToken ? await _getToken() : null;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? `HTTP ${res.status}`), { status: res.status, body });
  }
  return res.json();
}

export const api = {
  getBillingStatus: () => request<{ tier: string }>('/billing/status'),

  startCheckout: () => request<{ url: string }>('/billing/checkout', { method: 'POST' }),

  openBillingPortal: () => request<{ url: string }>('/billing/portal'),

  subscribePush: (token: string) =>
    request('/notifications/push/subscribe/expo', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  unsubscribePush: (token: string) =>
    request('/notifications/push/subscribe/expo', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    }),

  getNotificationPrefs: async () => {
    const raw = await request<Record<string, unknown>>('/notifications/preferences');
    return {
      email: !!(raw.email_weekly_digest || raw.email_injury_alerts),
      push: !!(raw.push_injury_alerts || raw.push_waiver_reminders),
    };
  },

  updateNotificationPrefs: (prefs: { email?: boolean; push?: boolean }) =>
    request('/notifications/preferences', {
      method: 'PUT',
      // Map mobile-friendly keys to server column names
      body: JSON.stringify({
        ...(prefs.email !== undefined ? { email_weekly_digest: prefs.email, email_injury_alerts: prefs.email } : {}),
        ...(prefs.push !== undefined ? { push_injury_alerts: prefs.push, push_waiver_reminders: prefs.push } : {}),
      }),
    }),
};
