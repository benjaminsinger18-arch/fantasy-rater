import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

export default function TeamScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>TEAM RATER</Text>
      <Text style={styles.sub}>Full team AI analysis — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: 20, paddingTop: 60 },
  header: { fontFamily: 'monospace', fontSize: 22, fontWeight: '900', color: Colors.text, letterSpacing: 4, marginBottom: 8 },
  sub: { fontFamily: 'monospace', fontSize: 12, color: Colors.dim },
});
