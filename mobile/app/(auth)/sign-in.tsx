import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Colors } from '@/constants/colors';

// Required for OAuth redirects to close the browser
WebBrowser.maybeCompleteAuthSession();

type Mode = 'sign-in' | 'sign-up';

export default function SignInScreen() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailAuth() {
    if (!signInLoaded || !signUpLoaded) return;
    setLoading(true);
    try {
      if (mode === 'sign-in') {
        const result = await signIn!.create({ identifier: email, password });
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId });
          router.replace('/(tabs)');
        }
      } else {
        // Sign up — email verification required
        await signUp!.create({ emailAddress: email, password });
        await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPendingCode(true);
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? 'Something went wrong';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!signUpLoaded) return;
    setLoading(true);
    try {
      const result = await signUp!.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setSignUpActive!({ session: result.createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? 'Invalid code';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId) {
        await setActive!({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Google Sign In Failed', err?.message ?? 'Try again');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>⚡</Text>
          </View>
          <Text style={styles.logoText}>FANTASYRATER</Text>
        </View>
        <Text style={styles.subtitle}>AI-powered fantasy sports analysis</Text>

        {pendingCode ? (
          /* Verify email code */
          <>
            <Text style={styles.label}>Check your email for a 6-digit code</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="123456"
              placeholderTextColor={Colors.dim}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
            <TouchableOpacity style={styles.btn} onPress={handleVerifyCode} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>VERIFY CODE</Text>}
            </TouchableOpacity>
          </>
        ) : (
          /* Email/Password form */
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={Colors.dim}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={Colors.dim}
              secureTextEntry
            />

            <TouchableOpacity
              style={styles.btn}
              onPress={handleEmailAuth}
              disabled={loading || !email || !password}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{mode === 'sign-in' ? 'SIGN IN' : 'CREATE ACCOUNT'}</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google OAuth */}
            <TouchableOpacity style={styles.oauthBtn} onPress={handleGoogleSignIn}>
              <Text style={styles.oauthText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Toggle sign-in / sign-up */}
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setMode(m => m === 'sign-in' ? 'sign-up' : 'sign-in')}
            >
              <Text style={styles.toggleText}>
                {mode === 'sign-in'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
                <Text style={styles.toggleLink}>
                  {mode === 'sign-in' ? 'Sign up free' : 'Sign in'}
                </Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  logoBox: {
    width: 32, height: 32, borderWidth: 2, borderColor: Colors.red,
    alignItems: 'center', justifyContent: 'center',
  },
  logoIcon: { fontSize: 16 },
  logoText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 20, fontWeight: '900', color: Colors.text, letterSpacing: 4,
  },
  subtitle: { fontFamily: 'monospace', fontSize: 11, color: Colors.dim, marginBottom: 20 },
  label: { fontFamily: 'monospace', fontSize: 12, color: Colors.muted, marginBottom: -4 },
  input: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    color: Colors.text, fontFamily: 'monospace', fontSize: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  btn: {
    backgroundColor: Colors.red, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#fff', fontFamily: 'monospace', fontWeight: '700', fontSize: 13, letterSpacing: 2 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontFamily: 'monospace', fontSize: 10, color: Colors.dim },
  oauthBtn: {
    borderWidth: 1, borderColor: Colors.border, paddingVertical: 13,
    alignItems: 'center', backgroundColor: Colors.card,
  },
  oauthText: { color: Colors.text, fontFamily: 'monospace', fontSize: 13, letterSpacing: 1 },
  toggleRow: { alignItems: 'center', marginTop: 8 },
  toggleText: { fontFamily: 'monospace', fontSize: 12, color: Colors.muted },
  toggleLink: { color: Colors.red, fontWeight: '700' },
});
