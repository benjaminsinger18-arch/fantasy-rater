import webpush from 'web-push';

let initialized = false;

function ensureInit() {
  if (initialized) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? 'mailto:admin@fantasyrater.app';

  if (!pub || !priv) {
    console.warn('[push] VAPID keys not set — push notifications disabled');
    return;
  }

  webpush.setVapidDetails(email, pub, priv);
  initialized = true;
}

export async function sendPushNotification(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  title: string,
  body: string,
  url = '/'
): Promise<void> {
  ensureInit();
  if (!initialized) return;

  await webpush.sendNotification(
    subscription,
    JSON.stringify({ title, body, url })
  );
}
