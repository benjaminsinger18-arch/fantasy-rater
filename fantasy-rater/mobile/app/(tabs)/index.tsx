import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export default function TradeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>TRADE RATER</Text>
      <Text style={styles.sub}>AI-powered trade analysis coming soon to mobile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: 20, paddingTop: 60 },
  header: { fontFamily: 'monospace', fontSize: 22, fontWeight: '900', color: Colors.text, letterSpacing: 4, marginBottom: 8 },
  sub: { fontFamily: 'monospace', fontSize: 12, color: Colors.dim },
});
