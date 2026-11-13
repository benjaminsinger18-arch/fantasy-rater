import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from '@/lib/api';

// Configure how incoming notifications are presented while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FantasyRater Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8321A',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (existing !== 'granted') {
    const { status: requested } = await Notifications.requestPermissionsAsync();
    status = requested;
  }

  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('No EAS projectId — push token unavailable in dev build. Set extra.eas.projectId in app.json');
    return null;
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  return token;
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notifListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Listen for notifications received while app is open
    notifListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    // Read current permission status without prompting
    Notifications.getPermissionsAsync().then(({ status }) => setPermissionStatus(status));

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  async function enable() {
    setRegistering(true);
    setError(null);
    try {
      const token = await registerForPushNotifications();
      if (!token) {
        setError('Notification permission denied');
        setPermissionStatus('denied');
        return false;
      }
      setExpoPushToken(token);
      setPermissionStatus('granted');
      // Register token with backend
      await api.subscribePush(token);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to enable notifications');
      return false;
    } finally {
      setRegistering(false);
    }
  }

  async function disable() {
    if (!expoPushToken) return;
    try {
      await api.unsubscribePush(expoPushToken);
      setExpoPushToken(null);
    } catch (e) {
      console.warn('Failed to unsubscribe push token:', e);
    }
  }

  return { expoPushToken, permissionStatus, registering, error, enable, disable };
}
