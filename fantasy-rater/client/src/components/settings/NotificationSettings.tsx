import { useState, useEffect } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { getNotificationPrefs, updateNotificationPrefs, subscribePush, unsubscribePush } from '../../lib/api.ts';

interface Prefs {
  email_weekly_digest: number;
  email_injury_alerts: number;
  push_injury_alerts: number;
  push_waiver_reminders: number;
  email?: string;
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/[0.06] last:border-0">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

export function NotificationSettings() {
  const { user } = useUser();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [email, setEmail] = useState('');
  const [pushSupported, setPushSupported] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
    setPushGranted(Notification.permission === 'granted');

    getNotificationPrefs().then(p => {
      setPrefs(p);
      setEmail(p.email ?? user?.emailAddresses?.[0]?.emailAddress ?? '');
    }).catch(() => {});
  }, [user]);

  async function handleToggle(key: keyof Prefs, val: boolean) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: val ? 1 : 0 };
    setPrefs(updated);
    await updateNotificationPrefs({ [key]: val ? 1 : 0 }).catch(() => {});
  }

  async function handleSaveEmail() {
    setSaving(true);
    try {
      await updateNotificationPrefs({ email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleEnablePush() {
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setPushLoading(false); return; }
      setPushGranted(true);

      const reg = await navigator.serviceWorker.ready;

      const keyRes = await fetch('/api/notifications/vapid-public-key');
      const { key } = await keyRes.json();

      const vapidKey = urlBase64ToUint8Array(key);
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey.buffer as ArrayBuffer });
      const sub = subscription.toJSON();

      await subscribePush({
        endpoint: sub.endpoint!,
        keys: { p256dh: sub.keys!.p256dh, auth: sub.keys!.auth },
      });
    } catch (err) {
      console.error('Push subscribe error:', err);
    } finally {
      setPushLoading(false);
    }
  }

  async function handleDisablePush() {
    setPushLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPushGranted(false);
    } finally {
      setPushLoading(false);
    }
  }

  if (!user) return (
    <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
      Sign in to manage notification preferences.
    </div>
  );

  if (!prefs) return (
    <div className="flex items-center gap-2 text-slate-500 text-sm p-6">
      <Loader2 size={14} className="animate-spin text-indigo-400" /> Loading preferences...
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-5 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-indigo-400" />
          <h1 className="text-xl font-display font-black bg-gradient-to-r from-white via-blue-100 to-indigo-300 bg-clip-text text-transparent">
            Notification Settings
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">Stay ahead of injuries and waiver wire opportunities</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg flex flex-col gap-6">
          {/* Email */}
          <div className="card-base p-5">
            <p className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Email Notifications</p>

            <div className="flex gap-2 mb-4">
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
                className="input-base flex-1"
              />
              <button
                onClick={handleSaveEmail}
                disabled={saving || !email}
                className="px-4 py-2 rounded-xl text-sm font-display font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black disabled:opacity-40 transition-all shadow-lg shadow-amber-500/20"
              >
                {saved ? '✓ Saved' : saving ? '...' : 'Save'}
              </button>
            </div>

            <Toggle
              checked={!!prefs.email_injury_alerts}
              onChange={v => handleToggle('email_injury_alerts', v)}
              label="Injury Alerts"
              description="Email when a player on your roster gets hurt"
            />
            <Toggle
              checked={!!prefs.email_weekly_digest}
              onChange={v => handleToggle('email_weekly_digest', v)}
              label="Weekly Digest"
              description="Monday morning team grade + top 3 actions for the week"
            />
          </div>

          {/* Push */}
          <div className="card-base p-5">
            <p className="font-display text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Push Notifications</p>

            {!pushSupported && (
              <p className="text-xs text-slate-500">Push notifications are not supported in your browser.</p>
            )}

            {pushSupported && !pushGranted && (
              <div>
                <p className="text-sm text-slate-400 mb-3">Enable browser push notifications to get instant injury alerts.</p>
                <button
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  className="px-4 py-2 rounded-xl text-sm font-display font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all disabled:opacity-40 flex items-center gap-2"
                >
                  {pushLoading ? <><Loader2 size={14} className="animate-spin" /> Enabling...</> : 'Enable Push Notifications'}
                </button>
              </div>
            )}

            {pushSupported && pushGranted && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-emerald-400 text-sm">✓</span>
                  <span className="text-sm text-slate-300">Push notifications enabled</span>
                  <button onClick={handleDisablePush} disabled={pushLoading} className="ml-auto text-xs text-slate-500 hover:text-rose-400 transition-colors">
                    {pushLoading ? '...' : 'Disable'}
                  </button>
                </div>
                <Toggle
                  checked={!!prefs.push_injury_alerts}
                  onChange={v => handleToggle('push_injury_alerts', v)}
                  label="Injury Alerts"
                  description="Instant browser notification when your players get hurt"
                />
                <Toggle
                  checked={!!prefs.push_waiver_reminders}
                  onChange={v => handleToggle('push_waiver_reminders', v)}
                  label="Waiver Deadline Reminders"
                  description="Reminder before Tuesday waiver wire deadline"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
