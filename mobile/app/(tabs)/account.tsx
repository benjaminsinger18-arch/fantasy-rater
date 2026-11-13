import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Switch, Alert, ActivityIndicator, Linking, Platform,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/colors';
import { api } from '@/lib/api';
import { usePushNotifications } from '@/hooks/usePushNotifications';

function Row({ label, value, last }: { label: string; value?: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function AccountScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const [tier, setTier] = useState<string>('free');
  const [tierLoading, setTierLoading] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const {
    expoPushToken,
    permissionStatus,
    registering,
    error: pushError,
    enable: enablePush,
    disable: disablePush,
  } = usePushNotifications();

  const isPro = tier === 'pro';

  // Reload tier + prefs every time screen is focused (e.g. returning from Stripe)
  useFocusEffect(
    useCallback(() => {
      loadTier();
      loadPrefs();
    }, [])
  );

  async function loadTier() {
    setTierLoading(true);
    try {
      const { tier } = await api.getBillingStatus();
      setTier(tier);
    } catch {
      // not signed in yet or network error — ignore
    } finally {
      setTierLoading(false);
    }
  }

  async function loadPrefs() {
    setPrefsLoading(true);
    try {
      const prefs = await api.getNotificationPrefs();
      setEmailAlerts(prefs.email ?? false);
    } catch {
      // ignore
    } finally {
      setPrefsLoading(false);
    }
  }

  async function handlePushToggle(enabled: boolean) {
    if (enabled) {
      const success = await enablePush();
      if (!success && pushError) {
        Alert.alert(
          'Notifications blocked',
          'Go to Settings → FantasyRater → Notifications to enable them.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else if (success) {
        await api.updateNotificationPrefs({ push: true });
      }
    } else {
      await disablePush();
      await api.updateNotificationPrefs({ push: false });
    }
  }

  async function handleEmailToggle(enabled: boolean) {
    setEmailAlerts(enabled);
    try {
      await api.updateNotificationPrefs({ email: enabled });
    } catch {
      setEmailAlerts(!enabled); // revert on error
    }
  }

  async function handleUpgrade() {
    try {
      const { url } = await api.startCheckout();
      Linking.openURL(url);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not start checkout');
    }
  }

  async function handleManageSubscription() {
    try {
      const { url } = await api.openBillingPortal();
      Linking.openURL(url);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not open billing portal');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            // AuthGate in _layout.tsx will redirect to sign-in automatically
          } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Sign out failed');
            setSigningOut(false);
          }
        },
      },
    ]);
  }

  const pushEnabled = !!expoPushToken && permissionStatus === 'granted';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ACCOUNT</Text>
        <View style={styles.tierBadge}>
          {tierLoading
            ? <ActivityIndicator size="small" color={Colors.red} />
            : <Text style={[styles.tierText, isPro && styles.tierPro]}>
                {isPro ? '⚡ PRO' : 'FREE'}
              </Text>
          }
        </View>
      </View>

      {/* Profile */}
      <Section title="PROFILE">
        <Row label="Email" value={user?.primaryEmailAddress?.emailAddress ?? '—'} />
        <Row label="Name" value={user?.fullName ?? user?.firstName ?? '—'} />
        <Row label="Plan" value={tierLoading ? '...' : isPro ? 'Pro — $7.99/mo' : 'Free'} last />
      </Section>

      {/* Subscription */}
      <Section title="SUBSCRIPTION">
        {isPro ? (
          <TouchableOpacity style={styles.actionRow} onPress={handleManageSubscription}>
            <Text style={styles.actionLabel}>Manage / Cancel Subscription</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionRow, styles.upgradeRow]} onPress={handleUpgrade}>
            <View>
              <Text style={styles.upgradeLabel}>Upgrade to Pro</Text>
              <Text style={styles.upgradePrice}>$7.99/month · Unlimited AI analysis</Text>
            </View>
            <Text style={[styles.chevron, { color: Colors.red }]}>›</Text>
          </TouchableOpacity>
        )}
      </Section>

      {/* Notifications */}
      <Section title="NOTIFICATIONS">
        {/* Push */}
        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Push Alerts</Text>
            <Text style={styles.rowSub}>
              {permissionStatus === 'denied'
                ? 'Blocked — tap to open Settings'
                : 'Injury news, waiver wire alerts'}
            </Text>
          </View>
          {registering
            ? <ActivityIndicator size="small" color={Colors.red} />
            : <Switch
                value={pushEnabled}
                onValueChange={handlePushToggle}
                trackColor={{ false: Colors.border, true: Colors.red }}
                thumbColor={Colors.text}
                disabled={!isPro}
              />
          }
        </View>
        {!isPro && (
          <View style={styles.lockedNote}>
            <Text style={styles.lockedText}>Push notifications require Pro</Text>
          </View>
        )}

        {/* Email */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Email Alerts</Text>
            <Text style={styles.rowSub}>Weekly digest and injury reports</Text>
          </View>
          {prefsLoading
            ? <ActivityIndicator size="small" color={Colors.red} />
            : <Switch
                value={emailAlerts}
                onValueChange={handleEmailToggle}
                trackColor={{ false: Colors.border, true: Colors.red }}
                thumbColor={Colors.text}
              />
          }
        </View>

        {pushError && (
          <View style={styles.errorNote}>
            <Text style={styles.errorText}>{pushError}</Text>
          </View>
        )}
      </Section>

      {/* Sign Out */}
      <Section title="SESSION">
        <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} disabled={signingOut}>
          {signingOut
            ? <ActivityIndicator color={Colors.red} />
            : <Text style={styles.signOutText}>Sign Out</Text>
          }
        </TouchableOpacity>
      </Section>

      <View style={styles.footer}>
        <Text style={styles.footerText}>FantasyRater · AI-powered fantasy sports</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, gap: 24 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  headerTitle: { fontFamily: 'monospace', fontSize: 22, fontWeight: '900', color: Colors.text, letterSpacing: 4 },
  tierBadge: {
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: Colors.card,
  },
  tierText: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700', color: Colors.dim, letterSpacing: 2 },
  tierPro: { color: Colors.red },

  section: { gap: 8 },
  sectionTitle: { fontFamily: 'monospace', fontSize: 9, fontWeight: '700', color: Colors.dim, letterSpacing: 3, paddingHorizontal: 2 },
  card: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.bg },
  rowLeft: { flex: 1, marginRight: 12 },
  rowLabel: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  rowValue: { fontFamily: 'monospace', fontSize: 12, color: Colors.muted, maxWidth: '55%', textAlign: 'right' },
  rowSub: { fontFamily: 'monospace', fontSize: 10, color: Colors.dim, marginTop: 2 },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  upgradeRow: { borderLeftWidth: 3, borderLeftColor: Colors.red },
  actionLabel: { fontFamily: 'monospace', fontSize: 13, color: Colors.text },
  upgradeLabel: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: Colors.red, letterSpacing: 1 },
  upgradePrice: { fontFamily: 'monospace', fontSize: 10, color: Colors.muted, marginTop: 2 },
  chevron: { fontFamily: 'monospace', fontSize: 20, color: Colors.muted },

  lockedNote: { paddingHorizontal: 14, paddingBottom: 10 },
  lockedText: { fontFamily: 'monospace', fontSize: 10, color: Colors.dim, fontStyle: 'italic' },

  errorNote: { paddingHorizontal: 14, paddingBottom: 10 },
  errorText: { fontFamily: 'monospace', fontSize: 10, color: Colors.red },

  signOutRow: { paddingHorizontal: 14, paddingVertical: 14, alignItems: 'center' },
  signOutText: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: Colors.red, letterSpacing: 2 },

  footer: { alignItems: 'center', marginTop: 8 },
  footerText: { fontFamily: 'monospace', fontSize: 10, color: Colors.dim },
});
